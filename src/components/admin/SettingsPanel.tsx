"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  IconAccessibility,
  IconCheck,
  IconMonitor,
  IconMoon,
  IconPalette,
  IconSliders,
  IconSun,
  IconTruck,
  IconUndo,
  IconUser,
} from "@/components/icons";
import TurnaroundSettings from "@/components/admin/TurnaroundSettings";
import type { Turnaround } from "@/lib/turnaround";
import {
  ACCENTS,
  DEFAULT_PREFERENCES,
  applyPreferences,
  savePreferences,
  type Accent,
  type Density,
  type Preferences,
  type Radius,
  type Theme,
} from "@/lib/preferences";

type CategoryId =
  | "turnaround"
  | "appearance"
  | "layout"
  | "accessibility"
  | "account";

const CATEGORIES: { id: CategoryId; label: string; hint: string; icon: typeof IconPalette }[] = [
  { id: "turnaround", label: "Teslimat süreleri", hint: "Kargo ve hazırlık", icon: IconTruck },
  { id: "appearance", label: "Görünüm", hint: "Tema ve renk", icon: IconPalette },
  { id: "layout", label: "Panel düzeni", hint: "Yoğunluk ve köşeler", icon: IconSliders },
  { id: "accessibility", label: "Erişilebilirlik", hint: "Hareket", icon: IconAccessibility },
  { id: "account", label: "Hesap", hint: "Oturum bilgisi", icon: IconUser },
];

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof IconSun }[] = [
  { value: "light", label: "Açık", icon: IconSun },
  { value: "dark", label: "Koyu", icon: IconMoon },
  { value: "system", label: "Sistem", icon: IconMonitor },
];

const ACCENT_LABELS: Record<Accent, string> = {
  ember: "Turuncu",
  forest: "Yeşil",
  ocean: "Mavi",
  violet: "Mor",
  rose: "Gül",
};

const DENSITY_OPTIONS: { value: Density; label: string; description: string }[] = [
  { value: "compact", label: "Sık", description: "Ekrana daha çok içerik sığar" },
  { value: "normal", label: "Normal", description: "Varsayılan aralıklar" },
  { value: "comfortable", label: "Ferah", description: "Daha çok nefes alanı" },
];

const RADIUS_OPTIONS: { value: Radius; label: string }[] = [
  { value: "sharp", label: "Keskin" },
  { value: "normal", label: "Normal" },
  { value: "round", label: "Yuvarlak" },
];

