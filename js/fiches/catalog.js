/* Kwalat — fiches/catalog.js : le CATALOGUE D'OBJETS À FACETTES (nouvelle
   surface). Aucune donnée régénérée : lit UNIQUEMENT les champs déjà expédiés
   dans items.bin (kind / rarity|rarities / tier / prof / archetype /
   weapon.{class,use_type,specialization,tier}) et rend le tout dans le tiroir
   latéral comme une fiche d'un NOUVEAU type (même openFiche/ficheHeader que la
   fiche Région), branchée au barrel fiches.js.

   Ce module ne fait AUCUN routage de clic lui-même : comme toutes les autres
   fiches, les gestes passent par le délégué global de main.js (data-act
   cat-*, et les lignes de résultat sont des EntityRef ref() routées par
   ref-open). Les facettes sont ET entre elles (kind ∧ rarity ∧ …) et OU à
   l'intérieur d'une facette (rarity ∈ {Rare, Epic}). Les compteurs PAR VALEUR
   sont exacts et recalculés à chaque changement (convention « sauf soi-même » :
   le compte d'une valeur ignore la sélection de SA PROPRE facette, pour montrer
   honnêtement ce qu'ajouter cette valeur donnerait). L'état complet des
   facettes est encodé dans le jeton de hash `cat=` (deep-link, aller-retour
   prouvé — voir encodeState/decodeState + main.js restoreState).

   Contenu dev/test (devcontent.js isHiddenTest = isTest || isInternal) : masqué
   par défaut, révélé par le tag « Contenu dev » global (S.devOn), compté À PART
   (jamais mêlé au total ni aux compteurs de valeur). */
import { S } from '../state.js';
import { RARITY, itemKindLabel, rarityLabel, professionLabel, weaponClassLabel } from '../config.js';
import { esc, fold, iconTag, itemGlyph, pretty } from '../utils.js';
import { tr, tbl, numberLocale } from '../i18n/index.js';
import { RARITY_ORDER } from '../rarity.js';
import { isHiddenTest } from '../devcontent.js';
import { ref } from '../mapref.js';
import { ficheHeader, openFiche, setFicheHash, itemEcHex, isRecipeKind } from './core.js';

/* ── Accès aux champs (jamais re-dérivé ailleurs) ─────────────────────────── */
/* Tier UNIFIÉ : les armes portent leur palier dans weapon.tier (le tier de
   1er niveau est null pour kind==='weapon'), tout le reste dans it.tier — une
   seule facette « Tier » couvre donc les deux (sans quoi « weapon + T3 »
   donnerait 0). */
function tierOf(it) { return it.tier || (it.weapon && it.weapon.tier) || null; }
/* Raretés d'un item : soit une rareté unique (it.rarity), soit la liste des
   variantes atteignables (it.rarities) — jamais les deux (byte-vérifié). */
function rarityValues(it) { return it.rarity ? [it.rarity] : (it.rarities || []); }

/* Valeurs d'un item pour une facette donnée (multi-valeur : rarités). */
function itemValues(it, facetId) {
  switch (facetId) {
    case 'kind': return it.kind ? [it.kind] : [];
    case 'rarity': return rarityValues(it);
    case 'tier': { const t = tierOf(it); return t ? [t] : []; }
    case 'prof': return it.prof ? [it.prof] : [];
    case 'archetype': return it.archetype ? [it.archetype] : [];
    case 'wclass': return it.weapon && it.weapon.class ? [it.weapon.class] : [];
    case 'wuse': return it.weapon && it.weapon.use_type ? [it.weapon.use_type] : [];
    case 'wspec': return it.weapon && it.weapon.specialization ? [it.weapon.specialization] : [];
  }
  return [];
}

