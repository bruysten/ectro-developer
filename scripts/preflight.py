"""Read-only deployment integrity check. Requires Python's standard library only."""
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'docs/asset-integrity.json').read_text())
errors = []
for name, expected in manifest.items():
    file = root / name
    if not file.is_file() or hashlib.sha256(file.read_bytes()).hexdigest() != expected:
        errors.append(name)
if errors:
    raise SystemExit('Asset-Prüfung fehlgeschlagen: ' + ', '.join(errors))
print(f'{len(manifest)} ausgelieferte Assets geprüft.')
