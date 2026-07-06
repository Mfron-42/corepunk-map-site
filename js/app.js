/* Kwalat — carte communautaire Corepunk.
   Monde : 9600 × 7680 unités ; tuiles natives zoom 0..2 (1/2/4 px par unité).
   L'axe z du monde pointe vers le nord (haut de l'écran) : la ligne de
   pixels 0 correspond à z = 8704.
   Transform : px(zoom 2) = (x*4, (8704 - z)*4). */
'use strict';

/* ── Constantes ─────────────────────────────────────────────── */
const WORLD = { w: 9600, h: 7680 };
const MAP_TOP_Z = 8704; // z monde à la ligne de pixels 0 de la pyramide
// Les tuiles (~645 Mo) sont hébergées sur un dépôt GitHub Pages dédié,
// séparé du dépôt principal du site — republié seulement quand la pyramide
// de tuiles change (rarement), jamais à chaque mise à jour des données.
const TILE_BASE = 'https://mfron-42.github.io/corepunk-map-tiles';
const LS = { tracked: 'cpmap_tracked', done: 'cpmap_done', filters: 'cpmap_filters' };
/* Language state (persistence, URL-hash detection, <html lang>) is owned
   entirely by site/js/i18n.js (LANG / setLangCode / detectInitialLang),
   loaded before this file — S.lang just mirrors the already-resolved LANG. */

/* Tout est « dense » : chaque couche ne matérialise que ce qui est dans la
   vue courante (+ marge) et se reconstruit au déplacement — DOM+portrait
   pour PNJ/POI/ateliers (voir renderDomCulled), canvas pour les couches à
   fort volume (voir renderDense). */
/* Labels are resolved live via i18n.js (tbl()/catLabel() etc.) rather than
   stored here, so switching language never needs to rebuild these — only
   the STRUCTURAL fields (color/hex/on/dense/domIcon) live in this file; the
   token keys themselves (npc/poi/.../camp kind tokens) are the game's own
   neutral identifiers, shipped as-is regardless of language. */
const CATS = {
  npc:      { color: 'var(--c-npc)',      hex: '#e0a23f', on: true,  dense: true, domIcon: true },
  poi:      { color: 'var(--c-poi)',      hex: '#8fb4c9', on: true,  dense: true, domIcon: true },
  quest:    { color: 'var(--c-quest)',    hex: '#c77dff', on: true,  dense: true  },
  qao:      { color: 'var(--c-qao)',      hex: '#ff8fa3', on: false, dense: true  },
  workshop: { color: 'var(--c-workshop)', hex: '#4cc9f0', on: true,  dense: true, domIcon: true },
  chest:    { color: 'var(--c-chest)',    hex: '#ffd166', on: false, dense: true  },
};
const catLabel = key => tbl('cat', key) || key;
const CAMP_COLORS = {
  monsters: '#ef476f', creeps: '#f78c6b', wildlife: '#a3b18a',
  herbalism: '#80ed99', logging: '#b08968', mining: '#9ba7c0',
  searchable: '#ffd166', destroyable: '#e07a5f',
  reactive: '#06d6a0', shrines: '#bdb2ff', soulkeeper: '#7b2cbf',
  quest: '#c77dff', guards: '#778da9', other: '#6c757d',
};
const campKindLabel = key => tbl('campKind', key) || pretty(key);
const actorKindLabel = key => tbl('kind', key) || key;
/* Accent colors for the new search-only categories (monsters/zones/lore/
   abilities) added on top of the pre-existing CATS/CAMP_COLORS palette —
   monster reuses CAMP_COLORS.monsters (same creature, same color whether
   found via a camp or via its own fiche); zone reuses the existing "Zones
   (régions)" filter-row swatch (#7fc8a9, see buildFilters()) for the same
   reason. location/ability are new, chosen distinct from every existing
   swatch above (see frontend-design pass notes in the mission report). */
const MONSTER_HEX = CAMP_COLORS.monsters;
const ZONE_HEX = '#7fc8a9';
const LOCATION_HEX = '#e0c68c';
const ABILITY_HEX = '#5fa8d3';
const EVENT_HEX = '#d65db1';
const monsterAttackLabel = key => tbl('monsterAttack', key) || pretty(key);
const locationKindLabel = key => tbl('locationKind', key) || pretty(key);
const RARITY = {
  Common:   { hex: '#b9c2c8' },
  Uncommon: { hex: '#6fbf73' },
  Rare:     { hex: '#4cc9f0' },
  Epic:     { hex: '#c77dff' },
};
const rarityLabel = key => tbl('rarity', key);
const itemKindLabel = key => tbl('itemKind', key);
/* Métier (item/recette `prof`, ex. "Construction"/"Cooking") et méthode de
   dépeçage (monstre `harvestMethod`, ex. "Flayer") : tokens neutres repris
   tels quels de ConstProfession.xml (le jeu les partage entre item.prof,
   recipe.prof et le nom du "harvest tool" d'un monstre) — le site compose
   son propre libellé localisé, même principe que weaponType/campKind. */
const professionLabel = key => tbl('profession', key) || pretty(key);
const harvestMethodLabel = key => tbl('harvestMethod', key) || tbl('profession', key) || pretty(key);
/* Type d'arme (weapon.weapon_type/use_type/class — tokens moteur neutres) :
   le site compose son propre libellé localisé, même principe que
   CATS/RARITY/campKindLabel ci-dessus. Résout un nom d'arme "Gun Bom Bm 2H
   Assault" illisible en "Assault" + un sous-libellé de type séparé
   ("Pistolet · Deux mains · Bombardier"). */
const weaponTypeLabel = key => tbl('weaponType', key) || pretty(key);
const useTypeLabel = key => tbl('useType', key) || pretty(key);
const weaponClassLabel = key => tbl('weaponClass', key) || pretty(key);
function weaponTypeLine(w) {
  if (!w) return '';
  return [weaponTypeLabel(w.weapon_type), useTypeLabel(w.use_type), weaponClassLabel(w.class)]
    .filter(Boolean).join(' · ');
}
/* Objectifs de quête machine-exacts : verbe + pictogramme par type d'action.
   repair/craft/mix sont des verbes concrets à part entière (jamais "custom"/
   "Faire" en repli) — voir actionVerb() ci-dessous. */
const ACTION_META = {
  kill:    { ico: 'sword' },
  collect: { ico: 'bag' },
  use:     { ico: 'hand' },
  talk:    { ico: 'bubble' },
  goto:    { ico: 'pin' },
  deliver: { ico: 'box' },
  repair:  { ico: 'wrench' },
  craft:   { ico: 'hammer' },
  mix:     { ico: 'flask' },
  custom:  { ico: 'spark' },
};
const actionVerb = action => tbl('action', action) || tbl('action', 'custom');
const ACTION_ICON_PATHS = {
  sword: '<path d="M14.7 2.6 21 8.9l-1.4 1.4-1.1-1.1-7.6 7.6.9 2.7-1.7 1.7-2-2-3.6 3.6-1.8-.1-.1-1.8 3.6-3.6-2-2 1.7-1.7 2.7.9 7.6-7.6-1.1-1.1Z"/>',
  bag: '<path d="M9 7.5V6a3 3 0 0 1 6 0v1.5"/><path d="M5.5 7.5h13L17.3 20H6.7L5.5 7.5Z"/>',
  hand: '<path d="M8.5 12.2V6a1.4 1.4 0 0 1 2.8 0v5"/><path d="M11.3 11.2V4.6a1.4 1.4 0 0 1 2.8 0v6.6"/><path d="M14.1 11.2V6.4a1.4 1.4 0 0 1 2.8 0v7.2"/><path d="M8.5 13v2.6A5.4 5.4 0 0 0 13.9 21h.6a5.4 5.4 0 0 0 5.4-5.4v-3.9"/>',
  bubble: '<path d="M4 5.5h16v10.2H9.8L5.5 19v-3.3H4V5.5Z"/>',
  pin: '<path d="M12 21s6.5-6.2 6.5-11.3a6.5 6.5 0 1 0-13 0C5.5 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.2"/>',
  box: '<path d="M3.5 8 12 4l8.5 4-8.5 4-8.5-4Z"/><path d="M3.5 8v8.3L12 20l8.5-3.7V8"/><path d="M12 12v8"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 1-5.1 5.1L4.6 16.4a2 2 0 0 0 2.9 2.9l5.1-5.1a4 4 0 0 1 5.1-5.1l-2.6 2.6-2-2 2.6-2.6Z"/>',
  hammer: '<path d="M14.5 3.5 20 9l-1.8 1.8-1.4-1.4L9 17.2l-2.6-2.6 7.6-7.6-1.4-1.4Z"/><path d="M4 20l3.6-3.6"/>',
  flask: '<path d="M9.5 3h5"/><path d="M10.2 3v5.6L5.8 16.2A2 2 0 0 0 7.6 19h8.8a2 2 0 0 0 1.8-2.8l-4.4-7.4V3"/><path d="M7.8 14.5h8.4"/>',
  spark: '<path d="M12 3.5v3.8M12 16.7v3.8M4.3 12h3.8M15.9 12h3.8M6.8 6.8l2.7 2.7M14.5 14.5l2.7 2.7M17.2 6.8l-2.7 2.7M9.5 14.5l-2.7 2.7"/>',
};
function actionIconSvg(kind) {
  return `<svg class="goal-ico-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ACTION_ICON_PATHS[kind] || ACTION_ICON_PATHS.spark}</svg>`;
}

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
};

/* ── Carte ──────────────────────────────────────────────────── */
const map = L.map('map', {
  crs: L.CRS.Simple,
  minZoom: 0, maxZoom: 5,
  zoomSnap: 0.25, zoomDelta: 0.5,
  wheelPxPerZoomLevel: 90,
  zoomControl: false,
  attributionControl: true,
});
map.attributionControl.setPrefix(false);
map.attributionControl.addAttribution(
  'Corepunk © Artificial Core — carte communautaire non officielle');
L.control.zoom({ position: 'bottomright' }).addTo(map);

const toLL = (x, z) => map.unproject([x * 4, (MAP_TOP_Z - z) * 4], 2);
const toWorld = ll => { const p = map.project(ll, 2); return { x: p.x / 4, z: MAP_TOP_Z - p.y / 4 }; };
const worldBounds = L.latLngBounds(toLL(0, 0), toLL(WORLD.w, WORLD.h));
map.setMaxBounds(worldBounds.pad(0.12));

const Tiles = L.TileLayer.extend({
  getTileUrl: c => `${TILE_BASE}/${c.z}/${c.x}_${c.y}.webp`,
});
new Tiles('', {
  tileSize: 512, minNativeZoom: 0, maxNativeZoom: 3,
  minZoom: 0, maxZoom: 5, noWrap: true, keepBuffer: 3,
  bounds: worldBounds, className: 'map-tiles',
  errorTileUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
}).addTo(map);

const canvasR = L.canvas({ padding: 0.35 });

/* ── Utilitaires ────────────────────────────────────────────── */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const numberLocale = () => (LANGS[LANG] || LANGS[DEFAULT_LANG]).numberLocale;
const fmtCoord = (x, z) => `x ${Math.round(x).toLocaleString(numberLocale())} · z ${Math.round(z).toLocaleString(numberLocale())}`;
const pretty = k => (k || '').replace(/[_-]+/g, ' ').trim().replace(/^./, c => c.toUpperCase());
const save = () => {
  localStorage.setItem(LS.tracked, JSON.stringify(S.tracked));
  localStorage.setItem(LS.done, JSON.stringify([...S.done]));
};
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── Repli d'image systématique ───────────────────────────────
   Aucune image cassée ou case vide : une icône manquante (~530 items et
   36 avatars n'ont simplement pas d'art extrait du client — repli permanent
   et attendu pour eux) ou qui échoue au chargement (404) bascule sur un
   glyphe de catégorie coloré — initiales du nom pour les portraits (PNJ,
   avatars de fiche), pictogramme de nature pour les objets/butin. */
function initials(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  return words.length === 1 ? words[0].slice(0, 2).toUpperCase() : (words[0][0] + words[1][0]).toUpperCase();
}
const KIND_GLYPH = {
  weapon: '⚔', consumable: '🧪', artifact: '💎', resource: '🌿', rune: '◈',
  chip: '▣', synthesis: '✦', quest_item: '⚙', recipe: '📜',
};
function itemGlyph(it) { return (it && KIND_GLYPH[it.kind]) || '📦'; }
/* <img> avec repli intégré (le glyphe est posé en data-fb, consommé soit
   par le handler `error` global si l'image casse, soit immédiatement s'il
   n'y a pas d'URL du tout). */
function iconTag(url, cls, glyph) {
  return url
    ? `<img class="${cls}" src="${url}" alt="" data-fb="${esc(glyph)}" loading="lazy">`
    : `<span class="${cls} icon-broken" data-fb="${esc(glyph)}"></span>`;
}
document.addEventListener('error', e => {
  const t = e.target;
  if (t.tagName !== 'IMG') return;
  const span = document.createElement('span');
  span.className = t.className + ' icon-broken';
  span.setAttribute('data-fb', t.dataset.fb || '?');
  t.replaceWith(span);
}, true);
function goTo(x, z, zoom, label) {
  if (x == null || z == null) return;   // no fixed position (e.g. an NPC known
                                          // only from dialog/quest-slot) -- no-op
                                          // rather than flying to a NaN latlng.
  const ll = toLL(x, z);
  const target = Math.max(map.getZoom(), zoom ?? 3);
  reduceMotion ? map.setView(ll, target) : map.flyTo(ll, target, { duration: .7 });
  setLocator(x, z, label);
  pulse(ll);
}
let pulseMk = null;
function pulse(ll) {
  if (pulseMk) map.removeLayer(pulseMk);
  pulseMk = L.marker(ll, {
    icon: L.divIcon({ className: '', html: '<div class="pulse-ring" style="width:36px;height:36px"></div>', iconSize: [36, 36] }),
    interactive: false, zIndexOffset: 900,
  }).addTo(map);
  setTimeout(() => { if (pulseMk) { map.removeLayer(pulseMk); pulseMk = null; } }, 3200);
}

/* Repère persistant : chaque « aller à » (résultat de recherche, bouton
   carte, suivi) pose un réticule ambré qui RESTE à l'endroit exact —
   remplacé par le goTo suivant, retiré via son popup. Complète la vague
   éphémère (pulse) jugée trop discrète. Distinct du ping rouge (clic droit) :
   le réticule suit un geste de navigation explicite plutôt qu'un repère posé
   à la main — mais les deux sont désormais partageables/historisés dans le
   hash (S.locator miroir plat, lu par buildHash() ; voir aussi
   pushFocusState()/applyLocationState() pour l'historique Précédent/Suivant). */
