/* Kwalat — fiches/quest.js (issu du découpage de fiches.js, vague E'c-S).
   Coquille de la fiche de quête (openQuestFiche) + fiche de dialogue-bark,
   récompenses, journal, badge d'explication, fil d'enquête et zones de quête. */
import { S } from '../state.js';
import {
  CATS, CAMP_COLORS, RARITY, MONSTER_HEX, ABILITY_HEX, RECIPE_HEX, ZONE_HEX, nodeHex,
  campKindLabel, monsterAttackLabel, locationKindLabel,
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

import { ficheHeader, openFiche, setFicheHash, npcRef, questRef, qtyItemChip, qtyChipList, disambiguateQuestItems, resetGoalZones, clearGoalZone, badge } from './core.js';
import { goalStepsSection, questItemRow, questItemAddsInfo, dynamicPosBadge, setQuestItemDisambig, setQuestItemFlags } from './stepguide.js';

/* Avatar HeroAvatars -- traite le leaf générique `Dwarf_dark` comme "pas
   d'icône" (fiche-header identity pass) : dans les données expédiées, ce
   catch-all est assigné à quasi tout PNJ jamais doté d'un portrait bespoke de
   sélection de héros (57 % des donneurs de quête aujourd'hui) -- l'afficher
   tel quel montre le MÊME nain à capuche verte pour des dizaines de
   personnages sans rapport (ex. Police-Tron 5000, un robot). Un appelant qui
   reçoit `null` ici retombe sur une identité plus spécifique (portrait de pin
   NPC réel) ou, à défaut, le glyphe d'initiales habituel -- jamais ce
   placeholder trompeur. */
function heroAvatar(iconPath) {
  if (!iconPath || !iconPath.includes('HeroAvatars')) return null;
  const leaf = iconPath.split('/').pop();
  if (leaf === 'Dwarf_dark') return null;
  return 'icons/hero_avatars/' + encodeURIComponent(leaf) + '.png';
}
/* Avatar partagé openQuestFiche/openDialogueFiche (les deux dérivent leur
   identité du même donneur) -- ordre de préférence (
   §1) : 1) le portrait de PIN réel du donneur (icons/npc_map/<leaf>.png,
   EXACTEMENT la même source qu'openNpcFiche/les lignes vendeur -- l'identité
   est "empruntée" à ce PNJ, jamais son propre HeroAvatars) quand ce donneur
   est résolu sur la carte active (`giverPin`, déjà calculé par l'appelant) ;
   2) repli HeroAvatars (heroAvatar ci-dessus, déjà gardé contre Dwarf_dark) ;
   3) repli glyphe d'initiales (iconTag, universel, posé par l'appelant). */
function questGiverAvatar(q, giverPin) {
  if (giverPin?.icon) return npcIconUrl(giverPin.icon);
  return heroAvatar(q.giverIcon || q.actors?.find(a => a.kind === 'npc')?.icon);
}

/* Encart « Comment faire » : texte généré déterministe (donneur, étapes,
   source d'obtention, position de l'activable), déjà dans la langue active
   (un jeu de gabarits par langue — voir  "i18n"). Aucune
   génération côté client. */
function hintBox(q) {
  if (!q.hint) return '';
  return `<div class="hint-box">
    <span class="hint-box-icon" aria-hidden="true">💡</span>
    <div class="hint-box-body"><div class="hint-box-title">${esc(tr('howToTitle'))}</div><p>${esc(cleanLabel(q.hint))}</p></div>
  </div>`;
}

/* Récompenses de quête : distingue TOUJOURS DONNÉ (xp/xp d'arme/or + items à
   choice_group null,  restructure ça en
   {fixed, choices, xp?, gold?, weapon_xp?}) des groupes de CHOIX mutuellement
   exclusifs (un par choice_group réel, index affiché = ordre du tableau,
   déjà trié par le pipeline). Jamais une liste à plat comme avant : un
   joueur doit voir sans ambiguïté ce qui est garanti et ce qui s'exclut
   (ex. allergic_to_duty : 6 items toujours donnés + plusieurs groupes
   "choisissez 1 parmi N"). qtyItemChip/qtyChipList (section recette
   ci-dessus) gèrent déjà la forme {key,count} — réutilisées telles quelles
   ici.
   weapon_xp = XP de maîtrise d'arme par quête (QuestRewardsTable ints[3],
   ex-extra_raw : identifié par l'observation joueur "≈20% de l'XP" + la
   distribution du champ, ratio 0.167-0.267 sur 283/322 quêtes — voir
   build_dataset.parse_rewards_table). Le pipeline n'expédie la clé que
   quand la valeur est non nulle, donc pas de ligne "0 XP d'arme".
   BUG FIX (regression, was `q.rewards?.length ? ... : ''`): q.rewards is the
   structured object {fixed, choices, xp?, gold?}, not an array — `.length`
   on that object is always undefined, so the old code produced the empty
   string on EVERY quest fiche, silently dropping the rewards section
   entirely (no crash, just a permanently-missing section). */
function questRewardsSection(q) {
  const r = q.rewards;
  if (!r) return '';
  const hasFixed = r.fixed?.length || r.xp != null || r.gold != null || r.weapon_xp != null;
  const hasChoices = r.choices?.length;
  if (!hasFixed && !hasChoices) return '';
  const xpGold = [r.xp != null ? tr('xpAbbrev', r.xp) : null,
                  r.weapon_xp != null ? tr('weaponXpAbbrev', r.weapon_xp) : null,
                  r.gold != null ? tr('goldAbbrev', r.gold) : null]
    .filter(Boolean).join(' · ');
  const fixedHtml = hasFixed ? `
    <h4 class="fiche-sub">${esc(tr('alwaysGrantedTitle'))}</h4>
    ${xpGold ? `<div class="pop-coords">${esc(xpGold)}</div>` : ''}
    ${r.fixed?.length ? `<div class="reward-chips">${qtyChipList(r.fixed)}</div>` : ''}` : '';
  const choicesHtml = (r.choices || []).map((group, i) => `
    <h4 class="fiche-sub">${esc(tr('choiceGroupTitle', i + 1))}</h4>
    <div class="reward-chips">${group.map((e, gi) =>
      (gi > 0 ? `<span class="choice-or">${esc(tr('orWord'))}</span>` : '') + qtyItemChip(e)).join('')}</div>`).join('');
  return `<div class="fiche-section"><h3>${esc(tr('rewardsTitle'))}</h3>${fixedHtml}${choicesHtml}</div>`;
}

/* Badge de complétude AU NIVEAU PAGE (blueprint §2.3) — la SEULE source est
   `q.followGrade.grade` ∈ FULL / PARTIAL / HOLED (l'audit de suivabilité, jamais
   recalculé ici : la raison d'un PARTIAL — décodage partiel, cible famille,
   compteur non encodé — n'est pas reproductible côté front, donc on FAIT
   CONFIANCE au verdict serveur plutôt que d'inventer un compte contradictoire).
   Le grade s'exprime dans le vocabulaire d'honnêteté FERMÉ (Badge, blueprint
   §5 : « toute affirmation d'honnêteté est un Badge ») sur l'axe PRÉCISION —
   c'est littéralement l'agrégat de la précision « où » des buts ci-dessous :
     • FULL   → precision `pinned`   (chaque but est localisable exactement / via
                sa couche) — ton accent PLEIN, l'info-bulle « coordonnées exactes ».
     • PARTIAL→ precision `area`     (au moins un but n'est qu'approximatif) —
                ton accent DOUX, « approximatif : une région, pas un point ».
     • HOLED  → precision `unlocated`(au moins un but n'a AUCUNE cible localisable :
                boss scripté, faune serveur, famille non placée) — ton muet
                pointillé, « aucune position client ». Jamais un faux pin.
   Les buts dialogue/greeting/no_objective n'ont pas de grade de suivabilité
   (DIALOGUE/GREETING/NOOBJ) → aucun badge ici (leur mise en page propre s'en
   charge, voir l'aiguillage quest_class dans openQuestFiche). Une prose de grade
   dédiée (« Entièrement suivable / Partiellement localisé / Comporte des trous »)
   affinerait la lisibilité — signalée à la vague i18n, pas inventée ici. */
const GRADE_PRECISION = { FULL: 'pinned', PARTIAL: 'area', HOLED: 'unlocated' };
function questCompletenessBadge(q) {
  const value = GRADE_PRECISION[q.followGrade?.grade];
  if (!value) return '';
  return `<div class="quest-grade-badge">${badge({ axis: 'precision', value })}</div>`;
}

/* ── Navigation de série de quêtes (blueprint §2.4) ──────────────────────────
   `sequence[]` + `sequenceSource` DEVRAIENT porter la CHAÎNE de quêtes (les
   slugs ORDONNÉS de la série dont cette quête fait partie) : prev/suivant +
   position « 2 / 4 » dans l'en-tête, chaque maillon une réf quête (q=<slug>).
   FINDING E′c-4b — dans les bins EXPÉDIÉS aujourd'hui, `sequence` porte en
   réalité les goalId ORDONNÉS de la quête ELLE-MÊME (l'ordre de ses étapes
   internes), PAS une chaîne de quêtes sœurs : 781/790 entrées == un goalId de
   la quête courante, et 0 quête n'inclut son propre slug NI aucun autre slug de
   quête dans sa `sequence`. Le lecteur est donc écrit CONTRE le contrat et
   GARDÉ : il ne rend une nav de série QUE lorsque la `sequence` décrit vraiment
   une chaîne — c.-à-d. inclut le slug de la quête COURANTE (requis pour calculer
   « position dans la série » ET les voisins prev/suivant). Aujourd'hui cette
   garde ne passe JAMAIS → aucune nav rendue (absence honnête, jamais une fausse
   série bâtie sur des goalId ; même patron dormant que dispositionChip/
   PriceBandRow, inséré SANS octet quand vide → fiche quête inchangée). Elle
   s'allumera d'elle-même dès que le pipeline expédiera `sequence` = slugs de la
   chaîne (mismatch signalé à la vague pipeline). `sequenceSource` : "graph" =
   vraie chaîne du graphe de quêtes (fort) ; "listed" = regroupement par ordre
   de déclaration (plus faible → marqueur discret). Un maillon dont le slug n'est
   pas dans S.quests → dégradé honnête (texte nu, jamais un lien mort). */
function questSeriesNav(q, slug) {
  const seq = q.sequence;
  if (!Array.isArray(seq) || seq.length < 2) return '';
  const idx = seq.indexOf(slug);
  if (idx < 0) return '';   // quête absente de sa propre séquence → pas une vraie série (goalId aujourd'hui)
  const weak = q.sequenceSource === 'listed';
  const linkChip = (s, dirKey) => {
    const qq = S.quests.get(s);
    const label = qq ? qq.name : pretty(s);
    const inner = qq
      ? questRef(s)
      : `<span class="fr-label">${esc(label)}</span>`;
    return `<span class="series-nav-step series-nav-${dirKey}"><span class="series-nav-dir">${esc(tr(dirKey === 'prev' ? 'seriesPrevLabel' : 'seriesNextLabel'))}</span>${inner}</span>`;
  };
  const prev = idx > 0 ? linkChip(seq[idx - 1], 'prev') : '';
  const next = idx < seq.length - 1 ? linkChip(seq[idx + 1], 'next') : '';
  const posTip = weak ? tr('seriesListedTip') : tr('seriesGraphTip');
  const pos = `<span class="series-nav-pos${weak ? ' series-nav-pos--weak' : ''}" title="${esc(posTip)}">${esc(tr('seriesPositionLabel', idx + 1, seq.length))}</span>`;
  return `<div class="series-nav">${pos}${prev}${next}</div>`;
}

/* Journal : texte de présentation de la quête (ambiance), sorti du tiroir
   replié -- rendu tel quel juste sous le titre (revue de layout, juillet
   2026) comme un paragraphe stylé ordinaire, sans étiquette de section (même
   parti pris que la description d'objet, voir descHtml plus bas : un texte
   d'ambiance n'a pas besoin d'un <h3> qui le nomme). Repli en clamp CSS pur
   (case à cocher invisible + sélecteur ~ général, aucune mesure DOM/JS)
   seulement passé un certain seuil de longueur -- ~14 quêtes sur 336 dans le
   jeu de données actuel (max observé 313 caractères) ; les 322 autres
   s'affichent toujours en entier, jamais tronquées à la lettre près. */
const JOURNAL_CLAMP_THRESHOLD = 220;
function questJournalSection(q) {
  if (!q.journal) return '';
  if (q.journal.length <= JOURNAL_CLAMP_THRESHOLD) {
    return `<div class="fiche-section fiche-journal-section"><p class="fiche-journal">${esc(q.journal)}</p></div>`;
  }
  return `<div class="fiche-section fiche-journal-section">
    <input type="checkbox" id="journal-expand-cb" class="journal-expand-cb">
    <p class="fiche-journal fiche-journal-clamp">${esc(q.journal)}</p>
    <label for="journal-expand-cb" class="journal-expand-toggle">
      <span class="journal-expand-more">${esc(tr('journalShowMoreBtn'))}</span>
      <span class="journal-expand-less">${esc(tr('journalShowLessBtn'))}</span>
    </label>
  </div>`;
}

/* Fiche d'un dialogue-bark PNJ (q.isDialogue) : les répliques d'ambiance du
   personnage (q.dialogs.npc/player), sous un en-tête explicite « Dialogue PNJ
   (pas une quête) » — jamais la mise en page d'une quête vide. Toujours
   ouvrable (contenu dev activé / lien profond direct) ; garde le hash de
   quête (setFicheHash('quest', slug)) pour que le partage d'URL rouvre
   exactement cette fiche.
   Variante `interaction` : même mécanique légère pour une entrée VISIBLE qui
   n'est pas un bark mais un service par dialogue sans objectifs (questStatus
   'noObjectives' avec de vraies répliques, ex. le ferry payant de Captain
   Rob) — en-tête honnête dédié « Interaction — pas une quête à objectifs »
   au lieu du libellé bark, décidé par les données (questStatus), jamais par
   une liste de slugs codée en dur. */
function openDialogueFiche(q, slug, { interaction = false } = {}) {
  // Le PNJ qui « donne » ce bark : même résolution que le donneur d'une
  // vraie quête (npcIndexByName) -- réutilisée pour l'avatar (portrait de PIN
  // réel en priorité,  §1) ET pour le chip cliquable
  // vers sa vraie fiche, au lieu de l'ancien <span class="pop-coords link">
  // (zéro chip, juste une phrase "given by X" linkifiée).
  const ni = q.giver ? npcIndexByName(q.giver) : -1;
  const giverPin = ni >= 0 ? S.data.npc[ni] : null;
  const avatar = questGiverAvatar(q, giverPin);
  const lines = [...(q.dialogs?.npc || []), ...(q.dialogs?.player || [])];
  const linesHtml = lines.length
    ? lines.map(l => `<p class="dlg dlg-npc">${esc(l)}</p>`).join('')
    : `<p class="hint">${esc(tr('noResults'))}</p>`;
  // EN-TÊTE (consolidation owner 2026-07-12, même règle que la fiche quête) :
  // le donneur du bark est épinglé par SA réf `[PNJ(●)] <donneur>` (locate:true,
  // pin primaire), pas par une pastille de titre redondante — le titre reste
  // coloré, sans pastille (le bark n'a pas de position propre distincte du PNJ).
  const giverRow = q.giver ? `<div class="reward-chips quest-giver-row">${npcRef(q.giver, { ni, locate: true })}</div>` : '';
  openFiche(`
    ${ficheHeader({
      avatar: iconTag(avatar, 'fiche-avatar', initials(q.giver || q.name)),
      name: q.name, hex: entityColor('quest', q.name),
      sub: esc(tr(interaction ? 'interactionFicheKind' : 'dialogueFicheKind')), below: giverRow,
    })}
    <div class="fiche-section">
      <h3>${esc(tr(interaction ? 'interactionHeading' : 'dialogueHeading'))}</h3>
      <p class="hint">${esc(tr(interaction ? 'interactionNote' : 'dialogueNote'))}</p>
      <div class="fiche-dialogs-flat">${linesHtml}</div>
    </div>`);
  setFicheHash('quest', slug);
}

function openQuestFiche(slug) {
  const q = S.quests.get(slug);
  if (!q) return;
  S.openFiche = { kind: 'quest', id: slug };
  resetGoalZones();   // ré-indexé à chaque ouverture (voir goalTargetChip/dynamicPosBadge)
  clearGoalZone();
  // Dialogue-bark "quest" (hello_*/info_* NPC greeting graph — isDialogue,
  // 0 goals/0 rewards/no real items, see ()).
  // Masqué de la recherche/carte par défaut (isHiddenTest), mais ENCORE
  // ouvrable (contenu dev activé, OU lien profond q=<slug> direct) — dans ce
  // cas on ne rend PAS une fiche de quête vide (l'ancien comportement : titre
  // "Hello Blitz Hyperstorm" + zéro objectif/récompense/item), mais une fiche
  // clairement étiquetée « Dialogue PNJ (pas une quête) » avec ses répliques.
  // Aiguillage de mise en page par quest_class (blueprint §2.1) : greeting/
  // dialogue -> fiche LÉGÈRE (openDialogueFiche : donneur localisé + barks, PAS
  // de timeline d'objectifs — dé-cluttering demandé) ; objective -> timeline
  // complète d'étapes ci-dessous ; no_objective -> chip système/brouillon
  // honnête (questStatusHtml plus bas). `q.isDialogue` (drapeau hérité du
  // pipeline) reste un repli : il coïncide aujourd'hui EXACTEMENT avec
  // greeting|dialogue|28 no_objective-dialogue — quest_class est désormais la
  // source primaire, jamais un re-calcul front.
  if (q.questClass === 'greeting' || q.questClass === 'dialogue' || q.isDialogue) { openDialogueFiche(q, slug); return; }
  // Interaction de service (vague quêtes-dialogues) : entrée VISIBLE sans
  // objectifs décodés (questStatus 'noObjectives') mais avec de VRAIES
  // répliques joueur/PNJ (ex. le ferry payant) — la mise en page quête
  // n'aurait rien à montrer d'autre que ce dialogue ; on ouvre la même fiche
  // légère que les barks, typée honnêtement « Interaction — pas une quête à
  // objectifs ». Purement piloté par les données (statut + présence de
  // répliques), aucun slug codé en dur.
  if (q.questStatus === 'noObjectives' && (q.dialogs?.npc?.length || q.dialogs?.player?.length)) {
    openDialogueFiche(q, slug, { interaction: true });
    return;
  }
  // Recalculée AVANT la construction des sections (items + étapes) : la même
  // Map sert questItemRow ET goalTargetItemRow — voir currentQuestItemDisambig.
  setQuestItemDisambig(q.items?.length ? disambiguateQuestItems(q.items) : null);
  setQuestItemFlags(q.items?.length ? new Map(q.items.map(qi => [qi.key, qi.isQuestItem])) : null);
  const regionHint = q.regions?.length ? q.regions[0] : null;
  // Donneur résolu UNE SEULE FOIS (fiche-header identity pass) -- alimente
  // l'avatar (portrait de PIN réel en priorité, questGiverAvatar ci-dessus),
  // le chip "donné par" de l'en-tête, ET le bouton « Voir le donneur » plus
  // bas (giverX/giverZ/giverCat) : plus besoin de re-résoudre npcIndexByName
  // une seconde fois en fin de fonction.
  const giverNi = q.giver ? npcIndexByName(q.giver) : -1;
  const giverPin = giverNi >= 0 ? S.data.npc[giverNi] : null;
  const avatar = questGiverAvatar(q, giverPin);
  // RATIFIÉ 2026-07-13 (spec §9 Q9) : le placement d'un acteur vit SUR SON
  // CHIP — `[Kind(●)] Nom`, pastille locate mode L (pin Q7 togglable ; acteur
  // cross-carte : pos.map + nom de carte en méta, la pastille bascule de
  // carte — mêmes idiomes que goalTargetChip). L'ex-`[Position(●)]` adjacent
  // est MORT (la forme que l'invariant _verify_no_bare_position.mjs interdit).
  // Sans coordonnée : le badge d'honnêteté dynamicPosBadge reste la seule
  // cellule de position (zone de recherche / non localisé — jamais perdre le
  // « où »). Acteur ITEM (classe A) : sa clé catalogue voyage jusqu'à
  // dynamicPosBadge — un item commun à canaux d'obtention réels (vendu/
  // craftable/loot) y troque la zone de proximité devinée contre ses puces.
  const actorZoneBadge = a =>
    dynamicPosBadge({ search_zone: a.searchZone }, regionHint, a.kind === 'item' ? a.key || null : null);
  const actorRows = (q.actors || []).map(a => {
    const onOtherMap = a.map && a.map !== S.map;
    // Acteur PNJ résolu par nom (npcIndexByName) : quand le personnage est connu
    // de la carte active, on vise directement SON pin (map_marker.pos, jamais la
    // position brute a.x/a.z qui peut différer de quelques unités -- cas Ophelia
    // Voss,  §2/§3) : npcRef locate résout SON
    // pin lui-même.
    const ni = (a.kind === 'npc' && !onOtherMap) ? npcIndexByName(a.label) : -1;
    const npcPin = ni >= 0 ? S.data.npc[ni] : null;
    const aLabel = cleanLabel(a.label);   // affichage nettoyé, résolutions sur la donnée brute
    // EntityRef (E'c-3, complété 2026-07-13 §9 Q9) : l'identité ET la position
    // se FONDENT en une seule `[Kind(●)]` pour TOUS les kinds — le placement du
    // slot (a.x/a.z, cross-carte inclus via a.map) vit sur le chip de l'acteur,
    // plus jamais un `[Position(●)]` adjacent. `slotPos` : le pin locate du
    // slot ; `slotMeta` : le nom de la carte cible en méta (info conservée de
    // l'ex-libellé `[Position] <carte>`).
    const slotPos = a.x != null ? (onOtherMap ? { x: a.x, z: a.z, map: a.map } : { x: a.x, z: a.z }) : null;
    const slotMeta = slotPos && onOtherMap ? `· ${mapName(a.map)}` : null;
    let actorRef, posCell = '';
    if (a.kind === 'npc' && ni >= 0 && npcPin && npcPin.x != null) {
      actorRef = npcRef(aLabel, { ni });                       // [PNJ(●)] pin fondu dedans
    } else if (a.kind === 'npc' && onOtherMap && a.x != null) {
      // PNJ cross-carte : la pastille bascule de carte PUIS épingle (main.js
      // ref-draw mode L) ; pas de fiche PNJ atteignable ici (autre carte).
      actorRef = ref({ kind: 'npc', label: aLabel, mode: 'L', pos: slotPos, hasFiche: false, meta: slotMeta });
    } else if (a.kind === 'npc') {
      // PNJ non joint à un pin par son identité : quand le SLOT a une
      // coordonnée, le chip la porte (`[PNJ(●)]`, pin locate au slot — jamais
      // perdre la position fixe d'un acteur non résolu) ; nom souligné ⇔ le
      // PNJ résout quand même au catalogue. Sans coordonnée : identité nue +
      // badge d'honnêteté.
      actorRef = slotPos
        ? ref({ kind: 'npc', key: ni >= 0 ? `npc:${ni}` : null, label: aLabel, hasFiche: ni >= 0, mode: 'L', pos: slotPos })
        : npcRef(aLabel, { ni: onOtherMap ? -1 : ni, locate: false });
      posCell = slotPos ? '' : actorZoneBadge(a);
    } else if (a.kind === 'mob') {
      // Un slot MOB ne porte JAMAIS de coordonnée (mesuré 129/129 acteurs mob
      // sans x — spawn dynamique) : identité seule + badge d'honnêteté, aucun
      // pin à fondre. (Si la donnée driftait un jour vers mob+x, le router
      // ref-draw `species` route la COUCHE, pas un pin — décision à prendre à
      // ce moment-là, jamais un pin silencieusement cassé.)
      const mk = monsterKeyFor(null, a.label);
      const spId = mk ? S.monsters[mk]?.species : null;
      actorRef = ref({ kind: 'species', key: mk || null, label: aLabel, hex: spId ? speciesLayerHex(spId) : MONSTER_HEX, hasFiche: !!mk, drawable: false });
      posCell = actorZoneBadge(a);
    } else if (a.kind === 'object') {
      // Objet placé : `[Qao(●)]` — le pin du slot sur le chip (clé absente →
      // locateRefKey par coordonnées : deux slots distincts = deux pins).
      actorRef = ref({ kind: 'qao', mode: slotPos ? 'L' : 'N', pos: slotPos || undefined, label: aLabel, meta: slotMeta });
      posCell = slotPos ? '' : actorZoneBadge(a);
    } else {
      // Kind d'acteur générique (item/zone/ability/poi/inconnu) : le tag nomme
      // le kind, nom en clair (aucun lien deviné) — et le placement du slot,
      // quand il existe, vit sur le chip comme partout (mode L ; un item à
      // pos est promu par mapref.js de toute façon). Teinte neutre explicite.
      actorRef = ref({
        kind: a.kind, label: aLabel, hex: '#8d99ae', hasFiche: false,
        drawable: slotPos ? true : false, mode: slotPos ? 'L' : undefined,
        pos: slotPos || undefined, meta: slotMeta,
      });
      posCell = slotPos ? '' : actorZoneBadge(a);
    }
    return `
    <div class="frow">
      ${actorRef}
      ${posCell}
    </div>`;
  }).join('');
  const rewards = questRewardsSection(q);
  // Secondaire (revue de layout, juillet 2026) : les étapes (goalSteps)
  // couvrent déjà chaque item de quête individuellement (goalTargetChip) --
  // replié par défaut, jamais supprimé (contenu réel, juste plus bas dans la
  // hiérarchie visuelle). Même tiroir générique que dialogs/journal
  // ci-dessous (classe .fiche-dialogs, réutilisée partout dans ce fichier
  // pour un <details> de fiche, pas seulement les dialogues).
  // Filtré par questItemAddsInfo (link-veracity audit) : ne liste QUE les
  // lignes qui ajoutent une info absente des cartes d'étape/récompenses --
  // q.items lui-même reste INTACT (disambiguateQuestItems/les chips d'étape
  // au-dessus en ont besoin en entier), seul le rendu du tiroir est réduit.
  // Le tiroir disparaît entièrement quand plus aucune ligne ne qualifie
  // (cas honnête : les étapes + récompenses racontent déjà toute l'histoire).
  const questItemRows = (q.items || []).filter(questItemAddsInfo);
  const items = questItemRows.length
    ? `<div class="fiche-section"><details class="fiche-dialogs"><summary>${esc(tr('questItemsN', questItemRows.length))}</summary>${questItemRows.map(qi => questItemRow(qi, regionHint)).join('')}</details></div>` : '';
  const goalSteps = goalStepsSection(q);
  // Repli texte historique — seulement pour les quêtes sans graphe de goals décodé.
  const objectives = (!goalSteps && q.objectives?.length)
    ? `<div class="fiche-section"><h3>${esc(tr('objectivesTitle'))}</h3><ul class="fiche-goals">${q.objectives.map(o => `<li>${esc(o)}</li>`).join('')}</ul></div>` : '';
  // Coquille de quête sans aucun but (q.questStatus, enum FERMÉ stampé par le
  // pipeline sur les 9 fiches zéro-goal — marqueurs d'extraction/transition,
  // coquilles dev, quêtes sans objectif décodé) : MIROIR EXACT de la ligne
  // d'obtention honnête côté item (openItemFiche, OBTAIN_STATUS_KEY) — au
  // lieu d'une page nue Suivre/Fait, la fiche énonce ce que la DONNÉE définit
  // (jamais « quête cassée », affirmation sur le jeu qu'on ne peut pas
  // prouver). Rendue UNIQUEMENT quand ni étapes ni repli objectifs n'ont
  // rien produit (jamais en contradiction d'un contenu réel — ex.
  // monochrome_gardening_goldenfield porte le stamp mais AUSSI de vrais
  // textes d'objectifs : eux s'affichent, pas la ligne). Statut inconnu
  // (drift futur) → formulation générique, jamais une clé brute ; repli
  // anglais en dur si une locale n'a pas encore la clé (même filet que
  // mapref.js uiRef — tr() renvoie la clé brute quand elle manque).
  // Aiguillage no_objective (blueprint §2.1) : une quête de grade NOOBJ (ou
  // portant l'ancien `questStatus`) sans étape ni repli objectifs énonce
  // honnêtement ce que la DONNÉE définit — chip système/brouillon minimal, jamais
  // une page nue Suivre/Fait ni « quête cassée ». `NOOBJ` sans `questStatus`
  // précis retombe sur la formulation générique questStatusNoObjectives.
  let questStatusHtml = '';
  if ((q.questStatus || q.followGrade?.grade === 'NOOBJ') && !goalSteps && !objectives) {
    const QUEST_STATUS_KEY = {
      extractionMarker: 'questStatusExtractionMarker',
      devShell: 'questStatusDevShell',
      noObjectives: 'questStatusNoObjectives',
    };
    const QUEST_STATUS_FALLBACK = {
      questStatusExtractionMarker: 'Engine marker (extraction/zone transition) — not a playable quest: the game data defines no objectives for it.',
      questStatusDevShell: 'Development shell — an internal/test quest record with no objectives in the current game data.',
      questStatusNoObjectives: 'No objectives are defined for this quest in the current game data.',
    };
    const k18 = QUEST_STATUS_KEY[q.questStatus] || 'questStatusNoObjectives';
    const txt = tr(k18) === k18 ? QUEST_STATUS_FALLBACK[k18] : tr(k18);
    questStatusHtml = `<div class="fiche-section"><h3>${esc(tr('objectivesTitle'))}</h3>
      <p class="hint">${esc(txt)}</p></div>`;
  }
  const dialogs = (q.dialogs && (q.dialogs.npc?.length || q.dialogs.player?.length))
    ? `<div class="fiche-section"><details class="fiche-dialogs"><summary>${esc(tr('dialogsN', (q.dialogs.npc?.length || 0) + (q.dialogs.player?.length || 0)))}</summary>
        ${(q.dialogs.npc || []).map(l => `<p class="dlg dlg-npc">${esc(l)}</p>`).join('')}
        ${(q.dialogs.player || []).map(l => `<p class="dlg dlg-player">${esc(l)}</p>`).join('')}
      </details></div>` : '';
  // EntityRef (vague 2 + complaint 2) : quêtes liées = références `[Quête(●)] Nom`
  // (questRef — la pastille locate épingle le donneur de CHAQUE quête liée ;
  // souligné → fiche quête).
  const related = (q.related || []).filter(s => S.quests.has(s)).map(s =>
    `<div class="frow">${questRef(s)}</div>`).join('');
  const zoneBtn = S.zonesQuest[slug]
    ? `<button class="act ghost" data-act="zone-view" data-id="${esc(slug)}">${esc(tr('viewZoneBtn'))}</button>` : '';
  // « Voir le donneur » : même correctif que les actorRows ci-dessus -- vise
  // le pin NPC réel (S.data.npc[...].x/z) plutôt que la position brute du
  // donneur (q.x/q.z, souvent à quelques unités du pin -- cas Ophelia Voss,
  // voir  §2/§3) quand ce donneur est connu
  // de la carte active, et porte le `cat` que gotoBtn/pins.js utilisent pour
  // mettre en avant CE marqueur au lieu d'un réticule redondant. giverNi/
  // giverPin sont déjà résolus plus haut (avatar de l'en-tête) -- pas de
  // second lookup ici.
  const giverX = giverPin && giverPin.x != null ? giverPin.x : q.x;
  const giverZ = giverPin && giverPin.x != null ? giverPin.z : q.z;
  // Nuance PRÉCISE de CETTE quête (entityColor, source unique) — même violet
  // que sa réf/son chip partout.
  const questHex = entityColor('quest', q.name);
  // EN-TÊTE (owner 2026-07-12, consolidation des affordances de donneur) : une
  // quête se lit sur le PIN de son donneur. Quand ce donneur est un PNJ résolu
  // AVEC position (giverRefPinnable), la réf `[PNJ(●)] <donneur>` sous le titre
  // devient LE pin PRIMAIRE (locate:true, épingle/retire, centre la caméra) —
  // « make the giver ref the primary pin ». On SUPPRIME alors les affordances
  // redondantes qui visaient le même point : la pastille du TITRE (questDot). Le
  // titre reste coloré, sans pastille (comme une fiche objet). REPLI seulement
  // quand le donneur n'est PAS épinglable par sa réf (nom non résolu à un pin,
  // mais q.x connu hors-zone) : la pastille du titre `[Quête(●)]` (questDot)
  // devient la SEULE affordance carte. E'c-3 : l'ex-bouton « Voir le donneur »
  // (goto) séparé est RETIRÉ même dans ce repli — la pastille du titre EST le
  // locate, jamais un pin + un bouton position redondants sur le même point. */
  const giverRefPinnable = giverNi >= 0 && giverPin && giverPin.x != null;
  const questPosFallback = !giverRefPinnable && q.x != null && q.posSource !== 'zone';
  const questDot = questPosFallback
    ? { kind: 'quest', mode: 'L', key: slug, label: q.name, hex: questHex,
        drawable: true, pos: { x: giverX, z: giverZ } }
    : null;
  const gradeBadge = questCompletenessBadge(q);
  // Nav de série (blueprint §2.4) — DORMANTE aujourd'hui (voir questSeriesNav) :
  // '' tant que `sequence` ne décrit pas une vraie chaîne de quêtes → insérée
  // sans octet devant gradeBadge, l'en-tête reste inchangé.
  const seriesNav = questSeriesNav(q, slug);
  const journalHtml = questJournalSection(q);
  // « Sur la carte » (acteurs de la quête, positionnés ou non) : PAS
  // redondant avec les cartes d'étape (goalTargetChip) malgré l'apparence --
  // vérifié sur le jeu de données complet (batch d'analyse, revue de layout
  // juillet 2026) : 309 quêtes sur 344 avec acteurs listent au moins un
  // acteur qui N'EST LA CIBLE D'AUCUN but (personnage secondaire croisé dans
  // le journal/les dialogues -- ex. imp_brain_hunt liste "Hilda Deeproot" et
  // "Container" avec une position réelle connue, ni l'un ni l'autre cible
  // d'un but). Repliée par défaut (secondaire), jamais supprimée : le ferait
  // perdre ~424 positions réelles qui n'existent nulle part ailleurs dans la
  // fiche.
  const onMap = actorRows
    ? `<div class="fiche-section"><details class="fiche-dialogs"><summary>${esc(tr('onMapTitleN', (q.actors || []).length))}</summary>${actorRows}</details></div>` : '';

  openFiche(`
    ${ficheHeader({
      avatar: iconTag(avatar, 'fiche-avatar', initials(q.giver)),
      name: q.name, hex: questHex, dot: questDot,
      sub: esc(tr('questFicheKind', q.regions?.length ? q.regions[0] : '')),
      below: `${seriesNav}${gradeBadge}
      ${q.giver ? `<div class="reward-chips quest-giver-row">${npcRef(q.giver, { ni: giverNi, locate: true })}</div>` : ''}
      ${q.maps?.length > 1 ? `<span class="pop-coords">${esc(tr('questMapsLine', q.maps.map(mapName).join(' · ')))}</span>` : ''}`,
    })}
    <div class="fiche-section"><div class="pop-actions">
      ${zoneBtn}
      <button class="act" data-act="track" data-id="quest:${esc(slug)}">${esc(tr('trackBtn'))}</button>
      <button class="act" data-act="done" data-id="quest:${esc(slug)}">${esc(tr('doneBtn'))}</button>
    </div></div>
    ${journalHtml}
    ${dialogs}
    ${hintBox(q)}
    ${goalSteps}
    ${objectives}
    ${questStatusHtml}
    ${rewards}
    ${items}
    ${onMap}
    ${related ? `<div class="fiche-section"><h3>${esc(tr('relatedQuestsTitle'))}</h3>${related}</div>` : ''}`);
  drawInvestigation(q);
  drawQuestZone(slug);
  setFicheHash('quest', slug);
}

/* Surligne la zone de quête (polygones violets) quand elle existe. */
function drawQuestZone(slug) {
  if (S.questZoneLayer) { map.removeLayer(S.questZoneLayer); S.questZoneLayer = null; }
  const rings = S.zonesQuest[slug];
  if (!rings?.length) return;
  const g = L.layerGroup();
  rings.forEach(ring => L.polygon(ring.map(([x, z]) => toLL(x, z)), {
    color: CATS.quest.hex, weight: 2, dashArray: '5 6',
    fillColor: CATS.quest.hex, fillOpacity: .14, interactive: false,
  }).addTo(g));
  S.questZoneLayer = g.addTo(map);
}

/* Fil d'enquête : relie le donneur aux acteurs positionnés. Un acteur listé
   sans position connue (« position inconnue » dans la fiche) n'a simplement
   rien à relier sur la carte. */
function drawInvestigation(q) {
  if (S.investLayer) map.removeLayer(S.investLayer);
  // Multi-cartes : ne relier QUE les acteurs de la carte courante — un acteur
  // sur une autre carte (a.map ≠ carte active) est dans un autre repère de
  // coordonnées ; le dessiner ici le placerait au mauvais endroit.
  const positioned = (q.actors || []).filter(a => a.x != null && (!a.map || a.map === S.map));
  if (q.x == null || !positioned.length) { S.investLayer = null; return; }
  const g = L.layerGroup();
  const from = toLL(q.x, q.z);
  positioned.forEach(a => {
    L.polyline([from, toLL(a.x, a.z)], {
      color: '#e0a23f', weight: 1.6, dashArray: '6 7', opacity: .75, interactive: false,
    }).addTo(g);
    L.circleMarker(toLL(a.x, a.z), {
      renderer: canvasR, radius: 5.5, color: '#0a0e14', weight: 1.2,
      fillColor: a.kind === 'npc' ? '#e0a23f' : '#ff8fa3', fillOpacity: .95,
    }).bindTooltip(a.label, { direction: 'top' }).addTo(g);
  });
  S.investLayer = g.addTo(map);
}
/* Vol vers la zone de quête surlignée (bouton « Voir la zone »). */
function flyToQuestZone(slug) {
  const rings = S.zonesQuest[slug];
  if (rings?.length) map.flyToBounds(L.latLngBounds(rings.flat().map(([x, z]) => toLL(x, z))).pad(0.3));
}

export { openQuestFiche, flyToQuestZone };
