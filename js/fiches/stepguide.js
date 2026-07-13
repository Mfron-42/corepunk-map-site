/* Kwalat — fiches/stepguide.js (issu du découpage de fiches.js, vague E'c-S).
   Moteur du guide d'étapes de quête : goalTargetChip (7 kinds de cible),
   StepCard, séries numérotées, badge de position dynamique, désambiguïsation
   des objets de quête. Appelé par fiches/quest.js. */
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
import { $, esc, fmtCoord, fold, iconTag, initials, itemGlyph, npcIconUrl, pretty, capitalize, cleanLabel } from '../utils.js';
import { tr, numberLocale } from '../i18n/index.js';
import { map, toLL, canvasR, clearHighlight, showHighlight } from '../mapview.js';
import { clearLocator } from '../pins.js';
import { unfocus } from '../urlstate.js';
import { monsterKeyFor, npcIndexByName, loreIndexFor, lootTableItems } from '../data.js';
import { campGroupByKey, speciesPoints, familyPoints, monsterFamilies, kindRestPoints } from '../pointsets.js';
import { RARITY_ORDER, rarityGroupFor } from '../rarity.js';
import { isHiddenTest, visibleQuestSlugs } from '../devcontent.js';
import { ref, refDot } from '../mapref.js';

import { disambiguatedItemName, currentGoalZones, npcRef, isRecipeKind, itemEcHex, familyHasMembers, badge } from './core.js';

/* Position d'une cible sans coordonnée fixe — désormais une Badge de l'axe
   PRÉCISION (blueprint §5.2), plus l'ancienne échelle posDynamic/posEstimatedZone/
   posUncatalogued (chacune son propre libellé/idiome). Trois rendus :
   - search_zone (confiance HAUTE ou MOYENNE) → précision `area` + la référence
     [Région(●)] qui DESSINE la zone (viewGoalZone, routé par main.js sur
     data-subrole "goal-zone", key = index dans currentGoalZones). Une zone
     confiance MOYENNE n'est qu'une proximité, jamais une preuve de spawn : sa
     confiance plus faible passe en info-bulle (extra), jamais en libellé plus
     affirmatif que la confiance haute.
     (EXCEPTION Q7 : ces refs goal-zone ne sont PAS des pins locate togglables —
     leur machinerie est single-slot, effacée à la fermeture de fiche, et leur
     clé n'est qu'un index ré-attribué à chaque openQuestFiche ; sidebar.js/
     mapref.js les excluent du jeu de pins via data-subrole="goal-zone".)
   - monstre non référencé par un camp (camps.json ~25 % de couverture) → aucune
     position connue à dessiner ou épingler → précision `unlocated`.
   - repli générique (tout autre acteur sans x/z ni zone) → précision `unlocated`
     (spawn dynamique/serveur, aucun point fixe) ; la région du journal, quand
     elle existe, l'accompagne en rappel muet d'orientation (.pos-region),
     jamais une affirmation dessinable. */
function dynamicPosBadge(t, regionHint) {
  const sz = t && t.search_zone;
  if (sz && (sz.confidence === 'high' || sz.confidence === 'medium')) {
    const zi = currentGoalZones.push(sz) - 1;
    const isEstimate = sz.confidence === 'medium';
    const areaBadge = badge({ axis: 'precision', value: 'area', extra: isEstimate ? tr('stateUnknownTitle') : null });
    return `${areaBadge}${ref({ kind: 'zone', key: zi, subrole: 'goal-zone', drawn: false })}`;
  }
  if (t && t.kind === 'monster' && !t.camp) {
    return badge({ axis: 'precision', value: 'unlocated' });
  }
  const region = regionHint ? ` <span class="pos-region">· ${esc(regionHint)}</span>` : '';
  return `${badge({ axis: 'precision', value: 'unlocated' })}${region}`;
}

/* Map de désambiguïsation de la fiche QUÊTE ouverte (même cycle de vie que
   currentGoalZones : recalculée à chaque openQuestFiche). Portée module pour
   que goalItemMiniChip — appelé au fond de goalStepsSection/goalTargetChip,
   qui ne reçoivent pas q.items — lise la MÊME Map que questItemRow, sans
   passer un paramètre à travers toute la chaîne d'appels. */
let currentQuestItemDisambig = null;
export function setQuestItemDisambig(v) { currentQuestItemDisambig = v; }
/* Map clé d'item -> qi.isQuestItem (même liste q.items, même cycle de vie que
   ci-dessus) : BUG FIX (goal-target card redesign) -- goalTargetItemRow avait
   d'abord dérivé son badge Objet de quête/Item du jeu du `kind` CATALOGUE de
   l'item (it.kind==='quest_item'), une propriété GLOBALE de l'item qui peut
   contredire la section « Quest Items » de CETTE MÊME fiche (ex. Short T2
   Mana Flask est un consommable catalogue normal -- kind!=='quest_item' --
   mais mana_market_resupply le traite comme objet de quête, isQuestItem:true
   dans q.items ; la fiche montrait alors deux badges différents pour LE
   MÊME item sur LA MÊME page). Priorité à ce flag PAR QUÊTE, quand connu --
   jamais deux classifications concurrentes pour un même item. */
let currentQuestItemFlags = null;
export function setQuestItemFlags(v) { currentQuestItemFlags = v; }

/* Ligne d'item de quête : distingue objet de quête (synthétique) et item du
   jeu — pour ces derniers, résumé d'obtention (vendu / craftable / loot)
   tiré du catalogue, et clic -> fiche complète quand la clé est connue.
   Position à 3 niveaux comme actorRows/goalTargetChip (slotpos fix_spec sec
   2.3) : cette section n'affichait jusqu'ici AUCUNE position, avec ou sans
   zone — plusieurs items de quête (ex. digging_deeper's "Stash Alexander")
   n'existent QUE dans ce catalogue, sans slots[] correspondant, donc c'était
   leur seul point d'affichage possible et il ne montrait rien du tout.
   Le nom passe par disambiguatedItemName + currentQuestItemDisambig (la Map
   de la fiche quête ouverte) : suffixe distinctif quand 2+ items partagent
   le même nom affiché — même rendu que les chips d'étape. */
/* Filtre du tiroir « Quest items » (link-veracity audit, quest-items-drawer
   pass) : une entrée de q.items est déjà entièrement rendue ailleurs sur
   CETTE MÊME fiche dès qu'elle est la cible d'un but (goalTargetChip --
   ligne d'identité + relation + position, voir le flag `shownInSteps`,
   import_quests.py) ou une récompense fixe/au choix (questRewardsSection --
   icône + nom + quantité, voir `shownInRewards`) : répéter la ligne ici
   n'ajoute alors aucune information (vérifié sur l'ensemble du jeu de
   données -- une position de cible de but est TOUJOURS identique à celle
   déjà montrée sur sa carte d'étape). La SEULE chose que goalTargetChip/
   questRewardsSection ne rendent JAMAIS est le résumé vendu/craftable/loot
   d'un Item du jeu (questItemRow's soldTag/craftableTag/lootTag juste plus
   bas) -- donc une ligne déjà montrée ailleurs ne mérite sa place ici QUE
   si ce résumé existe réellement pour elle (ex. mana_market_resupply's
   Short T2 Mana Flask : cible de but ET vendu/craftable, donc affiché avec
   ses puces ; imp_brain_hunt's 3 Imp Brain : cibles de but mais objets de
   quête synthétiques sans résumé catalogue, donc masqués -- tout est déjà
   dit sur leurs cartes d'étape). Un item registry-only (ni but ni
   récompense, aucun des deux flags posé) est par construction la SEULE
   surface de la fiche qui le montre : toujours affiché. */
function questItemAddsInfo(qi) {
  if (!qi.shownInSteps && !qi.shownInRewards) return true;
  const cat = qi.key ? S.items[qi.key] : null;
  return !!(cat && !qi.isQuestItem && (cat.soldBy?.length || cat.recipes?.length || cat.drops?.length));
}

