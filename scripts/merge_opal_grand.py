import os

base = os.path.join(os.path.dirname(__file__), '..')
kira_path = os.path.join(base, 'src', 'data', 'kiraProducts.js')
entries_path = os.path.join(base, 'scripts', '_opal_grand_entries.js')

with open(kira_path, 'r', encoding='utf-8') as f:
    kira = f.read()
with open(entries_path, 'r', encoding='utf-8') as f:
    entries = f.read().strip()

MARKER = '// ── Opal Grand inventory (imported from spreadsheet) ──'
if MARKER in kira:
    raise SystemExit('Opal Grand inventory already merged; aborting to avoid duplicates.')

# Find closing of the array: last occurrence of "\n];"
idx = kira.rfind('\n];')
if idx == -1:
    raise SystemExit('Could not find array close "];" in kiraProducts.js')

before = kira[:idx]  # ends right after last entry's closing "  }"
after = kira[idx:]   # "\n];\n..."

merged = before + ',\n  ' + MARKER + '\n' + entries + after

with open(kira_path, 'w', encoding='utf-8') as f:
    f.write(merged)

print('Merged Opal Grand inventory into kiraProducts.js')
