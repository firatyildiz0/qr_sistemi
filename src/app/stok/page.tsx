import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import StokPanel from "@/components/stok/StokPanel";

export const metadata: Metadata = {
  title: "StokPilot — Çok kanallı stok yönetimi",
  description: "Trendyol, Hepsiburada ve mağazanızdaki stoğu tek panelden yönetin.",
};

export default async function StokPage() {
  const [user, supabase] = await Promise.all([getCurrentUser(), createClient()]);
  if (!user) redirect("/login?next=/stok");
  const { data: profile } = await supabase.from("profiles").select("status").eq("id", user.id).maybeSingle();
  if (profile?.status !== "approved") redirect("/login?next=/stok");
  const { data: products, error } = await supabase.from("products").select("id,name,barcode,stock,daily_price,images").eq("owner_id", user.id).order("created_at", { ascending: false });
  return <StokPanel initialProducts={(products ?? []).map((p) => ({ id: p.id, name: p.name, sku: p.barcode ?? "Barkod yok", category: "Ürün", stock: p.stock, sales: 0, price: `${Number(p.daily_price).toLocaleString("tr-TR")} TL`, channel: "Mağaza" as const, color: "#8276ff" }))} loadError={error?.message ?? ""} />;
}
