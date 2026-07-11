/* Kwalat — fiches (drawer de détail) : PNJ, quête, objet, camp, monstre,
   bestiaire/lore, capacité — plus leurs briques partagées (lignes de butin,
   boutons carte, badges de position à 3 niveaux, sections stock/recette).
   Chaque fiche pose son lien profond via setFicheHash ; les surcouches
   carte propres aux fiches (fil d'enquête, zones de quête/objectif) vivent
   ici aussi. */
import { S } from './state.js';
import {
  CATS, CAMP_COLORS, RARITY, MONSTER_HEX, LOCATION_HEX, ABILITY_HEX, RECIPE_HEX, ZONE_HEX,
  actorKindLabel, campKindLabel, monsterAttackLabel, locationKindLabel,
  rarityLabel, itemKindLabel, professionLabel, harvestMethodLabel,
  weaponTypeLine, weaponClassLabel, ACTION_META, actionVerb, actionIconSvg, mapName,
  campDisplayName, campLootTableName, chestDisplayName,
  statLabel, statTierLabel, formulaTermLabel,
  chestHex, chestKindLabel, prettyRegion, LOOT_TABLE_HEX, ecAttr,
} from './config.js';
import { $, esc, fmtCoord, fold, iconTag, initials, itemGlyph, pretty, capitalize, cleanLabel } from './utils.js';
import { tr, numberLocale } from './i18n/index.js';
import { map, toLL, canvasR, clearHighlight, showHighlight } from './mapview.js';
import { clearLocator } from './pins.js';
import { unfocus } from './urlstate.js';
import { monsterKeyFor, npcIndexByName, loreIndexFor, lootTableItems } from './data.js';
import { mobLabelHtml } from './popups.js';
import { RARITY_ORDER, rarityGroupFor } from './rarity.js';
import { isHiddenTest, visibleQuestSlugs } from './devcontent.js';

/* Fiche camp — ouvrable pour TOUT camp, y compris sans fiche détaillée
   (camp_details ne couvre que les camps de monstres/ressources : les
   contenants cassables/fouillables n'y sont jamais) : points de spawn +
   bouton carte au minimum, et pour un contenant TYPÉ (caisse de maïs,
   cercueil, corps, coffre fouillable…) la table de butin associée PAR TYPE
   (voir campLootTableName — mention honnête, le lien prop→table n'est pas
   publié par le jeu). */
/* Kinds "monster-ish" ( -- même classement, tokens
   raw "monsters"/"monster"/"creeps"/"wild"/"peaceful" normalisés en kinds
   site "monsters"/"creeps"/"wildlife", voir build_site_data.py
   _CAMP_KIND_NORM) : la seule famille de camps pour laquelle une SECTION
   FAUNE a un sens -- un camp de minerai/herboristerie n'a simplement aucune
   créature à lister, ce n'est pas un trou de donnée. */
const MONSTER_ISH_CAMP_KINDS = new Set(['monsters', 'creeps', 'wildlife']);
/* Ligne muette « niv <min>–<max> ×N · <attaque> » d'une ligne de faune de
   camp (camp_details `mobs[]`, folded PAR ESPÈCE — task #80) : `lvl`/`lvlMax`
   sont la fourchette de niveau RÉELLE de cette espèce dans CE camp précis
   (identiques quand l'espèce n'y a qu'un seul niveau — pas de "–" inventé),
   `count` = le nombre de clés brutes/cosmétiques repliées dans cette ligne
   (voir data/SCHEMA.md camps.json "One mobs[] row per species", omis quand
   ≤ 1 -- jamais un "×1" qui laisserait croire à une variante réelle). `atk`
   passe désormais par monsterAttackLabel (même traduction que la fiche
   monstre elle-même, openMonsterFiche) au lieu du jeton brut "Melee"/"Range". */
