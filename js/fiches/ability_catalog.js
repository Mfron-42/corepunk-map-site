/* Kwalat — fiches/ability_catalog.js : la RÉFÉRENCE DES CAPACITÉS à facettes
   (nouvelle surface, jumelle du catalogue d'objets fiches/catalog.js). Aucune
   donnée régénérée : lit UNIQUEMENT les champs déjà expédiés dans abilities.bin
   (slot / tags / resolvedDesc / formula / origin), plus le cooldown lu tel quel
   sur le scalaire `a.cooldown` cuit au build (core.js abilityCooldown). Rendu dans le tiroir
   latéral comme une fiche d'un NOUVEAU type (même openFiche/ficheHeader que le
   catalogue d'objets), branché au barrel fiches.js.

   Ce module ne fait AUCUN routage de clic lui-même : comme le catalogue d'objets,
   les gestes passent par le délégué global de main.js (data-act abc-*) et chaque
   ligne de résultat est une EntityRef ref() [Capacité] routée par ref-open vers
   la fiche capacité existante (openAbilityFiche). Facettes ET entre elles, OU à
   l'intérieur ; compteurs PAR VALEUR exacts, recalculés à chaque changement,
   convention « sauf soi-même » (le compte d'une valeur ignore la sélection de SA
   PROPRE facette). L'état complet est encodé dans le jeton de hash `abc=`
   (deep-link, aller-retour prouvé — voir encodeState/decodeState).

   FACETTES — fondées sur des CHAMPS RÉELS du bin, jamais une classification
   inventée (pas de « joueur vs monstre » : abilities.bin ne porte aucun champ de
   ce type, et une heuristique de préfixe de clé serait exactement le genre de
   dérivation tirée par les cheveux que la doctrine interdit) :
     - Emplacement (slot) : Q/W/E/R/MA — 32/240 capacités portent un slot réel
       (les 208 autres l'ont à null → aucune valeur, jamais une pastille vide).
     - Tag (tags) : les tags verbatim du client, tels quels (données brutes du
       jeu, mêmes chips que la fiche) — triés par fréquence, tronqués en longue
       traîne comme l'archétype du catalogue d'objets.
     - Détails : trois prédicats PROUVÉS et multi-valeurs — a une description
       (225), a une formule décodée (20), a un cooldown chiffré par la règle (3).

   Pas de gate « contenu dev » ici (contrairement au catalogue d'objets) :
   abilities.bin ne porte PAS de champ isTest/isInternal — les 240 capacités sont
   affichées, aucune n'est masquée par défaut (même périmètre que l'index de
   recherche des capacités, qui les liste déjà toutes). */
import { S } from '../state.js';
import { ABILITY_HEX, entityColor } from '../config.js';
import { esc, fold, iconTag } from '../utils.js';
import { tr, numberLocale } from '../i18n/index.js';
import { ficheHeader, openFiche, setFicheHash, abilityCooldown } from './core.js';
import { ref } from '../mapref.js';

/* ── Accès aux champs (jamais re-dérivé ailleurs) ─────────────────────────── */
function detailValues(a) {
  const out = [];
  if (a.resolvedDesc) out.push('desc');
  if (a.formula) out.push('formula');
  const cd = abilityCooldown(a);
  if (cd && cd.value != null) out.push('cooldown');
  return out;
}
function abilityValues(a, facetId) {
  switch (facetId) {
    case 'slot': return a.slot ? [a.slot] : [];
    case 'tag': return a.tags || [];
    case 'detail': return detailValues(a);
  }
  return [];
}

/* ── Libellés localisés par facette (repli honnête = valeur brute) ────────── */
function facetValueLabel(facetId, v) {
  if (facetId === 'detail') return tr('abcDetail' + v[0].toUpperCase() + v.slice(1));
  // slot (Q/W/E/R/MA) et tag (chaîne verbatim du client) : déjà lisibles, rendus
  // tels quels — aucune reformulation, aucune couleur inventée.
  return v;
}

