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
  campDisplayName, campLootTableName, catLabel, chestTypeLabel,
  statLabel, statTierLabel, formulaTermLabel,
} from './config.js';
import { $, esc, fmtCoord, fold, iconTag, initials, itemGlyph, pretty, capitalize, cleanLabel } from './utils.js';
import { tr, numberLocale } from './i18n/index.js';
import { map, toLL, canvasR, clearHighlight } from './mapview.js';
import { unfocus } from './urlstate.js';
import { monsterKeyFor, npcIndexByName, loreIndexFor, lootTableItems } from './data.js';
import { mobLabelHtml } from './popups.js';
import { RARITY_ORDER, rarityGroupFor } from './rarity.js';
import { isHiddenTest } from './devcontent.js';

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
      ${g.pts.length ? `<button class="act primary" data-act="goto" data-x="${g.pts[0][0]}" data-z="${g.pts[0][1]}" data-label="${esc(name)}">${esc(tr('viewOnMapBtn'))}</button>` : ''}
      ${g.pts.length ? `<button class="act ghost" data-act="camp-highlight" data-id="${esc(key)}" data-n="${g.pts.length}">${esc(tr('highlightPointsBtn', g.pts.length))}</button>` : ''}
    </div></div>
    ${mobs ? `<div class="fiche-section"><h3>${esc(tr('likelyMonsters', det.mobs.length))}</h3>${mobs}</div>` : ''}
    ${drops}
    ${tableHtml}`);
  setFicheHash('camp', key);
}

/* Fiche coffre (S.data.chest, placements tc_*) : type physique réel (badge,
   même principe que openCampFiche — r.type est le vrai classifieur
   chest_type du pipeline, pas une déduction depuis le nom) + butin (même
   rendu lootRowsHtml que monstre/camp/item) + bouton carte. Pas de lien
   profond dédié (setFicheHash(null)) — même traitement que
   openLocationFiche/openAbilityFiche : ~3830 marqueurs individuels par skin
   de prop, pas un id stable qu'un lien partagé devrait rouvrir (voir
   data/SCHEMA.md "Chest loot + type" sur pourquoi ces marqueurs ne sont pas
   individuellement indexés en recherche non plus). */
function openChestFiche(i) {
  const r = S.data.chest[i];
  if (!r) return;
  S.openFiche = { kind: 'chest', id: i };
  const drops = lootRowsHtml(r.loot, 'noLootCatalogued');
  openFiche(`
    <div class="fiche-head"><div>
      <div class="fiche-kind" style="color:${CATS.chest.hex}">${esc(catLabel('chest'))}${r.type ? ' · ' + esc(chestTypeLabel(r.type)) : ''}</div>
      <h2>${esc(r.name)}</h2></div></div>
    <div class="fiche-section"><div class="pop-actions">
      ${gotoBtn(r.x, r.z, r.name)}
    </div></div>
    <div class="fiche-section"><h3>${esc(tr('lootBestRates'))}</h3>${drops}</div>`);
  setFicheHash(null);
}

/* Fiche « table de butin » : contenu exact d'une table nommée du client
   (reconstruite en inversant items.bin — voir lootTableItems), triée
   garanti d'abord puis par taux décroissant. Ouverte depuis les libellés de
   table de la fiche item et depuis le butin probable d'un contenant. */
function openLootTableFiche(label) {
  const rows = lootTableItems(label);
  if (!rows) return;
  S.openFiche = { kind: 'loot', id: label };
  const sorted = [...rows].sort((a, b) => (b.g - a.g) || ((b.w ?? 0) - (a.w ?? 0)));
  openFiche(`
    <div class="fiche-head"><div>
      <div class="fiche-kind" style="color:${CATS.chest.hex}">${esc(tr('lootTableKind'))}</div>
      <h2>${esc(label)}</h2></div></div>
    <div class="fiche-section"><h3>${esc(tr('lootTableItemsN', sorted.length))}</h3>
      ${sorted.length > 30 ? `<input class="stock-filter" type="search" placeholder="${esc(tr('stockFilterPlaceholder'))}">` : ''}
      <div class="fiche-scroll">${lootRowsHtml(sorted, 'noLootCatalogued')}</div></div>`);
  setFicheHash(null);
}

/* Rendu commun d'un taux de drop : quantité ("×N", dès que count>1) suivi de
   « Garanti » ou d'un pourcentage de chance — jamais les deux pour un même
   drop garanti (un « 100 % » redondant n'apporte rien face à un « ×3
   garanti » explicite, voir data/SCHEMA.md "Drop rows"). */
function dropRateHtml(d) {
  const countBit = d.c > 1 ? `×${d.c}` : '';
  if (d.g) return `<span class="muted">${esc([countBit, tr('guaranteedLabel')].filter(Boolean).join(' '))}</span>`;
  if (d.w == null) return countBit ? `<span class="muted">${esc(countBit)}</span>` : '';
  const pct = `${(d.w * 100).toFixed(d.w < 0.1 ? 1 : 0)} %`;
  return `<span class="muted">${esc([countBit, pct].filter(Boolean).join(' · '))}</span>`;
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

/* Statistiques de monstre — voir data/SCHEMA.md "Monster stats". Seuls
   ~25/755 groupes ont un relevé client réel (m.stats/m.statsSource ==
   "record", ex. le troll boss mbt_10_troll_rusty_boss) ; les ~730 restants
   n'ont AUCUNE stat par-monstre côté client (statsSource null) — le client
   ne nomme jamais quel tier de difficulté un mob donné utilise en jeu. On
   estime alors avec la courbe d'UN template représentatif par tier
   (site_meta.json.statTemplates, chargé dans S.meta au boot critique) :
   value(level) = curve.base + curve.per_level*(level-1). C'est un maximum
   honnête, jamais un chiffre par-monstre fabriqué — d'où le badge "≈ estimé
   (tier X)" toujours visible à côté, jamais présenté avec la même
   assurance qu'un relevé réel (badge "réel" plein). */
const STAT_TIER_REP = {}; // tier -> clé de template choisie (mémoïsé)
function statTierRep(tier) {
  if (STAT_TIER_REP[tier]) return STAT_TIER_REP[tier];
  const cands = Object.entries(S.meta.statTemplates || {}).filter(([, v]) => v.tier === tier);
  const plain = cands.find(([k]) => !/island|event|no_gold|no_vision|buffed/.test(k)) || cands[0];
  return (STAT_TIER_REP[tier] = plain ? plain[0] : null);
}
/* Aucun tier par-monstre n'est connu (le client ne le dit jamais) : repli
   "medium" par défaut, affiné par un mot-clé trouvé dans famille/nom/tags —
   un jugement de meilleur effort, jamais une donnée certaine (d'où le badge
   estimé toujours visible, quel que soit le tier deviné ici). */
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
function monsterStatsSection(m) {
  if (m.stats && Object.keys(m.stats).length) {
    return `<div class="fiche-section"><h3>${esc(tr('statsTitle'))}<span class="stats-badge">${esc(tr('realStatsBadge'))}</span></h3>${statsGridHtml(m.stats)}</div>`;
  }
  if (m.level == null) return '';
  const tier = guessStatTier(m);
  const repKey = statTierRep(tier);
  const tpl = repKey && S.meta.statTemplates ? S.meta.statTemplates[repKey] : null;
  if (!tpl?.curve) return '';
  const est = {};
  for (const [label, c] of Object.entries(tpl.curve)) {
    est[label] = Math.round((c.base + c.per_level * (m.level - 1)) * 10) / 10;
  }
  return `<div class="fiche-section"><h3>${esc(tr('statsTitle'))}<span class="stats-badge estimated">${esc(tr('estimatedStatsBadge', statTierLabel(tier)))}</span></h3>${statsGridHtml(est)}</div>`;
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
/* Plages de jet + DPS d'arme (item.stat_ranges/weapon_dps, port_map.md #8) :
   UN sélecteur de rareté partagé (jamais deux, même si l'item a les deux
   champs -- voir rollRarityPickHtml ci-dessus), un h3 dont le libellé
   s'adapte à ce qui existe réellement (stat_ranges seul -> "Plage de jet" ;
   weapon_dps seul -> "DPS d'arme" ; les deux -> "Plage de jet" en-tête +
   "DPS d'arme" en sous-titre) -- jamais un h3 générique qui ne correspond à
   rien pour ~62 items qui n'ont QUE weapon_dps. */
function rollRangeSection(it, key) {
  const sr = it.stat_ranges, wd = it.weapon_dps;
  if (!sr && !wd) return '';
  const tier = it.tier || it.weapon?.tier || null;
  const rarity = activeRollRarity(key);
  const genericRows = sr
    ? Object.entries(sr).map(([sid, tiersObj]) => tieredStatRows(statLabel(sid), tiersObj, tier, rarity)).join('')
    : '';
  let dpsRows = '';
  if (wd) {
    const asRows = wd.attack_speed ? tieredStatRows(statLabel('attack_speed'), wd.attack_speed, tier, rarity) : '';
    const dmgRows = wd.weapon_damage ? tieredStatRows(statLabel('weapon_damage'), wd.weapon_damage, tier, rarity) : '';
    dpsRows = asRows + dmgRows + derivedDpsRow(wd, tier, rarity);
  }
  if (!genericRows && !dpsRows) return '';
  const title = genericRows ? tr('rollRangeTitle') : tr('weaponDpsTitle');
  const genericBlock = genericRows ? `<div class="stat-grid">${genericRows}</div>` : '';
  const dpsBlock = dpsRows
    ? (genericRows ? `<h4 class="fiche-sub">${esc(tr('weaponDpsTitle'))}</h4><div class="stat-grid">${dpsRows}</div>` : `<div class="stat-grid">${dpsRows}</div>`)
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
  const kindBits = [m.family ? pretty(m.family) : null, m.level != null ? tr('levelAbbrev', m.level) : null,
    m.attack ? monsterAttackLabel(m.attack) : null].filter(Boolean);
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
    ${lootHtml}
    ${harvestHtml}
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
function gotoBtn(x, z, label) {
  if (x == null) return `<span class="pos-unknown">${esc(tr('posUnknown'))}</span>`;
  return `<button class="goto" data-act="goto" data-x="${x}" data-z="${z}" data-label="${esc(label || '')}">${GOTO_ICON}<span>${esc(tr('mapLabel'))}</span></button>`;
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
     (b) pas de position fixe, mais search_zone confiance haute -> libellé +
         bouton « Voir la zone » (cercle centroïde/bbox dessiné sur la carte)
     (c) sinon -> libellé seul (jamais de zone dessinée en confiance
         medium/low : le joueur a explicitement demandé de ne pas afficher un
         contour incertain) ; cas particulier « monstre identifié mais aucun
         camp ne le référence » (couverture camps.json ~25 % seulement) rendu
         avec un libellé distinct de « position dynamique » — ce n'est pas la
         même chose qu'un spawn serveur confirmé. */
let currentGoalZones = [];      // search_zone actives de la fiche quête ouverte
let goalZoneLayer = null;       // cercle dessiné pour la dernière zone consultée
function clearGoalZone() {
  if (goalZoneLayer) { map.removeLayer(goalZoneLayer); goalZoneLayer = null; }
}
function drawGoalZone(sz) {
  clearGoalZone();
  if (!sz) return;
  const [cx, cz] = sz.centroid;
  const [minX, minZ, maxX, maxZ] = sz.bbox;
  // Le site ne reçoit jamais les points bruts du cluster (payload), juste
  // centroïde + bbox — repli assumé et documenté : un cercle centré sur le
  // centroïde, rayon = demi-diagonale de la bbox.
  const r = Math.max(35, Math.hypot(maxX - minX, maxZ - minZ) / 2);
  const circle = L.circle(toLL(cx, cz), {
    radius: r, color: CATS.quest.hex, weight: 2, dashArray: '5 6',
    fillColor: CATS.quest.hex, fillOpacity: .12, interactive: false,
  });
  goalZoneLayer = L.layerGroup([circle]).addTo(map);
  map.flyToBounds(circle.getBounds().pad(0.25));
}
function zoneViewBtn(zi) {
  return `<button class="goto" data-act="goal-zone-view" data-zi="${zi}">${GOTO_ICON}<span>${esc(tr('viewZoneBtn'))}</span></button>`;
}
/* Libellé + éventuel bouton pour une cible sans position fixe. `regionHint`
   (facultatif) = région du journal de la quête, affichée en cas (c) quand
   aucune zone n'est disponible du tout — mieux que rien pour se repérer. */
function dynamicPosBadge(t, regionHint) {
  const sz = t && t.search_zone;
  if (sz && sz.confidence === 'high') {
    const zi = currentGoalZones.push(sz) - 1;
    return `<span class="pos-dynamic">${esc(tr('posDynamicZone'))}</span>${zoneViewBtn(zi)}`;
  }
  if (t && t.kind === 'monster' && !t.camp) {
    return `<span class="pos-dynamic">${esc(tr('posUncatalogued'))}</span>`;
  }
  const region = regionHint ? ` <span class="pos-region">(${esc(regionHint)})</span>` : '';
  return `<span class="pos-dynamic">${esc(tr('posDynamic'))}</span>${region}`;
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
  const quests = (r.quests || []).map(slug => {
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
    ? `<button class="act primary" data-act="goto" data-x="${r.x}" data-z="${r.z}" data-label="${esc(r.name)}">${esc(tr('viewOnMapBtn'))}</button>`
    : '';
  openFiche(`
    <div class="fiche-head">${iconTag(img, 'fiche-avatar', initials(r.name))}
      <div><div class="fiche-kind">${esc(tr('npcCat'))}${r.vendor ? esc(tr('vendorSuffix')) : ''}</div><h2>${esc(r.name)}</h2>
      ${posLine}${variantLine}</div></div>
    <div class="fiche-section">
      <div class="pop-actions">
        ${mapBtn}
        <button class="act" data-act="track" data-id="npc:${idx}">${esc(tr('trackBtn'))}</button>
      </div></div>
    <div class="fiche-section"><h3>${esc(tr('questsGivenN', (r.quests || []).length))}</h3>
      ${quests || `<p class="hint">${esc(tr('noQuestsForNpc'))}</p>`}</div>
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

