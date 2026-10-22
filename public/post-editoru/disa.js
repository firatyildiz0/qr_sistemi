/* Dışa aktarma ve Instagram'ın çoklu biçimleri: JPG, PDF (tüm postlar), animasyonlu MP4 (Reels olarak paylaşılabilir)
   ve carousel (2-10 post tek gönderide). Çizim app.js'in drawPost'u; video kareleri tarayıcıda WebCodecs ile H.264'e
   kodlanıp mp4-muxer ile MP4'e konuyor (sunucuya hiçbir şey çizdirilmiyor). */
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
const indir = (blob, ad) => { const a = el('a', { href: URL.createObjectURL(blob), download: ad }); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
const no = i => String(i + 1).padStart(2, '0');
function pencere(baslik, genis) {
  const d = el('dialog', { className: 'dlg' + (genis ? ' genis' : '') }), f = el('form'); f.method = 'dialog';
  const kapat = el('button', { type: 'button', className: 'btn icon ghost', innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>' });
  kapat.setAttribute('aria-label', 'Kapat'); kapat.onclick = () => { if (!d.dataset.mesgul) d.close(); };
  const body = el('div', { className: 'dbody' }), alt = el('footer'), err = el('p', { className: 'err', hidden: true }); err.setAttribute('role', 'alert');
  f.append(el('header', {}, el('h2', { textContent: baslik }), kapat), body, err, alt); d.append(f);
  d.addEventListener('cancel', e => { if (d.dataset.mesgul) e.preventDefault(); });
  d.addEventListener('close', () => d.remove()); document.body.append(d); d.showModal();
  return { d, body, alt, hata: m => { err.textContent = m || ''; err.hidden = !m; } };
}
const onizleme = (p, w, f = 'feed') => { const post = E.fixPost(E.clone(p)), [W, H] = E.SIZE[f], k = w / W; E.ensureLayout(post, f);
  const kutu = el('div', { className: 'on' }); kutu.style.cssText = `position:absolute;inset:0`;
  const ic = el('div', { innerHTML: E.postHTML(post, f) }); ic.style.transform = `scale(${k})`; kutu.append(ic); return kutu; };

/* ---------- JPG ve PDF ---------- */
async function jpg() {
  const i = E.state.current, f = E.fmt; E.toast('JPG hazırlanıyor');
  try { const cv = await E.drawPost(E.post(), f, false); indir(await new Promise(r => cv.toBlob(r, 'image/jpeg', .92)), `rentqr-${no(i)}-${f}.jpg`); E.toast('JPG indirildi'); }
  catch (e) { console.error(e); E.toast('JPG oluşturulamadı. Sayfayı yenileyip tekrar dene.'); }
}
async function pdf() {
  const f = E.fmt, [W, H] = E.SIZE[f], posts = E.state.posts;
  try {
    const doc = new window.jspdf.jsPDF({ orientation: W > H ? 'landscape' : 'portrait', unit: 'px', format: [W, H], hotfixes: ['px_scaling'], compress: true });
    for (let i = 0; i < posts.length; i++) {
      E.toast(`PDF hazırlanıyor ${i + 1}/${posts.length}`);
      const cv = await E.drawPost(posts[i], f, false);
      if (i) doc.addPage([W, H], W > H ? 'landscape' : 'portrait');
      doc.addImage(cv.toDataURL('image/jpeg', .9), 'JPEG', 0, 0, W, H, undefined, 'FAST');
    }
    indir(doc.output('blob'), `rentqr-postlar-${f}.pdf`); E.toast(`${posts.length} sayfalık PDF indirildi`);
  } catch (e) { console.error(e); E.toast('PDF oluşturulamadı. Sayfayı yenileyip tekrar dene.'); }
}

/* ---------- animasyonlu video ---------- */
// postun bir katmanını tam boyutta, saydam zeminde çizer; arka plan katmanı fotoğraf + karartma + çerçeve
async function katman(p, f, keys, zemin) {
  const [W, H] = E.SIZE[f], post = E.fixPost(E.clone(p)); post.order = keys; E.ensureLayout(post, f);
  const host = el('div'); host.style.cssText = 'position:fixed;left:-30000px;top:0;pointer-events:none';
  host.innerHTML = E.postHTML(post, f); document.body.append(host);
  try {
    const node = host.firstElementChild;
    if (!zemin) { node.querySelectorAll('.ph,.shade,.frame').forEach(n => n.remove()); node.style.background = 'transparent'; }
    const box = !zemin && keys[0] ? (() => { const r = node.querySelector(`[data-el="${keys[0]}"]`)?.getBoundingClientRect(), R = node.getBoundingClientRect();
      return r ? { x: r.left - R.left, y: r.top - R.top, w: r.width, h: r.height } : null; })() : null;
    const urls = [...host.innerHTML.matchAll(/url\('([^']+)'\)/g)].map(m => m[1]);
    await Promise.all(urls.map(u => new Promise(r => { const im = new Image(); im.onload = im.onerror = r; im.src = u; })));
    const fontEmbedCSS = await E.fontCSSFor(host.innerHTML);
    const cv = await htmlToImage.toCanvas(node, { width: W, height: H, pixelRatio: 1, canvasWidth: W, canvasHeight: H, fontEmbedCSS, backgroundColor: zemin ? undefined : 'rgba(0,0,0,0)' });
    return { cv, box };
  } finally { host.remove(); }
}
const ease = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const EFEKT = [['kay', 'Aşağıdan kayarak'], ['sol', 'Soldan kayarak'], ['buyu', 'Büyüyerek'], ['sol0', 'Yalnızca belirerek']];

async function videoUret(p, f, sure, efekt, ilerle) {
  if (!('VideoEncoder' in window)) throw new Error('Bu tarayıcı video kodlamayı desteklemiyor. Güncel Chrome ya da Edge kullan.');
  const [W, H] = E.SIZE[f], FPS = 30, N = Math.round(sure * FPS);
  const codecs = ['avc1.640028', 'avc1.4d0028', 'avc1.42e028'], cfg = { width: W, height: H, bitrate: 8_000_000, framerate: FPS };
  let codec = null; for (const c of codecs) { try { if ((await VideoEncoder.isConfigSupported({ ...cfg, codec: c })).supported) { codec = c; break; } } catch (_) {} }
  if (!codec) throw new Error('Bu bilgisayarda H.264 video kodlayıcı bulunamadı.');

  ilerle(0, 'Katmanlar hazırlanıyor');
  const keys = p.order.filter(k => { const post = E.fixPost(E.clone(p)); return k === 'headline' || /^[to]:/.test(k) ? !!E.objOf(post, k) : !!post[k]?.on; });
  const zemin = (await katman(p, f, [], true)).cv, ogeler = [];
  for (let i = 0; i < keys.length; i++) { ilerle(i / keys.length * .25, `Katman ${i + 1}/${keys.length}`); ogeler.push(await katman(p, f, [keys[i]], false)); }

  const muxer = new Mp4Muxer.Muxer({ target: new Mp4Muxer.ArrayBufferTarget(), video: { codec: 'avc', width: W, height: H }, fastStart: 'in-memory' });
  let hata = null;
  const enc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: e => { hata = e; } });
  enc.configure({ ...cfg, codec });
  const cv = el('canvas', { width: W, height: H }), x = cv.getContext('2d');
  const giris = Math.min(.5, sure * .06), aralik = Math.min(.35, (sure * .45) / Math.max(1, ogeler.length)), dur = .7;
  for (let i = 0; i < N; i++) {
    if (hata) throw hata;
    const t = i / FPS;
    x.clearRect(0, 0, W, H);
    // arka plan yavaşça yakınlaşır (Ken Burns)
    const z = 1 + .07 * (t / sure); x.save(); x.translate(W / 2, H / 2); x.scale(z, z); x.drawImage(zemin, -W / 2, -H / 2); x.restore();
    ogeler.forEach((o, j) => {
      const e = ease((t - giris - j * aralik) / dur); if (e <= 0) return;
      x.save(); x.globalAlpha = e;
      if (efekt === 'kay') x.translate(0, 70 * (1 - e));
      else if (efekt === 'sol') x.translate(-90 * (1 - e), 0);
      else if (efekt === 'buyu' && o.box) { const cx = o.box.x + o.box.w / 2, cy = o.box.y + o.box.h / 2, s = .82 + .18 * e; x.translate(cx, cy); x.scale(s, s); x.translate(-cx, -cy); }
      x.drawImage(o.cv, 0, 0); x.restore();
    });
    const vf = new VideoFrame(cv, { timestamp: Math.round(i * 1e6 / FPS), duration: Math.round(1e6 / FPS) });
    enc.encode(vf, { keyFrame: i % (FPS * 2) === 0 }); vf.close();
    if (enc.encodeQueueSize > 8) await new Promise(r => enc.addEventListener('dequeue', r, { once: true }));
    if (i % 10 === 0) { ilerle(.25 + .75 * i / N, `Kodlanıyor %${Math.round(i / N * 100)}`); await new Promise(r => setTimeout(r)); }
  }
  await enc.flush(); if (hata) throw hata;
  muxer.finalize(); enc.close();
  ilerle(1, 'Hazır');
  return new Blob([muxer.target.buffer], { type: 'video/mp4' });
}

async function igDurum() { try { return await call('/ig/status'); } catch (e) { return { ready: false, error: e.message }; } }

function videoPenceresi() {
  const p = E.post(), i = E.state.current, { d, body, alt, hata } = pencere(`Post ${i + 1} · animasyonlu video`);
  const fmt = el('select'); [['story', 'Story / Reels 9:16 (önerilen)'], ['feed', 'Feed 4:5'], ['kare', 'Kare 1:1'], ['yatay', 'Yatay 16:9']].forEach(([v, n]) => fmt.add(new Option(n, v, false, v === 'story')));
  const sure = el('select'); [6, 8, 10, 12, 15].forEach(s => sure.add(new Option(`${s} saniye`, s, false, s === 8)));
  const ef = el('select'); EFEKT.forEach(([v, n]) => ef.add(new Option(n, v)));
  const ayar = el('div', {}, el('div', { className: 'f' }, el('span', { textContent: 'Format' }), fmt), el('div', { className: 'f' }, el('span', { textContent: 'Süre' }), sure),
    el('div', { className: 'f' }, el('span', { textContent: 'Öğeler nasıl belirsin' }), ef));
  const bar = el('div', { className: 'ilerleme', innerHTML: '<i></i>' }), durum = el('p', { className: 'tip' }), on = el('div', { className: 'video-on' });
  bar.hidden = true;
  body.append(el('p', { className: 'tip', textContent: 'Öğeler katman sırasıyla belirir, arka plan yavaşça yakınlaşır. Video bu bilgisayarda üretilir; ses yok.' }), ayar, bar, durum, on);
  const uret = el('button', { type: 'button', className: 'btn primary', textContent: 'Videoyu üret' });
  const indirB = el('button', { type: 'button', className: 'btn', textContent: 'MP4 indir', hidden: true });
  const reelsB = el('button', { type: 'button', className: 'btn', textContent: "Reels olarak paylaş", hidden: true });
  alt.append(indirB, reelsB, uret);
  let blob = null;
  uret.onclick = async () => {
    hata(''); uret.disabled = true; d.dataset.mesgul = 1; bar.hidden = false; on.innerHTML = '';
    try { blob = await videoUret(p, fmt.value, +sure.value, ef.value, (k, m) => { bar.firstChild.style.width = Math.round(k * 100) + '%'; durum.textContent = m; });
      const v = el('video', { src: URL.createObjectURL(blob), controls: true, autoplay: true, loop: true, muted: true, playsInline: true });
      on.append(v, el('p', { className: 'tip', textContent: `${(blob.size / 1048576).toFixed(1)} MB · ${E.FMT_NAME[fmt.value]} · ${sure.value} sn` }));
      indirB.hidden = false; reelsB.hidden = false; uret.textContent = 'Yeniden üret'; }
    catch (e) { console.error(e); hata(e.message || 'Video üretilemedi.'); }
    finally { uret.disabled = false; delete d.dataset.mesgul; }
  };
  indirB.onclick = () => blob && indir(blob, `rentqr-${no(i)}-${fmt.value}.mp4`);
  reelsB.onclick = async () => {
    if (!blob) return; hata('');
    const st = await igDurum(); if (!st.ready) return hata(st.missing?.length ? `Instagram bağlantısı eksik: ${st.missing.join(', ')}` : st.error || 'Instagram bağlantısı kurulamadı.');
    const cap = p.caption || ''; if (!cap.trim() && !reelsB.dataset.emin) { reelsB.dataset.emin = 1; reelsB.textContent = 'Açıklama boş, yine de paylaş'; return; }
    reelsB.disabled = indirB.disabled = uret.disabled = true; d.dataset.mesgul = 1;
    try {
      durum.textContent = 'Video yükleniyor';
      const { signedUrl, publicUrl } = await call('/video/imza', { method: 'POST' });
      const fd = new FormData(); fd.append('cacheControl', '3600'); fd.append('', blob, 'video.mp4');
      const up = await fetch(signedUrl, { method: 'PUT', body: fd, headers: { 'x-upsert': 'false' } });
      if (!up.ok) throw new Error('Video yüklenemedi.');
      durum.textContent = "Instagram videoyu işliyor (1-3 dk). Pencereyi kapatma.";
      const { record } = await call('/ig/reels', { method: 'POST', body: { postId: p.id, videoUrl: publicUrl, caption: Caption.fix(cap) } });
      durum.innerHTML = `Reels paylaşıldı. ${record.permalink ? `<a href="${esc(record.permalink)}" target="_blank" rel="noopener">Instagram'da aç ↗</a>` : ''}`;
      reelsB.hidden = true;
    } catch (e) { hata(e.message); durum.textContent = ''; }
    finally { reelsB.disabled = indirB.disabled = uret.disabled = false; delete d.dataset.mesgul; }
  };
}

/* ---------- carousel ---------- */
function carouselPenceresi() {
  const { d, body, alt, hata } = pencere('Instagram carousel', true);
  const secili = [], g = el('div', { className: 'carousel-sec' }), cap = el('textarea', { rows: 5, placeholder: 'Carousel açıklaması' });
  const sira = () => g.querySelectorAll('label').forEach(l => { const k = secili.indexOf(l.dataset.id), em = l.querySelector('em');
    em.hidden = k < 0; em.textContent = k + 1; l.querySelector('input').checked = k >= 0; });
  E.state.posts.forEach((p, i) => {
    const l = el('label'); l.dataset.id = p.id; const c = el('input', { type: 'checkbox' }); c.setAttribute('aria-label', `Post ${i + 1}`);
    c.onchange = () => { const k = secili.indexOf(p.id); if (k >= 0) secili.splice(k, 1); else if (secili.length < 10) secili.push(p.id); else E.toast('En fazla 10 post');
      if (secili.length === 1 && !cap.value) cap.value = p.caption || ''; sira(); };
    l.append(c, el('em', { hidden: true }), onizleme(p, 90)); g.append(l);
  });
  const durum = el('p', { className: 'tip' });
  body.append(el('p', { className: 'tip', textContent: 'Postları paylaşılacak sırayla işaretle (2-10). Hepsi feed 4:5 olarak gider.' }), g,
    el('label', { className: 'f' }, el('span', { textContent: 'Açıklama' }), cap), durum);
  const git = el('button', { type: 'button', className: 'btn primary', textContent: 'Carousel olarak paylaş' }); alt.append(git);
  git.onclick = async () => {
    hata(''); if (secili.length < 2) return hata('En az 2 post seç.');
    const st = await igDurum(); if (!st.ready) return hata(st.missing?.length ? `Instagram bağlantısı eksik: ${st.missing.join(', ')}` : st.error || 'Instagram bağlantısı kurulamadı.');
    const caption = cap.value.trim() ? Caption.fix(cap.value) : '';
    const errs = Caption.analyze(caption).issues.filter(x => x.level === 'error'); if (errs.length) return hata(errs.map(x => x.msg).join(' '));
    git.disabled = true; d.dataset.mesgul = 1;
    try {
      const images = [];
      for (let j = 0; j < secili.length; j++) {
        durum.textContent = `Görseller hazırlanıyor ${j + 1}/${secili.length}`;
        const p = E.state.posts.find(x => x.id === secili[j]), cv = await E.drawPost(p, 'feed', false);
        images.push((await call('/yukle', { method: 'POST', body: { image: cv.toDataURL('image/jpeg', .92) } })).src);
      }
      durum.textContent = 'Instagram\'a gönderiliyor (genelde 20-60 sn)';
      const { record } = await call('/ig/carousel', { method: 'POST', body: { postIds: [...secili], images, caption } });
      durum.innerHTML = `Carousel paylaşıldı. ${record.permalink ? `<a href="${esc(record.permalink)}" target="_blank" rel="noopener">Instagram'da aç ↗</a>` : ''}`;
      git.hidden = true;
    } catch (e) { hata(e.message); durum.textContent = ''; }
    finally { git.disabled = false; delete d.dataset.mesgul; }
  };
}

/* ---------- bağlama ---------- */
document.querySelectorAll('[data-ex]').forEach(b => b.onclick = e => { e.stopPropagation(); E.closeMenus();
  ({ jpg, pdf, video: videoPenceresi })[b.dataset.ex](); });
const car = el('button', { type: 'button', className: 'btn ghost', id: 'carBtn', title: 'Birden çok postu tek Instagram gönderisinde paylaş',
  innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="12" height="16" rx="2"/><path d="M3 7v10M21 7v10"/></svg>Carousel' });
car.setAttribute('aria-haspopup', 'dialog'); car.onclick = carouselPenceresi;
$('#igBtn').before(car);
})();
