/* Kwalat — état d'URL (hash partageable) + modèle d'historique
   Précédent/Suivant (pushFocusState/unfocus). Bas niveau : ne restaure
   rien lui-même (voir router.js pour applyLocationState). */
import { S } from './state.js';
import { CATS, familyKey } from './config.js';
import { map, toWorld } from './mapview.js';

/* ── URL (hash) ─────────────────────────────────────────────── */
/* HYGIÈNE DE HASH (2026-07-11, demande utilisateur : « le hash a perdu son
   économie » — 8 jetons poi.* sérialisés alors que tout-ON est le défaut).
   SCHÉMA (écrivain STRICT, lecteur LIBÉRAL) :
   - L'écrivain n'émet plus `on=` (énumération complète de l'état) mais
     `flt=` : UNIQUEMENT les DELTAS par rapport à l'état PAR DÉFAUT. Une
     couche à son défaut (ON ou OFF) n'écrit RIEN ; la vue par défaut donne
     un hash minimal `#x=…&z=…&zm=…&lang=…`.
   - Grammaire `flt=` : mêmes jetons que `on=` (npc, camp.<kind>,
     decor.<fam>, poi.<type>, monfam.<f>, monsp.<id>, zones, devcontent) ;
     préfixe `-` = négation (couche par-défaut-ON éteinte). Repli complet :
     `-poi` = les 8 sous-types POI éteints (l'inverse, tout-ON, est le
     défaut et n'écrit rien).
   - REPLI PARENT familles (« l'arbre est le bestiaire ») : une famille
     cochée s'écrit `monfam.<f>` SEUL — la restauration rejoue la cascade
     (setFamilyOn, router.js) qui recoche toutes ses espèces ; plus jamais N
     jetons monsp.*. Une espèce décochée SOUS une famille cochée s'écrit en
     exclusion `-monsp.<id>` (appliquée APRÈS la cascade) ; une espèce
     cochée SANS sa famille s'écrit explicitement `monsp.<id>`. (Avant
     l'arrivée des données différées, S.species est vide : l'écrivain émet
     alors les jetons monfam/monsp tels quels — aucun état partiel ne peut
     encore exister, la dégradation est sûre.)
   - COMPAT LECTURE : un lien LEGACY `on=…` (énumération complète) se lit
     exactement comme avant (branche `on` de readHash, intacte) — l'écrivain
     seul devient strict. Un hash sans `on=` ni `flt=` = défauts (inchangé).
   Vérifié par harnais : aller-retour état→hash→reload→état identique, hash
   minimal en vue par défaut, repli poi/famille, exclusion d'espèce
   ( §hash). */
/* ── Résolveurs jeton de fiche ↔ index (vague E'c-6) ─────────────────────────
   Trois kinds de fiche sont adressés en interne par un INDEX POSITIONNEL dans
   un tableau (S.openFiche.id = index), mais un index n'est PAS stable à travers
   une reconstruction de données : il glisse silencieusement et casse les liens
   partagés (blueprint §1.2 / §8-R3). Le lien profond doit donc sérialiser une
   CLÉ STABLE, résolue à l'index à la restauration. Ces helpers portent les deux
   sens, partagés par le sérialiseur (fiches/core.js setFicheHash) et les
   restaurateurs (router.js pour npc, main.js pour chest/lore) — jamais
   re-dérivés par surface. Repli honnête : donnée non résolue → jeton brut /
   index -1 (l'appelant n'ouvre alors rien plutôt qu'une mauvaise fiche).

   PNJ (npc=<key>) — MIGRATION depuis l'ancien `npc=<idx>` : la clé stable est
   le slug `npc:<slug>` (champ `ids` du record, ex. "npc:lyra_thornfeld"),
   sérialisé sans son préfixe. REDIRECTION LEGACY (une release) : un ancien
   `npc=<nombre>` (index pur) reste résolu tant qu'il est dans les bornes —
   dégrade honnêtement (index -1) sinon. Un slug n'est jamais tout-chiffres, la
   distinction est donc sûre. */
