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
import { CATS, CAMP_COLORS, DECOR_FAMILIES, DECOR_HEX } from './config.js';
import { $, $$, esc, fmtCoord } from './utils.js';
import { LANGS, setLangCode, tr } from './i18n/index.js';
import {
  map, toWorld, registerDense, registerDomDense,
  denseRenderers, buildZoneLayer, markerId, showHighlight, clearHighlight, hasHighlight,
} from './mapview.js';
import { loadCritical, loadDeferred, resetDeferred, initVersion } from './data.js';
import { startUpdateWatcher, refreshUpdateBannerI18n } from './updatecheck.js';
import { popupHtml, questPopup, campPopup, searchableChestPopup } from './popups.js';
import {
  closeFiche, openNpcFiche, openQuestFiche, openItemFiche, openCampFiche,
  openMonsterFiche, openLocationFiche, openLootTableFiche, openChestFiche,
  openSearchableChestFiche,
  viewGoalZone, flyToQuestZone, viewMonsterZone, setRollRarity,
} from './fiches.js';
import { switchMap, loadMapManifest, onMapSwitch, reloadActiveMapForLang } from './multimap.js';
import { buildSearch, hideSearchResults } from './search.js';
import { buildFilters, renderTracked, toggleTrack, toggleDone, buildBestiary } from './sidebar.js';
import { buildHash, syncHash, pushFocusState, unfocus } from './urlstate.js';
import { goTo, clearPing, clearLocator } from './pins.js';
import { applyLocationState } from './router.js';
import { isHiddenTest, devContentCounts } from './devcontent.js';

