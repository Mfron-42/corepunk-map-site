/* Kwalat — fiches/core.js (issu du découpage de fiches.js, vague E'c-S).
   Briques partagées : en-tête de fiche, openFiche/closeFiche/setFicheHash,
   lignes de butin, badges d'état, boutons carte, références EntityRef (speciesRef/
   npcRef/campRef), lignes de camp, et la machinerie de zone d'objectif/monstre. */
import { S } from '../state.js';
import {
  CATS, CAMP_COLORS, RARITY, MONSTER_HEX, ABILITY_HEX, RECIPE_HEX, ZONE_HEX, nodeHex,
  actorKindLabel, campKindLabel, monsterAttackLabel, locationKindLabel,
  rarityLabel, itemKindLabel, professionLabel, harvestMethodLabel,
  weaponTypeLine, weaponClassLabel, ACTION_META, actionVerb, actionIconSvg, mapName,
  campLabel, campQualifierChip, campModeLabel, chestDisplayName,
  statLabel, statTierLabel, formulaTermLabel,
  chestHex, chestKindLabel, prettyRegion, ecAttr, familyKey,
  speciesLayerHex, familyLayerHex, entityColor,
} from '../config.js';
import { $, esc, fmtCoord, fold, iconTag, initials, itemGlyph, npcIconUrl, pretty, cleanLabel } from '../utils.js';
import { tr, tbl, numberLocale } from '../i18n/index.js';
import { map, toLL, canvasR, clearHighlight, showHighlight } from '../mapview.js';
import { clearLocator } from '../pins.js';
import {
  unfocus, FICHE_HASH_KEYS,
  npcTokenForIndex, chestTokenForIndex, locationTokenForIndex,
} from '../urlstate.js';
import { monsterKeyFor, npcIndexByName, loreIndexFor, lootTableItems } from '../data.js';
import { campGroupByKey, speciesPoints, familyPoints, monsterFamilies, kindRestPoints } from '../pointsets.js';
import { RARITY_ORDER, rarityGroupFor } from '../rarity.js';
import { isHiddenTest, visibleQuestSlugs } from '../devcontent.js';
import { ref, refDot } from '../mapref.js';

/* ── En-tête de fiche PARTAGÉ (TASK 1, owner 2026-07-12) ─────────────────────
   Toute fiche du tiroir de droite montre le MÊME en-tête : un TITRE h2 coloré
   dans la teinte PRÉCISE de l'entité (Q6) précédé — quand l'entité est
   dessinable — d'une pastille toggle (refDot), puis un SOUS-TITRE muet SOUS le
   titre portant le kind/le détail SANS répéter le nom (« (●) Scolopendra » /
   « Lvl 20 », plus jamais « SCOLOPENDRA · LVL 20 » au-dessus d'un « Scolopendra »
   en doublon). L'ordre est inversé par rapport à l'ancien en-tête (titre
   d'abord, détail dessous).
   La pastille (refDot) — présente UNIQUEMENT quand il y a réellement quelque
   chose à afficher sur la carte active (règle owner 2026-07-12 « pas de dot si
   aucune position connue à afficher » ; le ⊘ « dessinable mais 0 point ici »
   n'est plus émis pour ces affordances, l'appelant gate `drawable`) :
     - couche PERSISTANTE (espèce/famille, mode E) : ⇔ speciesPoints/familyPoints
       non nul ; bascule la couche d'arbre, reste synchronisée depuis n'importe
       quelle surface (syncEntityRefDots §5.3) ;
     - LOCATE (npc/camp/lieu/coffre, mode L, Q7) : ⇔ une position connue ;
       bascule un pin persistant (S.locates), listé dans le bandeau-légende,
       retirable — l'équivalent honnête le plus proche pour une entité mono-
       point sans couche d'arbre ;
     - kind non dessinable (objet/recette/quête/butin/capacité/nœud) : jamais
       de pastille — titre coloré seul.
   Signature — { avatar (HTML icône/mosaïque, '' si aucun), name (texte brut,
   échappé ici), hex (teinte précise du titre = celle de la pastille), dot
   (descripteur refDot ou null), sub (HTML du sous-titre déjà composé, SANS le
   nom), nameSuffix (HTML collé au nom : chip qualificatif/générique/dev),
   below (HTML sous le sous-titre : coords, ligne donneur, badge…) }. */
function ficheHeader({ avatar = '', name, hex = null, dot = null, sub = '', nameSuffix = '', below = '' }) {
  const dotHtml = dot ? refDot(dot) : '';
  const style = hex ? ` style="--ref-c:${hex}"` : '';
  return `<div class="fiche-head">${avatar}
    <div class="fiche-head-main">
      <h2 class="fiche-title"${style}>${dotHtml}<span class="fiche-title-name">${esc(name)}</span>${nameSuffix}</h2>
      ${sub ? `<div class="fiche-kind">${sub}</div>` : ''}
      ${below}
    </div></div>`;
}

/* Rendu commun d'un taux de drop : quantité ("×N", dès que count>1) suivi de
   soit « Garanti » (uniquement quand `g` est vrai -- un item qui occupe la
   quasi-totalité de la masse pondérée de sa table ; la règle a été durcie,
   un simple poids `w`>=1 NE PROUVE PLUS rien seul -- ~93,6 % des lignes du
   dataset étaient marquées « garanti » à tort avant ce correctif, voir
    "guaranteed") soit la Badge FERMÉE `weight-share` (blueprint
   §5.2, même composant que l'obtain block de la fiche objet, item.js
   obtainDropRowHtml) quand `d.ch` (la weight_share de l'objet dans la table,
   0..1) est calculable -- jamais un « % de chance » : la vraie probabilité par
   KILL est décidée côté serveur, absente des données client (honesty fix,
   voir  §3 -- l'ancien rendu ≈N% sous un intitulé
   "Chance" faisait passer une PART de table pour une chance de drop, le même
   bug que l'obtain block d'item.js corrigeait déjà). La Badge porte ce
   caveat dans son info-bulle (i18n `badge` section, valWeightShare/Tip,
   E'c-0/E'c-1 -- aucune clé nouvelle). `d.ch` absent (part non calculable) :
   on n'affiche PAS le poids brut `w` comme un faux pourcentage (c'était le
   bug d'origine -- un poids de 1.0 pouvait se lire « 100 % » pour une part
   réelle de l'ordre de 1 %) -- juste la quantité connue, honnêtement. */
function dropRateHtml(d) {
  const countBit = d.c > 1 ? `<span class="muted">×${d.c}</span>` : '';
  if (d.g) return `<span class="muted">${esc([d.c > 1 ? `×${d.c}` : '', tr('guaranteedLabel')].filter(Boolean).join(' '))}</span>`;
  if (d.ch != null) return `${countBit}${badge({ axis: 'value', value: 'weight-share' })}`;
  return countBit;
}

/* Ligne de butin commune (fiche monstre/camp) : icône + nom cliquable vers
   la fiche item quand connue + taux (dropRateHtml : ×N/garanti/Badge
   weight-share). */
