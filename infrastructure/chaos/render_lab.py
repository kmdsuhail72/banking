"""Render a disposable clone of backend/, never the production Helm values."""

import argparse, json, re, secrets
from pathlib import Path

ROOT = Path(__file__).resolve().parent
NS = "banking-chaos"
LABELS = {
    "app.kubernetes.io/part-of": "banking-chaos",
    "chaos.banking.io/data": "synthetic",
}


def obj(kind, name, spec=None, api="v1", namespace=NS, **extra):
    d = {
        "apiVersion": api,
        "kind": kind,
        "metadata": {"name": name, **({"namespace": namespace} if namespace else {})},
    }
    if spec is not None:
        d["spec"] = spec
    d.update(extra)
    return d


def labels(app):
    return {**LABELS, "app": app}


def security():
    return {
        "allowPrivilegeEscalation": False,
        "readOnlyRootFilesystem": True,
        "runAsNonRoot": True,
        "runAsUser": 1000,
        "capabilities": {"drop": ["ALL"]},
        "seccompProfile": {"type": "RuntimeDefault"},
    }


def container(name, image, port, command=None):
    c = {
        "name": name,
        "image": image,
        "ports": [{"name": "http", "containerPort": port}],
        "resources": {
            "requests": {"cpu": "100m", "memory": "128Mi"},
            "limits": {"cpu": "500m", "memory": "512Mi"},
        },
        "securityContext": security(),
        "volumeMounts": [
            {"name": "scripts", "mountPath": "/lab", "readOnly": True},
            {"name": "tmp", "mountPath": "/tmp"},
        ],
    }
    if command:
        c["command"] = command
    return c


def deployment(name, containers, replicas=1, eligible=False):
    ls = labels(name)
    if eligible:
        ls["chaos.banking.io/eligible"] = "true"
    return obj(
        "Deployment",
        name,
        {
            "replicas": replicas,
            "selector": {"matchLabels": {"app": name}},
            "strategy": {
                "type": "RollingUpdate",
                "rollingUpdate": {"maxUnavailable": 0, "maxSurge": 1},
            },
            "template": {
                "metadata": {"labels": ls},
                "spec": {
                    "automountServiceAccountToken": False,
                    "nodeSelector": {"chaos.banking.io/dedicated": "true"},
                    "terminationGracePeriodSeconds": 20,
                    "containers": containers,
                    "volumes": [
                        {"name": "scripts", "configMap": {"name": "chaos-lab-scripts"}},
                        {"name": "tmp", "emptyDir": {"sizeLimit": "64Mi"}},
                    ],
                },
            },
        },
        api="apps/v1",
    )


def service(name, port, headless=False):
    return obj(
        "Service",
        name,
        {
            "selector": {"app": "banking-api" if headless else name},
            "ports": [{"port": port, "targetPort": port}],
            **(
                {"clusterIP": "None", "publishNotReadyAddresses": True}
                if headless
                else {}
            ),
        },
    )


def secret_env(name, key):
    return {
        "name": name,
        "valueFrom": {"secretKeyRef": {"name": "chaos-lab-auth", "key": key}},
    }


def mongo_env():
    return [
        secret_env("MONGO_READ_PASSWORD", "mongo-read-password"),
        {
            "name": "MONGO_URI",
            "value": "mongodb://chaos-reader:$(MONGO_READ_PASSWORD)@chaos-mongodb.banking-chaos.svc.cluster.local:27017/banking_chaos?authSource=banking_chaos&serverSelectionTimeoutMS=1000&connectTimeoutMS=1000&socketTimeoutMS=1500&waitQueueTimeoutMS=500&maxPoolSize=10&retryWrites=false",
        },
    ]


def network_policy(app, ingress, egress):
    return obj(
        "NetworkPolicy",
        app,
        {
            "podSelector": {"matchLabels": {"app": app}},
            "policyTypes": ["Ingress", "Egress"],
            "ingress": ingress,
            "egress": egress,
        },
        api="networking.k8s.io/v1",
    )


def peer(app):
    return {"podSelector": {"matchLabels": {"app": app}}}


