import type { DeliveryMode } from "@/lib/turnaround";

/**
 * Instagram sohbetinin adımları. Sıra sabit ve tek yönlü: her adım bir önceki
 * cevabı hazır bulmak zorunda, çünkü müsaitlik hesabı ürünsüz, tarihsiz ya da
 * ilsiz yapılamıyor.
 *
 * `bekliyor` talebin satıcıya iletildiği ve karar beklenen durum; oradan
 * çıkmanın tek yolu müşterinin yeni bir rezervasyona başlaması.
 */
export const ADIMLAR = [
  "kod",
  "tarih",
  "ad",
  "telefon",
  "adres",
  "onay",
  "bekliyor",
] as const;

export type Adim = (typeof ADIMLAR)[number];

export function adimMi(value: unknown): value is Adim {
  return ADIMLAR.includes(value as Adim);
}

/** Taslağa giren tek bir ürün; kod ve ad mesajda göründüğü için saklanıyor. */
export type TaslakUrun = {
  id: string;
  kod: string;
  ad: string;
  adet: number;
  stok: number;
  gunlukFiyat: number | null;
};

/**
 * Yarım kalan talep. Sohbet ilerledikçe doluyor, `onay` adımında özet olarak
 * gösteriliyor ve müşteri kabul edince `booking_requests` satırına dönüşüyor.
 *
 * Veritabanında jsonb olarak duruyor, yani şekli garanti değil: okuyan taraf
 * her alanı ayrı ayrı doğruluyor (bkz. `taslakOku`).
 */
export type Taslak = {
  urunler: TaslakUrun[];
  baslangic?: string;
  bitis?: string;
  ad?: string;
  telefon?: string | null;
  il?: string;
  ilce?: string;
};

export const BOS_TASLAK: Taslak = { urunler: [] };

/** Konuşmanın veritabanındaki hali. */
export type Konusma = {
  id: string;
  ownerId: string;
  igUserId: string;
  senderId: string;
  adim: Adim;
  taslak: Taslak;
  /** Compare-and-swap için: yazarken bu değer hâlâ aynı olmalı. */
  updatedAt: string;
};

/** Satıcının bağlı hesabı — webhook gelen mesajı bununla satıcıya çözüyor. */
export type BagliHesap = {
  ownerId: string;
  igUserId: string;
  accessToken: string;
  username: string | null;
};

/** Talep açılırken hesaplanan, satıcının onaydan önce göreceği aralık. */
export type TalepAraligi = {
  deliveryMode: DeliveryMode;
  blockedStart: string;
  blockedEnd: string;
};