function monsterLootRow(d) {
  return dropRow(d.icon ? `icons/${esc(d.icon)}` : null, d.name,
    S.items[d.key] ? 'fiche-item' : null, d.key, dropRateHtml(d), itemGlyph(S.items[d.key]));
}
function lootRowsHtml(list, emptyKey) {
  // Pastille "unknown" ( #9, task #67) : ce repli
  // partagé (monstre/camp/coffre/table) dit "rien de catalogué" -- un vrai
  // trou de couverture connu, jamais un aveu que le jeu n'a pas de butin ici
  // (voir noLootCatalogued/noHarvestCatalogued -- suivi ouvert, pas final).
  if (!list?.length) return `<p class="hint">${badge({ axis: 'provenance', value: 'absent', extra: tr(emptyKey) })}</p>`;
  const guaranteed = list.filter(d => d.g);
  const shareRows = list.filter(d => !d.g);
  // Intitulé du 2e groupe (honesty fix) : PLUS "Chance" (laissait croire à une
  // probabilité par kill) -- réutilise le libellé fermé de la Badge
  // weight-share (tbl('badge','valWeightShare'), déjà expédié ×5 locales,
  // AUCUNE clé nouvelle) : "Table share" / "Part de la table" -- le même mot
  // que la Badge posée sur chacune de ces lignes juste dessous.
  return (guaranteed.length ? `<h4 class="fiche-sub">${esc(tr('guaranteedLabel'))}</h4>${guaranteed.map(monsterLootRow).join('')}` : '')
    + (shareRows.length ? `<h4 class="fiche-sub">${esc(tbl('badge', 'valWeightShare'))}</h4>${shareRows.map(monsterLootRow).join('')}` : '');
}

/* Nombre générique (coefficients de formule, rarity_scaling/tier_scaling) :
   au plus 4 décimales, jamais de zéro de remplissage inventé -- la précision
   affichée est celle des données, pas une convention arbitraire. */
function fmtNum(n) {
  if (n == null) return '?';
  return n.toLocaleString(numberLocale(), { maximumFractionDigits: 4 });
}
/* Une pastille "rar-pill" (allumée = span figé / éteinte = bouton cliquable)
   -- helper partagé par les 3 sélecteurs qui utilisent ce composant visuel
   (rareté de plage de jet ci-dessous, variantes de rareté d'objet et
   variantes de monstre dans openItemFiche/monsterVariantPickHtml plus bas) :
   même HTML span/button, seuls le libellé/la couleur/la cible data-act/id
   changent d'un appelant à l'autre. */
function pillHtml({ active, hex, label, act, id, extra = '', mark = '' }) {
  return active
    ? `<span class="rar-pill is-active" style="--chip-c:${hex}" aria-current="true"><span class="rar-dot"></span>${esc(label)}${mark}</span>`
    : `<button type="button" class="rar-pill" style="--chip-c:${hex}" data-act="${act}" data-id="${esc(id)}"${extra}><span class="rar-dot"></span>${esc(label)}${mark}</button>`;
}
/* Enveloppe ".rar-select" partagée (libellé + groupe de pastilles) -- même
   libellé utilisé pour le texte visible ET l'aria-label du groupe. */
function pillSelectHtml(labelKey, pillsHtml) {
  const label = esc(tr(labelKey));
  return `<div class="rar-select"><span class="rar-select-label">${label}</span>
    <div class="rar-pills" role="group" aria-label="${label}">${pillsHtml}</div></div>`;
}
/* Existe-t-il ≥1 espèce catalogue dans cette famille ? (garde de lien : un
   jeton famille sans membre n'ouvre pas de fiche — jamais un lien mort.) */
function familyHasMembers(fam) {
  const f = familyKey(fam);
  for (const sp of Object.values(S.species || {})) {
    if (!isHiddenTest(sp) && familyKey(sp.family || 'other') === f) return true;
  }
  return false;
}

/* ── Fiches (drawer) ────────────────────────────────────────── */
const detail = document.createElement('aside');
detail.id = 'detail';
detail.innerHTML = `<button id="detail-close" aria-label="${esc(tr('closeBtnAria'))}">✕</button><div id="detail-body"></div>`;
$('#map-wrap').appendChild(detail);
detail.querySelector('#detail-close').onclick = () => unfocus(closeFiche);
/* Filtre local des longues listes (stock vendeur / table de butin) : masque
   les lignes dont le nom replié (data-n) ne contient pas la saisie. */
detail.addEventListener('input', e => {
  const inp = e.target.closest('.stock-filter');
  if (!inp) return;
  const q = fold(inp.value);
  const box = inp.closest('.fiche-section')?.querySelector('.fiche-scroll');
  if (!box) return;
  box.querySelectorAll('.frow').forEach(row => {
    row.style.display = !q || (row.dataset.n || '').includes(q) ? '' : 'none';
  });
});
function closeFiche() {
  detail.classList.remove('open');
  if (S.investLayer) { map.removeLayer(S.investLayer); S.investLayer = null; }
  if (S.questZoneLayer) { map.removeLayer(S.questZoneLayer); S.questZoneLayer = null; }
  clearGoalZone();
  clearHighlight();
  // Le réticule ambré (pins.js setLocator) posé par un goto sans pin connu
  // (goal dynamique, centroïde de camp…) ne devait jamais survivre à la
  // fermeture de la fiche qui l'a fait apparaître -- avant ce correctif, rien
  // ne l'effaçait jamais (voir , "lingers
  // forever"). No-op si aucun réticule n'est posé. Q7 (ratifié §9) : les
  // pins LOCATE (S.locates, pins.js addLocatePin — les toggles des pastilles
  // mode L) ne sont VOLONTAIREMENT pas effacés ici : ils survivent à la
  // fermeture de fiche et ne se retirent que par leur pastille, leur tag de
  // légende (✕) ou leur popup — clearLocator ne touche que le réticule
  // single-slot historique.
  clearLocator();
  S.openFiche = null;
  setFicheHash(null);
}
function openFiche(html) {
  $('#detail-body').innerHTML = html;
  detail.classList.add('open');
}
/* Lien profond de fiche dans le hash — les 15 kinds sont mutuellement exclusifs,
   une seule fiche ouverte à la fois (blueprint §1.2, objectif 17/17 des surfaces
   deep-linkables). Table UNIQUE kind→jeton ci-dessous ; la liste des noms de
   paramètre vit dans urlstate.js (FICHE_HASH_KEYS) — même source pour l'exclusion
   mutuelle ici et le report à travers un pan/zoom (buildHash).
   `history.state` (pas `null`) : préserve le marqueur {cpm,cpmSeq} de l'entrée
   courante — posé soit par la restauration initiale, soit par pushFocusState()
   juste avant que cette fonction ne soit appelée — sans quoi CE replaceState
   l'effacerait à chaque ouverture de fiche et canGoBackLocally()/unfocus() ne
   fonctionneraient plus jamais. */
const FICHE_TOKEN = {
  quest: 'q', item: 'i', npc: 'npc', monster: 'mon', family: 'fam',
  wildlife: 'wsp', camp: 'camp', region: 'zone',
  // Vague E'c-6 — les 7 surfaces nouvellement deep-linkables.
  chest: 'ch', searchable_chest: 'sc', loot: 'lt', node: 'node',
  location: 'loc', ability: 'ab', recipe: 'rec',
  // Vague E'c-8 (blueprint §1.2/§7, opt L3) — talent/spécialisation/métier,
  // fiches/build.js. Jetons tal=/spec=/prof= désormais PLEINEMENT deep-linkables
  // (E'c-8 clos) : ils figurent dans FICHE_HASH_KEYS (importé plus haut) — donc
  // couverts par la boucle d'exclusion mutuelle de setFicheHash + le report à
  // travers un pan/zoom (buildHash) — ET relus au chargement (restoreState).
  // Rien de spécifique à ajouter ici : leur sérialisation passe par FICHE_TOKEN
  // comme les 15 autres kinds.
  talent: 'tal', spec: 'spec', profession: 'prof',
};
/* npc/chest/location portent un INDEX POSITIONNEL dans S.openFiche.id ; on
   SÉRIALISE une clé STABLE (un index glisse à la reconstruction → lien cassé,
   blueprint §8-R3). Résolu à l'index à la restauration (urlstate.js / main.js). */
