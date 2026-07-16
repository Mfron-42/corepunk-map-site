/* Kwalat — résolveur de points UNIQUE (#82 chunk (b), design §3 — voir
     et  « Résolveur de
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

/* ── Primitive de RESTRICTION par espèce (species point-narrowing, 2026-07-16) ─
   Un camp « creeps » MIXTE (windreach-woods, steppes, goldenfield-town…) porte,
   ALIGNÉ 1:1 avec ses ancres (g.pointContent — un jeton par point : "raptor"/
   "rat"/…/null) et la liste des espèces qui y spawnent (g.pointSpecies —
   entrées "token:axis:key", ex. "raptor:monster:woodraptor"). LA seule
   primitive qui restreint le nuage d'un camp à la part d'UNE sélection : un
   woodraptor récupéré ne compte/dessine que SES 3 682 raptors (windreach 1912 +
   tempest 144 + steppes 730 + …) au lieu des 11 939 points des 8 camps mixtes.
   Invariant d'honnêteté « compté == dessiné » : consommée À LA FOIS par les
   compteurs (speciesPoints/familyPoints/familyTable, via pointsOfCampSet) ET par
   le tracé (main.js compositeCampPoints, via le masque d'indices). Un camp SANS
   pointSpecies — TOUT camp kind=monsters/récolte/… (byte-vérifié : seuls ~8
   camps creeps de Kwalat en portent, zéro camp monsters) : campTokenSet==null →
   aucun filtrage, g.pts entiers → imp/wolf/scrag restent BYTE-IDENTIQUES. */
function campTokenSet(g, matches) {
  const ps = g.pointSpecies;
  if (!ps) return null;
  const s = new Set();
  for (const e of ps) { const [tok, axis, key] = e.split(':'); if (matches(axis, key)) s.add(tok); }
  return s;
}
function campNarrowedCount(g, matches) {
  const t = campTokenSet(g, matches);
  if (t === null) return g.pts.length;
  const pc = g.pointContent || [];
  let n = 0;
  for (let i = 0; i < pc.length; i++) if (t.has(pc[i])) n++;
  return n;
}
function campIncludedMask(g, matches) {
  const t = campTokenSet(g, matches);
  if (t === null) return null;
  const pc = g.pointContent || [], m = new Set();
  for (let i = 0; i < pc.length; i++) if (t.has(pc[i])) m.add(i);
  return m;
}
/* Prédicats `matches(axis, key)` d'une sélection : une ESPÈCE ⇔ sa clé exacte ;
   une FAMILLE ⇔ la famille (post-alias) de l'espèce catalogue sur l'axe
   `monster`, la clé wildlife telle quelle sinon (une espèce de faune EST sa
   propre « famille » d'arbre — pas de catalogue species.bin pour elle). */
const speciesMatches = spId => (axis, key) => key === spId;
const familyMatches = fam => (axis, key) => (axis === 'monster' ? familyKey((S.species || {})[key]?.family) : key) === fam;

/* Ensemble de points concret d'un Set de clés de camp — forme commune à
   speciesPoints/familyPoints/qui-veut : { camps:[{key,g}], pts:[{x,z}],
   nCamps, nPts } | null si vide (repli honnête : jamais un bouton/une ligne
   qui n'allumerait rien — même règle que le bouton highlight actuel). Avec un
   prédicat `matches` (chemin espèce/famille) chaque camp est RESTREINT à ses
   ancres qui matchent (campIncludedMask) — un camp mixte ne compte alors que sa
   part ; sans `matches`, ou pour un camp sans pointSpecies, g.pts entiers. */
function pointsOfCampSet(campSet, matches) {
  if (!campSet || !campSet.size) return null;
  const camps = [], pts = [];
  for (const key of campSet) {
    const g = campGroupByKey(key);
    if (!g) continue;
    const mask = matches ? campIncludedMask(g, matches) : null;
    camps.push({ key, g });
    g.pts.forEach(([x, z], i) => { if (mask && !mask.has(i)) return; pts.push({ x, z }); });
  }
  if (!camps.length || !pts.length) return null;
  return { camps, pts, nCamps: camps.length, nPts: pts.length };
}
function speciesPoints(spId) { return pointsOfCampSet(speciesCampSet(spId), speciesMatches(spId)); }

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
    // nPts RESTREINT à la part de la famille dans chaque camp (campNarrowedCount) :
    // un camp mixte (creeps) ne compte que ses ancres woodraptor, jamais tout le
    // nuage ; un camp monsters (sans pointSpecies) compte g.pts entiers (comme
    // avant). `family` est déjà post-alias (clé de byFam) → familyMatches direct.
    const m = familyMatches(family);
    let nPts = 0;
    for (const k of campKeys) { const g = campGroupByKey(k); if (g) nPts += campNarrowedCount(g, m); }
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
function familyPoints(family) { return pointsOfCampSet(familyCampSet(family), familyMatches(familyKey(family))); }

