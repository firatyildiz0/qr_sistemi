<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Yayın akışı — her iş kendi dalında, `main`'e asla dokunma

`main` canlıdır. Ona commit atmaz, merge etmez, push etmezsin. Canlıya çıkarma
kararı kullanıcınındır ve `/yonetim/yayin` ekranından verilir.

Her iş **kendi dalında** durur ve **`origin/main`'den** dallanır. Böylece
birbirlerini beklemezler: kullanıcı üçüncü işi onaylarken ilk ikisi yerinde
kalır. Bir işi başka bir işin dalının üstüne kurma — kurarsan ikisi ayrılamaz
hale gelir.

Sırayla:

1. Dalı aç. Ad `is/` ile başlamalı, kısa ve konuyu anlatmalı:

   ```
   git fetch origin && git checkout -b is/<kisa-ad> origin/main
   ```

2. İşi yap.

3. Künyeyi yaz:

   ```
   npm run kaydet -- --tip <ozellik|hata|guvenlik|iyilestirme> \
     --baslik "..." --aciklama "..." [--dikkat "..."]
   ```

   Dosya adını açık olan daldan türetir (`is/qr-kodu` → `yayin/kayitlar/qr-kodu.json`).

4. Kod ile künyeyi commit'le — mesaj her zamanki gibi teknik ve İngilizce — ve
   `git push -u origin is/<kisa-ad>`.

5. Kullanıcıya panelde ne beklediğini söyle.

Kullanıcı onayladığında dal `main`'e birleşir ve silinir; panel onu bir daha
göstermez.

## Künye nasıl yazılır

Panelin tek amacı, kullanıcının ne değiştiğini teknik bilgi olmadan anlaması.

- **Başlık:** ne değişti, kullanıcının gördüğü yerden. "Rezervasyon silinince
  takvimde günler dolu kalıyordu" — "Fix stale availability cache" değil.
- **Açıklama:** 1-3 cümle. Belirti neydi, artık ne oluyor. Dosya adı, fonksiyon
  adı, kütüphane adı geçmesin.
- **`--dikkat`:** yalnızca canlıya almadan önce/sonra elle bir şey yapılması
  gerekiyorsa. Migration çalıştırmak, Vercel'e ortam değişkeni eklemek gibi.
  Gerekmiyorsa hiç verme.
