/* "Ekle" sekmesi: şekil, metin, ikon, görsel (kütüphane, yükleme, Pexels stok, Gemini ile üretim) ve marka kiti.
   Seçili görsel için AI araçları (Düzenle sekmesinde): Gemini ile düzenleme ve arka planı kaldırma.
   Editörün içine app.js'in dışa açtığı arayüzden (window.__editorApi) erişir. */
(() => {
const E = window.__editorApi, el = E.el, esc = E.esc, $ = s => document.querySelector(s);
const API = '/api/post-editoru';
let yetenek = { claude: true, gemini: true, stok: true };

async function call(path, opts = {}) {
  let r;
  try { r = await fetch(API + path, { ...opts, headers: opts.body ? { 'Content-Type': 'application/json' } : undefined, body: opts.body ? JSON.stringify(opts.body) : undefined }); }
  catch (_) { throw new Error('Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.'); }
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) throw new Error('Oturumun kapanmış. Sayfayı yenileyip yeniden giriş yap.');
  if (!r.ok) throw new Error(j.error || 'İstek başarısız oldu.');
  return j;
}
// AI işleri arka planda sürer; bitene kadar yokla
async function isBekle(id, onStage) {
  for (;;) {
    await new Promise(r => setTimeout(r, 2000));
    let s; try { s = await call('/ai/jobs/' + id); } catch (_) { continue; }
    if (s.status === 'running') { onStage?.(s.stage, s.elapsed); continue; }
    if (s.status === 'done') return s.result;
    throw new Error(s.error || 'Üretim başarısız oldu.');
  }
}
const tbIc = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const durumKutusu = () => { const d = el('div', { className: 'is-durum', innerHTML: '<i class="spin" aria-hidden="true"></i><span></span>' }); d.setAttribute('role', 'status'); return d; };
const eksik = (ne, anahtar) => el('p', { className: 'ipucu uyari', innerHTML: `${ne} için <b>${anahtar}</b> henüz tanımlı değil. Anahtar Vercel'e eklenince burası kendiliğinden çalışır.` });

// görseli doğal oranıyla ekle (sahnenin %55'i kadar)
function gorselEkle(src, name) {
  const im = new Image();
  im.onload = () => { const r = im.naturalHeight / im.naturalWidth || 1, w = 620; E.addItem('image', { src, name: name || '' }, [w, Math.round(w * r)]); E.toast('Görsel eklendi'); };
  im.onerror = () => { E.addItem('image', { src, name: name || '' }); };
  im.src = src;
}
function yuklenenlereEkle(src, name) { const s = E.state; s.uploads ||= []; if (!s.uploads.some(u => u.src === src)) s.uploads.push({ src, name }); }

/* ---------- marka kiti ---------- */
window.Marka = { colors: [], logos: [], fonts: { baslik: null, metin: null } };
async function markaYukle() { try { Object.assign(window.Marka, await call('/marka')); } catch (_) {} }
async function markaKaydet() {
  try { Object.assign(window.Marka, await call('/marka', { method: 'POST', body: window.Marka })); } catch (e) { E.toast(e.message); }
  E.renderProps();
}

/* ---------- sekme içeriği ---------- */
const SEKILLER = [['rect', 'Dikdörtgen', '<rect x="6" y="9" width="28" height="22" rx="4"/>'], ['ellipse', 'Daire', '<circle cx="20" cy="20" r="13"/>'],
  ['triangle', 'Üçgen', '<path d="M20 7 33 32H7z"/>'], ['star', 'Yıldız', '<path d="m20 6 4 9 9.5 1-7 6.5 2 9.5-8.5-5-8.5 5 2-9.5-7-6.5 9.5-1z"/>'],
  ['line', 'Çizgi', '<path d="M6 20h28" stroke-width="4" stroke-linecap="round"/>'], ['arrow', 'Ok', '<path d="M6 20h22" stroke-width="4"/><path d="m26 12 9 8-9 8z"/>']];
const METINLER = [['Başlık ekle', { size: 96, weight: 800 }, 'baslik'], ['Alt başlık ekle', { size: 56, weight: 700 }, 'baslik'], ['Gövde metni ekle', { size: 34, weight: 500 }, 'metin']];
let gSekme = 'kutuphane', stok = { q: '', sayfa: 1, sonuc: [], next: false, yukleniyor: false }, ikonAra = '';

function sekillerHTML(box) {
  const g = el('div', { className: 'sekil-grid' });
  SEKILLER.forEach(([v, n, d]) => {
    const b = el('button', { type: 'button', innerHTML: `<svg viewBox="0 0 40 40" fill="#d11414" stroke="#d11414">${d}</svg><span>${n}</span>` });
    if (v === 'line' || v === 'arrow') b.querySelector('svg').setAttribute('fill', v === 'arrow' ? '#d11414' : 'none');
    b.onclick = () => E.addItem('shape', { shape: v, fill: v === 'line' || v === 'arrow' ? '#ffffff' : (window.Marka.colors[0] || '#d11414') },
      v === 'line' || v === 'arrow' ? [520, 40] : v === 'rect' ? [480, 320] : [360, 360]);
    g.append(b);
  });
  box.append(el('h4', { textContent: 'Şekiller' }), g);
}
function metinHTML(box) {
  const g = el('div', { className: 'metin-grid' });
  METINLER.forEach(([n, props, fontKey]) => {
    const b = el('button', { type: 'button', textContent: n }); b.style.fontSize = Math.max(13, props.size / 4.5) + 'px'; b.style.fontWeight = props.weight;
    b.onclick = () => { E.addText(); const t = E.objOf(E.post(), E.sel); if (!t) return;
      Object.assign(t, props, { text: n.replace(' ekle', '') }); const f = window.Marka.fonts?.[fontKey]; if (f) t.font = f;
      E.commit(true); E.renderPanel(); };
    g.append(b);
  });
  box.append(el('h4', { textContent: 'Metin' }), g);
}
function ikonHTML(box) {
  const ara = el('input', { type: 'search', className: 'ikon-ara', placeholder: 'İkon ara (ör. takvim, kamera, kalp)', value: ikonAra });
  ara.setAttribute('aria-label', 'İkon ara');
  const g = el('div', { className: 'ikon-grid' });
  const TR = { takvim: 'calendar', saat: 'clock', kamera: 'camera', kalp: 'heart', yildiz: 'star', yıldız: 'star', kamyon: 'truck', telefon: 'phone', para: 'banknote',
    kart: 'credit-card', ok: 'arrow', onay: 'check', kilit: 'lock', anahtar: 'key', ev: 'home', magaza: 'store', mağaza: 'store', bisiklet: 'bike', cadir: 'tent', çadır: 'tent',
    hediye: 'gift', mesaj: 'message', zil: 'bell', kisi: 'user', kişi: 'user', etiket: 'tag', paket: 'package', qr: 'qr', konum: 'map-pin', güneş: 'sun', ay: 'moon' };
  const ciz = () => { g.innerHTML = ''; const q = ara.value.trim().toLocaleLowerCase('tr'), en = TR[q] || q;
    Object.entries(window.Ikonlar || {}).forEach(([cat, list]) => {
      const f = list.filter(([n]) => !q || n.includes(en) || cat.toLocaleLowerCase('tr').includes(q)); if (!f.length) return;
      g.append(el('h5', { textContent: cat }));
      f.forEach(([n, d]) => { const b = el('button', { type: 'button', title: n, innerHTML: tbIc(d) }); b.setAttribute('aria-label', `İkon: ${n}`);
        b.onclick = () => E.addItem('icon', { name: n, color: E.post().light ? '#2a0d0b' : '#ffffff' }); g.append(b); });
    });
    if (!g.children.length) g.append(el('p', { className: 'tip', textContent: 'Bu aramayla ikon bulunamadı.' })); };
  ara.oninput = () => { ikonAra = ara.value; ciz(); }; ciz();
  box.append(el('h4', { textContent: 'İkonlar' }), ara, g);
}

function gorselHTML(box) {
  box.append(el('h4', { textContent: 'Görseller' }));
  const sek = el('div', { className: 'gsekme' }); sek.setAttribute('role', 'group'); sek.setAttribute('aria-label', 'Görsel kaynağı');
  const ic = el('div');
  [['kutuphane', 'Kütüphane'], ['stok', 'Stok'], ['ai', 'AI ile üret']].forEach(([v, n]) => {
    const b = el('button', { type: 'button', textContent: n }); b.setAttribute('aria-pressed', gSekme === v);
    b.onclick = () => { gSekme = v; [...sek.children].forEach(x => x.setAttribute('aria-pressed', x === b)); ciz(); }; sek.append(b); });
  const ciz = () => { ic.innerHTML = ''; ({ kutuphane: kutuphaneHTML, stok: stokHTML, ai: aiHTML })[gSekme](ic); };
  box.append(sek, ic); ciz();
}
function kutuphaneHTML(box) {
  const g = el('div', { className: 'lib' });
  E.libGroups().forEach(([cat, items]) => { g.append(el('h5', { textContent: cat }));
    items.forEach(ph => { const b = el('button', { type: 'button', title: ph.name }); b.setAttribute('aria-label', `${ph.name} ekle`);
      b.style.backgroundImage = `url('${ph.src}')`; b.onclick = () => gorselEkle(ph.src, ph.name); g.append(b); }); });
  const up = el('label', { innerHTML: 'Fotoğraf yükle<input type="file" accept="image/*" hidden>' }); up.tabIndex = 0; up.setAttribute('role', 'button');
  up.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); up.querySelector('input').click(); } };
  up.querySelector('input').onchange = async e => { const file = e.target.files[0]; if (!file) return;
    try { const src = await E.uploadPhoto(await E.shrink(file)); yuklenenlereEkle(src, file.name); gorselEkle(src, file.name); } catch (err) { if (err?.message) E.toast(err.message); } };
  g.prepend(up); box.append(g);
}
function stokHTML(box) {
  if (!yetenek.stok) return box.append(eksik('Stok fotoğraf', 'PEXELS_API_KEY'));
  const f = el('form', { className: 'satir' }), q = el('input', { type: 'text', value: stok.q, placeholder: 'ör. wedding dress, camera, bicycle' });
  q.setAttribute('aria-label', 'Stok fotoğraf ara');
  const yon = el('select'); yon.setAttribute('aria-label', 'Yön');
  [['', 'Tümü'], ['portrait', 'Dikey'], ['landscape', 'Yatay'], ['square', 'Kare']].forEach(([v, n]) => yon.add(new Option(n, v, false, v === (stok.yon || ''))));
  f.append(q, yon, el('button', { type: 'submit', className: 'btn', textContent: 'Ara' }));
  const g = el('div', { className: 'stok-grid' }), daha = el('button', { type: 'button', className: 'btn tam', textContent: 'Daha fazla' });
  const ciz = () => { g.innerHTML = ''; daha.hidden = !stok.next;
    stok.sonuc.forEach(p => { const b = el('button', { type: 'button', innerHTML: `<img src="${esc(p.thumb)}" alt="${esc(p.alt)}" loading="lazy"><small>${esc(p.by)}</small>` });
      b.title = `${p.alt} · Fotoğraf: ${p.by} (Pexels)`;
      b.onclick = async () => { if (b.getAttribute('aria-busy') === 'true') return; b.setAttribute('aria-busy', 'true');
        try { const r = await call('/stok/al', { method: 'POST', body: { id: p.id } }); yuklenenlereEkle(r.src, `${r.name} · ${r.by}`); gorselEkle(r.src, r.name); }
        catch (e) { E.toast(e.message); } finally { b.removeAttribute('aria-busy'); } };
      g.append(b); });
    if (stok.q && !stok.sonuc.length && !stok.yukleniyor) g.append(el('p', { className: 'tip', textContent: 'Sonuç yok. İngilizce aramak daha çok sonuç verir.' })); };
  const ara = async ek => { if (!q.value.trim()) return; stok.q = q.value.trim(); stok.yon = yon.value; stok.sayfa = ek ? stok.sayfa + 1 : 1; stok.yukleniyor = true;
    try { const r = await call(`/stok/ara?q=${encodeURIComponent(stok.q)}&p=${stok.sayfa}&yon=${stok.yon}`);
      stok.sonuc = ek ? [...stok.sonuc, ...r.photos] : r.photos; stok.next = r.next; } catch (e) { E.toast(e.message); }
    stok.yukleniyor = false; ciz(); };
  f.onsubmit = e => { e.preventDefault(); ara(false); }; daha.onclick = () => ara(true);
  // Pexels'in kuralı: aramanın yanında görünür bağlantı
  box.append(f, el('span', { className: 'pexels', innerHTML: 'Fotoğraflar: <a href="https://www.pexels.com" target="_blank" rel="noopener">Pexels</a> · fotoğrafçının adı küçük resimde' }), g, daha);
  ciz();
}
function aiHTML(box) {
  if (!yetenek.gemini) return box.append(eksik('AI ile görsel üretme', 'GEMINI_API_KEY'));
  const t = el('textarea', { rows: 4, placeholder: 'Ne görmek istiyorsun? ör. Bir gelinlik askıda, butik vitrininde, yumuşak gün ışığı' });
  const oran = el('select'); [['1:1', 'Kare'], ['4:5', 'Feed 4:5'], ['9:16', 'Story 9:16'], ['16:9', 'Yatay 16:9'], ['3:4', 'Dikey 3:4']].forEach(([v, n]) => oran.add(new Option(n, v)));
  const stil = el('select'); stil.add(new Option('Stil yok (tarife aynen uy)', ''));
  [['showroom', 'Koyu showroom'], ['studio', 'Aydınlık stüdyo'], ['dogal', 'Doğal ortam'], ['ustten', 'Üstten düzenleme'], ['detay', 'Yakın detay']].forEach(([v, n]) => stil.add(new Option(n, v)));
  const git = el('button', { type: 'button', className: 'btn primary tam', innerHTML: '<span class="spark" aria-hidden="true">✦</span>Görseli üret' });
  const d = durumKutusu(); d.hidden = true;
  git.onclick = async () => { if (git.disabled) return; git.disabled = true; d.hidden = false; d.querySelector('span').textContent = 'Görsel üretiliyor…';
    try { const { id } = await call('/ai/gorsel', { method: 'POST', body: { prompt: t.value, oran: oran.value, stil: stil.value } });
      const r = await isBekle(id, (st, sn) => { d.querySelector('span').textContent = `${st} · ${sn} sn`; });
      E.addAiImage(r.src, r.name); gorselEkle(r.src, r.name); }
    catch (e) { E.toast(e.message); } finally { git.disabled = false; d.hidden = true; } };
  box.append(E.el('label', { className: 'f' }, el('span', { textContent: 'Tarif' }), t), el('div', { className: 'f' }, el('span', { textContent: 'Oran' }), oran),
    el('div', { className: 'f' }, el('span', { textContent: 'Stil' }), stil), git, d,
    el('p', { className: 'tip', textContent: 'Gemini ile üretilir, görsel başına yaklaşık 5 sent. Üretilenler kütüphanede "AI üretimleri" grubunda kalır.' }));
}
function markaHTML(box) {
  const M = window.Marka;
  box.append(el('h4', { textContent: 'Marka kiti' }));
  const renkler = el('div', { className: 'marka-renk' });
  M.colors.forEach((c, i) => { const s = el('span', { title: c }); s.style.background = c;
    const x = el('button', { type: 'button', textContent: '×' }); x.setAttribute('aria-label', `${c} rengini çıkar`);
    x.onclick = () => { M.colors.splice(i, 1); markaKaydet().then(yenile); }; s.append(x); renkler.append(s); });
  const yeni = el('input', { type: 'color', value: '#d11414' }); yeni.setAttribute('aria-label', 'Yeni marka rengi');
  const ekle = el('button', { type: 'button', className: 'btn', textContent: 'Renk ekle' });
  ekle.onclick = () => { if (!M.colors.includes(yeni.value)) M.colors.push(yeni.value); markaKaydet().then(yenile); };
  box.append(el('p', { className: 'tip', textContent: 'Marka renkleri bütün renk seçicilerde en başta görünür.' }), renkler, el('div', { className: 'satir' }, yeni, ekle));
  const fsec = key => { const s = el('select'); s.add(new Option('Varsayılan (Manrope)', ''));
    E.FONTS.forEach(f => { const o = new Option(f, f, false, f === M.fonts?.[key]); o.style.fontFamily = `'${f}'`; s.add(o); });
    s.onchange = () => { M.fonts = { ...M.fonts, [key]: s.value || null }; markaKaydet(); }; return s; };
  box.append(el('div', { className: 'f' }, el('span', { textContent: 'Başlık fontu' }), fsec('baslik')), el('div', { className: 'f' }, el('span', { textContent: 'Metin fontu' }), fsec('metin')));
  const uyg = el('button', { type: 'button', className: 'btn tam', textContent: 'Marka fontlarını bu posta uygula' });
  uyg.onclick = () => { const p = E.post(), b = M.fonts?.baslik, m = M.fonts?.metin;
    if (!b && !m) return E.toast('Önce marka fontu seç');
    ['headline', 'tag', 'brand'].forEach(k => { if (b) p[k].font = b; }); ['sub', 'cta'].forEach(k => { if (m) p[k].font = m; });
    (p.texts || []).forEach(t => { const f = t.size >= 60 ? b : m; if (f) t.font = f; });
    Promise.all([b, m].filter(Boolean).flatMap(f => [400, 700, 800].map(w => document.fonts.load(`${w} 40px '${f}'`).catch(() => {}))))
      .then(() => { E.commit(true); E.renderAll(); E.toast('Marka fontları uygulandı', { label: 'Geri al', fn: E.undo }); }); };
  box.append(uyg);
  const logolar = el('div', { className: 'marka-logo' });
  M.logos.forEach((l, i) => { const b = el('button', { type: 'button', title: `${l.name} — eklemek için tıkla` }); b.style.backgroundImage = `url('${l.src}')`;
    b.setAttribute('aria-label', `${l.name} logosunu ekle`); b.onclick = () => gorselEkle(l.src, l.name);
    b.oncontextmenu = e => { e.preventDefault(); M.logos.splice(i, 1); markaKaydet().then(yenile); }; logolar.append(b); });
  const up = el('label', { className: 'btn tam', innerHTML: 'Logo yükle<input type="file" accept="image/png,image/webp,image/jpeg" hidden>' });
  up.querySelector('input').onchange = async e => { const file = e.target.files[0]; if (!file) return;
    try { const data = await new Promise((ok, no) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = no; fr.readAsDataURL(file); });
      const src = await E.uploadPhoto(file.size < 3e6 ? data : await E.shrink(file)); M.logos.push({ src, name: file.name.replace(/\.[^.]+$/, '') }); await markaKaydet(); yenile(); }
    catch (err) { if (err?.message) E.toast(err.message); } };
  box.append(el('h4', { textContent: 'Logolar' }), logolar, up, el('p', { className: 'tip', textContent: 'Saydam PNG önerilir. Logoyu kaldırmak için sağ tıkla.' }));
}

