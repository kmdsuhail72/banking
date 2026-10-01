# Controlled banking chaos experiments

This package uses **Chaos Mesh 2.8.4** for eight bounded faults and a companion Kubernetes Job for a bounded traffic spike. Chaos Mesh does not provide a general HTTP load generator; the Job supplies that ninth scenario without pretending it is a Chaos Mesh CRD.

All experiments are opt-in and run only against a disposable **dedicated non-production cluster**, in **`banking-chaos`**. They do not run from application startup, GitOps reconciliation, a CronJob or a Schedule. CI validates specifications and admission rejections; it does not inject faults.

The test subject is the repository's real `backend/` application, built separately and deployed as three replicas. The lab adds a read-only edge, an isolated MongoDB fixture, a synthetic dependency stub, an independent integrity witness and lab-only Prometheus. This is a controlled test of the existing banking **read path**, not proof of payment settlement correctness. The microservices PostgreSQL/Mongoose migration and write-path atomicity issues documented in [SLO.md](../observability/SLO.md) must be resolved before designing a separately approved synthetic-write campaign.

## Financial data boundary

- Never restore a production snapshot, copy customer data, reuse production credentials, use live payment providers, or connect production Kafka/Redis/DB services. Use the provided one-user fixture (`synthetic@example.invalid`, balance 50,000; no transactions).
- The application and witness receive a MongoDB **read-only** role on `banking_chaos`. Only the database initialization container sees the disposable admin credential. Driver write retries and automatic collection/index creation are disabled in the app clone.
- Traffic can only call `GET /balance` or `GET /transactions` through the read-only edge. POST, PUT, PATCH and DELETE are rejected; arbitrary proxy paths, redirects and external URLs are not supported. The load generator has a literal, non-configurable lab destination. Original mutating backend routes are not exposed through a Service, and the DB rejects writes even if one is accidentally invoked.
- Financial documents and collection inventory are hashed before, throughout and after each run. The independent witness checks the seed balance, account count, zero transactions, synthetic email, collection inventory and its actual authenticated DB role. A hash change, failed query or stale check aborts the experiment immediately. An unavailable DB is **unknown**, never a successful zero balance.
- All lab data volumes are disposable `emptyDir`; no customer PVC, hostPath, NFS or CSI volume is allowed. Default-deny NetworkPolicies allow only named lab peers and cluster DNS. An active cross-namespace egress test must fail before injection. NetworkPolicy requires an enforcing CNI; plain kindnet is insufficient.

These controls keep real financial data outside the experiment. They do not establish that an untested financial write path is correct, and they cannot protect against an administrator deliberately bypassing the cluster boundary. Do not label an existing production/shared cluster as a lab.

## Common safety envelope

`chaos.py` uses explicit context arguments for every kubectl command. Enrollment pins the API server URL, TLS verification, `kube-system` UID, lab namespace UID and immutable application image. The runner additionally checks non-production/dedicated attestations, an allowlist of system/lab namespaces, only one injection-enabled namespace, dedicated nodes, exact NetworkPolicies and lab scripts, active admission guards, scoped controller settings, ready chaos daemons, resource metrics, DB identity and at least three healthy API pods.

Only one run can hold the atomic `chaos-run-lock` ConfigMap. Source selection is resolved to **one exact API pod**, whose UID is checked again after baseline. Network target pod names are pinned inside the same namespace. Neither the database, witness, controller, daemon, DNS nor a financial writer is a source fault target. A PDB does **not** prevent an intentional Chaos Mesh pod kill; the one-pod selector and readiness gates bound that fault instead.

Baseline: 30 seconds of 5 requests/second, at least five measured requests, <=1% technical errors, p99 <=1 second, no integrity violations and three ready API replicas. The short experiment window is not a substitute for the application's 30-day SLO.

Automatic abort signals:

- Any integrity violation, changed data digest, changed database pod UID, missing/non-finite/stale telemetry, changed cluster/namespace identity, unexpected protected-pod replacement or container restart.
- Fewer than two ready API replicas, an unready node, MemoryPressure/DiskPressure/PIDPressure, or node memory usage >=80% of allocatable. Metrics older than 45 seconds are rejected.
- During injection: >10% technical errors over the latest minute or API p99 >2 seconds. These are abort ceilings, not new production SLOs. HTTP rejections remain separate from technical failures; the synthetic load expects HTTP 200.
- Before stress: at least 128 MiB free inside the application container, a memory limit >=256 MiB, CPU limit <=1 core. Stress uses only 64 MB memory or one 80% CPU worker.

Continuous faults expire in 45–60 seconds. Traffic Jobs have an independent active deadline (110 seconds for the 75-second spike, 210 seconds for baseline/recovery traffic), no retries, one worker, <=20 in-flight requests, <=2,500 total requests and CPU/memory limits. An interrupted runner executes cleanup; if the runner is killed beyond handling, the native durations/deadlines still bound work while a healthy controller remains available. **Duration is not an unconditional rollback guarantee if the controller/daemon is unhealthy.** The preflight verifies that recovery path and cleanup failure is reported as `CLEANUP_REQUIRED`.