function ficheTokenValue(kind, id) {
  if (kind === 'npc') return npcTokenForIndex(id);
  if (kind === 'chest') return chestTokenForIndex(id);
  if (kind === 'location') return locationTokenForIndex(id);
  return id;
}
function setFicheHash(kind, id) {
  const p = new URLSearchParams(location.hash.slice(1));
  for (const t of FICHE_HASH_KEYS) p.delete(t);       // exclusion mutuelle : un seul des 18 jetons de fiche (tal/spec/prof compris — E'c-8)
  // Openers historiques du monde/objet (coffre, coffre fouillable, chronique,
  // table de butin, nœud, capacité, recette) : ils posent S.openFiche puis
  // appellent setFicheHash(null) (leur module précède le deep-link) — on dérive
  // alors le jeton de S.openFiche. closeFiche() met S.openFiche à null AVANT cet
  // appel, ce chemin reste donc un pur nettoyage quand aucune fiche n'est ouverte.
  if (kind == null && S.openFiche) { kind = S.openFiche.kind; id = S.openFiche.id; }
  const tok = kind && FICHE_TOKEN[kind];
  if (tok) {
    const v = ficheTokenValue(kind, id);
    if (v != null && v !== '') p.set(tok, String(v));
  }
  history.replaceState(history.state, '', '#' + p.toString().replace(/%2C/g, ','));
}

/* ── Badge — the ONE closed honesty vocabulary (blueprint §5.2) ──────────────
   The single honesty primitive (E'c-1). Collapses the three parallel systems
   that coexisted before — .state-chip (4 states), the position-confidence
   ladder (posDynamic/…), .stats-badge (real/estimated) — AND the .effect-var-*
   runtime placeholders, into one closed component on 3 orthogonal axes plus 3
   typed value-renders. Every honesty statement in the UI is now a Badge from
   this closed set; its hedging prose lives in the tooltip (ONTOLOGY §F: no
   free-floating hedging prose). Labels + tooltips come EXCLUSIVELY from the
   i18n `badge` section (E'c-0, tbl('badge', <key>)) — the front never invents
   a honesty word of its own.
     axis 'provenance' — where a fact comes from: official / derived / inferred / absent
     axis 'precision'  — how exact a location is: pinned / area / via-chain / unlocated
     axis 'content'    — orthogonal flag: dev (danger-red, NOT a fact-provenance)
     axis 'value'      — the 3 typed value-renders: weight-share / roster-server-side / cospawn-probable
   { axis, value } select the i18n label key + its `*Tip` tooltip + the CSS
   variant `.badge--<axis>-<value>` (see style.css). Options:
     text  — override the visible label with a DATA value (a level/tier, an
             activity %, a table share) while keeping the axis/value tooltip +
             tone — for the value-carrying badges.
     extra — append one concrete clause to the tooltip (this is how an
             ex-adjacent hedging sentence is folded INTO the badge — the
             tooltip carries the specific reason, the label the summary).
     inline — the compact chip modifier used by the runtime-value placeholder
             (varPlaceholder below). */
const BADGE_KEY = {
  provenance: { official: 'provOfficial', derived: 'provDerived', inferred: 'provInferred', absent: 'provAbsent' },
  precision: { pinned: 'precPinned', area: 'precArea', 'via-chain': 'precViaChain', unlocated: 'precUnlocated' },
  content: { dev: 'contentDev' },
  value: { 'weight-share': 'valWeightShare', 'roster-server-side': 'valRosterServerSide', 'cospawn-probable': 'valCospawnProbable' },
};
function badge({ axis, value, text = null, extra = null, inline = false }) {
  const key = BADGE_KEY[axis]?.[value];
  if (!key) return '';                     // outside the closed enum → nothing, never a raw token
  const label = text != null ? text : tbl('badge', key);
  const tip = tbl('badge', key + 'Tip');
  const title = extra ? (tip ? `${tip} — ${extra}` : extra) : tip;
  return `<span class="badge badge--${axis}-${value}${inline ? ' badge--inline' : ''}" title="${esc(title)}">${esc(label)}</span>`;
}

/* Legacy .state-chip token → Badge — for the ONE site whose state is a runtime
   value (empty/absent vendor stock, v.stockState ∈ {dynamic,dev,unknown}).
   'dev' → the orthogonal content flag; 'dynamic'/'unknown' empty stock both
   read as an honest absence (server-decided, or simply not in the client
   data). Everywhere else the axis/value is known statically → call badge()
   directly. */
function stateBadge(state, extra) {
  if (state === 'dev') return badge({ axis: 'content', value: 'dev', extra });
  return badge({ axis: 'provenance', value: 'absent', extra });
}

/* Sanctioned runtime-value placeholder (DATA_CONTRACT §3.2) — the compact "?"
   that stands in for an unresolved {{mustache}} inside an effect/ability line,
   rendered through the Badge family (badge--inline). `runtime` true = a value
   the game computes live by nature (ShieldValue/CurrentStack) — never a data
   hole, accent tone; false = a real value simply not yet extracted from the
   client (Modifiers/TotalTime…) — muted tone, same register as an absent
   provenance. The raw {{token}} rides in the tooltip, never inline. */
function varPlaceholder(runtime, token) {
  const tip = runtime ? tr('effectVarRuntimeTooltip') : tr('effectVarUnextractedTooltip');
  const title = token ? `${tip} — ${token}` : tip;
  return `<span class="badge badge--inline badge--var-${runtime ? 'runtime' : 'unextracted'}" title="${esc(title)}">?</span>`;
}

/* gotoBtn / crossMapBtn / crossMapOnlyBtn RETIRÉS — vague E'c-9 (relicat S1) :
   0 appelant depuis la migration EntityRef. L'affordance carte n'est plus un
   bouton « Carte » séparé mais TOUJOURS une référence dessinable [Kind(●)]
   (posRow/dynamicPosBadge → ref-draw, mode L), y compris pour les cibles
   cross-carte. GOTO_ICON supprimé avec eux (aucun autre appelant). Les
   handlers goto/map-goto/map-switch de main.js restent (routés par ref-draw
   locate). */

/* ── Position d'objectif de quête à 3 niveaux ──────────────────────────
   Un objectif de quête n'affiche PLUS JAMAIS « position inconnue » : un objet
   à spawn dynamique (géré serveur, pas un trou de donnée) l'annonce
   honnêtement plutôt que de faire croire qu'on ignore où il se trouve.
     (a) position fixe connue         -> gotoBtn normal (bouton carte), inchangé
     (b) pas de position fixe, search_zone confiance HAUTE -> libellé « Zone
         de spawn » + bouton « Voir la zone » (cercle centroïde/bbox dessiné
         sur la carte, drawGoalZone) — étayé par une vraie preuve de drop/farm
         (items.json, voir  zone_confidence), présenté comme tel.
     (b') pas de position fixe, search_zone confiance MOYENNE -> même
         affordance mais explicitement étiquetée ESTIMATION (posEstimatedZone/
         viewEstimatedZoneBtn, jamais le même libellé qu'en (b) : une simple
         proximité géographique n'est PAS une preuve de spawn). Le clic dessine
         les VRAIS points du camp cité par la zone (campPointsForZone,
         réutilise showHighlight — même primitive que le bouton « Surligner
         les N points » de la fiche camp) filtrés à la bbox serrée de cette
         zone, quand la carte active a chargé ce camp (S.camps, jointure sur
         la clé stripée du préfixe fulfillment-manager-/ffm-island-) ; repli
         sur le même cercle deviné qu'en (b) — mais visuellement plus prudent
         (drawGoalZone estimate:true) — si le camp ne peut pas être trouvé
         (quête listée sur une autre carte que celle où sa zone vit
         géographiquement, ou nom non reconnu) : jamais un contour inventé de
         toutes pièces, juste un rendu honnêtement moins affirmatif que (b).
     (c) sinon (confiance basse ou absente) -> libellé seul (jamais de zone
         dessinée : le joueur a explicitement demandé de ne pas afficher un
         contour incertain) ; cas particulier « monstre identifié mais aucun
         camp ne le référence » (couverture camps.json ~25 % seulement) rendu
         avec un libellé distinct de « position dynamique » — ce n'est pas la
         même chose qu'un spawn serveur confirmé. */
