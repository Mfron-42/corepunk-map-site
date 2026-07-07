/* Kwalat — repères de navigation : goTo (vol + réticule ambré persistant),
   vague éphémère (pulse) et ping rouge de clic droit. Tous partageables via
   le hash (S.locator / S.ping, lus par urlstate.buildHash). */
import { S } from './state.js';
import { esc, fmtCoord, reduceMotion } from './utils.js';
import { tr } from './i18n/index.js';
import { map, toLL, toWorld, activeMap } from './mapview.js';
import { syncHash, pushFocusState } from './urlstate.js';

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