function questItemRow(qi, regionHint) {
  const cat = qi.key ? S.items[qi.key] : null;
  const baseName = cleanLabel(cat?.name || qi.label);
  const name = disambiguatedItemName(baseName, qi.key || qi, currentQuestItemDisambig);
  const icon = cat?.icon ? `icons/${cat.icon}` : null;
  const bits = [];
  if (cat && !qi.isQuestItem) {
    if (cat.soldBy?.length) bits.push(tr('soldTag'));
    if (cat.recipes?.length) bits.push(tr('craftableTag'));
    if (cat.drops?.length) bits.push(tr('lootTag'));
  }
  // EntityRef (vague 2) : l'ex-k-chip ([Objet de quête]/[Objet du jeu]) + le
  // lien fr-label deviennent UNE référence `[Quest Item]`/`[Item]`/`[Recipe]`
  // (le tag EST le badge — même vocabulaire que goalTargetItemRow). Teinte
  // itemEcHex (rareté/recette) sauf objet de quête (teinte qao par défaut du
  // kind) ; souligné ⇔ résout au catalogue ; pas de pastille (un item n'a rien
  // à dessiner, le placement éventuel vit dans posBit à côté).
  const kind = qi.isQuestItem ? 'quest_item' : (cat && isRecipeKind(cat) ? 'recipe' : 'item');
  const itemRef = ref({
    kind, key: qi.key || null, label: name,
    hex: cat && kind !== 'quest_item' ? itemEcHex(cat) : null,
    hasFiche: !!cat,
  });
  // craft:true (geo.py's craft-only pre-check, propagated onto this exact
  // item row by import_quests.py -- e.g. no_witnesses_to_glory's "Savory
  // mushroom soup"): this goal is fulfilled by CRAFTING, never a spawn --
  // said explicitly here too (same goalCraftLabel wording as
  // goalTargetChip), and NEVER a position line, even on the off chance
  // x/searchZone ended up attached (they never do in practice, see geo.py's
  // craft pre-check) -- the flag wins regardless, a fabricated position is
  // exactly what this whole pass exists to prevent.
  const craftBit = qi.craft ? `<span class="muted">${esc(tr('goalCraftLabel'))}</span>` : '';
  // givenBy (given_by_giver) : EntityRef (vague 2) — « donné par [PNJ(●)] »
  // (npcRef) remplace l'ex-span .ec-name inline ; nom souligné + pastille
  // locate ⇔ résolu sur la carte active, jamais un lien deviné.
  const givenByBit = qi.givenBy
    ? `<span class="muted">${esc(tr('goalGivenByLabel'))}</span> ${npcRef(qi.givenBy)}`
    : '';
  // EntityRef (E'c-3) : position fixe = pastille LOCATE ratifiée `[Position(●)]`
  // (même forme que goalTargetChip's posRow) — l'ex-bouton carte (gotoBtn) séparé
  // est ABANDONNÉ. L'item lui-même reste sans pastille (mode N, rien à dessiner) ;
  // sa position de placement vit dans cette pastille locate, jamais un bouton
  // « [Item] … at [bouton position] » verbeux. Zone de recherche → dynamicPosBadge.
  const posBit = (!qi.craft && (qi.x != null || qi.searchZone))
    ? (qi.x != null ? ref({ kind: 'position', pos: { x: qi.x, z: qi.z }, label: '' }) : dynamicPosBadge({ search_zone: qi.searchZone }, regionHint))
    : '';
  return `<div class="frow">
    ${iconTag(icon, 'fr-icon', itemGlyph(cat))}
    ${itemRef}
    ${bits.length ? `<span class="muted">${bits.join(' · ')}</span>` : ''}
    ${craftBit}
    ${givenByBit}
    ${posBit}
  </div>`;
}

/* Vignette de la cible d'un objectif — CARTE structurée (design review
   manager, juillet 2026 : l'ancienne pastille inline juxtaposait item et
   monstre sans un mot pour les relier -- "ressemble à un tag mais ça dit
   toujours pas où chopper le brain"). Toutes les branches ci-dessous
   produisent le MÊME vocabulaire visuel empilé en lignes :
     1. ligne d'IDENTITÉ  -- l'item à obtenir (icône + nom cliquable + badge
        objet de quête/jeu), quand il y en a un ;
     2. ligne de RELATION -- énonce EXPLICITEMENT le lien avec la cible
        principale ("dropped by <monstre> (lvl N)", "obtained here" pour un
        objet interactif) -- jamais juste deux entités posées côte à côte ;
     3. ligne de POSITION -- toujours en dernier (bouton carte / badge à 3
        niveaux, voir dynamicPosBadge plus haut), séparée par un liseré.
   `kind: "multiple"` (objectif agrégat) n'a jamais de vignette : c'est un
   en-tête de checklist, ses enfants s'affichent comme des étapes normales
   juste en dessous. */
const ACTIVABLE_GLYPH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M12 2.8 20 7v10l-8 4.2L4 17V7l8-4.2Z"/><circle cx="12" cy="12" r="3"/></svg>`;
/* Ligne d'identité "item" — UNIQUE renderer partagé par les 3 cas où un item
   doit s'afficher dans une vignette de cible : cible directe (kind item),
   item lâché par un monstre (kind monster + item_key), item obtenu via un
   objet interactif (kind object + item_key). Remplace l'ancien
   goalItemMiniChip (même garde jamais-de-lien-deviné : `it` résolu au
   catalogue ou rien). Nom désambiguïsé via la MÊME Map que la section
   « Quest Items » (currentQuestItemDisambig — fix UX : les 3 chips
   d'imp_brain_hunt affichaient toutes « Imp Brain » identique). `approx`
   (target.approx ou target.item_approx selon l'appelant, jamais les deux) --
   pastille ≈ discrète, même traitement que g.approx (compteur ×N) : un fait
   incertain reste affiché, jamais caché ni présenté comme sûr.
   `extraBadge` (HTML déjà construit, ex. badge Activable) : ajouté par
   l'appelant objet quand cette ligne fait aussi office d'identité de
   l'objet interactif lui-même (item_key === key), pour ne pas dupliquer une
   deuxième ligne juste pour ce badge.
   Badge Objet de quête/Item du jeu -- priorité au flag resolver PAR QUÊTE
   (currentQuestItemFlags, même liste q.items que la section « Quest Items »)
   plutôt qu'au `kind` catalogue global de l'item : un item catalogué normal
   (ex. Short T2 Mana Flask, un consommable craftable/vendu) peut être traité
   comme objet de quête PAR CETTE quête précise (mana_market_resupply) sans
   que sa nature catalogue change -- dériver le badge du seul `kind` créait
   une contradiction avec la section Quest Items de la MÊME fiche (deux
   classifications différentes pour le même item sur la même page). `hint`
   (2e priorité) : t.isQuestItem direct, pour la cible `item` elle-même
   quand elle n'apparaît pas dans q.items pour une raison quelconque. Repli
   sur le kind catalogue seulement en dernier recours (item attaché à un
   monstre/objet, jamais listé nulle part ailleurs). */
function goalTargetItemRow(key, fallbackLabel, approx, extraBadge, hint) {
  const it = key ? S.items[key] : null;
  const base = it?.name || fallbackLabel;
  if (!base) return '';
  const name = disambiguatedItemName(base, key, currentQuestItemDisambig);
  const icon = it?.icon ? `icons/${it.icon}` : null;
  const qiFlag = key ? currentQuestItemFlags?.get(key) : undefined;
  const isQuest = qiFlag !== undefined ? qiFlag : (hint !== undefined ? hint : (it ? it.kind === 'quest_item' : null));
  // EntityRef (vague 1) : l'ancien badge k-chip détaché ([Objet de quête]/
  // [Objet du jeu]) DEVIENT le kind-tag du composant — même information, un
  // seul vocabulaire visuel ([Quest Item]/[Item]/[Recipe], §3.2 de la spec).
  // Teinte : itemEcHex (rareté/recette, task #77 — la même que partout) via
  // desc.hex ; libellé souligné ⇔ l'item résout au catalogue (jamais un lien
  // deviné, même garde qu'avant) ; pas de pastille (un item n'a rien à
  // dessiner — le placement éventuel vit dans la ligne position à côté).
  // L'icône du catalogue reste en chrome de ligne (identité visuelle),
  // AVANT la référence.
  const kind = isQuest ? 'quest_item' : (it && isRecipeKind(it) ? 'recipe' : 'item');
  // Teinte (Q6 + retour QA) : la rareté pour un VRAI item (sa teinte
  // précise) ; un item de QUÊTE n'a pas de rareté signifiante → la teinte
  // qao de son kind (défaut du builder quand hex est nul), jamais le gris
  // de rareté commune. « ≈ » (compte approximatif) voyage dans le suffixe
  // méta de la référence — plus jamais un glyphe orphelin à côté du tag.
  const itemRef = ref({
    kind,
    key: key || null,
    label: name,
    hex: it && kind !== 'quest_item' ? itemEcHex(it) : null,
    hasFiche: !!it,
    meta: approx ? '≈' : null,
  });
  return `<div class="goal-target-row goal-target-item">${iconTag(icon, 'goal-target-item-icon', itemGlyph(it))}${itemRef}${extraBadge || ''}</div>`;
}
/* Relation row for a receive_reward mechanism target whose `reward_of`
   (geo.py's _resolve_target_mech) names at least one quest OTHER than the
   one currently open (S.openFiche.id, already set by openQuestFiche before
   this section renders): "obtained by completing <that quest>", linked when
   the quest is resolvable on S.quests, one span per entry joined by "or"
   (several reward_of quests = several equally valid ways to obtain the
   item). Same-quest rewards (reward_of holding ONLY the open quest's own
   slug, e.g. puzzles_of_the_afterlife's saddle) return '' -- the caller's
   own plain given-by/identity wording already covers that case correctly,
   "obtained by completing X" would be circular on X's own fiche.
   Display name: S.quests' own (live, current-locale, guaranteed aligned)
   name first; `reward_of_names` (baked pipeline-side) only as a fallback
   when a slug isn't in S.quests AND the two arrays are the same length --
   geo.py's own `names = [n for n in names if n]` can silently drop entries,
   so a length mismatch means the arrays are NOT positionally aligned and
   the raw slug is shown instead of risking a wrong quest name. */