export let currentGoalZones = [];
function resetGoalZones() { currentGoalZones = []; currentGoalZoneIdx = null; }      // search_zone actives de la fiche quête ouverte
let goalZoneLayer = null;       // cercle dessiné pour la dernière zone consultée
/* Index (dans currentGoalZones) de la zone d'objectif actuellement dessinée —
   la pastille de SA référence passe ● pendant que la zone est visible (lot 4,
   retour user 2026-07-14 « marked as pinable but doesnt show any point or
   zone ») : sans ce retour d'état, un clic qui dessine des points discrets au
   milieu des couches déjà affichées se lit comme un clic mort. null = aucune
   zone d'objectif affichée. Machinerie single-slot inchangée (une seule zone
   à la fois, effacée à la fermeture de fiche). */
let currentGoalZoneIdx = null;
/* Resynchronise les pastilles [Région(●)] goal-zone de la fiche ouverte sur
   l'état réellement dessiné (data-fill + aria-pressed) — la SEULE écriture de
   cet état ; jamais dérivé par surface (même contrat que syncEntityRefDots). */
function syncGoalZoneDots() {
  document.querySelectorAll('.ref[data-subrole="goal-zone"]').forEach(el => {
    const on = currentGoalZoneIdx != null && +el.dataset.key === currentGoalZoneIdx;
    const bub = el.querySelector('.ref-bubble');
    if (bub) bub.dataset.fill = on ? 'on' : 'off';
    const btn = el.querySelector('[data-act="ref-draw"]');
    if (btn) btn.setAttribute('aria-pressed', String(on));
  });
}
function clearGoalZone() {
  if (goalZoneLayer) { map.removeLayer(goalZoneLayer); goalZoneLayer = null; }
  if (currentGoalZoneIdx != null) { currentGoalZoneIdx = null; syncGoalZoneDots(); }
}
/* `estimate` (repli d'une zone confiance MOYENNE dont le camp cité n'a pas pu
   être joint à un vrai point, voir drawEstimatedZone ci-dessous) : même
   géométrie que le cercle confiance haute, mais liseré plus fin/pointillé
   plus lâche et remplissage plus faible — ne doit jamais avoir la même
   autorité visuelle qu'un cercle (b), même si les deux sont au fond un
   cercle deviné à partir d'une bbox (l'honnêteté vient surtout du
   libellé/bouton distinct qui l'a amené, ce style n'en est qu'un rappel). */
function drawGoalZone(sz, { estimate = false } = {}) {
  clearGoalZone();
  if (!sz) return;
  const [cx, cz] = sz.centroid;
  const [minX, minZ, maxX, maxZ] = sz.bbox;
  // Le site ne reçoit jamais les points bruts du cluster (payload), juste
  // centroïde + bbox — repli assumé et documenté : un cercle centré sur le
  // centroïde, rayon = demi-diagonale de la bbox.
  const r = Math.max(35, Math.hypot(maxX - minX, maxZ - minZ) / 2);
  const circle = L.circle(toLL(cx, cz), {
    radius: r, color: CATS.quest.hex, weight: estimate ? 1.4 : 2,
    dashArray: estimate ? '2 8' : '5 6',
    fillColor: CATS.quest.hex, fillOpacity: estimate ? .06 : .12, interactive: false,
  });
  goalZoneLayer = L.layerGroup([circle]).addTo(map);
  map.flyToBounds(circle.getBounds().pad(0.25));
}
/* Points RÉELS du camp cité par une search_zone (sz.camp — TOUJOURS le nom
   complet fulfillment-manager-.../ffm-island-..., voir 
   build_search_zone), filtrés à la bbox SERRÉE que le pipeline a calculée
   pour CETTE zone précise (sz.bbox — jamais le groupe de camp entier :
   "quest-object-camps" à lui seul couvre 713 points sur toute la carte).
   Jointure sur S.camps (la carte ACTIVE seulement, voir data.js
   loadDeferred/registerAllDenseRenderers) par clé stripée du préfixe
   fulfillment-manager-/ffm-island- — IDENTIQUE au strip que déjà
   appliqué côté données pour construire cette même clé `g.k`.
   Renvoie null quand le camp n'existe pas sur la carte active (quête listée
   sur plusieurs cartes mais dont cette zone précise vit géographiquement sur
   une autre, camp non encore chargé, ou aucun point dans la bbox) — jamais
   une liste inventée : l'appelant retombe alors sur le cercle deviné. */
function campPointsForZone(sz) {
  if (!sz?.camp || !sz.bbox) return null;
  const campKey = sz.camp.replace(/^fulfillment-manager-/, '').replace(/^ffm-island-/, '');
  const g = Object.values(S.camps).flatMap(st => st.groups).find(c => c.k === campKey);
  if (!g) return null;
  const [minX, minZ, maxX, maxZ] = sz.bbox;
  const pts = g.pts
    .filter(([x, z]) => x >= minX && x <= maxX && z >= minZ && z <= maxZ)
    .map(([x, z]) => ({ x, z }));
  return pts.length ? pts : null;
}
/* Zone confiance MOYENNE (search_zone.confidence==="medium") : meilleur
   effort — deux natures de zone possibles, jamais présentées avec la même
   autorité qu'une zone étayée par une vraie preuve de drop/farm (voir
    zone_confidence).
   • Zone de RÉGION (sz.where_kind==="region_zone" : la quête ne nomme qu'UNE
     région géométrique, sans camp) -> le VRAI polygone de région prudent
     (drawRegionEstimateZone), et NON un cercle centroïde/bbox qui déborderait
     sur des aires HORS de la région — un contour de région rendu en cercle
     surestime toujours l'emprise réelle, exactement ce qu'une estimation ne
     doit pas faire.
   • Zone de CAMP (sz.camp) -> les vrais points du camp cité (campPointsForZone,
     réutilise showHighlight, la même primitive « surligner les N points » que
     la fiche camp) quand la jointure marche.
   Dans les deux cas, repli honnête sur le même cercle deviné qu'une zone
   confiance haute mais visuellement plus prudent (drawGoalZone estimate:true)
   quand la géométrie exacte manque (région/camp non chargé sur la carte active,
   ou nom non reconnu) — jamais un contour inventé de toutes pièces. */
