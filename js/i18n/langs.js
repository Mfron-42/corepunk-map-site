/* Kwalat — méta-langues + règles de pluriel partagées.
   Une langue n'entre dans LANGS qu'une fois les DEUX couches complètes :
   le dictionnaire UI (js/i18n/<code>.js) ET le build de données de jeu
   sous data/<code>/ — jamais une interface dans une langue avec du contenu
   dans une autre (voir data/SCHEMA.md "i18n"). FR est la langue par défaut. */
const LANGS = {
  fr: { name: 'Français', flag: '🇫🇷', numberLocale: 'fr-FR' },
  en: { name: 'English', flag: '🇬🇧', numberLocale: 'en-US' },
  ru: { name: 'Русский', flag: '🇷🇺', numberLocale: 'ru-RU' },
  uk: { name: 'Українська', flag: '🇺🇦', numberLocale: 'uk-UA' },
  es: { name: 'Español', flag: '🇪🇸', numberLocale: 'es-ES' },
};
const DEFAULT_LANG = 'fr';

/* Slavic plural rule (CLDR one/few/many), shared by ru/uk count-based UI
   strings that actually bother distinguishing the count (see questCountSuffix) —
   the other n=>`${n} ...` entries mirror fr/en's own simplification of
   always using one invariant plural form regardless of n. */
function pluralSlavic(n, one, few, many) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export { LANGS, DEFAULT_LANG, pluralSlavic };
