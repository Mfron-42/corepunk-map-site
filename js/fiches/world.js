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

import { ficheHeader, openFiche, setFicheHash, lootRowsHtml, gotoBtn, badge, speciesRef } from './core.js';

/* Fiche coffre (S.data.chest, placements tc_* : camp_chest/legacy_chest/
   décor — voir DATA_CONTRACT.md §3) : nom d'affichage = type physique réel
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
   data/SCHEMA.md "Chest loot + type" sur pourquoi ces marqueurs ne sont pas
   individuellement indexés en recherche non plus). */
function openChestFiche(i) {
  const r = S.data.chest[i];
  if (!r) return;
  S.openFiche = { kind: 'chest', id: i };
  const name = chestDisplayName(r);
  const drops = lootRowsHtml(r.loot, 'noLootCatalogued');
  // Note honnête (r.lootGeneric) : ce placement n'a AUCUNE table de butin
  // dédiée — le seul lien de butin connu est un pool générique fouillable
  // (lt_searchable*), pas une vraie table de coffre curée. Jamais présenté
  // comme un coffre farmable ciblé (voir DATA_CONTRACT.md §1/§3).
  const genericNote = r.lootGeneric ? `<p class="hint">${esc(tr('lootGenericNote'))}</p>` : '';
  // Couche carte réelle de CE placement (voir main.js registerAllDenseRenderers) :
  // camp_chest / decor:<famille> / decor:legacy -- jamais l'ancien "chest"
  // générique, qui n'est plus le nom d'aucune couche (voir DATA_CONTRACT.md §3.1).
  const chestCat = r.group === 'camp_chest' ? 'camp_chest'
    : r.group === 'legacy_chest' ? 'decor:legacy'
      : (r.group === 'decor' && r.family) ? 'decor:' + r.family : null;
  // EN-TÊTE PARTAGÉ (TASK 1) : titre coloré (teinte réelle du coffre) + pastille
  // LOCATE (mode L, Q7) sur sa position quand connue — pin persistant retirable.
  const chestDot = r.x != null
    ? { kind: 'chest', mode: 'L', key: 'chest:' + i, label: name, hex: chestHex(r), drawable: true, pos: { x: r.x, z: r.z } }
    : null;
  openFiche(`
    ${ficheHeader({ name, hex: chestHex(r), dot: chestDot, sub: esc(chestKindLabel(r)) })}
    <div class="fiche-section"><div class="pop-actions">
      ${gotoBtn(r.x, r.z, name, chestCat)}
    </div></div>
    <div class="fiche-section"><h3>${esc(tr('lootBestRates'))}</h3>${genericNote}${drops}</div>`);
  setFicheHash(null);
}

/* Fiche « coffre fouillable » (searchable_chests.bin, poi_searchable_chest_*
   — LE vrai coffre farmable de recette, distinct des placements chest
   ci-dessus, voir DATA_CONTRACT.md §4) : région (jeton neutre prettifié,
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
  // EN-TÊTE PARTAGÉ (TASK 1) : titre coloré + pastille LOCATE (mode L, Q7) sur
  // sa position — pin persistant retirable ; le sous-titre porte la région.
  const scDot = r.x != null
    ? { kind: 'searchable_chest', mode: 'L', key: r.k, label: tr('searchableChestTitle'),
        hex: CATS.searchable_chest.hex, drawable: true, pos: { x: r.x, z: r.z } }
    : null;
  openFiche(`
    ${ficheHeader({ name: tr('searchableChestTitle'), hex: CATS.searchable_chest.hex, dot: scDot, sub: esc(region) })}
    <div class="fiche-section"><div class="pop-actions">
      ${gotoBtn(r.x, r.z, tr('searchableChestTitle'), 'searchable_chest')}
    </div></div>
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
  // EN-TÊTE PARTAGÉ (TASK 1) : titre coloré + pastille LOCATE (mode L, Q7) sur
  // la position quand connue (38/208 lieux ont un pin _ip) — pin persistant
  // retirable ; sinon titre coloré seul. Le bouton « Voir sur la carte » (goto)
  // reste, distinct du pin.
  const locHex = entityColor('location', l.title);
  const locDot = l.x != null
    ? { kind: 'location', mode: 'L', key: idx, label: l.title, hex: locHex, drawable: true, pos: { x: l.x, z: l.z } }
    : null;
  openFiche(`
    ${ficheHeader({ name: l.title, hex: locHex, dot: locDot, sub: esc(locationKindLabel(l.kind)) })}
    ${l.x != null ? `<div class="fiche-section"><div class="pop-actions">
      <button class="act primary" data-act="goto" data-x="${l.x}" data-z="${l.z}" data-label="${esc(l.title)}">${esc(tr('viewOnMapBtn'))}</button>
    </div></div>` : ''}
    ${l.desc ? `<div class="fiche-section"><p class="fiche-journal">${esc(l.desc)}</p></div>` : ''}
    ${monstersHtml}`);
  setFicheHash(null);
}

export { openChestFiche, openSearchableChestFiche, openLocationFiche };
