import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Telefona (ve masaüstü tarayıcısına) giden bildirimler.
 *
 * Yalnızca bildirimlere izin vermiş satıcıya gidiyor: izin vermeyenin
 * `push_subscriptions` satırı hiç yok. Gönderim her zaman en iyi çaba —
 * bildirim gidemedi diye talep ya da panel kaydı geri alınmıyor, panelin kendi
 * bildirim listesi zaten asıl kayıt.
 *
 * Anahtarlar tanımlı değilse (yerel geliştirme, ortam değişkeni eklenmemiş bir
 * ortam) sessizce hiçbir şey yapmıyor.
 */

export type PushIcerik = {
  title: string;
  body: string;
  /** Bildirime dokununca açılacak panel adresi. */
  url: string;
  /** Aynı etiketteki bildirim bir öncekinin yerine geçer, üst üste yığılmaz. */
  tag?: string;
};

let hazir: boolean | null = null;

function vapidHazirla(): boolean {
  if (hazir !== null) return hazir;

  const acik = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const gizli = process.env.VAPID_PRIVATE_KEY;

  // Push servisleri (Google, Apple, Mozilla) sorun olursa kime ulaşacaklarını
  // buradan öğreniyor; https ya da mailto olmak zorunda.
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  const kimlik =
    process.env.VAPID_SUBJECT || (site?.startsWith("https://") ? site : undefined);

  if (!acik || !gizli || !kimlik) {
    hazir = false;
    return hazir;
  }

  webpush.setVapidDetails(kimlik, acik, gizli);
  hazir = true;
  return hazir;
}

/**
 * Satıcının bütün cihazlarına bildirim yollar; kaç cihaza ulaştığını döner.
 *
 * Tarayıcının push servisi 404/410 dönerse abonelik artık yok demektir
 * (satıcı izni kaldırmış, uygulamayı silmiş, tarayıcı verisini temizlemiş);
 * o satır siliniyor ki bir dahaki sefere boşuna denenmesin.
 */
export async function saticiyaPushGonder(
  ownerId: string,
  icerik: PushIcerik
): Promise<number> {
  if (!vapidHazirla()) return 0;

  const db = createAdminClient();
  const { data: abonelikler, error } = await db
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("owner_id", ownerId);

  if (error || !abonelikler?.length) return 0;

  const yuk = JSON.stringify(icerik);
  const olenler: string[] = [];
  const ulasanlar: string[] = [];

  await Promise.all(
    abonelikler.map(async (a) => {
      try {
        await webpush.sendNotification(
          { endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } },
          yuk,
          // Telefon kapalıysa bir gün boyunca sırada beklesin; talep ondan
          // sonra zaten bayatlamış olur.
          { TTL: 86_400, urgency: "high" }
        );
        ulasanlar.push(a.id);
      } catch (hata) {
        const kod = (hata as { statusCode?: number }).statusCode;
        if (kod === 404 || kod === 410) olenler.push(a.id);
        else console.error("[push] gönderilemedi", kod, (hata as Error).message);
      }
    })
  );

  if (olenler.length) {
    await db.from("push_subscriptions").delete().in("id", olenler);
  }
  if (ulasanlar.length) {
    await db
      .from("push_subscriptions")
      .update({ last_used_at: new Date().toISOString() })
      .in("id", ulasanlar);
  }

  return ulasanlar.length;
}
