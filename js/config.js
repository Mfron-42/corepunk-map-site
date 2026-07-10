/* Kwalat — constantes structurelles : géométrie par défaut, palettes,
   catégories de couches et résolveurs de libellés (tokens neutres du jeu →
   libellé localisé via tbl()). Aucun état mutable ici. */
import { tbl, tr } from './i18n/index.js';
import { pretty } from './utils.js';

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
/* Coffres (container re-categorization, DATA_CONTRACT.md) : l'ancienne
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
  searchable: '#ffd166', destroyable: '#e07a5f',
  reactive: '#06d6a0', shrines: '#bdb2ff', soulkeeper: '#7b2cbf',
  quest: '#c77dff', guards: '#778da9', event: '#f4a259', other: '#6c757d',
};
const campKindLabel = key => tbl('campKind', key) || pretty(key);
const actorKindLabel = key => tbl('kind', key) || key;
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
const monsterAttackLabel = key => tbl('monsterAttack', key) || pretty(key);
const locationKindLabel = key => tbl('locationKind', key) || pretty(key);
/* Statistiques de monstre (stats_decoded / stat_curve) — voir
   data/SCHEMA.md "Monster stats" + js/fiches.js::openMonsterFiche(). */
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

/* ── Types de contenants (camps cassables/fouillables/interactifs) ──────
   Le TYPE de prop (tonneau explosif, caisse de maïs, cercueil, champignons,
   pot urbain…) n'est jamais un champ dédié des données : il n'existe que
   comme SOUS-CHAÎNE de la clé de camp (et une partie de ces camps ont même
   leur `kind` canonique posé à "poi" plutôt que destroyable/searchable).
   Détection sur la clé elle-même, traduite en libellé localisé (campType).
   Étendu aux camps `reactive` (interactifs : champignons, bouteilles, pots,
   feuilles, légumes, props urbains) — même principe, mêmes données. */
const CAMP_TYPE_RULES = [
  [/explosive.?barrels?/, 'barrels'],
  [/corn.?sack/, 'sackCorn'],
  [/wheat.?sack/, 'sackWheat'],
  [/container.?corn\b/, 'crateCorn'],
  [/container.?cabbage/, 'crateCabbage'],
  [/container.?carrot/, 'crateCarrot'],
  [/container.?onion/, 'crateOnion'],
  [/container.?eggplant/, 'crateEggplant'],
  [/container.?berries/, 'crateBerries'],
  [/\bsacks?\b/, 'sacks'],
  [/\bbags?\b/, 'sacks'],
  [/tombstones?/, 'tombstones'],
  [/coffins?/, 'coffins'],
  [/searchable.?chest|\bchest\b/, 'chests'],
  [/corpses/, 'corpses'],
  [/mushrooms?/, 'mushrooms'],
  [/urban.?bottles/, 'bottles'],
  [/urban.?pots/, 'pots'],
  [/urban.?wooden/, 'wooden'],
  [/leaf.?trash/, 'leafTrash'],
  [/vegetables/, 'vegetables'],
  [/\burban\b/, 'urban'],
];
const TYPED_CAMP_RE = /destroyable|searchable|reactive/;
/* Nom d'affichage d'un camp (popup, fiche, recherche) : type localisé +
   reste de clé prettifié ("Caisse de maïs — Goldenfield town"). Les camps
   sans type encodé (monstres, minerai…) gardent le pretty(clé) historique. */
function campDisplayName(k) {
  if (!TYPED_CAMP_RE.test(k)) return pretty(k);
  let type = null, rest = k;
  for (const [re, key] of CAMP_TYPE_RULES) {
    const m = re.exec(k);
    if (m) { type = key; rest = k.slice(0, m.index) + k.slice(m.index + m[0].length); break; }
  }
  const typeLabel = type ? tbl('campType', type)
    : campKindLabel(k.includes('searchable') ? 'searchable' : k.includes('reactive') ? 'reactive' : 'destroyable');
  rest = rest.replace(/\b(poi|destroyable|searchable|reactive)\b/g, '').replace(/[-_]+/g, ' ').trim();
  return rest ? `${typeLabel} — ${pretty(rest)}` : typeLabel;
}

