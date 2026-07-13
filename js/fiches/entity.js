/* Kwalat — fiches/entity.js (issu du découpage de fiches.js, vague E'c-S).
   Fiches d'entités vivantes : monstre/espèce, famille, faune, PNJ, camp. */
import { S } from '../state.js';
import {
  CATS, CAMP_COLORS, RARITY, MONSTER_HEX, RECIPE_HEX, ZONE_HEX, nodeHex,
  actorKindLabel, campKindLabel, monsterAttackLabel, locationKindLabel,
  rarityLabel, itemKindLabel, professionLabel, harvestMethodLabel,
  weaponTypeLine, weaponClassLabel, ACTION_META, actionVerb, actionIconSvg, mapName,
  campLabel, campQualifierChip, campModeLabel, chestDisplayName,
  statLabel, statTierLabel, formulaTermLabel,
  chestHex, chestKindLabel, prettyRegion, ecAttr, familyKey,
  speciesLayerHex, familyLayerHex, entityColor,
} from '../config.js';
import { $, esc, fmtCoord, fold, iconTag, initials, itemGlyph, npcIconUrl, pretty, capitalize, cleanLabel } from '../utils.js';
import { tr, tbl, numberLocale } from '../i18n/index.js';
import { map, toLL, canvasR, clearHighlight, showHighlight } from '../mapview.js';
import { clearLocator } from '../pins.js';
import { unfocus } from '../urlstate.js';
import { monsterKeyFor, npcIndexByName, loreIndexFor, lootTableItems, dispositionFor, creepFor } from '../data.js';
import { campGroupByKey, speciesPoints, familyPoints, monsterFamilies, kindRestPoints } from '../pointsets.js';
import { RARITY_ORDER, rarityGroupFor } from '../rarity.js';
import { isHiddenTest, visibleQuestSlugs } from '../devcontent.js';
import { ref, refDot } from '../mapref.js';

import { ficheHeader, openFiche, setFicheHash, badge, stateBadge, lootRowsHtml, fmtNum, pillHtml, pillSelectHtml, isRecipeKind, itemEcHex, speciesRef, farmCapRows, farmCampRow, farmUnjoinedRow, familyHasMembers, questRef } from './core.js';
import { regionRef, regionFicheExists } from './zone.js';

/* Fiche camp — ouvrable pour TOUT camp, y compris sans fiche détaillée
   (camp_details ne couvre que les camps de monstres/ressources : les
   contenants cassables/fouillables n'y sont jamais) : points de spawn +
   bouton carte au minimum, et pour un contenant TYPÉ (caisse de maïs,
   cercueil, corps, coffre fouillable…) la table de butin associée PAR TYPE
   (champ cuit g.probableLoot — mention honnête, le lien prop→table n'est
   pas publié par le jeu). */
/* Kinds "monster-ish" ( -- même classement, tokens
   raw "monsters"/"monster"/"creeps"/"wild"/"peaceful" normalisés en kinds
   site "monsters"/"creeps"/"wildlife", voir 
   _CAMP_KIND_NORM) : la seule famille de camps pour laquelle une SECTION
   FAUNE a un sens -- un camp de minerai/herboristerie n'a simplement aucune
   créature à lister, ce n'est pas un trou de donnée. */
const MONSTER_ISH_CAMP_KINDS = new Set(['monsters', 'creeps', 'wildlife']);

/* ── DispositionBadge (blueprint §3.3) ───────────────────────────────────────
   La posture d'une créature envers le joueur (peaceful / neutral / hostile).
   C'est une CLASSIFICATION de domaine (comme la rareté), PAS un énoncé
   d'honnêteté : elle se rend donc en chip coloré PROPRE, et l'énoncé
   d'honnêteté (D'OÙ vient la valeur) l'accompagne en Badge de provenance
   (badge(), axe provenance). Provenance : les creeps portent `dispositionProv`
   "official" (creeps.bin) — un fait client byte-prouvé → badge « officiel » ;
   une disposition heuristique (jointure de nom/famille) → badge « inféré ».
   `monsters.disposition` est une CHAÎNE, `creeps.disposition` un OBJET {value}
   ( §5.2) : normalisés à la lecture par data.js
   (normDisposition/dispositionFor), on reçoit ici la chaîne normalisée. Repli
   honnête : disposition inconnue -> rien (jamais un « peaceful » inventé). */
const DISPOSITION_KNOWN = new Set(['peaceful', 'neutral', 'hostile']);
function dispositionChip(disp, prov = 'official') {
  if (!disp) return '';
  const variant = DISPOSITION_KNOWN.has(disp) ? disp : 'other';
  const label = tbl('disposition', disp) || capitalize(disp);
  const tip = tbl('disposition', disp + 'Tip') || tbl('disposition', 'otherTip') || '';
  const chip = `<span class="disposition-badge disposition-badge--${variant}" title="${esc(tip)}">${esc(label)}</span>`;
  const provBadge = prov ? badge({ axis: 'provenance', value: prov }) : '';
  return `<span class="disposition-row">${chip}${provBadge}</span>`;
}
/* Chaîne de disposition normalisée d'un enregistrement creep (creeps.bin —
   déjà une chaîne aujourd'hui, mais objet {value} toléré par robustesse, même
   contrat que data.js normDisposition). */
function creepDisp(c) {
  const d = c && c.disposition;
  if (typeof d === 'string') return d;
  if (d && typeof d === 'object') return d.value || null;
  return null;
}
/* Disposition HONNÊTE d'une espèce de faune (openWildlifeFiche) : creeps.bin
   porte la disposition (fait client officiel) mais la jointure wildlife→creep
   n'est PAS 1:1. On collecte les creeps candidats par (a) clé directe = l'id
   d'espèce, (b) famille RÉELLE partagée (jamais family=null → jointure vide
   ambiguë), (c) clés de mob (key/species) des camps de l'espèce
   (camp_details). On ne renvoie une disposition que si TOUS les candidats
   s'accordent (sinon rien : jamais trancher/inventer une disposition douteuse).
   8/25 espèces résolvent proprement ; les 17 autres n'affichent HONNÊTEMENT
   aucun badge plutôt qu'un « peaceful » deviné. */
function wildlifeDisposition(id, w) {
  const vals = new Set();
  const addKey = k => { const c = creepFor(k); if (c) { const d = creepDisp(c); if (d) vals.add(d); } };
  addKey(id);
  const fam = w && w.family;
  if (fam) for (const c of Object.values(S.creeps || {})) if (c.family === fam) { const d = creepDisp(c); if (d) vals.add(d); }
  for (const cmp of (w && w.camps) || []) {
    const det = S.campDetails[cmp.camp];
    for (const m of (det && det.mobs) || []) { addKey(m.key); addKey(m.species); }
  }
  return vals.size === 1 ? [...vals][0] : null;
}
/* Ligne muette « niv <min>–<max> ×N · <attaque> » d'une ligne de faune de
   camp (camp_details `mobs[]`, folded PAR ESPÈCE — task #80) : `lvl`/`lvlMax`
   sont la fourchette de niveau RÉELLE de cette espèce dans CE camp précis
   (identiques quand l'espèce n'y a qu'un seul niveau — pas de "–" inventé),
   `count` = le nombre de clés brutes/cosmétiques repliées dans cette ligne
   (voir  camps.json "One mobs[] row per species", omis quand
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

/* ── Qualificatifs de membre de roster (E′c-4b) ──────────────────────────────
   camp_details `mobs[].qualifiers[]` (boss / undead / buffed / event / arena /
   affix — désormais CUIT par le client, ce commentaire notait auparavant une
   absence côté données maintenant comblée) : des marqueurs de VARIANTE
   DESCRIPTIFS par membre, PAS un énoncé d'honnêteté (provenance/précision). Ils
   se rendent donc en petit chip PROPRE (.roster-qual), visuellement distinct de
   la famille .badge du vocabulaire d'honnêteté ET de .disposition-badge : lire
   « Boss / Mort-vivant / Événement » ne doit jamais se lire comme une
   revendication de provenance. Ordre de rendu FIXE (déterministe, indépendant
   de l'ordre où le pipeline les a cuits ; jamais une mutation de m.qualifiers).
   `mobs[].campSpawnUnlikely` (aucun dans les bins expédiés aujourd'hui —
   lecteur DORMANT écrit contre le contrat) : ce membre est INVOQUÉ par capacité,
   jamais placé dans le camp → note « invocation », jamais un « ×N » de camp. */
const ROSTER_QUAL_ORDER = ['boss', 'arena', 'event', 'undead', 'buffed', 'affix'];
function rosterQualRank(q) { const i = ROSTER_QUAL_ORDER.indexOf(q); return i < 0 ? 99 : i; }
function rosterQualChip(q) {
  const label = tbl('rosterQual', q) || capitalize(q);
  const tip = tbl('rosterQual', q + 'Tip') || '';
  const mod = q === 'boss' ? ' roster-qual--boss' : '';
  return `<span class="roster-qual${mod}" title="${esc(tip)}">${esc(label)}</span>`;
}
function rosterQualChips(m) {
  const qs = (m.qualifiers || []).slice().sort((a, b) => rosterQualRank(a) - rosterQualRank(b));
  const summon = m.campSpawnUnlikely
    ? `<span class="roster-qual roster-qual--summon" title="${esc(tbl('rosterQual', 'summonTip') || '')}">${esc(tbl('rosterQual', 'summon') || 'Summon')}</span>` : '';
  const chips = qs.map(rosterQualChip).join('') + summon;
  return chips ? `<span class="roster-quals">${chips}</span>` : '';
}

