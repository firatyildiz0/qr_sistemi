"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/profile";
import { canliyiIlerlet, yayinDurumu } from "@/lib/github";

/**
 * Seçilen değişikliğe kadar olan her şeyi canlıya alır.
 *
 * Sayfanın `/yonetim` altında olması yetki değildir — bu işlem herkesin
 * gönderebileceği bir POST ucu, kontrol burada yapılmak zorunda.
 */
export async function yayinla(sha: string): Promise<void> {
  const me = await getProfile();
  if (me?.role !== "superuser" || me.status !== "approved") {
    throw new Error("Bu işlem için yetkiniz yok.");
  }

  // Gelen sha'ya güvenmiyoruz. İstemci hangi değişikliği kastettiğini söyler,
  // hangi commit'lerin gönderilebilir olduğuna sunucu karar verir: aksi halde
  // bu uç, deponun herhangi bir commit'ini canlıya alan bir düğme olurdu.
  const durum = await yayinDurumu();
  if ("kurulum" in durum) throw new Error(durum.kurulum);
  if (!durum.degisiklikler.some((d) => d.sha === sha)) {
    throw new Error("Bu değişiklik yayın sırasında değil. Sayfayı yenileyin.");
  }

  await canliyiIlerlet(sha);

  revalidatePath("/yonetim/yayin");
}
