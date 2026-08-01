"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/profile";
import { PLANS, PLAN_COOKIE, type PlanKey } from "@/lib/usage";

/** Bir yıl. Plan yılda bir değişen bir şey, kısa ömürlü bir çerez olmasın. */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Yüzdelerin hangi plana göre hesaplanacağını seçer.
 *
 * Çerezde tutuluyor çünkü tek işi sayfayı okumak: Supabase'de hiçbir şeyi
 * değiştirmiyor, veritabanına yazılacak bir ayar değil. Sunucu çerezi
 * doğrudan okuduğu için sayfa doğru planla çiziliyor, tarayıcıda düzeltilmesi
 * gereken bir ilk hâl kalmıyor.
 */
export async function setPlan(plan: PlanKey): Promise<void> {
  const me = await getProfile();
  if (me?.role !== "superuser" || me.status !== "approved") {
    throw new Error("Bu işlem için yetkiniz yok.");
  }

  // Çerez değeri kullanıcıdan geliyor; bilinen planlardan biri değilse yazma.
  if (!PLANS.some((p) => p.key === plan)) return;

  (await cookies()).set(PLAN_COOKIE, plan, {
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    sameSite: "lax",
  });

  revalidatePath("/yonetim/kullanim");
}
