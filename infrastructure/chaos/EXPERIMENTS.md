# Experiment catalog

All nine experiments inherit the mandatory cluster, namespace, read-only data, baseline, automatic abort and recovery gates in [README.md](README.md). Budgets below are **lab-specific**; they do not relax the application's 30-day production SLOs. Each result must include the [post-experiment report](POST_EXPERIMENT.md).

## 1. Pod crash — `pod-crash`

- **Hypothesis:** losing one stateless banking API Pod does not interrupt the aggregate read service or alter financial state.
- **Expected system behavior:** Service endpoints stop routing to the lost Pod; the Deployment creates a replacement; two other ready replicas continue answering. Pod identity changes. A PDB is not a guarantee against intentional Pod deletion.
- **Blast radius:** one explicitly pinned `banking-api-*` Pod, once, out of at least three ready replicas; no data, witness or control-plane Pod is targeted.
- **Safety checks:** verify controller ownership, three ready API replicas, no concurrent rollout, exact source UID, independent witness and healthy remaining nodes. Common error/latency gates remain active.
- **Observability signals:** disappearance of the original UID, Deployment replica readiness, endpoint recovery, request errors, p95/p99, replacement startup events and integrity digest. No other original Pod may disappear/restart.
- **Rollback procedure:** remove the PodChaos object, then wait for the Deployment's replacement to be ready. Do not delete additional Pods or scale anything outside the lab. A terminated Pod itself cannot be restored.
- **Success criteria:** original UID disappears (actual injection proof), at least two ready APIs remain, no unrelated restart/replacement, active errors <=10% and p99 <=2 s; three replicas and baseline performance recover within 120 s of deletion; financial digest unchanged.
- **Post-experiment analysis:** compare readiness withdrawal and startup times with request failures; identify whether failed calls came from the killed Pod or a routing/readiness defect. Record replacement UID, image and node placement.

## 2. Container restart — `container-restart`

- **Hypothesis:** the banking process can restart independently inside one Pod while the replica set preserves read availability.
- **Expected system behavior:** kubelet restarts only container `app`; the Pod UID and edge container remain unchanged. Edge readiness becomes unhealthy until the backend reconnects using the read-only DB identity.
- **Blast radius:** exactly one application container in one selected API Pod, one kill; no edge, database, witness or daemon container.
- **Safety checks:** three healthy replicas, restart counters captured before injection, restartPolicy managed by the Deployment, safe process liveness/readiness checks and an unchanged lab dataset.
- **Observability signals:** `app` restart count increases by one, unchanged source Pod UID, unchanged edge/other restart counters, readiness transitions, startup errors, request latency and database reconnect behavior.
- **Rollback procedure:** delete the PodChaos resource and wait for kubelet/readiness recovery. If the process enters a restart loop, stop all experiments and investigate the image/configuration; do not repeatedly kill it.
- **Success criteria:** observed app restart increment on the same Pod, no additional/unrelated restarts, common availability/latency gates remain satisfied and stable recovery occurs within 120 s; digest unchanged.
- **Post-experiment analysis:** separate process startup, Mongo reconnection and readiness delays. Check whether crash-loop prevention or startupProbe tuning is needed. A replaced Pod does not count as a successful container-restart test.

## 3. Database connection failure — `database-connection`

- **Hypothesis:** a single replica with an unreachable database fails read requests within a bounded deadline, withdraws readiness and recovers its pool without misleading successful responses.
- **Expected system behavior:** selected replica's DB calls fail/timeout; edge returns technical HTTP 503 and removes the replica from ready endpoints; other replicas continue reading. No request becomes a write or a fabricated zero balance.
- **Blast radius:** 45-second outbound NetworkChaos partition from one API Pod only to exact `chaos-mongodb-*` Pod IPs in `banking-chaos`. The database itself and witness-to-DB connectivity remain healthy.
- **Safety checks:** database Pod identity is pinned, no external/managed database targets, app/witness roles are read-only, finite DB/HTTP deadlines, witness remains readable, source selection excludes database Pods.
- **Observability signals:** bounded 503s, readiness withdrawal, Mongo connection/queue timeout logs, error ratio, p99, unaffected replica behavior, pool recovery and fresh independent integrity snapshots.
- **Rollback procedure:** delete the exact NetworkChaos object and wait for finalizer recovery; verify reconnection and consistent balances. If traffic remains blocked, restore controller/daemon connectivity; never force-clear finalizers or restart the database to mask the fault.
- **Success criteria:** injection observed; aggregate safety limits hold despite selected-replica failures; no queued writes exist; read service returns to baseline within 120 s and the hash/DB UID remain unchanged.
- **Post-experiment analysis:** compare caller deadline with actual driver timeout, connection-pool occupancy and reconnect delay. Identify excess buffering or retry amplification. This read-only test does not validate atomicity of interrupted transfers.

