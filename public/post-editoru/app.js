/* RentQR post editörü — Canva benzeri serbest yerleşim. Tüm durum tek nesnede; her değişiklik yeniden çizer. */
(() => {
const STORE = 'rentqr-post-editor-v1';
const SIZE = { feed: [1080, 1350], story: [1080, 1920], kare: [1080, 1080], yatay: [1600, 900] };
// kare ve yatay sonradan eklendi; eski postlarda bu formatların yerleşimi ilk açılışta ölçülür
const FMTS = Object.keys(SIZE);
const PAD = { feed: { t: 78, b: 78 }, story: { t: 250, b: 330 }, kare: { t: 70, b: 70 }, yatay: { t: 64, b: 64 } };
const MARGIN = 76;
const SWATCHES = ['#ffffff', '#f3eeed', '#d9c7c4', '#ffd9d5', '#ff3b30', '#d11414', '#a90303', '#4a1511', '#2a0d0b', '#140504', '#1f8a4c', '#c77d12'];
// fonts.css'te barındırılan Google Fonts; Manrope post.css'te
const FONTS = ['Manrope', 'Inter', 'Poppins', 'Montserrat', 'Raleway', 'Nunito', 'Space Grotesk', 'Oswald', 'Bebas Neue', 'Anton', 'Archivo Black',
  'Playfair Display', 'DM Serif Display', 'Lora', 'Roboto Slab', 'Caveat'];
const FONT_SET = new Set(FONTS);
const FMT_NAME = { feed: 'Feed 4:5', story: 'Story 9:16', kare: 'Kare 1:1', yatay: 'Yatay 16:9' };
// marka kitinin renkleri (marka.js) hazır renklerin başına gelir
const swatches = () => [...new Set([...(window.Marka?.colors || []), ...SWATCHES])];

// Fotoğraf kütüphanesi kategorilere göre gruplu (kutuphane.js; video sayfası ve sunucu da aynı listeyi kullanır).
const LIB_CATS = Kutuphane.cats();
const LIB = LIB_CATS.flatMap(([, items]) => items);

const TEMPLATE = {
  bg: { mode: 'photo', photo: 'img/p1.jpg', x: 72, y: 50, zoom: 100, shade: 95, shadeDir: 'left', edge: 'soft', cut: {}, shadeColor: '#140504', g1: '#4a1511', g2: '#2a0d0b', base: '#1a0706' },
  frame: { on: true, color: '#d11414', opacity: 55 },
  brand: { on: true, text: 'RentQR', size: 32, color: '#ffffff', logo: true },
  tag: { on: true, text: '', size: 21, color: '#ffd9d5', pill: true },
  headline: { text: '', size: 92, width: 600, color: '#ffffff', accent: '#ff3b30', align: 'left' },
  line: { on: true, color: '#d11414' },
  sub: { on: true, text: '', size: 31, width: 470, color: '#d9c7c4', strong: '#ffffff', align: 'left' },
  list: { on: false, items: [], dot: '#d11414', color: '#ffffff', k: 1 },
  strip: { on: false, items: [] },
  grid: { on: false, items: [] },
  notif: { on: false, small: 'RentQR · yarın teslim', title: 'Sony A7 IV · Mert K.', k: 1,
           pos: { feed: { x: 590, y: 985 }, story: { x: 590, y: 1340 } } },
  bubble: { on: false, meta: 'Müşteri · 14:02', text: "Bu kaftan 21'inde boş mu?", k: 1,
            pos: { feed: { x: 600, y: 860 }, story: { x: 600, y: 1180 } } },
  cta: { on: true, main: 'Hemen başlayın →', url: 'qrsistemi.vercel.app', bg: '#d11414', color: '#ffffff', k: 1, shadow: true },
  texts: [], items: [],
  // locks: taşınmayan öğeler; groups: öğe → grup kimliği (birine tıklayınca grup birlikte seçilir)
  locks: {}, groups: {},
  order: ['brand', 'tag', 'headline', 'line', 'sub', 'list', 'strip', 'grid', 'cta', 'notif', 'bubble'],
  layout: { feed: {}, story: {}, kare: {}, yatay: {} },
  flow: 'sol', light: false,  // ilk yerleşimin düzeni (sol | alt | orta); açık zeminli renk teması
};
// AI tarz turundaki renk temaları ve düzenler: kimlikler ve adlar tarz.js'teki katalogla aynı
const THEMES = {
  bordo: {},
  krem: { light: true, bg: { shadeColor: '#f3eeed', base: '#f3eeed', g1: '#ffffff', g2: '#f3eeed', shade: 96 }, frame: { color: '#d11414', opacity: 35 },
    brand: { color: '#2a0d0b' }, tag: { color: '#a90303' }, headline: { color: '#2a0d0b', accent: '#d11414' }, line: { color: '#d11414' },
    sub: { color: '#4a1511', strong: '#2a0d0b' }, list: { dot: '#d11414', color: '#2a0d0b' } },
  kirmizi: { bg: { shadeColor: '#a90303', base: '#4a1511', g1: '#ff3b30', g2: '#d11414' }, frame: { color: '#ffffff', opacity: 40 },
    tag: { color: '#ffffff' }, headline: { accent: '#ffd9d5' }, line: { color: '#ffffff' }, sub: { color: '#ffd9d5', strong: '#ffffff' },
    list: { dot: '#2a0d0b' }, cta: { bg: '#ffffff', color: '#d11414' } },
  gece: { bg: { shadeColor: '#0b0b0d', base: '#0b0b0d', g1: '#2a2a30', g2: '#141417' }, frame: { on: false },
    tag: { color: '#d9d9de' }, line: { color: '#ff3b30' }, sub: { color: '#bdbdc4', strong: '#ffffff' }, list: { dot: '#ff3b30' }, cta: { bg: '#ff3b30' } },
};
const CARD_TOP = { pos: { feed: { x: 520, y: 180 }, story: { x: 520, y: 360 } } };  // metin altta: kartlar sağ üstte, fotoğrafın üstünde
const LAYOUTS = {
  sol: { flow: 'sol', tag: { size: 18 }, headline: { width: 520, size: 84 }, sub: { width: 450 } },
  alt: { flow: 'alt', bg: { shadeDir: 'bottom' }, headline: { width: 900 }, sub: { width: 820 }, notif: CARD_TOP, bubble: CARD_TOP },
  orta: { flow: 'orta', bg: { shadeDir: 'full' }, headline: { width: 900, align: 'center' }, sub: { width: 800, align: 'center' } },
};
const STARTER = {
  list: () => ['Uygulama indirme yok', 'Eğitim gerekmez', 'Telefondan yönetim'],
  strip: () => [{ t: 'Kargo', c: '#140504' }, { t: 'Kirada 3 gün', c: '#d11414' }, { t: 'İade', c: '#140504' },
                { t: 'Temizlik & ütü', c: '#140504' }, { t: 'Müsait', c: '#1f8a4c' }],
  grid: () => [{ photo: 'img/p1.jpg', label: 'Gelinlik', pos: '50% 30%' }, { photo: 'img/p3.jpg', label: 'Kamera', pos: '68% 60%' },
               { photo: 'img/p6a.jpg', label: 'Bisiklet', pos: '50% 50%' }, { photo: 'img/p6b.jpg', label: 'Kamp çadırı', pos: '50% 55%' }],
};

const clone = o => JSON.parse(JSON.stringify(o));
const merge = (a, b) => { for (const k in b) {
  if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) a[k] = merge(a[k] || {}, b[k]); else a[k] = b[k]; } return a; };
const make = o => merge(clone(TEMPLATE), o);
let uid = Date.now();
// ortak çalışmada iki kişinin aynı anda oluşturduğu kimlikler çakışmasın diye sona rastgele ek
const nid = () => 'p' + (uid++).toString(36) + Math.random().toString(36).slice(2, 5);

const DEFAULT_SPECS = [
  { bg: { photo: 'img/p1.jpg', x: 72 }, tag: { text: 'Gelinlik & abiye kiralama işletmeleri için' },
    headline: { text: 'Aynı gelinliği, aynı güne iki müşteriye *söz verdiğiniz* oldu mu?' },
    sub: { text: 'RentQR çakışan rezervasyonu **daha kaydederken engeller.** Defter karmaşasına ve düğün öncesi krize son.' } },
  { bg: { photo: 'img/p2.jpg', x: 75 }, tag: { text: 'Tüm kiralama işletmeleri için' },
    headline: { text: 'İşletmenizin hafızası hâlâ bir *defter* mi?' },
    sub: { text: 'Her ürüne bir QR etiket. Telefonla okutun; **takvim, geçmiş ve yeni rezervasyon** tek ekranda.', width: 430 },
    list: { on: true, items: STARTER.list() } },
  { bg: { photo: 'img/p3.jpg', x: 72 }, tag: { text: 'Kamera & ekipman kiralama işletmeleri için' },
    headline: { text: 'Yarın hangi ürününüz *geri geliyor?*' },
    sub: { text: 'Aklınızda tutmanıza gerek yok. RentQR, teslimi yaklaşan her kiralama için **bir gün önceden** sizi uyarır.' },
    notif: { on: true } },
  { bg: { photo: 'img/p4.jpg', x: 72 }, tag: { text: 'Abiye & kına kiralama işletmeleri için' },
    headline: { text: 'Bu soruya kaç dakikada *cevap veriyorsunuz?*' },
    sub: { text: 'Defteri karıştırmayın. Ürünün etiketini okutun, takvime bakın, **saniyeler içinde yanıtlayın.**' },
    bubble: { on: true } },
  { bg: { photo: 'img/p5.jpg', x: 70 }, tag: { text: 'Gelinlik & abiye kiralama işletmeleri için' },
    headline: { text: '3 günlük kiralama, aslında *7 gün* sürer.' },
    sub: { text: 'Kargo, iade, temizlik ve ütü günleri defterde görünmez. RentQR bu süreleri **takvime kendisi işler.**', width: 560 },
    strip: { on: true, items: STARTER.strip() } },
  { bg: { mode: 'solid', photo: 'img/p1.jpg', x: 50 }, tag: { text: 'Tüm kiralama işletmeleri için' },
    headline: { text: 'Gelinlik, kamera, bisiklet, çadır… *Ortak noktaları ne?*', width: 900 },
    sub: { text: 'Hepsi **tek bir etiketle** yönetiliyor. Her ürün kendi takvimine ve rezervasyon sayfasına sahip olur.', width: 860 },
    grid: { on: true, items: STARTER.grid() } },
];
const defaultPost = i => Object.assign(make(DEFAULT_SPECS[i]), { origin: i });
const DEFAULTS = () => DEFAULT_SPECS.map((_, i) => Object.assign(defaultPost(i), { id: nid() }));
const blankPost = () => Object.assign(make({ bg: { photo: 'img/p1.jpg' }, tag: { text: 'Kiralama işletmeleri için' },
  headline: { text: 'Yeni başlığını *buraya* yaz' }, sub: { text: 'Kısa açıklamanı buraya yaz. **Önemli kısmı** kalın yapabilirsin.' } }), { id: nid() });

/* ---------- öğe türleri ---------- */
// font: yazı boyutu + kutu genişliği; k: ölçek; w: yalnız genişlik
const KIND = { brand: 'font', tag: 'font', headline: 'font', sub: 'font', line: 'w', list: 'k', strip: 'w', grid: 'w', notif: 'k', bubble: 'k', cta: 'k' };
const kindOf = k => k.startsWith('t:') ? 'font' : k.startsWith('o:') ? 'box' : KIND[k];
const ELS = [
  ['bg', 'Arka plan', 'img'], ['brand', 'Logo', 'logo'], ['tag', 'Etiket', 'text'], ['headline', 'Başlık', 'text'],
  ['line', 'Çizgi', 'line'], ['sub', 'Açıklama', 'text'], ['list', 'Madde listesi', 'list'], ['strip', 'Süreç şeridi', 'list'],
  ['grid', 'Fotoğraf ızgarası', 'grid'], ['notif', 'Bildirim kartı', 'card'], ['bubble', 'Mesaj balonu', 'card'], ['cta', 'Buton', 'btn'],
];
const NAMES = Object.fromEntries(ELS.map(([k, n]) => [k, n]));
const OBJ_NAME = { shape: 'Şekil', image: 'Görsel', icon: 'İkon' };
const nameOf = k => k.startsWith('t:') ? 'Metin' : k.startsWith('o:') ? OBJ_NAME[objOf(post(), k)?.type] || 'Öğe' : NAMES[k];
const isFree = k => /^[to]:/.test(k);  // kullanıcının eklediği öğe: silinir (gizlenmez), çoğaltılır
const OPTIONAL = ['list', 'strip', 'grid', 'notif', 'bubble'];
const TEXTUAL = k => ['headline', 'sub'].includes(k) || k.startsWith('t:');
const hideable = k => k !== 'bg' && k !== 'headline';
const objOf = (p, k) => k.startsWith('t:') ? p.texts.find(t => t.id === k.slice(2)) : k.startsWith('o:') ? (p.items || []).find(t => t.id === k.slice(2)) : p[k];
const isOn = (p, k) => k === 'bg' || k === 'headline' || isFree(k) ? !!objOf(p, k) : !!p[k]?.on;
const present = (p, k) => isFree(k) ? !!objOf(p, k) : (!OPTIONAL.includes(k) || p[k].on);
const textPath = (p, k) => k.startsWith('t:') ? `texts.${p.texts.findIndex(t => t.id === k.slice(2))}`
  : k.startsWith('o:') ? `items.${p.items.findIndex(t => t.id === k.slice(2))}` : k;

/* ---------- durum ---------- */
let state, sel = null, fmt = 'feed', zoom = null, scale = 1, tab = 'edit';
// multi: birden çok öğe seçiliyken anahtarları (Shift ile tıklama ya da grup); tek seçimde boş
let multi = [];
// geçmiş kaydı: { s: anlık görüntü, q: alındığı anda uygulanmış uzak değişiklik sayısı } — geri alırken başkalarının sonraki değişiklikleri korunur
const hist = { past: [], future: [] };
const fixPost = p => { const m = merge(clone(TEMPLATE), p); if (p.order) m.order = p.order; return m; };
function load() {
  try { const s = JSON.parse(localStorage.getItem(STORE));
    if (s && Array.isArray(s.posts) && s.posts.length) {
      s.posts = s.posts.map(fixPost);
      s.current = Math.min(s.current || 0, s.posts.length - 1); return s; } }
  catch (e) {}
  return { posts: DEFAULTS(), current: 0, uploads: [] };
}
state = load();
const post = () => state.posts[state.current];
const shared = s => ({ posts: s.posts, uploads: s.uploads || [] });

/* ortak çalışma durumu (ortak-istemci.js ↔ sunucudaki ortak.js). on: sunucuya bağlı ve post listesi sunucudan geliyor.
   synced: sunucuya bildirilmiş son hâl (fark buna göre çıkarılır); remote: başkalarından gelen değişiklikler (geri al için) */
const live = { on: false, synced: null, remote: [], rq: 0, me: null, local: true, people: new Map(), dirty: false, propsDirty: false, canli: null };

let saveT;
function setSaved(kind, msg) { const s = $('#saved'); s.className = 'saved' + (kind === 'ok' ? '' : ' ' + kind); s.textContent = msg; }
function save() {
  clearTimeout(saveT);
  if (live.on) { setSaved('busy', 'Kaydediliyor'); saveT = setTimeout(syncOut, 60); return; }
  setSaved('busy', 'Kaydediliyor');
  saveT = setTimeout(() => {
    try { localStorage.setItem(STORE, JSON.stringify(state)); setSaved('ok', 'Kaydedildi'); }
    catch (e) { setSaved('err', 'Kaydedilemedi'); toast('Otomatik kayıt başarısız: yüklenen fotoğraflar tarayıcı sınırını aşıyor. Bazılarını kaldır.'); }
  }, 300);
}
// yerel değişiklikleri işlemlere çevirip sunucuya gönder
function syncOut() {
  if (!live.on) return;
  const ops = OrtakOps.diff(live.synced, shared(state));
  if (ops.length) { Ortak.send(ops); live.synced = clone(shared(state)); }
  try { localStorage.setItem(STORE + '-konum', post()?.id || ''); } catch (_) {}
  syncStatus();
}
// sayfa kapanırken bekleyen değişikliği hemen gönder; gönderilmemiş varsa tarayıcı uyarır
addEventListener('pagehide', () => { if (live.on) { clearTimeout(saveT); syncOut(); } });
addEventListener('beforeunload', e => { if (live.on) { clearTimeout(saveT); syncOut(); if (Ortak.pending && !Ortak.online) e.preventDefault(); } });
function syncStatus() {
  if (!live.on) return;
  if (!Ortak.online) setSaved('err', 'Bağlantı yok · yeniden bağlanıyor');
  else if (Ortak.pending) setSaved('busy', 'Kaydediliyor');
  else setSaved('ok', 'Kaydedildi');
}
let lastSnap = JSON.stringify(state), lastQ = 0, histT;
function commit(immediate) {
  render(); save();
  clearTimeout(histT);
  const push = () => { const now = JSON.stringify(state);
    if (now !== lastSnap) { hist.past.push({ s: lastSnap, q: lastQ }); if (hist.past.length > 150) hist.past.shift(); hist.future = []; lastSnap = now; lastQ = live.rq; } syncUndo(); };
  immediate ? push() : (histT = setTimeout(push, 350));
  syncUndo(true);
}
function flushHist() { clearTimeout(histT); const now = JSON.stringify(state);
  if (now !== lastSnap) { hist.past.push({ s: lastSnap, q: lastQ }); hist.future = []; lastSnap = now; lastQ = live.rq; } }
// geçmişteki hâle dön; o andan sonra başkalarının yaptığı değişiklikler yeniden uygulanır (yalnızca kendi değişikliğin geri alınır)
function restore(entry) {
  const s = JSON.parse(entry.s), id = post()?.id;
  live.remote.forEach(r => { if (r.q > entry.q) r.ops.forEach(op => OrtakOps.apply(s, op)); });
  s.posts = s.posts.map(fixPost);
  const i = s.posts.findIndex(p => p.id === id);
  s.current = i >= 0 ? i : Math.min(s.current || 0, s.posts.length - 1);
  state = s; lastSnap = JSON.stringify(state); lastQ = live.rq;
}
function undo() { flushHist(); if (!hist.past.length) return; hist.future.push({ s: JSON.stringify(state), q: live.rq }); restore(hist.past.pop()); afterHistory(); }
function redo() { if (!hist.future.length) return; hist.past.push({ s: JSON.stringify(state), q: live.rq }); restore(hist.future.pop()); afterHistory(); }
function afterHistory() { if (state.current >= state.posts.length) state.current = state.posts.length - 1;
  if (sel && !present(post(), sel)) sel = null; renderAll(); save(); syncUndo(); }
function syncUndo(pending) { $('#undo').disabled = !hist.past.length && !pending; $('#redo').disabled = !hist.future.length; }

/* ---------- yardımcılar ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hexA = (hex, a) => { const h = String(hex).replace('#', ''); const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
const isLight = hex => { const n = parseInt(String(hex).replace('#', '').padEnd(6, '0'), 16); return ((n >> 16 & 255) * 299 + (n >> 8 & 255) * 587 + (n & 255) * 114) / 1000 > 200; };
const headHTML = (t, c) => esc(t).replace(/\*(.+?)\*/g, `<em style="color:${c}">$1</em>`);
const subHTML = (t, c) => esc(t).replace(/\*\*(.+?)\*\*/g, `<b style="color:${c}">$1</b>`);
const plain = t => String(t).replace(/\*/g, '');
const get = (o, path) => path.split('.').reduce((a, k) => a?.[k], o);
const set = (o, path, v) => { const ks = path.split('.'); const last = ks.pop(); ks.reduce((a, k) => a[k], o)[last] = v; };
const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); e.append(...kids); return e; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sel$ = k => `[data-el="${k}"]`;
let toastT;
function toast(msg, action) {
  const t = $('#toast'), b = t.querySelector('button');
  t.querySelector('span').textContent = msg;
  b.hidden = !action; b.onclick = action ? () => { action.fn(); t.classList.remove('on'); } : null;
  if (action) b.textContent = action.label;
  t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), action ? 6000 : 2600);
}