function drawEstimatedZone(sz) {
  // Zone de région : le vrai polygone prudent plutôt qu'un cercle débordant ;
  // repli sur le cercle deviné si la région n'est pas chargée sur la carte
  // active (quête cross-carte, ex. Extraction/Prison Island, ou nom inconnu).
  if (sz?.where_kind === 'region_zone' && sz.region) {
    clearHighlight();
    if (drawRegionEstimateZone(sz)) return;
    drawGoalZone(sz, { estimate: true });
    return;
  }
  const pts = campPointsForZone(sz);
  if (pts) {
    clearGoalZone();
    // Contour prudent AUTOUR des vrais points (lot 4, retour user 2026-07-14) :
    // les points seuls (5.5 px, même gabarit que les couches NPC/POI déjà
    // affichées) se fondaient dans la carte — le clic se lisait « rien ne se
    // passe ». Le cercle pointillé prudent (mêmes réglages que drawGoalZone
    // estimate:true) est calculé sur la bbox des points RÉELS (jamais la bbox
    // devinée du pipeline) : une seule visualisation de zone — points + son
    // contour — pas deux zones superposées.
    const xs = pts.map(p => p.x), zs = pts.map(p => p.z);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
    const r = Math.max(35, Math.hypot(Math.max(...xs) - Math.min(...xs),
                                      Math.max(...zs) - Math.min(...zs)) / 2 + 12);
    goalZoneLayer = L.layerGroup([L.circle(toLL(cx, cz), {
      radius: r, color: CATS.quest.hex, weight: 1.4, dashArray: '2 8',
      fillColor: CATS.quest.hex, fillOpacity: .06, interactive: false,
    })]).addTo(map);
    showHighlight(pts, CATS.quest.hex);
    return;
  }
  clearHighlight();
  drawGoalZone(sz, { estimate: true });
}
/* (zoneViewBtn supprimé — vague 1 EntityRef : la zone de recherche d'un
   objectif est désormais une référence [Région ●] construite directement
   dans dynamicPosBadge, routée par main.js ref-draw → viewGoalZone.) */
/* Zone(s) de région sur la carte, résolues par NOM (S.zonesGeo, propre à
   Kwalat) depuis une liste de noms. Deux appelants, deux niveaux d'autorité
   visuelle sur la MÊME géométrie exacte :
   • bestiaire / fiche monstre « Voir la zone » (viewMonsterZone, m.zones) —
     style AFFIRMÉ (estimate:false, liseré plein) : on montre la vraie aire de
     vie du mob, un fait catalogué.
   • zone de recherche d'objectif confiance MOYENNE de type région
     (drawRegionEstimateZone) — style PRUDENT (estimate:true : liseré fin,
     pointillé lâche, remplissage faible, mêmes réglages que le cercle
     drawGoalZone estimate:true) : une simple proximité de région, jamais une
     preuve de spawn ; le polygone exact évite juste qu'un cercle ne déborde.
   Trace les VRAIS polygones plutôt qu'un cercle centroïde/bbox, puisqu'on a la
   géométrie exacte ; réutilise l'infra de zone d'objectif (goalZoneLayer,
   effacée pareillement par clearGoalZone/closeFiche). Renvoie true si au moins
   un polygone a été tracé, false si aucun nom ne correspond à un polygone
   chargé (autre carte / région non chargée) : jamais de contour inventé,
   l'appelant décide alors du repli. */
function drawMonsterZone(zoneNames, { estimate = false } = {}) {
  clearGoalZone();
  if (!zoneNames?.length) return false;
  const zones = (S.zonesGeo || []).filter(z => zoneNames.some(n => fold(n) === fold(z.name)));
  if (!zones.length) return false;
  const g = L.layerGroup();
  const pts = [];
  zones.forEach(z => (z.rings || []).forEach(ring => {
    L.polygon(ring.map(([x, zz]) => { pts.push(toLL(x, zz)); return toLL(x, zz); }), {
      color: CATS.quest.hex, weight: estimate ? 1.4 : 2,
      dashArray: estimate ? '2 8' : '5 6',
      fillColor: CATS.quest.hex, fillOpacity: estimate ? .06 : .12, interactive: false,
    }).addTo(g);
  }));
  goalZoneLayer = g.addTo(map);
  if (pts.length) map.flyToBounds(L.latLngBounds(pts).pad(0.25));
  return pts.length > 0;
}
/* Repli d'une zone de recherche confiance MOYENNE de type région
   (sz.where_kind==="region_zone" : la quête ne nomme qu'UNE région
   géométrique, sans camp). Trace le VRAI polygone de région, résolu par NOM
   sur sz.region via drawMonsterZone (même correspondance repliée fold()), dans
   le style PRUDENT de l'estimation (estimate:true) — le polygone exact ne
   déborde pas hors des limites de la région comme le ferait un cercle
   centroïde/bbox, tout en gardant l'autorité visuelle RÉDUITE d'une simple
   proximité (jamais l'aspect plein d'une zone confirmée). Renvoie true si la
   région est chargée sur la carte active (polygone tracé), false sinon (nom
   cross-carte ou non chargé) — l'appelant retombe alors sur le cercle deviné
   prudent, jamais un contour inventé de toutes pièces. */
function drawRegionEstimateZone(sz) {
  if (!sz?.region) return false;
  return drawMonsterZone([sz.region], { estimate: true });
}
/* Accès délégué (main.js) : dessine la/les zone(s) du monstre `key`. */
function viewMonsterZone(key) {
  const m = S.monsters[key];
  if (m?.zones) drawMonsterZone(m.zones);
}
/* Accès délégué (main.js) : dessine UNE région nommée — la réf [Zone(●)] de la
   section « Présent dans » d'une fiche monstre (ref-draw, subrole
   « monster-zone »). Même primitive single-slot (goalZoneLayer, effacée à la
   fermeture de fiche) que viewMonsterZone/viewGoalZone : jamais un contour
   inventé quand le nom ne correspond à aucun polygone chargé (drawMonsterZone
   renvoie false et ne trace rien). */
function drawNamedZone(name) {
  if (name) drawMonsterZone([name]);
}

/* Base de données objets : icône + rareté + clic -> fiche complète quand la
   clé est connue du catalogue (site/data/items.json) ; sinon repli fidèle au
   rendu historique (nom prettifié, non cliquable). */
function itemColor(it) { return (it && RARITY[it.rarity]?.hex) || 'var(--muted)'; }
/* Entité "recette" (task #78a/#78b) : un item catalogue avec it.kind==='recipe'
   est un pseudo-item de RÉFÉRENCE (voir  recipes.json "Site
   propagation" -- une entrée par craft distinct, name/icon/rarities copiés du
   crafté, jamais un objet du jeu à part entière) -- sa propre couleur/fiche,
   jamais celle (souvent grise, sans rareté propre) ni la fiche générique de
   l'objet qu'elle sert à fabriquer (qui affichait jusqu'ici un titre dupliqué
   et confus avec l'item réel, voir openItemFiche's guard + openRecipeFiche).
   Centralisé ici : TOUTE chip/lien qui référence une clé catalogue (recette
   d'ingrédient, récompense de quête, cible d'objectif…) passe par ces 3
   helpers pour rester automatiquement cohérent, sans re-tester it.kind à
   chaque site d'appel. */
function isRecipeKind(it) { return it?.kind === 'recipe'; }
function itemFicheAct(it) { return isRecipeKind(it) ? 'fiche-recipe' : 'fiche-item'; }
function itemEcHex(it) { return isRecipeKind(it) ? RECIPE_HEX : itemColor(it); }
function itemEcKind(it) { return isRecipeKind(it) ? 'recipe' : 'item'; }
/* Chip QUANTIFIÉE ({key, count}) — rendu commun ingrédient de recette /
   récompense de quête, avec un suffixe "×N" au-delà de count 1 (voir
    pour les ingrédients et
    pour les récompenses fixes/au choix). itemChip
   (une simple clé, jamais de suffixe de quantité) n'en est qu'un appel avec
   count omis -- même rendu, pas de duplication. Couleur d'entité (task #77) :
   teinte de rareté (ou RECIPE_HEX pour une chip "recette", voir ci-dessus),
   même source que la fiche/le résultat de recherche de cet item -- jamais une
   chip neutre pour une info dont la couleur est déjà connue ailleurs. */
