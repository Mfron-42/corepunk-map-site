/* Kwalat — carte communautaire Corepunk.
   Monde : 9600 × 7680 unités ; tuiles natives zoom 0..2 (1/2/4 px par unité).
   L'axe z du monde pointe vers le nord (haut de l'écran) : la ligne de
   pixels 0 correspond à z = 8704.
   Transform : px(zoom 2) = (x*4, (8704 - z)*4). */
/* main.js — amorçage et câblage : délégué global des actions (data-act),
   enregistrement des rendus de couches, bascule de langue, lecteur de
   coordonnées, hooks de bascule de carte, init. Seul module qui importe
   tout le monde ; aucune logique métier propre. */
import { S } from './state.js';
import { CATS, CAMP_COLORS } from './config.js';
import { $, $$, esc, fmtCoord } from './utils.js';
import { LANGS, setLangCode, tr } from './i18n/index.js';
import {
  map, toWorld, registerDense, registerDomDense,
  denseRenderers, buildZoneLayer, markerId, showHighlight, clearHighlight,
} from './mapview.js';
import { loadCritical, loadDeferred, resetDeferred } from './data.js';
import { popupHtml, questPopup, campPopup } from './popups.js';
import {
  closeFiche, openNpcFiche, openQuestFiche, openItemFiche, openCampFiche,
  openMonsterFiche, openLocationFiche, openLootTableFiche,
  viewGoalZone, flyToQuestZone,
} from './fiches.js';
import { switchMap, loadMapManifest, onMapSwitch, reloadActiveMapForLang } from './multimap.js';
import { buildSearch, hideSearchResults } from './search.js';
import { buildFilters, renderTracked, toggleTrack, toggleDone, buildBestiary } from './sidebar.js';
import { buildHash, syncHash, pushFocusState, unfocus } from './urlstate.js';
import { goTo, clearPing, clearLocator } from './pins.js';
import { applyLocationState } from './router.js';

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const id = b.dataset.id;
  // Un seul pushFocusState() par geste, ici en TOUT DÉBUT de délégué — avant
  // toute mutation (voir pushFocusState()'s doc : pousser après coup ferait
  // remonter un doublon de l'état déjà réécrit par le replaceState des
  // fonctions bas niveau ci-dessous, pas l'état d'avant-geste).
  if (['fiche-quest', 'fiche-npc', 'fiche-camp', 'fiche-item', 'fiche-monster', 'fiche-location', 'fiche-loot', 'goto'].includes(b.dataset.act)) pushFocusState();
  if (b.dataset.act === 'track') toggleTrack(id, b);
  else if (b.dataset.act === 'done') toggleDone(id, b);
  else if (b.dataset.act === 'fiche-quest') openQuestFiche(id);
  else if (b.dataset.act === 'fiche-npc') openNpcFiche(+id.split(':')[1]);
  else if (b.dataset.act === 'fiche-camp') openCampFiche(id);
  else if (b.dataset.act === 'fiche-item') openItemFiche(id);
  else if (b.dataset.act === 'fiche-monster') openMonsterFiche(id);
  else if (b.dataset.act === 'fiche-location') openLocationFiche(+id);
  else if (b.dataset.act === 'fiche-loot') openLootTableFiche(id);
  else if (b.dataset.act === 'camp-highlight') {
    // « Montre-moi TOUS les points de ce contenant » (caisses de maïs,
    // cercueils…) — surlignage éphémère, voir mapview.showHighlight.
    const g = Object.values(S.camps).flatMap(st => st.groups).find(c => c.k === id);
    if (g) showHighlight(g.pts.map(([x, z]) => ({ x, z })), CAMP_COLORS[g.kind] || '#888');
  }
  else if (b.dataset.act === 'zone-view') flyToQuestZone(id);
  else if (b.dataset.act === 'goal-zone-view') viewGoalZone(b.dataset.zi);
  else if (b.dataset.act === 'goto') {
    goTo(+b.dataset.x, +b.dataset.z, undefined, b.dataset.label);
  }
  else if (b.dataset.act === 'map-goto') {
    // Acteur/cible sur une AUTRE carte : basculer d'abord, puis focus (les x/z
    // sont dans le repère de la carte cible — voir crossMapBtn).
    const mid = b.dataset.map, x = +b.dataset.x, z = +b.dataset.z, lbl = b.dataset.label;
    switchMap(mid, { keepView: true }).then(() => goTo(x, z, undefined, lbl));
  }
  // (Ex-second délégué, fusionné : un seul écouteur global data-act.)
  else if (b.dataset.act === 'copy-ping' && S.ping) {
    navigator.clipboard?.writeText(location.href.split('#')[0] + buildHash());
    b.textContent = tr('linkCopied');
  }
  else if (b.dataset.act === 'clear-ping') unfocus(clearPing);
  else if (b.dataset.act === 'clear-locator') unfocus(clearLocator);
});
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
  // PNJ : le clic sur le marqueur ouvre DIRECTEMENT la fiche à droite
  // (quêtes + boutique), en plus du popup (actions rapides Suivre/Fait).
  registerDomDense('npc', 'npc_map', (r, id) => popupHtml('npc', r, id),
    (r, i) => { pushFocusState(); openNpcFiche(i); });
  registerDomDense('poi', 'interest_points', (r, id) => popupHtml('poi', r, id));
  registerDomDense('workshop', 'npc_map', (r, id) => popupHtml('workshop', r, id)); // ateliers : pictogramme couleur, pas d'icône dédiée
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

