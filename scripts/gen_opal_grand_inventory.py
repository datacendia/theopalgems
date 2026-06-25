import openpyxl, datetime, json, os, re

CAT_MAP = {
    'necklace': 'necklaces',
    'ring': 'rings',
    'bracelet': 'bracelets',
    'earring': 'earrings',
}

def drive_to_img(url):
    if not url or not isinstance(url, str):
        return ''
    if not url.strip().lower().startswith('http'):
        return ''
    m = re.search(r'/d/([^/]+)/', url) or re.search(r'[?&]id=([^&]+)', url)
    if not m:
        return url
    return f'https://drive.google.com/thumbnail?id={m.group(1)}&sz=w1000'

def title_case(s):
    return re.sub(r'\b\w', lambda c: c.group(0).upper(), str(s).strip().lower())

base = os.path.join(os.path.dirname(__file__), '..')
wb = openpyxl.load_workbook(os.path.join(base, 'INVENTORY OPAL GRAND (1).xlsx'))
ws = wb['INVENTARIO']

out = []
skipped = []
for r in ws.iter_rows(min_row=2, values_only=True):
    rid = r[0]
    if rid is None or rid == '':
        continue
    name, cat, ctw, price, cert, img = r[1], r[2], r[3], r[4], r[5], r[10]
    catkey = CAT_MAP.get(str(cat or '').strip().lower())
    if not catkey:
        skipped.append({'id': rid, 'cat': cat, 'name': name})
        continue
    nid = str(rid)
    if nid.endswith('.0'):
        nid = nid[:-2]
    e = {
        'name': nid,
        'link': drive_to_img(img),
        'description': title_case(name or ''),
        'category': catkey,
    }
    if isinstance(ctw, (int, float)) and not isinstance(ctw, bool):
        e['ctw'] = ctw
    if isinstance(price, (int, float)) and not isinstance(price, bool):
        e['price'] = price
    if cert is True:
        e['cert'] = 'Certified'
    out.append(e)

def js_obj(e):
    order = ['name', 'link', 'description', 'category', 'ctw', 'price', 'cert']
    lines = []
    for k in order:
        if k in e:
            lines.append(f'    {k}: {json.dumps(e[k])}')
    return '  {\n' + ',\n'.join(lines) + '\n  }'

js = ',\n'.join(js_obj(e) for e in out)

with open(os.path.join(base, 'scripts', '_opal_grand_entries.js'), 'w', encoding='utf-8') as f:
    f.write(js)

print(f'GENERATED {len(out)} items; skipped {len(skipped)}')
print('SKIPPED:', json.dumps(skipped, default=str))