let locMk = null;
function setLocator(x, z, label) {
  clearLocator();
  const icon = L.divIcon({
    className: 'loc-marker',
    html: '<div class="loc-ret"></div><div class="loc-dot"></div>',
    iconSize: [0, 0],
  });
  locMk = L.marker(toLL(x, z), { icon, zIndexOffset: 950 });
  locMk.bindPopup(`<div class="pop">
    <h3>${esc(label || tr('locatorTitle'))}</h3>
    <div class="pop-cat" style="color:var(--accent)">${esc(tr('locatorTitle'))}</div>
    <span class="pop-coords">${fmtCoord(x, z)}</span>
    <div class="pop-actions"><button class="act ghost" data-act="clear-locator">${esc(tr('removeBtn'))}</button></div>
  </div>`);
  locMk.addTo(map);
  S.locator = { x, z, label: label || null };
}
function clearLocator() {
  if (locMk) { map.removeLayer(locMk); locMk = null; }
  S.locator = null;
  syncHash();
}

/* ── Chargement des données ─────────────────────────────────── */
/* Chaque *.json de data/ est publié en .bin : un en-tête custom de 4 octets
   (friction anti-scraping — ce n'est PAS du chiffrement, juste de quoi faire
   échouer `curl | gunzip`/`file`/`zcat` — plus reconnu comme gzip sans
   passer par ce module) suivi d'un flux gzip -9 du JSON. site_meta.json
   reste seul en clair (petit, non sensible). Décodage mesuré < 40 ms/fichier
   (fetch + DecompressionStream natif, même API que tout navigateur récent). */
const BIN_HEADER_LEN = 4; // doit rester synchro avec le générateur des .bin
async function fetchBin(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(path + ' → ' + r.status);
  const gz = (await r.arrayBuffer()).slice(BIN_HEADER_LEN);
  const stream = new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'));
  return JSON.parse(await new Response(stream).text());
}
async function fetchJson(path) {
  if (path.endsWith('.bin')) return fetchBin(path);
  const r = await fetch(path);
  if (!r.ok) throw new Error(path + ' → ' + r.status);
  return r.json();
}

/* Every language-sensitive dataset file lives under site/data/<lang>/ (one
   full, self-contained build per site language). tiles/icons/tiles_meta.json
   stay unprefixed (language-independent, shared, never duplicated). */
const dataPath = name => `data/${S.lang}/${name}`;

/* Chemin critique : tout ce qu'il faut pour la première peinture (carte,
   panneau, recherche PNJ/POI/quêtes/objets, fiche quête complète avec ses
   items). Coupe ~5,7 Mo (camps + recettes + vendeurs + fiches camp) du
   JSON chargé avant que le voile de chargement ne disparaisse. */
async function loadCritical() {
  const [npcs, pois, quests, qao, workshops, chests, meta, zonesGeo, zonesQuest, items] = await Promise.all([
    fetchJson(dataPath('npcs.bin')), fetchJson(dataPath('interest_points.bin')),
    fetchJson(dataPath('quests.bin')), fetchJson(dataPath('quest_objects.bin')),
    fetchJson(dataPath('workshops.bin')), fetchJson(dataPath('chests.bin')),
    fetchJson(dataPath('site_meta.json')).catch(() => ({})),
    fetchJson(dataPath('zones_geo.bin')).catch(() => []),
    fetchJson(dataPath('zones_quest_geo.bin')).catch(() => ({})),
    fetchJson(dataPath('items.bin')).catch(() => ({})),
  ]);
  S.data = { npc: npcs, poi: pois, quest: quests, qao, workshop: workshops, chest: chests };
  S.meta = meta;
  S.zonesGeo = zonesGeo;
  S.zonesQuest = zonesQuest;
  S.items = items;
  quests.forEach(q => S.quests.set(q.slug, q));
}

/* Chemin différé : camps (1,9 Mo / 116k points, filtres tous décochés par
   défaut), fiches camp, recettes, stock des vendeurs, monstres, bestiaire/
   lore, capacités nommées et événements de monde (tous consultés uniquement
   depuis une fiche ou la recherche, jamais la première peinture). Démarré
   juste après le premier rendu, sans bloquer le panneau ni les fiches
   quête/item. */
let deferredReady = false;
const onDeferredReady = [];
function whenDeferred(fn) { deferredReady ? fn() : onDeferredReady.push(fn); }
async function loadDeferred() {
  const [camps, campDetails, recipes, vendors, monsters, locations, abilities, events] = await Promise.all([
    fetchJson(dataPath('camps.bin')).catch(() => []),
    fetchJson(dataPath('camp_details.bin')).catch(() => ({})),
    fetchJson(dataPath('recipes.bin')).catch(() => ({})),
    fetchJson(dataPath('vendors.bin')).catch(() => ({})),
    fetchJson(dataPath('monsters.bin')).catch(() => ({})),
    fetchJson(dataPath('locations.bin')).catch(() => []),
    fetchJson(dataPath('abilities.bin')).catch(() => ({})),
    fetchJson(dataPath('events.bin')).catch(() => []),
  ]);
  S.campDetails = campDetails;
  S.recipes = recipes;
  S.vendors = vendors;
  S.monsters = monsters;
  S.locations = locations;
  S.abilities = abilities;
  S.events = events;
  // Re-callable (language switch, see setLang()): capture each kind's on/off
  // state before rebuilding S.camps from scratch, else re-running this would
  // append duplicate points/groups onto the previous load's arrays.
  const prevOn = {};
  for (const [k, st] of Object.entries(S.camps)) prevOn[k] = st.on;
  S.camps = {};
  camps.forEach(g => {
    const k = g.kind;
    if (!S.camps[k]) S.camps[k] = { on: prevOn[k] || false, points: [], groups: [] };
    S.camps[k].groups.push(g);
    g.pts.forEach(pt => S.camps[k].points.push({ x: pt[0], z: pt[1], g }));
  });
  deferredReady = true;
  onDeferredReady.splice(0).forEach(fn => fn());
}

/* ── Marqueurs ──────────────────────────────────────────────── */
const layers = {};   // cat -> L.LayerGroup
function markerId(cat, i) { return `${cat}:${i}`; }

function domIcon(cat, iconUrl, done, name) {
  return L.divIcon({
    className: 'mk' + (done ? ' mk-done' : ''),
    html: `<div class="mk-pin" style="--pin:${CATS[cat].hex}">${iconTag(iconUrl, 'mk-img', initials(name))}</div>`,
    iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -14],
  });
}

/* Transform monde -> pixel (zoom courant), dérivée à la volée de toLL() +
   map.project() par échantillonnage (3 projections Leaflet, jamais plus,
   quel que soit le nombre de points à filtrer ensuite). Volontairement
   générique : ne suppose aucune échelle ni flip d'axe particulier, donc
   reste valide quelle que soit la config de la couche de tuiles (gérée
   ailleurs — voir toLL/toWorld en tête de fichier). */
function worldToPxTransform() {
  const Z = map.getZoom();
  const p0 = map.project(toLL(0, 0), Z);
  const px = map.project(toLL(1000, 0), Z);
  const pz = map.project(toLL(0, 1000), Z);
  return {
    ox: p0.x, oy: p0.y,
    axx: (px.x - p0.x) / 1000, axy: (px.y - p0.y) / 1000,
    azx: (pz.x - p0.x) / 1000, azy: (pz.y - p0.y) / 1000,
  };
}
function fastProject(t, x, z) {
  return { x: t.ox + t.axx * x + t.azx * z, y: t.oy + t.axy * x + t.azy * z };
}

/* Rendu « dense » sur canvas, filtré par la vue + agrégé par cellule.
   Perf : un seul passage en espace pixel — la projection Leaflet coûteuse
   (allocation LatLng + unproject/project) n'est plus appelée que pour les
   3 points de calibrage + les points effectivement dessinés (après
   filtrage/clustering), jamais pour l'ensemble brut (jusqu'à 122k points
   tous camps + quêtes + objets + coffres confondus). */
function renderDense(cat, points, color, popupFor) {
  const g = layers[cat] || (layers[cat] = L.layerGroup().addTo(map));
  g.clearLayers();
  const st = cat.startsWith('camp:') ? S.camps[cat.slice(5)] : CATS[cat];
  if (!st || !st.on) return;

  const t = worldToPxTransform();
  const pb = map.getPixelBounds();
  const padX = (pb.max.x - pb.min.x) * 0.25, padY = (pb.max.y - pb.min.y) * 0.25;
  const minX = pb.min.x - padX, maxX = pb.max.x + padX;
  const minY = pb.min.y - padY, maxY = pb.max.y + padY;

  const vis = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const q = fastProject(t, p.x, p.z);
    if (q.x >= minX && q.x <= maxX && q.y >= minY && q.y <= maxY) vis.push({ p, px: q.x, py: q.y });
  }

  const CAP = 1400, cellPx = 30;
  let drawList;
  if (vis.length > CAP) {
    const cells = new Map();
    for (const v of vis) {
      const key = ((v.px / cellPx) | 0) + ':' + ((v.py / cellPx) | 0);
      const c = cells.get(key);
      if (c) c.n++; else cells.set(key, { p: v.p, n: 1 });
    }
    drawList = [...cells.values()];
  } else {
    drawList = vis.map(v => ({ p: v.p, n: 1 }));
  }

  for (const { p, n } of drawList) {
    const mk = L.circleMarker(toLL(p.x, p.z), {
      renderer: canvasR, radius: n > 1 ? Math.min(6 + Math.log2(n) * 1.8, 13) : 4.6,
      color: '#0a0e14', weight: 1.2, fillColor: color, fillOpacity: n > 1 ? .75 : .88,
    });
    if (n > 1) mk.bindTooltip('× ' + n, { direction: 'top', offset: [0, -6] });
    mk.bindPopup(() => popupFor(p, n), { maxWidth: 300 });
    g.addLayer(mk);
  }
}

/* Marqueurs DOM (portraits PNJ/POI/ateliers) : même discipline que les
   couches denses ci-dessus (ne matérialise que ce qui est dans la vue,
   reconstruit au déplacement) mais en gardant l'icône réelle au lieu d'un
   simple point — évite de garder des centaines de nœuds DOM+image en
   permanence pendant que l'utilisateur navigue loin de la vue initiale. */
function renderDomCulled(cat, iconPathFor) {
  const g = layers[cat] || (layers[cat] = L.layerGroup().addTo(map));
  g.clearLayers();
  const c = CATS[cat];
  if (!c || !c.on) return;

  const t = worldToPxTransform();
  const pb = map.getPixelBounds();
  const padX = (pb.max.x - pb.min.x) * 0.3, padY = (pb.max.y - pb.min.y) * 0.3;
  const minX = pb.min.x - padX, maxX = pb.max.x + padX;
  const minY = pb.min.y - padY, maxY = pb.max.y + padY;

  const arr = S.data[cat];
  for (let i = 0; i < arr.length; i++) {
    const r = arr[i];
    if (r.x == null || r.z == null) continue;   // known only from dialog/quest-slot,
                                                   // no fixed position -- fiche/search only
    const q = fastProject(t, r.x, r.z);
    if (q.x < minX || q.x > maxX || q.y < minY || q.y > maxY) continue;
    const id = markerId(cat, i);
    const url = r.icon ? `icons/${iconPathFor}/${encodeURIComponent(r.icon)}.png` : null;
    const mk = L.marker(toLL(r.x, r.z), { icon: domIcon(cat, url, S.done.has(id), r.name) });
    mk._meta = { cat, i, id, r };
    mk.bindPopup(() => popupHtml(cat, r, id), { maxWidth: 300 });
    g.addLayer(mk);
  }
}

const denseRenderers = [];
const denseByCat = {};
function registerDense(cat, getPoints, color, popupFor) {
  const fn = () => renderDense(cat, getPoints(), color, popupFor);
  denseRenderers.push(fn);
  denseByCat[cat] = fn;
  return fn;
}
function registerDomDense(cat, iconPath) {
  const fn = () => renderDomCulled(cat, iconPath);
  denseRenderers.push(fn);
  denseByCat[cat] = fn;
  return fn;
}
/* Les recalculs de couches denses sont coalescés sur une frame (rAF) : un
   enchaînement rapide de moveend/zoomend (molette, flyTo) ne déclenche
   qu'un seul redessin au lieu d'un par événement. */
let redrawQueued = false;
function scheduleRedraw() {
  if (redrawQueued) return;
  redrawQueued = true;
  requestAnimationFrame(() => { redrawQueued = false; denseRenderers.forEach(fn => fn()); });
}
map.on('moveend zoomend', scheduleRedraw);

/* ── Popups ─────────────────────────────────────────────────── */
function actionBtns(id, extra = '') {
  const tracked = S.tracked.some(t => t.id === id);
  const done = S.done.has(id);
  return `<div class="pop-actions">
    <button class="act ${tracked ? 'on' : ''}" data-act="track" data-id="${esc(id)}">${esc(tracked ? tr('trackedBtn') : tr('trackBtn'))}</button>
    <button class="act ${done ? 'on' : ''}" data-act="done" data-id="${esc(id)}">${esc(done ? tr('doneBtnActive') : tr('doneBtn'))}</button>
    ${extra}</div>`;
}

function popupHtml(cat, r, id) {
  const c = CATS[cat];
  let icon = '';
  if (cat === 'npc') icon = iconTag(r.icon ? `icons/npc_map/${encodeURIComponent(r.icon)}.png` : null, 'pop-icon', initials(r.name));
  if (cat === 'poi') icon = iconTag(r.icon ? `icons/interest_points/${encodeURIComponent(r.icon)}.png` : null, 'pop-icon', initials(r.name));
  let extraBtn = '', extraHtml = '';
  if (cat === 'npc' && r.quests?.length) {
    extraBtn = `<button class="act primary" data-act="fiche-npc" data-id="${esc(id)}">${esc(tr('ficheNpcBtn', r.quests.length))}</button>`;
  }
  if (cat === 'qao' && r.k) extraHtml = `<p class="pop-extra">${esc(r.k)}</p>`;
  return `<div class="pop">
    <h3>${icon}${esc(r.name)}</h3>
    <div class="pop-cat" style="color:${c.hex}">${esc(catLabel(cat))}</div>
    <span class="pop-coords">${fmtCoord(r.x, r.z)}</span>
    ${extraHtml}
    ${actionBtns(id, extraBtn)}</div>`;
}

function questPopup(q) {
  const id = 'quest:' + q.slug;
  return `<div class="pop">
    <h3>${esc(q.name)}</h3>
    <div class="pop-cat" style="color:${CATS.quest.hex}">${esc(tr('questCat'))}${q.giver ? esc(tr('givenBySuffix', q.giver)) : ''}</div>
    <span class="pop-coords">${fmtCoord(q.x, q.z)}</span>
    ${actionBtns(id, `<button class="act primary" data-act="fiche-quest" data-id="${esc(q.slug)}">${esc(tr('ficheCompleteBtn'))}</button>`)}
  </div>`;
}