/* ── RosterRow (blueprint §3.3) ──────────────────────────────────────────────
   Une ligne de roster de camp : la référence ESPÈCE `[Espèce(●)] Nom` (la
   pastille bascule les spawns de cette espèce, comme partout — remplace l'ancien
   `.link` mobLabelHtml, kill-list §3.5) + les chips de qualificatif DESCRIPTIFS
   (rosterQualChips, à côté de la réf, jamais du texte d'honnêteté) + la ligne de
   niveau muette (« lvl 3–20 ×15 · Melee »). `monsterKeyFor(m.key, m.name, m.lvl)`
   résout la variante d'espèce la plus proche du niveau de CE camp (indice
   `m.lvl`, task #80) ; un creep sauvage (m.wild, clé hors S.monsters) dégrade en
   libellé teinté nu (honnête, aucune fiche monstre). `m.species` alimente la
   couche même sans clé de spawn résolue. Un membre sans qualificatif rend une
   ligne IDENTIQUE à l'ancienne (rosterQualChips='' → aucun artefact vide). */
function rosterRow(m) {
  const mk = monsterKeyFor(m.key, m.name, m.lvl);
  const icon = m.icon ? `icons/${esc(m.icon)}` : null;
  const line = campMobLevelLine(m);
  return `<div class="frow">
    ${iconTag(icon, 'fr-icon', initials(m.name))}
    ${speciesRef({ key: mk, spId: m.species, name: m.name })}${rosterQualChips(m)}
    ${line ? `<span class="muted">${esc(line)}</span>` : ''}
  </div>`;
}
/* Point le plus dense parmi les camps « monster-ish » de la carte active — le
   dénominateur HONNÊTE de la DensityBar (une échelle relative à la carte
   affichée, jamais un maximum inventé). Recalculé à chaque ouverture (quelques
   centaines de groupes, négligeable) pour rester juste après un changement de
   carte. */
function campMaxMonsterishPts() {
  let max = 0;
  for (const st of Object.values(S.camps || {})) for (const gg of (st.groups || []))
    if (MONSTER_ISH_CAMP_KINDS.has(gg.kind) && gg.pts.length > max) max = gg.pts.length;
  return max;
}
/* DensityBar (blueprint §3.3) : la densité de spawn depuis le nuage de points
   COMPLET du camp (g.pts — jamais positions[0], contrat SCHEMA §0.4/§3.4). Le
   NOMBRE affiché est réel (g.pts.length) ; la barre n'est qu'une visualisation
   RELATIVE au camp le plus dense de la carte active (provenance derived,
   info-bulle honnête). */
function campDensityBar(g) {
  const n = g.pts.length;
  if (!n) return '';
  const max = campMaxMonsterishPts();
  const pct = max > 0 ? Math.max(3, Math.round(n / max * 100)) : 0;
  return `<div class="density-row">
    <span class="density-label">${esc(tr('spawnDensityLabel'))}${badge({ axis: 'provenance', value: 'derived', extra: tr('spawnDensityNote') })}</span>
    <div class="density-bar" role="img" aria-label="${esc(tr('spawnPointsCount', n))}"><span class="density-fill" style="width:${pct}%"></span></div>
    <span class="muted density-count">${esc(tr('spawnPointsCount', n))}</span>
  </div>`;
}
/* Le Badge « roster serveur » (valeur roster-server-side, blueprint §5.2) —
   JAMAIS silencieux quand un roster existe (camp_details `roster`
   {state,count,pts,speciesToken}) :
     - state "server"     : le roster exact est décidé serveur (aucune liste de
       membres) — badge + compte du vivier quand connu (>0).
     - state "candidates" : les membres LISTÉS ci-dessus sont des candidats
       inférés (jointure de jeton de famille) ; le serveur tranche le vrai
       roster — badge + note « candidats ».
   La distinction vit dans l'info-bulle (`extra`), l'étiquette reste le résumé
   fermé « roster serveur » (aucune prose d'honnêteté hors du vocabulaire clos). */
function campRosterBadge(det) {
  const r = det && det.roster;
  if (!r || !r.state) return '';
  const extra = r.state === 'candidates'
    ? tr('campRosterCandidatesNote')
    : (r.count > 0 ? tr('campRosterServerCountNote', r.count) : tr('campRosterServerNote'));
  return `<p class="hint">${badge({ axis: 'value', value: 'roster-server-side', extra })}</p>`;
}
/* Co-spawn PROBABLE (blueprint §1.2/§5.2) : camp_details `cospawnProbable`
   [{family, confidence:"probable"}] — une famille ASSOCIÉE par type, jamais
   affirmée aux côtés de la famille placée. Chaque entrée = réf `[Famille(●)]`
   (pastille = couche famille de l'arbre quand elle a des points) + le Badge
   valeur `cospawn-probable` (« associé par type — probable, pas garanti »).
   Famille sans membre catalogue -> libellé nu + badge (jamais un lien mort). */
function campCospawnSection(det) {
  const cs = det && det.cospawnProbable;
  if (!cs || !cs.length) return '';
  const rows = cs.map(c => {
    const fam = familyKey(c.family);
    const has = familyHasMembers(fam);
    const res = has ? familyPoints(fam) : null;
    const famRef = has
      ? ref({ kind: 'family', key: fam, family: fam, label: pretty(c.family), hex: familyLayerHex(fam),
              hasFiche: true, drawable: !!res, count: res ? res.nPts : 0, drawn: !!(S.monfam[fam] && S.monfam[fam].on) })
      : `<span class="fr-label">${esc(pretty(c.family))}</span>`;
    return `<div class="frow">${famRef}${badge({ axis: 'value', value: 'cospawn-probable' })}</div>`;
  }).join('');
  return `<div class="fiche-section"><h3>${esc(tr('cospawnTitle'))}</h3>${rows}</div>`;
}

/* ── Contexte de camp : région + bande de niveau (E′c-4b) ────────────────────
   camp_details expédie au niveau CAMP :
   - `zones[]` (régions localisées que le nuage de spawn du camp recouvre —
     attribution point-en-polygone) + `dominantZone` (la région principale, déjà
     localisée). Provenance DERIVED (géométrie). dominantZone se rend en TEXTE
     localisé NU aujourd'hui — la fiche région n'existe pas encore (vague E′c-R),
     prête à devenir une réf `[Région]` alors.
   - `tierBand{bands{low?,base?,high?,highest?}, elite?}` : les fourchettes de
     niveau (issues du nommage des tables de butin — un fait client) que ce camp
     couvre + drapeau élite. Provenance OFFICIAL. Rendu en une ligne « bande de
     niveau » compacte : fourchettes ordonnées PAR NIVEAU puis dédupliquées
     (« 16-20 » + « 16-20 » ne s'affiche qu'une fois), jamais les jetons internes
     low/base/high/highest à l'écran. */
const CAMP_BAND_ORDER = ['low', 'base', 'high', 'highest'];
function campTierBandRow(det) {
  const tb = det && det.tierBand;
  const bands = tb && tb.bands;
  if (!bands) return '';
  const seen = new Set();
  const ranges = [];
  const push = r => { if (r && !seen.has(r)) { seen.add(r); ranges.push(r); } };
  for (const k of CAMP_BAND_ORDER) push(bands[k]);
  for (const k of Object.keys(bands)) if (!CAMP_BAND_ORDER.includes(k)) push(bands[k]);
  if (!ranges.length) return '';
  const disp = ranges.map(r => esc(String(r).replace('-', '–'))).join(' · ');
  const elite = tb.elite
    ? `<span class="tierband-elite" title="${esc(tr('tierBandEliteTip'))}">${esc(tr('tierBandElite'))}</span>` : '';
  return `<div class="tierband-row">
    <span class="tierband-label">${esc(tr('levelBandLabel'))}</span>
    <span class="tierband-vals">${disp}</span>${elite}
    ${badge({ axis: 'provenance', value: 'official', extra: tr('levelBandNote') })}
  </div>`;
}
function campRegionRow(det) {
  const dom = det && det.dominantZone;
  const zones = (det && det.zones) || [];
  if (!dom && !zones.length) return '';
  // E'c-R : dominantZone/zones — cuites en TEXTE localisé NU par E′c-4b, prêtes à
  // devenir des réfs — sont désormais des `[Région(●)]` (regionRef) : nom
  // souligné → openRegionFiche, pastille → contour du polygone. Les 217 camps à
  // région pointent tous vers une région cataloguée (nom résolu, jamais un lien
  // mort). La provenance DERIVED (attribution point-en-polygone) reste badgée.
  const domHtml = dom ? regionRef(dom) : '';
  // Liste COMPLÈTE des AUTRES régions couvertes (la dominante est déjà mise en
  // avant ci-dessus — jamais répétée), chacune une réf `[Région(●)]`. Le gabarit
  // i18n campRegionAlsoIn reçoit du HTML de réfs (concaténé), pas du texte échappé.
  const others = zones.filter(z => z !== dom);
  const othersHtml = others.length
    ? `<span class="camp-region-others">${tr('campRegionAlsoIn', others.map(z => regionRef(z)).join(''))}</span>` : '';
  return `<div class="camp-region-row">
    <span class="camp-region-label">${esc(tr('campRegionLabel'))}</span>
    ${domHtml}${othersHtml}
    ${badge({ axis: 'provenance', value: 'derived', extra: tr('campRegionNote') })}
  </div>`;
}
/* Section CONTEXTE (région + bande de niveau) — vide (aucun octet) quand
   camp_details ne porte ni zones ni tierBand : une fiche camp sans ce contexte
   reste octet-pour-octet identique (insérée adjacente à presenceHtml). */
function campContextSection(det) {
  const region = campRegionRow(det);
  const tier = campTierBandRow(det);
  if (!region && !tier) return '';
  return `<div class="fiche-section camp-context">${region}${tier}</div>`;
}

