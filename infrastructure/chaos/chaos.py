"""Fail-closed, explicit-context chaos runner. Standard library only; no shell commands."""

import argparse, copy, datetime, json, math, re, signal, subprocess, sys, time, uuid
from pathlib import Path
from render_lab import render, NS, ROOT

ALLOWED_NS = {
    "default",
    "kube-system",
    "kube-public",
    "kube-node-lease",
    "local-path-storage",
    "calico-system",
    "calico-apiserver",
    "tigera-operator",
    "chaos-mesh",
    NS,
    "chaos-egress-canary",
}
RESOURCES = {
    "PodChaos": "podchaos",
    "NetworkChaos": "networkchaos",
    "StressChaos": "stresschaos",
    "Job": "jobs",
}


class Unsafe(RuntimeError):
    pass


def require(condition, message):
    if not condition:
        raise Unsafe(message)


def ready(pod):
    return pod.get("status", {}).get("phase") == "Running" and any(
        c["type"] == "Ready" and c["status"] == "True"
        for c in pod.get("status", {}).get("conditions", [])
    )


def quantity(value):
    match = re.fullmatch(r"([0-9.]+)([a-zA-Z]*)", str(value))
    require(match is not None, "Invalid resource quantity")
    return (
        float(match[1])
        * {
            "": 1,
            "n": 1e-9,
            "u": 1e-6,
            "m": 0.001,
            "Ki": 1024,
            "Mi": 1024**2,
            "Gi": 1024**3,
            "Ti": 1024**4,
            "K": 1000,
            "M": 1e6,
            "G": 1e9,
        }[match[2]]
    )


def check_identity(config, kubeconfig, namespaces):
    context = config["context"]
    require(
        (context == "kind-banking-chaos" or context.startswith("banking-chaos-"))
        and "prod" not in context.lower(),
        "Context must be a dedicated chaos context",
    )
    cluster = kubeconfig["clusters"][0]["cluster"]
    require(
        cluster["server"] == config["apiServer"]
        and cluster["server"].startswith("https://")
        and not cluster.get("insecure-skip-tls-verify", False),
        "API server identity or TLS validation mismatch",
    )
    index = {n["metadata"]["name"]: n for n in namespaces}
    require(
        set(index) <= ALLOWED_NS, "Shared cluster detected: unapproved namespace exists"
    )
    for name, key in [("kube-system", "clusterUid"), (NS, "namespaceUid")]:
        require(
            name in index and index[name]["metadata"]["uid"] == config[key],
            f"{name} UID does not match enrollment",
        )
        labels = index[name]["metadata"].get("labels", {})
        require(
            labels.get("chaos.banking.io/environment") == "nonproduction",
            f"{name} lacks non-production attestation",
        )
    require(
        index["kube-system"]["metadata"]["labels"].get("chaos.banking.io/dedicated")
        == "true",
        "Cluster is not explicitly dedicated",
    )
    require(
        index[NS]["metadata"]["labels"].get("chaos.banking.io/data") == "synthetic",
        "Financial dataset is not synthetic",
    )
    enabled = [
        n["metadata"]["name"]
        for n in namespaces
        if n["metadata"].get("annotations", {}).get("chaos-mesh.org/inject")
        == "enabled"
    ]
    require(enabled == [NS], "Only the dedicated lab may allow injection")


