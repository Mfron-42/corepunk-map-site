/* Kwalat — vue carte : instance Leaflet, transform monde↔pixel paramétré
   par la carte active, tuiles, couches denses (canvas + DOM culled) et
   couche des régions nommées. Ne connaît AUCUNE vue applicative (popups et
   fiches sont injectés par les appelants — voir registerDense/registerDomDense). */
import { KWALAT_DEFAULTS, TILE_BASE, CATS } from './config.js';
import { S } from './state.js';
import { esc, iconTag, initials } from './utils.js';
import { isHiddenTest, visibleQuestSlugs } from './devcontent.js';

export let activeMap = KWALAT_DEFAULTS;
export function setActiveMap(m) { activeMap = m; }
/* ── Carte ──────────────────────────────────────────────────── */
// minZoom -1 (au lieu de 0) : un cran de dézoom en plus pour voir tout le
// monde plus petit d'un coup (demande utilisateur, map-legibility task).
// minNativeZoom de la couche de tuiles (ci-dessous) reste 0 -- déjà le niveau
// réel le plus bas de la pyramide (dossier "0/") -- donc Leaflet agrandit
// simplement les tuiles zoom 0 pour ce nouveau niveau -1 au lieu de servir du
// gris : aucune tuile "-1/" à générer.
// maxBoundsViscosity 1 (bornes "solides") : sans ça (0 par défaut Leaflet),
// un glisser-déposer rapide au-delà du bord du monde laisse la vue s'arrêter
// dans le vide au-delà de worldBounds.pad(0.12) SANS revenir en arrière au
// relâchement (viscosité 0 = aucune résistance, pas de rebond -- vérifié en
// testant un drag agressif). Avec minZoom -1 la vue couvre plus de monde
// d'un coup, ce vide est donc plus facile à atteindre par erreur -- des
// bornes pleinement solides l'empêchent, quel que soit le niveau de zoom.
const map = L.map('map', {
  crs: L.CRS.Simple,
  minZoom: -1, maxZoom: 5,
  zoomSnap: 0.25, zoomDelta: 0.5,
  wheelPxPerZoomLevel: 90,
  zoomControl: false,
  attributionControl: true,
  maxBoundsViscosity: 1,
});
map.attributionControl.setPrefix(false);
map.attributionControl.addAttribution(
  'Corepunk © Artificial Core — carte communautaire non officielle');
L.control.zoom({ position: 'bottomright' }).addTo(map);

/* Transform monde↔pixel, paramétré par la carte active (Kwalat : ppu 4,
   native_zoom 2, tile_top_z 8704 — strictement identique à l'ancien code
   `x*4, (8704-z)*4, zoom 2`). */
const toLL = (x, z) => map.unproject([x * activeMap.ppu, (activeMap.tile_top_z - z) * activeMap.ppu], activeMap.native_zoom);
const toWorld = ll => { const p = map.project(ll, activeMap.native_zoom); return { x: p.x / activeMap.ppu, z: activeMap.tile_top_z - p.y / activeMap.ppu }; };
let worldBounds = L.latLngBounds(toLL(0, 0), toLL(activeMap.w, activeMap.h));
map.setMaxBounds(worldBounds.pad(0.12));

const Tiles = L.TileLayer.extend({
  // `tile_path` : '' = tuiles Kwalat à la racine du dépôt ; '<mapId>/' = sous-
  // dossier par carte. Le dépôt de tuiles est le même pour toutes les cartes.
  getTileUrl: c => `${TILE_BASE}/${activeMap.tile_path}${c.z}/${c.x}_${c.y}.webp`,
});
let tileLayer = null;
/* Edge-fade task (2026-07-11) : la pyramide de tuiles couvre une bounding box
   RECTANGULAIRE plus grande que le contour réel de chaque carte (îlot Kwalat
   irrégulier dans une boîte 9600x8320, arènes dont le fragment déborde
   légèrement le terrain jouable) --  a réécrit
   CHAQUE tuile de bordure (fond plat de remplissage -> dégradé alpha vers la
   transparence + désaturation vers CETTE MÊME couleur de fond -- voir
   css/style.css #map background: #080c12 -- et tuile réelle en bord de trou
   -> léger fondu directionnel, jamais son contenu masqué). `bounds` élargi à
   worldBounds.pad(0.12) -- IDENTIQUE au pad de setMaxBounds ci-dessus, pas une
   nouvelle valeur inventée -- pour que Leaflet redemande/affiche cette bande
   nouvellement dégradée jusqu'à la même limite que la caméra peut atteindre,
   au lieu de la couper net à l'ancienne bbox jouable (w x h) : sans ça, la
   moitié de la fonte serait présente sur disque mais jamais requêtée. Au-delà
   de cette bordure élargie -- ou pour toute tuile vraiment absente (404) --
   errorTileUrl (1x1 transparent) laisse voir le fond #map, déjà la même
   teinte que la fonte : les deux mécanismes (tuile dégradée, puis vide) se
   raccordent sans coupure visible, à n'importe quel zoom. */
