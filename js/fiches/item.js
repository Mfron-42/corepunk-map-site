/* Kwalat — fiches/item.js (issu du découpage de fiches.js, vague E'c-S).
   Fiches d'objets : objet, recette, table de butin, nœud de récolte, capacité —
   plus les plages de jet/formules/effets/scaling et les sections farm/contenants. */
import { S } from '../state.js';
import { CATS, CAMP_COLORS, RARITY, RECIPE_HEX, nodeHex, campKindLabel, rarityLabel, itemKindLabel, professionLabel, weaponTypeLine, statLabel, formulaTermLabel, statChip, nodeTierBadge, familyKey, familyLayerHex, entityColor } from '../config.js';
import { $, esc, fold, iconTag, initials, itemGlyph, npcIconUrl, pretty, capitalize, cleanLabel } from '../utils.js';
import { tr, numberLocale } from '../i18n/index.js';
import { map } from '../mapview.js';
import { monsterKeyFor, npcIndexByName, lootTableItems } from '../data.js';
import { campGroupByKey } from '../pointsets.js';
import { RARITY_ORDER, rarityGroupFor } from '../rarity.js';
import { ref } from '../mapref.js';

import { ficheHeader, openFiche, setFicheHash, lootRowsHtml, badge, varPlaceholder, abilityCooldownHtml, fmtNum, fmtPct, pillHtml, pillSelectHtml, farmCapRows, farmCampRow, farmUnjoinedRow, familyHasMembers, qtyChipList, itemChip, isRecipeKind, speciesRef, npcRef, questRef, disambiguateQuestItems, disambiguatedItemName } from './core.js';

/* Fiche « table de butin » : contenu COMPLET d'une table nommée du client
   ( finding #2 -- lu depuis S.lootTableContents, bundle dédié construit
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
    ${ficheHeader({ name: label, hex: entityColor('loot', label), sub: esc(tr('lootTableKind')) })}
    <div class="fiche-section"><h3>${esc(tr('lootTableItemsN', sorted.length))}</h3>
      ${sorted.length > 30 ? `<input class="stock-filter" type="search" placeholder="${esc(tr('stockFilterPlaceholder'))}">` : ''}
      <div class="fiche-scroll">${lootRowsHtml(sorted, 'noLootCatalogued')}</div></div>`);
  setFicheHash(null);
}

/* Glyphe de TYPE d'un nœud de récolte : nodes.bin ne porte AUCUN champ icon
   (honnêtement absent -- audit L2), donc l'avatar retombe sur un glyphe de
   MÉTIER (jamais l'icône d'un autre nœud/objet ni un faux). Repli 🌾 quand le
   métier n'est pas connu. */
const NODE_GLYPH = { fishing: '🎣', herbalism: '🌿', logging: '🪓', mining: '⛏' };
const nodeGlyph = n => NODE_GLYPH[(n?.prof || '').toLowerCase()] || '🌾';

/* Fiche « nœud de récolte » (#81, site/data/<lang>/nodes.bin -- 30 types
   gn_*) : nom + palier (T1-T3, texte brut comme it.tier ailleurs) + métier
   (professionLabel) + ses propres lignes de butin agrégées (drops[], même
   lootRowsHtml que monstre/camp/coffre/table -- garanti/chance, jamais un
   rendu réinventé) + alias internes (aliases[]). `generic:true` (9/30, aucune
   localisation en jeu pour ce type -- voir 
   resource_nodes_site()) : Badge provenance absent honnête à côté du nom plutôt
   qu'un faux nom localisé -- même vocabulaire Badge que partout ailleurs
   (blueprint §5.2), jamais un texte libre inventé. ICÔNE honnêtement ABSENTE
   (nodes.bin sans champ icon) -> avatar = glyphe de type (nodeGlyph). AUCUNE
   position/couche carte (le lien nœud->point n'existe pas côté client,
   byte-prouvé) : pas de pastille, pas de lien profond dédié (setFicheHash(null)),
   même traitement que openRecipeFiche/openChestFiche. */
function openNodeFiche(key) {
  const n = S.nodes?.[key];
  if (!n) return;
  S.openFiche = { kind: 'node', id: key };
  const hex = nodeHex(n);
  // Palier (nodes.bin `tier`, T1-T3 sur les 30 nœuds) : promu du simple texte de
  // sous-titre à un BADGE coloré à côté du nom (nodeTierBadge, rampe métallique
  // NODE_TIER_HEX enfin consommée — Lot 1). Le métier reste en sous-titre : le
  // métier dit QUOI (herbo/bûcheron/mine), le palier dit COMBIEN (axe orthogonal).
  const tierBadge = nodeTierBadge(n.tier);
  const profLine = n.prof ? professionLabel(n.prof) : null;
  const genericChip = n.generic ? ` ${badge({ axis: 'provenance', value: 'absent', extra: tr('nodeGenericNote') })}` : '';
  // Icône HONNÊTEMENT absente (nodes.bin ne porte aucun champ icon) : avatar de
  // repli = glyphe de métier via iconTag(null, …) (rend le span icon-broken
  // avec le glyphe en data-fb, exactement comme un item sans icône) -- jamais
  // un faux visuel emprunté à un voisin.
  const avatar = iconTag(null, 'fiche-avatar', nodeGlyph(n));
  // Alias internes (nodes.bin `aliases`, 9/30 nœuds génériques) : les clés de
  // récolte hn_* -- seuls identifiants pour un type SANS localisation en jeu.
  // Prettifiés (jamais le jeton brut hn_ à l'écran) et dédupliqués contre le
  // nom (sinon pure répétition du titre).
  const aliasNames = (n.aliases || [])
    .map(a => pretty(String(a).replace(/^hn_/, '')))
    .filter(a => fold(a) !== fold(n.name));
  const aliasesHtml = aliasNames.length
    ? `<div class="fiche-section"><p class="hint">${esc(tr('nodeAliasesLabel', aliasNames.join(', ')))}</p></div>` : '';
  // Nœud de récolte : AUCUNE pastille (mode N — le lien nœud→point n'existe pas
  // côté client, byte-prouvé ; la couche de récolte est le relais dessinable).
  openFiche(`
    ${ficheHeader({ avatar, name: n.name, hex, nameSuffix: `${tierBadge}${genericChip}`, sub: `${esc(tr('nodeFicheKind'))}${profLine ? ' · ' + esc(profLine) : ''}` })}
    <div class="fiche-section"><h3>${esc(tr('lootBestRates'))}</h3>${lootRowsHtml(n.drops, 'noHarvestCatalogued')}</div>
    ${aliasesHtml}`);
  setFicheHash(null);
}

/* ── Plages de jet (stat_ranges/weapon_dps), formules de dégâts
   (artifact_formula/formula) et mise à l'échelle rune/puce (rarity_scaling/
   tier_scaling) — voir  +
   , tmp/convergence/ #8/#9/#10. Net-new :
   zéro fiche de référence à porter, juste les 3 handoffs + le contrat de
   champs déjà validé en Phase 0. Toutes les valeurs numériques ci-dessous
   viennent TELLES QUELLES du client (tables Tears/FloatTable/formule
   d'ability) ; rien n'est jamais estimé ou deviné ici (contrairement à
   monsterStatsSection ci-dessus, qui a un mode "estimé" explicite — il n'y a
   pas d'équivalent pour ces données, un champ absent reste absent). */
const RARITY_BANDS = ['common', 'uncommon', 'rare', 'epic'];
const bandRarityLabel = r => rarityLabel(capitalize(r)) || r;
const bandRarityHex = r => RARITY[capitalize(r)]?.hex || 'var(--muted)';
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
/* Deux idiomes de résolution de plage partagés par tieredStatRows /
   derivedDpsRow / rollQualitySection : quel(s) tier montrer (le tier résolu
   seul, sinon tous triés) et quelle bande lire (la rareté demandée, repli
   « common »). Extraits mot pour mot — sortie inchangée. */