def validate_fault(body):
    require(body["metadata"]["namespace"] == NS, "Fault escaped lab namespace")
    spec = body["spec"]
    kind = body["kind"]
    require(kind in RESOURCES, "Unsupported fault")
    if kind == "Job":
        require(
            spec["parallelism"] == 1
            and spec["completions"] == 1
            and spec["backoffLimit"] == 0
            and spec["activeDeadlineSeconds"] <= 210,
            "Unbounded load job",
        )
        pod = spec["template"]["spec"]
        c = pod["containers"][0]
        require(
            not pod["automountServiceAccountToken"]
            and c["command"]
            in [
                ["node", "/lab/load.cjs", "spike"],
                ["node", "/lab/load.cjs", "baseline"],
            ],
            "Unsafe load generator",
        )
        require(
            c["resources"]["limits"] == {"cpu": "300m", "memory": "128Mi"},
            "Unbounded load resources",
        )
        return
    require(spec["mode"] == "one", "Fault must affect exactly one source pod")
    selector = spec["selector"]
    require(
        selector["namespaces"] == [NS]
        and set(selector["pods"]) == {NS}
        and len(selector["pods"][NS]) == 1,
        "Unpinned source selector",
    )
    require(
        selector["pods"][NS][0].startswith("banking-api-"),
        "Only the stateless banking API may be faulted",
    )
    if kind == "PodChaos":
        require(
            spec["action"] in ["pod-kill", "container-kill"], "Unsupported pod fault"
        )
        if spec["action"] == "container-kill":
            require(
                spec["containerNames"] == ["app"], "Only app container may be restarted"
            )
        return
    require(spec["duration"] in ["45s", "60s"], "Fault must expire within one minute")
    if kind == "StressChaos":
        require(
            spec["containerNames"] == ["app"]
            and spec["stressors"]
            in [
                {"cpu": {"workers": 1, "load": 80}},
                {"memory": {"workers": 1, "size": "64MB"}},
            ]
            and not spec.get("stressngStressors"),
            "Unapproved stress envelope",
        )
    if kind == "NetworkChaos":
        require(
            spec["direction"] == "to"
            and not spec.get("externalTargets")
            and not spec.get("device"),
            "External or broad network target",
        )
        target = spec["target"]["selector"]
        require(
            target["namespaces"] == [NS]
            and set(target["pods"]) == {NS}
            and 1 <= len(target["pods"][NS]) <= 3,
            "Unpinned network target",
        )
        require(
            all(
                p.startswith(("chaos-mongodb-", "dependency-stub-"))
                for p in target["pods"][NS]
            ),
            "Network target is not a synthetic dependency",
        )
        require(
            spec["action"] in ["partition", "delay", "loss"],
            "Unsupported network action",
        )
        if spec["action"] == "delay":
            require(
                spec["delay"]
                == {"latency": "150ms", "jitter": "20ms", "correlation": "0"},
                "Latency envelope exceeded",
            )
        if spec["action"] == "loss":
            require(
                spec["loss"] == {"loss": "5", "correlation": "0"},
                "Loss envelope exceeded",
            )


class Client:
    def __init__(self, context):
        self.context = context

    def call(self, *args, body=None, json_output=True):
        cmd = ["kubectl", "--context", self.context, "--request-timeout=10s", *args]
        result = subprocess.run(
            cmd,
            input=json.dumps(body) if body is not None else None,
            text=True,
            capture_output=True,
            timeout=25,
            check=False,
        )
        if result.returncode:
            raise Unsafe(f"kubectl {args[0]} failed: {result.stderr[-1000:]}")
        return (
            json.loads(result.stdout)
            if json_output and result.stdout.strip()
            else result.stdout
        )

    def get(self, resource, name=None, namespace=NS):
        return self.call(
            "get",
            resource,
            *([name] if name else []),
            *(["-n", namespace] if namespace else []),
            "-o",
            "json",
        )

    def witness(self, script, *args):
        return self.call(
            "exec",
            "-n",
            NS,
            "integrity-witness",
            "-c",
            "witness",
            "--",
            "node",
            "-e",
            script,
            *args,
        )

    def fetch(self, url):
        return self.witness(
            "fetch(process.argv[1],{redirect:'error',signal:AbortSignal.timeout(3000)}).then(async r=>{if(!r.ok)throw Error('unhealthy');console.log(JSON.stringify(await r.json()))}).catch(()=>process.exit(1))",
            url,
        )


def identity(client, config):
    namespaces = client.get("namespaces", namespace=None)["items"]
    kubeconfig = client.call("config", "view", "--minify", "-o", "json")
    check_identity(config, kubeconfig, namespaces)


def policy_spec(spec):
    return {
        **spec,
        "ingress": spec.get("ingress", []),
        "egress": spec.get("egress", []),
    }


