/**
 * Instagram açıklamasının otomatik düzeltilebilen kuralları — tarayıcıdaki
 * `public/post-editoru/caption.js`'in `fix` kısmının sunucu kopyası. AI'ın
 * yazdığı açıklama editöre bu süzgeçten geçip gidiyor; editördeki canlı denetim
 * aynı sınırları kullanıyor. Birini değiştirirsen ötekini de değiştir.
 *
 * Sınırlar (Instagram Yardım Merkezi): en fazla 5 hashtag, 2.200 karakter.
 */

const LIMITS = { chars: 2200, tags: 5 };
const TAG_RE = /(^|[^\p{L}\p{N}_&#])#([\p{L}\p{N}_]+)/gu;

const tagsOf = (t: string) => [...String(t).matchAll(TAG_RE)].map((m) => m[2]);
const isTagLine = (line: string) => line.trim() !== "" && line.replace(TAG_RE, "$1").trim() === "";
// emoji tek karakter sayılsın
const len = (t: string) => [...String(t)].length;

/** Yıldızları, tekrar eden ve 5'i aşan hashtag'leri, satır içi hashtag'leri ve 2.200 sınırını düzeltir. */
export function fixCaption(text: string): string {
  const t = String(text ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/\*+/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
  const keep: string[] = [];
  const seen = new Set<string>();
  // önce son satırdaki (asıl) hashtag'ler, sonra metin içindekiler
  const tagLines = t.split("\n").filter(isTagLine).join(" ");
  for (const tag of [...tagsOf(tagLines), ...tagsOf(t)]) {
    const k = tag.toLocaleLowerCase("tr");
    if (!seen.has(k) && keep.length < LIMITS.tags) {
      seen.add(k);
      keep.push(tag);
    }
  }
  // gövde: yalnızca hashtag'den oluşan satırlar ve satır sonundaki hashtag
  // dizileri sona taşınır; cümle içindeki hashtag kelime olarak kalır (# düşer)
  const body = t
    .split("\n")
    .filter((l) => !isTagLine(l))
    .map((l) => l.replace(/(?:\s*#[\p{L}\p{N}_]+)+\s*$/u, ""))
    .join("\n")
    .replace(TAG_RE, "$1$2")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const tail = keep.map((x) => "#" + x).join(" ");
  const room = LIMITS.chars - (tail ? len(tail) + 2 : 0);
  let b = body;
  if (len(b) > room) {
    b = [...b].slice(0, room - 1).join("");
    b = b.slice(0, Math.max(b.lastIndexOf(" "), 0) || b.length).trimEnd() + "…";
  }
  return tail ? `${b}\n\n${tail}` : b;
}