## 4. High CPU — `cpu-pressure`

- **Hypothesis:** bounded CPU saturation in one banking container degrades locally while cgroup limits and replica capacity protect the cluster and read service.
- **Expected system behavior:** one 80% CPU worker competes with `app` for at most 60 seconds; the 500m app limit bounds actual CPU usage. Some latency/throttling is possible; HPA may add replicas, up to five.
- **Blast radius:** one application container only, one worker at load 80; never a node-wide or all-Pod stress command.
- **Safety checks:** available node memory, healthy nodes, bounded app CPU limit, at least three replicas, fresh metrics-server measurements, no concurrent stress. HPA/resource quota cap any scale-out.
- **Observability signals:** selected-container CPU usage, CPU throttling (if cAdvisor is installed), request percentiles/errors, ready replicas, HPA desired/current count and node pressure. CPU growth must be measured, not inferred from controller status.
- **Rollback procedure:** delete StressChaos; verify the stress process stops, usage returns toward baseline and latency recovers. Let normal HPA stabilization handle scale-down; do not force-delete replicas.
- **Success criteria:** measured CPU increase >0.05 core over baseline, no unintended restart/pressure, aggregate abort ceilings respected and stable recovery within 120 s; financial digest unchanged. HPA scale-out is supporting evidence, not mandatory during a short experiment.
- **Post-experiment analysis:** compare CPU quota, throttle time and p95/p99. Assess whether readiness, resource requests or HPA sampling caused oscillation. Do not extrapolate production capacity from this synthetic read workload.

## 5. Memory pressure — `memory-pressure`

- **Hypothesis:** moderate, bounded memory pressure in one application container is absorbed without OOM or node pressure.
- **Expected system behavior:** the stress process allocates 64 MB for 45 seconds; the application remains within its 512 MiB limit and releases the additional usage after recovery.
- **Blast radius:** one application container, one memory worker; no percentage-based allocation, database stress, node pressure test, swap manipulation or intended OOM.
- **Safety checks:** at least 128 MiB headroom in the selected container, node usage <80% of allocatable, fresh memory metrics, three ready replicas and resource limits. Any unintended restart or node pressure aborts.
- **Observability signals:** selected-container working memory through metrics-server, OOMKilled/restart events, node MemoryPressure, readiness, p99 and integrity snapshots. Record runtime/GC evidence where available.
- **Rollback procedure:** delete StressChaos and verify allocation is released. If OOM occurs unexpectedly, stop and preserve container status/logs; do not rerun with a larger allocation.
- **Success criteria:** observed memory growth >32 MiB above baseline, no OOM/restart on any protected container, no node pressure, common reliability limits hold and stable recovery completes within 120 s; digest unchanged.
- **Post-experiment analysis:** quantify remaining headroom and memory return after removal. Separate application retention/GC from the injected stress process. Treat an unexpected OOM as a failure, not a successful simulation.

## 6. Network latency — `network-latency`

- **Hypothesis:** modest delay on one replica's dependency path remains within caller deadlines without degrading unaffected replicas.
- **Expected system behavior:** approximately 150 ms delay with 20 ms jitter is added on traffic from the selected API Pod toward the synthetic dependency for 60 seconds. This is packet-level delay, so TCP handshakes and multiple packets can compound application latency.
- **Blast radius:** one exact source Pod to exact `dependency-stub-*` targets only, direction `to`; no DNS, API server, witness, daemon, ingress-wide or external target.
- **Safety checks:** known healthy dependency, finite 500 ms dependency deadline, intact chaos controller/daemon network, low baseline latency and readiness redundancy. Abort on sustained aggregate tail-latency/error ceilings.
- **Observability signals:** controller injection condition, per-instance edge duration histogram, aggregate p95/p99, dependency timeouts, readiness and request volume. The experiment intentionally does not weaken production latency targets.
- **Rollback procedure:** delete NetworkChaos, wait for finalizer cleanup and confirm normal latency on the previously selected Pod. Preserve event evidence if network state is not removed.
- **Success criteria:** injection observed, aggregate errors <=10% and p99 <=2 s, no unrelated Pod changes, baseline recovery within 120 s and unchanged data digest. Review per-instance histograms to confirm the intended path was exercised.
- **Post-experiment analysis:** attribute latency to dependency calls, connection establishment and retries; compare median versus tail behavior and verify that clients did not turn bounded delay into unbounded work.

## 7. Packet loss — `packet-loss`

