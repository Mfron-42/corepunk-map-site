/* Kwalat — restauration d'état (chargement initial ET popstate) : relit le
   hash et republie l'UI complète — carte active, caméra, filtres, fiche,
   réticule, ping. Seul module « orchestrateur » avec main.js. */
import { S } from './state.js';
import { readHash } from './urlstate.js';
import { switchMap } from './multimap.js';
import { map, toLL, worldBounds, denseRenderers, toggleZones } from './mapview.js';
import { setLocator, clearLocator, setPing, clearPing } from './pins.js';
import {
  closeFiche, openQuestFiche, openItemFiche, openNpcFiche,
  openCampFiche, openMonsterFiche,
} from './fiches.js';
import { buildFilters } from './sidebar.js';
import { whenDeferred, deferredReady } from './data.js';

/* ── Restauration d'état (chargement ET popstate) ──────────────
   Fonction UNIQUE qui relit le hash et republie l'UI : caméra, fiche
   ouverte, réticule, ping, filtres — factorisée depuis ce que init() faisait
   avant (dupliqué entre le chargement initial et nulle part ailleurs, faute
   d'écouteur popstate). Appelée une fois à la fin de init() et à chaque
   `popstate` (voir plus bas). `S.restoring` évite qu'un appel ici ne
   redéclenche lui-même une entrée d'historique (aucune des fonctions
   utilisées ci-dessous ne pousse — elles ne font que muter l'état +
   replaceState synchrone — mais le drapeau reste posé en défense en
   profondeur, cf. pushFocusState()).
   Priorité caméra : réticule (`at`) > fiche à position canonique connue
   (quête/PNJ) si aucune vue explicite > vue explicite (`x`/`z`/`zm`) >
   fitBounds(monde). `map.setView` uniquement (jamais `flyTo`) : une
   restauration doit être instantanée et déterministe, y compris sous des
   appuis Précédent/Suivant rapprochés (mobile notamment). */
async function applyLocationState() {
  S.restoring = true;
  const { view, onSet, ping, quest, camp, item, npc, monster, at, atl, map: mapId } = readHash();

  // Multi-cartes : basculer sur la carte du hash AVANT de restaurer x/z/fiche
  // (map=<id> absent ⇒ Kwalat). switchMap est silencieux ici (pas de réécriture
  // de hash, pas de recadrage caméra : la vue est posée juste après). readHash
  // vient de basculer CATS[*].on ; switchMap→buildFilters les répercutera.
  if (mapId && S.maps[mapId] && mapId !== S.map) {
    await switchMap(mapId, { keepView: true, silent: true });
  } else if ((!mapId || mapId === 'Kwalat') && S.map !== 'Kwalat' && S.maps.Kwalat) {
    await switchMap('Kwalat', { keepView: true, silent: true });
  }

  // Caméra EN PREMIER, avant tout rendu de couche dense : Leaflet exige une
  // vue déjà posée (setView/fitBounds) avant que map.getZoom()/map.project()
  // ne soient valides — un ordre inversé fait planter le tout premier rendu
  // ("Set map center and zoom first"). Toujours établir une base sûre (vue
  // explicite sinon le monde entier), PUIS appliquer une éventuelle
  // surcharge (réticule, sinon fiche à position canonique connue) — jamais
  // l'inverse, pour que map.getZoom() soit toujours défini quand ces
  // branches le lisent comme plancher de zoom. Le niveau de zoom vient
  // toujours du hash restauré lui-même (jamais un Math.max avec le zoom
  // *avant* restauration) : une restauration doit être déterministe,
  // indépendante de l'état de la carte juste avant Précédent/Suivant.
  if (view) map.setView(toLL(view.x, view.z), view.zm);
  else map.fitBounds(worldBounds);
  if (at) {
    map.setView(toLL(at.x, at.z), view ? view.zm : 3);
  } else if (!view && quest && S.quests.has(quest) && S.quests.get(quest).x != null) {
    const q = S.quests.get(quest);
    map.setView(toLL(q.x, q.z), Math.max(map.getZoom(), 2.5));
  } else if (!view && npc && S.data.npc[+npc]) {
    const r = S.data.npc[+npc];
    map.setView(toLL(r.x, r.z), Math.max(map.getZoom(), 2.5));
  }

  // Filtres : CATS[*].on / S.zonesOn ont déjà été basculés en effet de bord
  // par readHash() ci-dessus ; on ne fait ici que répercuter ça sur la carte
  // (couches denses + calque régions) et sur les cases à cocher du panneau.
  toggleZones(S.zonesOn);
  const applyCampFilters = () => {
    if (onSet) for (const k of Object.keys(S.camps)) S.camps[k].on = onSet.has('camp.' + k);
    denseRenderers.forEach(fn => fn());
  };
  if (deferredReady) applyCampFilters(); else whenDeferred(applyCampFilters);
  // Décor (S.decor) : contrairement aux camps, toujours prêt ici (chests
  // fait partie du chemin critique / de la bascule de carte ci-dessus,
  // jamais du chargement différé) — pas de garde whenDeferred.
  if (onSet) for (const f of Object.keys(S.decor)) S.decor[f].on = onSet.has('decor.' + f);
  denseRenderers.forEach(fn => fn());
  buildFilters();

  // Fiche : ferme celle en cours puis rouvre celle du hash, s'il y en a une.
  // quest/item/npc sont immédiats (données déjà chargées à ce stade) ; camp
  // et monster attendent camp_details.json/monsters.json (chargement
  // différé) comme au chargement initial.
  closeFiche();
  if (quest && S.quests.has(quest)) openQuestFiche(quest);
  else if (item && S.items[item]) openItemFiche(item);
  else if (npc && S.data.npc[+npc]) openNpcFiche(+npc);
  else whenDeferred(() => {
    // openCampFiche n'exige plus de fiche détaillée (contenants typés sans
    // camp_details) : il vérifie lui-même que le camp existe sur la carte.
    if (camp) openCampFiche(camp);
    else if (monster && S.monsters[monster]) openMonsterFiche(monster);
  });

  // Réticule + ping.
  if (at) setLocator(at.x, at.z, atl); else clearLocator();
  if (ping) { const [px, pz] = ping.split(',').map(Number); if (!isNaN(px)) setPing(px, pz); }
  else clearPing();

  S.restoring = false;
}

export { applyLocationState };
