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
import { CATS, CAMP_COLORS, DECOR_FAMILIES, DECOR_HEX, familyLayerHex } from './config.js';
import { $, $$, esc, fmtCoord } from './utils.js';
import { LANGS, setLangCode, tr } from './i18n/index.js';
import {
  map, toWorld, registerDense, registerDomDense, scheduleRedraw,
  denseRenderers, buildZoneLayer, markerId, showHighlight, clearHighlight, hasHighlight,
} from './mapview.js';
import { loadCritical, loadDeferred, resetDeferred, initVersion, whenDeferred } from './data.js';
import { startUpdateWatcher, refreshUpdateBannerI18n } from './updatecheck.js';
import { popupHtml, campPopup, searchableChestPopup } from './popups.js';
import {
  closeFiche, openNpcFiche, openQuestFiche, openItemFiche, openCampFiche,
  openMonsterFiche, openFamilyFiche, openLocationFiche, openLootTableFiche, openChestFiche,
  openSearchableChestFiche, openRecipeFiche, openNodeFiche, openAbilityFiche, openRegionFiche,
  openTalentFiche, openSpecFiche, openProfessionFiche,
  viewGoalZone, flyToQuestZone, viewMonsterZone, drawNamedZone, setRollRarity,
} from './fiches.js';
import { switchMap, loadMapManifest, onMapSwitch, reloadActiveMapForLang } from './multimap.js';
import {
  campGroupByKey, monsterFamilies, speciesPoints, kindBoundCampKeys,
} from './pointsets.js';
import { toggleSpecies, speciesCampWinner, setFamilyOn } from './specieslayer.js';
import { activateSpeciesLayer, activateFamilyLayers, activateCategoryNode } from './layeractivate.js';
import { initMapRefDelegation, locateRefKey, refKindLabel } from './mapref.js';
import { buildSearch, hideSearchResults } from './search.js';
import {
  buildFilters, renderTracked, toggleTrack, toggleDone, revealMonsterNode,
} from './sidebar.js';
import { syncHash, pushFocusState, unfocus, chestIndexForToken, locationIndexForToken } from './urlstate.js';
import {
  goTo, clearLocator, renderUserFlags, removeUserFlag, clearAllUserFlags,
  addLocatePin, removeLocatePin, renderLocatePins,
} from './pins.js';
import { applyLocationState } from './router.js';
import { isHiddenTest, devContentCounts } from './devcontent.js';
import './analytics.js';

/* ── Surlignage transitoire d'UN camp (EntityRef vague 2) ────────────────────
   Un camp individuel (fiche camp / lignes de farm) n'a AUCUN nœud d'arbre : son
   tracé n'existe que comme surlignage transitoire single-slot — l'équivalent
   honnête le plus proche de l'ex-bouton de surlignage de camp (retiré,
   kill-list §7.2 ; idem l'ex-surlignage de couche coffres). La référence `[Camp(●)]`
   (fiches.js campRef) bascule le surlignage de SES points ; showHighlight centre
   aussi la caméra. Single-slot (showHighlight efface le précédent), effacé à la
   fermeture de fiche (fiches.js closeFiche → clearHighlight). `highlightedCampKey`
   mémorise le camp en avant pour (a) basculer OFF au re-clic, (b) éteindre la
   pastille de l'autre camp quand on change. L'état n'est PAS persisté (rendu
   initial toujours OFF — parité stricte avec l'ancien bouton dont le libellé se
   réinitialisait à chaque rendu) : on reflète l'état sur la pastille CLIQUÉE
   (aria-pressed + remplissage), même geste que l'ex-handler species-layer
   flippait son bouton. */
let highlightedCampKey = null;
function setCampRefBubble(el, on) {
  const tag = el?.querySelector('.ref-tag');
  const bub = el?.querySelector('.ref-bubble');
  if (tag) tag.setAttribute('aria-pressed', String(on));
  // ne jamais écraser un état ⊘ (0 point ici) — un camp surlignable a toujours
  // des points, mais garde défensive symétrique du refFill de mapref.js.
  if (bub && bub.dataset.fill !== 'empty' && bub.dataset.fill !== 'empty-on') {
    bub.setAttribute('data-fill', on ? 'on' : 'off');
  }
}
function toggleCampHighlight(info) {
  const g = info.key ? campGroupByKey(info.key) : null;
  if (!g) return;
  if (highlightedCampKey === info.key && hasHighlight()) {
    clearHighlight();
    highlightedCampKey = null;
    setCampRefBubble(info.el, false);
    return;
  }
  const pts = g.pts.map(([x, z]) => ({ x, z }));
  if (!pts.length) return;
  // un AUTRE camp était en avant : éteindre sa pastille (si encore dans le
  // drawer) avant d'allumer le nouveau (single-slot, comme l'ancien bouton).
  if (highlightedCampKey && highlightedCampKey !== info.key) {
    const prev = document.querySelector(`#detail .ref[data-kind="camp"][data-key="${CSS.escape(highlightedCampKey)}"]`);
    if (prev) setCampRefBubble(prev, false);
  }
  showHighlight(pts, CAMP_COLORS[g.kind] || '#888');
  highlightedCampKey = info.key;
  setCampRefBubble(info.el, true);
}