/* ── Table des facettes ───────────────────────────────────────────────────── */
const FACETS = [
  { id: 'slot', titleKey: 'abcFacetSlot', order: 'slot' },
  { id: 'tag', titleKey: 'abcFacetTag', order: 'count', cap: 24 },
  { id: 'detail', titleKey: 'abcFacetDetail', order: 'detail' },
];
const FACET_IDS = FACETS.map(f => f.id);
const SLOT_ORDER = ['Q', 'W', 'E', 'R', 'MA'];
const DETAIL_ORDER = ['desc', 'formula', 'cooldown'];

/* ── Encodage du jeton de hash `abc=` (deep-link) ─────────────────────────────
   Même grammaire que `cat=` : tokens séparés par ',', chaque token
   `<code>.<valeur>`. Les valeurs de slot/detail sont sans ',' ni '.' → brutes ;
   un tag (texte libre, peut contenir espace) passe par encodeURIComponent. `so.`
   toujours présent (jeton non vide garanti). */
const FACET_CODE = { slot: 's', tag: 't', detail: 'd' };
const CODE_FACET = Object.fromEntries(Object.entries(FACET_CODE).map(([f, c]) => [c, f]));
const SORTS = ['name', 'slot'];

function newState() {
  const st = { sort: 'name', page: 0 };
  for (const f of FACET_IDS) st[f] = new Set();
  return st;
}
function encodeState(st) {
  const toks = [];
  for (const f of FACET_IDS) {
    for (const v of st[f]) toks.push(FACET_CODE[f] + '.' + (f === 'tag' ? encodeURIComponent(v) : v));
  }
  toks.push('so.' + st.sort);
  if (st.page > 0) toks.push('pg.' + (st.page + 1));
  return toks.join(',');
}
function decodeState(str) {
  const st = newState();
  for (const tok of String(str || '').split(',').filter(Boolean)) {
    const i = tok.indexOf('.');
    if (i < 0) continue;
    const code = tok.slice(0, i), rest = tok.slice(i + 1);
    if (code === 'so') { if (SORTS.includes(rest)) st.sort = rest; continue; }
    if (code === 'pg') { const n = parseInt(rest, 10); if (n >= 1) st.page = n - 1; continue; }
    const facet = CODE_FACET[code];
    if (!facet || !rest) continue;
    st[facet].add(facet === 'tag' ? decodeURIComponent(rest) : rest);
  }
  return st;
}

/* ── État vivant + prédicats de filtre ────────────────────────────────────── */
let abcState = newState();

function passesFacet(a, facetId) {
  const sel = abcState[facetId];
  if (!sel.size) return true;
  for (const v of abilityValues(a, facetId)) if (sel.has(v)) return true;
  return false;
}
function matchExcept(a, exceptId) {
  for (const f of FACET_IDS) if (f !== exceptId && !passesFacet(a, f)) return false;
  return true;
}
const matchAll = a => matchExcept(a, null);

function abilityEntries() { return Object.entries(S.abilities || {}); }

/* ── Rendu : facettes ─────────────────────────────────────────────────────── */
function valueCounts(facetId) {
  const counts = new Map();
  for (const [, a] of abilityEntries()) {
    if (!matchExcept(a, facetId)) continue;
    for (const v of abilityValues(a, facetId)) counts.set(v, (counts.get(v) || 0) + 1);
  }
  return counts;
}
function sortValues(facetId, order, counts) {
  const keys = [...counts.keys()];
  if (order === 'slot') return keys.sort((a, b) => (SLOT_ORDER.indexOf(a) + 1 || 99) - (SLOT_ORDER.indexOf(b) + 1 || 99));
  if (order === 'detail') return keys.sort((a, b) => (DETAIL_ORDER.indexOf(a) + 1 || 99) - (DETAIL_ORDER.indexOf(b) + 1 || 99));
  return keys.sort((a, b) => (counts.get(b) - counts.get(a)) || String(a).localeCompare(String(b)));
}
function facetPill(facetId, v, count, active) {
  const label = facetValueLabel(facetId, v);
  const n = count.toLocaleString(numberLocale());
  return `<button type="button" class="rar-pill cat-pill${active ? ' is-active' : ''}"`
    + ` style="--chip-c:var(--muted)" data-act="abc-facet"`
    + ` data-facet="${esc(facetId)}" data-id="${esc(v)}" aria-pressed="${active}">`
    + `<span class="rar-dot"></span>${esc(label)}<span class="cat-pill-n">${esc(n)}</span></button>`;
}
function facetGroupHtml(facet) {
  const counts = valueCounts(facet.id);
  const sel = abcState[facet.id];
  for (const v of sel) if (!counts.has(v)) counts.set(v, 0);
  let vals = sortValues(facet.id, facet.order, counts);
  if (!vals.length) return '';
  let truncated = 0;
  if (facet.cap && vals.length > facet.cap) {
    const kept = vals.slice(0, facet.cap);
    const keptSet = new Set(kept);
    for (const v of vals) if (sel.has(v) && !keptSet.has(v)) { kept.push(v); keptSet.add(v); }
    truncated = vals.length - kept.length;
    vals = kept;
  }
  const pills = vals.map(v => facetPill(facet.id, v, counts.get(v) || 0, sel.has(v))).join('');
  const more = truncated > 0 ? `<span class="cat-facet-more">${esc(tr('catMoreValues', truncated))}</span>` : '';
  const title = esc(tr(facet.titleKey));
  return `<div class="cat-facet-group"><span class="rar-select-label">${title}</span>`
    + `<div class="rar-pills cat-pills" role="group" aria-label="${title}">${pills}${more}</div></div>`;
}