def preflight(client, config):
    identity(client, config)
    expected = render(config["backendImage"])["items"]
    policies = {
        o["metadata"]["name"]: policy_spec(o["spec"])
        for o in expected
        if o["kind"] == "NetworkPolicy"
    }
    actual = {
        o["metadata"]["name"]: policy_spec(o["spec"])
        for o in client.get("networkpolicies")["items"]
    }
    require(
        actual == policies,
        "NetworkPolicy drift or extra allow rule; stop and review isolation",
    )
    required = json.loads((ROOT / "safety/admission.json").read_text())["items"]
    for obj in required:
        resource = (
            "validatingadmissionpolicies"
            if obj["kind"] == "ValidatingAdmissionPolicy"
            else "validatingadmissionpolicybindings"
        )
        live = client.get(resource, obj["metadata"]["name"], namespace=None)
        for key, value in obj["spec"].items():
            require(
                live["spec"].get(key) == value, "Admission guard changed or missing"
            )
        require(
            not live.get("status", {})
            .get("typeChecking", {})
            .get("expressionWarnings"),
            "Admission expression type errors",
        )
    scripts = client.get("configmap", "chaos-lab-scripts")["data"]
    require(
        scripts
        == next(
            o["data"]
            for o in expected
            if o["kind"] == "ConfigMap" and o["metadata"]["name"] == "chaos-lab-scripts"
        ),
        "Lab scripts changed since review",
    )
    for svc in client.get("services")["items"]:
        require(
            svc["spec"].get("type", "ClusterIP") == "ClusterIP"
            and not svc["spec"].get("externalIPs")
            and not svc["spec"].get("externalName"),
            "Externally routed service in lab",
        )
    pods = client.get("pods")["items"]
    sources = [
        p for p in pods if p["metadata"].get("labels", {}).get("app") == "banking-api"
    ]
    require(
        len(sources) >= 3 and all(ready(p) for p in sources),
        "At least three ready API replicas required",
    )
    for p in pods:
        spec = p["spec"]
        require(
            not any(spec.get(k) for k in ["hostNetwork", "hostPID", "hostIPC"]),
            "Host namespace sharing forbidden",
        )
        require(
            not spec.get("automountServiceAccountToken", True),
            "Unexpected Kubernetes API credential mount",
        )
        require(
            all(
                not any(
                    k in v for k in ["persistentVolumeClaim", "hostPath", "csi", "nfs"]
                )
                for v in spec.get("volumes", [])
            ),
            "Only disposable storage is allowed",
        )
    for p in sources:
        require(
            p["metadata"]["labels"].get("chaos.banking.io/eligible") == "true",
            "Missing opt-in label",
        )
        app = next(c for c in p["spec"]["containers"] if c["name"] == "app")
        require(app["image"] == config["backendImage"], "Application image changed")
        require(not app.get("envFrom"), "Unreviewed environment injection")
        uri = next(
            (v.get("value") for v in app.get("env", []) if v["name"] == "MONGO_URI"), ""
        )
        require(
            uri.startswith(
                "mongodb://chaos-reader:$(MONGO_READ_PASSWORD)@chaos-mongodb.banking-chaos.svc.cluster.local:27017/banking_chaos?"
            ),
            "Database is not the read-only synthetic fixture",
        )
        require(
            quantity(app["resources"]["limits"]["memory"]) >= 256 * 1024**2
            and quantity(app["resources"]["limits"]["cpu"]) <= 1,
            "Application resource envelope invalid",
        )
    require(
        ready(
            next((p for p in pods if p["metadata"]["name"] == "integrity-witness"), {})
        ),
        "Integrity witness unavailable",
    )
    for deployment in ["chaos-mongodb", "dependency-stub"]:
        require(
            any(
                ready(p) and p["metadata"].get("labels", {}).get("app") == deployment
                for p in pods
            ),
            f"{deployment} unavailable",
        )
    controllers = client.get("deployments", namespace="chaos-mesh")["items"]
    found = False
    for deployment in controllers:
        for container in deployment["spec"]["template"]["spec"]["containers"]:
            env = {e["name"]: e.get("value") for e in container.get("env", [])}
            if env.get("TARGET_NAMESPACE") == NS:
                require(
                    env.get("CLUSTER_SCOPED") == "false"
                    and env.get("ENABLE_FILTER_NAMESPACE") == "true",
                    "Chaos Mesh namespace filtering is disabled",
                )
                require(
                    deployment.get("status", {}).get("availableReplicas", 0) > 0,
                    "Chaos controller unavailable",
                )
                found = True
    require(found, "No scoped Chaos Mesh controller found")
    daemons = client.get("daemonsets", namespace="chaos-mesh")["items"]
    require(
        any(
            d["spec"]["template"]["spec"]
            .get("nodeSelector", {})
            .get("chaos.banking.io/dedicated")
            == "true"
            and d.get("status", {}).get("desiredNumberScheduled", 0) > 0
            and d["status"].get("numberReady") == d["status"]["desiredNumberScheduled"]
            for d in daemons
        ),
        "Chaos daemon recovery path is not ready",
    )
    for resource in ["podchaos", "networkchaos", "stresschaos"]:
        require(
            not client.get(resource)["items"],
            "Existing chaos resource must be recovered and removed before a new run",
        )
    require(
        not any(
            j.get("status", {}).get("succeeded", 0) == 0
            and j.get("status", {}).get("failed", 0) == 0
            for j in client.get("jobs")["items"]
        ),
        "A load job is still active",
    )
    # Verify an enforcing CNI with a healthy, unrestricted destination in another namespace.
    canary = client.get("deployment", "egress-canary", namespace="chaos-egress-canary")
    require(
        canary.get("status", {}).get("availableReplicas", 0) == 1,
        "Egress test destination is not healthy",
    )
    blocked = client.witness(
        "const dns=require('node:dns').promises;(async()=>{await dns.lookup('egress-canary.chaos-egress-canary.svc.cluster.local');try{await fetch('http://egress-canary.chaos-egress-canary.svc.cluster.local:8081/status',{signal:AbortSignal.timeout(1500)});console.log(JSON.stringify({blocked:false}));}catch{console.log(JSON.stringify({blocked:true}));}})().catch(()=>process.exit(1))"
    )
    require(
        blocked["blocked"],
        "Network isolation test failed: cross-namespace egress is reachable",
    )
    health(client, config, minimum=3)
    return sorted(sources, key=lambda p: p["metadata"]["name"]), pods