function makeTileLayer() {
  return new Tiles('', {
    tileSize: 512, minNativeZoom: 0, maxNativeZoom: activeMap.tile_max_zoom,
    minZoom: -1, maxZoom: 5, noWrap: true, keepBuffer: 3,
    bounds: worldBounds.pad(0.12), className: 'map-tiles',
    errorTileUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  });
}
tileLayer = makeTileLayer();
tileLayer.addTo(map);

/* Vignette de cadrage (polish front, edge-fade task) : assombrit très
   légèrement les coins/bords du VIEWPORT (pas du monde -- un cadre d'écran,
   comme une table de cartographe sous une lampe, cohérent avec la direction
   déjà posée par css/style.css : "instrument moderne"), pour que la fonte au
   niveau tuile (ci-dessus) se prolonge visuellement jusqu'au bord de l'écran
   même quand la zone dégradée réelle est petite à l'écran (zoom arrière,
   petite arène). Injecté ici (jamais dans css/style.css, propriété d'un autre
   chantier en cours) : <style> pour la classe, DOM ajouté après tuiles/couches
   -- non interactif (pointer-events:none), reste sous TOUTE couche de
   données -- z-index 350, entre tilePane (200) et overlayPane (400, où
   vit canvasR ci-dessus) -- pour ne jamais assombrir un point canvas, un
   pin DOM (markerPane 600) ou un popup (700), seulement les tuiles. */
(function injectEdgeVignette() {
  const style = document.createElement('style');
  style.textContent = `
    .map-edge-vignette {
      position: absolute; inset: 0; z-index: 350;
      pointer-events: none;
      background: radial-gradient(ellipse at center,
        rgba(8,12,18,0) 55%, rgba(8,12,18,.10) 78%, rgba(8,12,18,.30) 100%);
      mix-blend-mode: normal;
    }`;
  document.head.appendChild(style);
  const vignette = document.createElement('div');
  vignette.className = 'map-edge-vignette';
  map.getContainer().appendChild(vignette);
})();

const canvasR = L.canvas({ padding: 0.35 });
/* ── Marqueurs ──────────────────────────────────────────────── */
const layers = {};   // cat -> L.LayerGroup
function markerId(cat, i) { return `${cat}:${i}`; }

/* Indicateur « donne une quête » (task "NPCs hold their quests", 2026-07-11)
   -- un petit accent violet (teinte CATS.quest.hex) posé au coin du pin PNJ
   plutôt qu'un point/popup séparé (l'ancienne couche canvas `quest`,
   retirée -- voir main.js registerAllDenseRenderers) : la quête reste
   lisible directement SUR le pin qui la donne, jamais un marqueur en
   doublon. Placé en SIBLING de `.mk-pin` (jamais un enfant : `.mk-pin` a
   `overflow: hidden` pour rogner le portrait rond, un enfant positionné à
   cheval sur le bord serait tronqué) à l'intérieur du même conteneur `.mk`
   que Leaflet positionne déjà en absolu -- voir css/style.css `.mk-quest-
   badge`. 323 PNJ sur Kwalat (coût négligeable, un <span> de plus par
   portrait déjà construit) : jamais posé sur les points canvas agrégés du
   repli zoomé (renderDomDots, cat toujours 'npc' mais pas de portrait/HTML
   par point à ce niveau de zoom -- resterait un simple point, l'accent n'y
   ajouterait rien de lisible), seulement sur les portraits DOM ci-dessous. */
