/* Kwalat — repères de navigation (goTo : vol + réticule ambré persistant,
   vague éphémère pulse -- partageables via le hash, S.locator, lu par
   urlstate.buildHash) ET drapeaux utilisateur (clic droit, #84) : repères
   MULTIPLES posés à la main par le joueur, persistants en localStorage PAR
   CARTE (jamais dans le hash -- ce ne sont pas des cibles de navigation
   "focus" comme le réticule goto, voir la section dédiée en bas de fichier).
   Vocabulaire/glyphe volontairement DISTINCTS du réticule goto (ambré,
   single-slot, cf. locatorTitle -- "Marker"/"Repère" déjà pris) ET du futur
   "filtre épinglé" du panneau gauche (#82, glyphe épingle ⚲, mot "pin"/
   "épingle") -- ici un petit DRAPEAU teinte --core planté au point exact,
   jamais le mot pin/épingle dans l'UI (voir COORDINATION.md §Vocabulaire). */
import { S } from './state.js';
import { esc, fmtCoord, reduceMotion } from './utils.js';
import { tr } from './i18n/index.js';
import { map, toLL, toWorld, activeMap, findRenderedMarker, refreshIconLayer } from './mapview.js';
import { syncHash } from './urlstate.js';

/* `pinRef` (facultatif, {cat}) : le caller a déjà résolu la cible à une
   entité CONNUE dont un marqueur peut déjà être affiché sur la carte (PNJ,
   coffre placé, camp, coffre fouillable…) — voir resolveGotoMarker ci-dessous,
   qui décide alors de mettre en avant CE marqueur plutôt que de poser un
   réticule synthétique par-dessus (le bug rapporté, voir
   npc_dual_identity_INVESTIGATION.md). Omis (undefined/null) : comportement
   historique inchangé, réticule systématique — c'est le cas légitime pour
   toute cible sans marqueur propre (zone dynamique, centroïde de camp non
   résolu, position brute…). */
function goTo(x, z, zoom, label, pinRef) {
  if (x == null || z == null) return;   // no fixed position (e.g. an NPC known
                                          // only from dialog/quest-slot) -- no-op
                                          // rather than flying to a NaN latlng.
  const ll = toLL(x, z);
  const target = Math.max(map.getZoom(), zoom ?? 3);
  // Le marqueur ciblé (si `pinRef` résout) ne peut être retrouvé qu'une fois
  // la vue effectivement arrivée à destination (couches denses reconstruites
  // sur le NOUVEAU viewport, voir mapview.js renderDense/renderDomCulled) —
  // on attend donc 'moveend', avec un filet de sécurité (setTimeout) pour le
  // cas limite où flyTo/setView ne bougent en fait pas du tout (déjà sur
  // place) et ne redéclenchent donc pas forcément l'événement.
  let settled = false;
  const settle = () => {
    if (settled) return;
    settled = true;
    map.off('moveend', settle);
    // mapview.js's own `scheduleRedraw` is ALSO bound to 'moveend' (registered
    // once, at module init -- long before this call), and it only QUEUES a
    // redraw of every dense layer via requestAnimationFrame rather than
    // redrawing synchronously. rAF callbacks run in registration order, so a
    // callback WE queue now (from a listener that necessarily runs AFTER that
    // earlier one, same synchronous 'moveend' dispatch) always fires AFTER
    // its full redraw completes. Without this, resolveGotoMarker's own
    // targeted refreshIconLayer()+highlight would find/highlight/pop the
    // right marker for one frame, only for scheduleRedraw's own pending
    // redraw to immediately replace that exact DOM element (clearLayers() +
    // rebuild) on the very next frame, silently wiping the highlight/popup —
    // confirmed by direct repro before adding this rAF hop.
    requestAnimationFrame(() => resolveGotoMarker(x, z, label, pinRef));
  };
  map.once('moveend', settle);
  reduceMotion ? map.setView(ll, target) : map.flyTo(ll, target, { duration: .7 });
  setTimeout(settle, reduceMotion ? 0 : 750);
  pulse(ll);
}

