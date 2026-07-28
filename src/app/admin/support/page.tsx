import { IconWhatsApp } from "@/components/icons";

export const metadata = { title: "Destek" };

/** `phone` is the wa.me form: country code, no leading zero or separators. */
const CONTACTS = [
  { name: "Fırat Yıldız", phone: "905522748937", display: "0552 274 89 37" },
  { name: "Nihat Yavuz", phone: "905345875456", display: "0534 587 54 56" },
];

const MESSAGE = "Merhaba, RentQR paneli hakkında destek almak istiyorum.";

export default function SupportPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 flex h-auto items-center border-b border-border bg-paper px-4 py-4 sm:h-20 sm:px-8 sm:py-0">
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">Destek</h1>
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 p-4 sm:p-8">
        <p className="text-sm text-ink-muted">
          Bir sorun mu var? Ekibimize WhatsApp üzerinden doğrudan yazabilirsiniz.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {CONTACTS.map((contact) => (
            <div key={contact.phone} className="card flex flex-col items-center gap-4 p-6 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366]/10 text-[#25D366]">
                <IconWhatsApp className="h-8 w-8" />
              </span>
              <div>
                <p className="text-lg font-bold text-ink">{contact.name}</p>
                <p className="mt-1 text-sm text-ink-muted">{contact.display}</p>
              </div>
              <a
                href={`https://wa.me/${contact.phone}?text=${encodeURIComponent(MESSAGE)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-md bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1eb455]"
              >
                <IconWhatsApp className="h-4 w-4" />
                WhatsApp&apos;tan yaz
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