def health(client, config, minimum=2):
    nodes = client.get("nodes", namespace=None)["items"]
    require(
        all(
            n["metadata"].get("labels", {}).get("chaos.banking.io/dedicated") == "true"
            for n in nodes
        ),
        "Shared node detected",
    )
    for node in nodes:
        conditions = {c["type"]: c["status"] for c in node["status"]["conditions"]}
        require(
            conditions.get("Ready") == "True"
            and all(
                conditions.get(k) == "False"
                for k in ["MemoryPressure", "DiskPressure", "PIDPressure"]
            ),
            "Node unhealthy or under pressure",
        )
    metrics = client.call("get", "--raw", "/apis/metrics.k8s.io/v1beta1/nodes")["items"]
    usage = {m["metadata"]["name"]: m for m in metrics}
    for node in nodes:
        name = node["metadata"]["name"]
        require(name in usage, "Node metrics missing")
        require(
            time.time()
            - datetime.datetime.fromisoformat(
                usage[name]["timestamp"].replace("Z", "+00:00")
            ).timestamp()
            < 45,
            "Node metrics stale",
        )
        require(
            quantity(usage[name]["usage"]["memory"])
            / quantity(node["status"]["allocatable"]["memory"])
            < 0.8,
            "Node memory exceeds 80% safety ceiling",
        )
    pods = client.get("pods")["items"]
    require(
        sum(
            ready(p) and p["metadata"].get("labels", {}).get("app") == "banking-api"
            for p in pods
        )
        >= minimum,
        "Insufficient healthy API replicas",
    )
    return pods


def snapshot(client, baseline=None):
    result = client.fetch("http://127.0.0.1:8082/snapshot")
    require(
        result["violations"] == 0
        and result["syntheticOnly"] is True
        and result.get("readOnlyRole") is True
        and time.time() - result["checkedAt"] < 10,
        "Financial integrity check failed or stale",
    )
    if baseline:
        require(
            result["hash"] == baseline["hash"],
            "Synthetic financial data changed; stop immediately and preserve evidence",
        )
    return result