/* ── Exceptions PAR-ENTITÉ (arbre Option A+, décision ratifiée 2026-07-14) ──
   L'arbre Monstres vit au grain FAMILLE (« l'arbre reflète ce qui se
   dessine ») ; une espèce n'y garde une ligne propre QUE si ses camps
   résolus diffèrent RÉELLEMENT de ceux de sa famille — critère CALCULÉ ici
   (comparaison des ensembles de camps, jamais une liste en dur) :
     exception ⇔ speciesCampSet(id) NON VIDE et ≠ familyCampSet(famille).
   Comme chaque ensemble d'espèce est un sous-ensemble de l'union famille,
   l'égalité de TAILLE équivaut à l'égalité d'ensemble (comparaison exacte,
   pas une heuristique). Byte-prouvé sur les bins expédiés : 0 exception sur
   Kwalat (imp 397 clés → 4 camps au roster identique, wolf/scrag/goblin
   idem — le dot par-espèce y était un demi-mensonge), 11 exceptions sur
   Extraction_Island_large (famille werewolf scindée 3/6 camps). Une espèce
   0-camp n'est PAS une exception (rien à dessiner — elle vit dans la fiche
   famille et la recherche, plus dans l'arbre). Un id HORS catalogue
   (token wild de camp_details — turkey/rabbit/…) est par nature au grain
   espèce : isSpeciesException → true.
   Table paresseuse, mêmes invalidations que familyTable (+ S.campDetails,
   dont dépend le canal wild de speciesCampSet). */
let _excTable = null, _excCamps = null, _excSpecies = null, _excDetails = null, _excDev = null;
function exceptionTable() {
  if (_excTable && _excCamps === S.camps && _excSpecies === S.species
      && _excDetails === S.campDetails && _excDev === S.devOn) return _excTable;
  const famSize = new Map();   // famille -> taille de l'union de camps
  const spSize = new Map();    // spId -> taille de son ensemble (non vide seulement)
  const famSets = new Map();
  for (const [id, sp] of Object.entries(S.species || {})) {
    if (isHiddenTest(sp)) continue;
    const set = speciesCampSet(id);
    if (!set.size) continue;
    spSize.set(id, set.size);
    const fam = familyKey(sp.family || 'other');
    let fs = famSets.get(fam);
    if (!fs) famSets.set(fam, fs = new Set());
    for (const k of set) fs.add(k);
  }
  for (const [fam, fs] of famSets) famSize.set(fam, fs.size);
  const byFam = new Map();     // famille -> [spId…] exceptions
  for (const [id, size] of spSize) {
    const fam = familyKey((S.species[id].family) || 'other');
    if (size === famSize.get(fam)) continue;   // ensemble ≡ union famille : pas une exception
    let arr = byFam.get(fam);
    if (!arr) byFam.set(fam, arr = []);
    arr.push(id);
  }
  _excTable = byFam;
  _excCamps = S.camps; _excSpecies = S.species; _excDetails = S.campDetails; _excDev = S.devOn;
  return byFam;
}
/* Espèces exception d'une famille sur la carte ACTIVE ([] si aucune). */
function familyExceptionSpecies(family) {
  return exceptionTable().get(familyKey(family)) || [];
}
/* Une espèce garde-t-elle son grain propre ? (exception calculée, ou token
   hors catalogue — wild — qui n'a pas de famille dans l'arbre). */
function isSpeciesException(spId) {
  const sp = (S.species || {})[spId];
  if (!sp) return true;   // token wild/hors catalogue : grain espèce par nature
  const fam = familyKey(sp.family || 'other');
  return (exceptionTable().get(fam) || []).includes(spId);
}

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
   recherchable, honnêteté "l'arbre est le bestiaire" ()
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

// campIncludedMask/speciesMatches/familyMatches : primitive de restriction par
// espèce (species point-narrowing) — le masque d'ancres pour le tracé (main.js
// compositeCampPoints) + les prédicats de sélection (specieslayer.js
// speciesCampWinner / main.js famWinner).
export {
  campGroupByKey, speciesCampSet, speciesPoints,
  familyCampSet, familyPoints, monsterFamilies,
  familyExceptionSpecies, isSpeciesException,
  wildSpeciesOfKind, zeroCampWildlifeSpecies, kindBoundCampKeys, kindRestPoints,
  qaoPoints,
  campIncludedMask, speciesMatches, familyMatches,
};