function rewardOfRelRow(t) {
  const others = (t.reward_of || []).filter(s => s !== S.openFiche?.id);
  if (!others.length) return '';
  const namesAligned = t.reward_of_names && t.reward_of_names.length === t.reward_of.length;
  // EntityRef (vague 1) : chaque quête source est une référence [Quête] Nom —
  // souligné ⇔ la quête résout sur S.quests (jamais un lien deviné).
  const links = others.map(slug => {
    const rq = S.quests.get(slug);
    const idx = t.reward_of.indexOf(slug);
    const qname = rq?.name || (namesAligned ? t.reward_of_names[idx] : slug);
    return ref({ kind: 'quest', key: slug, label: qname, hasFiche: !!rq });
  }).join(esc(tr('orWord')));
  return `<div class="goal-target-row goal-target-row-rel"><span class="goal-target-rel-verb">${esc(tr('goalRewardOfLabel'))}</span>${links}</div>`;
}
/* kill_player mech_target.player_specs codes (e.g. "CHA_S1") are a hero-class
   prefix + spec number. The prefix matches trial_of_worthiness's OWN
   goal_ids byte-for-byte (kill_champions/kill_warmongers/kill_bombers ->
   CHA/ORC/BOM -- see data/quest_graphs.json), so these are the SAME 3
   already-localized weaponClass tokens sourced from Units.xml (see
   config.js weaponClassLabel/fr.js's own comment on that dict) -- never a
   separate/guessed vocabulary. An unrecognized prefix (a hypothetical 4th
   class) falls back to the raw code untouched, never a fabricated name. */
