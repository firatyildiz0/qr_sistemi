/* Instagram'da paylaş: geçerli postu feed (1080×1350) JPEG olarak çizer, sunucuya (instagram.js) gönderir.
   Paylaşılan post ikinci kez paylaşılamaz; Instagram'dan silindiği fark edilince (sayfa açılışı, sekmeye dönüş) yeniden paylaşılabilir. */
(() => {
const E = window.__editorApi, $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ig = { status: null, records: {}, busy: false, postId: null, lastSync: 0 };
const rec = id => ig.records[id];

async function call(url, opts) {
  let r;
  try { r = await fetch(url, opts); } catch (_) { throw new Error('Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.'); }
  const j = await r.json().catch(() => ({}));
  if (j.records) ig.records = j.records;
  if (!r.ok) throw Object.assign(new Error(r.status === 401 ? 'Oturumun kapanmış. Sayfayı yenileyip yeniden giriş yap.' : j.error || 'İstek başarısız.'), { status: r.status });
  return j;
}
async function loadStatus() {
  try { ig.status = await call('/api/post-editoru/ig/status'); } catch (e) { ig.status = { ready: false, error: e.message }; }
  paint();
}
// Instagram'dan silinen postları yakala (en fazla 20 sn'de bir)
async function sync() {
  if (!ig.status?.ready || Date.now() - ig.lastSync < 20000) return;
  ig.lastSync = Date.now();
  const before = Object.keys(ig.records).length;
  try { await call('/api/post-editoru/ig/sync', { method: 'POST' }); } catch (_) { return; }
  if (Object.keys(ig.records).length < before) E.toast('Instagram\'dan silinen post fark edildi; yeniden paylaşabilirsin');
  paint();
}

/* ---------- üst çubuk düğmesi ve listedeki "Paylaşıldı" rozetleri ---------- */
function paint() {
  const p = E.post(); if (!p) return;
  const r = rec(p.id), b = $('#igBtn'), a = $('#igOpen');
  b.classList.toggle('shared', !!r); b.setAttribute('aria-disabled', !!r);
  b.querySelector('span').textContent = ig.busy && ig.postId === p.id ? 'Paylaşılıyor…' : r ? 'Paylaşıldı' : 'Instagram\'da paylaş';
  b.title = r ? 'Bu post Instagram\'da paylaşıldı. Instagram\'dan silersen yeniden paylaşabilirsin.' : 'Bu postu feed (4:5) olarak Instagram\'da paylaş';
  a.hidden = !(r && r.permalink); if (r?.permalink) a.href = r.permalink;
  const posts = window.__editor.state.posts;
  document.querySelectorAll('#plist .pitem').forEach((li, i) => {
    const on = !!(posts[i] && rec(posts[i].id)), badge = li.querySelector('.igbadge');
    if (on && !badge) li.querySelector('.pthumb')?.append(Object.assign(document.createElement('span'), { className: 'igbadge', textContent: 'Paylaşıldı' }));
    if (!on && badge) badge.remove();
  });
}
// post seçimi ve liste yeniden çizimi app.js'te; değişiklikleri listeyi izleyerek yakala
new MutationObserver(() => paint()).observe($('#plist'), { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-current'] });

/* ---------- paylaşım penceresi ---------- */
const dlg = $('#igDlg');
const show = view => ['igSetup', 'igForm1', 'igRun', 'igDone'].forEach(id => { $('#' + id).hidden = id !== view; });
const error = msg => { $('#igErr').textContent = msg || ''; $('#igErr').hidden = !msg; };
function footer(view) {
  $('#igGo').hidden = view !== 'form'; $('#igCancel').textContent = view === 'form' || view === 'setup' ? 'Vazgeç' : 'Kapat';
  $('#igCancel').disabled = view === 'run';
}
async function open() {
  const p = E.post(); if (!p || ig.busy) return;
  if (rec(p.id)) {
    // Instagram'dan yeni silinmiş olabilir: önce denetle
    ig.lastSync = 0; await sync();
    const r = rec(p.id);
    if (r) return E.toast('Bu post zaten paylaşıldı. Instagram\'dan silersen yeniden paylaşabilirsin.', r.permalink ? { label: 'Instagram\'da aç', fn: () => window.open(r.permalink, '_blank', 'noopener') } : null);
  }
  ig.postId = p.id; error('');
  if (!ig.status?.ready) {
    $('#igSetupMsg').innerHTML = ig.status?.missing?.length
      ? `Instagram bağlantısı henüz kurulmadı. Vercel ortam değişkenlerinde eksik: ${ig.status.missing.map(esc).join(', ')}.`
      : esc(ig.status?.error || 'Instagram bağlantısı kurulamadı.');
    show('igSetup'); footer('setup'); dlg.showModal(); return;
  }
  $('#igAcc').textContent = '@' + ig.status.username;
  const cap = $('#igCaption'); cap.value = p.caption || ''; E.capReport($('#igCapChk'), cap.value);
  $('#igPrev').removeAttribute('src'); $('#igPrev').alt = 'Önizleme hazırlanıyor';
  show('igForm1'); footer('form'); dlg.showModal(); cap.focus();
  try { ig.jpeg = (await E.drawPost(p, 'feed', false)).toDataURL('image/jpeg', .92); $('#igPrev').src = ig.jpeg; $('#igPrev').alt = 'Paylaşılacak görsel'; }
  catch (e) { console.error(e); error('Görsel çizilemedi. Sayfayı yenileyip tekrar dene.'); $('#igGo').disabled = true; }
}
$('#igCaption').oninput = () => { E.capReport($('#igCapChk'), $('#igCaption').value); E.setCaption(ig.postId, $('#igCaption').value); };

async function share() {
  const id = ig.postId; if (ig.busy || !id || !ig.jpeg) return;
  // Instagram'ın reddedeceği açıklama gönderilmez: önce otomatik düzelt, hâlâ hata varsa durdur
  const raw = $('#igCaption').value, caption = raw.trim() ? Caption.fix(raw) : '';
  if (caption !== raw) { $('#igCaption').value = caption; E.setCaption(id, caption); }
  const errs = Caption.analyze(caption).issues.filter(i => i.level === 'error');
  E.capReport($('#igCapChk'), caption);
  if (errs.length) return error(errs.map(i => i.msg).join(' '));
  ig.busy = true; error(''); show('igRun'); footer('run'); paint();
  try {
    const { record } = await call('/api/post-editoru/ig/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId: id, image: ig.jpeg, caption }) });
    $('#igLink').hidden = !record.permalink; $('#igLink').href = record.permalink || '#';
    show('igDone'); footer('done');
    if (!dlg.open) E.toast('Post Instagram\'da paylaşıldı');
  } catch (e) {
    show('igForm1'); footer('form'); error(e.message);
    if (!dlg.open) E.toast('Instagram paylaşımı başarısız oldu');
  } finally { ig.busy = false; paint(); }
}

$('#igBtn').onclick = open;
$('#igForm').onsubmit = e => { e.preventDefault(); share(); };
$('#igClose').onclick = $('#igCancel').onclick = () => { if (!ig.busy) dlg.close(); };
dlg.addEventListener('cancel', e => { if (ig.busy) e.preventDefault(); });
dlg.addEventListener('close', () => { $('#igGo').disabled = false; ig.jpeg = null; });
// kullanıcı Instagram'dan postu silip editöre döndüğünde yakala
window.addEventListener('focus', sync);
document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
loadStatus();
})();
