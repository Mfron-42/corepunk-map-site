/* Kwalat — multi-cartes : manifeste (maps.json), bascule de carte
   (switchMap), chargement paresseux + cache des bundles par carte, et
   sélecteur du panneau. Ne connaît aucune vue : à chaque bascule, il
   rejoue les hooks posés par main.js (fiches/recherche/filtres/couches). */
import { S } from './state.js';
import { KWALAT_DEFAULTS, mapName } from './config.js';
import { fetchJson, dataPath, buildDecorGroups } from './data.js';
import {
  map, worldBounds, setActiveMap, applyMapGeometry, denseRenderers,
} from './mapview.js';
import { syncHash, pushFocusState } from './urlstate.js';
import { tr } from './i18n/index.js';
import { $ } from './utils.js';

/* Hooks de rebranchement UI, posés par main.js (onMapSwitch). */
const mapSwitchHooks = [];
function onMapSwitch(fn) { mapSwitchHooks.push(fn); }

/* ── Multi-cartes (vague C) ─────────────────────────────────────
   Le manifeste maps.json (chargé au boot) alimente le sélecteur + le
   transform. Les DONNÉES de marqueurs de chaque carte non-Kwalat vivent dans
   site/data/<lang>/<mapId>/*.bin, chargées PARESSEUSEMENT à la première
   bascule et mises en cache. Kwalat garde ses données à la racine (chargées
   au boot par loadCritical/loadDeferred). Les catalogues GLOBAUX (objets,
   monstres, capacités, lore, événements) sont indépendants de la carte et
   restent partagés — jamais rechargés en changeant de carte. Les régions
   (zones_geo) sont propres à Kwalat : vides ailleurs. */
/* Instantané des données PROPRES à la carte courante (marqueurs + quêtes +
   camps + régions) — les catalogues globaux n'en font pas partie. */
function captureMapState() {
  return {
    data: S.data, quests: S.quests, camps: S.camps, decor: S.decor,
    zonesGeo: S.zonesGeo, zonesQuest: S.zonesQuest,
  };
}
function applyMapState(s) {
  S.data = s.data; S.quests = s.quests; S.camps = s.camps; S.decor = s.decor || {};
  S.zonesGeo = s.zonesGeo; S.zonesQuest = s.zonesQuest;
}

/* Charge (ou restaure depuis le cache) les données de marqueurs d'une carte.
   Kwalat : déjà en mémoire (loadCritical) — capturé tel quel. Autres : fetch
   du bundle par carte, 404-tolérant (petites cartes n'ont pas tous les
   fichiers). Les camps arrivent avec le bundle (pas de chargement différé
   séparé, contrairement à Kwalat). */
async function loadMapData(mid) {
  if (S.mapCache[mid]) { applyMapState(S.mapCache[mid]); return; }
  if (mid === 'Kwalat') {                      // déjà chargé au boot
    S.mapCache.Kwalat = captureMapState();
    return;
  }
  const base = `data/${S.lang}/${mid}/`;
  // Ne demande QUE les fichiers réellement présents (manifeste `files`) — pas de
  // 404 pour une catégorie absente de cette carte (ex. Extraction sans ateliers).
  const has = new Set((S.maps[mid] && S.maps[mid].files) || []);
  const get = name => has.has(name) ? fetchJson(base + name + '.bin').catch(() => []) : Promise.resolve([]);
  // searchable_chests : Kwalat-only aujourd'hui (voir  §2),
  // mais lu ici comme n'importe quel autre fichier optionnel par carte —
  // rien de spécial à faire le jour où une autre carte en publie un.
  const [npcs, quests, qao, workshops, chests, searchableChests, camps] = await Promise.all([
    get('npcs'), get('quests'), get('quest_objects'),
    get('workshops'), get('chests'), get('searchable_chests'), get('camps'),
  ]);
  const qmap = new Map();
  quests.forEach(q => qmap.set(q.slug, q));
  const campsState = {};
  camps.forEach(g => {
    const k = g.kind;
    if (!campsState[k]) campsState[k] = { on: false, points: [], groups: [] };
    campsState[k].groups.push(g);
    g.pts.forEach(pt => campsState[k].points.push({ x: pt[0], z: pt[1], g }));
  });
  const snap = {
    data: { npc: npcs, poi: [], quest: quests, qao, workshop: workshops, chest: chests, searchable_chest: searchableChests },
    quests: qmap, camps: campsState, decor: buildDecorGroups(chests), zonesGeo: [], zonesQuest: {},
  };
  S.mapCache[mid] = snap;
  applyMapState(snap);
}

/* Bascule de carte : recadre le transform (via activeMap), recrée la couche
   de tuiles (nouveau tile_path + maxNativeZoom), recharge paresseusement les
   marqueurs de la carte, redessine tout. `opts.keepView` = ne pas recadrer la
   caméra (restauration par lien profond / résultat cross-carte, qui pose sa
   propre vue ensuite). Pendant S.restoring, on ne réécrit pas le hash. */
