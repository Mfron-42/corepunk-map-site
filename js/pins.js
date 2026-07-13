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
   jamais le mot pin/épingle dans l'UI (voir  §Vocabulaire). */
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
   ). Omis (undefined/null) : comportement
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
/* ── Pins LOCATE (Q7, spec mapref §9 — ratifié 2026-07-11 soir) ─────────────
   Les pastilles mode L des EntityRef (position/qao/npc/centroïde de zone)
   sont des TOGGLES : un clic AJOUTE un pin locate persistant (marqueur posé
   + caméra centrée), un second clic (ou le ✕ du bandeau-légende) le RETIRE —
   supersède le modèle one-shot goTo/« auto-effacé à la fermeture de fiche »
   de §2.4. État : S.locates (Map clé→{x,z,map,label,hex,kind}), SESSION
   seule — jamais le hash (v1), jamais localStorage : troisième système à
   côté du réticule goto (single-slot, hash S.locator, effacé par closeFiche)
   et des drapeaux utilisateur (clic droit, localStorage par carte) — AUCUN
   des deux n'est touché ici. Clé stable : mapref.js locateRefKey (data-key
   sinon kind+carte+coords arrondies — composée par main.js/sidebar.js via le
   même helper). Multi-cartes : un pin garde sa carte (p.map) ; sur une autre
   carte il ne se DESSINE pas mais RESTE dans le jeu (re-rendu au retour,
   renderLocatePins est rejouée par le hook onMapSwitch de main.js — même
   modèle que les autres couches/les drapeaux). Fermer une fiche ne les
   efface JAMAIS (Q7 : closeFiche ne connaît pas ce module au-delà de
   clearLocator, qui ne touche que le réticule single-slot). Abonnement
   « jeu changé » : même idiome Set que onUserFlagsChange ci-dessous —
   sidebar.js resynchronise bandeau-légende + pastilles L à chaque mutation. */
if (!S.locates) S.locates = new Map();   // posé ICI (pins.js possède le cycle de vie), state.js intact
let locateLayer = null;                  // L.layerGroup monté pour S.map courante seulement
const locateMarkers = new Map();         // clé -> L.marker, carte courante uniquement
const locatesListeners = new Set();
function onLocatesChange(cb) { locatesListeners.add(cb); }
function notifyLocatesChange() { locatesListeners.forEach(cb => cb()); }
function locatePinPopupHtml(key, p) {
  return `<div class="pop">
    <h3>${esc(p.label || tr('locatorTitle'))}</h3>
    <div class="pop-cat" style="color:${esc(p.hex || 'var(--accent)')}">${esc(tr('locatorTitle'))}</div>
    <span class="pop-coords">${fmtCoord(p.x, p.z)}</span>
    <div class="pop-actions"><button class="act ghost" data-act="remove-locate-pin" data-id="${esc(key)}">${esc(tr('removeBtn'))}</button></div>
  </div>`;
}
function mountLocatePin(key, p) {
  if (!locateLayer) locateLayer = L.layerGroup().addTo(map);
  const mk = L.marker(toLL(p.x, p.z), {
    icon: L.divIcon({
      className: 'locate-pin-marker',
      // Teinte du pin = la teinte de la référence qui l'a posé (--ref-c,
      // loi Q6 : la couleur porte l'identité précise) — repli accent.
      html: `<div class="lp-ring" style="--c:${esc(p.hex || 'var(--accent)')}"></div><div class="lp-dot" style="--c:${esc(p.hex || 'var(--accent)')}"></div>`,
      iconSize: [0, 0],
    }),
    zIndexOffset: 940,   // sous le réticule goto (950), au-dessus des couches denses
  });
  mk.bindPopup(locatePinPopupHtml(key, p));
  mk.addTo(locateLayer);
  locateMarkers.set(key, mk);
  return mk;
}
/* (Re)pose tous les pins locate de la carte ACTIVE — appelée par main.js à
   chaque bascule de carte (hook onMapSwitch) : les pins d'une autre carte
   restent dans S.locates (état global) mais ne se dessinent pas ici. */
function renderLocatePins() {
  if (locateLayer) { map.removeLayer(locateLayer); locateLayer = null; }
  locateMarkers.clear();
  for (const [key, p] of S.locates) if ((p.map || S.map) === S.map) mountLocatePin(key, p);
  notifyLocatesChange();
}
/* Ajout = pin posé + caméra centrée (Q7 : « marker drawn + center camera »).
   Le vol reprend l'idiome goTo ci-dessus (flyTo/reduce-motion + vague pulse)
   SANS setLocator/resolveGotoMarker : un pin locate n'est jamais le réticule
   single-slot, et il doit rester posé — pas de repli « marqueur réel mis en
   avant » ici (le pin EST l'état persistant que la légende liste/retire). */
