import copy, json, sys, tempfile, unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import chaos
from render_lab import render, NS, ROOT

IMAGE = "example.invalid/banking@sha256:" + "a" * 64


def concrete(name):
    doc = json.loads((ROOT / "experiments" / f"{name}.json").read_text())
    spec = doc["spec"]
    if doc["kind"] != "Job":
        spec["selector"]["pods"] = {NS: ["banking-api-abc-123"]}
        if "target" in spec:
            spec["target"]["selector"]["pods"] = {
                NS: (
                    ["chaos-mongodb-abc-123"]
                    if name == "database-connection"
                    else ["dependency-stub-abc-123"]
                )
            }
    return doc


def enrolled():
    config = {
        "context": "kind-banking-chaos",
        "apiServer": "https://127.0.0.1:1234",
        "clusterUid": "cluster-id",
        "namespaceUid": "ns-id",
    }
    cluster = {"clusters": [{"cluster": {"server": config["apiServer"]}}]}
    namespaces = [
        {
            "metadata": {
                "name": "kube-system",
                "uid": "cluster-id",
                "labels": {
                    "chaos.banking.io/environment": "nonproduction",
                    "chaos.banking.io/dedicated": "true",
                },
            }
        },
        {
            "metadata": {
                "name": NS,
                "uid": "ns-id",
                "labels": {
                    "chaos.banking.io/environment": "nonproduction",
                    "chaos.banking.io/data": "synthetic",
                },
                "annotations": {"chaos-mesh.org/inject": "enabled"},
            }
        },
    ]
    return config, cluster, namespaces


