/* Kwalat — couches ESPÈCE (#82 chunk (d), modèle « l'arbre EST le
   bestiaire », décision utilisateur 2026-07-11) : l'espèce est le grain le
   plus fin de l'arbre Monstres & faune (sous-ligne d'un nœud famille,
   sidebar.js buildSpeciesSublist). Cocher une espèce allume les POINTS de
   ses camps (compositeur main.js, priorité espèce > famille > kind) ET une
   ZONE par camp (enveloppe convexe serrée, langage visuel de la zone
   ESTIMÉE — même style tireté doux que fiches.js drawGoalZone estimate:true,
   jamais l'autorité d'un contour confirmé, jamais de flyTo). L'ancien
   concept « filtre épinglé » (liste séparée, plafond, ✕, hash `pf=`) est
   RETIRÉ : une espèce cochée est une case de l'arbre comme une autre —
   dédoublonnage/retrait = la case, hash `on=monsp.<speciesId>` (urlstate.js).

   L'état vit dans S.monsp (state.js, même discipline que S.monfam) ; la
   résolution de points passe par le résolveur UNIQUE js/pointsets.js —
   jamais re-dérivée ici. Ce module ne possède que : les helpers d'état
   partagés, le sélecteur du compositeur, et la couche ZONE. */
import { S } from './state.js';
import { speciesLayerHex } from './config.js';
import { map, toLL } from './mapview.js';
import { speciesCampSet, campGroupByKey } from './pointsets.js';

/* Coche une espèce (clic-double-effet des chips de fiche, bouton « voir les
   spawns » des fiches/étapes — main.js) : ENSURE, jamais un toggle — le
   décochage appartient à la case de l'arbre. Retourne 'checked' | 'already'
   (dédoublonnage : re-cliquer un chip re-révèle la ligne déjà cochée). */
function ensureSpeciesOn(spId) {
  const st = S.monsp[spId] || (S.monsp[spId] = { on: false });
  const was = st.on;
  st.on = true;
  return was ? 'already' : 'checked';
}
function toggleSpecies(spId) {
  const st = S.monsp[spId] || (S.monsp[spId] = { on: false });
  st.on = !st.on;
  return st.on;
}
const checkedSpeciesIds = () => Object.keys(S.monsp).filter(id => S.monsp[id].on);

/* Restauration `on=monsp.…` (router.js) — ENSURE-only, à la différence des
   tokens camp/monfam : un token coche/crée son espèce, l'ABSENCE ne décoche
   jamais. Raison (flux verbatim du propriétaire : « survit à la fermeture de
   fiche ») : la fermeture d'une fiche repasse par history.back()/popstate
   (urlstate.js unfocus) vers une entrée dont le hash précède le clic qui a
   coché l'espèce — une sémantique miroir stricte décocherait la couche à ce
   moment précis. Symétrie assumée et documentée : décocher puis revenir en
   arrière RE-coche (l'entrée ancienne porte le token) — le hash reste la
   seule persistance, un lien partagé restaure exactement ce qui se voyait. */
function applySpeciesTokens(onSet) {
  for (const t of onSet) {
    if (!t.startsWith('monsp.')) continue;
    const id = t.slice(6);
    if (id) (S.monsp[id] || (S.monsp[id] = { on: false })).on = true;
  }
}

/* Sélecteur du COMPOSITEUR de camps (main.js compositeCampPoints, priorité
   espèce > famille > kind) : camp → teinte de la PREMIÈRE espèce cochée qui
   le contient (ordre d'insertion S.monsp, même règle premier-gagnant que les
   familles). */
function speciesCampWinner() {
  const winner = new Map();
  for (const id of checkedSpeciesIds()) {
    const hex = speciesLayerHex(id);
    for (const k of speciesCampSet(id)) if (!winner.has(k)) winner.set(k, hex);
  }
  return winner;
}

/* ── Couche ZONE (« points ET zone », flux verbatim du propriétaire) ─────
   Une enveloppe convexe SERRÉE par camp de chaque espèce cochée — honnête :
   « les camps où X PEUT apparaître » (les points de spawn ne portent aucune
   référence d'entité, design §13.1), jamais un périmètre confirmé. AUCUN
   flyTo, jamais nettoyée par closeFiche (persistante tant que la case l'est,
   contrairement au highlight/goalZone). Enregistrée dans denseRenderers
   (main.js) : rejouée à chaque cycle de vie (bascule carte/langue,
   restauration, arrivée du différé) sans point d'appel supplémentaire — le
   cache par signature rend les rejeux moveend/zoomend gratuits (les
   polygones Leaflet se re-projettent seuls). */
let zoneLayer = null, zoneSig = null, zoneSrcCamps = null;
const zoneSignature = () => checkedSpeciesIds().join('|');

/* Enveloppe convexe (chaîne monotone d'Andrew) sur les [x,z] bruts du camp. */
function convexHull(pts) {
  const P = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (P.length < 3) return null;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const p of P) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
  return hull.length >= 3 ? hull : null;
}
/* Langage visuel de la zone ESTIMÉE (mêmes constantes que fiches.js
   drawGoalZone estimate:true : liseré 1.4, tireté « 2 8 », remplissage .06). */
const SPECIES_ZONE_STYLE = { weight: 1.4, dashArray: '2 8', fillOpacity: .06, interactive: false };
function addCampZone(group, pts, hex) {
  const hull = convexHull(pts);
  if (hull) {
    L.polygon(hull.map(([x, z]) => toLL(x, z)), { ...SPECIES_ZONE_STYLE, color: hex, fillColor: hex }).addTo(group);
    return;
  }
  // < 3 points (ou colinéaires) : un petit cercle honnête autour du centroïde
  // — même repli minimal r=35 que le cercle de zone deviné (fiches.js
  // drawGoalZone), les points eux-mêmes restant la vraie information.
  let cx = 0, cz = 0, minX = 1 / 0, maxX = -1 / 0, minZ = 1 / 0, maxZ = -1 / 0;
  for (const [x, z] of pts) {
    cx += x; cz += z;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  cx /= pts.length; cz /= pts.length;
  const r = Math.max(35, Math.hypot(maxX - minX, maxZ - minZ) / 2);
  L.circle(toLL(cx, cz), { ...SPECIES_ZONE_STYLE, radius: r, color: hex, fillColor: hex }).addTo(group);
}
function renderSpeciesZones() {
  const sig = zoneSignature();
  if (zoneSig === sig && zoneSrcCamps === S.camps) return;   // rien n'a changé (cache)
  zoneSig = sig; zoneSrcCamps = S.camps;
  if (zoneLayer) { map.removeLayer(zoneLayer); zoneLayer = null; }
  const g = L.layerGroup();
  let any = false;
  for (const id of checkedSpeciesIds()) {
    const hex = speciesLayerHex(id);
    for (const key of speciesCampSet(id)) {
      const grp = campGroupByKey(key);
      if (!grp || !grp.pts.length) continue;
      addCampZone(g, grp.pts, hex);
      any = true;
    }
  }
  if (any) zoneLayer = g.addTo(map);
}

export {
  ensureSpeciesOn, toggleSpecies, checkedSpeciesIds, applySpeciesTokens,
  speciesCampWinner, renderSpeciesZones,
};
