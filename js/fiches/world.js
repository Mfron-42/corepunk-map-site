/* Kwalat — fiches/world.js (issu du découpage de fiches.js, vague E'c-S).
   Fiches de monde : coffre placé, coffre fouillable, chronique (lore). */
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

import { ficheHeader, openFiche, setFicheHash, lootRowsHtml, badge, speciesRef } from './core.js';

/* Icône de coffre : chests.bin stocke un chemin client brut
   `UI/Icons/HeroAvatars/Chest/<leaf>` (694/3834 placements) ; le fichier réel
   vit sous `icons/chest/<leaf>.png` (transform de feuille vérifié 694/694).
   Les autres coffres n'ont pas d'icône -> glyphe honnête (iconTag rend le span
   icon-broken avec le glyphe en data-fb), jamais l'icône d'un voisin. */
const CHEST_GLYPH = '📦';
const chestIconUrl = r => (r.icon ? `icons/chest/${String(r.icon).split('/').pop()}.png` : null);

/* Durée serveur (objectStats) : secondes -> ~N min au-delà d'une minute, N s en
   deçà -- jamais un faux zéro de précision. */
const fmtChestDuration = s => (s >= 60 ? tr('unitMinutesApprox', Math.round(s / 60)) : tr('unitSeconds', s));

/* TimerRow (blueprint §3.3) depuis objectStats (2850/3834 coffres, provenance/
   opcode déjà strippés côté données) : SEULES les valeurs porteuses de sens
   sont rendues -- time_to_destroy=0 / champ absent / objectStats manquant sont
   une ABSENCE honnête, JAMAIS un « 0 » fabriqué. Un vrai coffre (camp/legacy/
   interactable.chests) sans timer décodé montre une Badge d'absence ; un pur
   décor/destructible (aucune stat d'interaction par nature, DATA_CONTRACT §2)
   n'affiche simplement pas de section. Réutilise la grille .stat-grid partagée. */
function chestTimersHtml(r) {
  const os = r.objectStats;
  const rows = [];
  if (os) {
    if (os.time_to_regenerate_loot > 0) rows.push([tr('chestRegenLabel'), fmtChestDuration(os.time_to_regenerate_loot)]);
    if (os.loot_cone_radius > 0) rows.push([tr('chestPickupRadiusLabel'), tr('unitMeters', os.loot_cone_radius)]);
    if (os.time_to_destroy > 0) rows.push([tr('chestBreakTimeLabel'), fmtChestDuration(os.time_to_destroy)]);
    if (os.give_karma_by_open) rows.push([tr('chestKarmaLabel'), tr('chestKarmaYes')]);
  }
  if (rows.length) {
    const grid = rows.map(([l, v]) => `<div class="stat-row-label">${esc(l)}</div><div class="stat-row-value">${esc(v)}</div>`).join('');
    return `<div class="fiche-section"><h3>${esc(tr('chestTimersTitle'))}</h3><div class="stat-grid">${grid}</div></div>`;
  }
  const isChest = r.group === 'camp_chest' || r.group === 'legacy_chest' || r.category === 'interactable.chests';
  return isChest
    ? `<div class="fiche-section"><h3>${esc(tr('chestTimersTitle'))}</h3><p class="hint">${badge({ axis: 'provenance', value: 'absent', extra: tr('chestTimersAbsentNote') })}</p></div>`
    : '';
}

/* Fiche coffre (S.data.chest, placements tc_* : camp_chest/legacy_chest/
   décor — voir  §3) : nom d'affichage = type physique réel
   localisé (chestDisplayName, js/config.js — r.type est le vrai classifieur
   chest_type du pipeline, jamais le nom brut d'asset d'art, non localisé et
   bruité) ; ligne de catégorie = la VRAIE catégorie du point (chestKindLabel
   — "Coffre de camp" / "Décor — <famille>" / "Coffre hérité (legacy)",
   jamais l'ancien catLabel('chest') générique qui conflait les 3) + butin
   (même rendu lootRowsHtml que monstre/camp/item, avec une note honnête
   quand r.lootGeneric — pool générique, pas une table curée) + bouton carte.
   Pas de lien profond dédié (setFicheHash(null)) — même traitement que
   openLocationFiche/openAbilityFiche : ~3830 marqueurs individuels par skin
   de prop, pas un id stable qu'un lien partagé devrait rouvrir (voir
    "Chest loot + type" sur pourquoi ces marqueurs ne sont pas
   individuellement indexés en recherche non plus). */