/* Barre des filtres ACTIFS : une chip retirable par valeur sélectionnée + un
   bouton « Tout effacer » (mêmes libellés génériques que le catalogue d'objets). */
function activeFiltersHtml() {
  const chips = [];
  for (const facet of FACETS) {
    for (const v of abcState[facet.id]) {
      const label = facetValueLabel(facet.id, v);
      chips.push(`<button type="button" class="region-count-chip cat-active-chip"`
        + ` data-act="abc-unfacet" data-facet="${esc(facet.id)}" data-id="${esc(v)}"`
        + ` aria-label="${esc(tr('catRemoveFilter', label))}">`
        + `<span class="region-cc-label">${esc(label)}</span><span class="cat-chip-x" aria-hidden="true">✕</span></button>`);
    }
  }
  if (!chips.length) return '';
  return `<div class="cat-active-bar"><span class="rar-select-label">${esc(tr('catActiveLabel'))}</span>`
    + `<div class="cat-active-chips">${chips.join('')}</div>`
    + `<button type="button" class="cat-clear-all" data-act="abc-clear">${esc(tr('catClearAll'))}</button></div>`;
}

/* ── Rendu : résultats ────────────────────────────────────────────────────── */
const PAGE_SIZE = 120;
function slotRank(a) { const i = SLOT_ORDER.indexOf(a.slot); return i < 0 ? 99 : i; }
function sortResults(list) {
  const byName = (a, b) => fold(a[1].name).localeCompare(fold(b[1].name));
  if (abcState.sort === 'slot') return list.sort((a, b) => (slotRank(a[1]) - slotRank(b[1])) || byName(a, b));
  return list.sort(byName);
}
function rowMetaHtml(a) {
  const bits = [];
  // Provenance « capacité de monstre » (a.origin==='monster') : petit tag muet
  // — le nom est un libellé prettifié du pipeline, pas une localisation joueur ;
  // le signaler évite de le confondre avec un sort de héros (jamais un lien/une
  // couleur inventés, juste un rappel de provenance honnête).
  if (a.origin === 'monster') bits.push(`<span class="cat-meta-t">${esc(tr('abilityOriginMonster'))}</span>`);
  if (a.slot) bits.push(`<span class="cat-meta-t">${esc(a.slot)}</span>`);
  const cd = abilityCooldown(a);
  if (cd && cd.value != null) bits.push(`<span class="cat-meta-r">${esc(tr('abilityCooldownSeconds', cd.value.toLocaleString(numberLocale())))}</span>`);
  return bits.length ? `<span class="cat-row-meta">${bits.join('')}</span>` : '';
}
function rowHtml([key, a]) {
  const icon = a.icon ? `icons/${a.icon}` : null;
  return `<div class="frow cat-row" data-n="${esc(fold(a.name))}">`
    + `${iconTag(icon, 'fr-icon', '✨')}`
    + `${ref({ kind: 'ability', key, label: a.name, hex: entityColor('ability', a.name) || ABILITY_HEX, hasFiche: true })}`
    + `${rowMetaHtml(a)}</div>`;
}
function sortControlsHtml() {
  const btn = (s) => `<button type="button" class="rar-pill cat-sort-pill${abcState.sort === s ? ' is-active' : ''}"`
    + ` data-act="abc-sort" data-id="${s}" aria-pressed="${abcState.sort === s}">${esc(tr('abcSort' + s[0].toUpperCase() + s.slice(1)))}</button>`;
  return `<div class="cat-sort"><span class="rar-select-label">${esc(tr('catSortLabel'))}</span>`
    + `<div class="rar-pills">${SORTS.map(btn).join('')}</div></div>`;
}
function pagerHtml(page, pages, total, from, to) {
  if (pages <= 1) return '';
  const prev = `<button type="button" class="cat-page-btn" data-act="abc-page" data-id="${page - 1}"${page <= 0 ? ' disabled' : ''}>${esc(tr('catPagePrev'))}</button>`;
  const next = `<button type="button" class="cat-page-btn" data-act="abc-page" data-id="${page + 1}"${page >= pages - 1 ? ' disabled' : ''}>${esc(tr('catPageNext'))}</button>`;
  const nfmt = n => n.toLocaleString(numberLocale());
  const label = `<span class="cat-page-label">${esc(tr('catShowing', nfmt(from), nfmt(to), nfmt(total)))}</span>`;
  return `<div class="cat-pager">${prev}${label}${next}</div>`;
}

