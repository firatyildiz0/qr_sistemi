// Instagram açıklama kuralları: AI yazımı (ai.js, sunucu) ve editördeki canlı denetim (app.js, tarayıcı) aynı kuralları kullanır.
// Sınırlar: Instagram Yardım Merkezi — gönderi/Reels başına en fazla 5 hashtag (Aralık 2025'ten beri; ilk yorumdakiler de sayılır),
// açıklama en fazla 2.200 karakter, en fazla 20 @bahsetme. Akışta ilk ~125 karakter "… devamı" demeden görünür.
(function (root) {
  const LIMITS = { chars: 2200, tags: 5, mentions: 20, fold: 125, emojis: 4 };
  const TAG_RE = /(^|[^\p{L}\p{N}_&#])#([\p{L}\p{N}_]+)/gu;
  const MENTION_RE = /(^|[^\p{L}\p{N}_.@])@([A-Za-z0-9_.]{2,30})/g;
  const URL_RE = /\bhttps?:\/\/\S+|\bwww\.\S+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|app|net|org|io|co|tr|me|link)\b(?:\/\S*)?/i;
  const EMOJI_RE = /\p{Extended_Pictographic}/gu;
  // Instagram'ın önerilerde geri plana ittiği "etkileşim dilenciliği" kalıpları
  const BAIT_RE = /arkadaş(?:ın|ını|larını)\s+etiketle|beğen(?:ip|in|meyi\s+unutma)\b.{0,20}paylaş|kaydet(?:in)?\s+ve\s+paylaş|çekiliş|takip\s+et(?:in)?\s+kazan/i;

  const tagsOf = t => [...String(t).matchAll(TAG_RE)].map(m => m[2]);
  const isTagLine = line => line.trim() !== '' && line.replace(TAG_RE, '$1').trim() === '';
  const len = t => [...String(t)].length;   // emoji tek karakter sayılsın

  // Akışta "… devamı"dan önce görünen kısım: ilk satır, en fazla 125 karakter.
  function hook(text) {
    const first = String(text).trim().split('\n')[0].trim();
    return { text: first, long: len(first) > LIMITS.fold };
  }

  function analyze(text) {
    text = String(text ?? '');
    const tags = tagsOf(text), lower = tags.map(t => t.toLocaleLowerCase('tr'));
    const dupes = [...new Set(lower.filter((t, i) => lower.indexOf(t) !== i))];
    const mentions = [...text.matchAll(MENTION_RE)].length;
    const emojis = (text.match(EMOJI_RE) || []).length;
    const lines = text.trim().split('\n');
    const lastBody = lines.findLastIndex(l => l.trim() && !isTagLine(l));
    const inline = lines.slice(0, lastBody + 1).some(l => tagsOf(l).length);
    const h = hook(text), issues = [];
    const add = (level, code, msg) => issues.push({ level, code, msg });

    if (!text.trim()) return { chars: 0, tags, mentions, emojis, hook: h, issues: [{ level: 'warn', code: 'empty', msg: 'Açıklama boş.' }] };
    if (len(text) > LIMITS.chars) add('error', 'chars', `Açıklama ${len(text)} karakter; Instagram en fazla ${LIMITS.chars} kabul eder.`);
    if (tags.length > LIMITS.tags) add('error', 'tags', `${tags.length} hashtag var; Instagram en fazla ${LIMITS.tags} kabul eder, fazlası paylaşımı engeller.`);
    if (mentions > LIMITS.mentions) add('error', 'mentions', `${mentions} @bahsetme var; en fazla ${LIMITS.mentions} olabilir.`);
    if (dupes.length) add('warn', 'dupes', `Tekrarlanan hashtag: ${dupes.map(t => '#' + t).join(', ')}.`);
    if (/\*/.test(text)) add('warn', 'stars', 'Yıldız (*) var; Instagram kalın yazı göstermez, yıldızlar olduğu gibi görünür.');
    if (URL_RE.test(text)) add('warn', 'link', 'Açıklamadaki bağlantılar tıklanmaz; "profilimizdeki bağlantı" deyin.');
    if (!tags.length) add('warn', 'notags', 'Hiç hashtag yok; sonda 3-5 konuya özel hashtag keşfedilmeye yardım eder.');
    if (inline) add('warn', 'inline', 'Hashtag\'ler metnin içinde; okunurluk için hepsini son satıra taşıyın.');
    if (h.long) add('warn', 'hook', `İlk satır ${len(h.text)} karakter; akışta ~${LIMITS.fold} karakterden sonrası "… devamı" ile kesilir.`);
    if (emojis > LIMITS.emojis) add('warn', 'emojis', `${emojis} emoji var; B2B tonda en fazla ${LIMITS.emojis} yeterli.`);
    if (BAIT_RE.test(text)) add('warn', 'bait', '"Arkadaşını etiketle / beğen ve paylaş" gibi etkileşim çağrıları Instagram önerilerinde erişimi düşürür.');
    return { chars: len(text), tags, mentions, emojis, hook: h, issues };
  }

  // Otomatik düzeltilebilenleri düzeltir: yıldızlar, tekrar eden ve 5'i aşan hashtag'ler, satır içi hashtag'ler, 2.200 sınırı.
  function fix(text) {
    let t = String(text ?? '').replace(/\r\n?/g, '\n').replace(/\*+/g, '').replace(/[ \t]+\n/g, '\n').trim();
    const keep = [], seen = new Set();
    // önce son satırdaki (asıl) hashtag'ler, sonra metin içindekiler
    const tagLines = t.split('\n').filter(isTagLine).join(' ');
    for (const tag of [...tagsOf(tagLines), ...tagsOf(t)]) {
      const k = tag.toLocaleLowerCase('tr');
      if (!seen.has(k) && keep.length < LIMITS.tags) { seen.add(k); keep.push(tag); }
    }
    // gövde: yalnızca hashtag'den oluşan satırlar ve satır sonundaki hashtag dizileri sona taşınır;
    // cümle içindeki hashtag kelime olarak kalır (# düşer)
    const body = t.split('\n').filter(l => !isTagLine(l)).map(l => l.replace(/(?:\s*#[\p{L}\p{N}_]+)+\s*$/u, '')).join('\n')
      .replace(TAG_RE, '$1$2').replace(/\n{3,}/g, '\n\n').trim();
    const tail = keep.map(x => '#' + x).join(' ');
    const room = LIMITS.chars - (tail ? len(tail) + 2 : 0);
    let b = body;
    if (len(b) > room) { b = [...b].slice(0, room - 1).join(''); b = b.slice(0, Math.max(b.lastIndexOf(' '), 0) || b.length).trimEnd() + '…'; }
    return tail ? `${b}\n\n${tail}` : b;
  }

  const api = { LIMITS, analyze, fix, hook, tagsOf };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.Caption = api;
})(typeof window !== 'undefined' ? window : globalThis);
