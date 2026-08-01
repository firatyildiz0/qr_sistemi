<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Yayın akışı — `main`'e asla dokunma

İki dal var:

- **`staging`** — bütün iş burada birikir. Buraya push etmek canlıya çıkmak
  değildir; Vercel yalnızca bir önizleme dağıtımı üretir.
- **`main`** — canlı. Yalnızca kullanıcı, `/yonetim/yayin` ekranından onaylayarak
  ilerletir. Sen `main`'e commit atmazsın, merge etmezsin, push etmezsin.

Her işi bitirdiğinde, `staging` üzerinde:

1. Kaydı hazırla — commit'ten **önce**:

   ```
   npm run kaydet -- --tip <ozellik|hata|guvenlik|iyilestirme> \
     --baslik "..." --aciklama "..." [--dikkat "..."]
   ```

   Betik `yayin/kayitlar.json` dosyasına ekler ve sana bir `Panel-Kaydi: <id>`
   satırı yazdırır.

2. Kod ile kayıt dosyasını **tek commit'te** at. Mesaj her zamanki gibi teknik ve
   İngilizce, ama sonuna betiğin verdiği `Panel-Kaydi: <id>` satırını ekle. Panel
   commit ile kaydı bu satırdan eşleştirir; unutursan değişiklik ekranda
   "Açıklama yok" diye görünür.

3. `git push origin staging`.

4. Kullanıcıya panelde ne beklediğini söyle. Canlıya çıkarmak onun kararı.

Birden çok iş yaptıysan her biri ayrı kayıt + ayrı commit olsun: ekranda tek tek
onaylanabilmeleri buna bağlı. Sıra da önemli — kullanıcı bir değişikliği canlıya
aldığında ondan öncekiler de gider, o yüzden bağımsız işleri karıştırma.

## Başlık ve açıklama nasıl yazılır

Panelin tek amacı, kullanıcının ne değiştiğini teknik bilgi olmadan anlaması.

- **Başlık:** ne değişti, kullanıcının gördüğü yerden. "Rezervasyon silinince
  takvimde günler dolu kalıyordu" — "Fix stale availability cache" değil.
- **Açıklama:** 1-3 cümle. Belirti neydi, artık ne oluyor. Dosya adı, fonksiyon
  adı, kütüphane adı geçmesin.
- **`--dikkat`:** yalnızca push'tan önce/sonra elle bir şey yapılması
  gerekiyorsa. Migration çalıştırmak, Vercel'e ortam değişkeni eklemek gibi.
  Gerekmiyorsa hiç verme.