const HERO_SPEC_CLASS = { CHA: 'Champion', BOM: 'Bomber', ORC: 'Warmonger' };
function heroSpecLabel(code) {
  const m = /^([A-Z]+)_S(\d+)$/.exec(code || '');
  if (!m) return code;
  const cls = HERO_SPEC_CLASS[m[1]];
  return cls ? `${weaponClassLabel(cls)} ${m[2]}` : code;
}
function goalTargetChip(t, label, regionHint, isTestQuest) {
  if (!t || t.kind === 'multiple') return '';
  // Cible NPC déjà résolue par nom (voir la branche t.kind === 'npc' plus
  // bas, même npcIndexByName) : quand une position fixe existe déjà (t.x !=
  // null), viser le pin NPC réel plutôt que la position brute de la cible --
  // même correctif qu'actorRows/« Voir le donneur » ci-dessus (voir
  // npc_dual_identity_INVESTIGATION.md §2/§3). N'invente JAMAIS un bouton là
  // où il n'y en avait pas (t.x == null garde `dynamicPosBadge` inchangé).
  // SOURCE DU NOM (audit quêtes 2026-07-11, classe A) : le pipeline expédie
  // le PNJ RÉSOLU dans `t.label` (geo.py _npc_pos_target, help/talk) — la
  // phrase d'objectif (`label`) n'est qu'un repli, plus jamais la source
  // primaire (elle ne matche le catalogue que par accident).
  const npcName = t.kind === 'npc' ? (t.label || label) : null;
  const npcNi = (t.kind === 'npc' && t.x != null && npcName) ? npcIndexByName(npcName) : -1;
  const npcPin = npcNi >= 0 ? S.data.npc[npcNi] : null;
  const posX = npcPin && npcPin.x != null ? npcPin.x : t.x;
  const posZ = npcPin && npcPin.x != null ? npcPin.z : t.z;
  const posCat = npcPin && npcPin.x != null ? 'npc' : null;
  // `t.map` seul (sans x/z) -- cible cross-carte dont geo.py ne connaît QUE la
  // carte, jamais une coordonnée locale (mechanism decode job A, ex. le PNJ de
  // remise d'un receive_reward sur une autre carte) : bascule simple plutôt
  // que le texte générique dynamicPosBadge, qui masquait l'info de carte.
  // EntityRef (vague 1) : l'ancien bouton « Carte » (gotoBtn) et les bascules
  // cross-carte deviennent la référence locate ratifiée `[Position ●] <nom>`
  // (spec §2.4/§3.3) — la pastille EST l'affordance carte, le nom reste un
  // libellé EN CLAIR (une position n'a pas de fiche). `posCat` (couche du
  // marqueur réel déjà rendu, ex. 'npc') voyage en data-subrole, relu par le
  // routeur ref-draw de main.js — même rôle que l'ancien data-cat de gotoBtn.
  // Cible cross-carte sans coordonnée locale : même référence, la pastille
  // bascule de carte (libellé = nom de la carte cible, pos.x nul — le
  // routeur ne vise que des coordonnées finies). Sans rien : dynamicPosBadge
  // inchangé (états d'honnêteté — sa zone de recherche est elle-même devenue
  // une référence [Région ●], voir dynamicPosBadge).
  // Libellé de la [Position ●] : AUCUN (forme nue ratifiée §1.2 — « a bare
  // [Position(●)] is all-bubble ») : l'ancien libellé reprenait la phrase
  // d'objectif affichée juste au-dessus (retour QA ×2 : duplication visible).
  // La bascule cross-carte garde son libellé (le nom de la carte cible est
  // une information, pas une répétition).
  const posRow = `<div class="goal-target-row goal-target-row-pos">${
    t.x != null ? ref({ kind: 'position', pos: { x: posX, z: posZ }, label: '', subrole: posCat || null })
      : t.map ? ref({ kind: 'position', pos: { x: null, z: null, map: t.map }, label: mapName(t.map) })
        : dynamicPosBadge(t, regionHint)
  }</div>`;

  if (t.kind === 'item') {
    // La cible EST l'item lui-même -- rien à relier, juste son identité
    // (nom catalogue en priorité ; repli sur `label`, la phrase d'objectif
    // DÉJÀ nettoyée et affichée juste au-dessus -- JAMAIS t.label brut, dont
    // l'audit montre qu'il porte souvent le verbe ou un libellé de slot
    // interne non nettoyé, ex. "Quest item removed start quest troll head",
    // quand aucun `key` catalogue ne résout) + sa position à 3 niveaux.
    const itemRow = goalTargetItemRow(t.key, label, t.approx, '', t.isQuestItem) || '';
    // receive_reward (mechanism) whose single-quest-caller shape resolved a
    // bare item identity (no quest_refs available -- see geo.py's
    // _resolve_target_mech, the theoretical fallback of that branch): still
    // carries `reward_of`/`reward_of_names` regardless of the target's own
    // kind, so the same cross-quest relation wording as the npc branch below
    // applies here too -- see rewardOfRelRow's own doc.
    const itemRewardRow = rewardOfRelRow(t);
    if (itemRewardRow) {
      return `<div class="goal-target">${itemRow}${itemRewardRow}${posRow}</div>`;
    }
    // craft:true (geo.py's craft-only pre-check, e.g. construction_lesson's
    // "Recipe: Immuno-Stimulating Implant"): items.json proves this item is
    // produced_by_recipes/craftable with ZERO world drop/farm evidence -- the
    // goal is fulfilled by CRAFTING, never a spawn. Relation row says so
    // explicitly (goalCraftLabel); the item chip above is already the link to
    // its fiche/recipe (goalTargetItemRow), no separate link needed here --
    // and NEVER a position line: `posRow` would otherwise fall to
    // dynamicPosBadge's generic "Dynamic position" text for a target that was
    // never a world spawn at all (t.x/t.search_zone are never set alongside
    // craft:true, see  resolve_goal_item's craft pre-check) --
    // exactly the fabricated-position bug this branch fixes.
    if (t.craft) {
      const craftRow = `<div class="goal-target-row goal-target-row-rel"><span class="goal-target-rel-verb">${esc(tr('goalCraftLabel'))}</span></div>`;
      return `<div class="goal-target">${itemRow}${craftRow}</div>`;
    }
    return `<div class="goal-target">${itemRow}${posRow}</div>`;
  }

  if (t.kind === 'object') {
    // Ladder des nœuds acceptés (#81, target.node_types -- 11 buts / ~8
    // quêtes, ex. a_fortune_forewarned ×3, heartwood_gethering) : QUELS types
    // de nœud (S.nodes, gn_*) satisfont ce but de récolte, quand byte-prouvé
    // -- une ligne de chips cliquables (nodeChip, ouvre la fiche nœud),
    // JAMAIS une couche carte (le lien nœud->point n'existe pas côté client,
    // voir data.js S.nodes/js/state.js) : une liste de référence, pas un
    // "va ici". Calculé une fois, ajouté aux DEUX branches ci-dessous (avec
    // ou sans `t.profession`) puisque les 11 buts observés se répartissent
    // sur les deux (voir wave_pipeline_FRONT_TODO.md #3).
    // EntityRef (vague 1) : chaque type de nœud accepté est une référence
    // [Nœud] Nom — souligné ⇔ résolu sur S.nodes (chargement différé : se
    // répare seul au re-rendu, même garde que l'ancien nodeChip) ; jamais de
    // pastille (le lien nœud→point n'existe pas côté client, byte-prouvé).
    const nodesRow = (t.node_types && t.node_types.length)
      ? `<div class="goal-target-row goal-target-row-rel goal-target-row-rel-plain"><span class="goal-target-rel-verb">${esc(tr('goalAcceptedNodesLabel'))}</span></div>
         <div class="goal-target-row"><div class="reward-chips">${t.node_types.map(nk => {
    const n = S.nodes?.[nk];
    return ref({ kind: 'node', key: nk, label: n ? n.name : pretty(nk.replace(/^gn_/, '')), hex: nodeHex(n), hasFiche: !!n });
  }).join('')}</div></div>`
      : '';
    // harvest (mechanism): a resource-gathering node (logging/herbalism/
    // mining -- geo.py's dedicated harvest branch, `target.profession`),
    // never an "Activatable" quest prop -- checked FIRST, before the
    // generic item_key/key join below (a harvest target always carries
    // item_key too, which would otherwise misroute it into the differing/
    // "Activatable" wording meant for actual interactive objects). No
    // position ever ships for these (geo.py never resolves one) -- `posRow`
    // still renders its honest generic "dynamic position" fallback, exactly
    // like any other position-less target.
    if (t.profession) {
      const itemRow = goalTargetItemRow(t.item_key, t.item_label, t.item_approx) || '';
      const profLabel = professionLabel(capitalize(t.profession));
      const relRow = `<div class="goal-target-row goal-target-row-rel"><span class="goal-target-rel-verb">${esc(tr('goalHarvestLabel', profLabel))}</span></div>`;
      return `<div class="goal-target">${itemRow}${relRow}${nodesRow}${posRow}</div>`;
    }
    // t.item_key (quest-guide-feature plan sec 5.2) est une chose DIFFÉRENTE
    // de t.key ci-dessus : t.key est la clé catalogue PROPRE de cet objet
    // (rare), t.item_key est l'item de quête concret que cette interaction
    // a produit -- `differing` distingue les deux mécaniques réelles :
    //   - item_key === key (ou pas de key du tout) : l'objet EST l'item
    //     (ramassage au sol) -- une seule ligne d'identité suffit.
    //   - item_key !== key : interagir avec un AUTRE objet (levier, machine,
    //     baril...) produit cet item -- ligne de relation explicite en plus.
    const differing = !!(t.item_key && t.item_key !== t.key);
    const primaryKey = differing ? t.item_key : (t.item_key || t.key);
    const approxForItem = t.item_key ? t.item_approx : t.approx;
    // (Retour QA 2026-07-11, 23 occurrences : le tag [Objet] SANS libellé ni
    // pastille lisait comme un élément cassé — l'ancien badge « Activable »
    // ne se traduit plus en badge muet : le kind qao voyage désormais avec
    // la PASTILLE DE POSITION de l'objet — voir objPosRow au retour de la
    // branche — une seule référence qui dit à la fois « objet » et « ici ».)
    // Cibles OBJET et l'arbre de gauche (#82 chunk (d)) : PAS de nœud à
    // cocher aujourd'hui — l'analogue des sous-lignes espèce pour les objets
    // de quête est le découpage qao PAR TYPE du chunk (c), pas encore livré.
    // TODO(chunk (c)) : quand les sous-lignes `qao.<type>` existeront, le
    // clic d'un chip objet devra cocher la ligne de SON type (placements
    // joints par clé t.key — 25 cibles mesurées — sinon par nom replié
    // t.label — 45), même clic-double-effet que les chips monstre.
    let itemRow = goalTargetItemRow(primaryKey, t.item_label, approxForItem);
    let relRow = '';
    // Quand la référence objet porte ELLE-MÊME la pastille de position
    // (locate), la ligne position séparée disparaît — une seule affordance
    // carte par cible, jamais deux boutons pour le même point (loi
    // d'uniformisation, même logique que hasLayerResolution côté monstre).
    let posInRef = false;
    if (itemRow && differing) {
      // collect_from_object (mechanism): the ONLY mech that ever attaches an
      // item_key distinct from the object's own key (use_object never does,
      // see geo.py's _resolve_target_mech) -- named "container" wording +
      // the actual container's own label when known (t.label, e.g. "Old
      // crate"), never a fabricated container name when it isn't (falls
      // back to the previous generic "obtained here" phrasing untouched).
      // EntityRef (vague 1) : le conteneur nommé est une référence [Objet]
      // — avec pastille locate quand son placement est byte-joint (t.x).
      if (t.label) {
        const canPing = t.x != null;
        posInRef = canPing;
        relRow = `<div class="goal-target-row goal-target-row-rel">
            <span class="goal-target-rel-verb">${esc(tr('goalFoundInLabel'))}</span>
            ${ref({ kind: 'qao', mode: canPing ? 'L' : 'N', pos: canPing ? { x: t.x, z: t.z } : undefined, label: cleanLabel(t.label) })}
          </div>`;
      } else {
        // Conteneur anonyme : le verbe honnête seul (« obtenu ici ») — plus
        // jamais un badge de kind sans nom à côté (retour QA).
        relRow = `<div class="goal-target-row goal-target-row-rel"><span class="goal-target-rel-verb">${esc(tr('goalObtainedHereLabel'))}</span></div>`;
      }
    }
    // Repli quand RIEN ne résout au catalogue (ni item_key ni key, ~14 % des
    // objets sur l'ensemble des quêtes) : jamais une vignette vide -- réutilise
    // `label` (la phrase d'objectif déjà affichée au-dessus), la seule donnée
    // honnête qu'on ait pour nommer cet objet. EntityRef (vague 1) : l'objet
    // activable sans clé catalogue (ex. « soplo », l'aéronef d'Inspect the
    // aircraft) est une référence [Objet] — pastille locate quand son
    // placement qao est byte-joint (le retour « activable n'est plus
    // cliquable »), tag+libellé nus sinon (honnête : rien à viser).
    if (!itemRow) {
      const canPing = t.x != null;
      posInRef = canPing;
      itemRow = `<div class="goal-target-row goal-target-item">
        <span class="goal-target-icon">${ACTIVABLE_GLYPH}</span>
        ${ref({ kind: 'qao', mode: canPing ? 'L' : 'N', pos: canPing ? { x: t.x, z: t.z } : undefined, label: label || '' })}
      </div>`;
    }
    // Position d'un OBJET : la référence porte le kind honnête [Objet ●]
    // (locate) au lieu de la [Position ●] générique — le placement EST
    // l'objet activable (l'information de l'ex-badge, portée par la pastille).
    const objPosRow = posInRef ? '' : (t.x != null
      ? `<div class="goal-target-row goal-target-row-pos">${ref({ kind: 'qao', mode: 'L', pos: { x: posX, z: posZ }, label: '' })}</div>`
      : posRow);
    return `<div class="goal-target">${itemRow}${relRow}${nodesRow}${objPosRow}</div>`;
  }

  if (t.kind === 'monster') {
    // BUG FIX (popup/bubble layout cleanup pass): `label` (the objective
    // sentence above this chip, e.g. "Collect Imp Executioner") and `t.label`
    // (the target's own actor/catalog label, e.g. "Imp executioner") are TWO
    // DIFFERENT data fields that very often name the exact same entity with
    // DIFFERENT casing -- shown verbatim, the chip below reads as a typo'd
    // duplicate of the sentence above rather than the deliberate "click here
    // to open its fiche" reference it actually is. A fold-compare (same
    // general helper used for search/dedup elsewhere in this file) detects
    // when they're the SAME entity and reuses the sentence's already-cleaned
    // casing for both -- purely a display choice, `mk` resolution below
    // already matches by folded name too, so this never changes which
    // monster fiche the link opens. Genuinely different labels (rare) are
    // left untouched -- never inventing or destroying real information.
    const nameLbl = (t.label && label && fold(t.label) === fold(label)) ? label : (t.label || label || '');
    // Précision de cible (#87, échelle de précision COORDINATION.md "jamais
    // plus précis que prouvable") : `t.bound_units` (byte-proven, geo.py's
    // trigger-slot decode -- see wave_pipeline_FRONT_TODO.md #1) est
    // désormais la SEULE source de niveau/portée affichée ici. L'ancien
    // `levelHint` (campMobRow?.lvl, la plage COMPLÈTE de l'espèce dans CE
    // camp -- ex. 2-20 pour les Imps de Windreach Woods) fabriquait un "niv 2"
    // ou "niv 20" ponctuel pour un trigger qui accepte en réalité toute la
    // plage -- supprimé PURE ET SIMPLEMENT (jamais réutilisé), avec le
    // repli catalogue `S.monsters[mk].level` qui le remplaçait au premier
    // rendu (avant que S.campDetails n'arrive) -- les deux étaient la MÊME
    // fabrication de précision. Anchors : imp_brain_hunt Executioner "niv
    // 5-20" (jamais "niv 2"), corruption_clean-up "niv 15" (un vrai niveau
    // unique, prouvé malgré la portée famille), shell_we_eat = AUCUN niveau
    // (abstract -- le trigger accepte n'importe quel niveau de Tortue).
    const bu = t.bound_units;
    // Portée (bu.scope) : "species" (ou bu absent/abstract, jamais de scope
    // dans ce cas -- voir bound_units doc) -> une créature précise, nommée +
    // fiche liée (résolution historique, inchangée). "family"/"families" ->
    // le trigger accepte tout un GROUPE (ex. tous les Imps) -- jamais nommer
    // une seule espèce à sa place ni lier sa fiche (l'échelle de précision
    // l'interdit) : le libellé redevient la famille (pretty(), ou la
    // jointure des familles quand `scope==="families"`), sans lien.
    const isFamilyScope = !!(bu && bu.scope && bu.scope !== 'species');
    const famLabel = isFamilyScope ? (bu.families || []).map(pretty).join(' / ') : null;
    const lvl = !bu || bu.abstract ? null
      : bu.levels?.length === 1 ? tr('levelAbbrev', bu.levels[0])
        : bu.levels?.length > 1 ? tr('levelRangeAbbrev', bu.levels[0], bu.levels[bu.levels.length - 1])
          : null;
    // BUG FIX (deferred-render-race blast-radius audit, follow-up task 3):
    // was `t.key || null` -- t.key is the RAW canonical monster key geo.py's
    // resolver matched, not necessarily the (name,level)-grouped
    // REPRESENTATIVE key monsters_site() keeps as S.monsters' own dict key
    // (the exact class of bug actorRows had before its sec-5.3 fix -- see
    // monsterKeyFor's own docstring in data.js). Using it unchecked either
    // links to a monster page that doesn't exist under that key (a dead
    // click, PERMANENTLY, not just during S.monsters' deferred-load window)
    // or renders a link before S.monsters has even loaded. Same guarded
    // pattern as actorRows: unresolved -> plain text, never a guessed link;
    // self-heals once loadDeferred() completes and the quest fiche re-renders.
    // Portée famille -> jamais résolu/lié (pas de `mk`, voir isFamilyScope
    // ci-dessus) ; `levelHint` supprimé du 3ᵉ argument (voir plus haut).
    const mk = isFamilyScope ? null : monsterKeyFor(t.key || null, nameLbl, null);
    // Portée FAMILLE (#82 chunk (e), modèle « l'arbre EST le bestiaire ») :
    // le nom de CHAQUE famille est désormais un LIEN vers sa fiche FAMILLE
    // (data-act="fiche-family", délégué main.js — openFamilyFiche) : le
    // trigger accepte tout le groupe, on ouvre donc la PAGE de ce groupe,
    // jamais une espèce nommée à sa place (échelle de précision, jamais plus
    // précis que prouvable). L'ACTIVATION carte (cocher les lignes famille de
    // l'arbre) reste une affordance SÉPARÉE (familyLayerActivateBtn / spawnRow
    // ci-dessous, même modèle « Afficher · N pts » que les espèces) — les
    // deux gestes que l'utilisateur veut distincts : le lien focuse la fiche,
    // la bulle allume la carte. Jetons post-alias familyKey, dédupliqués
    // (robo/robot fusionnés). scope "families" (plusieurs familles) -> un lien
    // par famille, joints par « / ».
    const famTokens = isFamilyScope
      ? [...new Set((bu.families || []).map(familyKey).filter(Boolean))]
      : [];
    // EntityRef (vague 1) — le mock canonique de la spec (§1.2) : la cible
    // monstre devient `[Espèce ●] Imp Executioner  lvl 5–20 · 926 pts`.
    //   - la PASTILLE remplace l'ancien bouton « Afficher X · N pts »
    //     (monsterSpawnHighlightBtn/familyLayerActivateBtn, kill-list §7.2) :
    //     même action (case espèce/famille de l'arbre, ref-draw → main.js),
    //     état lu du même S.monsp/S.monfam, compte au survol + suffixe méta ;
    //     RÈGLE OWNER 2026-07-12 : présente ⇔ points RÉELS sur la carte active
    //     (`drawable: !!spPts` / `!!res`) — 0 point ici → AUCUNE pastille (titre
    //     coloré + nom souligné seuls, le ⊘ est abandonné : une pastille qui ne
    //     bascule rien est inutile) ;
    //   - le NOM souligné remplace l'ancien span data-act (fiche monstre/
    //     famille) — souligné ⇔ la fiche résout vraiment (mk/membres, jamais
    //     un lien deviné, mêmes gardes qu'avant) ;
    //   - niveau/chance de drop passent dans le suffixe méta (ratifié Q3 :
    //     jamais un compte littéral DANS le tag).
    // Clé DOUBLE espèce (fiche = mk, couche = spId) : la référence porte mk
    // (data-key) ; le routeur ref-draw de main.js résout mk → S.monsters[mk]
    // .species pour la couche — la résolution vit chez le routeur, jamais
    // re-dérivée par surface (même discipline que le résolveur de points).
    const spId = mk ? S.monsters[mk]?.species : null;
    const spPts = spId ? speciesPoints(spId) : null;
    // kill_collect (mechanism, also plain `kill` when a quest-loot drop is
    // byte-attached -- see geo.py's drops_quest_loot join on BOTH mechs):
    // `target.drop_chance` (0-100, byte-exact from SetQuestLootDirect, NOT
    // the generic loot-table weight share dropRateHtml renders elsewhere) --
    // shown as a plain percentage, or "Guaranteed" at the 100% direct-grant
    // value QUEST_FORMAT.md sec 9b documents. Only meaningful next to a real
    // attached item (t.item_key/item_label) -- never on a bare kill.
    const chanceText = t.drop_chance == null ? null
      : t.drop_chance >= 100 ? tr('guaranteedLabel') : tr('goalDropChanceLabel', t.drop_chance);
    const chanceInMeta = (t.item_key || t.item_label) ? chanceText : null;
    const metaParts = n => [lvl, chanceInMeta,
      n != null ? tr('entityPtsN', n.toLocaleString(numberLocale())) : null].filter(Boolean).join(' · ');
    // Teinte PRÉCISE de l'entité (ratifié Q6, spec §9) : la couleur du tag/de
    // la pastille = la couleur des points EXACTS que la pastille allume = la
    // pastille de SA ligne d'arbre — jamais la teinte générique du kind.
    // Famille : familyLayerHex (hash déterministe de la clé), LA MÊME couleur
    // que sa ligne d'arbre et sa fiche, quel que soit le contexte de tri.
    const goalFamilyHex = familyLayerHex;
    const famRef = f => {
      const res = familyPoints(f);
      return ref({
        kind: 'family', key: f, label: pretty(f), hex: goalFamilyHex(f),
        hasFiche: familyHasMembers(f),
        drawable: !!res, count: res ? res.nPts : 0,
        drawn: !!S.monfam[f]?.on,
        meta: metaParts(res ? res.nPts : null),
      });
    };
    const nameSpan = isFamilyScope
      ? (famTokens.length
        ? famTokens.map(famRef).join(' / ')
        : (famLabel ? ref({ kind: 'family', label: famLabel, hex: MONSTER_HEX, hasFiche: false, drawable: false }) : ''))
      : mk
        ? ref({
          // Teinte Q6 : l'espèce RÉSOLUE prend la couleur de SA couche
          // (speciesLayerHex — la même que sa pastille d'arbre sidebar.js:325
          // et ses points dessinés) ; MONSTER_HEX seulement quand l'id
          // d'espèce ne résout pas (repli entité-non-résolue, jamais plus).
          kind: 'species', key: mk, label: nameLbl,
          hex: spId ? speciesLayerHex(spId) : MONSTER_HEX,
          hasFiche: true,
          drawable: !!spPts, count: spPts ? spPts.nPts : 0,
          drawn: !!(spId && S.monsp[spId]?.on),
          meta: metaParts(spPts ? spPts.nPts : null),
        })
        : (nameLbl ? ref({ kind: 'species', label: nameLbl, hex: MONSTER_HEX, hasFiche: false, drawable: false, meta: metaParts(null) }) : '');
    const itemRow = goalTargetItemRow(t.item_key, t.item_label, t.item_approx);
    // Relation EXPLICITE seulement quand un item de quête est réellement
    // rattaché (le point central de cette passe) : "dropped by <monstre>".
    // Sans item (kill pur, ex. killig_creatures_field_robot), rien à relier
    // -- la ligne redevient juste la référence, sans verbe inventé (niveau/
    // chance/points vivent dans son suffixe méta, plus jamais des spans
    // détachés).
    const relRow = itemRow
      ? `<div class="goal-target-row goal-target-row-rel">${nameSpan ? `<span class="goal-target-rel-verb">${esc(tr('goalDroppedByLabel'))}</span>` : ''}${nameSpan}</div>`
      : (nameSpan ? `<div class="goal-target-row goal-target-row-rel goal-target-row-rel-plain">${nameSpan}</div>` : '');
    // (Vague 1 EntityRef : l'ancienne ligne « Afficher X · N pts » —
    // spawnBtn/familyBtn/spawnRow — est SUPPRIMÉE : la pastille du tag
    // ci-dessus est la même case espèce/famille de l'arbre, persistante
    // jusqu'au décochage, kill-list §7.2 de la spec.)
    // SCOPE ADDITION (2026-07-11, retour utilisateur : « quand je cherche tel
    // monstre, il me montre toujours des points au pif — il devrait activer
    // un de ces points [filtres] dont on vient de parler ») : `posRow`
    // (calculé en tête de fonction, PARTAGÉ par tous les kinds) peut afficher
    // soit le bouton « Zone estimée » (dynamicPosBadge, search_zone confiance
    // haute/moyenne — dessine un cercle deviné, jamais les vrais spawns),
    // soit le texte nu « Position dynamique »/« Position non cataloguée » —
    // deux affordances qui n'ont plus lieu d'être une fois qu'un point-set
    // RÉEL existe déjà pour cette cible : le nom (nameSpan ci-dessus,
    // data-act="fiche-monster"/"family-layer") ET spawnRow (quand l'espèce
    // est résolue) routent DÉJÀ vers la même couche points de l'arbre
    // (species-layer, #82 chunk (d) — famille : activateFamilyLayers,
    // main.js). Sur une cible monstre RÉSOLUE, `posRow` disparaît — la seule
    // affordance qui reste est la vraie (points, jamais un cercle deviné).
    // CORRIGÉ (audit quêtes 2026-07-11, classe D : 25 buts sans PLUS AUCUNE
    // affordance carte, dont 9 avec une vraie search_zone perdue) : la
    // suppression supposait « espèce résolue ⇒ point-set existe » — FAUX
    // pour une espèce à 0 camp joint sur la carte active (mobs de donjon/
    // Île-prison) : monsterSpawnHighlightBtn rend '' et la case n'allume
    // rien — les barreaux 3/4 de l'échelle étaient perdus. La condition
    // devient « la couche a RÉELLEMENT des points » : un BOUTON d'activation
    // non vide existe (spawnBtn pour l'espèce, familyBtn pour la famille —
    // #82 chunk (e)). ÉTENDU aux familles : une famille SANS camp joint sur la
    // carte active (ex. ghoul/hyena/swarm sur Kwalat) n'a plus de familyBtn,
    // donc posRow REVIT (goto/cross-map/zone estimée, barreau 4 honnête) au
    // lieu d'être supprimé « parce que c'est une famille » comme avant — même
    // correctif que pour les espèces 0-camp (le lien de nom vers la fiche
    // famille reste, lui, toujours présent). Objets/monde/dynamique (autres
    // branches) gardent `posRow` inchangé — seule cette branche monstre est
    // concernée. (Vague 1 : « bouton d'activation non vide » devient « la
    // couche a réellement des points » lu au résolveur unique — spPts pour
    // l'espèce, familyPoints par jeton pour la famille — strictement la même
    // condition que rendaient spawnBtn/familyBtn.)
    const hasLayerResolution = !!spPts
      || (isFamilyScope && famTokens.some(f => !!familyPoints(f)));
    // « Où » TYPÉ explicitement (blueprint §2.2.4/§2.3 : « chaque localisation
    // non-exacte est typée, jamais un faux pin »). Un monstre n'a jamais de pin
    // fixe (spawn dynamique) — sa position se résout À TRAVERS sa couche de
    // spawn (espèce/famille) : quand cette couche a RÉELLEMENT des points sur la
    // carte active, on remplace l'ancien vide par un Badge PRÉCISION `via-chain`
    // (« localiser via la couche liée — bascule la pastille de la réf ci-dessus »),
    // le vocabulaire d'honnêteté fermé (blueprint §5) plutôt que le silence : le
    // joueur sait alors COMMENT trouver la cible (allumer ses spawns), pas juste
    // qu'un nom existe. Couche sans point (espèce errante/donjon, ex.
    // a_quiet_disposal Scolopendra) -> `posRow` garde son Badge `unlocated`
    // honnête (spawn serveur, rien à dessiner ici). Le badge via-chain vit dans
    // sa PROPRE ligne `-where` (jamais `-pos` : la position reste « aucun pin
    // fixe » — l'affordance carte EST la pastille du tag, pas une seconde ligne).
    const monsterPosRow = hasLayerResolution
      ? `<div class="goal-target-row goal-target-row-where">${badge({ axis: 'precision', value: 'via-chain' })}</div>`
      : posRow;
    return `<div class="goal-target">${itemRow}${relRow}${monsterPosRow}</div>`;
  }

  if (t.kind === 'npc') {
    // Quest-granted item (geo.py's given_by_giver, e.g. eight_legged_freaks'
    // "Time of Death" handed over in Ophelia Voss's own dialog, already
    // listed in this quest's own reward table): item chip first (identity,
    // clickable to its fiche) + an explicit "given by <giver>" relation row
    // -- never a spawn zone, this was never a world spawn (see geo.py
    // resolve_goal_item's craft/given_by_giver pre-check). `t.label` here IS
    // the giver's real name (unlike the plain npc branch below, whose only
    // reliable name source is the objective sentence `label` -- see its own
    // comment) -- resolved through the same npcIndexByName lookup so the
    // giver's name is clickable to their fiche when known on the active map.
    // `posRow` (shared, computed above) still renders correctly here: t.x/z
    // are the giver's own position when known (see geo.py's `given["x"]`),
    // never a fabricated one.
    if (t.given_by_giver) {
      const itemRow = goalTargetItemRow(t.item_key, t.item_label, t.item_approx) || '';
      // receive_reward (mechanism) whose reward_of names a quest OTHER than
      // the one currently open: "obtained by completing <that quest>" wins
      // over the plain given-by wording below -- t.label here is merely
      // THAT quest's own turn-in NPC (geo.py's _resolve_target_mech
      // receive_reward branch, e.g. eight_legged_freaks' Ophelia Voss
      // handing over thistlebrooks_terrifying_task's "Time of Death"),
      // saying "given by" would misattribute the grant to the OPEN quest.
      // Same-quest rewards (reward_of holding only the open quest's own
      // slug, e.g. puzzles_of_the_afterlife's saddle) return '' here and
      // fall through to the unchanged given-by wording -- this quest really
      // is the source. See rewardOfRelRow's own doc.
      const rewardRow = rewardOfRelRow(t);
      if (rewardRow) {
        return `<div class="goal-target">${itemRow}${rewardRow}${posRow}</div>`;
      }
      // EntityRef (vague 1) : le donneur est une référence [PNJ ●] — nom
      // souligné ⇔ le PNJ résout sur la carte active (jamais un lien
      // deviné), pastille locate ⇔ une position est connue (elle remplace la
      // ligne « Carte » séparée : une seule affordance carte par cible).
      const ni = t.label ? npcIndexByName(t.label) : -1;
      const canPing = t.x != null;
      const giverRef = t.label ? ref({
        kind: 'npc', key: ni >= 0 ? `npc:${ni}` : null, label: t.label,
        hasFiche: ni >= 0, mode: 'L', drawable: canPing,
        pos: canPing ? { x: posX, z: posZ } : undefined, subrole: posCat || null,
      }) : '';
      const relRow = giverRef
        ? `<div class="goal-target-row goal-target-row-rel"><span class="goal-target-rel-verb">${esc(tr('goalGivenByLabel'))}</span>${giverRef}</div>` : '';
      return `<div class="goal-target">${itemRow}${relRow}${canPing ? '' : posRow}</div>`;
    }
    // Nom cliquable (mirrors actorRows' own npcIndexByName lookup) —
    // CORRIGÉ (audit quêtes 2026-07-11, classe A : 88 buts « talk/help »
    // rendus SANS lien) : l'ancien commentaire « les cibles npc ne portent
    // jamais leur propre t.label » était PÉRIMÉ — la passe mechanism-decode
    // du pipeline expédie le PNJ résolu dans `t.label` (+ `t.key: "npc:*"`
    // sur 62 des 88) ; résoudre/afficher la PHRASE d'objectif (« Help
    // Jennifer Davyna ») ne matchait le catalogue que quand la phrase se
    // trouvait être exactement le nom (204/292), et dupliquait la phrase en
    // pseudo-chip de nom sous elle-même. Source : t.label d'abord (le NOM),
    // phrase en repli (`npcName`, calculé en tête de fonction avec le join
    // de pin) ; repli texte simple si le PNJ n'est pas sur la carte active
    // (jamais un lien deviné).
    // EntityRef (vague 1) : `[PNJ ●] Nom` — nom souligné ⇔ le PNJ résout sur
    // la carte active (mêmes gardes/sources qu'avant, voir le commentaire
    // ci-dessus), pastille locate ⇔ une position existe (pin réel corrigé en
    // tête de fonction — posX/posZ/posCat) ; elle absorbe la ligne « Carte »
    // séparée. Sans position : tag+nom sans pastille, et posRow garde ses
    // replis honnêtes (bascule cross-carte / position dynamique).
    const ni = npcName ? npcIndexByName(npcName) : -1;
    const canPing = t.x != null;
    const npcRef = npcName ? ref({
      kind: 'npc', key: ni >= 0 ? `npc:${ni}` : null, label: cleanLabel(npcName),
      hasFiche: ni >= 0, mode: 'L', drawable: canPing,
      pos: canPing ? { x: posX, z: posZ } : undefined, subrole: posCat || null,
    }) : '';
    const nameRow = npcRef ? `<div class="goal-target-row goal-target-row-rel">${npcRef}</div>` : '';
    return `<div class="goal-target">${nameRow}${canPing ? '' : posRow}</div>`;
  }

  if (t.kind === 'dynamic') {
    return `<div class="goal-target">${posRow}</div>`;
  }

  if (t.kind === 'ability') {
    // use_ability (mechanism): mech_target.label is a raw slot/trigger name
    // (e.g. "use_ability", "quest ability death_raven"), not always a real
    // in-game ability display name -- shown as-is (cleaned), never guessed
    // against S.abilities by name (no reliable fold-match source exists for
    // these labels, unlike npc/monster names -- a wrong ability link would
    // be worse than a plain unlinked chip). No position: casting an ability
    // has no location concept (unlike a harvest node or a zone), so `posRow`
    // is deliberately NOT rendered here -- same "never a fabricated position
    // for a non-world target" rule as the craft branch above.
    // cleanLabel porte désormais la garde générique anti-jeton moteur
    // (underscores → espaces, audit classe E : « use_ability »,
    // « activate_qao_… ») ; première lettre capitalisée pour le chip.
    const ab = t.key ? S.abilities?.[t.key] : null;
    // Placeholder de capacité MOTEUR (audit classe E) : « use_ability »,
    // « quest ability <slug> », « activate_… » — un jeton technique, pas une
    // capacité NOMMÉE. Non résolu au catalogue ET libellé BRUT à underscore
    // (= identifiant moteur, même hypothèse vérifiée que cleanLabel utils.js) :
    // le chip « [Capacité] Use ability » n'ajoute RIEN à côté du texte
    // d'objectif (« Combine the ingredients », « Repair The Destroyer ») et se
    // lit comme une référence cassée — on le SUPPRIME (l'action EST tout
    // l'objectif, aucune cible à montrer, aucune position non plus). Une
    // capacité vraiment nommée (résolue, ou libellé propre sans underscore)
    // garde son chip.
    const genericAbility = !ab && /_/.test(String(t.label || ''));
    const abLabel = t.label ? cleanLabel(t.label).replace(/^./, c => c.toUpperCase()) : null;
    if (!abLabel || genericAbility) return '';
    // EntityRef (vague 1, GAP §7.1 de la spec) : `[Capacité] Nom` — le
    // k-chip détaché devient le kind-tag. Souligné (ref-open →
    // openAbilityFiche, routé main.js) UNIQUEMENT quand la CLÉ de la cible
    // résout sur S.abilities — jamais un match par nom (la garde d'origine
    // de cette branche : un lien de capacité faux serait pire que pas de
    // lien). Jamais de pastille : lancer une capacité n'a pas de lieu.
    return `<div class="goal-target">
      <div class="goal-target-row goal-target-item">
        <span class="goal-target-icon">${ACTIVABLE_GLYPH}</span>
        ${ref({ kind: 'ability', key: ab ? t.key : null, label: ab?.name || abLabel, hasFiche: !!ab })}
      </div>
    </div>`;
  }

  if (t.kind === 'zone') {
    // enter_zone/exit_zone (mechanism): a named area (mech_target.label),
    // sometimes with a real slot position (geo.py's enter_zone branch) --
    // `posRow` (shared, computed above) already renders it (gotoBtn) or the
    // honest generic dynamic-position fallback when it isn't known.
    const zLabel = t.label ? cleanLabel(t.label) : null;
    // Couleur d'entité (task #77) : ZONE_HEX, même teinte que la ligne "Zones
    // (régions)" du panneau/de la recherche -- ce n'est ni un PNJ ni un
    // monstre, une zone nommée est une entité de carte à part entière.
    // Ping cliquable (retour utilisateur « activable n'est plus cliquable ») :
    // quand le pipeline a joint le centroïde du polygone de zone décodé (t.x,
    // geo.py zone_geo — trigger enter_zone sans slot placé), le NOM devient un
    // goto vers ce centre au lieu d'un libellé mort. La zone reste le bon
    // barreau d'échelle (une AIRE, pas un objet placé) : le clic centre la
    // carte dessus, et la fiche offre en plus « Voir la zone » (contour
    // complet, S.zonesQuest). Sans centroïde (zone sans géométrie décodée :
    // « Around wreck », honnête trou), reste un libellé simple.
    // EntityRef (vague 1) : `[Région ●] Nom` — pastille locate ⇔ le centroïde
    // du polygone décodé est joint (t.x, geo.py zone_geo) ; elle absorbe la
    // ligne « Carte » séparée (une seule affordance carte). Nom JAMAIS
    // souligné tant que la fiche région n'existe pas (vague R — honnêteté
    // §3.5 : pas de lien vers une page qui n'existe pas). Sans centroïde
    // (« Around wreck », trou honnête) : tag+nom nus, posRow garde ses replis.
    // Q7 (pins locate toggle) : plus de `drawn:false` figé — l'état de la
    // pastille est relu en direct de S.locates (mapref.js liveDrawn, mode L),
    // comme toute autre pastille locate (le centroïde devient un pin
    // persistant, listé dans le bandeau-légende, retirable).
    const canPing = t.x != null;
    const zoneRef = zLabel ? ref({
      kind: 'zone', label: zLabel, drawable: canPing,
      pos: canPing ? { x: t.x, z: t.z } : undefined,
    }) : '';
    const nameRow = zoneRef ? `<div class="goal-target-row goal-target-row-rel">${zoneRef}</div>` : '';
    return `<div class="goal-target">${nameRow}${canPing ? '' : posRow}</div>`;
  }

  if (t.kind === 'players') {
    // kill_player (mechanism): mech_target.player_specs codes (e.g.
    // "CHA_S1") -- see heroSpecLabel's own doc for the class-name join. No
    // position: a PvP kill objective has no single world location.
    const specs = (t.player_specs || []).map(heroSpecLabel);
    if (!specs.length) return '';
    // EntityRef (vague 1) : `[Joueurs] <specs>` — tag + libellé en clair
    // (§3.3 : ni carte — un kill PvP n'a pas de lieu — ni fiche : aucune
    // page de classe/héros n'existe, no-page justifié). Le verbe vit déjà
    // dans la phrase d'objectif au-dessus, plus jamais une phrase dupliquée.
    return `<div class="goal-target"><div class="goal-target-row goal-target-row-rel goal-target-row-rel-plain">${ref({ kind: 'players', label: specs.join(', ') })}</div></div>`;
  }

  // Honest last-resort fallback (batch-wiring pass, mechanism decode job A):
  // an unrecognized/future target kind (or one of the 4 byte-parse-gap
  // residuals, mechanism: null -- QUEST_FORMAT.md sec 12) never renders
  // silently blank under a normal-looking objective sentence -- shows
  // whatever name the resolver actually produced, never a fabricated
  // relation/position beyond what's genuinely on `t`.
  const customName = t.label ? cleanLabel(t.label) : null;
  if (!customName) return '';
  // Pastille "unknown" (unknown_states_DESIGN.md #15, task #67) : ce résidu
  // couvre 4 buts au total -- 3 sur test_craft_trigger (quête de test) + 1
  // sur zero_to_hero_ish (contenu joueur RÉEL, opcode moteur non décodé --
  // ni "dev", ni "dynamique", juste non déterminable depuis les données
  // extraites, voir QUEST_FORMAT.md §12). Jamais pour le contenu de test (déjà
  // couvert par isTest ailleurs) -- pas de double pastille sur le même but.
  const unknownChip = isTestQuest ? '' : ` ${badge({ axis: 'provenance', value: 'absent' })}`;
  return `<div class="goal-target"><div class="goal-target-row goal-target-item"><span class="goal-target-item-label">${esc(customName)}</span>${unknownChip}</div></div>`;
}

