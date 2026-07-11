/* Kwalat — état applicatif unique (S) + persistance localStorage.
   S.lang ne fait que refléter LANG (résolu par js/i18n/index.js). */
import { LANG } from './i18n/index.js';

const LS = { tracked: 'cpmap_tracked', done: 'cpmap_done', sections: 'cpmap_sections' };

/* Lecture synchrone du hash pour `devcontent` (feature #13 — contenu isTest
   masqué par défaut) : même principe que LANG ci-dessus (i18n/index.js
   detectInitialLang), résolu une fois AVANT que buildSearch()/buildBestiary()
   ne tournent au boot (main.js init()). Sans ça, un lien partagé avec le tag
   déjà révélé perdrait la course avec urlstate.js readHash() (qui ne
   s'exécute qu'à la toute fin de applyLocationState()) : la recherche/le
   bestiaire se construiraient une première fois avec S.devOn encore à son
   défaut `false`, et resteraient figés ainsi (voir js/devcontent.js pour le
   reste du filtre, main.js buildDevToggle() pour le bouton). readHash()
   reprend la même clé à chaque navigation ultérieure (popstate) — ce
   lecteur-ci ne sert qu'à l'état initial. */
function initialDevOn() {
  try {
    const p = new URLSearchParams(location.hash.replace(/^#/, ''));
    return (p.get('on') || '').split(',').includes('devcontent');
  } catch (e) { return false; }
}

/* ── État ───────────────────────────────────────────────────── */
const S = {
  lang: LANG,               // code langue actif (fr/en — résolu par site/js/i18n.js)
  data: {},                 // jeux de données chargés
  quests: new Map(),        // slug -> quête
  tracked: JSON.parse(localStorage.getItem(LS.tracked) || '[]'),
  done: new Set(JSON.parse(localStorage.getItem(LS.done) || '[]')),
  camps: {},                // kind -> {on, points, group}
  decor: {},                // famille décor (barrel/boxes/furniture/corpse/books/misc/legacy)
                            // -> {on, count} — sous-couches "Décor" (chests.bin group="decor"|
                            // "legacy_chest", toutes OFF par défaut), voir data.js
                            // buildDecorGroups() et js/sidebar.js buildDecorGroup()
  monfam: {},               // famille de monstre (post-alias, ex. "imp") -> {on} — sous-couches
                            // « Par famille » (#82 chunk (b)), toutes OFF par défaut. SEUL l'état
                            // on/off vit ici (global, survit à la bascule de carte) ; camps/points
                            // se résolvent à la volée (js/pointsets.js familyCampSet — une famille
                            // sans camp joint sur la carte active n'a ni ligne ni points, l'état
                            // reste). Hash `on=monfam.<famille>` — voir sidebar.js
                            // buildMonsterFamilyGroup, main.js compositeCampPoints, urlstate.js
                            // buildHash, router.js applyLocationState.
  investLayer: null,        // fil d'enquête (fiche quête)
  campDetails: {},          // clé de camp -> {mobs, drops}
  lootTableContents: {},    // libellé de table -> [{key,name,icon,w,c,g,ch}], table COMPLÈTE
                            // (site/data/<lang>/loot_table_contents.bin, voir data.js lootTableItems —
                            // remplace l'ancienne inversion de items.*.drops, tronquée/incomplète
                            // pour toute table partagée par plus d'items que le cap dropped_in)
  zonesGeo: [],             // polygones des régions nommées
  zonesQuest: {},           // slug -> anneaux de la zone de quête
  zonesOn: false,
  zoneLayer: null,          // couche régions (filtre Zones)
  questZoneLayer: null,     // surlignage zone de la fiche quête
  items: {},                // clé d'item -> fiche (base de données objets)
  rarityGroups: new Map(),  // repKey -> {baseName, variants:{Rareté: clé}} (voir rarity.js)
  rarityGroupOf: new Map(), // clé d'item (représentant compris) -> repKey
  recipes: {},              // clé de recette -> {name, icon, output, ingredients}
  vendors: {},              // clé de vendeur -> {name, npcs, sells}
  monsters: {},             // clé de monstre (variante représentative) -> fiche
  monsterModels: {},        // clé de modèle -> {name, family?, canonicalSiteKey?, levels:[{level,tier?,siteKey}]}
                            // (site/data/<lang>/monster_models.bin, feature #12 — voir data.js loadDeferred
                            // et js/fiches.js openMonsterFiche « fiche modèle + sélecteur de variante »)
  species: {},              // clé d'espèce -> {name, namesAll, family?, models, levelMin?, levelMax?,
                            // canonicalSiteKey?, spawns:[{siteKey,name,level,rawKeys,isTest?}]}
                            // (site/data/<lang>/species.bin, task #80 — voir data.js loadDeferred,
                            // js/sidebar.js buildBestiary, js/search.js buildMonsterSearchIndex,
                            // js/fiches.js monsterVariantPickHtml/monsterKeyFor)
  devOn: initialDevOn(),    // révèle le contenu isTest (monstres/items/objets de quête/quêtes, feature #13)
                            // — masqué par défaut, voir js/devcontent.js + main.js buildDevToggle()
  nodes: {},                // clé gn_* -> {name, tier, prof, generic?, aliases?, drops?}
                            // (site/data/<lang>/nodes.bin, #81 — voir data.js loadDeferred,
                            // js/fiches.js openNodeFiche/nodeChip, js/search.js buildNodeSearchIndex).
                            // PAS de position/pin : le lien nœud->point de carte n'existe pas
                            // côté client (byte-prouvé) -- fiche/recherche seulement, jamais une couche.
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