- **Hypothesis:** small dependency-path packet loss causes bounded TCP recovery or controlled technical failures, without an application retry storm.
- **Expected system behavior:** 5% loss with zero correlation is applied for 60 seconds from one API Pod to the dependency stub. TCP retransmissions can hide packet loss or increase latency; 5% packet loss does not imply 5% HTTP failures.
- **Blast radius:** one pinned source and in-namespace synthetic dependency target only; traffic to database, DNS and chaos recovery components is untouched.
- **Safety checks:** no externalTargets, 5% maximum loss in admission and runner validation, three ready replicas, finite deadlines, independent witness and healthy control plane.
- **Observability signals:** injection condition, per-instance request latency, errors/timeouts, connection/retransmit observations if available, aggregate throughput, readiness and recovery time.
- **Rollback procedure:** delete NetworkChaos and verify the traffic-control loss rule is recovered before another experiment. Do not remove controller connectivity or force finalizers.
- **Success criteria:** observed injection with continuing measured requests, no unintended restart/pressure, common reliability bounds hold, baseline recovers within 120 s and financial digest remains identical.
- **Post-experiment analysis:** distinguish TCP-level retransmission from application-level retries. Investigate amplification, connection churn or inconsistent caller deadlines. Report insufficient traffic as inconclusive rather than claiming loss tolerance.

## 8. Dependency failure — `dependency-failure`

- **Hypothesis:** complete loss of one replica's dependency path returns a clear technical failure within a bounded deadline, while healthy replicas remain usable.
- **Expected system behavior:** the edge cannot reach its synthetic dependency for 45 seconds, returns 503 and withdraws readiness. The stub models an unavailable upstream; it is not a live payment provider and no requests leave the lab.
- **Blast radius:** one API Pod's outbound path to exact `dependency-stub-*` Pods; neither the dependency Pod itself nor other replicas are killed.
- **Safety checks:** dependency target is synthetic and same-namespace; no real credentials or providers; source labels/UID pinned; controller/daemon route and witness remain unaffected; common rollback thresholds apply.
- **Observability signals:** dependency timeout classification, readiness, healthy replica traffic, technical failures versus business rejections, backend request backlog (if instrumented), controller recovery and integrity checks.
- **Rollback procedure:** delete the partition, wait for cleanup and verify dependency health plus recovered edge readiness. Do not convert failed dependency calls into HTTP 200 fallbacks that report an invented account balance.
- **Success criteria:** bounded technical failures only, aggregate safety limits remain satisfied, healthy replicas continue serving, recovery within 120 s and no data changes. Any financial write, silent success or invalid balance is failure.
- **Post-experiment analysis:** inspect failure propagation, timeouts and readiness behavior. The existing backend has no such outbound dependency; the lab edge supplies this explicit fault boundary. A real circuit-breaker/retry implementation needs its own integration test; this result does not assert that one exists.

## 9. Sudden traffic spike — `traffic-spike`

- **Hypothesis:** a bounded 10x read-traffic increase is handled without corrupting state or destabilizing unrelated workloads.
- **Expected system behavior:** after a stable baseline, one Job offers 5 rps for 15 s, 50 rps for 45 s, then 5 rps for 15 s. Maximum 2,400 scheduled requests, 20 concurrent requests, 2 s request timeout; CPU/memory and the 110 s Job deadline bound resource use. HPA may scale from three to at most five replicas.
- **Blast radius:** only the lab's read-only `/balance` endpoint and its synthetic dependencies; one load-generator Pod, no external URLs, account creation, transfers or payment calls.
- **Safety checks:** literal destination and GET-only code, admission-fixed Job command/image/resource envelope, NetworkPolicy, no token mount or secret env, no Job retry/parallel workers, resource quota and fresh observer data. Dropped iterations or >10% failed requests fail the load Job.
- **Observability signals:** achieved request rate, generator total/failed/dropped counts and p95/p99 from Job logs/termination message, application error/latency histograms, CPU/memory, HPA response and data digest.
- **Rollback procedure:** delete the exact load Job and wait for its Pod to terminate; retain baseline recovery traffic briefly for measured recovery, then delete all run-owned Jobs. Do not raise the rate to compensate for dropped iterations.
- **Success criteria:** Job completes successfully within its deadline, no dropped work or >10% errors/p99 >2 s, runner safety checks remain healthy, no unrelated restart/pressure, baseline restored within 120 s and unchanged financial hash.
- **Post-experiment analysis:** compare offered versus achieved throughput and quantify saturation, scaling lag and queueing. Record workload realism and limits; a read-only synthetic success does not justify increasing production payment throughput.
