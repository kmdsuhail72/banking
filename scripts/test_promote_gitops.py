import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

class PromotionTests(unittest.TestCase):
    def test_promotions_are_scoped_and_invalid_inputs_do_not_write(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            shutil.copytree(ROOT / 'gitops', root / 'gitops')
            (root / 'scripts').mkdir()
            script = root / 'scripts/promote-gitops.py'
            shutil.copy(ROOT / 'scripts/promote-gitops.py', script)
            staging = root / 'gitops/environments/staging/kustomization.yaml'
            production = root / 'gitops/environments/production/kustomization.yaml'
            original = production.read_bytes()
            digest = 'sha256:' + 'a' * 64
            run = lambda environment, value: subprocess.run([sys.executable, str(script), environment, value], capture_output=True)
            self.assertEqual(run('staging', digest).returncode, 0)
            self.assertEqual(json.loads(staging.read_text())['images'][0]['digest'], digest)
            self.assertEqual(json.loads(staging.read_text())['replicas'][0]['count'], 1)
            self.assertEqual(production.read_bytes(), original)
            for invalid in ['latest', 'sha256:' + '0' * 64, 'sha256:bad']:
                self.assertNotEqual(run('production', invalid).returncode, 0)
                self.assertEqual(production.read_bytes(), original)
            self.assertNotEqual(run('../staging', digest).returncode, 0)
            self.assertEqual(run('production', digest).returncode, 0)
            self.assertEqual(json.loads(production.read_text())['replicas'][0]['count'], 2)

if __name__ == '__main__':
    unittest.main()