function addLocatePin(key, p) {
  if (!key || p.x == null || p.z == null) return;
  const pin = { x: p.x, z: p.z, map: p.map || S.map, label: p.label || null, hex: p.hex || null, kind: p.kind || null };
  S.locates.set(key, pin);
  if (pin.map === S.map) {
    mountLocatePin(key, pin);
    const ll = toLL(pin.x, pin.z);
    const target = Math.max(map.getZoom(), 3);
    reduceMotion ? map.setView(ll, target) : map.flyTo(ll, target, { duration: .7 });
    pulse(ll);
  }
  notifyLocatesChange();
}
function removeLocatePin(key) {
  S.locates.delete(key);
  const mk = locateMarkers.get(key);
  if (mk) { locateLayer?.removeLayer(mk); locateMarkers.delete(key); }
  notifyLocatesChange();
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
/* Abonnement « liste changée » (remise en place du bloc "Suivi" personnel,
   demande utilisateur 2026-07-11c : « avant j'avais une section pour mes
   pins perso, remets mes pins perso dans suivi ») -- sidebar.js s'abonne UNE
   fois (import-time) pour republier son propre bloc à chaque mutation des
   drapeaux : ajout/suppression/vidage/bascule de carte (les 4 fonctions
   ci-dessous notifient toutes en sortie ; renderUserFlags est déjà appelée
   par main.js au boot et à chaque onMapSwitch -- couvre donc ces deux cas
   sans qu'aucun appelant n'ait besoin de connaître ce module de plus).
   Set plutôt qu'un callback unique : robuste à un futur second abonné, coût
   nul aujourd'hui. */
const userFlagsListeners = new Set();
function onUserFlagsChange(cb) { userFlagsListeners.add(cb); }
function notifyUserFlagsChange() { userFlagsListeners.forEach(cb => cb()); }
/* Lecture seule des drapeaux de la carte ACTIVE -- copie (jamais le tableau
   interne à localStorage) : le seul appelant à ce jour (sidebar.js, bloc
   "Suivi") ne doit muter l'état que via addUserFlag/removeUserFlag/
   clearAllUserFlags ci-dessous, jamais le tableau retourné ici. */
function listUserFlags() {
  return (loadAllUserFlags()[S.map] || []).slice();
}
/* (Re)pose tous les drapeaux de la carte ACTIVE depuis localStorage --
   appelée au boot et à chaque bascule de carte (main.js onMapSwitch) : les
   drapeaux sont scopés par carte, jamais affichés hors de la leur. */
function renderUserFlags() {
  if (userFlagLayer) { map.removeLayer(userFlagLayer); userFlagLayer = null; }
  userFlagMarkers.clear();
  const list = loadAllUserFlags()[S.map] || [];
  list.forEach(p => mountUserFlag(p.id, p.x, p.z));
  notifyUserFlagsChange();
}
function addUserFlag(x, z) {
  const all = loadAllUserFlags();
  const list = all[S.map] || (all[S.map] = []);
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  list.push({ id, x, z });
  saveAllUserFlags(all);
  mountUserFlag(id, x, z).openPopup();
  pulse(toLL(x, z));   // même vague de confirmation ponctuelle qu'un goTo, voir plus haut
  notifyUserFlagsChange();
}
function removeUserFlag(id) {
  const all = loadAllUserFlags();
  if (all[S.map]) { all[S.map] = all[S.map].filter(p => p.id !== id); saveAllUserFlags(all); }
  const mk = userFlagMarkers.get(id);
  if (mk) { userFlagLayer?.removeLayer(mk); userFlagMarkers.delete(id); }
  notifyUserFlagsChange();
}
function clearAllUserFlags() {
  const all = loadAllUserFlags();
  delete all[S.map];
  saveAllUserFlags(all);
  if (userFlagLayer) { map.removeLayer(userFlagLayer); userFlagLayer = null; }
  userFlagMarkers.clear();
  notifyUserFlagsChange();
}
map.on('contextmenu', e => {
  const w = toWorld(e.latlng);
  if (w.x < 0 || w.z < 0 || w.x > activeMap.w || w.z > activeMap.h) return;
  addUserFlag(w.x, w.z);
});

export {
  goTo, setLocator, clearLocator, renderUserFlags, removeUserFlag, clearAllUserFlags,
  onUserFlagsChange, listUserFlags,
  addLocatePin, removeLocatePin, renderLocatePins, onLocatesChange,
};