/* ---------- post çizimi ---------- */
// flow: eski sütun düzeni (yalnızca ilk konumları ölçmek için); abs: serbest yerleşim
function elHTML(p, k, f, mode) {
  const st = f === 'story', o = objOf(p, k), L = mode === 'abs' ? (p.layout[f][k] || {}) : null;
  // font ve satır aralığı akış düzeninde de geçerli (ilk konumlar onunla ölçülüyor)
  const deco = (o?.font && FONT_SET.has(o.font) ? `font-family:'${o.font}',Manrope,sans-serif;` : '') + (o?.lh ? `line-height:${+o.lh};` : '');
  const box = extra => { if (!L) return deco + (extra || '');
    const kk = kindOf(k);
    let s = `left:${L.x}px;top:${L.y}px;`;
    if (L.w != null) s += `width:${L.w}px;max-width:none;`;
    if (kk === 'box' && L.h != null) s += `height:${L.h}px;`;
    if (kk === 'k') s += `transform:scale(${o.k || 1});transform-origin:0 0;`;
    else if (o?.rot) s += `transform:rotate(${+o.rot}deg);`;
    if (o?.opacity != null && o.opacity < 100) s += `opacity:${o.opacity / 100};`;
    return s + deco + (extra || ''); };
  switch (k) {
    case 'brand': return `<div class="brand" data-el="brand" style="${box(`font-size:${o.size}px;color:${o.color}`)}">${o.logo ? '<img src="img/logo.png" alt="">' : ''}<span data-path="brand.text">${esc(o.text)}</span></div>`;
    case 'tag': return o.text ? `<div class="tag" data-el="tag" data-path="tag.text" style="${box(`font-size:${o.size}px;color:${o.color};${o.pill === false ? 'border:0;background:none;padding:0' : `border-color:${hexA(o.color, .3)};background:${hexA(o.color, .07)}`}`)}">${esc(o.text)}</div>` : '';
    case 'headline': return `<h1 data-el="headline" data-path="headline.text" data-raw="1" style="${box(`font-size:${o.size}px;${L ? '' : `max-width:${o.width}px;`}color:${o.color};text-align:${o.align}`)}">${headHTML(o.text, o.accent)}</h1>`;
    case 'line': return `<div class="line" data-el="line" style="${box(`background:${o.color}`)}"></div>`;
    case 'sub': return o.text ? `<p class="sub" data-el="sub" data-path="sub.text" data-raw="1" style="${box(`font-size:${o.size}px;${L ? '' : `max-width:${o.width}px;`}color:${o.color};text-align:${o.align}`)}">${subHTML(o.text, o.strong)}</p>` : '';
    case 'list': return o.items.length ? `<div class="list" data-el="list" style="${box(`color:${o.color}`)}">${o.items.map(x => `<div><i style="background:${o.dot}">✓</i>${esc(x)}</div>`).join('')}</div>` : '';
    case 'strip': return o.items.length ? `<div class="strip" data-el="strip" style="${box(`grid-template-columns:${o.items.map(i => clamp(i.t.length / 7, 1, 1.8) + 'fr').join(' ')}`)}">${
      o.items.map(i => `<div style="background:${i.c};border-color:${i.c === '#140504' ? 'rgba(255,255,255,.22)' : i.c}">${esc(i.t)}</div>`).join('')}</div>` : '';
    case 'grid': return o.items.length ? `<div class="grid" data-el="grid" style="${box()}">${o.items.map(i =>
      `<div style="background-image:url('${i.photo}');background-position:${i.pos || 'center'};aspect-ratio:${st ? 1.3 : 2.15}"><span>${esc(i.label)}</span></div>`).join('')}</div>` : '';
    case 'cta': return `<div class="cta" data-el="cta" style="${box(`background:${o.bg};color:${o.color};box-shadow:${o.shadow === false ? 'none' : `0 18px 40px -14px ${hexA(isLight(o.bg) ? '#000000' : o.bg, isLight(o.bg) ? .45 : .75)}`}`)}"><b data-path="cta.main">${esc(o.main)}</b>${o.url ? `<span data-path="cta.url">${esc(o.url)}</span>` : ''}</div>`;
    case 'notif': { const s = L ? box() : cardPos(o, f);
      return `<div class="card notif" data-el="notif" style="${s}"><div class="ic"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#d11414" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg></div><div><small data-path="notif.small">${esc(o.small)}</small><b data-path="notif.title">${esc(o.title)}</b></div></div>`; }
    case 'bubble': { const s = L ? box() : cardPos(o, f);
      return `<div class="card bubble" data-el="bubble" style="${s}"><small data-path="bubble.meta">${esc(o.meta)}</small><span data-path="bubble.text">${esc(o.text)}</span></div>`; }
    default: if (k.startsWith('o:') && o && L) return objHTML(o, k, L, box);
      if (k.startsWith('t:') && o) { const i = p.texts.indexOf(o);
      return `<div class="txt" data-el="${k}" data-path="texts.${i}.text" data-raw="1" style="${box(`font-size:${o.size}px;color:${o.color};font-weight:${o.weight};text-align:${o.align}`)}">${headHTML(o.text, o.accent || '#ff3b30')}</div>`; }
  }
  return '';
}
// bildirim kartı ve mesaj balonunun ilk konumu yalnızca feed ve story için tanımlı; yeni formatlarda feed'inkinden orantılı
const cardPos = (o, f) => { const q = o.pos?.[f]; if (q) return `left:${q.x}px;top:${q.y}px`;
  const b = o.pos?.feed || { x: 590, y: 985 }, [W, H] = SIZE[f]; return `left:${Math.round(b.x * W / 1080)}px;top:${Math.round(b.y * H / 1350)}px`; };
// kullanıcının eklediği şekil, görsel ve ikon. Şekil kutunun gerçek piksel ölçüsünde çizilir: kenar kalınlığı uzamaz.
const SHAPES = [['rect', 'Dikdörtgen'], ['ellipse', 'Daire'], ['triangle', 'Üçgen'], ['star', 'Yıldız'], ['line', 'Çizgi'], ['arrow', 'Ok']];
function shapeSVG(o, w, h) {
  const fill = o.fill === 'none' ? 'none' : o.fill || '#d11414', st = o.stroke && o.stroke !== 'none' ? o.stroke : 'none';
  const sw = st === 'none' ? 0 : clamp(+o.sw || 0, 0, 80), q = sw / 2, a = `fill="${fill}" stroke="${st}" stroke-width="${sw}" stroke-linejoin="round"`;
  let body;
  switch (o.shape) {
    case 'ellipse': body = `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${Math.max(1, w / 2 - q)}" ry="${Math.max(1, h / 2 - q)}" ${a}/>`; break;
    case 'triangle': body = `<polygon points="${w / 2},${q} ${w - q},${h - q} ${q},${h - q}" ${a}/>`; break;
    case 'star': { const pts = []; for (let i = 0; i < 10; i++) { const r = i % 2 ? .42 : 1, t = -Math.PI / 2 + i * Math.PI / 5;
        pts.push(`${(w / 2 + Math.cos(t) * (w / 2 - q) * r).toFixed(1)},${(h / 2 + Math.sin(t) * (h / 2 - q) * r).toFixed(1)}`); }
      body = `<polygon points="${pts.join(' ')}" ${a}/>`; break; }
    case 'line': case 'arrow': { const c = o.fill === 'none' ? (st === 'none' ? '#ffffff' : st) : fill, t = clamp(+o.sw || 8, 2, 80), y = h / 2;
      const head = o.shape === 'arrow' ? Math.min(w / 3, t * 3.2) : 0;
      body = `<line x1="${t / 2}" y1="${y}" x2="${head ? w - head : w - t / 2}" y2="${y}" stroke="${c}" stroke-width="${t}" stroke-linecap="${head ? 'butt' : 'round'}"/>`
        + (head ? `<polygon points="${w},${y} ${w - head},${y - head * .62} ${w - head},${y + head * .62}" fill="${c}"/>` : ''); break; }
    default: body = `<rect x="${q}" y="${q}" width="${Math.max(1, w - sw)}" height="${Math.max(1, h - sw)}" rx="${clamp(+o.radius || 0, 0, Math.min(w, h) / 2)}" ${a}/>`;
  }
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}
let iconMap = null;
const ICONS = () => (iconMap ||= Object.fromEntries(Object.values(window.Ikonlar || {}).flat()));
function objHTML(o, k, L, box) {
  const w = Math.max(1, L.w || 100), h = Math.max(1, L.h || 100);
  if (o.type === 'image') {
    const img = `background-image:url('${esc(o.src)}');background-size:${o.fit === 'contain' ? 'contain' : 'cover'};background-position:${+(o.px ?? 50)}% ${+(o.py ?? 50)}%;${o.flip ? 'transform:scaleX(-1);' : ''}`;
    return `<div class="obj oimg" data-el="${k}" style="${box(`border-radius:${+o.radius || 0}px;${o.shadow ? 'box-shadow:0 24px 60px -20px rgba(0,0,0,.65);' : ''}`)}"><i style="${img}"></i></div>`;
  }
  if (o.type === 'icon') {
    const d = ICONS()[o.name] || '';
    return `<div class="obj oicon" data-el="${k}" style="${box()}"><svg viewBox="0 0 24 24" width="${w}" height="${h}" fill="none" stroke="${o.color || '#ffffff'}" stroke-width="${clamp(+o.sw || 2, .5, 4)}" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">${d}</svg></div>`;
  }
  return `<div class="obj oshape" data-el="${k}" style="${box()}">${shapeSVG(o, w, h)}</div>`;
}
// fotoğraf karartması metnin durduğu yerden başlar: soldan (metin solda), alttan (metin altta), tümü (ortalanmış).
// Açık zeminde koyu fotoğraf metnin arkasından daha çok sezildiği için geçiş daha geç başlar (lt) ve tüm fotoğrafa hafif bir perde iner.
const SHADES = {
  left: (sc, sh, lt) => `linear-gradient(90deg,${hexA(sc, .97 * sh)} 0%,${hexA(sc, (lt ? .96 : .9) * sh)} ${lt ? 44 : 34}%,${hexA(sc, (lt ? .6 : .45) * sh)} ${lt ? 62 : 56}%,${hexA(sc, 0)} ${lt ? 80 : 76}%),
       linear-gradient(0deg,${hexA(sc, .85 * sh)} 0%,${hexA(sc, 0)} 30%),linear-gradient(180deg,${hexA(sc, .7 * sh)} 0%,${hexA(sc, 0)} 18%)`,
  bottom: (sc, sh, lt) => `linear-gradient(0deg,${hexA(sc, .97 * sh)} 0%,${hexA(sc, (lt ? .96 : .93) * sh)} 48%,${hexA(sc, (lt ? .7 : .6) * sh)} 64%,${hexA(sc, 0)} 84%),
       linear-gradient(180deg,${hexA(sc, .7 * sh)} 0%,${hexA(sc, 0)} 20%)`,
  full: (sc, sh) => `linear-gradient(0deg,${hexA(sc, .94 * sh)} 0%,${hexA(sc, .74 * sh)} 40%,${hexA(sc, .74 * sh)} 62%,${hexA(sc, .9 * sh)} 100%)`,
};
// keskin geçiş (AI tarz turu): metnin arkasında düz renk panel; sınırı ilk yerleşimde metne göre ölçülür (bg.cut)
const HARD = {
  left: (sc, sh, cut) => `linear-gradient(90deg,${hexA(sc, sh)} 0%,${hexA(sc, sh)} ${cut ?? 58}%,${hexA(sc, 0)} ${cut ?? 58}%)`,
  bottom: (sc, sh, cut) => `linear-gradient(0deg,${hexA(sc, sh)} 0%,${hexA(sc, sh)} ${cut ?? 50}%,${hexA(sc, 0)} ${cut ?? 50}%)`,
  full: (sc, sh) => `linear-gradient(${hexA(sc, .8 * sh)},${hexA(sc, .8 * sh)})`,
};
// keskin panelde fotoğraf yalnızca panelin dışındaki alana sığdırılır; ürün o alanın ortasında kalır
const phArea = (b, f) => b.edge !== 'hard' || b.shadeDir === 'full' ? ''
  : b.shadeDir === 'bottom' ? `bottom:${b.cut?.[f] ?? 50}%;` : `left:${b.cut?.[f] ?? 58}%;`;
function postHTML(p, f, mode = 'abs') {
  const [W, H] = SIZE[f], pad = PAD[f], b = p.bg;
  const sh = b.shade / 100, sc = b.shadeColor;
  const shade = b.mode === 'photo' && b.edge === 'hard' ? (HARD[b.shadeDir] || HARD.left)(sc, sh, b.cut?.[f])
    : b.mode === 'photo' ? (SHADES[b.shadeDir] || SHADES.left)(sc, sh, p.light) + (p.light && (b.edge !== 'hard' || b.shadeDir === 'full') ? `,linear-gradient(${hexA(sc, .42 * sh)},${hexA(sc, .42 * sh)})` : '')
    : `radial-gradient(120% 70% at 85% 0%,${b.g1} 0%,${b.g2} 55%,${sc} 100%)`;
  const photo = b.mode === 'photo'
    ? `<div class="ph" data-el="bg" style="${phArea(b, f)}background-image:url('${b.photo}');background-position:${b.x}% ${b.y}%;transform:scale(${b.zoom / 100});transform-origin:${b.x}% ${b.y}%"></div>`
    : `<div class="ph" data-el="bg"></div>`;
  const head = `<div class="post ${f} ${mode}${p.light ? ' light' : ''} lay-${p.flow || 'sol'}" style="--base:${b.base};--frame:${hexA(p.frame.color, p.frame.opacity / 100)};--pt:${pad.t}px;--pb:${pad.b}px;width:${W}px;height:${H}px">
    ${photo}<div class="shade" style="background:${shade}"></div>${p.frame.on ? '<div class="frame"></div>' : ''}`;
  if (mode === 'flow') {
    // ilk konumlar bu sütun düzeninden ölçülür; düzen (p.flow) yalnızca burada etkili, sonrası serbest yerleşim
    const H = k => elHTML(p, k, f, 'flow'), cards = ['notif', 'bubble'].filter(k => p[k].on);
    const top = isOn(p, 'brand') ? H('brand') : '', cta = p.cta.on ? H('cta') : '';
    const body = ['tag', 'headline', 'line', 'sub', 'list', 'strip', 'grid'].filter(k => isOn(p, k)).map(H).join('');
    const inline = p.flow === 'orta' ? cards.map(H).join('') : '';  // ortalanmış düzende kartlar metnin altında
    const col = p.flow === 'alt' ? `<div class="sp"></div>${top}${body}${cta ? `<div class="gap"></div>${cta}` : ''}`
      : p.flow === 'orta' ? `${top}<div class="sp"></div>${body}${inline}<div class="sp"></div>${cta}`
      : `${top}${body}<div class="sp"></div>${cta}`;
    return `${head}<div class="col">${col}</div>${p.flow === 'orta' ? '' : cards.map(H).join('')}</div>`;
  }
  return `${head}${p.order.filter(k => isOn(p, k)).map(k => elHTML(p, k, f, 'abs')).join('')}</div>`;
}

/* ---------- ilk konumları eski sütun düzeninden ölç ---------- */
function ensureLayout(p, f) {
  const lay = p.layout[f];
  let derived = false;
  p.order.filter(k => isFree(k) && isOn(p, k) && !lay[k]).forEach(k => {
    const from = FMTS.find(g => p.layout[g]?.[k]); if (!from) return;
    const S = p.layout[from][k], [W0, H0] = SIZE[from], [W, H] = SIZE[f], kx = W / W0, ky = H / H0, kk = Math.min(kx, ky);
    lay[k] = { x: Math.round(S.x * kx), y: Math.round(S.y * ky), ...(S.w != null ? { w: Math.round(S.w * (k.startsWith('t:') ? kx : kk)) } : {}),
      ...(S.h != null ? { h: Math.round(S.h * kk) } : {}) };
    derived = true; });
  const need = p.order.filter(k => isOn(p, k) && !lay[k] && !isFree(k));
  if (!need.length) return derived;
  const host = el('div'); host.style.cssText = 'position:fixed;left:-30000px;top:0;visibility:hidden';
  host.innerHTML = postHTML(p, f, 'flow'); document.body.append(host);
  const root = host.firstElementChild.getBoundingClientRect();
  need.forEach(k => {
    const n = host.querySelector(sel$(k)); if (!n) return;
    const r = n.getBoundingClientRect();
    const box = { x: Math.round(r.left - root.left), y: Math.round(r.top - root.top) };
    // metin kutusu içeriğe göre daralmışsa (ortalanmış düzen) aşağı yuvarlamak satırı kırar: yukarı yuvarla, 2 px pay bırak
    if (['headline', 'sub'].includes(k)) box.w = Math.ceil(r.width) + 2;
    else if (['line', 'strip', 'grid'].includes(k)) box.w = Math.round(r.width);
    lay[k] = box;
  });
  if (p.bg.edge === 'hard' && p.bg.cut?.[f] == null) {
    // sol panel: etiket, başlık, alt metin ve listeye göre (buton fotoğrafa taşabilir); alt panel: logodan itibaren tüm blok
    const keys = p.bg.shadeDir === 'bottom' ? ['brand', 'tag', 'headline', 'sub', 'list', 'cta'] : ['tag', 'headline', 'sub', 'list'];
    const [W, H] = SIZE[f], rs = keys.map(k => host.querySelector(sel$(k))).filter(Boolean)
      .map(n => n.getBoundingClientRect()).map(r => ({ top: r.top - root.top, right: r.right - root.left }));
    if (rs.length) (p.bg.cut ||= {})[f] = p.bg.shadeDir === 'bottom'
      ? Math.round(clamp((H - Math.min(...rs.map(r => r.top)) + 64) / H * 100, 30, 80))
      : Math.round(clamp((Math.max(...rs.map(r => r.right)) + 64) / W * 100, 40, 66));
  }
  host.remove();
  return true;
}
function ensureAll() { let ch = false; state.posts.forEach(p => { ch = ensureLayout(p, 'feed') || ch; ch = ensureLayout(p, 'story') || ch; }); return ch; }

