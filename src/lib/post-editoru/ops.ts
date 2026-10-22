/**
 * Post listesindeki değişiklikleri uygulayan işlemler — tarayıcıdaki
 * `public/post-editoru/ortak-ops.js`'in `apply` kısmının sunucu kopyası.
 * İkisi aynı kuralları uygulamalı: herkes aynı işlemleri aynı sırayla
 * uyguladığında aynı listeye varıyor. Birini değiştirirsen ötekini de değiştir.
 *
 *   { k: 'set', id, path: 'headline.text', v }   postun bir alanı değişti
 *   { k: 'set', id, path, d: 1 }                  alan silindi
 *   { k: 'add', post, at }                        post eklendi (at: sıra)
 *   { k: 'del', id }                              post silindi
 *   { k: 'order', ids }                           postların sırası
 *   { k: 'upl', item }                            "Yüklediklerin"e fotoğraf eklendi
 */

export type Post = { id: string } & Record<string, unknown>;
export type Upload = { src: string; name: string };
export type Durum = { posts: Post[]; uploads: Upload[] };
export type Op = {
  k?: unknown;
  id?: unknown;
  path?: unknown;
  v?: unknown;
  d?: unknown;
  post?: unknown;
  at?: unknown;
  ids?: unknown;
  item?: unknown;
};

const BAD = new Set(["__proto__", "prototype", "constructor"]);
const isObj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const okPath = (p: unknown): p is string =>
  typeof p === "string" && p.length > 0 && p.length < 200 && p.split(".").every((k) => k && !BAD.has(k));
const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v ?? null));

function setPath(o: Record<string, unknown>, path: string, v: unknown, del: boolean) {
  const ks = path.split(".");
  const last = ks.pop()!;
  for (const k of ks) {
    if (!isObj(o[k])) {
      if (del) return;
      o[k] = {};
    }
    o = o[k] as Record<string, unknown>;
  }
  if (del) delete o[last];
  else o[last] = v;
}

/** Geçersiz işlem sessizce atlanır. Durum değiştiyse true döner. */
export function apply(s: Durum, op: Op): boolean {
  const at = (id: unknown) => s.posts.findIndex((p) => p.id === id);
  switch (op?.k) {
    case "set": {
      const i = at(op.id);
      if (i < 0 || !okPath(op.path)) return false;
      setPath(s.posts[i], op.path, copy(op.v ?? null), !!op.d);
      return true;
    }
    case "add": {
      if (!isObj(op.post) || typeof op.post.id !== "string" || at(op.post.id) >= 0) return false;
      const pos = Math.max(0, Math.min(Number(op.at) || 0, s.posts.length));
      s.posts.splice(pos, 0, copy(op.post) as Post);
      return true;
    }
    case "del": {
      const i = at(op.id);
      if (i < 0) return false;
      s.posts.splice(i, 1);
      return true;
    }
    case "order": {
      if (!Array.isArray(op.ids)) return false;
      const list: unknown[] = op.ids;
      const pos = new Map(list.map((id, i) => [id, i]));
      const before = s.posts.map((p) => p.id).join();
      // listede olmayanlar (başkasının yeni eklediği) yerinde kalır, sona eklenir
      s.posts = s.posts
        .map((p, i) => [p, pos.has(p.id) ? pos.get(p.id)! : list.length + i] as const)
        .sort((x, y) => x[1] - y[1])
        .map((x) => x[0]);
      return s.posts.map((p) => p.id).join() !== before;
    }
    case "upl": {
      const it = op.item;
      if (!isObj(it) || typeof it.src !== "string" || s.uploads.some((u) => u.src === it.src)) return false;
      s.uploads.push({ src: it.src, name: String(it.name || "") });
      return true;
    }
  }
  return false;
}

/** Kayıttan gelen veriyi her zaman `{ posts, uploads }` biçimine getirir. */
export function durumOf(data: unknown): Durum | null {
  if (!isObj(data) || !Array.isArray(data.posts)) return null;
  return {
    posts: data.posts.filter((p): p is Post => isObj(p) && typeof p.id === "string"),
    uploads: Array.isArray(data.uploads) ? (data.uploads as Upload[]) : [],
  };
}