/* ── Couches espèce/famille (#82 chunk (d)) : orchestration d'un geste ────
   DÉCISION UTILISATEUR (évolution 2026-07-11, « l'arbre EST le bestiaire ») :
   le clic sur un chip d'entité DANS une fiche fait LES DEUX — il ouvre la
   fiche (comportement existant, inchangé) ET coche le BON nœud de l'arbre
   (espèce quand la précision espèce est prouvée, famille quand seul le
   groupe l'est — échelle de précision ) quand un point-set
   existe. Pas de point-set → fiche seule (le state-chip de la fiche dit
   déjà « inconnu ») ; le clic n'est JAMAIS mort. Dédoublonnage = c'est une
   case (re-cliquer re-révèle la ligne déjà cochée) ; retrait = décocher
   dans l'arbre. activateSpeciesLayer/activateFamilyLayers (la composition
   elle-même) vivent désormais dans js/layeractivate.js — EXTRAITES d'ici
   (2026-07-11, mission "search activation") pour que js/search.js réutilise
   EXACTEMENT le même point d'orchestration sur ses résultats espèce/famille,
   plutôt que d'en re-dériver une seconde copie divergente (main.js n'exporte
   jamais rien, voir son en-tête). */
/* Espèce cochable d'un chip monstre (id = clé S.monsters) : la couche vit
   au grain ESPÈCE (référence canonique, ) — résolue via le
   catalogue puis le résolveur unique ; null quand aucun camp ne joint sur la
   carte active (93/209 espèces — la fiche seule s'ouvre alors, l'arbre
   reste la voie manuelle vers sa ligne « 0 camp »). */