/* ---------- sahne ve yakınlaştırma ---------- */
function layout() {
  const st = $('#stage'), [W, H] = SIZE[fmt];
  const vw = st.clientWidth, vh = st.clientHeight, top = 64;
  const fitS = Math.max(.1, Math.min((vw - 96) / W, (vh - 48 - top) / H));
  scale = zoom ?? fitS;
  const cw = W * scale, ch = H * scale;
  const bw = Math.max(vw, cw + 96), bh = Math.max(vh, ch + 48 + top);
  const b = $('#board'); b.style.width = bw + 'px'; b.style.height = bh + 'px';
  const c = $('#canvas'); Object.assign(c.style, { width: cw + 'px', height: ch + 'px', left: (bw - cw) / 2 + 'px', top: Math.max(top, (bh - ch + top - 48) / 2) + 'px' });
  const pst = c.firstElementChild; if (pst) pst.style.transform = `scale(${scale})`;
  $('#zFit').textContent = '%' + Math.round(scale * 100);
  $('#zFit').setAttribute('aria-label', `Yakınlık yüzde ${Math.round(scale * 100)}. Ekrana sığdırmak için tıkla`);
  placeSel(); paintPeers();
}
function setZoom(z) { zoom = z == null ? null : clamp(z, .15, 2); layout(); }
function renderCanvas() { ensureLayout(post(), fmt); $('#canvas').innerHTML = postHTML(post(), fmt); layout(); }
function placeBox(box, node) {
  if (!node) { box.classList.remove('on'); return; }
  const br = $('#board').getBoundingClientRect();
  const R = node.dataset.el === 'bg' ? $('#canvas').getBoundingClientRect() : node.getBoundingClientRect();
  Object.assign(box.style, { left: R.left - br.left + 'px', top: R.top - br.top + 'px', width: R.width + 'px', height: R.height + 'px' });
  box.classList.add('on'); return R;
}
function placeSel() {
  if (multi.length > 1) return placeMulti();
  $('#sel').classList.remove('multisel');
  const node = sel && $('#canvas').querySelector(sel$(sel));
  const s = $('#sel'), R = placeBox(s, node);
  if (R) {
    s.querySelector('b').textContent = nameOf(sel);
    s.classList.toggle('low', R.top - $('#stage').getBoundingClientRect().top < 100);
    const L = post().layout[fmt][sel];
    s.classList.toggle('bgsel', sel === 'bg');
    s.classList.toggle('haswidth', !!L && L.w != null && kindOf(sel) !== 'w' || sel === 'line' || sel === 'strip' || sel === 'grid' || kindOf(sel) === 'box');
    s.classList.toggle('hasheight', kindOf(sel) === 'box'); s.classList.toggle('locked', !!post().locks?.[sel]);
  }
  renderToolbar();
}

/* ---------- sol liste ---------- */
function closeMenus() { document.querySelectorAll('.menu.open').forEach(m => { m.classList.remove('open'); m.querySelector('[aria-expanded]')?.setAttribute('aria-expanded', 'false'); }); }
function postMenu(i) {
  const p = state.posts[i];
  const m = el('div', { className: 'menu' });
  const more = el('button', { type: 'button', className: 'more', title: 'Post işlemleri', innerHTML: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>' });
  more.setAttribute('aria-label', `Post ${i + 1} işlemleri`); more.setAttribute('aria-haspopup', 'menu'); more.setAttribute('aria-expanded', 'false');
  const pop = el('div', { className: 'pop' }); pop.setAttribute('role', 'menu');
  const item = (label, fn, danger) => { const b = el('button', { type: 'button', textContent: label, className: danger ? 'danger' : '' });
    b.setAttribute('role', 'menuitem'); b.onclick = e => { e.stopPropagation(); closeMenus(); fn(); }; pop.append(b); };
  item('Çoğalt', () => duplicate(i));
  if (p.origin != null) item('İlk hâline döndür', () => resetPost(i));
  if (state.posts.length > 1) item('Sil', () => removePost(i), true);
  more.onclick = e => { e.stopPropagation(); const open = !m.classList.contains('open'); closeMenus(); m.classList.toggle('open', open);
    more.setAttribute('aria-expanded', open);
    if (open) { const r = more.getBoundingClientRect(), h = pop.offsetHeight;
      const top = r.bottom + 4 + h > innerHeight - 8 ? r.top - 4 - h : r.bottom + 4;
      Object.assign(pop.style, { left: Math.min(r.right - pop.offsetWidth, innerWidth - pop.offsetWidth - 8) + 'px', top: top + 'px' });
      pop.querySelector('button').focus(); } };
  m.append(more, pop); return m;
}
function renderList() {
  const L = $('#plist'); L.innerHTML = '';
  const [W, H] = SIZE[fmt], k = 60 / W;
  state.posts.forEach((p, i) => {
    ensureLayout(p, fmt);
    const li = el('li', { className: 'pitem' }); li.setAttribute('aria-current', i === state.current);
    const pick = el('button', { type: 'button', className: 'pick' });
    pick.setAttribute('aria-label', `Post ${i + 1}: ${plain(p.headline.text) || 'Başlıksız'}`);
    pick.onclick = () => { if (state.current === i) return; state.current = i; sel = null; renderAll(); save(); };
    li.innerHTML = `<div class="pthumb" style="height:${H * k}px"><div style="transform:scale(${k})">${postHTML(p, fmt)}</div></div><div class="txt"><span></span></div>`;
    li.querySelector('.txt span').textContent = plain(p.headline.text) || 'Başlıksız post';
    li.prepend(pick); li.append(postMenu(i)); L.append(li);
  });
  paintPeerList();
}
function refreshThumb() {
  const li = $('#plist').children[state.current]; if (!li) return;
  li.querySelector('.pthumb > div').innerHTML = postHTML(post(), fmt);
  li.querySelector('.txt span').textContent = plain(post().headline.text) || 'Başlıksız post';
  li.querySelector('.pick').setAttribute('aria-label', `Post ${state.current + 1}: ${plain(post().headline.text) || 'Başlıksız'}`);
}
function duplicate(i) { const c = clone(state.posts[i]); c.id = nid(); delete c.origin; state.posts.splice(i + 1, 0, c); state.current = i + 1; sel = null;
  commit(true); renderAll(); toast(`Post ${i + 1} çoğaltıldı`); }
function resetPost(i) { const d = defaultPost(state.posts[i].origin); d.id = state.posts[i].id; state.posts[i] = d; state.current = i; sel = null;
  commit(true); renderAll(); toast(`Post ${i + 1} ilk hâline döndü`, { label: 'Geri al', fn: undo }); }
function removePost(i) { if (state.posts.length < 2) return; state.posts.splice(i, 1);
  state.current = Math.min(state.current >= i ? Math.max(0, state.current - 1) : state.current, state.posts.length - 1); sel = null;
  commit(true); renderAll(); toast(`Post ${i + 1} silindi`, { label: 'Geri al', fn: undo }); }

/* ---------- öğe işlemleri ---------- */
function toggle(k, on) { const p = post();
  if (isFree(k)) { if (!on) return removeText(k); return; }
  p[k].on = on;
  if (on && STARTER[k] && !p[k].items.length) p[k].items = STARTER[k]();
  if (!on && sel === k) sel = null; commit(true); renderPanel();
  toast(on ? `${nameOf(k)} eklendi` : `${nameOf(k)} gizlendi`, on ? null : { label: 'Geri al', fn: undo }); }
function addText(src) {
  const p = post(), id = nid().slice(1), k = 't:' + id, [W, H] = SIZE[fmt];
  const t = src ? Object.assign(clone(objOf(p, src)), { id }) : { id, text: 'Metni düzenlemek için çift tıkla', size: 56, color: '#ffffff', weight: 800, align: 'left', accent: '#ff3b30' };
  p.texts.push(t); p.order.push(k);
  FMTS.forEach(f => { const s = src && p.layout[f][src];
    p.layout[f][k] = s ? { x: s.x + 30, y: s.y + 30, w: s.w } : { x: 150, y: Math.round(SIZE[f][1] / 2 - 60), w: 780 }; });
  commit(true); select(k); toast(src ? 'Metin çoğaltıldı' : 'Metin eklendi');
}
function removeText(k, quiet) { const p = post();
  if (k.startsWith('o:')) p.items = p.items.filter(t => 'o:' + t.id !== k); else p.texts = p.texts.filter(t => 't:' + t.id !== k);
  p.order = p.order.filter(x => x !== k); FMTS.forEach(f => delete p.layout[f][k]); delete p.locks?.[k]; delete p.groups?.[k];
  if (sel === k) sel = null; multi = multi.filter(x => x !== k);
  if (quiet) return;
  commit(true); renderPanel(); toast(`${k.startsWith('o:') ? 'Öğe' : 'Metin'} silindi`, { label: 'Geri al', fn: undo }); }
// şekil, görsel, ikon: sayfanın ortasına, her formatta orantılı yerleşir
const ITEM_DEFAULTS = { shape: { shape: 'rect', fill: '#d11414', stroke: 'none', sw: 8, radius: 28 }, image: { fit: 'cover', radius: 0 }, icon: { name: 'star', color: '#ffffff', sw: 2 } };
const ITEM_SIZE = { shape: [360, 360], image: [600, 600], icon: [200, 200] };
function addItem(type, props = {}, size) {
  const p = post(), id = nid().slice(1), k = 'o:' + id;
  (p.items ||= []).push(Object.assign({ id, type, rot: 0, opacity: 100 }, clone(ITEM_DEFAULTS[type] || {}), props));
  p.order.push(k);
  const [bw, bh] = size || ITEM_SIZE[type];
  FMTS.forEach(f => { const [W, H] = SIZE[f], kk = Math.min(1, W * .8 / bw, H * .8 / bh), w = Math.round(bw * kk), h = Math.round(bh * kk);
    p.layout[f][k] = { x: Math.round((W - w) / 2), y: Math.round((H - h) / 2), w, h }; });
  commit(true); select(k); return k;
}
function duplicateFree(k) {
  if (!k.startsWith('o:')) return addText(k);
  const p = post(), o = objOf(p, k); if (!o) return;
  const id = nid().slice(1), nk = 'o:' + id; p.items.push(Object.assign(clone(o), { id })); p.order.push(nk);
  FMTS.forEach(f => { const s = p.layout[f][k]; if (s) p.layout[f][nk] = { ...s, x: s.x + 30, y: s.y + 30 }; });
  commit(true); select(nk); toast(`${nameOf(nk)} çoğaltıldı`);
}
function removeSel() {
  if (multi.length > 1) { const n = multi.length;
    [...multi].forEach(k => { if (isFree(k)) removeText(k, true); else if (hideable(k) && isOn(post(), k)) post()[k].on = false; });
    multi = []; sel = null; commit(true); renderPanel(); placeSel(); toast(`${n} öğe silindi`, { label: 'Geri al', fn: undo }); return; }
  if (!sel || !hideable(sel)) return; if (isFree(sel)) removeText(sel); else if (isOn(post(), sel)) toggle(sel, false); }
function reorder(k, dir) { const o = post().order, i = o.indexOf(k); if (i < 0) return;
  o.splice(i, 1); dir === 'front' ? o.push(k) : o.unshift(k); commit(true); toast(dir === 'front' ? 'Öne getirildi' : 'Arkaya gönderildi'); }
function centerSel(axis) { const L = post().layout[fmt][sel]; const n = $('#canvas').querySelector(sel$(sel)); if (!L || !n) return;
  const r = n.getBoundingClientRect(), [W, H] = SIZE[fmt];
  if (axis === 'x') L.x = Math.round((W - r.width / scale) / 2); else L.y = Math.round((H - r.height / scale) / 2);
  commit(true); renderProps(); }

/* ---------- katmanlar ---------- */
const IC = {
  img: '<path d="M3 5h18v14H3z"/><circle cx="8.5" cy="10" r="1.5"/><path d="m21 16-5-5-8 8"/>',
  text: '<path d="M5 6V4h14v2M12 4v16M9 20h6"/>', line: '<path d="M4 12h16"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  card: '<rect x="3" y="6" width="18" height="12" rx="3"/>',
  grid: '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>',
  shape: '<rect x="4" y="4" width="16" height="16" rx="4"/>', star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/>',
  btn: '<rect x="3" y="8" width="18" height="8" rx="4"/>', logo: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
};
const icon = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${IC[k.startsWith('t:') ? 'text' : k.startsWith('o:') ? { shape: 'shape', image: 'img', icon: 'star' }[objOf(post(), k)?.type] || 'shape' : ELS.find(e => e[0] === k)[2]]}</svg>`;
const EYE = on => on
  ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>'
  : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.8 8.5 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/></svg>';
const TRASH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>';
function renderLayers() {
  const p = post(), L = $('#layers'), A = $('#adds'); L.innerHTML = ''; A.innerHTML = '';
  // üstteki öğe listede üstte (Canva gibi): arka plan en altta
  const keys = [...p.order].reverse().filter(k => present(p, k)).concat('bg');
  keys.forEach(k => {
    const on = isOn(p, k), o = objOf(p, k), n = k.startsWith('t:') ? `Metin: ${plain(o.text).slice(0, 22)}`
      : k.startsWith('o:') ? `${nameOf(k)}${o.type === 'shape' ? `: ${(SHAPES.find(x => x[0] === o.shape) || [])[1] || ''}` : o.type === 'icon' ? `: ${o.name}` : ''}` : nameOf(k);
    const li = el('li', { className: 'layer' + (on ? '' : ' off') + (p.groups?.[k] ? ' grouped' : '') }); li.setAttribute('aria-current', sel === k || multi.includes(k));
    const nm = el('button', { type: 'button', className: 'nm', innerHTML: `${icon(k)}<span></span>` }); nm.querySelector('span').textContent = n;
    nm.onclick = e => e.shiftKey && k !== 'bg' ? toggleMulti(k) : select(k); li.append(nm);
    if (isFree(k)) { const d = el('button', { type: 'button', className: 'eye', innerHTML: TRASH }); d.setAttribute('aria-label', `${n} sil`); d.title = 'Sil';
      d.onclick = () => removeText(k); li.append(d); }
    else if (hideable(k)) { const e = el('button', { type: 'button', className: 'eye', innerHTML: EYE(on) });
      e.setAttribute('aria-label', `${n} ${on ? 'gizle' : 'göster'}`); e.title = on ? 'Gizle' : 'Göster';
      e.onclick = () => toggle(k, !on); li.append(e); }
    if (k !== 'bg') { const lk = !!p.locks?.[k], b = el('button', { type: 'button', className: 'eye lockb' + (lk ? ' on' : ''), innerHTML: tbSvg(lk ? 'lock' : 'unlock') });
      b.setAttribute('aria-label', `${n} ${lk ? 'kilidini aç' : 'kilitle'}`); b.title = lk ? 'Kilidi aç' : 'Kilitle'; b.onclick = () => toggleLock(k); li.append(b); }
    L.append(li);
  });
  const tb = el('button', { type: 'button', innerHTML: `${icon('t:x')}<span>Metin</span>` }); tb.onclick = () => addText();
  A.append(el('li', {}, tb));
  OPTIONAL.filter(k => !p[k].on).forEach(k => { const b = el('button', { type: 'button', innerHTML: `${icon(k)}<span>${nameOf(k)}</span>` });
    b.onclick = () => { toggle(k, true); select(k); }; A.append(el('li', {}, b)); });
}

/* ---------- alanlar ---------- */
const P = path => ({ get: () => get(post(), path), set: v => set(post(), path, v) });
const LB = (k, prop) => ({ get: () => post().layout[fmt][k]?.[prop], set: v => { post().layout[fmt][k][prop] = v; } });
function field(label, inner, tip) { const w = el('label', { className: 'f' }); w.append(el('span', { textContent: label }), inner);
  if (tip) w.append(el('small', { className: 'tip', textContent: tip })); return w; }
function textF(label, path, opts = {}) {
  const i = el(opts.area ? 'textarea' : 'input'); if (!opts.area) i.type = 'text'; if (opts.rows) i.rows = opts.rows;
  i.value = get(post(), path) ?? ''; i.dataset.path = path;
  i.oninput = () => { set(post(), path, i.value); commit(); };
  return field(label, i, opts.tip);
}
/* Instagram açıklaması: kural denetimi caption.js'te (5 hashtag, 2.200 karakter, akışta görünen ilk satır…) */
const CAP_FIXABLE = ['chars', 'tags', 'dupes', 'stars', 'inline'];
function capReport(box, text) {
  const a = Caption.analyze(text), L = Caption.LIMITS, n = v => v.toLocaleString('tr-TR');
  box.classList.toggle('bad', a.issues.some(i => i.level === 'error'));
  const more = a.hook.long || text.trim().includes('\n');
  box.innerHTML = `<div class="meters"><span class="${a.chars > L.chars ? 'over' : ''}">${n(a.chars)} / ${n(L.chars)} karakter</span>`
    + `<span class="${a.tags.length > L.tags ? 'over' : ''}">${a.tags.length} / ${L.tags} hashtag</span></div>`
    + (a.hook.text ? `<div class="feed"><small>Akışta ilk görünen</small>${esc([...a.hook.text].slice(0, L.fold).join(''))}${more ? '<span class="more"> … devamı</span>' : ''}</div>` : '')
    + (a.issues.length ? `<ul>${a.issues.map(i => `<li class="${i.level}">${esc(i.msg)}</li>`).join('')}</ul>` : '<p class="allok">Instagram kurallarına uygun.</p>');
  return a;
}
async function copyCaption(text, area) {
  const errs = Caption.analyze(text).issues.filter(i => i.level === 'error').length;
  try { await navigator.clipboard.writeText(text); toast(errs ? `Kopyalandı; ama Instagram'ın kabul etmeyeceği ${errs} sorun var` : 'Açıklama kopyalandı'); }
  catch (_) { area.select(); toast('Kopyalanamadı; metni seçtim, Ctrl+C ile kopyala'); }
}
function captionF() {
  const i = el('textarea', { rows: 8, value: post().caption || '', placeholder: 'İlk satır akışta görünür: derdi ya da kazancı tek cümlede söyleyin.' });
  i.dataset.path = 'caption'; i.setAttribute('aria-describedby', 'capChk');
  const box = el('div', { className: 'capchk', id: 'capChk' });
  const fixB = el('button', { type: 'button', className: 'btn', textContent: 'Kurallara uydur', title: "Yıldızları siler, hashtag'leri tekilleştirip sona taşır ve 5'e indirir" });
  const copyB = el('button', { type: 'button', className: 'btn', textContent: 'Açıklamayı kopyala' });
  const upd = () => { fixB.hidden = !capReport(box, i.value).issues.some(x => CAP_FIXABLE.includes(x.code)); };
  i.oninput = () => { post().caption = i.value; commit(); upd(); };
  fixB.onclick = () => { flushHist(); i.value = post().caption = Caption.fix(i.value); commit(true); upd(); toast('Açıklama kurallara uyduruldu', { label: 'Geri al', fn: undo }); };
  copyB.onclick = () => copyCaption(i.value, i);
  upd();
  return el('div', { className: 'capf' }, field('Instagram açıklaması', i), box, el('div', { className: 'capbtns' }, fixB, copyB));
}
function rangeF(label, b, min, max, step = 1, unit = '') {
  const B = typeof b === 'string' ? P(b) : b;
  const w = el('div', { className: 'rng' });
  const r = el('input', { type: 'range', min, max, step, value: B.get() });
  const n = el('input', { type: 'number', min, max, step, value: Math.round(B.get() * 100) / 100 });
  r.setAttribute('aria-label', label); n.setAttribute('aria-label', `${label} (${unit.trim() || 'değer'})`);
  r.oninput = () => { n.value = r.value; B.set(+r.value); commit(); };
  n.onchange = () => { const v = clamp(+n.value || min, min, max); n.value = r.value = v; B.set(v); commit(true); };
  w.append(r, n); const f = el('div', { className: 'f' }); f.append(el('span', { textContent: label + (unit ? ` (${unit.trim()})` : '') }), w); return f;
}
function numF(label, b) { const B = b; const n = el('input', { type: 'number', value: Math.round(B.get()) }); n.setAttribute('aria-label', label);
  n.onchange = () => { B.set(Math.round(+n.value || 0)); commit(true); }; const f = el('label', { className: 'f' }); f.append(el('span', { textContent: label }), n); return f; }
function colorF(label, path) {
  const box = el('div', { className: 'color' });
  const c = el('input', { type: 'color', value: get(post(), path) }); c.setAttribute('aria-label', label);
  const t = el('input', { type: 'text', value: get(post(), path), spellcheck: false }); t.setAttribute('aria-label', `${label}, hex kodu`);
  const sw = el('div', { className: 'sw' }); sw.setAttribute('role', 'group'); sw.setAttribute('aria-label', `${label} hazır renkler`);
  const apply = v => { c.value = t.value = v; set(post(), path, v); [...sw.children].forEach(b => b.setAttribute('aria-pressed', b.dataset.v === v)); };
  c.oninput = () => { apply(c.value); commit(); };
  t.onchange = () => { const v = t.value.trim().toLowerCase().replace(/^([0-9a-f]{6})$/, '#$1');
    if (/^#[0-9a-f]{6}$/.test(v)) { apply(v); commit(true); } else { t.value = get(post(), path); toast('Geçerli bir renk kodu gir, örneğin #d11414'); } };
  swatches().forEach(v => { const b = el('button', { type: 'button' }); b.dataset.v = v; b.style.background = v; b.title = v;
    b.setAttribute('aria-label', v); b.setAttribute('aria-pressed', get(post(), path) === v);
    b.onclick = () => { apply(v); commit(true); }; sw.append(b); });
  box.append(c, t); const f = el('div', { className: 'f' }); f.append(el('span', { textContent: label }), box, sw); return f;
}
function checkF(label, path, after) { const i = el('input', { type: 'checkbox', checked: !!get(post(), path) });
  i.onchange = () => { set(post(), path, i.checked); commit(true); if (after) after(); };
  const l = el('label', { className: 'check' }); l.append(i, label); return l; }
function segF(label, path, options, after) {
  const s = el('div', { className: 'seg' }); s.setAttribute('role', 'group'); s.setAttribute('aria-label', label);
  options.forEach(([v, n]) => { const b = el('button', { type: 'button', textContent: n }); b.setAttribute('aria-pressed', get(post(), path) === v);
    b.onclick = () => { set(post(), path, v); commit(true); (after || renderPanel)(); }; s.append(b); });
  const f = el('div', { className: 'f' }); f.append(el('span', { textContent: label }), s); return f;
}
const row = (...els) => el('div', { className: 'row' }, ...els);
const group = (title, ...els) => { const g = el('div', { className: 'group' }); if (title) g.append(el('h4', { textContent: title })); g.append(...els); return g; };

const libGroups = () => state.uploads?.length ? [...LIB_CATS, ['Yüklediklerin', state.uploads]] : LIB_CATS;
function libF(current, onPick) {
  const g = el('div', { className: 'lib' });
  libGroups().forEach(([cat, items]) => {
    g.append(el('h5', { textContent: cat }));
    items.forEach(ph => {
      const b = el('button', { type: 'button', title: ph.name }); b.setAttribute('aria-label', ph.name);
      b.style.backgroundImage = `url('${ph.src}')`; b.setAttribute('aria-pressed', ph.src === current);
      b.onclick = () => onPick(ph.src); g.append(b);
    });
  });
  const up = el('label', { innerHTML: 'Fotoğraf yükle<input type="file" accept="image/*" hidden>' });
  up.tabIndex = 0; up.setAttribute('role', 'button');
  up.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); up.querySelector('input').click(); } };
  up.querySelector('input').onchange = async e => { const file = e.target.files[0]; if (!file) return;
    try { const src = await uploadPhoto(await shrink(file)); (state.uploads ||= []).push({ src, name: file.name }); onPick(src); toast('Fotoğraf eklendi'); }
    catch (err) { if (err?.message) toast(err.message); } };
  g.append(up); const f = el('div', { className: 'f' }); f.append(el('span', { textContent: 'Fotoğraf' }), g); return f;
}
// ortak çalışmada fotoğraf sunucuya yüklenir (herkes görsün, kayıt şişmesin); bağlantı yoksa tarayıcıda kalır
async function uploadPhoto(dataUrl) {
  if (!live.on) return dataUrl;
  const r = await fetch('/api/post-editoru/yukle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: dataUrl }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Fotoğraf yüklenemedi.');
  return j.src;
}
function shrink(file) {
  return new Promise((res, rej) => { const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => { const k = Math.min(1, 2000 / Math.max(img.width, img.height));
      const cv = el('canvas', { width: Math.round(img.width * k), height: Math.round(img.height * k) });
      const x = cv.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url); res(cv.toDataURL('image/jpeg', .9)); };
    img.onerror = () => { URL.revokeObjectURL(url); toast('Bu dosya açılamadı. JPG veya PNG dene.'); rej(); }; img.src = url; });
}