function campPopup(p, n) {
  const g = p.g;
  const det = S.campDetails[g.k];
  let extra = '';
  if (det?.mobs?.length) {
    extra = `<div class="pop-mobs">${det.mobs.slice(0, 4).map(m =>
      `<span class="chip">${iconTag(m.icon ? `icons/${esc(m.icon)}` : null, 'chip-icon', initials(m.name))}${esc(m.name)}${m.lvl ? ` <i>${esc(tr('levelAbbrev', m.lvl))}</i>` : ''}</span>`).join('')}</div>`;
  }
  const ficheBtn = det ?
    `<div class="pop-actions"><button class="act primary" data-act="fiche-camp" data-id="${esc(g.k)}">${esc(tr('campFicheBtn'))}</button></div>` : '';
  return `<div class="pop">
    <h3>${esc(pretty(g.k))}</h3>
    <div class="pop-cat" style="color:${CAMP_COLORS[g.kind] || '#999'}">${esc(tr('campLabel'))} · ${esc(campKindLabel(g.kind))}${n > 1 ? esc(tr('pointsHereSuffix', n)) : ''}</div>
    <span class="pop-coords">${fmtCoord(p.x, p.z)} · ${esc(tr('spawnsTotal', g.pts.length))}</span>
    ${extra}${ficheBtn}</div>`;
}

function openCampFiche(key) {
  const det = S.campDetails[key];
  const g = Object.values(S.camps).flatMap(st => st.groups).find(c => c.k === key);
  if (!det || !g) return;
  const mobs = det.mobs.map(m => `
    <div class="frow">
      ${iconTag(m.icon ? `icons/${esc(m.icon)}` : null, 'fr-icon', initials(m.name))}
      <span class="fr-label">${esc(m.name)}</span>
      <span class="muted">${m.lvl ? tr('levelAbbrev', m.lvl) : ''}${m.atk ? ' · ' + esc(m.atk) : ''}</span>
    </div>`).join('');
  const drops = lootRowsHtml(det.drops, 'noLootCatalogued');
  openFiche(`
    <div class="fiche-head"><div>
      <div class="fiche-kind" style="color:${CAMP_COLORS[g.kind] || '#999'}">${esc(tr('campLabel'))} · ${esc(campKindLabel(g.kind))}</div>
      <h2>${esc(pretty(key))}</h2>
      <span class="pop-coords">${esc(tr('spawnPointsCount', g.pts.length))}</span></div></div>
    <div class="fiche-section"><div class="pop-actions">
      ${g.pts.length ? `<button class="act primary" data-act="goto" data-x="${g.pts[0][0]}" data-z="${g.pts[0][1]}" data-label="${esc(pretty(key))}">${esc(tr('viewOnMapBtn'))}</button>` : ''}
    </div></div>
    ${mobs ? `<div class="fiche-section"><h3>${esc(tr('likelyMonsters', det.mobs.length))}</h3>${mobs}</div>` : ''}
    <div class="fiche-section"><h3>${esc(tr('lootBestRates'))}</h3>${drops}</div>`);
  setFicheHash('camp', key);
}

/* Rendu commun d'un taux de drop : quantité ("×N", dès que count>1) suivi de
   « Garanti » ou d'un pourcentage de chance — jamais les deux pour un même
   drop garanti (un « 100 % » redondant n'apporte rien face à un « ×3
   garanti » explicite, voir data/SCHEMA.md "Drop rows"). */
function dropRateHtml(d) {
  const countBit = d.c > 1 ? `×${d.c}` : '';
  if (d.g) return `<span class="muted">${esc([countBit, tr('guaranteedLabel')].filter(Boolean).join(' '))}</span>`;
  if (d.w == null) return countBit ? `<span class="muted">${esc(countBit)}</span>` : '';
  const pct = `${(d.w * 100).toFixed(d.w < 0.1 ? 1 : 0)} %`;
  return `<span class="muted">${esc([countBit, pct].filter(Boolean).join(' · '))}</span>`;
}

/* Ligne de butin commune (fiche monstre/camp) : icône + nom cliquable vers
   la fiche item quand connue + taux (dropRateHtml : ×N/garanti/%). */
function monsterLootRow(d) {
  return dropRow(d.icon ? `icons/${esc(d.icon)}` : null, d.name,
    S.items[d.key] ? 'fiche-item' : null, d.key, dropRateHtml(d), itemGlyph(S.items[d.key]));
}
function lootRowsHtml(list, emptyKey) {
  if (!list?.length) return `<p class="hint">${esc(tr(emptyKey))}</p>`;
  const guaranteed = list.filter(d => d.g);
  const chance = list.filter(d => !d.g);
  return (guaranteed.length ? `<h4 class="fiche-sub">${esc(tr('guaranteedLabel'))}</h4>${guaranteed.map(monsterLootRow).join('')}` : '')
    + (chance.length ? `<h4 class="fiche-sub">${esc(tr('chanceLabel'))}</h4>${chance.map(monsterLootRow).join('')}` : '');
}

/* Fiche monstre : niveau/famille/type d'attaque, tags lisibles, butin AU KILL
   (taux garanti/×N/%, item cliquable -> fiche item, même rendu que
   openCampFiche/openItemFiche ci-dessus) SÉPARÉ du butin de DÉPEÇAGE
   (harvestLoot — une stratégie de butin distincte, ce que rapporte le fait
   de dépecer/récolter le cadavre, pas ce qui tombe à la mort ; harvestMethod
   = l'outil/métier de dépeçage, ex. "Flayer" -> "Boucherie"), capacités (nom
   réel ou repli prettifié — la plupart des capacités de monstre n'ont aucune
   localisation dans le client), et camps où il apparaît (bouton carte vers
   le camp). Butin/capacités/camps viennent TELS QUELS du catalogue — un
   monstre sans butin catalogué l'affiche honnêtement plutôt que de ne rien
   montrer ou d'inventer un lien. */
function openMonsterFiche(key) {
  const m = S.monsters[key];
  if (!m) return;
  S.openFiche = { kind: 'monster', id: key };
  const icon = m.icon ? `icons/${m.icon}` : null;
  const kindBits = [m.family ? pretty(m.family) : null, m.level != null ? tr('levelAbbrev', m.level) : null,
    m.attack ? monsterAttackLabel(m.attack) : null].filter(Boolean);
  const kindLine = (kindBits.join(' · ') || tr('monsterLabel')) + (m.variants > 1 ? tr('variantsNote', m.variants) : '');
  const tagsHtml = m.tags?.length
    ? `<div class="fiche-section reward-chips">${m.tags.map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>` : '';

  const lootHtml = `<div class="fiche-section"><h3>${esc(tr('dropRatesTitle'))}</h3>${lootRowsHtml(m.loot, 'noLootCatalogued')}</div>`;
  const harvestHtml = (m.harvestLoot?.length || m.harvestMethod)
    ? `<div class="fiche-section"><h3>${esc(tr('harvestTitle'))}${m.harvestMethod ? ' · ' + esc(harvestMethodLabel(m.harvestMethod)) : ''}</h3>${lootRowsHtml(m.harvestLoot, 'noHarvestCatalogued')}</div>`
    : '';

  const abilitiesHtml = `<div class="fiche-section"><h3>${esc(tr('monsterAbilitiesN', m.abilities?.length || 0))}</h3>${
    m.abilities?.length
      ? m.abilities.map(a => `<div class="frow">
          <span class="k-chip" style="--chip-c:${ABILITY_HEX}">${esc(a.slot || '·')}</span>
          <span class="fr-label">${esc(a.name)}</span>
        </div>`).join('')
      : `<p class="hint">${esc(tr('noAbilitiesKnown'))}</p>`
  }</div>`;

  const campsHtml = `<div class="fiche-section"><h3>${esc(tr('monsterCampsN', m.camps?.length || 0))}</h3>${
    m.camps?.length
      ? m.camps.map(c => `<div class="frow">
          <span class="fr-icon icon-broken" data-fb="📍"></span>
          <span class="fr-label link" data-act="fiche-camp" data-id="${esc(c.camp)}">${esc(c.name)}</span>
          ${gotoBtn(c.x, c.z, c.name)}
        </div>`).join('')
      : `<p class="hint">${esc(tr('noCampsKnown'))}</p>`
  }</div>`;

  openFiche(`
    <div class="fiche-head">${iconTag(icon, 'fiche-avatar', initials(m.name))}
      <div><div class="fiche-kind" style="color:${MONSTER_HEX}">${esc(kindLine)}</div>
      <h2>${esc(m.name)}</h2></div></div>
    ${tagsHtml}
    ${lootHtml}
    ${harvestHtml}
    ${abilitiesHtml}
    ${campsHtml}`);
  setFicheHash('monster', key);
}

/* Fiche bestiaire/lore (MapMarkers.xml) : titre, nature (Ville/Bestiaire/
   Ressource…), description, bouton carte si une position est connue (38/208
   depuis un pin _ip), monstres de la même famille cliquables vers leur
   propre fiche quand connus du catalogue. Pas de lien profond dédié (`mon`/
   `i`/`npc`/etc. sont nettoyés du hash pour éviter qu'un lien partagé rouvre
   la MAUVAISE fiche après un rechargement — voir setFicheHash). */
function openLocationFiche(idx) {
  const l = S.locations[idx];
  if (!l) return;
  S.openFiche = { kind: 'location', id: idx };
  const monstersHtml = l.monsters?.length
    ? `<div class="fiche-section"><h3>${esc(tr('familyMonstersTitle', l.monsters.length))}</h3>${l.monsters.map(fm => {
        const known = S.monsters[fm.key];
        return `<div class="frow">
          <span class="fr-label${known ? ' link' : ''}"${known ? ` data-act="fiche-monster" data-id="${esc(fm.key)}"` : ''}>${esc(fm.name)}</span>
          <span class="muted">${fm.level != null ? tr('levelAbbrev', fm.level) : ''}</span>
        </div>`;
      }).join('')}</div>` : '';
  openFiche(`
    <div class="fiche-head"><div>
      <div class="fiche-kind" style="color:${LOCATION_HEX}">${esc(locationKindLabel(l.kind))}</div>
      <h2>${esc(l.title)}</h2></div></div>
    ${l.x != null ? `<div class="fiche-section"><div class="pop-actions">
      <button class="act primary" data-act="goto" data-x="${l.x}" data-z="${l.z}" data-label="${esc(l.title)}">${esc(tr('viewOnMapBtn'))}</button>
    </div></div>` : ''}
    ${l.desc ? `<div class="fiche-section"><p class="fiche-journal">${esc(l.desc)}</p></div>` : ''}
    ${monstersHtml}`);
  setFicheHash(null);
}

/* Fiche capacité (sorts de héros NOMMÉS uniquement) : nom, emplacement
   (Q/W/E/R/MA), description, tags de nature (Stun/AoE/DoT…) en puces. */
function openAbilityFiche(key) {
  const a = S.abilities[key];
  if (!a) return;
  S.openFiche = { kind: 'ability', id: key };
  const tagsHtml = a.tags?.length
    ? `<div class="fiche-section reward-chips">${a.tags.map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>` : '';
  openFiche(`
    <div class="fiche-head"><div>
      <div class="fiche-kind" style="color:${ABILITY_HEX}">${esc(tr('abilityLabel'))}${a.slot ? ' · ' + esc(a.slot) : ''}</div>
      <h2>${esc(a.name)}</h2></div></div>
    ${a.desc ? `<div class="fiche-section"><p class="fiche-journal">${esc(a.desc)}</p></div>` : ''}
    ${tagsHtml}`);
  setFicheHash(null);
}

/* Délégation des boutons de popup / fiche. */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const id = b.dataset.id;
  // Un seul pushFocusState() par geste, ici en TOUT DÉBUT de délégué — avant
  // toute mutation (voir pushFocusState()'s doc : pousser après coup ferait
  // remonter un doublon de l'état déjà réécrit par le replaceState des
  // fonctions bas niveau ci-dessous, pas l'état d'avant-geste).
  if (['fiche-quest', 'fiche-npc', 'fiche-camp', 'fiche-item', 'fiche-monster', 'goto'].includes(b.dataset.act)) pushFocusState();
  if (b.dataset.act === 'track') toggleTrack(id, b);
  else if (b.dataset.act === 'done') toggleDone(id, b);
  else if (b.dataset.act === 'fiche-quest') openQuestFiche(id);
  else if (b.dataset.act === 'fiche-npc') openNpcFiche(+id.split(':')[1]);
  else if (b.dataset.act === 'fiche-camp') openCampFiche(id);
  else if (b.dataset.act === 'fiche-item') openItemFiche(id);
  else if (b.dataset.act === 'fiche-monster') openMonsterFiche(id);
  else if (b.dataset.act === 'zone-view') {
    const rings = S.zonesQuest[id];
    if (rings?.length) map.flyToBounds(L.latLngBounds(rings.flat().map(([x, z]) => toLL(x, z))).pad(0.3));
  }
  else if (b.dataset.act === 'goal-zone-view') {
    const sz = currentGoalZones[+b.dataset.zi];
    if (sz) drawGoalZone(sz);
  }
  else if (b.dataset.act === 'goto') {
    goTo(+b.dataset.x, +b.dataset.z, undefined, b.dataset.label);
  }
});

/* ── Suivis / fait ──────────────────────────────────────────── */
function itemById(id) {
  const [cat, key] = id.split(':');
  if (cat === 'quest') { const q = S.quests.get(key); return q && { name: q.name, x: q.x, z: q.z, hex: CATS.quest.hex }; }
  const r = S.data[cat]?.[+key];
  return r && { name: r.name, x: r.x, z: r.z, hex: CATS[cat]?.hex || '#999' };
}
function toggleTrack(id, btn) {
  const i = S.tracked.findIndex(t => t.id === id);
  if (i >= 0) S.tracked.splice(i, 1);
  else {
    const it = itemById(id);
    if (it) S.tracked.push({ id, name: it.name, x: it.x, z: it.z, hex: it.hex });
  }
  save(); renderTracked();
  if (btn) { const on = S.tracked.some(t => t.id === id); btn.classList.toggle('on', on); btn.textContent = on ? tr('trackedBtn') : tr('trackBtn'); }
}
function toggleDone(id, btn) {
  S.done.has(id) ? S.done.delete(id) : S.done.add(id);
  save(); renderTracked();
  if (btn) { const on = S.done.has(id); btn.classList.toggle('on', on); btn.textContent = on ? tr('doneBtnActive') : tr('doneBtn'); }
  refreshIconLayer(id.split(':')[0]);
}
function refreshIconLayer(cat) {
  denseByCat[cat]?.(); // rejoue le rendu (canvas ou DOM culled) de cette seule couche
}
function renderTracked() {
  const ul = $('#tracked-list');
  ul.innerHTML = '';
  $('#tracked-empty').style.display = S.tracked.length ? 'none' : '';
  S.tracked.forEach(t => {
    const li = document.createElement('li');
    if (S.done.has(t.id)) li.className = 'done';
    li.innerHTML = `<span class="t-dot" style="background:${t.hex}"></span>
      <span class="t-name">${esc(t.name)}</span>
      <button aria-label="${esc(tr('removeBtn'))}">✕</button>`;
    li.querySelector('.t-name').onclick = () => {
      pushFocusState();   // avant mutation — voir pushFocusState()'s doc
      goTo(t.x, t.z, undefined, t.name);
    };
    li.querySelector('button').onclick = () => toggleTrack(t.id);
    ul.appendChild(li);
  });
}