/* Liste CANONIQUE des paramètres de hash « jeton de fiche » — mutuellement
   exclusifs (une seule fiche ouverte à la fois). Source unique partagée :
   fiches/core.js s'en sert pour vider les autres avant d'en poser un (exclusion
   mutuelle), buildHash ci-dessous pour tous les reporter à travers un pan/zoom.
   Les 8 premiers sont historiques ; les 7 suivants arrivent vague E'c-6. Les 3
   derniers (tal/spec/prof, fiches/build.js vague E'c-8) complètent ici le
   câblage deep-link : le jeton était déjà RÉSERVÉ et ÉCRIT par
   fiches/core.js::setFicheHash (FICHE_TOKEN + BUILD_FICHE_HASH_KEYS, exclusion
   mutuelle locale à ce fichier tant que cette liste ne les portait pas), mais
   jamais reporté à travers un pan/zoom (buildHash ci-dessous ne le connaissait
   pas) ni relu au chargement (main.js restoreState()) — les deux moitiés
   manquantes que cette liste + main.js ferment. Adressés par CLÉ directe
   (node/code/key), aucun résolveur index→clé requis (même famille que q/i/
   camp/fam ci-dessus, contrairement à npc/ch/loc). */
const FICHE_HASH_KEYS = ['q', 'camp', 'i', 'npc', 'mon', 'fam', 'wsp', 'zone',
  'ch', 'sc', 'lt', 'node', 'loc', 'ab', 'rec', 'tal', 'spec', 'prof', 'cat', 'abc'];

const isLegacyIndex = tok => /^\d+$/.test(tok);
function npcTokenForIndex(idx) {
  const raw = S.data?.npc?.[idx]?.ids?.[0];
  return raw ? String(raw).replace(/^npc:/, '') : (idx != null ? String(idx) : null);
}
function npcIndexForToken(tok) {
  if (tok == null || tok === '') return -1;
  const arr = S.data?.npc || [];
  if (isLegacyIndex(tok)) {                 // ancien index positionnel (redirection legacy)
    const i = +tok;
    return (i >= 0 && i < arr.length) ? i : -1;   // hors bornes après reconstruction → dégrade honnêtement
  }
  const want = 'npc:' + tok;
  let i = arr.findIndex(r => r.ids?.includes(want));
  if (i < 0) i = arr.findIndex(r => r.ids?.includes(tok));   // tolère un id déjà préfixé passé tel quel
  return i;
}
/* Coffre placé (ch=<key>) : la clé stable est le type d'asset `k` (jamais
   individuellement unique — ~132 types pour 3834 placements ; le lien rouvre un
   coffre REPRÉSENTATIF de ce type, la fiche étant par-type : nom + butin). */
function chestTokenForIndex(idx) {
  return S.data?.chest?.[idx]?.k ?? (idx != null ? String(idx) : null);
}
function chestIndexForToken(tok) {
  if (tok == null || tok === '') return -1;
  return (S.data?.chest || []).findIndex(c => c.k === tok);
}
/* Chronique / lore (loc=<id>) : la clé stable est le champ `id` du lieu
   (S.locations, ex. "GoldenfieldTown" — 202/202 présents, 0 collision). */
function locationTokenForIndex(idx) {
  return S.locations?.[idx]?.id ?? (idx != null ? String(idx) : null);
}
function locationIndexForToken(tok) {
  if (tok == null || tok === '') return -1;
  return (S.locations || []).findIndex(l => l.id === tok);
}

