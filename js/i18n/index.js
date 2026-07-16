/* Kwalat — runtime i18n : langue active (LANG), accès dictionnaire (tr/tbl),
   persistance + détection initiale (localStorage puis hash puis défaut).
   Les dictionnaires vivent dans un fichier par langue (js/i18n/<code>.js) ;
   en ajouter une = ajouter son fichier + son entrée LANGS + son build data/. */
import { LANGS, DEFAULT_LANG } from './langs.js';
import fr from './fr.js';
import en from './en.js';
import ru from './ru.js';
import uk from './uk.js';
import es from './es.js';

const I18N = { fr, en, ru, uk, es };

const LANG_STORAGE_KEY = 'cpmap_lang';

/* Initial language: URL hash `lang=` param wins (shareable links), else the
   persisted choice, else DEFAULT_LANG. Read once at script load, BEFORE
   app.js does anything — app.js's own hash helpers (buildHash/readHash)
   keep `lang` in the URL alongside x/z/zm/on/q/camp/i/ping. */
function detectInitialLang() {
  try {
    const p = new URLSearchParams(location.hash.replace(/^#/, ''));
    const fromHash = p.get('lang');
    if (fromHash && I18N[fromHash]) return fromHash;
  } catch (e) { /* ignore */ }
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (stored && I18N[stored]) return stored;
  } catch (e) { /* ignore (private browsing etc.) */ }
  return DEFAULT_LANG;
}

let LANG = detectInitialLang();

function setLangCode(code) {
  LANG = I18N[code] ? code : DEFAULT_LANG;
  try { localStorage.setItem(LANG_STORAGE_KEY, LANG); } catch (e) { /* ignore */ }
  document.documentElement.lang = LANG;
  return LANG;
}
setLangCode(LANG); // persist + <html lang> for the language resolved above

/* Flat UI string/function lookup, falls back to the default language, then
   to the raw key (never throws, never shows a blank string). Named `tr`, not
   the more conventional `t`: app.js already uses bare `t` everywhere as a
   loop variable (tracked items, etc.) — a global `t()` would be shadowed
   silently in a dozen call sites and someone would eventually get bitten. */
function tr(key, ...args) {
  const v = (I18N[LANG] && I18N[LANG].ui[key]) ?? (I18N[DEFAULT_LANG].ui[key]) ?? key;
  return typeof v === 'function' ? v(...args) : v;
}

/* Table lookup (cat/rarity/kind/itemKind/action/searchCat/campKind) — the
   token keys mirror the game's own neutral identifiers (pipeline output),
   e.g. tbl('campKind', 'herbalism'). Returns undefined (not the raw key) so
   call sites can fall back to a prettified raw label when a token is truly
   unknown, same as before this dictionary existed. */
function tbl(section, key) {
  const cur = I18N[LANG] && I18N[LANG][section] && I18N[LANG][section][key];
  if (cur !== undefined) return cur;
  const def = I18N[DEFAULT_LANG][section] && I18N[DEFAULT_LANG][section][key];
  return def;
}

/* Locale numérique de la langue active (séparateurs de milliers, etc.). */
const numberLocale = () => (LANGS[LANG] || LANGS[DEFAULT_LANG]).numberLocale;

export { LANGS, LANG, setLangCode, tr, tbl, numberLocale };