/* ── Fiches (drawer) ────────────────────────────────────────── */
const detail = document.createElement('aside');
detail.id = 'detail';
detail.innerHTML = `<button id="detail-close" aria-label="${esc(tr('closeBtnAria'))}">✕</button><div id="detail-body"></div>`;
$('#map-wrap').appendChild(detail);
detail.querySelector('#detail-close').onclick = () => unfocus(closeFiche);
function closeFiche() {
  detail.classList.remove('open');
  if (S.investLayer) { map.removeLayer(S.investLayer); S.investLayer = null; }
  if (S.questZoneLayer) { map.removeLayer(S.questZoneLayer); S.questZoneLayer = null; }
  clearGoalZone();
  S.openFiche = null;
  setFicheHash(null);
}
function openFiche(html) {
  $('#detail-body').innerHTML = html;
  detail.classList.add('open');
}
/* Lien profond de fiche dans le hash (q=<slug> / camp=<clé> / i=<clé item> /
   npc=<idx>) — mutuellement exclusifs, une seule fiche ouverte à la fois.
   `history.state` (pas `null`) : préserve le marqueur {cpm,cpmSeq} de
   l'entrée courante — posé soit par la restauration initiale, soit par
   pushFocusState() juste avant que cette fonction ne soit appelée (voir
   plus bas) — sans quoi CE replaceState l'effacerait à chaque ouverture de
   fiche et canGoBackLocally()/unfocus() ne fonctionneraient plus jamais. */
function setFicheHash(kind, id) {
  const p = new URLSearchParams(location.hash.slice(1));
  p.delete('q'); p.delete('camp'); p.delete('i'); p.delete('npc'); p.delete('mon');
  if (kind === 'quest') p.set('q', id);
  else if (kind === 'item') p.set('i', id);
  else if (kind === 'npc') p.set('npc', id);
  else if (kind === 'monster') p.set('mon', id);
  else if (kind) p.set('camp', id);
  history.replaceState(history.state, '', '#' + p.toString().replace(/%2C/g, ','));
}

function heroAvatar(iconPath) {
  if (!iconPath || !iconPath.includes('HeroAvatars')) return null;
  return 'icons/hero_avatars/' + encodeURIComponent(iconPath.split('/').pop()) + '.png';
}

/* Bouton « Carte » standard (icône + libellé) pour tout slot localisable —
   fiches, popups, objectifs. Un objet/PNJ/vendeur sans position CONNUE reste
   toujours listé (jamais masqué) : ce repli affiche juste un libellé grisé
   au lieu du bouton, pour que le joueur sache que la chose existe même sans
   coordonnée exploitable. */
const GOTO_ICON = `<svg class="goto-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor"
  stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M12 21s6.5-6.2 6.5-11.3a6.5 6.5 0 1 0-13 0C5.5 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.2"/></svg>`;
function gotoBtn(x, z, label) {
  if (x == null) return `<span class="pos-unknown">${esc(tr('posUnknown'))}</span>`;
  return `<button class="goto" data-act="goto" data-x="${x}" data-z="${z}" data-label="${esc(label || '')}">${GOTO_ICON}<span>${esc(tr('mapLabel'))}</span></button>`;
}

/* ── Position d'objectif de quête à 3 niveaux ──────────────────────────
   Un objectif de quête n'affiche PLUS JAMAIS « position inconnue » : un objet
   à spawn dynamique (géré serveur, pas un trou de donnée) l'annonce
   honnêtement plutôt que de faire croire qu'on ignore où il se trouve.
     (a) position fixe connue         -> gotoBtn normal (bouton carte), inchangé
     (b) pas de position fixe, mais search_zone confiance haute -> libellé +
         bouton « Voir la zone » (cercle centroïde/bbox dessiné sur la carte)
     (c) sinon -> libellé seul (jamais de zone dessinée en confiance
         medium/low : le joueur a explicitement demandé de ne pas afficher un
         contour incertain) ; cas particulier « monstre identifié mais aucun
         camp ne le référence » (couverture camps.json ~25 % seulement) rendu
         avec un libellé distinct de « position dynamique » — ce n'est pas la
         même chose qu'un spawn serveur confirmé. */
let currentGoalZones = [];      // search_zone actives de la fiche quête ouverte
let goalZoneLayer = null;       // cercle dessiné pour la dernière zone consultée
function clearGoalZone() {
  if (goalZoneLayer) { map.removeLayer(goalZoneLayer); goalZoneLayer = null; }
}
function drawGoalZone(sz) {
  clearGoalZone();
  if (!sz) return;
  const [cx, cz] = sz.centroid;
  const [minX, minZ, maxX, maxZ] = sz.bbox;
  // Le site ne reçoit jamais les points bruts du cluster (payload), juste
  // centroïde + bbox — repli assumé et documenté : un cercle centré sur le
  // centroïde, rayon = demi-diagonale de la bbox.
  const r = Math.max(35, Math.hypot(maxX - minX, maxZ - minZ) / 2);
  const circle = L.circle(toLL(cx, cz), {
    radius: r, color: CATS.quest.hex, weight: 2, dashArray: '5 6',
    fillColor: CATS.quest.hex, fillOpacity: .12, interactive: false,
  });
  goalZoneLayer = L.layerGroup([circle]).addTo(map);
  map.flyToBounds(circle.getBounds().pad(0.25));
}
function zoneViewBtn(zi) {
  return `<button class="goto" data-act="goal-zone-view" data-zi="${zi}">${GOTO_ICON}<span>${esc(tr('viewZoneBtn'))}</span></button>`;
}
/* Libellé + éventuel bouton pour une cible sans position fixe. `regionHint`
   (facultatif) = région du journal de la quête, affichée en cas (c) quand
   aucune zone n'est disponible du tout — mieux que rien pour se repérer. */
function dynamicPosBadge(t, regionHint) {
  const sz = t && t.search_zone;
  if (sz && sz.confidence === 'high') {
    const zi = currentGoalZones.push(sz) - 1;
    return `<span class="pos-dynamic">${esc(tr('posDynamicZone'))}</span>${zoneViewBtn(zi)}`;
  }
  if (t && t.kind === 'monster' && !t.camp) {
    return `<span class="pos-dynamic">${esc(tr('posUncatalogued'))}</span>`;
  }
  const region = regionHint ? ` <span class="pos-region">(${esc(regionHint)})</span>` : '';
  return `<span class="pos-dynamic">${esc(tr('posDynamic'))}</span>${region}`;
}

function vendorStockSection(vendorKey) {
  const v = S.vendors[vendorKey];
  if (!v) return '';
  if (!v.sells?.length) {
    return `<div class="fiche-section"><h3>${esc(tr('vendorStockTitle'))}</h3><p class="hint">${esc(tr('noVendorItems'))}</p></div>`;
  }
  const rows = v.sells.map(s => {
    const key = typeof s === 'string' ? s : s.key;
    const price = typeof s === 'string' ? null : s.price;
    const it = S.items[key];
    const name = it?.name || pretty(key);
    const icon = it?.icon ? `icons/${it.icon}` : null;
    const label = it
      ? `<span class="fr-label link" data-act="fiche-item" data-id="${esc(key)}">${esc(name)}</span>`
      : `<span class="fr-label">${esc(name)}</span>`;
    return `<div class="frow">
      ${iconTag(icon, 'fr-icon', itemGlyph(it))}
      ${label}
      ${price != null ? `<span class="muted">${esc(String(price))}</span>` : ''}
    </div>`;
  }).join('');
  return `<div class="fiche-section"><h3>${esc(tr('vendorStockTitleN', v.sells.length))}</h3>${rows}</div>`;
}

function openNpcFiche(idx) {
  const r = S.data.npc[idx];
  if (!r) return;
  S.openFiche = { kind: 'npc', id: idx };
  const img = r.icon ? `icons/npc_map/${encodeURIComponent(r.icon)}.png` : null;
  const quests = (r.quests || []).map(slug => {
    const q = S.quests.get(slug);
    return q ? `<div class="frow">
      <span class="k-chip" style="--chip-c:${CATS.quest.hex}">${esc(tr('questCat'))}</span>
      <span class="fr-label link" data-act="fiche-quest" data-id="${esc(slug)}">${esc(q.name)}</span>
      ${gotoBtn(q.x, q.z, q.name)}
    </div>` : '';
  }).join('');
  // Some NPCs are known only from dialog/quest-slot text, with no world
  // placement or map pin at all (site/js/i18n.js's generic posUnknown, same
  // label already used for a merchant/object with no extracted position --
  // never the quest-goal-specific posDynamic/posDynamicZone wording, which
  // implies a real server-side spawn rather than "not extracted").
  const posLine = r.x != null ? `<span class="pop-coords">${fmtCoord(r.x, r.z)}</span>`
    : `<span class="pos-unknown">${esc(tr('posUnknown'))}</span>`;
  const mapBtn = r.x != null
    ? `<button class="act primary" data-act="goto" data-x="${r.x}" data-z="${r.z}" data-label="${esc(r.name)}">${esc(tr('viewOnMapBtn'))}</button>`
    : '';
  openFiche(`
    <div class="fiche-head">${iconTag(img, 'fiche-avatar', initials(r.name))}
      <div><div class="fiche-kind">${esc(tr('npcCat'))}${r.vendor ? esc(tr('vendorSuffix')) : ''}</div><h2>${esc(r.name)}</h2>
      ${posLine}</div></div>
    <div class="fiche-section">
      <div class="pop-actions">
        ${mapBtn}
        <button class="act" data-act="track" data-id="npc:${idx}">${esc(tr('trackBtn'))}</button>
      </div></div>
    <div class="fiche-section"><h3>${esc(tr('questsGivenN', (r.quests || []).length))}</h3>
      ${quests || `<p class="hint">${esc(tr('noQuestsForNpc'))}</p>`}</div>
    ${r.vendor ? vendorStockSection(r.vendor) : ''}`);
  setFicheHash('npc', idx);
}

/* Base de données objets : icône + rareté + clic -> fiche complète quand la
   clé est connue du catalogue (site/data/items.json) ; sinon repli fidèle au
   rendu historique (nom prettifié, non cliquable). */
function itemColor(it) { return (it && RARITY[it.rarity]?.hex) || 'var(--muted)'; }
function itemChip(key) {
  const it = S.items[key];
  const name = it ? it.name : pretty(key);
  const icon = it?.icon ? `icons/${it.icon}` : null;
  const attrs = it ? ` data-act="fiche-item" data-id="${esc(key)}"` : '';
  return `<span class="chip"${attrs}>${iconTag(icon, 'chip-icon', itemGlyph(it))}${esc(name)}</span>`;
}
function chipList(keys) {
  return (keys || []).map(itemChip).join('');
}

/* Ligne d'item de quête : distingue objet de quête (synthétique) et item du
   jeu — pour ces derniers, résumé d'obtention (vendu / craftable / loot)
   tiré du catalogue, et clic -> fiche complète quand la clé est connue.
   Position à 3 niveaux comme actorRows/goalTargetChip (slotpos fix_spec sec
   2.3) : cette section n'affichait jusqu'ici AUCUNE position, avec ou sans
   zone — plusieurs items de quête (ex. digging_deeper's "Stash Alexander")
   n'existent QUE dans ce catalogue, sans slots[] correspondant, donc c'était
   leur seul point d'affichage possible et il ne montrait rien du tout. */
function questItemRow(qi, regionHint) {
  const cat = qi.key ? S.items[qi.key] : null;
  const name = cat?.name || qi.label;
  const icon = cat?.icon ? `icons/${cat.icon}` : null;
  const badgeHex = qi.isQuestItem ? CATS.qao.hex : CATS.workshop.hex;
  const badgeLabel = qi.isQuestItem ? tr('questItemBadge') : tr('gameItemBadge');
  const bits = [];
  if (cat && !qi.isQuestItem) {
    if (cat.soldBy?.length) bits.push(tr('soldTag'));
    if (cat.recipes?.length) bits.push(tr('craftableTag'));
    if (cat.drops?.length) bits.push(tr('lootTag'));
  }
  const label = cat
    ? `<span class="fr-label link" data-act="fiche-item" data-id="${esc(qi.key)}">${esc(name)}</span>`
    : `<span class="fr-label">${esc(name)}</span>`;
  const posBit = (qi.x != null || qi.searchZone)
    ? (qi.x != null ? gotoBtn(qi.x, qi.z, name) : dynamicPosBadge({ search_zone: qi.searchZone }, regionHint))
    : '';
  return `<div class="frow">
    ${iconTag(icon, 'fr-icon', itemGlyph(cat))}
    <span class="k-chip" style="--chip-c:${badgeHex}">${badgeLabel}</span>
    ${label}
    ${bits.length ? `<span class="muted">${bits.join(' · ')}</span>` : ''}
    ${posBit}
  </div>`;
}

/* Vignette de la cible d'un objectif : item (icône catalogue + badge objet
   de quête/jeu, clic -> fiche), activable (icône catalogue si résolue sinon
   pictogramme générique + badge « Activable »), PNJ/monstre — chacun avec
   soit un bouton carte (position fixe), soit le badge à 3 niveaux
   (dynamicPosBadge, voir plus haut) quand il n'y a pas de position fixe.
   `kind: "multiple"` (objectif agrégat) n'a jamais de vignette : c'est un
   en-tête de checklist, ses enfants s'affichent comme des étapes normales
   juste en dessous. */
const ACTIVABLE_GLYPH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M12 2.8 20 7v10l-8 4.2L4 17V7l8-4.2Z"/><circle cx="12" cy="12" r="3"/></svg>`;
function goalTargetChip(t, label, regionHint) {
  if (!t || t.kind === 'multiple') return '';
  const lbl = esc(label || '');
  if (t.kind === 'item') {
    const it = t.key ? S.items[t.key] : null;
    const icon = it?.icon ? `icons/${it.icon}` : null;
    const badgeHex = t.isQuestItem ? CATS.qao.hex : CATS.workshop.hex;
    const badgeLabel = t.isQuestItem ? tr('questItemBadge') : tr('gameItemBadge');
    const attrs = it ? ` data-act="fiche-item" data-id="${esc(t.key)}"` : '';
    return `<span class="goal-target${it ? ' link' : ''}"${attrs}>
      <span class="goal-target-icon">${iconTag(icon, '', itemGlyph(it))}</span>
      <span class="k-chip" style="--chip-c:${badgeHex}">${badgeLabel}</span>
      ${t.x != null ? gotoBtn(t.x, t.z, lbl) : dynamicPosBadge(t, regionHint)}
    </span>`;
  }
  if (t.kind === 'object') {
    const it = t.key ? S.items[t.key] : null;
    const icon = it?.icon ? `icons/${it.icon}` : null;
    return `<span class="goal-target">
      <span class="goal-target-icon">${icon ? iconTag(icon, '', '⚙') : ACTIVABLE_GLYPH}</span>
      <span class="k-chip" style="--chip-c:${CATS.qao.hex}">${tr('activableBadge')}</span>
      ${t.x != null ? gotoBtn(t.x, t.z, lbl) : dynamicPosBadge(t, regionHint)}
    </span>`;
  }
  if (t.kind === 'npc' || t.kind === 'monster') {
    return `<span class="goal-target">${t.x != null ? gotoBtn(t.x, t.z, lbl) : dynamicPosBadge(t, regionHint)}</span>`;
  }
  if (t.kind === 'dynamic') {
    return `<span class="goal-target">${dynamicPosBadge(t, regionHint)}</span>`;
  }
  return '';
}

