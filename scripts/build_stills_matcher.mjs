// Generate a self-contained matcher page (stills_matcher.html) so the user can
// visually assign each black-background still in Whatsapp1/original/ to a product.
//
// - Reads products from src/data/kiraProducts.js (regex, no import needed)
// - Reads still filenames from Whatsapp1/original/
// - Writes ../stills_matcher.html (open directly in a browser; references stills
//   via relative path, so it must stay at the project root)
//
// Output mapping (from the page's Export button) is { "<still filename>": "<product id>" }.
//
// Usage: node scripts/build_stills_matcher.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.join(__dirname, '..');
const PRODUCTS_FILE = path.join(BASE, 'src', 'data', 'kiraProducts.js');
const STILLS_DIR = path.join(BASE, 'Whatsapp1', 'original');
const OUT = path.join(BASE, 'stills_matcher.html');

const src = fs.readFileSync(PRODUCTS_FILE, 'utf8');
const re = /name:\s*"([^"]+)",\s*link:\s*"([^"]*)",\s*description:\s*"([^"]*)",\s*category:\s*"([^"]+)"(?:,\s*price:\s*([0-9.]+))?/g;
const products = [];
let m;
while ((m = re.exec(src)) !== null) {
  const [, id, link, desc, cat, price] = m;
  products.push({ id, link, desc, cat, price: price || '', isOpal: /^\d+$/.test(id) });
}

// Resolve a locally-servable image for each product:
//  - a downloaded Drive copy in _matcher_imgs/ (Opal Grand), else
//  - the original local asset under public/ (e.g. /assets/kira/.. white-bg Kira shots).
for (const p of products) {
  const dl = '_matcher_imgs/' + p.id + '.jpg';
  if (fs.existsSync(path.join(BASE, dl))) {
    p.local = dl;
  } else if (p.link && p.link.startsWith('/') && fs.existsSync(path.join(BASE, 'public', p.link))) {
    p.local = 'public' + p.link;
  } else {
    p.local = '';
  }
}

const stills = fs.existsSync(STILLS_DIR)
  ? fs.readdirSync(STILLS_DIR).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort()
  : [];

// Opal Grand (numeric IDs) first — those are the ones needing real photos.
products.sort((a, b) => {
  if (a.isOpal !== b.isOpal) return a.isOpal ? -1 : 1;
  if (a.cat !== b.cat) return a.cat.localeCompare(b.cat);
  return a.desc.localeCompare(b.desc);
});

const html = [
  '<!doctype html>',
  '<html lang="en"><head><meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1">',
  '<title>Opal Stills Matcher</title>',
  '<style>',
  '  :root { color-scheme: dark; } * { box-sizing: border-box; }',
  '  body { margin: 0; font-family: system-ui, Segoe UI, Roboto, sans-serif; background: #0d0d0f; color: #eee; }',
  '  header { position: sticky; top: 0; z-index: 5; background: #141417; border-bottom: 1px solid #2a2a30; padding: 10px 16px; display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }',
  '  header h1 { font-size: 15px; margin: 0; font-weight: 600; }',
  '  .prog { font-size: 13px; color: #9aa; } .spacer { flex: 1; }',
  '  .status { width: 100%; font-size: 13px; color: #ffd479; min-height: 16px; }',
  '  button { background: #2f6df6; color: #fff; border: 0; border-radius: 7px; padding: 8px 14px; font-size: 13px; font-weight: 600; cursor: pointer; }',
  '  button.ghost { background: #24242a; color: #ccc; }',
  '  label.chk { font-size: 13px; color: #bcc; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }',
  '  input.search { background: #0e0e10; color: #eee; border: 1px solid #33333a; border-radius: 6px; padding: 7px 10px; font-size: 13px; width: 200px; }',
  '  .wrap { display: grid; grid-template-columns: 320px 1fr; gap: 0; height: calc(100vh - 92px); }',
  '  .col { overflow-y: auto; padding: 14px; } .col.left { border-right: 1px solid #26262c; background: #111114; }',
  '  .col h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: #8aa; margin: 0 0 12px; }',
  '  .stills { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }',
  '  .still { background: #000; border: 2px solid #26262c; border-radius: 8px; overflow: hidden; cursor: pointer; position: relative; }',
  '  .still img { width: 100%; aspect-ratio: 1/1; object-fit: contain; display: block; }',
  '  .still .n { position: absolute; top: 4px; left: 4px; background: rgba(0,0,0,.6); font-size: 10px; padding: 1px 5px; border-radius: 4px; }',
  '  .still.active { border-color: #2f6df6; box-shadow: 0 0 0 3px rgba(47,109,246,.35); }',
  '  .still.done { opacity: .5; border-color: #2f8f4f; }',
  '  .still .tag { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(20,90,40,.92); font-size: 10px; padding: 2px 5px; text-align: center; }',
  '  .prods { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }',
  '  .prod { background: #161619; border: 2px solid #26262c; border-radius: 9px; overflow: hidden; cursor: pointer; }',
  '  .prod:hover { border-color: #4a7; }',
  '  .prod .pi { aspect-ratio: 1/1; background: #1c1c20; display: flex; align-items: center; justify-content: center; }',
  '  .prod .pi img { width: 100%; height: 100%; object-fit: contain; }',
  '  .prod .pi .none { font-size: 11px; color: #667; }',
  '  .prod .meta { padding: 7px 8px; } .prod .id { font-size: 12px; font-weight: 700; color: #cde; }',
  '  .prod .desc { font-size: 11px; color: #9aa; line-height: 1.3; }',
  '  .prod.used { opacity: .45; } .prod.used .id::after { content: " (used)"; color: #6c9; }',
  '  .out { width: calc(100% - 28px); margin: 0 14px 14px; height: 80px; background: #0e0e10; color: #6f9; border: 1px solid #26262c; border-radius: 8px; font-family: ui-monospace, monospace; font-size: 12px; padding: 8px; }',
  '</style></head><body>',
  '<header>',
  '  <h1>Opal Stills Matcher</h1>',
  '  <span class="prog" id="prog"></span>',
  '  <label class="chk"><input type="checkbox" id="onlyOpal" checked> Opal Grand only</label>',
  '  <input class="search" id="search" placeholder="Filter products...">',
  '  <span class="spacer"></span>',
  '  <button class="ghost" id="copy">Copy JSON</button>',
  '  <button id="export">Export mapping</button>',
  '  <div class="status" id="status">Click an Originals photo on the left, then click the matching website product on the right.</div>',
  '</header>',
  '<div class="wrap">',
  '  <div class="col left"><h2>Originals folder photos</h2><div class="stills" id="stills"></div></div>',
  '  <div class="col"><h2>Current website image - click to assign</h2><div class="prods" id="prods"></div></div>',
  '</div>',
  '<textarea class="out" id="out" readonly placeholder="Exported mapping appears here - copy it and paste back into chat."></textarea>',
  '<script>',
  '  const PRODUCTS = ' + JSON.stringify(products) + ';',
  '  const STILLS = ' + JSON.stringify(stills) + ';',
  '  const assign = {}; let active = null;',
  '  const elS = document.getElementById("stills"), elP = document.getElementById("prods");',
  '  const prog = document.getElementById("prog"), status = document.getElementById("status");',
  '  const onlyOpal = document.getElementById("onlyOpal"), search = document.getElementById("search"), out = document.getElementById("out");',
  '  function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }',
  '  function usedBy(id){ return Object.keys(assign).find(f => assign[f] === id); }',
  '  function renderStills(){',
  '    elS.innerHTML = "";',
  '    STILLS.forEach((f, i) => {',
  '      const d = document.createElement("div"); d.className = "still" + (active===f?" active":"") + (assign[f]?" done":"");',
  '      const u = "Whatsapp1/original/" + encodeURIComponent(f);',
  '      d.innerHTML = \'<span class="n">#\'+(i+1)+\'</span><img loading="lazy" src="\'+u+\'">\' + (assign[f]?\'<span class="tag">\'+esc(assign[f])+\'</span>\':"");',
  '      d.onclick = () => { active = (active===f? null : f); render(); };',
  '      elS.appendChild(d);',
  '    });',
  '  }',
  '  function renderProds(){',
  '    elP.innerHTML = ""; const q = search.value.trim().toLowerCase();',
  '    let list = onlyOpal.checked ? PRODUCTS.filter(p => p.isOpal) : PRODUCTS;',
  '    if (q) list = list.filter(p => (p.id+" "+p.desc+" "+p.cat).toLowerCase().includes(q));',
  '    for (const p of list) {',
  '      const d = document.createElement("div"); d.className = "prod" + (usedBy(p.id)?" used":"");',
  '      const img = (p.local||p.link) ? \'<img loading="lazy" src="\'+esc(p.local||p.link)+\'">\' : \'<span class="none">no image on site</span>\';',
  '      d.innerHTML = \'<div class="pi">\'+img+\'</div><div class="meta"><div class="id">\'+esc(p.id)+(p.isOpal?"":" [kira]")+\'</div><div class="desc">\'+esc(p.desc)+(p.price?" - $"+p.price:"")+\'</div></div>\';',
  '      d.onclick = () => {',
  '        if (!active) { status.textContent = "Pick a still on the left first."; return; }',
  '        const prev = usedBy(p.id); if (prev) delete assign[prev];',
  '        assign[active] = p.id;',
  '        active = STILLS.find(f => !assign[f]) || null;',
  '        render();',
  '      };',
  '      elP.appendChild(d);',
  '    }',
  '  }',
  '  function render(){',
  '    renderStills(); renderProds();',
  '    const done = Object.keys(assign).length;',
  '    prog.textContent = done + " / " + STILLS.length + " matched";',
  '    status.textContent = active ? ("Placing still " + (STILLS.indexOf(active)+1) + " - click its matching website photo (or click the still again to cancel).") : (done>=STILLS.length ? "All stills matched - export when ready." : "Click a still on the left, then its matching website photo.");',
  '  }',
  '  function exportMap(){ out.value = JSON.stringify(assign, null, 2); const b = new Blob([out.value],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download="stills_map.json"; a.click(); }',
  '  document.getElementById("export").onclick = exportMap;',
  '  document.getElementById("copy").onclick = () => { out.value = JSON.stringify(assign, null, 2); out.select(); document.execCommand("copy"); };',
  '  onlyOpal.onchange = render; search.oninput = renderProds;',
  '  render();',
  '</' + 'script></body></html>',
].join('\n');

fs.writeFileSync(OUT, html);
console.log('Products parsed : ' + products.length + ' (Opal Grand: ' + products.filter((p) => p.isOpal).length + ')');
console.log('Stills found    : ' + stills.length);
console.log('Wrote -> ' + OUT);