/* ── Rendu global ─────────────────────────────────────────────────────────── */
function renderCatalog() {
  const facetsHtml = FACETS.map(facetGroupHtml).join('');

  const shown = [];
  for (const [key, a] of abilityEntries()) {
    if (!matchAll(a)) continue;
    shown.push([key, a]);
  }
  sortResults(shown);
  const total = shown.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(0, abcState.page), pages - 1);
  abcState.page = page;
  const from = total ? page * PAGE_SIZE + 1 : 0;
  const to = Math.min(total, (page + 1) * PAGE_SIZE);
  const slice = shown.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  let resultsInner;
  if (!total) {
    resultsInner = `<p class="hint cat-no-results">${esc(tr('abcNoResults'))}</p>`;
  } else {
    resultsInner = `${sortControlsHtml()}`
      + `<input type="search" class="stock-filter cat-filter" placeholder="${esc(tr('abcFilterPlaceholder'))}" aria-label="${esc(tr('abcFilterPlaceholder'))}">`
      + `<div class="fiche-scroll cat-results">${slice.map(rowHtml).join('')}</div>`
      + pagerHtml(page, pages, total, from, to);
  }

  const nTotal = total.toLocaleString(numberLocale());
  openFiche(`
    ${ficheHeader({
      name: tr('abcTitle'),
      sub: esc(tr('abcCount', nTotal)),
    })}
    <div class="cat-body">
      ${activeFiltersHtml()}
      <div class="cat-facets">${facetsHtml}</div>
      <div class="fiche-section cat-results-section">${resultsInner}</div>
    </div>`);
  setFicheHash('ability_catalog', encodeState(abcState));
  S.openFiche = { kind: 'ability_catalog', id: encodeState(abcState) };
}

/* ── API (routée par main.js) ─────────────────────────────────────────────── */
function openAbilityCatalogFiche(encoded) {
  abcState = (encoded != null && encoded !== '') ? decodeState(encoded) : newState();
  renderCatalog();
}
function toggleAbcFacet(facetId, val) {
  if (!abcState[facetId]) return;
  const set = abcState[facetId];
  if (set.has(val)) set.delete(val); else set.add(val);
  abcState.page = 0;
  renderCatalog();
}
function setAbcSort(sort) {
  if (!SORTS.includes(sort) || abcState.sort === sort) return;
  abcState.sort = sort;
  renderCatalog();
}
function setAbcPage(n) {
  const p = parseInt(n, 10);
  if (!Number.isFinite(p)) return;
  abcState.page = p;
  renderCatalog();
}
function clearAbcFacets() {
  const sort = abcState.sort;
  abcState = newState();
  abcState.sort = sort;
  renderCatalog();
}

export { openAbilityCatalogFiche, toggleAbcFacet, setAbcSort, setAbcPage, clearAbcFacets };