class Guards(unittest.TestCase):
    def test_all_nine_bounded_experiments(self):
        names = [p.stem for p in (ROOT / "experiments").glob("*.json")]
        self.assertEqual(len(names), 9)
        for name in names:
            chaos.validate_fault(concrete(name))

    def test_refuses_production_namespace_external_targets_and_unbounded_modes(self):
        variants = []
        x = concrete("pod-crash")
        x["metadata"]["namespace"] = "banking-production"
        variants.append(x)
        x = concrete("pod-crash")
        x["spec"]["mode"] = "all"
        variants.append(x)
        x = concrete("pod-crash")
        x["spec"]["selector"]["pods"] = {NS: ["chaos-mongodb-primary"]}
        variants.append(x)
        x = concrete("packet-loss")
        x["spec"]["externalTargets"] = ["production-db.example.com"]
        variants.append(x)
        x = concrete("cpu-pressure")
        x["spec"]["duration"] = "1h"
        variants.append(x)
        x = concrete("memory-pressure")
        x["spec"]["stressors"]["memory"]["size"] = "95%"
        variants.append(x)
        x = concrete("traffic-spike")
        x["spec"]["template"]["spec"]["containers"][0]["command"] = [
            "curl",
            "-X",
            "POST",
        ]
        variants.append(x)
        for doc in variants:
            with self.subTest(kind=doc["kind"]), self.assertRaises(chaos.Unsafe):
                chaos.validate_fault(doc)

    def test_identity_checks_uid_markers_inventory_and_tls(self):
        args = enrolled()
        chaos.check_identity(*args)
        for mutate in [
            lambda c, k, n: c.update(context="production"),
            lambda c, k, n: c.update(clusterUid="wrong"),
            lambda c, k, n: k["clusters"][0]["cluster"].update(
                {"insecure-skip-tls-verify": True}
            ),
            lambda c, k, n: n.append({"metadata": {"name": "banking-production"}}),
            lambda c, k, n: n[1]["metadata"]["labels"].update(
                {"chaos.banking.io/data": "customer"}
            ),
            lambda c, k, n: n[0]["metadata"].update(
                annotations={"chaos-mesh.org/inject": "enabled"}
            ),
        ]:
            args = copy.deepcopy(enrolled())
            mutate(*args)
            with self.assertRaises(chaos.Unsafe):
                chaos.check_identity(*args)

    def test_lab_cannot_mount_real_financial_storage_or_expose_services(self):
        docs = render(IMAGE)["items"]
        self.assertFalse(any(o["kind"] == "PersistentVolumeClaim" for o in docs))
        for obj in docs:
            if obj["kind"] == "Service":
                self.assertNotIn(
                    obj["spec"].get("type"),
                    ["NodePort", "LoadBalancer", "ExternalName"],
                )
            if obj["kind"] in ["Deployment", "Pod"]:
                spec = (
                    obj["spec"]["template"]["spec"]
                    if obj["kind"] == "Deployment"
                    else obj["spec"]
                )
                self.assertFalse(spec["automountServiceAccountToken"])
                self.assertTrue(
                    all(
                        not any(
                            k in v for k in ["hostPath", "persistentVolumeClaim", "csi"]
                        )
                        for v in spec["volumes"]
                    )
                )
        api = next(
            o
            for o in docs
            if o["kind"] == "Deployment" and o["metadata"]["name"] == "banking-api"
        )
        env = api["spec"]["template"]["spec"]["containers"][0]["env"]
        self.assertIn(
            "chaos-reader", next(e["value"] for e in env if e["name"] == "MONGO_URI")
        )
        self.assertFalse(
            any(
                e.get("valueFrom", {}).get("secretKeyRef", {}).get("key")
                == "mongo-root-password"
                for e in env
            )
        )
        with self.assertRaises(ValueError):
            render("banking:latest")

    def test_abort_checks_ownership_and_does_not_force_finalizers(self):
        class Fake:
            def __init__(self, owner):
                self.calls = []
                self.owner = owner

            def call(self, *args, **kwargs):
                self.calls.append(args)
                if args[0] == "get" and args[1] == "podchaos":
                    return {
                        "metadata": {"labels": {"chaos.banking.io/run": self.owner}}
                    }
                return ""

        report = {
            "runId": "run-1",
            "resources": [{"resource": "podchaos", "name": "chaos-run-1-fault"}],
        }
        with patch.object(chaos, "identity"):
            wrong = Fake("run-2")
            with self.assertRaises(chaos.Unsafe):
                chaos.cleanup(wrong, {}, report)
            self.assertFalse(any(c[0] == "delete" for c in wrong.calls))
            own = Fake("run-1")
            chaos.cleanup(own, {}, report)
            self.assertTrue(any(c[0] == "delete" for c in own.calls))
            self.assertNotIn("--force", str(own.calls))

    def test_integrity_failure_aborts_and_runs_cleanup(self):
        class Fake:
            def call(self, *args, **kwargs):
                return {}

        with tempfile.TemporaryDirectory() as tmp, patch.object(
            chaos, "plan", return_value={"experiment": "pod-crash"}
        ), patch.object(
            chaos, "snapshot", side_effect=chaos.Unsafe("integrity violated")
        ), patch.object(
            chaos, "cleanup"
        ) as clean:
            path = Path(tmp) / "report.json"
            with self.assertRaises(chaos.Unsafe):
                chaos.run(
                    Fake(), {"clusterUid": "a", "namespaceUid": "b"}, "pod-crash", path
                )
            clean.assert_called_once()
            report = json.loads(path.read_text())
            self.assertEqual(report["result"], "ABORTED")
            self.assertEqual(report["cleanup"], "confirmed")

    def test_missing_and_nonfinite_metrics_fail_closed(self):
        class Fake:
            def __init__(self, result):
                self.result = result

            def witness(self, *args):
                return self.result

        for result in [
            {"status": "success", "data": {"result": []}},
            {"status": "success", "data": {"result": [{"value": [0, "NaN"]}]}},
        ]:
            with self.assertRaises(chaos.Unsafe):
                chaos.prom(Fake(result), "up")


if __name__ == "__main__":
    unittest.main()