function monsterChipSpeciesId(monsterKey) {
  const spId = S.monsters[monsterKey]?.species;
  return (spId && speciesPoints(spId)) ? spId : null;
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const id = b.dataset.id;
  // Portée du clic-double-effet : les chips DANS le drawer de fiche (#detail)
  // — « les panneaux à droite focusent des trucs ET activent des filtres »
  // (phrase canonique). Recherche/bestiaire (gauche) et popups de carte
  // (« les points de la carte focusent ») restent focus-seul. Évalué AVANT
  // toute ouverture de fiche : openFiche() remplace #detail-body et
  // détacherait `b` de son ancêtre.
  const inFiche = !!b.closest('#detail');
  // Un seul pushFocusState() par geste, ici en TOUT DÉBUT de délégué — avant
  // toute mutation (voir pushFocusState()'s doc : pousser après coup ferait
  // remonter un doublon de l'état déjà réécrit par le replaceState des
  // fonctions bas niveau ci-dessous, pas l'état d'avant-geste).
  if (['fiche-quest', 'fiche-npc', 'fiche-camp', 'fiche-item', 'fiche-monster', 'fiche-family', 'fiche-location', 'fiche-loot', 'fiche-chest', 'fiche-searchable-chest', 'fiche-recipe', 'fiche-node', 'goto'].includes(b.dataset.act)) pushFocusState();
  if (b.dataset.act === 'track') toggleTrack(id, b);
  else if (b.dataset.act === 'done') toggleDone(id, b);
  else if (b.dataset.act === 'fiche-quest') openQuestFiche(id);
  else if (b.dataset.act === 'fiche-npc') openNpcFiche(+id.split(':')[1]);
  else if (b.dataset.act === 'fiche-camp') openCampFiche(id);
  else if (b.dataset.act === 'fiche-item') openItemFiche(id);
  else if (b.dataset.act === 'fiche-monster') {
    // Clic-double-effet (#82 chunk (d), décision utilisateur) : fiche + case
    // ESPÈCE de l'arbre cochée quand un point-set existe — uniformément sur
    // tout chip monstre d'une fiche (étape de quête, « En tuant X » d'une
    // fiche objet, liste de mobs d'une fiche camp, pastilles de variante…).
    // Espèce résolue AVANT l'ouverture (elle remplace le contenu du drawer).
    const spId = inFiche ? monsterChipSpeciesId(id) : null;
    openMonsterFiche(id);
    if (spId) activateSpeciesLayer(spId);
  }
  // Fiche FAMILLE (#82 chunk (e)) : le LIEN de nom d'une famille (étape de
  // quête à portée famille, recherche à venir, membres de la fiche famille)
  // ouvre sa page — SANS activer la carte : l'activation est une affordance
  // SÉPARÉE (bouton family-layer « Afficher · N pts »), les deux gestes que
  // l'utilisateur veut distincts (lien = fiche, bulle = carte). Pas de
  // clic-double-effet ici, contrairement à fiche-monster.
  else if (b.dataset.act === 'fiche-family') openFamilyFiche(id);
  else if (b.dataset.act === 'fiche-location') openLocationFiche(+id);
  else if (b.dataset.act === 'fiche-loot') openLootTableFiche(id);
  else if (b.dataset.act === 'fiche-chest') openChestFiche(+id.split(':')[1]);
  else if (b.dataset.act === 'fiche-searchable-chest') openSearchableChestFiche(id);
  else if (b.dataset.act === 'fiche-recipe') openRecipeFiche(id);
  else if (b.dataset.act === 'fiche-node') openNodeFiche(id);
  // (Les ex-handlers de surlignage transitoire par camp / de la couche
  // coffres — RETIRÉS, kill-list §7.2 : la pastille des références
  // `[Camp(●)]`/`[Chest(●)]` (fiches.js campRef/containersSectionHtml) porte
  // désormais le geste, routée par ref-draw ci-dessous. Les ex-handlers de
  // couche espèce/famille sont pareillement retirés — leurs pastilles
  // `[Espèce(●)]`/`[Famille(●)]` passent par ref-draw.)
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
    // target.map d'une cible receive_reward/talk cross-map —  n'attache
    // jamais x/z avec map dans ce cas précis, voir fiches.js::crossMapOnlyBtn) :
    // simple bascule, rien à viser après (contrairement à map-goto ci-dessus).
    switchMap(b.dataset.map, { keepView: true });
  }
  // (Ex-second délégué, fusionné : un seul écouteur global data-act.)
  else if (b.dataset.act === 'clear-locator') unfocus(clearLocator);
  // Drapeaux utilisateur (#84) : PAS de pushFocusState/unfocus ici -- ils
  // vivent hors du modèle "focus"/historique (voir pins.js), une suppression
  // est donc toujours immédiate, jamais un Précédent/Suivant.
  else if (b.dataset.act === 'remove-user-flag') removeUserFlag(b.dataset.id);
  else if (b.dataset.act === 'clear-user-flags') clearAllUserFlags();
  // Pin locate (Q7) : retrait depuis son popup — même discipline hors
  // focus/historique que les drapeaux (pas de pushFocusState/unfocus),
  // l'autre voie de retrait étant la pastille/le ✕ du bandeau-légende.
  else if (b.dataset.act === 'remove-locate-pin') removeLocatePin(b.dataset.id);
});

/* ── EntityRef (◇) : l'UNIQUE délégué du composant js/mapref.js ──────────────
   Deux gestes sémantiques (`ref-open` libellé→fiche, `ref-draw` pastille→tracé)
   remplacent à terme le zoo de data-act ci-dessus (§5.3). VAGUE 0 : on branche
   le délégué et on route vers les openers/activateurs DÉJÀ importés ici — les
   sites d'appel existants (fiche-*, species-layer…) restent intacts (aucune
   migration en vague 0). Même niveau que le délégué data-act ci-dessus ;
   `main.js` n'a toujours aucune logique métier propre, il ne fait que router.
   Les switches migreront vers router.openRef/layeractivate.drawRef (fichiers
   d'autres missions) dans les vagues suivantes. */