function openChestFiche(i) {
  const r = S.data.chest[i];
  if (!r) return;
  S.openFiche = { kind: 'chest', id: i };
  // Nom = vrai nom localisé officiel (r.displayName, 57 coffres -- ex. « Trash
  // can » au lieu du placeholder brut « Chest trash 01 ») quand il existe,
  // sinon le classifieur de TYPE localisé (chestDisplayName) -- jamais le nom
  // d'asset bruité.
  const name = r.displayName || chestDisplayName(r);
  const drops = lootRowsHtml(r.loot, 'noLootCatalogued');
  // Note honnête (r.lootGeneric) : ce placement n'a AUCUNE table de butin
  // dédiée — le seul lien de butin connu est un pool générique fouillable
  // (lt_searchable*), pas une vraie table de coffre curée. Jamais présenté
  // comme un coffre farmable ciblé (voir  §1/§3).
  const genericNote = r.lootGeneric ? `<p class="hint">${esc(tr('lootGenericNote'))}</p>` : '';
  // EN-TÊTE PARTAGÉ : titre coloré (teinte réelle du coffre) + pastille LOCATE
  // (mode L, Q7) sur sa position quand connue — pin persistant retirable. E'c-3 :
  // l'ex-bouton carte (gotoBtn) séparé est RETIRÉ, la pastille EST le locate.
  const chestDot = r.x != null
    ? { kind: 'chest', mode: 'L', key: 'chest:' + i, label: name, hex: chestHex(r), drawable: true, pos: { x: r.x, z: r.z } }
    : null;
  // Région (r.zone, nom de zone localisé, présent sur tous les coffres) : réf
  // `[Région] Nom` NON dessinable / NON soulignée (la fiche région arrive en
  // vague E'c-R -- honnête : le tag nomme le kind, jamais un lien mort ni un
  // faux tracé). ICÔNE réelle du coffre (chestIconUrl, 694) ou glyphe honnête.
  const zoneRef = r.zone
    ? `<div class="fiche-region">${ref({ kind: 'zone', label: r.zone, hasFiche: false, drawable: false })}</div>` : '';
  // Sous-titre = chestKindLabel SEUL (coffre de camp / décor par famille /
  // legacy). Le vocabulaire de SEAU (Lot 2) vit sur la surface de DÉCOUVERTE
  // (sous-libellé de recherche « Seau · Type ») : sur la fiche, le titre porte
  // déjà le type physique (chestDisplayName) et le sous-titre l'axe de skin —
  // y préfixer le seau tripleerait la classification ET casse le contrat testé
  // « ligne de kind camp_chest = Coffre de camp » (_verify_container_recat).
  openFiche(`
    ${ficheHeader({ avatar: iconTag(chestIconUrl(r), 'fiche-avatar', CHEST_GLYPH), name, hex: chestHex(r), dot: chestDot, sub: esc(chestKindLabel(r)), below: zoneRef })}
    ${chestTimersHtml(r)}
    <div class="fiche-section"><h3>${esc(tr('lootBestRates'))}</h3>${genericNote}${drops}</div>`);
  setFicheHash(null);
}

/* Fiche « coffre fouillable » (searchable_chests.bin, poi_searchable_chest_*
   — LE vrai coffre farmable de recette, distinct des placements chest
   ci-dessus, voir  §4) : région (jeton neutre prettifié,
   aucun libellé fourni par les données) + note honnête sur la rareté
   (`rarity` vaut TOUJOURS "random" côté données — le vrai palier est choisi
   côté serveur au spawn, non décodable depuis le client) + la vraie table de
   recette (loot, agrégée depuis les 13 lt_poi_chest_hidden_* du point). Pas
   de lien profond dédié (setFicheHash(null)) — même traitement que
   openChestFiche/openLocationFiche/openAbilityFiche ci-dessus/dessous. */
