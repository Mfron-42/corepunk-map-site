/* Kwalat — fiches (drawer de détail) : BARREL.
   fiches.js n'est plus le monolithe : c'est une façade mince (strangler) qui
   ré-exporte EXACTEMENT les mêmes symboles publics qu'avant, depuis la famille
   fiches/*.js issue du découpage (vague E'c-S). Tout module qui faisait
   `import { … } from './fiches.js'` continue de fonctionner sans changement.
   Répartition : core (briques partagées + zones), stepguide (guide d'étapes),
   quest, entity (monstre/famille/faune/PNJ/camp), item (objet/recette/butin/
   nœud/capacité), world (coffres/lore). Aucun changement de comportement :
   rendu byte-identique, gaté par  */
export { closeFiche, itemColor, viewGoalZone, viewMonsterZone, drawNamedZone } from './fiches/core.js';
export { openQuestFiche, flyToQuestZone } from './fiches/quest.js';
export { openMonsterFiche, openFamilyFiche, openWildlifeFiche, openNpcFiche, openCampFiche } from './fiches/entity.js';
export { openItemFiche, openRecipeFiche, openLootTableFiche, openNodeFiche, openAbilityFiche, setRollRarity } from './fiches/item.js';
export { openChestFiche, openSearchableChestFiche, openLocationFiche } from './fiches/world.js';
export { openRegionFiche } from './fiches/zone.js';
