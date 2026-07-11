/* Kwalat — couches ESPÈCE (#82 chunk (d), modèle « l'arbre EST le
   bestiaire », décision utilisateur 2026-07-11) : l'espèce est le grain le
   plus fin de l'arbre Monstres & faune (sous-ligne d'un nœud famille,
   sidebar.js buildSpeciesSublist). Cocher une espèce allume les POINTS de
   ses camps (compositeur main.js, priorité espèce > famille > kind), ET
   RIEN D'AUTRE. L'ancien concept « filtre épinglé » (liste séparée,
   plafond, ✕, hash `pf=`) est RETIRÉ : une espèce cochée est une case de
   l'arbre comme une autre — dédoublonnage/retrait = la case, hash
   `on=monsp.<speciesId>` (urlstate.js).

   SCOPE ADDITION (2026-07-11, retour utilisateur « points only, no zones ») :
   la couche ZONE par camp (enveloppe convexe/cercle deviné autour de chaque
   camp d'une espèce ou famille cochée, langage visuel « zone ESTIMÉE » —
   même style tireté que fiches.js drawGoalZone estimate:true) est RETIRÉE.
   Elle scattérait un contour par camp sur TOUTE la carte dès qu'une espèce
   commune (ex. une famille répandue) était cochée — le rapport « il me
   montre toujours des points au pif » pointe précisément ce bruit visuel.
   La machinerie de zone GÉNÉRIQUE (drawGoalZone/convexHull-équivalent pour
   les objectifs de quête, fiches.js) reste intacte et INCHANGÉE ailleurs
   dans le code — seul CE module (le hull par camp spécifique aux
   sélections espèce/famille) est retiré, son seul usage. `renderSpeciesZones`
   et son implémentation (convexHull/addCampZone/SPECIES_ZONE_STYLE) n'ont
   donc plus aucun appelant (sidebar.js/main.js ne l'importent plus) et sont
   supprimés avec elle, plutôt que laissés en code mort.

   L'état vit dans S.monsp (state.js, même discipline que S.monfam) ; la
   résolution de points passe par le résolveur UNIQUE js/pointsets.js —
   jamais re-dérivée ici. Ce module ne possède plus que : les helpers d'état
   partagés et le sélecteur du compositeur. */
import { S } from './state.js';
import { speciesLayerHex, familyKey } from './config.js';
import { speciesCampSet } from './pointsets.js';
import { isHiddenTest } from './devcontent.js';

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

/* CASCADE famille → espèces (IA finale du panneau, décision utilisateur
   2026-07-11 : « quand je coche une category parent ça coche tous les
   enfants ») : cocher une ligne famille coche AUSSI toutes ses espèces
   (post-alias familyKey, même filtre isHiddenTest que l'arbre) ; décocher
   décoche tout. L'état famille (S.monfam) reste une vraie couche du
   compositeur (couleur famille — elle ne s'affiche plus que sur les camps
   qu'aucune espèce cochée ne recouvre, priorité espèce > famille inchangée) ;
   un lien LEGACY `on=monfam.<f>` sans tokens monsp.* restaure donc toujours
   l'ancien rendu « couleur famille partout » à l'identique. Partagé par la
   case famille de l'arbre (sidebar.js) ET le chip d'étape de quête à portée
   famille (main.js activateFamilyLayers) — un seul point de vérité, jamais
   deux cascades divergentes. */
function setFamilyOn(family, on) {
  const fam = familyKey(family);
  (S.monfam[fam] || (S.monfam[fam] = { on: false })).on = on;
  for (const [id, sp] of Object.entries(S.species || {})) {
    if (isHiddenTest(sp)) continue;
    if (familyKey(sp.family || 'other') !== fam) continue;
    (S.monsp[id] || (S.monsp[id] = { on: false })).on = on;
  }
}

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

export {
  ensureSpeciesOn, toggleSpecies, checkedSpeciesIds, applySpeciesTokens,
  speciesCampWinner, setFamilyOn,
};
