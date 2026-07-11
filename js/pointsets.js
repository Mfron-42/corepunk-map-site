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

/* ── Canal WILD (S.campDetails[camp].mobs[].wild — table wildlife) ───────
   Les espèces de la table wildlife (turkey/rabbit/fox/squirrel/porcupine/
   leaf_dragon…) ne sont PAS dans species.bin : leur SEULE liaison
   espèce→camp expédiée est l'entrée camp_details de leurs camps (mobs[]
   avec `wild:true` + `species` = token moteur + `name` localisé). Le token
   wild sert d'ID d'espèce partout où un id species.bin servirait (S.monsp,
   hash `monsp.<token>`, speciesLayerHex) — même espace de noms moteur,
   jamais un id inventé. Index paresseux invalidé par identité
   S.campDetails (remplacé en bloc par loadDeferred/setLang). */
let _wildIdx = null, _wildIdxSrc = null;
function wildSpeciesIndex() {
  if (_wildIdx && _wildIdxSrc === S.campDetails) return _wildIdx;
  _wildIdx = new Map();   // token espèce -> { name, campKeys:Set } (toutes cartes)
  for (const [campKey, d] of Object.entries(S.campDetails || {})) {
    for (const mob of d.mobs || []) {
      if (!mob.wild || !mob.species) continue;
      let e = _wildIdx.get(mob.species);
      if (!e) _wildIdx.set(mob.species, e = { name: mob.name || mob.species, campKeys: new Set() });
      e.campKeys.add(campKey);
    }
  }
  _wildIdxSrc = S.campDetails;
  return _wildIdx;
}

/* ── Espèce → camps (jointure de référence, design §3) ──────────
   Set<campKey> : union des m.camps de CHAQUE spawn de l'espèce
   (S.species[spId].spawns → S.monsters[siteKey].camps), joints à la carte
   ACTIVE (clé présente dans S.camps via campGroupByKey) — exactement la
   même jointure que monsterSpawnHighlightBtn, élevée au niveau espèce —
   ∪ le canal WILD ci-dessus (une espèce wildlife n'a QUE ce canal ; pour
   une espèce catalogue les deux canaux convergent, union idempotente). */