const CATS_DEFAULT_ON = Object.fromEntries(Object.entries(CATS).map(([k, v]) => [k, !!v.on]));
function fltTokens() {
  const t = [];
  for (const [k, v] of Object.entries(CATS)) {
    // quest/poi : entrées mortes (hex seul), jamais sérialisées — voir les
    // notes legacy de l'ancien writer, conservées dans readHash ci-dessous.
    if (k === 'quest' || k === 'poi') continue;
    if (!!v.on !== CATS_DEFAULT_ON[k]) t.push(v.on ? k : '-' + k);
  }
  const poiKeys = Object.keys(S.poiTypes);
  const poiOff = poiKeys.filter(k => !S.poiTypes[k].on);
  if (poiKeys.length && poiOff.length === poiKeys.length) t.push('-poi');
  else for (const k of poiOff) t.push('-poi.' + k);
  for (const [k, v] of Object.entries(S.camps)) if (v.on && k !== 'quest') t.push('camp.' + k);
  for (const [k, v] of Object.entries(S.decor)) if (v.on) t.push('decor.' + k);
  for (const [f, v] of Object.entries(S.monfam)) if (v.on) t.push('monfam.' + f);
  for (const [id, v] of Object.entries(S.monsp)) {
    const sp = (S.species || {})[id];
    const famOn = sp ? !!S.monfam[familyKey(sp.family || 'other')]?.on : false;
    if (v.on && !famOn) t.push('monsp.' + id);
    else if (!v.on && famOn) t.push('-monsp.' + id);
  }
  if (S.zonesOn) t.push('zones');
  if (S.devOn) t.push('devcontent');
  return t;
}
function buildHash() {
  const c = toWorld(map.getCenter());
  /* (L'ancien inventaire complet `on=` — un jeton par couche ON, quel que
     soit le défaut — est REMPLACÉ par les deltas fltTokens() ci-dessus. Ses
     exclusions historiques quest/poi et leurs raisons restent documentées
     dans readHash, qui continue de LIRE `on=` pour les liens legacy. Le
     paramètre `on=` n'est plus JAMAIS écrit.) */
  const flt = fltTokens();
  let h = `#x=${Math.round(c.x)}&z=${Math.round(c.z)}&zm=${map.getZoom().toFixed(2)}${flt.length ? '&flt=' + flt.join(',') : ''}&lang=${S.lang}`;
  // `map=` n'est ajouté QUE hors Kwalat : les liens Kwalat existants restent
  // byte-identiques (rétro-compat — absence de map= ⇒ Kwalat, cf. readHash).
  if (S.map && S.map !== 'Kwalat') h += `&map=${S.map}`;
  // Drapeaux utilisateur (#84, clic droit) : PAS de champ hash -- localStorage
  // par carte uniquement (pins.js), jamais partagés via lien (voir ).
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
  // Tous les jetons de fiche mutuellement exclusifs (les 8 historiques + les 7
  // ajoutés vague E'c-6 : ch/sc/lt/node/loc/ab/rec) DOIVENT être reportés à
  // travers un pan/zoom, sinon syncHash() les effacerait du hash — une fiche
  // ouverte disparaîtrait du lien partageable au premier déplacement de carte.
  const carryKeys = S.locator ? FICHE_HASH_KEYS : [...FICHE_HASH_KEYS, 'at', 'atl'];
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
  let onSet = null, fltFamilies = null, fltSpeciesOff = null;
  if (p.has('flt')) {
    // Nouveau schéma DELTA (voir l'en-tête hygiène de hash) : reconstruire
    // l'ÉTAT COMPLET équivalent (le même Set de jetons « ON » que produisait
    // un `on=` legacy) à partir des défauts + deltas — tout le code aval
    // (application CATS/zones/dev ci-dessous, router.js) reste identique
    // pour les deux formes. Particularités :
    // - `monfam.<f>` note aussi la famille dans fltFamilies : router.js
    //   rejoue la CASCADE (setFamilyOn) à l'arrivée des espèces — le repli
    //   parent recoche toutes les espèces de la famille ;
    // - `-monsp.<id>` (exclusion sous famille cochée) va dans fltSpeciesOff,
    //   appliqué APRÈS la cascade (router.js).
    onSet = new Set(Object.entries(CATS_DEFAULT_ON)
      .filter(([k, d]) => d && k !== 'quest' && k !== 'poi').map(([k]) => k));
    for (const t of Object.keys(S.poiTypes)) onSet.add('poi.' + t);
    fltFamilies = []; fltSpeciesOff = [];
    for (const raw of p.get('flt').split(',').filter(Boolean)) {
      const neg = raw.startsWith('-');
      const tok = neg ? raw.slice(1) : raw;
      if (tok === 'poi') {   // repli complet : les 8 sous-types d'un coup
        for (const t of Object.keys(S.poiTypes)) neg ? onSet.delete('poi.' + t) : onSet.add('poi.' + t);
        continue;
      }
      if (neg && tok.startsWith('monsp.')) { fltSpeciesOff.push(tok.slice(6)); continue; }
      if (!neg && tok.startsWith('monfam.')) fltFamilies.push(tok.slice(7));
      neg ? onSet.delete(tok) : onSet.add(tok);
    }
    for (const k of Object.keys(CATS)) CATS[k].on = onSet.has(k);
    S.zonesOn = onSet.has('zones');
    S.devOn = onSet.has('devcontent');
  } else if (p.has('on')) {
    // Forme LEGACY (liens partagés avant l'hygiène de hash) : énumération
    // complète de l'état — lecture inchangée, le lecteur reste libéral.
    onSet = new Set(p.get('on').split(',').filter(Boolean));
    // A legacy link's `on=...,quest,...` token (from before the quest dot
    // layer/filter row were removed, see buildHash() above) is tolerated
    // here as a pure no-op: Object.keys(CATS) still includes 'quest' (kept
    // for its `.hex` only), so this just sets its now-unread `.on` flag --
    // it drives no renderer and no filter row, and buildHash() never bakes
    // it back into the hash on the next sync. Never crashes either way.
    // Same no-op tolerance for a legacy bare `on=...,poi,...` token (before
    // the poiType split, job pass 2026-07-11b): CATS.poi.on gets set here
    // but no renderer reads it anymore -- router.js applyLocationState is
    // where the REAL compat lives, expanding a bare `poi` token (or its
    // absence) into all 8 `S.poiTypes.<type>` flags.
    for (const k of Object.keys(CATS)) CATS[k].on = onSet.has(k);
    S.zonesOn = onSet.has('zones');
    // Contenu dev (feature #13) : état initial déjà résolu au chargement du
    // module (voir state.js initialDevOn(), qui lit ce même jeton pour
    // éviter une course avec buildSearch()/buildFilters() au boot) — cette
    // ligne ne fait que reprendre la même clé pour les navigations
    // ultérieures (popstate, hash édité à la main).
    S.devOn = onSet.has('devcontent');
    // les clés camp.*/decor.*/monfam.*/monsp.* de onSet sont réappliquées
    // par router.js applyLocationState (camps : sous whenDeferred,
    // chargement différé ; Décor : immédiat, juste après une éventuelle
    // bascule de carte puisque S.decor en dépend, voir data.js
    // buildDecorGroups ; monfam : immédiat sur l'ÉTAT, le rendu/la ligne se
    // résolvent à l'arrivée des données différées — #82 chunk (b) ;
    // monsp : immédiat aussi mais ENSURE-only, voir js/specieslayer.js
    // applySpeciesTokens — #82 chunk (d)).
  }
  const at = p.has('at') ? (([x, z]) => (isNaN(x) || isNaN(z) ? null : { x, z }))(p.get('at').split(',').map(Number)) : null;
  return {
    view, onSet, fltFamilies, fltSpeciesOff,
    quest: p.get('q'), camp: p.get('camp'), item: p.get('i'),
    npc: p.get('npc'), monster: p.get('mon'), family: p.get('fam'), wsp: p.get('wsp'),
    // Fiche RÉGION (vague E'c-R) : jeton `zone=<zone_id>`, restauré par
    // main.js restoreState (router.applyLocationState ne l'ouvre pas).
    zone: p.get('zone'), at, atl: p.get('atl') || null,
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

export {
  syncHash, readHash, pushFocusState, unfocus,
  FICHE_HASH_KEYS,
  npcTokenForIndex, npcIndexForToken,
  chestTokenForIndex, chestIndexForToken,
  locationTokenForIndex, locationIndexForToken,
};
