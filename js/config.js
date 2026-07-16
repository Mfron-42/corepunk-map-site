/* Kwalat — constantes structurelles : géométrie par défaut, palettes,
   catégories de couches et résolveurs de libellés (tokens neutres du jeu →
   libellé localisé via tbl()). Aucun état mutable ici. */
import { tbl, tr } from './i18n/index.js';
import { pretty, esc } from './utils.js';
import { gameLabel } from './classlabels.js';

/* ── Constantes ─────────────────────────────────────────────── */
/* Multi-cartes (vague C) : la carte ACTIVE porte toute la géométrie (dims,
   ligne de pixels 0 = tile_top_z, densité px/unité, zoom natif, chemin de
   tuiles). `activeMap` vaut les défauts Kwalat jusqu'à ce que maps.json soit
   chargé (init) — identiques à l'entrée Kwalat du manifeste, donc rien ne
   change au boot ; seul switchMap() bascule ces valeurs. toLL/toWorld/les
   tuiles/les bornes en dérivent (mêmes maths qu'avant, paramétrées). */
const KWALAT_DEFAULTS = {
  id: 'Kwalat', type: 'world', w: 9600, h: 7680,
  tile_top_z: 8704, tile_path: '', native_zoom: 2, ppu: 4, tile_max_zoom: 3,
  frame_status: 'validated', has_entities: true,
};
// Les tuiles (~645 Mo) sont hébergées sur un dépôt GitHub Pages dédié,
// séparé du dépôt principal du site — republié seulement quand la pyramide
// de tuiles change (rarement), jamais à chaque mise à jour des données.
const TILE_BASE = 'https://mfron-42.github.io/corepunk-map-tiles';
/* Tout est « dense » : chaque couche ne matérialise que ce qui est dans la
   vue courante (+ marge) et se reconstruit au déplacement — DOM+portrait
   pour PNJ/POI/ateliers (voir renderDomCulled), canvas pour les couches à
   fort volume (voir renderDense). */
/* Labels are resolved live via i18n.js (tbl()/catLabel() etc.) rather than
   stored here, so switching language never needs to rebuild these — only
   the STRUCTURAL fields (hex/on/dense) live in this file; the token keys
   themselves (npc/poi/.../camp kind tokens) are the game's own neutral
   identifiers, shipped as-is regardless of language. Which categories render
   DOM portraits vs canvas dots is decided by main.js's registerDomDense/
   registerDense call sites, not by a flag here. */
/* Coffres (container re-categorization, ) : l'ancienne
   couche unique "chest" (`type` brut, 3 vraies catégories conflées sous un
   seul "Coffres") est remplacée par DEUX couches de haut niveau réelles —
   `searchable_chest` (searchable_chests.bin, poi_searchable_chest_* — LE
   vrai coffre fouillable farmable, sa propre table de recette) et
   `camp_chest` (chests.bin `group==="camp_chest"`, skin sci_fi — le coffre
   de camp) — plus le groupe "Décor" (S.decor, js/state.js/sidebar.js), qui
   n'est PAS une entrée CATS classique : décor rassemble chests.bin
   `group==="decor"` (6 familles) + `group==="legacy_chest"`, rendu en
   couches denses `decor:<famille>` (voir mapview.js renderDense / main.js
   registerAllDenseRenderers), par analogie avec les couches `camp:<kind>`
   existantes. `chest` (l'ancienne clé CATS) disparaît : plus aucune couche
   ne s'appelle ainsi, mais l'id de marqueur "chest:<i>" (S.data.chest, voir
   chestHex/chestKindLabel plus bas) reste l'espace de nommage stable partagé
   par camp_chest/décor/legacy pour le suivi ("Suivre"/"Fait") et la fiche
   (fiche-chest) — seule la couleur/le libellé affichés varient désormais
   selon le VRAI group/family du point, jamais un CATS.chest générique. */
/* `quest` (2026-07-11, "NPCs hold their quests" -- user decision: quests
   are not their own map layer, a quest reads on its giver's NPC pin/fiche
   instead) : its filter row (sidebar.js buildGroupQuests) and its canvas
   dot layer (main.js registerAllDenseRenderers, one violet point per quest
   at the giver's position -- an exact duplicate of the NPC pin since the
   giver-pos-snap, verified on all 319 positioned quests) were both removed.
   The entry stays here ONLY so `.hex` keeps resolving for the many chips/
   links/highlights that reuse the quest-violet color elsewhere (fiches.js,
   popups.js, search.js, sidebar.js's tracked-list) -- `.on`/`.dense` are
   now dead weight (no renderer, no filter row reads them); urlstate.js
   explicitly excludes this key from the `on=` hash it builds so a phantom,
   permanently-true token doesn't get baked into every fresh share link. */
const CATS = {
  npc:      { hex: '#e0a23f', on: true,  dense: true },
  poi:      { hex: '#8fb4c9', on: true,  dense: true },
  quest:    { hex: '#c77dff', on: true,  dense: true },
  qao:      { hex: '#ff8fa3', on: false, dense: true },
  workshop: { hex: '#4cc9f0', on: true,  dense: true },
  searchable_chest: { hex: '#ffd166', on: true, dense: true },
  camp_chest:       { hex: '#f2a65a', on: true, dense: true },
};
const catLabel = key => tbl('cat', key) || key;
/* Sous-catégories POI (interest_points.bin `poiType`, pipeline pass
   2026-07-11b — , ◇ curaté "exactly like campKind... NOT a
   game-classified taxonomy field", voir  §1 "poiType").
   8 familles réelles + "other" défensif (0 enregistrement aujourd'hui, jamais
   affiché -- voir sidebar.js buildPoiSubGroup). Axe = FORME d'icône, très
   déséquilibré (habitat 71/156 sur Kwalat) : filtre grossier, jamais vendu
   comme une taxonomie fine ( §1). UNE seule teinte
   partagée (CATS.poi.hex) pour les 8 lignes -- une fausse distinction
   chromatique impliquerait une taxonomie de jeu qui n'existe pas. */
const POI_TYPES = ['habitat', 'nature', 'fort', 'curiosity', 'transport', 'profession', 'amenity', 'portal'];
const poiTypeLabel = key => tbl('poiType', key) || pretty(key);
/* Palette pass (map-legibility task) : mining/herbalism/logging (les 3
   métiers de récolte) recouraient chacun à une teinte qui se fond dans SON
   PROPRE terrain typique -- mining #9ba7c0 (gris-bleu neutre) sur roche
   grise/beige, herbalism #80ed99 (vert menthe) sur herbe/feuillage, logging
   #b08968 (brun-beige) sur chemins de terre/écorce en forêt. Remplacées par
   3 teintes choisies à la fois pour la LISIBILITÉ (perceptuellement loin de
   leur terrain — jamais de vert pour un point posé sur de l'herbe, jamais de
   brun/gris neutre sur de la roche/terre) ET la DIFFÉRENCIATION mutuelle (ces
   3 couches sont activées ensemble pour planifier une tournée de récolte) :
   les 3 nouvelles teintes occupent chacune un des plus grands intervalles
   libres de la roue chromatique du site (calculé sur TOUTES les couleurs de
   catégorie existantes, cf. rapport de mission) plutôt que de se caser à côté
   d'une teinte déjà prise. mining -> turquoise profond (mine/minerai,
   contraste franc sur roche chaude neutre) ; herbalism -> orchidée/magenta
   (association florale, contraste franc sur herbe/feuillage) ; logging ->
   indigo (le seul intervalle large restant ; l'association bois est plus
   faible que les deux autres — assumé, la lisibilité prime ici sur le
   symbolisme, cf. rapport). wildlife (#a3b18a, même défaut que herbalism —
   vert-sauge décoloré sur herbe) laissée telle quelle : signalée dans le
   rapport plutôt que corrigée, pour ne pas re-resserer les 2 intervalles
   ci-dessus en les partageant à 4. */