def port(value, protocol="TCP"):
    return {"protocol": protocol, "port": value}


def dns():
    return {
        "to": [
            {
                "namespaceSelector": {
                    "matchLabels": {"kubernetes.io/metadata.name": "kube-system"}
                },
                "podSelector": {"matchLabels": {"k8s-app": "kube-dns"}},
            }
        ],
        "ports": [port(53), port(53, "UDP")],
    }


def render(image):
    if not re.fullmatch(
        r"[a-zA-Z0-9./:_-]+@sha256:[a-f0-9]{64}", image
    ) or image.endswith("0" * 64):
        raise ValueError("Supply a real, audited backend image by sha256 digest")
    docs = [obj("Namespace", NS, namespace=None)]
    docs[0]["metadata"].update(
        labels={
            "chaos.banking.io/environment": "nonproduction",
            "chaos.banking.io/data": "synthetic",
            "pod-security.kubernetes.io/enforce": "restricted",
        },
        annotations={"chaos-mesh.org/inject": "enabled"},
    )
    docs += [
        obj(
            "ResourceQuota",
            "chaos-budget",
            {
                "hard": {
                    "requests.cpu": "4",
                    "requests.memory": "5Gi",
                    "limits.cpu": "8",
                    "limits.memory": "10Gi",
                    "pods": "20",
                    "services.loadbalancers": "0",
                    "services.nodeports": "0",
                }
            },
            api="v1",
        )
    ]
    docs += [
        obj(
            "NetworkPolicy",
            "default-deny",
            {"podSelector": {}, "policyTypes": ["Ingress", "Egress"]},
            api="networking.k8s.io/v1",
        )
    ]
    scripts = {
        p.name: p.read_text(encoding="utf-8-sig")
        for p in (ROOT / "lab").iterdir()
        if p.suffix in [".cjs", ".js"]
    }
    docs.append(obj("ConfigMap", "chaos-lab-scripts", data=scripts))
    # Only this disposable Mongo container receives the admin credential. No root credential reaches the app or witness.
    mongo = container("mongodb", "mongo:8.0.17", 27017)
    mongo["securityContext"] = {
        "runAsNonRoot": True,
        "runAsUser": 999,
        "allowPrivilegeEscalation": False,
        "capabilities": {"drop": ["ALL"]},
        "seccompProfile": {"type": "RuntimeDefault"},
    }
    mongo["env"] = [
        {"name": "MONGO_INITDB_ROOT_USERNAME", "value": "chaos-admin"},
        secret_env("MONGO_INITDB_ROOT_PASSWORD", "mongo-root-password"),
        secret_env("MONGO_READ_PASSWORD", "mongo-read-password"),
    ]
    mongo["volumeMounts"] = [
        {"name": "data", "mountPath": "/data/db"},
        {"name": "configdb", "mountPath": "/data/configdb"},
        {"name": "tmp", "mountPath": "/tmp"},
        {
            "name": "scripts",
            "mountPath": "/docker-entrypoint-initdb.d/seed.js",
            "subPath": "seed.js",
            "readOnly": True,
        },
    ]
    mongo["readinessProbe"] = {
        "tcpSocket": {"port": 27017},
        "initialDelaySeconds": 10,
        "periodSeconds": 5,
    }
    db = deployment("chaos-mongodb", [mongo])
    db["spec"]["template"]["spec"]["securityContext"] = {"fsGroup": 999}
    db["spec"]["template"]["spec"]["volumes"] += [
        {"name": "data", "emptyDir": {"sizeLimit": "1Gi"}},
        {"name": "configdb", "emptyDir": {"sizeLimit": "64Mi"}},
    ]
    docs += [db, service("chaos-mongodb", 27017)]
    app = container(
        "app",
        image,
        5000,
        [
            "node",
            "-e",
            "const m=require('mongoose');m.set('autoIndex',false);m.set('autoCreate',false);require('./server.js')",
        ],
    )
    app["env"] = mongo_env() + [
        secret_env("JWT_SECRET", "jwt-secret"),
        {"name": "PORT", "value": "5000"},
        {"name": "NODE_ENV", "value": "production"},
    ]
    edge = container("edge", "node:22.14.0-alpine", 8080, ["node", "/lab/edge.cjs"])
    edge["env"] = [secret_env("JWT_SECRET", "jwt-secret")]
    edge["resources"] = {
        "requests": {"cpu": "50m", "memory": "64Mi"},
        "limits": {"cpu": "200m", "memory": "128Mi"},
    }
    edge["readinessProbe"] = {
        "httpGet": {"path": "/health/ready", "port": 8080},
        "periodSeconds": 3,
        "timeoutSeconds": 2,
        "failureThreshold": 2,
    }
    edge["livenessProbe"] = {
        "httpGet": {"path": "/health/live", "port": 8080},
        "periodSeconds": 10,
        "timeoutSeconds": 2,
        "failureThreshold": 3,
    }
    app["livenessProbe"] = {
        "httpGet": {"path": "/", "port": 5000},
        "periodSeconds": 10,
        "timeoutSeconds": 2,
        "failureThreshold": 3,
    }
    api = deployment("banking-api", [app, edge], 3, True)
    api["spec"]["template"]["spec"]["topologySpreadConstraints"] = [
        {
            "maxSkew": 1,
            "topologyKey": "kubernetes.io/hostname",
            "whenUnsatisfiable": "DoNotSchedule",
            "labelSelector": {"matchLabels": {"app": "banking-api"}},
        }
    ]
    docs += [
        api,
        service("banking-api", 8080),
        service("banking-api-metrics", 8080, True),
        obj(
            "PodDisruptionBudget",
            "banking-api",
            {"minAvailable": 2, "selector": {"matchLabels": {"app": "banking-api"}}},
            api="policy/v1",
        ),
        obj(
            "HorizontalPodAutoscaler",
            "banking-api",
            {
                "scaleTargetRef": {
                    "apiVersion": "apps/v1",
                    "kind": "Deployment",
                    "name": "banking-api",
                },
                "minReplicas": 3,
                "maxReplicas": 5,
                "metrics": [
                    {
                        "type": "Resource",
                        "resource": {
                            "name": "cpu",
                            "target": {"type": "Utilization", "averageUtilization": 65},
                        },
                    }
                ],
                "behavior": {"scaleDown": {"stabilizationWindowSeconds": 300}},
            },
            api="autoscaling/v2",
        ),
    ]
    dep = container(
        "stub", "node:22.14.0-alpine", 8081, ["node", "/lab/dependency.cjs"]
    )
    dep["readinessProbe"] = {"httpGet": {"path": "/status", "port": 8081}}
    docs += [deployment("dependency-stub", [dep]), service("dependency-stub", 8081)]
    witness = container("witness", image, 8082, ["node", "/lab/witness.cjs"])
    witness["env"] = mongo_env()
    witness["readinessProbe"] = {
        "httpGet": {"path": "/snapshot", "port": 8082},
        "periodSeconds": 5,
    }
    witness_deployment = deployment("integrity-witness", [witness])
    witness_pod = obj(
        "Pod", "integrity-witness", witness_deployment["spec"]["template"]["spec"]
    )
    witness_pod["metadata"]["labels"] = labels("integrity-witness")
    docs += [witness_pod, service("integrity-witness", 8082)]
    docs += [
        network_policy(
            "banking-api",
            [
                {
                    "from": [
                        peer("integrity-witness"),
                        peer("chaos-load"),
                        peer("chaos-prometheus"),
                    ],
                    "ports": [port(8080)],
                }
            ],
            [
                dns(),
                {"to": [peer("chaos-mongodb")], "ports": [port(27017)]},
                {"to": [peer("dependency-stub")], "ports": [port(8081)]},
            ],
        ),
        network_policy(
            "chaos-mongodb",
            [
                {
                    "from": [peer("banking-api"), peer("integrity-witness")],
                    "ports": [port(27017)],
                }
            ],
            [],
        ),
        network_policy(
            "dependency-stub",
            [{"from": [peer("banking-api")], "ports": [port(8081)]}],
            [],
        ),
        network_policy(
            "integrity-witness",
            [{"from": [peer("chaos-prometheus")], "ports": [port(8082)]}],
            [
                dns(),
                {"to": [peer("chaos-mongodb")], "ports": [port(27017)]},
                {"to": [peer("banking-api")], "ports": [port(8080)]},
                {"to": [peer("chaos-prometheus")], "ports": [port(9090)]},
            ],
        ),
        network_policy(
            "chaos-load",
            [],
            [dns(), {"to": [peer("banking-api")], "ports": [port(8080)]}],
        ),
    ]
    prometheus = {
        "global": {"scrape_interval": "5s", "evaluation_interval": "5s"},
        "rule_files": ["/etc/lab-prometheus/rules.yaml"],
        "scrape_configs": [
            {
                "job_name": "banking-chaos",
                "dns_sd_configs": [
                    {
                        "names": [
                            "banking-api-metrics.banking-chaos.svc.cluster.local"
                        ],
                        "type": "A",
                        "port": 8080,
                        "refresh_interval": "5s",
                    }
                ],
                "relabel_configs": [{"target_label": "namespace", "replacement": NS}],
            },
            {
                "job_name": "chaos-integrity",
                "static_configs": [
                    {"targets": ["integrity-witness:8082"], "labels": {"namespace": NS}}
                ],
            },
        ],
    }
    docs.append(
        obj(
            "ConfigMap",
            "chaos-prometheus",
            data={
                "prometheus.json": json.dumps(prometheus),
                "rules.yaml": (ROOT / "monitoring/rules.json").read_text(),
            },
        )
    )
    prom = container(
        "prometheus",
        "prom/prometheus:v3.2.1",
        9090,
        [
            "/bin/prometheus",
            "--config.file=/etc/lab-prometheus/prometheus.json",
            "--storage.tsdb.path=/prometheus",
            "--storage.tsdb.retention.time=1d",
        ],
    )
    prom["volumeMounts"] = [
        {
            "name": "prometheus-config",
            "mountPath": "/etc/lab-prometheus",
            "readOnly": True,
        },
        {"name": "prometheus-data", "mountPath": "/prometheus"},
    ]
    pd = deployment("chaos-prometheus", [prom])
    pd["spec"]["template"]["spec"]["securityContext"] = {"fsGroup": 1000}
    pd["spec"]["template"]["spec"]["volumes"] = [
        {"name": "prometheus-config", "configMap": {"name": "chaos-prometheus"}},
        {"name": "prometheus-data", "emptyDir": {"sizeLimit": "512Mi"}},
    ]
    docs += [
        pd,
        service("chaos-prometheus", 9090),
        network_policy(
            "chaos-prometheus",
            [{"from": [peer("integrity-witness")], "ports": [port(9090)]}],
            [
                dns(),
                {
                    "to": [peer("banking-api"), peer("integrity-witness")],
                    "ports": [port(8080), port(8082)],
                },
            ],
        ),
    ]
    # Cross-namespace canary must accept connections. A successful source connection is a preflight failure.
    canary_ns = "chaos-egress-canary"
    docs.append(obj("Namespace", canary_ns, namespace=None))
    cm = obj(
        "ConfigMap",
        "chaos-lab-scripts",
        namespace=canary_ns,
        data={"dependency.cjs": scripts["dependency.cjs"]},
    )
    docs.append(cm)
    canary = deployment(
        "egress-canary",
        [
            container(
                "stub", "node:22.14.0-alpine", 8081, ["node", "/lab/dependency.cjs"]
            )
        ],
    )
    canary["metadata"]["namespace"] = canary_ns
    docs.append(canary)
    svc = service("egress-canary", 8081)
    svc["metadata"]["namespace"] = canary_ns
    docs.append(svc)
    return {"apiVersion": "v1", "kind": "List", "items": docs}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(render(args.image), indent=2) + "\n")
    print(f"Rendered safe lab to {out}. No cluster changes made.")
