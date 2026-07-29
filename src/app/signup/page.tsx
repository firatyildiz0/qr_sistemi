import { redirect } from "next/navigation";

// Kayıt artık giriş ekranının bir sekmesi; /signup bağlantısı o sekmeye düşer.
export default function SignupPage() {
  redirect("/login?mode=signup");
}