const CAMP_COLORS = {
  monsters: '#ef476f', creeps: '#f78c6b', wildlife: '#a3b18a',
  herbalism: '#cd42d7', logging: '#3949ac', mining: '#258a93',
  // Résolution de collision de teinte (blueprint §3.5, « searchable-chest/camp ») :
  // le kind de camp `searchable` partageait EXACTEMENT #ffd166 avec la vraie
  // couche conteneur `searchable_chest` (CATS.searchable_chest.hex) — deux
  // concepts distincts, une seule couleur. Décalé vers un or-bronze foncé
  // distinct (le conteneur garde son or clair #ffd166) : harmonieux avec l'ADN
  // ambre, et la couche camp étant DÉCOCHÉE par défaut, zéro changement au boot.
  // (Libellé du kind camp `searchable` — arbre PLAT, décision propriétaire
  // 2026-07-14 : rangé SÉPARÉMENT tout en bas des « Objets interactifs »,
  // dit son mécanisme « Zones de fouille (spawn) » (i18n searchSpotsRow ×5 —
  // pool de spawn dynamique serveur, jamais un conteneur placé), distinct de
  // la vraie couche coffre `searchable_chest` ci-dessus ; jamais la piste
  // « Loot camp »/« Camp de butin » du blueprint R2, abandonnée.)
  searchable: '#c9982e', destroyable: '#e07a5f',
  reactive: '#06d6a0', shrines: '#bdb2ff', soulkeeper: '#7b2cbf',
  quest: '#c77dff', guards: '#778da9', event: '#f4a259', other: '#6c757d',
  // Split de PRÉSENTATION par contenu PROUVÉ (2026-07-15, décision
  // propriétaire — voir CAMP_SUBTYPE_SPLIT plus bas) : le kind `searchable`
  // dominé par des corps (subtype `corpses`) et le kind `reactive` fait de
  // squelettes (subtype `skeleton`) deviennent chacun leur propre couche.
  // Teintes RELIÉES à leur concept — corpse-spawn → mauve de la famille Corps
  // (parent de DECOR_HEX.corpse) ; skeleton → os/cendre — et distinctes à la
  // fois de leur teinte de kind d'origine (or `searchable`, turquoise
  // `reactive`) et de toute autre teinte de couche.
  searchable_corpses: '#9d6f88', reactive_skeleton: '#c9bda3',
};
const campKindLabel = key => tbl('campKind', key) || pretty(key);
/* Accent colors for the new search-only categories (monsters/zones/lore/
   abilities) added on top of the pre-existing CATS/CAMP_COLORS palette —
   monster reuses CAMP_COLORS.monsters (same creature, same color whether
   found via a camp or via its own fiche); zone reuses the existing "Zones
   (régions)" filter-row swatch (#7fc8a9, see buildFilters()) for the same
   reason. location/ability are new, chosen distinct from every existing
   swatch above (see frontend-design pass notes in the mission report). */
const MONSTER_HEX = CAMP_COLORS.monsters;
const ZONE_HEX = '#7fc8a9';
const LOCATION_HEX = '#e0c68c';
const ABILITY_HEX = '#5fa8d3';
const EVENT_HEX = '#d65db1';
/* Recette (task #78a/#78b) : nouvelle catégorie de recherche/fiche, sa
   propre teinte — jamais une couleur déjà prise (npc/poi/quest/qao/workshop/
   searchable_chest/camp_chest ci-dessus + CAMP_COLORS/RARITY/ZONE/LOCATION/
   ABILITY/EVENT plus bas) : un brasage cuivré/or (thème artisanat), choisi
   dans l'un des rares intervalles de teinte encore libres de la roue
   chromatique du site (~45-80°, entre les ors/tans existants ~30-42° et les
   verts ~90°+ — même méthode que le commentaire CAMP_COLORS ci-dessus). */
const RECIPE_HEX = '#c2a83f';
/* Nœud de récolte (#81, site/data/<lang>/nodes.bin) : PAS de teinte dédiée
   inventée -- un nœud EST déjà l'un des 3 métiers de récolte dont la couleur
   de couche carte existe (CAMP_COLORS.mining/herbalism/logging, voir le
   commentaire "palette pass" ci-dessus) ; ce helper réutilise directement
   cette même source (même principe qu'ecAttr : jamais une teinte dupliquée en
   dur à un nouveau site d'appel) plutôt que de forger une 4ᵉ couleur qui
   diluerait le triplet déjà choisi pour sa lisibilité mutuelle. Repli
   RECIPE_HEX (brasage cuivré neutre) seulement quand le nœud n'est pas encore
   résolu (course de chargement différé, voir js/fiches.js nodeChip). */
const nodeHex = n => CAMP_COLORS[(n?.prof || '').toLowerCase()] || RECIPE_HEX;
/* ── Couleurs de nouvelles familles de kind (SCAFFOLDING E′c-0) ────────────
   Constantes pré-posées pour des vagues E′c ultérieures (région, disposition,
   palier de nœud) — RIEN ne les consomme aujourd'hui, donc zéro changement de
   rendu. Toutes COHÉRENTES avec la palette existante (ADN cartographe bleu
   nuit + accent ambre --accent #e0a23f), jamais une teinte neuve gratuite. */
/* Région/zone : MÊME teinte que la couche polygone « Zones (régions) »
   (ZONE_HEX) — le vocabulaire renomme zone→région (blueprint §4.1), la teinte
   du polygone ne bouge pas. Alias nommé pour la future fiche région
   (openRegionFiche, vague E′c-R). */
const REGION_HEX = ZONE_HEX;
/* Disposition (creeps.disposition chaîne, future monsters.disposition — voir
   data.js dispositionFor) : triade « feu tricolore » sobre, harmonieuse avec
   la palette et distincte des hex existants (jamais l'exact vert Uncommon, ni
   l'ambre npc, ni le rouge --danger réservé au flag « dev »). Consommée par la
   future DispositionBadge (vague E′c-4). */
const DISPOSITION_HEX = {
  peaceful: '#5cae7a',   // vert calme
  neutral:  '#d1a054',   // ambre prudence
  hostile:  '#d1495b',   // rouge hostile — distinct du rouge-danger « dev »
};
/* Palier de nœud de récolte (échelle de tier de la fiche nœud, blueprint
   §1.2/§3.3) : rampe métallique chaude, monotone en luminosité (T1 bronze mat
   → T5 or clair), lisible sur fond sombre. Axe ORTHOGONAL à la couleur de
   métier (nodeHex ci-dessus) : le métier dit QUOI, le palier dit COMBIEN.
   Consommée par la future fiche nœud enrichie (vague E′c-5). */
const NODE_TIER_HEX = ['#9a8c78', '#b08d57', '#c9a24a', '#e0b93f', '#f2d06b'];
/* nodes.bin `tier` est une CHAÎNE ("T1"/"T2"/"T3", suffixe de clé gn_*_t\d) ;
   nodeTierNum en extrait l'entier (le point d'entrée de la rampe/du badge).
   Repli 0 = palier non résolu (course de chargement différé). */