def prom(client, expr):
    result = client.witness(
        "fetch('http://chaos-prometheus.banking-chaos.svc.cluster.local:9090/api/v1/query?query='+encodeURIComponent(process.argv[1]),{signal:AbortSignal.timeout(3000)}).then(r=>r.json()).then(j=>console.log(JSON.stringify(j))).catch(()=>process.exit(1))",
        expr,
    )
    require(
        result.get("status") == "success" and result["data"]["result"],
        "Prometheus has no required observations",
    )
    values = []
    for row in result["data"]["result"]:
        timestamp, value = row["value"]
        value = float(value)
        require(
            math.isfinite(value) and time.time() - timestamp < 15,
            "Metrics missing, non-finite or stale",
        )
        values.append(value)
    return values


def telemetry(client, baseline=False, enforce=True):
    select = 'namespace="banking-chaos"'
    # Query-result timestamps are evaluation times, not scrape times. Check the
    # underlying samples so a stopped scraper cannot leave convincing old rates.
    fresh = max(
        prom(
            client,
            f'sum((time() - timestamp(banking_chaos_http_requests_total{{{select},outcome="success"}})) < bool 15)',
        )
    )
    require(fresh >= 2, "Fewer than two API replicas have fresh metric samples")
    count = max(
        prom(
            client, f"sum(increase(banking_chaos_http_requests_total{{{select}}}[1m]))"
        )
    )
    require(count >= 5, "Not enough measured requests to assess reliability")
    errors = max(
        prom(
            client,
            f'sum(rate(banking_chaos_http_requests_total{{{select},outcome="technical_failure"}}[1m])) / sum(rate(banking_chaos_http_requests_total{{{select}}}[1m]))',
        )
    )
    p99 = max(
        prom(
            client,
            f"histogram_quantile(0.99,sum by (le)(rate(banking_chaos_http_duration_seconds_bucket{{{select}}}[1m])))",
        )
    )
    if enforce:
        require(
            errors <= (0.01 if baseline else 0.1),
            f"Technical failure ratio {errors:.3f} breached abort threshold",
        )
    if enforce:
        require(
            p99 <= (1 if baseline else 2), f"p99 {p99:.3f}s breached abort threshold"
        )
    return {
        "requests": count,
        "errorRatio": errors,
        "p99Seconds": p99,
        "freshMetricReplicas": fresh,
    }


def source_memory(client, pod):
    metrics = client.call(
        "get", "--raw", f"/apis/metrics.k8s.io/v1beta1/namespaces/{NS}/pods"
    )["items"]
    entry = next(
        (m for m in metrics if m["metadata"]["name"] == pod["metadata"]["name"]), None
    )
    require(entry is not None, "Source resource metrics missing")
    require(
        time.time()
        - datetime.datetime.fromisoformat(
            entry["timestamp"].replace("Z", "+00:00")
        ).timestamp()
        < 45,
        "Source metrics stale",
    )
    usage = next(c["usage"] for c in entry["containers"] if c["name"] == "app")
    limit = next(
        c["resources"]["limits"]["memory"]
        for c in pod["spec"]["containers"]
        if c["name"] == "app"
    )
    require(
        quantity(limit) - quantity(usage["memory"]) >= 128 * 1024**2,
        "Source lacks 128Mi memory headroom",
    )
    return usage


