#!/usr/bin/env node
/**
 * iyzico'da abonelik ürününü ve aylık ödeme planını oluşturur.
 *
 * Neden bir betik: plan referans kodunu iyzico üretiyor, biz uyduramıyoruz —
 * ve `IYZICO_PRICING_PLAN_REF` olmadan abonelik başlatılamıyor. Panelden elle
 * de oluşturulabilir, ama o zaman fiyat/periyot kodda yazandan sapabilir.
 * Betik ikisini tek yerden kuruyor ve sonunda ortam değişkenini basıyor.
 *
 * Kullanım (.env.local okunur):
 *   node scripts/iyzico-plan.mjs
 *   npm run iyzico:plan
 *
 * Bir kez çalıştırılır. İkinci çalıştırma *yeni* bir plan oluşturur — iyzico
 * planın fiyatını sonradan değiştirmeye izin vermiyor, fiyat değişikliği yeni
 * bir plan demek. Eski aboneler eski plandan devam eder, bu beklenen davranış.
 */

import { createHmac, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";

const SANDBOX = "https://sandbox-api.iyzipay.com";
const PRODUCTION = "https://api.iyzipay.com";

/** Aylık ücret, TL, KDV dahil. `src/lib/subscription.ts` ile aynı olmalı. */
const PRICE_TRY = Number(process.env.IYZICO_PRICE_TRY ?? 999);

const PRODUCT_NAME = "RentQR Premium";
const PLAN_NAME = `Aylık ${PRICE_TRY} TL`;

/**
 * `.env.local`'i okur. Betik Next dışında koştuğu için değişkenler
 * kendiliğinden yüklenmiyor; `dotenv` eklemek yerine dosyayı okuyoruz —
 * ihtiyaç bu kadar.
 */
function loadEnv() {
  let text;
  try {
    text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  } catch {
    return;
  }

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    // Değer tırnaklı olabilir; tırnaklar soyuluyor.
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");

    // Kabuktan verilen değer dosyayı ezsin: tek seferlik denemeler kolay olsun.
    if (!(key in process.env)) process.env[key] = value;
  }
}

/**
 * IYZWSv2 imzası: `HMACSHA256(randomKey + uriPath + body, secretKey)`,
 * onaltılık. Ayrıntılar için bkz. `src/lib/iyzico.ts` — mantık birebir aynı,
 * burada tekrarlanıyor çünkü betik TypeScript kaynağını içe aktaramıyor.
 */
async function call(method, uriPath, payload) {
  const base = process.env.IYZICO_ENV === "production" ? PRODUCTION : SANDBOX;
  const body = payload === undefined ? "" : JSON.stringify(payload);
  const randomKey = `${Date.now()}${randomBytes(4).toString("hex")}`;

  const signature = createHmac("sha256", process.env.IYZICO_SECRET_KEY)
    .update(`${randomKey}${uriPath}${body}`)
    .digest("hex");

  const authorization = Buffer.from(
    `apiKey:${process.env.IYZICO_API_KEY}&randomKey:${randomKey}&signature:${signature}`
  ).toString("base64");

  const response = await fetch(`${base}${uriPath}`, {
    method,
    headers: {
      Authorization: `IYZWSv2 ${authorization}`,
      "x-iyzi-rnd": randomKey,
      "Content-Type": "application/json",
    },
    body: method === "POST" ? body : undefined,
  });

  const json = await response.json().catch(() => null);

  if (!json || json.status !== "success") {
    throw new Error(
      `${method} ${uriPath} başarısız: ${json?.errorMessage ?? `HTTP ${response.status}`}`
    );
  }

  return json.data ?? json;
}

async function main() {
  loadEnv();

  const missing = ["IYZICO_API_KEY", "IYZICO_SECRET_KEY"].filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`Eksik ortam değişkeni: ${missing.join(", ")}`);
    console.error("iyzico > Ayarlar > API anahtarları'ndan alıp .env.local'e yazın.");
    process.exit(1);
  }

  const live = process.env.IYZICO_ENV === "production";
  console.log(`Ortam: ${live ? "CANLI" : "sandbox"}\n`);

  const product = await call("POST", "/v2/subscription/products", {
    locale: "tr",
    name: PRODUCT_NAME,
    description: "Kiralama paneli aylık aboneliği",
  });

  console.log(`Ürün oluşturuldu: ${product.referenceCode}`);

  const plan = await call(
    "POST",
    `/v2/subscription/products/${product.referenceCode}/pricing-plans`,
    {
      locale: "tr",
      name: PLAN_NAME,
      price: PRICE_TRY,
      currencyCode: "TRY",
      paymentInterval: "MONTHLY",
      paymentIntervalCount: 1,
      // Süresiz: `recurrenceCount` verilmiyor, abonelik iptal edilene kadar
      // her ay yenileniyor.
      planPaymentType: "RECURRING",
      // `trialPeriodDays` bilinçli olarak yok: denemeyi kartsız veriyoruz ve
      // süreyi kendi veritabanımızda tutuyoruz (bkz. 0025).
    }
  );

  console.log(`Plan oluşturuldu: ${plan.referenceCode}\n`);
  console.log("Bunu .env.local'e ve Vercel ortam değişkenlerine ekleyin:\n");
  console.log(`IYZICO_PRICING_PLAN_REF=${plan.referenceCode}`);
}

main().catch((error) => {
  console.error(`\nHata: ${error.message}`);
  process.exit(1);
});