/* Type d'un coffre placé (tc_*) et nature d'un objet de quête activable
   (qao) : le pipeline classifie déjà chaque enregistrement sur le vrai champ
   moteur (world_objects.json chest_type/activable_type — tokens neutres
   capitalisés, ex. "Barrel"/"Boxes"/"Radio"/"Evidence") — le site compose
   juste son propre libellé localisé, même principe que campKindLabel/
   monsterAttackLabel ci-dessus. Pas de déduction depuis le nom de prop ici :
   ce champ existe déjà sur r.type (voir data/SCHEMA.md "Chest loot + type" /
   "Activable type"). */
const chestTypeLabel = key => tbl('chestType', key) || pretty(key);
const activableTypeLabel = key => tbl('activableType', key) || pretty(key);

/* Nom d'affichage d'un coffre placé (popup, fiche, recherche) : le NOM brut
   (r.name, ex. "Chest barrel elenian 02 blood") est un identifiant d'ASSET
   D'ART — jamais localisé (pas une entrée Localization/, voir data/SCHEMA.md
   "Chest loot + type") et truffé de bruit interne (set d'art "elenian"/
   "greenville", couleur, variante…) qui ne dit RIEN au joueur. Le vrai
   classifieur joueur, c'est r.type (Barrel/Boxes/Corpse/Cabinet/…, même champ
   que chestTypeLabel ci-dessus) : on l'affiche SEUL, localisé, comme nom — la
   position sur la carte dit déjà où, la fiche dit quoi + butin, inutile de
   répéter le jeton d'art. Repli sur le nom nettoyé (préfixe "Chest "/"Small
   chest " retiré, reste prettifié) seulement pour les ~44 placements sans
   type lié (voir data/SCHEMA.md coverage). */
function chestDisplayName(r) {
  if (r.type) return chestTypeLabel(r.type);
  return pretty((r.name || '').replace(/^(small\s+)?chest\s+/i, ''));
}

/* ── Décor (chests.bin `group==="decor"`|`"legacy_chest"`) ──────────────
   6 familles de décor + le coffre-trésor hérité (legacy) — voir
   DATA_CONTRACT.md §3.1. Ordre d'affichage = ordre de la liste ci-dessous
   (grosso modo décroissant par volume, legacy en dernier — c'est un `group`
   à part, pas une vraie "famille" décor, mais rangé au même endroit dans le
   panneau à la demande du propriétaire). Couleurs volontairement sourdes/
   terreuses (décor = masqué par défaut, jamais le point d'attention visuel
   des 2 vraies couches de coffres ci-dessus). */
const DECOR_FAMILIES = ['barrel', 'boxes', 'furniture', 'misc', 'corpse', 'books', 'legacy'];
const DECOR_HEX = {
  barrel: '#a9744c', boxes: '#c2a25c', furniture: '#8f97a8',
  corpse: '#8a7080', books: '#8d7ab0', misc: '#6c757d', legacy: '#c9a66b',
};
const decorFamilyLabel = key => tbl('decorFamily', key) || pretty(key);

/* Couleur RÉELLE d'un coffre placé (S.data.chest) — camp_chest/legacy_chest/
   décor par famille, jamais un unique hex "coffre" générique (l'ancien
   CATS.chest, retiré — voir DATA_CONTRACT.md §3.1). Utilisée partout où un
   point/tracké/popup/fiche de S.data.chest a besoin d'une couleur honnête. */
function chestHex(r) {
  if (!r) return DECOR_HEX.misc;
  if (r.group === 'camp_chest') return CATS.camp_chest.hex;
  if (r.group === 'legacy_chest') return DECOR_HEX.legacy;
  return DECOR_HEX[r.family] || DECOR_HEX.misc;
}
/* Libellé de catégorie RÉELLE d'un coffre placé (pop-cat/fiche-kind) —
   remplace l'ancien catLabel('chest') générique qui conflait les 3 vraies
   catégories sous un seul "Coffres" (voir DATA_CONTRACT.md §3.1 et §6). */