// Toggle du bouton « Surligner les N points » -- identité trackée par
// ÉLÉMENT bouton (pas par clé de camp) depuis la section « Comment farmer »
// de la fiche objet (farm_spot_UX_DESIGN.md étape 6.2) : une fiche camp n'a
// jamais qu'UNE seule instance de ce bouton (l'ancienne clé suffisait), mais
// une fiche objet peut désormais en afficher plusieurs à la fois (une par
// ligne de camp + une par groupe « Surligner tout » qui union plusieurs
// camps) -- retrouver LEQUEL était actif pour réinitialiser son libellé
// exige l'élément lui-même, pas une chaîne qui peut être partagée par
// plusieurs boutons rendus simultanément.
let highlightedBtn = null;

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const id = b.dataset.id;
  // Un seul pushFocusState() par geste, ici en TOUT DÉBUT de délégué — avant
  // toute mutation (voir pushFocusState()'s doc : pousser après coup ferait
  // remonter un doublon de l'état déjà réécrit par le replaceState des
  // fonctions bas niveau ci-dessous, pas l'état d'avant-geste).
  if (['fiche-quest', 'fiche-npc', 'fiche-camp', 'fiche-item', 'fiche-monster', 'fiche-location', 'fiche-loot', 'fiche-chest', 'fiche-searchable-chest', 'goto'].includes(b.dataset.act)) pushFocusState();
  if (b.dataset.act === 'track') toggleTrack(id, b);
  else if (b.dataset.act === 'done') toggleDone(id, b);
  else if (b.dataset.act === 'fiche-quest') openQuestFiche(id);
  else if (b.dataset.act === 'fiche-npc') openNpcFiche(+id.split(':')[1]);
  else if (b.dataset.act === 'fiche-camp') openCampFiche(id);
  else if (b.dataset.act === 'fiche-item') openItemFiche(id);
  else if (b.dataset.act === 'fiche-monster') openMonsterFiche(id);
  else if (b.dataset.act === 'fiche-location') openLocationFiche(+id);
  else if (b.dataset.act === 'fiche-loot') openLootTableFiche(id);
  else if (b.dataset.act === 'fiche-chest') openChestFiche(+id.split(':')[1]);
  else if (b.dataset.act === 'fiche-searchable-chest') openSearchableChestFiche(id);
  else if (b.dataset.act === 'camp-highlight') {
    // « Montre-moi TOUS les points de ce contenant » — toggle : un second
    // clic efface le surlignage sans fermer la fiche. `data-ids` (farm_spot_UX
    // : bouton « Surligner tout » d'un groupe de camps, fiches.js openItemFiche)
    // union les points de PLUSIEURS camps ; sans lui, comportement inchangé
    // (un seul camp, `data-id`, exactement l'ancien code de la fiche camp).
    if (highlightedBtn === b && hasHighlight()) {
      clearHighlight();
      b.textContent = tr('highlightPointsBtn', +b.dataset.n || 0);
      highlightedBtn = null;
    } else {
      const ids = b.dataset.ids ? b.dataset.ids.split(',') : (id ? [id] : []);
      const allGroups = Object.values(S.camps).flatMap(st => st.groups);
      const pts = [];
      let color = b.dataset.color || null;
      for (const k of ids) {
        const g = allGroups.find(c => c.k === k);
        if (!g) continue;
        if (!color) color = CAMP_COLORS[g.kind] || '#888';
        pts.push(...g.pts.map(([x, z]) => ({ x, z })));
      }
      if (pts.length) {
        showHighlight(pts, color || '#888');
        // Un AUTRE bouton était actif (ex. on bascule de la ligne d'un camp
        // au bouton « Surligner tout » de son groupe) : son libellé doit
        // revenir à l'état par défaut, jamais rester bloqué sur « Masquer ».
        if (highlightedBtn && highlightedBtn !== b) highlightedBtn.textContent = tr('highlightPointsBtn', +highlightedBtn.dataset.n || 0);
        highlightedBtn = b;
        b.textContent = tr('hideHighlightBtn');
      }
    }
  }
  else if (b.dataset.act === 'roll-rarity') setRollRarity(id, b.dataset.r);
  else if (b.dataset.act === 'zone-view') flyToQuestZone(id);
  else if (b.dataset.act === 'goal-zone-view') viewGoalZone(b.dataset.zi);
  else if (b.dataset.act === 'monster-zone') viewMonsterZone(id);
  else if (b.dataset.act === 'goto') {
    // `data-cat` (facultatif, posé par gotoBtn/fiches.js sur les cibles déjà
    // résolues à une entité connue -- PNJ, coffre placé, camp, coffre
    // fouillable) : voir pins.js goTo()'s pinRef -- met en avant le
    // marqueur RÉEL déjà rendu au lieu d'un réticule redondant à côté.
    const cat = b.dataset.cat || null;
    goTo(+b.dataset.x, +b.dataset.z, undefined, b.dataset.label, cat ? { cat } : null);
  }
  else if (b.dataset.act === 'map-goto') {
    // Acteur/cible sur une AUTRE carte : basculer d'abord, puis focus (les x/z
    // sont dans le repère de la carte cible — voir crossMapBtn).
    const mid = b.dataset.map, x = +b.dataset.x, z = +b.dataset.z, lbl = b.dataset.label;
    switchMap(mid, { keepView: true }).then(() => goTo(x, z, undefined, lbl));
  }
  else if (b.dataset.act === 'map-switch') {
    // Cible sur une AUTRE carte mais SANS position connue dessus (ex.
    // target.map d'une cible receive_reward/talk cross-map — geo.py n'attache
    // jamais x/z avec map dans ce cas précis, voir fiches.js::crossMapOnlyBtn) :
    // simple bascule, rien à viser après (contrairement à map-goto ci-dessus).
    switchMap(b.dataset.map, { keepView: true });
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
  // Retraduit le bandeau "données mises à jour" (js/updatecheck.js) s'il est
  // déjà affiché quand la langue change — no-op sinon.
  refreshUpdateBannerI18n();
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
  // Contenu dev (feature #13) : tout enregistrement isTest masqué de la
  // carte par défaut (S.devOn faux) -- quest/qao ET (parité, data-accuracy
  // audit world_objects.md "isTest gating parity") searchable_chest/
  // camp_chest/decor/npc ci-dessous : monstres/items n'ont pas de couche
  // carte propre (voir js/devcontent.js), mais tout enregistrement AVEC
  // position qui porte isTest:true doit rester filtré, jamais juste 2 des
  // 6 couches concernées. Le point gardé isTest:true (jamais retiré de
  // l'objet, juste laissé passer le filtre quand S.devOn est vrai) pilote
  // le liseré tireté de mapview.js renderDense (npc filtré directement dans
  // mapview.js::renderDomDots/renderDomCulled, seules couches DOM du lot).
  registerDense('quest', () => S.data.quest.filter(q => q.x != null && !isHiddenTest(q)), CATS.quest.hex,
    q => questPopup(q));
  registerDense('qao', () => S.data.qao.filter(p => !isHiddenTest(p)), CATS.qao.hex,
    p => popupHtml('qao', p, markerId('qao', S.data.qao.indexOf(p))));
  // Coffres fouillables RÉELS (searchable_chests.bin, sa propre couche/son
  // propre fichier — voir DATA_CONTRACT.md §2/§4) : couleur/popup dédiés,
  // jamais confondus avec les placements chest ci-dessous.
  registerDense('searchable_chest', () => (S.data.searchable_chest || []).filter(p => !isHiddenTest(p)), CATS.searchable_chest.hex,
    r => searchableChestPopup(r));
  // Coffres de camp RÉELS (S.data.chest `group==="camp_chest"`, skin
  // sci_fi) : sa propre couche de haut niveau, ON par défaut (voir
  // DATA_CONTRACT.md §3.1) — id de marqueur "chest:<i>" conservé (voir
  // config.js chestHex/chestKindLabel) pour que Suivre/Fait/fiche-chest
  // continuent de fonctionner sur ce même S.data.chest partagé.
  registerDense('camp_chest', () => S.data.chest.filter(p => p.group === 'camp_chest' && !isHiddenTest(p)), CATS.camp_chest.hex,
    p => popupHtml('chest', p, markerId('chest', S.data.chest.indexOf(p))));
  // Décor (S.decor, groupe repliable/décoché par défaut — DATA_CONTRACT.md
  // §1/§3.1) : une couche dense par famille, même convention que camp:<kind>
  // ci-dessous (préfixe "decor:", voir mapview.js renderDense). 'legacy'
  // regroupe group==="legacy_chest" (family réelle "greenville" ignorée ici,
  // voir data.js buildDecorGroups) ; les 6 autres clés sont group==="decor"
  // par family.
  for (const fam of DECOR_FAMILIES) {
    registerDense('decor:' + fam, () => S.data.chest.filter(p =>
      (fam === 'legacy' ? p.group === 'legacy_chest' : (p.group === 'decor' && p.family === fam)) && !isHiddenTest(p)),
      DECOR_HEX[fam], p => popupHtml('chest', p, markerId('chest', S.data.chest.indexOf(p))));
  }
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

/* Étiquette « Contenu dev » (feature #13) — tout en bas du panneau, dans le
   pied (.panel-foot, dernier bloc du drawer gauche) : bascule S.devOn ET
   republie TOUT ce qui en dépend en un seul geste, même discipline que
   setLang() plus haut (jamais une mutation isolée qui laisserait une partie
   de l'UI dans l'ancien état) -- couches carte qao/quête (isTest masqué/
   révélé), recherche (monstres/items/objets de quête/quêtes), bestiaire, et
   la fiche ouverte si elle affichait des variantes de monstre. N'existe pas
   du tout tant qu'aucun contenu isTest n'est connu (compte à 0 avant que
   items/qao/quête ne soient chargés au tout premier appel du boot -- voir
   points d'appel dans init()/setLang()/loadDeferred().then ci-dessous) :
   rien à révéler, rien à afficher, pas de bouton fantôme. */
function buildDevToggle() {
  const foot = document.querySelector('.panel-foot');
  if (!foot) return;
  const counts = devContentCounts();
  let btn = foot.querySelector('.dev-toggle');
  if (!counts.total) { btn?.remove(); return; }
  if (!btn) {
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dev-toggle';
    btn.addEventListener('click', () => {
      S.devOn = !S.devOn;
      registerAllDenseRenderers();
      denseRenderers.forEach(fn => fn());
      buildSearch();
      buildBestiary();
      // Légende (js/sidebar.js catStats/positionCounts) : le compte affiché
      // par ligne de filtre applique désormais le même isHiddenTest que le
      // rendu carte (honest-counter fix) -- sans ce rebuild, basculer le
      // contenu dev révélerait des pins isTest supplémentaires sur la carte
      // (registerAllDenseRenderers/denseRenderers ci-dessus) sans jamais
      // mettre à jour le nombre affiché en légende, rouvrant exactement le
      // même genre de décalage nombre-affiché ⨯ pins-réels que ce fix corrige.
      buildFilters();
      buildDevToggle();
      syncHash();
      // La fiche ouverte peut afficher un sélecteur de variantes de monstre
      // (feature #12) dont la liste dépend elle aussi de S.devOn -- la
      // rafraîchir republie les pastilles avec le contenu qui vient d'être
      // montré/masqué, sans perdre la variante actuellement affichée.
      if (S.openFiche?.kind === 'monster') openMonsterFiche(S.openFiche.id);
    });
    foot.appendChild(btn);
  }
  btn.classList.toggle('is-on', S.devOn);
  btn.textContent = tr('devContentTag', counts.total);
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
  buildDevToggle();
  if (S.zoneLayer) map.removeLayer(S.zoneLayer);
  buildZoneLayer();
  if (S.zonesOn) map.addLayer(S.zoneLayer);
  denseRenderers.forEach(fn => fn());
  syncHash();
  loadDeferred().then(() => {
    registerAllDenseRenderers();
    denseRenderers.forEach(fn => fn());
    buildBestiary();   // libellés de familles/zones dans la nouvelle langue
    buildDevToggle();  // le compte de monstres isTest n'est connu qu'ici
  });
}
/* ── Démarrage ──────────────────────────────────────────────── */
(async function init() {
  applyStaticI18n();
  buildLangSelector();
  // Jeton de version (cache-busting, voir js/data.js) : DOIT être chargé
  // avant le tout premier fetch de données ci-dessous, sinon les bundles
  // critiques partiraient sans `?v=` alors que les suivants l'auraient
  // (incohérent). 404/erreur réseau tolérés en silence (repli local/dev).
  await initVersion();
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
    buildBestiary();    // filtre par-carte du bestiaire (m.maps ⨯ carte active) — voir sidebar.js
    buildDevToggle();   // compte qao/quête isTest propre à la carte qui vient d'être chargée
  });

  buildFilters();
  buildSearch();
  renderTracked();
  renderDataDate();
  buildBestiary();   // indication de chargement — repeuplé une fois le différé arrivé
  buildDevToggle();  // compte items/objets de quête/quêtes dispo dès le critique ; monstres ajoutés plus bas

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

  // Boot téléphone : panneau plein écran (voir @media 480px) masqué par
  // défaut — la carte d'abord, le panneau via le hamburger.
  if (matchMedia('(max-width: 520px)').matches) {
    $('#panel').classList.add('hidden');
    $('#panel-toggle').classList.add('solo');
    $('#panel-toggle').setAttribute('aria-expanded', 'false');
    map.invalidateSize();
  }

  // await : un lien profond map=<id> doit avoir basculé la carte avant qu'on
  // masque le voile de chargement (sinon flash de Kwalat puis bascule).
  await applyLocationState();
  $('#loading').classList.add('gone');

  // Surveillance "données mises à jour" (js/updatecheck.js) : démarrée une
  // fois le premier rendu affiché — no-op silencieux si aucun jeton de
  // version n'a pu être chargé au boot (local/dev/avant 1er déploiement).
  startUpdateWatcher();

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
    buildDevToggle();   // le compte de monstres isTest (162) n'est connu qu'ici
    // Une fiche item/PNJ/quête ouverte avant l'arrivée des recettes/vendeurs/
    // monstres (fenêtre de course rare) est simplement rafraîchie avec les
    // données désormais complètes (liens monstre/marchand inclus).
    if (S.openFiche?.kind === 'item') openItemFiche(S.openFiche.id);
    else if (S.openFiche?.kind === 'npc') openNpcFiche(S.openFiche.id);
    else if (S.openFiche?.kind === 'quest') openQuestFiche(S.openFiche.id);
  });
})();