function openCampFiche(key) {
  const det = S.campDetails[key] || null;
  const g = Object.values(S.camps).flatMap(st => st.groups).find(c => c.k === key);
  if (!g) return;
  S.openFiche = { kind: 'camp', id: key };
  // Nom EXPÉDIÉ (g.name) + SOUS-TYPE CUIT (g.subtype, ontology chunk 2) via
  // campLabel — le formateur unique lit les champs de classification du
  // record (plus aucune regex de re-détection, voir config.js). Le chip
  // qualificatif (patrol/buffed) s'ajoute au TITRE (h2 ci-dessous), jamais
  // fusionné dans `name` (name sert aussi de data-label de goto, texte brut).
  const name = campLabel(key, g.kind, g.name, g.subtype);
  const qualChip = campQualifierChip(g.qualifier);
  // ROSTER (blueprint §1.2) : lignes RosterRow (réf ESPÈCE + niveau) + Badge
  // « roster serveur » (JAMAIS silencieux quand un roster existe) + DensityBar
  // (nuage COMPLET, jamais positions[0]). Un camp "monster-ish" dont AUCUNE
  // espèce n'a été résolue (les points de spawn ne portent aucune référence
  // d'entité côté client,  "camp fauna") garde une note honnête
  // (roster décidé serveur) plutôt qu'un silence qui se lit « pas de monstres
  // ici ». Un camp de ressource (logging/mining/…) sans faune n'a simplement
  // pas de section (pas un trou de donnée).
  const rosterRowsHtml = (det?.mobs || []).map(rosterRow).join('');
  const rosterBadgeHtml = campRosterBadge(det);
  const densityHtml = MONSTER_ISH_CAMP_KINDS.has(g.kind) ? campDensityBar(g) : '';
  const rosterSection = (rosterRowsHtml || rosterBadgeHtml || MONSTER_ISH_CAMP_KINDS.has(g.kind))
    ? `<div class="fiche-section"><h3>${esc(tr('likelyMonsters', det?.mobs?.length || 0))}</h3>
        ${rosterRowsHtml || (rosterBadgeHtml ? '' : `<p class="hint">${badge({ axis: 'value', value: 'roster-server-side', extra: tr('campFaunaUnknownNote') })}</p>`)}
        ${rosterBadgeHtml}
        ${densityHtml}</div>`
    : '';
  const cospawnHtml = campCospawnSection(det);
  // Butin : seulement quand la fiche détaillée a de la SUBSTANCE (mobs ou
  // drops). camp_details expédie désormais ~150 entrées mode/activité-SEULES
  // (mobs/drops vides — #93, pipeline pass 2026-07-11b) : leur coller une
  // section « Butin » vide («aucun butin catalogué») à chacune serait du
  // bruit, pas de l'honnêteté — l'ancien comportement (pas de section quand
  // det était null pour ces camps) est conservé à l'identique.
  const drops = (det && (det.mobs?.length || det.drops?.length))
    ? `<div class="fiche-section"><h3>${esc(tr('lootBestRates'))}</h3>${lootRowsHtml(det.drops, 'noLootCatalogued')}</div>` : '';
  // Table de butin PROBABLE : champ CUIT `probableLoot` du record (ontology
  // chunk 2 — association « par correspondance exacte de type » faite côté
  // pipeline, le client n'a toujours PAS de lien prop→table ; la mention
  // honnête probableLootNote reste). L'ancienne table front
  // CAMP_LOOT_TABLE_RULES est supprimée (config.js).
  const tableName = g.probableLoot || null;
  const tableRows = tableName ? lootTableItems(tableName) : null;
  const tableHtml = tableRows ? `<div class="fiche-section"><h3>${esc(tr('probableLootTitle'))}</h3>
    <p class="hint">${esc(tr('probableLootNote', tableName))}</p>
    ${lootRowsHtml(tableRows, 'noLootCatalogued')}</div>` : '';
  // #93 — activité + présence par mode (camp_details `activity`/`modes`,
  // voir campPresenceHtml ci-dessous) : formulation SOFT, jamais un timer.
  const presenceHtml = campPresenceHtml(det);
  // EN-TÊTE PARTAGÉ : titre coloré (teinte du kind de camp) + pastille LOCATE
  // (mode L, Q7) sur le point REPRÉSENTATIF du camp (g.pts[0]) quand il a des
  // points — bascule un pin persistant listé dans la légende (remplace
  // l'ex-surlignage transitoire campRef self:true, kill-list §7.2, folded ici).
  // E'c-3 : l'ex-bouton « Voir sur la carte » (goto) séparé est RETIRÉ — la
  // pastille de l'en-tête EST le locate, jamais l'en-tête + un bouton position
  // redondant sur le même point (forme verbeuse abandonnée, intention owner).
  const campDot = g.pts.length
    ? { kind: 'camp', mode: 'L', key, label: name, hex: CAMP_COLORS[g.kind] || '#999',
        drawable: true, pos: { x: g.pts[0][0], z: g.pts[0][1] } }
    : null;
  openFiche(`
    ${ficheHeader({
      name, hex: CAMP_COLORS[g.kind] || '#999', dot: campDot, nameSuffix: qualChip,
      sub: `${esc(tr('campLabel'))} · ${esc(campKindLabel(g.kind))}`,
      below: `<span class="pop-coords">${esc(tr('spawnPointsCount', g.pts.length))}</span>`,
    })}
    ${campContextSection(det)}${presenceHtml}
    ${rosterSection}
    ${cospawnHtml}
    ${drops}
    ${tableHtml}`);
  setFicheHash('camp', key);
}

/* ── #93 : activité + table de présence par mode (camp fiche) ────────────
   camp_details.bin expédie (pipeline pass 2026-07-11b) :
   - `activity` (0–0.95, présent SEULEMENT quand < 1.0) : poids du registre
     d'apparitions serveur — unité exacte inconnue (absence = toujours actif
     ou registre absent, jamais distinguable) → ligne douce « Activité :
     ~N % » en Badge affirmative (provenance official : c'est un FAIT serveur
     byte-prouvé, pas une incertitude) + tooltip honnête. JAMAIS présenté
     comme un taux de spawn/timer.
   - `modes` (îles d'Extraction seulement) : poids d'activation par mode de
     jeu (PvE/PvP/SoloPvE/SoloPvP/SoloPvP_HC, `<mode>@N` = palier de danger
     N). Table compacte, poids affiché en % (les 4 mobs rares de quête
     — war-bear/hunger-wolf/death-raven/plague-frogs — lisent ainsi leur
     4 % sur leur ligne, paliers 10–12). Un poids 0 s'affiche « 0 % »
     honnêtement (camp de base ABSENT du PvP, byte-prouvé — c'est LA
     sémantique camp/patrol/buffed, jamais masquée).
   Entrées mode/activité-SEULES (~150, mobs/drops vides) : cette section est
   alors tout ce que la fiche détaillée apporte — le reste de la fiche
   (points, goto) vient du groupe de camp comme avant. */
const CAMP_MODE_ORDER = ['PvE', 'SoloPvE', 'PvP', 'SoloPvP', 'SoloPvP_HC'];
function campModeSort(a, b) {
  const [baseA, tierA] = a.split('@'), [baseB, tierB] = b.split('@');
  const ia = CAMP_MODE_ORDER.indexOf(baseA), ib = CAMP_MODE_ORDER.indexOf(baseB);
  if (ia !== ib) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  return (+tierA || 0) - (+tierB || 0);
}
function campWeightPct(w) {
  const pct = w * 100;
  return pct.toLocaleString(numberLocale(), { maximumFractionDigits: pct > 0 && pct < 10 ? 1 : 0 }) + ' %';
}
function campPresenceHtml(det) {
  if (!det) return '';
  const hasActivity = det.activity != null && det.activity < 1;
  const modes = det.modes ? Object.keys(det.modes).sort(campModeSort) : [];
  if (!hasActivity && !modes.length) return '';
  const activityLine = hasActivity
    ? `<p class="camp-activity">${badge({ axis: 'provenance', value: 'official', text: tr('campActivityLine', Math.round(det.activity * 100)), extra: tr('campActivityTitle') })}</p>` : '';
  const modeRows = modes.map(mk => {
    const [base, tier] = mk.split('@');
    const label = tier ? tr('campModeTier', campModeLabel(base), tier) : campModeLabel(base);
    return `<div class="frow"><span class="fr-label">${esc(label)}</span><span class="muted">${esc(campWeightPct(det.modes[mk]))}</span></div>`;
  }).join('');
  const modesBlock = modes.length
    ? `<p class="hint">${esc(tr('campModesHint'))}</p>${modeRows}` : '';
  return `<div class="fiche-section">${modes.length ? `<h3>${esc(tr('campModesTitle'))}</h3>` : ''}${activityLine}${modesBlock}</div>`;
}

/* Section « Où les trouver » d'une fiche de faune (openWildlifeFiche) — la
   LOCALISATION HONNÊTE d'une espèce, demande owner « montre la ZONE plutôt que
   RIEN » :
   - espèce liée à ≥1 camp sur la carte active (`spRes` non nul : turkey/rabbit/
     fox/squirrel/porcupine) : la pastille ESPÈCE de l'en-tête EST déjà
     l'affordance « afficher les spawns » (couche espèce = union de ses camps) —
     JAMAIS un second toggle de la même couche (kill-list §7.2), juste un compte
     honnête + renvoi à la pastille du titre.
   - espèce SANS aucun camp (tortues/vache/poule/… — 19/25, `camps:[]` byte-
     prouvé) : AUCUNE position précise par espèce n'existe côté client ; sa seule
     localisation connue est le pool générique « Animaux paisibles » (couche
     camp:wildlife, ~5 900 points, roster attribué serveur). On l'offre en
     toggle qui RÉUTILISE cette MÊME couche (celle de World, jamais reconstruite)
     via une référence mode C (fkey `camp:wildlife`) : le clic route par la
     délégation existante (main.js → activateCategoryNode), l'état se
     resynchronise par syncEntityRefDots. HONNÊTE : « apparaît PARMI les animaux
     paisibles », jamais « ce point précis EST une tortue ». Gardé sur
     l'existence réelle de points sur la carte active (jamais un toggle mort). */