function speciesCampSet(spId) {
  const set = new Set();
  const sp = (S.species || {})[spId];
  for (const spawn of (sp && sp.spawns) || []) {
    const m = (S.monsters || {})[spawn.siteKey];
    if (!m || !m.camps) continue;
    for (const c of m.camps) if (campGroupByKey(c.camp)) set.add(c.camp);
  }
  const wild = wildSpeciesIndex().get(spId);
  if (wild) for (const k of wild.campKeys) if (campGroupByKey(k)) set.add(k);
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

/* ── Kind → espèces jointes / camps « non identifiés » (IA finale) ───────
   Miroir data-native des kinds moteur dans le panneau (sous-groupes
   Monsters/Creeps/Wildlife, sidebar.js) : pour chaque kind de camp,
   quelles espèces (catalogue + wild) sont jointes à ≥1 de ses camps sur la
   carte ACTIVE, et quels camps ne sont joints à AUCUNE espèce (les pools
   `creeps-<region>`/`peaceful-animals-*` — la ligne honnête « Spawns non
   identifiés »). Table paresseuse, invalidée par identité S.camps/
   S.species/S.campDetails + valeur S.devOn (même discipline que
   familyTable). */
let _kindJoin = null, _kjCamps = null, _kjSpecies = null, _kjDetails = null, _kjDev = null;
function kindJoinTable() {
  if (_kindJoin && _kjCamps === S.camps && _kjSpecies === S.species
      && _kjDetails === S.campDetails && _kjDev === S.devOn) return _kindJoin;
  const byKind = new Map();   // kind -> { bound:Set<campKey>, wild:[{id,name}] }
  const entry = kind => {
    let e = byKind.get(kind);
    if (!e) byKind.set(kind, e = { bound: new Set(), wild: [] });
    return e;
  };
  for (const [id, sp] of Object.entries(S.species || {})) {
    if (isHiddenTest(sp)) continue;
    for (const k of speciesCampSet(id)) {
      const g = campGroupByKey(k);
      if (g) entry(g.kind).bound.add(k);
    }
  }
  for (const [id, e] of wildSpeciesIndex()) {
    if ((S.species || {})[id]) continue;   // espèce catalogue : déjà comptée ci-dessus
    const kinds = new Set();
    for (const k of e.campKeys) {
      const g = campGroupByKey(k);
      if (g) { kinds.add(g.kind); entry(g.kind).bound.add(k); }
    }
    for (const kind of kinds) entry(kind).wild.push({ id, name: e.name });
  }
  _kindJoin = byKind;
  _kjCamps = S.camps; _kjSpecies = S.species; _kjDetails = S.campDetails; _kjDev = S.devOn;
  return byKind;
}
/* Espèces WILD (non-catalogue) jointes à ≥1 camp d'un kind ici — lignes
   espèce du sous-groupe Creeps/Wildlife (sidebar.js). */
function wildSpeciesOfKind(kind) { return kindJoinTable().get(kind)?.wild || []; }

/* Espèces fauniques SANS AUCUN camp connu, catalogue ENTIER (job pass
   2026-07-11b, wildlife_species.bin `camps: []` — 19/25 espèces : tortues
   ×5, poule, oie, coq, corbeau, castor, rat ambiant, voglet, brisk, manta,
   petit poisson, cochon, vache, buffle, chien). Contrairement à
   wildSpeciesOfKind ci-dessus (jointure PAR kind via camp_details), ces
   espèces n'ont RIEN à joindre nulle part -- listées quand même sous
   Wildlife (sidebar.js buildKindGroup) : catalogue browsable/
   recherchable, honnêteté "l'arbre est le bestiaire" (COORDINATION.md)
   appliquée ici à la faune. GLOBAL (pas de résolution par carte, contrairement
   à speciesCampSet -- il n'y a simplement aucun camp à résoudre). */
function zeroCampWildlifeSpecies() {
  return Object.entries(S.wildlifeSpecies || {})
    .filter(([, w]) => !(w.camps && w.camps.length))
    .map(([id, w]) => ({ id, name: w.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
/* Camps d'un kind joints à AU MOINS une espèce (catalogue ou wild). */
function kindBoundCampKeys(kind) { return kindJoinTable().get(kind)?.bound || new Set(); }
/* Camps d'un kind SANS aucune espèce jointe + leur volume de points — la
   ligne « Spawns non identifiés » (compte honnête : exactement ce que la
   couche kind dessine). La règle « rest-only » est UNIVERSELLE et dérivée
   de la donnée (ontology chunk 2 — l'ancien set front KIND_REST_ONLY
   {monsters, creeps, wildlife} est SUPPRIMÉ) : un camp est « non
   identifié » quand AUCUNE espèce ne s'y lie (kindBoundCampKeys ci-dessus,
   jointures species.bin/camp_details wild) — la couche kind ne dessine que
   ceux-là, pour TOUT kind (compositeur main.js). Pour les kinds sans
   aucune liaison espèce possible (récolte, sanctuaires, contenants…),
   l'ensemble lié est VIDE et la couche dessine tout : strictement
   l'ancien comportement, vérifié sur la donnée expédiée (les seuls kinds
   liés à une espèce sont monsters/creeps/wildlife, toutes cartes).
   Conséquence assumée/documentée (inchangée) : un lien LEGACY
   `on=camp.creeps`/`camp.wildlife`/`camp.monsters` dessine le sous-ensemble
   non joint au lieu du kind entier — le reste s'allume par les lignes
   espèce/famille, jamais perdu. */
function kindRestPoints(kind) {
  const st = S.camps[kind];
  if (!st) return { nCamps: 0, nPts: 0 };
  const bound = kindBoundCampKeys(kind);
  let nCamps = 0, nPts = 0;
  for (const g of st.groups) {
    if (bound.has(g.k)) continue;
    nCamps++; nPts += g.pts.length;
  }
  return { nCamps, nPts };
}

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
  wildSpeciesOfKind, zeroCampWildlifeSpecies, kindBoundCampKeys, kindRestPoints,
  qaoPoints,
};
