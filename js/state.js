/* Kwalat — état applicatif unique (S) + persistance localStorage.
   S.lang ne fait que refléter LANG (résolu par js/i18n/index.js). */
import { LANG } from './i18n/index.js';

const LS = { tracked: 'cpmap_tracked', done: 'cpmap_done', filters: 'cpmap_filters' };
/* ── État ───────────────────────────────────────────────────── */
const S = {
  lang: LANG,               // code langue actif (fr/en — résolu par site/js/i18n.js)
  data: {},                 // jeux de données chargés
  quests: new Map(),        // slug -> quête
  tracked: JSON.parse(localStorage.getItem(LS.tracked) || '[]'),
  done: new Set(JSON.parse(localStorage.getItem(LS.done) || '[]')),
  camps: {},                // kind -> {on, points, group}
  ping: null,
  investLayer: null,        // fil d'enquête (fiche quête)
  campDetails: {},          // clé de camp -> {mobs, drops}
  zonesGeo: [],             // polygones des régions nommées
  zonesQuest: {},           // slug -> anneaux de la zone de quête
  zonesOn: false,
  zoneLayer: null,          // couche régions (filtre Zones)
  questZoneLayer: null,     // surlignage zone de la fiche quête
  items: {},                // clé d'item -> fiche (base de données objets)
  recipes: {},              // clé de recette -> {name, icon, output, ingredients}
  vendors: {},              // clé de vendeur -> {name, npcs, sells}
  monsters: {},             // clé de monstre (variante représentative) -> fiche
  locations: [],            // bestiaire/lore (MapMarkers.xml), index = id de recherche/fiche
  abilities: {},            // clé de capacité (nommées seulement) -> fiche
  events: [],               // événements de monde nommés
  openFiche: null,          // {kind, id} de la fiche ouverte (rafraîchie si les
                            // données différées arrivent pendant qu'elle est ouverte)
  locator: null,            // miroir plat du réticule ambré {x,z,label}, lu par buildHash()
  restoring: false,         // vrai pendant applyLocationState() — garde anti-boucle (pushFocusState)
  // ── Multi-cartes (vague C) ──
  map: 'Kwalat',            // id de la carte active
  maps: {},                 // manifeste (site/data/<lang>/maps.json) : id -> géométrie légère
  mapOrder: [],             // ordre d'affichage du sélecteur
  crossIndex: [],           // index de recherche cross-carte (search_index.bin) : toutes cartes
  mapCache: {},             // id de carte -> données de marqueurs déjà chargées (lazy + cache)
};
const save = () => {
  localStorage.setItem(LS.tracked, JSON.stringify(S.tracked));
  localStorage.setItem(LS.done, JSON.stringify([...S.done]));
};
export { S, LS, save };