function qtyItemChip(entry) {
  const key = entry.key, count = entry.count;
  const it = S.items[key];
  const name = it ? it.name : pretty(key);
  const icon = it?.icon ? `icons/${it.icon}` : null;
  const attrs = it ? ` data-act="${itemFicheAct(it)}" data-id="${esc(key)}"` : '';
  const qty = count > 1 ? `<span class="chip-qty">×${count}</span>` : '';
  return `<span class="chip"${ecAttr(itemEcHex(it), itemEcKind(it))}${attrs}>${iconTag(icon, 'chip-icon', itemGlyph(it))}${esc(name)}${qty}</span>`;
}
function itemChip(key) { return qtyItemChip({ key }); }
function qtyChipList(list) {
  return (list || []).map(qtyItemChip).join('');
}

/* ── Constructeurs de références EntityRef PARTAGÉS (vague 2) ────────────────
   Les fiches croisées (« En tuant X », « donné par », lignes de farm, membres
   de famille…) citaient jusqu'ici les entités via 8 classes-wrapper divergentes
   (.link/.fr-label/.chip/.ec-name…). Ces 3 constructeurs les ramènent au SEUL
   composant `[Kind(●)] Nom` (mapref.js ref()), avec la MÊME résolution de
   teinte précise (Q6) et de couche que les blocs d'objectif (vague 1) — jamais
   re-dérivée par surface. Honnêteté préservée : non résolu → libellé en clair
   teinté (Q8), jamais un lien deviné. */

/* Teinte PRÉCISE d'une famille : familyLayerHex (config.js) — hash djb2
   DÉTERMINISTE de la clé de famille, la MÊME couleur partout (arbre, titre de
   fiche, chips d'objectif, refs), sur toutes cartes/langues/sessions. Remplace
   l'ancien rang-de-liste qui glissait selon le contexte de tri (bug user
   2026-07-12 « fiche ≠ arbre » pour la même famille). Importée, jamais
   re-dérivée. */

/* Référence ESPÈCE `[Espèce(●)] Nom` par clé de spawn. La pastille EST la
   couche espèce de l'arbre (ref-draw `species` → le routeur main.js résout
   key→S.monsters[key].species puis toggleSpecies — jamais re-dérivé ici).
   DESSINABLE ⇔ l'espèce a RÉELLEMENT des points sur la carte active
   (`drawable: !!spRes`, spRes = speciesPoints(sp)) — RÈGLE OWNER 2026-07-12 :
   « pas de dot si aucune position connue à afficher sur la map ». Une espèce
   sans camp joint ici (monstre errant comme le Scolopendra, `camps:[]`, 0
   point) rend `[Monster] Nom` SANS pastille — titre coloré + nom souligné,
   honnête « rien à tracer ici » ; le ⊘ « dessinable mais 0 point » est
   abandonné pour ces affordances (une pastille qui ne bascule rien est
   inutile). Teinte PRÉCISE de l'espèce (speciesLayerHex, Q6) quand elle résout,
   MONSTER_HEX en repli. Nom souligné ⇔ le monstre résout au catalogue.
   `spId` : repli de clé de couche (fiche famille — routeur : `S.monsters[key]?.species || key`). */
function speciesRef({ key = null, spId = null, name, hex = null, meta = '' }) {
  const m = key ? S.monsters[key] : null;
  const sp = spId || (m ? m.species : null);
  const spRes = sp ? speciesPoints(sp) : null;
  return ref({
    kind: 'species',
    key: key || sp || null,
    label: name,
    hex: hex || (sp ? speciesLayerHex(sp) : MONSTER_HEX),
    hasFiche: !!m,
    drawable: !!spRes,
    count: spRes ? spRes.nPts : 0,
    drawn: !!(sp && S.monsp[sp]?.on),
    meta,
  });
}

/* Référence PNJ `[PNJ(●)] Nom` — LA forme partagée par toute surface-phrase
   qui cite un PNJ précis (donné par / récompense de / donneur d'en-tête /
   acteurs de quête). `ni` (npcIndexByName) donne le pin réel (S.data.npc[ni])
   → nom souligné ⇔ résolu, pastille LOCATE ⇔ une position est connue ET
   `locate` demandé. `locate:false` = référence d'IDENTITÉ seule (pas de
   pastille), pour les surfaces qui ont déjà leur propre affordance carte
   (en-tête « Voir le donneur », cellule de position des acteurs) — jamais deux
   localisateurs pour le même PNJ. Teinte CATS.npc.hex, jamais un lien deviné. */
function npcRef(name, { ni, locate = true } = {}) {
  if (!name) return '';
  const idx = ni != null ? ni : npcIndexByName(name);
  const rec = idx >= 0 ? S.data.npc[idx] : null;
  const canPing = locate && !!(rec && rec.x != null);
  return ref({
    kind: 'npc', key: idx >= 0 ? `npc:${idx}` : null, label: name,
    hasFiche: idx >= 0,
    mode: canPing ? 'L' : undefined,
    drawable: canPing,
    pos: canPing ? { x: rec.x, z: rec.z } : undefined,
    subrole: canPing ? 'npc' : null,
  });
}

/* Référence QUÊTE `[Quête(●)] Nom` — LA forme partagée par toute surface-phrase
   qui cite une quête (quêtes liées, série, source d'obtention, donneurs d'une
   région, quêtes à portée famille, objets de quête lâchés…). Owner 2026-07-13,
   « quests pinnable everywhere » : la pastille LOCATE (mode L, Q7) épingle la
   POSITION de la quête = celle de son donneur (q.x/q.z, résolu au slot du giver
   par le pipeline — même point que la fiche PNJ donneur épingle déjà) ; nom
   souligné → fiche quête. Un seul geste carte, jamais un `[Position(●)]` séparé
   à côté (forme verbeuse « [Quête] Nom + [Position] » abandonnée, intention
   owner). Quête sans position connue (q.x null, ex. Île-prison) → `[Quête] Nom`
   nu, honnête (pas de pastille, rien à épingler). Quête NON résolue (hors
   S.quests) → `[Quête] Nom` non souligné (pas de fiche), jamais un lien deviné.
   `label`/`resolved` : surcharges pour les appelants qui portent un nom de repli
   (reward_of_names/quest_names) ou connaissent déjà l'état résolu. */
function questRef(slug, { label = null, resolved = null } = {}) {
  const q = slug ? S.quests.get(slug) : null;
  const isRes = resolved != null ? resolved : !!q;
  const name = label != null ? label : (q ? q.name : pretty(slug));
  const qpos = (q && q.x != null) ? { x: q.x, z: q.z } : null;
  return ref({
    kind: 'quest', key: isRes ? slug : null, label: name,
    hasFiche: isRes, mode: qpos ? 'L' : undefined, pos: qpos || undefined,
  });
}

/* Référence CAMP `[Camp(●)] Nom` — lignes de farm (fiche objet/monstre) et
   en-tête de fiche camp. La pastille est le TOGGLE de surlignage de CE camp
   (showHighlight de ses points + centrage caméra, routé par main.js ref-draw
   `camp`) : l'équivalent honnête le plus proche de l'ex-bouton camp-highlight —
   un camp individuel n'a AUCUN nœud d'arbre, son tracé n'existe que comme
   surlignage transitoire single-slot (voir main.js). Teinte CAMP_COLORS[kind]
   (Q6, la couleur de ses points). Nom souligné → fiche camp, SAUF `self` (on
   est déjà sur sa page → libellé en clair teinté, Q8). `drawn:false` explicite :
   le surlignage est transitoire (jamais persisté, effacé à la fermeture de
   fiche) — même fidélité que l'ancien bouton dont le libellé se réinitialisait
   à chaque rendu. Le chip qualificatif (— Patrouille…) reste à l'appelant. */