/* Résout un « aller à » une fois la vue posée : avec un `pinRef` dont la
   couche cible affiche RÉELLEMENT un marqueur à ces coordonnées exactes
   (findRenderedMarker, gère aussi bien les couches DOM PNJ/POI/atelier que
   les couches canvas denses) -> ouvre son popup + une brève animation de
   sélection (highlightMarker), AUCUN réticule créé. Sinon (pas de pinRef,
   couche masquée/éteinte, marqueur non retrouvé après rafraîchissement) ->
   repli intégral sur le réticule ambré historique (setLocator) — jamais un
   faux « trouvé » qui pointerait vers une entité différente, jamais un
   marqueur supprimé à tort pour une cible qui n'en a réellement aucun. */
function resolveGotoMarker(x, z, label, pinRef) {
  clearMarkerHighlight();
  if (pinRef && pinRef.cat) {
    refreshIconLayer(pinRef.cat);   // rejoue le rendu de CETTE couche sur le viewport final avant de chercher
    const mk = findRenderedMarker(pinRef.cat, x, z);
    if (mk) {
      clearLocator();   // un réticule d'un goto précédent ne doit pas rester à côté du marqueur retrouvé
      mk.openPopup();
      highlightMarker(mk);
      return;
    }
  }
  setLocator(x, z, label);
}

/* Animation de sélection posée sur un marqueur RÉEL déjà rendu (voir
   resolveGotoMarker ci-dessus) : classe CSS auto-effacée (~3.2s, même durée
   que .pulse-ring) ou remplacée par le prochain goto/highlight — jamais
   cumulée (toujours clearMarkerHighlight() d'abord). Seuls les marqueurs DOM
   (PNJ/POI/atelier, L.marker+divIcon) ont un `_icon` réel à styliser ; les
   marqueurs canvas (L.circleMarker) n'ont pas d'élément DOM propre — pour
   ceux-là, le popup ouvert + la vague `pulse()` déjà posée (goTo ci-dessus,
   aux mêmes coordonnées) restent le seul retour visuel, honnête plutôt
   qu'une classe CSS qui ne s'appliquerait à rien. */