function wildlifeWhereHtml(id, spRes) {
  if (spRes) {
    return `<div class="fiche-section"><h3>${esc(tr('wildlifeWhereTitle'))}</h3>
      <p class="hint">${esc(tr('wildlifeCampedNote', spRes.nCamps, spRes.nPts.toLocaleString(numberLocale())))}</p></div>`;
  }
  const rest = S.camps.wildlife ? kindRestPoints('wildlife') : { nCamps: 0, nPts: 0 };
  const affordance = rest.nPts
    // Même patron que containersSectionHtml : libellé de couche (nom + teinte
    // wildlife) + référence-toggle NUE (tag + pastille, sans libellé propre —
    // le nom vit dans le span à côté). Réf mode C non-dessinable-en-fiche :
    // pas de page (couche), la pastille dessine.
    ? `<div class="farm-group-head">
        <span class="farm-group-label" style="color:${CAMP_COLORS.wildlife}">${esc(tr('wildlifeRestRow'))}</span>
        ${ref({ kind: 'wildlife', mode: 'C', fkey: 'camp:wildlife', hex: CAMP_COLORS.wildlife, drawn: !!S.camps.wildlife?.on, count: rest.nPts })}
      </div>`
    : `<p class="hint">${badge({ axis: 'precision', value: 'unlocated', extra: tr('wildlifeNoZonesNote') })}</p>`;
  return `<div class="fiche-section"><h3>${esc(tr('wildlifeWhereTitle'))}</h3>
    <p class="hint">${esc(tr('wildlifePeacefulNote'))}</p>
    ${affordance}</div>`;
}

/* Fiche « espèce de faune » (wildlife_species.bin, S.wildlifeSpecies — 25
   espèces catalogue SANS record species.bin,  #11) : une VRAIE page
   pour un animal (nom + famille + méthode de dépeçage + son BUTIN), qui
   n'existait pas — un clic sur « Green Turtle » (recherche/arbre Creeps)
   n'ouvrait RIEN (activateSpeciesLayer seul, sans points pour les 0-camp).
   Corps :
   - EN-TÊTE PARTAGÉ : titre coloré (teinte d'identité speciesLayerHex, stable
     ×sessions/cartes, la même que la couche/l'arbre) + pastille ESPÈCE (mode E)
     UNIQUEMENT quand l'espèce a des points sur la carte active (règle owner
     2026-07-12) — bascule la couche espèce (token moteur partagé S.monsp[id],
     ref-draw `species` → toggleSpecies(id)). Sous-titre : « Faune » + famille
     prettifiée (si distincte du nom, même garde que openMonsterFiche).
   - variantes de nom (namesAll — goose/cockerel/manta… : plusieurs skins sous
     une espèce) : ligne muette honnête, jamais un faux « ×N ».
   - « Où les trouver » (wildlifeWhereHtml) : la localisation HONNÊTE — pastille
     de l'en-tête pour les espèces campées, pool « Animaux paisibles » pour les
     0-camp (Request 2).
   - Butin de dépeçage (w.loot — `lootShared` = table partagée de la famille
     turtle) : même rendu lootRowsHtml que monstre/camp/coffre, la méthode
     (harvestMethod) dans le titre.
   Lien profond `wsp=<id>` (setFicheHash 'wildlife') : partageable + Précédent/
   Suivant (restauré par router.js, différé comme monstre/camp). */
function openWildlifeFiche(id) {
  const w = S.wildlifeSpecies?.[id];
  if (!w) return;
  S.openFiche = { kind: 'wildlife', id };
  const hex = speciesLayerHex(id);
  const spRes = speciesPoints(id);   // non nul ⇔ espèce liée à ≥1 camp (carte active)
  const famBit = (w.family && fold(pretty(w.family)) !== fold(w.name)) ? pretty(w.family) : null;
  const kindLine = [tr('wildlifeFicheKind'), famBit].filter(Boolean).join(' · ');
  const speciesDot = spRes
    ? { kind: 'species', key: id, label: w.name, hex, hasFiche: false,
        drawable: true, count: spRes.nPts, drawn: !!S.monsp[id]?.on }
    : null;
  // DispositionBadge : la posture de l'animal (peaceful/neutral) résolue depuis
  // creeps.bin (fait client officiel) par jointure honnête (voir
  // wildlifeDisposition) — 8/25 espèces résolvent proprement, les autres
  // n'affichent AUCUN badge (jamais un « peaceful » deviné).
  const dispHtml = dispositionChip(wildlifeDisposition(id, w), 'official');
  const variants = (w.namesAll || []).filter(nm => fold(nm) !== fold(w.name));
  const variantsHtml = variants.length
    ? `<p class="hint">${esc(tr('wildlifeVariants', variants.join(' · ')))}</p>` : '';
  const lootHtml = `<div class="fiche-section"><h3>${esc(tr('lootBestRates'))}${w.harvestMethod ? ' · ' + esc(harvestMethodLabel(w.harvestMethod)) : ''}</h3>${lootRowsHtml(w.loot, 'noLootCatalogued')}</div>`;
  openFiche(`
    ${ficheHeader({ name: w.name, hex, dot: speciesDot, sub: esc(kindLine), below: dispHtml })}
    ${variantsHtml}
    ${wildlifeWhereHtml(id, spRes)}
    ${lootHtml}`);
  setFicheHash('wildlife', id);
}

