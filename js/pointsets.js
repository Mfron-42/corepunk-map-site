/* Kwalat — résolveur de points UNIQUE (#82 chunk (b), design §3 — voir
    unified_layers_DESIGN.md et COORDINATION.md « Résolveur de
   points UNIQUE ») : LA seule implémentation des jointures espèce→points,
   famille→points et type-qao→points, consommée par (1) le highlight
   éphémère des fiches (fiches.js monsterSpawnHighlightBtn/farmSectionHtml/
   monsterCampsHtml, migrés dessus), (2) les sous-couches statiques « Par
   famille » (sidebar.js) + le compositeur de rendu (main.js), (3) les
   filtres épinglés à venir (chunk (d)). Interdiction de re-dériver ces
   joins par surface — toute nouvelle affordance carte passe par ici.

   Module PUR : importe S + config + devcontent, aucune vue. Index paresseux
   invalidés par IDENTITÉ d'objet (S.camps/S.species/S.monsters sont
   REMPLACÉS en bloc par loadDeferred/setLang/switchMap — voir data.js
   loadDeferred, multimap.js applyMapState — donc comparer la référence
   suffit, aucune hook d'invalidation à câbler ; même effet que la
   discipline monsterNameIdx=null de data.js, sans toucher data.js).

   Honnêteté (design §13.1, byte-prouvé) : les points de spawn ne portent
   AUCUNE référence d'entité — « les points d'une espèce » = les points de
   SES CAMPS (partagés avec tout ce qui y spawn), jamais « les positions de
   X ». Tout libellé consommateur doit dire « N camps », voir les appelants. */
import { S } from './state.js';
import { familyKey } from './config.js';
import { isHiddenTest } from './devcontent.js';

/* ── Index camp → groupe (carte ACTIVE) ─────────────────────────
   Remplace les `.find()` O(n) répétés sur Object.values(S.camps).flatMap
   (l'ancien allCampGroupsFlat de fiches.js) aux sites chauds — même lookup
   que openCampFiche/le handler camp-highlight de main.js. */
let _campIdx = null, _campIdxSrc = null;
function campGroupByKey(key) {
  if (_campIdxSrc !== S.camps || !_campIdx) {
    _campIdx = new Map();
    for (const st of Object.values(S.camps)) {
      for (const g of st.groups) _campIdx.set(g.k, g);
    }
    _campIdxSrc = S.camps;
  }
  return _campIdx.get(key) || null;
}

/* ── Espèce → camps (jointure de référence, design §3) ──────────
   Set<campKey> : union des m.camps de CHAQUE spawn de l'espèce
   (S.species[spId].spawns → S.monsters[siteKey].camps), joints à la carte
   ACTIVE (clé présente dans S.camps via campGroupByKey) — exactement la
   même jointure que monsterSpawnHighlightBtn, élevée au niveau espèce. */
function speciesCampSet(spId) {
  const set = new Set();
  const sp = (S.species || {})[spId];
  if (!sp) return set;
  for (const spawn of sp.spawns || []) {
    const m = (S.monsters || {})[spawn.siteKey];
    if (!m || !m.camps) continue;
    for (const c of m.camps) if (campGroupByKey(c.camp)) set.add(c.camp);
  }
  return set;
}

/* Ensemble de points concret d'un Set de clés de camp — forme commune à
   speciesPoints/familyPoints/qui-veut : { camps:[{key,g}], pts:[{x,z}],
   nCamps, nPts } | null si vide (repli honnête : jamais un bouton/une ligne
   qui n'allumerait rien — même règle que le bouton highlight actuel). */
function pointsOfCampSet(campSet) {
  if (!campSet || !campSet.size) return null;
  const camps = [], pts = [];
  for (const key of campSet) {
    const g = campGroupByKey(key);
    if (!g) continue;
    camps.push({ key, g });
    for (const [x, z] of g.pts) pts.push({ x, z });
  }
  if (!camps.length) return null;
  return { camps, pts, nCamps: camps.length, nPts: pts.length };
}
function speciesPoints(spId) { return pointsOfCampSet(speciesCampSet(spId)); }