function campMobLevelLine(m) {
  const lvlTxt = m.lvl != null
    ? (m.lvlMax != null && m.lvlMax !== m.lvl ? tr('levelRangeAbbrev', m.lvl, m.lvlMax) : tr('levelAbbrev', m.lvl))
    : '';
  const withCount = m.count > 1 ? `${lvlTxt} ×${m.count}` : lvlTxt;
  return [withCount, m.atk ? monsterAttackLabel(m.atk) : null].filter(Boolean).join(' · ');
}
function openCampFiche(key) {
  const det = S.campDetails[key] || null;
  const g = Object.values(S.camps).flatMap(st => st.groups).find(c => c.k === key);
  if (!g) return;
  S.openFiche = { kind: 'camp', id: key };
  const name = campDisplayName(key);
  const mobs = (det?.mobs || []).map(m => `
    <div class="frow">
      ${iconTag(m.icon ? `icons/${esc(m.icon)}` : null, 'fr-icon', initials(m.name))}
      ${mobLabelHtml(m, 'fr-label')}
      <span class="muted">${esc(campMobLevelLine(m))}</span>
    </div>`).join('');
  // Faune honnêtement vide (unknown_states_DESIGN.md #4/#10, task #67) : un
  // camp "monster-ish" dont AUCUNE espèce n'a pu être résolue par le
  // pipeline (heuristique de nom sur le manager du camp -- byte-prouvé que
  // les points de spawn eux-mêmes ne portent aucune référence d'entité,
  // data/SCHEMA.md "camp fauna") n'a même pas d'entrée dans camp_details.json
  // (build_site_data.py::camp_details() saute tout camp sans monstres NI
  // loot_tables) -- `det` est alors carrément `null`, et la section
  // disparaissait en silence jusqu'ici (43/128 camps monster-ish, voir
  // tmp/regen_20260710.log). Remplacé par une pastille + note honnêtes,
  // jamais une liste inventée ni un silence qui se lit comme "pas de
  // monstres ici du tout".
  const faunaUnknown = (!mobs && MONSTER_ISH_CAMP_KINDS.has(g.kind))
    ? `<div class="fiche-section"><h3>${esc(tr('likelyMonsters', 0))}</h3>
        <p class="hint">${stateChip('dynamic')} ${esc(tr('campFaunaUnknownNote'))}</p></div>` : '';
  const drops = det ? `<div class="fiche-section"><h3>${esc(tr('lootBestRates'))}</h3>${lootRowsHtml(det.drops, 'noLootCatalogued')}</div>` : '';
  const tableName = campLootTableName(key);
  const tableRows = tableName ? lootTableItems(tableName) : null;
  const tableHtml = tableRows ? `<div class="fiche-section"><h3>${esc(tr('probableLootTitle'))}</h3>
    <p class="hint">${esc(tr('probableLootNote', tableName))}</p>
    ${lootRowsHtml(tableRows, 'noLootCatalogued')}</div>` : '';
  openFiche(`
    <div class="fiche-head"><div>
      <div class="fiche-kind" style="color:${CAMP_COLORS[g.kind] || '#999'}">${esc(tr('campLabel'))} · ${esc(campKindLabel(g.kind))}</div>
      <h2>${esc(name)}</h2>
      <span class="pop-coords">${esc(tr('spawnPointsCount', g.pts.length))}</span></div></div>
    <div class="fiche-section"><div class="pop-actions">
      ${g.pts.length ? `<button class="act primary" data-act="goto" data-x="${g.pts[0][0]}" data-z="${g.pts[0][1]}" data-label="${esc(name)}" data-cat="camp:${esc(g.kind)}">${esc(tr('viewOnMapBtn'))}</button>` : ''}
      ${g.pts.length ? `<button class="act ghost" data-act="camp-highlight" data-id="${esc(key)}" data-n="${g.pts.length}">${esc(tr('highlightPointsBtn', g.pts.length))}</button>` : ''}
    </div></div>
    ${mobs ? `<div class="fiche-section"><h3>${esc(tr('likelyMonsters', det.mobs.length))}</h3>${mobs}</div>` : faunaUnknown}
    ${drops}
    ${tableHtml}`);
  setFicheHash('camp', key);
}

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
  openFiche(`
    <div class="fiche-head"><div>
      <div class="fiche-kind" style="color:${chestHex(r)}">${esc(chestKindLabel(r))}</div>
      <h2>${esc(name)}</h2></div></div>
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
  openFiche(`
    <div class="fiche-head"><div>
      <div class="fiche-kind" style="color:${CATS.searchable_chest.hex}">${esc(region)}</div>
      <h2>${esc(tr('searchableChestTitle'))}</h2></div></div>
    <div class="fiche-section"><div class="pop-actions">
      ${gotoBtn(r.x, r.z, tr('searchableChestTitle'), 'searchable_chest')}
    </div></div>
    <div class="fiche-section"><p class="hint">${stateChip('dynamic')} ${esc(tr('searchableChestRarityNote'))}</p></div>
    <div class="fiche-section"><h3>${esc(tr('lootBestRates'))}</h3>${drops}</div>`);
  setFicheHash(null);
}

/* Fiche « table de butin » : contenu COMPLET d'une table nommée du client
   (loot.md finding #2 -- lu depuis S.lootTableContents, bundle dédié construit
   directement à partir de loot_tables.json côté pipeline, voir data.js
   lootTableItems ; l'ancienne méthode, qui reconstruisait une table en
   inversant le cache `dropped_in` tronqué de chaque item, rendait les plus
   grosses tables partagées — les 13 tables de coffre de recette
   lt_poi_chest_hidden_*, jusqu'à 582 membres — vides ou incomplètes), triée
   garanti d'abord puis par taux décroissant. Ouverte depuis les libellés de
   table de la fiche item et depuis le butin probable d'un contenant. */
function openLootTableFiche(label) {
  const rows = lootTableItems(label);
  if (!rows) return;
  S.openFiche = { kind: 'loot', id: label };
  const sorted = [...rows].sort((a, b) => (b.g - a.g) || ((b.w ?? 0) - (a.w ?? 0)));
  openFiche(`
    <div class="fiche-head"><div>
      <div class="fiche-kind" style="color:${LOOT_TABLE_HEX}">${esc(tr('lootTableKind'))}</div>
      <h2>${esc(label)}</h2></div></div>
    <div class="fiche-section"><h3>${esc(tr('lootTableItemsN', sorted.length))}</h3>
      ${sorted.length > 30 ? `<input class="stock-filter" type="search" placeholder="${esc(tr('stockFilterPlaceholder'))}">` : ''}
      <div class="fiche-scroll">${lootRowsHtml(sorted, 'noLootCatalogued')}</div></div>`);
  setFicheHash(null);
}

/* Rendu commun d'un taux de drop : quantité ("×N", dès que count>1) suivi de
   soit « Garanti » (uniquement quand `g` est vrai -- un item qui occupe la
   quasi-totalité de la masse pondérée de sa table ; la règle a été durcie,
   un simple poids `w`>=1 NE PROUVE PLUS rien seul -- ~93,6 % des lignes du
   dataset étaient marquées « garanti » à tort avant ce correctif, voir
   data/SCHEMA.md "guaranteed") soit la part APPROXIMATIVE `d.ch` (weight /
   poids total de la table, 0..1, voir data/SCHEMA.md "chance") dans le pool
   -- jamais une probabilité par KILL : le nombre réel de tirages par kill
   vit côté serveur, absent des données client. Un titre (tooltip) explicite
   ce caveat au survol de la pastille. `d.ch` absent (part non calculable) :
   on n'affiche PLUS le poids brut `w` comme un faux pourcentage (c'était le
   bug -- un poids de 1.0 pouvait se lire « 100 % » pour une part réelle de
   l'ordre de 1 %) -- juste la quantité connue, honnêtement. */
function dropChancePctText(ch) {
  const pct = ch * 100;
  if (pct < 1) return tr('dropChanceBelowOne');
  const rounded = pct.toLocaleString(numberLocale(), { maximumFractionDigits: pct < 10 ? 1 : 0 });
  return tr('dropChanceApprox', rounded);
}
function dropRateHtml(d) {
  const countBit = d.c > 1 ? `×${d.c}` : '';
  if (d.g) return `<span class="muted">${esc([countBit, tr('guaranteedLabel')].filter(Boolean).join(' '))}</span>`;
  if (d.ch != null) {
    const pctText = dropChancePctText(d.ch);
    return `<span class="muted" title="${esc(tr('dropChanceCaveat'))}">${esc([countBit, pctText].filter(Boolean).join(' · '))}</span>`;
  }
  return countBit ? `<span class="muted">${esc(countBit)}</span>` : '';
}

/* Ligne de butin commune (fiche monstre/camp) : icône + nom cliquable vers
   la fiche item quand connue + taux (dropRateHtml : ×N/garanti/%). */
function monsterLootRow(d) {
  return dropRow(d.icon ? `icons/${esc(d.icon)}` : null, d.name,
    S.items[d.key] ? 'fiche-item' : null, d.key, dropRateHtml(d), itemGlyph(S.items[d.key]));
}
function lootRowsHtml(list, emptyKey) {
  // Pastille "unknown" (unknown_states_DESIGN.md #9, task #67) : ce repli
  // partagé (monstre/camp/coffre/table) dit "rien de catalogué" -- un vrai
  // trou de couverture connu, jamais un aveu que le jeu n'a pas de butin ici
  // (voir noLootCatalogued/noHarvestCatalogued -- suivi ouvert, pas final).
  if (!list?.length) return `<p class="hint">${stateChip('unknown')} ${esc(tr(emptyKey))}</p>`;
  const guaranteed = list.filter(d => d.g);
  const chance = list.filter(d => !d.g);
  return (guaranteed.length ? `<h4 class="fiche-sub">${esc(tr('guaranteedLabel'))}</h4>${guaranteed.map(monsterLootRow).join('')}` : '')
    + (chance.length ? `<h4 class="fiche-sub">${esc(tr('chanceLabel'))}</h4>${chance.map(monsterLootRow).join('')}` : '');
}

/* Statistiques de monstre — voir data/SCHEMA.md "Monster stats". Seule une
   poignée de groupes (m.stats/m.statsSource === "record", ex. le troll boss
   mbt_10_troll_rusty_boss) a un relevé client réel ; la quasi-totalité des
   autres n'ont AUCUNE stat par-monstre fiable côté client (statsSource null
   OU "partial" — un ou deux codes épars, jamais un bloc complet, voir
   data/SCHEMA.md) : le client ne nomme jamais quel tier de difficulté un mob
   donné utilise en jeu.
   Un ancien rendu affichait ici une grille de nombres "estimés" en
   appliquant la courbe d'UN template de tier représentatif
   (site_meta.json.statTemplates) au niveau du monstre. Une RE a prouvé que
   le champ lu pour construire cette courbe n'est PAS celui qui alimente les
   vraies stats serveur : un boss niv 20 y ressortait à ~544 PV pour une
   vraie valeur serveur ~350 000 (~640× trop bas). Ce chiffre fabriqué est
   donc retiré PURE ET SIMPLEMENT de l'affichage (jamais réutilisé, même si
   le pipeline continue de le publier) : un mob sans relevé "record" montre
   juste son PALIER deviné (guessStatTier — un jugement de meilleur effort,
   jamais une donnée certaine) + son niveau + une note honnête indiquant que
   ses vraies stats sont résolues côté serveur. */
function guessStatTier(m) {
  const hay = [m.family, m.name, ...(m.tags || [])].filter(Boolean).join(' ').toLowerCase();
  if (/mini.?boss/.test(hay)) return 'miniboss';
  if (/\bboss\b/.test(hay)) return 'boss';
  if (/elit/.test(hay)) return 'elit';
  if (/\bhard\b/.test(hay)) return 'hard';
  if (/\beasy\b/.test(hay)) return 'easy';
  return 'medium';
}
function statsGridHtml(stats) {
  const rows = Object.entries(stats).map(([k, v]) =>
    `<div class="stat-row-label">${esc(statLabel(k))}</div><div class="stat-row-value">${esc(String(v))}</div>`).join('');
  return `<div class="stat-grid">${rows}</div>`;
}

/* Fourchette de stats PAR PALIER (fiches.js) — voir data/SCHEMA.md "Monster
   stats" +  Le client ne nomme
   jamais quel palier de difficulté (easy/medium/hard/elit/boss) un mob donné
   utilise en jeu (choix serveur au spawn, sans référence persistée côté
   client). Plutôt que de deviner UN palier (ancien guessStatTier) ou de ne
   rien montrer, on calcule les VRAIS nombres du jeu pour CHAQUE palier au
   niveau du mob — une fourchette honnête — via la formule décodée, dont les
   constantes par palier + de croissance sont publiées dans
   site_meta.json.statFormula (identiques dans les 5 langues, aucun texte
   traduisible). La formule et ses constantes viennent TELLES QUELLES du
   client () ; rien n'est estimé ni ajusté ici — validée
   byte-exact contre les stats_computed des 5 templates de base. */
const PER_TIER_ORDER = ['easy', 'medium', 'hard', 'elit', 'boss'];
const PER_TIER_STATS = ['health', 'armor', 'magic_resist', 'attack_power', 'spell_power'];
function _tierU(g, L) { return g.a * Math.pow(g.r, L + 1) - 1; }
/* Un palier, un niveau -> {health,armor,magic_resist,attack_power,spell_power}.
   Réplique exacte de  (même
   formule fermée que le pipeline utilise pour publier stats_computed) :
   U(L)=a·r^(L+1)-1 ; hp=(Hpb·(1+MHM)·U_hp - sub)·Hpb ;
   armorResist=Base·(1+Mmsm) - U_ar ; apSp=(Base·(1+Mmsm)·U_ap - sub)·Base. */
function computeTierStats(tier, level, sf) {
  const t = sf.tiers[tier], g = sf.growth, L = level - 1;
  const Uhp = _tierU(g.hp, L), Uar = _tierU(g.armorResist, L), Uap = _tierU(g.apSp, L);
  const Mmsm = t.Mmsm ?? 0, MHM = t.MHM ?? 0;
  return {
    health: (t.Hpb * (1 + MHM) * Uhp - g.hp.sub) * t.Hpb,
    armor: t.Armb * (1 + Mmsm) - Uar,
    magic_resist: t.Rsb * (1 + Mmsm) - Uar,
    attack_power: (t.Apb * (1 + Mmsm) * Uap - g.apSp.sub) * t.Apb,
    spell_power: (t.Spb * (1 + Mmsm) * Uap - g.apSp.sub) * t.Spb,
  };
}
/* Nombre de stat calculée : entier (séparateur de milliers localisé) pour les
   grandes valeurs (PV), 1 décimale sinon (armure/résistance/puissances). */
function fmtStatNum(v) {
  return v.toLocaleString(numberLocale(), { maximumFractionDigits: Math.abs(v) >= 100 ? 0 : 1 });
}
/* Grille {stat -> valeur} calculée, arrondie/localisée (stats_computed d'un
   record ou d'un template le cas échéant). */
function computedStatsGridHtml(sc) {
  const rows = PER_TIER_STATS.filter(s => sc[s] != null).map(s =>
    `<div class="stat-row-label">${esc(statLabel(s))}</div><div class="stat-row-value">${esc(fmtStatNum(sc[s]))}</div>`).join('');
  return `<div class="stat-grid">${rows}</div>`;
}
/* Table fourchette : lignes = stats, colonnes = les 5 paliers (libellés
   courts). Enveloppée dans un conteneur défilable horizontalement pour ne
   jamais faire déborder le tiroir de fiche sur mobile. */
/* Colonnes dont la fourchette générique est marquée d'un caveat honnête
   (monsters.md finding #2) : "elit"/"boss" n'ont JAMAIS été vérifiées contre
   une source externe (contrairement à easy/medium/hard, croisées avec une
   fourchette 1500-20000 documentée) -- le pipeline concède lui-même que le
   chiffre communautaire "~350 000 PV" pour un boss niv.20 ne se reproduit
   avec AUCUNE combinaison de ce client, et un vrai boss nommé (voir Finding 1,
   statsSource === 'record' ci-dessous) peut afficher jusqu'à ~4.5× cette
   fourchette générique. Le marqueur "*" + la note ne s'affichent QUE si l'une
   de ces deux colonnes est présente. */
const _UNVERIFIED_TIERS = new Set(['elit', 'boss']);
/* Ligne de provenance REPLIABLE (task #80) : un mob `formula_range` dont le
   groupe m_abs_* sœur porte, EN PLUS de la fourchette calculée ci-dessus, un
   relevé CHIFFRÉ réel indépendant du niveau (démoté depuis
   record_fixed_sibling quand ce même m_abs_* couvre plusieurs niveaux — voir
   data/SCHEMA.md "m_abs_* fixed-stat sibling records") : jamais montré comme
   les stats DE ce mob (exactement l'erreur que l'ancienne courbe rétractée
   commettait), juste un repère honnête, replié par défaut pour ne pas
   concurrencer visuellement la fourchette qui EST la donnée principale ici.
   `fr` = m.statsFixedReading ({src, cbt, stats, levels}) ; `''` si absent. */
function statsFixedProvenanceHtml(fr) {
  if (!fr?.stats?.health) return '';
  const levels = fr.levels || [];
  const lvlText = levels.length > 1 ? `${levels[0]}–${levels[levels.length - 1]}` : (levels[0] != null ? String(levels[0]) : '?');
  return `<details class="fiche-dialogs stats-fixed-details">
    <summary>${esc(tr('statsFixedProvenanceLine', statLabel('health'), fmtStatNum(fr.stats.health)))}</summary>
    <p class="hint">${esc(tr('statsFixedProvenanceDetail', fr.src, fr.cbt, lvlText))}</p>
  </details>`;
}
function perTierStatsSection(level, sf, fixedReading) {
  const tiers = PER_TIER_ORDER.filter(t => sf.tiers[t]);
  if (!tiers.length) return '';
  const hasUnverified = tiers.some(t => _UNVERIFIED_TIERS.has(t));
  const computed = Object.fromEntries(tiers.map(t => [t, computeTierStats(t, level, sf)]));
  const head = `<tr><th scope="col"></th>${tiers.map(t => `<th scope="col">${esc(statTierLabel(t))}${_UNVERIFIED_TIERS.has(t) ? `<span class="tier-caveat-mark" title="${esc(tr('statsBossEliteCaveat'))}">*</span>` : ''}</th>`).join('')}</tr>`;
  const body = PER_TIER_STATS.map(s =>
    `<tr><th scope="row">${esc(statLabel(s))}</th>${tiers.map(t => `<td>${esc(fmtStatNum(computed[t][s]))}</td>`).join('')}</tr>`).join('');
  return `<div class="fiche-section"><h3>${esc(tr('statsTitle'))}<span class="stats-badge estimated">${esc(tr('levelAbbrev', level))}</span></h3>
    <div class="ptr-wrap"><table class="ptr-table"><thead>${head}</thead><tbody>${body}</tbody></table></div>
    <p class="hint">${esc(tr('statsPerTierNote'))}</p>
    ${hasUnverified ? `<p class="hint">${esc(tr('statsBossEliteCaveat'))}</p>` : ''}
    ${statsFixedProvenanceHtml(fixedReading)}</div>`;
}
/* Bloc statistiques de fiche monstre — bascule EXPLICITE sur
   `m.statsProvenance` (task #80, mandatory honest display enum, voir
   data/SCHEMA.md "Monster stats") plutôt que de déduire l'état à partir de
   `statsSource`/`level`/présence de champs comme avant cette passe :
     - record_own    -> badge « réel » (inchangé, un relevé client PROPRE à
                        CE mob : mbt_10_troll_rusty_boss + les bosses
                        d'arène nommés récupérés via m_abs_*).
     - record_fixed_sibling -> NOUVEAU badge « relevé fixe » (state-chip
                        dédié, vocabulaire .state-chip partagé avec
                        dynamic/unknown/dev, voir stateChip()) : les nombres
                        SONT montrés (de vrais octets client, jamais une
                        invention) mais jamais confondus avec un relevé
                        propre au mob -- indépendant de son niveau, non
                        prouvé en jeu pour CETTE variante précise.
     - formula_range -> fourchette par palier inchangée + (nouveau) ligne de
                        provenance repliable quand statsFixedReading
                        accompagne la fourchette (voir
                        statsFixedProvenanceHtml ci-dessus).
     - unknown       -> inchangé : ces 11 groupes n'ont aujourd'hui aucun
                        niveau catalogué, donc retombent déjà sur le
                        chemin 4 (silence honnête) sans branche dédiée. */
function monsterStatsSection(m) {
  // 1. record_own : relevé client RÉEL (mbt_10_troll_rusty_boss + quelques
  //    mobs à bloc complet) : grille numérique + badge « réel » avec
  //    info-bulle explicite.
  if (m.statsProvenance === 'record_own' && m.stats && Object.keys(m.stats).length) {
    return `<div class="fiche-section"><h3>${esc(tr('statsTitle'))}<span class="stats-badge" title="${esc(tr('realStatsTooltip'))}">${esc(tr('realStatsBadge'))}</span></h3>${statsGridHtml(m.stats)}</div>`;
  }
  // 1-bis. Mob portant DIRECTEMENT des stats calculées par la formule (palier
  //    résolu côté données — dormant aujourd'hui, aucun mob non-template n'en
  //    a, mais honoré si un décodage futur en publie) : grille + badge
  //    « calculé (formule du jeu) ».
  if (m.statsComputed) {
    return `<div class="fiche-section"><h3>${esc(tr('statsTitle'))}<span class="stats-badge">${esc(tr('computedStatsBadge'))}</span></h3>${computedStatsGridHtml(m.statsComputed)}</div>`;
  }
  // 2. record_fixed_sibling : relevé fixe (arène/CBT) — le template m_abs_*
  //    sœur porte un bloc de stats RÉEL, mais partagé et indépendant du
  //    niveau ; état chip dédié, jamais le badge « réel » ci-dessus.
  if (m.statsProvenance === 'record_fixed_sibling' && m.stats && Object.keys(m.stats).length) {
    return `<div class="fiche-section"><h3>${esc(tr('statsTitle'))}${stateChip('fixed')}</h3>${statsGridHtml(m.stats)}</div>`;
  }
  // 3. formula_range : fourchette par palier (les vrais nombres du jeu pour
  //    chaque palier à ce niveau) + provenance repliable optionnelle.
  const sf = S.meta?.statFormula;
  if (m.statsProvenance === 'formula_range' && m.level != null && sf?.tiers && sf?.growth) {
    return perTierStatsSection(m.level, sf, m.statsFixedReading);
  }
  // 4. unknown (toujours sans niveau côté données actuelles) + tout résidu
  //    (ex. formule non chargée -- panne réseau ponctuelle) : jamais de
  //    palier deviné fabriqué pour un mob SANS niveau ; avec niveau mais sans
  //    formule chargée, repli honnête palier deviné + note serveur (comme
  //    avant cette passe).
  if (m.level == null) return '';
  const tier = guessStatTier(m);
  const tierLine = [tr('levelAbbrev', m.level), statTierLabel(tier)].filter(Boolean).join(' · ');
  return `<div class="fiche-section"><h3>${esc(tr('statsTitle'))}<span class="stats-badge estimated">${esc(tierLine)}</span></h3>
    <p class="hint">${esc(tr('statsServerNote'))}</p></div>`;
}

/* ── Plages de jet (stat_ranges/weapon_dps), formules de dégâts
   (artifact_formula/formula) et mise à l'échelle rune/puce (rarity_scaling/
   tier_scaling) — voir  +
   , tmp/convergence/port_map.md #8/#9/#10. Net-new :
   zéro fiche de référence à porter, juste les 3 handoffs + le contrat de
   champs déjà validé en Phase 0. Toutes les valeurs numériques ci-dessous
   viennent TELLES QUELLES du client (tables Tears/FloatTable/formule
   d'ability) ; rien n'est jamais estimé ou deviné ici (contrairement à
   monsterStatsSection ci-dessus, qui a un mode "estimé" explicite — il n'y a
   pas d'équivalent pour ces données, un champ absent reste absent). */
const RARITY_BANDS = ['common', 'uncommon', 'rare', 'epic'];
const bandRarityLabel = r => rarityLabel(capitalize(r)) || r;
const bandRarityHex = r => RARITY[capitalize(r)]?.hex || 'var(--muted)';

/* Nombre générique (coefficients de formule, rarity_scaling/tier_scaling) :
   au plus 4 décimales, jamais de zéro de remplissage inventé -- la précision
   affichée est celle des données, pas une convention arbitraire. */
function fmtNum(n) {
  if (n == null) return '?';
  return n.toLocaleString(numberLocale(), { maximumFractionDigits: 4 });
}
/* Nombre de plage de jet (min/max de stat_ranges/weapon_dps) : le pas
   d'arrondi serveur (`round`) dicte la précision -- round=1 -> entier,
   round=0.05 -> 2 décimales -- pour ne jamais afficher de faux zéros de
   précision (10.000000004) ni sur-arrondir un pas fin. */
function fmtRollNum(n, round) {
  if (n == null) return '?';
  let decimals = 0;
  if (round > 0 && round < 1) decimals = Math.min(2, Math.max(1, Math.ceil(-Math.log10(round))));
  return n.toLocaleString(numberLocale(), { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
/* Une bande {min,max,round} -> texte : valeur unique si min===max (arme à
   pas nul, ex. flat_phys_penetration toujours 20), sinon "min–max". */
function bandText(band) {
  if (!band) return null;
  const lo = fmtRollNum(band.min, band.round), hi = fmtRollNum(band.max, band.round);
  return band.min === band.max ? lo : `${lo}–${hi}`;
}
/* Lignes de grille (stat-grid) pour UNE stat à travers ses tiers : le tier
   de l'ITEM (déjà affiché en en-tête de fiche) filtre à une seule ligne
   quand il est connu ; à défaut (~9/158 items sans tier résolu, cf. audit
   Phase 4), on montre tous les tiers présents, étiquetés "(T1)"/"(T2)"/"(T3)"
   plutôt que d'en deviner un seul. */
function tieredStatRows(label, tiersObj, tier, rarity) {
  const tierKeys = (tier && tiersObj[tier]) ? [tier] : Object.keys(tiersObj).sort();
  return tierKeys.map(tk => {
    const band = tiersObj[tk][rarity] || tiersObj[tk].common;
    const txt = bandText(band);
    if (txt == null) return '';
    const rowLabel = tierKeys.length > 1 ? `${label} (${tk})` : label;
    return `<div class="stat-row-label">${esc(rowLabel)}</div><div class="stat-row-value">${esc(txt)}</div>`;
  }).join('');
}

/* Sélecteur de rareté ACTIVE pour la plage de jet -- même composant visuel
   que le sélecteur de VARIANTE (#6, rar-select/rar-pills/rar-pill), mais un
   mécanisme différent : ici une seule clé d'item, 4 bandes de jet par
   rareté ; là-bas, 4 clés d'item séparées. Les deux ne se recoupent jamais
   dans les données (aucun item avec stat_ranges/weapon_dps ne porte de
   suffixe de rareté de clé -- vérifié), donc aucun risque d'afficher deux
   sélecteurs "Rareté" empilés sur la même fiche. État mémorisé par clé
   d'item (pas dans S -- éphémère comme currentGoalZones/goalZoneLayer plus
   haut) : ré-ouvrir la MÊME fiche garde la rareté choisie (retour de
   loadDeferred, changement de langue...), ouvrir une AUTRE fiche repart de
   "common". */
let rollRarityState = { key: null, rarity: 'common' };
function activeRollRarity(key) {
  if (rollRarityState.key !== key) rollRarityState = { key, rarity: 'common' };
  return rollRarityState.rarity;
}
function setRollRarity(key, rarity) {
  rollRarityState = { key, rarity };
  openItemFiche(key);
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
function rollRarityPickHtml(key, active) {
  const pills = RARITY_BANDS.map(r => pillHtml({
    active: r === active, hex: bandRarityHex(r), label: bandRarityLabel(r),
    act: 'roll-rarity', id: key, extra: ` data-r="${r}"`,
  })).join('');
  return pillSelectHtml('rarityVariantsLabel', pills);
}
/* DPS dérivé (arme uniquement) : produit des BORNES au même tier/rareté
   (min×min, max×max) -- borne exacte du produit de deux quantités positives
   indépendantes, pas une estimation approximative. Seulement quand le tier
   est résolu (pas de mélange de tiers différents dans un même produit,
   contrairement à tieredStatRows qui accepte d'empiler plusieurs tiers pour
   UNE stat isolée). */
function derivedDpsRow(wd, tier, rarity) {
  if (!tier || !wd.attack_speed?.[tier] || !wd.weapon_damage?.[tier]) return '';
  const asBand = wd.attack_speed[tier][rarity] || wd.attack_speed[tier].common;
  const dmgBand = wd.weapon_damage[tier][rarity] || wd.weapon_damage[tier].common;
  if (!asBand || !dmgBand) return '';
  const lo = Math.round(asBand.min * dmgBand.min * 100) / 100;
  const hi = Math.round(asBand.max * dmgBand.max * 100) / 100;
  const txt = lo === hi ? fmtNum(lo) : `${fmtNum(lo)}–${fmtNum(hi)}`;
  return `<div class="stat-row-label">${esc(tr('weaponDpsDerived'))}</div><div class="stat-row-value">${esc(txt)}</div>`;
}
/* Groupe de lignes de plage de jet pour un SOUS-ENSEMBLE de stat_ranges
   (sids) -- sous-titre optionnel + note optionnelle (hint), sinon même rendu
   `stat-grid` que l'ancien bloc plat. Renvoie '' si aucune des sids ne
   produit de ligne (bandes toutes absentes pour la rareté active). */
function rollGroupBlock(titleKey, hintHtml, sids, sr, tier, rarity) {
  const rows = sids.map(sid => tieredStatRows(statLabel(sid), sr[sid], tier, rarity)).join('');
  if (!rows) return '';
  return `${titleKey ? `<h4 class="fiche-sub">${esc(tr(titleKey))}</h4>` : ''}${hintHtml || ''}<div class="stat-grid">${rows}</div>`;
}
/* Plages de jet + DPS d'arme (item.stat_ranges/weapon_dps, port_map.md #8) :
   UN sélecteur de rareté partagé (jamais deux, même si l'item a les deux
   champs -- voir rollRarityPickHtml ci-dessus), un h3 dont le libellé
   s'adapte à ce qui existe réellement (stat_ranges seul -> "Plage de jet" ;
   weapon_dps seul -> "DPS d'arme" ; les deux -> "Plage de jet" en-tête +
   "DPS d'arme" en sous-titre) -- jamais un h3 générique qui ne correspond à
   rien pour ~62 items qui n'ont QUE weapon_dps.

   Structure RÉELLE des artefacts (audit data-accuracy, items.md #1) : un
   artefact ne roule JAMAIS ses ~20-23 stats de stat_ranges toutes à la fois
   -- 1 stat PRINCIPALE garantie + jusqu'à N stats SECONDAIRES tirées d'un
   pool partagé (roll_types: main|secondary|weapon, déjà décodé/livré côté
   données mais jamais lu ici avant ce correctif -- voir roll_sources pour le
   nombre réel de slots secondaires, comptés dynamiquement plutôt que codés
   en dur : toujours 3 aujourd'hui sur les 121 artefacts vérifiés, mais rien
   ne garantit que ça reste vrai pour un futur item). Un item qui n'a que des
   stats `roll_types:"weapon"` (armes -- toujours un flat_phys_penetration
   figé) ou pas de roll_types du tout retombe sur l'ancien rendu plat, sans
   grouper ni supposer un mécanisme qu'on n'a pas vérifié pour lui. */
function rollRangeSection(it, key) {
  const sr = it.stat_ranges, wd = it.weapon_dps;
  if (!sr && !wd) return '';
  const tier = it.tier || it.weapon?.tier || null;
  const rarity = activeRollRarity(key);
  let genericBlock = '';
  if (sr) {
    const rollTypes = it.roll_types || {};
    const sids = Object.keys(sr);
    const mainSids = sids.filter(sid => rollTypes[sid] === 'main');
    const secSids = sids.filter(sid => rollTypes[sid] === 'secondary');
    const otherSids = sids.filter(sid => rollTypes[sid] !== 'main' && rollTypes[sid] !== 'secondary');
    if (mainSids.length && secSids.length) {
      // Nombre réel de slots secondaires (roll_sources : 1 entrée "main" +
      // N entrées "SecondaryStats" -- voir docstring ci-dessus) ; à défaut
      // (donnée absente), on n'affirme aucun compte plutôt que d'en inventer un.
      const secSlots = (it.roll_sources || []).filter(s => /SecondaryStats/i.test(s.type || '')).length;
      const secHint = `<p class="hint">${esc(secSlots ? tr('rollSecondaryHintN', secSlots, secSids.length) : tr('rollSecondaryHint'))}</p>`;
      genericBlock = rollGroupBlock('rollMainStatTitle', '', mainSids, sr, tier, rarity)
        + rollGroupBlock('rollSecondaryStatsTitle', secHint, secSids, sr, tier, rarity)
        + rollGroupBlock(null, '', otherSids, sr, tier, rarity);
    } else {
      // Repli honnête : pas de distinction main/secondaire connue pour cet
      // item (armes roll_types:"weapon", ou roll_types absent) -- même rendu
      // plat qu'avant, jamais de groupe fabriqué sans preuve.
      genericBlock = rollGroupBlock(null, '', sids, sr, tier, rarity);
    }
  }
  let dpsRows = '';
  if (wd) {
    const asRows = wd.attack_speed ? tieredStatRows(statLabel('attack_speed'), wd.attack_speed, tier, rarity) : '';
    const dmgRows = wd.weapon_damage ? tieredStatRows(statLabel('weapon_damage'), wd.weapon_damage, tier, rarity) : '';
    dpsRows = asRows + dmgRows + derivedDpsRow(wd, tier, rarity);
  }
  if (!genericBlock && !dpsRows) return '';
  const title = genericBlock ? tr('rollRangeTitle') : tr('weaponDpsTitle');
  const dpsBlock = dpsRows
    ? (genericBlock ? `<h4 class="fiche-sub">${esc(tr('weaponDpsTitle'))}</h4><div class="stat-grid">${dpsRows}</div>` : `<div class="stat-grid">${dpsRows}</div>`)
    : '';
  return `<div class="fiche-section"><h3>${esc(title)}</h3>${rollRarityPickHtml(key, rarity)}${genericBlock}${dpsBlock}</div>`;
}

/* Formules de dégâts (item.artifact_formula / ability.formula, port_map.md
   #9) : base + Σ coeff × libellé-stat RECONSTRUITS et LOCALISÉS côté client
   -- jamais le "human"/stat_name anglais figé du pipeline affiché tel quel
   (voir formulaTermLabel, js/config.js). Un "rôle" nommé (ADF/DMG/Scale…)
   est un résultat numérique DISTINCT du même enregistrement (coup initial
   vs tic de DoT...), pas un sous-terme d'une même formule -- dédupliqué à
   l'affichage quand deux rôles rendent EXACTEMENT le même texte (cas réel :
   art_t3_guardians_wrath, ADF===ADF2). `ranks` (capacité à montée en rang) :
   une ligne par rang, même logique de dédup à l'intérieur de chaque rang. */
function exprHuman(expr) {
  const terms = expr.terms || [];
  const parts = [];
  if (expr.base || !terms.length) parts.push(fmtNum(expr.base || 0));
  for (const t of terms) {
    const coeff = t.coeff != null ? fmtNum(t.coeff) : '?';
    parts.push(`${coeff} × ${formulaTermLabel(t)}`);
  }
  return parts.join(' + ') || fmtNum(expr.base || 0);
}
function formulaRoleEntries(formula) {
  const roles = formula.roles && Object.keys(formula.roles).length
    ? Object.entries(formula.roles).map(([name, expr]) => ({ name, expr }))
    : (formula.terms || formula.human != null) ? [{ name: formula.element_name || null, expr: formula }] : [];
  const byText = new Map();
  for (const { name, expr } of roles) {
    const text = exprHuman(expr);
    let e = byText.get(text);
    if (!e) byText.set(text, e = { names: [], text, hasExternal: !!(expr.externals?.length) });
    if (name) e.names.push(name);
  }
  const multi = roles.length > 1;
  return [...byText.values()].map(e => ({ tag: multi && e.names.length ? e.names.join(' · ') : null, text: e.text, hasExternal: e.hasExternal }));
}
/* [{tag, text, hasExternal}] -- ranks aplatis avec un préfixe de rang
   composé ("Rang 1 · DMG") quand la capacité a ses propres rôles nommés ET
   des rangs, sans jamais imbriquer une 2e couche de rangs (le format ne le
   permet pas -- voir  */
function formulaEntries(formula) {
  if (formula.ranks?.length) {
    return formula.ranks.flatMap(r => {
      const rankTag = tr('formulaRankLabel', r.rank);
      return formulaRoleEntries(r).map(e => ({
        tag: e.tag ? `${rankTag} · ${e.tag}` : rankTag, text: e.text, hasExternal: e.hasExternal,
      }));
    });
  }
  return formulaRoleEntries(formula);
}
/* `rarityNote` (item artefact uniquement -- jamais pour une capacité, qui
   n'a pas de notion de rareté) : les 7 formules d'artefact décodées sont
   RARITY-FLAT (une seule formule fixe, jamais répétée par rareté -- vérifié
   byte-exact, voir  "honest gaps"). Un éventuel
   bonus lié à la rareté existe peut-être en jeu mais n'est tout simplement
   pas dans ces données -- jamais fabriqué ici, juste signalé une fois. */
function formulaHtml(formula, { rarityNote = false } = {}) {
  const entries = formulaEntries(formula);
  if (!entries.length) return '';
  const lines = entries.map(e => `<p class="formula-line">${e.tag ? `<span class="formula-role">${esc(e.tag)}</span>` : ''}${esc(e.text)}${
    e.hasExternal ? ` <span class="formula-partial" title="${esc(tr('formulaPartialNote'))}">†</span>` : ''
  }</p>`).join('');
  // Pastille "unknown" (unknown_states_DESIGN.md #12/re-check #2, task #67) :
  // ce n'est PAS un fait serveur confirmé -- data/SCHEMA.md lui-même ne peut
  // pas trancher entre mise à l'échelle côté serveur et une autre règle du
  // jeu (voir le mot i18n reformulé qui a retiré l'implication "probablement
  // côté serveur").
  const note = rarityNote ? `<p class="hint">${stateChip('unknown')} ${esc(tr('scalingServerSide'))}</p>` : '';
  return `<div class="fiche-section"><h3>${esc(tr('formulaTitle'))}</h3>${lines}${note}</div>`;
}

/* "Use effect" section (item_desc_PLAN.md Phase B) : it.useEffect[] est une
   jointure FAITE AU BUILD (item.abilities[] -> abilities.json, voir
    -- rien
   n'est résolu ici côté client, seulement mis en forme. Chaque entrée porte
   déjà `resolvedDesc` (le texte localisé, chaque {{Data.N.<code>}} résolu via
   le params_raw propre à CETTE capacité substitué en clair, et un sentinel de
   contrôle \x01N\x01 à la place de tout token que ce build ne sait pas
   résoudre honnêtement) + `unresolved[]` (le {token, kind} réel derrière
   chaque sentinel) + une éventuelle `formula` déjà décodée.

   EXIGENCE FERME (override du manager, pas une nuance de style) : un token
   non résolu ne s'affiche JAMAIS en `{{chemin.brut}}` dans la phrase -- une
   petite pastille "?" cliquable-au-survol le remplace, avec le chemin brut
   réservé au `title` (pour qui veut creuser), et des styles bien distincts
   selon la nature du trou :
   - kind "runtime"     : valeur calculée EN JEU par nature (ShieldValue,
     CurrentStack) -- jamais un chiffre statique, même avec plus de RE.
   - kind "unextracted" : valeur réelle mais pas encore sortie des données
     client.
   Depuis la Phase C (décodage Modifiers/TotalTime, doc interne de décodage), deux kinds SUBSTITUÉS s'ajoutent -- du vrai contenu décodé en ligne,
   pas des trous :
   - kind "base"    : u.value est le chiffre exact pour un personnage de
     base (la formule complète, ex 0.035×(1+A_Reg+), reste dans le title --
     elle varie avec les stats du joueur).
   - kind "formula" : aucun chiffre statique n'existe (la valeur dépend des
     stats du porteur) -- u.formula, l'expression réellement décodée
     (ex 0.001×Hpm + 15), s'affiche en ligne, jamais un chiffre inventé. */
const _EFFECT_SENTINEL_RE = /\x01(\d+)\x01/g;

function effectVarChip(u) {
  if (!u) return '';
  if (u.kind === 'base') {
    const title = u.formula ? `${tr('effectVarBaseTooltip')} — ${u.formula}` : tr('effectVarBaseTooltip');
    return `<span class="effect-var-inline effect-var-base" title="${esc(title)}">${esc(fmtNum(u.value))}</span>`;
  }
  if (u.kind === 'formula') {
    return `<span class="effect-var-inline effect-var-formula" title="${esc(`${tr('effectVarFormulaTooltip')} — ${u.token}`)}">${esc(u.formula)}</span>`;
  }
  const runtime = u.kind === 'runtime';
  const cls = runtime ? 'effect-var effect-var-runtime' : 'effect-var effect-var-unknown';
  const label = runtime ? tr('effectVarRuntimeTooltip') : tr('effectVarUnextractedTooltip');
  return `<span class="${cls}" title="${esc(`${label} — ${u.token}`)}">?</span>`;
}

/* Texte résolu -> HTML : découpe sur les sentinels \x01N\x01, échappe et
   convertit \n -> <br> chaque fragment littéral, insère la pastille chip à
   la place de chaque sentinel (jamais le sentinel brut, jamais le {{token}}
   d'origine). */
function effectResolvedTextHtml(ability) {
  if (ability.resolvedDesc == null) return '';
  const unresolved = ability.unresolved || [];
  const text = ability.resolvedDesc;
  let out = '', last = 0, m;
  _EFFECT_SENTINEL_RE.lastIndex = 0;
  while ((m = _EFFECT_SENTINEL_RE.exec(text))) {
    out += esc(text.slice(last, m.index)).replace(/\n/g, '<br>');
    out += effectVarChip(unresolved[+m[1]]);
    last = _EFFECT_SENTINEL_RE.lastIndex;
  }
  out += esc(text.slice(last)).replace(/\n/g, '<br>');
  return out;
}

function useEffectSection(it) {
  const list = it.useEffect;
  if (!list?.length) return '';
  const blocks = list.map(a => {
    const formulaBlock = a.formula ? formulaHtml(a.formula) : '';
    const textHtml = effectResolvedTextHtml(a);
    const textBlock = textHtml ? `<p class="use-effect-text">${textHtml}</p>` : '';
    return formulaBlock + textBlock;
  }).join('');
  if (!blocks) return '';
  return `<div class="fiche-section"><h3>${esc(tr('useEffectTitle'))}</h3>${blocks}</div>`;
}

/* Mise à l'échelle rune (rarity_scaling, 13/24 runes actives décodées) et
   puce (tier_scaling, 1/71 seulement -- combo_crusher) : port_map.md #10.
   EXIGENCE FERME (pas une nuance de style) : un statut "no_template" montre
   une note honnête, jamais une case vide ni un zéro ; une puce ne montre
   JAMAIS "aucune mise à l'échelle" par défaut -- soit ses vraies valeurs de
   tier (toujours accompagnées du rappel "par tier, pas par rareté"), soit
   rien du tout si ni le champ ni le statut n'existent (70/71 puces, faute
   de couverture de ce passage de décodage -- pas la même chose qu'une puce
   confirmée sans mise à l'échelle). */
function scalingSection(it) {
  const parts = [];
  if (it.rarity_scaling) {
    const cols = Object.entries(it.rarity_scaling);
    const multiCol = cols.length > 1;
    const rows = cols.flatMap(([col, byRarity]) => RARITY_BANDS.map(r => {
      const v = byRarity[r];
      if (v == null) return '';
      const label = multiCol ? `${bandRarityLabel(r)} (${col})` : bandRarityLabel(r);
      return `<div class="stat-row-label">${esc(label)}</div><div class="stat-row-value">${esc(fmtNum(v))}</div>`;
    })).join('');
    if (rows) parts.push(`<div class="fiche-section"><h3>${esc(tr('rarityScalingTitle'))}</h3><div class="stat-grid">${rows}</div></div>`);
  } else if (it.rarity_scaling_status === 'no_template') {
    // Pastille "unknown" (unknown_states_DESIGN.md #13, task #67) : contenu
    // déjà correct, juste enveloppé dans le composant d'état partagé.
    parts.push(`<div class="fiche-section"><h3>${esc(tr('rarityScalingTitle'))}</h3><p class="hint">${stateChip('unknown')} ${esc(tr('scalingNotLocated'))}</p></div>`);
  }
  if (it.tier_scaling) {
    const rows = ['t1', 't2', 't3'].map(tk => {
      const v = it.tier_scaling[tk];
      if (v == null) return '';
      return `<div class="stat-row-label">${esc(tk.toUpperCase())}</div><div class="stat-row-value">${esc(fmtNum(v))}</div>`;
    }).join('');
    if (rows) parts.push(`<div class="fiche-section"><h3>${esc(tr('tierScalingTitle'))}</h3><div class="stat-grid">${rows}</div><p class="hint">${esc(tr('tierNotRarity'))}</p></div>`);
  }
  return parts.join('');
}

/* ── Espèce de monstre + sélecteur de niveau/variante (task #80, monster-
   model overhaul part 2 -- remplace l'ancien sélecteur par MODÈLE, feature
   #12) ─────
   Une créature (« espèce », site/data/<lang>/species.bin) se décline souvent
   en plusieurs niveaux/spawns — jusqu'à 917 groupes bruts au total dans
   monsters.bin pour ~224 espèces — qui affichaient jusqu'ici UNE FICHE PAR
   GROUPE, sans lien entre elles. openMonsterFiche(key) prend toujours une clé
   de groupe précise (compat totale avec tous les appelants existants :
   recherche, bestiaire, camps, quêtes, lien profond `mon=`) mais affiche
   désormais la fiche de l'ESPÈCE entière avec un sélecteur pour changer de
   niveau/variante sans revenir à la recherche.

   L'espèce est un cran plus large qu'un MODÈLE (monster_models.json, encore
   utilisé ailleurs -- voir js/search.js) : "Troll"/"Mighty Troll"/"Overweight
   Troll" sont 3 modèles DIFFÉRENTS (CamelCase-glué, voir data/SCHEMA.md
   "Known limitation") qu'un sélecteur par modèle ne réunissait jamais, alors
   qu'ils désignent la MÊME créature aux yeux du joueur -- la bonne raison de
   ce changement d'axe (raw cosmetic counts polish, task #80).

   speciesVariantSpawns ne fait PAS confiance à species.spawns seul (même
   discipline que l'ancien monsterModelVariants vis-à-vis de
   monster_models.levels) : la source de vérité reste TOUJOURS S.monsters
   filtré par `m.species` (garanti présent sur chaque groupe, chargé QUOI
   QU'IL ARRIVE dès que monsters.bin l'est) -- species.bin lui-même ne sert
   qu'à comparer les noms (distinctName ci-dessous) et, ailleurs, à fournir
   `canonicalSiteKey`/`namesAll` ; un species.bin absent/404 dégrade donc en
   douceur (liste de pastilles intacte, juste sans le nom distinctif en plus
   du niveau), jamais un sélecteur vide. */
function speciesVariantSpawns(spId, activeKey) {
  const out = [];
  for (const [key, mm] of Object.entries(S.monsters)) {
    if (mm.species !== spId) continue;
    // Contenu dev (feature #13) : une variante isTest reste masquée DE LA
    // LISTE des pastilles sauf si S.devOn est vrai OU qu'elle est la
    // variante ACTIVEMENT affichée (jamais masquer ce qu'on montre déjà,
    // même via un lien profond partagé avant tout clic sur le tag « Contenu
    // dev » — voir js/devcontent.js isHiddenTest).
    if (key !== activeKey && isHiddenTest(mm)) continue;
    out.push({ key, m: mm });
  }
  out.sort((a, b) => (a.m.level ?? 99) - (b.m.level ?? 99) || a.key.localeCompare(b.key));
  return out;
}
/* Sélecteur -- même composant visuel que le sélecteur de rareté (#6,
   rar-select/rar-pills/rar-pill, voir rollRarityPickHtml/rarity.js), mais
   l'axe n'est pas la rareté : neutre (MONSTER_HEX partout, pas de code
   couleur par pastille — il n'y a pas d'équivalent rareté ici). Une seule
   variante -> aucun sélecteur (rien à choisir). Deux variantes qui partagent
   EXACTEMENT le même niveau (reskins, ex. trollfat vert/jaune) affichent
   chacune leur propre nom en plus du niveau pour rester distinguables (sinon
   deux pastilles identiques "niv 20" côte à côte, illisible) ; marqueur
   "dev" (feature #13) sur les variantes isTest visibles. `species` (repli
   optionnel, voir doc ci-dessus) : `null`/sans `.name` -> distinctName
   toujours null, pastilles réduites au seul niveau (repli honnête, jamais un
   sélecteur vide). */
function monsterVariantPickHtml(activeKey, variants, species) {
  if (variants.length < 2) return '';
  const pills = variants.map(({ key, m }) => {
    const lvl = m.level != null ? tr('levelAbbrev', m.level) : null;
    const distinctName = species?.name && fold(m.name) !== fold(species.name) ? m.name : null;
    const label = [lvl, distinctName].filter(Boolean).join(' · ') || pretty(key);
    const devMark = m.isTest ? `<span class="dev-mark" title="${esc(tr('devBadgeTitle'))}">${esc(tr('devBadge'))}</span>` : '';
    return pillHtml({ active: key === activeKey, hex: MONSTER_HEX, label, act: 'fiche-monster', id: key, mark: devMark });
  }).join('');
  return pillSelectHtml('monsterVariantsLabel', pills);
}

/* Fiche monstre : niveau/famille/type d'attaque, tags lisibles, butin AU KILL
   (taux garanti/×N/%, item cliquable -> fiche item, même rendu que
   openCampFiche/openItemFiche ci-dessus) SÉPARÉ du butin de DÉPEÇAGE
   (harvestLoot — une stratégie de butin distincte, ce que rapporte le fait
   de dépecer/récolter le cadavre, pas ce qui tombe à la mort ; harvestMethod
   = l'outil/métier de dépeçage, ex. "Flayer" -> "Boucherie"), capacités (nom
   réel ou repli prettifié — la plupart des capacités de monstre n'ont aucune
   localisation dans le client), et camps où il apparaît (bouton carte vers
   le camp). Butin/capacités/camps viennent TELS QUELS du catalogue — un
   monstre sans butin catalogué l'affiche honnêtement plutôt que de ne rien
   montrer ou d'inventer un lien. */
function openMonsterFiche(key) {
  const m = S.monsters[key];
  if (!m) return;
  S.openFiche = { kind: 'monster', id: key };
  // Espèce + sélecteur de niveau/variante (task #80, voir
  // speciesVariantSpawns/monsterVariantPickHtml ci-dessus) : `key` reste la
  // variante ACTIVEMENT affichée (tout le corps de la fiche ci-dessous décrit
  // TOUJOURS `m`, jamais l'espèce abstraite), le sélecteur ne fait que
  // proposer les autres niveaux/variantes de la même espèce.
  const spId = m.species || key;
  const species = S.species[spId] || null;
  const variantSelectHtml = monsterVariantPickHtml(key, speciesVariantSpawns(spId, key), species);
  const icon = m.icon ? `icons/${m.icon}` : null;
  // Zone(s) où ce monstre apparaît : champ `m.zones` cuit dans les données
  // (build_site_data.py::_monster_zone_names — croisement camps ⨯ régions,
  // hors zone attrape-tout « Restricted Area » qui couvrait 82% de la carte).
  // Remplace l'ancien monsterZones() côté client (buggé : Restricted Area
  // partout). Préfixée d'un 📍 : un nom de ZONE du jeu se lisait avant comme
  // un statut du monstre plutôt qu'un lieu (le nom est déjà localisé côté
  // données, aucune traduction supplémentaire requise).
  const zones = m.zones || [];
  const zoneTxt = zones.length > 2 ? tr('bestiaryZonesN', zones.length) : zones.join(' · ');
  const kindBits = [m.family ? pretty(m.family) : null, m.level != null ? tr('levelAbbrev', m.level) : null,
    m.attack ? monsterAttackLabel(m.attack) : null, zoneTxt ? `📍 ${zoneTxt}` : null].filter(Boolean);
  // Affordance « Voir la zone » : dessine le(s) polygone(s) de région sur la
  // carte (zones_geo, propre à Kwalat) — n'apparaît que quand au moins une des
  // zones du mob correspond à un polygone chargé (sinon rien à dessiner, ex.
  // sur une autre carte où S.zonesGeo est vide).
  const zoneDrawable = zones.length && (S.zonesGeo || []).some(z => zones.some(n => fold(n) === fold(z.name)));
  const zoneBtnHtml = zoneDrawable
    ? `<div class="fiche-section"><div class="pop-actions"><button class="goto" data-act="monster-zone" data-id="${esc(key)}">${GOTO_ICON}<span>${esc(tr('viewZoneBtn'))}</span></button></div></div>`
    : '';
  // Contenu dev (feature #13) : marqueur explicite quand la variante
  // ACTIVEMENT affichée est isTest (toujours ouvrable par lien profond direct,
  // voir speciesVariantSpawns -- jamais un 404 silencieux, juste marqué).
  const devMark = m.isTest ? `<span class="dev-mark" title="${esc(tr('devBadgeTitle'))}">${esc(tr('devBadge'))}</span>` : '';
  const kindLine = kindBits.join(' · ') || tr('monsterLabel');
  // Compte de clés brutes/cosmétiques repliées dans CE groupe (name,level) --
  // task #80 polish : vivait avant dans le fil de kindLine ci-dessus
  // (`variantsNote`, coloré comme une info de premier plan) ; c'est une
  // provenance technique ("ce spawn recouvre 40 skins identiques"), pas un
  // fait de gameplay -- déplacé en ligne muette dédiée, sous le sélecteur de
  // variante (jamais affiché s'il n'y a rien à replier, m.variants ≤ 1).
  const rawRecordsHtml = m.variants > 1 ? `<p class="hint variant-rawrecords">${esc(tr('rawRecordsNote', m.variants))}</p>` : '';
  // Jointure camp -> vrai nuage de points + bouton "voir tous les spawns"
  // (monsterCampsHtml ci-dessous, réutilise farmCampRow/farmUnjoinedRow/
  // allCampGroupsFlat de farmSectionHtml -- "où sont les imps bleus ?" doit
  // dessiner l'union réelle de tous les camps du monstre, jamais une poignée
  // de points). Pastille "unknown" (unknown_states_DESIGN.md #10, task #67)
  // toujours au même endroit quand m.camps est vide -- comportement inchangé.
  // PLACEMENT (manager feedback, task #80/#79) : c'est l'info que le joueur
  // vient chercher en premier depuis une quête ("où farmer ça ?") -- montée
  // tout en haut de la fiche, juste après l'identité/zone/sélecteur de
  // variante et AVANT stats/butin/capacités, y compris quand la réponse est
  // honnêtement "inconnu" (le joueur a sa réponse immédiatement, sans
  // scroller au travers de sections qui ne l'intéressent pas encore).
  const campsHtml = monsterCampsHtml(m);
  const tagsHtml = m.tags?.length
    ? `<div class="fiche-section reward-chips">${m.tags.map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>` : '';
  const statsHtml = monsterStatsSection(m);

  // Séparer le VRAI butin de kill des entrées de tables de récompense
  // agrégées (recettes « *_unlocked », Champions Tribute…) qui noyaient la
  // liste — repliées dans un volet dédié, jamais supprimées.
  const isRewardRow = d => /_unlocked$/i.test(d.key || '') || /tribute/i.test(d.name || '');
  const mainLoot = (m.loot || []).filter(d => !isRewardRow(d));
  const rewardLoot = (m.loot || []).filter(isRewardRow);
  const lootHtml = `<div class="fiche-section"><h3>${esc(tr('dropRatesTitle'))}</h3>${lootRowsHtml(mainLoot, 'noLootCatalogued')}
    ${rewardLoot.length ? `<details class="fiche-dialogs"><summary>${esc(tr('rewardTablesN', rewardLoot.length))}</summary>${lootRowsHtml(rewardLoot, 'noLootCatalogued')}</details>` : ''}</div>`;
  const harvestHtml = (m.harvestLoot?.length || m.harvestMethod)
    ? `<div class="fiche-section"><h3>${esc(tr('harvestTitle'))}${m.harvestMethod ? ' · ' + esc(harvestMethodLabel(m.harvestMethod)) : ''}</h3>${lootRowsHtml(m.harvestLoot, 'noHarvestCatalogued')}</div>`
    : '';

  // Quest items this monster drops (monster<->quest-item link follow-up,
  // task 1/4): baked at build time (build_site_data.py::monsters_site(),
  // inverting build_catalog()'s own item->quest quest_source_of index) --
  // ONLY resolver-produced "kill" links, never name-inferred, so this
  // section simply doesn't exist for a monster with no such link (never an
  // empty fabricated block). Both the item name (already disambiguated,
  // e.g. "Imp Brain (Executioner)") and the quest name are pre-localized,
  // no client-side lookup/race involved -- S.items is only consulted here
  // for the icon/clickability of the item chip (eager/critical bundle, safe).
  const questDropsHtml = m.questDrops?.length
    ? `<div class="fiche-section"><h3>${esc(tr('monsterQuestItemsTitle'))}</h3>${m.questDrops.map(d => {
        const dit = S.items[d.item_key];
        const dicon = dit?.icon ? `icons/${dit.icon}` : null;
        const itemLabel = dit
          ? `<span class="fr-label link"${ecAttr(itemEcHex(dit), itemEcKind(dit))} data-act="${itemFicheAct(dit)}" data-id="${esc(d.item_key)}">${esc(d.item_name)}</span>`
          : `<span class="fr-label">${esc(d.item_name)}</span>`;
        const questLabel = S.quests.has(d.quest_slug)
          ? `<span class="fr-label link"${ecAttr(CATS.quest.hex, 'quest')} data-act="fiche-quest" data-id="${esc(d.quest_slug)}">${esc(d.quest_name)}</span>`
          : `<span class="fr-label">${esc(d.quest_name)}</span>`;
        return `<div class="frow">
          ${iconTag(dicon, 'fr-icon', itemGlyph(dit))}
          ${itemLabel}
          <span class="k-chip" style="--chip-c:${CATS.quest.hex}">${esc(tr('questCat'))}</span>
          ${questLabel}
        </div>`;
      }).join('')}</div>` : '';

  const abilitiesHtml = `<div class="fiche-section"><h3>${esc(tr('monsterAbilitiesN', m.abilities?.length || 0))}</h3>${
    m.abilities?.length
      ? m.abilities.map(a => `<div class="frow">
          <span class="k-chip" style="--chip-c:${ABILITY_HEX}">${esc(a.slot || '·')}</span>
          <span class="fr-label">${esc(a.name)}</span>
        </div>`).join('')
      : `<p class="hint">${esc(tr('noAbilitiesKnown'))}</p>`
  }</div>`;

  const loreIdx = loreIndexFor(key);
  const loreHtml = loreIdx != null ? `<div class="fiche-section"><h3>${esc(tr('loreEntryTitle'))}</h3>
    <div class="frow">
      <span class="fr-icon icon-broken" data-fb="📖"></span>
      <span class="fr-label link"${ecAttr(LOCATION_HEX, 'location')} data-act="fiche-location" data-id="${loreIdx}">${esc(S.locations[loreIdx].title)}</span>
    </div></div>` : '';

  // Ordre de la fiche (manager feedback, task #80/#79) : identité (tête,
  // zone, sélecteur de variante) -> SPAWNS (la question n°1 d'un joueur qui
  // arrive depuis une quête, "où farmer ça ?", honnête même quand la réponse
  // est "inconnu" -- stateChip('unknown') dans monsterCampsHtml) -> tags ->
  // stats -> butin (kill puis dépeçage) -> objets de quête qui en dépendent
  // -> capacités -> bestiaire/lore (le contenu le plus "lecture", en dernier).
  openFiche(`
    <div class="fiche-head">${iconTag(icon, 'fiche-avatar', initials(m.name))}
      <div><div class="fiche-kind" style="color:${MONSTER_HEX}">${esc(kindLine)}${devMark}</div>
      <h2>${esc(m.name)}</h2></div></div>
    ${zoneBtnHtml}
    ${variantSelectHtml}
    ${rawRecordsHtml}
    ${campsHtml}
    ${tagsHtml}
    ${statsHtml}
    ${lootHtml}
    ${harvestHtml}
    ${questDropsHtml}
    ${abilitiesHtml}
    ${loreHtml}`);
  setFicheHash('monster', key);
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
  const monstersHtml = l.monsters?.length
    ? `<div class="fiche-section"><h3>${esc(tr('familyMonstersTitle', l.monsters.length))}</h3>${l.monsters.map(fm => {
        const known = S.monsters[fm.key];
        return `<div class="frow">
          <span class="fr-label${known ? ' link' : ''}"${ecAttr(MONSTER_HEX, 'monster')}${known ? ` data-act="fiche-monster" data-id="${esc(fm.key)}"` : ''}>${esc(fm.name)}</span>
          <span class="muted">${fm.level != null ? tr('levelAbbrev', fm.level) : ''}</span>
        </div>`;
      }).join('')}</div>` : '';
  openFiche(`
    <div class="fiche-head"><div>
      <div class="fiche-kind" style="color:${LOCATION_HEX}">${esc(locationKindLabel(l.kind))}</div>
      <h2>${esc(l.title)}</h2></div></div>
    ${l.x != null ? `<div class="fiche-section"><div class="pop-actions">
      <button class="act primary" data-act="goto" data-x="${l.x}" data-z="${l.z}" data-label="${esc(l.title)}">${esc(tr('viewOnMapBtn'))}</button>
    </div></div>` : ''}
    ${l.desc ? `<div class="fiche-section"><p class="fiche-journal">${esc(l.desc)}</p></div>` : ''}
    ${monstersHtml}`);
  setFicheHash(null);
}

/* Fiche capacité (sorts de héros NOMMÉS uniquement) : nom, emplacement
   (Q/W/E/R/MA), description, tags de nature (Stun/AoE/DoT…) en puces,
   formule de dégâts reconstruite/localisée quand décodée (a.formula, 14/202
   capacités du catalogue site -- voir formulaHtml ci-dessus) et mise à
   l'échelle par rareté quand connue (a.rarity_scaling -- 0 aujourd'hui côté
   capacités, mais le champ est traité comme sur un item pour rester correct
   si le pipeline en expose un jour). */
function openAbilityFiche(key) {
  const a = S.abilities[key];
  if (!a) return;
  S.openFiche = { kind: 'ability', id: key };
  const tagsHtml = a.tags?.length
    ? `<div class="fiche-section reward-chips">${a.tags.map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>` : '';
  const formulaHtmlBlock = a.formula ? formulaHtml(a.formula) : '';
  const scalingHtml = scalingSection(a);
  openFiche(`
    <div class="fiche-head"><div>
      <div class="fiche-kind" style="color:${ABILITY_HEX}">${esc(tr('abilityLabel'))}${a.slot ? ' · ' + esc(a.slot) : ''}</div>
      <h2>${esc(a.name)}</h2></div></div>
    ${a.desc ? `<div class="fiche-section"><p class="fiche-journal">${esc(a.desc)}</p></div>` : ''}
    ${tagsHtml}
    ${formulaHtmlBlock}
    ${scalingHtml}`);
  setFicheHash(null);
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
  // ne l'effaçait jamais (voir npc_dual_identity_INVESTIGATION.md, "lingers
  // forever"). No-op si aucun réticule n'est posé.
  clearLocator();
  S.openFiche = null;
  setFicheHash(null);
}
function openFiche(html) {
  $('#detail-body').innerHTML = html;
  detail.classList.add('open');
}
/* Lien profond de fiche dans le hash (q=<slug> / camp=<clé> / i=<clé item> /
   npc=<idx>) — mutuellement exclusifs, une seule fiche ouverte à la fois.
   `history.state` (pas `null`) : préserve le marqueur {cpm,cpmSeq} de
   l'entrée courante — posé soit par la restauration initiale, soit par
   pushFocusState() juste avant que cette fonction ne soit appelée (voir
   plus bas) — sans quoi CE replaceState l'effacerait à chaque ouverture de
   fiche et canGoBackLocally()/unfocus() ne fonctionneraient plus jamais. */
function setFicheHash(kind, id) {
  const p = new URLSearchParams(location.hash.slice(1));
  p.delete('q'); p.delete('camp'); p.delete('i'); p.delete('npc'); p.delete('mon');
  if (kind === 'quest') p.set('q', id);
  else if (kind === 'item') p.set('i', id);
  else if (kind === 'npc') p.set('npc', id);
  else if (kind === 'monster') p.set('mon', id);
  else if (kind) p.set('camp', id);
  history.replaceState(history.state, '', '#' + p.toString().replace(/%2C/g, ','));
}

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
  if (giverPin?.icon) return `icons/npc_map/${encodeURIComponent(giverPin.icon)}.png`;
  return heroAvatar(q.giverIcon || q.actors?.find(a => a.kind === 'npc')?.icon);
}

/* ── Pastille d'état "on ne sait pas" (unknown_states_DESIGN.md, task #67) ──
   Taxonomie PARTAGÉE (voir style.css .state-chip) pour toute incertitude
   honnête affichée sur le site -- remplace ~6 idiomes bespoke qui
   coexistaient déjà (chacun sa classe, son texte, jamais partagés).
   "dev" réutilise .dev-mark/devBadge tel quel PARTOUT ailleurs dans ce
   fichier (jamais dupliqué via cette pastille) -- "dynamic"/"unknown" sont
   les 2 variantes d'origine ; "fixed" (task #80, monsterStatsSection) est un
   4ᵉ état ajouté pour le badge « relevé fixe » (record_fixed_sibling) --
   même composant/CSS que les 3 autres, juste son propre couple libellé/
   info-bulle (stateFixed/stateFixedTitle, i18n), jamais le badge « réel »
   (.stats-badge) qui affirme un relevé PROPRE au mob. `extraTitle`
   (facultatif) ajoute le SEUL fait concret qui rend la phrase générique
   utile pour cet appel précis (ex. "camp fauna is spawned server-side") sans
   forker la phrase de base par site d'appel -- même idée que
   dynamicPosBadge's regionHint. */
function stateChip(state, extraTitle) {
  const label = state === 'dev' ? tr('devBadge') : tr(`state${capitalize(state)}`);
  const titleBase = state === 'dev' ? tr('devBadgeTitle') : tr(`state${capitalize(state)}Title`);
  const title = extraTitle ? `${titleBase} — ${extraTitle}` : titleBase;
  return `<span class="state-chip state-chip-${state}" title="${esc(title)}">${esc(label)}</span>`;
}

/* Bouton « Carte » standard (icône + libellé) pour tout slot localisable —
   fiches, popups, objectifs. Un objet/PNJ/vendeur sans position CONNUE reste
   toujours listé (jamais masqué) : ce repli affiche juste un libellé grisé
   au lieu du bouton, pour que le joueur sache que la chose existe même sans
   coordonnée exploitable. */
const GOTO_ICON = `<svg class="goto-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor"
  stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M12 21s6.5-6.2 6.5-11.3a6.5 6.5 0 1 0-13 0C5.5 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.2"/></svg>`;
/* `cat` (facultatif) : clé de couche carte (voir mapview.js `layers`/
   config.js CATS, ex. 'npc', 'camp_chest', 'decor:legacy') quand `x,z` sont
   CONNUS pour coïncider avec un marqueur RÉELLEMENT rendu de cette couche
   (le pin lui-même, pas juste "quelque part près de lui" -- voir
   npc_dual_identity_INVESTIGATION.md). Posé en `data-cat`, lu par main.js's
   goto handler -- pins.js goTo() met alors en avant ce marqueur déjà rendu
   au lieu d'un réticule ambré redondant à côté (repli automatique sur le
   réticule si la couche est masquée/éteinte ou le marqueur introuvable).
   Omis : comportement historique inchangé. */
function gotoBtn(x, z, label, cat) {
  if (x == null) return `<span class="pos-unknown">${esc(tr('posUnknown'))}</span>`;
  const catAttr = cat ? ` data-cat="${esc(cat)}"` : '';
  return `<button class="goto" data-act="goto" data-x="${x}" data-z="${z}" data-label="${esc(label || '')}"${catAttr}>${GOTO_ICON}<span>${esc(tr('mapLabel'))}</span></button>`;
}
/* Cible sur une AUTRE carte : bouton de bascule cross-carte (libellé = nom de
   la carte cible) au lieu d'un goTo local. Le clic bascule puis focus. */
function crossMapBtn(mid, x, z, label) {
  return `<button class="goto goto-cross" data-act="map-goto" data-map="${esc(mid)}" data-x="${x}" data-z="${z}" data-label="${esc(label || '')}">${GOTO_ICON}<span>${esc(mapName(mid))}</span></button>`;
}
/* Variante SANS position connue (batch-wiring pass, mechanism decode job A) :
   geo.py attache parfois `target.map` seul, jamais avec x/z, pour une cible
   npc/item/zone dont la seule position connue vit sur une AUTRE carte que
   celle interrogée (ex. _npc_pos_target/_resolve_target_mech's receive_reward
   branch — "cross-map: named, no local pin"). Avant cette passe, ce cas ne
   déclenchait NI gotoBtn NI crossMapBtn (les deux exigent x/z) : la vignette
   retombait sur le texte générique dynamicPosBadge "Position dynamique",
   perdant complètement l'info de carte. Un simple bouton de bascule (pas de
   goTo ensuite — aucune coordonnée à viser) répare ça honnêtement, sans
   fabriquer une position qu'on n'a pas. */
function crossMapOnlyBtn(mid, label) {
  return `<button class="goto goto-cross" data-act="map-switch" data-map="${esc(mid)}" data-label="${esc(label || '')}" title="${esc(tr('mapBadgeTitle', mapName(mid)))}">${GOTO_ICON}<span>${esc(mapName(mid))}</span></button>`;
}

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
let currentGoalZones = [];      // search_zone actives de la fiche quête ouverte
let goalZoneLayer = null;       // cercle dessiné pour la dernière zone consultée
function clearGoalZone() {
  if (goalZoneLayer) { map.removeLayer(goalZoneLayer); goalZoneLayer = null; }
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
   build_site_data.py::camp_details()/extract_markers.py::scan_camps()
   appliquent pour construire cette même clé `g.k` (voir DATA_CONTRACT.md).
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
   effort — les vrais points du camp cité (campPointsForZone, réutilise
   showHighlight, la même primitive « surligner les N points » que la fiche
   camp) quand la jointure marche, sinon repli honnête sur le même cercle
   deviné qu'une zone confiance haute mais visuellement plus prudent
   (drawGoalZone estimate:true) — jamais un contour inventé de toutes pièces,
   jamais présenté avec la même autorité qu'une zone étayée par une vraie
   preuve de drop/farm (voir  zone_confidence). */
function drawEstimatedZone(sz) {
  const pts = campPointsForZone(sz);
  if (pts) { clearGoalZone(); showHighlight(pts, CATS.quest.hex); return; }
  clearHighlight();
  drawGoalZone(sz, { estimate: true });
}
function zoneViewBtn(zi, isEstimate) {
  const label = isEstimate ? tr('viewEstimatedZoneBtn') : tr('viewZoneBtn');
  return `<button class="goto" data-act="goal-zone-view" data-zi="${zi}">${GOTO_ICON}<span>${esc(label)}</span></button>`;
}
/* Zone(s) de monstre sur la carte (bestiaire / fiche « Voir la zone ») :
   dessine les VRAIS polygones de région (S.zonesGeo, propre à Kwalat) résolus
   par NOM depuis m.zones. Réutilise l'infra de zone d'objectif de quête
   (goalZoneLayer, effacée pareillement par clearGoalZone/closeFiche) — mais
   trace le polygone réel plutôt qu'un simple cercle centroïde/bbox, puisqu'on
   a la géométrie exacte. Un nom sans polygone chargé (autre carte) ne dessine
   rien, jamais de contour inventé. */
function drawMonsterZone(zoneNames) {
  clearGoalZone();
  if (!zoneNames?.length) return;
  const zones = (S.zonesGeo || []).filter(z => zoneNames.some(n => fold(n) === fold(z.name)));
  if (!zones.length) return;
  const g = L.layerGroup();
  const pts = [];
  zones.forEach(z => (z.rings || []).forEach(ring => {
    L.polygon(ring.map(([x, zz]) => { pts.push(toLL(x, zz)); return toLL(x, zz); }), {
      color: CATS.quest.hex, weight: 2, dashArray: '5 6',
      fillColor: CATS.quest.hex, fillOpacity: .12, interactive: false,
    }).addTo(g);
  }));
  goalZoneLayer = g.addTo(map);
  if (pts.length) map.flyToBounds(L.latLngBounds(pts).pad(0.25));
}
/* Accès délégué (main.js) : dessine la/les zone(s) du monstre `key`. */
function viewMonsterZone(key) {
  const m = S.monsters[key];
  if (m?.zones) drawMonsterZone(m.zones);
}
/* Libellé + éventuel bouton pour une cible sans position fixe. `regionHint`
   (facultatif) = région du journal de la quête, affichée en cas (c) quand
   aucune zone n'est disponible du tout — mieux que rien pour se repérer.
   BUG FIX (popup/bubble layout cleanup pass) : le rappel de région vivait
   dans un <span class="pos-region"> FRÈRE de .pos-dynamic, pas un enfant —
   sur une bulle étroite (fiche de quête, ~300px), le conteneur flex-wrap
   parent (.goal-target) pouvait donc les scinder sur deux lignes ("Dynamic
   position" seul puis "(Westwind Woods)" seul, visuellement cramé/décousu),
   et le rappel de région n'héritait pas la teinte muette de .pos-dynamic
   (étant un frère, pas un descendant) — il ressortait à pleine opacité,
   comme une info plus importante que le badge discret juste à côté. Les deux
   segments sont maintenant un seul fragment de texte cohérent (« Dynamic
   position · Westwind Woods »), jamais scindable par le flex-wrap parent, et
   le rappel de région hérite nativement la couleur/l'italique de son parent
   (voir .pos-region dans style.css, dé-italique seulement). */
/* États (unknown_states_DESIGN.md #2/#3/#4/#5, task #67) : ces 3 niveaux
   rendaient jusqu'ici TOUS le même texte muet/italique sans jamais dire au
   survol POURQUOI la position n'est pas un simple bouton carte -- un `title`
   par branche adopte maintenant le vocabulaire d'état partagé (stateChip),
   sans toucher aux libellés visibles eux-mêmes (ils restent plus spécifiques
   et plus utiles que "Dynamic"/"Unknown" tout court) :
   - confiance HAUTE (b) : un vrai fait étayé par une preuve de drop/farm --
     title "dynamic".
   - confiance MOYENNE (b') et « monstre non catalogué » (c, camps.json ~25 %
     de couverture seulement) : une hypothèse, jamais une preuve de spawn --
     title "unknown" (cohérent avec leurs libellés déjà prudents, "Zone
     estimée"/"Position non cataloguée").
   - repli générique (tout autre acteur sans x/z ni search_zone) : le libellé
     "Position dynamique" reste sa propre affirmation -- AUCUN classificateur
     par instance n'est exposé côté client aujourd'hui pour prouver ou
     infirmer ce cas au cas par cas (voir §2 re-check #3 -- 18 PNJ
     d'Extraction Island sont byte-prouvés dynamiques côté pipeline, data/
     quests.json pos_source=server_spawn, mais ce classifieur n'est publié
     dans AUCUN .bin du site) ; changer sa sémantique sans preuve serait
     l'inverse du problème que cette passe corrige. Title "dynamic" par
     cohérence avec son propre libellé -- un vrai audit par échantillonnage
     (déjà flaggé comme suivi séparé dans le design doc) reste à faire avant
     de le reclasser. */
function dynamicPosBadge(t, regionHint) {
  const sz = t && t.search_zone;
  if (sz && (sz.confidence === 'high' || sz.confidence === 'medium')) {
    const zi = currentGoalZones.push(sz) - 1;
    // Confiance MOYENNE = proximité seule, jamais une preuve de spawn (voir
    //  zone_confidence) : libellé + bouton distincts de la
    // confiance haute (posEstimatedZone/viewEstimatedZoneBtn), jamais
    // "Spawn zone"/"View zone" pour un simple calcul de voisinage.
    const isEstimate = sz.confidence === 'medium';
    const label = isEstimate ? tr('posEstimatedZone') : tr('posDynamicZone');
    const title = tr(isEstimate ? 'stateUnknownTitle' : 'stateDynamicTitle');
    return `<span class="pos-dynamic" title="${esc(title)}">${esc(label)}</span>${zoneViewBtn(zi, isEstimate)}`;
  }
  if (t && t.kind === 'monster' && !t.camp) {
    return `<span class="pos-dynamic" title="${esc(tr('stateUnknownTitle'))}">${esc(tr('posUncatalogued'))}</span>`;
  }
  const region = regionHint ? ` <span class="pos-region">· ${esc(regionHint)}</span>` : '';
  return `<span class="pos-dynamic" title="${esc(tr('stateDynamicTitle'))}">${esc(tr('posDynamic'))}${region}</span>`;
}

/* Prix vendeur : nombre au format de la langue + pictogramme de pièce —
   l'unité monétaire n'est pas nommée dans les données extraites, le glyphe
   neutre suffit et reste identique dans toutes les langues. */
function priceHtml(price) {
  if (price == null) return '';
  return `<span class="muted fr-price" title="${esc(tr('priceTitle'))}">${esc(price.toLocaleString(numberLocale()))} <span class="coin" aria-hidden="true"></span></span>`;
}
function vendorStockSection(vendorKey) {
  const v = S.vendors[vendorKey];
  if (!v) return '';
  if (!v.sells?.length) {
    // Pastille "unknown" par défaut (unknown_states_DESIGN.md #19/re-check #4,
    // task #67) : 20/69 vendors.json ont un `sells:[]` littéral, aucune
    // documentation ne tranche pourquoi -- au moins 2 sous-populations
    // probables (vendeurs de spec de héros S1/S2 potentiellement générés
    // côté client vs. simple trou d'extraction), non distinguées ici faute
    // d'un signal fiable ; "unknown" reste la formulation honnête par défaut
    // tant que cette distinction n'est pas faite (suivi séparé, pas cette
    // passe).
    return `<div class="fiche-section"><h3>${esc(tr('vendorStockTitle'))}</h3><p class="hint">${stateChip('unknown')} ${esc(tr('noVendorItems'))}</p></div>`;
  }
  const rows = v.sells.map(s => {
    const key = typeof s === 'string' ? s : s.key;
    const price = typeof s === 'string' ? null : s.price;
    const it = S.items[key];
    const name = it?.name || pretty(key);
    const icon = it?.icon ? `icons/${it.icon}` : null;
    // Pastille de rareté (couleur RARITY) quand elle est connue : repère
    // visuel de « ce que vaut » chaque article du stock sans surcharger la
    // ligne. Le nom porte désormais la MÊME teinte (task #77, coherence
    // pass) — dot + texte coloré coexistent déjà partout ailleurs sur le
    // site (npcChip icône + liseré, k-chip badge + nom de quête…), garder ce
    // seul endroit neutre aurait fait une exception isolée, pas une règle.
    const rar = it && RARITY[it.rarity];
    const dot = rar ? `<span class="rar-dot" style="background:${rar.hex}" title="${esc(rarityLabel(it.rarity))}"></span>` : '';
    const label = it
      ? `<span class="fr-label link"${ecAttr(itemEcHex(it), itemEcKind(it))} data-act="${itemFicheAct(it)}" data-id="${esc(key)}">${esc(name)}</span>`
      : `<span class="fr-label">${esc(name)}</span>`;
    return `<div class="frow" data-n="${esc(fold(name))}">
      ${iconTag(icon, 'fr-icon', itemGlyph(it))}
      ${dot}${label}
      ${priceHtml(price)}
    </div>`;
  }).join('');
  const filter = v.sells.length > 15
    ? `<input class="stock-filter" type="search" placeholder="${esc(tr('stockFilterPlaceholder'))}">` : '';
  return `<div class="fiche-section"><h3>${esc(tr('vendorStockTitleN', v.sells.length))}</h3>${filter}<div class="fiche-scroll">${rows}</div></div>`;
}

function openNpcFiche(idx) {
  const r = S.data.npc[idx];
  if (!r) return;
  S.openFiche = { kind: 'npc', id: idx };
  const img = r.icon ? `icons/npc_map/${encodeURIComponent(r.icon)}.png` : null;
  // Seulement les quêtes RÉELLEMENT visibles : un dialogue-bark hello_*/info_*
  // (isTest+isDialogue) que ce PNJ « donne » ne compte pas comme une quête et
  // n'apparaît pas ici par défaut (voir devcontent.js visibleQuestSlugs) —
  // sinon un PNJ sans aucune vraie quête affichait « Quêtes données (2) » +
  // 2 lignes qui, cliquées, ouvraient une fiche vide. Révélé avec le contenu
  // dev (S.devOn), exactement comme partout ailleurs.
  const visibleSlugs = visibleQuestSlugs(r.quests);
  const quests = visibleSlugs.map(slug => {
    const q = S.quests.get(slug);
    return q ? `<div class="frow">
      <span class="k-chip" style="--chip-c:${CATS.quest.hex}">${esc(tr('questCat'))}</span>
      <span class="fr-label link"${ecAttr(CATS.quest.hex, 'quest')} data-act="fiche-quest" data-id="${esc(slug)}">${esc(q.name)}</span>
      ${gotoBtn(q.x, q.z, q.name)}
    </div>` : '';
  }).join('');
  // Some NPCs are known only from dialog/quest-slot text, with no world
  // placement or map pin at all (site/js/i18n.js's generic posUnknown, same
  // label already used for a merchant/object with no extracted position --
  // never the quest-goal-specific posDynamic/posDynamicZone wording, which
  // implies a real server-side spawn rather than "not extracted").
  const posLine = r.x != null ? `<span class="pop-coords">${fmtCoord(r.x, r.z)}</span>`
    : `<span class="pos-unknown">${esc(tr('posUnknown'))}</span>`;
  // Variante technique (npc.k, 84 PNJ : gardes/entrées d'arène) — seule
  // façon de distinguer deux gardes homonymes ("Guard Archer Bow 8" vs
  // "Sword 3") ; affichée seulement quand elle dit plus que le nom.
  const variant = r.k ? pretty(r.k.replace(/^npc_/, '')) : '';
  const variantLine = variant && fold(variant) !== fold(r.name)
    ? `<span class="pop-coords">${esc(variant)}</span>` : '';
  const mapBtn = r.x != null
    ? `<button class="act primary" data-act="goto" data-x="${r.x}" data-z="${r.z}" data-label="${esc(r.name)}" data-cat="npc">${esc(tr('viewOnMapBtn'))}</button>`
    : '';
  // Dialogue du personnage (data-accuracy audit, NPC-duplication fix): les
  // barks hello_/info_ que ce PNJ « donne » sont masqués de la liste de quêtes
  // (visibleQuestSlugs ci-dessus) car ce ne sont pas des quêtes — mais leurs
  // répliques d'ambiance SONT ce personnage. Comme les pins dupliqués (le
  // donneur-de-dialogue + le donneur-de-quête + le vrai PNJ) sont désormais
  // fusionnés en UN seul pin (build_site_data.py::link_npc_quests), on rattache
  // ici ses dialogues À CÔTÉ de ses vraies quêtes, dans une section repliée et
  // clairement étiquetée — jamais une fausse entrée de quête vide. Toujours
  // visible (c'est du lore, pas du contenu dev), dédupliqué ligne à ligne.
  const dialogueLines = [];
  const seenLines = new Set();
  for (const slug of (r.quests || [])) {
    const q = S.quests.get(slug);
    if (!q || !q.isDialogue) continue;
    for (const l of (q.dialogs?.npc || [])) {
      if (!seenLines.has(l)) { seenLines.add(l); dialogueLines.push(l); }
    }
  }
  const dialogueSection = dialogueLines.length
    ? `<div class="fiche-section"><details class="fiche-dialogs">
        <summary>${esc(tr('dialogsN', dialogueLines.length))}</summary>
        ${dialogueLines.map(l => `<p class="dlg dlg-npc">${esc(l)}</p>`).join('')}
      </details></div>` : '';
  openFiche(`
    <div class="fiche-head">${iconTag(img, 'fiche-avatar', initials(r.name))}
      <div><div class="fiche-kind" style="color:${CATS.npc.hex}">${esc(tr('npcCat'))}${r.vendor ? esc(tr('vendorSuffix')) : ''}</div><h2>${esc(r.name)}</h2>
      ${posLine}${variantLine}</div></div>
    <div class="fiche-section">
      <div class="pop-actions">
        ${mapBtn}
        <button class="act" data-act="track" data-id="npc:${idx}">${esc(tr('trackBtn'))}</button>
      </div></div>
    <div class="fiche-section"><h3>${esc(tr('questsGivenN', visibleSlugs.length))}</h3>
      ${quests || `<p class="hint">${esc(tr('noQuestsForNpc'))}</p>`}</div>
    ${dialogueSection}
    ${r.vendor ? vendorStockSection(r.vendor) : ''}`);
  setFicheHash('npc', idx);
}

/* Base de données objets : icône + rareté + clic -> fiche complète quand la
   clé est connue du catalogue (site/data/items.json) ; sinon repli fidèle au
   rendu historique (nom prettifié, non cliquable). */
function itemColor(it) { return (it && RARITY[it.rarity]?.hex) || 'var(--muted)'; }
/* Entité "recette" (task #78a/#78b) : un item catalogue avec it.kind==='recipe'
   est un pseudo-item de RÉFÉRENCE (voir data/SCHEMA.md recipes.json "Site
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

/* Chip PNJ (fiche-header identity pass + task #70) : même composant que les
   chips objet ci-dessus (`.chip`/`.chip-icon`, généralisés en base dans
   style.css pour vivre aussi bien empilée dans un `<div class="reward-chips">`
   en bloc -- l'en-tête de fiche quête/dialogue, "donné par" -- que directement
   EN LIGNE dans une phrase -- la ligne d'obtention d'objet, "donné par
   [chip]", puisqu'un `<div>` ne peut de toute façon pas s'imbriquer dans un
   `<p>`). Icône : le portrait de PIN RÉEL du PNJ (icons/npc_map/<leaf>.png --
   la même source qu'openNpcFiche/les lignes vendeur), jamais une icône
   générique, quand `ni` résout un PNJ connu de la carte active ; repli
   glyphe d'initiales (iconTag) sinon. Cliquable (data-act=fiche-npc)
   seulement quand résolu -- jamais un lien deviné, le nom reste affiché
   honnêtement en texte stylé sinon (jamais un lien mort). Couleur d'entité
   (task #77) : CATS.npc.hex, posée que le PNJ soit résolu ou non -- c'est
   TOUJOURS un PNJ, la teinte n'affirme rien sur la cliquabilité (déjà portée
   par data-act/le curseur), jamais un lien deviné pour autant. */
function npcChip(name, ni) {
  const rec = ni >= 0 ? S.data.npc[ni] : null;
  const icon = rec?.icon ? `icons/npc_map/${encodeURIComponent(rec.icon)}.png` : null;
  const attrs = ni >= 0 ? ` data-act="fiche-npc" data-id="npc:${ni}"` : '';
  return `<span class="chip"${ecAttr(CATS.npc.hex, 'npc')}${attrs}>${iconTag(icon, 'chip-icon', initials(name))}${esc(name)}</span>`;
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

/* Map de désambiguïsation de la fiche QUÊTE ouverte (même cycle de vie que
   currentGoalZones : recalculée à chaque openQuestFiche). Portée module pour
   que goalItemMiniChip — appelé au fond de goalStepsSection/goalTargetChip,
   qui ne reçoivent pas q.items — lise la MÊME Map que questItemRow, sans
   passer un paramètre à travers toute la chaîne d'appels. */
let currentQuestItemDisambig = null;
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
  const badgeHex = qi.isQuestItem ? CATS.qao.hex : CATS.workshop.hex;
  const badgeLabel = qi.isQuestItem ? tr('questItemBadge') : tr('gameItemBadge');
  const bits = [];
  if (cat && !qi.isQuestItem) {
    if (cat.soldBy?.length) bits.push(tr('soldTag'));
    if (cat.recipes?.length) bits.push(tr('craftableTag'));
    if (cat.drops?.length) bits.push(tr('lootTag'));
  }
  const label = cat
    ? `<span class="fr-label link"${ecAttr(itemEcHex(cat), itemEcKind(cat))} data-act="${itemFicheAct(cat)}" data-id="${esc(qi.key)}">${esc(name)}</span>`
    : `<span class="fr-label">${esc(name)}</span>`;
  // craft:true (geo.py's craft-only pre-check, propagated onto this exact
  // item row by import_quests.py -- e.g. no_witnesses_to_glory's "Savory
  // mushroom soup"): this goal is fulfilled by CRAFTING, never a spawn --
  // said explicitly here too (same goalCraftLabel wording as
  // goalTargetChip), and NEVER a position line, even on the off chance
  // x/searchZone ended up attached (they never do in practice, see geo.py's
  // craft pre-check) -- the flag wins regardless, a fabricated position is
  // exactly what this whole pass exists to prevent.
  const craftBit = qi.craft ? `<span class="muted">${esc(tr('goalCraftLabel'))}</span>` : '';
  // givenBy (import_quests.py, geo.py's given_by_giver): this exact item is
  // handed over by the quest's own giver (dialogue/turn-in grant), never
  // found in the world -- named + linked to the giver's fiche when
  // resolvable on the active map (same npcIndexByName lookup as
  // goalTargetChip's own given_by_giver branch), plain text otherwise
  // (never a guessed link).
  const ni = qi.givenBy ? npcIndexByName(qi.givenBy) : -1;
  // Couleur d'entité (task #77) : seul le NOM du PNJ prend la teinte npc,
  // pas le verbe "donné par" qui l'entoure -- .ec-name est une classe utilitaire
  // dédiée à ce cas (une sous-chaîne colorée dans un span plus large déjà
  // cliquable/muted dans son ensemble), voir style.css.
  const givenByBit = qi.givenBy
    ? (ni >= 0
      ? `<span class="muted link" data-act="fiche-npc" data-id="npc:${ni}">${esc(tr('goalGivenByLabel'))} <span class="ec-name"${ecAttr(CATS.npc.hex, 'npc')}>${esc(qi.givenBy)}</span></span>`
      : `<span class="muted">${esc(tr('goalGivenByLabel'))} ${esc(qi.givenBy)}</span>`)
    : '';
  const posBit = (!qi.craft && (qi.x != null || qi.searchZone))
    ? (qi.x != null ? gotoBtn(qi.x, qi.z, name) : dynamicPosBadge({ search_zone: qi.searchZone }, regionHint))
    : '';
  return `<div class="frow">
    ${iconTag(icon, 'fr-icon', itemGlyph(cat))}
    <span class="k-chip" style="--chip-c:${badgeHex}">${badgeLabel}</span>
    ${label}
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
  const attrs = it ? ` data-act="${itemFicheAct(it)}" data-id="${esc(key)}"` : '';
  const approxSup = approx ? '<sup>≈</sup>' : '';
  const qiFlag = key ? currentQuestItemFlags?.get(key) : undefined;
  const isQuest = qiFlag !== undefined ? qiFlag : (hint !== undefined ? hint : (it ? it.kind === 'quest_item' : null));
  const badge = isQuest != null
    ? `<span class="k-chip" style="--chip-c:${isQuest ? CATS.qao.hex : CATS.workshop.hex}">${esc(isQuest ? tr('questItemBadge') : tr('gameItemBadge'))}</span>`
    : '';
  // Une seule ligne SANS retours/indentation internes (fix bulle « ligne
  // vide ») : le newline+indentation d'un gabarit multi-lignes se retrouvait
  // tel quel dans le texte de la bulle quand le joueur le copiait/collait.
  // Couleur d'entité (task #77) : posée sur le CONTENEUR (--chip-c consommé
  // par .goal-target-item-label enfant, voir style.css) -- même teinte que
  // itemChip/qtyItemChip pour cette même clé partout ailleurs sur le site.
  return `<div class="goal-target-row goal-target-item${it ? ' link' : ''}"${it ? ecAttr(itemEcHex(it), itemEcKind(it)) : ''}${attrs}>${iconTag(icon, 'goal-target-item-icon', itemGlyph(it))}<span class="goal-target-item-label">${esc(name)}${approxSup}</span>${badge}${extraBadge || ''}</div>`;
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
  const links = others.map(slug => {
    const rq = S.quests.get(slug);
    const idx = t.reward_of.indexOf(slug);
    const qname = rq?.name || (namesAligned ? t.reward_of_names[idx] : slug);
    return rq
      ? `<span class="goal-target-name link"${ecAttr(CATS.quest.hex, 'quest')} data-act="fiche-quest" data-id="${esc(slug)}">${esc(qname)}</span>`
      : `<span class="goal-target-name"${ecAttr(CATS.quest.hex, 'quest')}>${esc(qname)}</span>`;
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
  const lbl = esc(label || '');
  // Cible NPC déjà résolue par nom (voir la branche t.kind === 'npc' plus
  // bas, même npcIndexByName) : quand une position fixe existe déjà (t.x !=
  // null), viser le pin NPC réel plutôt que la position brute de la cible --
  // même correctif qu'actorRows/« Voir le donneur » ci-dessus (voir
  // npc_dual_identity_INVESTIGATION.md §2/§3). N'invente JAMAIS un bouton là
  // où il n'y en avait pas (t.x == null garde `dynamicPosBadge` inchangé).
  const npcNi = (t.kind === 'npc' && t.x != null && label) ? npcIndexByName(label) : -1;
  const npcPin = npcNi >= 0 ? S.data.npc[npcNi] : null;
  const posX = npcPin && npcPin.x != null ? npcPin.x : t.x;
  const posZ = npcPin && npcPin.x != null ? npcPin.z : t.z;
  const posCat = npcPin && npcPin.x != null ? 'npc' : null;
  // `t.map` seul (sans x/z) -- cible cross-carte dont geo.py ne connaît QUE la
  // carte, jamais une coordonnée locale (mechanism decode job A, ex. le PNJ de
  // remise d'un receive_reward sur une autre carte) : bascule simple plutôt
  // que le texte générique dynamicPosBadge, qui masquait l'info de carte.
  const posRow = `<div class="goal-target-row goal-target-row-pos">${
    t.x != null ? gotoBtn(posX, posZ, lbl, posCat)
      : t.map ? crossMapOnlyBtn(t.map, lbl)
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
      return `<div class="goal-target">${itemRow}${relRow}${posRow}</div>`;
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
    const activableBadge = `<span class="k-chip" style="--chip-c:${CATS.qao.hex}">${esc(tr('activableBadge'))}</span>`;
    let itemRow = goalTargetItemRow(primaryKey, t.item_label, approxForItem, differing ? '' : activableBadge);
    let relRow = '';
    if (itemRow && differing) {
      // collect_from_object (mechanism): the ONLY mech that ever attaches an
      // item_key distinct from the object's own key (use_object never does,
      // see geo.py's _resolve_target_mech) -- named "container" wording +
      // the actual container's own label when known (t.label, e.g. "Old
      // crate"), never a fabricated container name when it isn't (falls
      // back to the previous generic "obtained here" phrasing untouched).
      relRow = t.label
        ? `<div class="goal-target-row goal-target-row-rel">
            <span class="k-chip" style="--chip-c:${CATS.qao.hex}">${esc(tr('containerBadge'))}</span>
            <span class="goal-target-rel-verb">${esc(tr('goalFoundInLabel'))}</span>
            <span class="goal-target-name">${esc(t.label)}</span>
          </div>`
        : `<div class="goal-target-row goal-target-row-rel">${activableBadge}<span class="goal-target-rel-verb">${esc(tr('goalObtainedHereLabel'))}</span></div>`;
    }
    // Repli quand RIEN ne résout au catalogue (ni item_key ni key, ~14 % des
    // objets sur l'ensemble des quêtes) : jamais une vignette vide -- réutilise
    // `label` (la phrase d'objectif déjà affichée au-dessus), la seule donnée
    // honnête qu'on ait pour nommer cet objet, plutôt qu'une icône+badge sans
    // aucun texte (le "ressemble à un tag mais y'a rien dedans" d'origine).
    if (!itemRow) {
      itemRow = `<div class="goal-target-row goal-target-item">
        <span class="goal-target-icon">${ACTIVABLE_GLYPH}</span>
        <span class="goal-target-item-label">${lbl}</span>
        ${activableBadge}
      </div>`;
    }
    return `<div class="goal-target">${itemRow}${relRow}${posRow}</div>`;
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
    // Indice de niveau (task #80, "quest zone/step level hint") : la ZONE de
    // ce but EST le camp résolu par geo.py (t.camp / t.search_zone.camp) --
    // camp_details.json (déjà chargé, S.campDetails) porte justement le
    // niveau RÉEL de cette espèce dans CE camp précis (`mobs[].lvl`, voir
    // data/SCHEMA.md camps.json "One mobs[] row per species"). Quand la ligne
    // se retrouve (par clé brute exacte ou, à défaut, par nom replié -- même
    // repli que monsterKeyFor's dernier recours), monsterKeyFor résout vers
    // le spawn de l'ESPÈCE le plus proche de CE niveau plutôt qu'un repli
    // arbitraire (canonicalSiteKey pourrait être un niveau tout autre pour
    // une espèce qui couvre 2 à 20). Même strip de préfixe que
    // campPointsForZone ci-dessous (fulfillment-manager-/ffm-island-).
    const campKeyShort = t.camp ? t.camp.replace(/^fulfillment-manager-/, '').replace(/^ffm-island-/, '') : null;
    const campMobRow = campKeyShort && S.campDetails[campKeyShort]?.mobs?.find(mm => mm.key === t.key || fold(mm.name) === fold(nameLbl));
    const levelHint = campMobRow?.lvl ?? null;
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
    const mk = monsterKeyFor(t.key || null, nameLbl, levelHint);
    // Niveau (S.monsters[mk].level) -- même garde différé que le lien : un
    // niveau non résolu ne s'affiche simplement pas encore, il apparaît au
    // re-rendu post-loadDeferred() comme le lien lui-même, jamais un chiffre
    // deviné entre-temps.
    const lvl = (mk && S.monsters[mk]?.level != null) ? tr('levelAbbrev', S.monsters[mk].level) : null;
    const nameSpan = mk
      ? `<span class="goal-target-name link"${ecAttr(MONSTER_HEX, 'monster')} data-act="fiche-monster" data-id="${esc(mk)}">${esc(nameLbl)}</span>`
      : (nameLbl ? `<span class="goal-target-name"${ecAttr(MONSTER_HEX, 'monster')}>${esc(nameLbl)}</span>` : '');
    const lvlSpan = lvl ? `<span class="goal-target-lvl">${esc(lvl)}</span>` : '';
    const itemRow = goalTargetItemRow(t.item_key, t.item_label, t.item_approx);
    // kill_collect (mechanism, also plain `kill` when a quest-loot drop is
    // byte-attached -- see geo.py's drops_quest_loot join on BOTH mechs):
    // `target.drop_chance` (0-100, byte-exact from SetQuestLootDirect, NOT
    // the generic loot-table weight share dropRateHtml renders elsewhere) --
    // shown as a plain percentage, or "Guaranteed" at the 100% direct-grant
    // value QUEST_FORMAT.md sec 9b documents. Purely data-driven (no mechanism
    // string needed): only ever present when a real quest-loot join happened.
    const chanceText = t.drop_chance == null ? null
      : t.drop_chance >= 100 ? tr('guaranteedLabel') : tr('goalDropChanceLabel', t.drop_chance);
    const chanceSpan = (itemRow && chanceText) ? `<span class="goal-target-lvl">${esc(chanceText)}</span>` : '';
    // Relation EXPLICITE seulement quand un item de quête est réellement
    // rattaché (le point central de cette passe) : "dropped by <monstre>".
    // Sans item (kill pur, ex. killig_creatures_field_robot), rien à relier
    // -- la ligne redevient juste le nom+niveau, sans verbe inventé.
    const relRow = itemRow
      ? `<div class="goal-target-row goal-target-row-rel">${nameSpan ? `<span class="goal-target-rel-verb">${esc(tr('goalDroppedByLabel'))}</span>` : ''}${nameSpan}${lvlSpan}${chanceSpan}</div>`
      : (nameSpan ? `<div class="goal-target-row goal-target-row-rel goal-target-row-rel-plain">${nameSpan}${lvlSpan}</div>` : '');
    // « Montrer les spawns » (task #79, quest-driven spawn highlighting) :
    // union de TOUS les camps joints du monstre cible, même primitive que la
    // fiche monstre (monsterSpawnHighlightBtn, réutilise allCampGroupsFlat --
    // voir sa doc plus bas) -- "Tuer 20 araignées" doit pouvoir allumer les
    // points de spawn concernés SANS quitter la fiche quête. Repli honnête :
    // monstre non résolu (mk null) ou résolu mais sans AUCUN camp joint ->
    // chaîne vide, jamais un bouton qui ne surlignerait rien.
    const spawnBtn = mk ? monsterSpawnHighlightBtn(S.monsters[mk]) : '';
    const spawnRow = spawnBtn ? `<div class="goal-target-row goal-target-row-spawns">${spawnBtn}</div>` : '';
    return `<div class="goal-target">${itemRow}${relRow}${posRow}${spawnRow}</div>`;
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
      const ni = t.label ? npcIndexByName(t.label) : -1;
      const giverSpan = (ni >= 0)
        ? `<span class="goal-target-name link"${ecAttr(CATS.npc.hex, 'npc')} data-act="fiche-npc" data-id="npc:${ni}">${esc(t.label)}</span>`
        : (t.label ? `<span class="goal-target-name"${ecAttr(CATS.npc.hex, 'npc')}>${esc(t.label)}</span>` : '');
      const relRow = giverSpan
        ? `<div class="goal-target-row goal-target-row-rel"><span class="goal-target-rel-verb">${esc(tr('goalGivenByLabel'))}</span>${giverSpan}</div>` : '';
      return `<div class="goal-target">${itemRow}${relRow}${posRow}</div>`;
    }
    // Nom cliquable (mirrors actorRows' own npcIndexByName lookup) : ce
    // branch n'affichait avant QUE le bouton de position, zéro identité --
    // même défaut "juste un tag vide" que les autres branches avant cette
    // passe. `label` est la seule source de nom fiable ici (les cibles npc
    // ne portent jamais leur propre `t.label`, voir audit ci-dessus) ; repli
    // texte simple si le PNJ n'est pas trouvé sur la carte active (jamais un
    // lien deviné).
    const ni = label ? npcIndexByName(label) : -1;
    const nameRow = (ni >= 0)
      ? `<div class="goal-target-row goal-target-row-rel"><span class="goal-target-name link"${ecAttr(CATS.npc.hex, 'npc')} data-act="fiche-npc" data-id="npc:${ni}">${lbl}</span></div>`
      : (label ? `<div class="goal-target-row goal-target-row-rel"><span class="goal-target-name"${ecAttr(CATS.npc.hex, 'npc')}>${lbl}</span></div>` : '');
    return `<div class="goal-target">${nameRow}${posRow}</div>`;
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
    const abLabel = t.label ? cleanLabel(t.label) : null;
    if (!abLabel) return '';
    return `<div class="goal-target">
      <div class="goal-target-row goal-target-item">
        <span class="goal-target-icon">${ACTIVABLE_GLYPH}</span>
        <span class="goal-target-item-label">${esc(abLabel)}</span>
        <span class="k-chip" style="--chip-c:${ABILITY_HEX}">${esc(tr('abilityLabel'))}</span>
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
    const nameRow = zLabel
      ? `<div class="goal-target-row goal-target-row-rel"><span class="goal-target-name"${ecAttr(ZONE_HEX, 'zone')}>${esc(zLabel)}</span></div>` : '';
    return `<div class="goal-target">${nameRow}${posRow}</div>`;
  }

  if (t.kind === 'players') {
    // kill_player (mechanism): mech_target.player_specs codes (e.g.
    // "CHA_S1") -- see heroSpecLabel's own doc for the class-name join. No
    // position: a PvP kill objective has no single world location.
    const specs = (t.player_specs || []).map(heroSpecLabel);
    if (!specs.length) return '';
    const text = tr('goalKillPlayerLabel', specs.join(', '));
    return `<div class="goal-target"><div class="goal-target-row goal-target-row-rel goal-target-row-rel-plain"><span class="goal-target-name">${esc(text)}</span></div></div>`;
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
  const unknownChip = isTestQuest ? '' : ` ${stateChip('unknown')}`;
  return `<div class="goal-target"><div class="goal-target-row goal-target-item"><span class="goal-target-item-label">${esc(customName)}</span>${unknownChip}</div></div>`;
}

/* Détecte si la cible d'un objectif fait partie d'une SÉRIE NUMÉROTÉE (ex.
   "Broken pipe 1/2/3" — fixing_leaking_pipes' étape "repair" ×3) : le graphe
   de quête ne résout qu'UNE position par objectif même quand celui-ci porte
   sur toute une série, alors que tous les membres positionnés existent déjà
   dans q.actors (même libellé de base + numéro). Ne matche que si le
   libellé de la cible se termine par un nombre ET qu'au moins un autre
   acteur du MÊME type de slot partage ce préfixe — sinon (pas une série)
   renvoie null et l'appelant garde le rendu à cible unique habituel. */
function seriesActorsFor(q, g) {
  const kind = g.target?.kind;
  if (!kind) return null;
  const m = /^(.*?)[ _]*(\d+)$/.exec((g.label || '').trim());
  const base = m && m[1].trim();
  if (!base) return null;
  const rx = new RegExp('^' + base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[ _]*(\\d+)$', 'i');
  const members = [];
  for (const a of q.actors || []) {
    if (a.kind !== kind) continue;
    const am = rx.exec((a.label || '').trim());
    if (am) members.push({ ...a, _n: parseInt(am[1], 10) });
  }
  if (members.length < 2) return null;
  return members.sort((a, b) => a._n - b._n);
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
  const badge = kind === 'object'
    ? `<span class="k-chip" style="--chip-c:${CATS.qao.hex}">${tr('activableBadge')}</span>` : '';
  const icon = kind === 'object' ? `<span class="goal-target-icon">${ACTIVABLE_GLYPH}</span>` : '';
  return `<div class="goal-target-series">${members.map(a => `
    <div class="goal-target goal-target-compact">
      ${icon}${badge}
      <span class="goal-target-mini-label">${esc(cleanLabel(a.label))}</span>
      ${a.x != null ? gotoBtn(a.x, a.z, cleanLabel(a.label)) : dynamicPosBadge({ search_zone: a.searchZone }, regionHint)}
    </div>`).join('')}</div>`;
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
      ? seriesTargetChips(series, g.target.kind, regionHint)
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
  const giverRow = q.giver ? `<div class="reward-chips quest-giver-row">${npcChip(q.giver, ni)}</div>` : '';
  openFiche(`
    <div class="fiche-head">${iconTag(avatar, 'fiche-avatar', initials(q.giver || q.name))}
      <div><div class="fiche-kind">${esc(tr('dialogueFicheKind'))}</div><h2>${esc(q.name)}</h2>
      ${giverRow}</div></div>
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
  currentGoalZones = [];   // ré-indexé à chaque ouverture (voir goalTargetChip/dynamicPosBadge)
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
  currentQuestItemDisambig = q.items?.length ? disambiguateQuestItems(q.items) : null;
  currentQuestItemFlags = q.items?.length ? new Map(q.items.map(qi => [qi.key, qi.isQuestItem])) : null;
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
    let labelHtml = `<span class="fr-label">${esc(aLabel)}</span>`;
    if (ni >= 0) {
      labelHtml = `<span class="fr-label link"${ecAttr(CATS.npc.hex, 'npc')} data-act="fiche-npc" data-id="npc:${ni}">${esc(aLabel)}</span>`;
    } else if (a.kind === 'mob') {
      // BUG FIX (quest-guide-feature plan sec 5.3): q.actors[].kind is built
      // straight from slots[].kind (import_quests.py), which only ever uses
      // the ACTOR vocabulary value "mob" for a creature -- "monster" is
      // exclusively the RESOLVED goal-target kind (geo.py). This branch
      // checked the wrong string and was dead code for every quest, 100% of
      // the time: every mob actor rendered as plain, non-clickable text even
      // though monsterKeyFor() (already imported, already correct) resolves
      // most of them immediately.
      const mk = monsterKeyFor(null, a.label);
      if (mk) labelHtml = `<span class="fr-label link"${ecAttr(MONSTER_HEX, 'monster')} data-act="fiche-monster" data-id="${esc(mk)}">${esc(aLabel)}</span>`;
    }
    // Couleur d'entité (task #77) : le badge de kind d'acteur distinguait déjà
    // PNJ/Activable (CATS.npc/CATS.qao) mais confondait un acteur "mob"
    // (créature, voir le correctif juste au-dessus) avec le générique #8d99ae
    // -- un acteur monstre porte désormais MONSTER_HEX, cohérent avec le lien
    // qu'il ouvre (fiche-monster) juste à côté.
    const actorHex = a.kind === 'npc' ? CATS.npc.hex : a.kind === 'object' ? CATS.qao.hex : a.kind === 'mob' ? MONSTER_HEX : '#8d99ae';
    return `
    <div class="frow">
      <span class="k-chip" style="--chip-c:${actorHex}">${a.kind === 'object' ? tr('activableBadge') : actorKindLabel(a.kind)}</span>
      ${labelHtml}
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
  const dialogs = (q.dialogs && (q.dialogs.npc?.length || q.dialogs.player?.length))
    ? `<div class="fiche-section"><details class="fiche-dialogs"><summary>${esc(tr('dialogsN', (q.dialogs.npc?.length || 0) + (q.dialogs.player?.length || 0)))}</summary>
        ${(q.dialogs.npc || []).map(l => `<p class="dlg dlg-npc">${esc(l)}</p>`).join('')}
        ${(q.dialogs.player || []).map(l => `<p class="dlg dlg-player">${esc(l)}</p>`).join('')}
      </details></div>` : '';
  const related = (q.related || []).filter(s => S.quests.has(s)).map(s =>
    `<div class="frow"><span class="k-chip" style="--chip-c:${CATS.quest.hex}">${esc(tr('questCat'))}</span>
     <span class="fr-label link"${ecAttr(CATS.quest.hex, 'quest')} data-act="fiche-quest" data-id="${esc(s)}">${esc(S.quests.get(s).name)}</span></div>`).join('');
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
    <div class="fiche-head">${iconTag(avatar, 'fiche-avatar', initials(q.giver))}
      <div><div class="fiche-kind" style="color:${CATS.quest.hex}">${esc(tr('questFicheKind', q.regions?.length ? q.regions[0] : ''))}</div><h2>${esc(q.name)}</h2>
      ${explainBadge}
      ${q.giver ? `<div class="reward-chips quest-giver-row">${npcChip(q.giver, giverNi)}</div>` : ''}
      ${q.maps?.length > 1 ? `<span class="pop-coords">${esc(tr('questMapsLine', q.maps.map(mapName).join(' · ')))}</span>` : ''}</div></div>
    <div class="fiche-section"><div class="pop-actions">
      ${q.x != null && q.posSource !== 'zone' ? `<button class="act primary" data-act="goto" data-x="${giverX}" data-z="${giverZ}" data-label="${esc(q.giver || q.name)}"${giverCatAttr}>${esc(tr('viewGiverBtn'))}</button>` : ''}
      ${zoneBtn}
      <button class="act" data-act="track" data-id="quest:${esc(slug)}">${esc(tr('trackBtn'))}</button>
      <button class="act" data-act="done" data-id="quest:${esc(slug)}">${esc(tr('doneBtn'))}</button>
    </div></div>
    ${journalHtml}
    ${dialogs}
    ${hintBox(q)}
    ${goalSteps}
    ${objectives}
    ${rewards}
    ${items}
    ${onMap}
    ${related ? `<div class="fiche-section"><h3>${esc(tr('relatedQuestsTitle'))}</h3>${related}</div>` : ''}`);
  drawInvestigation(q);
  drawQuestZone(slug);
  setFicheHash('quest', slug);
}

/* Ligne de butin partagée (fiche monstre/camp/coffre/table) : icône + nom
   cliquable + taux (dropRateHtml : ×N/garanti/%). Couleur d'entité (task
   #77) dérivée du linkAct : une ligne "fiche-item" est un OBJET (couleur de
   rareté, ou RECIPE_HEX + la bonne fiche si la clé résout en fait à un
   pseudo-item recette, voir itemFicheAct/itemEcHex/itemEcKind) ; une ligne
   "fiche-loot" (openItemFiche's dropsHtml -- le libellé est le nom d'une
   TABLE de butin, pas d'un autre item) porte LOOT_TABLE_HEX. Pas de couleur
   pour une ligne sans lien (rien à distinguer). */
function dropRow(icon, label, linkAct, linkId, rateHtml, glyph) {
  const it = linkAct === 'fiche-item' ? S.items[linkId] : null;
  const act = it ? itemFicheAct(it) : linkAct;
  const ecHtml = it ? ecAttr(itemEcHex(it), itemEcKind(it)) : linkAct === 'fiche-loot' ? ecAttr(LOOT_TABLE_HEX, 'loot') : '';
  const labelHtml = linkAct
    ? `<span class="fr-label link"${ecHtml} data-act="${act}" data-id="${esc(linkId)}">${esc(label)}</span>`
    : `<span class="fr-label">${esc(label)}</span>`;
  // data-n : nom replié pour le filtre local des longues listes (voir le
  // listener .stock-filter posé sur le drawer plus haut).
  return `<div class="frow" data-n="${esc(fold(label))}">${iconTag(icon, 'fr-icon', glyph || '📦')}${labelHtml}${rateHtml || ''}</div>`;
}

/* Fiche item : taux de drop (garanti / % séparés), vendeurs (+ position),
   recette (ingrédients cliquables), utilisé dans, quêtes liées, spots de
   farm. Toute clé du catalogue objet (site/data/items.json) est ouvrable
   ici -- SAUF les pseudo-items « recette » (it.kind==='recipe'/isRecipe),
   qui redirigent vers leur propre fiche dédiée (openRecipeFiche, task
   #78a/#78b) depuis fin juillet 2026 plutôt que de s'afficher ici sous un
   titre confus, dupliqué avec l'objet qu'elles servent à fabriquer. */

/* Fusion d'affichage des tables par TRANCHES DE NIVEAU : « Gathering
   Butchering Boars L01 04 / L05 09 / L10 14 » au même taux deviennent UNE
   ligne « … (L01–14) ». Ne fusionne que même base + même taux/quantité/
   garantie ; le clic ouvre la première tranche (fiche table). */
function dedupeTierDrops(drops) {
  const groups = new Map();
  for (const d of drops) {
    const m = /^(.*\S)\s+L(\d{2})\s+(\d{2})$/.exec(d.label || '');
    const base = m ? m[1] : (d.label || '');
    const gk = `${base}|${d.w}|${d.c}|${d.g}`;
    let e = groups.get(gk);
    if (!e) groups.set(gk, e = { ...d, base, first: d.label, lo: null, hi: null, n: 0 });
    e.n++;
    if (m) {
      const lo = +m[2], hi = +m[3];
      e.lo = e.lo == null ? lo : Math.min(e.lo, lo);
      e.hi = e.hi == null ? hi : Math.max(e.hi, hi);
    }
  }
  return [...groups.values()].map(e => ({
    ...e,
    label: e.n > 1 && e.lo != null
      ? `${e.base} (L${String(e.lo).padStart(2, '0')}–${String(e.hi).padStart(2, '0')})`
      : e.first,
  }));
}

/* ── « Comment farmer » (farm_spot_UX_DESIGN.md, refonte juillet 2026) ──────
   it.farm[] est une liste de camps DÉDUPLIQUÉE par le pipeline (une entrée
   par camp distinct sur TOUTES les tables de butin de l'item, plafonnée à
   24 -- build_site_data.py), chaque entrée ne portant que {camp, name, x, z}
   (name/x/z = repli PRÉ-groupement, x/z = seulement le point de spawn #0 du
   camp -- jamais un centroïde). La jointure vers le vrai nuage de points
   (S.camps, même clé stripée que campDisplayName/openCampFiche/
   campPointsForZone/le handler camp-highlight de main.js -- vérifiée
   identique aux 3 endroits déjà) tourne à ZÉRO changement pipeline et donne
   accès à g.kind (regroupement) + g.pts (nombre réel + surlignage complet),
   déjà utilisés par la fiche camp elle-même -- juste jamais exposés ici. */
const FARM_ROW_CAP = 6;

/* Détection « pool de récompense générique » : étend isRewardRow
   (openMonsterFiche, /_unlocked$/i + /tribute/i sur le butin monstre) au
   bloc de farm des objets. Calibré sur les VRAIES données expédiées (site/
   data/en/items.bin + camps.bin décodés directement pendant l'investigation,
   pas devinés) : les anchors nommés Synthesis Fuel/Battlepass Exp/Auction
   Ancient Coin/Weapon Masteries T4/Dismantling Tools/Reforge Recalibrator/
   Res Reward Cipher (+ ~354 items cosmétiques d'arène/battlepass) forment un
   cluster net et séparé de TOUT matériau thématique réel (Iron Ore, Res
   Thornorb Shard, la cinquantaine de minerais/gemmes/herbes/consommables T1)
   sur deux signaux tirés de it.drops (déjà chargé, aucune donnée pipeline
   supplémentaire) :
     - la PART des lignes de butin dont le libellé matche un motif de table
       attrape-tout connu (tribut/cadeau éternel/battlepass/récompense
       d'arène-dm-bg/« ne pas toucher »/farmsacks-épouvantails-tombes-livres-
       coffre de camp génériques...) ;
     - le nombre d'ESPÈCES DE MONSTRE distinctes (« Monster <Espèce> ») parmi
       ces lignes -- un vrai matériau de créature reste homogène (Res
       Thornorb Shard : 13 lignes « Monster Leaf ... » = 1 seule espèce, 6
       vrais camps), alors qu'un pool universel traîne sur 6 à 12 espèces
       sans rapport thématique (ex. Synthesis Fuel : Ratmutant/Sabath/
       Boarmommnth/Wolf/Imp/Spider/Fungus/Gnoose...).
   Seuils choisis par balayage complet du catalogue expédié (447 items avec
   farm : 364 basculent, 83 restent groupés) : aucun faux positif/négatif
   trouvé sur les anchors nommés ci-dessus ni sur les 83 items restants (tous
   des minerais/gemmes/herbes/consommables/objets de quête légitimes, ex.
   Iron Ore lui-même reste à 0.57 de ratio générique, sous le seuil 0.75).
   Une HEURISTIQUE honnête, pas un champ dédié du jeu -- si un futur ajout de
   contenu déjoue ces motifs, le pire cas est un retour silencieux à
   l'affichage groupé complet (jamais un plantage, jamais une donnée
   inventée). */
const FARM_GENERIC_POOL_RE = /_unlocked$|tribute|eternal gift|battlepass|\breward\b|do not touch|camp wandering monster|farmsacks|scarecrow|kitchenware|tombstones|searchable books|camp chest/i;
function isGenericFarmPoolItem(drops) {
  if (!drops?.length) return false;
  const generic = drops.filter(d => FARM_GENERIC_POOL_RE.test(d.label || '') || FARM_GENERIC_POOL_RE.test(d.first || ''));
  const roots = new Set();
  for (const d of drops) {
    const m = /^Monster\s+([A-Za-z]+)/.exec(d.label || '');
    if (m) roots.add(m[1]);
  }
  return (generic.length / drops.length) >= 0.75 || roots.size >= 3;
}

/* Ligne de camp JOINT (g trouvé dans S.camps) : pastille couleur de kind
   (même teinte que la fiche camp/les couches carte -- CAMP_COLORS), nom
   d'affichage réel (campDisplayName, pas le pretty() brut d'avant cette
   passe) cliquable vers la fiche camp complète (inchangé), et un bouton
   « Surligner » qui dessine le VRAI nuage de points de CE camp + vole à ses
   bornes -- même primitive/même libellé que le bouton de la fiche camp
   (data-n porte le compte BRUT, jamais formaté : main.js reconstruit ce même
   libellé au toggle-off via +b.dataset.n, un texte initial formaté
   différemment du texte de reset aurait clignoté au premier clic).
   `displayName` (facultatif) : repli fiche monstre (openMonsterFiche/
   monsterCampsHtml, "voir tous les spawns" July 2026) -- réutilise CETTE
   ligne telle quelle plutôt que d'en dupliquer une variante, mais le nom déjà
   COOK dans m.camps[].name (localisé, correctement casé -- ex.
   "Monsters-Imp-Windreach-Woods") vaut mieux que campDisplayName(key), dont
   le repli pretty() sur une clé non typée (kind monstre, jamais
   destroyable/searchable/reactive) ne remet en forme QUE la première lettre
   ("Monsters imp windreach woods") -- une régression de lisibilité pour ce
   contexte précis. Sans 2ᵉ argument (fiche objet), comportement inchangé. */
function farmCampRow(key, g, displayName = campDisplayName(key)) {
  const n = g.pts.length;
  const campHex = CAMP_COLORS[g.kind] || '#999';
  return `<div class="frow">
    <span class="rar-dot" style="background:${campHex}" title="${esc(campKindLabel(g.kind))}"></span>
    <span class="fr-label link"${ecAttr(campHex, 'camp')} data-act="fiche-camp" data-id="${esc(key)}">${esc(displayName)}</span>
    <button class="act ghost" data-act="camp-highlight" data-id="${esc(key)}" data-n="${n}">${esc(tr('highlightPointsBtn', n))}</button>
  </div>`;
}

/* Ligne de repli : camp NON trouvé dans S.camps (carte différente --
   préfixe ffm-island-*, confirmé réel sur ~24 % des items déjà groupés dans
   les données expédiées --, ou S.camps pas encore chargé). Comportement
   EXACT d'avant cette passe (réticule ambré, pas de compte inventé, pas de
   bouton Surligner qu'on ne peut pas honorer) -- honnête plutôt que de
   fabriquer un kind/point count qu'on n'a pas. Cas S.camps-pas-encore-chargé :
   se répare tout seul sans code supplémentaire ici, main.js ré-ouvre déjà
   cette fiche après loadDeferred() (même mécanisme que la course it.
   questSource/S.monsters documentée plus haut). */
function farmUnjoinedRow(c) {
  return `<div class="frow">
    <span class="fr-icon icon-broken" data-fb="📍"></span>
    <span class="fr-label link" data-act="fiche-camp" data-id="${esc(c.camp)}">${esc(c.name)}</span>
    ${gotoBtn(c.x, c.z, c.name)}
  </div>`;
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

/* Camps aplatis depuis S.camps (une entrée par camp distinct, tous kinds
   confondus) : jointure PARTAGÉE par farmSectionHtml (fiche objet) et
   monsterCampsHtml (fiche monstre, "voir tous les spawns" July 2026) --
   même lookup que openCampFiche/campPointsForZone/le handler camp-highlight
   de main.js, calculée une fois par site d'appel plutôt que dupliquée. */
function allCampGroupsFlat() { return Object.values(S.camps).flatMap(st => st.groups); }

/* Bouton « Montrer/voir tous les spawns » PARTAGÉ (task #79, quest-driven
   spawn highlighting) : union de TOUS les camps joints d'un monstre en un
   seul surlignage -- même primitive/libellé que le bouton de groupe de
   monsterCampsHtml ci-dessous (qui l'utilise désormais aussi, DRY) ET que
   goalTargetChip (étape de quête kill/kill_collect, "montre-moi les araignées
   concernées"). `m.camps` (voir data/SCHEMA.md monsters.json record shape)
   est l'UNION déjà cuite de tous les camps de la créature ; ce helper ne fait
   que la jointure vers le vrai nuage de points (allCampGroupsFlat) et compte
   RÉELLEMENT ce qui sera surligné -- jamais le compte brut `m.camps.length`
   quand certains de ces camps n'existent que sur une AUTRE carte (préfixe
   ffm-island-*, non joints ici) : le libellé doit rester honnête ("N camps"
   = N camps RÉELLEMENT allumables). Repli honnête : monstre sans camp DU
   TOUT, ou dont AUCUN camp ne se rejoint (autre carte) -> chaîne vide, jamais
   un bouton qui ne surlignerait rien. */
function monsterSpawnHighlightBtn(m) {
  const camps = m?.camps || [];
  if (!camps.length) return '';
  const allCampGroups = allCampGroupsFlat();
  const joined = camps.map(c => ({ c, g: allCampGroups.find(x => x.k === c.camp) })).filter(r => r.g);
  if (!joined.length) return '';
  const totalPts = joined.reduce((s, r) => s + r.g.pts.length, 0);
  const ids = joined.map(r => r.c.camp).join(',');
  return `<button class="act ghost" data-act="camp-highlight" data-ids="${esc(ids)}" data-n="${totalPts}" data-color="${MONSTER_HEX}">${esc(tr('monsterHighlightAllSpawns', joined.length, totalPts))}</button>`;
}

function farmSectionHtml(it) {
  if (!it.farm?.length) {
    // Repli honnête : des taux de drop catalogués mais AUCUN camp connu
    // derrière -- jamais une section farm absente en silence (ex. res_fang,
    // 17 tables de butin dont aucune n'est référencée par un camp du jeu de
    // données expédié -- un vrai trou de couverture, pas un bug de
    // jointure, voir farm_spot_UX_DESIGN.md §4).
    return it.drops?.length
      ? `<div class="fiche-section"><h3>${esc(tr('farmSpotsTitle'))}</h3><p class="hint">${esc(tr('farmSourcesNotMapped'))}</p></div>` : '';
  }
  // Pool de récompense générique : toute la section se replie en UNE ligne
  // muette plutôt que d'énumérer jusqu'à 24 camps sans rapport thématique.
  if (isGenericFarmPoolItem(it.drops)) {
    return `<div class="fiche-section"><h3>${esc(tr('farmSpotsTitle'))}</h3>
      <p class="hint">${esc(tr('farmGenericPoolNote', it.farm.length))}</p></div>`;
  }
  // Jointure camp -> vrai nuage de points (allCampGroupsFlat ci-dessus),
  // construite UNE fois ici plutôt qu'une fois par ligne (it.farm va jusqu'à
  // 24 entrées).
  const allCampGroups = allCampGroupsFlat();
  const byKind = new Map();
  const unjoined = [];
  for (const c of it.farm) {
    const g = allCampGroups.find(x => x.k === c.camp);
    if (g) {
      if (!byKind.has(g.kind)) byKind.set(g.kind, []);
      byKind.get(g.kind).push({ key: c.camp, g });
    } else {
      unjoined.push(c);
    }
  }
  // Groupes triés par total de points décroissant ; lignes internes pareil
  // (« top N par nombre de points », voir design §Q2).
  const groups = [...byKind.entries()].map(([kind, rows]) => {
    rows.sort((a, b) => b.g.pts.length - a.g.pts.length);
    const totalPts = rows.reduce((s, r) => s + r.g.pts.length, 0);
    return { kind, rows, totalPts };
  }).sort((a, b) => b.totalPts - a.totalPts);

  const groupsHtml = groups.map(grp => {
    // Bouton « Surligner tout » de groupe : n'a d'intérêt qu'à >1 camp --
    // avec un seul, il ferait doublon exact du bouton de sa propre ligne.
    const highlightAllBtn = grp.rows.length > 1
      ? `<button class="act ghost" data-act="camp-highlight" data-ids="${esc(grp.rows.map(r => r.key).join(','))}" data-n="${grp.totalPts}" data-color="${CAMP_COLORS[grp.kind] || '#888'}">${esc(tr('highlightPointsBtn', grp.totalPts))}</button>`
      : '';
    return `<div class="farm-group">
      <div class="farm-group-head">
        <span class="farm-group-label" style="color:${CAMP_COLORS[grp.kind] || '#999'}">${esc(campKindLabel(grp.kind))}</span>
        <span class="muted">${esc(tr('farmGroupSummary', grp.rows.length, grp.totalPts.toLocaleString(numberLocale())))}</span>
        ${highlightAllBtn}
      </div>
      ${farmCapRows(grp.rows, r => farmCampRow(r.key, r.g), n => tr('farmMoreCampsN', n))}
    </div>`;
  }).join('');

  const unjoinedHtml = unjoined.length
    ? `<div class="farm-group">
        <div class="fiche-sub">${esc(tr('farmOtherSourcesTitle'))}</div>
        ${farmCapRows(unjoined, farmUnjoinedRow, n => tr('farmMoreCampsN', n))}
      </div>` : '';

  return `<div class="fiche-section"><h3>${esc(tr('farmSpotsTitle'))}</h3>${groupsHtml}${unjoinedHtml}</div>`;
}

/* Section « Apparaît dans » de la fiche monstre (openMonsterFiche) : même
   jointure camp -> vrai nuage de points que farmSectionHtml ci-dessus
   (allCampGroupsFlat), + un bouton de groupe qui UNIT tous les camps joints
   du monstre en un seul surlignage (data-ids CSV, handler camp-highlight de
   main.js) -- la demande d'origine ("où sont les imps bleus ?") attend
   l'UNION des nuages réels de TOUS les camps de la créature (4 camps ≈ 900+
   points pour les imps), jamais une poignée de points choisis à la main.
   m.camps[] porte déjà {camp, name, x, z} PAR CAMP (name pré-localisé côté
   pipeline) -- une forme strictement identique à it.farm[], donc les MÊMES
   lignes sont réutilisées telles quelles : farmCampRow (camp joint, avec son
   3ᵉ argument pour garder le nom déjà cuit dans m.camps plutôt que le repli
   pretty() de campDisplayName, voir sa doc) et farmUnjoinedRow (camp d'une
   autre carte, préfixe ffm-island-* -- 449 refs réelles sur le catalogue
   monstre expédié, jamais un compte fabriqué). Bouton de groupe omis à ≤1
   camp joint (ferait doublon exact du bouton de sa propre ligne, même
   convention que highlightAllBtn/farmSectionHtml ci-dessus) ; 0 camp DU TOUT
   retombe sur la pastille "unknown" déjà en place (unknown_states_DESIGN.md
   #10, task #67 -- comportement inchangé). */
function monsterCampsHtml(m) {
  const camps = m.camps || [];
  const title = esc(tr('monsterCampsN', camps.length));
  if (!camps.length) {
    return `<div class="fiche-section"><h3>${title}</h3>
      <p class="hint">${stateChip('unknown')} ${esc(tr('noCampsKnown'))}</p></div>`;
  }
  const allCampGroups = allCampGroupsFlat();
  const joined = [], unjoined = [];
  for (const c of camps) {
    const g = allCampGroups.find(x => x.k === c.camp);
    if (g) joined.push({ c, g }); else unjoined.push(c);
  }
  joined.sort((a, b) => b.g.pts.length - a.g.pts.length);
  // Bouton de groupe (monsterSpawnHighlightBtn, PARTAGÉ avec goalTargetChip
  // -- task #79) omis à ≤1 camp joint : ferait doublon exact du bouton de sa
  // propre ligne (farmCampRow, même highlight/même clic) juste en dessous.
  const highlightAllBtn = joined.length > 1
    ? `<div class="pop-actions">${monsterSpawnHighlightBtn(m)}</div>`
    : '';
  const rowsHtml = farmCapRows(
    [...joined.map(r => ({ row: r, joined: true })), ...unjoined.map(c => ({ row: c, joined: false }))],
    x => x.joined ? farmCampRow(x.row.c.camp, x.row.g, x.row.c.name) : farmUnjoinedRow(x.row),
    n => tr('farmMoreCampsN', n),
  );
  return `<div class="fiche-section"><h3>${title}</h3>${highlightAllBtn}${rowsHtml}</div>`;
}

/* Bloc(s) « ingrédients » d'une recette -- UN bloc par référence ATTEIGNABLE
   (it.recipes : [{key, rarity?}]), PARTAGÉ par openItemFiche (section
   « Recette » d'un objet craftable) ET openRecipeFiche ci-dessous (la recette
   EST la fiche, task #78a/#78b) -- même rendu, jamais dupliqué. `ownKey` = la
   clé de la fiche actuellement ouverte (l'objet crafté pour openItemFiche, le
   pseudo-item recette lui-même pour openRecipeFiche) : le chip "produit →"
   ne s'affiche que quand r.output diffère de CETTE clé (jamais un lien qui
   pointerait vers la fiche déjà ouverte). */
function recipeIngredientBlocks(recipeRefs, ownKey) {
  return (recipeRefs || []).map(ref => {
    const rk = typeof ref === 'string' ? ref : ref.key;
    const rarity = typeof ref === 'string' ? null : ref.rarity;
    const r = S.recipes[rk];
    if (!r) return '';
    const metaLine = [r.prof ? professionLabel(r.prof) : null, rarity ? rarityLabel(rarity) : null]
      .filter(Boolean).join(' · ');
    const meta = metaLine ? `<div class="pop-coords recipe-meta">${esc(metaLine)}</div>` : '';
    // BUG FIX (regression, was chipList(r.ingredients)): r.ingredients is
    // [{key,count}] (see  not
    // an array of string keys -- chipList's itemChip(key) did S.items[key]
    // with `key` being an OBJECT (always undefined), then pretty(key) threw
    // a TypeError (.replace on a non-string), aborting openItemFiche()
    // before openFiche() ever ran. Net effect: opening ANY item fiche with
    // a recipe that has ingredients silently did nothing in the UI. Use the
    // quantity-aware chip list instead (same {key,count} shape as quest
    // rewards, see qtyItemChip/qtyChipList above).
    const ing = qtyChipList(r.ingredients);
    const out = (r.output && r.output !== ownKey)
      ? `<div class="recipe-out">${esc(tr('producesArrow'))}${itemChip(r.output)}</div>` : '';
    return `<div class="recipe-block">${meta}<div class="reward-chips">${ing}</div>${out}</div>`;
  }).join('');
}

/* Fiche « recette » (task #78a searchable-recipes / #78b item IA) : LE
   pseudo-item catalogue it.kind==='recipe' EST la recette (voir
   data/SCHEMA.md recipes.json "Site propagation" -- une entrée standalone
   par craft distinct, name/icon/rarities copiés de l'objet produit, jamais
   un objet du jeu à part entière) -- cherchable même sans présence propre
   (vendu/looté/quête), voir search.js. Avant cette passe, cette clé restait
   ouvrable UNIQUEMENT via openItemFiche (jamais fausse — voir son ancien
   commentaire "y compris les « recette d'objet »" -- mais confuse : même nom
   que l'objet qu'elle sert à fabriquer, aucune couleur/kind propre, jusqu'à 3
   blocs d'ingrédients identiques répétés pour Epic/Rare/Uncommon). Contenu ici :
   identité (nom = celui du crafté, profession, raretés atteignables), un chip
   "produit →" bien visible vers l'objet fabriqué (symétrique du chip
   [Recette : X] posé sur SA fiche, task #78b), les ingrédients
   (recipeIngredientBlocks, PARTAGÉ avec openItemFiche) et les quêtes qui
   citent cette recette (it.quests, même forme {slug,role} qu'un item normal).
   Pas de lien profond dédié (setFicheHash(null)) -- même choix que
   openLocationFiche/openAbilityFiche/openLootTableFiche ci-dessus : un
   catalogue de référence ouvert depuis une autre fiche/la recherche, pas un
   marqueur carte avec sa propre URL partageable. */
function openRecipeFiche(key) {
  const it = S.items[key];
  if (!it || !isRecipeKind(it)) return;
  S.openFiche = { kind: 'recipe', id: key };
  const icon = it.icon ? `icons/${it.icon}` : null;
  const devMark = it.isTest ? `<span class="dev-mark" title="${esc(tr('devBadgeTitle'))}">${esc(tr('devBadge'))}</span>` : '';
  const raritiesLine = it.rarities?.length ? it.rarities.map(rarityLabel).join(' / ') : '';
  const outKey = (it.recipes || [])
    .map(ref => (typeof ref === 'string' ? ref : ref.key))
    .map(rk => S.recipes[rk]?.output)
    .find(o => o && o !== key) || null;
  const outItem = outKey ? S.items[outKey] : null;
  const craftsHtml = outItem
    ? `<div class="recipe-out">${esc(tr('producesArrow'))}${itemChip(outKey)}</div>` : '';
  const blocks = recipeIngredientBlocks(it.recipes, key);
  const ingredientsHtml = blocks ? `<div class="fiche-section">${blocks}</div>` : '';
  const questsHtml = it.quests?.length
    ? `<div class="fiche-section"><h3>${esc(tr('relatedQuestsTitle'))}</h3>${it.quests.map(({ slug, role }) => {
        const q = S.quests.get(slug);
        if (!q) return '';
        return `<div class="frow">
          <span class="k-chip" style="--chip-c:${role === 'reward' ? CATS.quest.hex : CATS.qao.hex}">${role === 'reward' ? esc(tr('rewardBadge')) : esc(tr('requiredBadge'))}</span>
          <span class="fr-label link"${ecAttr(CATS.quest.hex, 'quest')} data-act="fiche-quest" data-id="${esc(slug)}">${esc(q.name)}</span>
        </div>`;
      }).join('')}</div>` : '';
  openFiche(`
    <div class="fiche-head">${iconTag(icon, 'fiche-avatar', itemGlyph(it))}
      <div><div class="fiche-kind" style="color:${RECIPE_HEX}">${esc(tr('recipeTitle'))}${it.prof ? ' · ' + esc(professionLabel(it.prof)) : ''}${raritiesLine ? ' · ' + esc(raritiesLine) : ''}${devMark}</div>
      <h2>${esc(it.name)}</h2>
      ${craftsHtml}</div></div>
    ${ingredientsHtml}
    ${questsHtml}`);
  setFicheHash(null);
}

function openItemFiche(key) {
  const it = S.items[key];
  if (!it) return;
  // Recette (task #78a/#78b) : jamais la fiche objet générique pour un
  // pseudo-item recette -- voir itemFicheAct/openRecipeFiche ci-dessus. Filet
  // de sécurité (tout appelant qui n'est PAS déjà passé par itemFicheAct,
  // ex. un vieux lien profond partagé i=rec_..._unlocked avant cette passe) :
  // s'auto-corrige vers la bonne fiche plutôt que d'afficher la fiche objet
  // confuse d'avant cette passe.
  if (isRecipeKind(it)) { openRecipeFiche(key); return; }
  S.openFiche = { kind: 'item', id: key };
  const icon = it.icon ? `icons/${it.icon}` : null;
  const rarity = RARITY[it.rarity];
  const itemKindText = itemKindLabel(it.kind) || pretty(it.kind || 'item');
  const kindHex = rarity ? rarity.hex : 'var(--muted)';
  // Contenu dev (feature #13) : marqueur explicite sur un item isTest ouvert
  // (toujours ouvrable par lien profond direct, jamais un 404 silencieux —
  // seule sa présence dans la RECHERCHE dépend de S.devOn, voir search.js).
  const devMark = it.isTest ? `<span class="dev-mark" title="${esc(tr('devBadgeTitle'))}">${esc(tr('devBadge'))}</span>` : '';

  const descHtml = it.desc
    ? `<div class="fiche-section"><p class="fiche-journal">${esc(it.desc)}</p></div>` : '';

  // Effet(s) de la/des capacité(s) liée(s) (item_desc_PLAN.md Phase B) --
  // jointure déjà faite au build (it.useEffect), rendue ici seulement.
  const useEffectHtml = useEffectSection(it);

  // Plages de jet/DPS d'arme (stat_ranges/weapon_dps), formule d'artefact
  // T3 (artifact_formula) et mise à l'échelle rune/puce (rarity_scaling/
  // tier_scaling) -- port_map.md #8/#9/#10, voir les fonctions partagées
  // définies plus haut (rollRangeSection/formulaHtml/scalingSection).
  const rollRangeHtml = rollRangeSection(it, key);
  const formulaHtmlBlock = it.artifact_formula ? formulaHtml(it.artifact_formula, { rarityNote: true }) : '';
  const scalingHtml = scalingSection(it);

  let dropsHtml = '';
  if (it.drops?.length) {
    const drops = dedupeTierDrops(it.drops);
    // d.label = nom lisible de la table de butin (camp/source), pas d'un
    // autre item -- pas d'icône/clé propre, seul le taux (dropRateHtml)
    // est commun avec monsterLootRow ci-dessus.
    const guaranteed = drops.filter(d => d.g);
    const chance = drops.filter(d => !d.g);
    dropsHtml = `<div class="fiche-section"><h3>${esc(tr('dropRatesTitle'))}</h3>
      ${guaranteed.length ? `<h4 class="fiche-sub">${esc(tr('guaranteedLabel'))}</h4>${guaranteed.map(d => dropRow(null, d.label, 'fiche-loot', d.first, dropRateHtml(d))).join('')}` : ''}
      ${chance.length ? `<h4 class="fiche-sub">${esc(tr('chanceLabel'))}</h4>${chance.map(d => dropRow(null, d.label, 'fiche-loot', d.first, dropRateHtml(d))).join('')}` : ''}
    </div>`;
  }

  const farmHtml = farmSectionHtml(it);

  let vendorsHtml = '';
  if (it.soldBy?.length) {
    const blocks = it.soldBy.map(vk => {
      const v = S.vendors[vk];
      if (!v) return '';
      const npcs = v.npcs || [];
      // Marchand cliquable vers sa fiche PNJ (avec son vrai portrait) quand il
      // est connu de la carte active — navigation objet → marchand → boutique.
      const npcRows = npcs.slice(0, 6).map(n => {
        const ni = npcIndexByName(n.name);
        const rec = ni >= 0 ? S.data.npc[ni] : null;
        const icon = rec?.icon ? `icons/npc_map/${encodeURIComponent(rec.icon)}.png` : null;
        const label = ni >= 0
          ? `<span class="fr-label link"${ecAttr(CATS.npc.hex, 'npc')} data-act="fiche-npc" data-id="npc:${ni}">${esc(n.name)}</span>`
          : `<span class="fr-label"${ecAttr(CATS.npc.hex, 'npc')}>${esc(n.name)}</span>`;
        return `<div class="frow">
          ${iconTag(icon, 'fr-icon', initials(n.name))}
          ${label}
          ${gotoBtn(n.x, n.z, n.name, 'npc')}
        </div>`;
      }).join('');
      const more = npcs.length > 6 ? `<p class="hint">${esc(tr('moreMerchants', npcs.length - 6))}</p>` : '';
      // En-tête technique du stand (« Tt Trader Drek ») masqué quand des PNJ
      // nommés existent en dessous — bruit d'asset, pas un nom joueur.
      const showName = !(npcs.length && /^tt[\s_]/i.test(v.name || ''));
      return `<div class="vendor-block">${showName ? `<div class="vendor-name">${esc(v.name)}</div>` : ''}${npcRows || `<p class="hint">${esc(tr('merchantPosUnknown'))}</p>`}${more}</div>`;
    }).join('');
    if (blocks) vendorsHtml = `<div class="fiche-section"><h3>${esc(tr('soldByTitle'))}</h3>${blocks}</div>`;
  }

  // Une entrée par rareté ATTEIGNABLE (déjà dédupliqué côté pipeline — voir
  // data/SCHEMA.md recipes.json "rarity"/"variant_group" : un seul craft/jeu
  // d'ingrédients peut produire plusieurs raretés en tirage pondéré). Rendu
  // PARTAGÉ avec openRecipeFiche (recipeIngredientBlocks ci-dessus) — jamais
  // deux implémentations du même bloc ingrédients/produit.
  const recipeBlocks = it.recipes?.length ? recipeIngredientBlocks(it.recipes, key) : '';
  const recipeHtml = recipeBlocks ? `<div class="fiche-section"><h3>${esc(tr('recipeTitle'))}</h3>${recipeBlocks}</div>` : '';
  // Chip [Recette : <nom>] bien visible dans l'en-tête (task #78b, item IA
  // pass) : référence PROMINENTE vers la fiche recette dédiée
  // (openRecipeFiche), une par clé de recette DISTINCTE (un seul craft a
  // presque toujours une seule clé canonique partagée par ses raretés — voir
  // le commentaire ci-dessus —, mais un item avec 2 méthodes de craft
  // vraiment séparées montrerait 2 chips, jamais un doublon). Jamais affiché
  // pour un item non craftable (it.recipes vide) -- pas de chip fantôme.
  let recipeChipHtml = '';
  if (it.recipes?.length) {
    const seenRk = new Set();
    const chips = [];
    for (const ref of it.recipes) {
      const rk = typeof ref === 'string' ? ref : ref.key;
      if (seenRk.has(rk) || !S.recipes[rk]) continue;
      seenRk.add(rk);
      const rIcon = S.recipes[rk].icon ? `icons/${S.recipes[rk].icon}` : null;
      chips.push(`<span class="chip"${ecAttr(RECIPE_HEX, 'recipe')} data-act="fiche-recipe" data-id="${esc(rk)}">${iconTag(rIcon, 'chip-icon', '📜')}${esc(tr('recipeChipLabel', it.name))}</span>`);
    }
    if (chips.length) recipeChipHtml = `<div class="reward-chips item-recipe-row">${chips.join('')}</div>`;
  }

  let usedHtml = '';
  if (it.usedIn?.length) {
    // Several recipe tiers/variants (base, "_unlocked", synthesis 1/2…) often
    // craft the same result — dedup on what's actually shown, not the recipe key.
    const seen = new Set();
    const chips = [];
    for (const rk of it.usedIn) {
      const r = S.recipes[rk];
      if (!r) continue;
      const outKey = (r.output && r.output !== key) ? r.output : null;
      const outItem = outKey ? S.items[outKey] : null;
      const name = outItem?.name || r.name;
      if (seen.has(name)) continue;
      seen.add(name);
      chips.push(outItem ? itemChip(outKey) : `<span class="chip">${esc(name)}</span>`);
    }
    if (chips.length) usedHtml = `<div class="fiche-section"><h3>${esc(tr('usedInTitle'))}</h3><div class="reward-chips">${chips.join('')}</div></div>`;
  }

  // Quest-scripted-only sourcing fallback (quest-guide-feature plan sec
  // 5.2/6.3) : dropsHtml/vendorsHtml/recipeHtml all empty is the DOMINANT
  // case for a genuine quest item (dropped_in/sold_by/produced_by_recipes
  // are all empty by design, e.g. every quest_item_imp_brain_*) — instead of
  // silently showing an empty "how to obtain" section, render the one true
  // source: the quest goal that actually resolved this item (geo.py's
  // resolver, NEVER inferred here — it.questSource only exists when that
  // resolver produced a real monster/object target for it).
  let questSourceHtml = '';
  if (!dropsHtml && !vendorsHtml && !recipeHtml && it.questSource) {
    const qs = it.questSource;
    const srcQuest = S.quests.get(qs.quest);
    if (srcQuest) {
      // BUG FIX (deferred-render race, quest-guide-feature follow-up task
      // 3): the monster's display name used to be read LIVE from
      // S.monsters[qs.monster_key] -- S.monsters is a DEFERRED bundle,
      // loaded well after S.items/S.quests (this very fiche's own data), so
      // this line was silently ABSENT for several seconds on every cold
      // cache load, only appearing once main.js's post-loadDeferred()
      // re-render caught up. It also failed PERMANENTLY (not just during
      // the race) for any monster whose resolved key got folded into a
      // DIFFERENT (name,level)-grouped representative by monsters_site() --
      // S.monsters[qs.monster_key] then stays undefined forever. qs.
      // monster_name is now baked at build time straight from geo.py's own
      // resolved monster name (see build_site_data.py::build_catalog()),
      // independent of the client's catalog grouping -- first render is
      // already correct, no client-side lookup needed at all.
      //
      // Mechanism decode job B: quest_source_of now covers every mechanism
      // that ever resolves an item (build_site_data.py's build_catalog()),
      // not just kill/interact -- one viaLine phrase per `qs.via`, each
      // mirroring the exact fact that mechanism's target shape carries
      // (never inferred beyond what's on `qs`).
      let viaLine = '';
      if (qs.via === 'kill') {
        const viaName = qs.monster_name || null;
        const viaText = viaName ? esc(tr('obtainViaKill', viaName)) : '';
        // The clickable upgrade (monster fiche link) legitimately CAN'T
        // resolve before S.monsters loads -- monsterKeyFor guards it exactly
        // like every other such link in this file (actorRows, goalTargetChip);
        // it silently upgrades in place once loadDeferred() completes and this
        // fiche gets re-rendered. Unlike the name above, this part of the
        // race is unavoidable (S.monsters itself has to exist to know the
        // fiche does), so it degrades to plain text instead, never a dead link.
        const viaMonsterKey = qs.monster_key ? monsterKeyFor(qs.monster_key, qs.monster_name) : null;
        viaLine = viaText
          ? `<p class="hint">${viaMonsterKey
              ? `<span class="link"${ecAttr(MONSTER_HEX, 'monster')} data-act="fiche-monster" data-id="${esc(viaMonsterKey)}">${viaText}</span>`
              : viaText}</p>`
          : '';
      } else if (qs.via === 'container') {
        // collect_from_object (renamed from the old generic "interact" --
        // same wording, see build_site_data.py's own comment on the rename).
        viaLine = qs.object_label ? `<p class="hint">${esc(tr('obtainViaInteract', qs.object_label))}</p>` : '';
      } else if (qs.via === 'harvest') {
        viaLine = `<p class="hint">${esc(tr('obtainViaHarvest', professionLabel(capitalize(qs.profession))))}</p>`;
      } else if (qs.via === 'given_by') {
        // receive_npc, or the "collect" mechanism's own given-by-giver
        // safety-net branch (see build_site_data.py) -- NPC name is now the
        // SHARED npcChip component (task #70 / fiche-header identity pass),
        // the same one the quest header's own "given by" row uses, instead
        // of the whole sentence wrapped in a bare `.link` span (audit
        // finding: wired to a real data-act click but with ZERO matching CSS
        // rule -- clickable, but visually identical to plain text). Prefix
        // text reuses goalGivenByLabel ("given by") -- only the chip carries
        // the click/link now, never a guessed link when the NPC isn't
        // resolvable (npcChip degrades to a plain styled name honestly).
        viaLine = qs.npc
          ? `<p class="hint">${esc(tr('goalGivenByLabel'))} ${npcChip(qs.npc, qs.npc ? npcIndexByName(qs.npc) : -1)}</p>`
          : '';
      } else if (qs.via === 'reward_of') {
        // receive_reward: granted via a DIFFERENT quest's own turn-in NPC
        // (qs.npc) upon completing THAT quest (qs.quests[0] -- the anchor
        // case, "Time of Death": qs.quest is thistlebrooks_terrifying_task,
        // the quest whose journal lists this as an objective, but qs.
        // quests[0] is eight_legged_freaks, whose completion actually grants
        // it) -- both facts named explicitly. NPC name: same npcChip as
        // given_by above (task #70). Quest name: kept as a `.link`-styled
        // span (now visibly affordant too, see the generalized `.link` CSS
        // rule) rather than a second chip -- never a guessed/fabricated link.
        const givenBit = qs.npc ? `${esc(tr('goalGivenByLabel'))} ${npcChip(qs.npc, npcIndexByName(qs.npc))}` : '';
        const rqSlug = qs.quests?.[0];
        const rqName = qs.quest_names?.[0] || (rqSlug ? pretty(rqSlug) : null);
        const rqSpan = rqName
          ? (rqSlug && S.quests.has(rqSlug)
              ? `<span class="link"${ecAttr(CATS.quest.hex, 'quest')} data-act="fiche-quest" data-id="${esc(rqSlug)}">${esc(tr('obtainViaRewardOfQuest', rqName))}</span>`
              : `<span>${esc(tr('obtainViaRewardOfQuest', rqName))}</span>`)
          : '';
        const bits = [givenBit, rqSpan].filter(Boolean);
        viaLine = bits.length ? `<p class="hint">${bits.join(' — ')}</p>` : '';
      } else if (qs.via === 'world') {
        viaLine = `<p class="hint">${esc(tr('obtainViaWorld'))}</p>`;
      }
      questSourceHtml = `<div class="fiche-section"><h3>${esc(tr('obtainDuringQuestTitle'))}</h3>
        <div class="frow">
          <span class="k-chip" style="--chip-c:${CATS.quest.hex}">${esc(tr('questCat'))}</span>
          <span class="fr-label link"${ecAttr(CATS.quest.hex, 'quest')} data-act="fiche-quest" data-id="${esc(qs.quest)}">${esc(srcQuest.name)}</span>
        </div>
        ${viaLine}
      </div>`;
    }
  }

  const questsHtml = it.quests?.length
    ? `<div class="fiche-section"><h3>${esc(tr('relatedQuestsTitle'))}</h3>${it.quests.map(({ slug, role }) => {
        const q = S.quests.get(slug);
        if (!q) return '';
        return `<div class="frow">
          <span class="k-chip" style="--chip-c:${role === 'reward' ? CATS.quest.hex : CATS.qao.hex}">${role === 'reward' ? esc(tr('rewardBadge')) : esc(tr('requiredBadge'))}</span>
          <span class="fr-label link"${ecAttr(CATS.quest.hex, 'quest')} data-act="fiche-quest" data-id="${esc(slug)}">${esc(q.name)}</span>
        </div>`;
      }).join('')}</div>` : '';

  const weaponLine = weaponTypeLine(it.weapon);
  // Titre désambiguïsé (fix UX) : un item de quête lié à une quête par le
  // résolveur (it.questSource — jamais inventé côté front, voir
  // build_site_data.py) et qui y a des HOMONYMES (les 3 « Imp Brain »
  // d'imp_brain_hunt) affichait 3 fois le même <h2> — la distinction
  // n'existait que dans le corps (« By killing Imp executioner »). Le
  // suffixe vient de LA même source que partout ailleurs
  // (disambiguateQuestItems sur les items de SA quête + le formateur
  // disambiguatedItemName) : archetype discriminant d'abord, repli
  // positionnel #N sinon, et nom nu quand l'item n'a pas d'homonyme
  // (aucun suffixe fabriqué). Map LOCALE — ne touche pas
  // currentQuestItemDisambig, qui appartient à la fiche quête ouverte.
  let titleName = it.name;
  if (it.questSource) {
    const srcQ = S.quests.get(it.questSource.quest);
    if (srcQ?.items?.length) {
      titleName = disambiguatedItemName(it.name, key, disambiguateQuestItems(srcQ.items));
    }
  }
  // Bien craftable sans rareté fixe (recette pure, pas d'item.rarity propre) :
  // liste des raretés ATTEIGNABLES par le craft (it.rarities, tirage pondéré
  // -- voir data/SCHEMA.md recipes.json) à la place d'une rareté unique.
  const raritiesLine = !rarity && it.rarities?.length ? it.rarities.map(rarityLabel).join(' / ') : '';
  // Sélecteur de rareté : quand la clé ouverte appartient à un groupe de
  // variantes « même nom » (voir rarity.js::buildRarityGroups), une pastille
  // par rareté ; celle de la fiche courante est allumée, les autres rouvrent
  // leur variante (data-act=fiche-item -> openItemFiche, qui met à jour
  // prix/butin/hash).
  let raritySelectHtml = '';
  const grp = rarityGroupFor(key);
  if (grp) {
    const rars = Object.keys(grp.variants).sort((a, b) => RARITY_ORDER[a] - RARITY_ORDER[b]);
    const pills = rars.map(r => {
      const vk = grp.variants[r];
      return pillHtml({ active: vk === key, hex: RARITY[r]?.hex || 'var(--muted)', label: rarityLabel(r) || r, act: 'fiche-item', id: vk });
    }).join('');
    raritySelectHtml = pillSelectHtml('rarityVariantsLabel', pills);
  }
  // Ordre de la fiche (task #78b, item information-architecture pass) --
  // jugé sur 4 archétypes réels (arme craftable Ronin Bow, matériau de
  // récolte, item de quête Imp Brain/Cause of Death, consommable avec effet) :
  //   1. IDENTITÉ    -- en-tête (icône/kind/rareté/titre) + sélecteur de
  //      rareté + description -- qui c'est, jamais noyé sous "comment
  //      l'obtenir" pour un simple survol.
  //   2. COMMENT L'OBTENIR -- chip [Recette : X] bien visible dans l'en-tête
  //      dès que craftable (task #78b) puis, dans l'ordre où un joueur les
  //      envisagerait (le plus direct d'abord) : source de quête (le SEUL
  //      fait pour un item de quête synthétique), vendeurs, taux de drop,
  //      spots de farm.
  //   3. UTILISATION -- effet d'usage, plage de jet/DPS, formule d'artefact,
  //      mise à l'échelle -- ce que l'objet FAIT une fois obtenu, jamais avant
  //      qu'on sache comment l'obtenir.
  //   4. Ce dans quoi il sert d'INGRÉDIENT (usedHtml) -- symétrique de
  //      "comment l'obtenir", mais secondaire (un craft qui consomme CET
  //      objet, pas qui le produit).
  //   5. Quêtes liées (récompense/requis) -- contexte narratif, pas une
  //      action immédiate.
  //   6. Le reste -- détail ingrédient-par-ingrédient de la recette
  //      (recipeHtml, déjà résumé par le chip du point 2 ; son contenu
  //      interne est inchangé, seule sa PLACE bouge ici).
  // Rien n'est retiré : chaque section existante garde exactement son rendu
  // interne (Use-effect/formule/farm/chips d'état/titres désambiguïsés) --
  // seul l'ORDRE change, plus le chip [Recette] qui est net-new.
  openFiche(`
    <div class="fiche-head">${iconTag(icon, 'fiche-avatar', itemGlyph(it))}
      <div><div class="fiche-kind" style="color:${kindHex}">${esc(itemKindText)}${rarity ? ' · ' + esc(rarityLabel(it.rarity)) : ''}${raritiesLine ? ' · ' + esc(raritiesLine) : ''}${it.tier ? ' · ' + esc(it.tier) : ''}${devMark}</div>
      <h2>${esc(titleName)}</h2>
      ${weaponLine ? `<span class="pop-coords">${esc(weaponLine)}</span>` : ''}
      ${it.prof ? `<span class="pop-coords">${esc(professionLabel(it.prof))}</span>` : ''}
      ${recipeChipHtml}</div></div>
    ${raritySelectHtml}
    ${descHtml}
    ${questSourceHtml}
    ${vendorsHtml}
    ${dropsHtml}
    ${farmHtml}
    ${useEffectHtml}
    ${rollRangeHtml}
    ${formulaHtmlBlock}
    ${scalingHtml}
    ${usedHtml}
    ${questsHtml}
    ${recipeHtml}`);
  setFicheHash('item', key);
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
  if (sz.confidence === 'medium') { drawEstimatedZone(sz); return; }
  clearHighlight();
  drawGoalZone(sz);
}
/* Vol vers la zone de quête surlignée (bouton « Voir la zone »). */
function flyToQuestZone(slug) {
  const rings = S.zonesQuest[slug];
  if (rings?.length) map.flyToBounds(L.latLngBounds(rings.flat().map(([x, z]) => toLL(x, z))).pad(0.3));
}

export {
  closeFiche, openNpcFiche, openQuestFiche, openItemFiche, openCampFiche,
  openMonsterFiche, openLocationFiche, openAbilityFiche, openLootTableFiche,
  openChestFiche, openSearchableChestFiche, openRecipeFiche, itemColor, viewGoalZone, flyToQuestZone, viewMonsterZone, setRollRarity,
};