export default function SettingsPanel({
  initial,
  turnaround,
  email,
}: {
  initial: Preferences;
  turnaround: Turnaround;
  email: string;
}) {
  const [preferences, setPreferences] = useState(initial);
  const [category, setCategory] = useState<CategoryId>("turnaround");
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (savedTimer.current) clearTimeout(savedTimer.current);
  }, []);

  function update(patch: Partial<Preferences>) {
    const next = { ...preferences, ...patch };
    setPreferences(next);
    savePreferences(next);
    // Repaint immediately instead of waiting for a reload: the CSS keys off
    // <html>, so this one call restyles the whole app.
    applyPreferences(next, window.matchMedia("(prefers-color-scheme: dark)").matches);

    setSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 2000);
  }

  const isDefault =
    preferences.theme === DEFAULT_PREFERENCES.theme &&
    preferences.accent === DEFAULT_PREFERENCES.accent &&
    preferences.density === DEFAULT_PREFERENCES.density &&
    preferences.radius === DEFAULT_PREFERENCES.radius &&
    preferences.reduceMotion === DEFAULT_PREFERENCES.reduceMotion;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
      <nav aria-label="Ayar kategorileri" className="lg:w-56 lg:shrink-0">
        <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
          {CATEGORIES.map((item) => {
            const active = category === item.id;
            return (
              <li key={item.id} className="shrink-0 lg:shrink">
                <button
                  type="button"
                  onClick={() => setCategory(item.id)}
                  aria-current={active ? "true" : undefined}
                  className={`flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors ${
                    active
                      ? "border-accent bg-accent-soft text-accent-strong"
                      : "border-transparent text-ink-muted hover:bg-card hover:text-ink"
                  }`}
                >
                  <item.icon className="h-4.5 w-4.5 shrink-0" />
                  <span className="min-w-0">
                    <span className="block whitespace-nowrap text-sm font-semibold">
                      {item.label}
                    </span>
                    <span className="hidden text-xs opacity-70 lg:block">{item.hint}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="min-w-0 flex-1">
        <div className="mb-4 flex h-6 items-center justify-end" aria-live="polite">
          {saved && (
            <span className="pill pill-success">
              <IconCheck className="h-3.5 w-3.5" />
              Kaydedildi
            </span>
          )}
        </div>

        {category === "turnaround" && <TurnaroundSettings initial={turnaround} />}

        {category === "appearance" && (
          <div className="flex flex-col gap-6">
            <Section
              title="Tema"
              description="Sistem seçeneği cihazınızın açık/koyu ayarını takip eder."
            >
              <OptionGrid label="Tema">
                {THEME_OPTIONS.map((option) => (
                  <Option
                    key={option.value}
                    name="theme"
                    checked={preferences.theme === option.value}
                    onSelect={() => update({ theme: option.value })}
                    label={option.label}
                  >
                    <ThemePreview theme={option.value} />
                  </Option>
                ))}
              </OptionGrid>
            </Section>

            <Section
              title="Vurgu rengi"
              description="Butonlar, bağlantılar, takvim ve rozetler bu renkten türetilir."
            >
              <OptionGrid label="Vurgu rengi" className="sm:grid-cols-5">
                {ACCENTS.map((accent) => (
                  <Option
                    key={accent}
                    name="accent"
                    checked={preferences.accent === accent}
                    onSelect={() => update({ accent })}
                    label={ACCENT_LABELS[accent]}
                  >
                    {/* `data-accent` makes this swatch resolve the preset's own
                        colour, so the palette never has to be repeated in JS. */}
                    <span
                      data-accent={accent}
                      className="block h-10 w-full rounded-md bg-accent"
                    />
                  </Option>
                ))}
              </OptionGrid>
            </Section>
          </div>
        )}

        {category === "layout" && (
          <div className="flex flex-col gap-6">
            <Section
              title="Arayüz yoğunluğu"
              description="Panelin boşluklarını ölçekler. Değişiklik anında görünür."
            >
              <OptionGrid label="Arayüz yoğunluğu">
                {DENSITY_OPTIONS.map((option) => (
                  <Option
                    key={option.value}
                    name="density"
                    checked={preferences.density === option.value}
                    onSelect={() => update({ density: option.value })}
                    label={option.label}
                    description={option.description}
                  >
                    <DensityPreview density={option.value} />
                  </Option>
                ))}
              </OptionGrid>
            </Section>

            <Section title="Köşe yuvarlaklığı" description="Kartların ve butonların köşe biçimi.">
              <OptionGrid label="Köşe yuvarlaklığı">
                {RADIUS_OPTIONS.map((option) => (
                  <Option
                    key={option.value}
                    name="radius"
                    checked={preferences.radius === option.value}
                    onSelect={() => update({ radius: option.value })}
                    label={option.label}
                  >
                    <RadiusPreview radius={option.value} />
                  </Option>
                ))}
              </OptionGrid>
            </Section>
          </div>
        )}

        {category === "accessibility" && (
          <Section
            title="Hareket"
            description="Cihazınızda sistem düzeyinde hareket azaltma açıksa bu ayardan bağımsız olarak da uygulanır."
          >
            <Toggle
              checked={preferences.reduceMotion}
              onChange={(checked) => update({ reduceMotion: checked })}
              label="Animasyonları azalt"
              description="Kayma, belirme ve nabız animasyonlarını kapatır. Yükleniyor göstergeleri çalışmaya devam eder."
            />
          </Section>
        )}

        {category === "account" && (
          <div className="flex flex-col gap-6">
            <Section title="Oturum" description="Panelde şu hesapla oturum açtınız.">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent-strong">
                  {email.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{email}</p>
                  <p className="text-xs text-ink-muted">Sahip</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-ink-muted">
                Çıkış yapmak için sol menünün altındaki çıkış düğmesini kullanın.
              </p>
            </Section>

            <Section
              title="Görünüm ayarlarını sıfırla"
              description="Tema, renk, yoğunluk ve köşe ayarlarını varsayılana döndürür. Ürün ve rezervasyon verileriniz etkilenmez."
            >
              <button
                type="button"
                onClick={() => update(DEFAULT_PREFERENCES)}
                disabled={isDefault}
                className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
              >
                <IconUndo className="h-4 w-4" />
                {isDefault ? "Zaten varsayılan" : "Varsayılana dön"}
              </button>
            </Section>
          </div>
        )}

        {/* Teslimat süreleri hesaba giren gerçek veri; görünüm ayarları ise
            yalnızca bu tarayıcıda duruyor. İkisini aynı notla anlatmak
            yanıltıcı olurdu. */}
        {category !== "turnaround" && (
          <p className="mt-6 text-xs text-ink-muted">
            Bu ayarlar bu tarayıcıda saklanır ve yalnızca sizin görünümünüzü etkiler.
          </p>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="card">
      <h2 className="text-base font-bold text-ink">{title}</h2>
      <p className="mt-1 text-sm text-ink-muted">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function OptionGrid({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <fieldset>
      <legend className="sr-only">{label}</legend>
      <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${className}`}>{children}</div>
    </fieldset>
  );
}

/**
 * A radio behind a card. The real input stays in the DOM (visually hidden) so
 * the group keeps native keyboard and screen-reader behaviour.
 */
function Option({
  name,
  checked,
  onSelect,
  label,
  description,
  children,
}: {
  name: string;
  checked: boolean;
  onSelect: () => void;
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <label
      className={`relative flex cursor-pointer flex-col gap-2 rounded-md border p-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent ${
        checked ? "border-accent bg-accent-soft" : "border-border bg-card hover:border-border-strong"
      }`}
    >
      {/* Şeffaf ama kartı tamamen kaplayan bir radio: `sr-only` ile 1px'e
          küçültülseydi mobil Safari odaklandığı anda o noktaya yakınlaşırdı.
          Bu haliyle kontrol hem görünmez hem de gerçek dokunma alanı kadar. */}
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        className="absolute inset-0 m-0 h-full w-full cursor-pointer appearance-none opacity-0"
      />
      {children}
      <span className="flex items-center gap-1.5">
        <span className={`text-sm font-semibold ${checked ? "text-accent-strong" : "text-ink"}`}>
          {label}
        </span>
        {checked && <IconCheck className="h-3.5 w-3.5 text-accent" />}
      </span>
      {description && <span className="text-xs text-ink-muted">{description}</span>}
    </label>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <label className="relative flex cursor-pointer items-start gap-4">
      {/* Radyo kartlarıyla aynı gerekçe: görünmez ama tam boyutlu kontrol. */}
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer absolute inset-0 m-0 h-full w-full cursor-pointer appearance-none opacity-0"
      />
      {/* The track reacts to the input as its sibling, but the knob is a level
          deeper than `peer-*` can reach — so it moves from React state. */}
      <span className="mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full border border-border bg-paper p-0.5 transition-colors peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
        <span
          className={`h-4.5 w-4.5 rounded-full bg-card shadow-sm transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        <span className="mt-0.5 block text-sm text-ink-muted">{description}</span>
      </span>
    </label>
  );
}

function ThemePreview({ theme }: { theme: Theme }) {
  if (theme === "system") {
    return (
      <span className="flex h-10 w-full overflow-hidden rounded-md border border-border">
        <span className="flex-1 bg-[#f2f1ed] p-1.5">
          <span className="block h-1.5 w-2/3 rounded-full bg-[#1b1c1a]/70" />
        </span>
        <span className="flex-1 bg-[#0c110f] p-1.5">
          <span className="block h-1.5 w-2/3 rounded-full bg-[#ecebe5]/70" />
        </span>
      </span>
    );
  }

  const dark = theme === "dark";
  return (
    <span
      className={`flex h-10 w-full flex-col justify-center gap-1.5 rounded-md border border-border p-2 ${
        dark ? "bg-[#0c110f]" : "bg-[#f2f1ed]"
      }`}
    >
      <span className={`block h-1.5 w-3/4 rounded-full ${dark ? "bg-[#ecebe5]/70" : "bg-[#1b1c1a]/70"}`} />
      <span className={`block h-1.5 w-1/2 rounded-full ${dark ? "bg-[#ecebe5]/35" : "bg-[#1b1c1a]/35"}`} />
    </span>
  );
}

function DensityPreview({ density }: { density: Density }) {
  const gap = density === "compact" ? "gap-1" : density === "comfortable" ? "gap-2.5" : "gap-1.5";
  return (
    <span className={`flex h-10 w-full flex-col justify-center rounded-md bg-paper px-2 ${gap}`}>
      <span className="block h-1.5 w-full rounded-full bg-ink/20" />
      <span className="block h-1.5 w-full rounded-full bg-ink/20" />
      <span className="block h-1.5 w-2/3 rounded-full bg-ink/20" />
    </span>
  );
}

function RadiusPreview({ radius }: { radius: Radius }) {
  const corners = radius === "sharp" ? "rounded-[2px]" : radius === "round" ? "rounded-2xl" : "rounded-md";
  return (
    <span className="flex h-10 w-full items-center justify-center rounded-md bg-paper">
      <span className={`block h-7 w-14 border-2 border-ink/25 ${corners}`} />
    </span>
  );
}