/* ── Famille → camps (grain de l'arbre statique, design §4) ─────
   Union des speciesCampSet de chaque espèce NON-test de la famille
   (post-alias familyKey, ex. robo→robot ; espèce isTest révélée par S.devOn
   comptée — même garde isHiddenTest que le bestiaire/la recherche). Table
   complète calculée d'un coup et cachée (l'itération sidebar + compositeur
   la lit à chaque rebuild/redraw) — invalidée par identité S.camps/
   S.species + valeur S.devOn. */
let _famTable = null, _famSrcCamps = null, _famSrcSpecies = null, _famSrcDev = null;
function familyTable() {
  if (_famTable && _famSrcCamps === S.camps && _famSrcSpecies === S.species && _famSrcDev === S.devOn) {
    return _famTable;
  }
  const byFam = new Map();   // famille (post-alias) -> Set<campKey>
  for (const [id, sp] of Object.entries(S.species || {})) {
    if (isHiddenTest(sp)) continue;
    const set = speciesCampSet(id);
    if (!set.size) continue;   // espèce sans camp joint sur la carte active : aucune contribution
    const fam = familyKey(sp.family || 'other');
    let famSet = byFam.get(fam);
    if (!famSet) byFam.set(fam, famSet = new Set());
    for (const k of set) famSet.add(k);
  }
  // Liste triée par points décroissants (puis nom, déterministe) — cet ORDRE
  // est aussi le rang de couleur (config.js MONSTER_FAMILY_HEX_CYCLE, design
  // §4.3 « jamais de hasard par session ») et l'ordre des lignes du panneau.
  const rows = [];
  for (const [family, campKeys] of byFam) {
    let nPts = 0;
    for (const k of campKeys) { const g = campGroupByKey(k); if (g) nPts += g.pts.length; }
    rows.push({ family, campKeys, nCamps: campKeys.size, nPts });
  }
  rows.sort((a, b) => b.nPts - a.nPts || a.family.localeCompare(b.family));
  _famTable = rows;
  _famSrcCamps = S.camps; _famSrcSpecies = S.species; _famSrcDev = S.devOn;
  return rows;
}
/* Familles avec ≥1 camp joint sur la carte active (« honnête — pas de ligne
   morte », design §4.2 : ~20 sur Kwalat, 0 tant que species/camps ne sont
   pas chargés). [{family, campKeys:Set, nCamps, nPts}] trié pts desc. */
function monsterFamilies() { return familyTable(); }
function familyCampSet(family) {
  const fam = familyKey(family);
  const row = familyTable().find(r => r.family === fam);
  return row ? row.campKeys : new Set();
}
function familyPoints(family) { return pointsOfCampSet(familyCampSet(family)); }

/* ── Objets de quête (qao) → placements ─────────────────────────
   sel = {keys:[qaoKey…]} | {type:'Document'} — placements S.data.qao
   correspondants sur la carte active, hors isHiddenTest (MÊME filtre que le
   rendu, main.js registerAllDenseRenderers). Le sélecteur {typeOther:true}
   du design (§3/§5) dépend du seuil ≥6 recalculé au build des sous-lignes —
   il arrive avec le chunk (c) qui possède ce seuil ; rien n'est inventé ici
   en attendant. Exporté dès maintenant pour que (c)/(d) consomment LE même
   module (résolveur unique). */
function qaoPoints(sel) {
  const list = (S.data.qao || []).filter(p => !isHiddenTest(p) && p.x != null && p.z != null);
  let rows = null;
  if (sel && sel.keys) {
    const ks = new Set(sel.keys);
    rows = list.filter(p => ks.has(p.k));
  } else if (sel && sel.type) {
    rows = list.filter(p => p.type === sel.type);
  }
  if (!rows || !rows.length) return null;
  return { rows, pts: rows.map(p => ({ x: p.x, z: p.z })), nPts: rows.length };
}

export {
  campGroupByKey, speciesCampSet, speciesPoints,
  familyCampSet, familyPoints, monsterFamilies,
  qaoPoints,
};