Recovery must return to three healthy API replicas, <=1% errors and p99 <=1 second for three consecutive observations within 120 seconds of fault deletion, with identical integrity digest. No observed injection, missing load, or missing stress evidence is a failed/inconclusive experiment, never a pass. Historical one-minute metrics naturally delay recovery confirmation.

## Run the lab

Prerequisites: Docker with sufficient resources for four kind nodes, kind, kubectl, Helm, Python 3.11+, a NetworkPolicy-enforcing CNI, and metrics-server with working kubelet TLS verification. The operator requires namespace-scoped experiment permissions and read-only safety inventory permissions; [safety/rbac.json](safety/rbac.json) provides the `banking-chaos-operators` group. It permits exec only in the fixed, read-only witness Pod and does not grant secret access. A cluster administrator installs the lab, CRDs and admission policies first. Chaos Mesh daemons have powerful host/runtime privileges, which is why a separate disposable cluster is mandatory.

1. Create a **new** dedicated cluster; do not reuse an existing name/context:

   ```sh
   kind create cluster --name banking-chaos --config infrastructure/chaos/kind.yaml
   kubectl --context kind-banking-chaos label namespace kube-system chaos.banking.io/environment=nonproduction chaos.banking.io/dedicated=true
   ```

   The supplied kind configuration disables kindnet. Install a compatible enforcing CNI such as Calico using its official installation instructions and the configured `192.168.0.0/16` pod CIDR. Install a compatible metrics-server. Wait for nodes, DNS and metrics API to be ready. Do not disable TLS checks to make the runner pass. The namespace allowlist includes the standard Calico operator/system/API namespaces; another approved CNI requires a reviewed allowlist change and the same live egress proof.

2. Build an audited image **from a clean checkout**, push it to your non-production registry and resolve its actual manifest digest:

   ```sh
   docker build -f infrastructure/chaos/lab/Dockerfile -t YOUR_NONPROD_REGISTRY/banking-chaos:REVIEWED_COMMIT .
   docker push YOUR_NONPROD_REGISTRY/banking-chaos:REVIEWED_COMMIT
   ```

   The dedicated Dockerfile copies only backend source and package manifests, never `.env` files. Use `YOUR_NONPROD_REGISTRY/banking-chaos@sha256:REAL_DIGEST` below. Tags and all-zero placeholder digests are rejected by the renderer. Pin/mirror the lab's third-party images to audited digests as part of a reviewed lab release; update the load admission envelope if changing its image reference.

3. Render and install the isolated lab (the renderer makes no cluster changes):

   ```sh
   python infrastructure/chaos/render_lab.py --image YOUR_NONPROD_REGISTRY/banking-chaos@sha256:REAL_DIGEST --output .local/chaos/lab.json
   python infrastructure/chaos/create_secrets.py
   kubectl --context kind-banking-chaos create namespace banking-chaos
   kubectl --context kind-banking-chaos apply -f .local/chaos/secrets.json
   kubectl --context kind-banking-chaos apply -f .local/chaos/lab.json
   ```

   `.local/` is ignored by Git. Credential generation refuses to overwrite existing credentials. Rendering includes the namespace's labels, quota, restricted Pod Security, network policies, HPA (3–5 replicas), PDB, isolated data services, witness, metrics and egress canary. Private image registries need a lab-only pull credential; review and add it to this isolated overlay, never reuse production cloud identities.

4. Install the pinned Chaos Mesh chart and admission boundaries:

   ```sh
   helm repo add chaos-mesh https://charts.chaos-mesh.org
   helm repo update chaos-mesh
   helm upgrade --install chaos-mesh chaos-mesh/chaos-mesh --kube-context kind-banking-chaos --namespace chaos-mesh --create-namespace --version 2.8.4 -f infrastructure/chaos/chaos-mesh-values.yaml --wait
   kubectl --context kind-banking-chaos apply -f infrastructure/chaos/safety/admission.json
   kubectl --context kind-banking-chaos apply -f infrastructure/chaos/safety/rbac.json
   kubectl --context kind-banking-chaos -n banking-chaos rollout status deployment/banking-api --timeout=180s
   kubectl --context kind-banking-chaos -n banking-chaos wait pod/integrity-witness --for=condition=Ready --timeout=180s
   ```

   Kubernetes 1.30+ is required for stable ValidatingAdmissionPolicy. The chart enables namespace filtering, disables cluster-wide targeting and host-network testing, and disables its dashboard. Only `banking-chaos` has `chaos-mesh.org/inject=enabled`. Admission denies other fault families, cross-namespace targets, unbounded stress, excessive durations, and arbitrary load Jobs. DELETE is intentionally allowed so rollback cannot be blocked by these validation rules.