function yenile() {
  const P = $('#addPane'); if (P.hidden) return;
  const top = P.scrollTop; P.innerHTML = ''; const box = el('div', { className: 'ekle' }); P.append(box);
  [sekillerHTML, metinHTML, gorselHTML, ikonHTML, markaHTML].forEach(f => f(box));
  P.scrollTop = top;
}
document.addEventListener('editor:tab', e => { if (e.detail === 'add') yenile(); });

/* ---------- seçili görsel için AI araçları (Düzenle sekmesi) ---------- */
// Gemini saydam görsel üretmiyor: ürünü düz yeşil zemine alıyor, yeşil burada silinip saydam WebP'ye çevriliyor
async function yesiliSil(src) {
  const im = await new Promise((ok, no) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = () => no(new Error('Görsel açılamadı.')); i.src = src; });
  const k = Math.min(1, 1800 / Math.max(im.naturalWidth, im.naturalHeight));
  const cv = el('canvas', { width: Math.round(im.naturalWidth * k), height: Math.round(im.naturalHeight * k) }), x = cv.getContext('2d', { willReadFrequently: true });
  x.drawImage(im, 0, 0, cv.width, cv.height);
  const d = x.getImageData(0, 0, cv.width, cv.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    const r = p[i], g = p[i + 1], b = p[i + 2], fark = g - Math.max(r, b);
    if (fark > 70) p[i + 3] = 0;
    else if (fark > 20) { p[i + 3] = Math.round(255 * (1 - (fark - 20) / 50)); p[i + 1] = Math.max(r, b); }
    else if (fark > 0) p[i + 1] = Math.max(r, b) + fark / 3;  // kenardaki yeşil yansımayı bastır
  }
  x.putImageData(d, 0, 0);
  return cv.toDataURL('image/webp', .92);
}
window.__editorHooks = {
  imageTools(k, add) {
    const o = E.objOf(E.post(), k); if (!o) return;
    const g = el('div', { className: 'group' }); g.append(el('h4', { textContent: 'AI ile görsel' }));
    if (!yetenek.gemini) { g.append(eksik('Görseli AI ile düzenleme', 'GEMINI_API_KEY')); add(g); return; }
    const d = durumKutusu(); d.hidden = true;
    const calis = async (body, sonra) => { d.hidden = false; d.querySelector('span').textContent = 'Başlatılıyor…';
      try { const { id } = await call('/ai/duzenle', { method: 'POST', body: { ...body, src: E.objOf(E.post(), k)?.src } });
        const r = await isBekle(id, (st, sn) => { d.querySelector('span').textContent = `${st} · ${sn} sn`; });
        const yeni = sonra ? await sonra(r.src) : r.src, it = E.objOf(E.post(), k); if (!it) return;
        it.src = yeni; E.commit(true); E.renderProps(); E.toast('Görsel güncellendi', { label: 'Geri al', fn: E.undo }); }
      catch (e) { E.toast(e.message); } finally { d.hidden = true; } };
    const kaldir = el('button', { type: 'button', className: 'btn tam', textContent: 'Arka planı kaldır' });
    kaldir.onclick = () => calis({ kip: 'arkaplan' }, async src => E.uploadPhoto(await yesiliSil(src)));
    const t = el('input', { type: 'text', placeholder: 'ör. arka planı beyaz stüdyo yap, ışığı ısıt' }); t.setAttribute('aria-label', 'Görselde ne değişsin');
    const git = el('button', { type: 'button', className: 'btn', textContent: 'Uygula' });
    git.onclick = () => { if (t.value.trim().length < 3) return E.toast('Görselde ne değişeceğini yaz'); calis({ prompt: t.value }); };
    g.append(kaldir, el('div', { className: 'satir', style: 'margin-top:8px' }, t, git), d,
      el('p', { className: 'tip', textContent: 'Gemini ile, işlem başına yaklaşık 5 sent. Eski hâline Geri al ile dönebilirsin.' }));
    add(g);
  },
};

(async () => {
  try { yetenek = await call('/yetenekler'); } catch (_) {}
  await markaYukle();
  E.renderProps();
})();
})();
