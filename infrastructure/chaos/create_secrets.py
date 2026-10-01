import json, secrets, os
from pathlib import Path

root = Path(__file__).resolve().parents[2] / ".local" / "chaos"
root.mkdir(parents=True, exist_ok=True)
path = root / "secrets.json"
if path.exists():
    raise SystemExit("Refusing to overwrite existing lab credentials")
body = {
    "apiVersion": "v1",
    "kind": "Secret",
    "metadata": {"name": "chaos-lab-auth", "namespace": "banking-chaos"},
    "type": "Opaque",
    "stringData": {
        k: secrets.token_hex(32)
        for k in ["mongo-root-password", "mongo-read-password", "jwt-secret"]
    },
}
with path.open("x", encoding="utf-8") as stream:
    json.dump(body, stream, indent=2)
os.chmod(path, 0o600)
print(f"Wrote lab-only credentials to {path}; never commit this file.")