def plan(client, config, name):
    sources, pods = preflight(client, config)
    body = json.loads((ROOT / "experiments" / f"{name}.json").read_text())
    source = sources[0]
    if body["kind"] != "Job":
        body["spec"]["selector"]["pods"] = {NS: [source["metadata"]["name"]]}
        if body["kind"] == "NetworkChaos":
            app = body["spec"]["target"]["selector"]["labelSelectors"]["app"]
            targets = [
                p["metadata"]["name"]
                for p in pods
                if p["metadata"].get("labels", {}).get("app") == app and ready(p)
            ]
            require(1 <= len(targets) <= 3, "Unbounded or unavailable dependency")
            body["spec"]["target"]["selector"]["pods"] = {NS: targets}
    usage = source_memory(client, source)
    validate_fault(body)
    return {
        "experiment": name,
        "manifest": body,
        "sourceRestartCount": next(
            c.get("restartCount", 0)
            for c in source["status"]["containerStatuses"]
            if c["name"] == "app"
        ),
        "sourceUid": source["metadata"]["uid"],
        "sourceName": source["metadata"]["name"],
        "sourceUsage": usage,
        "databaseUids": sorted(
            p["metadata"]["uid"]
            for p in pods
            if p["metadata"].get("labels", {}).get("app") == "chaos-mongodb"
        ),
        "protectedPods": {
            p["metadata"]["uid"]: {
                "name": p["metadata"]["name"],
                "restarts": {
                    c["name"]: c.get("restartCount", 0)
                    for c in p.get("status", {}).get("containerStatuses", [])
                },
            }
            for p in pods
            if p["metadata"].get("labels", {}).get("app") != "chaos-load"
        },
        "plannedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }


def assert_blast_radius(prepared, pods, name):
    current = {p["metadata"]["uid"]: p for p in pods}
    for uid, original in prepared["protectedPods"].items():
        if uid == prepared["sourceUid"] and name == "pod-crash":
            continue
        require(uid in current, f"Unexpected pod replacement: {original['name']}")
        restarts = {
            c["name"]: c.get("restartCount", 0)
            for c in current[uid].get("status", {}).get("containerStatuses", [])
        }
        for container, count in original["restarts"].items():
            allowed = count + (
                1
                if uid == prepared["sourceUid"]
                and name == "container-restart"
                and container == "app"
                else 0
            )
            require(
                container in restarts and restarts[container] <= allowed,
                f"Unexpected restart: {original['name']}/{container}",
            )


def save_report(path, report):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, indent=2) + "\n")


def cleanup(client, config, report):
    identity(client, config)
    for resource in reversed(report["resources"]):
        current = client.call(
            "get",
            resource["resource"],
            resource["name"],
            "-n",
            NS,
            "--ignore-not-found",
            "-o",
            "json",
        )
        if not current:
            continue
        require(
            current["metadata"].get("labels", {}).get("chaos.banking.io/run")
            == report["runId"],
            "Refusing to delete a resource belonging to another run",
        )
        client.call(
            "delete",
            resource["resource"],
            resource["name"],
            "-n",
            NS,
            "--wait=true",
            "--timeout=20s",
            json_output=False,
        )
    lock = client.call(
        "get",
        "configmap",
        "chaos-run-lock",
        "-n",
        NS,
        "--ignore-not-found",
        "-o",
        "json",
    )
    if lock:
        require(lock["data"]["runId"] == report["runId"], "Another run owns the lock")
        client.call(
            "delete", "configmap", "chaos-run-lock", "-n", NS, json_output=False
        )