/* Détecte si la cible d'un objectif fait partie d'une SÉRIE NUMÉROTÉE (ex.
   "Broken pipe 1/2/3" — fixing_leaking_pipes' étape "repair" ×3) : le graphe
   de quête ne résout qu'UNE position par objectif même quand celui-ci porte
   sur toute une série, alors que tous les membres positionnés existent déjà
   dans q.actors (même libellé de base + numéro). Ne matche que si le
   libellé de la cible se termine par un nombre ET qu'au moins un autre
   acteur du MÊME type de slot partage ce préfixe — sinon (pas une série)
   renvoie null et l'appelant garde le rendu à cible unique habituel. */
function seriesActorsFor(q, g) {
  const kind = g.target?.kind;
  if (!kind) return null;
  const m = /^(.*?)[ _]*(\d+)$/.exec((g.label || '').trim());
  const base = m && m[1].trim();
  if (!base) return null;
  const rx = new RegExp('^' + base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[ _]*(\\d+)$', 'i');
  const members = [];
  for (const a of q.actors || []) {
    if (a.kind !== kind) continue;
    const am = rx.exec((a.label || '').trim());
    if (am) members.push({ ...a, _n: parseInt(am[1], 10) });
  }
  if (members.length < 2) return null;
  return members.sort((a, b) => a._n - b._n);
}
/* Rendu d'une série de cibles positionnées : une vignette PAR MEMBRE (avec
   son propre libellé numéroté) — la phrase de l'objectif ne cite qu'un seul
   représentant, mais tous les membres doivent rester trouvables sur la
   carte, pas seulement celui-là. */
function seriesTargetChips(members, kind, regionHint) {
  const badge = kind === 'object'
    ? `<span class="k-chip" style="--chip-c:${CATS.qao.hex}">${tr('activableBadge')}</span>` : '';
  const icon = kind === 'object' ? `<span class="goal-target-icon">${ACTIVABLE_GLYPH}</span>` : '';
  return `<span class="goal-target-series">${members.map(a => `
    <span class="goal-target">
      ${icon}${badge}
      <span class="goal-target-mini-label">${esc(a.label)}</span>
      ${a.x != null ? gotoBtn(a.x, a.z, a.label) : dynamicPosBadge({ search_zone: a.searchZone }, regionHint)}
    </span>`).join('')}</span>`;
}

/* Étapes numérotées, machine-exactes (goals[]). Repli sur la liste texte
   « objectives » historique pour les quêtes sans graphe de goals décodé
   (dialogue seul). `regionHint` (région du journal, si connue) sert de
   repli textuel pour les cibles sans aucune position ni zone exploitable
   (cas « position dynamique » sans plus de précision). Le compteur "×N" est
   TOUJOURS affiché, y compris ×1 (jamais implicite — un objectif sans
   compteur visible se lisait comme une quantité manquante, pas "une fois"). */
function goalStepsSection(q) {
  if (!q.goals?.length) return '';
  const regionHint = q.regions?.length ? q.regions[0] : null;
  const steps = q.goals.map((g, i) => {
    const meta = ACTION_META[g.action] || ACTION_META.custom;
    const verb = actionVerb(g.action);
    const n = g.count || 1;
    const count = `<span class="goal-count">×${n}${g.approx ? '<sup>≈</sup>' : ''}</span>`;
    const aggregate = g.target?.kind === 'multiple' ? ' goal-step-aggregate' : '';
    const series = n > 1 ? seriesActorsFor(q, g) : null;
    const targetHtml = series
      ? seriesTargetChips(series, g.target.kind, regionHint)
      : goalTargetChip(g.target, g.label, regionHint);
    return `<li class="goal-step${aggregate}">
      <span class="goal-num">${i + 1}</span>
      <span class="goal-ico" title="${esc(verb)}">${actionIconSvg(meta.ico)}</span>
      <span class="goal-body">
        <span class="goal-text"><b>${esc(verb)}</b> ${esc(g.label)}${count}</span>
        ${targetHtml}
      </span>
    </li>`;
  }).join('');
  return `<div class="fiche-section"><h3>${esc(tr('objectivesN', q.goals.length))}</h3><ol class="goal-steps">${steps}</ol></div>`;
}

/* Encart « Comment faire » : texte généré déterministe (donneur, étapes,
   source d'obtention, position de l'activable), déjà dans la langue active
   (un jeu de gabarits par langue — voir data/SCHEMA.md "i18n"). Aucune
   génération côté client. */
function hintBox(q) {
  if (!q.hint) return '';
  return `<div class="hint-box">
    <span class="hint-box-icon" aria-hidden="true">💡</span>
    <div class="hint-box-body"><div class="hint-box-title">${esc(tr('howToTitle'))}</div><p>${esc(q.hint)}</p></div>
  </div>`;
}

function openQuestFiche(slug) {
  const q = S.quests.get(slug);
  if (!q) return;
  currentGoalZones = [];   // ré-indexé à chaque ouverture (voir goalTargetChip/dynamicPosBadge)
  clearGoalZone();
  const regionHint = q.regions?.length ? q.regions[0] : null;
  const avatar = heroAvatar(q.giverIcon || q.actors?.find(a => a.kind === 'npc')?.icon);
  // 3 niveaux ici aussi (pas seulement sur les objectifs goalTargetChip) :
  // (a) position fixe -> gotoBtn normal ; (b)/(c) pas de position fixe mais
  // une search_zone propagée depuis le goal dont ce slot est la cible ->
  // dynamicPosBadge (zone dessinée seulement si confiance haute). Ne JAMAIS
  // retomber sur le "position inconnue" de gotoBtn pour un slot de quête.
  const actorRows = (q.actors || []).map(a => `
    <div class="frow">
      <span class="k-chip" style="--chip-c:${a.kind === 'npc' ? CATS.npc.hex : a.kind === 'object' ? CATS.qao.hex : '#8d99ae'}">${a.kind === 'object' ? tr('activableBadge') : actorKindLabel(a.kind)}</span>
      <span class="fr-label">${esc(a.label)}</span>
      ${a.x != null ? gotoBtn(a.x, a.z, a.label) : dynamicPosBadge({ search_zone: a.searchZone }, regionHint)}
    </div>`).join('');
  const rewards = q.rewards?.length
    ? `<div class="fiche-section"><h3>${esc(tr('rewardsTitle'))}</h3><div class="reward-chips">${chipList(q.rewards)}</div></div>` : '';
  const items = q.items?.length
    ? `<div class="fiche-section"><h3>${esc(tr('questItemsN', q.items.length))}</h3>${q.items.map(qi => questItemRow(qi, regionHint)).join('')}</div>` : '';
  const goalSteps = goalStepsSection(q);
  // Repli texte historique — seulement pour les quêtes sans graphe de goals décodé.
  const objectives = (!goalSteps && q.objectives?.length)
    ? `<div class="fiche-section"><h3>${esc(tr('objectivesTitle'))}</h3><ul class="fiche-goals">${q.objectives.map(o => `<li>${esc(o)}</li>`).join('')}</ul></div>` : '';
  const dialogs = (q.dialogs && (q.dialogs.npc?.length || q.dialogs.player?.length))
    ? `<div class="fiche-section"><details class="fiche-dialogs"><summary>${esc(tr('dialogsN', (q.dialogs.npc?.length || 0) + (q.dialogs.player?.length || 0)))}</summary>
        ${(q.dialogs.npc || []).map(l => `<p class="dlg dlg-npc">${esc(l)}</p>`).join('')}
        ${(q.dialogs.player || []).map(l => `<p class="dlg dlg-player">${esc(l)}</p>`).join('')}
      </details></div>` : '';
  const related = (q.related || []).filter(s => S.quests.has(s)).map(s =>
    `<div class="frow"><span class="k-chip" style="--chip-c:${CATS.quest.hex}">${esc(tr('questCat'))}</span>
     <span class="fr-label link" data-act="fiche-quest" data-id="${esc(s)}">${esc(S.quests.get(s).name)}</span></div>`).join('');
  const zoneBtn = S.zonesQuest[slug]
    ? `<button class="act ghost" data-act="zone-view" data-id="${esc(slug)}">${esc(tr('viewZoneBtn'))}</button>` : '';

  openFiche(`
    <div class="fiche-head">${iconTag(avatar, 'fiche-avatar', initials(q.giver))}
      <div><div class="fiche-kind">${esc(tr('questFicheKind', q.regions?.length ? q.regions[0] : ''))}</div><h2>${esc(q.name)}</h2>
      ${q.giver ? `<span class="pop-coords">${esc(tr('givenByPlain', q.giver))}</span>` : ''}</div></div>
    <div class="fiche-section"><div class="pop-actions">
      ${q.x != null && q.posSource !== 'zone' ? `<button class="act primary" data-act="goto" data-x="${q.x}" data-z="${q.z}" data-label="${esc(q.giver || q.name)}">${esc(tr('viewGiverBtn'))}</button>` : ''}
      ${zoneBtn}
      <button class="act" data-act="track" data-id="quest:${esc(slug)}">${esc(tr('trackBtn'))}</button>
      <button class="act" data-act="done" data-id="quest:${esc(slug)}">${esc(tr('doneBtn'))}</button>
    </div></div>
    ${hintBox(q)}
    ${goalSteps}
    ${objectives}
    ${actorRows ? `<div class="fiche-section"><h3>${esc(tr('onMapTitle'))}</h3>${actorRows}</div>` : ''}
    ${items}
    ${rewards}
    ${q.journal ? `<div class="fiche-section"><details class="fiche-dialogs"><summary>${esc(tr('journalTitle'))}</summary><p class="fiche-journal">${esc(q.journal)}</p></details></div>` : ''}
    ${dialogs}
    ${related ? `<div class="fiche-section"><h3>${esc(tr('relatedQuestsTitle'))}</h3>${related}</div>` : ''}`);
  drawInvestigation(q);
  drawQuestZone(slug);
  setFicheHash('quest', slug);
}

/* Fiche item : taux de drop (garanti / % séparés), vendeurs (+ position),
   recette (ingrédients cliquables), utilisé dans, quêtes liées, spots de
   farm. Toute clé du catalogue (site/data/items.json) est ouvrable ici,
   y compris les « recette d'objet » vendues/récompensées sans exister comme
   item à part entière (isRecipe). */
function dropRow(icon, label, linkAct, linkId, rateHtml, glyph) {
  const labelHtml = linkAct
    ? `<span class="fr-label link" data-act="${linkAct}" data-id="${esc(linkId)}">${esc(label)}</span>`
    : `<span class="fr-label">${esc(label)}</span>`;
  return `<div class="frow">${iconTag(icon, 'fr-icon', glyph || '📦')}${labelHtml}${rateHtml || ''}</div>`;
}

function openItemFiche(key) {
  const it = S.items[key];
  if (!it) return;
  S.openFiche = { kind: 'item', id: key };
  const icon = it.icon ? `icons/${it.icon}` : null;
  const rarity = RARITY[it.rarity];
  const itemKindText = itemKindLabel(it.kind) || pretty(it.kind || 'item');
  const kindHex = rarity ? rarity.hex : 'var(--muted)';

  const descHtml = it.desc
    ? `<div class="fiche-section"><p class="fiche-journal">${esc(it.desc)}</p></div>` : '';

  let dropsHtml = '';
  if (it.drops?.length) {
    // d.label = nom lisible de la table de butin (camp/source), pas d'un
    // autre item -- pas d'icône/clé propre, seul le taux (dropRateHtml)
    // est commun avec monsterLootRow ci-dessus.
    const guaranteed = it.drops.filter(d => d.g);
    const chance = it.drops.filter(d => !d.g);
    dropsHtml = `<div class="fiche-section"><h3>${esc(tr('dropRatesTitle'))}</h3>
      ${guaranteed.length ? `<h4 class="fiche-sub">${esc(tr('guaranteedLabel'))}</h4>${guaranteed.map(d => dropRow(null, d.label, null, null, dropRateHtml(d))).join('')}` : ''}
      ${chance.length ? `<h4 class="fiche-sub">${esc(tr('chanceLabel'))}</h4>${chance.map(d => dropRow(null, d.label, null, null, dropRateHtml(d))).join('')}` : ''}
    </div>`;
  }

  const farmHtml = it.farm?.length
    ? `<div class="fiche-section"><h3>${esc(tr('farmSpotsTitle'))}</h3>${it.farm.map(c => `
        <div class="frow">
          <span class="fr-icon icon-broken" data-fb="📍"></span>
          <span class="fr-label link" data-act="fiche-camp" data-id="${esc(c.camp)}">${esc(c.name)}</span>
          ${gotoBtn(c.x, c.z, c.name)}
        </div>`).join('')}</div>` : '';

  let vendorsHtml = '';
  if (it.soldBy?.length) {
    const blocks = it.soldBy.map(vk => {
      const v = S.vendors[vk];
      if (!v) return '';
      const npcs = v.npcs || [];
      const npcRows = npcs.slice(0, 6).map(n => `
        <div class="frow">
          <span class="fr-icon icon-broken" data-fb="${esc(initials(n.name))}"></span>
          <span class="fr-label">${esc(n.name)}</span>
          ${gotoBtn(n.x, n.z, n.name)}
        </div>`).join('');
      const more = npcs.length > 6 ? `<p class="hint">${esc(tr('moreMerchants', npcs.length - 6))}</p>` : '';
      return `<div class="vendor-block"><div class="vendor-name">${esc(v.name)}</div>${npcRows || `<p class="hint">${esc(tr('merchantPosUnknown'))}</p>`}${more}</div>`;
    }).join('');
    if (blocks) vendorsHtml = `<div class="fiche-section"><h3>${esc(tr('soldByTitle'))}</h3>${blocks}</div>`;
  }

  let recipeHtml = '';
  if (it.recipes?.length) {
    // Une entrée par rareté ATTEIGNABLE (déjà dédupliqué côté pipeline —
    // voir data/SCHEMA.md recipes.json "rarity"/"variant_group" : un seul
    // craft/jeu d'ingrédients peut produire plusieurs raretés en tirage
    // pondéré). Chaque ref = {key, rarity?} ; métier + rareté affichés en
    // en-tête de bloc, jamais 17 lignes identiques pour le même craft.
    const blocks = it.recipes.map(ref => {
      const rk = typeof ref === 'string' ? ref : ref.key;
      const rarity = typeof ref === 'string' ? null : ref.rarity;
      const r = S.recipes[rk];
      if (!r) return '';
      const metaLine = [r.prof ? professionLabel(r.prof) : null, rarity ? rarityLabel(rarity) : null]
        .filter(Boolean).join(' · ');
      const meta = metaLine ? `<div class="pop-coords recipe-meta">${esc(metaLine)}</div>` : '';
      const ing = chipList(r.ingredients);
      const out = (r.output && r.output !== key)
        ? `<div class="recipe-out">${esc(tr('producesArrow'))}${itemChip(r.output)}</div>` : '';
      return `<div class="recipe-block">${meta}<div class="reward-chips">${ing}</div>${out}</div>`;
    }).join('');
    if (blocks) recipeHtml = `<div class="fiche-section"><h3>${esc(tr('recipeTitle'))}</h3>${blocks}</div>`;
  }

  let usedHtml = '';
  if (it.usedIn?.length) {
    // Several recipe tiers/variants (base, "_unlocked", synthesis 1/2…) often
    // craft the same result — dedup on what's actually shown, not the recipe key.
    const seen = new Set();
    const chips = [];
    for (const rk of it.usedIn) {
      const r = S.recipes[rk];
      if (!r) continue;
      const outKey = (r.output && r.output !== key) ? r.output : null;
      const outItem = outKey ? S.items[outKey] : null;
      const name = outItem?.name || r.name;
      if (seen.has(name)) continue;
      seen.add(name);
      chips.push(outItem ? itemChip(outKey) : `<span class="chip">${esc(name)}</span>`);
    }
    if (chips.length) usedHtml = `<div class="fiche-section"><h3>${esc(tr('usedInTitle'))}</h3><div class="reward-chips">${chips.join('')}</div></div>`;
  }

  const questsHtml = it.quests?.length
    ? `<div class="fiche-section"><h3>${esc(tr('relatedQuestsTitle'))}</h3>${it.quests.map(({ slug, role }) => {
        const q = S.quests.get(slug);
        if (!q) return '';
        return `<div class="frow">
          <span class="k-chip" style="--chip-c:${role === 'reward' ? CATS.quest.hex : CATS.qao.hex}">${role === 'reward' ? esc(tr('rewardBadge')) : esc(tr('requiredBadge'))}</span>
          <span class="fr-label link" data-act="fiche-quest" data-id="${esc(slug)}">${esc(q.name)}</span>
        </div>`;
      }).join('')}</div>` : '';

  const weaponLine = weaponTypeLine(it.weapon);
  // Bien craftable sans rareté fixe (recette pure, pas d'item.rarity propre) :
  // liste des raretés ATTEIGNABLES par le craft (it.rarities, tirage pondéré
  // -- voir data/SCHEMA.md recipes.json) à la place d'une rareté unique.
  const raritiesLine = !rarity && it.rarities?.length ? it.rarities.map(rarityLabel).join(' / ') : '';
  openFiche(`
    <div class="fiche-head">${iconTag(icon, 'fiche-avatar', itemGlyph(it))}
      <div><div class="fiche-kind" style="color:${kindHex}">${esc(itemKindText)}${rarity ? ' · ' + esc(rarityLabel(it.rarity)) : ''}${raritiesLine ? ' · ' + esc(raritiesLine) : ''}${it.tier ? ' · ' + esc(it.tier) : ''}</div>
      <h2>${esc(it.name)}</h2>
      ${weaponLine ? `<span class="pop-coords">${esc(weaponLine)}</span>` : ''}
      ${it.prof ? `<span class="pop-coords">${esc(professionLabel(it.prof))}</span>` : ''}</div></div>
    ${descHtml}
    ${dropsHtml}
    ${farmHtml}
    ${vendorsHtml}
    ${recipeHtml}
    ${usedHtml}
    ${questsHtml}`);
  setFicheHash('item', key);
}

/* Surligne la zone de quête (polygones violets) quand elle existe. */
function drawQuestZone(slug) {
  if (S.questZoneLayer) { map.removeLayer(S.questZoneLayer); S.questZoneLayer = null; }
  const rings = S.zonesQuest[slug];
  if (!rings?.length) return;
  const g = L.layerGroup();
  rings.forEach(ring => L.polygon(ring.map(([x, z]) => toLL(x, z)), {
    color: CATS.quest.hex, weight: 2, dashArray: '5 6',
    fillColor: CATS.quest.hex, fillOpacity: .14, interactive: false,
  }).addTo(g));
  S.questZoneLayer = g.addTo(map);
}

/* Fil d'enquête : relie le donneur aux acteurs positionnés. Un acteur listé
   sans position connue (« position inconnue » dans la fiche) n'a simplement
   rien à relier sur la carte. */
function drawInvestigation(q) {
  if (S.investLayer) map.removeLayer(S.investLayer);
  const positioned = (q.actors || []).filter(a => a.x != null);
  if (q.x == null || !positioned.length) { S.investLayer = null; return; }
  const g = L.layerGroup();
  const from = toLL(q.x, q.z);
  positioned.forEach(a => {
    L.polyline([from, toLL(a.x, a.z)], {
      color: '#e0a23f', weight: 1.6, dashArray: '6 7', opacity: .75, interactive: false,
    }).addTo(g);
    L.circleMarker(toLL(a.x, a.z), {
      renderer: canvasR, radius: 5.5, color: '#0a0e14', weight: 1.2,
      fillColor: a.kind === 'npc' ? '#e0a23f' : '#ff8fa3', fillOpacity: .95,
    }).bindTooltip(a.label, { direction: 'top' }).addTo(g);
  });
  S.investLayer = g.addTo(map);
}

/* ── Couche régions nommées (zones_geo) ─────────────────────── */
function buildZoneLayer() {
  const g = L.layerGroup();
  S.zonesGeo.forEach(z => {
    z.rings.forEach(ring => L.polygon(ring.map(([x, zz]) => toLL(x, zz)), {
      color: z.color, weight: 1.4, opacity: .8,
      fillColor: z.color, fillOpacity: .09, interactive: false,
    }).addTo(g));
    const [lx, lz] = z.label;
    L.marker(toLL(lx, lz), {
      icon: L.divIcon({ className: 'zone-label', html: esc(z.name), iconSize: null }),
      interactive: false,
    }).addTo(g);
  });
  S.zoneLayer = g;
}
function toggleZones(on) {
  S.zonesOn = on;
  if (!S.zoneLayer) return;
  on ? map.addLayer(S.zoneLayer) : map.removeLayer(S.zoneLayer);
}

/* ── Filtres (sidebar) ──────────────────────────────────────── */
function filterRow(key, label, hex, count, on, toggle) {
  const li = document.createElement('li');
  li.innerHTML = `<label class="filter-row ${on ? '' : 'off'}">
    <input type="checkbox" ${on ? 'checked' : ''}>
    <span class="swatch" style="background:${hex}"></span>
    <span class="flabel">${esc(label)}</span>
    <span class="fcount">${count.toLocaleString(numberLocale())}</span></label>`;
  li.querySelector('input').addEventListener('change', e => {
    li.querySelector('.filter-row').classList.toggle('off', !e.target.checked);
    toggle(e.target.checked);
    syncHash();
  });
  return li;
}

function buildFilters() {
  const ul = $('#filter-list');
  ul.innerHTML = '';
  for (const [key, c] of Object.entries(CATS)) {
    const count = key === 'quest' ? S.data.quest.length : S.data[key].length;
    ul.appendChild(filterRow(key, catLabel(key), c.hex, count, c.on, on => {
      c.on = on;
      if (c.dense) scheduleRedraw();
      else on ? map.addLayer(layers[key]) : map.removeLayer(layers[key]);
    }));
  }
  if (S.zonesGeo.length) {
    ul.appendChild(filterRow('zones', tr('zonesLabel'), '#7fc8a9',
      S.zonesGeo.length, S.zonesOn, toggleZones));
  }
  const cl = $('#camp-list');
  if (!deferredReady) {
    cl.innerHTML = `<li class="hint camp-loading">${esc(tr('campLoading'))}</li>`;
  }
  whenDeferred(buildCampFilters);
}

/* Liste des camps (sidebar) — reconstruite une fois camps.json arrivé
   (chargement différé, voir loadDeferred). */
function buildCampFilters() {
  const cl = $('#camp-list');
  cl.innerHTML = '';
  const kinds = Object.entries(S.camps).sort((a, b) => b[1].points.length - a[1].points.length);
  for (const [kind, st] of kinds) {
    cl.appendChild(filterRow('camp:' + kind, campKindLabel(kind), CAMP_COLORS[kind] || '#888',
      st.points.length, st.on, on => { st.on = on; scheduleRedraw(); }));
  }
}

/* ── Recherche ──────────────────────────────────────────────── */
/* Bruit technique (abilities/effets/talents internes, jamais des objets
   joueur) à déprioriser dans les résultats. */
const NOISE_KEY_RE = /^(ab_|abq_|do_|ef_|efq_|tal_)/;
const PLAYER_ITEM_KINDS = new Set(['resource', 'artifact', 'consumable', 'weapon', 'synthesis', 'quest_item', 'rune', 'chip']);
function itemBias(key, it) {
  if (it?.isTest || NOISE_KEY_RE.test(key || '')) return 2;   // bruit technique -> en dernier
  if (it?.isLobby) return 1.5;   // arme de lobby non craftable (SkipForExport) -> après les vrais objets
  // Objet joueur reconnu -> en tête. Icône/rareté couvrent la majorité des
  // items, mais ~9500/16307 n'ont aucune icône extraite (voir data/SCHEMA.md) —
  // craftable (recipes[]), vendu (soldBy[]) ou lootable (drops[]) sont des
  // signaux tout aussi fiables qu'un item existe réellement pour le joueur,
  // sans quoi une arme craftable sans icône se classait derrière une arme de
  // lobby qui en a une (bug vérifié : "Assault Launcher" (lobby) devançait
  // "Assault" (craftable) sur la requête "assault").
  const recognized = PLAYER_ITEM_KINDS.has(it?.kind) &&
    (it?.rarity || it?.icon || it?.recipes?.length || it?.soldBy?.length || it?.drops?.length);
  const base = recognized ? 0 : 1;
  return it?.isRecipe ? base + 0.4 : base;   // la recette d'un objet arrive juste après lui, jamais avant
}
/* Search category TOKENS (stable, language-independent) — see
   pushSearchEntry(): `cat` used to be the already-translated French display
   string doubling as a lookup key; now it's one of these tokens, and
   searchCatLabel() resolves the displayed chip text at render time. */
const CAT_GLYPH = {
  npc: '👤', poi: '📍', quest: '❖', qao: '⚙', workshop: '🛠', camp: '⛺', item: '📦',
  monster: '🐾', zone: '🗺', location: '📖', ability: '✨', event: '⚑', chest: '🧰',
};
const searchCatLabel = key => tbl('searchCat', key) || key;

/* Normalisation de recherche : minuscules, accents pliés (é→e), tout
   séparateur ramené à l'espace — « quete », « QUÊTE » et « quête »
   deviennent la même clé. Le filtre final gardait uniquement [a-z0-9] :
   inoffensif pour les scripts latins (l'accent est déjà réduit par le
   NFD+strip juste avant), mais ça supprimait purement et simplement tout
   caractère cyrillique — la recherche ru/uk ne pouvait donc jamais trouver
   quoi que ce soit (chaîne repliée vide). Ѐ-ӿ (bloc cyrillique de
   base, couvre aussi і/ї/є/ґ ukrainiens) est donc explicitement conservé,
   en plus de a-z0-9, sans toucher au comportement existant pour fr/en/es. */
function fold(s) {
  return String(s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9Ѐ-ӿ]+/g, ' ').trim();
}