const STYLE_KEYS = { brand: ['size', 'color', 'logo'], tag: ['size', 'color', 'pill'], headline: ['size', 'color', 'accent', 'align'], line: ['color'],
  sub: ['size', 'color', 'strong', 'align'], list: ['dot', 'color', 'k'], cta: ['bg', 'color', 'k', 'shadow'], bg: ['shade', 'shadeDir', 'edge', 'shadeColor', 'g1', 'g2', 'base'] };
const PD = (path, d) => ({ get: () => get(post(), path) ?? d, set: v => set(post(), path, v) });
function boolF(label, getv, toggle) { const i = el('input', { type: 'checkbox', checked: !!getv() }); i.onchange = () => toggle(i.checked);
  const l = el('label', { className: 'check' }); l.append(i, label); return l; }
// yazı tipi: seçenekler kendi fontuyla görünür; yüklenince yeniden çizilir
function fontF(label, path) {
  const s = el('select', { className: 'fontsel' }); s.setAttribute('aria-label', label);
  const cur = get(post(), path) || 'Manrope';
  FONTS.forEach(f => { const o = new Option(f, f, false, f === cur); o.style.fontFamily = `'${f}'`; s.add(o); });
  s.style.fontFamily = `'${cur}'`;
  s.onchange = async () => { const f = s.value; s.style.fontFamily = `'${f}'`;
    await Promise.all([400, 700, 800].map(w => document.fonts.load(`${w} 40px '${f}'`).catch(() => {})));
    set(post(), path, f === 'Manrope' ? undefined : f); commit(true); };
  return field(label, s);
}
function objProps(k, o, tp, add) {
  const O = () => objOf(post(), k);
  if (o.type === 'shape') {
    const seg = el('div', { className: 'seg wrap' }); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Şekil');
    const thin = v => v === 'line' || v === 'arrow';
    SHAPES.forEach(([v, n]) => { const b = el('button', { type: 'button', textContent: n }); b.setAttribute('aria-pressed', o.shape === v);
      b.onclick = () => { const it = O(), was = it.shape;
        // çizgi/ok ince bir kutu, diğerleri kare: tür değişince kutunun yüksekliği de değişir
        if (thin(v) !== thin(was)) FMTS.forEach(f => { const l = post().layout[f][k]; if (l) l.h = thin(v) ? Math.max(24, (+it.sw || 8) * 4) : l.w; });
        it.shape = v; commit(true); renderProps(); placeSel(); };
      seg.append(b); });
    add(el('div', { className: 'f' }, el('span', { textContent: 'Şekil' }), seg));
    if (thin(o.shape)) add(group('Çizgi', colorF('Renk', `${tp}.fill`), rangeF('Kalınlık', PD(`${tp}.sw`, 8), 2, 60, 1, ' px')));
    else {
      add(group('Dolgu', boolF('İçi boş', () => O().fill === 'none', on => { O().fill = on ? 'none' : '#d11414'; commit(true); renderProps(); }),
        ...(o.fill !== 'none' ? [colorF('Dolgu rengi', `${tp}.fill`)] : [])));
      add(group('Kenar', boolF('Kenar çizgisi', () => O().stroke && O().stroke !== 'none', on => { O().stroke = on ? '#ffffff' : 'none'; commit(true); renderProps(); }),
        ...(o.stroke && o.stroke !== 'none' ? [colorF('Kenar rengi', `${tp}.stroke`), rangeF('Kenar kalınlığı', PD(`${tp}.sw`, 8), 1, 60, 1, ' px')] : [])));
      if (o.shape === 'rect') add(rangeF('Köşe yuvarlaklığı', PD(`${tp}.radius`, 0), 0, 400, 1, ' px'));
    }
  } else if (o.type === 'image') {
    window.__editorHooks?.imageTools?.(k, add);
    add(libF(o.src, src => { O().src = src; commit(true); renderProps(); }));
    add(group('Görünüm', segF('Kutuya yerleşim', `${tp}.fit`, [['cover', 'Doldur'], ['contain', 'Sığdır']]),
      rangeF('Yatay odak', PD(`${tp}.px`, 50), 0, 100, 1, '%'), rangeF('Dikey odak', PD(`${tp}.py`, 50), 0, 100, 1, '%'),
      rangeF('Köşe yuvarlaklığı', PD(`${tp}.radius`, 0), 0, 600, 1, ' px'), checkF('Aynala', `${tp}.flip`), checkF('Gölge', `${tp}.shadow`)));
  } else if (o.type === 'icon') {
    const s = el('select'); s.setAttribute('aria-label', 'İkon');
    Object.entries(window.Ikonlar || {}).forEach(([cat, list]) => { const g = el('optgroup', { label: cat });
      list.forEach(([n]) => g.append(new Option(n, n, false, n === o.name))); s.append(g); });
    s.onchange = () => { O().name = s.value; commit(true); };
    add(field('İkon', s, 'Daha fazlası için Ekle sekmesindeki ikonlara bak.'), colorF('Renk', `${tp}.color`), rangeF('Çizgi kalınlığı', PD(`${tp}.sw`, 2), .5, 4, .25));
  }
}
function applyAll(k) { const src = post();
  state.posts.forEach(p => { if (p === src) return; STYLE_KEYS[k].forEach(key => p[k][key] = src[k][key]); if (k === 'bg') p.frame = clone(src.frame); });
  commit(true); renderList(); toast(`${nameOf(k)} stili tüm postlara uygulandı`, { label: 'Geri al', fn: undo }); }

const DESC = {
  bg: 'Fotoğrafı sahnede sürükleyerek odak noktasını kaydır.',
  headline: 'Sahnede sürükleyip taşı, kenar tutamaklarıyla genişliğini, köşeyle boyutunu değiştir. *Yıldız* içindeki kısım vurgu renginde görünür.',
  sub: 'Sürükleyip taşı, tutamaklarla boyutlandır. **Çift yıldız** içindeki kısım kalın görünür.',
};
function renderProps() {
  const Pn = $('#props'); Pn.innerHTML = '';
  if (multi.length > 1) return renderMultiProps(Pn);
  const p = post(), k = sel || 'bg', o = objOf(p, k);
  Pn.append(el('h3', { textContent: sel ? nameOf(k) : 'Sayfa' }));
  Pn.append(el('p', { className: 'desc', textContent: sel ? (DESC[k] || 'Sahnede sürükleyerek taşı, köşe tutamağıyla boyutlandır. Metinleri çift tıklayıp yerinde düzenleyebilirsin.') : 'Bir öğeyi düzenlemek için sahnede ona tıkla. Burada arka planı ve çerçeveyi ayarlayabilirsin.' }));
  const add = (...e) => Pn.append(...e);
  const tp = textPath(p, k);
  const aiBtn = (key, label) => { const b = el('button', { type: 'button', className: 'btn aibtn', innerHTML: `<span class="spark" aria-hidden="true">✦</span>${esc(label)}` });
    b.onclick = () => openRegen(key); return b; };
  if (canRegen(p, k)) add(aiBtn(k, k === 'bg' ? 'Görseli AI ile yeniden üret' : 'AI ile yeniden üret'));
  switch (k.startsWith('t:') ? 'text' : k.startsWith('o:') ? 'obj' : k) {
    case 'obj': objProps(k, o, tp, add); break;
    case 'bg':
      add(segF('Arka plan türü', 'bg.mode', [['photo', 'Fotoğraf'], ['solid', 'Düz renk']]));
      if (p.bg.mode === 'photo') {
        add(libF(p.bg.photo, src => { post().bg.photo = src; commit(true); renderProps(); }));
        add(group('Konum ve ışık', rangeF('Yatay odak', 'bg.x', 0, 100, 1, '%'), rangeF('Dikey odak', 'bg.y', 0, 100, 1, '%'),
            rangeF('Yakınlaştırma', 'bg.zoom', 100, 200, 1, '%'), rangeF('Karartma', 'bg.shade', 0, 100, 1, '%'),
            segF('Karartma yönü', 'bg.shadeDir', [['left', 'Soldan'], ['bottom', 'Alttan'], ['full', 'Tümü']], renderProps),
            segF('Geçiş', 'bg.edge', [['soft', 'Yumuşak'], ['hard', 'Keskin panel']], renderProps),
            ...(p.bg.edge === 'hard' && p.bg.shadeDir !== 'full' ? [rangeF('Panel boyu', { get: () => post().bg.cut?.[fmt] ?? (post().bg.shadeDir === 'bottom' ? 50 : 58),
              set: v => { (post().bg.cut ||= {})[fmt] = v; } }, 20, 90, 1, '%')] : []), colorF('Karartma rengi', 'bg.shadeColor')));
      } else add(group('Renkler', colorF('Işık rengi', 'bg.g1'), colorF('Orta renk', 'bg.g2'), colorF('Kenar rengi', 'bg.shadeColor')));
      add(captionF(), aiBtn('caption', 'Açıklamayı AI ile yeniden üret'));
      add(group('Çerçeve', checkF('Çerçeveyi göster', 'frame.on', renderProps),
        ...(p.frame.on ? [colorF('Çerçeve rengi', 'frame.color'), rangeF('Görünürlük', 'frame.opacity', 0, 100, 1, '%')] : [])));
      break;
    case 'brand': add(textF('Metin', 'brand.text'), fontF('Yazı tipi', 'brand.font'), checkF('Logoyu göster', 'brand.logo'), rangeF('Boyut', 'brand.size', 14, 120, 1, ' px'), colorF('Renk', 'brand.color')); break;
    case 'tag': add(textF('Metin', 'tag.text'), fontF('Yazı tipi', 'tag.font'), checkF('Çerçeveli', 'tag.pill'), rangeF('Boyut', 'tag.size', 12, 60, 1, ' px'), colorF('Renk', 'tag.color')); break;
    case 'headline':
      add(textF('Metin', 'headline.text', { area: true, rows: 3 }),
          group('Görünüm', fontF('Yazı tipi', 'headline.font'), rangeF('Boyut', 'headline.size', 32, 200, 1, ' px'), rangeF('Satır aralığı', PD('headline.lh', 1.02), .7, 2, .02), rangeF('Kutu genişliği', LB(k, 'w'), 200, 1000, 10, ' px'),
          segF('Hizalama', 'headline.align', [['left', 'Sola'], ['center', 'Ortaya'], ['right', 'Sağa']]),
          colorF('Renk', 'headline.color'), colorF('Vurgu rengi', 'headline.accent'))); break;
    case 'line': add(rangeF('Uzunluk', LB(k, 'w'), 20, 1000, 2, ' px'), colorF('Renk', 'line.color')); break;
    case 'sub':
      add(textF('Metin', 'sub.text', { area: true, rows: 4 }),
          group('Görünüm', fontF('Yazı tipi', 'sub.font'), rangeF('Boyut', 'sub.size', 14, 80, 1, ' px'), rangeF('Satır aralığı', PD('sub.lh', 1.42), .8, 2.4, .02), rangeF('Kutu genişliği', LB(k, 'w'), 200, 1000, 10, ' px'),
          segF('Hizalama', 'sub.align', [['left', 'Sola'], ['center', 'Ortaya'], ['right', 'Sağa']]),
          colorF('Renk', 'sub.color'), colorF('Kalın yazı rengi', 'sub.strong'))); break;
    case 'text':
      add(textF('Metin', `${tp}.text`, { area: true, rows: 3, tip: '*Yıldız* içindeki kısım vurgu renginde görünür.' }),
          group('Görünüm', fontF('Yazı tipi', `${tp}.font`), rangeF('Boyut', `${tp}.size`, 12, 220, 1, ' px'), rangeF('Satır aralığı', PD(`${tp}.lh`, 1.08), .7, 2.4, .02), rangeF('Kutu genişliği', LB(k, 'w'), 80, 1000, 10, ' px'),
          segF('Kalınlık', `${tp}.weight`, [[500, 'Normal'], [700, 'Kalın'], [800, 'Çok kalın']]),
          segF('Hizalama', `${tp}.align`, [['left', 'Sola'], ['center', 'Ortaya'], ['right', 'Sağa']]),
          colorF('Renk', `${tp}.color`), colorF('Vurgu rengi', `${tp}.accent`))); break;
    case 'list': {
      const t = el('textarea', { rows: 4, value: p.list.items.join('\n') });
      t.oninput = () => { post().list.items = t.value.split('\n').filter(x => x.trim()); commit(); };
      add(field('Maddeler', t, 'Her satır bir madde.'), rangeF('Ölçek', 'list.k', .5, 2, .05, ' x'), colorF('Yazı rengi', 'list.color'), colorF('İşaret rengi', 'list.dot')); break; }
    case 'strip': {
      const box = el('div', { className: 'items' });
      p.strip.items.forEach((it, i) => {
        const t = el('input', { type: 'text', value: it.t }); t.setAttribute('aria-label', `Adım ${i + 1}`);
        t.oninput = () => { post().strip.items[i].t = t.value; commit(); };
        const s = el('select'); s.setAttribute('aria-label', `Adım ${i + 1} rengi`);
        [['#140504', 'Koyu'], ['#d11414', 'Kırmızı'], ['#1f8a4c', 'Yeşil'], ['#c77d12', 'Turuncu']].forEach(([v, n]) => s.add(new Option(n, v, false, v === it.c)));
        s.onchange = () => { post().strip.items[i].c = s.value; commit(true); };
        box.append(el('div', { className: 'item' }, t, s));
      });
      add(field('Adımlar', box), rangeF('Genişlik', LB(k, 'w'), 300, 1000, 10, ' px')); break; }
    case 'grid': {
      const box = el('div', { className: 'items' });
      p.grid.items.forEach((it, i) => {
        const t = el('input', { type: 'text', value: it.label }); t.setAttribute('aria-label', `Fotoğraf ${i + 1} etiketi`);
        t.oninput = () => { post().grid.items[i].label = t.value; commit(); };
        const s = el('select'); s.setAttribute('aria-label', `Fotoğraf ${i + 1}`);
        libGroups().forEach(([cat, items]) => { const g = el('optgroup', { label: cat });
          items.forEach(ph => g.append(new Option(ph.name, ph.src, false, ph.src === it.photo))); s.append(g); });
        s.onchange = () => { post().grid.items[i].photo = s.value; commit(true); };
        box.append(el('div', { className: 'item' }, t, s));
      });
      add(field('Fotoğraflar ve etiketler', box), rangeF('Genişlik', LB(k, 'w'), 300, 1000, 10, ' px')); break; }
    case 'notif': add(textF('Üst satır', 'notif.small'), textF('Metin', 'notif.title'), rangeF('Ölçek', 'notif.k', .5, 2, .05, ' x')); break;
    case 'bubble': add(textF('Üst satır', 'bubble.meta'), textF('Mesaj', 'bubble.text'), rangeF('Ölçek', 'bubble.k', .5, 2, .05, ' x')); break;
    case 'cta':
      add(textF('Buton metni', 'cta.main'), fontF('Yazı tipi', 'cta.font'), textF('Adres', 'cta.url', { tip: 'Boş bırakırsan yalnızca buton metni görünür.' }),
          rangeF('Ölçek', 'cta.k', .5, 2, .05, ' x'), checkF('Gölge', 'cta.shadow'), colorF('Buton rengi', 'cta.bg'), colorF('Yazı rengi', 'cta.color')); break;
  }
  if (sel && sel !== 'bg' && o && kindOf(k) !== 'k') add(group('Döndürme ve saydamlık',
    rangeF('Döndür', { get: () => objOf(post(), k).rot || 0, set: v => { objOf(post(), k).rot = v; } }, -180, 180, 1, '°'),
    rangeF('Saydamlık', { get: () => objOf(post(), k).opacity ?? 100, set: v => { objOf(post(), k).opacity = v; } }, 0, 100, 1, '%')));
  if (sel && sel !== 'bg' && p.layout[fmt][k]) {
    const cx = el('button', { type: 'button', className: 'btn', textContent: 'Yatay ortala' }); cx.onclick = () => centerSel('x');
    const cy = el('button', { type: 'button', className: 'btn', textContent: 'Dikey ortala' }); cy.onclick = () => centerSel('y');
    add(group(`Konum (${FMT_NAME[fmt]})`, row(numF('X (px)', LB(k, 'x')), numF('Y (px)', LB(k, 'y'))),
      ...(kindOf(k) === 'box' ? [row(numF('Genişlik (px)', LB(k, 'w')), numF('Yükseklik (px)', LB(k, 'h')))] : []), row(cx, cy),
      boolF('Kilitle (sahnede taşınmasın)', () => !!post().locks?.[k], () => toggleLock(k))));
  }
  if (sel && hideable(k)) {
    const b = el('button', { type: 'button', className: 'btn addbtn', textContent: isFree(k) ? `${nameOf(k)} öğesini sil` : isOn(p, k) ? `${nameOf(k)} öğesini gizle` : `${nameOf(k)} öğesini göster` });
    b.onclick = () => isFree(k) ? removeText(k) : toggle(k, !isOn(p, k)); add(b);
  }
  if (STYLE_KEYS[k]) { const b = el('button', { type: 'button', className: 'btn addbtn', textContent: sel ? 'Bu stili tüm postlara uygula' : 'Arka plan stilini tüm postlara uygula' });
    b.onclick = () => applyAll(k); add(el('div', { className: 'apply' }, b)); }
}