/* Statistiques de monstre — voir  "Monster stats". Seule une
   poignée de groupes (m.stats/m.statsSource === "record", ex. le troll boss
   mbt_10_troll_rusty_boss) a un relevé client réel ; la quasi-totalité des
   autres n'ont AUCUNE stat par-monstre fiable côté client (statsSource null
   OU "partial" — un ou deux codes épars, jamais un bloc complet, voir
   ) : le client ne nomme jamais quel tier de difficulté un mob
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

/* Fourchette de stats PAR PALIER (fiches.js) — voir  "Monster
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
   ( finding #2) : "elit"/"boss" n'ont JAMAIS été vérifiées contre
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
    "m_abs_* fixed-stat sibling records") : jamais montré comme
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
/* Réduction de dégâts (0..1) -> pourcentage localisé (« 16 % »). */
function fmtMitigation(frac) {
  return frac.toLocaleString(numberLocale(), { style: 'percent', maximumFractionDigits: 0 });
}
function perTierStatsSection(level, sf, fixedReading) {
  const tiers = PER_TIER_ORDER.filter(t => sf.tiers[t]);
  if (!tiers.length) return '';
  const hasUnverified = tiers.some(t => _UNVERIFIED_TIERS.has(t));
  const computed = Object.fromEntries(tiers.map(t => [t, computeTierStats(t, level, sf)]));
  const head = `<tr><th scope="col"></th>${tiers.map(t => `<th scope="col">${esc(statTierLabel(t))}${_UNVERIFIED_TIERS.has(t) ? `<span class="tier-caveat-mark" title="${esc(tr('statsBossEliteCaveat'))}">*</span>` : ''}</th>`).join('')}</tr>`;
  const body = PER_TIER_STATS.map(s =>
    `<tr><th scope="row">${esc(statLabel(s))}</th>${tiers.map(t => `<td>${esc(fmtStatNum(computed[t][s]))}</td>`).join('')}</tr>`).join('');
  // MitigationCurve (blueprint §3.3) : la réduction de dégâts DÉRIVÉE de
  // l'armure de chaque palier via la courbe UNIQUE du client (il_formulas
  // `mitigationK` = 100, publiée dans site_meta.json) — mitigation =
  // armure / (armure + K), la fraction de dégâts entrants absorbée. Une COURBE
  // across les 5 paliers, dans le même tableau (l'armure ≈ la résistance
  // magique dans la formule -> « une seule courbe générique pour les deux »).
  // Provenance derived (déjà portée par l'en-tête « Stats »). K absent
  // (site_meta non chargé, panne réseau) -> pas de ligne (jamais un chiffre
  // fabriqué). Non appliquée aux bosses/relevés propres : eux gardent leurs
  // vraies stats intactes (statsBossDifficulty/record_own), aucune armure de
  // formule à réduire.
  const K = S.meta?.ilFormulas?.mitigationK;
  const mitigRow = K != null
    ? `<tr class="ptr-mitig"><th scope="row">${esc(tr('mitigationRowLabel'))}</th>${tiers.map(t => {
        const a = computed[t].armor;
        const mit = a > 0 ? a / (a + K) : 0;
        return `<td>${esc(fmtMitigation(mit))}</td>`;
      }).join('')}</tr>`
    : '';
  return `<div class="fiche-section"><h3>${esc(tr('statsTitle'))}${badge({ axis: 'provenance', value: 'derived', text: tr('levelAbbrev', level) })}</h3>
    <div class="ptr-wrap"><table class="ptr-table"><thead>${head}</thead><tbody>${body}${mitigRow}</tbody></table></div>
    <p class="hint">${esc(tr('statsPerTierNote'))}</p>
    ${K != null ? `<p class="hint">${esc(tr('mitigationNote'))}</p>` : ''}
    ${hasUnverified ? `<p class="hint">${esc(tr('statsBossEliteCaveat'))}</p>` : ''}
    ${statsFixedProvenanceHtml(fixedReading)}</div>`;
}
/* Bloc statistiques de fiche monstre — bascule EXPLICITE sur
   `m.statsProvenance` (task #80, mandatory honest display enum, voir
    "Monster stats") plutôt que de déduire l'état à partir de
   `statsSource`/`level`/présence de champs comme avant cette passe :
     - record_own    -> Badge provenance official (un relevé client PROPRE à
                        CE mob : mbt_10_troll_rusty_boss + les bosses
                        d'arène nommés récupérés via m_abs_*).
     - record_fixed_sibling -> Badge provenance official + qualificateur
                        « relevé fixe » (badge() axe provenance, blueprint
                        §5.1) : les nombres
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
    return `<div class="fiche-section"><h3>${esc(tr('statsTitle'))}${badge({ axis: 'provenance', value: 'official', extra: tr('realStatsTooltip') })}</h3>${statsGridHtml(m.stats)}</div>`;
  }
  // 1-bis. Mob portant DIRECTEMENT des stats calculées par la formule (palier
  //    résolu côté données — dormant aujourd'hui, aucun mob non-template n'en
  //    a, mais honoré si un décodage futur en publie) : grille + badge
  //    « calculé (formule du jeu) ».
  if (m.statsComputed) {
    return `<div class="fiche-section"><h3>${esc(tr('statsTitle'))}${badge({ axis: 'provenance', value: 'derived', extra: tr('computedStatsBadge') })}</h3>${computedStatsGridHtml(m.statsComputed)}</div>`;
  }
  // 2. record_fixed_sibling : relevé fixe (arène/CBT) — le template m_abs_*
  //    sœur porte un bloc de stats RÉEL, mais partagé et indépendant du
  //    niveau ; état chip dédié, jamais le badge « réel » ci-dessus.
  if (m.statsProvenance === 'record_fixed_sibling' && m.stats && Object.keys(m.stats).length) {
    return `<div class="fiche-section"><h3>${esc(tr('statsTitle'))}${badge({ axis: 'provenance', value: 'official', text: tr('stateFixed'), extra: tr('stateFixedTitle') })}</h3>${statsGridHtml(m.stats)}</div>`;
  }
  // 2-ter. Boss sur-mesure (recalibration 2026-07-12, 3 vraies valeurs de PV
  //    observées en jeu) : la fourchette générique par palier est FAUSSE pour
  //    eux (elle donne le même ~34k à TOUT mob niv20, alors que l'Armored
  //    Troll fait 226 429 et le Young Woodraptor 260 084). Chaque boss porte
  //    son PROPRE PV de base byte-exact (statsBossDifficulty.base_hp — Troll
  //    22 330, Woodraptor 28 718) ; le PV réel = base × un multiplicateur de
  //    difficulté SERVEUR (bande ~9-10× validée au niveau 20 sur les 3
  //    observations). On affiche la base exacte + la bande estimée (au niveau
  //    20 seulement, là où elle est prouvée), jamais un total « réel » figé
  //    qu'on ne connaît pas côté client (honnêteté : le multiplicateur est
  //    serveur, le client ne l'étiquette que par BDL 1-3 / paliers de loot).
  if (m.statsBossDifficulty?.base_hp != null) {
    const bd = m.statsBossDifficulty;
    const band = S.meta?.bossDifficulty?.level20_multiplier_band;
    const liveRow = (band && m.level === 20)
      ? `<div class="frow"><span class="muted">${esc(tr('bossLiveHpLabel'))}</span><b>≈ ${esc(fmtNum(bd.base_hp * band[0]))} – ${esc(fmtNum(bd.base_hp * band[1]))}</b></div>`
      : '';
    return `<div class="fiche-section"><h3>${esc(tr('statsTitle'))}${badge({ axis: 'provenance', value: 'derived', extra: tr('bossHpBadge') })}</h3>
      <div class="frow"><span class="muted">${esc(tr('bossBaseHpLabel'))}</span><b>${esc(fmtNum(bd.base_hp))}</b></div>
      ${liveRow}
      <p class="hint">${esc(tr('bossDifficultyNote'))}</p></div>`;
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
  return `<div class="fiche-section"><h3>${esc(tr('statsTitle'))}${badge({ axis: 'provenance', value: 'derived', text: tierLine })}</h3>
    <p class="hint">${esc(tr('statsServerNote'))}</p></div>`;
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

   L'espèce est un cran plus large que l'ancien axe MODÈLE (retiré : plus
   chargé côté client depuis que l'axe est passé à species.bin, task #80) :
   "Troll"/"Mighty Troll"/"Overweight Troll" étaient 3 modèles DIFFÉRENTS
   (CamelCase-glué, voir  "Known limitation") qu'un sélecteur par
   modèle ne réunissait jamais, alors qu'ils désignent la MÊME créature aux yeux
   du joueur -- la bonne raison de ce changement d'axe (raw cosmetic counts
   polish, task #80).

   speciesVariantSpawns ne fait PAS confiance à species.spawns seul : la source
   de vérité reste TOUJOURS S.monsters
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
  // ( — croisement camps ⨯ régions,
  // hors zone attrape-tout « Restricted Area » qui couvrait 82% de la carte).
  // PRÉSENTATION (priorité owner) : la répartition famille→région est CE que le
  // joueur vient chercher (« où sont les imps ? »). Sortie du sous-titre muet
  // (ex « 📍 4 zones », qui repliait/masquait les noms dès 3 régions) vers une
  // SECTION « Présent dans » dédiée et proéminente. Le jeu localise par
  // FAMILLE+région, jamais par espèce : toutes les espèces d'une famille
  // partagent EXACTEMENT ces mêmes zones — honnête, jamais un lieu par espèce
  // (le per-espèce n'existe pas côté serveur, ne jamais le fabriquer).
  const zones = m.zones || [];
  // Sous-titre SANS répéter le NOM (TASK 1, owner) : le token famille ne s'y
  // affiche plus quand il est identique au nom de l'espèce (« Scolopendra »
  // famille == « Scolopendra » titre → doublon supprimé, il ne reste que
  // « Lvl 20 ») ; une vraie famille distincte (« Rat » pour un « Rat King »)
  // reste, elle n'est pas redondante. Les zones ne vivent plus ici (section
  // « Présent dans » ci-dessous).
  const famBit = (m.family && fold(pretty(m.family)) !== fold(m.name)) ? pretty(m.family) : null;
  const kindBits = [famBit, m.level != null ? tr('levelAbbrev', m.level) : null,
    m.attack ? monsterAttackLabel(m.attack) : null].filter(Boolean);
  // « Présent dans » : une référence [Zone(●)] par région. La PASTILLE dessine
  // CE polygone de région (ref-draw, subrole « monster-zone » → drawNamedZone,
  // main.js — même primitive single-slot que l'ex-bouton « Voir la zone », mais
  // par région et déclenchée au clic sur le nom/la pastille). Dessinable ⇔ la
  // région a un polygone chargé sur la carte active (S.zonesGeo) ; sinon nom nu
  // (honnête : région réelle, simplement pas traçable ici — cross-carte / non
  // décodée). `drawn:false` explicite : tracé one-shot, jamais un toggle
  // persistant (même contrat que la réf goal-zone).
  // E'c-R : le NOM de région devient une réf `[Région(●)]` SOULIGNÉE quand une
  // fiche région existe (regionFicheExists — les 15 régions de spawn en ont
  // toutes une) → ref-open ouvre openRegionFiche (main.js), la pastille
  // (subrole « monster-zone », inchangée) dessine toujours le contour du
  // polygone. Un nom sans fiche cataloguée reste en clair (honnête). C'est le
  // payoff owner : « où sont les imps ? » — chaque région est cliquable.
  const zoneGeoFold = new Set((S.zonesGeo || []).map(z => fold(z.name)));
  const foundInHtml = zones.length
    ? `<div class="fiche-section"><h3>${esc(tr('monsterFoundInTitle'))}</h3><div class="reward-chips">${
      zones.map(zn => ref({ kind: 'zone', subrole: 'monster-zone', key: zn, label: zn, hasFiche: regionFicheExists(zn), drawable: zoneGeoFold.has(fold(zn)), drawn: false })).join('')
    }</div></div>`
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
  // de points). Pastille "unknown" ( #10, task #67)
  // toujours au même endroit quand m.camps est vide -- comportement inchangé.
  // PLACEMENT (manager feedback, task #80/#79) : c'est l'info que le joueur
  // vient chercher en premier depuis une quête ("où farmer ça ?") -- montée
  // tout en haut de la fiche, juste après l'identité/zone/sélecteur de
  // variante et AVANT stats/butin/capacités, y compris quand la réponse est
  // honnêtement "inconnu" (le joueur a sa réponse immédiatement, sans
  // scroller au travers de sections qui ne l'intéressent pas encore).
  const campsHtml = monsterCampsHtml(m);
  // EN-TÊTE PARTAGÉ (TASK 1) : LE toggle d'union espèce est désormais la
  // PASTILLE de l'en-tête (kill-list §7.2 : l'ex-bouton monsterSpawnHighlightBtn/
  // « Afficher · N pts » ET l'ex-ligne speciesToggleRow séparée SUPPRIMÉS — plus
  // de toggle en double). La pastille bascule la couche espèce (l'UNION réelle
  // de tous les camps de la créature = ce que la case espèce de l'arbre allume ;
  // ref-draw `species` résout key→species) ; teinte PRÉCISE (speciesLayerHex,
  // Q6, la même que le titre). RÈGLE OWNER 2026-07-12 : la pastille n'apparaît
  // QUE quand l'espèce a réellement des points sur la carte active
  // (`drawable: !!spUnionRes`) — un monstre errant sans camp fixe (Scolopendra,
  // `camps:[]`, 0 point ici) rend un titre coloré SANS pastille, honnête « rien
  // à tracer ici » (le ⊘ est abandonné pour ces affordances : une pastille qui
  // ne bascule rien est inutile). Reste synchronisée depuis n'importe quelle
  // surface via syncEntityRefDots (§5.3).
  const spUnionRes = speciesPoints(spId);
  const speciesDot = {
    kind: 'species', key, label: species?.name || m.name,
    hex: speciesLayerHex(spId), hasFiche: false,
    drawable: !!spUnionRes, count: spUnionRes ? spUnionRes.nPts : 0, drawn: !!S.monsp[spId]?.on,
  };
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
  // task 1/4): baked at build time ((),
  // inverting build_catalog()'s own item->quest quest_source_of index) --
  // ONLY resolver-produced "kill" links, never name-inferred, so this
  // section simply doesn't exist for a monster with no such link (never an
  // empty fabricated block). Both the item name (already disambiguated,
  // e.g. "Imp Brain (Executioner)") and the quest name are pre-localized,
  // no client-side lookup/race involved -- S.items is only consulted here
  // for the icon/clickability of the item chip (eager/critical bundle, safe).
  // EntityRef (vague 2) : `[Item]` (objet lâché) + `[Quête]` (la quête qui le
  // demande) — le tag [Quête] remplace le badge k-chip détaché ; souligné ⇔
  // résout au catalogue.
  const questDropsHtml = m.questDrops?.length
    ? `<div class="fiche-section"><h3>${esc(tr('monsterQuestItemsTitle'))}</h3>${m.questDrops.map(d => {
        const dit = S.items[d.item_key];
        const dicon = dit?.icon ? `icons/${dit.icon}` : null;
        const itemKind = dit && isRecipeKind(dit) ? 'recipe' : (dit?.kind === 'quest_item' ? 'quest_item' : 'item');
        const itemRefHtml = ref({ kind: itemKind, key: d.item_key, label: d.item_name, hex: dit && itemKind !== 'quest_item' ? itemEcHex(dit) : null, hasFiche: !!dit });
        // complaint 2 : `[Quête(●)]` — la pastille locate épingle le donneur de
        // la quête (questRef, forme partagée) ; label de repli d.quest_name.
        const questRefHtml = questRef(d.quest_slug, { label: d.quest_name });
        return `<div class="frow">
          ${iconTag(dicon, 'fr-icon', itemGlyph(dit))}
          ${itemRefHtml}
          ${questRefHtml}
        </div>`;
      }).join('')}</div>` : '';

  // EntityRef (E'c-3, kill-list §3.5) : l'ex-`.k-chip` de slot + `.fr-label` nu
  // deviennent UNE référence `[Capacité] Nom` — le slot (Q/W/E/R/MA) passe en
  // suffixe méta muet. Souligné → fiche capacité quand la clé résout (GAP §7.1
  // fermé : ref-open `ability` est branché main.js) ; sinon nom en clair teinté
  // (honnête, jamais un lien mort). Teinte ABILITY_HEX par défaut du kind.
  const abilitiesHtml = `<div class="fiche-section"><h3>${esc(tr('monsterAbilitiesN', m.abilities?.length || 0))}</h3>${
    m.abilities?.length
      ? m.abilities.map(a => `<div class="frow">${ref({
          kind: 'ability', key: a.key || null, label: a.name,
          hasFiche: !!(a.key && S.abilities?.[a.key]),
          meta: a.slot ? `· ${a.slot}` : '',
        })}</div>`).join('')
      : `<p class="hint">${esc(tr('noAbilitiesKnown'))}</p>`
  }</div>`;

  const loreIdx = loreIndexFor(key);
  // EntityRef (vague 2) : entrée bestiaire/lore = `[Lieu] Titre` (ref location).
  const loreHtml = loreIdx != null ? `<div class="fiche-section"><h3>${esc(tr('loreEntryTitle'))}</h3>
    <div class="frow">
      <span class="fr-icon icon-broken" data-fb="📖"></span>
      ${ref({ kind: 'location', key: loreIdx, label: S.locations[loreIdx].title, hasFiche: true })}
    </div></div>` : '';

  // Ordre de la fiche (manager feedback, task #80/#79) : identité (tête,
  // zone, sélecteur de variante) -> SPAWNS (la question n°1 d'un joueur qui
  // arrive depuis une quête, "où farmer ça ?", honnête même quand la réponse
  // est "inconnu" -- Badge précision unlocated dans monsterCampsHtml) -> tags ->
  // stats -> butin (kill puis dépeçage) -> objets de quête qui en dépendent
  // -> capacités -> bestiaire/lore (le contenu le plus "lecture", en dernier).
  // DispositionBadge : la posture du monstre (hostile/neutral/…), résolue par
  // data.js dispositionFor(key) — `monsters.disposition` est une CHAÎNE.
  // Le champ est désormais CUIT et LIVE dans les données (913/916 monstres en
  // portent une) : dispositionFor le lit et dispositionChip rend le badge
  // « official » ci-dessous. Le lecteur reste 404/null-tolérant (blueprint §7)
  // — un monstre sans disposition connue ne rend simplement aucun badge, jamais
  // une valeur inventée. (La disposition monstre reste un badge de fiche unique
  // et honnête : ~910/913 hostile, donc pas un axe discriminant d'arbre/recherche.)
  const dispHtml = dispositionChip(dispositionFor(key), 'official');
  openFiche(`
    ${ficheHeader({
      avatar: iconTag(icon, 'fiche-avatar', initials(m.name)),
      name: m.name, hex: speciesLayerHex(spId), dot: speciesDot,
      sub: `${esc(kindLine)}${devMark}`, below: dispHtml,
    })}
    ${variantSelectHtml}
    ${rawRecordsHtml}
    ${foundInHtml}
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

/* ── Fiche FAMILLE de monstres (#82 chunk (e), « l'arbre EST le bestiaire »)
   ───── La créature au grain FAMILLE (post-alias familyKey — robo/robot
   fusionnés) : l'unité que visent les buts de quête à portée famille (« Tuer
   des araignées », bound_units.scope="family"/"families") et les lignes
   famille de la recherche/de l'arbre. Entièrement DÉRIVÉE côté client des
   bundles déjà chargés (AUCUNE donnée nouvelle cuite — un nom de famille est
   un jeton de jeu brut, identique dans les 5 langues, GLOSSARY-PENDING #86 ;
   membres/niveaux/portraits vivent déjà dans species.bin ; points via le
   résolveur UNIQUE ; quêtes par jointure inverse sur S.quests, chargé au
   critique). Membres cliquables -> fiche espèce (fiche-monster, clic-double-
   effet du délégué) + leur propre « Afficher · N pts » (species-layer).
   « Afficher la famille sur la carte » = activation des lignes famille de
   l'arbre (family-layer, cascade — familyLayerActivateBtn, même modèle que
   les chips de quête). Repli honnête : une famille sans AUCUN membre
   catalogue (jeton inconnu) n'ouvre pas de fiche (jamais une page vide). */