/* Distance d'édition bornée (bande de largeur maxD, abandon dès que la
   ligne dépasse maxD) — assez rapide pour être rejouée sur tout l'index
   à chaque frappe. */
function editLe(a, b, maxD) {
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > maxD) return maxD + 1;
  let prev = new Array(lb + 1), cur = new Array(lb + 1);
  for (let j = 0; j <= lb; j++) prev[j] = j;
  for (let i = 1; i <= la; i++) {
    cur[0] = i;
    let rowMin = cur[0];
    const from = Math.max(1, i - maxD), to = Math.min(lb, i + maxD);
    for (let j = 1; j <= lb; j++) {
      if (j < from || j > to) { cur[j] = maxD + 1; continue; }
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (cur[j] < rowMin) rowMin = cur[j];
    }
    if (rowMin > maxD) return maxD + 1;
    const t = prev; prev = cur; cur = t;
  }
  return prev[lb];
}

let searchIndex = [];
/* `body` (optionnel) : corpus de texte supplémentaire au-delà du libellé —
   une quête reste trouvable par un mot de son déroulé (objectif, texte de
   but) et pas seulement son titre. Générique et non localisé en dur : le
   corpus vient tel quel des champs texte déjà résolus par le pipeline
   (site/data/quests.json — objectives/goalTexts/journal), donc suit
   automatiquement la langue chargée le jour où le site en proposera d'autres
   que l'anglais du client. Chaque segment garde sa forme repliée pour la
   recherche + son texte d'origine pour l'indice affiché au résultat. */
function pushSearchEntry(label, cat, hex, x, z, open, icon, sub, glyph, bias, body) {
  const n = fold(label);
  const entry = {
    label, n, words: n.split(' '), cat, hex, x, z, open,
    icon: icon || null, sub: sub || null,
    glyph: glyph || CAT_GLYPH[cat] || '❖', bias: bias || 0,
  };
  if (body && body.length) {
    entry.body = body.filter(Boolean).map(s => { const bn = fold(s); return { text: s, n: bn, words: bn.split(' ') }; });
  }
  searchIndex.push(entry);
  return entry;
}
/* Corpus de recherche « déroulé » d'une quête : objectifs textuels + phrasé
   par but (goalTexts — texte libre distinct du graphe goals[] machine-exact)
   + résumé de journal. Purement additif au titre, jamais affiché tel quel
   (voir renderSearch pour l'indice ponctuel). */
