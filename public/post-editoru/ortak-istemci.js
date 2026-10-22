/* Ortak çalışma bağlantısı (tarayıcı). Yönetim panelinde WebSocket yok: değişiklikler /api/post-editoru/ortak'a POST
   edilir, başkalarınınki aynı uçtan ~1 sn'de bir yoklanır. Arayüz (Ortak.on/connect/send/resend/seed/move) eski WebSocket
   istemcisiyle aynı; app.js'in ortak çalışma mantığı değişmedi.
   Sıra kuralı eskisiyle aynı: aynı alana iki kişi yazarsa sunucuya son ulaşan kazanır. Kendi onaylanmamış alanlarımıza ve
   sunucuda bizimkinden ÖNCE yazılmış ama yoklamada bizim onayımızdan sonra gelen değişikliklere dokunulmaz — WebSocket bu
   sırayı kendiliğinden koruyordu, yoklamada onay ile başkasının değişikliği ters sırada gelebiliyor. */
(() => {
const API = '/api/post-editoru/ortak', POLL_MS = 1100;
const H = {}; let cid = null, seq = 0, rev = 0, alive = false, closed = true, sending = false, tries = 0, pollT = null, at = null, yetkisiz = 0;
const pending = [];   // { seq, ops, sent } — onay bekleyen (sent: false ise henüz gönderilmedi)
const mine = [];      // { rev, ops } — onaylanmış kendi işlemlerimiz; yoklama o reve ulaşınca düşer
let people = new Map();
const emit = (n, ...a) => H[n]?.(...a);
const newCid = () => [...crypto.getRandomValues(new Uint8Array(6))].map(b => b.toString(16).padStart(2, '0')).join('');

const touches = (o, op) => op.k === 'set' ? o.k === 'set' && o.id === op.id && OrtakOps.overlaps(o.path, op.path)
  : op.k === 'order' ? o.k === 'order' || o.k === 'add' || o.k === 'del' : false;
// r: uzak işlemin sunucudaki sırası. Bekleyen ya da sunucuda ondan sonra yazılmış kendi işlemimiz varsa uygulanmaz.
const blockedBy = (op, r) => pending.some(p => p.ops.some(o => touches(o, op))) || mine.some(m => m.rev > r && m.ops.some(o => touches(o, op)));

async function call(method, { query, body } = {}) {
  const u = new URL(API, location.href);
  Object.entries(query || {}).forEach(([k, v]) => { if (v != null) u.searchParams.set(k, v); });
  const r = await fetch(u, { method, cache: 'no-store', keepalive: method === 'POST' && JSON.stringify(body || {}).length < 6e4,
    headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  // kimlik kontrolü Supabase'e anlık ulaşamayınca da 401 dönebiliyor: art arda ikinci 401'de girişe gönder
  if (r.status === 401) {
    if (++yetkisiz >= 2) { closed = true; location.href = '/login?next=' + encodeURIComponent('/yonetim/post-editoru'); }
    throw Object.assign(new Error('Oturum doğrulanamadı'), { status: 503 });
  }
  yetkisiz = 0;
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || 'İstek başarısız.'), { status: r.status });
  return j;
}

function setPeople(list) {
  const next = new Map(list.filter(p => p.cid !== cid).map(p => [p.cid, p]));
  if (!alive) { people = next; return; }
  people.forEach((p, id) => { if (!next.has(id)) emit('leave', id); });
  next.forEach((p, id) => {
    const was = people.get(id);
    if (!was) emit('join', { ...p, at: null });
    if (JSON.stringify(was?.at ?? null) !== JSON.stringify(p.at ?? null) && p.at) emit('move', id, p.at);
  });
  people = next;
}

function lost() {
  if (closed) return;
  const was = alive; alive = false; clearTimeout(pollT);
  pending.forEach(p => { p.sent = false; });
  if (was) { people.clear(); emit('status', 'kopuk'); }
  setTimeout(() => { if (!closed) start(); }, Math.min(15000, 600 * 2 ** tries++));
}

// ilk bağlantı ve kopmadan sonra: tam liste; henüz onaylanmamış işlemler app.js'e geri verilir, o da yeniden gönderir
async function start() {
  if (closed) return;
  emit('status', tries ? 'baglaniyor' : 'ilk');
  let j;
  try { j = await call('GET', { query: { cid, konum: at ? JSON.stringify(at) : null } }); } catch (_) { return lost(); }
  tries = 0; rev = j.rev; mine.length = 0; alive = true;
  people = new Map();
  emit('status', 'bagli');
  emit('welcome', { cid, me: j.me, data: j.data, people: j.people.filter(p => p.cid !== cid), canli: null }, pending.flatMap(p => p.ops));
  people = new Map(j.people.filter(p => p.cid !== cid).map(p => [p.cid, p]));
  schedule();
}

function schedule() { clearTimeout(pollT); if (!closed && alive) pollT = setTimeout(poll, document.hidden ? POLL_MS * 4 : POLL_MS); }

async function poll() {
  if (closed || !alive) return;
  let j;
  try { j = await call('GET', { query: { cid, since: rev, konum: at ? JSON.stringify(at) : null } }); } catch (_) { return lost(); }
  if (j.data) {
    // arada budanmış kayıt var: tam listeye dön (yeniden bağlanmış gibi)
    rev = j.rev; mine.length = 0;
    emit('welcome', { cid, me: j.me, data: j.data, people: j.people.filter(p => p.cid !== cid), canli: null }, pending.flatMap(p => p.ops));
  } else {
    for (const e of j.log) {
      if (e.cid === cid) continue;
      const ops = e.ops.filter(o => !blockedBy(o, e.rev));
      if (ops.length) emit('ops', ops, e.by);
    }
    rev = Math.max(rev, j.rev);
    for (let i = mine.length - 1; i >= 0; i--) if (mine[i].rev <= rev) mine.splice(i, 1);
  }
  setPeople(j.people);
  schedule();
}

// bekleyenleri tek istekte gönderir; yanıt gelmeden yazılanlar bir sonraki istekte gider
async function flush() {
  if (sending || !alive || closed) return;
  const batch = pending.filter(p => !p.sent);
  if (!batch.length) return;
  batch.forEach(p => { p.sent = true; });
  sending = true;
  try {
    const last = batch[batch.length - 1].seq;
    const j = await call('POST', { body: { cid, seq: last, ops: batch.flatMap(p => p.ops) } });
    const i = pending.findIndex(p => p.seq === last); if (i >= 0) pending.splice(0, i + 1);
    if (j.rev > rev) mine.push({ rev: j.rev, ops: j.ops });
    emit('acked', pending.length);
    // sunucunun eklediği kesin sıra kendimize de uygulanır
    const order = j.ops.filter(o => o.k === 'order' && !pending.some(p => p.ops.some(x => touches(x, o))));
    if (order.length) emit('ops', order, null);
  } catch (e) {
    if (e.status && e.status < 500) { batch.forEach(p => { const k = pending.indexOf(p); if (k >= 0) pending.splice(k, 1); }); emit('error', e.message); emit('acked', pending.length); }
    else { sending = false; return lost(); }
  }
  sending = false;
  flush();
}

window.Ortak = {
  on(handlers) { Object.assign(H, handlers); return this; },
  connect() { closed = false; cid ||= newCid(); start(); },
  close() { closed = true; clearTimeout(pollT); },
  get online() { return alive; },
  get cid() { return cid; },
  get pending() { return pending.length; },
  send(ops) { if (!ops.length) return; pending.push({ seq: ++seq, ops, sent: false }); flush(); },
  // yeniden bağlanınca: onaylanmamışlar baştan gönderilir (işlemler tekrar uygulanabilir: aynı sonucu verir)
  resend() { pending.forEach(p => { p.sent = false; }); flush(); },
  async seed(data) {
    try {
      const j = await call('POST', { body: { cid, t: 'tohum', posts: data.posts, uploads: data.uploads } });
      if (j.data) { rev = j.rev; emit('state', j.data); } else emit('wait');
    } catch (e) { emit('error', e.message); }
  },
  // imleç ve seçim bir sonraki yoklamayla gider
  move(next) { at = next; },
};
})();