function familyMembers(fam) {
  const f = familyKey(fam);
  return Object.entries(S.species || {})
    .filter(([, sp]) => !isHiddenTest(sp) && familyKey(sp.family || 'other') === f)
    .map(([id, sp]) => ({ id, sp }))
    // MÊME ordre que l'arbre (sidebar.js speciesByFamily) : niveau min puis nom.
    .sort((a, b) => (a.sp.levelMin ?? 99) - (b.sp.levelMin ?? 99) || a.sp.name.localeCompare(b.sp.name));
}
/* Clé de spawn REPRÉSENTATIVE ouvrable d'une espèce (canonicalSiteKey sinon
   premier spawn) — null si elle ne résout pas dans S.monsters (openMonsterFiche
   exige une clé présente ; à défaut la ligne membre reste non cliquable,
   jamais un lien mort). */
function speciesRepKey(sp) {
  const k = sp.canonicalSiteKey || (sp.spawns && sp.spawns[0] && sp.spawns[0].siteKey) || null;
  return k && S.monsters[k] ? k : null;
}
/* Quêtes ciblant CETTE famille (jointure inverse client, aucune donnée cuite) :
   un but à portée famille (bound_units.scope family/families) dont les
   `families` (post-alias) contiennent `fam`. Balayage honnête de S.quests
   (gate dev isHiddenTest, dédup par slug — une quête n'apparaît qu'une fois
   même si plusieurs de ses buts visent la famille). */