const nodeTierNum = t => { const m = /(\d+)/.exec(String(t == null ? '' : t)); return m ? +m[1] : 0; };
const nodeTierHex = t => NODE_TIER_HEX[Math.max(0, Math.min(NODE_TIER_HEX.length - 1, nodeTierNum(t) - 1))] || RECIPE_HEX;
/* Badge de PALIER de nœud (Lot 1 — GRANULARITY_AUDIT #2 : le tier T1-T3 des 30
   nœuds nodes.bin était SOUS-surfacé en simple sous-titre texte et la rampe
   NODE_TIER_HEX restait scaffoldée-inutilisée). Micro-étiquette de
   CLASSIFICATION de domaine, colorée par la rampe métallique (T1 bronze mat →
   T3+ or clair) — MÊME registre visuel que .disposition-badge/.roster-qual
   (chips de domaine), délibérément DISTINCT de la famille .badge d'HONNÊTETÉ
   (provenance) : un palier est une donnée du jeu, jamais une revendication de
   provenance. Rendu partout où un nœud se montre (fiche/recherche/chip), source
   de couleur UNIQUE (nodeTierHex). '' quand le palier est absent/non résolu. */
function nodeTierBadge(tier) {
  const n = nodeTierNum(tier);
  if (!n) return '';
  return `<span class="node-tier-badge" style="--tier-c:${nodeTierHex(tier)}" title="${esc(tr('nodeTierTip', tier))}">${esc(tier)}</span>`;
}
const monsterAttackLabel = key => tbl('monsterAttack', key) || pretty(key);
const locationKindLabel = key => tbl('locationKind', key) || pretty(key);
/* Statistiques de monstre (stats_decoded / stat_curve) — voir
    "Monster stats" + js/fiches.js::openMonsterFiche(). */
const statLabel = key => tbl('statLabel', key) || pretty(key);
const statTierLabel = key => tbl('statTier', key) || key;
/* Formules (item.artifact_formula / ability.formula, voir js/fiches.js) : le
   code opérande-2 COURT du moteur (Ap/Arm/Sp…, 
   ) n'est PAS le our_stat_id snake_case utilisé par
   stat_ranges/statLabel — cette petite table fait le pont pour les quelques
   codes vus dans les formules décodées à ce jour. formulaTermLabel() reste
   honnête sur ses replis : table statLabel (via l'alias) d'abord, puis le
   nom anglais figé du terme (stat_name) SEULEMENT s'il n'existe aucune
   entrée, puis pretty(code) en dernier recours — jamais un label inventé. */
const FORMULA_STAT_ALIAS = { Ap: 'attack_power', Arm: 'armor', Sp: 'spell_power' };
function formulaTermLabel(t) {
  const code = t.stat_code;
  const canon = code && (FORMULA_STAT_ALIAS[code] || code);
  const known = canon && tbl('statLabel', canon);
  return known || t.stat_name || pretty(code || '');
}
const RARITY = {
  Common:   { hex: '#b9c2c8' },
  Uncommon: { hex: '#6fbf73' },
  Rare:     { hex: '#4cc9f0' },
  Epic:     { hex: '#c77dff' },
  // Legendary (5ᵉ palier — RARITY_ORDER slot 4 déjà réservé, voir rarity.js) :
  // teinte orange « légendaire » suivant la convention universelle du ladder
  // (commun gris → peu commun vert → rare bleu → épique violet → LÉGENDAIRE
  // orange), franchement distincte de l'épique violet. Corrige un bug de rendu
  // à BLANC latent : un item de rareté Legendary n'avait ni hex (RARITY était
  // sans entrée → var(--muted)) ni libellé (rarity.Legendary manquant des
  // locales). Libellé ajouté aux 5 locales (section rarity).
  Legendary: { hex: '#ff8c26' },
};
const rarityLabel = key => tbl('rarity', key);
const itemKindLabel = key => tbl('itemKind', key);
/* Métier (item/recette `prof`, ex. "Construction"/"Cooking") et méthode de
   dépeçage (monstre `harvestMethod`, ex. "Flayer") : tokens neutres repris
   tels quels de ConstProfession.xml (le jeu les partage entre item.prof,
   recipe.prof et le nom du "harvest tool" d'un monstre) — le site compose
   son propre libellé localisé, même principe que weaponType/campKind. */
const professionLabel = key => tbl('profession', key) || pretty(key);
const harvestMethodLabel = key => tbl('harvestMethod', key) || tbl('profession', key) || pretty(key);
/* Type d'arme (weapon.weapon_type/use_type/class — tokens moteur neutres) :
   le site compose son propre libellé localisé, même principe que
   CATS/RARITY/campKindLabel ci-dessus. Résout un nom d'arme "Gun Bom Bm 2H
   Assault" illisible en "Assault" + un sous-libellé de type séparé
   ("Pistolet · Deux mains · Bombardier"). */
const weaponTypeLabel = key => tbl('weaponType', key) || pretty(key);
const useTypeLabel = key => tbl('useType', key) || pretty(key);
const weaponClassLabel = key => tbl('weaponClass', key) || pretty(key);
function weaponTypeLine(w) {
  if (!w) return '';
  // + spécialisation de héros (Defender/Legionary/Ranger…) et tier d'arme
  // (T1-T3) — présents sur 281 armes mais jamais affichés jusqu'ici. Dédup
  // au cas où classe et spécialisation se recoupent (ex. Warmonger).
  const parts = [weaponTypeLabel(w.weapon_type), useTypeLabel(w.use_type), weaponClassLabel(w.class),
    w.specialization ? pretty(w.specialization) : null, w.tier || null].filter(Boolean);
  return [...new Set(parts)].join(' · ');
}
/* Objectifs de quête machine-exacts : verbe + pictogramme par type d'action.
   repair/craft/mix sont des verbes concrets à part entière (jamais "custom"/
   "Faire" en repli) — voir actionVerb() ci-dessous. */
