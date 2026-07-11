/* Kwalat — utilitaires transverses : DOM, échappement, formats, replis
   d'image et normalisation de recherche. Aucune dépendance applicative
   (seul le runtime i18n est importé, pour la locale numérique). */
import { numberLocale } from './i18n/index.js';

const $$ = sel => Array.from(document.querySelectorAll(sel));
/* ── Utilitaires ────────────────────────────────────────────── */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtCoord = (x, z) => `x ${Math.round(x).toLocaleString(numberLocale())} · z ${Math.round(z).toLocaleString(numberLocale())}`;
const pretty = k => (k || '').replace(/[_-]+/g, ' ').trim().replace(/^./, c => c.toUpperCase());
/* Première lettre en majuscule, reste en minuscules (ex. "epic" -> "Epic",
   "EPIC" -> "Epic") — capitalisation d'un token de rareté (rarity.js
   buildRarityGroups, fiches.js bandRarityLabel/bandRarityHex), même règle
   dans les deux cas. */
const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── Repli d'image systématique ───────────────────────────────
   Aucune image cassée ou case vide : une icône manquante (~530 items et
   36 avatars n'ont simplement pas d'art extrait du client — repli permanent
   et attendu pour eux) ou qui échoue au chargement (404) bascule sur un
   glyphe de catégorie coloré — initiales du nom pour les portraits (PNJ,
   avatars de fiche), pictogramme de nature pour les objets/butin. */
function initials(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  return words.length === 1 ? words[0].slice(0, 2).toUpperCase() : (words[0][0] + words[1][0]).toUpperCase();
}
const KIND_GLYPH = {
  weapon: '⚔', consumable: '🧪', artifact: '💎', resource: '🌿', rune: '◈',
  chip: '▣', synthesis: '✦', quest_item: '⚙', recipe: '📜',
};
function itemGlyph(it) { return (it && KIND_GLYPH[it.kind]) || '📦'; }
/* <img> avec repli intégré (le glyphe est posé en data-fb, consommé soit
   par le handler `error` global si l'image casse, soit immédiatement s'il
   n'y a pas d'URL du tout).
   Encodage # / ? : 3 icônes du catalogue (reskins d'objets destructibles,
   ex. quest_item_imp_eggs -> "hero_avatars/reactive_small_garbage_leaf_
   monster_19#_green.png") portent un « # » DANS le nom de fichier même —
   posé brut dans src=, le navigateur tronque l'URL au fragment et
   requête un chemin inexistant (404 + icône cassée sur TOUTES les
   surfaces : fiche item, lignes de quête, section « Quest items » de la
   fiche monstre, résultats de recherche). iconTag est l'unique point de
   construction d'<img> de l'app (vérifié : aucune autre construction
   d'<img>/iconUrl dans site/js), donc l'encodage ici corrige toute la
   classe d'un coup — « ? » est traité pareil (même troncature, en query
   string), par défense. */
function iconTag(url, cls, glyph) {
  return url
    ? `<img class="${cls}" src="${url.replace(/#/g, '%23').replace(/\?/g, '%3F')}" alt="" data-fb="${esc(glyph)}" loading="lazy">`
    : `<span class="${cls} icon-broken" data-fb="${esc(glyph)}"></span>`;
}
document.addEventListener('error', e => {
  const t = e.target;
  if (t.tagName !== 'IMG') return;
  const span = document.createElement('span');
  span.className = t.className + ' icon-broken';
  span.setAttribute('data-fb', t.dataset.fb || '?');
  t.replaceWith(span);
}, true);

/* Normalisation de recherche : minuscules, accents pliés (é→e), tout
   séparateur ramené à l'espace — « quete », « QUÊTE » et « quête »
   deviennent la même clé. Le filtre final gardait uniquement [a-z0-9] :
   inoffensif pour les scripts latins (l'accent est déjà réduit par le
   NFD+strip juste avant), mais ça supprimait purement et simplement tout
   caractère cyrillique — la recherche ru/uk ne pouvait donc jamais trouver
   quoi que ce soit (chaîne repliée vide). Ѐ-ӿ (bloc cyrillique de
   base, couvre aussi і/ї/є/ґ ukrainiens) est donc explicitement conservé,
   en plus de a-z0-9, sans toucher au comportement existant pour fr/en/es. */
function fold(s) {
  return String(s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9Ѐ-ӿ]+/g, ' ').trim();
}

/* Distance d'édition bornée (bande de largeur maxD, abandon dès que la
   ligne dépasse maxD) — assez rapide pour être rejouée sur tout l'index
   à chaque frappe. */
function editLe(a, b, maxD) {
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > maxD) return maxD + 1;
  let prev = new Array(lb + 1), cur = new Array(lb + 1);
  for (let j = 0; j <= lb; j++) prev[j] = j;
  for (let i = 1; i <= la; i++) {
    cur[0] = i;
    let rowMin = cur[0];
    const from = Math.max(1, i - maxD), to = Math.min(lb, i + maxD);
    for (let j = 1; j <= lb; j++) {
      if (j < from || j > to) { cur[j] = maxD + 1; continue; }
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (cur[j] < rowMin) rowMin = cur[j];
    }
    if (rowMin > maxD) return maxD + 1;
    const t = prev; prev = cur; cur = t;
  }
  return prev[lb];
}

/* Nettoyage d'AFFICHAGE des libellés issus du client : suffixe technique
   « TEXTURING » et préfixe « QItem » (artefacts d'assets, jamais du contenu
   joueur — vus sur les acteurs/objets de quête). Les clés et l'index de
   recherche gardent la donnée brute.
   + GARDE GÉNÉRIQUE anti-jeton moteur (audit quêtes 2026-07-11, classe E :
   « Barrel_of_water », « Spot_without_light_1 », « use_ability »… rendus
   tels quels dans les fiches) : un mot à underscores est TOUJOURS un
   identifiant moteur, jamais un texte joueur (vérifié : aucun nom
   d'affichage du client n'en porte) — les underscores deviennent des
   espaces à l'AFFICHAGE (prettification honnête, jamais un nom inventé) ;
   la donnée brute reste intacte partout ailleurs. */
const cleanLabel = s => String(s ?? '').replace(/\s*TEXTURING\b/gi, '').replace(/\bQItem\s+/gi, '')
  .replace(/\b[\w]+(?:_[\w]+)+\b/g, m => m.replace(/_+/g, ' '));

export { $, $$, esc, fmtCoord, pretty, capitalize, initials, itemGlyph, iconTag, reduceMotion, fold, editLe, cleanLabel };