function campRef(key, g, { self = false } = {}) {
  const n = g.pts.length;
  return ref({
    kind: 'camp', key,
    label: campLabel(key, g.kind, g.name, g.subtype),
    hex: CAMP_COLORS[g.kind] || '#999',
    hasFiche: !self, drawable: n > 0, drawn: false, count: n,
  });
}

/* Désambiguïsation des items de quête « même nom » (quest-guide-feature plan
   sec 5.2/6.4 : imp_brain_hunt liste 3× "Imp Brain", visuellement identiques
   sans ça). Best-effort : items.json::archetype (ex. "Brain Imp Executioner")
   moins les mots déjà présents dans le nom de base -> "Executioner" ; si
   l'archetype manque ou si 2 frères partagent le même archetype (pas observé
   dans l'échantillon, mais pas prouvé impossible — voir le plan sec 7), repli
   sur un numéro d'ordre "#N" clairement POSITIONNEL, jamais présenté comme
   sémantique (§7 : jamais fabriquer une distinction qui n'existe pas).

   LA source unique de cette distinction pour TOUTES les surfaces (fix UX :
   le suffixe n'apparaissait QUE dans la section « Quest Items » — ni sur
   les chips d'étape ni dans le titre de la fiche item, là où le joueur
   regarde vraiment). Renvoie une Map à DOUBLE clé : l'objet qi lui-même
   (entrées sans clé catalogue — leur seule identité stable, deux homonymes
   sans clé ne peuvent pas partager une clé-string sans s'écraser) ET
   qi.key (string) quand elle existe (les chips d'étape/le titre de fiche
   item n'ont que la clé, jamais l'objet) -> {tag, positional}. */
function disambiguateQuestItems(list) {
  const byName = new Map();
  for (const qi of list || []) {
    const cat = qi.key ? S.items[qi.key] : null;
    const name = cleanLabel(cat?.name || qi.label);
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name).push(qi);
  }
  const tagFor = new Map();
  const setTag = (qi, info) => {
    tagFor.set(qi, info);
    if (qi.key) tagFor.set(qi.key, info);
  };
  for (const [name, group] of byName) {
    if (group.length < 2) continue;
    const nameToks = new Set(fold(name).split(' ').filter(Boolean));
    const seenTags = new Set();
    group.forEach((qi, i) => {
      const cat = qi.key ? S.items[qi.key] : null;
      const arch = cat?.archetype;
      let tag = null;
      if (arch) {
        const toks = fold(arch).split(' ').filter(t => t && !nameToks.has(t));
        if (toks.length) tag = toks.map(t => t[0].toUpperCase() + t.slice(1)).join(' ');
      }
      if (tag && seenTags.has(tag)) tag = null;   // duplicate archetype tag -> not a unique key, fall back
      if (tag) { seenTags.add(tag); setTag(qi, { tag, positional: false }); }
      else setTag(qi, { tag: `#${i + 1}`, positional: true });
    });
  }
  return tagFor;
}

/* L'unique FORMATEUR du nom affiché d'un item de quête — utilisé par les 3
   surfaces (section « Quest Items », chips d'étape, titre de fiche item),
   aucune logique dupliquée : base + " (tag)" quand `ref` (clé catalogue
   string OU objet qi) appartient à un groupe d'homonymes de `disambig`,
   sinon le nom nu (jamais de suffixe inventé pour un item sans homonyme). */
function disambiguatedItemName(base, ref, disambig) {
  const info = ref != null ? disambig?.get(ref) : null;
  return info ? `${base} (${info.tag})` : base;
}

/* Ligne de butin partagée (fiche monstre/camp/coffre/table) : icône + nom
   cliquable + taux (dropRateHtml : ×N/garanti/Badge weight-share). Couleur d'entité (task
   #77) dérivée du linkAct : une ligne "fiche-item" est un OBJET (couleur de
   rareté, ou RECIPE_HEX + la bonne fiche si la clé résout en fait à un
   pseudo-item recette, voir itemFicheAct/itemEcHex/itemEcKind) ; une ligne
   "fiche-loot" (openItemFiche's dropsHtml -- le libellé est le nom d'une
   TABLE de butin, pas d'un autre item) porte la nuance de sa table (entityColor
   'loot', ancrée sur LOOT_TABLE_HEX). Pas de couleur pour une ligne sans lien. */
function dropRow(icon, label, linkAct, linkId, rateHtml, glyph) {
  const it = linkAct === 'fiche-item' ? S.items[linkId] : null;
  // EntityRef (vague 2) : le lien de butin devient une référence — `[Item]`/
  // `[Recipe]` (teinte rareté/recette) pour une ligne objet, `[Loot table]`
  // pour une ligne table de butin (openItemFiche dropsHtml). Souligné ⇔ la clé
  // résout au catalogue ; pas de pastille (ni item ni table n'a de placement).
  // Sans lien (linkAct absent) : libellé en clair, comme avant.
  let refHtml;
  if (linkAct === 'fiche-item') {
    const kind = it && isRecipeKind(it) ? 'recipe' : 'item';
    refHtml = ref({ kind, key: linkId, label, hex: it ? itemEcHex(it) : null, hasFiche: !!it });
  } else if (linkAct === 'fiche-loot') {
    refHtml = ref({ kind: 'loot', key: linkId, label, hasFiche: true });
  } else {
    // Sans lien catalogue : réf [Item] NON soulignée (hasFiche:false) plutôt
    // qu'un fr-label nu — uniformité avec ses frères (toutes les autres lignes
    // dropRow sont des réfs). Honnête : le tag nomme le kind, le nom reste en
    // clair (aucune fiche à ouvrir), teinte objet générique.
    refHtml = ref({ kind: 'item', label, hasFiche: false });
  }
  // data-n : nom replié pour le filtre local des longues listes (voir le
  // listener .stock-filter posé sur le drawer plus haut).
  return `<div class="frow" data-n="${esc(fold(label))}">${iconTag(icon, 'fr-icon', glyph || '📦')}${refHtml}${rateHtml || ''}</div>`;
}

/* ── « Comment farmer » (, refonte juillet 2026) ──────
   it.farm[] est une liste de camps DÉDUPLIQUÉE par le pipeline (une entrée
   par camp distinct sur TOUTES les tables de butin de l'item, plafonnée à
   24 -- ), chaque entrée ne portant que {camp, name, x, z}
   (name/x/z = repli PRÉ-groupement, x/z = seulement le point de spawn #0 du
   camp -- jamais un centroïde). La jointure vers le vrai nuage de points
   (S.camps, même clé stripée que campDisplayName/openCampFiche/
   campPointsForZone/le handler camp-highlight de main.js -- vérifiée
   identique aux 3 endroits déjà) tourne à ZÉRO changement pipeline et donne
   accès à g.kind (regroupement) + g.pts (nombre réel + surlignage complet),
   déjà utilisés par la fiche camp elle-même -- juste jamais exposés ici. */
const FARM_ROW_CAP = 6;

