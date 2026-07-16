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
   (, pointsets.js).

   Module d'ORCHESTRATION pur : ne réimplémente RIEN de la machinerie de
   l'arbre elle-même (specieslayer.js/sidebar.js, INCHANGÉS) — compose
   seulement leurs primitives déjà exportées. */
import { ensureSpeciesOn, setFamilyOn } from './specieslayer.js';
import { buildFilters, revealMonsterNode, revealNode, categoryInputSelector } from './sidebar.js';
import { scheduleRedraw } from './mapview.js';
import { syncHash } from './urlstate.js';
import { S } from './state.js';
import { isSpeciesException, speciesPoints } from './pointsets.js';

/* Espèce activable (id = clé S.species, y compris les tokens WILD partagés
   par les espèces de faune/creeps sans record species.bin — voir
   pointsets.js speciesCampSet/wildSpeciesIndex, même espace de noms).
   GRAIN (arbre Option A+, décision ratifiée 2026-07-14) : une espèce
   catalogue NON-exceptionnelle — ses camps résolus sont EXACTEMENT ceux de
   sa famille, critère calculé pointsets.js isSpeciesException — active la
   FAMILLE (setFamilyOn, le même état partagé que la case famille de
   l'arbre) : « plus de mensonge par-espèce » — activer « Imp witch » ou
   « Imp executioner » allumait déjà byte-identiquement les mêmes camps,
   seul l'affichage prétendait le contraire. Une espèce EXCEPTION (camps
   propres prouvés — boss/scission de camps, ex. werewolf sur l'île) ou un
   token wild garde le grain espèce historique (ensureSpeciesOn, ligne
   propre dans l'arbre). Une espèce 0-camp (rien à dessiner) garde aussi
   l'ENSURE espèce historique : aucune couche ne s'allume, mais on ne
   propage jamais l'activation à une famille que la donnée ne justifie pas.
   ENSURE (jamais un toggle — le décochage appartient à la case de l'arbre) :
   re-cliquer un chip/résultat déjà actif re-révèle simplement la ligne. */
function activateSpeciesLayer(spId) {
  const sp = S.species?.[spId];
  if (sp && !isSpeciesException(spId) && speciesPoints(spId)) {
    activateFamilyLayers([sp.family || 'other']);
    return;
  }
  ensureSpeciesOn(spId);
  buildFilters();                       // la sous-ligne espèce (exception) apparaît
  scheduleRedraw();                     // compositeur (points) — priorité espèce, POINTS SEULS
  syncHash();                           // `on=monsp.<id>` (lien partageable)
  revealMonsterNode('species', spId);
}
/* Famille(s) cochable(s) — grain 2 de l'échelle de précision (espèce >
   famille > zone/camp > inconnu, ). CASCADE (IA finale) :
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

/* Nœud GÉNÉRIQUE de l'arbre de filtres (mission "search categories"
   2026-07-11c — kind de camp/décor/type de POI/bucket Interactables…) :
   contrairement à activateSpeciesLayer/activateFamilyLayers ci-dessus (qui
   mutent l'état S.* directement puis republient l'arbre), CE geste-ci
   réutilise la case RÉELLE de la ligne — `.click()` NATIF sur son <input>,
   jamais un `checked=true` + Event('change') fabriqué à la main : ça
   déclenche la cascade EXACTE d'un clic utilisateur (toggle de couche,
   cascade de sous-groupe/famille, scheduleRedraw, syncHash, republication
   de l'arbre) sans qu'AUCUNE règle de cascade ne soit réimplémentée ici —
   toute la machinerie reste dans sidebar.js, intacte.

   `kind`: 'row' (ligne filterRow simple, sélecteur par data-fkey) ou
   'bucket' (sous-groupe à pastille — POI/Coffres/Destructibles/…,
   sélecteur par data-subgroup + .subgrp-check). Résolu PAR CLÉ AU MOMENT
   DU CLIC — jamais une référence DOM capturée à l'indexation (sidebar.js
   peut avoir reconstruit l'arbre entretemps, ex. arrivée de camps.bin ou
   changement de langue) : même exigence que sidebar.js activeTagInput()/
   buildTagEl() pour le bandeau de légende — la résolution est désormais la
   fonction PARTAGÉE categoryInputSelector, importée de sidebar.js (source
   unique) ; data-fkey/data-subgroup/.subgrp-check sont le contrat DOM stable
   déjà documenté par filterRow/buildSubGroup elles-mêmes.

   ENSURE-only (jamais un toggle, même discipline qu'activateSpeciesLayer) :
   re-cliquer un résultat déjà coché re-révèle simplement la ligne. */
/* Révèle la ligne/le bucket fraîchement (re)ciblé : RÉSOUT le nœud (sélecteurs
   propres à cet arbre — data-fkey/subgroup, distincts des data-species/data-fam
   de sidebar.revealMonsterNode) puis délègue l'ouverture des <details> ancêtres,
   le flash et le scroll au revealNode PARTAGÉ de sidebar.js (le tail identique,
   jadis dupliqué ici, garantit toujours que l'ouverture programmatique de
   <details> déclenche le 'toggle' natif → subOpen/localStorage restent
   synchrones). Aucun mouvement caméra (le geste caméra reste goto/zone). */
function revealCategoryNode(kind, key) {
  const target = kind === 'bucket'
    ? document.querySelector(`#filters details.decor-group[data-subgroup="${CSS.escape(key)}"] summary`)
    : document.querySelector(`#filters li[data-fkey="${CSS.escape(key)}"] .filter-row`);
  revealNode(target);
}
function activateCategoryNode(kind, key) {
  const input = categoryInputSelector(kind, key);
  if (!input) return;
  // .click() natif (pas .checked=true + dispatchEvent) : simule un VRAI
  // clic utilisateur -- toggle + 'change' + tout listener 'click' propre à
  // la ligne (ex. wireParentCheck's stopPropagation d'un bucket) se
  // déclenchent exactement comme si l'utilisateur avait cliqué la case
  // lui-même. Sauté si déjà coché (ENSURE-only, jamais un dé-cochage).
  if (!input.checked) input.click();
  revealCategoryNode(kind, key);
}

export { activateSpeciesLayer, activateFamilyLayers, activateCategoryNode };
