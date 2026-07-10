/* Kwalat — repères de navigation : goTo (vol + réticule ambré persistant),
   vague éphémère (pulse) et ping rouge de clic droit. Tous partageables via
   le hash (S.locator / S.ping, lus par urlstate.buildHash). */
import { S } from './state.js';
import { esc, fmtCoord, reduceMotion } from './utils.js';
import { tr } from './i18n/index.js';
import { map, toLL, toWorld, activeMap, findRenderedMarker, refreshIconLayer } from './mapview.js';
import { syncHash, pushFocusState } from './urlstate.js';

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
  if (w.x < 0 || w.z < 0 || w.x > activeMap.w || w.z > activeMap.h) return;
  pushFocusState();   // avant mutation — voir pushFocusState()'s doc
  setPing(w.x, w.z);
  S.ping.mk.openPopup();
});

export { goTo, setLocator, clearLocator, setPing, clearPing };