/* Ligne d'item de quête : distingue objet de quête (synthétique) et item du
   jeu — pour ces derniers, résumé d'obtention (vendu / craftable / loot)
   tiré du catalogue, et clic -> fiche complète quand la clé est connue.
   Position à 3 niveaux comme actorRows/goalTargetChip (slotpos fix_spec sec
   2.3) : cette section n'affichait jusqu'ici AUCUNE position, avec ou sans
   zone — plusieurs items de quête (ex. digging_deeper's "Stash Alexander")
   n'existent QUE dans ce catalogue, sans slots[] correspondant, donc c'était
   leur seul point d'affichage possible et il ne montrait rien du tout. */
function questItemRow(qi, regionHint) {
  const cat = qi.key ? S.items[qi.key] : null;
  const name = cleanLabel(cat?.name || qi.label);
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
  const posBit = (qi.x != null || qi.searchZone)
    ? (qi.x != null ? gotoBtn(qi.x, qi.z, name) : dynamicPosBadge({ search_zone: qi.searchZone }, regionHint))
    : '';
  return `<div class="frow">
    ${iconTag(icon, 'fr-icon', itemGlyph(cat))}
    <span class="k-chip" style="--chip-c:${badgeHex}">${badgeLabel}</span>
    ${label}
    ${bits.length ? `<span class="muted">${bits.join(' · ')}</span>` : ''}
    ${posBit}
  </div>`;
}

