/* Kwalat — état d'URL (hash partageable) + modèle d'historique
   Précédent/Suivant (pushFocusState/unfocus). Bas niveau : ne restaure
   rien lui-même (voir router.js pour applyLocationState). */
import { S } from './state.js';
import { CATS } from './config.js';
import { map, toWorld } from './mapview.js';

/* ── URL (hash) ─────────────────────────────────────────────── */
function buildHash() {
  const c = toWorld(map.getCenter());
  const on = [
    // `quest` (config.js CATS.quest) is excluded here on purpose: its own
    // filter row + map dot layer were removed (2026-07-11, "NPCs hold their
    // quests" -- see main.js registerAllDenseRenderers/sidebar.js
    // buildGroupQuests) but the CATS entry itself stays, only for its
    // `.hex` (the quest-violet color, reused by chips/links all over
    // fiches.js/popups.js/search.js and by the tracked-list). Its `.on`
    // therefore no longer drives anything -- serializing it here would just
    // bake a phantom, permanently-true token into every freshly-built
    // share link (nothing to toggle it off from, since there is no more
    // row). readHash() below still tolerates a LEGACY `on=quest` token from
    // an old shared link without crashing (Object.keys(CATS) still finds
    // the key, sets its dead `.on` -- a genuine no-op, nothing reads it).
    ...Object.entries(CATS).filter(([k, v]) => v.on && k !== 'quest').map(([k]) => k),
    ...Object.entries(S.camps).filter(([, v]) => v.on).map(([k]) => 'camp.' + k),
    // Sous-filtre "Décor" (S.decor, décoché par défaut) — même principe
    // camp.* ci-dessus : chaque famille actuellement cochée est listée
    // telle quelle, voir sidebar.js buildDecorGroup/data.js buildDecorGroups.
    ...Object.entries(S.decor).filter(([, v]) => v.on).map(([k]) => 'decor.' + k),
    // Sous-couches « Par famille » (#82 chunk (b), S.monfam — token famille
    // post-alias, jamais le libellé affiché) : même principe camp.*/decor.*
    // ci-dessus. Sérialisées même si la carte active n'a aucun camp joint
    // pour la famille (l'état survit à la bascule de carte, la ligne/le
    // rendu se résolvent par carte — voir js/pointsets.js familyCampSet).
    ...Object.entries(S.monfam).filter(([, v]) => v.on).map(([k]) => 'monfam.' + k),
    ...(S.zonesOn ? ['zones'] : []),
    // Contenu dev révélé (feature #13, tag en bas du panneau — voir
    // main.js buildDevToggle) : même idiome que `zones` ci-dessus, un
    // simple jeton dans `on=` plutôt qu'un paramètre dédié.
    ...(S.devOn ? ['devcontent'] : []),
  ];
  let h = `#x=${Math.round(c.x)}&z=${Math.round(c.z)}&zm=${map.getZoom().toFixed(2)}&on=${on.join(',')}&lang=${S.lang}`;
  // `map=` n'est ajouté QUE hors Kwalat : les liens Kwalat existants restent
  // byte-identiques (rétro-compat — absence de map= ⇒ Kwalat, cf. readHash).
  if (S.map && S.map !== 'Kwalat') h += `&map=${S.map}`;
  // Drapeaux utilisateur (#84, clic droit) : PAS de champ hash -- localStorage
  // par carte uniquement (pins.js), jamais partagés via lien (voir COORDINATION.md).
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
    // A legacy link's `on=...,quest,...` token (from before the quest dot
    // layer/filter row were removed, see buildHash() above) is tolerated
    // here as a pure no-op: Object.keys(CATS) still includes 'quest' (kept
    // for its `.hex` only), so this just sets its now-unread `.on` flag --
    // it drives no renderer and no filter row, and buildHash() never bakes
    // it back into the hash on the next sync. Never crashes either way.
    for (const k of Object.keys(CATS)) CATS[k].on = onSet.has(k);
    S.zonesOn = onSet.has('zones');
    // Contenu dev (feature #13) : état initial déjà résolu au chargement du
    // module (voir state.js initialDevOn(), qui lit ce même jeton pour
    // éviter une course avec buildSearch()/buildBestiary() au boot) — cette
    // ligne ne fait que reprendre la même clé pour les navigations
    // ultérieures (popstate, hash édité à la main).
    S.devOn = onSet.has('devcontent');
    // les clés camp.*/decor.* de onSet sont réappliquées une fois les
    // données correspondantes prêtes (camps : chargement différé, voir
    // loadDeferred/whenDeferred ; Décor : voir router.js
    // applyLocationState, appliqué juste après une éventuelle bascule de
    // carte puisque S.decor en dépend, voir data.js buildDecorGroups).
  }
  const at = p.has('at') ? (([x, z]) => (isNaN(x) || isNaN(z) ? null : { x, z }))(p.get('at').split(',').map(Number)) : null;
  return {
    view, onSet, quest: p.get('q'), camp: p.get('camp'), item: p.get('i'),
    npc: p.get('npc'), monster: p.get('mon'), at, atl: p.get('atl') || null,
    map: p.get('map') || 'Kwalat',   // absent ⇒ Kwalat (rétro-compat des liens existants)
  };
}

/* ── Historique de navigation (Précédent/Suivant) ──────────────
   Modèle : une entrée d'historique = un instantané COMPLET de l'état focalisé
   (fiche + réticule + filtres + caméra), jamais un diff — restauré par
   applyLocationState() (définie près de init(), plus bas), appelée aussi bien
   au chargement qu'à chaque popstate. Les drapeaux utilisateur (#84, clic
   droit) sont volontairement HORS de ce modèle (localStorage par carte, voir
   pins.js) : ils ne poussent/ne lisent jamais d'entrée d'historique.

   pushFocusState() est appelé UNE fois, EN DÉBUT de chaque geste utilisateur
   de haut niveau — AVANT ses mutations, pas après (voir les points d'appel :
   clic délégué, résultat de recherche, clic suivi). C'est
   l'inverse de ce qu'on ferait naïvement : les fonctions bas niveau
   (setFicheHash/syncHash derrière openXFiche/goTo) ne font QUE
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

export { buildHash, syncHash, readHash, pushFocusState, canGoBackLocally, unfocus };