function openSearchableChestFiche(k) {
  const r = (S.data.searchable_chest || []).find(x => x.k === k);
  if (!r) return;
  S.openFiche = { kind: 'searchable_chest', id: k };
  const region = prettyRegion(r.region);
  const drops = lootRowsHtml(r.loot, 'noLootCatalogued');
  // EN-TÊTE PARTAGÉ : titre coloré + pastille LOCATE (mode L, Q7) sur sa
  // position — pin persistant retirable. E'c-3 : l'ex-bouton carte séparé RETIRÉ.
  const scDot = r.x != null
    ? { kind: 'searchable_chest', mode: 'L', key: r.k, label: tr('searchableChestTitle'),
        hex: CATS.searchable_chest.hex, drawable: true, pos: { x: r.x, z: r.z } }
    : null;
  // Région : réf `[Région] Nom` NON dessinable / NON soulignée (fiche région en
  // vague E'c-R), cohérente avec la fiche coffre placé -- la région devient une
  // entité référençable au lieu d'un simple sous-titre en texte brut. Le nom
  // reste honnête (jeton prettifié : aucun libellé fourni côté données, §4).
  const regionRef = r.region
    ? `<div class="fiche-region">${ref({ kind: 'zone', label: region, hasFiche: false, drawable: false })}</div>` : '';
  openFiche(`
    ${ficheHeader({ name: tr('searchableChestTitle'), hex: CATS.searchable_chest.hex, dot: scDot, sub: '', below: regionRef })}
    <div class="fiche-section"><p class="hint">${badge({ axis: 'provenance', value: 'absent', extra: tr('searchableChestRarityNote') })}</p></div>
    <div class="fiche-section"><h3>${esc(tr('lootBestRates'))}</h3>${drops}</div>`);
  setFicheHash(null);
}

/* Fiche bestiaire/lore (MapMarkers.xml) : titre, nature (Ville/Bestiaire/
   Ressource…), description, bouton carte si une position est connue (38/208
   depuis un pin _ip), monstres de la même famille cliquables vers leur
   propre fiche quand connus du catalogue. Pas de lien profond dédié (`mon`/
   `i`/`npc`/etc. sont nettoyés du hash pour éviter qu'un lien partagé rouvre
   la MAUVAISE fiche après un rechargement — voir setFicheHash). */
function openLocationFiche(idx) {
  const l = S.locations[idx];
  if (!l) return;
  S.openFiche = { kind: 'location', id: idx };
  // EntityRef (vague 2) : `[Espèce(●)] Nom` (speciesRef) — la pastille bascule
  // la couche espèce (quand des points existent sur la carte active), le nom
  // souligné ouvre la fiche monstre quand la clé résout ; niveau en méta.
  const monstersHtml = l.monsters?.length
    ? `<div class="fiche-section"><h3>${esc(tr('familyMonstersTitle', l.monsters.length))}</h3>${l.monsters.map(fm =>
        `<div class="frow">${speciesRef({ key: fm.key, name: fm.name, meta: fm.level != null ? tr('levelAbbrev', fm.level) : '' })}</div>`
      ).join('')}</div>` : '';
  // EN-TÊTE PARTAGÉ : titre coloré + pastille LOCATE (mode L, Q7) sur la position
  // quand connue (38/208 lieux ont un pin _ip) — pin persistant retirable ; sinon
  // titre coloré seul. E'c-3 : l'ex-bouton « Voir sur la carte » (goto) séparé est
  // RETIRÉ — la pastille de l'en-tête EST le locate (jamais deux affordances).
  const locHex = entityColor('location', l.title);
  const locDot = l.x != null
    ? { kind: 'location', mode: 'L', key: idx, label: l.title, hex: locHex, drawable: true, pos: { x: l.x, z: l.z } }
    : null;
  openFiche(`
    ${ficheHeader({ name: l.title, hex: locHex, dot: locDot, sub: esc(locationKindLabel(l.kind)) })}
    ${l.desc ? `<div class="fiche-section"><p class="fiche-journal">${esc(l.desc)}</p></div>` : ''}
    ${monstersHtml}`);
  setFicheHash(null);
}

export { openChestFiche, openSearchableChestFiche, openLocationFiche };