/* Détecte si la cible d'un objectif fait partie d'une SÉRIE NUMÉROTÉE (ex.
   "Broken pipe 1/2/3" — fixing_leaking_pipes' étape "repair" ×3) : le graphe
   de quête ne résout qu'UNE position par objectif même quand celui-ci porte
   sur toute une série, alors que tous les membres positionnés existent déjà
   dans q.actors (même libellé de base + numéro). Sinon (pas une série)
   renvoie null et l'appelant garde le rendu à cible unique habituel.
   DEUX sources de motif, essayées dans l'ordre (correctif de classe
   2026-07-11, quête ancre silencing_the_rumors « Collect Posters ×5 ») :
   1. le libellé de l'OBJECTIF (g.label — l'historique : « Broken pipe 3 ») ;
   2. le libellé de la CIBLE/du conteneur (g.target.label — « Posters_01 »).
   La cause profonde de la troncature : un objectif « Collect Posters » ne se
   termine PAS par un numéro, mais son conteneur résolu (« Posters_01 ») si —
   et ses frères numérotés (Posters_01..05) sont déjà dans q.actors avec
   leurs positions. Ne matcher que g.label rendait alors UN SEUL conteneur
   (branche differing de goalTargetChip) au lieu de la série complète —
   19 objectifs / 19 quêtes dans ce cas au balayage du catalogue (contre 2
   déjà couverts par g.label). Garde inchangée : ≥2 acteurs du MÊME type de
   slot partageant le préfixe — jamais un membre fabriqué : uniquement les
   acteurs RÉELLEMENT présents dans les données (si le jeu n'en place que 3
   sur ×5 — digging_at_the_truth — la série honnête en liste 3). */