const ACTION_META = {
  kill:    { ico: 'sword' },
  collect: { ico: 'bag' },
  use:     { ico: 'hand' },
  talk:    { ico: 'bubble' },
  goto:    { ico: 'pin' },
  deliver: { ico: 'box' },
  repair:  { ico: 'wrench' },
  craft:   { ico: 'hammer' },
  mix:     { ico: 'flask' },
  custom:  { ico: 'spark' },
};
const actionVerb = action => tbl('action', action) || tbl('action', 'custom');
const ACTION_ICON_PATHS = {
  sword: '<path d="M14.7 2.6 21 8.9l-1.4 1.4-1.1-1.1-7.6 7.6.9 2.7-1.7 1.7-2-2-3.6 3.6-1.8-.1-.1-1.8 3.6-3.6-2-2 1.7-1.7 2.7.9 7.6-7.6-1.1-1.1Z"/>',
  bag: '<path d="M9 7.5V6a3 3 0 0 1 6 0v1.5"/><path d="M5.5 7.5h13L17.3 20H6.7L5.5 7.5Z"/>',
  hand: '<path d="M8.5 12.2V6a1.4 1.4 0 0 1 2.8 0v5"/><path d="M11.3 11.2V4.6a1.4 1.4 0 0 1 2.8 0v6.6"/><path d="M14.1 11.2V6.4a1.4 1.4 0 0 1 2.8 0v7.2"/><path d="M8.5 13v2.6A5.4 5.4 0 0 0 13.9 21h.6a5.4 5.4 0 0 0 5.4-5.4v-3.9"/>',
  bubble: '<path d="M4 5.5h16v10.2H9.8L5.5 19v-3.3H4V5.5Z"/>',
  pin: '<path d="M12 21s6.5-6.2 6.5-11.3a6.5 6.5 0 1 0-13 0C5.5 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.2"/>',
  box: '<path d="M3.5 8 12 4l8.5 4-8.5 4-8.5-4Z"/><path d="M3.5 8v8.3L12 20l8.5-3.7V8"/><path d="M12 12v8"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 1-5.1 5.1L4.6 16.4a2 2 0 0 0 2.9 2.9l5.1-5.1a4 4 0 0 1 5.1-5.1l-2.6 2.6-2-2 2.6-2.6Z"/>',
  hammer: '<path d="M14.5 3.5 20 9l-1.8 1.8-1.4-1.4L9 17.2l-2.6-2.6 7.6-7.6-1.4-1.4Z"/><path d="M4 20l3.6-3.6"/>',
  flask: '<path d="M9.5 3h5"/><path d="M10.2 3v5.6L5.8 16.2A2 2 0 0 0 7.6 19h8.8a2 2 0 0 0 1.8-2.8l-4.4-7.4V3"/><path d="M7.8 14.5h8.4"/>',
  spark: '<path d="M12 3.5v3.8M12 16.7v3.8M4.3 12h3.8M15.9 12h3.8M6.8 6.8l2.7 2.7M14.5 14.5l2.7 2.7M17.2 6.8l-2.7 2.7M9.5 14.5l-2.7 2.7"/>',
};
function actionIconSvg(kind) {
  return `<svg class="goal-ico-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ACTION_ICON_PATHS[kind] || ACTION_ICON_PATHS.spark}</svg>`;
}

/* Nom lisible d'une carte : libellé i18n (mapName) sinon repli propre — les
   arènes portent des noms de LIEU (Dendrohold, Wagon Yard…) : on strippe juste
   le préfixe de famille (BG_Arena_/PvE_Arena_/…) et on prettifie, valable dans
   toutes les langues (noms propres). Seuls Kwalat + les 2 îles d'Extraction
   ont une traduction dédiée dans i18n.js (mapName). */
function prettyMapId(id) {
  const s = (id || '').replace(/^(BG_Arena_|PvE_Arena_|PvP_Arena_|Extraction_Island_)/, '')
    .replace(/_/g, ' ').trim();
  return s ? s.replace(/^./, c => c.toUpperCase()) : id;
}
const mapName = id => tbl('mapName', id) || prettyMapId(id);

/* ── Types de contenants — CLASSIFICATION CUITE (ontology chunk 2) ──────
   Le sous-type de prop (tonneau explosif, caisse de maïs, cercueil,
   champignons…) est désormais un CHAMP EXPÉDIÉ (`subtype`, ◇ byte-dérivé —
    CAMP_SUBTYPE_RULES,  « Canonical
   classification ») : les tables de re-détection front (CAMP_TYPE_RULES /
   TYPED_CAMP_RE, regex sur la clé) sont SUPPRIMÉES — le front ne
   re-classifie plus jamais, il lit `subtype`/`category` sur le record.
   Vérifié byte-identique à l'ancienne détection sur les 302 groupes de
   camps expédiés (toutes cartes) avant suppression. */
const campTypeLabel = key => tbl('campType', key) || pretty(key);
/* Préfixes de VOCABULAIRE de manager — conservé UNIQUEMENT comme repli pour
   une clé brute retardataire (un record sans `name`/`subtype` expédiés, une
   future carte pas encore repassée par le pipeline) : les surfaces normales
   lisent les champs cuits, jamais ce strip. Marqué tel quel (chunk 2). */
const CAMP_KEY_VOCAB_PREFIX_RE = /^(fulfillment-manager-|ffm-island-|ffm-bg-arena-)/;
/* RÉSIDU DE FORMATAGE (INTERIM, marqué — chunk 2) : le `name` expédié d'un
   camp typé contient encore les mots du prop (« Mushrooms Windreach Woods »,
    « raw split ») et AUCUN champ « reste » (la partie région
   de la clé) n'est expédié. Pour afficher « Champignons — Windreach woods »
   (byte-identique à l'existant), les mots de vocabulaire prop/kind sont
   retirés de la CLÉ ici. Ce n'est PAS une re-classification (le type vient
   du champ `subtype` cuit) : un dictionnaire PLAT de mots d'affichage à
   retirer, vérifié byte-exact contre l'ancien rendu sur toutes les clés
   expédiées. À SUPPRIMER quand le pipeline expédiera le reste propre (gap
   remonté au rapport chunk 2 — le pipeline possède le fix). */
const CAMP_KEY_PROP_WORDS_RE = /\b(explosive|barrels?|corn|wheat|cabbage|carrot|onion|eggplant|berries|container|sacks?|bags?|tombstones?|coffins?|chests?|corpses|mushrooms?|urban|bottles|pots|wooden|leaf|trash|vegetables)\b/g;
const CAMP_KEY_KIND_WORDS_RE = /\b(poi|destroyable|searchable|reactive)\b/g;
function campKeyRest(rawKey, dropProps) {
  let k = (rawKey || '').replace(CAMP_KEY_VOCAB_PREFIX_RE, '').replace(CAMP_KEY_KIND_WORDS_RE, '');
  if (dropProps) k = k.replace(CAMP_KEY_PROP_WORDS_RE, '');
  return pretty(k.replace(/[-_]+/g, ' ').trim());
}
/* REPLI pour clé brute retardataire SEULEMENT (record sans `name` cuit) —
   l'ancienne extraction de type par regex est retirée, voir l'en-tête. */
function campDisplayName(rawKey) {
  return pretty((rawKey || '').replace(CAMP_KEY_VOCAB_PREFIX_RE, ''));
}

/* Nom d'affichage d'un camp de référence — UNE seule implémentation,
   consommée par fiches.js (openCampFiche/farmCampRow/farmUnjoinedRow) ET
   popups.js (campPopup) ET search.js (campSearchLabel), jamais re-dérivée
   par surface. Lit les champs CUITS du record (ontology chunk 2) :
   - `subtype` présent (prop typé — caisse de maïs, champignons…) : libellé
     campType localisé + reste de clé (résidu de formatage, voir ci-dessus) ;
   - kind interactable typé SANS subtype (15-85 % des camps typés, absence
     honnête —  #25) : libellé du kind + reste de clé ;
   - sinon : le `name` PROPRE expédié (splitter pipeline), repli
     campDisplayName pour une clé retardataire sans name. */