def run(client, config, name, path):
    prepared = plan(client, config, name)
    run_id = uuid.uuid4().hex[:12]
    report = {
        **prepared,
        "runId": run_id,
        "resources": [],
        "samples": [],
        "result": "RUNNING",
        "clusterUid": config["clusterUid"],
        "namespaceUid": config["namespaceUid"],
    }
    save_report(path, report)
    lock = {
        "apiVersion": "v1",
        "kind": "ConfigMap",
        "metadata": {"name": "chaos-run-lock", "namespace": NS},
        "data": {"runId": run_id, "report": str(path)},
    }
    client.call("create", "-f", "-", "-o", "json", body=lock)

    def create(body, suffix):
        body = copy.deepcopy(body)
        body["metadata"]["name"] = "chaos-" + run_id + "-" + suffix
        body["metadata"].setdefault("labels", {})["chaos.banking.io/run"] = run_id
        entry = {"resource": RESOURCES[body["kind"]], "name": body["metadata"]["name"]}
        report["resources"].append(entry)
        save_report(path, report)
        client.call("create", "--dry-run=server", "-f", "-", "-o", "json", body=body)
        client.call("create", "-f", "-", "-o", "json", body=body)
        return entry

    try:
        baseline = snapshot(client)
        report["baseline"] = baseline
        steady = json.loads((ROOT / "experiments/traffic-spike.json").read_text())
        steady["spec"]["template"]["spec"]["containers"][0]["command"][-1] = "baseline"
        steady["spec"]["activeDeadlineSeconds"] = 210
        load = create(steady, "baseline")
        # Fresh traffic and scrapes must demonstrate a stable baseline before any fault.
        deadline = time.monotonic() + 30
        while time.monotonic() < deadline:
            identity(client, config)
            health(client, config, 3)
            snapshot(client, baseline)
            time.sleep(5)
        report["baselineTelemetry"] = telemetry(client, True)
        # Recheck selected UID after the baseline; never silently substitute a replacement pod.
        require(
            client.get("pod", prepared["sourceName"])["metadata"]["uid"]
            == prepared["sourceUid"],
            "Selected pod changed during baseline",
        )
        if name == "traffic-spike":
            client.call(
                "delete",
                "job",
                load["name"],
                "-n",
                NS,
                "--wait=true",
                json_output=False,
            )
        fault = create(prepared["manifest"], "fault")
        injected = False
        start = time.monotonic()
        deadline = start + (90 if name == "traffic-spike" else 65)
        while time.monotonic() < deadline:
            identity(client, config)
            pods = health(client, config)
            assert_blast_radius(prepared, pods, name)
            snapshot(client, baseline)
            require(
                sorted(
                    p["metadata"]["uid"]
                    for p in pods
                    if p["metadata"].get("labels", {}).get("app") == "chaos-mongodb"
                )
                == prepared["databaseUids"],
                "Database pod changed; baseline is no longer valid",
            )
            live = client.get(fault["resource"], fault["name"])
            conditions = live.get("status", {}).get("conditions", [])
            injected = injected or any(
                c["type"] == "AllInjected" and c["status"] == "True" for c in conditions
            )
            if name == "pod-crash":
                injected = injected or not any(
                    p["metadata"]["uid"] == prepared["sourceUid"] for p in pods
                )
            sample = {
                "elapsedSeconds": round(time.monotonic() - start, 1),
                **telemetry(client),
            }
            if name in ["cpu-pressure", "memory-pressure"]:
                measured = client.call(
                    "get", "--raw", f"/apis/metrics.k8s.io/v1beta1/namespaces/{NS}/pods"
                )["items"]
                target = next(
                    (
                        m
                        for m in measured
                        if m["metadata"]["name"] == prepared["sourceName"]
                    ),
                    None,
                )
                require(target is not None, "Source stress metrics missing")
                require(
                    time.time()
                    - datetime.datetime.fromisoformat(
                        target["timestamp"].replace("Z", "+00:00")
                    ).timestamp()
                    < 45,
                    "Stress evidence stale",
                )
                sample["sourceUsage"] = next(
                    c["usage"] for c in target["containers"] if c["name"] == "app"
                )
            report["samples"].append(sample)
            save_report(path, report)
            if name == "traffic-spike":
                require(
                    not live.get("status", {}).get("failed"),
                    "Load job failed its success thresholds",
                )
                if live.get("status", {}).get("succeeded"):
                    injected = True
                    break
            time.sleep(5)
        require(
            injected, "Injection was not observed; this is inconclusive, not a pass"
        )
        report["injectionObserved"] = True
        if name == "cpu-pressure":
            require(
                max(quantity(s["sourceUsage"]["cpu"]) for s in report["samples"])
                > quantity(prepared["sourceUsage"]["cpu"]) + 0.05,
                "CPU stress was not measurably observed",
            )
        if name == "memory-pressure":
            require(
                max(quantity(s["sourceUsage"]["memory"]) for s in report["samples"])
                > quantity(prepared["sourceUsage"]["memory"]) + 32 * 1024**2,
                "Memory stress was not measurably observed",
            )
        if name == "container-restart":
            current = client.get("pod", prepared["sourceName"])
            require(
                current["metadata"]["uid"] == prepared["sourceUid"],
                "Pod replacement is not a container restart",
            )
            require(
                any(
                    c["name"] == "app"
                    and c.get("restartCount", 0) > prepared["sourceRestartCount"]
                    for c in current["status"]["containerStatuses"]
                ),
                "Application restart not observed",
            )
        # Remove the fault first, preserving baseline traffic for recovery measurement.
        client.call(
            "delete",
            fault["resource"],
            fault["name"],
            "-n",
            NS,
            "--wait=true",
            "--timeout=20s",
            json_output=False,
        )
        if name == "traffic-spike":
            load = create(steady, "recovery-load")
        recovery_start = time.monotonic()
        end = recovery_start + 120
        stable = 0
        while time.monotonic() < end:
            identity(client, config)
            snapshot(client, baseline)
            pods = health(client, config, 2)
            assert_blast_radius(prepared, pods, name)
            stats = telemetry(client, True, enforce=False)
            stable = (
                stable + 1
                if sum(
                    ready(p)
                    and p["metadata"].get("labels", {}).get("app") == "banking-api"
                    for p in pods
                )
                >= 3
                and stats["errorRatio"] <= 0.01
                and stats["p99Seconds"] <= 1
                else 0
            )
            if stable >= 3:
                report["recoveryTelemetry"] = stats
                report["recoverySeconds"] = round(time.monotonic() - recovery_start, 1)
                break
            time.sleep(5)
        require(stable >= 3, "Recovery failed within two minutes")
        report["finalIntegrity"] = snapshot(client, baseline)
        report["result"] = "PASS"
    except BaseException as exc:
        report["result"] = "ABORTED"
        report["reason"] = str(exc) or type(exc).__name__
        raise
    finally:
        try:
            cleanup(client, config, report)
            report["cleanup"] = "confirmed"
        except BaseException as exc:
            report["cleanup"] = "FAILED: " + str(exc)
            report["result"] = "CLEANUP_REQUIRED"
        report["finishedAt"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        save_report(path, report)
    require(
        report["cleanup"] == "confirmed",
        "Cleanup unconfirmed; operator intervention required",
    )
    return report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["enroll", "plan", "run", "abort"])
    parser.add_argument("--config", default=".local/chaos/environment.json")
    parser.add_argument("--context")
    parser.add_argument("--image")
    parser.add_argument(
        "--experiment", choices=[p.stem for p in (ROOT / "experiments").glob("*.json")]
    )
    parser.add_argument("--report")
    args = parser.parse_args()
    if args.command == "enroll":
        require(args.context and args.image, "Enrollment needs --context and --image")
        render(args.image)
        client = Client(args.context)
        kubeconfig = client.call("config", "view", "--minify", "-o", "json")
        namespaces = client.get("namespaces", namespace=None)["items"]
        ids = {n["metadata"]["name"]: n["metadata"]["uid"] for n in namespaces}
        config = {
            "context": args.context,
            "apiServer": kubeconfig["clusters"][0]["cluster"]["server"],
            "clusterUid": ids["kube-system"],
            "namespaceUid": ids[NS],
            "backendImage": args.image,
        }
        check_identity(config, kubeconfig, namespaces)
        save_report(Path(args.config), config)
        print("Read-only enrollment saved; no faults created.")
        return
    config = json.loads(Path(args.config).read_text())
    client = Client(config["context"])
    if args.command == "abort":
        require(args.report, "Abort requires the saved --report path")
        report = json.loads(Path(args.report).read_text())
        require(
            report["clusterUid"] == config["clusterUid"]
            and report["namespaceUid"] == config["namespaceUid"],
            "Report belongs to another environment",
        )
        cleanup(client, config, report)
        print(
            "Owned resources deleted; verify health and integrity before releasing the lab."
        )
        return
    require(args.experiment, "Choose exactly one --experiment")
    if args.command == "plan":
        print(json.dumps(plan(client, config, args.experiment), indent=2))
    else:
        path = (
            Path(args.report)
            if args.report
            else Path(".local/chaos/runs")
            / (
                args.experiment
                + "-"
                + datetime.datetime.now(datetime.timezone.utc).strftime(
                    "%Y%m%dT%H%M%SZ"
                )
                + "-"
                + uuid.uuid4().hex[:6]
                + ".json"
            )
        )
        require(not path.exists(), "Refusing to overwrite experiment evidence")
        print(f"Evidence: {path}", file=sys.stderr)
        print(
            json.dumps(
                {
                    "result": run(client, config, args.experiment, path)["result"],
                    "report": str(path),
                }
            )
        )


if __name__ == "__main__":
    signal.signal(
        signal.SIGTERM,
        lambda *_: (_ for _ in ()).throw(KeyboardInterrupt("Termination requested")),
    )
    try:
        main()
    except (Unsafe, KeyError, ValueError, OSError, subprocess.SubprocessError) as exc:
        print(f"BLOCKED/ABORTED: {exc}", file=sys.stderr)
        sys.exit(1)