function seriesActorsFor(q, g) {
  const kind = g.target?.kind;
  if (!kind) return null;
  for (const raw of [g.label, g.target?.label]) {
    const m = /^(.*?)[ _]*(\d+)$/.exec((raw || '').trim());
    const base = m && m[1].trim();
    if (!base) continue;
    const rx = new RegExp('^' + base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[ _]*(\\d+)$', 'i');
    const members = [];
    for (const a of q.actors || []) {
      if (a.kind !== kind) continue;
      const am = rx.exec((a.label || '').trim());
      if (am) members.push({ ...a, _n: parseInt(am[1], 10) });
    }
    if (members.length >= 2) return members.sort((a, b) => a._n - b._n);
  }
  return null;
}
/* Rendu d'une série de cibles positionnées : une vignette PAR MEMBRE (avec
   son propre libellé numéroté) — la phrase de l'objectif ne cite qu'un seul
   représentant, mais tous les membres doivent rester trouvables sur la
   carte, pas seulement celui-là. Variante COMPACTE de la carte de cible
   (.goal-target-compact, voir style.css) : plusieurs membres coexistent côte
   à côte, une carte empilée par membre prendrait trop de place -- garde donc
   le même vocabulaire visuel (fond/liseré/rayon) mais en pastille horizontale
   comme avant cette passe, jamais la mise en page verticale des vignettes à
   cible unique. */
function seriesTargetChips(members, kind, regionHint) {
  // EntityRef (vague 1) : chaque membre est UNE référence — le kind-tag
  // absorbe l'ancien badge « Activable », la pastille locate absorbe le
  // bouton « Carte » (membre positionné) ; membre sans position : tag+nom
  // nus + repli dynamicPosBadge inchangé. Membres = acteurs de slot, jamais
  // des entités catalogue → pas de fiche (jamais un lien deviné).
  const refKind = kind === 'object' ? 'qao'
    : kind === 'monster' ? 'species'
      : kind === 'npc' ? 'npc' : 'position';
  const icon = kind === 'object' ? `<span class="goal-target-icon">${ACTIVABLE_GLYPH}</span>` : '';
  // `key` = l'identité de SLOT du membre (a.label, unique par acteur) : deux
  // membres placés au MÊME point (posters 02/03, coordonnées identiques dans
  // la donnée) gardent chacun LEUR pin — cliquer l'un n'allume plus l'autre
  // (retour user 2026-07-11 soir ; locateRefKey préfère data-key aux coords).
  return `<div class="goal-target-series">${members.map(a => `
    <div class="goal-target goal-target-compact">
      ${icon}
      ${ref({ kind: refKind, mode: a.x != null ? 'L' : 'N', hasFiche: false, key: a.label || null, pos: a.x != null ? { x: a.x, z: a.z } : undefined, label: cleanLabel(a.label) })}
      ${a.x != null ? '' : dynamicPosBadge({ search_zone: a.searchZone }, regionHint)}
    </div>`).join('')}</div>`;
}
/* Vignette COMPLÈTE d'une cible en série (correctif de classe 2026-07-11,
   même passe que seriesActorsFor ci-dessus) : seriesTargetChips REMPLAÇAIT
   toute la vignette — un objectif collect_from_object en série perdait alors
   sa ligne d'IDENTITÉ d'item (« [Objet de quête] Poster ») et son verbe de
   relation (« found in ») que la branche differing de goalTargetChip rend
   pour le conteneur unique. Ici : quand la cible porte un item rattaché
   (t.item_key/item_label — 17 des 21 séries du catalogue), la série rend le
   MÊME vocabulaire empilé que la vignette à cible unique — 1. identité de
   l'item (goalTargetItemRow, mêmes gardes jamais-de-lien-deviné), 2. verbe
   de relation (« found in » pour un objet, « dropped by » pour un éventuel
   monstre — parité exacte avec les branches de goalTargetChip), 3. TOUS les
   membres placés en références locate compactes. Sans item rattaché
   (fixing_leaking_pipes, shattered_memory, the_light_of_dagaron) : les
   puces seules, strictement comme avant. */
function seriesTargetHtml(t, members, regionHint) {
  const chips = seriesTargetChips(members, t.kind, regionHint);
  const differing = !!(t.item_key && t.item_key !== t.key);
  const primaryKey = differing ? t.item_key : (t.item_key || t.key);
  const itemRow = (t.item_key || t.item_label)
    ? goalTargetItemRow(primaryKey, t.item_label, t.item_approx) : '';
  if (!itemRow) return chips;
  const verb = t.kind === 'monster' ? tr('goalDroppedByLabel') : tr('goalFoundInLabel');
  const relRow = `<div class="goal-target-row goal-target-row-rel"><span class="goal-target-rel-verb">${esc(verb)}</span></div>`;
  return `<div class="goal-target goal-target-serieshost">${itemRow}${relRow}${chips}</div>`;
}

/* Étapes numérotées, machine-exactes (goals[]). Repli sur la liste texte
   « objectives » historique pour les quêtes sans graphe de goals décodé
   (dialogue seul). `regionHint` (région du journal, si connue) sert de
   repli textuel pour les cibles sans aucune position ni zone exploitable
   (cas « position dynamique » sans plus de précision). Le compteur "×N" est
   TOUJOURS affiché, y compris ×1 (jamais implicite — un objectif sans
   compteur visible se lisait comme une quantité manquante, pas "une fois"). */
function goalStepsSection(q) {
  if (!q.goals?.length) return '';
  const regionHint = q.regions?.length ? q.regions[0] : null;
  const steps = q.goals.map((g, i) => {
    const meta = ACTION_META[g.action] || ACTION_META.custom;
    const verb = actionVerb(g.action);
    const n = g.count || 1;
    const count = `<span class="goal-count">×${n}${g.approx ? '<sup>≈</sup>' : ''}</span>`;
    const aggregate = g.target?.kind === 'multiple' ? ' goal-step-aggregate' : '';
    const series = n > 1 ? seriesActorsFor(q, g) : null;
    const targetHtml = series
      ? seriesTargetHtml(g.target, series, regionHint)
      : goalTargetChip(g.target, cleanLabel(g.label), regionHint, q.isTest);
    // `verb_included` : le libellé du but contient DÉJÀ son verbe ("Bring
    // book to King Head") — ne pas re-préfixer, sinon verbe doublé
    // ("Livrer Bring book to…"). Le pictogramme d'action reste.
    const text = g.verb_included
      ? `${esc(cleanLabel(g.label))}${count}`
      : `<b>${esc(verb)}</b> ${esc(cleanLabel(g.label))}${count}`;
    return `<li class="goal-step${aggregate}">
      <span class="goal-num">${i + 1}</span>
      <span class="goal-ico" title="${esc(verb)}">${actionIconSvg(meta.ico)}</span>
      <span class="goal-body">
        <span class="goal-text">${text}</span>
        ${targetHtml}
      </span>
    </li>`;
  }).join('');
  return `<div class="fiche-section"><h3>${esc(tr('objectivesN', q.goals.length))}</h3><ol class="goal-steps">${steps}</ol></div>`;
}

export { goalStepsSection, questItemRow, questItemAddsInfo, dynamicPosBadge };