function domIcon(cat, iconUrl, done, name, hasQuest) {
  const badge = hasQuest ? `<span class="mk-quest-badge" style="--quest:${CATS.quest.hex}"></span>` : '';
  return L.divIcon({
    className: 'mk' + (done ? ' mk-done' : ''),
    html: `<div class="mk-pin" style="--pin:${CATS[cat].hex}">${iconTag(iconUrl, 'mk-img', initials(name))}</div>${badge}`,
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
  // Couches "decor:<famille>" (S.decor, groupe "Décor" — voir config.js
  // DECOR_FAMILIES/js/sidebar.js buildDecorGroup) : l'état on/off vit dans
  // un dict à part plutôt que dans CATS (nombre de sous-couches variable,
  // connu seulement une fois les données arrivées).
  // "campComposite" (#82 chunk (b), design §4.3) : LE rendu unique de TOUS
  // les points de camp — remplace les anciennes couches "camp:<kind>" (une
  // par kind, voir main.js registerAllDenseRenderers). Pas d'état on/off
  // propre : la liste fournie par main.js compositeCampPoints() est déjà le
  // résultat des sélecteurs actifs (filtre épinglé > famille > kind), vide
  // quand rien n'est coché — chaque point porte sa couleur GAGNANTE dans
  // `p.c` (lue par fillColor ci-dessous) et chaque point de camp est
  // dessiné AU PLUS une fois par passe, quel que soit le nombre de
  // sélecteurs qui recouvrent son camp. (Le préfixe "camp:" reste compris
  // ci-dessous par prudence — plus aucun renderer ne l'enregistre.)
  const st = cat === 'campComposite' ? { on: true }
    : cat.startsWith('camp:') ? S.camps[cat.slice(5)]
    : cat.startsWith('decor:') ? S.decor[cat.slice(6)] : CATS[cat];
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
    // Contenu dev révélé (feature #13 — p.isTest n'est jamais présent du
    // tout tant que S.devOn est faux : le point n'a alors même pas atteint
    // ce rendu, filtré en amont par le getPoints() du registerDense appelant,
    // voir main.js registerAllDenseRenderers). Liseré rouge tireté au lieu du
    // liseré neutre habituel -- même couleur que --danger (css/style.css),
    // reprise en dur ici (marqueurs canvas Leaflet, pas de CSS applicable) --
    // subtil mais suffisant pour distinguer un point de test sans lui
    // inventer une toute nouvelle couche/catégorie de filtre.
    const isDev = !!p.isTest;
    const mk = L.circleMarker(toLL(p.x, p.z), {
      renderer: canvasR, radius: n > 1 ? Math.min(6 + Math.log2(n) * 1.8, 13) : 4.6,
      color: isDev ? '#e0645c' : '#0a0e14', weight: isDev ? 1.8 : 1.2, dashArray: isDev ? '2,2' : null,
      // `p.c` : couleur PAR POINT posée par le compositeur de camps (main.js
      // compositeCampPoints — la teinte du sélecteur gagnant du camp de ce
      // point) ; absente partout ailleurs → couleur de couche historique.
      // Une cellule agrégée (n>1) prend la couleur de son premier point.
      fillColor: p.c || color, fillOpacity: n > 1 ? .75 : .88,
    });
    // Repère de position (goto conscient du pin, voir pins.js
    // resolveGotoMarker/findRenderedMarker ci-dessous) : seulement pour un
    // point NON agrégé (n===1) -- une cellule agrégée (n>1) représente
    // plusieurs points confondus, aucun marqueur individuel n'existe pour
    // l'un d'eux en particulier, jamais de correspondance inventée.
    if (n === 1) mk._meta = { cat, p };
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
/* Sous ce zoom, les portraits DOM (30 px) s'empilent en tas illisible en
   ville : la couche passe en petits points canvas (même palette) et ne
   repasse aux portraits qu'au-delà. */
const DOM_MIN_ZOOM = 1.5;
/* POI : visibilité PAR ENREGISTREMENT (poiType, 8 sous-lignes du sous-groupe
   World > Points d'intérêt, job pass 2026-07-11b — voir config.js POI_TYPES/
   sidebar.js buildPoiSubGroup). CATS.poi.on lui-même n'est plus la source de
   vérité (remplacé par S.poiTypes, un jeton par sous-catégorie) -- même
   traitement que CATS.quest.on (config.js) : gardé pour son `.hex` seulement,
   ne pilote plus aucun rendu. Toujours `true` pour tout autre `cat` (npc/
   workshop -- aucune sous-catégorie de visibilité pour eux). */
const poiRecordOn = (cat, r) => cat !== 'poi' || !!S.poiTypes[r.poiType]?.on;
function renderDomDots(cat, g, popupFor, onSelect) {
  const c = CATS[cat];
  const t = worldToPxTransform();
  const pb = map.getPixelBounds();
  const padX = (pb.max.x - pb.min.x) * 0.25, padY = (pb.max.y - pb.min.y) * 0.25;
  const arr = S.data[cat];
  for (let i = 0; i < arr.length; i++) {
    const r = arr[i];
    if (r.x == null || r.z == null) continue;
    if (isHiddenTest(r)) continue;   // contenu dev/test (feature #13) : masqué sauf S.devOn — parité npc/poi/workshop avec qao
    if (!poiRecordOn(cat, r)) continue;
    const q = fastProject(t, r.x, r.z);
    if (q.x < pb.min.x - padX || q.x > pb.max.x + padX || q.y < pb.min.y - padY || q.y > pb.max.y + padY) continue;
    const id = markerId(cat, i);
    const mk = L.circleMarker(toLL(r.x, r.z), {
      renderer: canvasR, radius: 4.6, color: '#0a0e14', weight: 1.2,
      fillColor: c.hex, fillOpacity: .88,
    });
    mk._meta = { cat, i, id, r };
    mk.bindPopup(() => popupFor(r, id), { maxWidth: 300 });
    if (onSelect) mk.on('click', () => onSelect(r, i));
    g.addLayer(mk);
  }
}
function renderDomCulled(cat, iconPathFor, popupFor, onSelect) {
  const g = layers[cat] || (layers[cat] = L.layerGroup().addTo(map));
  g.clearLayers();
  const c = CATS[cat];
  // 'poi' : au moins une sous-catégorie ON (le gate historique CATS.poi.on
  // n'est plus écrit par aucune case du panneau -- voir poiRecordOn ci-dessus)
  // -- pur raccourci perf (évite la boucle si tout est décoché), le filtre
  // RÉEL par enregistrement se fait plus bas (poiRecordOn).
  const anyOn = cat === 'poi' ? Object.values(S.poiTypes).some(st => st.on) : (c && c.on);
  if (!c || !anyOn) return;
  if (map.getZoom() < DOM_MIN_ZOOM) { renderDomDots(cat, g, popupFor, onSelect); return; }

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
    if (isHiddenTest(r)) continue;   // contenu dev/test (feature #13) : masqué sauf S.devOn — parité npc/poi/workshop avec qao
    if (!poiRecordOn(cat, r)) continue;
    const q = fastProject(t, r.x, r.z);
    if (q.x < minX || q.x > maxX || q.y < minY || q.y > maxY) continue;
    const id = markerId(cat, i);
    const url = r.icon ? `icons/${iconPathFor}/${encodeURIComponent(r.icon)}.png` : null;
    // Accent "donne une quête" (voir domIcon ci-dessus) : seulement pour les
    // PNJ, et seulement des quêtes RÉELLEMENT visibles (même garde que la
    // popup PNJ/la fiche -- visibleQuestSlugs, jamais un simple hello_/
    // info_ bark compté comme une quête).
    const hasQuest = cat === 'npc' && visibleQuestSlugs(r.quests).length > 0;
    const mk = L.marker(toLL(r.x, r.z), { icon: domIcon(cat, url, S.done.has(id), r.name, hasQuest) });
    mk._meta = { cat, i, id, r };
    mk.bindPopup(() => popupFor(r, id), { maxWidth: 300 });
    // `onSelect` (facultatif, posé par main.js) : ouverture directe de la
    // fiche au clic sur le marqueur, EN PLUS du popup (actions rapides) —
    // demandé pour les PNJ : un clic = boutique/quêtes à droite.
    if (onSelect) mk.on('click', () => onSelect(r, i));
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
function registerDomDense(cat, iconPath, popupFor, onSelect) {
  const fn = () => renderDomCulled(cat, iconPath, popupFor, onSelect);
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
/* Les points de camp vivent désormais TOUS dans la couche composite unique
   "campComposite" (#82 chunk (b), voir renderDense ci-dessus) — les
   appelants qui adressent encore une couche par kind ("camp:<kind>", ex.
   les boutons goto data-cat="camp:…" des fiches, pins.js resolveGotoMarker)
   sont redirigés ici plutôt que corrigés un à un : même comportement
   qu'avant (couche éteinte → marqueur introuvable → réticule de repli). */
const layerCatFor = cat => (cat && cat.startsWith('camp:')) ? 'campComposite' : cat;
function refreshIconLayer(cat) {
  denseByCat[layerCatFor(cat)]?.(); // rejoue le rendu (canvas ou DOM culled) de cette seule couche
}
/* Marqueur déjà RENDU à une position exacte (goto conscient du pin -- voir
   pins.js resolveGotoMarker) : cherche, dans la couche `cat` actuellement
   affichée, un marqueur dont la position mémorisée dans `_meta` (posée par
   renderDomCulled/renderDomDots -- `.r`, le point de données -- ou
   renderDense -- `.p`, seulement pour un point NON agrégé en cellule)
   coïncide avec (x,z). `eps` minuscule : tolérance de round-trip flottant
   (l'appelant relit x/z depuis un attribut data-x/data-z), PAS une tolérance
   de proximité floue -- un point à quelques unités de là (ex. la position
   brute d'un donneur de quête vs. le pin PNJ réel, voir
   npc_dual_identity_INVESTIGATION.md §2/§3) ne doit JAMAIS matcher ici ; ce
   cas se corrige en amont, à l'appelant, en visant directement les
   coordonnées du pin plutôt qu'en élargissant cette tolérance. Renvoie null
   pour toute autre raison (couche masquée/éteinte -- son groupe est alors
   vide, voir renderDense/renderDomCulled -- hors vue même après
   rafraîchissement, ou point agrégé) : l'appelant retombe alors sur le
   réticule ambré historique, jamais un marqueur voisin mais différent. */
function findRenderedMarker(cat, x, z, eps = 0.05) {
  const g = layers[layerCatFor(cat)];   // "camp:<kind>" → couche composite, voir layerCatFor
  if (!g) return null;
  let found = null;
  g.eachLayer(mk => {
    if (found) return;
    const meta = mk._meta;
    if (!meta) return;
    const src = meta.r || meta.p;
    if (!src || src.x == null || src.z == null) return;
    if (Math.abs(src.x - x) <= eps && Math.abs(src.z - z) <= eps) found = mk;
  });
  return found;
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

/* ── Surlignage ponctuel de points (contenants typés, skins de coffre) ──
   Couche éphémère de LECTURE (« montre-moi TOUTES les caisses de maïs / tous
   les tonneaux de ce skin ») : remplacée à chaque appel, retirée à la
   fermeture de fiche (closeFiche) et à la bascule de carte (les points sont
   dans le repère de la carte active). Canvas non interactif. */
let highlightLayer = null;
function clearHighlight() {
  if (highlightLayer) { map.removeLayer(highlightLayer); highlightLayer = null; }
}
function hasHighlight() { return !!highlightLayer; }
function showHighlight(points, color) {
  clearHighlight();
  if (!points.length) return;
  const g = L.layerGroup();
  for (const p of points) {
    L.circleMarker(toLL(p.x, p.z), {
      renderer: canvasR, radius: 5.5, color: '#0a0e14', weight: 1.2,
      fillColor: color, fillOpacity: .95, interactive: false,
    }).addTo(g);
  }
  highlightLayer = g.addTo(map);
  map.flyToBounds(L.latLngBounds(points.map(p => toLL(p.x, p.z))).pad(0.15));
}

/* (Re)calage complet de la géométrie sur la carte active : bornes monde,
   bornes max, couche de tuiles (tile_path/maxNativeZoom propres à la carte).
   Appelé par multimap.switchMap() — strictement le bloc qu'il inlinait. */
function applyMapGeometry() {
  worldBounds = L.latLngBounds(toLL(0, 0), toLL(activeMap.w, activeMap.h));
  map.setMaxBounds(worldBounds.pad(0.12));
  if (tileLayer) map.removeLayer(tileLayer);
  tileLayer = makeTileLayer();
  tileLayer.addTo(map);
}

export {
  map, toLL, toWorld, worldBounds, applyMapGeometry, canvasR,
  layers, markerId, registerDense, registerDomDense,
  denseRenderers, scheduleRedraw, refreshIconLayer, findRenderedMarker,
  buildZoneLayer, toggleZones, showHighlight, clearHighlight, hasHighlight,
};
