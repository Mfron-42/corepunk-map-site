/* Kwalat — orchestration PARTAGÉE du clic-double-effet (#82 chunk (d),
   décision utilisateur « l'arbre EST le bestiaire ») : coche un nœud
   ESPÈCE/FAMILLE de l'arbre de gauche + le révèle (ouvre les <details>
   ancêtres, flash, scroll — jamais de flyTo, le geste caméra reste
   goto/zone), republication complète (arbre + compositeur de points + hash).

   UN SEUL point de composition, consommé par main.js (chips d'entité DANS
   une fiche — quête/objet/camp…) ET js/search.js (résultats de recherche
   espèce/famille, mission "search activation" 2026-07-11) — jamais deux
   orchestrations divergentes du même geste. Extrait de main.js (qui
   définissait ces deux fonctions localement, seul consommateur jusqu'ici) :
   main.js n'exporte jamais rien (« aucune logique métier propre », voir son
   en-tête) et search.js aurait sinon dû re-dériver une copie du même geste
   — interdit par la même discipline que le résolveur de points UNIQUE
   (COORDINATION.md, pointsets.js).

   Module d'ORCHESTRATION pur : ne réimplémente RIEN de la machinerie de
   l'arbre elle-même (specieslayer.js/sidebar.js, INCHANGÉS) — compose
   seulement leurs primitives déjà exportées. */
import { ensureSpeciesOn, setFamilyOn } from './specieslayer.js';
import { buildFilters, revealMonsterNode } from './sidebar.js';
import { scheduleRedraw } from './mapview.js';
import { syncHash } from './urlstate.js';

/* Espèce cochable (id = clé S.species, y compris les tokens WILD partagés
   par les espèces de faune/creeps sans record species.bin — voir
   pointsets.js speciesCampSet/wildSpeciesIndex, même espace de noms) : la
   couche vit au grain ESPÈCE (référence canonique, priorité MAXIMALE du
   compositeur — espèce > famille > kind). ENSURE (jamais un toggle — le
   décochage appartient à la case de l'arbre, voir specieslayer.js
   ensureSpeciesOn) : re-cliquer un chip/résultat déjà coché re-révèle
   simplement la ligne, jamais un doublon. */
function activateSpeciesLayer(spId) {
  ensureSpeciesOn(spId);
  buildFilters();                       // la sous-ligne espèce apparaît (famille auto-dépliée)
  scheduleRedraw();                     // compositeur (points) — priorité espèce, POINTS SEULS
  syncHash();                           // `on=monsp.<id>` (lien partageable)
  revealMonsterNode('species', spId);
}
/* Famille(s) cochable(s) — grain 2 de l'échelle de précision (espèce >
   famille > zone/camp > inconnu, COORDINATION.md). CASCADE (IA finale) :
   cocher une famille coche AUSSI toutes ses espèces (setFamilyOn,
   specieslayer.js) — exactement le même geste que la case famille de
   l'arbre ou le chip family-layer d'une étape de quête, jamais une
   troisième sémantique divergente. */
function activateFamilyLayers(fams) {
  let first = null;
  for (const f of fams) {
    if (!f) continue;
    setFamilyOn(f, true);
    if (!first) first = f;
  }
  if (!first) return;
  buildFilters();
  scheduleRedraw();
  syncHash();
  revealMonsterNode('family', first);
}

export { activateSpeciesLayer, activateFamilyLayers };
