/* Kwalat — fiches/quest.js (issu du découpage de fiches.js, vague E'c-S).
   Coquille de la fiche de quête (openQuestFiche) + fiche de dialogue-bark,
   récompenses, journal, badge d'explication, fil d'enquête et zones de quête. */
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

import { ficheHeader, openFiche, setFicheHash, npcRef, gotoBtn, crossMapBtn, qtyItemChip, qtyChipList, disambiguateQuestItems, resetGoalZones, clearGoalZone } from './core.js';
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
   identité du même donneur) -- ordre de préférence (fiche_header_DESIGN.md
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
   (un jeu de gabarits par langue — voir data/SCHEMA.md "i18n"). Aucune
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

/* Pastille de confiance : `q.explained` {goals_total, goals_resolved, pct}
   vient tel quel du décodeur de graphe de quête (
   -- jamais recalculé ici). 333 quêtes sur 335 dotées d'un graphe de buts sont
   intégralement expliquées (chaque but a un mécanisme/une cible résolus) ; les
   2 restantes gardent au moins un but non résolu -- le badge le dit sans
   détour plutôt que de laisser croire que CHAQUE étape vient à coup sûr des
   données du jeu (honnêteté > fabrication, voir project memory). Repli
   silencieux (pas de badge du tout) sur les quêtes sans graphe de buts décodé
   (dialogues-barks, quelques gabarits internes) -- rien à confirmer/infirmer.
   Discret dans les deux cas : la variante "tout expliqué" (l'écrasante
   majorité) reste presque invisible (texte atténué, pas de fond), seule la
   variante "incertain" (rarissime) est un peu plus visible -- jamais une
   couleur criarde ni un `title` supplémentaire redondant avec le texte. */
function questExplainedBadge(q) {
  const e = q.explained;
  if (!e || !e.goals_total) return '';
  const uncertain = e.goals_total - e.goals_resolved;
  return uncertain <= 0
    ? `<div class="quest-explain-badge quest-explain-full"><span aria-hidden="true">✓</span> ${esc(tr('questExplainedFull'))}</div>`
    : `<div class="quest-explain-badge quest-explain-partial"><span aria-hidden="true">⚠</span> ${esc(tr('questExplainedPartial', uncertain))}</div>`;
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
   exactement cette fiche. */
function openDialogueFiche(q, slug) {
  // Le PNJ qui « donne » ce bark : même résolution que le donneur d'une
  // vraie quête (npcIndexByName) -- réutilisée pour l'avatar (portrait de PIN
  // réel en priorité, fiche_header_DESIGN.md §1) ET pour le chip cliquable
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
      name: q.name, hex: entityColor('quest', q.name), sub: esc(tr('dialogueFicheKind')), below: giverRow,
    })}
    <div class="fiche-section">
      <h3>${esc(tr('dialogueHeading'))}</h3>
      <p class="hint">${esc(tr('dialogueNote'))}</p>
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
  // 0 goals/0 rewards/no real items, see build_site_data.py::quest_hints()).
  // Masqué de la recherche/carte par défaut (isHiddenTest), mais ENCORE
  // ouvrable (contenu dev activé, OU lien profond q=<slug> direct) — dans ce
  // cas on ne rend PAS une fiche de quête vide (l'ancien comportement : titre
  // "Hello Blitz Hyperstorm" + zéro objectif/récompense/item), mais une fiche
  // clairement étiquetée « Dialogue PNJ (pas une quête) » avec ses répliques.
  if (q.isDialogue) { openDialogueFiche(q, slug); return; }
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
  // 3 niveaux ici aussi (pas seulement sur les objectifs goalTargetChip) :
  // (a) position fixe -> gotoBtn normal ; (b)/(c) pas de position fixe mais
  // une search_zone propagée depuis le goal dont ce slot est la cible ->
  // dynamicPosBadge (zone dessinée seulement si confiance haute). Ne JAMAIS
  // retomber sur le "position inconnue" de gotoBtn pour un slot de quête.
  // Un acteur sur une AUTRE carte (a.map ≠ carte active) : bouton de bascule
  // cross-carte au lieu d'un goTo qui tomberait dans le mauvais repère.
  const actorRows = (q.actors || []).map(a => {
    const onOtherMap = a.map && a.map !== S.map;
    // Acteur PNJ résolu par nom (npcIndexByName) : la position BRUTE de
    // l'acteur (a.x/a.z, un placement/point de graphe de quête) peut différer
    // de quelques unités du pin NPC réellement affiché pour ce même
    // personnage (map_marker.pos -- voir npc_dual_identity_INVESTIGATION.md
    // §2/§3, cas Ophelia Voss) ; quand le personnage est connu de la carte
    // active, on vise directement SON pin -- fixe le "deux marqueurs, deux
    // icônes" pour ce cas ET permet à findRenderedMarker() de le retrouver
    // exactement (voir gotoBtn's `cat`/pins.js resolveGotoMarker).
    const ni = (a.kind === 'npc' && !onOtherMap) ? npcIndexByName(a.label) : -1;
    const npcPin = ni >= 0 ? S.data.npc[ni] : null;
    const posX = npcPin && npcPin.x != null ? npcPin.x : a.x;
    const posZ = npcPin && npcPin.x != null ? npcPin.z : a.z;
    const posCat = npcPin && npcPin.x != null ? 'npc' : null;
    const posCell = a.x == null ? dynamicPosBadge({ search_zone: a.searchZone }, regionHint)
      : onOtherMap ? crossMapBtn(a.map, a.x, a.z, cleanLabel(a.label))
        : gotoBtn(posX, posZ, cleanLabel(a.label), posCat);
    // Acteur PNJ cliquable vers sa fiche (quêtes + boutique) quand il est
    // connu de la carte active ; monstre idem vers sa fiche bestiaire —
    // navigation quête → PNJ/monstre sans repasser par la recherche.
    const aLabel = cleanLabel(a.label);   // affichage nettoyé, résolutions sur la donnée brute
    // EntityRef (vague 2) : l'ex-badge k-chip + lien deviennent une référence
    // d'IDENTITÉ `[PNJ]`/`[Espèce]`/`[Objet]` — SANS pastille : la cellule de
    // position (posCell) juste à côté est l'affordance carte propre à CET
    // acteur PLACÉ (jamais une couche espèce-entière). Nom souligné ⇔ résolu
    // (mêmes gardes/sources qu'avant : npcIndexByName / monsterKeyFor). Un
    // acteur "mob" (créature — jamais "monster", qui est le kind de cible
    // RÉSOLUE de geo.py) porte la teinte espèce précise ; un kind non reconnu
    // (rare) garde une identité générique, aucun kind EntityRef ne mappant un
    // type d'acteur arbitraire (justifié, jamais un faux tag).
    let actorRef;
    if (a.kind === 'npc') {
      actorRef = npcRef(aLabel, { ni, locate: false });
    } else if (a.kind === 'mob') {
      const mk = monsterKeyFor(null, a.label);
      const spId = mk ? S.monsters[mk]?.species : null;
      actorRef = ref({ kind: 'species', key: mk || null, label: aLabel, hex: spId ? speciesLayerHex(spId) : MONSTER_HEX, hasFiche: !!mk, drawable: false });
    } else if (a.kind === 'object') {
      actorRef = ref({ kind: 'qao', mode: 'N', label: aLabel });
    } else {
      actorRef = `<span class="k-chip" style="--chip-c:#8d99ae">${esc(actorKindLabel(a.kind))}</span> <span class="fr-label">${esc(aLabel)}</span>`;
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
  let questStatusHtml = '';
  if (q.questStatus && !goalSteps && !objectives) {
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
  // EntityRef (vague 2) : quêtes liées = références `[Quête] Nom` (le tag
  // remplace le badge k-chip détaché ; souligné → fiche quête).
  const related = (q.related || []).filter(s => S.quests.has(s)).map(s =>
    `<div class="frow">${ref({ kind: 'quest', key: s, label: S.quests.get(s).name, hasFiche: true })}</div>`).join('');
  const zoneBtn = S.zonesQuest[slug]
    ? `<button class="act ghost" data-act="zone-view" data-id="${esc(slug)}">${esc(tr('viewZoneBtn'))}</button>` : '';
  // « Voir le donneur » : même correctif que les actorRows ci-dessus -- vise
  // le pin NPC réel (S.data.npc[...].x/z) plutôt que la position brute du
  // donneur (q.x/q.z, souvent à quelques unités du pin -- cas Ophelia Voss,
  // voir npc_dual_identity_INVESTIGATION.md §2/§3) quand ce donneur est connu
  // de la carte active, et porte le `cat` que gotoBtn/pins.js utilisent pour
  // mettre en avant CE marqueur au lieu d'un réticule redondant. giverNi/
  // giverPin sont déjà résolus plus haut (avatar de l'en-tête) -- pas de
  // second lookup ici.
  const giverX = giverPin && giverPin.x != null ? giverPin.x : q.x;
  const giverZ = giverPin && giverPin.x != null ? giverPin.z : q.z;
  const giverCat = giverPin && giverPin.x != null ? 'npc' : null;
  const giverCatAttr = giverCat ? ` data-cat="${giverCat}"` : '';
  // Nuance PRÉCISE de CETTE quête (entityColor, source unique) — même violet
  // que sa réf/son chip partout.
  const questHex = entityColor('quest', q.name);
  // EN-TÊTE (owner 2026-07-12, consolidation des affordances de donneur) : une
  // quête se lit sur le PIN de son donneur. Quand ce donneur est un PNJ résolu
  // AVEC position (giverRefPinnable), la réf `[PNJ(●)] <donneur>` sous le titre
  // devient LE pin PRIMAIRE (locate:true, épingle/retire, centre la caméra) —
  // « make the giver ref the primary pin ». On SUPPRIME alors les deux
  // affordances redondantes qui visaient le même point : la pastille du TITRE
  // (questDot) ET le bouton « Voir le donneur » (l'épinglage centre déjà). Le
  // titre reste coloré, sans pastille (comme une fiche objet). REPLI seulement
  // quand le donneur n'est PAS épinglable par sa réf (nom non résolu à un pin,
  // mais q.x connu hors-zone) : la pastille du titre + le bouton restent la
  // SEULE affordance carte (label = nom de quête). Jamais deux pins pour le
  // même donneur (redondance signalée par l'owner). */
  const giverRefPinnable = giverNi >= 0 && giverPin && giverPin.x != null;
  const questPosFallback = !giverRefPinnable && q.x != null && q.posSource !== 'zone';
  const questDot = questPosFallback
    ? { kind: 'quest', mode: 'L', key: slug, label: q.name, hex: questHex,
        drawable: true, pos: { x: giverX, z: giverZ } }
    : null;
  const explainBadge = questExplainedBadge(q);
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
      below: `${explainBadge}
      ${q.giver ? `<div class="reward-chips quest-giver-row">${npcRef(q.giver, { ni: giverNi, locate: true })}</div>` : ''}
      ${q.maps?.length > 1 ? `<span class="pop-coords">${esc(tr('questMapsLine', q.maps.map(mapName).join(' · ')))}</span>` : ''}`,
    })}
    <div class="fiche-section"><div class="pop-actions">
      ${questPosFallback ? `<button class="act primary" data-act="goto" data-x="${giverX}" data-z="${giverZ}" data-label="${esc(q.giver || q.name)}"${giverCatAttr}>${esc(tr('viewGiverBtn'))}</button>` : ''}
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