/* Vignette de la cible d'un objectif : item (icône catalogue + badge objet
   de quête/jeu, clic -> fiche), activable (icône catalogue si résolue sinon
   pictogramme générique + badge « Activable »), PNJ/monstre — chacun avec
   soit un bouton carte (position fixe), soit le badge à 3 niveaux
   (dynamicPosBadge, voir plus haut) quand il n'y a pas de position fixe.
   `kind: "multiple"` (objectif agrégat) n'a jamais de vignette : c'est un
   en-tête de checklist, ses enfants s'affichent comme des étapes normales
   juste en dessous. */
const ACTIVABLE_GLYPH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M12 2.8 20 7v10l-8 4.2L4 17V7l8-4.2Z"/><circle cx="12" cy="12" r="3"/></svg>`;
function goalTargetChip(t, label, regionHint) {
  if (!t || t.kind === 'multiple') return '';
  const lbl = esc(label || '');
  if (t.kind === 'item') {
    const it = t.key ? S.items[t.key] : null;
    const icon = it?.icon ? `icons/${it.icon}` : null;
    const badgeHex = t.isQuestItem ? CATS.qao.hex : CATS.workshop.hex;
    const badgeLabel = t.isQuestItem ? tr('questItemBadge') : tr('gameItemBadge');
    const attrs = it ? ` data-act="fiche-item" data-id="${esc(t.key)}"` : '';
    return `<span class="goal-target${it ? ' link' : ''}"${attrs}>
      <span class="goal-target-icon">${iconTag(icon, '', itemGlyph(it))}</span>
      <span class="k-chip" style="--chip-c:${badgeHex}">${badgeLabel}</span>
      ${t.x != null ? gotoBtn(t.x, t.z, lbl) : dynamicPosBadge(t, regionHint)}
    </span>`;
  }
  if (t.kind === 'object') {
    const it = t.key ? S.items[t.key] : null;
    const icon = it?.icon ? `icons/${it.icon}` : null;
    return `<span class="goal-target">
      <span class="goal-target-icon">${icon ? iconTag(icon, '', '⚙') : ACTIVABLE_GLYPH}</span>
      <span class="k-chip" style="--chip-c:${CATS.qao.hex}">${tr('activableBadge')}</span>
      ${t.x != null ? gotoBtn(t.x, t.z, lbl) : dynamicPosBadge(t, regionHint)}
    </span>`;
  }
  if (t.kind === 'npc' || t.kind === 'monster') {
    return `<span class="goal-target">${t.x != null ? gotoBtn(t.x, t.z, lbl) : dynamicPosBadge(t, regionHint)}</span>`;
  }
  if (t.kind === 'dynamic') {
    return `<span class="goal-target">${dynamicPosBadge(t, regionHint)}</span>`;
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
   carte, pas seulement celui-là. */
function seriesTargetChips(members, kind, regionHint) {
  const badge = kind === 'object'
    ? `<span class="k-chip" style="--chip-c:${CATS.qao.hex}">${tr('activableBadge')}</span>` : '';
  const icon = kind === 'object' ? `<span class="goal-target-icon">${ACTIVABLE_GLYPH}</span>` : '';
  return `<span class="goal-target-series">${members.map(a => `
    <span class="goal-target">
      ${icon}${badge}
      <span class="goal-target-mini-label">${esc(cleanLabel(a.label))}</span>
      ${a.x != null ? gotoBtn(a.x, a.z, cleanLabel(a.label)) : dynamicPosBadge({ search_zone: a.searchZone }, regionHint)}
    </span>`).join('')}</span>`;
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

function openQuestFiche(slug) {
  const q = S.quests.get(slug);
  if (!q) return;
  S.openFiche = { kind: 'quest', id: slug };
  currentGoalZones = [];   // ré-indexé à chaque ouverture (voir goalTargetChip/dynamicPosBadge)
  clearGoalZone();
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
    const posCell = a.x == null ? dynamicPosBadge({ search_zone: a.searchZone }, regionHint)
      : onOtherMap ? crossMapBtn(a.map, a.x, a.z, cleanLabel(a.label))
        : gotoBtn(a.x, a.z, cleanLabel(a.label));
    // Acteur PNJ cliquable vers sa fiche (quêtes + boutique) quand il est
    // connu de la carte active ; monstre idem vers sa fiche bestiaire —
    // navigation quête → PNJ/monstre sans repasser par la recherche.
    const aLabel = cleanLabel(a.label);   // affichage nettoyé, résolutions sur la donnée brute
    let labelHtml = `<span class="fr-label">${esc(aLabel)}</span>`;
    if (a.kind === 'npc' && !onOtherMap) {
      const ni = npcIndexByName(a.label);
      if (ni >= 0) labelHtml = `<span class="fr-label link" data-act="fiche-npc" data-id="npc:${ni}">${esc(aLabel)}</span>`;
    } else if (a.kind === 'monster') {
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

  openFiche(`
    <div class="fiche-head">${iconTag(avatar, 'fiche-avatar', initials(q.giver))}
      <div><div class="fiche-kind">${esc(tr('questFicheKind', q.regions?.length ? q.regions[0] : ''))}</div><h2>${esc(q.name)}</h2>
      ${q.giver ? `<span class="pop-coords">${esc(tr('givenByPlain', q.giver))}</span>` : ''}
      ${q.maps?.length > 1 ? `<span class="pop-coords">${esc(tr('questMapsLine', q.maps.map(mapName).join(' · ')))}</span>` : ''}</div></div>
    <div class="fiche-section"><div class="pop-actions">
      ${q.x != null && q.posSource !== 'zone' ? `<button class="act primary" data-act="goto" data-x="${q.x}" data-z="${q.z}" data-label="${esc(q.giver || q.name)}">${esc(tr('viewGiverBtn'))}</button>` : ''}
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
      <h2>${esc(it.name)}</h2>
      ${weaponLine ? `<span class="pop-coords">${esc(weaponLine)}</span>` : ''}
      ${it.prof ? `<span class="pop-coords">${esc(professionLabel(it.prof))}</span>` : ''}</div></div>
    ${raritySelectHtml}
    ${descHtml}
    ${rollRangeHtml}
    ${formulaHtmlBlock}
    ${scalingHtml}
    ${dropsHtml}
    ${farmHtml}
    ${vendorsHtml}
    ${recipeHtml}
    ${usedHtml}
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

/* Accès délégué (main.js) aux zones d'objectif de la fiche quête ouverte. */
function viewGoalZone(zi) {
  const sz = currentGoalZones[+zi];
  if (sz) drawGoalZone(sz);
}
/* Vol vers la zone de quête surlignée (bouton « Voir la zone »). */
function flyToQuestZone(slug) {
  const rings = S.zonesQuest[slug];
  if (rings?.length) map.flyToBounds(L.latLngBounds(rings.flat().map(([x, z]) => toLL(x, z))).pad(0.3));
}

export {
  closeFiche, openNpcFiche, openQuestFiche, openItemFiche, openCampFiche,
  openMonsterFiche, openLocationFiche, openAbilityFiche, openLootTableFiche,
  openChestFiche, itemColor, viewGoalZone, flyToQuestZone, setRollRarity,
};