initMapRefDelegation(document, {
  open(info) {
    pushFocusState();                       // une entrée d'historique par geste (modèle existant)
    switch (info.kind) {
      case 'species': openMonsterFiche(info.key); break;
      case 'family': openFamilyFiche(info.key); break;
      case 'item': case 'quest_item': openItemFiche(info.key); break;
      case 'recipe': openRecipeFiche(info.key); break;
      case 'npc': openNpcFiche(+String(info.key).split(':').pop()); break;
      case 'camp': openCampFiche(info.key); break;
      case 'quest': openQuestFiche(info.key); break;
      case 'node': openNodeFiche(info.key); break;
      case 'location': openLocationFiche(+info.key); break;
      case 'loot': openLootTableFiche(info.key); break;
      case 'chest': openChestFiche(+String(info.key).split(':').pop()); break;
      case 'searchable_chest': openSearchableChestFiche(info.key); break;
      // GAP §7.1 fermé (vague 1) : la fiche capacité existait mais n'était
      // atteignable que par la recherche — une référence [Capacité] à clé
      // prouvée (S.abilities) est désormais soulignée et route ici.
      case 'ability': openAbilityFiche(info.key); break;
      // Fiches BUILD (vague E'c-8, câblage complété ici) : talent/spécialisation/
      // métier — catalogues globaux SANS position (mode 'N' de mapref.js, aucune
      // pastille de tracé) ; la clé porte directement l'id stable consommé par
      // l'ouvreur (node/code/key, voir fiches/build.js). `info.kind` ici est le
      // kind mapref ('specialization'), distinct du kind interne S.openFiche
      // ('spec') que l'ouvreur pose lui-même.
      case 'talent': openTalentFiche(info.key); break;
      case 'specialization': openSpecFiche(info.key); break;
      case 'profession': openProfessionFiche(info.key); break;
      // Fiche RÉGION (vague E'c-R) : une réf `[Région]` soulignée (nom résolu à
      // une région cataloguée, zone.js regionFicheExists) ouvre sa fiche. La
      // clé porte le NOM (réfs monster-zone/region/camp) ou est absente (réf
      // d'objectif enter_zone) → openRegionFiche accepte les deux et résout
      // nom→zone_id lui-même (jamais re-dérivé par surface).
      case 'zone': openRegionFiche(info.key != null ? info.key : info.label); break;
    }
  },
  draw(info) {
    switch (info.kind) {
      // La pastille est un TOGGLE (draw⇄hide, ratifié §1.3/§2.5 : UN sens
      // partout) — jamais les orchestrateurs force-ON activateSpeciesLayer/
      // activateFamilyLayers (eux servent le clic-double-effet de la
      // recherche/des chips d'ouverture, sémantique « allumer », pas
      // « basculer »). Même chemin que l'ex-handler species-layer :
      // toggleSpecies + republication arbre/carte/hash.
      // Clé DOUBLE espèce (vague 1) : une référence espèce porte la clé de
      // FICHE (mk, S.monsters) ; la couche de l'arbre vit sur l'id d'ESPÈCE.
      // La résolution mk→species appartient au routeur (jamais re-dérivée
      // par surface) ; une clé déjà-espèce (harness, arbre vague 6) passe
      // telle quelle.
      case 'species': {
        const sp = S.monsters?.[info.key]?.species || info.key;
        if (!sp) break;
        const on = toggleSpecies(sp);
        buildFilters();
        scheduleRedraw();
        syncHash();
        if (on) revealMonsterNode('species', sp);
        break;
      }
      // Famille : bascule aussi — toutes les lignes déjà cochées → tout
      // éteindre (setFamilyOn false, cascade espèces incluse) ; sinon le
      // même geste d'allumage cascade que la case famille de l'arbre.
      case 'family': {
        const fams = (info.family || info.key || '').split(',').filter(Boolean);
        if (!fams.length) break;
        if (fams.every(f => S.monfam[f]?.on)) {
          fams.forEach(f => setFamilyOn(f, false));
          buildFilters();
          scheduleRedraw();
          syncHash();
        } else {
          activateFamilyLayers(fams);
        }
        break;
      }
      default: {
        // Zone de recherche d'un OBJECTIF ([Région ●] de dynamicPosBadge,
        // vague 1) : dessine le cercle/les vrais points de cette search_zone
        // (viewGoalZone — même primitive que l'ancien bouton « Voir la
        // zone », key = index dans currentGoalZones de la fiche ouverte).
        if (info.kind === 'zone' && info.subrole === 'goal-zone') { viewGoalZone(info.key); break; }
        // Région d'une fiche monstre ([Zone(●)] « Présent dans », subrole
        // « monster-zone ») : dessine CE polygone de région (drawNamedZone —
        // même primitive single-slot que la zone d'objectif). La clé porte le
        // NOM de la région (résolu par nom sur S.zonesGeo côté fiches.js).
        if (info.kind === 'zone' && info.subrole === 'monster-zone') { drawNamedZone(info.key); break; }
        // Contour d'une RÉGION ([Région(●)], subrole « region » — en-tête de
        // fiche région, ligne région d'une fiche camp) : même primitive
        // single-slot (drawNamedZone, effacée à la fermeture de fiche). La clé
        // porte le NOM de la région (résolu par nom sur S.zonesGeo). N'attrape
        // PAS la réf d'objectif enter_zone (subrole absent, mode L) : elle reste
        // un pin locate au centroïde, traitée par la branche mode L plus bas.
        if (info.kind === 'zone' && info.subrole === 'region') { drawNamedZone(info.key != null ? info.key : info.label); break; }
        // Camp individuel (mode E) — surlignage transitoire self-toggle (vague
        // 2, remplace l'ex-surlignage de camp, kill-list §7.2) : un camp n'a
        // aucun nœud d'arbre. Un camp CROSS-carte (farmUnjoinedRow) est mode L →
        // il tombe dans le traitement locate ci-dessous, jamais ici.
        if (info.kind === 'camp' && info.mode !== 'L') { toggleCampHighlight(info); break; }
        // Catégorie « Coffres fouillables » (mode C, vague 2, remplace
        // l'ex-surlignage de couche coffres) : VRAI toggle de la case (checkbox,
        // .click() bascule dans les DEUX sens — contrairement à
        // activateCategoryNode, ensure-only, du repli catégorie générique
        // plus bas ; la couche est ON par défaut, il faut pouvoir l'éteindre).
        if (info.kind === 'chest' && info.fkey) {
          const input = document.querySelector(`#filters li[data-fkey="${CSS.escape(info.fkey)}"] input`);
          if (input) input.click();
          break;
        }
        // Locate (mode L) — TOGGLE (Q7, spec §9, ratifié 2026-07-11 soir,
        // supersède le one-shot goTo de §2.4) : position / qao placé / PNJ
        // épinglé / centroïde de zone. Membre du jeu S.locates → RETRAIT du
        // pin ; sinon AJOUT (pin persistant posé + caméra centrée —
        // pins.js addLocatePin ; l'ancien repli « mettre en avant le marqueur
        // réel » de goTo/pinRef ne s'applique plus ici : le pin EST l'état
        // que la légende liste et retire — goTo garde ce repli pour les
        // data-act="goto" hors-ref, inchangés). Clé stable partagée
        // (mapref.js locateRefKey) ; teinte/libellé du pin = ceux de la
        // référence cliquée (--ref-c / libellé, repli mot de kind — mêmes
        // données que le bandeau-légende affichera). Coordonnées FINIES
        // exigées (une référence cross-carte sans position locale expédie
        // data-x="null" → NaN au décodage) : sans elles, une cible
        // cross-carte reste une simple bascule de carte (rien à épingler).
        // Cible sur une AUTRE carte AVEC coordonnées : bascule puis ajout
        // (le pin appartient à sa carte — re-rendu par le hook onMapSwitch).
        if (info.mode === 'L') {
          const hasXY = Number.isFinite(info.x) && Number.isFinite(info.z);
          if (!hasXY) {
            if (info.map) switchMap(info.map, { keepView: true });
            break;
          }
          const key = locateRefKey(info.kind, info.key, info.x, info.z, info.map);
          if (!key) break;
          if (S.locates?.has(key)) { removeLocatePin(key); break; }
          const hex = (info.el?.style.getPropertyValue('--ref-c') || '').trim() || null;
          const label = (info.label || '').trim()
            || (info.el?.querySelector('.ref-kindword')?.textContent || '').trim()
            || refKindLabel(info.kind);
          const pin = { x: info.x, z: info.z, map: info.map || S.map, label, hex, kind: info.kind };
          if (info.map && info.map !== S.map) {
            switchMap(info.map, { keepView: true }).then(() => addLocatePin(key, pin));
          } else {
            addLocatePin(key, pin);
          }
          break;
        }
        // Catégorie (mode C) : bascule le VRAI nœud d'arbre (même orchestration
        // partagée que les chips/recherche, jamais une seconde sémantique).
        if (info.mode === 'C' && info.fkey) activateCategoryNode('row', info.fkey);
      }
    }
  },
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
   l'autre (voir  "i18n"). Seules les langues à la fois
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
  // carte par défaut (S.devOn faux) -- qao ET (parité, data-accuracy audit
  //  "isTest gating parity") searchable_chest/camp_chest/
  // decor/npc ci-dessous : monstres/items n'ont pas de couche carte propre
  // (voir js/devcontent.js), mais tout enregistrement AVEC position qui
  // porte isTest:true doit rester filtré, jamais juste quelques-unes des 5
  // couches concernées. Le point gardé isTest:true (jamais retiré de
  // l'objet, juste laissé passer le filtre quand S.devOn est vrai) pilote
  // le liseré tireté de mapview.js renderDense (npc filtré directement dans
  // mapview.js::renderDomDots/renderDomCulled, seules couches DOM du lot).
  // Quête (feature "NPCs holds their quests", 2026-07-11) : l'ancienne
  // couche canvas `registerDense('quest', ...)` — un point violet PAR
  // QUÊTE, posé exactement à la position de son donneur depuis le
  // giver-pos-snap précédent — dupliquait à l'identique le pin PNJ de ce
  // même donneur (~576 quêtes sur pin PNJ) : deux marqueurs superposés pour
  // une seule chose. Retirée : une quête n'a plus de marqueur carte à elle,
  // elle se lit sur le pin de son donneur (popup "N quêtes" + fiche PNJ
  // "Quêtes données", inchangées, voir popups.js/fiches.js::openNpcFiche)
  // et via la recherche (search.js, inchangée -- indexe aussi les quêtes
  // SANS position connue, jamais un simple sous-ensemble). `questPopup`
  // (popups.js) n'a plus aucun appelant, retirée avec cette couche.
  // CATS.quest (config.js) reste défini : sa seule propriété encore lue est
  // `.hex` (teinte violette réutilisée par les chips/liens quête un peu
  // partout — fiches.js/popups.js/search.js/sidebar.js — et par la liste de
  // suivi), `.on`/`.dense` ne pilotent plus rien (aucun renderer, aucune
  // ligne de filtre ne les lit désormais) ; urlstate.js l'exclut donc
  // explicitement de la sérialisation `on=` pour ne pas laisser un jeton
  // fantôme réapparaître dans les liens partagés.
  registerDense('qao', () => S.data.qao.filter(p => !isHiddenTest(p)), CATS.qao.hex,
    p => popupHtml('qao', p, markerId('qao', S.data.qao.indexOf(p))));
  // Coffres fouillables RÉELS (searchable_chests.bin, sa propre couche/son
  // propre fichier — voir  §2/§4) : couleur/popup dédiés,
  // jamais confondus avec les placements chest ci-dessous.
  registerDense('searchable_chest', () => (S.data.searchable_chest || []).filter(p => !isHiddenTest(p)), CATS.searchable_chest.hex,
    r => searchableChestPopup(r));
  // Coffres de camp RÉELS (S.data.chest `group==="camp_chest"`, skin
  // sci_fi) : sa propre couche de haut niveau, ON par défaut (voir
  //  §3.1) — id de marqueur "chest:<i>" conservé (voir
  // config.js chestHex/chestKindLabel) pour que Suivre/Fait/fiche-chest
  // continuent de fonctionner sur ce même S.data.chest partagé.
  registerDense('camp_chest', () => S.data.chest.filter(p => p.group === 'camp_chest' && !isHiddenTest(p)), CATS.camp_chest.hex,
    p => popupHtml('chest', p, markerId('chest', S.data.chest.indexOf(p))));
  // Décor (S.decor, groupe repliable/décoché par défaut — 
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
  // Compositeur de points de camp (#82 chunk (b), design §4.3) : UNE couche
  // dense pour TOUS les camps, remplace les N registerDense('camp:'+kind).
  // Enregistrée inconditionnellement (compositeCampPoints lit S.camps en
  // direct : liste vide tant que camps.bin n'est pas arrivé — même
  // dégénérescence silencieuse que l'ancienne boucle qui n'itérait rien).
  registerDense('campComposite', compositeCampPoints, '#888', (p, n) => campPopup(p, n));
  // (L'ancienne couche ZONE des espèces/familles cochées, js/specieslayer.js
  // renderSpeciesZones, était enregistrée ici — RETIRÉE 2026-07-11, « points
  // only, no zones » : voir specieslayer.js pour le détail. La couche
  // POINTS (compositeCampPoints ci-dessus) reste inchangée.)
}

/* Composite des points de camp — anti double-tracé (design §4.3, contrat :
   « chaque point de camp dessiné au plus une fois »). Pour chaque CAMP
   (groupe), le gagnant = premier sélecteur ACTIF qui le contient, priorité
   ESPÈCE cochée (S.monsp, chunk (d)) > famille (S.monfam, ordre déterministe
   des familles par points décroissants — même ordre que les lignes du
   panneau et l'assignation de couleur) > kind (S.camps[kind].on). Un camp
   sans gagnant ne dessine rien ; les compteurs de lignes du panneau restent
   les totaux BRUTS par sélecteur (le dédoublonnage est un fait de rendu,
   pas de comptage — design §4.3). Les objets-points de S.camps[].points
   sont réutilisés tels quels (popup campPopup lit p.g inchangé) ; `p.c`
   porte la couleur gagnante, lue par mapview.js renderDense. */
function compositeCampPoints() {
  // (1) sélecteurs famille actifs → camp gagné par la PREMIÈRE famille
  // active qui le contient (rat avant ratmutant : mêmes 10 camps, la
  // couleur du mieux classé gagne — données réelles, design §13.3).
  const famWinner = new Map();   // campKey -> hex de la famille gagnante
  const fams = monsterFamilies();
  for (let i = 0; i < fams.length; i++) {
    const f = fams[i];
    if (!S.monfam[f.family]?.on) continue;
    const hex = familyLayerHex(f.family);
    for (const k of f.campKeys) if (!famWinner.has(k)) famWinner.set(k, hex);
  }
  // (2) gagnant par GROUPE de camp : ESPÈCE cochée (chunk (d) — première
  // espèce cochée contenant le camp, js/specieslayer.js speciesCampWinner)
  // > famille > kind.
  const spWinner = speciesCampWinner();
  const winner = new Map();      // objet groupe -> hex gagnant
  for (const [kind, st] of Object.entries(S.camps)) {
    const kindHex = st.on ? (CAMP_COLORS[kind] || '#888') : null;
    // Règle « reste seulement » UNIVERSELLE et dérivée de la donnée
    // (ontology chunk 2 — l'ancien set front KIND_REST_ONLY est supprimé) :
    // la couche kind ne dessine JAMAIS un camp joint à une espèce — sa
    // ligne de panneau « Spawns non identifiés » compte exactement ce qui
    // s'allume (js/pointsets.js kindRestPoints, discipline honest-counter) ;
    // les camps joints s'allument par leurs lignes espèce/famille (priorité
    // espèce > famille inchangée). Pour les kinds sans liaison espèce
    // possible (récolte/sanctuaires/contenants…), l'ensemble lié est VIDE
    // → la couche dessine tout, strictement comme avant (vérifié : seuls
    // monsters/creeps/wildlife portent des liaisons, toutes cartes). Voir
    // pointsets.js kindRestPoints pour la dérive assumée des liens legacy
    // camp.creeps/camp.wildlife/camp.monsters.
    const bound = kindHex ? kindBoundCampKeys(kind) : null;
    for (const g of st.groups) {
      const hex = spWinner.get(g.k) || famWinner.get(g.k)
        || (bound && bound.has(g.k) ? null : kindHex);
      if (hex) winner.set(g, hex);
    }
  }
  if (!winner.size) return [];
  // (3) une passe sur les points : chaque point appartient à UN groupe →
  // dessiné au plus une fois, avec la couleur du gagnant de son camp.
  const out = [];
  for (const st of Object.values(S.camps)) {
    for (const p of st.points) {
      const hex = winner.get(p.g);
      if (!hex) continue;
      p.c = hex;
      out.push(p);
    }
  }
  return out;
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
   révélé), recherche (monstres/items/objets de quête/quêtes), l'arbre
   Monstres & faune (qui liste aussi les espèces isTest révélées, buildFilters
   ci-dessous -- la section « Bestiaire » séparée qui recevait ce même appel
   a été retirée le 2026-07-11, voir js/sidebar.js), et la fiche ouverte si
   elle affichait des variantes de monstre. N'existe pas
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
      // Fiche FAMILLE (#82 chunk (e)) : même republication que la fiche
      // monstre — ses membres/quêtes dépendent de S.species/S.quests fraîchement
      // rechargés dans la nouvelle langue (le libellé de famille lui-même reste
      // un jeton brut, mais les noms d'espèces/quêtes se retraduisent).
      else if (S.openFiche?.kind === 'family') openFamilyFiche(S.openFiche.id);
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
    buildDevToggle();  // le compte de monstres isTest n'est connu qu'ici
  });
}
/* ── Restauration d'état + fiches « nouvelles surfaces » par lien profond ─────
   applyLocationState() (router.js) restaure caméra/filtres/fiche pour les jetons
   HISTORIQUES (q/i/npc/mon/fam/wsp/camp) ; les 10 jetons de fiche AJOUTÉS hors de
   router (zone= vague E'c-R, puis ch/sc/lt/node/loc/ab/rec vague E'c-6, puis
   tal/spec/prof — câblage complété ici, fiches/build.js posait déjà le jeton en
   écriture mais ne le relisait jamais) routent et restaurent ICI — main.js porte
   le routage EntityRef + ces jetons. TOUS lus AVANT applyLocationState : sa
   closeFiche() supprime chaque jeton de fiche du hash (mutuellement exclusifs,
   un seul à la fois), donc on les capture d'abord puis on rouvre la bonne fiche
   APRÈS (elle re-pose son propre jeton).
   Timing : chest/searchable-chest s'appuient sur des données CRITIQUES (déjà là)
   → ouverture immédiate ; loot/node/lore/ability/recipe/talent/spec/profession
   s'appuient sur le lot DIFFÉRÉ (loot_table_contents/nodes/locations/abilities/
   recipes/talents/specializations/professions, même Promise.all data.js
   loadDeferred) → whenDeferred, synchrone si déjà prêt (popstate après boot),
   différé au tout premier chargement (le jeton est re-posé quand la donnée
   arrive). Un jeton index→clé non résolu (coffre/lore d'une reconstruction ou
   d'une autre carte) dégrade honnêtement : index -1 → on n'ouvre rien plutôt
   qu'une mauvaise fiche ; les 3 jetons build sont adressés par CLÉ directe
   (node/code/key) — même dégradation honnête, l'ouvreur (fiches/build.js)
   renvoie sans rien ouvrir si la clé est inconnue. */