function questSearchBody(q) {
  return [...(q.objectives || []), ...(q.goalTexts || []), ...(q.journal ? [q.journal] : [])];
}
function buildSearch() {
  searchIndex = [];
  const push = pushSearchEntry;
  // Un PNJ connu seulement par le dialogue/graphe de quête (pas de marqueur
  // carte) n'a ni x ni z : la ligne de résultat le dit explicitement plutôt
  // que de laisser un espace vide (le sous-libellé n'était sinon utilisé que
  // pour x/z absents).
  S.data.npc.forEach((r, i) => push(r.name, 'npc', CATS.npc.hex, r.x, r.z, () => openNpcFiche(i),
    null, r.x == null ? tr('posUnknown') : null, initials(r.name)));
  S.data.poi.forEach(r => push(r.name, 'poi', CATS.poi.hex, r.x, r.z));
  S.data.quest.forEach(q => q.x != null && push(q.name, 'quest', CATS.quest.hex, q.x, q.z, () => openQuestFiche(q.slug),
    null, null, null, 0, questSearchBody(q)));
  S.data.qao.forEach(r => push(r.name, 'qao', CATS.qao.hex, r.x, r.z));
  S.data.workshop.forEach(r => push(r.name, 'workshop', CATS.workshop.hex, r.x, r.z));
  // Base de données objets : icône + rareté, pas de position (fiche seule).
  // Bruit technique (ab_/ef_/… , is_test) déprioritisé au profit des objets joueur.
  // Sous-libellé : rareté/nature + type d'arme court (ex. "Rare · Pistolet")
  // quand connu, pour distinguer d'un coup d'œil plusieurs résultats "Arme".
  Object.entries(S.items).forEach(([key, it]) => {
    const kindSub = rarityLabel(it.rarity) || itemKindLabel(it.kind) || '';
    const wtSub = it.weapon?.weapon_type ? weaponTypeLabel(it.weapon.weapon_type) : '';
    push(it.name, 'item', itemColor(it), null, null, () => openItemFiche(key),
      it.icon ? `icons/${it.icon}` : null, [kindSub, wtSub].filter(Boolean).join(' · '),
      itemGlyph(it), itemBias(key, it));
  });
  // Régions nommées (zonesGeo, chargé au critique — voir loadCritical) et
  // coffres placés (S.data.chest, idem) : exhaustivité de la recherche
  // demandée par la mission, ni l'un ni l'autre n'attend camps.json.
  buildZoneSearchIndex();
  buildChestSearchIndex();
  // Monstres/bestiaire-lore/capacités nommées/événements + camps : ajoutés
  // une fois leurs jeux de données différés arrivés (voir loadDeferred) —
  // le tableau searchIndex est déjà branché sur la barre de recherche, un
  // simple push suffit à chacun.
  whenDeferred(buildCampSearchIndex);
  whenDeferred(buildMonsterSearchIndex);
  whenDeferred(buildLocationSearchIndex);
  whenDeferred(buildAbilitySearchIndex);
  whenDeferred(buildEventSearchIndex);
}

/* Camps "destructibles"/"coffres cherchables" : plusieurs entrées de
   camps.json encodent un type de prop précis (tonneau, caisse de légume,
   sac, tombe, cercueil, corps…) comme une simple SOUS-CHAÎNE de leur clé —
   jamais un champ dédié — et une bonne partie d'entre elles ont même leur
   `kind` canonique posé à "poi" plutôt que "destroyable"/"searchable" (ex.
   `fulfillment-manager-poi-destroyable-coffins-cemetery`), donc la détection
   se fait sur la clé elle-même, pas sur g.kind. Traduit ça en un libellé
   lisible et localisé au lieu du slug brut ("destroyable-container-corn-
   goldenfield-town" -> "Caisse de maïs — Goldenfield town"), pour que
   "carotte"/"tonneau"/"coffre" trouvent quelque chose. Repli sans sous-type
   reconnu -> campKindLabel('destroyable'|'searchable') (déjà traduit).
   5 camps "for-delete-*" (kind=destroyable) sont des restes de dev — exclus
   de la recherche entièrement. Toute autre nature de camp (monstres,
   herboristerie, minerai…) garde EXACTEMENT son comportement/libellé
   d'avant (pretty(g.k) brut), rien n'y change. */
const CAMP_TYPE_RULES = [
  [/explosive.?barrels?/, 'barrels'],
  [/corn.?sack/, 'sackCorn'],
  [/wheat.?sack/, 'sackWheat'],
  [/container.?corn\b/, 'crateCorn'],
  [/container.?cabbage/, 'crateCabbage'],
  [/container.?carrot/, 'crateCarrot'],
  [/container.?onion/, 'crateOnion'],
  [/container.?eggplant/, 'crateEggplant'],
  [/container.?berries/, 'crateBerries'],
  [/\bsacks?\b/, 'sacks'],
  [/\bbags?\b/, 'sacks'],
  [/tombstones?/, 'tombstones'],
  [/coffins?/, 'coffins'],
  [/searchable.?chest|\bchest\b/, 'chests'],
  [/corpses/, 'corpses'],
];
function campSearchLabel(k) {
  if (k.includes('for-delete')) return null;   // reste de dev — exclu de la recherche
  if (!k.includes('destroyable') && !k.includes('searchable')) return pretty(k);
  let type = null, rest = k;
  for (const [re, key] of CAMP_TYPE_RULES) {
    const m = re.exec(k);
    if (m) { type = key; rest = k.slice(0, m.index) + k.slice(m.index + m[0].length); break; }
  }
  const typeLabel = type ? tbl('campType', type)
    : campKindLabel(k.includes('searchable') ? 'searchable' : 'destroyable');
  rest = rest.replace(/\b(poi|destroyable|searchable)\b/g, '').replace(/[-_]+/g, ' ').trim();
  return rest ? `${typeLabel} — ${pretty(rest)}` : typeLabel;
}

/* Entrées « Camp » ajoutées à l'index une fois camps.json arrivé (chargement
   différé) — le tableau searchIndex est déjà branché sur la barre de
   recherche, un simple push suffit. */
function buildCampSearchIndex() {
  Object.values(S.camps).forEach(st => st.groups.forEach(g => {
    if (!g.pts.length) return;
    const label = campSearchLabel(g.k);
    if (label == null) return;
    pushSearchEntry(label, 'camp', CAMP_COLORS[g.kind] || '#888', g.pts[0][0], g.pts[0][1]);
  }));
}

/* Coffres placés (tc_*, S.data.chest — ~3830 marqueurs individuels, chargés
   au critique). Un skin de prop (ex. "Chest barrel elenian 02 grey") se
   répète souvent des centaines de fois à l'identique — indexer chaque
   marqueur ferait des centaines de doublons pour une seule recherche ; une
   seule entrée par NOM DISTINCT (~130) suffit et reste honnête (aucune
   position n'est cachée, juste dédoublonnée). Le nom brut n'est pas
   localisé (pas une entrée Localization/, voir data/SCHEMA.md chests) —
   préfixé par le libellé de catégorie déjà traduit (catLabel('chest')) pour
   que "coffre" (FR) / "chest" (EN) / etc. matche quand même. */
function chestSearchLabel(name) {
  const rest = (name || '').replace(/^(small\s+)?chest\s+/i, '').trim();
  return rest ? `${catLabel('chest')} — ${pretty(rest)}` : catLabel('chest');
}
function buildChestSearchIndex() {
  const seen = new Map();
  S.data.chest.forEach(r => { if (!seen.has(r.name)) seen.set(r.name, r); });
  seen.forEach(r => pushSearchEntry(chestSearchLabel(r.name), 'chest', CATS.chest.hex, r.x, r.z));
}

/* Régions nommées (zones_geo.json, chargé au critique — voir loadCritical) :
   clic -> zoom sur les anneaux réels de la région (pas juste son point
   d'étiquette) + active la couche "Zones" si elle était masquée, pour que
   le polygone soit effectivement visible. */
function buildZoneSearchIndex() {
  S.zonesGeo.forEach(z => {
    if (!z.rings?.length) return;
    pushSearchEntry(z.name, 'zone', ZONE_HEX, null, null, () => {
      if (!S.zonesOn) { S.zonesOn = true; toggleZones(true); buildFilters(); }
      map.flyToBounds(L.latLngBounds(z.rings.flat().map(([x, zz]) => toLL(x, zz))).pad(0.15));
    }, null, null, '🗺');
  });
}

/* Monstres : nom (déjà dédupliqué/regroupé au build), sous-libellé "niv X ·
   famille", clic -> fiche (pas de position fixe unique : un monstre peut
   apparaître dans plusieurs camps, listés DANS la fiche). */
function buildMonsterSearchIndex() {
  Object.entries(S.monsters).forEach(([key, m]) => {
    const sub = [m.level != null ? tr('levelAbbrev', m.level) : null, m.family ? pretty(m.family) : null]
      .filter(Boolean).join(' · ');
    pushSearchEntry(m.name, 'monster', MONSTER_HEX, null, null, () => openMonsterFiche(key),
      m.icon ? `icons/${m.icon}` : null, sub, '🐾');
  });
}

/* Bestiaire/lore (MapMarkers.xml) : index = clé de fiche (S.locations est un
   tableau, pas un objet). Sous-libellé = nature (Ville/Bestiaire/Ressource…) ;
   position quand connue (38/208 depuis un pin _ip, le reste sans coordonnée
   fiable — fiche seule, comme un PNJ connu seulement par le dialogue). */
function buildLocationSearchIndex() {
  S.locations.forEach((l, i) => {
    pushSearchEntry(l.title, 'location', LOCATION_HEX, l.x ?? null, l.z ?? null,
      () => openLocationFiche(i), null, locationKindLabel(l.kind), '📖');
  });
}

/* Capacités NOMMÉES seulement (202/1765 — sorts de héros Q/W/E/R/MA ; les
   capacités de monstre n'ont aucune localisation dans le client, voir
   data/SCHEMA.md abilities.json) : indexer les ~1560 restantes n'aurait
   affiché que des libellés de repli vides de sens, sans bénéfice pour la
   recherche. */
function buildAbilitySearchIndex() {
  Object.entries(S.abilities).forEach(([key, a]) => {
    pushSearchEntry(a.name, 'ability', ABILITY_HEX, null, null, () => openAbilityFiche(key),
      null, a.slot || '', '✨');
  });
}

/* Événements de monde NOMMÉS seulement (28/454 — les points anonymes
   WE_SmallPoint/WE_Arena générique/Ghost n'ont pas de nom propre à taper,
   donc restent exclus). Pas de fiche dédiée (comme les points d'intérêt) :
   clic -> va juste voir sur la carte. */
function buildEventSearchIndex() {
  S.events.forEach(e => pushSearchEntry(e.name, 'event', EVENT_HEX, e.x, e.z, null, null, pretty(e.kind), '⚑'));
}

/* Score d'un jeton de requête contre une entrée (plus bas = meilleur) :
   0 mot exact · 1 préfixe de mot · 2 sous-chaîne · 3 ≈1 faute · 4 ≈2 fautes
   (tolérance activée dès 4 lettres, 2 fautes dès 7) ; Infinity = pas trouvé.
   Le préfixe flou couvre la frappe en cours (« steelhar » → Steelheart). */
function tokenScore(tok, entry) {
  let best = Infinity;
  if (entry.n.includes(tok)) {
    best = 2;
    for (const w of entry.words) {
      if (w === tok) return 0;
      if (w.startsWith(tok)) best = 1;
    }
    return best;
  }
  const maxD = tok.length >= 7 ? 2 : tok.length >= 4 ? 1 : 0;
  if (!maxD) return Infinity;
  for (const w of entry.words) {
    let d = editLe(tok, w, maxD);
    if (tok.length < w.length) d = Math.min(d, editLe(tok, w.slice(0, tok.length + maxD), maxD));
    if (d <= maxD) best = Math.min(best, 2 + d);
    if (best === 3) break;
  }
  return best;
}

/* Repli « texte de déroulé » quand le titre ne matche pas : un même segment
   (une phrase d'objectif) doit couvrir la requête — pas la somme éparpillée
   du corpus, sinon deux mots sans rapport dans deux phrases différentes
   produiraient un faux positif. Tolère UN jeton absent (mot parasite —
   « voir » dans « Return voir Slick ») dès 3 jetons ; en dessous, exact.
   `null` si aucun segment n'atteint ce seuil. */
function bodyMatch(tokens, body) {
  const required = tokens.length <= 2 ? tokens.length : tokens.length - 1;
  let best = null;
  for (const seg of body) {
    let score = 0, hits = 0;
    for (const tok of tokens) {
      const s = tokenScore(tok, seg);
      if (s !== Infinity) { hits++; score += s; } else { score += 6; }
    }
    if (hits < required) continue;
    if (!best || hits > best.hits || (hits === best.hits && score < best.score)) best = { seg, hits, score };
  }
  return best;
}

function runSearch(raw) {
  const q = fold(raw);
  if (!q) return [];
  const tokens = q.split(' ');
  const scored = [];
  for (const it of searchIndex) {
    let score = it.bias * 5;
    let ok = true;
    for (const tok of tokens) {
      const s = tokenScore(tok, it);
      if (s === Infinity) { ok = false; break; }
      score += s;
    }
    let bodyHit = null;
    if (!ok && it.body) {
      // Le titre ne matche pas : essaie le corpus étendu (objectifs/texte de
      // quête). Toujours moins prioritaire qu'un match de titre, quel que
      // soit le nombre/la finesse des jetons (+1000 de plancher).
      const bm = bodyMatch(tokens, it.body);
      if (bm) { ok = true; score = 1000 + bm.score; bodyHit = bm.seg.text; }
    }
    if (!ok) continue;
    if (!bodyHit && it.n.startsWith(q)) score -= 0.5;   // départ exact de libellé (titre uniquement)
    scored.push({ it, score, len: it.n.length, bodyHit });
  }
  scored.sort((a, b) => a.score - b.score || a.len - b.len);
  return scored.slice(0, 24).map(s => ({ ...s.it, bodyHit: s.bodyHit }));
}

const resBox = $('#search-results');
let searchTimer = null;
$('#search').addEventListener('input', e => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => renderSearch(e.target.value), 70);
});
function renderSearch(raw) {
  const v = raw.trim();
  resBox.innerHTML = ''; resBox.hidden = !v;
  if (!v) return;
  const res = runSearch(v);
  if (!res.length) {
    resBox.innerHTML = `<li class="hint no-results">
      <span class="no-results-main">${esc(tr('noResults'))}</span>
      <span class="no-results-hint">${esc(tr('noResultsHint'))}</span>
    </li>`;
    return;
  }
  res.forEach(it => {
    const li = document.createElement('li');
    // Indice discret : la quête sort sur un mot de son déroulé, pas de son
    // titre — on montre la phrase qui a matché pour que ce soit lisible.
    const hint = it.bodyHit ? `<div class="sr-hint">${esc(tr('searchBodyHintPrefix'))}${esc(it.bodyHit)}</div>` : '';
    li.innerHTML = `<div class="sr-row">
      <span class="cat-chip" style="--chip-c:${it.hex}">${esc(searchCatLabel(it.cat))}</span>
      ${iconTag(it.icon, 'sr-icon', it.glyph)}
      <span class="sr-label">${esc(it.label)}</span>
      <span class="muted">${it.x != null ? fmtCoord(it.x, it.z) : esc(it.sub || '')}</span>
    </div>${hint}`;
    li.onclick = () => {
      pushFocusState();   // avant mutation — voir pushFocusState()'s doc
      resBox.hidden = true; $('#search').value = it.label;
      if (it.x != null) goTo(it.x, it.z, 3, it.label);
      if (it.open) it.open();
    };
    resBox.appendChild(li);
  });
}
document.addEventListener('click', e => {
  if (!e.target.closest('.search-wrap')) resBox.hidden = true;
});