/* Ligne de camp JOINT (g trouvé dans S.camps) : pastille couleur de kind
   (même teinte que la fiche camp/les couches carte -- CAMP_COLORS), nom
   d'affichage EXPÉDIÉ (g.name + g.subtype cuit — campLabel, LE formateur
   unique, ontology chunk 2) + chip qualificatif (— Patrouille / — Renforcé
   (PvP), tbl('campQualifier')) quand le camp en porte un, cliquable vers la
   fiche camp complète (inchangé), + le compte de points en méta muette.
   Le bouton « Surligner » PAR CAMP est RETIRÉ (règle canonique 2026-07-11 :
   toute action carte = une référence à un toggle de l'arbre de gauche — un
   camp individuel n'a AUCUN nœud d'arbre, la ligne est donc informative ;
   l'action carte de la section est le toggle ESPÈCE
   monsterSpawnHighlightBtn/species-layer, déjà en place, et la fiche camp
   elle-même garde son propre bouton de surlignage — l'exception cohérente,
   voir main.js camp-highlight). */
function farmCampRow(key, g) {
  // EntityRef (vague 2) : `[Camp(●)] Nom · N pts` (campRef) — la pastille
  // remplace l'ex-rar-dot ET l'ex-bouton de surlignage par camp (elle bascule
  // le surlignage de CE camp, main.js ref-draw `camp`), le nom souligné ouvre
  // la fiche camp, le compte passe dans le suffixe méta. Chip qualificatif
  // (— Patrouille…) appendu, comme avant.
  return `<div class="frow">${campRef(key, g)}${campQualifierChip(g.qualifier)}</div>`;
}

/* Ligne de repli : camp NON trouvé dans S.camps (carte différente --
   préfixe ffm-island-*, réel sur 84,3 % des items à liste de farm dans les
   bins actuellement expédiés (377/447, recompté par
    §5 — l'ancien « ~24 % » de ce
   commentaire était périmé) --, ou S.camps pas encore chargé). Pas de
   compte inventé, pas de bouton Surligner qu'on ne peut pas honorer --
   honnête plutôt que de fabriquer un kind/point count qu'on n'a pas.
   Libellé : le nom EXPÉDIÉ (c.name — m.camps[]/item.farm[] rows portent
   désormais name/qualifier/map/kind, pipeline pass 2026-07-11b) via
   campLabel + chip qualificatif — même formateur partagé que farmCampRow.
   Bouton : les x/z d'un camp d'une AUTRE carte sont dans SON repère —
   l'ancien gotoBtn local panoramiquait la carte ACTIVE vers des coordonnées
   d'une autre (bug réel, investigation §2) → crossMapBtn (bascule PUIS
   focus) quand le champ `map` expédié désigne une autre carte connue.
   (L'ancienne dérivation par préfixe de clé ffm-island- → île est RETIRÉE :
   le champ `map` du pipeline est la source, plus aucune heuristique.)
   Cas S.camps-pas-encore-chargé : se répare tout seul sans code
   supplémentaire ici, main.js ré-ouvre déjà cette fiche après
   loadDeferred() (même mécanisme que la course it.questSource/S.monsters
   documentée plus haut). */
function farmUnjoinedRow(c) {
  // c.subtype : absent des lignes m.camps[]/it.farm[] actuelles (le
  // pipeline ne le cuit que sur les GROUPES camps.bin) — repli honnête sur
  // le `name`/kind expédiés, jamais une re-détection front.
  // EntityRef (vague 2) : `[Camp(●)] Nom` — teinte CAMP_COLORS[kind] posée
  // (corrige le trou d'ecAttr historique §4.8.3). Le camp n'est PAS sur la
  // carte active (préfixe ffm-island-*, ou S.camps pas encore chargé) → aucun
  // surlignage possible ici : la pastille est un pin LOCATE cross-carte (mode
  // L) quand une position + une carte connue existent (bascule vers cette
  // carte puis épingle — main.js ref-draw mode L), sinon aucune pastille (rien
  // à viser honnêtement). Suffixe méta = nom de la carte cible (l'info que
  // portait l'ex-bouton cross-carte).
  // CLIC MORT ÉVITÉ : le nom n'est SOULIGNÉ (→ openCampFiche) que si le camp
  // résout VRAIMENT sur la carte active (openCampFiche cherche `g.k === key`
  // dans S.camps de la carte courante ET no-op sinon) — un camp cross-carte
  // (mid) ou pas-encore-chargé donnerait un lien qui n'ouvre rien. Sinon nom
  // en clair (honnête : la pastille locate bascule vers sa carte, où la fiche
  // redevient atteignable). Se répare seul au re-rendu post-loadDeferred.
  const label = campLabel(c.camp, c.kind, c.name, c.subtype);
  const mid = (c.map && c.map !== S.map && S.maps[c.map]) ? c.map : null;
  const canPing = c.x != null;
  const openable = Object.values(S.camps || {}).some(st => (st.groups || []).some(gr => gr.k === c.camp));
  const campRefHtml = ref({
    kind: 'camp', key: c.camp, label, hex: CAMP_COLORS[c.kind] || '#999',
    hasFiche: openable,
    mode: canPing ? 'L' : undefined, drawable: canPing,
    pos: canPing ? { x: c.x, z: c.z, map: mid || undefined } : undefined,
    meta: mid ? `· ${mapName(mid)}` : '',
  });
  return `<div class="frow">${campRefHtml}${campQualifierChip(c.qualifier)}</div>`;
}

/* Plafonne à FARM_ROW_CAP lignes visibles + tiroir « +N » -- même idiome
   <details class="fiche-dialogs"> que rewardTablesN/dialogsN/questItemsN
   ailleurs dans ce fichier, jamais un nouveau composant. */
function farmCapRows(rows, renderRow, moreLabelFn) {
  const shown = rows.slice(0, FARM_ROW_CAP).map(renderRow).join('');
  const rest = rows.slice(FARM_ROW_CAP);
  const more = rest.length
    ? `<details class="fiche-dialogs"><summary>${esc(moreLabelFn(rest.length))}</summary>${rest.map(renderRow).join('')}</details>` : '';
  return shown + more;
}

/* Accès délégué (main.js) aux zones d'objectif de la fiche quête ouverte.
   Confiance MOYENNE -> meilleur effort camp réel/repli cercle prudent
   (drawEstimatedZone) ; confiance HAUTE -> cercle confirmé inchangé
   (drawGoalZone). `clearHighlight()` avant le cercle confirmé : un clic
   précédent sur une zone MOYENNE a pu laisser la couche de points réels
   (showHighlight) affichée -- jamais deux visualisations de zone superposées
   sur la carte, quel que soit l'ordre de clic entre étapes. */
function viewGoalZone(zi) {
  const sz = currentGoalZones[+zi];
  if (!sz) return;
  // TOGGLE (lot 4) : re-cliquer la zone déjà affichée l'efface — même loi
  // « la pastille bascule » que toutes les autres références dessinables ;
  // l'état ● de la pastille suit via syncGoalZoneDots (clearGoalZone).
  if (currentGoalZoneIdx === +zi) { clearHighlight(); clearGoalZone(); return; }
  if (sz.confidence === 'medium') drawEstimatedZone(sz);
  else { clearHighlight(); drawGoalZone(sz); }
  currentGoalZoneIdx = +zi;
  syncGoalZoneDots();
}

export {
  ficheHeader, openFiche, closeFiche, setFicheHash, badge, stateBadge, varPlaceholder,
  fmtNum, dropRow, dropRateHtml, lootRowsHtml,
  pillHtml, pillSelectHtml, familyHasMembers, itemColor, isRecipeKind, itemEcHex,
  qtyItemChip, itemChip, qtyChipList, speciesRef, npcRef, campRef, questRef,
  disambiguateQuestItems, disambiguatedItemName,
  farmCampRow, farmUnjoinedRow, farmCapRows,
  resetGoalZones, clearGoalZone, viewGoalZone, viewMonsterZone, drawNamedZone,
};