/* ---------- üst araç çubuğu (seçili öğe) ---------- */
const TB_ICON = {
  minus: '<path d="M5 12h14"/>', plus: '<path d="M12 5v14M5 12h14"/>',
  left: '<path d="M4 6h16M4 12h10M4 18h13"/>', center: '<path d="M4 6h16M7 12h10M5.5 18h13"/>', right: '<path d="M4 6h16M10 12h10M7 18h13"/>',
  front: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V5a1 1 0 0 1 1-1h11"/>', back: '<rect x="4" y="4" width="12" height="12" rx="2"/><path d="M20 8v11a1 1 0 0 1-1 1H8"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  aleft: '<path d="M4 4v16"/><rect x="8" y="6" width="12" height="4" rx="1"/><rect x="8" y="14" width="7" height="4" rx="1"/>',
  ahc: '<path d="M12 3v18"/><rect x="5" y="6" width="14" height="4" rx="1"/><rect x="8" y="14" width="8" height="4" rx="1"/>',
  aright: '<path d="M20 4v16"/><rect x="4" y="6" width="12" height="4" rx="1"/><rect x="9" y="14" width="7" height="4" rx="1"/>',
  atop: '<path d="M4 4h16"/><rect x="6" y="8" width="4" height="12" rx="1"/><rect x="14" y="8" width="4" height="7" rx="1"/>',
  avc: '<path d="M3 12h18"/><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="8" width="4" height="8" rx="1"/>',
  abottom: '<path d="M4 20h16"/><rect x="6" y="4" width="4" height="12" rx="1"/><rect x="14" y="9" width="4" height="7" rx="1"/>',
  dx: '<path d="M4 4v16M20 4v16"/><rect x="9" y="8" width="6" height="8" rx="1"/>', dy: '<path d="M4 4h16M4 20h16"/><rect x="8" y="9" width="8" height="6" rx="1"/>',
  group: '<rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="3 3"/><rect x="7" y="7" width="6" height="6" rx="1"/><rect x="11" y="11" width="6" height="6" rx="1"/>',
  ungroup: '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>', unlock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', bold: '<path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z"/>',
};
const tbSvg = ic => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${TB_ICON[ic]}</svg>`;
const tbBtn = (ic, label, fn, pressed) => { const b = el('button', { type: 'button', className: 'tb', innerHTML: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${TB_ICON[ic]}</svg>` });
  b.setAttribute('aria-label', label); b.title = label; if (pressed != null) b.setAttribute('aria-pressed', pressed); b.onclick = fn; return b; };
function renderToolbar() {
  const T = $('#toolbar'); T.innerHTML = '';
  if (multi.length > 1) return renderMultiToolbar(T);
  const p = post(), k = sel;
  if (!sel || (sel === 'bg' && !canRegen(p, 'bg'))) { T.hidden = true; return; }
  T.hidden = false;
  T.append(el('strong', { textContent: nameOf(k) }), el('span', { className: 'sep' }));
  if (canRegen(p, k)) {
    const b = el('button', { type: 'button', className: 'tb tbai', innerHTML: '<span class="spark" aria-hidden="true">✦</span>AI ile yeniden üret' });
    b.title = `${regenName(k)} için AI ile yeni öneri üret`; b.onclick = () => openRegen(k); T.append(b);
    if (k !== 'bg') T.append(el('span', { className: 'sep' }));
  }
  if (k === 'bg') return;
  const o = objOf(p, k), kk = kindOf(k), tp = textPath(p, k);
  // boyut
  const sizeOf = () => kk === 'font' ? o.size : kk === 'k' ? Math.round((o.k || 1) * 100) : p.layout[fmt][k].w;
  const setSize = v => { if (kk === 'font') o.size = clamp(Math.round(v), 10, 240); else if (kk === 'k') o.k = clamp(v / 100, .3, 3); else { const L = p.layout[fmt][k], nw = clamp(Math.round(v), 20, SIZE[fmt][0] * 2); if (kk === 'box' && L.w && L.h) L.h = Math.max(4, Math.round(L.h * nw / L.w)); L.w = nw; } };
  const step = kk === 'font' ? 2 : kk === 'k' ? 5 : 20;
  const num = el('input', { type: 'number', className: 'tbnum', value: sizeOf() });
  num.setAttribute('aria-label', kk === 'font' ? 'Yazı boyutu' : kk === 'k' ? 'Ölçek yüzdesi' : 'Genişlik');
  num.onchange = () => { setSize(+num.value); commit(true); renderProps(); };
  T.append(tbBtn('minus', 'Küçült', () => { setSize(sizeOf() - step); commit(true); renderProps(); }), num,
           tbBtn('plus', 'Büyüt', () => { setSize(sizeOf() + step); commit(true); renderProps(); }));
  // renk
  const colorPath = { cta: 'cta.bg', line: 'line.color', list: 'list.dot' }[k] || (kk === 'font' ? `${tp}.color`
    : kk === 'box' ? (o.type === 'icon' ? `${tp}.color` : o.type === 'shape' && o.fill !== 'none' ? `${tp}.fill` : null) : null);
  if (colorPath) { const c = el('input', { type: 'color', className: 'tbcolor', value: get(p, colorPath) }); c.setAttribute('aria-label', 'Renk'); c.title = 'Renk';
    c.oninput = () => { set(post(), colorPath, c.value); commit(); }; c.onchange = () => renderProps(); T.append(el('span', { className: 'sep' }), c); }
  // kalınlık ve hizalama
  if (k.startsWith('t:')) T.append(tbBtn('bold', 'Kalın', () => { o.weight = o.weight >= 700 ? 500 : 800; commit(true); renderProps(); }, o.weight >= 700));
  if (TEXTUAL(k)) { T.append(el('span', { className: 'sep' }));
    [['left', 'Sola hizala'], ['center', 'Ortaya hizala'], ['right', 'Sağa hizala']].forEach(([a, n]) =>
      T.append(tbBtn(a, n, () => { o.align = a; commit(true); renderProps(); }, o.align === a))); }
  T.append(el('span', { className: 'sep' }),
    tbBtn('front', 'Öne getir', () => reorder(k, 'front')), tbBtn('back', 'Arkaya gönder', () => reorder(k, 'back')));
  if ((kk === 'font' && k !== 'brand') || kk === 'box') T.append(tbBtn('copy', 'Çoğalt (Ctrl+D)', () => duplicateFree(k)));
  T.append(tbBtn(p.locks?.[k] ? 'lock' : 'unlock', p.locks?.[k] ? 'Kilidi aç' : 'Kilitle', () => toggleLock(k), !!p.locks?.[k]));
  if (hideable(k)) T.append(tbBtn('trash', isFree(k) ? 'Sil' : 'Gizle', removeSel));
}

/* ---------- panel ve seçim ---------- */
function setTab(t) { tab = t;
  document.querySelectorAll('.side [role=tab]').forEach(b => { const on = b.dataset.tab === t;
    b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; $('#' + b.getAttribute('aria-controls')).hidden = !on; });
  document.dispatchEvent(new CustomEvent('editor:tab', { detail: t })); }
function renderPanel() { renderLayers(); renderProps(); renderToolbar(); sayHere(); }
function select(k, focus) {
  sel = k; multi = []; renderPanel(); placeSel(); setTab('edit');
  if (focus) { const f = $('#props textarea, #props input[type=text]'); if (f) { f.focus(); f.select?.(); } }
}
function deselect() { sel = null; multi = []; renderPanel(); placeSel(); }

/* ---------- çoklu seçim, gruplama, hizalama, kilit ---------- */
const groupKeys = (p, g) => p.order.filter(x => p.groups?.[x] === g && present(p, x) && isOn(p, x));
function setMulti(keys, primary) { multi = keys.length > 1 ? [...keys] : []; sel = primary || keys[0] || null; renderPanel(); placeSel(); setTab('edit'); }
function toggleMulti(k) {
  const p = post(), cur = multi.length ? [...multi] : sel && sel !== 'bg' ? [sel] : [];
  const g = p.groups?.[k], add = g ? groupKeys(p, g) : [k];
  const next = add.every(x => cur.includes(x)) ? cur.filter(x => !add.includes(x)) : [...cur, ...add.filter(x => !cur.includes(x))];
  if (next.length > 1) setMulti(next, k); else if (next.length === 1) select(next[0]); else deselect();
}
// öğelerin sahnedeki kutuları, postun kendi pikselleriyle (döndürülmüşse çevreleyen kutu)
function boxesOf(keys) { const cr = canvas.getBoundingClientRect();
  return keys.map(k => { const n = canvas.querySelector(sel$(k)); if (!n) return null; const r = n.getBoundingClientRect();
    return { k, x: (r.left - cr.left) / scale, y: (r.top - cr.top) / scale, w: r.width / scale, h: r.height / scale }; }).filter(Boolean); }
// tek öğe sayfaya, birden çok öğe seçimin sınırlarına göre hizalanır
function alignMulti(how) {
  const p = post(), keys = (multi.length > 1 ? multi : [sel]).filter(k => k && k !== 'bg' && !p.locks?.[k] && p.layout[fmt][k]);
  const bs = boxesOf(keys); if (!bs.length) return;
  const [W, H] = SIZE[fmt], U = bs.length === 1 ? { x: 0, y: 0, r: W, b: H }
    : { x: Math.min(...bs.map(b => b.x)), y: Math.min(...bs.map(b => b.y)), r: Math.max(...bs.map(b => b.x + b.w)), b: Math.max(...bs.map(b => b.y + b.h)) };
  bs.forEach(b => { const L = p.layout[fmt][b.k]; let dx = 0, dy = 0;
    if (how === 'left') dx = U.x - b.x; if (how === 'right') dx = U.r - (b.x + b.w); if (how === 'hcenter') dx = (U.x + U.r) / 2 - (b.x + b.w / 2);
    if (how === 'top') dy = U.y - b.y; if (how === 'bottom') dy = U.b - (b.y + b.h); if (how === 'vcenter') dy = (U.y + U.b) / 2 - (b.y + b.h / 2);
    L.x = Math.round(L.x + dx); L.y = Math.round(L.y + dy); });
  commit(true); renderProps(); placeSel();
}
function distribute(axis) {
  const p = post(), bs = boxesOf(multi.filter(k => !p.locks?.[k] && p.layout[fmt][k])); if (bs.length < 3) return;
  const X = axis === 'x', s = [...bs].sort((a, b) => X ? a.x - b.x : a.y - b.y), first = s[0], last = s[s.length - 1];
  const total = s.reduce((t, b) => t + (X ? b.w : b.h), 0), span = X ? last.x + last.w - first.x : last.y + last.h - first.y, gap = (span - total) / (s.length - 1);
  let cur = X ? first.x : first.y;
  s.forEach(b => { const L = p.layout[fmt][b.k], d = cur - (X ? b.x : b.y); if (X) L.x = Math.round(L.x + d); else L.y = Math.round(L.y + d); cur += (X ? b.w : b.h) + gap; });
  commit(true); placeSel();
}
function groupSel() { if (multi.length < 2) return; const p = post(), g = 'g' + nid().slice(1); p.groups ||= {}; multi.forEach(k => { p.groups[k] = g; });
  commit(true); renderPanel(); placeSel(); toast(`${multi.length} öğe gruplandı`); }
function ungroupSel() { const p = post(), keys = multi.length > 1 ? multi : sel ? [sel] : []; let n = 0;
  keys.forEach(k => { if (p.groups?.[k]) { delete p.groups[k]; n++; } }); if (!n) return; commit(true); renderPanel(); placeSel(); toast('Grup çözüldü'); }
function toggleLock(k) { const p = post(); p.locks ||= {}; if (p.locks[k]) delete p.locks[k]; else p.locks[k] = true;
  commit(true); renderPanel(); placeSel(); toast(p.locks[k] ? `${nameOf(k)} kilitlendi` : `${nameOf(k)} kilidi açıldı`); }
function placeMulti() {
  const s = $('#sel'), br = $('#board').getBoundingClientRect();
  const rs = multi.map(k => $('#canvas').querySelector(sel$(k))).filter(Boolean).map(n => n.getBoundingClientRect());
  if (!rs.length) { s.classList.remove('on'); return renderToolbar(); }
  const l = Math.min(...rs.map(r => r.left)), t = Math.min(...rs.map(r => r.top)), r = Math.max(...rs.map(r => r.right)), b = Math.max(...rs.map(r => r.bottom));
  Object.assign(s.style, { left: l - br.left + 'px', top: t - br.top + 'px', width: r - l + 'px', height: b - t + 'px' });
  s.classList.add('on', 'multisel'); s.classList.remove('haswidth', 'hasheight', 'bgsel', 'locked');
  const g = post().groups?.[multi[0]];
  s.querySelector('b').textContent = g && multi.every(k => post().groups?.[k] === g) ? `Grup · ${multi.length} öğe` : `${multi.length} öğe`;
  renderToolbar();
}
const ALIGN = [['left', 'Sola hizala', 'aleft'], ['hcenter', 'Yatayda ortala', 'ahc'], ['right', 'Sağa hizala', 'aright'],
  ['top', 'Üste hizala', 'atop'], ['vcenter', 'Dikeyde ortala', 'avc'], ['bottom', 'Alta hizala', 'abottom']];
const isGrouped = () => { const g = post().groups?.[multi[0]]; return !!g && multi.every(k => post().groups?.[k] === g); };
function renderMultiToolbar(T) {
  T.hidden = false;
  T.append(el('strong', { textContent: `${multi.length} öğe` }), el('span', { className: 'sep' }));
  ALIGN.forEach(([h, n, ic]) => T.append(tbBtn(ic, n, () => alignMulti(h))));
  if (multi.length > 2) T.append(el('span', { className: 'sep' }), tbBtn('dx', 'Yatayda eşit dağıt', () => distribute('x')), tbBtn('dy', 'Dikeyde eşit dağıt', () => distribute('y')));
  T.append(el('span', { className: 'sep' }), isGrouped() ? tbBtn('ungroup', 'Grubu çöz (Ctrl+Shift+G)', ungroupSel) : tbBtn('group', 'Grupla (Ctrl+G)', groupSel),
    tbBtn('trash', 'Seçilenleri sil', removeSel));
}
function renderMultiProps(Pn) {
  Pn.append(el('h3', { textContent: isGrouped() ? 'Grup' : `${multi.length} öğe seçili` }),
    el('p', { className: 'desc', textContent: 'Birlikte sürükleyip taşıyabilirsin. Shift ile tıklayarak seçime öğe ekleyip çıkarabilirsin.' }));
  const al = el('div', { className: 'alignrow' }); ALIGN.forEach(([h, n, ic]) => al.append(tbBtn(ic, n, () => alignMulti(h))));
  Pn.append(group('Hizala', al));
  if (multi.length > 2) Pn.append(group('Eşit aralıkla dağıt', el('div', { className: 'alignrow' }, tbBtn('dx', 'Yatayda eşit dağıt', () => distribute('x')), tbBtn('dy', 'Dikeyde eşit dağıt', () => distribute('y')))));
  const gb = el('button', { type: 'button', className: 'btn addbtn', textContent: isGrouped() ? 'Grubu çöz' : 'Grupla' }); gb.onclick = isGrouped() ? ungroupSel : groupSel;
  const db = el('button', { type: 'button', className: 'btn addbtn', textContent: 'Seçilenleri sil' }); db.onclick = removeSel;
  Pn.append(gb, db);
}