/* ── Ping (clic droit) ──────────────────────────────────────── */
function setPing(x, z, fly) {
  clearPing();
  const icon = L.divIcon({
    className: 'ping-marker',
    html: '<div class="ping-wave"></div><div class="ping-core"></div>',
    iconSize: [0, 0],
  });
  S.ping = { x, z, mk: L.marker(toLL(x, z), { icon, zIndexOffset: 1000 }).addTo(map) };
  S.ping.mk.bindPopup(`<div class="pop"><h3>${esc(tr('pingTitle'))}</h3>
    <span class="pop-coords">${fmtCoord(x, z)}</span>
    <div class="pop-actions">
      <button class="act primary" data-act="copy-ping">${esc(tr('copyLinkBtn'))}</button>
      <button class="act ghost" data-act="clear-ping">${esc(tr('removeBtn'))}</button>
    </div></div>`);
  if (fly) goTo(x, z);
  syncHash();
}
function clearPing() {
  if (S.ping) { map.removeLayer(S.ping.mk); S.ping = null; syncHash(); }
}
map.on('contextmenu', e => {
  const w = toWorld(e.latlng);
  if (w.x < 0 || w.z < 0 || w.x > WORLD.w || w.z > WORLD.h) return;
  pushFocusState();   // avant mutation — voir pushFocusState()'s doc
  setPing(w.x, w.z);
  S.ping.mk.openPopup();
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  if (b.dataset.act === 'copy-ping' && S.ping) {
    navigator.clipboard?.writeText(location.href.split('#')[0] + buildHash());
    b.textContent = tr('linkCopied');
  } else if (b.dataset.act === 'clear-ping') unfocus(clearPing);
  else if (b.dataset.act === 'clear-locator') unfocus(clearLocator);
});

/* ── URL (hash) ─────────────────────────────────────────────── */
function buildHash() {
  const c = toWorld(map.getCenter());
  const on = [
    ...Object.entries(CATS).filter(([, v]) => v.on).map(([k]) => k),
    ...Object.entries(S.camps).filter(([, v]) => v.on).map(([k]) => 'camp.' + k),
    ...(S.zonesOn ? ['zones'] : []),
  ];
  let h = `#x=${Math.round(c.x)}&z=${Math.round(c.z)}&zm=${map.getZoom().toFixed(2)}&on=${on.join(',')}&lang=${S.lang}`;
  if (S.ping) h += `&ping=${Math.round(S.ping.x)},${Math.round(S.ping.z)}`;
  if (S.locator) h += `&at=${Math.round(S.locator.x)},${Math.round(S.locator.z)}`;
  if (S.locator?.label) h += `&atl=${encodeURIComponent(S.locator.label)}`;
  // Report carry-over : ré-encodé via URLSearchParams (pas de concaténation
  // brute) car `atl` est du texte libre pouvant contenir espaces/accents/`&`
  // — q/i/camp/npc sont de simples clés/slugs, la concaténation brute d'avant
  // n'était sûre que par accident pour eux, pas généralisable à atl. at/atl
  // ne sont reportés depuis l'ANCIEN hash que si S.locator est vide (repli
  // pour une course de démarrage rare) — sinon ils viennent déjà d'être
  // écrits ci-dessus depuis S.locator et les reporter aussi les dupliquerait.
  const p = new URLSearchParams(location.hash.slice(1));
  const carry = new URLSearchParams();
  const carryKeys = S.locator ? ['q', 'camp', 'i', 'npc', 'mon'] : ['q', 'camp', 'i', 'npc', 'mon', 'at', 'atl'];
  for (const k of carryKeys) if (p.has(k)) carry.set(k, p.get(k));
  if ([...carry.keys()].length) h += '&' + carry.toString().replace(/%2C/g, ',');
  return h;
}
let hashTimer = null;
function syncHash() {
  clearTimeout(hashTimer);
  // history.state (pas null) : même raison que setFicheHash() — préserve le
  // marqueur {cpm,cpmSeq} de l'entrée courante à travers un pan/zoom, un
  // toggle de filtre ou un ping/réticule (tous en replaceState, jamais une
  // nouvelle entrée), sans quoi canGoBackLocally() casserait dès le premier
  // déplacement de carte suivant une navigation en app.
  hashTimer = setTimeout(() => history.replaceState(history.state, '', buildHash()), 250);
}
map.on('moveend', syncHash);

function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  const view = p.has('x') ? { x: +p.get('x'), z: +p.get('z'), zm: +p.get('zm') || 2 } : null;
  let onSet = null;
  if (p.has('on')) {
    onSet = new Set(p.get('on').split(',').filter(Boolean));
    for (const k of Object.keys(CATS)) CATS[k].on = onSet.has(k);
    S.zonesOn = onSet.has('zones');
    // les clés camp.* de onSet sont réappliquées une fois camps.json chargé
    // (chargement différé — voir loadDeferred/whenDeferred dans init()).
  }
  const at = p.has('at') ? (([x, z]) => (isNaN(x) || isNaN(z) ? null : { x, z }))(p.get('at').split(',').map(Number)) : null;
  return {
    view, onSet, ping: p.get('ping'), quest: p.get('q'), camp: p.get('camp'), item: p.get('i'),
    npc: p.get('npc'), monster: p.get('mon'), at, atl: p.get('atl') || null,
  };
}

/* ── Historique de navigation (Précédent/Suivant) ──────────────
   Modèle : une entrée d'historique = un instantané COMPLET de l'état focalisé
   (fiche + réticule + ping + filtres + caméra), jamais un diff — restauré par
   applyLocationState() (définie près de init(), plus bas), appelée aussi bien
   au chargement qu'à chaque popstate.

   pushFocusState() est appelé UNE fois, EN DÉBUT de chaque geste utilisateur
   de haut niveau — AVANT ses mutations, pas après (voir les points d'appel :
   clic délégué, résultat de recherche, clic suivi, clic droit/ping). C'est
   l'inverse de ce qu'on ferait naïvement : les fonctions bas niveau
   (setFicheHash/syncHash derrière openXFiche/goTo/setPing) ne font QUE
   replaceState sur l'entrée COURANTE — si on poussait après coup, ce
   replaceState aurait déjà réécrit l'entrée qu'on s'apprête à quitter avec
   le nouvel état, et « Précédent » retomberait sur un doublon de l'état
   qu'on vient de créer plutôt que sur l'état précédent réel (vérifié en
   testant : cause du bug initial de cette fonctionnalité). En poussant
   D'ABORD un doublon exact de l'entrée courante, les replaceState qui
   suivent ne modifient plus que ce doublon (devenu l'entrée courante) —
   l'entrée d'avant-geste reste intacte, intouchée, prête pour Précédent. */
let navSeq = 0;
function pushFocusState() {
  if (S.restoring) return;
  navSeq++;
  history.pushState({ cpm: true, cpmSeq: navSeq }, '', location.hash);
}
/* cpmSeq > 0 ⇒ l'entrée courante a été atteinte par une navigation EN APP
   (l'entrée précédente existe donc et est sûre) → Précédent natif suffit.
   cpmSeq absent/0 (fiche ouverte par lien profond au chargement, aucune
   entrée poussée depuis) → reculer quitterait potentiellement le site :
   nettoyage sur place à la place. */
function canGoBackLocally() {
  return !!(history.state && history.state.cpm && history.state.cpmSeq > 0);
}
function unfocus(clearFn) {
  if (canGoBackLocally()) history.back();   // laisse popstate/applyLocationState tout restaurer
  else clearFn();                            // pas d'historique local sûr → nettoyage sur place
}

/* ── Lecture des coordonnées ────────────────────────────────── */
/* Un mousemove tire à chaque pixel pendant un déplacement de souris ; on ne
   recalcule/repaint le lecteur qu'une fois par frame (rAF), jamais plus. */
let roLatLng = null, roQueued = false;
map.on('mousemove', e => {
  roLatLng = e.latlng;
  if (roQueued) return;
  roQueued = true;
  requestAnimationFrame(() => {
    roQueued = false;
    const w = toWorld(roLatLng);
    $('#ro-coords').textContent = fmtCoord(w.x, w.z);
  });
});
map.on('zoomend', () => { $('#ro-zoom').textContent = 'z' + map.getZoom().toFixed(1).replace(/\.0$/, ''); });

/* ── Panneau ────────────────────────────────────────────────── */
$('#panel-toggle').addEventListener('click', () => {
  const p = $('#panel');
  const hidden = p.classList.toggle('hidden');
  $('#panel-toggle').classList.toggle('solo', hidden);
  $('#panel-toggle').setAttribute('aria-expanded', String(!hidden));
  setTimeout(() => map.invalidateSize(), 280);
});

/* ── i18n : chrome statique + sélecteur de langue ─────────────
   Cohérence UI ⨯ données : changer de langue recharge TOUT le jeu de
   données (site/data/<lang>/) ET retraduit le chrome — jamais l'un sans
   l'autre (voir data/SCHEMA.md "i18n"). Seules les langues à la fois
   présentes dans LANGS (site/js/i18n.js) et dans le dataset construit
   côté données sont proposées. */
function applyStaticI18n() {
  document.documentElement.lang = S.lang;
  $$('[data-i18n]').forEach(el => { el.textContent = tr(el.dataset.i18n); });
  $$('[data-i18n-attr]').forEach(el => {
    el.dataset.i18nAttr.split(';').forEach(pair => {
      const [attr, key] = pair.split(':');
      el.setAttribute(attr, tr(key));
    });
  });
}

let _langSelectWired = false;
function buildLangSelector() {
  const select = $('#lang-select');
  if (!select) return;
  select.setAttribute('aria-label', tr('langSelectorLabel'));
  select.innerHTML = '';
  for (const code of Object.keys(LANGS)) {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = `${LANGS[code].flag} ${LANGS[code].name}`;
    if (code === S.lang) opt.selected = true;
    select.appendChild(opt);
  }
  if (!_langSelectWired) {
    select.addEventListener('change', e => setLang(e.target.value));
    _langSelectWired = true;
  }
}

/* (Ré)enregistre tous les rendus de couches denses (repartis à zéro à
   chaque appel — voir setLang() : sans ce reset, un changement de langue
   dupliquerait chaque fonction de rendu dans denseRenderers). Les camps
   n'existent pas encore au tout premier appel (S.camps est vide avant
   loadDeferred()) : la boucle ne fait alors simplement rien pour eux. */
function registerAllDenseRenderers() {
  denseRenderers.length = 0;
  registerDomDense('npc', 'npc_map');
  registerDomDense('poi', 'interest_points');
  registerDomDense('workshop', 'npc_map'); // ateliers : pictogramme couleur, pas d'icône dédiée
  registerDense('quest', () => S.data.quest.filter(q => q.x != null), CATS.quest.hex,
    q => questPopup(q));
  registerDense('qao', () => S.data.qao, CATS.qao.hex,
    p => popupHtml('qao', p, markerId('qao', S.data.qao.indexOf(p))));
  registerDense('chest', () => S.data.chest, CATS.chest.hex,
    p => popupHtml('chest', p, markerId('chest', S.data.chest.indexOf(p))));
  for (const kind of Object.keys(S.camps)) {
    registerDense('camp:' + kind, () => S.camps[kind].points,
      CAMP_COLORS[kind] || '#888', (p, n) => campPopup(p, n));
  }
}

/* Bascule complète de langue : recharge le jeu de données (site/data/<lang>/)
   ET retraduit le chrome, jamais l'un sans l'autre. Ferme la fiche ouverte
   (son contenu serait sinon figé dans l'ancienne langue) ; les couches
   denses se reconstruisent entièrement à partir des données fraîches. */
async function setLang(code) {
  if (!LANGS[code] || code === S.lang) return;
  S.lang = setLangCode(code); // persists to localStorage + updates <html lang> (site/js/i18n.js)
  closeFiche();
  resBox.hidden = true;
  deferredReady = false;
  try {
    await loadCritical();
  } catch (err) {
    console.error('setLang: reload failed', err);
    return;
  }
  applyStaticI18n();
  buildLangSelector();
  registerAllDenseRenderers();
  buildFilters();
  buildSearch();
  renderTracked();
  if (S.zoneLayer) map.removeLayer(S.zoneLayer);
  buildZoneLayer();
  if (S.zonesOn) map.addLayer(S.zoneLayer);
  denseRenderers.forEach(fn => fn());
  syncHash();
  loadDeferred().then(() => {
    registerAllDenseRenderers();
    denseRenderers.forEach(fn => fn());
  });
}

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
function applyLocationState() {
  S.restoring = true;
  const { view, onSet, ping, quest, camp, item, npc, monster, at, atl } = readHash();

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
    if (camp && S.campDetails[camp]) openCampFiche(camp);
    else if (monster && S.monsters[monster]) openMonsterFiche(monster);
  });

  // Réticule + ping.
  if (at) setLocator(at.x, at.z, atl); else clearLocator();
  if (ping) { const [px, pz] = ping.split(',').map(Number); if (!isNaN(px)) setPing(px, pz); }
  else clearPing();

  S.restoring = false;
}

/* ── Démarrage ──────────────────────────────────────────────── */
(async function init() {
  applyStaticI18n();
  buildLangSelector();
  try {
    await loadCritical();
  } catch (err) {
    $('#loading p').textContent = tr('loadErrorPrefix', err.message);
    return;
  }

  registerAllDenseRenderers();

  buildFilters();
  buildSearch();
  renderTracked();

  // Téléchargements (si les images assemblées existent)
  fetch('download/kwalat_half.jpg', { method: 'HEAD' }).then(r => {
    if (!r.ok) return;
    const foot = document.querySelector('.panel-foot');
    const div = document.createElement('div');
    div.className = 'dl-links';
    div.innerHTML = `<a href="download/kwalat_full.jpg" download>${esc(tr('mapDownload9600'))}</a>
      <a href="download/kwalat_half.jpg" download>${esc(tr('mapDownload4800'))}</a>`;
    foot.prepend(div);
  }).catch(() => {});

  buildZoneLayer();

  applyLocationState();
  $('#loading').classList.add('gone');

  // Entrée baseline : cpmSeq=0 signale "atteinte par lien profond/chargement,
  // pas par une navigation en app" — canGoBackLocally()/unfocus() s'en servent
  // pour savoir si un Précédent natif est sûr (voir pushFocusState() plus haut).
  history.replaceState({ cpm: true, cpmSeq: 0 }, '', location.hash);
  window.addEventListener('popstate', () => applyLocationState());

  // Camps, fiches camp, recettes, stock des vendeurs : chargés en tâche de
  // fond, sans avoir bloqué le premier rendu ni les fiches ci-dessus. Le
  // lien profond camp=<clé> et les filtres de camp sont repris par
  // applyLocationState() elle-même (via whenDeferred, voir plus haut).
  loadDeferred().then(() => {
    registerAllDenseRenderers();
    denseRenderers.forEach(fn => fn());
    // Une fiche item/PNJ ouverte avant l'arrivée des recettes/vendeurs
    // (fenêtre de course rare) est simplement rafraîchie avec les données
    // désormais complètes.
    if (S.openFiche?.kind === 'item') openItemFiche(S.openFiche.id);
    else if (S.openFiche?.kind === 'npc') openNpcFiche(S.openFiche.id);
  });
})();
