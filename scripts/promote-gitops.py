"""Update one GitOps environment to a published backend digest."""
import argparse
import json
import re
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("environment", choices=["staging", "production"])
parser.add_argument("digest", help="Published image digest: sha256:<64 lowercase hex characters>")
args = parser.parse_args()
if not re.fullmatch(r"sha256:[0-9a-f]{64}", args.digest) or args.digest == "sha256:" + "0" * 64:
    parser.error("Provide a real sha256 digest, not an image tag or the bootstrap placeholder")
path = Path(__file__).resolve().parents[1] / "gitops" / "environments" / args.environment / "kustomization.yaml"
# JSON is valid YAML and lets the promotion job edit this file without extra dependencies.
data = json.loads(path.read_text(encoding="utf-8"))
data["images"][0]["digest"] = args.digest
data["replicas"][0]["count"] = 2 if args.environment == "production" else 1
path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
print(f"Prepared {args.environment} promotion to {args.digest}; review and commit {path}")