function familyScopeQuestRows(fam) {
  const seen = new Set();
  const rows = [];
  for (const [slug, q] of S.quests) {
    if (isHiddenTest(q)) continue;
    for (const g of q.goals || []) {
      const bu = g.target?.bound_units;
      if (!bu || !bu.scope || bu.scope === 'species') continue;
      if (!(bu.families || []).map(familyKey).includes(fam)) continue;
      seen.add(slug);
      rows.push(`<div class="frow">${questRef(slug)}</div>`);
      break;
    }
  }
  if (!rows.length) return '';
  return `<div class="fiche-section"><h3>${esc(tr('familyQuestsN', seen.size))}</h3>${rows.join('')}</div>`;
}
function openFamilyFiche(famKey) {
  const fam = familyKey(famKey);
  const members = familyMembers(fam);
  if (!members.length) return;
  S.openFiche = { kind: 'family', id: fam };
  const lvls = members.flatMap(({ sp }) => [sp.levelMin, sp.levelMax]).filter(v => v != null);
  const lvlSpan = lvls.length
    ? (Math.min(...lvls) === Math.max(...lvls) ? tr('levelAbbrev', Math.min(...lvls)) : tr('levelRangeAbbrev', Math.min(...lvls), Math.max(...lvls)))
    : '';
  const kindLine = [tr('familyFicheKind'), lvlSpan].filter(Boolean).join(' · ');
  // Mosaïque de portraits (membres qui en ont un, jusqu'à 6) — repli glyphe
  // honnête (🐾) quand AUCUN membre n'a de portrait (146/224 espèces sans
  // art, voir search.js) : jamais une case vide ni un portrait inventé.
  const withPortraits = members.filter(({ sp }) => sp.portrait);
  const head = withPortraits.length
    ? `<div class="fam-mosaic">${withPortraits.slice(0, 6).map(({ sp }) => iconTag(`icons/${sp.portrait}`, 'fam-mosaic-cell', initials(sp.name))).join('')}</div>`
    : `<span class="fiche-avatar icon-broken" data-fb="🐾"></span>`;
  // EN-TÊTE PARTAGÉ (TASK 1) : le toggle famille est la PASTILLE de l'en-tête
  // (l'ex-bouton familyLayerActivateBtn ET l'ex-ligne mapSection séparée sont
  // SUPPRIMÉS, kill-list §7.2 — plus de toggle en double). La pastille bascule
  // les lignes famille de l'arbre (ref-draw `family` → cascade des espèces) ;
  // teinte PRÉCISE de la famille (familyLayerHex, Q6, la même que le titre/les
  // points/l'arbre). RÈGLE OWNER 2026-07-12 : présente UNIQUEMENT quand la
  // famille a réellement des points sur la carte active (`drawable: !!famRes`)
  // — sinon titre coloré sans pastille (le ⊘ est abandonné pour ces
  // affordances). Synchronisée depuis toute surface (syncEntityRefDots §5.3).
  const famRes = familyPoints(fam);
  const famDot = {
    kind: 'family', key: fam, family: fam, label: pretty(fam),
    hex: familyLayerHex(fam), hasFiche: false,
    drawable: !!famRes, count: famRes ? famRes.nPts : 0, drawn: !!S.monfam[fam]?.on,
  };
  // Membres : portrait/glyphe + référence `[Espèce(●)] Nom` (la pastille
  // remplace l'ex-bouton « Afficher · N pts » PAR MEMBRE, kill-list §7.2 :
  // elle bascule SA couche de spawn ; nom souligné → fiche espèce quand une
  // clé de spawn résout). `spId: id` garantit la résolution de couche même
  // sans clé de spawn (le routeur fait key→species) ; niveau en méta.
  const memberRows = members.map(({ id, sp }) => {
    const repKey = speciesRepKey(sp);
    const icon = sp.portrait ? `icons/${sp.portrait}` : null;
    const mLvl = sp.levelMin != null
      ? (sp.levelMax != null && sp.levelMax !== sp.levelMin ? tr('levelRangeAbbrev', sp.levelMin, sp.levelMax) : tr('levelAbbrev', sp.levelMin))
      : '';
    const devMark = sp.isTest ? `<span class="dev-mark" title="${esc(tr('devBadgeTitle'))}">${esc(tr('devBadge'))}</span>` : '';
    return `<div class="frow fam-member">
      ${iconTag(icon, 'fr-icon', initials(sp.name))}
      ${speciesRef({ key: repKey, spId: id, name: sp.name, meta: mLvl })}${devMark}
    </div>`;
  }).join('');
  openFiche(`
    ${ficheHeader({ avatar: head, name: pretty(fam), hex: familyLayerHex(fam), dot: famDot, sub: esc(kindLine) })}
    <div class="fiche-section"><h3>${esc(tr('familyMembersTitle', members.length))}</h3>${memberRows}</div>
    ${familyScopeQuestRows(fam)}`);
  setFicheHash('family', fam);
}

/* Prix vendeur : nombre au format de la langue + pictogramme de pièce —
   l'unité monétaire n'est pas nommée dans les données extraites, le glyphe
   neutre suffit et reste identique dans toutes les langues. */
function priceHtml(price) {
  if (price == null) return '';
  return `<span class="muted fr-price" title="${esc(tr('priceTitle'))}">${esc(price.toLocaleString(numberLocale()))} <span class="coin" aria-hidden="true"></span></span>`;
}
/* Drapeaux honnêtes d'un article de stock (contrat vendor_stock : `infinity` =
   stock illimité, `chance` = probabilité d'être en stock). DORMANTS tant que
   vendors.bin n'expédie qu'un `{key, price}` (aucun de ces champs) — rendus dès
   qu'ils arrivent, jamais fabriqués. */
function stockFlags(s) {
  if (typeof s === 'string') return '';
  const inf = s.infinity ? `<span class="stock-flag" title="${esc(tr('stockInfinityTitle'))}">${esc(tr('stockInfinity'))}</span>` : '';
  const chance = (s.chance != null && s.chance < 1)
    ? `<span class="stock-flag stock-flag-muted" title="${esc(tr('stockChanceTitle'))}">${esc(tr('stockChance', Math.round(s.chance * 100)))}</span>` : '';
  return inf + chance;
}
/* PriceBandRow (blueprint §3.3) — le prix d'un article affiché en BANDE
   (min–max) quand la donnée le porte, jamais un point-prix fabriqué. Contrat
   vendor_stock : prix = base × `buy_price_multiplier`{min,max} × `gold`{min,max}
   -> une BANDE (min×min … max×max). Le bin vendors.bin EXPÉDIÉ aujourd'hui ne
   porte qu'un `price` SCALAIRE (survey : `{key, price}` universel, aucun champ
   de bande) : ce cas rend EXACTEMENT l'ancien prix (priceHtml) — bande +
   drapeaux DORMANTS jusqu'à l'arrivée du bin enrichi (lecteur écrit contre le
   contrat, blueprint §7 ; jamais un min/max inventé autour d'un scalaire). */
