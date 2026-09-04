/**
 * Panel appearance preferences.
 *
 * These live in a plain (non-httpOnly) cookie rather than `localStorage` so the
 * server can read them while rendering: the settings form is then server
 * rendered with the real values, which is what keeps it free of the hydration
 * mismatch a `localStorage` read in `useState` would cause. A pre-hydration
 * script (see `PREFERENCES_SCRIPT`) reads the same cookie and paints the theme
 * before first paint, so static pages get the right theme with no flash.
 */

export const PREFERENCES_COOKIE = "rentqr_prefs";

/** One year. Preferences are cosmetic, so a long-lived cookie is fine. */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const THEMES = ["system", "light", "dark"] as const;
export const ACCENTS = ["sedef", "ember", "forest", "ocean", "violet", "rose"] as const;
export const DENSITIES = ["compact", "normal", "comfortable"] as const;
export const RADII = ["sharp", "normal", "round"] as const;
export const SIDEBARS = ["expanded", "collapsed"] as const;

export type Theme = (typeof THEMES)[number];
export type Accent = (typeof ACCENTS)[number];
export type Density = (typeof DENSITIES)[number];
export type Radius = (typeof RADII)[number];
export type Sidebar = (typeof SIDEBARS)[number];

export type Preferences = {
  theme: Theme;
  accent: Accent;
  density: Density;
  radius: Radius;
  reduceMotion: boolean;
  /** Desktop rail state. Ignored on mobile, which navigates from a tab bar. */
  sidebar: Sidebar;
};

export const DEFAULT_PREFERENCES: Preferences = {
  theme: "system",
  accent: "sedef",
  density: "normal",
  radius: "normal",
  reduceMotion: false,
  sidebar: "expanded",
};

function pick<T extends string>(options: readonly T[], value: unknown, fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

/**
 * Parses a cookie value into preferences, falling back to the defaults for
 * anything missing or malformed — the cookie is user-writable, so nothing in
 * here may assume well-formed input.
 */
export function parsePreferences(raw: string | undefined): Preferences {
  if (!raw) return DEFAULT_PREFERENCES;

  let parsed: unknown;
  try {
    parsed = JSON.parse(decodeURIComponent(raw));
  } catch {
    return DEFAULT_PREFERENCES;
  }
  if (typeof parsed !== "object" || parsed === null) return DEFAULT_PREFERENCES;

  const value = parsed as Record<string, unknown>;
  return {
    theme: pick(THEMES, value.theme, DEFAULT_PREFERENCES.theme),
    accent: pick(ACCENTS, value.accent, DEFAULT_PREFERENCES.accent),
    density: pick(DENSITIES, value.density, DEFAULT_PREFERENCES.density),
    radius: pick(RADII, value.radius, DEFAULT_PREFERENCES.radius),
    reduceMotion: value.reduceMotion === true,
    sidebar: pick(SIDEBARS, value.sidebar, DEFAULT_PREFERENCES.sidebar),
  };
}

/** Browser-side read of the same cookie the server parses. */
export function readPreferences(): Preferences {
  const match = document.cookie.match(new RegExp(`(?:^|; )${PREFERENCES_COOKIE}=([^;]*)`));
  return parsePreferences(match?.[1]);
}

export function serializePreferences(preferences: Preferences): string {
  return encodeURIComponent(JSON.stringify(preferences));
}

/** Writes the cookie from the browser. No server round trip is needed. */
export function savePreferences(preferences: Preferences) {
  document.cookie = `${PREFERENCES_COOKIE}=${serializePreferences(
    preferences,
  )}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}

/**
 * Mirrors the preferences onto `<html>`, where every themed CSS rule keys off
 * them. Used both by the pre-hydration script (in its inlined form below) and
 * by the settings UI, so a change applies to the whole app immediately.
 */
export function applyPreferences(preferences: Preferences, prefersDark: boolean) {
  const root = document.documentElement;
  const theme = preferences.theme === "system" ? (prefersDark ? "dark" : "light") : preferences.theme;

  root.setAttribute("data-theme", theme);
  root.setAttribute("data-accent", preferences.accent);
  root.setAttribute("data-density", preferences.density);
  root.setAttribute("data-radius", preferences.radius);
  root.setAttribute("data-motion", preferences.reduceMotion ? "reduced" : "full");
  root.setAttribute("data-sidebar", preferences.sidebar);
}

/**
 * Flips the desktop rail and persists it. Written straight to `<html>` rather
 * than through React state: the collapse is pure CSS, so there is nothing to
 * re-render, and the pre-hydration script restores it with no flash on reload.
 */
export function toggleSidebar(): Sidebar {
  const preferences = readPreferences();
  const sidebar: Sidebar = preferences.sidebar === "collapsed" ? "expanded" : "collapsed";

  savePreferences({ ...preferences, sidebar });
  document.documentElement.setAttribute("data-sidebar", sidebar);
  return sidebar;
}

/**
 * Runs synchronously in `<head>`, before the browser paints, so a dark-mode
 * user never sees a white flash — `useEffect` would run only after paint.
 *
 * It re-reads the cookie on every call rather than closing over the parsed
 * value, so the "system" listener stays correct after the settings page has
 * rewritten the cookie without a reload.
 */
export const PREFERENCES_SCRIPT = `(function(){try{
var K=${JSON.stringify(PREFERENCES_COOKIE)},D=${JSON.stringify(DEFAULT_PREFERENCES)};
var q=window.matchMedia("(prefers-color-scheme: dark)");
function read(){var m=document.cookie.match(new RegExp("(?:^|; )"+K+"=([^;]*)"));if(!m)return D;
try{var p=JSON.parse(decodeURIComponent(m[1]));return p&&typeof p==="object"?p:D}catch(e){return D}}
function apply(){var p=read(),r=document.documentElement,t=p.theme;
r.setAttribute("data-theme",t==="dark"||t==="light"?t:(q.matches?"dark":"light"));
r.setAttribute("data-accent",p.accent||D.accent);
r.setAttribute("data-density",p.density||D.density);
r.setAttribute("data-radius",p.radius||D.radius);
r.setAttribute("data-motion",p.reduceMotion?"reduced":"full");
r.setAttribute("data-sidebar",p.sidebar==="collapsed"?"collapsed":"expanded")}
apply();q.addEventListener("change",apply)}catch(e){}})()`;