/* Date de génération des données (site_meta.json) : fraîcheur du jeu de
   données affichée au pied du panneau — chargée depuis le boot mais jamais
   montrée jusqu'ici. Ré-appelée au changement de langue (libellé traduit). */
function renderDataDate() {
  if (!S.meta?.generated) return;
  const foot = document.querySelector('.panel-foot');
  let p = foot.querySelector('.data-date');
  if (!p) { p = document.createElement('p'); p.className = 'data-date'; foot.appendChild(p); }
  p.textContent = tr('dataGeneratedAt', S.meta.generated.split(' ')[0]);
}

/* Bascule complète de langue : recharge le jeu de données (site/data/<lang>/)
   ET retraduit le chrome, jamais l'un sans l'autre. Ferme la fiche ouverte
   (son contenu serait sinon figé dans l'ancienne langue) ; les couches
   denses se reconstruisent entièrement à partir des données fraîches. */
async function setLang(code) {
  if (!LANGS[code] || code === S.lang) return;
  S.lang = setLangCode(code); // persists to localStorage + updates <html lang> (site/js/i18n.js)
  closeFiche();
  hideSearchResults();
  resetDeferred();
  try {
    await loadCritical();
  } catch (err) {
    console.error('setLang: reload failed', err);
    return;
  }
  // Les bundles par carte sont propres à la langue (site/data/<lang>/<mapId>/) :
  // vider le cache et recharger le manifeste + l'index cross-carte pour la
  // nouvelle langue, puis, si l'on n'est pas sur Kwalat, recharger les données
  // de la carte active dans la nouvelle langue (loadCritical n'a rechargé que
  // Kwalat racine).
  await reloadActiveMapForLang();
  applyStaticI18n();
  buildLangSelector();
  registerAllDenseRenderers();
  buildFilters();
  buildSearch();
  renderTracked();
  renderDataDate();
  if (S.zoneLayer) map.removeLayer(S.zoneLayer);
  buildZoneLayer();
  if (S.zonesOn) map.addLayer(S.zoneLayer);
  denseRenderers.forEach(fn => fn());
  syncHash();
  loadDeferred().then(() => {
    registerAllDenseRenderers();
    denseRenderers.forEach(fn => fn());
    buildBestiary();   // libellés de familles/zones dans la nouvelle langue
  });
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

  // Multi-cartes : manifeste léger (sélecteur + transform) + index cross-carte,
  // chargés au boot. 404-tolérant : sans eux, le site reste mono-carte Kwalat
  // exactement comme avant (activeMap garde ses défauts Kwalat).
  await loadMapManifest();
  registerAllDenseRenderers();

  // Rebranchement UI complet à chaque bascule de carte (multimap.switchMap
  // rejoue ces hooks — il ne connaît aucune vue lui-même).
  onMapSwitch(() => {
    closeFiche();
    hideSearchResults();
    clearHighlight();
    if (S.zoneLayer) { map.removeLayer(S.zoneLayer); S.zoneLayer = null; }
    buildZoneLayer();
    if (S.zonesOn && S.zoneLayer) map.addLayer(S.zoneLayer);
    registerAllDenseRenderers();
    buildFilters();
    buildSearch();
  });

  buildFilters();
  buildSearch();
  renderTracked();
  renderDataDate();
  buildBestiary();   // indication de chargement — repeuplé une fois le différé arrivé

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

  // await : un lien profond map=<id> doit avoir basculé la carte avant qu'on
  // masque le voile de chargement (sinon flash de Kwalat puis bascule).
  await applyLocationState();
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
    buildBestiary();
    // Une fiche item/PNJ/quête ouverte avant l'arrivée des recettes/vendeurs/
    // monstres (fenêtre de course rare) est simplement rafraîchie avec les
    // données désormais complètes (liens monstre/marchand inclus).
    if (S.openFiche?.kind === 'item') openItemFiche(S.openFiche.id);
    else if (S.openFiche?.kind === 'npc') openNpcFiche(S.openFiche.id);
    else if (S.openFiche?.kind === 'quest') openQuestFiche(S.openFiche.id);
  });
})();