let switching = false;
async function switchMap(mid, opts = {}) {
  if (switching || !S.maps[mid] || mid === S.map) return;
  switching = true;
  try {
    if (!S.mapCache[S.map]) S.mapCache[S.map] = captureMapState();
    S.map = mid;
    setActiveMap(S.maps[mid]);
    await loadMapData(mid);
    // Transform + bornes recalés sur la nouvelle carte (mapview possède la
    // géométrie), puis rebranchement UI via les hooks posés par main.js
    // (fiches/recherche/filtres/couches — switchMap ne connaît aucune vue).
    applyMapGeometry();
    mapSwitchHooks.forEach(fn => fn());
    updateMapSelectorValue();
    // Recadrer, SAUF si l'appelant restaure sa propre vue (keepView) — MAIS si
    // la carte n'a encore aucune vue (lien profond map= au démarrage à froid),
    // en poser une d'office : les couches denses projettent via map.getZoom(),
    // qui exige une vue établie (sinon « Set map center and zoom first »). La
    // vue réelle du hash est ensuite reposée par applyLocationState.
    if (!opts.keepView || !map._loaded) map.fitBounds(worldBounds);
    denseRenderers.forEach(fn => fn());
    if (!S.restoring && !opts.silent) syncHash();
  } finally {
    switching = false;
  }
}
/* ── Sélecteur de carte (vague C) ────────────────────────────── */
/* Charge le manifeste léger (maps.json) + l'index cross-carte (search_index)
   pour la langue courante, puis (re)construit le sélecteur. 404-tolérant :
   sans manifeste, le site reste mono-carte Kwalat (activeMap garde ses défauts,
   sélecteur masqué). Ré-appelable au changement de langue (données par langue). */
async function loadMapManifest() {
  try {
    const mf = await fetchJson(dataPath('maps.json'));
    S.maps = mf.maps || {};
    S.mapOrder = mf.order && mf.order.length ? mf.order : Object.keys(S.maps);
    if (S.maps[S.map]) setActiveMap(S.maps[S.map]);
    else if (S.maps.Kwalat) { S.map = 'Kwalat'; setActiveMap(S.maps.Kwalat); }
  } catch (e) {
    S.maps = {}; S.mapOrder = [];
  }
  S.crossIndex = await fetchJson(dataPath('search_index.bin')).catch(() => []);
  buildMapSelector();
}

/* Groupes du sélecteur (optgroups), dans l'ordre du manifeste par type. */
const _MAP_GROUP = { world: 'mapGroupWorld', extraction: 'mapGroupExtraction',
  battleground: 'mapGroupBattleground', pve_arena: 'mapGroupPve',
  pvp_arena: 'mapGroupPvp', lobby: 'mapGroupOther' };
let _mapSelectWired = false;
function buildMapSelector() {
  const select = $('#map-select');
  if (!select) return;
  const wrap = select.closest('.map-switch');
  const ids = S.mapOrder.filter(id => S.maps[id]);
  // Un seul carte connue (Kwalat) ⇒ pas de sélecteur (mono-carte, rien à basculer).
  if (wrap) wrap.hidden = ids.length <= 1;
  if (ids.length <= 1) return;
  select.setAttribute('aria-label', tr('mapSelectorLabel'));
  select.innerHTML = '';
  let curGroup = null, groupEl = null;
  for (const id of ids) {
    const m = S.maps[id];
    const g = m.type || 'lobby';
    if (g !== curGroup) {
      curGroup = g;
      groupEl = document.createElement('optgroup');
      groupEl.label = tr(_MAP_GROUP[g] || 'mapGroupOther');
      select.appendChild(groupEl);
    }
    const opt = document.createElement('option');
    opt.value = id;
    // Une carte sans pins fiables (tiles_only) est signalée discrètement.
    const approx = m.frame_status === 'tiles_only' ? ` ${tr('mapTilesOnlySuffix')}` : '';
    opt.textContent = mapName(id) + approx;
    if (id === S.map) opt.selected = true;
    groupEl.appendChild(opt);
  }
  if (!_mapSelectWired) {
    select.addEventListener('change', e => { pushFocusState(); switchMap(e.target.value); });
    _mapSelectWired = true;
  }
}
function updateMapSelectorValue() {
  const select = $('#map-select');
  if (select && select.value !== S.map) select.value = S.map;
}

/* Bascule complète de langue (main.setLang) : les bundles par carte sont
   propres à la langue (data/<lang>/<mapId>/) — vider le cache, recharger le
   manifeste + l'index cross-carte, puis recharger les données de la carte
   active dans la nouvelle langue (loadCritical n'a rechargé que Kwalat racine). */
async function reloadActiveMapForLang() {
  S.mapCache = {};
  await loadMapManifest();
  S.mapCache.Kwalat = captureMapState();
  if (S.map !== 'Kwalat' && S.maps[S.map]) {
    setActiveMap(S.maps[S.map]);
    await loadMapData(S.map);
  } else {
    S.map = 'Kwalat';
    setActiveMap(S.maps.Kwalat || KWALAT_DEFAULTS);
  }
}

export { switchMap, loadMapManifest, onMapSwitch, reloadActiveMapForLang };