5. Enroll the immutable environment identity, inspect one plan, and explicitly run one experiment:

   ```sh
   python infrastructure/chaos/chaos.py enroll --context kind-banking-chaos --image YOUR_NONPROD_REGISTRY/banking-chaos@sha256:REAL_DIGEST
   python infrastructure/chaos/chaos.py plan --experiment pod-crash
   python infrastructure/chaos/chaos.py run --experiment pod-crash
   ```

   Valid experiment names: `pod-crash`, `container-restart`, `database-connection`, `cpu-pressure`, `memory-pressure`, `network-latency`, `packet-loss`, `dependency-failure`, `traffic-spike`. Never `kubectl apply` the raw experiment templates: their placeholder selectors are deliberately not runnable. Start with pod/container faults; review results before proceeding to stress, network and traffic scenarios. Run one at a time, during a staffed lab window, with no other deployments or data changes.

   Every run writes a uniquely named JSON report under `.local/chaos/runs/`, including selected pod/DB UIDs, resource observations, data digests, telemetry, injection evidence, recovery outcome and cleanup status. Configuration and reports contain no database passwords or customer data. Explicit `--report` paths must not already exist.

## Rollback and emergency stop

The runner deletes only resources bearing its run ID and waits for finalizers/controller cleanup. It never scales production workloads, deletes a database, deletes a namespace, changes financial records or removes finalizers forcibly. SIGINT/SIGTERM triggers cleanup. If the terminal dies, use the saved report:

```sh
python infrastructure/chaos/chaos.py abort --report .local/chaos/runs/EXACT_RUN_REPORT.json
```

The abort command rechecks the enrolled cluster/namespace and resource ownership. If cleanup remains stuck, restore controller/daemon/API connectivity first, inspect the experiment's finalizers and events, and verify that the network/stress state is removed. Do not use `--force`, `--grace-period=0`, delete finalizers or remove the injection namespace annotation as a substitute for recovery. Killing the controller during a network fault can prevent recovery.

If the automatic stop detects an integrity change: stop load, remove the fault, isolate the disposable lab, preserve witness output and logs, and open a non-production incident. Do not blindly restore a snapshot or reset the database to hide the failed check. Operator confirmation of recovered health and unchanged data is required before another run. If only the lock remains after proven cleanup, an administrator may remove `chaos-run-lock` after checking its owner/run ID; the runner never breaks another run's lock.

For a pod kill, rollback means Kubernetes creates a healthy replacement; a deleted Pod cannot be resurrected. For a container kill, kubelet restarts the app. For stress/network faults, delete the exact Chaos Mesh resource and wait for finalization. For traffic spikes, delete the Job. The [experiment catalog](EXPERIMENTS.md) adds scenario-specific recovery checks.

## Observability and analysis

Port-forward **lab** Prometheus only:

```sh
kubectl --context kind-banking-chaos -n banking-chaos port-forward service/chaos-prometheus 19090:9090
```

Import [monitoring/dashboard.json](monitoring/dashboard.json) into a non-production Grafana and select a datasource pointing to this lab Prometheus. Every query is scoped to `namespace="banking-chaos"`; no experiment contributes to production SLO/error-budget accounting. The [lab rules](monitoring/rules.json) alert on integrity loss/staleness, errors and latency. They are local and intentionally have no production Alertmanager destination. If desired, route only to a separate non-production instance of the [incident module](../../apps/incident-management/README.md), retaining `environment="chaos-nonproduction"` in the incident context.

The runner independently checks live Kubernetes node/readiness/restart state and the integrity witness; it does not depend on alert delivery for rollback. Record events and selected pod logs before teardown, distinguishing the deliberately faulted pod from unaffected replicas. CPU/memory experiments additionally require a measured increase, not just an `AllInjected` condition. Correlate the report's UTC start/end with Grafana, Kubernetes events, readiness changes, HPA decisions and DB client timeouts. The edge adds a 500 ms dependency deadline and 1 s backend deadline; the clone uses a 10-connection read-only Mongo pool with explicit 0.5–1.5 s connection/queue/socket bounds. These are lab assumptions, not claims about existing production settings.

Use [POST_EXPERIMENT.md](POST_EXPERIMENT.md) for every run, including aborted/inconclusive runs. A PASS supports only that hypothesis under this blast radius and load. It does not establish regional disaster recovery, write atomicity, exactly-once settlement, multi-DB consistency or production capacity.

## Validation

```sh
python -m unittest discover -s infrastructure/chaos/tests -v
node --test infrastructure/chaos/tests/lab.test.cjs
```

`.github/workflows/chaos-validation.yml` also validates the pinned CRD schemas, builds the isolated backend image and uses a fresh ephemeral kind API server to server-dry-run allowed manifests and prove unsafe manifests are rejected by admission. No fault injection is performed in CI or during repository setup. An actual experiment result is created only by an explicit, successfully guarded `chaos.py run`.

References: [Chaos Mesh namespace filtering](https://chaos-mesh.org/docs/configure-enabled-namespace/), [network faults](https://chaos-mesh.org/docs/simulate-network-chaos-on-kubernetes/), [stress faults](https://chaos-mesh.org/docs/simulate-heavy-stress-on-kubernetes/), [Helm installation](https://chaos-mesh.org/docs/production-installation-using-helm/), and [Kubernetes admission policies](https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/).
