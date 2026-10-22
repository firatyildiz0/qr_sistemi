// Ortak çalışma: post listesindeki değişiklikleri küçük işlemlere (op) çevirir ve uygular. Sunucu (ortak.js) ve tarayıcı (app.js) aynı kodu kullanır.
// İşlemler:
//   { k: 'set', id, path: 'headline.text', v }   postun bir alanı (yaprak ya da bütün dizi) değişti
//   { k: 'set', id, path, d: 1 }                  alan silindi
//   { k: 'add', post, at }                        post eklendi (at: sıra)
//   { k: 'del', id }                              post silindi
//   { k: 'order', ids }                           postların sırası
//   { k: 'upl', item }                            "Yüklediklerin"e fotoğraf eklendi
// Aynı alana iki kişi aynı anda yazarsa sunucuya son ulaşan kazanır.
(function (root) {
  const BAD = new Set(['__proto__', 'prototype', 'constructor']);
  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
  const same = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b);
  const okPath = p => typeof p === 'string' && p.length > 0 && p.length < 200 && p.split('.').every(k => k && !BAD.has(k));

  // a → b farkı (yalnızca posts ve uploads ortaktır; seçili post, format vb. kişiseldir)
  function diff(a, b) {
    const ops = [], A = a.posts || [], B = b.posts || [];
    const byA = new Map(A.map(p => [p.id, p])), byB = new Map(B.map(p => [p.id, p]));
    A.forEach(p => { if (!byB.has(p.id)) ops.push({ k: 'del', id: p.id }); });
    B.forEach((p, i) => {
      const old = byA.get(p.id);
      if (!old) ops.push({ k: 'add', post: p, at: i });
      else walk(old, p, '', (path, v, del) => ops.push(del ? { k: 'set', id: p.id, path, d: 1 } : { k: 'set', id: p.id, path, v }));
    });
    const keep = A.filter(p => byB.has(p.id)).map(p => p.id), now = B.filter(p => byA.has(p.id)).map(p => p.id);
    if (ops.some(o => o.k === 'add' || o.k === 'del') || !same(keep, now)) ops.push({ k: 'order', ids: B.map(p => p.id) });
    const UA = new Set((a.uploads || []).map(u => u.src));
    (b.uploads || []).forEach(u => { if (!UA.has(u.src)) ops.push({ k: 'upl', item: u }); });
    return ops;
  }
  function walk(a, b, pre, out) {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const p = pre ? `${pre}.${k}` : k;
      if (!(k in b)) out(p, undefined, true);
      else if (isObj(a[k]) && isObj(b[k])) walk(a[k], b[k], p, out);
      else if (!same(a[k], b[k])) out(p, b[k] === undefined ? null : b[k]);
    }
  }

  function setPath(o, path, v, del) {
    const ks = path.split('.'), last = ks.pop();
    for (const k of ks) { if (!isObj(o[k])) { if (del) return; o[k] = {}; } o = o[k]; }
    if (del) delete o[last]; else o[last] = v;
  }

  // durum = { posts, uploads }; geçersiz işlemler sessizce atlanır. Değiştiyse true döner.
  function apply(s, op) {
    s.posts ||= []; s.uploads ||= [];
    const at = id => s.posts.findIndex(p => p.id === id);
    switch (op && op.k) {
      case 'set': { const i = at(op.id); if (i < 0 || !okPath(op.path)) return false;
        setPath(s.posts[i], op.path, JSON.parse(JSON.stringify(op.v ?? null)), !!op.d); return true; }
      case 'add': { if (!isObj(op.post) || typeof op.post.id !== 'string' || at(op.post.id) >= 0) return false;
        s.posts.splice(Math.max(0, Math.min(+op.at || 0, s.posts.length)), 0, JSON.parse(JSON.stringify(op.post))); return true; }
      case 'del': { const i = at(op.id); if (i < 0) return false; s.posts.splice(i, 1); return true; }
      case 'order': { if (!Array.isArray(op.ids)) return false;
        const pos = new Map(op.ids.map((id, i) => [id, i]));
        // listede olmayanlar (başkasının yeni eklediği) yerinde kalır, sona eklenir
        const before = s.posts.map(p => p.id).join();
        s.posts = s.posts.map((p, i) => [p, pos.has(p.id) ? pos.get(p.id) : op.ids.length + i]).sort((x, y) => x[1] - y[1]).map(x => x[0]);
        return s.posts.map(p => p.id).join() !== before; }
      case 'upl': { const it = op.item; if (!isObj(it) || typeof it.src !== 'string' || s.uploads.some(u => u.src === it.src)) return false;
        s.uploads.push({ src: it.src, name: String(it.name || '') }); return true; }
    }
    return false;
  }

  // iki yol çakışıyor mu (biri ötekinin atası ya da aynısı)
  const overlaps = (a, b) => a === b || a.startsWith(b + '.') || b.startsWith(a + '.');

  const api = { diff, apply, overlaps, okPath };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.OrtakOps = api;
})(typeof window !== 'undefined' ? window : globalThis);
