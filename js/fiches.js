/* Kwalat — fiches (drawer de détail) : PNJ, quête, objet, camp, monstre,
   bestiaire/lore, capacité — plus leurs briques partagées (lignes de butin,
   boutons carte, badges de position à 3 niveaux, sections stock/recette).
   Chaque fiche pose son lien profond via setFicheHash ; les surcouches
   carte propres aux fiches (fil d'enquête, zones de quête/objectif) vivent
   ici aussi. */
import { S } from './state.js';
import {
  CATS, CAMP_COLORS, RARITY, MONSTER_HEX, LOCATION_HEX, ABILITY_HEX,
  actorKindLabel, campKindLabel, monsterAttackLabel, locationKindLabel,
  rarityLabel, itemKindLabel, professionLabel, harvestMethodLabel,
  weaponTypeLine, ACTION_META, actionVerb, actionIconSvg, mapName,
  campDisplayName, campLootTableName, chestDisplayName,
  statLabel, statTierLabel, formulaTermLabel,
  chestHex, chestKindLabel, prettyRegion, LOOT_TABLE_HEX,
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
      <span class="muted">${m.lvl ? tr('levelAbbrev', m.lvl) : ''}${m.atk ? ' · ' + esc(m.atk) : ''}</span>
    </div>`).join('');
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
    ${mobs ? `<div class="fiche-section"><h3>${esc(tr('likelyMonsters', det.mobs.length))}</h3>${mobs}</div>` : ''}
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
    <div class="fiche-section"><p class="hint">${esc(tr('searchableChestRarityNote'))}</p></div>
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
  if (!list?.length) return `<p class="hint">${esc(tr(emptyKey))}</p>`;
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
function perTierStatsSection(level, sf) {
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
    ${hasUnverified ? `<p class="hint">${esc(tr('statsBossEliteCaveat'))}</p>` : ''}</div>`;
}
function monsterStatsSection(m) {
  // 1. Relevé client RÉEL (mbt_10_troll_rusty_boss, les 4 bosses d'arène
  //    nommés récupérés via m_abs_* -- voir Finding 1 -- + quelques mobs à
  //    bloc complet) : grille numérique + badge « réel » avec info-bulle
  //    explicite pour bien le distinguer de la fourchette générique estimée
  //    ci-dessus (même donnée qu'avant ce correctif, badge juste plus explicite).
  if (m.statsSource === 'record' && m.stats && Object.keys(m.stats).length) {
    return `<div class="fiche-section"><h3>${esc(tr('statsTitle'))}<span class="stats-badge" title="${esc(tr('realStatsTooltip'))}">${esc(tr('realStatsBadge'))}</span></h3>${statsGridHtml(m.stats)}</div>`;
  }
  // 2. Mob portant DIRECTEMENT des stats calculées par la formule (palier
  //    résolu côté données — dormant aujourd'hui, aucun mob non-template n'en
  //    a, mais honoré si un décodage futur en publie) : grille + badge
  //    « calculé (formule du jeu) ».
  if (m.statsComputed) {
    return `<div class="fiche-section"><h3>${esc(tr('statsTitle'))}<span class="stats-badge">${esc(tr('computedStatsBadge'))}</span></h3>${computedStatsGridHtml(m.statsComputed)}</div>`;
  }
  // 3. Mob régulier AVEC niveau + statFormula chargée -> fourchette par palier
  //    (les vrais nombres du jeu pour chaque palier à ce niveau).
  const sf = S.meta?.statFormula;
  if (m.level != null && sf?.tiers && sf?.growth) {
    return perTierStatsSection(m.level, sf);
  }
  // 4. Sans niveau NI statFormula : repli honnête palier deviné + note serveur.
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
  const note = rarityNote ? `<p class="hint">${esc(tr('scalingServerSide'))}</p>` : '';
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
   Depuis la Phase C (décodage Modifiers/TotalTime, HANDOFF_modifiers_decode
   .md), deux kinds SUBSTITUÉS s'ajoutent -- du vrai contenu décodé en ligne,
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
    parts.push(`<div class="fiche-section"><h3>${esc(tr('rarityScalingTitle'))}</h3><p class="hint">${esc(tr('scalingNotLocated'))}</p></div>`);
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

/* ── Modèle de monstre + sélecteur de niveau/variante (feature #12) ─────
   Une créature (« modèle », site/data/<lang>/monster_models.bin) se décline
   souvent en plusieurs niveaux/variantes — jusqu'à 917 groupes bruts au
   total dans monsters.bin pour ~335 modèles — qui affichaient jusqu'ici UNE
   FICHE PAR GROUPE, sans lien entre elles. openMonsterFiche(key) prend
   toujours une clé de groupe précise (compat totale avec tous les appelants
   existants : recherche, bestiaire, camps, quêtes, lien profond `mon=`) mais
   affiche désormais la fiche du MODÈLE entier avec un sélecteur pour
   changer de niveau/variante sans revenir à la recherche.

   monsterModelVariants ne fait PAS confiance à monster_models.levels seul :
   vérifié sur les données réelles, ce tableau exclut parfois de vraies
   variantes non-test (reskins de même niveau — ex. trollfat_yellow_arena
   partage model="trollfat" avec le canonique trollfat_green mais n'apparaît
   pas dans model.levels ; à l'inverse, le seul niveau listé pour
   oldman_soldier_blade est lui-même isTest). La source de vérité est donc
   TOUJOURS S.monsters filtré par `m.model` — monster_models ne sert qu'à
   trouver canonicalSiteKey (repli d'affichage, voir search.js
   buildMonsterSearchIndex), jamais à décider quelles variantes existent. */
function monsterModelVariants(modelKey, activeKey) {
  const out = [];
  for (const [key, m] of Object.entries(S.monsters)) {
    if (m.model !== modelKey) continue;
    // Contenu dev (feature #13) : une variante isTest reste masquée DE LA
    // LISTE des pastilles sauf si S.devOn est vrai OU qu'elle est la
    // variante ACTIVEMENT affichée (jamais masquer ce qu'on montre déjà,
    // même via un lien profond partagé avant tout clic sur le tag « Contenu
    // dev » — voir js/devcontent.js isHiddenTest).
    if (key !== activeKey && isHiddenTest(m)) continue;
    out.push({ key, m });
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
   "dev" (feature #13) sur les variantes isTest visibles. */
function monsterVariantPickHtml(activeKey, variants, model) {
  if (variants.length < 2) return '';
  const pills = variants.map(({ key, m }) => {
    const lvl = m.level != null ? tr('levelAbbrev', m.level) : null;
    const distinctName = model?.name && fold(m.name) !== fold(model.name) ? m.name : null;
    const label = [lvl, distinctName].filter(Boolean).join(' · ') || pretty(key);
    const devMark = m.isTest ? `<span class="dev-mark">${esc(tr('devBadge'))}</span>` : '';
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
  // Modèle + sélecteur de niveau/variante (feature #12, voir
  // monsterModelVariants/monsterVariantPickHtml ci-dessus) : `key` reste la
  // variante ACTIVEMENT affichée (tout le corps de la fiche ci-dessous décrit
  // TOUJOURS `m`, jamais le modèle abstrait), le sélecteur ne fait que
  // proposer les autres niveaux/variantes du même modèle.
  const modelKey = m.model || key;
  const model = S.monsterModels[modelKey] || null;
  const variantSelectHtml = monsterVariantPickHtml(key, monsterModelVariants(modelKey, key), model);
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
  // voir monsterModelVariants -- jamais un 404 silencieux, juste marqué).
  const devMark = m.isTest ? `<span class="dev-mark">${esc(tr('devBadge'))}</span>` : '';
  const kindLine = (kindBits.join(' · ') || tr('monsterLabel')) + (m.variants > 1 ? tr('variantsNote', m.variants) : '');
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
          ? `<span class="fr-label link" data-act="fiche-item" data-id="${esc(d.item_key)}">${esc(d.item_name)}</span>`
          : `<span class="fr-label">${esc(d.item_name)}</span>`;
        const questLabel = S.quests.has(d.quest_slug)
          ? `<span class="fr-label link" data-act="fiche-quest" data-id="${esc(d.quest_slug)}">${esc(d.quest_name)}</span>`
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

  const campsHtml = `<div class="fiche-section"><h3>${esc(tr('monsterCampsN', m.camps?.length || 0))}</h3>${
    m.camps?.length
      ? m.camps.map(c => `<div class="frow">
          <span class="fr-icon icon-broken" data-fb="📍"></span>
          <span class="fr-label link" data-act="fiche-camp" data-id="${esc(c.camp)}">${esc(c.name)}</span>
          ${gotoBtn(c.x, c.z, c.name)}
        </div>`).join('')
      : `<p class="hint">${esc(tr('noCampsKnown'))}</p>`
  }</div>`;

  const loreIdx = loreIndexFor(key);
  const loreHtml = loreIdx != null ? `<div class="fiche-section"><h3>${esc(tr('loreEntryTitle'))}</h3>
    <div class="frow">
      <span class="fr-icon icon-broken" data-fb="📖"></span>
      <span class="fr-label link" data-act="fiche-location" data-id="${loreIdx}">${esc(S.locations[loreIdx].title)}</span>
    </div></div>` : '';

  openFiche(`
    <div class="fiche-head">${iconTag(icon, 'fiche-avatar', initials(m.name))}
      <div><div class="fiche-kind" style="color:${MONSTER_HEX}">${esc(kindLine)}${devMark}</div>
      <h2>${esc(m.name)}</h2></div></div>
    ${variantSelectHtml}
    ${tagsHtml}
    ${statsHtml}
    ${zoneBtnHtml}
    ${lootHtml}
    ${harvestHtml}
    ${questDropsHtml}
    ${abilitiesHtml}
    ${campsHtml}
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
          <span class="fr-label${known ? ' link' : ''}"${known ? ` data-act="fiche-monster" data-id="${esc(fm.key)}"` : ''}>${esc(fm.name)}</span>
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

function heroAvatar(iconPath) {
  if (!iconPath || !iconPath.includes('HeroAvatars')) return null;
  return 'icons/hero_avatars/' + encodeURIComponent(iconPath.split('/').pop()) + '.png';
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
    return `<span class="pos-dynamic">${esc(label)}</span>${zoneViewBtn(zi, isEstimate)}`;
  }
  if (t && t.kind === 'monster' && !t.camp) {
    return `<span class="pos-dynamic">${esc(tr('posUncatalogued'))}</span>`;
  }
  const region = regionHint ? ` <span class="pos-region">· ${esc(regionHint)}</span>` : '';
  return `<span class="pos-dynamic">${esc(tr('posDynamic'))}${region}</span>`;
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
    return `<div class="fiche-section"><h3>${esc(tr('vendorStockTitle'))}</h3><p class="hint">${esc(tr('noVendorItems'))}</p></div>`;
  }
  const rows = v.sells.map(s => {
    const key = typeof s === 'string' ? s : s.key;
    const price = typeof s === 'string' ? null : s.price;
    const it = S.items[key];
    const name = it?.name || pretty(key);
    const icon = it?.icon ? `icons/${it.icon}` : null;
    // Pastille de rareté (couleur RARITY) quand elle est connue : repère
    // visuel de « ce que vaut » chaque article du stock sans surcharger la
    // ligne — le nom garde sa couleur normale (et son hover accent).
    const rar = it && RARITY[it.rarity];
    const dot = rar ? `<span class="rar-dot" style="background:${rar.hex}" title="${esc(rarityLabel(it.rarity))}"></span>` : '';
    const label = it
      ? `<span class="fr-label link" data-act="fiche-item" data-id="${esc(key)}">${esc(name)}</span>`
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
      <span class="fr-label link" data-act="fiche-quest" data-id="${esc(slug)}">${esc(q.name)}</span>
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
      <div><div class="fiche-kind">${esc(tr('npcCat'))}${r.vendor ? esc(tr('vendorSuffix')) : ''}</div><h2>${esc(r.name)}</h2>
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
/* Chip QUANTIFIÉE ({key, count}) — rendu commun ingrédient de recette /
   récompense de quête, avec un suffixe "×N" au-delà de count 1 (voir
    pour les ingrédients et
    pour les récompenses fixes/au choix). itemChip
   (une simple clé, jamais de suffixe de quantité) n'en est qu'un appel avec
   count omis -- même rendu, pas de duplication. */
function qtyItemChip(entry) {
  const key = entry.key, count = entry.count;
  const it = S.items[key];
  const name = it ? it.name : pretty(key);
  const icon = it?.icon ? `icons/${it.icon}` : null;
  const attrs = it ? ` data-act="fiche-item" data-id="${esc(key)}"` : '';
  const qty = count > 1 ? `<span class="chip-qty">×${count}</span>` : '';
  return `<span class="chip"${attrs}>${iconTag(icon, 'chip-icon', itemGlyph(it))}${esc(name)}${qty}</span>`;
}
function itemChip(key) { return qtyItemChip({ key }); }
function qtyChipList(list) {
  return (list || []).map(qtyItemChip).join('');
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
    ? `<span class="fr-label link" data-act="fiche-item" data-id="${esc(qi.key)}">${esc(name)}</span>`
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
  const givenByBit = qi.givenBy
    ? (ni >= 0
      ? `<span class="muted link" data-act="fiche-npc" data-id="npc:${ni}">${esc(tr('goalGivenByLabel'))} ${esc(qi.givenBy)}</span>`
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
  const attrs = it ? ` data-act="fiche-item" data-id="${esc(key)}"` : '';
  const approxSup = approx ? '<sup>≈</sup>' : '';
  const qiFlag = key ? currentQuestItemFlags?.get(key) : undefined;
  const isQuest = qiFlag !== undefined ? qiFlag : (hint !== undefined ? hint : (it ? it.kind === 'quest_item' : null));
  const badge = isQuest != null
    ? `<span class="k-chip" style="--chip-c:${isQuest ? CATS.qao.hex : CATS.workshop.hex}">${esc(isQuest ? tr('questItemBadge') : tr('gameItemBadge'))}</span>`
    : '';
  // Une seule ligne SANS retours/indentation internes (fix bulle « ligne
  // vide ») : le newline+indentation d'un gabarit multi-lignes se retrouvait
  // tel quel dans le texte de la bulle quand le joueur le copiait/collait.
  return `<div class="goal-target-row goal-target-item${it ? ' link' : ''}"${attrs}>${iconTag(icon, 'goal-target-item-icon', itemGlyph(it))}<span class="goal-target-item-label">${esc(name)}${approxSup}</span>${badge}${extraBadge || ''}</div>`;
}
function goalTargetChip(t, label, regionHint) {
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
  const posRow = `<div class="goal-target-row goal-target-row-pos">${t.x != null ? gotoBtn(posX, posZ, lbl, posCat) : dynamicPosBadge(t, regionHint)}</div>`;

  if (t.kind === 'item') {
    // La cible EST l'item lui-même -- rien à relier, juste son identité
    // (nom catalogue en priorité ; repli sur `label`, la phrase d'objectif
    // DÉJÀ nettoyée et affichée juste au-dessus -- JAMAIS t.label brut, dont
    // l'audit montre qu'il porte souvent le verbe ou un libellé de slot
    // interne non nettoyé, ex. "Quest item removed start quest troll head",
    // quand aucun `key` catalogue ne résout) + sa position à 3 niveaux.
    const itemRow = goalTargetItemRow(t.key, label, t.approx, '', t.isQuestItem) || '';
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
      relRow = `<div class="goal-target-row goal-target-row-rel">${activableBadge}<span class="goal-target-rel-verb">${esc(tr('goalObtainedHereLabel'))}</span></div>`;
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
    const mk = monsterKeyFor(t.key || null, nameLbl);
    // Niveau (S.monsters[mk].level) -- même garde différé que le lien : un
    // niveau non résolu ne s'affiche simplement pas encore, il apparaît au
    // re-rendu post-loadDeferred() comme le lien lui-même, jamais un chiffre
    // deviné entre-temps.
    const lvl = (mk && S.monsters[mk]?.level != null) ? tr('levelAbbrev', S.monsters[mk].level) : null;
    const nameSpan = mk
      ? `<span class="goal-target-name link" data-act="fiche-monster" data-id="${esc(mk)}">${esc(nameLbl)}</span>`
      : (nameLbl ? `<span class="goal-target-name">${esc(nameLbl)}</span>` : '');
    const lvlSpan = lvl ? `<span class="goal-target-lvl">${esc(lvl)}</span>` : '';
    const itemRow = goalTargetItemRow(t.item_key, t.item_label, t.item_approx);
    // Relation EXPLICITE seulement quand un item de quête est réellement
    // rattaché (le point central de cette passe) : "dropped by <monstre>".
    // Sans item (kill pur, ex. killig_creatures_field_robot), rien à relier
    // -- la ligne redevient juste le nom+niveau, sans verbe inventé.
    const relRow = itemRow
      ? `<div class="goal-target-row goal-target-row-rel">${nameSpan ? `<span class="goal-target-rel-verb">${esc(tr('goalDroppedByLabel'))}</span>` : ''}${nameSpan}${lvlSpan}</div>`
      : (nameSpan ? `<div class="goal-target-row goal-target-row-rel goal-target-row-rel-plain">${nameSpan}${lvlSpan}</div>` : '');
    return `<div class="goal-target">${itemRow}${relRow}${posRow}</div>`;
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
      const ni = t.label ? npcIndexByName(t.label) : -1;
      const giverSpan = (ni >= 0)
        ? `<span class="goal-target-name link" data-act="fiche-npc" data-id="npc:${ni}">${esc(t.label)}</span>`
        : (t.label ? `<span class="goal-target-name">${esc(t.label)}</span>` : '');
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
      ? `<div class="goal-target-row goal-target-row-rel"><span class="goal-target-name link" data-act="fiche-npc" data-id="npc:${ni}">${lbl}</span></div>`
      : (label ? `<div class="goal-target-row goal-target-row-rel"><span class="goal-target-name">${lbl}</span></div>` : '');
    return `<div class="goal-target">${nameRow}${posRow}</div>`;
  }

  if (t.kind === 'dynamic') {
    return `<div class="goal-target">${posRow}</div>`;
  }
  return '';
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
      : goalTargetChip(g.target, cleanLabel(g.label), regionHint);
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

/* Récompenses de quête : distingue TOUJOURS DONNÉ (xp/or + items à
   choice_group null,  restructure ça en
   {fixed, choices, xp?, gold?}) des groupes de CHOIX mutuellement
   exclusifs (un par choice_group réel, index affiché = ordre du tableau,
   déjà trié par le pipeline). Jamais une liste à plat comme avant : un
   joueur doit voir sans ambiguïté ce qui est garanti et ce qui s'exclut
   (ex. allergic_to_duty : 6 items toujours donnés + plusieurs groupes
   "choisissez 1 parmi N"). qtyItemChip/qtyChipList (section recette
   ci-dessus) gèrent déjà la forme {key,count} — réutilisées telles quelles
   ici.
   BUG FIX (regression, was `q.rewards?.length ? ... : ''`): q.rewards is the
   structured object {fixed, choices, xp?, gold?}, not an array — `.length`
   on that object is always undefined, so the old code produced the empty
   string on EVERY quest fiche, silently dropping the rewards section
   entirely (no crash, just a permanently-missing section). */
function questRewardsSection(q) {
  const r = q.rewards;
  if (!r) return '';
  const hasFixed = r.fixed?.length || r.xp != null || r.gold != null;
  const hasChoices = r.choices?.length;
  if (!hasFixed && !hasChoices) return '';
  const xpGold = [r.xp != null ? tr('xpAbbrev', r.xp) : null, r.gold != null ? tr('goldAbbrev', r.gold) : null]
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

/* Fiche d'un dialogue-bark PNJ (q.isDialogue) : les répliques d'ambiance du
   personnage (q.dialogs.npc/player), sous un en-tête explicite « Dialogue PNJ
   (pas une quête) » — jamais la mise en page d'une quête vide. Toujours
   ouvrable (contenu dev activé / lien profond direct) ; garde le hash de
   quête (setFicheHash('quest', slug)) pour que le partage d'URL rouvre
   exactement cette fiche. */
function openDialogueFiche(q, slug) {
  const avatar = heroAvatar(q.giverIcon || q.actors?.find(a => a.kind === 'npc')?.icon);
  const lines = [...(q.dialogs?.npc || []), ...(q.dialogs?.player || [])];
  const linesHtml = lines.length
    ? lines.map(l => `<p class="dlg dlg-npc">${esc(l)}</p>`).join('')
    : `<p class="hint">${esc(tr('noResults'))}</p>`;
  // Le PNJ qui « donne » ce bark, cliquable vers sa vraie fiche quand il est
  // connu de la carte active (navigation dialogue → PNJ).
  const ni = q.giver ? npcIndexByName(q.giver) : -1;
  const giverLine = q.giver
    ? (ni >= 0
      ? `<span class="pop-coords link" data-act="fiche-npc" data-id="npc:${ni}">${esc(tr('givenByPlain', q.giver))}</span>`
      : `<span class="pop-coords">${esc(tr('givenByPlain', q.giver))}</span>`)
    : '';
  openFiche(`
    <div class="fiche-head">${iconTag(avatar, 'fiche-avatar', initials(q.giver || q.name))}
      <div><div class="fiche-kind">${esc(tr('dialogueFicheKind'))}</div><h2>${esc(q.name)}</h2>
      ${giverLine}</div></div>
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
  const avatar = heroAvatar(q.giverIcon || q.actors?.find(a => a.kind === 'npc')?.icon);
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
      labelHtml = `<span class="fr-label link" data-act="fiche-npc" data-id="npc:${ni}">${esc(aLabel)}</span>`;
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
      if (mk) labelHtml = `<span class="fr-label link" data-act="fiche-monster" data-id="${esc(mk)}">${esc(aLabel)}</span>`;
    }
    return `
    <div class="frow">
      <span class="k-chip" style="--chip-c:${a.kind === 'npc' ? CATS.npc.hex : a.kind === 'object' ? CATS.qao.hex : '#8d99ae'}">${a.kind === 'object' ? tr('activableBadge') : actorKindLabel(a.kind)}</span>
      ${labelHtml}
      ${posCell}
    </div>`;
  }).join('');
  const rewards = questRewardsSection(q);
  const items = q.items?.length
    ? `<div class="fiche-section"><h3>${esc(tr('questItemsN', q.items.length))}</h3>${q.items.map(qi => questItemRow(qi, regionHint)).join('')}</div>` : '';
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
     <span class="fr-label link" data-act="fiche-quest" data-id="${esc(s)}">${esc(S.quests.get(s).name)}</span></div>`).join('');
  const zoneBtn = S.zonesQuest[slug]
    ? `<button class="act ghost" data-act="zone-view" data-id="${esc(slug)}">${esc(tr('viewZoneBtn'))}</button>` : '';
  // « Voir le donneur » : même correctif que les actorRows ci-dessus -- vise
  // le pin NPC réel (S.data.npc[...].x/z) plutôt que la position brute du
  // donneur (q.x/q.z, souvent à quelques unités du pin -- cas Ophelia Voss,
  // voir npc_dual_identity_INVESTIGATION.md §2/§3) quand ce donneur est connu
  // de la carte active, et porte le `cat` que gotoBtn/pins.js utilisent pour
  // mettre en avant CE marqueur au lieu d'un réticule redondant.
  const giverNi = q.giver ? npcIndexByName(q.giver) : -1;
  const giverPin = giverNi >= 0 ? S.data.npc[giverNi] : null;
  const giverX = giverPin && giverPin.x != null ? giverPin.x : q.x;
  const giverZ = giverPin && giverPin.x != null ? giverPin.z : q.z;
  const giverCat = giverPin && giverPin.x != null ? 'npc' : null;
  const giverCatAttr = giverCat ? ` data-cat="${giverCat}"` : '';

  openFiche(`
    <div class="fiche-head">${iconTag(avatar, 'fiche-avatar', initials(q.giver))}
      <div><div class="fiche-kind">${esc(tr('questFicheKind', q.regions?.length ? q.regions[0] : ''))}</div><h2>${esc(q.name)}</h2>
      ${q.giver ? `<span class="pop-coords">${esc(tr('givenByPlain', q.giver))}</span>` : ''}
      ${q.maps?.length > 1 ? `<span class="pop-coords">${esc(tr('questMapsLine', q.maps.map(mapName).join(' · ')))}</span>` : ''}</div></div>
    <div class="fiche-section"><div class="pop-actions">
      ${q.x != null && q.posSource !== 'zone' ? `<button class="act primary" data-act="goto" data-x="${giverX}" data-z="${giverZ}" data-label="${esc(q.giver || q.name)}"${giverCatAttr}>${esc(tr('viewGiverBtn'))}</button>` : ''}
      ${zoneBtn}
      <button class="act" data-act="track" data-id="quest:${esc(slug)}">${esc(tr('trackBtn'))}</button>
      <button class="act" data-act="done" data-id="quest:${esc(slug)}">${esc(tr('doneBtn'))}</button>
    </div></div>
    ${hintBox(q)}
    ${goalSteps}
    ${objectives}
    ${actorRows ? `<div class="fiche-section"><h3>${esc(tr('onMapTitle'))}</h3>${actorRows}</div>` : ''}
    ${items}
    ${rewards}
    ${q.journal ? `<div class="fiche-section"><details class="fiche-dialogs"><summary>${esc(tr('journalTitle'))}</summary><p class="fiche-journal">${esc(q.journal)}</p></details></div>` : ''}
    ${dialogs}
    ${related ? `<div class="fiche-section"><h3>${esc(tr('relatedQuestsTitle'))}</h3>${related}</div>` : ''}`);
  drawInvestigation(q);
  drawQuestZone(slug);
  setFicheHash('quest', slug);
}

/* Fiche item : taux de drop (garanti / % séparés), vendeurs (+ position),
   recette (ingrédients cliquables), utilisé dans, quêtes liées, spots de
   farm. Toute clé du catalogue (site/data/items.json) est ouvrable ici,
   y compris les « recette d'objet » vendues/récompensées sans exister comme
   item à part entière (isRecipe). */
function dropRow(icon, label, linkAct, linkId, rateHtml, glyph) {
  const labelHtml = linkAct
    ? `<span class="fr-label link" data-act="${linkAct}" data-id="${esc(linkId)}">${esc(label)}</span>`
    : `<span class="fr-label">${esc(label)}</span>`;
  // data-n : nom replié pour le filtre local des longues listes (voir le
  // listener .stock-filter posé sur le drawer plus haut).
  return `<div class="frow" data-n="${esc(fold(label))}">${iconTag(icon, 'fr-icon', glyph || '📦')}${labelHtml}${rateHtml || ''}</div>`;
}

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

function openItemFiche(key) {
  const it = S.items[key];
  if (!it) return;
  S.openFiche = { kind: 'item', id: key };
  const icon = it.icon ? `icons/${it.icon}` : null;
  const rarity = RARITY[it.rarity];
  const itemKindText = itemKindLabel(it.kind) || pretty(it.kind || 'item');
  const kindHex = rarity ? rarity.hex : 'var(--muted)';
  // Contenu dev (feature #13) : marqueur explicite sur un item isTest ouvert
  // (toujours ouvrable par lien profond direct, jamais un 404 silencieux —
  // seule sa présence dans la RECHERCHE dépend de S.devOn, voir search.js).
  const devMark = it.isTest ? `<span class="dev-mark">${esc(tr('devBadge'))}</span>` : '';

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

  const farmHtml = it.farm?.length
    ? `<div class="fiche-section"><h3>${esc(tr('farmSpotsTitle'))}</h3>${it.farm.map(c => `
        <div class="frow">
          <span class="fr-icon icon-broken" data-fb="📍"></span>
          <span class="fr-label link" data-act="fiche-camp" data-id="${esc(c.camp)}">${esc(c.name)}</span>
          ${gotoBtn(c.x, c.z, c.name)}
        </div>`).join('')}</div>` : '';

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
          ? `<span class="fr-label link" data-act="fiche-npc" data-id="npc:${ni}">${esc(n.name)}</span>`
          : `<span class="fr-label">${esc(n.name)}</span>`;
        return `<div class="frow">
          ${iconTag(icon, 'fr-icon', initials(n.name))}
          ${label}
          ${gotoBtn(n.x, n.z, n.name)}
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

  let recipeHtml = '';
  if (it.recipes?.length) {
    // Une entrée par rareté ATTEIGNABLE (déjà dédupliqué côté pipeline —
    // voir data/SCHEMA.md recipes.json "rarity"/"variant_group" : un seul
    // craft/jeu d'ingrédients peut produire plusieurs raretés en tirage
    // pondéré). Chaque ref = {key, rarity?} ; métier + rareté affichés en
    // en-tête de bloc, jamais 17 lignes identiques pour le même craft.
    const blocks = it.recipes.map(ref => {
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
      const out = (r.output && r.output !== key)
        ? `<div class="recipe-out">${esc(tr('producesArrow'))}${itemChip(r.output)}</div>` : '';
      return `<div class="recipe-block">${meta}<div class="reward-chips">${ing}</div>${out}</div>`;
    }).join('');
    if (blocks) recipeHtml = `<div class="fiche-section"><h3>${esc(tr('recipeTitle'))}</h3>${blocks}</div>`;
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
      const viaName = qs.via === 'kill' ? (qs.monster_name || null) : (qs.object_label || null);
      const viaText = viaName
        ? esc(qs.via === 'kill' ? tr('obtainViaKill', viaName) : tr('obtainViaInteract', viaName)) : '';
      // The clickable upgrade (monster fiche link) legitimately CAN'T
      // resolve before S.monsters loads -- monsterKeyFor guards it exactly
      // like every other such link in this file (actorRows, goalTargetChip);
      // it silently upgrades in place once loadDeferred() completes and this
      // fiche gets re-rendered. Unlike the name above, this part of the
      // race is unavoidable (S.monsters itself has to exist to know the
      // fiche does), so it degrades to plain text instead, never a dead link.
      const viaMonsterKey = qs.via === 'kill' && qs.monster_key ? monsterKeyFor(qs.monster_key, qs.monster_name) : null;
      const viaLine = viaText
        ? `<p class="hint">${viaMonsterKey
            ? `<span class="link" data-act="fiche-monster" data-id="${esc(viaMonsterKey)}">${viaText}</span>`
            : viaText}</p>`
        : '';
      questSourceHtml = `<div class="fiche-section"><h3>${esc(tr('obtainDuringQuestTitle'))}</h3>
        <div class="frow">
          <span class="k-chip" style="--chip-c:${CATS.quest.hex}">${esc(tr('questCat'))}</span>
          <span class="fr-label link" data-act="fiche-quest" data-id="${esc(qs.quest)}">${esc(srcQuest.name)}</span>
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
          <span class="fr-label link" data-act="fiche-quest" data-id="${esc(slug)}">${esc(q.name)}</span>
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
  openFiche(`
    <div class="fiche-head">${iconTag(icon, 'fiche-avatar', itemGlyph(it))}
      <div><div class="fiche-kind" style="color:${kindHex}">${esc(itemKindText)}${rarity ? ' · ' + esc(rarityLabel(it.rarity)) : ''}${raritiesLine ? ' · ' + esc(raritiesLine) : ''}${it.tier ? ' · ' + esc(it.tier) : ''}${devMark}</div>
      <h2>${esc(titleName)}</h2>
      ${weaponLine ? `<span class="pop-coords">${esc(weaponLine)}</span>` : ''}
      ${it.prof ? `<span class="pop-coords">${esc(professionLabel(it.prof))}</span>` : ''}</div></div>
    ${raritySelectHtml}
    ${descHtml}
    ${useEffectHtml}
    ${rollRangeHtml}
    ${formulaHtmlBlock}
    ${scalingHtml}
    ${dropsHtml}
    ${farmHtml}
    ${vendorsHtml}
    ${recipeHtml}
    ${usedHtml}
    ${questSourceHtml}
    ${questsHtml}`);
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
  openChestFiche, openSearchableChestFiche, itemColor, viewGoalZone, flyToQuestZone, viewMonsterZone, setRollRarity,
};