/* ---------- çizim akışı ---------- */
function render() { renderCanvas(); renderLayers(); refreshThumb(); renderToolbar(); }
function renderAll() {
  document.querySelectorAll('.bar .seg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.fmt === fmt));
  renderCanvas(); renderList(); renderPanel();
  document.dispatchEvent(new CustomEvent('editor:render'));
}

/* ---------- sahne etkileşimi: taşıma, boyutlandırma, hizalama kılavuzları ---------- */
const canvas = $('#canvas');
let drag = null, editing = null;
const SNAP = 8;
function snapTargets(k) {
  const [W, H] = SIZE[fmt], pad = PAD[fmt], cr = canvas.getBoundingClientRect(), skip = new Set([].concat(k));
  const xs = [MARGIN, W / 2, W - MARGIN], ys = [pad.t, H / 2, H - pad.b];
  canvas.querySelectorAll('[data-el]').forEach(n => { if (skip.has(n.dataset.el) || n.dataset.el === 'bg') return;
    const r = n.getBoundingClientRect(); const x = (r.left - cr.left) / scale, y = (r.top - cr.top) / scale, w = r.width / scale, h = r.height / scale;
    xs.push(x, x + w / 2, x + w); ys.push(y, y + h / 2, y + h); });
  return { xs, ys };
}
function snap(v, size, targets) { // v: sol/üst kenar; kenar, orta veya karşı kenar hedefe yakınsa yapıştır
  let best = null;
  [0, size / 2, size].forEach(off => targets.forEach(t => { const d = t - (v + off); if (Math.abs(d) <= SNAP / Math.max(scale, .4) && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, t }; }));
  return best;
}
function showGuides(gx, gy) {
  const G = $('#guides'), cr = canvas.getBoundingClientRect(), br = $('#board').getBoundingClientRect(); G.innerHTML = '';
  const [W, H] = SIZE[fmt];
  if (gx != null) G.append(el('i', { className: 'gv', style: `left:${cr.left - br.left + gx * scale}px;top:${cr.top - br.top}px;height:${H * scale}px` }));
  if (gy != null) G.append(el('i', { className: 'gh', style: `top:${cr.top - br.top + gy * scale}px;left:${cr.left - br.left}px;width:${W * scale}px` }));
}
canvas.addEventListener('pointerdown', e => {
  if (editing || e.button !== 0) return;
  const node = e.target.closest('[data-el]'); if (!node) return;
  const k = node.dataset.el, p = post();
  if (e.shiftKey && k !== 'bg') { toggleMulti(k); return; }
  // gruptaki bir öğeye tıklamak bütün grubu seçer; çoklu seçimin içine tıklamak seçimi bozmaz
  const g = k !== 'bg' && p.groups?.[k];
  if (g) { const ms = groupKeys(p, g); if (!(multi.length > 1 && ms.every(x => multi.includes(x)))) setMulti(ms, k); }
  else if (!(multi.length > 1 && multi.includes(k)) && (k !== sel || multi.length)) select(k);
  if (k === 'bg') { if (p.bg.mode === 'photo' && !p.locks?.bg) drag = { k, mode: 'pan', sx: e.clientX, sy: e.clientY, ox: p.bg.x, oy: p.bg.y }; }
  else if (multi.length > 1) {
    const keys = multi.filter(x => !p.locks?.[x] && p.layout[fmt][x]), bs = boxesOf(keys);
    if (bs.length) { const ux = Math.min(...bs.map(b => b.x)), uy = Math.min(...bs.map(b => b.y));
      drag = { k, mode: 'multi', sx: e.clientX, sy: e.clientY, keys, orig: keys.map(x => ({ ...p.layout[fmt][x] })), ux, uy,
        w: Math.max(...bs.map(b => b.x + b.w)) - ux, h: Math.max(...bs.map(b => b.y + b.h)) - uy, targets: snapTargets(multi) }; }
  }
  else if (!p.locks?.[k]) { const L = p.layout[fmt][k], r = node.getBoundingClientRect();
    drag = { k, mode: 'move', sx: e.clientX, sy: e.clientY, ox: L.x, oy: L.y, w: r.width / scale, h: r.height / scale, targets: snapTargets(k) }; }
  if (drag) drag.pid = e.pointerId;
});
function startResize(e, h) {
  e.preventDefault(); e.stopPropagation();
  const p = post(), k = sel, o = objOf(p, k), L = p.layout[fmt][k], n = canvas.querySelector(sel$(k)); if (!L || !n || p.locks?.[k]) return;
  const r = n.getBoundingClientRect();
  drag = { k, mode: 'resize', h, sx: e.clientX, sy: e.clientY, ox: L.x, ow: L.w ?? r.width / scale, rw: r.width / scale, oh: L.h,
    size: o.size, kk: o.k || 1, pid: e.pointerId, moved: false };
  $('#sel').setPointerCapture?.(e.pointerId);
}
$('#sel').addEventListener('pointerdown', e => { const h = e.target.dataset.h; if (h) startResize(e, h); });
function onMove(e) {
  if (!drag) { if (editing) return; const n = e.target.closest?.('#canvas [data-el]');
    placeBox($('#hover'), n && n.dataset.el !== sel && n.dataset.el !== 'bg' ? n : null); return; }
  const dx = (e.clientX - drag.sx) / scale, dy = (e.clientY - drag.sy) / scale;
  if (!drag.moved && Math.hypot(dx * scale, dy * scale) < 3) return;
  if (!drag.moved) { drag.moved = true; try { (drag.mode === 'resize' ? $('#sel') : canvas).setPointerCapture(drag.pid); } catch (_) {} canvas.classList.add('panning'); $('#hover').classList.remove('on'); }
  const p = post(), [W, H] = SIZE[fmt];
  if (drag.mode === 'pan') {
    p.bg.x = Math.round(clamp(drag.ox - dx / W * 100, 0, 100)); p.bg.y = Math.round(clamp(drag.oy - dy / H * 100, 0, 100));
  } else if (drag.mode === 'move') {
    let x = drag.ox + dx, y = drag.oy + dy, gx = null, gy = null;
    if (!e.altKey) { const sx = snap(x, drag.w, drag.targets.xs), sy = snap(y, drag.h, drag.targets.ys);
      if (sx) { x += sx.d; gx = sx.t; } if (sy) { y += sy.d; gy = sy.t; } }
    const L = p.layout[fmt][drag.k]; L.x = Math.round(clamp(x, -drag.w + 40, W - 40)); L.y = Math.round(clamp(y, -drag.h + 40, H - 40));
    showGuides(gx, gy);
  } else if (drag.mode === 'multi') {
    let mx = dx, my = dy, gx = null, gy = null;
    if (!e.altKey) { const sx = snap(drag.ux + dx, drag.w, drag.targets.xs), sy = snap(drag.uy + dy, drag.h, drag.targets.ys);
      if (sx) { mx += sx.d; gx = sx.t; } if (sy) { my += sy.d; gy = sy.t; } }
    drag.keys.forEach((x, i) => { const L = p.layout[fmt][x]; if (!L) return; L.x = Math.round(drag.orig[i].x + mx); L.y = Math.round(drag.orig[i].y + my); });
    showGuides(gx, gy);
  } else {
    const o = objOf(p, drag.k), L = p.layout[fmt][drag.k], kk = kindOf(drag.k);
    if (drag.h === 'e') L.w = Math.round(Math.max(40, drag.ow + dx));
    else if (drag.h === 'w') { const w = Math.max(40, drag.ow - dx); L.x = Math.round(drag.ox + (drag.ow - w)); L.w = Math.round(w); }
    else if (drag.h === 's') L.h = Math.round(Math.max(4, (drag.oh ?? 100) + dy));
    else { const f = Math.max(.2, (drag.rw + dx) / drag.rw);
      if (kk === 'font') { o.size = clamp(Math.round(drag.size * f), 10, 260); if (L.w != null) L.w = Math.round(drag.ow * f); }
      else if (kk === 'k') o.k = clamp(Math.round(drag.kk * f * 100) / 100, .3, 3);
      else { L.w = Math.round(Math.max(20, drag.ow * f)); if (kk === 'box' && drag.oh) L.h = Math.round(Math.max(4, drag.oh * f)); } }
  }
  renderCanvas(); if (drag.mode === 'multi') placeSel(); renderToolbar();
}
function endDrag() { if (!drag) return; const moved = drag.moved; drag = null; canvas.classList.remove('panning'); $('#guides').innerHTML = '';
  if (moved) { commit(true); renderProps(); }
  if (live.dirty) remoteRender(); }
document.addEventListener('pointermove', onMove);
document.addEventListener('pointerup', endDrag);
document.addEventListener('pointercancel', endDrag);
canvas.addEventListener('pointerleave', () => { if (!drag) $('#hover').classList.remove('on'); });
canvas.addEventListener('dblclick', e => {
  const t = e.target.closest('[data-path]'); if (t) return inlineEdit(t);
  const n = e.target.closest('[data-el]'); if (n) select(n.dataset.el, true);
});
// sahnede yerinde metin düzenleme; başlık/açıklama işaretleriyle (*vurgu*, **kalın**) birlikte düzenlenir
function inlineEdit(node) {
  editing = node; const path = node.dataset.path, before = get(post(), path);
  $('#hover').classList.remove('on'); $('#sel').classList.add('editing');
  if (node.dataset.raw) node.textContent = before;
  node.contentEditable = 'true'; node.spellcheck = false; node.focus();
  const r = document.createRange(); r.selectNodeContents(node); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  const finish = keep => { node.removeEventListener('blur', onBlur); node.removeEventListener('keydown', onKey);
    editing = null; $('#sel').classList.remove('editing');
    const v = node.dataset.raw ? node.innerText.replace(/\n{3,}/g, '\n\n').trim() : node.textContent.replace(/\s+/g, ' ').trim();
    if (keep && v !== before) { set(post(), path, v); commit(true); renderProps(); } else renderCanvas();
    if (live.dirty) remoteRender(); };
  const onBlur = () => finish(true);
  const onKey = ev => { ev.stopPropagation();
    if (ev.key === 'Enter' && !(node.dataset.raw && ev.shiftKey)) { ev.preventDefault(); node.blur(); }
    if (ev.key === 'Escape') { ev.preventDefault(); finish(false); } };
  node.addEventListener('blur', onBlur); node.addEventListener('keydown', onKey);
}
$('#stage').addEventListener('pointerdown', e => { if (!e.target.closest('#canvas') && !e.target.closest('#sel') && !e.target.closest('#toolbar') && sel) deselect(); });

/* ---------- üst çubuk, sekmeler, yakınlaştırma ---------- */
document.querySelectorAll('.bar .seg button').forEach(b => b.onclick = () => { if (fmt === b.dataset.fmt) return; fmt = b.dataset.fmt; zoom = null; renderAll(); });
$('#undo').onclick = undo; $('#redo').onclick = redo;
$('#addText').onclick = () => addText();
const addMenu = $('#addMenu');
$('#add').onclick = e => { e.stopPropagation(); const open = !addMenu.classList.contains('open'); closeMenus(); addMenu.classList.toggle('open', open);
  $('#add').setAttribute('aria-expanded', open); if (open) addMenu.querySelector('[data-new]').focus(); };
const pushPost = p => { state.posts.push(p); state.current = state.posts.length - 1; sel = null; commit(true); renderAll(); };
addMenu.querySelector('[data-new="blank"]').onclick = () => { closeMenus(); pushPost(blankPost()); toast('Yeni post eklendi'); select('headline', true); };
addMenu.querySelector('[data-new="ai"]').onclick = () => { closeMenus(); openAI(); };

/* ---------- AI ile post üret: her turda 3 farklı tarz; seçim ve oylar tercih profilini öğretir (sunucu.js → ai.js, tarz.js) ---------- */
// options: son turun seçenekleri (seçilene kadar pencere kapansa da saklanır); prefs: sunucudaki tercih profili ve katalog adları
const ai = { job: null, timer: null, lastCaption: '', options: null, votes: [], prefs: null, req: null, last: null };
const AI_VIEWS = ['aiSetup', 'aiRun', 'aiPick', 'aiDone'];
function aiView(view) {
  AI_VIEWS.forEach(id => { $('#' + id).hidden = id !== view; });
  $('#aiDlg').classList.toggle('wide', view === 'aiPick'); $('#aiDlg').classList.toggle('mid', view === 'aiDone');
  $('#aiGo').hidden = view === 'aiRun' || view === 'aiPick'; $('#aiCopy').hidden = view !== 'aiDone';
  $('#aiNone').hidden = view !== 'aiPick'; $('#aiImg').hidden = view !== 'aiDone' || !ai.last;
  $('#aiGo').lastChild.textContent = view === 'aiDone' ? 'Yeni tur' : '3 tarz üret';
  $('#aiCancel').textContent = { aiRun: 'Üretimi durdur', aiPick: 'Ayarlara dön', aiDone: 'Kapat' }[view] || 'Vazgeç';
  if (view === 'aiPick') aiScale();
}
// önizlemeler kart genişliğine göre ölçeklenir (pencere görünür olmalı)
const aiScale = () => document.querySelectorAll('#aiOpts .aiprev').forEach(b => { const w = b.clientWidth;
  if (w) b.firstElementChild.style.transform = `scale(${w / SIZE.feed[0]})`; });
addEventListener('resize', aiScale);
function aiError(msg) { $('#aiErr').textContent = msg || ''; $('#aiErr').hidden = !msg; }
function openAI() {
  const d = $('#aiDlg'); aiError('');
  if (ai.job) aiView('aiRun'); else if (ai.options) aiView('aiPick'); else { aiView('aiSetup'); aiPrefsLoad(); }
  if (!d.open) d.showModal();
  if (!ai.job && !ai.options) $('#aiSector').focus();
  else if (ai.options) { aiScale(); $('#aiOpts .pickbtn')?.focus(); }
}
const aiJSON = async (url, opts) => {
  let r; try { r = await fetch(url, opts); } catch (_) { throw new Error('Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(r.status === 401 ? 'Oturumun kapanmış. Sayfayı yenileyip yeniden giriş yap.' : j.error || 'İstek başarısız oldu.');
  return j;
};
async function aiStart() {
  aiError('');
  ai.req = { sector: $('#aiSector').value, topic: $('#aiTopic').value.trim(),
    existing: state.posts.map(p => p.headline?.text).filter(Boolean), images: $('#aiImages').checked,
    library: LIB_CATS.flatMap(([cat, items]) => items.map(({ src, name }) => ({ src, name, cat }))) };
  let j;
  try { j = await aiJSON('/api/post-editoru/ai/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ai.req) }); }
  catch (e) { aiView('aiSetup'); return aiError(e.message.replace('İstek başarısız oldu.', 'Üretim başlatılamadı.')); }
  ai.job = j.id; ai.options = null; $('#aiStage').textContent = ai.req.images ? '3 farklı tarz yazılıyor, sonra görseller üretilecek' : '3 farklı tarz yazılıyor'; $('#aiTime').textContent = '0 sn';
  aiView('aiRun'); aiPoll();
}
async function aiPoll() {
  clearTimeout(ai.timer);
  const id = ai.job; if (!id) return;
  let s; try { s = await (await fetch('/api/post-editoru/ai/jobs/' + id)).json(); } catch (_) { ai.timer = setTimeout(aiPoll, 4000); return; }
  if (ai.job !== id) return;
  if (s.status === 'running') {
    $('#aiStage').textContent = s.stage; $('#aiTime').textContent = fmtTime(s.elapsed);
    ai.timer = setTimeout(aiPoll, 2000); return;
  }
  ai.job = null;
  if (s.status === 'done') {
    ai.options = s.result.options; ai.votes = ai.options.map(() => ({ rating: 0, note: '' }));
    aiRenderOptions();
    if ($('#aiDlg').open) { aiView('aiPick'); $('#aiOpts .pickbtn')?.focus(); }
    else toast(`${ai.options.length} tarz hazır, birini seç`, { label: 'Göster', fn: openAI });
    return;
  }
  if (s.status === 'cancelled') return;
  aiView('aiSetup'); aiError(s.error || 'Üretim başarısız oldu.');
  if (!$('#aiDlg').open) toast('AI postu üretilemedi', { label: 'Ayrıntı', fn: openAI });
}

// seçeneği editör postuna çevirir: renk teması + düzen + metinler (önizleme ve seçim aynı nesneyi kullanır)
function aiPost(o) {
  const extra = { list: { list: { on: true, items: (o.list || []).slice(0, 4) } },
    notif: { notif: { on: true, ...(o.notif || {}) } }, bubble: { bubble: { on: true, ...(o.bubble || {}) } },
    strip: { strip: { on: true, items: (o.strip || []).slice(0, 6) } } }[o.extra] || {};
  const spec = merge(merge(clone(THEMES[o.style.palette] || {}), clone(LAYOUTS[o.style.layout] || {})),
    { bg: { photo: o.photo, x: o.focus_x, edge: 'hard', shade: 100 }, frame: { on: false }, tag: { text: o.tag || '', pill: false }, line: { on: false }, headline: { text: o.headline }, sub: { text: o.sub || '' },
      cta: { main: o.cta || TEMPLATE.cta.main, shadow: false }, ...extra });
  return Object.assign(make(spec), { caption: o.caption || '', ai: true, style: clone(o.style) });
}
const THUMB = { up: '<path d="M7 10v11H4V10zM7 10l4-8a2.5 2.5 0 0 1 2.5 2.5V8h5.3a2 2 0 0 1 2 2.3l-1.3 8.5a2 2 0 0 1-2 1.7H7"/>',
  down: '<path d="M17 14V3h3v11zM17 14l-4 8a2.5 2.5 0 0 1-2.5-2.5V16H5.2a2 2 0 0 1-2-2.3l1.3-8.5a2 2 0 0 1 2-1.7H17"/>' };
const thumbSvg = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true">${THUMB[k]}</svg>`;
function aiRenderOptions() {
  const box = $('#aiOpts'); box.innerHTML = '';
  ai.options.forEach((o, i) => {
    const n = i + 1, p = aiPost(o), v = ai.votes[i];
    ensureLayout(p, 'feed');
    const card = el('article', { className: 'aiopt' }); card.setAttribute('aria-labelledby', `aiOpt${n}`);
    card.innerHTML = `<div class="aiprev" aria-hidden="true"><div>${postHTML(p, 'feed')}</div></div>
      <h3 id="aiOpt${n}">Seçenek ${n}${o.role === 'kesif' ? '<span class="role">Keşif</span>' : '<span class="role fit">Zevkine yakın</span>'}</h3>
      ${o.why ? `<p class="why">${esc(o.why)}</p>` : ''}
      <ul class="chips" aria-label="Seçenek ${n} tarzı"><li>${esc(o.labels.voice)}</li><li>${esc(o.labels.palette)}</li><li>${esc(o.labels.layout)}</li>
        <li class="vis" title="Görsel Gemini ile üretildiyse ya da üretilirse bu stil uygulanır">Görsel: ${esc(o.labels.visual)}</li></ul>`;
    const rate = el('div', { className: 'rate' }); rate.setAttribute('role', 'group'); rate.setAttribute('aria-label', `Seçenek ${n} için oyun`);
    [[1, 'up', 'Beğendim'], [-1, 'down', 'Beğenmedim']].forEach(([val, ic, label]) => {
      const b = el('button', { type: 'button', className: 'vote ' + ic, innerHTML: `${thumbSvg(ic)}<span>${label}</span>` });
      b.setAttribute('aria-pressed', v.rating === val);
      b.onclick = () => { v.rating = v.rating === val ? 0 : val; rate.querySelectorAll('.vote').forEach(x => x.setAttribute('aria-pressed', false));
        b.setAttribute('aria-pressed', v.rating === val); };
      rate.append(b);
    });
    const note = el('input', { type: 'text', className: 'note', maxLength: 200, value: v.note, placeholder: 'Not: ör. renk güzel, başlık uzun' });
    note.setAttribute('aria-label', `Seçenek ${n} için not`); note.oninput = () => { v.note = note.value; };
    const pick = el('button', { type: 'button', className: 'btn primary pickbtn', textContent: 'Bunu seç' });
    pick.setAttribute('aria-label', `Seçenek ${n}: bunu seç`); pick.onclick = () => aiChoose(i);
    card.append(rate, note, pick); box.append(card);
  });
}
// turun geri bildirimini sunucuya yazar; chosen: seçilen seçeneğin sırası (hiçbiri için -1)
async function aiFeedback(chosen) {
  const body = { options: ai.options.map((o, i) => ({ style: o.style, chosen: i === chosen, rating: ai.votes[i].rating, note: ai.votes[i].note.trim() })) };
  try { ai.prefs = await aiJSON('/api/post-editoru/ai/prefs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return true; }
  catch (_) { toast('Tercihin kaydedilemedi; post yine de eklendi'); return false; }
}
function aiChoose(i) {
  const o = ai.options[i], p = Object.assign(aiPost(o), { id: nid() });
  aiFeedback(i);
  ai.options = null; ai.last = { id: p.id, labels: o.labels };
  pushPost(p);
  ai.lastCaption = p.caption; $('#aiCaption').value = p.caption; capReport($('#aiCapChk'), p.caption);
  $('#aiDoneMsg').textContent = 'Post listeye eklendi; tercihin kaydedildi.';
  $('#aiStyleMsg').textContent = p.bg.photo.startsWith('img/') ? `Görsel şu an kütüphaneden. Bu tarzın görsel stili: ${o.labels.visual}. Gemini ile bu stilde üretmek için "Görseli bu tarzda üret"e bas.`
    : `Görsel Gemini ile bu tarzın stilinde (${o.labels.visual}) üretildi. Beğenmezsen "Görseli bu tarzda üret" ile yenisini iste.`;
  aiView('aiDone'); $('#aiImg').focus();
}
async function aiNone() {
  await aiFeedback(-1);
  ai.options = null; toast('Not edildi; yeni 3 tarz hazırlanıyor');
  if (!ai.req) return aiView('aiSetup');
  $('#aiSector').value = ai.req.sector; $('#aiTopic').value = ai.req.topic; aiStart();
}

// tercih profili: kurulum ekranında sevilen/sevilmeyen tarzlar ve son notlar
async function aiPrefsLoad() {
  try { ai.prefs = await aiJSON('/api/post-editoru/ai/prefs'); } catch (_) { ai.prefs = null; }
  aiPrefsRender();
}
function aiPrefsRender() {
  const box = $('#aiPrefs'), pr = ai.prefs; box.innerHTML = '';
  if (!pr) { box.hidden = true; return; }
  box.hidden = false;
  box.append(el('h3', { textContent: pr.rounds ? `Öğrenilen zevkin · ${pr.rounds} tur` : 'Zevkini öğreniyor' }));
  if (!pr.rounds) {
    box.append(el('p', { className: 'tip', textContent: 'Henüz tercih yok. İlk turda 3 seçenek metin, renk ve düzen olarak birbirinden tamamen farklı olur; seçtikçe ve oyladıkça zevkini öğrenir.' }));
    return;
  }
  const chips = (title, items, cls) => { if (!items.length) return;
    const d = el('div', { className: 'prow' }); d.append(el('span', { textContent: title }));
    const ul = el('ul', { className: 'chips ' + cls }); items.forEach(v => ul.append(el('li', { textContent: v.name, title: `${v.label} · puan ${v.score}` })));
    d.append(ul); box.append(d); };
  chips('Sevdiklerin', pr.liked, 'good'); chips('Sevmediklerin', pr.disliked, 'bad');
  if (!pr.liked.length && !pr.disliked.length) box.append(el('p', { className: 'tip', textContent: 'Henüz belirgin bir eğilim yok; birkaç tur daha seç ve oyla.' }));
  if (pr.notes.length) { const ul = el('ul', { className: 'pnotes' }); pr.notes.slice(0, 3).forEach(n => ul.append(el('li', { textContent: `“${n.note}”` })));
    const d = el('div', { className: 'prow' }); d.append(el('span', { textContent: 'Son notların' }), ul); box.append(d); }
  box.append(el('p', { className: 'tip', textContent: 'Her turda 2 seçenek zevkine yakın, 1 seçenek keşif olur.' }));
  const rst = el('button', { type: 'button', className: 'btn small', textContent: 'Tercihleri sıfırla' });
  rst.onclick = async () => {
    if (!rst.dataset.sure) { rst.dataset.sure = 1; rst.textContent = 'Emin misin? Tümünü sil'; return; }
    try { ai.prefs = await aiJSON('/api/post-editoru/ai/prefs', { method: 'DELETE' }); toast('Tercihler sıfırlandı'); } catch (e) { toast(e.message); }
    aiPrefsRender(); $('#aiSector').focus();
  };
  box.append(rst);
}

$('#aiClose').onclick = () => $('#aiDlg').close();
$('#aiCancel').onclick = async () => {
  if (ai.job) { const id = ai.job; ai.job = null; clearTimeout(ai.timer); fetch('/api/post-editoru/ai/jobs/' + id, { method: 'DELETE' }).catch(() => {});
    aiView('aiSetup'); toast('Üretim durduruldu'); return; }
  if (ai.options) { ai.options = null; aiView('aiSetup'); aiPrefsLoad(); $('#aiSector').focus(); return; }
  $('#aiDlg').close();
};
$('#aiNone').onclick = aiNone;
$('#aiCopy').onclick = () => copyCaption(ai.lastCaption, $('#aiCaption'));
// seçilen tarzın görsel stilini Gemini ile uygulamak için arka plan görseli penceresine geç
$('#aiImg').onclick = () => {
  const i = state.posts.findIndex(p => p.id === ai.last?.id); if (i < 0) return;
  $('#aiDlg').close(); state.current = i; sel = 'bg'; renderAll(); placeSel(); openRegen('bg');
};
$('#aiForm').onsubmit = e => { e.preventDefault(); if (ai.job || ai.options) return;
  if (!$('#aiDone').hidden) { aiView('aiSetup'); aiPrefsLoad(); $('#aiTopic').focus(); } else aiStart(); };
// sunucuda üretilmiş AI görsellerini kütüphanede "AI üretimleri" grubu olarak göster
async function aiLibLoad() {
  try { const r = await fetch('img/ai/index.json'); if (!r.ok) return;
    const items = (await r.json()).map(i => ({ src: i.src, name: i.name }));
    const at = LIB_CATS.findIndex(([c]) => c === 'AI üretimleri');
    if (at >= 0) LIB_CATS.splice(at, 1);
    if (items.length) LIB_CATS.unshift(['AI üretimleri', items]);
    mergeAiLib();
    if (!sel) renderProps();
  } catch (_) {}
}
aiLibLoad();
// Gemini ile üretilen görseller "AI üretimleri" grubunun başına (ekle.js de kullanıyor); tarayıcıda hatırlanır
const AI_KEY = STORE + '-ai';
function addAiImage(src, name) {
  let list = []; try { list = JSON.parse(localStorage.getItem(AI_KEY)) || []; } catch (_) {}
  list = [{ src, name }, ...list.filter(i => i.src !== src)].slice(0, 60);
  try { localStorage.setItem(AI_KEY, JSON.stringify(list)); } catch (_) {}
  mergeAiLib();
}
function mergeAiLib() {
  let list = []; try { list = JSON.parse(localStorage.getItem(AI_KEY)) || []; } catch (_) {}
  const at = LIB_CATS.findIndex(([c]) => c === 'AI üretimleri'), old = at >= 0 ? LIB_CATS[at][1] : [];
  const items = [...list, ...old.filter(o => !list.some(i => i.src === o.src))];
  if (at >= 0) LIB_CATS.splice(at, 1);
  if (items.length) LIB_CATS.unshift(['AI üretimleri', items]);
  LIB.splice(0, LIB.length, ...LIB_CATS.flatMap(([, i]) => i));
}
mergeAiLib();

/* ---------- AI ile yeniden üret: metin öğesine 3 seçenek, arka plana yeni görsel (sunucu.js → ai.js regen) ---------- */
const REGEN = ['bg', 'tag', 'headline', 'sub', 'cta', 'list', 'notif', 'bubble', 'strip', 'caption'];
const canRegen = (p, k) => k === 'bg' ? p.bg.mode === 'photo' : k.startsWith('t:') || REGEN.includes(k);
const regenName = k => k === 'caption' ? 'Instagram açıklaması' : nameOf(k);
// öğenin değeri, sunucuya gittiği ve seçeneklerin geldiği biçimde
function regenValue(p, k) {
  if (k.startsWith('t:')) return objOf(p, k).text;
  switch (k) {
    case 'bg': return p.bg.photo;
    case 'cta': return p.cta.main;
    case 'caption': return p.caption || '';
    case 'list': case 'strip': return clone(p[k].items);
    case 'notif': return { small: p.notif.small, title: p.notif.title };
    case 'bubble': return { meta: p.bubble.meta, text: p.bubble.text };
    default: return p[k].text;
  }
}
function regenSet(p, k, v) {
  if (k.startsWith('t:')) { const o = objOf(p, k); if (o) o.text = v; return; }
  switch (k) {
    case 'bg': p.bg.photo = v.photo; p.bg.x = v.focus_x; break;
    case 'cta': p.cta.main = v; break;
    case 'caption': p.caption = v; break;
    case 'list': case 'strip': p[k].items = clone(v); break;
    case 'notif': case 'bubble': Object.assign(p[k], v); break;
    default: p[k].text = v;
  }
}
// Claude'a konu bağlamı: postta görünen metinler
function regenContext(p) {
  const c = { tag: p.tag.on ? p.tag.text : '', headline: p.headline.text, sub: p.sub.on ? p.sub.text : '', cta: p.cta.on ? p.cta.main : '' };
  if (p.list.on) c.list = p.list.items;
  if (p.strip.on) c.strip = p.strip.items.map(i => i.t);
  if (p.notif.on) c.notif = { small: p.notif.small, title: p.notif.title };
  if (p.bubble.on) c.bubble = { meta: p.bubble.meta, text: p.bubble.text };
  if (p.texts.length) c.texts = p.texts.map(t => t.text);
  if (p.caption) c.caption = p.caption.slice(0, 1500);
  if (p.bg.mode === 'photo') c.photo = LIB.find(i => i.src === p.bg.photo)?.name || p.bg.photo;
  return c;
}
function optHTML(k, v) {
  if (k === 'headline' || k.startsWith('t:')) return headHTML(v, 'var(--red)');
  switch (k) {
    case 'sub': return subHTML(v, 'var(--red-press)');
    case 'list': return v.map(x => `✓ ${esc(x)}`).join('<br>');
    case 'strip': return v.map(i => `<span class="chip" style="background:${i.c}">${esc(i.t)}</span>`).join('');
    case 'notif': return `<small>${esc(v.small)}</small>${esc(v.title)}`;
    case 'bubble': return `<small>${esc(v.meta)}</small>${esc(v.text)}`;
    default: return esc(v);
  }
}

// text: açık penceredeki metin işi; img: arka planda da sürebilen görsel işi; seen: daha önce önerilenler (tekrar gelmesin)
const rg = { k: null, postId: null, text: null, img: null, imgErr: '', seen: new Map(), tick: null };
const rgShow = view => ['rgSrc', 'rgRun', 'rgPick'].forEach(id => { $('#' + id).hidden = id !== view; });
function rgError(msg) { $('#rgErr').textContent = msg || ''; $('#rgErr').hidden = !msg; }
function rgFooter(cancel, go) { $('#rgCancel').textContent = cancel; $('#rgGo').hidden = !go; if (go) $('#rgGoText').textContent = go; }
const postById = id => state.posts.find(p => p.id === id);
const seenKey = (id, k) => `${id}|${k}`;
const fmtTime = s => s < 60 ? `${s} sn` : `${Math.floor(s / 60)} dk ${s % 60} sn`;

function openRegen(k) {
  const p = post(), d = $('#rgDlg');
  rg.k = k; rg.postId = p.id; rgError('');
  $('#rgName').textContent = `${regenName(k)} · AI ile yeniden üret`;
  if (!d.open) d.showModal();
  if (k !== 'bg') return regenText();
  if (rg.img) return rgRunView(rg.img);
  rgShow('rgSrc'); rgFooter('Vazgeç', 'Görseli üret'); rgError(rg.imgErr); rg.imgErr = '';
  rgVisuals(p);
  $('[name=rgImage]:checked').focus();
}
function rgRunView(job) {
  rgShow('rgRun'); rgFooter(job.kind === 'img' ? 'Üretimi durdur' : 'Vazgeç', null);
  $('#rgStage').textContent = job.stage || 'Başlatılıyor'; $('#rgTime').textContent = fmtTime(job.elapsed || 0);
  $('#rgRunTip').textContent = job.kind === 'img' ? 'Pencereyi kapatabilirsin; görsel hazır olunca bu posta uygulanır.' : 'Claude postun konusuna uygun 3 farklı seçenek yazıyor.';
}
async function rgPost(body) {
  let r;
  try { r = await fetch('/api/post-editoru/ai/regen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
  catch (_) { throw new Error('Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(r.status === 401 ? 'Oturumun kapanmış. Sayfayı yenileyip yeniden giriş yap.' : j.error || 'Üretim başlatılamadı.');
  return j.id;
}
async function regenText() {
  const k = rg.k, p = postById(rg.postId); if (!p) return;
  if (rg.text) rgCancelJob(rg.text);
  const cur = regenValue(p, k), seen = rg.seen.get(seenKey(p.id, k)) || [];
  const avoid = [...new Set([cur, ...seen.slice(-15)].map(v => JSON.stringify(v)))].map(v => JSON.parse(v));
  const job = { kind: 'text', k, postId: p.id, stage: 'Seçenekler yazılıyor', elapsed: 0 };
  rg.text = job; rgRunView(job); rgError('');
  try { job.id = await rgPost({ el: k.startsWith('t:') ? 'text' : k, current: cur, avoid, post: regenContext(p), voice: p.style?.voice }); }
  catch (e) { if (rg.text === job) { rg.text = null; rgShow('rgPick'); $('#rgOpts').innerHTML = ''; rgFooter('Kapat', 'Tekrar dene'); rgError(e.message); } return; }
  rgPoll(job);
}
// görsel stili seçimi (tarz.js kataloğu); varsayılan postun AI tarzı, yoksa koyu showroom
async function rgVisuals(p) {
  const s = $('#rgVisual'), w = $('#rgVisWrap');
  if (!ai.prefs) await aiPrefsLoad();
  const vals = ai.prefs?.axes?.find(a => a.axis === 'visual')?.values;
  w.hidden = !vals || $('[name=rgImage]:checked')?.value !== 'gemini'; if (!vals) return;
  const cur = p.style?.visual || 'showroom';
  s.innerHTML = ''; [...vals].sort((a, b) => a.name.localeCompare(b.name, 'tr')).forEach(v => s.add(new Option(v.name, v.id, false, v.id === cur)));
}
async function regenImage(source) {
  const p = postById(rg.postId); if (!p || rg.img) return;
  const visual = source === 'library' ? null : $('#rgVisual').value || p.style?.visual || 'showroom';
  const job = { kind: 'img', k: 'bg', postId: p.id, stage: 'Başlatılıyor', elapsed: 0, visual };
  rg.img = job; rgRunView(job); rgError('');
  try {
    job.id = await rgPost({ el: 'bg', source, current: regenContext(p).photo, post: regenContext(p), style: { visual, layout: p.style?.layout || p.flow },
      library: LIB_CATS.flatMap(([cat, items]) => items.map(({ src, name }) => ({ src, name, cat }))) });
  } catch (e) { rg.img = null; rgShow('rgSrc'); rgFooter('Vazgeç', 'Görseli üret'); rgError(e.message); return; }
  rgPoll(job);
}
async function rgPoll(job) {
  if (job.cancelled) return;
  let s; try { s = await (await fetch('/api/post-editoru/ai/jobs/' + job.id)).json(); } catch (_) { job.timer = setTimeout(() => rgPoll(job), 4000); return; }
  if (job.cancelled) return;
  const showing = $('#rgDlg').open && rg.k === job.k && rg.postId === job.postId;
  if (s.status === 'running') {
    job.stage = s.stage; job.elapsed = s.elapsed;
    if (showing && !$('#rgRun').hidden) rgRunView(job);
    job.timer = setTimeout(() => rgPoll(job), 2000); return;
  }
  rg[job.kind] = null;
  if (s.status === 'cancelled') return;
  if (job.kind === 'text') {
    if (!showing) return;
    if (s.status !== 'done') { rgShow('rgPick'); $('#rgOpts').innerHTML = ''; rgFooter('Kapat', 'Tekrar dene'); return rgError(s.error || 'Üretim başarısız oldu.'); }
    return rgOptions(job, s.result.options);
  }
  // görsel: pencere kapalı olsa da posta uygula
  const p = postById(job.postId);
  if (s.status !== 'done') {
    if (showing) { rgShow('rgSrc'); rgFooter('Vazgeç', 'Görseli üret'); rgError(s.error || 'Görsel üretilemedi.'); }
    else { rg.imgErr = s.error || 'Görsel üretilemedi.';
      toast('AI görseli üretilemedi', { label: 'Ayrıntı', fn: () => { const i = state.posts.indexOf(p); if (i >= 0) { state.current = i; sel = null; renderAll(); } openRegen('bg'); } }); }
    return;
  }
  if (!p) return toast('Post silindiği için yeni görsel uygulanmadı');
  regenSet(p, 'bg', s.result); if (job.visual) p.style = { ...p.style, visual: job.visual }; commit(true); renderAll();
  if (!s.result.photo.startsWith('img/')) { addAiImage(s.result.photo, s.result.photo_name || 'AI görseli'); }
  if (showing) $('#rgDlg').close();
  toast('Yeni arka plan görseli uygulandı', { label: 'Geri al', fn: undo });
}
function rgOptions(job, options) {
  const key = seenKey(job.postId, job.k);
  rg.seen.set(key, [...(rg.seen.get(key) || []), ...options]);
  const box = $('#rgOpts'); box.innerHTML = '';
  options.forEach((v, i) => {
    const b = el('button', { type: 'button', className: 'rgopt' + (job.k === 'caption' ? ' cap' : ''), innerHTML: optHTML(job.k, v) });
    b.setAttribute('aria-label', `Seçenek ${i + 1}: ${b.textContent}`);
    b.onclick = () => {
      const p = postById(job.postId); if (!p) return;
      regenSet(p, job.k, v); commit(true); renderAll(); $('#rgDlg').close();
      toast(`${regenName(job.k)} güncellendi`, { label: 'Geri al', fn: undo });
    };
    box.append(b);
  });
  rgShow('rgPick'); rgFooter('Kapat', '3 yeni seçenek'); box.firstChild?.focus();
}
function rgCancelJob(job) {
  job.cancelled = true; clearTimeout(job.timer); rg[job.kind] = null;
  if (job.id) fetch('/api/post-editoru/ai/jobs/' + job.id, { method: 'DELETE' }).catch(() => {});
}
$('#rgClose').onclick = () => $('#rgDlg').close();
// metin işi pencereyle yaşar; görsel işi kapatınca arka planda sürer
$('#rgDlg').addEventListener('close', () => { if (rg.text) rgCancelJob(rg.text); });
$('#rgCancel').onclick = () => {
  if (rg.k === 'bg' && rg.img && !$('#rgRun').hidden) { rgCancelJob(rg.img); rgShow('rgSrc'); rgFooter('Vazgeç', 'Görseli üret'); toast('Üretim durduruldu'); return; }
  $('#rgDlg').close();
};
document.querySelectorAll('[name=rgImage]').forEach(r => r.addEventListener('change', () => { $('#rgVisWrap').hidden = r.value !== 'gemini' || !$('#rgVisual').options.length; }));
$('#rgForm').onsubmit = e => { e.preventDefault();
  if (rg.k === 'bg') { if (!rg.img) regenImage($('[name=rgImage]:checked').value); }
  else regenText(); };

document.querySelectorAll('.side [role=tab]').forEach(b => { b.onclick = () => setTab(b.dataset.tab); });
$('.tabs').addEventListener('keydown', e => { if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  const tabs = [...document.querySelectorAll('.side [role=tab]')], i = tabs.findIndex(b => b.dataset.tab === tab);
  const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]; setTab(n.dataset.tab); n.focus(); });
$('#zIn').onclick = () => setZoom(scale * 1.2); $('#zOut').onclick = () => setZoom(scale / 1.2); $('#zFit').onclick = () => setZoom(null);
$('#keys').onclick = e => { e.stopPropagation(); const k = $('#keyPop'); k.hidden = !k.hidden; $('#keys').setAttribute('aria-expanded', !k.hidden); };
$('#stage').addEventListener('wheel', e => { if (!e.ctrlKey) return; e.preventDefault(); setZoom(scale * (e.deltaY < 0 ? 1.1 : 1 / 1.1)); }, { passive: false });

const dl = $('#dl');
$('#dlBtn').onclick = e => { e.stopPropagation(); const open = !dl.classList.contains('open'); closeMenus(); dl.classList.toggle('open', open);
  $('#dlBtn').setAttribute('aria-expanded', open); if (open) dl.querySelector('[data-dl]').focus(); };
document.addEventListener('click', e => { if (!e.target.closest('.menu')) closeMenus();
  if (!e.target.closest('.zoom')) { $('#keyPop').hidden = true; $('#keys').setAttribute('aria-expanded', 'false'); } });
$('#hq').onclick = e => { e.stopPropagation(); const on = $('#hq').getAttribute('aria-checked') !== 'true'; $('#hq').setAttribute('aria-checked', on); };
$('#plist').addEventListener('scroll', closeMenus);
dl.querySelectorAll('[data-dl]').forEach(b => b.onclick = async () => {
  closeMenus();
  const idx = b.dataset.dl === 'all' ? state.posts.map((_, i) => i) : [state.current];
  const fmts = b.dataset.dl === 'current' ? [fmt] : ['feed', 'story'];
  const jobs = idx.flatMap(i => fmts.map(f => [i, f]));
  for (let j = 0; j < jobs.length; j++) {
    toast(`PNG hazırlanıyor ${j + 1}/${jobs.length}`);
    try { await exportPNG(...jobs[j]); }
    catch (err) { console.error(err); toast('PNG oluşturulamadı. Sayfayı yenileyip tekrar dene.'); return; }
  }
  toast(jobs.length > 1 ? `${jobs.length} PNG indirildi` : 'PNG indirildi');
});
document.addEventListener('keydown', e => {
  const m = e.target.closest?.('.menu.open'); if (!m) return;
  const items = [...m.querySelectorAll('[role^=menuitem]')]; const i = items.indexOf(e.target);
  if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
  if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
  if (e.key === 'Escape') { e.preventDefault(); closeMenus(); m.querySelector('[aria-haspopup]').focus(); }
});

/* ---------- dışa aktarma: 2x çiz, istenirse yüksek kaliteyle 1080'e indir ---------- */
async function exportPNG(i, f) {
  const hq = $('#hq').getAttribute('aria-checked') === 'true';
  const cv = await drawPost(state.posts[i], f, hq);
  const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
  const a = el('a', { href: URL.createObjectURL(blob), download: `rentqr-${String(i + 1).padStart(2, '0')}-${f}${hq ? '-2160' : ''}.png` });
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
// html-to-image sayfadaki bütün @font-face kurallarını gömüyor (64 font, her çizimde ~3 MB); yalnızca postta kullanılanlar verilir.
// Font dosyaları bir kez data: adresine çevrilip saklanır.
let faceRules = null; const fontData = new Map();
async function fontCSSFor(html) {
  faceRules ||= (async () => { const out = [];
    for (const f of ['post.css', 'fonts.css']) { const base = new URL(f, document.baseURI), css = await (await fetch(base)).text();
      for (const m of css.matchAll(/@font-face\s*{[^}]*}/g)) { const r = m[0], fam = /font-family:\s*([^;]+)/.exec(r)?.[1].replace(/["']/g, '').trim(), url = /url\(([^)]+)\)/.exec(r)?.[1];
        if (fam && url) out.push({ fam, url: new URL(url.replace(/['"]/g, ''), base).href, rule: r }); } }
    return out; })();
  const rules = await faceRules, used = new Set(['Manrope', ...[...html.matchAll(/font-family:'([^']+)'/g)].map(m => m[1])]);
  const parts = await Promise.all(rules.filter(r => used.has(r.fam)).map(async r => {
    if (!fontData.has(r.url)) fontData.set(r.url, fetch(r.url).then(x => x.blob()).then(b => new Promise(ok => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(b); })));
    return r.rule.replace(/url\([^)]+\)/, `url(${await fontData.get(r.url)})`); }));
  await Promise.all([...used].filter(f => FONT_SET.has(f)).flatMap(f => [400, 700, 800].map(w => document.fonts.load(`${w} 40px '${f}'`).catch(() => {}))));
  return parts.join('\n');
}
// PNG indirme ve Instagram paylaşımı (ig.js) aynı çizimi kullanır
async function drawPost(p, f, hq) {
  const [W, H] = SIZE[f];
  ensureLayout(p, f);
  const host = el('div'); host.style.cssText = 'position:fixed;left:-20000px;top:0;pointer-events:none';
  host.innerHTML = postHTML(p, f); document.body.append(host);
  try {
    const node = host.firstElementChild;
    await document.fonts.ready;
    const fontEmbedCSS = await fontCSSFor(host.innerHTML);
    const urls = [...host.innerHTML.matchAll(/url\('([^']+)'\)/g)].map(m => m[1]);
    await Promise.all(urls.map(u => new Promise(r => { const im = new Image(); im.onload = im.onerror = r; im.src = u; })));
    const big = await htmlToImage.toCanvas(node, { width: W, height: H, pixelRatio: 2, canvasWidth: W, canvasHeight: H, fontEmbedCSS });
    let out = big;
    if (!hq) { out = el('canvas', { width: W, height: H }); const x = out.getContext('2d');
      x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(big, 0, 0, W, H); }
    return out;
  } finally { host.remove(); }
}

/* ---------- ortak çalışma: başkalarının değişiklikleri, imleçleri ve seçimleri (Canva gibi) ---------- */
// sunucudan gelen tam liste (ilk bağlantı ya da yeniden bağlanma); henüz onaylanmamış/gönderilmemiş kendi değişikliklerin üstüne yeniden uygulanır
function adopt(data, pendingOps) {
  const id = post()?.id, unsent = live.on && live.synced ? OrtakOps.diff(live.synced, shared(state)) : [];
  const base = { posts: (data.posts || []).map(fixPost), uploads: data.uploads || [] };
  pendingOps.forEach(op => OrtakOps.apply(base, op));
  live.synced = clone(base);
  unsent.forEach(op => OrtakOps.apply(base, op));
  if (!base.posts.length) base.posts = DEFAULTS();
  state.posts = base.posts; state.uploads = base.uploads;
  let want = id; if (!live.on) { try { want = localStorage.getItem(STORE + '-konum') || id; } catch (_) {} }
  const i = state.posts.findIndex(p => p.id === want);
  state.current = i >= 0 ? i : Math.min(state.current || 0, state.posts.length - 1);
  if (sel && !present(post(), sel)) sel = null;
  // yeni temel: eski geçmiş artık geçersiz
  hist.past = []; hist.future = []; live.remote = []; lastSnap = JSON.stringify(state); lastQ = live.rq; syncUndo();
  live.on = true; Ortak.resend(); syncOut();
}
function onRemote(ops, by) {
  const id = post()?.id;
  live.rq++; live.remote.push({ q: live.rq, ops });
  if (live.remote.length > 3000) live.remote.splice(0, 1000);
  const touched = new Set(); let structural = false;
  ops.forEach(op => { OrtakOps.apply(state, op); OrtakOps.apply(live.synced, op);
    if (op.k === 'set') touched.add(op.id); else if (op.k !== 'upl') structural = true; });
  // son anlık görüntüye de işle: sonraki geri al, başkasının değişikliğini geri almasın
  const ls = JSON.parse(lastSnap); ops.forEach(op => OrtakOps.apply(ls, op)); lastSnap = JSON.stringify(ls); lastQ = live.rq;
  state.posts = state.posts.map(p => p.order && p.layout ? p : fixPost(p));
  const i = state.posts.findIndex(p => p.id === id);
  if (i < 0 && by) toast(`${by} üzerinde çalıştığın postu sildi`);
  state.current = i >= 0 ? i : clamp(state.current, 0, state.posts.length - 1);
  if (sel && !present(post(), sel)) sel = null;
  remoteRender(structural ? null : touched);
}
// başkasının değişikliğini çiz; sürükleme ya da yerinde yazma sürerken bekle, odaktaki alanı bozma
let rrFrame = null, rrTouched = new Set(), rrAll = false;
function remoteRender(touched) {
  if (touched === undefined || touched === null) rrAll = true; else touched.forEach(t => rrTouched.add(t));
  if (rrFrame) return;
  rrFrame = requestAnimationFrame(() => {
    rrFrame = null;
    if (drag || editing) { live.dirty = true; return; }
    live.dirty = false;
    const all = rrAll, ids = rrTouched; rrAll = false; rrTouched = new Set();
    if (all || ids.has(post().id)) renderCanvas();
    if (all) renderList(); else state.posts.forEach((p, i) => { if (ids.has(p.id)) refreshThumbAt(i); });
    renderLayers(); renderToolbar();
    if ($('#props').contains(document.activeElement)) live.propsDirty = true; else renderProps();
  });
}
function refreshThumbAt(i) {
  const li = $('#plist').children[i], p = state.posts[i]; if (!li || !p) return;
  ensureLayout(p, fmt);
  li.querySelector('.pthumb > div').innerHTML = postHTML(p, fmt);
  li.querySelector('.txt span').textContent = plain(p.headline.text) || 'Başlıksız post';
}
$('#props').addEventListener('focusout', () => setTimeout(() => {
  if (live.propsDirty && !$('#props').contains(document.activeElement)) { live.propsDirty = false; renderProps(); } }, 0));

/* imleç ve seçim: sahnedeki konum postun kendi pikselleriyle (1080 genişlik) gider; karşı taraf kendi yakınlığına çevirir */
let here = { x: null, y: null };
function sayHere() { if (live.on && post()) Ortak.move({ post: post().id, fmt, x: here.x, y: here.y, sel }); }
$('#stage').addEventListener('pointermove', e => {
  if (!live.on) return;
  const cr = canvas.getBoundingClientRect();
  here = { x: Math.round((e.clientX - cr.left) / scale), y: Math.round((e.clientY - cr.top) / scale) }; sayHere();
});
$('#stage').addEventListener('pointerleave', () => { here = { x: null, y: null }; sayHere(); });

const initials = n => [...String(n || '?').trim()][0]?.toLocaleUpperCase('tr') || '?';
const ARROW = c => `<svg width="20" height="22" viewBox="0 0 20 22" aria-hidden="true"><path d="M2 2l15 8.2-6.6 1.6L7.6 19z" fill="${c}" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
function paintPeers() {
  let box = $('#peers'); if (!box) { box = el('div', { id: 'peers' }); $('#board').append(box); }
  box.innerHTML = '';
  if (!live.on) return;
  const br = $('#board').getBoundingClientRect(), cr = canvas.getBoundingClientRect();
  live.people.forEach(p => {
    const at = p.at; if (!at || at.post !== post()?.id || at.fmt !== fmt) return;
    const safe = /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : '#d11414';
    if (at.sel) { const n = at.sel === 'bg' ? canvas : canvas.querySelector(sel$(at.sel));
      if (n) { const R = n.getBoundingClientRect();
        const s = el('div', { className: 'rsel' }); s.style.cssText = `left:${R.left - br.left}px;top:${R.top - br.top}px;width:${R.width}px;height:${R.height}px;--c:${safe}`;
        s.append(el('span', { textContent: p.name })); box.append(s); } }
    if (at.x != null) {
      const c = el('div', { className: 'rcur', innerHTML: ARROW(safe) });
      c.style.cssText = `left:${cr.left - br.left + at.x * scale}px;top:${cr.top - br.top + at.y * scale}px;--c:${safe}`;
      c.append(el('span', { textContent: p.name })); box.append(c);
    }
  });
}
// sol listede kimin hangi posta baktığı, üst çubukta çevrimiçi olanlar
function paintPeerList() {
  document.querySelectorAll('#plist .pitem').forEach((li, i) => {
    li.querySelector('.peerdots')?.remove();
    const here = [...live.people.values()].filter(p => p.at?.post === state.posts[i]?.id);
    if (!here.length) return;
    const d = el('div', { className: 'peerdots' });
    here.forEach(p => { const s = el('span', { textContent: initials(p.name), title: `${p.name} bu postta` }); s.style.background = p.color; d.append(s); });
    li.append(d);
  });
  paintTeam();
}
function paintTeam() {
  const T = $('#team'); if (!T) return;
  T.innerHTML = ''; T.hidden = !live.on;
  if (!live.on) return;
  const me = el('div', { className: 'menu' });
  const meB = el('button', { type: 'button', className: 'av me', textContent: initials(live.me?.name), title: `${live.me?.name} (sen)` });
  meB.style.background = live.me?.color || '#d11414';
  meB.setAttribute('aria-label', `${live.me?.name} (sen)${live.local ? '' : '. Menü için tıkla'}`);
  me.append(meB);
  if (!live.local) {
    const pop = el('div', { className: 'pop' }); pop.setAttribute('role', 'menu');
    const out = el('button', { type: 'button', textContent: 'Yönetim paneline dön' }); out.setAttribute('role', 'menuitem');
    out.onclick = async () => { Ortak.close(); location.href = '/yonetim'; };
    pop.append(el('small', { textContent: `${live.me?.name} olarak girdin` }), out); me.append(pop);
    meB.setAttribute('aria-haspopup', 'menu');
    meB.onclick = e => { e.stopPropagation(); const open = !me.classList.contains('open'); closeMenus(); me.classList.toggle('open', open); };
  }
  T.append(me);
  live.people.forEach(p => {
    const i = state.posts.findIndex(x => x.id === p.at?.post);
    const b = el('button', { type: 'button', className: 'av', textContent: initials(p.name) });
    b.style.background = p.color;
    b.title = i >= 0 ? `${p.name} · Post ${i + 1}'te. Yanına gitmek için tıkla` : `${p.name} · çevrimiçi`;
    b.setAttribute('aria-label', b.title);
    b.onclick = () => { if (i < 0) return; if (p.at.fmt !== fmt) { fmt = p.at.fmt; zoom = null; } state.current = i; sel = null; renderAll(); save(); };
    T.append(b);
  });
  // sahibine canlı adres: Nihat'a gönderilecek bağlantı
  if (live.local && live.canli) {
    const c = el('button', { type: 'button', className: 'btn ghost canli', innerHTML: '<i aria-hidden="true"></i>Canlı adres' });
    c.title = `${live.canli}\nTıkla: kopyala ve ekip arkadaşına gönder`;
    c.onclick = async () => { try { await navigator.clipboard.writeText(live.canli); toast('Canlı adres kopyalandı; ekip arkadaşına gönder'); } catch (_) { toast(live.canli); } };
    T.append(c);
  }
}

function startLive() {
  if (!window.Ortak || location.protocol === 'file:') return Promise.resolve(false);
  return new Promise(done => {
    let first = true;
    const ready = ok => { if (first) { first = false; done(ok); } };
    Ortak.on({
      welcome(m, pendingOps) {
        live.me = m.me; live.canli = m.canli;
        live.people = new Map(m.people.filter(p => p.cid !== m.cid).map(p => [p.cid, p]));
        fetch('/api/post-editoru/ben').then(r => r.json()).then(j => { live.local = !!j.local; live.canli = j.canli || live.canli; paintTeam(); }).catch(() => {});
        if (m.data) { adopt(m.data, pendingOps); if (!first) { renderAll(); toast('Yeniden bağlandı'); } ready(true); }
        else Ortak.seed(clone(shared(state)));   // ilk açılış: bu tarayıcıdaki postlar ortak listeye taşınır
        paintPeerList(); sayHere();
      },
      state(data) { adopt(data, []); if (!first) renderAll(); ready(true); paintPeerList(); },
      wait() { toast('Post listesi hazırlanıyor, birazdan açılacak.'); },
      ops: onRemote,
      acked: syncStatus,
      status(s) { if (live.on) syncStatus(); if (s === 'kopuk') { live.people.clear(); paintPeers(); paintPeerList(); } },
      join(p) { live.people.set(p.cid, p); paintPeerList(); toast(`${p.name} editöre katıldı`); },
      leave(cid) { const p = live.people.get(cid); live.people.delete(cid); paintPeers(); paintPeerList(); if (p) toast(`${p.name} ayrıldı`); },
      move(cid, at) { const p = live.people.get(cid); if (!p) return; const was = p.at?.post; p.at = at; paintPeers(); if (was !== at.post) paintPeerList(); },
      error: msg => toast(msg),
    });
    Ortak.connect(new URLSearchParams(location.search).get('oda'));
    // sunucu ortak çalışmayı desteklemiyorsa (eski sürüm) bu tarayıcıdaki kayıtla devam et
    setTimeout(() => { if (first && !live.on) { ready(false); } }, 20000);
  });
}

/* ---------- klavye ---------- */
document.addEventListener('keydown', e => {
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || editing;
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  else if (mod && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); redo(); }
  else if (mod && e.key.toLowerCase() === 'd' && !typing && sel && sel !== 'bg' && sel !== 'brand' && ['font', 'box'].includes(kindOf(sel))) { e.preventDefault(); duplicateFree(sel); }
  else if (mod && e.key.toLowerCase() === 'g' && !typing) { e.preventDefault(); e.shiftKey ? ungroupSel() : groupSel(); }
  else if (e.key === 'Escape' && !typing && !e.target.closest?.('.menu, dialog')) { closeMenus(); if (sel) deselect(); }
  else if ((e.key === 'Delete' || e.key === 'Backspace') && !typing && (multi.length > 1 || (sel && hideable(sel)))) { e.preventDefault(); removeSel(); }
  else if (!typing && sel && sel !== 'bg' && e.key.startsWith('Arrow')) {
    const p = post(), Ls = (multi.length > 1 ? multi : [sel]).filter(k => !p.locks?.[k]).map(k => p.layout[fmt][k]).filter(Boolean); if (!Ls.length) return;
    e.preventDefault(); const d = e.shiftKey ? 10 : 1;
    Ls.forEach(L => { if (e.key === 'ArrowLeft') L.x -= d; if (e.key === 'ArrowRight') L.x += d;
      if (e.key === 'ArrowUp') L.y -= d; if (e.key === 'ArrowDown') L.y += d; });
    commit(); if (multi.length > 1) placeSel();
  }
});

new ResizeObserver(() => layout()).observe($('#stage'));
document.fonts.addEventListener('loadingdone', () => { if (!drag && !editing) placeSel(); });
setTab('edit'); syncUndo();
// ilk konumlar yazı ölçülerine bağlı: ölçmeden önce Manrope'un tüm kalınlıkları yüklenmeli
// ortak çalışmada post listesi sunucudan gelir; ilk çizim onu bekler
Promise.all([Promise.all([500, 600, 700, 800].map(w => document.fonts.load(`${w} 40px Manrope`, 'Aaçğışöü'))).catch(() => {}), startLive()]).then(() => {
  if (ensureAll()) { lastSnap = JSON.stringify(state); save(); }
  renderAll(); paintTeam(); document.body.classList.add('ready');
});
window.__editor = { get state() { return state; } };  // testler için salt okunur erişim
// Instagram'da paylaş (ig.js) için: geçerli post, çizim, açıklama ve bildirim
window.__editorApi = { post, drawPost, toast, capReport, addItem, select, commit, renderAll, renderProps, closeMenus, undo, libGroups, uploadPhoto, shrink,
  postHTML, ensureLayout, fixPost, clone, nid, esc, el, pushPost, swatches, FONTS, SIZE, FMTS, FMT_NAME, LIB_CATS, DEFAULTS, blankPost, addAiImage, objOf, addText, renderPanel, fontCSSFor,
  get state() { return state; }, get fmt() { return fmt; }, get sel() { return sel; }, get live() { return live; },
  set fmt(f) { if (SIZE[f] && f !== fmt) { fmt = f; zoom = null; renderAll(); } },
  replacePosts(posts) { state.posts = posts.map(fixPost); state.current = Math.min(state.current, state.posts.length - 1); sel = null; multi = []; commit(true); renderAll(); },
  setCaption(id, text) { const p = state.posts.find(x => x.id === id); if (!p || p.caption === text) return;
    p.caption = text; commit(true); if (p === post() && !sel) renderProps(); } };
})();