function campLabel(key, kind, shippedName, subtype) {
  // Sous-type SANS libellé localisé (jeton fraîchement cuit par le pipeline,
  // pas encore dans les tables campType — ex. `doors`, apparu en cours de
  // route) : composer « Pretty(jeton) — reste » n'apporterait RIEN sur le
  // `name` expédié (et le résidu de formatage ne connaît pas ses mots →
  // doublon « Doors — Abandoned doors ») — repli honnête sur le name,
  // l'affichage se met à niveau tout seul quand la passe i18n ajoute le
  // jeton. Les 21 sous-types connus ont tous leur entrée ×5 locales
  // (byte-parité vérifiée).
  if (subtype && tbl('campType', subtype)) {
    const rest = campKeyRest(key, true);
    return rest ? `${campTypeLabel(subtype)} — ${rest}` : campTypeLabel(subtype);
  }
  if (kind === 'destroyable' || kind === 'searchable' || kind === 'reactive') {
    const rest = campKeyRest(key, false);
    return rest ? `${campKindLabel(kind)} — ${rest}` : campKindLabel(kind);
  }
  return shippedName || campDisplayName(key);
}
/* ── Split de PRÉSENTATION par contenu PROUVÉ (2026-07-15) ────────────────────
   Décision propriétaire : « maintenant que les zones sont typées par contenu
   PROUVÉ (camps.bin `subtype`/`subtypeSource`), MONTRER le type ». Certains
   kinds de camp sont présentés en PLUSIEURS couches selon leur sous-type
   dominant, mutuellement exclusives :
     - `searchable` → Corps (subtype `corpses`, dominant) vs le reste ;
     - `reactive`   → Squelettes (subtype `skeleton`) vs le reste.
   Le groupe garde son `kind`/`subtype` RÉELS (popup/fiche/recherche les lisent) ;
   seule la CLÉ D'ÉTAT de couche (S.camps) dérive via campStateKey — chaque seau
   devient une couche indépendante qui réutilise TOUTE la machinerie kind (ligne
   d'arbre, tracé composite, jeton de hash, popup). Les kinds/sous-types non
   listés retombent sur leur kind d'origine (aucune couche fantôme : une carte
   sans corps searchable / sans squelette reactive ne crée simplement pas la
   clé, donc pas de ligne vide). */
const CAMP_SUBTYPE_SPLIT = {
  searchable: { corpses: 'searchable_corpses' },
  reactive: { skeleton: 'reactive_skeleton' },
};
function campStateKey(g) {
  const m = g && CAMP_SUBTYPE_SPLIT[g.kind];
  return (m && m[g.subtype]) || (g ? g.kind : undefined);
}
/* Teinte de COUCHE d'un camp — la couleur de sa couche de présentation (split
   inclus), SOURCE UNIQUE partagée par le tracé carte (compositeCampPoints), la
   popup, la fiche, la réf `[Camp(●)]` et la recherche : un camp de spawn de
   corps se lit mauve PARTOUT, jamais mauve sur la carte et or dans la popup. */
function campLayerHex(g) {
  return (g && (CAMP_COLORS[campStateKey(g)] || CAMP_COLORS[g.kind])) || '#999';
}
/* Descripteur de CONTENU honnête d'un camp (camps.bin `subtype`/`corpseFraction`/
   `subtypeSource`) : composition PROUVÉE par preset de spawn serveur
   (`subtypeSource:'presets'`) ou par le nom de la zone (`'name'`) — jamais
   inférée. Renvoie { label (campType localisé), corpsePct (fraction de corps
   dans le pool, seulement quand > 0), source } ; `null` quand le camp n'est pas
   typé (absence honnête). Aucune interne de preset n'est exposée. */
function campContentInfo(g) {
  if (!g || !g.subtype || !g.subtypeSource) return null;
  // Seulement les sous-types à libellé de CONTENU connu (campType — corps,
  // squelettes, champignons, caisses…) : jamais les sous-types de FAUNE
  // (« rat », « small », « raptor »…) qui ne décrivent pas un contenu de pool.
  // Même porte que la branche subtype de campLabel — cohérence nom/contenu.
  const label = tbl('campType', g.subtype);
  if (!label) return null;
  const cf = typeof g.corpseFraction === 'number' ? g.corpseFraction : 0;
  return { label, corpsePct: cf > 0 ? Math.round(cf * 100) : null, source: g.subtypeSource };
}
/* Valeur d'affichage du contenu (popup/fiche) : la fraction de corps quand elle
   est prouvée (« ~86 % de corps »), sinon le libellé de sous-type (« Squelettes »). */
function campContentValue(g) {
  const info = campContentInfo(g);
  if (!info) return null;
  return info.corpsePct != null ? tr('campCorpsePct', info.corpsePct) : info.label;
}
/* Qualificatif de camp (patrol|buffed -- jeton NEUTRE côté moteur, poids par
   mode PvP/PvE byte-prouvé, voir  §3) :
   « — Patrouille » / « — Renforcé (PvP) », formulation SOFT (c'est un poids
   serveur, jamais une garantie de tracé/timer -- voir  §3.3).
   campQualifierChip est PARTAGÉ par fiches.js (farmCampRow/farmUnjoinedRow/
   openCampFiche) ET popups.js (campPopup) : posé ici (module pur, aucune
   dépendance DOM/état) pour éviter tout import croisé entre ces deux fichiers
   (fiches.js importe déjà mobLabelHtml depuis popups.js). Pas d'esc() ici :
   `qualifier` est un jeton d'ENUM fixe ("patrol"/"buffed"), jamais du texte
   libre saisi par un joueur. */
const campQualifierLabel = key => tbl('campQualifier', key) || pretty(key);
function campQualifierChip(qualifier) {
  return qualifier ? ` <span class="camp-qualifier">— ${campQualifierLabel(qualifier)}</span>` : '';
}
/* Libellé d'un mode de jeu de camp_details.bin `modes` (#93, camp_details
   ships per-mode weights) : jetons PvE/PvP/SoloPvE/SoloPvP/SoloPvP_HC, ou
   `<mode>@N` (palier de danger N, îles d'Extraction seulement) -- le suffixe
   de palier est composé par l'appelant (fiches.js campModesHtml), cette
   fonction ne résout que le token de BASE. */
const campModeLabel = key => tbl('campMode', key) || pretty(key);

/* Type d'un coffre placé (tc_*) et nature d'un objet de quête activable
   (qao) : le pipeline classifie déjà chaque enregistrement sur le vrai champ
   moteur (world_objects.json chest_type/activable_type — tokens neutres
   capitalisés, ex. "Barrel"/"Boxes"/"Radio"/"Evidence") — le site compose
   juste son propre libellé localisé, même principe que campKindLabel/
   monsterAttackLabel ci-dessus. Pas de déduction depuis le nom de prop ici :
   ce champ existe déjà sur r.type (voir  "Chest loot + type" /
   "Activable type").
   Overlay ⚑ (ontology chunk 2) : quand class_labels.bin porte le mot
   OFFICIEL du client pour le jeton (src:"game", Interactive.xml byte-matché
   — ex. Chest→« Coffre »/« Сундук »), il PRIME sur notre libellé ◇. Les 5
   locales expédiées sont déjà byte-alignées (zéro changement visible
   aujourd'hui) ; jamais de src:"game_tooltip_mt" ici (voir classlabels.js,
   qui l'interdit à la source). campType/decorFamily restent ◇ : leurs
   libellés portent des qualificatifs byte-dérivés/du pluriel de couche que
   le nom de classe du jeu appauvrirait — décision documentée dans
   classlabels.js + le rapport chunk 2. */
const chestTypeLabel = key => gameLabel('chestType', key) || tbl('chestType', key) || pretty(key);
const activableTypeLabel = key => gameLabel('activableType', key) || tbl('activableType', key) || pretty(key);