let highlightMk = null, highlightTimer = null;
function clearMarkerHighlight() {
  if (highlightTimer) { clearTimeout(highlightTimer); highlightTimer = null; }
  if (highlightMk && highlightMk._icon) highlightMk._icon.classList.remove('pin-highlight');
  highlightMk = null;
}
function highlightMarker(mk) {
  if (mk._icon) mk._icon.classList.add('pin-highlight');
  highlightMk = mk;
  highlightTimer = setTimeout(() => { if (highlightMk === mk) clearMarkerHighlight(); }, 3200);
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
   éphémère (pulse) jugée trop discrète. Distinct des drapeaux utilisateur
   (clic droit, plus bas) : le réticule suit un geste de navigation explicite
   (single-slot, jamais cumulé) plutôt qu'un repère posé à la main que le
   joueur veut garder -- partageable/historisé dans le hash (S.locator
   miroir plat, lu par buildHash() ; voir aussi pushFocusState()/
   applyLocationState() pour l'historique Précédent/Suivant), contrairement
   aux drapeaux qui vivent en dehors de ce modèle (localStorage, jamais le hash). */
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
/* ── Drapeaux utilisateur (clic droit) ── #84 ──────────────────
   Remplace l'ancien "ping" (setPing/clearPing ci-dessus dans les versions
   précédentes de ce fichier) : un marqueur SINGLE-SLOT partagé avec le même
   modèle "focus" que le réticule goto (hash S.ping, remis à zéro par
   applyLocationState()/closeFiche()/tout nouveau clic droit) -- exactement
   le bug rapporté ("les repères disparaissent quand j'en pose un nouveau").
   Les drapeaux sont un système INDÉPENDANT : illimités, jamais touchés par
   pushFocusState/applyLocationState/closeFiche/goTo, persistés en
   localStorage PAR CARTE (clé = S.map), restaurés au chargement et à chaque
   bascule de carte (renderUserFlags, appelée par main.js au boot et à
   chaque hook onMapSwitch -- jamais dans le hash partageable : ce ne sont
   pas des cibles de navigation mais des annotations personnelles). */
const USERFLAGS_LS_KEY = 'cpmap_userflags';
function loadAllUserFlags() {
  try { return JSON.parse(localStorage.getItem(USERFLAGS_LS_KEY) || '{}'); }
  catch (e) { return {}; }
}
function saveAllUserFlags(all) {
  try { localStorage.setItem(USERFLAGS_LS_KEY, JSON.stringify(all)); }
  catch (e) { /* quota / navigation privée -- le drapeau reste visible pour la session, non persisté */ }
}
function userFlagPopupHtml(id, x, z) {
  return `<div class="pop">
    <h3>${esc(tr('userFlagTitle'))}</h3>
    <div class="pop-cat" style="color:var(--core)">${esc(tr('userFlagTitle'))}</div>
    <span class="pop-coords">${fmtCoord(x, z)}</span>
    <div class="pop-actions">
      <button class="act ghost" data-act="remove-user-flag" data-id="${esc(id)}">${esc(tr('removeBtn'))}</button>
      <button class="act ghost" data-act="clear-user-flags">${esc(tr('clearAllFlagsBtn'))}</button>
    </div>
  </div>`;
}
let userFlagLayer = null;            // L.layerGroup monté SEULEMENT pour S.map courante
const userFlagMarkers = new Map();   // id -> L.marker, carte courante uniquement (vidée à chaque renderUserFlags)
function mountUserFlag(id, x, z) {
  if (!userFlagLayer) userFlagLayer = L.layerGroup().addTo(map);
  const mk = L.marker(toLL(x, z), {
    icon: L.divIcon({
      className: 'user-flag-marker',
      html: '<div class="flag-pole"></div><div class="flag-pennant"></div><div class="flag-base"></div>',
      iconSize: [0, 0],
    }),
    zIndexOffset: 890,
  });
  mk.bindPopup(userFlagPopupHtml(id, x, z));
  mk.addTo(userFlagLayer);
  userFlagMarkers.set(id, mk);
  return mk;
}
/* (Re)pose tous les drapeaux de la carte ACTIVE depuis localStorage --
   appelée au boot et à chaque bascule de carte (main.js onMapSwitch) : les
   drapeaux sont scopés par carte, jamais affichés hors de la leur. */
function renderUserFlags() {
  if (userFlagLayer) { map.removeLayer(userFlagLayer); userFlagLayer = null; }
  userFlagMarkers.clear();
  const list = loadAllUserFlags()[S.map] || [];
  list.forEach(p => mountUserFlag(p.id, p.x, p.z));
}
function addUserFlag(x, z) {
  const all = loadAllUserFlags();
  const list = all[S.map] || (all[S.map] = []);
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  list.push({ id, x, z });
  saveAllUserFlags(all);
  mountUserFlag(id, x, z).openPopup();
  pulse(toLL(x, z));   // même vague de confirmation ponctuelle qu'un goTo, voir plus haut
}
function removeUserFlag(id) {
  const all = loadAllUserFlags();
  if (all[S.map]) { all[S.map] = all[S.map].filter(p => p.id !== id); saveAllUserFlags(all); }
  const mk = userFlagMarkers.get(id);
  if (mk) { userFlagLayer?.removeLayer(mk); userFlagMarkers.delete(id); }
}
function clearAllUserFlags() {
  const all = loadAllUserFlags();
  delete all[S.map];
  saveAllUserFlags(all);
  if (userFlagLayer) { map.removeLayer(userFlagLayer); userFlagLayer = null; }
  userFlagMarkers.clear();
}
map.on('contextmenu', e => {
  const w = toWorld(e.latlng);
  if (w.x < 0 || w.z < 0 || w.x > activeMap.w || w.z > activeMap.h) return;
  addUserFlag(w.x, w.z);
});

export { goTo, setLocator, clearLocator, renderUserFlags, removeUserFlag, clearAllUserFlags };