function priceBandCell(s) {
  if (typeof s === 'string') return priceHtml(null);
  const bpm = s.buy_price_multiplier, gold = s.gold;
  const lo = s.priceMin != null ? s.priceMin : (bpm && gold ? bpm.min * gold.min : null);
  const hi = s.priceMax != null ? s.priceMax : (bpm && gold ? bpm.max * gold.max : null);
  const flags = stockFlags(s);
  const priceCell = (lo != null && hi != null && Math.round(hi) !== Math.round(lo))
    ? `<span class="muted fr-price" title="${esc(tr('priceBandTitle'))}">${esc(Math.round(lo).toLocaleString(numberLocale()))}&nbsp;–&nbsp;${esc(Math.round(hi).toLocaleString(numberLocale()))} <span class="coin" aria-hidden="true"></span></span>`
    : priceHtml(s.price != null ? s.price : lo);
  return flags ? `${flags}${priceCell}` : priceCell;
}
function vendorStockSection(vendorKey) {
  const v = S.vendors[vendorKey];
  if (!v) return '';
  if (!v.sells?.length) {
    // Pastille d'état RÉELLE (#68) : les 20/69 vendors.bin `sells:[]` vides
    // ( #19/re-check #4, task #67) portent désormais
    // `stockState` (dynamic/dev/unknown, la sous-distinction que le suivi
    // ci-dessus disait manquer) + `stockStateReason` -- une phrase COURTE en
    // anglais, jamais localisée (c'est une note de provenance technique pour
    // qui creuse, pas un texte joueur, voir  #4) --
    // portée en info-bulle de la Badge via le paramètre `extra` de stateBadge
    // (même mécanique que campFaunaUnknownNote ailleurs dans ce fichier).
    // stateBadge mappe dev -> contenu dev, dynamic/unknown -> provenance absent
    // (stock vide décidé serveur ou simplement hors données client). Repli
    // Badge absent nu pour tout futur vendeur non classifié (filet de sécurité).
    const reason = v.stockStateReason ? `${tr('noVendorItems')} — ${v.stockStateReason}` : tr('noVendorItems');
    const chip = v.stockState ? stateBadge(v.stockState, reason) : badge({ axis: 'provenance', value: 'absent', extra: tr('noVendorItems') });
    return `<div class="fiche-section"><h3>${esc(tr('vendorStockTitle'))}</h3><p class="hint">${chip}</p></div>`;
  }
  const rows = v.sells.map(s => {
    const key = typeof s === 'string' ? s : s.key;
    const it = S.items[key];
    const name = it?.name || pretty(key);
    const icon = it?.icon ? `icons/${it.icon}` : null;
    // Pastille de rareté (couleur RARITY) quand elle est connue : repère
    // visuel de « ce que vaut » chaque article du stock sans surcharger la
    // ligne. Le nom porte désormais la MÊME teinte (task #77, coherence
    // pass) — dot + texte coloré coexistent déjà partout ailleurs sur le
    // site (npcChip icône + liseré, k-chip badge + nom de quête…), garder ce
    // seul endroit neutre aurait fait une exception isolée, pas une règle.
    // EntityRef (vague 2) : `[Item]`/`[Recipe]` — la teinte du tag PORTE déjà
    // la rareté (Q6, itemEcHex), remplaçant à la fois l'ex-rar-dot et le lien
    // fr-label ; souligné ⇔ résout ; pas de pastille (un article de stock n'a
    // rien à dessiner).
    const kind = it && isRecipeKind(it) ? 'recipe' : 'item';
    const itemRef = ref({ kind, key, label: name, hex: it ? itemEcHex(it) : null, hasFiche: !!it });
    return `<div class="frow" data-n="${esc(fold(name))}">
      ${iconTag(icon, 'fr-icon', itemGlyph(it))}
      ${itemRef}
      ${priceBandCell(s)}
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
  const img = npcIconUrl(r.icon);
  // Seulement les quêtes RÉELLEMENT visibles : un dialogue-bark hello_*/info_*
  // (isTest+isDialogue) que ce PNJ « donne » ne compte pas comme une quête et
  // n'apparaît pas ici par défaut (voir devcontent.js visibleQuestSlugs) —
  // sinon un PNJ sans aucune vraie quête affichait « Quêtes données (2) » +
  // 2 lignes qui, cliquées, ouvraient une fiche vide. Révélé avec le contenu
  // dev (S.devOn), exactement comme partout ailleurs.
  const visibleSlugs = visibleQuestSlugs(r.quests);
  // EntityRef (vague E'c-3) : chaque quête donnée = `[Quête(●)] Nom`. La forme
  // verbeuse « [Quête] Nom + bouton carte (gotoBtn) » est ABANDONNÉE (intention
  // owner ré-emphasée : « [Kind(●)] name », jamais « [Kind] name at [Position()] ») :
  // la pastille LOCATE (mode L, Q7) épingle/retire la position de la quête (= son
  // donneur = CE PNJ) — un seul geste carte, le nom souligné ouvre la fiche quête.
  // Pastille présente ⇔ position connue (q.x != null), sinon `[Quête] Nom` nu.
  const quests = visibleSlugs.map(slug => {
    const q = S.quests.get(slug);
    if (!q) return '';
    return `<div class="frow">${questRef(slug)}</div>`;
  }).join('');
  // Some NPCs are known only from dialog/quest-slot text, with no world
  // placement or map pin at all (site/js/i18n.js's generic posUnknown, same
  // label already used for a merchant/object with no extracted position --
  // never the quest-goal precision Badge (area/via-chain/unlocated), which
  // implies a real server-side spawn rather than "not extracted").
  const posLine = r.x != null ? `<span class="pop-coords">${fmtCoord(r.x, r.z)}</span>`
    : `<span class="pos-unknown">${esc(tr('posUnknown'))}</span>`;
  // Variante technique (npc.k, 84 PNJ : gardes/entrées d'arène) — seule
  // façon de distinguer deux gardes homonymes ("Guard Archer Bow 8" vs
  // "Sword 3") ; affichée seulement quand elle dit plus que le nom.
  const variant = r.k ? pretty(r.k.replace(/^npc_/, '')) : '';
  const variantLine = variant && fold(variant) !== fold(r.name)
    ? `<span class="pop-coords">${esc(variant)}</span>` : '';
  // Dialogue du personnage (data-accuracy audit, NPC-duplication fix): les
  // barks hello_/info_ que ce PNJ « donne » sont masqués de la liste de quêtes
  // (visibleQuestSlugs ci-dessus) car ce ne sont pas des quêtes — mais leurs
  // répliques d'ambiance SONT ce personnage. Comme les pins dupliqués (le
  // donneur-de-dialogue + le donneur-de-quête + le vrai PNJ) sont désormais
  // fusionnés en UN seul pin (), on rattache
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
  // EN-TÊTE PARTAGÉ (TASK 1 + clarification owner) : un PNJ précis a une
  // position mais AUCUNE couche d'arbre persistante — son affordance carte
  // honnête est un pin LOCATE (mode L, Q7) : `[NPC(●)] Nom` où la pastille
  // épingle/retire ce PNJ sur la carte (pin persistant listé dans la légende).
  // Présente ⇔ une position est connue (r.x != null) ; sinon titre coloré seul
  // (rien à localiser). L'ex-bouton « Voir sur la carte » (goto) séparé est
  // RETIRÉ (E'c-3) : la pastille de l'en-tête EST le locate — un seul geste,
  // jamais la forme verbeuse en-tête + bouton position redondant.
  // Nuance PRÉCISE de CE PNJ (entityColor, LA source unique) — le même ambre
  // que sa réf/son chip/son pin partout : « npc + Zarnok = un jaune précis pour
  // Zarnok », jamais l'ambre plat de catégorie.
  const npcHex = entityColor('npc', r.name);
  const npcDot = r.x != null
    ? { kind: 'npc', mode: 'L', key: `npc:${idx}`, label: r.name, hex: npcHex, drawable: true, pos: { x: r.x, z: r.z } }
    : null;
  openFiche(`
    ${ficheHeader({
      avatar: iconTag(img, 'fiche-avatar', initials(r.name)),
      name: r.name, hex: npcHex, dot: npcDot,
      sub: `${esc(tr('npcCat'))}${r.vendor ? esc(tr('vendorSuffix')) : ''}`,
      below: `${posLine}${variantLine}`,
    })}
    <div class="fiche-section">
      <div class="pop-actions">
        <button class="act" data-act="track" data-id="npc:${idx}">${esc(tr('trackBtn'))}</button>
      </div></div>
    <div class="fiche-section"><h3>${esc(tr('questsGivenN', visibleSlugs.length))}</h3>
      ${quests || `<p class="hint">${esc(tr('noQuestsForNpc'))}</p>`}</div>
    ${dialogueSection}
    ${r.vendor ? vendorStockSection(r.vendor) : ''}`);
  setFicheHash('npc', idx);
}

/* Section « Apparaît dans » de la fiche monstre (openMonsterFiche) : même
   jointure camp -> vrai nuage de points que farmSectionHtml ci-dessus
   (campGroupByKey, résolveur unique js/pointsets.js). Le toggle ESPÈCE d'union
   (la référence `[Espèce(●)]` de l'EN-TÊTE de la fiche, EntityRef vague 2 :
   pastille = couche espèce de l'arbre) est LA seule action carte de couche -- la
   demande d'origine ("où sont les imps bleus ?") attend l'UNION des nuages
   réels de TOUS les camps de la créature (4 camps ≈ 900+ points pour les
   imps) : c'est exactement ce que la couche espèce allume. Les lignes de
   camp ci-dessous sont des références `[Camp(●)]` (farmCampRow/farmUnjoinedRow) :
   pastille = surlignage transitoire de CE camp, nom souligné → fiche camp.
   m.camps[] porte {camp, name, qualifier?, map, kind, x, z} PAR CAMP
   (pipeline pass 2026-07-11b) -- une forme strictement identique à
   it.farm[], donc les MÊMES lignes sont réutilisées telles quelles :
   farmCampRow (camp joint -- le nom vient du `name` EXPÉDIÉ via campLabel,
   LE formateur partagé : l'ancien name « cuit » cassé pour les clés
   non-Kwalat, cause du retrait temporaire d'alors, est CORRIGÉ côté
   pipeline — voir  §4) et
   farmUnjoinedRow (camp d'une autre carte, champ `map` expédié -- 448
   lignes réelles sur le catalogue monstre expédié (129/916 monstres,
   recompté par l'investigation §1 -- l'ancien « 449 refs » était périmé),
   jamais un compte fabriqué ; bouton cross-carte, voir sa doc). Les lignes sœurs camp/patrol/buffed d'une même
   espèce restent des lignes DISTINCTES (leurs nuages de points sont
   réellement distincts, investigation §4(b) -- jamais fusionnées) ; le
   qualificatif s'affiche désormais en chip (— Patrouille / — Renforcé
   (PvP)) depuis le champ pipeline `qualifier` EXPÉDIÉ (pass 2026-07-11b),
   jamais une dérivation client — les lignes non jointes sont en outre
   triées nom puis base < patrol < buffed pour que chaque triade se lise
   d'un bloc (leurs nuages restent distincts, seul l'ORDRE change). 0 camp
   DU TOUT retombe sur la pastille "unknown" déjà en place
   ( #10, task #67 -- comportement inchangé). */
const QUALIFIER_RANK = { patrol: 1, buffed: 2 };
function monsterCampsHtml(m) {
  const camps = m.camps || [];
  const title = esc(tr('monsterCampsN', camps.length));
  if (!camps.length) {
    return `<div class="fiche-section"><h3>${title}</h3>
      <p class="hint">${badge({ axis: 'precision', value: 'unlocated', extra: tr('noCampsKnown') })}</p></div>`;
  }
  const joined = [], unjoined = [];
  for (const c of camps) {
    const g = campGroupByKey(c.camp);
    if (g) joined.push({ c, g }); else unjoined.push(c);
  }
  joined.sort((a, b) => b.g.pts.length - a.g.pts.length);
  unjoined.sort((a, b) => (a.name || a.camp).localeCompare(b.name || b.camp)
    || (QUALIFIER_RANK[a.qualifier] || 0) - (QUALIFIER_RANK[b.qualifier] || 0));
  // EntityRef (vague 2) : l'ex-bouton d'union espèce (monsterSpawnHighlightBtn,
  // kill-list §7.2) est RETIRÉ d'ici — il vit désormais dans l'en-tête de la
  // fiche (openMonsterFiche `speciesToggleRow`, `[Espèce(●)]` : la pastille du
  // tag de tête EST le toggle d'union). Les lignes ci-dessous sont des
  // références `[Camp(●)]` (farmCampRow/farmUnjoinedRow), leur pastille
  // basculant le surlignage de CE camp.
  const rowsHtml = farmCapRows(
    [...joined.map(r => ({ row: r, joined: true })), ...unjoined.map(c => ({ row: c, joined: false }))],
    x => x.joined ? farmCampRow(x.row.c.camp, x.row.g) : farmUnjoinedRow(x.row),
    n => tr('farmMoreCampsN', n),
  );
  return `<div class="fiche-section"><h3>${title}</h3>${rowsHtml}</div>`;
}

export { openMonsterFiche, openFamilyFiche, openWildlifeFiche, openNpcFiche, openCampFiche };