/* Nom d'affichage d'un coffre placé (popup, fiche, recherche) : le NOM brut
   (r.name, ex. "Chest barrel elenian 02 blood") est un identifiant d'ASSET
   D'ART — jamais localisé (pas une entrée Localization/, voir 
   "Chest loot + type") et truffé de bruit interne (set d'art "elenian"/
   "greenville", couleur, variante…) qui ne dit RIEN au joueur. Le vrai
   classifieur joueur, c'est r.type (Barrel/Boxes/Corpse/Cabinet/…, même champ
   que chestTypeLabel ci-dessus) : on l'affiche SEUL, localisé, comme nom — la
   position sur la carte dit déjà où, la fiche dit quoi + butin, inutile de
   répéter le jeton d'art. Repli sur le nom nettoyé (préfixe "Chest "/"Small
   chest " retiré, reste prettifié) seulement pour les ~44 placements sans
   type lié (voir  coverage). */
function chestDisplayName(r) {
  if (r.type) return chestTypeLabel(r.type);
  return pretty((r.name || '').replace(/^(small\s+)?chest\s+/i, ''));
}

/* ── Décor (chests.bin `group==="decor"`|`"legacy_chest"`) ──────────────
   6 familles de décor + le coffre-trésor hérité (legacy) — voir
    §3.1. Ordre d'affichage = ordre de la liste ci-dessous
   (grosso modo décroissant par volume, legacy en dernier — c'est un `group`
   à part, pas une vraie "famille" décor, mais rangé au même endroit dans le
   panneau à la demande du propriétaire). Couleurs volontairement sourdes/
   terreuses (décor = masqué par défaut, jamais le point d'attention visuel
   des 2 vraies couches de coffres ci-dessus). */
/* Corps : le CHAMP CUIT `contentRole` (chests.bin, byte-dérivé du client —
   loot_tables lt_searchable_corpse_quest / lt_searchable_corpse / aucune,
   voir  LOT C) distingue trois RÔLES honnêtes : corps
   CÂBLÉ-QUÊTE (contentRole=quest, 11), corps FOUILLABLE (contentRole=loot, 34),
   corps DÉCOR (aucun rôle prouvé — 'unknown'/'decor', 6). Un corps reste un
   corps (kind=corpse, family='corpse' pour les 51). Depuis l'arbre PLAT
   (décision propriétaire 2026-07-14), le rôle N'EST PLUS une couche d'arbre :
   les corps forment UNE seule famille 'corpse' (data.js buildDecorGroups,
   couche decor:corpse, main.js). corpseRoleKey ne sert donc plus qu'à la
   FICHE/au popup — teinte + libellé PAR RECORD via chestHex/chestKindLabel
   ci-dessous (le rôle se lit sur l'objet ouvert, jamais comme 3 lignes). */
function corpseRoleKey(r) {
  const role = r && r.contentRole;
  if (role === 'quest') return 'corpse_quest';
  if (role === 'loot') return 'corpse_loot';
  return 'corpse_decor';   // unknown / decor / rôle non prouvé : corps décoratif
}
const DECOR_FAMILIES = ['barrel', 'boxes', 'furniture', 'misc', 'corpse', 'books', 'legacy'];
const DECOR_HEX = {
  barrel: '#a9744c', boxes: '#c2a25c', furniture: '#8f97a8',
  // `corpse` = teinte de la couche/ligne UNIQUE des corps (arbre plat). Les
  // trois teintes de RÔLE (corpse_quest/loot/decor) restent : chestHex les lit
  // PAR RECORD pour la pastille de la fiche/du popup (corpseRoleKey), jamais
  // pour une couche d'arbre — sourdes/terreuses (décor masqué par défaut).
  corpse: '#8a7080', corpse_quest: '#a06a86', corpse_loot: '#8a7080', corpse_decor: '#6f6470',
  books: '#8d7ab0', misc: '#6c757d', legacy: '#c9a66b',
};
const decorFamilyLabel = key => tbl('decorFamily', key) || pretty(key);

/* Couleur RÉELLE d'un coffre placé (S.data.chest) — camp_chest/legacy_chest/
   décor par famille, jamais un unique hex "coffre" générique (l'ancien
   CATS.chest, retiré — voir  §3.1). Utilisée partout où un
   point/tracké/popup/fiche de S.data.chest a besoin d'une couleur honnête. */
function chestHex(r) {
  if (!r) return DECOR_HEX.misc;
  if (r.group === 'camp_chest') return CATS.camp_chest.hex;
  if (r.group === 'legacy_chest') return DECOR_HEX.legacy;
  // Corps : teinte par RÔLE (contentRole), jamais un unique gris « corps » —
  // même vocabulaire de seau que la couche/la recherche (corpseRoleKey).
  if (r.kind === 'corpse') return DECOR_HEX[corpseRoleKey(r)] || DECOR_HEX.corpse;
  return DECOR_HEX[r.family] || DECOR_HEX.misc;
}
/* Libellé de catégorie RÉELLE d'un coffre placé (pop-cat/fiche-kind) —
   remplace l'ancien catLabel('chest') générique qui conflait les 3 vraies
   catégories sous un seul "Coffres" (voir  §3.1 et §6). */
function chestKindLabel(r) {
  if (!r) return '';
  if (r.group === 'camp_chest') return tr('campChestLabel');
  if (r.group === 'legacy_chest') return tr('legacyChestLabel');
  // Corps : le libellé du SEAU par rôle (« Corps de quête » / « Corps
  // fouillables » / « Corps (décor) ») — vocabulaire partagé arbre/recherche/
  // fiche (corpseRoleKey → decorFamily), plus jamais un « Décor — Corpse » plat.
  if (r.kind === 'corpse') return decorFamilyLabel(corpseRoleKey(r));
  return `${tr('decorGroupLabel')} — ${decorFamilyLabel(r.family)}`;
}

/* ── Seau (bucket) d'interactable — vocabulaire PARTAGÉ arbre/recherche/fiche
   (Lot 2 — GRANULARITY_AUDIT #3). Les ~18 valeurs de `type` (Barrel/Boxes/
   Cabinet/Kitchen/Corpse/Papers…, chestTypeLabel) et les ~24 subtypes de la
   source apparaissaient À PLAT (sous-titre de recherche, titre de fiche) sans
   le seau auquel l'objet appartient. L'arbre latéral les range déjà sous 4
   seaux DÉRIVÉS de la `category` OFFICIELLE cuite (interactable.chests/
   destroyable/reactive/other → sidebar.js buildGroupContainers) ; ce résolveur
   expose EXACTEMENT ce même vocabulaire de seau (mêmes clés i18n subChests/
   subDestroyable/subInteractives/subOther) aux surfaces à plat, pour qu'un
   "Cabinet" se lise partout « Interactives · Cabinet » — jamais un 5ᵉ
   vocabulaire parallèle. Repli honnête sur le seau « Autres » pour toute
   catégorie hors des 4 (aucun record aujourd'hui, garde défensive). */
const INTERACTABLE_BUCKET_KEY = {
  'interactable.chests': 'subChests',
  'interactable.destroyable': 'subDestroyable',
  'interactable.reactive': 'subInteractives',
  'interactable.other': 'subOther',
};
const interactableBucketLabel = category => tr(INTERACTABLE_BUCKET_KEY[category] || 'subOther');

/* Prettification du `region` d'un coffre fouillable (searchable_chests.bin —
   aucun libellé fourni par les données, voir  §4) :
   "ripplecrop-fields" -> "Ripplecrop Fields". Même esprit neutre que
   prettyMapId ci-dessus (noms propres, valable dans toutes les langues). */
