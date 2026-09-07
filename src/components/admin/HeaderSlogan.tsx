"use client";

import { useEffect, useState } from "react";

/**
 * Mobil üst çubukta logonun yanındaki boşluğa yazılan söz. Üç-dört kelime:
 * çubuk dar, daha uzunu ya sığmaz ya da zilin üstüne biner.
 */
const SLOGANS = [
  "Her varlık kayıt altında",
  "Kontrol artık sende",
  "Envanterin hep cebinde",
  "Tek okutma yeter artık",
  "Düzen zaman kazandırır",
  "Kirala, takip et, kazan",
  "Sayım günü artık kolay",
  "Her şey tam yerinde",
  "Bugün de düzen kazansın",
  "Kaybolan varlık kalmadı",
  "İşin akışını sen kur",
  "Takip et, işini büyüt",
];

/** Söz ekranda kaldığı süre. */
const SHOW_MS = 7000;
/** İki söz arasındaki sessizlik — art arda dizilirse kayan yazıya dönerdi. */
const PAUSE_MS = 4000;
/** Solma süresi; aşağıdaki `duration-700` ile aynı olmalı. */
const FADE_MS = 700;

function pick(previous: string | null) {
  // Aynı sözün üst üste iki kez çıkması rastgeleliği bozuk gösterir; önceki
  // dışındakiler arasından seçip yerine koyuyoruz.
  const pool = SLOGANS.filter((s) => s !== previous);
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function HeaderSlogan() {
  // Sunucuda seçilen söz istemcide tutmaz (rastgele), o yüzden ilk çizimde
  // boş: söz ancak bağlandıktan sonra beliriyor.
  const [text, setText] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let current: string | null = null;

    const show = () => {
      current = pick(current);
      setText(current);
      setVisible(true);
      timer = setTimeout(hide, SHOW_MS);
    };

    const hide = () => {
      setVisible(false);
      // Solma bitmeden sıradakini yazarsak kelime değişimi görünür olur.
      timer = setTimeout(show, PAUSE_MS + FADE_MS);
    };

    // Sayfa açılır açılmaz değil: önce ekran otursun, söz sonra belirsin.
    timer = setTimeout(show, 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <span
      // Dekoratif: ekran okuyucunun her yeni sayfada okuyacağı bir bilgi değil.
      aria-hidden="true"
      className={`min-w-0 flex-1 truncate text-xs font-medium text-ink-muted/70 transition-opacity duration-700 ease-out motion-reduce:transition-none ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {text}
    </span>
  );
}
