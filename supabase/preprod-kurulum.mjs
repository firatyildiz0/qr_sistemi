// Boş bir Supabase projesini canlıyla aynı şemaya getiren SQL'i basar:
//
//   node supabase/preprod-kurulum.mjs > preprod-kurulum.sql
//
// Çıktı Supabase'in SQL editörüne olduğu gibi yapıştırılır.
//
// Neden bugünkü schema.sql değil: canlı veritabanı ilk schema.sql ile kuruldu,
// sonra migration'lar sırayla uygulandı. schema.sql o günden beri yalnızca
// kısmen güncellendi; üstüne migration'ları koşmak da çakışıyor (aynı
// politikayı iki kez açıyor). Canlının geçtiği yolu aynen yürümek tek
// güvenilir yol: ilk commit'teki schema.sql + 0002'den itibaren bütün
// migration'lar. (0001 ilk schema.sql'den önceki şemaya yazılmıştı, ilk
// schema.sql onu zaten içeriyor.)
//
// Bu sıra 2026-10-26'da boş bir yerel Supabase'te hatasız kuruldu ve kodun
// kullandığı bütün tablo, fonksiyon ve depolama kovalarını üretti.

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ILK_COMMIT = "16baa25";
const KLASOR = join(import.meta.dirname, "migrations");

const parcalar = [
  `-- Temel şema: ${ILK_COMMIT} commit'indeki supabase/schema.sql`,
  execFileSync("git", ["show", `${ILK_COMMIT}:supabase/schema.sql`], { encoding: "utf8" }),
];

for (const dosya of readdirSync(KLASOR).filter((f) => f.endsWith(".sql")).sort()) {
  if (dosya < "0002") continue;
  parcalar.push(`\n-- ==== ${dosya}`, readFileSync(join(KLASOR, dosya), "utf8"));
}

process.stdout.write(parcalar.join("\n") + "\n");