function prettyRegion(region) {
  return (region || '').split('-').map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ');
}
/* Couleur neutre pour la fiche « table de butin » générique (openLootTableFiche,
   js/fiches.js) — pas liée à un coffre placé précis (peut être ouverte depuis
   n'importe quel lien de table nommée), donc pas de chestHex() ici. */
const LOOT_TABLE_HEX = '#c9a66b';

/* Table de butin PROBABLE d'un camp cassable/fouillable : CHAMP CUIT
   `probableLoot` du record (ontology chunk 2 — l'ancienne table front
   CAMP_LOOT_TABLE_RULES est SUPPRIMÉE, portée en pipeline
   dataset_helpers.camp_probable_loot ; vérifié byte-identique — 0 écart sur
   les 302 groupes expédiés, gating « la table existe dans ce build »
   compris). Le client ne fournit toujours PAS le lien prop → table :
   l'association reste « par correspondance exacte de type », la mention
   honnête d'openCampFiche est conservée telle quelle. */

/* Alias de familles de monstres : le client fragmente quelques tokens de
   famille (« robo » vs « robot »…) — regroupés à l'affichage du bestiaire.
   Étendre ici si d'autres doublons apparaissent dans les données. */
const FAMILY_ALIAS = { robo: 'robot' };
const familyKey = f => FAMILY_ALIAS[f] || f;

/* Teintes des sous-couches « Par famille » (#82 chunk (b), design §4.3) :
   un petit cycle DÉTERMINISTE de 8 teintes dérivées de CAMP_COLORS.monsters
   (#ef476f, teinte ≈347°) par rotations de teinte successives de +40°
   (40°, 80°, … 320°) à saturation/luminosité fixes (70 %/58 %) — la teinte
   de base elle-même est volontairement EXCLUE du cycle pour qu'aucune
   famille ne se confonde avec la ligne kind « Camps de monstres » quand les
   deux sont cochées (le compositeur donne la priorité à la famille, sa
   couleur doit rester distinguable du kind qu'elle recouvre). Jamais de
   hasard par session : la teinte d'une famille = cycle[rang % 8], où le
   rang est l'index de la famille dans la liste triée par points
   décroissants (js/pointsets.js monsterFamilies()) — stable tant que les
   données le sont ; à >8 familles le cycle se répète (assumé : 20 familles
   sur Kwalat, les rangs lointains pèsent peu de points). */
const MONSTER_FAMILY_HEX_CYCLE = [
  '#df8c49', '#cddf49', '#69df49', '#49df8c',
  '#49cddf', '#4969df', '#8c49df', '#df49cd',
];
/* Teinte d'une FAMILLE — assignation DÉTERMINISTE par IDENTITÉ (hash djb2 de
   la clé de famille post-alias, exactement comme speciesLayerHex ci-dessous),
   stable ×sessions/cartes/langues/surfaces. Remplace l'ancien rang de liste
   (familyHexByRank(rang) via monsterFamilies()) qui GLISSAIT selon le contexte
   de tri — la fiche et l'arbre calculaient alors des rangs différents pour la
   MÊME famille → deux couleurs (bug user 2026-07-12 « Mutant rat page ≠ Mutant
   rat à gauche »). LA source unique de la couleur d'une famille, partagée par
   l'arbre, la fiche, les chips d'objectif et toute référence — deux familles
   peuvent partager une teinte (8 teintes), assumé : le libellé désambiguïse. */
function familyLayerHex(fam) {
  const k = familyKey(fam) || String(fam || '');
  return MONSTER_FAMILY_HEX_CYCLE[djb2(k) % MONSTER_FAMILY_HEX_CYCLE.length];
}

/* Teintes des couches ESPÈCE (#82 chunk (d), modèle « l'arbre EST le
   bestiaire ») : cycle dédié, volontairement plus clair/saturé que
   MONSTER_FAMILY_HEX_CYCLE ci-dessus (S/L ~78 %/68 % vs 70 %/58 %, mêmes 8
   rotations de teinte) — une espèce cochée (grain le plus fin, priorité de
   rendu MAXIMALE dans le compositeur main.js : espèce > famille > kind) doit
   rester distinguable de la famille et du kind qu'elle recouvre quand les
   trois sont cochés. Assignation DÉTERMINISTE par IDENTITÉ (hash djb2 de
   l'id d'espèce, stable ×sessions/cartes/langues — jamais un rang de liste,
   qui glisserait à chaque décochage) ; deux espèces peuvent partager une
   teinte (8 teintes) : assumé, la ligne du panneau porte le libellé qui
   désambiguïse. */
const SPECIES_LAYER_HEX_CYCLE = [
  '#f2a35e', '#dff25e', '#7df25e', '#5ef2a3',
  '#5edff2', '#7d8ff2', '#a35ef2', '#f25edf',
];
function speciesLayerHex(spId) {
  return SPECIES_LAYER_HEX_CYCLE[djb2(String(spId)) % SPECIES_LAYER_HEX_CYCLE.length];
}

/* ── entityColor — LA couleur d'entité DÉTERMINISTE (source UNIQUE) ───────────
   « Pour la couleur déterministe, prends le nom complet — tag + nom » (owner) :
   le KIND fixe une teinte d'ANCRE (npc→ambre, quête→violet, monstre→sa
   teinte…, reprise des constantes existantes — JAMAIS une couleur neuve), et un
   hash du `seed` (le nom/la clé STABLE de l'entité) choisit une NUANCE
   déterministe DANS la bande de ce kind. Ainsi « npc + rien = l'ambre catégorie
   (tous les PNJ) ; npc + Zarnok = un ambre PRÉCIS pour Zarnok », mais tout PNJ
   reste « couleur PNJ ». Même (kind, seed) → même hex TOUJOURS
   (×sessions/cartes/langues/surfaces) : un joueur reconnaît une entité à sa
   nuance PARTOUT — arbre, titre de fiche, refs, chips, popups (la cohérence que
   l'owner réclame ; corrige la classe de bug « même entité, deux couleurs selon
   le contexte »). LA source : refKindColor (mapref.js), les titres de fiche, les
   chips et les popups y délèguent tous — aucune surface ne calcule sa couleur.
   Présentation à DEUX TONS (voir mapref.js refKindBaseColor + style.css --ref-kc)
   : le TAG porte l'ancre du kind (--ref-kc), le NOM + la pastille portent la
   nuance précise (--ref-c = ce que renvoie entityColor). Une réf de CATÉGORIE
   (`[Npc] All`, seed absent) rend l'ancre EXACTE des deux côtés → mono-ton.

   Règles par famille de kind :
   - species / family : DÉLÈGUENT aux palettes d'IDENTITÉ dédiées
     (speciesLayerHex / familyLayerHex — cycle « arc-en-ciel » nécessaire à la
     distinction mutuelle des couches sur la carte, ratifié Q6) ; jamais
     re-nuancées ici (déjà précises par identité).
   - kinds à AXE SÉMANTIQUE (objet=rareté, nœud=métier, camp=sous-rôle,
     coffre=type) : leur teinte PORTE un sens (RARITY/nodeHex/CAMP_COLORS/
     chestHex fournis par l'appelant) — jamais une nuance par identité qui
     diluerait l'axe ; entityColor renvoie leur ancre telle quelle.
   - kinds d'IDENTITÉ à teinte plate (npc, quête, poi, atelier, qao, zone, lieu,
     capacité, table de butin) : ancre du kind + nuance par identité. */