function resolveTierKeys(tiersObj, tier) {
  return (tier && tiersObj[tier]) ? [tier] : Object.keys(tiersObj).sort();
}
function resolveBand(byRarity, rarity) {
  return byRarity[rarity] || byRarity.common;
}
function tieredStatRows(label, tiersObj, tier, rarity) {
  const tierKeys = resolveTierKeys(tiersObj, tier);
  return tierKeys.map(tk => {
    const band = resolveBand(tiersObj[tk], rarity);
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
  const asBand = resolveBand(wd.attack_speed[tier], rarity);
  const dmgBand = resolveBand(wd.weapon_damage[tier], rarity);
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
/* Plages de jet + DPS d'arme (item.stat_ranges/weapon_dps,  #8) :
   UN sélecteur de rareté partagé (jamais deux, même si l'item a les deux
   champs -- voir rollRarityPickHtml ci-dessus), un h3 dont le libellé
   s'adapte à ce qui existe réellement (stat_ranges seul -> "Plage de jet" ;
   weapon_dps seul -> "DPS d'arme" ; les deux -> "Plage de jet" en-tête +
   "DPS d'arme" en sous-titre) -- jamais un h3 générique qui ne correspond à
   rien pour ~62 items qui n'ont QUE weapon_dps.

   Structure RÉELLE des artefacts (audit data-accuracy,  #1) : un
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

/* Formules de dégâts (item.artifact_formula / ability.formula, 
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
  // e.text est déjà du HTML sûr (nombres fmtNum + statChip, qui échappe nom et
  // code lui-même) — inséré tel quel pour préserver l'affordance « code moteur »
  // des termes non-nommables (ex. « 80 + 20×L ») ; seul e.tag reste à échapper.
  const lines = entries.map(e => `<p class="formula-line">${e.tag ? `<span class="formula-role">${esc(e.tag)}</span>` : ''}${e.text}${
    e.hasExternal ? ` <span class="formula-partial" title="${esc(tr('formulaPartialNote'))}">†</span>` : ''
  }</p>`).join('');
  // Pastille "unknown" ( #12/re-check #2, task #67) :
  // ce n'est PAS un fait serveur confirmé --  lui-même ne peut
  // pas trancher entre mise à l'échelle côté serveur et une autre règle du
  // jeu (voir le mot i18n reformulé qui a retiré l'implication "probablement
  // côté serveur").
  const note = rarityNote ? `<p class="hint">${badge({ axis: 'provenance', value: 'absent', extra: tr('scalingServerSide') })}</p>` : '';
  return `<div class="fiche-section"><h3>${esc(tr('formulaTitle'))}</h3>${lines}${note}</div>`;
}

/* "Use effect" section ( Phase B) : it.useEffect[] est une
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
  // kind "per_rarity" (effect-lines pass) : la valeur du token est un
  // 4-uplet PAR RARETÉ décodé (colonne abt_active_rune_ 4 lignes, jamais un
  // chiffre unique inventé) — rendu inline « 2 / 3 / 4 / 5 » dans l'ordre
  // Commun→Épique, chaque valeur teintée de sa rareté, tooltip explicite.
  if (u.kind === 'per_rarity' && u.values) {
    const vals = RARITY_BANDS.map(r => u.values[r]).filter(v => v != null);
    const inner = RARITY_BANDS.map(r => {
      const v = u.values[r];
      if (v == null) return '';
      const hex = bandRarityHex(r);
      return `<span style="color:${hex}">${esc(fmtNum(v))}</span>`;
    }).filter(Boolean).join('<span class="effect-var-sep">/</span>');
    const title = `${tr('effectVarPerRarityTooltip')} — ${RARITY_BANDS.map(r => `${bandRarityLabel(r)}: ${u.values[r] ?? '—'}`).join(', ')}`;
    return vals.length
      ? `<span class="effect-var-inline effect-var-rarity" title="${esc(title)}">${inner}</span>`
      : varPlaceholder(false, null);
  }
  return varPlaceholder(u.kind === 'runtime', u.token);
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

/* Grille par rareté partagée par les blocs de scaling 0x62 (rune_ability_
   scaling / overclock_scaling --  et par le
   scaling de capacité/effet a.byRarity / v.byRarity. Lit DEUX formes :
   - LISTE `[{code, name?, by_rarity}]` (a.byRarity / v.byRarity) — la colonne
     rend statChip({code, name}) : NOM joueur quand la légende en porte un,
     sinon le code moteur avec l'affordance « code moteur ».
   - MAP `{code: {rarity:value}}` (it.rarity_scaling / rune_ability_scaling /
     overclock_scaling, colonnes code-only) — colonne = statChip({code}) →
     code moteur porté par la même affordance, jamais un nom inventé.
   Colonne montrée seulement en multi-colonne (comme historiquement) ; en
   colonne unique, on n'affiche le libellé de colonne que s'il porte un NOM. */
function rarityColsGridHtml(scaling) {
  const cols = Array.isArray(scaling)
    ? scaling.map(e => ({ code: e.code, name: e.name, byRarity: e.by_rarity }))
    : Object.entries(scaling).map(([code, byRarity]) => ({ code, name: null, byRarity }));
  const multiCol = cols.length > 1;
  return cols.flatMap(({ code, name, byRarity }) => RARITY_BANDS.map(r => {
    const v = byRarity?.[r];
    if (v == null) return '';
    let label = esc(bandRarityLabel(r));
    if (multiCol) label += ` (${statChip({ code, name })})`;
    else if (name) label += ` — ${statChip({ code, name })}`;
    return `<div class="stat-row-label">${label}</div><div class="stat-row-value">${esc(fmtNum(v))}</div>`;
  })).join('');
}

/* Qualité de jet (artefacts uniquement -- ItemPrefix.xml, items_stats_
    §4) : le préfixe de nom en jeu ("Amélioré"/"Renforcé" côté Tech,
   "Fort"/"Puissant" côté Magie) est attribué par la BANDE de jet -- 33-66 %
   de la plage, ou >66 %. Les SEUILS affichés sont une transformation
   mécanique exacte des plages déjà livrées (min + 0.33/0.66 × (max-min)) au
   tier de l'item et à la rareté active du sélecteur de plage de jet ; la
   famille Tech/Magie et l'agrégation multi-stat sont côté moteur et ne sont
   JAMAIS tranchées par item ici (l'intro nomme les deux familles) -- on
   montre la règle et les bornes, pas un verdict fabriqué. Restreint aux
   stats PRINCIPALES (roll_types 'main') : seules elles sont garanties de
   rouler. Null-safe intégral (kind/stat_ranges/roll_types absents -> ''). */
function rollQualitySection(it, key) {
  if (it.kind !== 'artifact' || !it.stat_ranges) return '';
  const rollTypes = it.roll_types || {};
  const mainSids = Object.keys(it.stat_ranges).filter(sid => rollTypes[sid] === 'main');
  if (!mainSids.length) return '';
  const tier = it.tier || null;
  const rarity = activeRollRarity(key);
  const rows = mainSids.map(sid => {
    const tiersObj = it.stat_ranges[sid];
    const tierKeys = resolveTierKeys(tiersObj, tier);
    return tierKeys.map(tk => {
      const band = resolveBand(tiersObj[tk], rarity);
      if (!band || band.min == null || band.max == null || band.min === band.max) return '';
      const at33 = band.min + 0.33 * (band.max - band.min);
      const at66 = band.min + 0.66 * (band.max - band.min);
      const suffix = (mainSids.length > 1 || tierKeys.length > 1)
        ? ` — ${statLabel(sid)}${tierKeys.length > 1 ? ` (${tk})` : ''}` : '';
      return `<div class="stat-row-label">${esc(tr('rollQualityBand3366') + suffix)}</div><div class="stat-row-value">≥ ${esc(fmtNum(at33))}</div>`
        + `<div class="stat-row-label">${esc(tr('rollQualityBandMore66') + suffix)}</div><div class="stat-row-value">≥ ${esc(fmtNum(at66))}</div>`;
    }).join('');
  }).join('');
  if (!rows) return '';
  return `<div class="fiche-section"><h3>${esc(tr('rollQualityTitle'))}</h3><p class="hint">${esc(tr('rollQualityIntro'))}</p><div class="stat-grid">${rows}</div></div>`;
}

/* Mise à l'échelle rune (rarity_scaling, 13/24 runes actives décodées) et
   puce (tier_scaling, 1/71 seulement -- combo_crusher) :  #10.
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
    const rows = rarityColsGridHtml(it.rarity_scaling);   // même grille par rareté que rune/overclock (helper partagé)
    if (rows) parts.push(`<div class="fiche-section"><h3>${esc(tr('rarityScalingTitle'))}</h3><div class="stat-grid">${rows}</div></div>`);
  } else if (it.rarity_scaling_status === 'no_template') {
    // Pastille "unknown" ( #13, task #67) : contenu
    // déjà correct, juste enveloppé dans le composant d'état partagé.
    parts.push(`<div class="fiche-section"><h3>${esc(tr('rarityScalingTitle'))}</h3><p class="hint">${badge({ axis: 'provenance', value: 'absent', extra: tr('scalingNotLocated') })}</p></div>`);
  }
  // Mise à l'échelle par rareté décodée via l'opérande 0x62 (rune_ability_
  // scaling, valeurs jointes côté données) :
  // REPLI pour les runes que le décodage direct abt_active_rune_ n'atteint
  // pas -- jamais rendu quand rarity_scaling couvre déjà l'axe (même donnée,
  // deux chemins de décodage ; pas de doublon). Champs absents des bins tant
  // que la régén ×5 n'a pas eu lieu -> null-safe, rendu inchangé d'ici là.
  if (!it.rarity_scaling && it.rune_ability_scaling) {
    const rows = rarityColsGridHtml(it.rune_ability_scaling);
    if (rows) parts.push(`<div class="fiche-section"><h3>${esc(tr('abilityRarityScalingTitle'))}</h3><div class="stat-grid">${rows}</div></div>`);
  }
  // Palier OVERCLOCKÉ (variante améliorée d'une rune active, items_stats_
  //  §3.1) : valeurs par rareté quand le client les stocke (2/24
  // aujourd'hui), note honnête quand la variante EXISTE mais que sa magnitude
  // n'est pas côté client (no_rarity_table -- enregistrement stub/constantes
  // littérales, 13/24), et RIEN quand la rune n'a pas de variante overclockée
  // du tout (no_overclock_record, 9/24 -- un vrai "pas de palier", pas un
  // trou de décodage : distinction ferme, même règle que no_template).
  // `oc-section` : simple classe d'accroche pour l'accent visuel STAGÉ
  // (/item_stats_css.staged.css -- style.css est occupé par une
  // autre mission) ; inerte tant que la règle CSS n'est pas appliquée.
  if (it.overclock_scaling) {
    const rows = rarityColsGridHtml(it.overclock_scaling);
    if (rows) parts.push(`<div class="fiche-section oc-section"><h3>${esc(tr('overclockScalingTitle'))}</h3><div class="stat-grid">${rows}</div><p class="hint">${esc(tr('overclockNote'))}</p></div>`);
  } else if (it.overclock_status === 'no_rarity_table') {
    parts.push(`<div class="fiche-section oc-section"><h3>${esc(tr('overclockScalingTitle'))}</h3><p class="hint">${badge({ axis: 'provenance', value: 'absent', extra: tr('overclockServerSide') })}</p></div>`);
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

/* ── Effet d'amélioration (AdditionalDescription d'Items.xml, décodé par la
   passe boss-heads 2026-07-11) : la ligne « Enhancement effect: … » des
   trophées têtes de boss (vol de vie on-hit, réduction des autos reçues…) —
   texte localisé VERBATIM du client, jamais reformulé ni chiffré au-delà de
   ce que la ligne dit elle-même (le mécanisme précis est côté serveur). */
function enhancementSection(it) {
  if (!it.additionalDesc) return '';
  return `<div class="fiche-section"><h3>${esc(tr('enhancementEffectTitle'))}</h3>
    <p class="use-effect-text">${esc(it.additionalDesc).replace(/\n/g, '<br>')}</p></div>`;
}

/* ── Lignes d'effet des runes & puces (effect-lines pass, 2026-07-11) ─────
   it.effectLines = jointures byte-prouvées item → enregistrements de
   variante (champs 0x4b68 : base / améliorée(upgraded) / overclockée ;
   paliers T1-T3 des talents de puce par stem) + textes localisés résolus au
   build (tooltips ConstAbilityNames via le code 0x56f3, buffs Effects.xml
   via le registre ViewModels) avec substitution honnête : chaque {{token}}
   non résolu reste une pastille (effectVarChip), chaque valeur par rareté
   une pastille 4 couleurs — jamais un chiffre inventé. Une variante « vide »
   (stub client, magnitudes serveur) rend une note explicite, même règle que
   overclockServerSide. */
const VARIANT_LABEL_KEY = {
  base: 'variantBase', upgraded: 'variantUpgraded', overclocked: 'variantOverclocked',
  tier_t1: 'variantTierT1', tier_t2: 'variantTierT2', tier_t3: 'variantTierT3',
};
const VARIANT_ORDER = { base: 0, tier_t1: 1, tier_t2: 2, tier_t3: 3, upgraded: 4, overclocked: 5 };

function effectLinesSection(it) {
  const el = it.effectLines;
  if (!el?.variants?.length) return '';
  const variants = [...el.variants].sort((a, b) =>
    (VARIANT_ORDER[a.variant] ?? 9) - (VARIANT_ORDER[b.variant] ?? 9));
  // une variante peut arriver en PLUSIEURS lignes de jointure (texte de buff
  // côté effet + tooltip côté capacité, ex. runes actives) — un seul en-tête
  // par variante, corps concaténés dans l'ordre trié.
  const seenVariant = new Set();
  const blocks = variants.map(v => {
    const labelKey = VARIANT_LABEL_KEY[v.variant];
    const label = labelKey ? tr(labelKey) : v.variant;
    const showHeader = !seenVariant.has(v.variant);
    seenVariant.add(v.variant);
    const nameBit = v.name && v.name !== it.name ? ` — ${esc(v.name)}` : '';
    let body = '';
    for (const t of v.texts || []) {
      const html = effectResolvedTextHtml({ resolvedDesc: t.text, unresolved: t.unresolved });
      if (!html && !t.name) continue;
      const buffName = t.name && t.name !== v.name && t.name !== it.name
        ? `<span class="effect-line-buff">${esc(t.name)}</span> ` : '';
      body += `<p class="use-effect-text">${buffName}${html}</p>`;
    }
    if (v.formula) {
      body += `<p class="use-effect-text formula-line"><code>${esc(v.formula)}</code></p>`;
    }
    if (v.byRarity) {
      const rows = rarityColsGridHtml(v.byRarity);
      if (rows) body += `<div class="stat-grid">${rows}</div>`;
    }
    if (v.params?.length) {
      // face numérique d'une variante sans texte localisé : les paramètres
      // scalaires pliés de SON enregistrement, forme `[{code, value, name?}]`.
      // statChip rend le NOM joueur quand la légende du client en porte un
      // (ex. « Réduction du temps de recharge »), sinon le code moteur avec
      // l'affordance « code moteur » — jamais un nom inventé.
      const rows = v.params.map(p =>
        `<div class="stat-row-label">${statChip(p)}</div><div class="stat-row-value">${esc(fmtNum(p.value))}</div>`).join('');
      if (rows) body += `<div class="stat-grid">${rows}</div>`;
    }
    if (!body) {
      // variante attestée par les octets mais au contenu côté serveur —
      // l'énoncer vaut mieux qu'une ligne absente (même famille de note
      // honnête qu'overclockServerSide).
      body = `<p class="hint">${badge({ axis: 'provenance', value: 'absent', extra: tr('variantServerSide') })}</p>`;
    }
    const ocCls = v.variant === 'overclocked' ? ' oc-section' : '';
    const header = showHeader ? `<h4 class="fiche-sub">${esc(label)}${nameBit}</h4>` : '';
    return `<div class="effect-line-variant${ocCls}">${header}${body}</div>`;
  }).join('');
  if (!blocks) return '';
  return `<div class="fiche-section"><h3>${esc(tr('effectLinesTitle'))}</h3>${blocks}</div>`;
}

/* Effet(s) d'une capacité (abilities.bin `effect`) : chaîne d'entrées
   {class, duration?, modifiers?} décodée au build. Rendue dans la MÊME grammaire
   visuelle que les lignes d'effet d'objet (une ligne de durée en secondes par
   valeur distincte, puis une ligne par modificateur de stat, dans un stat-grid).
   Résolution via statChip (comme rarityColsGridHtml / effectLines v.params) :
   le nom joueur du modificateur quand le client le porte (Movement Speed…),
   sinon le code moteur (ACP5) porté par l'affordance « code moteur » — jamais
   un nom inventé ; la magnitude
   n'est affichée que lorsqu'elle existe (m.value), sinon la stat est listée
   seule (l'effet s'applique, son ampleur reste côté serveur). Les entrées sans
   durée NI modificateur (set_ai/shield/tick pur) ne rendent rien -> section
   absente quand aucune ligne n'est produite (jamais un bloc vide fabriqué). */
function abilityEffectSection(a) {
  const chain = a.effect;
  if (!Array.isArray(chain) || !chain.length) return '';
  const durations = [];
  let modRows = '';
  for (const e of chain) {
    if (e.duration != null && !durations.includes(e.duration)) durations.push(e.duration);
    for (const m of e.modifiers || []) {
      if (!m.name && !m.code) continue;
      const label = statChip({ code: m.code, name: m.name });   // nom joueur (Movement Speed…) sinon code moteur + affordance
      const val = m.value != null ? fmtNum(m.value) : '';
      modRows += `<div class="stat-row-label">${label}</div><div class="stat-row-value">${esc(val)}</div>`;
    }
  }
  const durRows = durations.map(d =>
    `<div class="stat-row-label">${esc(tr('abilityEffectDurationLabel'))}</div>`
    + `<div class="stat-row-value">${esc(tr('abilityCooldownSeconds', fmtNum(d)))}</div>`).join('');
  const rows = durRows + modRows;
  if (!rows) return '';
  return `<div class="fiche-section"><h3>${esc(tr('abilityEffectTitle'))}</h3><div class="stat-grid">${rows}</div></div>`;
}

/* Mise à l'échelle par rareté (`byRarity`) + paramètres scalaires (`params`)
   d'une capacité : la grille par rareté réutilise le helper partagé
   rarityColsGridHtml (forme liste `[{code, name?, by_rarity}]`) ; les params
   sont les scalaires pliés de l'enregistrement, forme `[{code, value, name?}]`.
   statChip rend le NOM joueur quand la légende du client en porte un (ex.
   « Portée de capacité »), sinon le code moteur avec l'affordance « code
   moteur » — jamais un nom inventé. `C` (cooldown) est retiré de la grille
   params : déjà surfacé en ligne « Cooldown » dédiée, pas répété. La section
   ne s'intitule « Paramètres bruts » (+ note verbatim) que si AUCUN code n'a
   de nom ; dès qu'au moins un est nommé elle devient « Paramètres », les codes
   non-nommables gardant leur affordance individuelle. Absente si champ manquant. */
function abilityScalingSection(a) {
  const parts = [];
  if (a.byRarity) {
    const rows = rarityColsGridHtml(a.byRarity);
    if (rows) parts.push(`<div class="fiche-section"><h3>${esc(tr('abilityRarityScalingTitle'))}</h3><div class="stat-grid">${rows}</div></div>`);
  }
  if (a.params?.length) {
    const list = a.params.filter(p => p.code !== 'C');
    const rows = list.map(p =>
      `<div class="stat-row-label">${statChip(p)}</div><div class="stat-row-value">${esc(fmtNum(p.value))}</div>`).join('');
    if (rows) {
      // dès qu'un code est nommé, la section n'est plus « brute » : titre
      // « Paramètres » sans la note verbatim (les codes non-nommables gardent
      // leur affordance individuelle). Tout-code-brut → « Paramètres bruts » + note.
      const anyNamed = list.some(p => p.name);
      const title = anyNamed ? tr('abilityParamsNamedTitle') : tr('abilityParamsTitle');
      const hint = anyNamed ? '' : `<p class="hint">${esc(tr('abilityParamsHint'))}</p>`;
      parts.push(`<div class="fiche-section"><h3>${esc(title)}</h3>${hint}<div class="stat-grid">${rows}</div></div>`);
    }
  }
  return parts.join('');
}

/* Fiche capacité (sorts de héros / capacités de monstres NOMMÉES) : icône,
   emplacement (Q/W/E/R/MA quand présent), cooldown SI déclaré (core.js
   abilityCooldownHtml, lu sur `a.cooldown` — chiffre résolu ou « non spécifié »
   honnête). La description arrive déjà résolue du pipeline (`a.resolvedDesc` +
   `a.unresolved[]`) et passe par effectResolvedTextHtml — MÊMES pastilles
   honnêtes que les effets d'objet (base/formule/par-rareté décodés en ligne,
   runtime/non-extrait en pastille « ? », JAMAIS de {{brut}}). Puis l'effet/CC
   (a.effect : durées + modificateurs de stat), les tags verbatim, la formule de
   dégâts reconstruite/localisée quand décodée (a.formula — voir formulaHtml) et
   la mise à l'échelle par rareté + paramètres bruts (a.byRarity/a.params).
   Provenance « capacité de monstre » (a.origin==='monster', 20 clés) dite dans
   le sous-titre : le nom est un libellé prettifié du pipeline, pas une
   localisation en jeu. Absence honnête typée quand rien n'est chiffrable côté
   client (ni desc, ni effet, ni formule, ni scaling, ni cooldown). */
function openAbilityFiche(key) {
  const a = S.abilities[key];
  if (!a) return;
  S.openFiche = { kind: 'ability', id: key };
  const avatar = a.icon ? iconTag(`icons/${a.icon}`, 'fiche-avatar', '✨') : '';
  const tagsHtml = a.tags?.length
    ? `<div class="fiche-section reward-chips">${a.tags.map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>` : '';
  const cooldownHtml = abilityCooldownHtml(a);
  const descHtml = a.resolvedDesc
    ? `<div class="fiche-section"><p class="fiche-journal">${effectResolvedTextHtml(a)}</p></div>` : '';
  const effectHtml = abilityEffectSection(a);
  const formulaHtmlBlock = a.formula ? formulaHtml(a.formula) : '';
  const scalingHtml = abilityScalingSection(a);
  const originSub = a.origin === 'monster' ? ` · ${esc(tr('abilityOriginMonster'))}` : '';
  const hasDetail = cooldownHtml || descHtml || effectHtml || formulaHtmlBlock || scalingHtml;
  const emptyNote = !hasDetail
    ? `<div class="fiche-section"><p class="hint">${badge({ axis: 'provenance', value: 'absent', extra: tr('abilityNoDetail') })}</p></div>` : '';
  openFiche(`
    ${ficheHeader({ avatar, name: a.name, hex: entityColor('ability', a.name), sub: `${esc(tr('abilityLabel'))}${a.slot ? ' · ' + esc(a.slot) : ''}${originSub}` })}
    ${cooldownHtml}
    ${descHtml}
    ${effectHtml}
    ${tagsHtml}
    ${formulaHtmlBlock}
    ${scalingHtml}
    ${emptyNote}`);
  setFicheHash(null);
}

/* (Chip PNJ retiré : toute citation de PNJ passe désormais par npcRef —
   `[PNJ(●)] Nom`, épinglable quand une position est connue ; le dernier
   appelant, l'en-tête de dialogue-bark, a migré vers cette réf pinnable, comme
   la ligne donneur de quête.) */

/* Chip nœud de récolte (#81, gn_* -- S.nodes) : même composant `.chip` que
   itemChip/npcChip ci-dessus, ouvre la fiche nœud (openNodeFiche). Teinte =
   nodeHex (métier réel du nœud, jamais une couleur dupliquée en dur -- voir
   config.js). `S.nodes` est chargé en différé (loadDeferred, comme
   S.recipes/S.monsters) : un nœud pas encore résolu s'affiche en texte
   replié sur sa CLÉ (jamais un lien deviné) et se répare tout seul au
   prochain rendu de la fiche courante (item -> déjà dans la liste de
   re-rendu post-loadDeferred de main.js ; but de quête -> la fiche quête
   entière se rouvre déjà pour la même raison). */
function nodeChip(nk) {
  const n = S.nodes?.[nk];
  const label = n ? n.name : pretty(nk.replace(/^gn_/, ''));
  // EntityRef (E'c-3, kill-list §3.5) : l'ex-`.chip` + data-act="fiche-node"
  // devient `[Nœud] Nom` — souligné → fiche nœud quand la clé résout (S.nodes,
  // différé), sinon nom en clair replié sur la clé (jamais un lien deviné).
  // Pas de pastille : un nœud n'a PAS de point carte (aucun nœud→point,
  // byte-prouvé §3.1) ; la couche de récolte est le substitut dessinable.
  // Palier accolé au chip (Lot 1) : le même badge coloré que la fiche/recherche,
  // pour qu'un nœud drainé depuis une recette/un drop d'objet porte SON tier
  // (nodeTierBadge rend '' tant que la clé n'est pas résolue — pas de faux tier).
  return `${ref({ kind: 'node', key: nk, label, hex: nodeHex(n), hasFiche: !!n })}${nodeTierBadge(n && n.tier)}`;
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

/* Jointure camp→groupe : l'ancien helper local allCampGroupsFlat() (tableau
   aplati re-cherché en .find() O(n) par clé) a migré vers le résolveur de
   points UNIQUE js/pointsets.js (#82 chunk (b), design §3) — même lookup
   (index paresseux campGroupByKey, partagé avec le compositeur de rendu, le
   surlignage de camp de main.js et les sous-couches famille), jamais
   re-dérivé par surface. Les consommateurs historiques ci-dessous
   (campRef / farmSectionHtml / monsterCampsHtml) l'appellent désormais
   directement par clé. */

/* (Les ex-boutons « Afficher <espèce/famille> · N pts » — sont SUPPRIMÉS,
   kill-list §7.2 : la pastille du tag `[Espèce(●)]`/`[Famille(●)]` EST désormais
   le toggle (en-tête de fiche monstre/famille, membres de famille, cibles
   d'objectif — speciesRef/famToggle ci-dessus et goalTargetChip). Leurs
   handlers de couche correspondants ont été retirés de main.js avec leur
   dernier émetteur ; la pastille passe par ref-draw. */

function farmSectionHtml(it) {
  if (!it.farm?.length) {
    // Repli honnête : des taux de drop catalogués mais AUCUN camp connu
    // derrière -- jamais une section farm absente en silence (ex. res_fang,
    // 17 tables de butin dont aucune n'est référencée par un camp du jeu de
    // données expédié -- un vrai trou de couverture, pas un bug de
    // jointure, voir  §4).
    return it.drops?.length
      ? `<div class="fiche-section"><h3>${esc(tr('farmSpotsTitle'))}</h3><p class="hint">${esc(tr('farmSourcesNotMapped'))}</p></div>` : '';
  }
  // Pool de récompense générique : toute la section se replie en UNE ligne
  // muette plutôt que d'énumérer jusqu'à 24 camps sans rapport thématique.
  if (isGenericFarmPoolItem(it.drops)) {
    return `<div class="fiche-section"><h3>${esc(tr('farmSpotsTitle'))}</h3>
      <p class="hint">${esc(tr('farmGenericPoolNote', it.farm.length))}</p></div>`;
  }
  // Jointure camp -> vrai nuage de points (campGroupByKey, résolveur unique
  // js/pointsets.js — index paresseux, plus de tableau aplati re-cherché
  // ligne par ligne).
  const byKind = new Map();
  const unjoined = [];
  for (const c of it.farm) {
    const g = campGroupByKey(c.camp);
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
    // (L'ancien bouton « Surligner tout » d'union de groupe — camp-highlight
    // data-ids — est RETIRÉ, règle canonique 2026-07-11 : toute action carte
    // référence un toggle de l'arbre. Un groupe de camps par kind n'a pas de
    // nœud d'arbre dédié ; le résumé « N camps · M pts » reste, et chaque
    // ligne mène à sa fiche camp — qui garde SON bouton de surlignage.)
    return `<div class="farm-group">
      <div class="farm-group-head">
        <span class="farm-group-label" style="color:${CAMP_COLORS[grp.kind] || '#999'}">${esc(campKindLabel(grp.kind))}</span>
        <span class="muted">${esc(tr('farmGroupSummary', grp.rows.length, grp.totalPts.toLocaleString(numberLocale())))}</span>
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

/* « Récolté sur » (#81) : ladder de chips nœud (it.nodes[], gn_* -- 35 items,
   ex. Iron Ore -> ses 3 paliers de minerai météorique) -- même composant
   nodeChip que la ligne de but de quête ci-dessus (goalTargetChip), aucune
   duplication. Absent (le catalogue objet n'a pas ce champ, ex. tout objet
   non récolté) -> section omise entièrement, jamais un titre vide. */
function harvestedOnHtml(it) {
  if (!it.nodes?.length) return '';
  return `<div class="fiche-section"><h3>${esc(tr('harvestedOnTitle'))}</h3>
    <div class="reward-chips">${it.nodes.map(nodeChip).join('')}</div></div>`;
}

/* « Également trouvable dans des coffres » (#65, it.containers[]/recipes[]
   .containers[]) : le pipeline agrège déjà PAR CLASSE de contenant --
   camp_chest par famille de monstre, searchable_chest par bande de rareté --
   `ch` étant la MEILLEURE chance parmi les variantes de palier/grade
   repliées dans cette classe (voir , commentaire de la
   passe #65). Les deux classes n'ont PAS le même degré de vérité carte :
     - camp_chest : AUCUN placement réel ne porte la famille de monstre (les
       901 placements chests.bin `group==="camp_chest"` partagent tous le
       même skin d'art "sci_fi", jamais la famille du camp voisin -- byte-
       prouvé) -- classe de contenant SEULE, jamais de bouton carte (note
       honnête `containerCampChestHint`), jamais un surlignage qui mentirait
       sur ce qu'il montre.
     - searchable_chest : les 487 placements RÉELS existent (searchable_chests.bin)
       mais la rareté est décidée côté serveur au spawn (jamais dérivable
       client, voir openSearchableChestFiche's own note) -- le tracé ne peut
       donc honnêtement allumer que la couche ENTIÈRE, jamais un sous-
       ensemble par rareté fabriqué. La référence CATÉGORIE `[Chest(●)]`
       (EntityRef vague 2, kill-list §7.2) bascule cette couche entière (le
       nœud d'arbre Interactables > Chests > Coffres fouillables, ON par
       défaut) — pas un surlignage transitoire ni un sous-ensemble par rareté,
       cohérent avec « action carte = référence à un toggle de gauche ». */
function containerChanceText(ch) {
  const pct = ch * 100;
  if (pct < 1) return tr('containerChanceBelowOne');
  return tr('containerChanceUpTo', fmtPct(ch));
}
function containerRarityLabel(r) {
  const cap = r ? r[0].toUpperCase() + r.slice(1) : '';
  return rarityLabel(cap) || pretty(r || '');
}
function containerRow(c) {
  const chance = c.ch != null ? `<span class="muted">${esc(containerChanceText(c.ch))}</span>` : '';
  // Coffre fouillable : le libellé est une RARETÉ (pas une entité) → libellé
  // simple, jamais une réf.
  if (c.group === 'searchable_chest') {
    return `<div class="frow"><span class="fr-label">${esc(containerRarityLabel(c.rarity))}</span>${chance}</div>`;
  }
  // Coffre de camp : le libellé est une FAMILLE de monstre → réf [Famille]
  // (uniformité + le nom devient ouvrable vers la fiche famille, qui montre où
  // cette famille apparaît). Souligné ⇔ la famille a des membres catalogue ;
  // teinte famille (Q6) ; pas de pastille (une entrée de contenant n'a rien à
  // tracer). Repli honnête sur '' quand `family` absent.
  const fam = familyKey(c.family || 'other');
  const famRef = ref({ kind: 'family', key: fam, family: fam, label: pretty(c.family || ''),
    hex: familyLayerHex(fam), hasFiche: familyHasMembers(fam), drawable: false });
  return `<div class="frow">${famRef}${chance}</div>`;
}
function containersSectionHtml(it) {
  if (!it.containers?.length) return '';
  const campRows = it.containers.filter(c => c.group === 'camp_chest');
  const searchRows = it.containers.filter(c => c.group === 'searchable_chest');
  const campBlock = campRows.length
    ? `<div class="farm-group">
        <div class="farm-group-head"><span class="farm-group-label" style="color:${CATS.camp_chest.hex}">${esc(tr('campChestLabel'))}</span></div>
        <p class="hint">${esc(tr('containerCampChestHint'))}</p>
        ${campRows.map(containerRow).join('')}
      </div>` : '';
  // EntityRef (vague 2, kill-list §7.2) : l'ex-bouton de surlignage de la
  // couche coffres (transitoire, 487 placements réels) devient la référence
  // CATÉGORIE `[Chest(●)]` — la pastille bascule la couche d'arbre « Coffres
  // fouillables » (fkey `searchable_chest`, ON par défaut ; ref-draw `chest` →
  // vrai toggle de la case, main.js), état lu EN DIRECT de CATS.searchable_chest.on.
  // Pas de fiche (catégorie, exception no-page ratifiée §3.5).
  const searchN = (S.data.searchable_chest || []).length;
  const searchToggle = searchRows.length && searchN
    ? ref({ kind: 'chest', mode: 'C', fkey: 'searchable_chest', drawn: CATS.searchable_chest.on, count: searchN }) : '';
  const searchBlock = searchRows.length
    ? `<div class="farm-group">
        <div class="farm-group-head"><span class="farm-group-label" style="color:${CATS.searchable_chest.hex}">${esc(tr('searchableChestTitle'))}</span>${searchToggle}</div>
        ${searchRows.map(containerRow).join('')}
      </div>` : '';
  return `<div class="fiche-section"><h3>${esc(tr('containersTitle'))}</h3>${campBlock}${searchBlock}</div>`;
}

/* Bloc(s) « ingrédients » d'une recette -- UN bloc par référence ATTEIGNABLE
   (it.recipes : [{key, rarity?}]), PARTAGÉ par openItemFiche (section
   « Recette » d'un objet craftable) ET openRecipeFiche ci-dessous (la recette
   EST la fiche, task #78a/#78b) -- même rendu, jamais dupliqué. `ownKey` = la
   clé de la fiche actuellement ouverte (l'objet crafté pour openItemFiche, le
   pseudo-item recette lui-même pour openRecipeFiche) : le chip "produit →"
   ne s'affiche que quand r.output diffère de CETTE clé (jamais un lien qui
   pointerait vers la fiche déjà ouverte). */
/* Verrous d'accès d'une recette (recipes.bin) — RENDUS quand la donnée les
   porte, jamais fabriqués : `profLevel` (« Requiert <métier> niv. N ») et
   `requiresRecipe` (« Apprenez d'abord : <recette> », nom résolu via S.recipes,
   repli prettifié — jamais un lien mort). Partagé par la section « Recette »
   d'une fiche objet ET la fiche recette (recipeIngredientBlocks ci-dessous). */
function recipeGateHtml(r) {
  const parts = [];
  if (r.profLevel != null) {
    parts.push(r.prof
      ? tr('recipeProfLevel', professionLabel(r.prof), r.profLevel)
      : tr('recipeProfLevelNoProf', r.profLevel));
  }
  if (r.requiresRecipe?.length) {
    const names = r.requiresRecipe.map(k => S.recipes[k]?.name || pretty(k));
    parts.push(tr('recipeRequiresRecipe', names.join(', ')));
  }
  if (!parts.length) return '';
  return parts.map(p => `<p class="hint recipe-gate">${esc(p)}</p>`).join('');
}
function recipeIngredientBlocks(recipeRefs, ownKey) {
  return (recipeRefs || []).map(ref => {
    const rk = typeof ref === 'string' ? ref : ref.key;
    const rarity = typeof ref === 'string' ? null : ref.rarity;
    const r = S.recipes[rk];
    if (!r) return '';
    const metaLine = [r.prof ? professionLabel(r.prof) : null, rarity ? rarityLabel(rarity) : null]
      .filter(Boolean).join(' · ');
    const meta = metaLine ? `<div class="pop-coords recipe-meta">${esc(metaLine)}</div>` : '';
    const gate = recipeGateHtml(r);
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
    return `<div class="recipe-block">${meta}${gate}<div class="reward-chips">${ing}</div>${out}</div>`;
  }).join('');
}

/* Fiche « recette » (task #78a searchable-recipes / #78b item IA) : LE
   pseudo-item catalogue it.kind==='recipe' EST la recette (voir
    recipes.json "Site propagation" -- une entrée standalone
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
          ${questRef(slug)}
        </div>`;
      }).join('')}</div>` : '';
  // Schéma trouvable en coffre (#65, 240 stubs recette) : MÊME composant que
  // la fiche objet (containersSectionHtml, reward-chips/farm-group partagés)
  // -- un schéma de recette EST un objet trouvable en contenant comme un
  // autre, jamais une phrase réinventée séparément.
  const containersHtml = containersSectionHtml(it);
  openFiche(`
    ${ficheHeader({
      avatar: iconTag(icon, 'fiche-avatar', itemGlyph(it)),
      name: it.name, hex: RECIPE_HEX,
      sub: `${esc(tr('recipeTitle'))}${it.prof ? ' · ' + esc(professionLabel(it.prof)) : ''}${raritiesLine ? ' · ' + esc(raritiesLine) : ''}${devMark}`,
      below: craftsHtml,
    })}
    ${ingredientsHtml}
    ${containersHtml}
    ${questsHtml}`);
  setFicheHash(null);
}

/* ── Bloc « obtenu depuis » (item_source.json -> items[guid], DATA_CONTRACT §2)
   ──────────────────────────────────────────────────────────────────────────
   Surface d'obtention HONNÊTE. Lignes de DROP : la `weight_share` de l'objet
   dans une table nommée, rendue par la Badge FERMÉE weight-share -- JAMAIS un
   « % de chance » (la vraie proba par tirage est côté serveur, SCHEMA §0.3 ;
   la Badge porte ce caveat dans son info-bulle). Lignes VENDEUR : le prix
   d'achat en BANDE (min–max), jamais un point-prix fabriqué (blueprint §3.3
   PriceBandRow). Le CRAFT garde ses blocs de recette existants. */

/* Normalise une entrée de drop depuis it.obtain.drop[] ({table,ws,c,g}) OU la
   forme héritée it.drops[] ({label,ws|ch,c,g}) vers une seule forme, puis plie
   les paliers L01-14 (dedupeTierDrops) et trie garanti d'abord, part
   décroissante ensuite. `obtain.drop` est préféré (superset propre : ni poids
   brut ni faux `ch`), it.drops sert de repli pour les rares objets sans bloc
   obtain. */
function obtainDropRows(it) {
  const src = it.obtain?.drop?.length
    ? it.obtain.drop.map(d => ({ label: d.table, w: d.ws, c: d.c, g: !!d.g, ws: d.ws }))
    : (it.drops || []).map(d => ({ label: d.label, w: d.ws ?? d.ch, c: d.c, g: !!d.g, ws: d.ws ?? d.ch }));
  if (!src.length) return [];
  return dedupeTierDrops(src)
    .sort((a, b) => (b.g === a.g ? 0 : b.g ? 1 : -1) || ((b.ws ?? 0) - (a.ws ?? 0)));
}
/* Une ligne de drop (ObtainRow) : `[Loot table] Nom` (souligné -> fiche table
   quand elle résout, lootTableItems ; jamais un lien mort) + ×quantité +
   la Badge weight-share (part de la table, pas une chance de drop). Un drop
   garanti (d.g) montre « Garanti » au lieu d'une part. La part n'est jamais
   rendue en « % » ni nommée « chance » : la Badge EST la représentation
   honnête de ws (son info-bulle dit « part de la table, pas une proba par kill »). */
function obtainDropRowHtml(d) {
  const tableKey = d.first || d.label;
  const tableRef = ref({ kind: 'loot', key: tableKey, label: d.label, hasFiche: !!lootTableItems(tableKey) });
  const countBit = d.c > 1 ? `<span class="muted">×${d.c}</span>` : '';
  const share = d.g
    ? `<span class="muted">${esc(tr('guaranteedLabel'))}</span>`
    : badge({ axis: 'value', value: 'weight-share' });
  return `<div class="frow" data-n="${esc(fold(d.label))}">${tableRef}${countBit}${share}</div>`;
}

/* Drapeaux honnêtes d'un article de stock vendeur (contrat vendor_stock :
   `infinity` = stock illimité, `chance` = probabilité d'être proposé au
   réassort) -- même composant .stock-flag que la fiche PNJ (entity.js), rendus
   dès que la donnée les porte, jamais fabriqués. */
function itemStockFlags(s) {
  const inf = s.infinity ? `<span class="stock-flag" title="${esc(tr('stockInfinityTitle'))}">${esc(tr('stockInfinity'))}</span>` : '';
  const chance = (s.chance != null && s.chance < 1)
    ? `<span class="stock-flag stock-flag-muted" title="${esc(tr('stockChanceTitle'))}">${esc(tr('stockChance', Math.round(s.chance * 100)))}</span>` : '';
  return inf + chance;
}
/* PriceBandRow (blueprint §3.3) pour l'article `s` (S.vendors[vk].sells) : prix
   d'achat en BANDE min–max (priceMin/priceMax, ou base × buy_price_multiplier ×
   gold en repli), JAMAIS un point-prix fabriqué -- une bande dégénérée
   (min===max) retombe sur le prix unique. Qualité teintée + drapeaux de stock.
   Même rendu (.fr-price/.coin/.stock-flag) et mêmes clés i18n (priceBandTitle…)
   que la table de stock de la fiche PNJ, pour une seule grammaire de prix. */
function itemPriceBandRow(s) {
  if (!s || typeof s === 'string') return '';
  const qual = s.quality
    ? `<span class="fr-quality" style="color:${RARITY[s.quality]?.hex || 'var(--muted)'}">${esc(rarityLabel(s.quality) || s.quality)}</span>` : '';
  const flags = itemStockFlags(s);
  // Échange (barter) : le coût est en OBJETS, l'or est supprimé côté données
  // (ex. monture Hyène cuirassée = 1× Sceau de hyène cuirassée). Rendu « N×
  // <objet> » — chip cliquable vers la fiche de l'objet d'échange, quantité
  // TOUJOURS explicite — au lieu d'AUCUN prix (l'ancien rendu laissait ces
  // stocks sans aucune indication de coût).
  if (s.barter?.length) {
    const barterHtml = s.barter
      .map(b => `${esc(String(b.count || 1))}× ${itemChip(b.key)}`)
      .join(' + ');
    const price = `<span class="muted" title="${esc(tr('barterCostTitle'))}">${esc(tr('barterCostLabel'))} ${barterHtml}</span>`;
    return `<div class="vendor-price">${qual}${flags}${price}</div>`;
  }
  const bpm = s.buy_price_multiplier, gold = s.gold;
  const lo = s.priceMin != null ? s.priceMin : (bpm && gold ? bpm.min * gold.min : (s.price ?? null));
  const hi = s.priceMax != null ? s.priceMax : (bpm && gold ? bpm.max * gold.max : lo);
  let price = '';
  if (lo != null && hi != null && Math.round(lo) !== Math.round(hi)) {
    price = `<span class="muted fr-price" title="${esc(tr('priceBandTitle'))}">${esc(Math.round(lo).toLocaleString(numberLocale()))}&nbsp;–&nbsp;${esc(Math.round(hi).toLocaleString(numberLocale()))} <span class="coin" aria-hidden="true"></span></span>`;
  } else if (lo != null) {
    price = `<span class="muted fr-price" title="${esc(tr('priceTitle'))}">${esc(Math.round(lo).toLocaleString(numberLocale()))} <span class="coin" aria-hidden="true"></span></span>`;
  }
  if (!qual && !flags && !price) return '';
  return `<div class="vendor-price">${qual}${flags}${price}</div>`;
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
  // isInternal (items-obtain audit §B3) : même principe pour un pseudo-item
  // interne (charge de capacité/effet — masqué du listage par devcontent.js,
  // jamais retiré des données) — badge « Interne » distinct du badge Test,
  // toujours ouvrable via ses jointures (chips de quête/butin, lien profond).
  const devMark = it.isTest
    ? `<span class="dev-mark" title="${esc(tr('devBadgeTitle'))}">${esc(tr('devBadge'))}</span>`
    : it.isInternal
      ? `<span class="dev-mark" title="${esc(tr('internalBadgeTitle'))}">${esc(tr('internalBadge'))}</span>`
      : '';

  const descHtml = it.desc
    ? `<div class="fiche-section"><p class="fiche-journal">${esc(it.desc)}</p></div>` : '';

  // Valeur de revente de base (items.bin `value`) — repère de « prix » honnête,
  // surtout utile quand l'objet n'a pas de prix d'achat en or (stock d'échange).
  const valueLine = (it.value != null && it.value > 0)
    ? `<span class="pop-coords item-value" title="${esc(tr('itemValueTitle'))}">${esc(tr('itemValueLabel'))} ${esc(Math.round(it.value).toLocaleString(numberLocale()))} <span class="coin" aria-hidden="true"></span></span>`
    : '';

  // Effet(s) de la/des capacité(s) liée(s) ( Phase B) --
  // jointure déjà faite au build (it.useEffect), rendue ici seulement.
  const useEffectHtml = useEffectSection(it);
  // Effet d'amélioration (têtes de boss & co.) + lignes d'effet des runes/
  // puces (base/améliorée/overclockée/paliers) — effect-lines pass.
  const enhancementHtml = enhancementSection(it);
  const effectLinesHtml = effectLinesSection(it);

  // Plages de jet/DPS d'arme (stat_ranges/weapon_dps), formule d'artefact
  // T3 (artifact_formula) et mise à l'échelle rune/puce (rarity_scaling/
  // tier_scaling) --  #8/#9/#10, voir les fonctions partagées
  // définies plus haut (rollRangeSection/formulaHtml/scalingSection).
  const rollRangeHtml = rollRangeSection(it, key);
  // Qualité de jet (préfixes "Amélioré/Renforcé..." -- seuils 33 %/66 % dérivés
  // des plages livrées, artefacts uniquement ; voir rollQualitySection).
  const rollQualityHtml = rollQualitySection(it, key);
  const formulaHtmlBlock = it.artifact_formula ? formulaHtml(it.artifact_formula, { rarityNote: true }) : '';
  const scalingHtml = scalingSection(it);

  // Bloc DROP (ObtainRow, obtain block) : les tables de butin où l'objet
  // apparaît, avec sa part de table (Badge weight-share, JAMAIS un « % de
  // chance » trompeur) + quantité + « Garanti » quand d.g -- voir
  // obtainDropRows/obtainDropRowHtml ci-dessus. Remplace l'ancien rendu ≈%
  // (dropRateHtml, core.js) qui présentait la part de table comme un
  // pourcentage lisible comme une proba par kill (SCHEMA §0.3 : la vraie
  // chance est côté serveur).
  let dropsHtml = '';
  const dropRows = obtainDropRows(it);
  if (dropRows.length) {
    dropsHtml = `<div class="fiche-section"><h3>${esc(tr('obtainDropsTitle'))}</h3>${dropRows.map(obtainDropRowHtml).join('')}</div>`;
  }

  const farmHtml = farmSectionHtml(it);
  const harvestedOnHtmlBlock = harvestedOnHtml(it);
  const containersHtml = containersSectionHtml(it);

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
        const icon = npcIconUrl(rec?.icon);
        // EntityRef (E'c-3) : `[PNJ(●)] Nom` (npcRef, locate:true par défaut) —
        // la pastille LOCATE du marchand REMPLACE l'ex-bouton carte séparé
        // (forme verbeuse « réf + bouton position » abandonnée, intention owner) :
        // un seul geste carte (pin persistant du marchand sur la carte active),
        // le nom souligné ouvre sa fiche PNJ. Portrait conservé en chrome de ligne.
        return `<div class="frow">
          ${iconTag(icon, 'fr-icon', initials(n.name))}
          ${npcRef(n.name, { ni })}
        </div>`;
      }).join('');
      const more = npcs.length > 6 ? `<p class="hint">${esc(tr('moreMerchants', npcs.length - 6))}</p>` : '';
      // En-tête technique du stand (« Tt Trader Drek ») masqué quand des PNJ
      // nommés existent en dessous — bruit d'asset, pas un nom joueur.
      const showName = !(npcs.length && /^tt[\s_]/i.test(v.name || ''));
      // PriceBandRow (blueprint §3.3) : le prix d'achat de CET objet chez CE
      // vendeur -- une BANDE min–max (S.vendors[vk].sells, le même stock
      // byte-exact que la fiche PNJ), jamais un point-prix fabriqué. La donnée
      // de bande vit sur soldBy->sells (résolvable, avec noms de PNJ) plutôt
      // que sur obtain.vendor.npcKeys (clés npc_* non résolvables côté client).
      const sell = v.sells?.find(s => (typeof s === 'string' ? s : s.key) === key);
      const priceRow = itemPriceBandRow(sell);
      return `<div class="vendor-block">${showName ? `<div class="vendor-name">${esc(v.name)}</div>` : ''}${priceRow}${npcRows || `<p class="hint">${esc(tr('merchantPosUnknown'))}</p>`}${more}</div>`;
    }).join('');
    if (blocks) vendorsHtml = `<div class="fiche-section"><h3>${esc(tr('soldByTitle'))}</h3>${blocks}</div>`;
  }

  // Une entrée par rareté ATTEIGNABLE (déjà dédupliqué côté pipeline — voir
  //  recipes.json "rarity"/"variant_group" : un seul craft/jeu
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
    for (const rc of it.recipes) {
      const rk = typeof rc === 'string' ? rc : rc.key;
      if (seenRk.has(rk) || !S.recipes[rk]) continue;
      seenRk.add(rk);
      const rIcon = S.recipes[rk].icon ? `icons/${S.recipes[rk].icon}` : null;
      // EntityRef (E'c-3, kill-list §3.5) : l'ex-`.chip` + data-act="fiche-recipe"
      // devient `[Recette(●?)] Nom` — le tag [Recette] porte l'info que
      // l'ex-libellé « Recette : … » disait en clair, souligné → fiche recette.
      // Icône réelle du schéma conservée en chrome de tête (chip-icon).
      chips.push(`${iconTag(rIcon, 'chip-icon', '📜')}${ref({ kind: 'recipe', key: rk, label: it.name, hex: RECIPE_HEX, hasFiche: true })}`);
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
  // source: the quest goal that actually resolved this item ('s
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
      // monster_name is now baked at build time straight from 's own
      // resolved monster name (see ()),
      // independent of the client's catalog grouping -- first render is
      // already correct, no client-side lookup needed at all.
      //
      // Mechanism decode job B: quest_source_of now covers every mechanism
      // that ever resolves an item ('s build_catalog()),
      // not just kill/interact -- one viaLine phrase per `qs.via`, each
      // mirroring the exact fact that mechanism's target shape carries
      // (never inferred beyond what's on `qs`).
      let viaLine = '';
      if (qs.via === 'kill') {
        const viaName = qs.monster_name || null;
        // The clickable upgrade (monster fiche link) legitimately CAN'T
        // resolve before S.monsters loads -- monsterKeyFor guards it exactly
        // like every other such link in this file (actorRows, goalTargetChip);
        // it silently upgrades in place once loadDeferred() completes and this
        // fiche gets re-rendered. Unlike the name above, this part of the
        // race is unavoidable (S.monsters itself has to exist to know the
        // fiche does), so it degrades to plain text instead, never a dead link.
        const viaMonsterKey = qs.monster_key ? monsterKeyFor(qs.monster_key, qs.monster_name) : null;
        // EntityRef (vague 2, exemple ratifié verbatim de l'owner : « By
        // killing Imp Witch → By killing [Monster(●)] Imp Witch (full color of
        // imp witch) ») : le verbe seul (obtainViaKill, devenu un PRÉFIXE
        // i18n) + une référence [Espèce(●)] Nom dans la teinte PRÉCISE de
        // l'espèce (Q6, speciesRef), la pastille basculant SA couche de spawn.
        // Non résolu (monster_key absent, ou espèce hors carte active) → tag +
        // nom en clair teinté (Q8), jamais un lien deviné.
        viaLine = viaName
          ? `<p class="hint">${esc(tr('obtainViaKill'))} ${speciesRef({ key: viaMonsterKey, name: viaName })}</p>`
          : '';
      } else if (qs.via === 'container') {
        // collect_from_object (renamed from the old generic "interact" --
        // same wording, see 's own comment on the rename).
        // EntityRef (vague 2, exemple ratifié : « By interacting with Beeswax →
        // By interacting with [Object(●)] Beeswax ») : verbe seul
        // (obtainViaInteract, devenu PRÉFIXE i18n) + référence [Objet] Nom. PAS
        // de pastille : aucun nœud qao par type n'existe encore (chunk (c) non
        // livré) et ce mécanisme ne byte-joint aucune position — honnête (rien
        // à dessiner), le tag nomme le kind sans prétendre à un placement.
        viaLine = qs.object_label
          ? `<p class="hint">${esc(tr('obtainViaInteract'))} ${ref({ kind: 'qao', mode: 'N', label: cleanLabel(qs.object_label) })}</p>`
          : '';
      } else if (qs.via === 'harvest') {
        viaLine = `<p class="hint">${esc(tr('obtainViaHarvest', professionLabel(capitalize(qs.profession))))}</p>`;
      } else if (qs.via === 'given_by') {
        // receive_npc, or the "collect" mechanism's own given-by-giver
        // safety-net branch (see ) -- NPC name is now the
        // SHARED npcChip component (task #70 / fiche-header identity pass),
        // the same one the quest header's own "given by" row uses, instead
        // of the whole sentence wrapped in a bare `.link` span (audit
        // finding: wired to a real data-act click but with ZERO matching CSS
        // rule -- clickable, but visually identical to plain text). Prefix
        // text reuses goalGivenByLabel ("given by") -- only the chip carries
        // the click/link now, never a guessed link when the NPC isn't
        // resolvable (npcChip degrades to a plain styled name honestly).
        // EntityRef (vague 2) : le donneur devient `[PNJ(●)] Nom` (npcRef) —
        // nom souligné ⇔ résolu sur la carte active, pastille LOCATE ⇔ position
        // connue (aucun bouton carte séparé ici → la pastille EST l'affordance).
        viaLine = qs.npc
          ? `<p class="hint">${esc(tr('goalGivenByLabel'))} ${npcRef(qs.npc)}</p>`
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
        // EntityRef (vague 2) : `[PNJ(●)]` (donneur de l'AUTRE quête, npcRef) +
        // `[Quête] Nom` (la quête dont l'achèvement l'accorde). Le kind-tag
        // [Quête] remplace le mot « quête » de l'ancien fragment
        // (obtainViaRewardOfQuest) ; souligné ⇔ la quête résout, jamais deviné.
        const givenBit = qs.npc ? `${esc(tr('goalGivenByLabel'))} ${npcRef(qs.npc)}` : '';
        const rqSlug = qs.quests?.[0];
        const rqName = qs.quest_names?.[0] || (rqSlug ? pretty(rqSlug) : null);
        const rqResolved = !!(rqSlug && S.quests.has(rqSlug));
        const rqRef = rqName
          ? questRef(rqSlug, { label: rqName, resolved: rqResolved })
          : '';
        const bits = [givenBit, rqRef].filter(Boolean);
        viaLine = bits.length ? `<p class="hint">${bits.join(' — ')}</p>` : '';
      } else if (qs.via === 'world') {
        viaLine = `<p class="hint">${esc(tr('obtainViaWorld'))}</p>`;
      }
      // EntityRef (vague 2) : la ligne d'identité de la quête source (ex-k-chip
      // + ex-fr-label) devient une seule référence `[Quête] Nom` (le tag
      // remplace le badge détaché).
      questSourceHtml = `<div class="fiche-section"><h3>${esc(tr('obtainDuringQuestTitle'))}</h3>
        <div class="frow">${questRef(qs.quest, { label: srcQuest.name })}</div>
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
          ${questRef(slug)}
        </div>`;
      }).join('')}</div>` : '';

  // Ligne d'obtention honnête (items-obtain audit §B2) : le pipeline stampe
  // `obtainStatus` (enum fermé, ) sur
  // toute entrée SANS AUCUN canal d'obtention — plutôt qu'un vide silencieux,
  // la fiche énonce ce que les données disent (« aucune source référencée »,
  // jamais « inobtenable » : une affirmation sur le JEU qu'on ne peut pas
  // prouver). Rendue uniquement quand aucune section d'obtention n'a
  // effectivement rien produit ci-dessus (ceinture-bretelles : un canal baké
  // peut rendre vide, ex. soldBy vers un vendeur absent du bundle) — jamais
  // en doublon d'une vraie source. Le mapping statut→clé i18n est FERMÉ ;
  // un statut inconnu (drift futur) retombe sur la formulation générique,
  // jamais sur une clé brute affichée.
  let obtainStatusHtml = '';
  if (it.obtainStatus && !questSourceHtml && !vendorsHtml && !dropsHtml
      && !farmHtml && !harvestedOnHtmlBlock && !containersHtml
      && !recipeHtml && !questsHtml) {
    const OBTAIN_STATUS_KEY = {
      unknown: 'obtainStatusUnknown',
      questOrphan: 'obtainStatusQuestOrphan',
      cosmetic: 'obtainStatusCosmetic',
      lobby: 'obtainStatusLobby',
      internal: 'obtainStatusInternal',
    };
    const k18 = OBTAIN_STATUS_KEY[it.obtainStatus] || 'obtainStatusUnknown';
    obtainStatusHtml = `<div class="fiche-section"><h3>${esc(tr('obtainDuringQuestTitle'))}</h3>
      <p class="hint">${esc(tr(k18))}</p></div>`;
  }

  const weaponLine = weaponTypeLine(it.weapon);
  // Titre désambiguïsé (fix UX) : un item de quête lié à une quête par le
  // résolveur (it.questSource — jamais inventé côté front, voir
  // ) et qui y a des HOMONYMES (les 3 « Imp Brain »
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
  // -- voir  recipes.json) à la place d'une rareté unique.
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
    ${ficheHeader({
      avatar: iconTag(icon, 'fiche-avatar', itemGlyph(it)),
      name: titleName, hex: kindHex,
      sub: `${esc(itemKindText)}${rarity ? ' · ' + esc(rarityLabel(it.rarity)) : ''}${raritiesLine ? ' · ' + esc(raritiesLine) : ''}${it.tier ? ' · ' + esc(it.tier) : ''}${devMark}`,
      below: `${weaponLine ? `<span class="pop-coords">${esc(weaponLine)}</span>` : ''}
      ${it.prof ? `<span class="pop-coords">${esc(professionLabel(it.prof))}</span>` : ''}
      ${valueLine}
      ${recipeChipHtml}`,
    })}
    ${raritySelectHtml}
    ${descHtml}
    ${enhancementHtml}
    ${questSourceHtml}
    ${obtainStatusHtml}
    ${vendorsHtml}
    ${dropsHtml}
    ${farmHtml}
    ${harvestedOnHtmlBlock}
    ${containersHtml}
    ${effectLinesHtml}
    ${useEffectHtml}
    ${rollRangeHtml}
    ${rollQualityHtml}
    ${formulaHtmlBlock}
    ${scalingHtml}
    ${usedHtml}
    ${questsHtml}
    ${recipeHtml}`);
  setFicheHash('item', key);
}

export { openItemFiche, openRecipeFiche, openLootTableFiche, openNodeFiche, openAbilityFiche, setRollRarity };