/* ── Libellés localisés par facette (repli honnête pretty()) ──────────────── */
function facetValueLabel(facetId, v) {
  switch (facetId) {
    case 'kind': return itemKindLabel(v) || pretty(v);
    case 'rarity': return rarityLabel(v) || pretty(v);
    case 'prof': return professionLabel(v);
    case 'wclass': return weaponClassLabel(v);
    case 'wuse': return tbl('useType', v) || pretty(v);
    // tier ("T3"), archetype ("HP Regen"), wspec ("BlastMedic") : déjà des
    // chaînes lisibles côté données — rendues telles quelles, pretty() ne les
    // abîme pas (majuscule initiale seulement) mais n'apporte rien non plus.
    default: return v;
  }
}
/* Teinte de la pastille d'une valeur : la rareté est le SEUL axe dont la
   couleur est canonique (itemEcHex/RARITY, comme les fiches) ; ailleurs, dot
   neutre (aucune couleur de kind n'existe côté données — jamais inventée). */
function facetValueHex(facetId, v) {
  if (facetId === 'rarity') return (RARITY[v] && RARITY[v].hex) || 'var(--muted)';
  return 'var(--muted)';
}

/* ── Table des facettes ───────────────────────────────────────────────────── */
/* order : comment trier les VALEURS d'une facette dans son panneau.
   cap   : nombre max de valeurs affichées (les autres → « +N »), pour les
           facettes à longue traîne (archetype). */
const BASE_FACETS = [
  { id: 'kind', titleKey: 'catFacetKind', order: 'kind' },
  { id: 'rarity', titleKey: 'catFacetRarity', order: 'rarity' },
  { id: 'tier', titleKey: 'catFacetTier', order: 'tier' },
  { id: 'prof', titleKey: 'catFacetProf', order: 'count' },
  { id: 'archetype', titleKey: 'catFacetArchetype', order: 'count', cap: 40 },
];
const WEAPON_FACETS = [
  { id: 'wclass', titleKey: 'catFacetWclass', order: 'count' },
  { id: 'wuse', titleKey: 'catFacetWuse', order: 'count' },
  { id: 'wspec', titleKey: 'catFacetWspec', order: 'count' },
];
const ALL_FACET_IDS = [...BASE_FACETS, ...WEAPON_FACETS].map(f => f.id);
const KIND_ORDER = ['item', 'weapon', 'artifact', 'rune', 'chip', 'consumable',
  'resource', 'synthesis', 'recipe', 'quest_item'];
const TIER_ORDER = ['T1', 'T2', 'T3', 'T4'];

/* ── Encodage du jeton de hash `cat=` (deep-link) ─────────────────────────────
   Tokens séparés par ',' (propre dans le hash via le replace %2C→',' de
   setFicheHash), chaque token = `<code>.<valeur>` (split sur le PREMIER '.').
   Les valeurs énumérables (kind/rarity/tier/prof/weapon.*) sont sans ',' ni '.'
   → posées brutes ; l'archétype (texte libre, peut contenir espace/'+') passe
   par encodeURIComponent (jamais de ',' ni '.' non échappé) et est décodé au
   parse. `so.<tri>` toujours présent (garantit un jeton non vide, sinon
   setFicheHash n'écrirait rien) ; `pg.<N>` (1-based) seulement hors 1re page. */
const FACET_CODE = { kind: 'k', rarity: 'r', tier: 't', prof: 'p', archetype: 'a', wclass: 'wc', wuse: 'wu', wspec: 'ws' };
const CODE_FACET = Object.fromEntries(Object.entries(FACET_CODE).map(([f, c]) => [c, f]));
const SORTS = ['name', 'rarity', 'tier'];

function newState() {
  const st = { sort: 'name', page: 0 };
  for (const f of ALL_FACET_IDS) st[f] = new Set();
  return st;
}
function encodeState(st) {
  const toks = [];
  for (const f of ALL_FACET_IDS) {
    for (const v of st[f]) toks.push(FACET_CODE[f] + '.' + (f === 'archetype' ? encodeURIComponent(v) : v));
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
    st[facet].add(facet === 'archetype' ? decodeURIComponent(rest) : rest);
  }
  return st;
}

/* ── État vivant + prédicats de filtre ────────────────────────────────────── */
let catState = newState();