function djb2(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h >>> 0;
}
/* Teinte d'ANCRE d'un kind — pointe TOUJOURS vers une constante existante
   (CATS/CAMP_COLORS/ZONE/…), jamais une couleur inventée. Rend null quand le
   kind n'a pas d'ancre propre décidable ici (objet → rareté ; camp/harvest sans
   sous-rôle) : l'appelant fournit alors la teinte précise, l'ancre = cette
   teinte (mono-ton). Réplique 1:1 les défauts de l'ancien registre KINDS. */
function kindBaseHex(kind, subrole) {
  switch (kind) {
    // Espèce de FAUNE (subrole 'wildlife', réfs d'objectif) : l'ancre du tag
    // est la teinte de la couche « Animaux paisibles » (CAMP_COLORS.wildlife —
    // la même que sa ligne d'arbre et le pool que son renvoi bascule), jamais
    // l'orange bestiaire : le tag dit « Wildlife », sa couleur dit pareil.
    case 'species': case 'family':
      return subrole === 'wildlife' ? CAMP_COLORS.wildlife : MONSTER_HEX;
    case 'npc':          return CATS.npc.hex;
    case 'poi':          return CATS.poi.hex;
    case 'workshop':     return CATS.workshop.hex;
    case 'quest':        return CATS.quest.hex;
    case 'qao': case 'quest_item': return CATS.qao.hex;
    case 'chest':        return CATS.searchable_chest.hex;
    case 'zone':         return ZONE_HEX;
    case 'location':     return LOCATION_HEX;
    case 'ability':      return ABILITY_HEX;
    case 'recipe': case 'node': return RECIPE_HEX;
    case 'loot':         return LOOT_TABLE_HEX;
    case 'shrine':       return CAMP_COLORS.shrines;
    case 'soulkeeper':   return CAMP_COLORS.soulkeeper;
    case 'guard':        return CAMP_COLORS.guards;
    case 'destructible': return CAMP_COLORS.destroyable;
    case 'reactive':     return CAMP_COLORS.reactive;
    case 'camp': case 'harvest': return subrole ? (CAMP_COLORS[subrole] || null) : null;
    default: return null;
  }
}
/* Kinds dont la teinte porte un SENS (axe sémantique) — jamais nuancés par
   identité : l'appelant fournit RARITY/nodeHex/CAMP_COLORS/chestHex, entityColor
   n'en renvoie que l'ANCRE (mono-ton, la teinte EST déjà l'information). */
const SEMANTIC_COLOR_KINDS = new Set([
  'item', 'quest_item', 'node', 'camp', 'shrine', 'soulkeeper',
  'guard', 'destructible', 'reactive', 'harvest', 'chest',
]);
/* #rrggbb → {h(0-360), s,l(0-100)} et retour. Standard, sans dépendance. */
function hexToHsl(hex) {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || '');
  if (!m) return { h: 0, s: 0, l: 50 };
  const r = parseInt(m[1], 16) / 255, g = parseInt(m[2], 16) / 255, b = parseInt(m[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  return { h, s: s * 100, l: l * 100 };
}
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const hx = v => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${hx(r)}${hx(g)}${hx(b)}`;
}
/* Nuance DANS la bande du kind : variation SURTOUT de luminosité (se lit comme
   « une nuance de » — intentionnel, jamais un quasi-doublon qui semblerait un
   bug), + un peu de saturation, + un LÉGER décalage de teinte (±13°) borné pour
   rester reconnaissablement « la couleur du kind » (owner : « garde-la dans la
   bande reconnaissable du kind »). Luminosité bornée [46,74] : lisible en fond
   sombre ET clair (jamais délavée ni noyée). 3 axes tirés de bits DISJOINTS du
   hash → indépendants, bonne dispersion. */
function entityShade(baseHex, seed) {
  const { h, s, l } = hexToHsl(baseHex);
  const hh = djb2(seed);
  const u = shift => ((hh >>> shift) & 31) / 31;                 // 0..1
  const nh = ((h + (u(0) - 0.5) * 26) % 360 + 360) % 360;        // ±13°
  const nl = Math.max(46, Math.min(74, l + (u(5) - 0.5) * 26));  // ±13, borné
  const ns = Math.max(45, Math.min(92, s + (u(10) - 0.5) * 32)); // ±16, borné
  return hslToHex(nh, ns, nl);
}
/* LA fonction. `seed` = identité stable de l'entité (nom/clé) ; falsy →
   catégorie/non résolue → ancre EXACTE (byte-égale à la constante du kind). */
function entityColor(kind, seed, opts = {}) {
  if (kind === 'species') return seed ? speciesLayerHex(String(seed)) : MONSTER_HEX;
  if (kind === 'family')  return seed ? familyLayerHex(String(seed)) : MONSTER_HEX;
  const base = kindBaseHex(kind, opts.subrole);
  if (seed == null || seed === '' || SEMANTIC_COLOR_KINDS.has(kind)) return base || 'var(--muted)';
  return base ? entityShade(base, String(seed)) : 'var(--muted)';
}

/* ── Accent d'entité (task #77, entity-color coherence) ──────────────────
   UNE convention pour tout chip/lien qui référence une AUTRE fiche (PNJ,
   objet, quête, monstre, camp, recette…) : la couleur vient TOUJOURS de la
   même source qu'un pin/filtre de carte pour ce kind (CATS[x].hex/
   CAMP_COLORS[kind]/MONSTER_HEX/RARITY[rarity].hex pour un objet…), jamais
   une teinte dupliquée en dur au site d'appel. Posée comme custom prop
   --chip-c (même idiome que .k-chip/.cat-chip/.rar-pill/.mk-pin's --pin) +
   un attribut `data-kind` qui ne sert QUE de sélecteur CSS (voir style.css
   ".chip[data-kind]"/".link[data-kind]" etc.) — sa valeur n'est jamais lue,
   seule sa PRÉSENCE active le style teinté ; un chip/lien sans cet attribut
   garde l'apparence neutre historique (aucune régression pour les usages
   non convertis). `hex` falsy (ex. itemColor() sur un item non résolu) :
   toujours 'var(--muted)' en amont, jamais un attribut vide — voir les
   appelants (itemColor ci-après dans fiches.js). */
function ecAttr(hex, kind) {
  return ` data-kind="${kind}" style="--chip-c:${hex}"`;
}

export {
  KWALAT_DEFAULTS, TILE_BASE, familyKey, familyLayerHex,
  speciesLayerHex, entityColor, kindBaseHex,
  CATS, catLabel, POI_TYPES, poiTypeLabel, CAMP_COLORS, campKindLabel,
  MONSTER_HEX, ZONE_HEX, LOCATION_HEX, ABILITY_HEX, EVENT_HEX, RECIPE_HEX, nodeHex,
  REGION_HEX, nodeTierBadge,
  interactableBucketLabel,
  monsterAttackLabel, locationKindLabel, statLabel, statTierLabel, formulaTermLabel,
  RARITY, rarityLabel, itemKindLabel, professionLabel, harvestMethodLabel,
  weaponTypeLabel, weaponTypeLine, weaponClassLabel, ACTION_META, actionVerb, actionIconSvg,
  mapName, ecAttr,
  campLabel, campQualifierLabel, campQualifierChip, campModeLabel,
  campStateKey, campLayerHex, campContentInfo, campContentValue,
  chestTypeLabel, activableTypeLabel, chestDisplayName,
  DECOR_FAMILIES, DECOR_HEX, decorFamilyLabel, corpseRoleKey, chestHex, chestKindLabel,
  prettyRegion,
};
