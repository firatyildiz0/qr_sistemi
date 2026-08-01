"use client";

import { useId, useState } from "react";
import {
  MIN_PASSWORD_LENGTH,
  PASSWORD_RULES,
  passwordScore,
} from "@/lib/password";
import { IconCheck, IconEye, IconEyeOff } from "@/components/icons";

/**
 * Şifre alanı ve kurallarının canlı kontrol listesi.
 *
 * Kurallar yazarken tikleniyor: kullanıcı formu göndermeden hangi koşulu
 * sağlamadığını görüyor. Sıkı bir şifre politikasının bedeli, ne istendiğini
 * söylemeden reddetmek olmamalı.
 *
 * Liste yalnızca alana dokunulduktan sonra açılıyor. Forma ilk bakışta beş
 * maddelik bir uyarı yığını göstermek, henüz bir şey yapmamış kullanıcıyı
 * hatalıymış gibi karşılamak olurdu.
 */
export default function PasswordField() {
  const [value, setValue] = useState("");
  const [visible, setVisible] = useState(false);
  const [touched, setTouched] = useState(false);
  const listId = useId();

  const score = passwordScore(value);
  const total = PASSWORD_RULES.length;
  const complete = score === total;
  const show = touched || value.length > 0;

  return (
    <div>
      <label htmlFor="signup-password" className="field-label">
        Şifre
      </label>

      <div className="relative">
        <input
          id="signup-password"
          name="password"
          type={visible ? "text" : "password"}
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          aria-describedby={listId}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => setTouched(true)}
          className="input pr-11"
        />
        {/* Sıkı kuralları karanlıkta yazmak zor: kullanıcı ne yazdığını
            görebilsin. Varsayılan yine gizli. */}
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Şifreyi gizle" : "Şifreyi göster"}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-ink-muted transition-colors hover:text-ink"
        >
          {visible ? (
            <IconEyeOff className="h-4 w-4" />
          ) : (
            <IconEye className="h-4 w-4" />
          )}
        </button>
      </div>

      {show && (
        <div className="mt-3">
          {/* Güç göstergesi: sağlanan kural sayısı kadar dolu segment. Ayrı bir
              "güç" algoritması uydurmuyoruz — ölçtüğümüz şey tam olarak
              kabul için gereken koşullar. */}
          <div className="flex gap-1" aria-hidden="true">
            {PASSWORD_RULES.map((rule, i) => (
              <span
                key={rule.id}
                className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
                  i < score
                    ? complete
                      ? "bg-success"
                      : score >= 3
                        ? "bg-warning"
                        : "bg-danger"
                    : "bg-border"
                }`}
              />
            ))}
          </div>

          <ul
            id={listId}
            aria-live="polite"
            className="mt-2.5 grid gap-1.5 sm:grid-cols-2"
          >
            {PASSWORD_RULES.map((rule) => {
              const ok = rule.ok(value);

              return (
                <li
                  key={rule.id}
                  className={`flex items-center gap-2 text-xs transition-colors duration-200 ${
                    ok ? "text-success" : "text-ink-muted"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-200 ${
                      ok
                        ? "border-success bg-success text-white"
                        : "border-border"
                    }`}
                  >
                    {ok && <IconCheck className="h-3 w-3" strokeWidth={3} />}
                  </span>
                  {/* Ekran okuyucu tik'i göremez; durumu metne yazıyoruz. */}
                  <span className="sr-only">{ok ? "Sağlandı:" : "Eksik:"}</span>
                  {rule.label}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