function chestKindLabel(r) {
  if (!r) return '';
  if (r.group === 'camp_chest') return tr('campChestLabel');
  if (r.group === 'legacy_chest') return tr('legacyChestLabel');
  return `${tr('decorGroupLabel')} — ${decorFamilyLabel(r.family)}`;
}

/* Prettification du `region` d'un coffre fouillable (searchable_chests.bin —
   aucun libellé fourni par les données, voir DATA_CONTRACT.md §4) :
   "ripplecrop-fields" -> "Ripplecrop Fields". Même esprit neutre que
   prettyMapId ci-dessus (noms propres, valable dans toutes les langues). */
function prettyRegion(region) {
  return (region || '').split('-').map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ');
}
/* Couleur neutre pour la fiche « table de butin » générique (openLootTableFiche,
   js/fiches.js) — pas liée à un coffre placé précis (peut être ouverte depuis
   n'importe quel lien de table nommée), donc pas de chestHex() ici. */
const LOOT_TABLE_HEX = '#c9a66b';

/* Table de butin PROBABLE d'un camp cassable/fouillable : le client ne
   fournit PAS le lien prop → table ; on n'associe que les cas où le TYPE
   encodé dans la clé correspond exactement au nom d'une table de butin du
   catalogue (Farmsacks Corn ↔ container-corn…). Jamais de mapping pour les
   clés génériques (searchable-<région>…) — plusieurs tables candidates
   (générique/Hard/Kbg), on n'invente pas. Affiché avec une mention
   « associée par type » honnête (voir openCampFiche). */
const CAMP_LOOT_TABLE_RULES = [
  [/container.?corn\b|corn.?sack/, 'Destroyable Farmsacks Corn'],
  [/container.?cabbage/, 'Destroyable Farmsacks Cabbage'],
  [/container.?carrot/, 'Destroyable Farmsacks Carrot'],
  [/container.?onion/, 'Destroyable Farmsacks Onion'],
  [/container.?eggplant/, 'Destroyable Farmsacks Eggplant'],
  [/container.?berries/, 'Destroyable Farmsacks Berrys'],
  [/wheat.?sack/, 'Destroyable Farmsacks Wheat Seeds'],
  [/coffins?/, 'Destroyable Coffins'],
  [/quest.?corpses/, 'Searchable Corpse Quest'],
  [/corpses/, 'Searchable Corpse'],
  [/searchable.?chest/, 'Searchable Chest'],
];
function campLootTableName(k) {
  if (!TYPED_CAMP_RE.test(k)) return null;
  for (const [re, label] of CAMP_LOOT_TABLE_RULES) if (re.test(k)) return label;
  return null;
}

/* Alias de familles de monstres : le client fragmente quelques tokens de
   famille (« robo » vs « robot »…) — regroupés à l'affichage du bestiaire.
   Étendre ici si d'autres doublons apparaissent dans les données. */
const FAMILY_ALIAS = { robo: 'robot' };
const familyKey = f => FAMILY_ALIAS[f] || f;

export {
  KWALAT_DEFAULTS, TILE_BASE, familyKey,
  CATS, catLabel, CAMP_COLORS, campKindLabel, actorKindLabel,
  MONSTER_HEX, ZONE_HEX, LOCATION_HEX, ABILITY_HEX, EVENT_HEX,
  monsterAttackLabel, locationKindLabel, statLabel, statTierLabel, formulaTermLabel,
  RARITY, rarityLabel, itemKindLabel, professionLabel, harvestMethodLabel,
  weaponTypeLabel, weaponTypeLine, ACTION_META, actionVerb, actionIconSvg,
  prettyMapId, mapName,
  campDisplayName, chestTypeLabel, activableTypeLabel, chestDisplayName, campLootTableName,
  DECOR_FAMILIES, DECOR_HEX, decorFamilyLabel, chestHex, chestKindLabel,
  prettyRegion, LOOT_TABLE_HEX,
};