async function restoreState() {
  const p = new URLSearchParams(location.hash.slice(1));
  const zone = p.get('zone');
  const ch = p.get('ch'), sc = p.get('sc'), lt = p.get('lt');
  const node = p.get('node'), loc = p.get('loc'), ab = p.get('ab'), rec = p.get('rec');
  const tal = p.get('tal'), spec = p.get('spec'), prof = p.get('prof');
  await applyLocationState();
  // Jetons de fiche mutuellement exclusifs → au plus un présent ; on route le
  // seul capturé (chaîne else-if : rien d'autre ne peut coexister).
  if (zone) whenDeferred(() => openRegionFiche(zone));
  else if (ch != null) { const i = chestIndexForToken(ch); if (i >= 0) openChestFiche(i); }
  else if (sc != null) openSearchableChestFiche(sc);
  else if (lt != null) whenDeferred(() => openLootTableFiche(lt));
  else if (node != null) whenDeferred(() => openNodeFiche(node));
  else if (loc != null) whenDeferred(() => { const i = locationIndexForToken(loc); if (i >= 0) openLocationFiche(i); });
  else if (ab != null) whenDeferred(() => openAbilityFiche(ab));
  else if (rec != null) whenDeferred(() => openRecipeFiche(rec));
  else if (tal != null) whenDeferred(() => openTalentFiche(tal));
  else if (spec != null) whenDeferred(() => openSpecFiche(spec));
  else if (prof != null) whenDeferred(() => openProfessionFiche(prof));
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
    buildDevToggle();   // compte qao/quête isTest propre à la carte qui vient d'être chargée
    renderUserFlags();  // drapeaux utilisateur (#84) : scopés par carte, S.map vient de changer
    renderLocatePins(); // pins locate (Q7) : ceux de la carte active se re-dessinent,
                        // les autres RESTENT dans S.locates (jamais perdus à la bascule)
  });

  buildFilters();
  buildSearch();
  renderTracked();
  renderDataDate();
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
  await restoreState();
  // Drapeaux utilisateur (#84) : appel explicite ICI en plus du hook
  // onMapSwitch ci-dessus -- un boot SANS bascule de carte (pas de `map=`
  // dans le hash, Kwalat déjà actif par défaut) ne déclenche jamais
  // onMapSwitch (switchMap() renvoie tôt quand mid === S.map, voir
  // multimap.js), donc rien n'afficherait les drapeaux de Kwalat au tout
  // premier chargement sans cet appel. Idempotent si applyLocationState a
  // effectivement basculé de carte (renderUserFlags reconstruit sa couche
  // à chaque appel).
  renderUserFlags();
  $('#loading').classList.add('gone');

  // Surveillance "données mises à jour" (js/updatecheck.js) : démarrée une
  // fois le premier rendu affiché — no-op silencieux si aucun jeton de
  // version n'a pu être chargé au boot (local/dev/avant 1er déploiement).
  startUpdateWatcher();

  // Entrée baseline : cpmSeq=0 signale "atteinte par lien profond/chargement,
  // pas par une navigation en app" — canGoBackLocally()/unfocus() s'en servent
  // pour savoir si un Précédent natif est sûr (voir pushFocusState() plus haut).
  history.replaceState({ cpm: true, cpmSeq: 0 }, '', location.hash);
  window.addEventListener('popstate', () => restoreState());

  // Camps, fiches camp, recettes, stock des vendeurs : chargés en tâche de
  // fond, sans avoir bloqué le premier rendu ni les fiches ci-dessus. Le
  // lien profond camp=<clé> et les filtres de camp sont repris par
  // applyLocationState() elle-même (via whenDeferred, voir plus haut).
  loadDeferred().then(() => {
    registerAllDenseRenderers();
    denseRenderers.forEach(fn => fn());
    buildDevToggle();   // le compte de monstres isTest (162) n'est connu qu'ici
    // Une fiche item/PNJ/quête ouverte avant l'arrivée des recettes/vendeurs/
    // monstres (fenêtre de course rare) est simplement rafraîchie avec les
    // données désormais complètes (liens monstre/marchand inclus).
    if (S.openFiche?.kind === 'item') openItemFiche(S.openFiche.id);
    else if (S.openFiche?.kind === 'npc') openNpcFiche(S.openFiche.id);
    else if (S.openFiche?.kind === 'quest') openQuestFiche(S.openFiche.id);
    // Recette (task #78a/#78b, net-new kind) : mêmes ingrédients/quêtes liées
    // que ci-dessus dépendent de S.recipes -- un lien profond direct vers un
    // pseudo-item recette (i=rec_..._unlocked, ouvert avant l'arrivée du
    // chargement différé) affichait sinon une fiche recette vide en
    // permanence (jamais rafraîchie une fois S.recipes prêt).
    else if (S.openFiche?.kind === 'recipe') openRecipeFiche(S.openFiche.id);
  });
})();
