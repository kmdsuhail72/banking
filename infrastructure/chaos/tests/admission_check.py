"""Validate admission using an ephemeral CI API server; never persist faults."""

import copy
import json
import subprocess
import time
from test_safety import concrete, ROOT

CONTEXT = "kind-banking-chaos-validation"


def kubectl(*args, doc=None):
    return subprocess.run(
        ["kubectl", "--context", CONTEXT, "--request-timeout=15s", *args],
        input=json.dumps(doc) if doc else None,
        text=True,
        capture_output=True,
        timeout=30,
    )


def check(doc, allowed):
    result = kubectl("create", "--dry-run=server", "-f", "-", doc=doc)
    if allowed:
        assert result.returncode == 0, result.stderr
    else:
        assert (
            result.returncode != 0
            and "banking-chaos-" in result.stderr
            and "denied" in result.stderr.lower()
        ), result.stderr


if __name__ == "__main__":
    # Admission registration is asynchronous. Poll readiness using a safe dry-run.
    bad = concrete("pod-crash")
    bad["spec"]["mode"] = "all"
    for attempt in range(30):
        result = kubectl("create", "--dry-run=server", "-f", "-", doc=bad)
        if result.returncode and "denied" in result.stderr.lower():
            break
        time.sleep(2)
    else:
        raise AssertionError("Admission policy never became active")
    policies = kubectl("get", "validatingadmissionpolicies", "-o", "json")
    assert policies.returncode == 0, policies.stderr
    for policy in json.loads(policies.stdout)["items"]:
        assert (
            not policy.get("status", {})
            .get("typeChecking", {})
            .get("expressionWarnings")
        ), policy
    # Keep preflight's exact comparison compatible with API-server defaults.
    for expected in json.loads((ROOT / "safety/admission.json").read_text())["items"]:
        live = kubectl("get", expected["kind"], expected["metadata"]["name"], "-o", "json")
        assert live.returncode == 0, live.stderr
        actual = json.loads(live.stdout)["spec"]
        for key, value in expected["spec"].items():
            assert actual.get(key) == value, (expected["metadata"]["name"], key, actual.get(key), value)
    for name in [
        "pod-crash",
        "container-restart",
        "database-connection",
        "cpu-pressure",
        "memory-pressure",
        "network-latency",
        "packet-loss",
        "dependency-failure",
        "traffic-spike",
    ]:
        check(concrete(name), True)
    check(bad, False)
    oversized = concrete("traffic-spike")
    oversized["spec"]["template"]["spec"]["containers"][0]["resources"]["limits"][
        "cpu"
    ] = "4"
    check(oversized, False)
    for name, mutate in [
        ("pod-crash", lambda d: d["metadata"].update(namespace="default")),
        (
            "pod-crash",
            lambda d: d["spec"]["selector"].update(
                pods={"banking-chaos": ["chaos-mongodb-primary"]}
            ),
        ),
        ("cpu-pressure", lambda d: d["spec"].update(duration="1h")),
        (
            "memory-pressure",
            lambda d: d["spec"]["stressors"]["memory"].update(size="95%"),
        ),
        (
            "packet-loss",
            lambda d: d["spec"].update(externalTargets=["production.example.com"]),
        ),
        (
            "traffic-spike",
            lambda d: d["spec"]["template"]["spec"]["containers"][0].update(
                command=["sh", "-c", "exit 0"]
            ),
        ),
    ]:
        doc = copy.deepcopy(concrete(name))
        mutate(doc)
        check(doc, False)
    print(
        "Nine allowed manifests and eight unsafe variants checked; no faults persisted."
    )
