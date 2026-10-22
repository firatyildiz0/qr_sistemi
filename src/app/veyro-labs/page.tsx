import { permanentRedirect } from "next/navigation";

/**
 * Eski hizmet vitrini. Voyo Labs'in hizmetleri artık anasayfanın kendi
 * rafında duruyor; paylaşılmış eski bağlantılar oraya düşsün.
 */
export default function VeyroLabsPage() {
  permanentRedirect("/#hizmetler");
}