/* Les facettes rendues : les 5 de base + les 3 armes SEULEMENT quand kind
   contient « weapon » (blueprint mission §2). */
function activeFacets() {
  return catState.kind.has('weapon') ? [...BASE_FACETS, ...WEAPON_FACETS] : BASE_FACETS;
}
/* L'item passe-t-il la facette F (OU intra-facette) ? (facette vide ⇒ oui) */
function passesFacet(it, facetId) {
  const sel = catState[facetId];
  if (!sel.size) return true;
  for (const v of itemValues(it, facetId)) if (sel.has(v)) return true;
  return false;
}
/* Passe TOUTES les facettes SAUF `exceptId` (dev exclu à part). Convention
   « sauf soi-même » pour les compteurs de valeur. */
function matchExcept(it, exceptId) {
  for (const f of ALL_FACET_IDS) if (f !== exceptId && !passesFacet(it, f)) return false;
  return true;
}
const matchAll = it => matchExcept(it, null);

function itemEntries() { return Object.entries(S.items || {}); }

/* ── Rendu : facettes ─────────────────────────────────────────────────────── */
/* Compteurs exacts par valeur d'une facette, sur la base « toutes facettes sauf
   celle-ci » (dev exclu). Renvoie une Map valeur→compte. */
function valueCounts(facetId) {
  const counts = new Map();
  for (const [, it] of itemEntries()) {
    if (isHiddenTest(it)) continue;
    if (!matchExcept(it, facetId)) continue;
    for (const v of itemValues(it, facetId)) counts.set(v, (counts.get(v) || 0) + 1);
  }
  return counts;
}
function sortValues(facetId, order, counts) {
  const keys = [...counts.keys()];
  if (order === 'rarity') return keys.sort((a, b) => (RARITY_ORDER[a] ?? 99) - (RARITY_ORDER[b] ?? 99));
  if (order === 'kind') return keys.sort((a, b) => (KIND_ORDER.indexOf(a) + 1 || 99) - (KIND_ORDER.indexOf(b) + 1 || 99));
  if (order === 'tier') return keys.sort((a, b) => (TIER_ORDER.indexOf(a) + 1 || 99) - (TIER_ORDER.indexOf(b) + 1 || 99));
  return keys.sort((a, b) => (counts.get(b) - counts.get(a)) || String(a).localeCompare(String(b)));
}
function facetPill(facetId, v, count, active) {
  const label = facetValueLabel(facetId, v);
  const n = count.toLocaleString(numberLocale());
  return `<button type="button" class="rar-pill cat-pill${active ? ' is-active' : ''}"`
    + ` style="--chip-c:${facetValueHex(facetId, v)}" data-act="cat-facet"`
    + ` data-facet="${esc(facetId)}" data-id="${esc(v)}" aria-pressed="${active}">`
    + `<span class="rar-dot"></span>${esc(label)}<span class="cat-pill-n">${esc(n)}</span></button>`;
}
function facetGroupHtml(facet) {
  const counts = valueCounts(facet.id);
  const sel = catState[facet.id];
  // Toujours inclure les valeurs SÉLECTIONNÉES (même à 0 dans la base « sauf
  // soi-même ») pour qu'elles restent visibles/désélectionnables ; les autres
  // valeurs à 0 sont omises (rien à ajouter).
  for (const v of sel) if (!counts.has(v)) counts.set(v, 0);
  let vals = sortValues(facet.id, facet.order, counts);
  if (!vals.length) return '';
  let truncated = 0;
  if (facet.cap && vals.length > facet.cap) {
    // Cap : on garde les `cap` premières + toutes les sélectionnées au-delà.
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
   bouton « Tout effacer ». Vide quand aucune facette n'est active. */
function activeFiltersHtml() {
  const chips = [];
  for (const facet of [...BASE_FACETS, ...WEAPON_FACETS]) {
    for (const v of catState[facet.id]) {
      const label = facetValueLabel(facet.id, v);
      chips.push(`<button type="button" class="region-count-chip cat-active-chip"`
        + ` data-act="cat-unfacet" data-facet="${esc(facet.id)}" data-id="${esc(v)}"`
        + ` aria-label="${esc(tr('catRemoveFilter', label))}">`
        + `<span class="region-cc-label">${esc(label)}</span><span class="cat-chip-x" aria-hidden="true">✕</span></button>`);
    }
  }
  if (!chips.length) return '';
  return `<div class="cat-active-bar"><span class="rar-select-label">${esc(tr('catActiveLabel'))}</span>`
    + `<div class="cat-active-chips">${chips.join('')}</div>`
    + `<button type="button" class="cat-clear-all" data-act="cat-clear">${esc(tr('catClearAll'))}</button></div>`;
}

/* ── Rendu : résultats ────────────────────────────────────────────────────── */
const PAGE_SIZE = 120;
function rarityRank(it) {
  const rs = rarityValues(it).map(r => RARITY_ORDER[r] ?? -1);
  return rs.length ? Math.max(...rs) : -1;
}
function tierRank(it) { const t = tierOf(it); const i = TIER_ORDER.indexOf(t); return i < 0 ? -1 : i; }
function sortResults(list) {
  const byName = (a, b) => fold(a[1].name).localeCompare(fold(b[1].name));
  if (catState.sort === 'rarity') return list.sort((a, b) => (rarityRank(b[1]) - rarityRank(a[1])) || byName(a, b));
  if (catState.sort === 'tier') return list.sort((a, b) => (tierRank(b[1]) - tierRank(a[1])) || byName(a, b));
  return list.sort(byName);
}
function rowMetaHtml(it) {
  const bits = [];
  const t = tierOf(it);
  if (t) bits.push(`<span class="cat-meta-t">${esc(t)}</span>`);
  const rs = rarityValues(it);
  if (rs.length === 1) {
    bits.push(`<span class="cat-meta-r" style="--chip-c:${(RARITY[rs[0]] && RARITY[rs[0]].hex) || 'var(--muted)'}">${esc(rarityLabel(rs[0]) || rs[0])}</span>`);
  } else if (rs.length > 1) {
    bits.push(`<span class="cat-meta-r cat-meta-multi">${esc(tr('catNRarities', rs.length))}</span>`);
  }
  return bits.length ? `<span class="cat-row-meta">${bits.join('')}</span>` : '';
}
function rowHtml([key, it]) {
  const kind = isRecipeKind(it) ? 'recipe' : 'item';
  const icon = it.icon ? `icons/${it.icon}` : null;
  // data-n : nom replié, pour le filtre local de page (.stock-filter, core.js).
  return `<div class="frow cat-row" data-n="${esc(fold(it.name))}">`
    + `${iconTag(icon, 'fr-icon', itemGlyph(it))}`
    + `${ref({ kind, key, label: it.name, hex: itemEcHex(it), hasFiche: true })}`
    + `${rowMetaHtml(it)}</div>`;
}
function sortControlsHtml() {
  const btn = (s) => `<button type="button" class="rar-pill cat-sort-pill${catState.sort === s ? ' is-active' : ''}"`
    + ` data-act="cat-sort" data-id="${s}" aria-pressed="${catState.sort === s}">${esc(tr('catSort' + s[0].toUpperCase() + s.slice(1)))}</button>`;
  return `<div class="cat-sort"><span class="rar-select-label">${esc(tr('catSortLabel'))}</span>`
    + `<div class="rar-pills">${SORTS.map(btn).join('')}</div></div>`;
}
function pagerHtml(page, pages, total, from, to) {
  if (pages <= 1) return '';
  const prev = `<button type="button" class="cat-page-btn" data-act="cat-page" data-id="${page - 1}"${page <= 0 ? ' disabled' : ''}>${esc(tr('catPagePrev'))}</button>`;
  const next = `<button type="button" class="cat-page-btn" data-act="cat-page" data-id="${page + 1}"${page >= pages - 1 ? ' disabled' : ''}>${esc(tr('catPageNext'))}</button>`;
  const nfmt = n => n.toLocaleString(numberLocale());
  const label = `<span class="cat-page-label">${esc(tr('catShowing', nfmt(from), nfmt(to), nfmt(total)))}</span>`;
  return `<div class="cat-pager">${prev}${label}${next}</div>`;
}

/* ── Rendu global ─────────────────────────────────────────────────────────── */
function renderCatalog() {
  const facetsHtml = activeFacets().map(facetGroupHtml).join('');

  const shown = [];
  let hiddenCount = 0;
  for (const [key, it] of itemEntries()) {
    if (!matchAll(it)) continue;
    if (isHiddenTest(it)) { hiddenCount++; continue; }   // dev/interne masqué → compté à part
    shown.push([key, it]);
  }
  sortResults(shown);
  const total = shown.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(0, catState.page), pages - 1);
  catState.page = page;
  const from = total ? page * PAGE_SIZE + 1 : 0;
  const to = Math.min(total, (page + 1) * PAGE_SIZE);
  const slice = shown.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const hiddenNote = hiddenCount > 0
    ? `<p class="hint cat-hidden-note">${esc(tr('catHiddenNote', hiddenCount.toLocaleString(numberLocale())))}</p>` : '';

  let resultsInner;
  if (!total) {
    resultsInner = `<p class="hint cat-no-results">${esc(tr('catNoResults'))}</p>`;
  } else {
    resultsInner = `${sortControlsHtml()}`
      + `<input type="search" class="stock-filter cat-filter" placeholder="${esc(tr('catFilterPlaceholder'))}" aria-label="${esc(tr('catFilterPlaceholder'))}">`
      + `<div class="fiche-scroll cat-results">${slice.map(rowHtml).join('')}</div>`
      + pagerHtml(page, pages, total, from, to);
  }

  const nTotal = total.toLocaleString(numberLocale());
  openFiche(`
    ${ficheHeader({
      name: tr('catTitle'),
      sub: esc(tr('catCount', nTotal)),
    })}
    <div class="cat-body">
      ${activeFiltersHtml()}
      <div class="cat-facets">${facetsHtml}</div>
      <div class="fiche-section cat-results-section">${resultsInner}${hiddenNote}</div>
    </div>`);
  setFicheHash('catalog', encodeState(catState));
  S.openFiche = { kind: 'catalog', id: encodeState(catState) };
}

/* ── API (routée par main.js) ─────────────────────────────────────────────── */
/* Ouvre le catalogue. `encoded` : état de facettes du deep-link (cat=…), ou
   null/'' pour un catalogue neuf (aucune facette, tri par nom). */
function openCatalogFiche(encoded) {
  catState = (encoded != null && encoded !== '') ? decodeState(encoded) : newState();
  renderCatalog();
}
/* Bascule une valeur de facette (add/remove ; ET/OU géré par matchAll). Retirer
   « weapon » du kind vide les facettes armes (elles ne sont plus rendues). */
function toggleCatFacet(facetId, val) {
  if (!catState[facetId]) return;
  const set = catState[facetId];
  if (set.has(val)) set.delete(val); else set.add(val);
  if (facetId === 'kind' && !catState.kind.has('weapon')) {
    for (const f of WEAPON_FACETS) catState[f.id].clear();
  }
  catState.page = 0;
  renderCatalog();
}
function setCatSort(sort) {
  if (!SORTS.includes(sort) || catState.sort === sort) return;
  catState.sort = sort;
  renderCatalog();
}
function setCatPage(n) {
  const p = parseInt(n, 10);
  if (!Number.isFinite(p)) return;
  catState.page = p;
  renderCatalog();
}
function clearCatFacets() {
  const sort = catState.sort;
  catState = newState();
  catState.sort = sort;
  renderCatalog();
}

export { openCatalogFiche, toggleCatFacet, setCatSort, setCatPage, clearCatFacets };
