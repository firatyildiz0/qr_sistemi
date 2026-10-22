/* Şablonlar (kaydet / şablondan başla), sürüm geçmişi (geri yükle) ve postlara yorum.
   Veri sunucuda (post_editoru_sablonlar, _surumler, _yorumlar); ekibin ortak kaydı. */
(() => {
const E = window.__editorApi, el = E.el, esc = E.esc, $ = s => document.querySelector(s);
const API = '/api/post-editoru';
async function call(path, opts = {}) {
  let r;
  try { r = await fetch(API + path, { ...opts, headers: opts.body ? { 'Content-Type': 'application/json' } : undefined, body: opts.body ? JSON.stringify(opts.body) : undefined }); }
  catch (_) { throw new Error('Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'İstek başarısız oldu.');
  return j;
}
const tarih = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
const zaman = s => { const d = (Date.now() - new Date(s)) / 1000;
  return d < 60 ? 'az önce' : d < 3600 ? `${Math.round(d / 60)} dk önce` : d < 86400 ? `${Math.round(d / 3600)} sa önce` : tarih.format(new Date(s)); };

// küçük önizleme: postu feed boyutunda çizip kutuya ölçekler
function onizleme(p, genislik) {
  const post = E.fixPost(E.clone(p)), [W, H] = E.SIZE.feed, k = genislik / W;
  E.ensureLayout(post, 'feed');
  const kutu = el('div', { className: 'on' }); kutu.style.cssText = `width:${genislik}px;height:${Math.round(H * k)}px`;
  const ic = el('div', { innerHTML: E.postHTML(post, 'feed') }); ic.style.transform = `scale(${k})`;
  kutu.append(ic); return kutu;
}
// pencere: başlık, gövde, alt düğmeler; kapanınca DOM'dan silinir
function pencere(baslik, genis) {
  const d = el('dialog', { className: 'dlg' + (genis ? ' genis' : '') });
  const f = el('form'); f.method = 'dialog';
  const kapat = el('button', { type: 'button', className: 'btn icon ghost', innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>' });
  kapat.setAttribute('aria-label', 'Kapat'); kapat.onclick = () => d.close();
  const body = el('div', { className: 'dbody' }), alt = el('footer');
  f.append(el('header', {}, el('h2', { textContent: baslik }), kapat), body, alt); d.append(f);
  d.addEventListener('close', () => d.remove()); document.body.append(d); d.showModal();
  return { d, body, alt };
}
const kimlikYenile = p => { const c = E.clone(p); c.id = E.nid(); delete c.origin; return c; };

/* ---------- şablonlar ---------- */
async function sablonlar() {
  const { d, body, alt } = pencere('Şablonlar', true);
  const ad = el('input', { type: 'text', maxLength: 80, value: (E.post().headline?.text || '').replace(/\*/g, '').slice(0, 60), placeholder: 'Şablonun adı' });
  ad.setAttribute('aria-label', 'Şablonun adı');
  const kaydet = el('button', { type: 'button', className: 'btn primary', textContent: 'Bu postu şablon olarak kaydet' });
  const kapat = el('button', { type: 'button', className: 'btn', textContent: 'Kapat' }); kapat.onclick = () => d.close();
  alt.className = 'satir'; alt.style.cssText = 'padding:14px 20px 18px';
  alt.append(ad, kaydet, kapat);
  const g = el('div', { className: 'sablon-grid' });
  body.append(el('p', { className: 'tip', textContent: 'Bir şablonu seçince kopyası yeni post olarak eklenir; şablon değişmez.' }), g);
  const kart = (ad, alt2, p, sil) => {
    const k = el('div', { className: 'sablon' }); k.append(onizleme(p, 150), el('b', { textContent: ad, title: ad }));
    if (alt2) k.append(el('small', { className: 'tip', textContent: alt2 }));
    const kullan = el('button', { type: 'button', className: 'btn', textContent: 'Kullan' });
    kullan.onclick = () => { E.pushPost(kimlikYenile(p)); d.close(); E.toast(`"${ad}" şablonundan yeni post eklendi`, { label: 'Geri al', fn: E.undo }); };
    const satir = el('div', { className: 'satir' }, kullan);
    if (sil) { const s = el('button', { type: 'button', className: 'btn', textContent: 'Sil' });
      s.onclick = async () => { if (!s.dataset.emin) { s.dataset.emin = 1; s.textContent = 'Emin misin?'; return; }
        try { await call('/sablonlar/' + encodeURIComponent(sil), { method: 'DELETE' }); k.remove(); } catch (e) { E.toast(e.message); } };
      satir.append(s); }
    k.append(satir); return k;
  };
  const ciz = async () => {
    g.innerHTML = '<p class="tip">Yükleniyor…</p>';
    let liste = []; try { liste = await call('/sablonlar'); } catch (e) { E.toast(e.message); }
    g.innerHTML = '';
    if (liste.length) { g.append(el('h4', { textContent: 'Kaydedilenler', style: 'grid-column:1/-1;margin:0' }));
      liste.forEach(s => g.append(kart(s.ad, `${s.kim || ''} · ${zaman(s.created_at)}`, s.post, s.id))); }
    g.append(el('h4', { textContent: 'Hazır tasarımlar', style: 'grid-column:1/-1;margin:8px 0 0' }));
    g.append(kart('Boş şablon', null, E.blankPost(), null));
    E.DEFAULTS().forEach((p, i) => g.append(kart(`Hazır tasarım ${i + 1}`, null, p, null)));
  };
  kaydet.onclick = async () => {
    if (!ad.value.trim()) { ad.focus(); return E.toast('Şablona bir ad ver'); }
    try { await call('/sablonlar', { method: 'POST', body: { ad: ad.value.trim(), post: E.post() } }); E.toast('Şablon kaydedildi'); ciz(); } catch (e) { E.toast(e.message); }
  };
  ciz();
}
const yeniMenu = document.querySelector('[data-new="sablon"]');
if (yeniMenu) yeniMenu.onclick = () => { E.closeMenus(); sablonlar(); };

/* ---------- sürüm geçmişi ---------- */
async function gecmis() {
  const { d, body, alt } = pencere('Sürüm geçmişi', true);
  const liste = el('div', { className: 'surum-liste' }), sag = el('div');
  body.append(el('p', { className: 'tip', textContent: 'Kayıt sırasında en fazla 10 dakikada bir anlık görüntü alınır. Bir postu yeni post olarak ya da bütün listeyi geri yükleyebilirsin.' }),
    el('div', { className: 'surum-ic' }, liste, sag));
  const kapat = el('button', { type: 'button', className: 'btn', textContent: 'Kapat' }); kapat.onclick = () => d.close(); alt.append(kapat);
  let surumler = [];
  try { surumler = await call('/surumler'); } catch (e) { E.toast(e.message); }
  if (!surumler.length) { liste.append(el('p', { className: 'tip', textContent: 'Henüz sürüm yok. İlk değişiklikten sonra alınacak.' })); return; }
  surumler.forEach(s => { const b = el('button', { type: 'button', innerHTML: `<span>${esc(zaman(s.at))}</span><small>${esc(s.kim || '')}</small>` });
    b.onclick = () => { [...liste.children].forEach(x => x.setAttribute('aria-pressed', x === b)); goster(s.id); }; liste.append(b); });
  async function goster(id) {
    sag.innerHTML = '<p class="tip">Yükleniyor…</p>';
    let s; try { s = await call('/surumler/' + id); } catch (e) { sag.innerHTML = ''; return E.toast(e.message); }
    sag.innerHTML = '';
    const tumu = el('button', { type: 'button', className: 'btn primary', textContent: 'Bütün listeyi bu sürüme döndür' });
    tumu.onclick = () => { if (!tumu.dataset.emin) { tumu.dataset.emin = 1; tumu.textContent = 'Emin misin? Şu anki liste bu sürümle değişecek'; return; }
      E.replacePosts(s.data.posts); d.close(); E.toast('Liste geri yüklendi', { label: 'Geri al', fn: E.undo }); };
    sag.append(el('p', { className: 'tip', textContent: `${tarih.format(new Date(s.at))} · ${s.kim || ''} · ${s.data.posts.length} post` }), tumu);
    const g = el('div', { className: 'sablon-grid', style: 'margin-top:12px' });
    s.data.posts.forEach((p, i) => { const k = el('div', { className: 'sablon' });
      const b = el('button', { type: 'button', className: 'btn', textContent: 'Yeni post olarak ekle' });
      b.onclick = () => { E.pushPost(kimlikYenile(p)); E.toast(`Sürümdeki Post ${i + 1} eklendi`, { label: 'Geri al', fn: E.undo }); };
      k.append(onizleme(p, 150), el('b', { textContent: `Post ${i + 1}` }), b); g.append(k); });
    sag.append(g);
  }
  liste.firstChild?.click();
}
$('#gecmisBtn').onclick = gecmis;

/* ---------- yorumlar ---------- */
const Y = { liste: [], postId: null, t: null, hepsi: [] };
async function yorumYukle() {
  const p = E.post(); if (!p) return;
  try { Y.hepsi = await call('/yorumlar'); } catch (_) {}
  const say = Y.hepsi.filter(y => !y.cozuldu).length, b = $('#yorumSay');
  b.hidden = !say; b.textContent = say;
  if ($('#yorumPane').hidden) return;
  try { Y.liste = await call('/yorumlar?post=' + encodeURIComponent(p.id)); Y.postId = p.id; } catch (e) { E.toast(e.message); }
  yorumCiz();
}
function yorumCiz() {
  const P = $('#yorumPane'), i = E.state.posts.findIndex(p => p.id === Y.postId);
  const odak = document.activeElement?.closest?.('.yorum-yaz') ? document.activeElement.value : null;
  P.innerHTML = '';
  P.append(el('h3', { textContent: `Post ${i + 1} yorumları` }), el('p', { className: 'desc', textContent: 'Ekip arkadaşına not bırak; çözülen yorumlar soluk görünür.' }));
  const yaz = el('div', { className: 'yorum-yaz' }), t = el('textarea', { placeholder: 'Yorum yaz…', maxLength: 2000 });
  t.setAttribute('aria-label', 'Yorum'); if (odak != null) t.value = odak;
  const gonder = el('button', { type: 'button', className: 'btn primary tam', textContent: 'Gönder' });
  gonder.onclick = async () => { if (!t.value.trim()) return; gonder.disabled = true;
    try { Y.liste = await call('/yorumlar', { method: 'POST', body: { post: Y.postId, metin: t.value } }); t.value = ''; yorumCiz(); yorumYukle(); }
    catch (e) { E.toast(e.message); } finally { gonder.disabled = false; } };
  t.onkeydown = e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) gonder.click(); };
  yaz.append(t, gonder); P.append(yaz);
  const L = el('div', { className: 'yorumlar' });
  if (!Y.liste.length) L.append(el('p', { className: 'tip', textContent: 'Bu postta yorum yok.' }));
  [...Y.liste].reverse().forEach(y => {
    const k = el('article', { className: 'yorum' + (y.cozuldu ? ' cozuldu' : '') });
    const bas = el('header', { innerHTML: `<i style="background:${/^#[0-9a-f]{6}$/i.test(y.renk) ? y.renk : '#d11414'}">${esc([...(y.ad || '?')][0].toLocaleUpperCase('tr'))}</i><b>${esc(y.ad)}</b><span>${esc(zaman(y.created_at))}</span>` });
    const coz = el('button', { type: 'button', textContent: y.cozuldu ? 'Yeniden aç' : 'Çözüldü' });
    coz.onclick = async () => { try { await call('/yorumlar/guncelle', { method: 'POST', body: { id: y.id, cozuldu: !y.cozuldu } }); yorumYukle(); } catch (e) { E.toast(e.message); } };
    const alt = el('footer', {}, coz);
    if (y.kullanici === E.live.me?.id) { const s = el('button', { type: 'button', textContent: 'Sil' });
      s.onclick = async () => { try { await call('/yorumlar/guncelle', { method: 'POST', body: { id: y.id, sil: true } }); yorumYukle(); } catch (e) { E.toast(e.message); } }; alt.append(s); }
    k.append(bas, el('p', { textContent: y.metin }), alt); L.append(k);
  });
  P.append(L);
  // başka postlardaki açık yorumlar
  const diger = Y.hepsi.filter(y => !y.cozuldu && y.post_id !== Y.postId);
  if (diger.length) {
    P.append(el('h3', { textContent: 'Diğer postlarda açık yorumlar' }));
    const by = new Map(); diger.forEach(y => by.set(y.post_id, (by.get(y.post_id) || 0) + 1));
    by.forEach((n, id) => { const j = E.state.posts.findIndex(p => p.id === id); if (j < 0) return;
      const b = el('button', { type: 'button', className: 'btn tam', textContent: `Post ${j + 1} · ${n} yorum` });
      b.onclick = () => { E.state.current = j; E.renderAll(); }; P.append(b); });
  }
}
document.addEventListener('editor:tab', e => { if (e.detail === 'yorum') yorumYukle(); });
document.addEventListener('editor:render', () => { if (E.post()?.id !== Y.postId && !$('#yorumPane').hidden) yorumYukle(); });
// açık yorum sayısı ve açık sekme yarım dakikada bir tazelenir
yorumYukle(); setInterval(() => { if (!document.hidden) yorumYukle(); }, 30000);
})();
