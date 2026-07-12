/* Kwalat — panneau latéral : filtres de couches, liste des camps, suivis
   (tracked/fait) et bouton d'affichage du panneau. */
import { S, LS, save } from './state.js';
import {
  CATS, CAMP_COLORS, ZONE_HEX, MONSTER_HEX, catLabel, campKindLabel, familyKey, familyHexByRank,
  chestDisplayName, chestHex, DECOR_FAMILIES, DECOR_HEX, decorFamilyLabel, prettyRegion, ecAttr,
  speciesLayerHex, POI_TYPES, poiTypeLabel,
} from './config.js';
import { $, $$, esc, fmtCoord, pretty, fold } from './utils.js';
import { tr, numberLocale } from './i18n/index.js';
import { map, layers, scheduleRedraw, refreshIconLayer, toggleZones } from './mapview.js';
import { syncHash, pushFocusState } from './urlstate.js';
import { goTo, onUserFlagsChange, listUserFlags, removeLocatePin, onLocatesChange } from './pins.js';
import { locateRefKey, refKindLabel } from './mapref.js';
import { whenDeferred, deferredReady } from './data.js';
import { isHiddenTest, positionCounts } from './devcontent.js';
import {
  monsterFamilies, speciesPoints, campGroupByKey, wildSpeciesOfKind, kindRestPoints,
} from './pointsets.js';
import { setFamilyOn, toggleSpecies } from './specieslayer.js';

/* ── Suivis / fait ──────────────────────────────────────────── */
function trackedTargetById(id) {
  const [cat, key] = id.split(':');
  if (cat === 'quest') { const q = S.quests.get(key); return q && { name: q.name, x: q.x, z: q.z, hex: CATS.quest.hex }; }
  // Coffre fouillable réel (searchable_chests.bin) : id stable = sa clé de
  // point (r.k, pas un index positionnel — tableau à part, voir data.js).
  if (cat === 'searchable_chest') {
    const r = (S.data.searchable_chest || []).find(x => x.k === key);
    return r && { name: `${tr('searchableChestTitle')} — ${prettyRegion(r.region)}`, x: r.x, z: r.z, hex: CATS.searchable_chest.hex };
  }
  const r = S.data[cat]?.[+key];
  if (!r) return null;
  // Coffre suivi ("Suivi"/tracked depuis son popup) : même nom d'affichage
  // que partout ailleurs (chestDisplayName) -- sinon la liste de suivi
  // aurait été le dernier endroit à encore montrer le nom brut d'asset d'art.
  // Couleur RÉELLE (chestHex — camp_chest/décor par famille/legacy) plutôt
  // que l'ancien CATS.chest générique (retiré, voir config.js).
  const name = cat === 'chest' ? chestDisplayName(r) : r.name;
  const hex = cat === 'chest' ? chestHex(r) : (CATS[cat]?.hex || '#999');
  return { name, x: r.x, z: r.z, hex };
}
function toggleTrack(id, btn) {
  const i = S.tracked.findIndex(t => t.id === id);
  if (i >= 0) S.tracked.splice(i, 1);
  else {
    const it = trackedTargetById(id);
    if (it) S.tracked.push({ id, name: it.name, x: it.x, z: it.z, hex: it.hex });
  }
  save(); renderTracked();
  if (btn) { const on = S.tracked.some(t => t.id === id); btn.classList.toggle('on', on); btn.textContent = on ? tr('trackedBtn') : tr('trackBtn'); }
}
function toggleDone(id, btn) {
  S.done.has(id) ? S.done.delete(id) : S.done.add(id);
  save(); renderTracked();
  if (btn) { const on = S.done.has(id); btn.classList.toggle('on', on); btn.textContent = on ? tr('doneBtnActive') : tr('doneBtn'); }
  refreshIconLayer(id.split(':')[0]);
}
function renderTracked() {
  const ul = $('#tracked-list');
  ul.innerHTML = '';
  $('#tracked-empty').style.display = S.tracked.length ? 'none' : '';
  // Suivis replié par défaut (design §9.3) : un compteur dans le sommaire,
  // sinon rien ne dirait combien d'items s'y trouvent tant que replié --
  // même idiome que .fcount, posé en SIBLING du <h2 data-i18n> (jamais
  // dedans : applyStaticI18n() écrase le textContent complet d'un élément
  // data-i18n à chaque bascule de langue, voir main.js). Toujours appelé
  // APRÈS applyStaticI18n() dans les 2 flux (setLang/init, voir main.js),
  // donc jamais écrasé par elle.
  const countEl = $('#tracked-count');
  if (countEl) countEl.textContent = S.tracked.length ? `(${S.tracked.length})` : '';
  S.tracked.forEach(t => {
    const li = document.createElement('li');
    if (S.done.has(t.id)) li.className = 'done';
    li.innerHTML = `<span class="t-dot" style="background:${t.hex}"></span>
      <span class="t-name">${esc(t.name)}</span>
      <button aria-label="${esc(tr('removeBtn'))}">✕</button>`;
    li.querySelector('.t-name').onclick = () => {
      pushFocusState();   // avant mutation — voir pushFocusState()'s doc
      goTo(t.x, t.z, undefined, t.name);
    };
    li.querySelector('button').onclick = () => toggleTrack(t.id);
    ul.appendChild(li);
  });
}

/* ── Drapeaux utilisateur dans « Suivi » (remis, demande utilisateur
   2026-07-11c : « avant j'avais une section pour mes pins perso, remets mes
   pins perso dans suivi pour que je puisse les voir les delete etc ») ──
   Bloc CONSTRUIT ici et injecté comme DERNIER enfant de #tracked-section
   (jamais dans index.html — même discipline que buildSubGroup/
   buildPoiSubGroup plus bas : ce fichier construit déjà des sous-arbres
   entiers par JS) : même <details> « Suivi » que les quêtes suivies
   ci-dessus, donc replié/déplié ensemble, jamais une section séparée.
   data-act DÉCLARATIF (goto/remove-user-flag/clear-user-flags) plutôt qu'un
   onclick direct comme renderTracked() ci-dessus : ces 3 actions existent
   déjà et sont câblées par le délégué global de main.js -- AUCUN nouveau
   type d'action, contrainte de la mission. Nom affiché : les drapeaux n'ont
   pas de nom propre (juste x/z, voir pins.js #84) -- même titre générique
   que leur popup (tr('userFlagTitle'), déjà traduit dans les 5 langues)
   numéroté dans l'ordre de pose, seul identifiant honnête à ce jour ;
   coordonnées en tooltip (title natif) plutôt que dans le libellé, pour
   rester aussi compact qu'une ligne #tracked-list.
   Live-update : abonnement UNIQUE (import-time, tout en bas de ce bloc) à
   pins.js::onUserFlagsChange -- notifié par renderUserFlags/addUserFlag/
   removeUserFlag/clearAllUserFlags, couvre donc le boot, chaque bascule de
   carte ET chaque geste utilisateur, jamais un sondage.
   Styles : 100% classes/sélecteurs EXISTANTS -- lignes .t-dot/.t-name/
   bouton ✕ via les sélecteurs #tracked-list étendus à #userpins-list +
   espacement #userpins-block (style.css « Suivis », CSS GO 2026-07-11c) ;
   en-tête via .farm-group-head/.farm-group-label/.act.ghost/
   .side-sec-count. Seule la COULEUR du dé reste inline (par-instance,
   même idiome que renderTracked ci-dessus) ; box.style.display est du
   COMPORTEMENT (bloc masqué à vide), pas du style dupliqué. */
function trOr(key, fallback) {
  const v = tr(key);
  return v === key ? fallback : v;   // clé pas encore livrée (i18n en cours) -- repli sûr
}
let userPinsBox = null;
function ensureUserPinsBox() {
  if (userPinsBox && document.body.contains(userPinsBox)) return userPinsBox;
  const host = document.getElementById('tracked-section');
  if (!host) return null;
  const box = document.createElement('div');
  box.id = 'userpins-block';
  box.innerHTML = `
    <div class="farm-group-head">
      <span class="farm-group-label"></span>
      <span id="userpins-count" class="side-sec-count"></span>
      <button type="button" class="act ghost" data-act="clear-user-flags"></button>
    </div>
    <ul id="userpins-list" class="layer-list"></ul>`;
  host.appendChild(box);
  userPinsBox = box;
  return box;
}
function renderUserPins() {
  const box = ensureUserPinsBox();
  if (!box) return;
  const list = listUserFlags();
  // Liste vide : le bloc entier se masque (jamais un en-tête qui pendrait
  // seul -- la section « Suivi » elle-même garde de toute façon sa propre
  // liste de quêtes/son propre hint, jamais dépendante de ce bloc).
  box.style.display = list.length ? '' : 'none';
  const ul = box.querySelector('#userpins-list');
  ul.innerHTML = '';   // TOUJOURS vidé (même liste vide -- jamais une rangée fantôme qui resterait dans un bloc masqué) avant le repli anticipé ci-dessous
  if (!list.length) return;
  box.querySelector('.farm-group-label').textContent = trOr('userFlagsBlockTitle', 'My flags');
  box.querySelector('#userpins-count').textContent = `(${list.length})`;
  box.querySelector('.act.ghost').textContent = tr('clearAllFlagsBtn');   // clé déjà livrée (popup drapeau, pins.js)
  list.forEach((p, i) => {
    const li = document.createElement('li');
    const label = `${tr('userFlagTitle')} ${i + 1}`;
    li.innerHTML = `<span class="t-dot" style="background:var(--core)"></span>
      <span class="t-name" data-act="goto" data-x="${p.x}" data-z="${p.z}" data-label="${esc(label)}" title="${esc(fmtCoord(p.x, p.z))}">${esc(label)}</span>
      <button type="button" aria-label="${esc(tr('removeBtn'))}" data-act="remove-user-flag" data-id="${esc(p.id)}">✕</button>`;
    ul.appendChild(li);
  });
}
onUserFlagsChange(renderUserPins);
/* Pins LOCATE (Q7) : même idiome d'abonnement unique — chaque mutation du
   jeu S.locates (ajout/retrait/re-rendu de carte, pins.js) republie le
   bandeau-légende (les tags de pins y vivent, voir collectActiveTags) ET
   resynchronise les pastilles L affichées (loi du même-état §5.3 étendue
   au mode L — aria-pressed/remplissage relus de S.locates, jamais figés). */
onLocatesChange(() => { renderActiveTags(); syncEntityRefDots(); });

/* ── Filtres (sidebar) ──────────────────────────────────────── */
/* Badge discret "+N" quand une catégorie a des enregistrements réels sans
   position connue (voir catStats/positionCounts ci-dessous) — jamais un
   simple nombre qui prétendrait montrer plus de pins que la carte n'en
   dessinera jamais (rapport : "PNJ affiche 11 mais 1 seul pin sur Prison
   Island"). Tooltip (title + aria-label, même convention que sidebar.js
   zoneBtn) localisée, jamais un compteur muet. Pas d'affordance de clic ici
   (recherche non filtrable par catégorie+carte à ce jour — voir
   js/search.js runSearch, qui matche par libellé flou, pas par catégorie
   exacte : ajouter ce filtre ne serait pas un geste "gratuit", laissé pour
   une mission dédiée) : la tooltip suffit à rendre le nombre honnête. */
function hiddenBadge(hidden) {
  if (!hidden) return '';
  const label = tr('filterHiddenTooltip', hidden);
  return `<span class="fcount-hidden" title="${esc(label)}" aria-label="${esc(label)}">+${hidden.toLocaleString(numberLocale())}</span>`;
}
function filterRow(key, label, hex, count, hidden, on, toggle, extraClass = '') {
  const li = document.createElement('li');
  // Clé de couche stampée sur le <li> : identité stable pour le bandeau des
  // couches actives (renderActiveTags — dédup des copies miroir Creeps,
  // résolution de l'<input> par clé au moment du clic).
  li.dataset.fkey = key;
  li.innerHTML = `<label class="filter-row ${extraClass} ${on ? '' : 'off'}">
    <input type="checkbox" ${on ? 'checked' : ''}>
    <span class="swatch" style="background:${hex}"></span>
    <span class="flabel">${esc(label)}</span>
    <span class="fcount">${count.toLocaleString(numberLocale())}</span>${hiddenBadge(hidden)}</label>`;
  li.querySelector('input').addEventListener('change', e => {
    li.querySelector('.filter-row').classList.toggle('off', !e.target.checked);
    toggle(e.target.checked);
    syncHash();
    // Cases de CASCADE (IA finale) : tout changement de feuille peut faire
    // basculer l'état coché/partiel/décoché de ses parents (groupe,
    // sous-groupe, ligne famille) — republication d'affichage seule, jamais
    // une mutation d'état de couche.
    refreshParentChecks();
  });
  return li;
}

/* Effectif RÉEL d'une catégorie de haut niveau (CATS) pour la ligne de
   filtre : { shown, hidden } (voir devcontent.js::positionCounts) plutôt que
   la simple taille du tableau -- le compte affiché doit correspondre à ce
   que la couche carte dessine VRAIMENT (renderDomCulled/renderDense, voir
   main.js registerAllDenseRenderers), jamais au nombre brut d'enregistrements
   connus (qui inclut des PNJ/quêtes sans position connue, ex. Captain Rob
   sur Prison Island -- et exclut déjà les isTest, comptés à part). Le motif
   du "sans position" reste délibérément NON qualifié ici (ni "dynamique
   côté serveur" ni autre) : seuls 18 PNJ de Prison Island ont un vrai
   classifieur `pos_source: server_spawn` prouvé (data/quests.json, côté
   pipeline), et ce champ n'atteint aucun .bin du site -- voir
   i18n/*.js::filterHiddenTooltip et  unknown_states_DESIGN.md §2
   re-check #1 pour la même discipline appliquée au tooltip affiché.
   `camp_chest` n'a pas son propre tableau S.data (les points viennent du
   même S.data.chest que la décor/legacy, filtrés par `group`, voir
   config.js/main.js registerAllDenseRenderers) : seule exception à la règle
   générale "un tableau S.data par clé CATS". (L'ancien cas spécial
   `key === 'quest'` a été retiré avec la ligne de filtre `quest` elle-même,
   2026-07-11 -- il était de toute façon strictement redondant avec le
   repli générique ci-dessous, `S.data['quest']` étant `S.data.quest`.) */
function catStats(key) {
  if (key === 'camp_chest') return positionCounts(S.data.chest.filter(r => r.group === 'camp_chest'));
  return positionCounts(S.data[key]);
}

/* ── Le groupe « Décor » est DISSOUS (IA finale, décision utilisateur
   2026-07-11 : « c'est soit interactives soit destroyable, et tu as
   chest ») : ses 7 familles (S.decor, données INCHANGÉES — data.js
   buildDecorGroups, couches decor:<fam>, hash decor.*) se rangent dans les
   sous-groupes du groupe Interactables selon leur `category` CUITE
   (ontology chunk 2 — data/SCHEMA.md « Chest/decor placements » :
   legacy→interactable.chests, barrel/boxes→interactable.destroyable,
   furniture/corpse/books→interactable.reactive, misc→interactable.other).
   L'ancienne table d'affichage DECOR_BUCKET (le même rangement, jugé côté
   front) est SUPPRIMÉE : le front LIT la classification, il ne re-juge
   plus. Toujours toutes décochées par défaut (DATA_CONTRACT.md §1/§3.1) et
   pleinement recherchables (search.js buildChestSearchIndex ne filtre
   jamais sur l'état on/off). Ordre d'affichage intra-bucket =
   DECOR_FAMILIES (présentation, config.js). */
const decorFamsOfCategory = cat =>
  DECOR_FAMILIES.filter(f => S.decor[f] && (S.decor[f].category || 'interactable.other') === cat);
/* Ligne de filtre d'UNE famille décor (ex-sous-ligne du groupe Décor —
   mêmes couche/hash/état, seule la position dans l'arbre change). */
function decorRow(fam, extraClass = 'filter-row-sub') {
  const st = S.decor[fam];
  if (!st) return null;
  return filterRow('decor:' + fam, decorFamilyLabel(fam), DECOR_HEX[fam], st.count, st.hidden, st.on, on => {
    st.on = on;
    scheduleRedraw();
  }, extraClass);
}
/* (refreshDecorRows — l'ancien rafraîchissement par index des cases après un
   Tous/Aucun — est RETIRÉ avec le groupe Décor ; les boutons [Tous][Aucun]
   eux-mêmes ont suivi le 2026-07-11 avec la barre « Par famille », jugée
   inutile par l'utilisateur — la cascade des pastilles couvre le besoin.) */

/* ── L'arbre EST le bestiaire (#82 chunk (d), décision utilisateur) ──────
   Chaque ligne famille du groupe Monsters (rendue DIRECTEMENT dans le
   groupe racine, voir buildGroupMonsters plus bas — correction de
   structure 2026-07-11) est un NŒUD DÉPLIABLE :
   le chevron déplie (rendu PARESSEUX — jamais les ~224 espèces d'un coup)
   les sous-lignes ESPÈCE de la famille, chacune avec sa case (couche
   espèce, S.monsp — POINTS seulement, voir specieslayer.js ; plus de ZONE
   dessinée par camp depuis le retrait du hull convexe, même décision), son
   nom cliquable → sa fiche (la fonction bestiaire), et sa méta honnête
   « N camps · M pts » (les points des CAMPS où elle PEUT apparaître, design
   §13.1) ou « 0 camp » grisé (93/209 espèces sans camp joint : listées
   quand même — l'accès fiche est la raison d'être — cocher n'allume rien
   et la méta le dit, jamais masquées). TOUTES les familles du catalogue
   sont listées (celles sans camp sur la carte active aussi, grisées
   « 0 camp ») pour que les 224 espèces restent parcourables. État de
   dépliage : session seule (expandedFams) ; une famille avec ≥1 espèce
   cochée se déplie d'elle-même à chaque rebuild (la ligne cochée doit
   rester visible — hash restauré, clic de chip). */
const expandedFams = new Set();

/* Espèces du catalogue GLOBAL groupées par famille (post-alias), triées
   niveau puis nom (même ordre que le bestiaire) — cache paresseux invalidé
   par identité S.species + valeur S.devOn (même discipline que
   pointsets.js familyTable). */
let _spByFam = null, _spByFamSrc = null, _spByFamDev = null;
function speciesByFamily() {
  if (_spByFam && _spByFamSrc === S.species && _spByFamDev === S.devOn) return _spByFam;
  const byFam = new Map();
  for (const [id, sp] of Object.entries(S.species || {})) {
    if (isHiddenTest(sp)) continue;
    const fam = familyKey(sp.family || 'other');
    let arr = byFam.get(fam);
    if (!arr) byFam.set(fam, arr = []);
    arr.push({ id, sp });
  }
  for (const arr of byFam.values()) {
    arr.sort((a, b) => (a.sp.levelMin ?? 99) - (b.sp.levelMin ?? 99) || a.sp.name.localeCompare(b.sp.name));
  }
  _spByFam = byFam; _spByFamSrc = S.species; _spByFamDev = S.devOn;
  return byFam;
}

/* Sous-ligne ESPÈCE : mini-label case+pastille (cocher = couche espèce) +
   nom cliquable → fiche (délégué main.js fiche-monster — dans l'arbre de
   GAUCHE, donc fiche SEULE, jamais d'auto-cochage : le clic-double-effet
   n'appartient qu'aux chips des panneaux de droite) + méta honnête.
   `zeroMetaKey` (facultatif) : clé i18n du libellé « 0 camp » — le défaut
   (speciesZeroCamps, « 0 camp sur cette carte ») est scopé CARTE ACTIVE,
   pour les espèces catalogue dont les camps vivent ailleurs ; les espèces
   fauniques 0-camp (wildlife_species.bin, job pass 2026-07-11b) n'ont de
   camp NULLE PART → libellé GLOBAL « 0 camp connu » (wildlifeZeroCamps),
   jamais une promesse implicite qu'une autre carte en aurait. */
function speciesRowLi(id, sp, zeroMetaKey = 'speciesZeroCamps') {
  const st = S.monsp[id] || (S.monsp[id] = { on: false });
  const res = speciesPoints(id);
  const meta = res
    ? tr('speciesCampsPts', res.nCamps, res.nPts.toLocaleString(numberLocale()))
    : tr(zeroMetaKey);
  const [key] = speciesRep(sp);
  const devMark = sp.isTest ? `<span class="dev-mark" title="${esc(tr('devBadgeTitle'))}">${esc(tr('devBadge'))}</span>` : '';
  const nameAttrs = key ? ` data-act="fiche-monster" data-id="${esc(key)}"` : '';
  const li = document.createElement('li');
  li.dataset.species = id;
  li.innerHTML = `<div class="filter-row species-row ${st.on ? '' : 'off'}${res ? '' : ' sp-zero'}">
    <label class="sp-check"><input type="checkbox" ${st.on ? 'checked' : ''} aria-label="${esc(sp.name)}">
      <span class="swatch" style="background:${speciesLayerHex(id)}"></span></label>
    <span class="flabel"><span class="sp-name${key ? ' link' : ''}"${ecAttr(MONSTER_HEX, 'monster')}${nameAttrs}>${esc(sp.name)}</span>${devMark}</span>
    <span class="sp-meta">${esc(meta)}</span>
  </div>`;
  li.querySelector('input').addEventListener('change', e => {
    st.on = e.target.checked;
    li.querySelector('.species-row').classList.toggle('off', !st.on);
    scheduleRedraw();
    syncHash();
    // Une espèce (dé)cochée fait basculer l'état partiel/coché de sa ligne
    // famille et des parents au-dessus (cascade, IA finale).
    refreshParentChecks();
  });
  // Ergonomie de ligne (demande utilisateur 2026-07-11) : TOUTE la ligne
  // bascule la case — méta « N camps · M pts », padding, espace vide —
  // SAUF le NOM (lien fiche, data-act, géré par le délégué global main.js)
  // et la pastille .sp-check elle-même (label natif : il bascule déjà —
  // re-basculer ici l'annulerait). Les lignes filterRow classiques sont des
  // <label> englobants (déjà toute-la-ligne) ; seule cette ligne espèce,
  // structurée en <div> pour séparer nom-lien et case, avait des zones
  // mortes.
  li.querySelector('.species-row').addEventListener('click', e => {
    if (e.target.closest('.sp-check') || e.target.closest('[data-act]')) return;
    const input = li.querySelector('input');
    input.checked = !input.checked;
    input.dispatchEvent(new Event('change'));
  });
  return li;
}
function buildSpeciesSublist(fam) {
  const ul = document.createElement('ul');
  ul.className = 'species-sublist';
  for (const { id, sp } of speciesByFamily().get(fam) || []) ul.appendChild(speciesRowLi(id, sp));
  return ul;
}
/* Chevron de dépliage d'un nœud famille — bouton DANS le <label> de la
   ligne (preventDefault : ne doit jamais basculer la case de la famille). */
function attachFamilyNode(li, fam) {
  li.dataset.fam = fam;
  const row = li.querySelector('.filter-row');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'fam-expand';
  btn.title = tr('famSpeciesToggle');
  btn.setAttribute('aria-label', tr('famSpeciesToggle'));
  btn.setAttribute('aria-expanded', String(expandedFams.has(fam)));
  btn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    if (expandedFams.has(fam)) {
      expandedFams.delete(fam);
      li.querySelector('.species-sublist')?.remove();
      btn.setAttribute('aria-expanded', 'false');
    } else {
      expandedFams.add(fam);
      li.appendChild(buildSpeciesSublist(fam));   // rendu PARESSEUX, au dépliage
      btn.setAttribute('aria-expanded', 'true');
    }
  });
  row.appendChild(btn);
  if (expandedFams.has(fam)) li.appendChild(buildSpeciesSublist(fam));
  return li;
}
/* Révèle un nœud de l'arbre Monstres (espèce/famille) fraîchement coché par
   un chip de fiche (main.js) : ouvre les <details> ancêtres, flash, scroll —
   la famille d'une espèce cochée est déjà auto-dépliée par le rebuild.
   Générique par construction : la boucle ouvre tout <details> fermé
   rencontré en remontant, quel qu'en soit le nombre (aujourd'hui : le
   groupe racine .side-sec seul — plus aucun sous-groupe intermédiaire dans
   Monsters depuis la correction de structure 2026-07-11 ; l'ouverture
   programmatique déclenche bien l'événement toggle, donc le localStorage
   des groupes reste synchrone). Sélecteur élargi à #filters : une espèce
   WILD cochée (turkey…) vit dans le groupe Creeps, plus seulement
   #group-monsters-list. AUCUN mouvement caméra (le geste caméra
   reste goto/zone). */
function revealMonsterNode(kind, id) {
  const target = kind === 'species'
    ? document.querySelector(`#filters li[data-species="${CSS.escape(id)}"] .species-row`)
    : document.querySelector(`#filters li[data-fam="${CSS.escape(id)}"] .filter-row`);
  if (!target) return;
  for (let el = target.parentElement; el; el = el.parentElement) {
    if (el.tagName === 'DETAILS' && !el.open) el.open = true;
  }
  target.classList.add('node-flash');
  setTimeout(() => target.classList.remove('node-flash'), 1600);
  target.scrollIntoView({ block: 'nearest' });
}

/* ── Lignes familles de monstres (le cœur du groupe Monsters — voir la doc
   de buildGroupMonsters plus bas pour l'ordre/la structure du groupe). La
   case d'une ligne famille est à la fois sa COUCHE (S.monfam, couleur
   famille) et un parent de cascade (cocher = toutes ses espèces aussi,
   setFamilyOn ; décochée avec ≥1 espèce cochée = état partiel, voir
   refreshParentChecks). Hash : `on=monfam.<famille>` (token post-alias,
   urlstate.js/router.js — un lien legacy sans tokens monsp.* restaure
   l'ancien rendu couleur-famille tel quel). */
/* Méta « N camps » entre le libellé et le compte de points d'une ligne
   famille (mock design §2 : « Rat   10 camps · 4 045 ») — libellé honnête :
   ce sont les points des CAMPS où la famille apparaît, jamais « positions
   de X » (design §13.1). Style inline plutôt qu'une classe : style.css est
   en édition concurrente par une autre mission (multi-rareté) et la classe
   partagée max-height (#85) n'existe pas encore — à migrer quand elle
   livre. (Vocabulaire « camps » CONSERVÉ dans l'ARBRE : la consigne
   anti-« camps » du 2026-07-11 vise le wording des quêtes/étapes/fiches,
   le concept reste assumé côté data/panneau.) */
function famCampsMeta(nCamps) {
  return `<span class="fam-camps" style="color:var(--muted);font-size:.68rem;white-space:nowrap;margin-right:5px">${esc(tr('familyCampsN', nCamps))}</span>`;
}
/* Ligne FAMILLE partagée (groupe Monsters + copies MIROIR Creeps) : couche
   S.monfam + parent de cascade (setFamilyOn — cocher coche toutes ses
   espèces). `withNode` : le nœud dépliable espèces (chevron droit,
   attachFamilyNode) ne vit QUE dans le groupe Monsters — les copies miroir
   du groupe Creeps restent plates (le détail par espèce n'est jamais
   dupliqué). Après un geste : rebuild du groupe Monsters (les sous-lignes
   espèce dépliées doivent refléter la cascade) — les copies miroir se
   resynchronisent par refreshParentChecks (déjà joué par l'écouteur
   générique de filterRow après ce callback). */
function familyRowLi(fam, f, hex, withNode) {
  const st = S.monfam[fam] || (S.monfam[fam] = { on: false });
  const zero = !f.nPts;
  const row = filterRow('monfam:' + fam, pretty(fam), hex, f.nPts, 0, st.on, on => {
    setFamilyOn(fam, on);
    scheduleRedraw();
    buildGroupMonsters();
  }, 'filter-row-sub' + (zero ? ' fam-zero' : ''));
  row.querySelector('.flabel').insertAdjacentHTML('afterend', famCampsMeta(f.nCamps));
  if (withNode) return attachFamilyNode(row, fam);
  row.dataset.fam = fam;   // copie miroir : resynchronisée par refreshParentChecks
  return row;
}
/* Ligne « reste » d'un kind : les camps du kind SANS aucune espèce jointe
   (compte honnête kindRestPoints = exactement ce que la couche kind dessine :
   la règle rest-only est UNIVERSELLE et dérivée de la donnée — un camp joint
   à une espèce n'est jamais dessiné par sa ligne kind, voir pointsets.js
   kindRestPoints/main.js compositeCampPoints ; l'ancien set front
   KIND_REST_ONLY est supprimé). Token de hash camp.<kind> inchangé.
   DEUX consommateurs, deux emplacements (le param extraClass décide de
   l'indentation) :
     - monsters/creeps : DERNIÈRE ligne de leur groupe, « Spawns non
       identifiés » (kindRestRow) après les lignes espèce/famille — un mob
       sans espèce jointe, indenté comme sous-ligne (filter-row-sub).
     - wildlife : la couche À PART ENTIÈRE « Animaux paisibles »
       (wildlifeRestRow) — les pools de faune paisible génériques
       (peaceful-animals-<région>, ~5 900 points) ne portent AUCUN roster
       d'espèce côté client (attribué côté serveur, prouvé côté données),
       mais leurs ZONES de spawn sont bien réelles. Depuis le retrait du
       groupe Wildlife (2026-07-12), cette ligne vit dans le groupe World
       (buildGroupWorld) comme couche de premier niveau (extraClass '') —
       jamais un « Spawns non identifiés » qui se lirait comme une donnée
       manquante.
   Même mécanique inchangée dans les deux cas (kindRestPoints, jeton
   camp.<kind>, couleur du pool CAMP_COLORS[kind] — #a3b18a pour wildlife) et
   même intégration légende (filterRow → collectActiveTags). */
function appendKindRestRow(ul, kind, extraClass = 'filter-row-sub') {
  const st = S.camps[kind];
  if (!st) return;
  const rest = kindRestPoints(kind);
  if (!rest.nPts) return;
  const label = tr(kind === 'wildlife' ? 'wildlifeRestRow' : 'kindRestRow');
  ul.appendChild(filterRow('camp:' + kind, label, CAMP_COLORS[kind] || '#888',
    rest.nPts, 0, st.on, on => { st.on = on; scheduleRedraw(); }, extraClass));
}

/* ── Arbre de couches : structure FINALE du panneau gauche (2026-07-11,
   corrections utilisateur du jour — supersède « IA finale 4 groupes » ET le
   « miroir de kinds en sous-groupes » ; groupe Wildlife retiré
   2026-07-12) : 5 groupes RACINE (index.html), en-têtes NON sélectionnables
   (titre + chevron natif, aucune case) :
     1. World         — Zones · NPCs · Points d'intérêt (sous-groupe
                        poiType, 8 lignes — step 2 LIVRÉ, buildPoiSubGroup)
                        · Workshops · Shrines · Soulkeepers · Gardes
                        (libellé honnête) · Animaux paisibles · Others
     2. Monsters      — les lignes FAMILLE directement (nœuds dépliables →
                        espèces ; la barre « Par famille » + [Tous][Aucun]
                        est RETIRÉE, jugée inutile — la cascade des lignes
                        suffit) + dernière ligne honnête « Spawns non
                        identifiés » (camps monsters sans espèce jointe,
                        rest-only — voir appendKindRestRow/kindRestPoints)
     3. Creeps        — familles jointes rat/ratmutant (copies MIROIR,
                        présence DOUBLE assumée : le moteur les spawne sous
                        les 2 kinds) + espèces wild (turkey/rabbit/fox/
                        squirrel/porcupine via camp_details) + « Spawns non
                        identifiés » en dernier
     4. Harvesting    — Herbalism · Logging · Mining (inchangé)
     5. Interactables — Chests · Destroyable · Interactives · Other
                        (le groupe Décor y est dissous par sa `category`
                        cuite, voir decorFamsOfCategory)
   (Ex-groupe 4 « Wildlife » RETIRÉ 2026-07-12, décision propriétaire — sa
   seule couche dessinable « Animaux paisibles » (camp:wildlife) est passée
   dans World ci-dessus ; ses espèces fauniques 0-camp quittent l'arbre mais
   restent trouvables par la recherche, search.js buildWildSpeciesSearchIndex.)
   Les deux groupes 2-3 (Monsters/Creeps) sont SYMÉTRIQUES : espèces/familles
   d'abord, une ligne « non identifiés » en dernier. MÊMES lignes (filterRow/hiddenBadge),
   MÊME hash `camp.*`/`decor.*`/`monfam.*`/`monsp.*`/`poi.*` (urlstate.js
   lit l'ÉTAT, jamais une position DOM).

   Rangement kind→groupe DÉRIVÉ DE LA DONNÉE (ontology chunk 2) : chaque
   groupe de camp expédie sa `category` canonique (data/SCHEMA.md « Camp
   category » — world.* / harvest.* / interactable.* / monsters / creeps /
   wildlife / quest.pool / event.pool / unclassified, kind→category vérifié
   1:1 par carte) ; l'ancienne table d'affichage KIND_PLACEMENT est
   SUPPRIMÉE, le panneau LIT la catégorie. quest.pool/event.pool sont des
   catégories HONNÊTEMENT hors-panneau (pools dynamiques consommés par les
   fiches quête/événements — l'IA finale a retiré leurs lignes) : jamais de
   ligne, jamais un silence accidentel. `unclassified` (kinds hors arbre :
   abandoned/extraction/bg/other) va au sous-groupe World > Others.
   ORDRE des lignes (présentation ◇, pas une classification) : world.* par
   points décroissants ; harvest.* et interactable.* par catégorie
   (alphabétique) — les deux reproduisent l'ordre historique sur toutes les
   cartes expédiées (vérifié avant bascule). */
function campKindEntries() {
  return Object.entries(S.camps)
    .filter(([, st]) => st.groups.length)
    .map(([kind, st]) => ({ kind, cat: st.groups[0].category || 'unclassified', pts: st.points.length }));
}
function kindsOfCategory(pred, byPtsDesc = false) {
  const hit = campKindEntries().filter(e => pred(e.cat));
  hit.sort(byPtsDesc
    ? (a, b) => b.pts - a.pts || a.kind.localeCompare(b.kind)
    : (a, b) => a.cat.localeCompare(b.cat) || a.kind.localeCompare(b.kind));
  return hit.map(e => e.kind);
}
/* Surcharges d'AFFICHAGE par kind (libellés i18n, jamais une
   classification) : gardes honnêtes, désambiguïsation « (camps) » des kinds
   dynamiques rangés à côté de props placés — voir buildGroupContainers. */
const CAMP_ROW_LABEL_KEY = {
  guards: 'guardsRowLabel',
  destroyable: 'destroyableCampsRow',
  reactive: 'reactiveCampsRow',
  searchable: 'searchSpotsRow',
};
const campRowLabel = kind => CAMP_ROW_LABEL_KEY[kind] ? tr(CAMP_ROW_LABEL_KEY[kind]) : null;

/* Ligne de filtre CATS (npc/poi/qao/workshop/searchable_chest/camp_chest) --
   même corps que l'ancienne boucle Object.entries(CATS) de buildFilters(),
   appelable PAR CLÉ depuis chaque groupe. extraClass ('filter-row-sub')
   quand la ligne vit dans un sous-groupe. */
function catRow(key, extraClass = '') {
  const c = CATS[key];
  const { shown, hidden } = catStats(key);
  return filterRow(key, catLabel(key), c.hex, shown, hidden, c.on, on => {
    c.on = on;
    if (c.dense) scheduleRedraw();
    else on ? map.addLayer(layers[key]) : map.removeLayer(layers[key]);
  }, extraClass);
}
/* ── Sous-groupe « Points d'intérêt » (poiType, job pass 2026-07-11b) ────
   Remplace l'ancienne ligne plate catRow('poi') par un nœud dépliable — 8
   sous-lignes TOUJOURS listées (même carte sans POI, ex. îles : comptes à 0,
   jamais masquées, même honnêteté que les familles/espèces "0 camp").
   POI est du chemin CRITIQUE (loadCritical, jamais différé) : ce sous-groupe
   se construit dès le premier rendu, aucune garde deferredReady nécessaire.
   Teinte UNIQUE (CATS.poi.hex) pour les 8 lignes -- axe de FORME d'icône,
   pas une taxonomie de jeu (voir config.js POI_TYPES). Hash `poi.<type>`
   (+ legacy `on=poi` = tout ON, voir urlstate.js/router.js). */
function poiTypeStats(type) {
  return positionCounts((S.data.poi || []).filter(r => r.poiType === type));
}
function poiTypeLeaf(t) {
  return { get: () => !!S.poiTypes[t]?.on, set: on => { if (S.poiTypes[t]) S.poiTypes[t].on = on; } };
}
/* Feuilles de cascade POI : seulement quand la carte ACTIVE a des POI
   (Kwalat seule aujourd'hui — les bundles île/arène expédient poi: []) :
   une carte sans POI n'a ni sous-groupe (voir buildPoiSubGroup) ni feuilles
   fantômes dans la case World (même discipline que campLeavesOf, qui ne
   liste que les kinds présents — jamais un parent bloqué par une couche
   impossible ici). */
const poiTypeLeaves = () => ((S.data.poi || []).length ? POI_TYPES.map(poiTypeLeaf) : []);
function buildPoiSubGroup(ul) {
  if (!(S.data.poi || []).length) return;   // carte sans POI : pas de coquille vide
  let total = 0, totalHidden = 0;
  for (const t of POI_TYPES) { const s = poiTypeStats(t); total += s.shown; totalHidden += s.hidden; }
  const grp = buildSubGroup('world-poi', catLabel('poi'), CATS.poi.hex, poiTypeLeaves, total, totalHidden);
  for (const t of POI_TYPES) {
    const { shown, hidden } = poiTypeStats(t);
    const st = S.poiTypes[t] || (S.poiTypes[t] = { on: true });
    grp.ul.appendChild(filterRow('poi.' + t, poiTypeLabel(t), CATS.poi.hex, shown, hidden, st.on, on => {
      st.on = on;
      scheduleRedraw();
    }, 'filter-row-sub'));
  }
  ul.appendChild(grp.li);
}
/* Ligne de filtre camp:<kind> (null si ce kind n'existe pas sur la carte
   active : S.camps ne contient QUE les kinds présents, voir data.js
   loadDeferred/loadMapData). `label` : surcharge d'AFFICHAGE seule (libellé
   honnête des gardes, désambiguïsation « (camps) » des kinds rangés à côté
   de props placés — le token de hash reste camp.<kind>, inchangé). */
function campRow(kind, label = null, extraClass = '') {
  const st = S.camps[kind];
  if (!st) return null;
  // st.points vient directement de g.pts (data.js/multimap.js loadMapData) :
  // chaque entrée a TOUJOURS x/z, jamais de gap position -- hidden fixé à 0.
  return filterRow('camp:' + kind, label || campKindLabel(kind), CAMP_COLORS[kind] || '#888',
    st.points.length, 0, st.on, on => { st.on = on; scheduleRedraw(); }, extraClass);
}
function loadingHintLi() {
  const li = document.createElement('li');
  li.className = 'hint camp-loading';
  li.textContent = tr('campLoading');
  return li;
}

/* ── CASCADE (décision utilisateur, resserrée par la correction finale
   2026-07-11) ────────────────────────────────────────────────────────────
   SEULS les parents intermédiaires qui représentent une vraie UNITÉ DE
   FILTRE portent une pastille de cascade : les sous-groupes (buildSubGroup
   — POI/Others/buckets Interactables) et les lignes FAMILLE. Les en-têtes
   de GROUPE racine (World/Monsters/…, index.html) n'ont PLUS AUCUNE case :
   purs conteneurs plier/déplier (l'ancien câblage .grp-check/GROUP_LEAVES
   est retiré). Cocher un parent = TOUTES les feuilles de son sous-arbre
   passent on ; décocher = toutes off ; certaines = état partiel (pastille
   demi-teinte). Le parent n'est PAS une couche : aucun état propre (jamais
   sérialisé dans le hash), affichage DÉRIVÉ des feuilles à chaque
   refreshParentChecks(). Seule exception : la ligne FAMILLE, à la fois
   couche (S.monfam) et parent (cascade espèces via setFamilyOn).
   Une « feuille » = {get, set} sur l'état réel (CATS[x].on / S.camps[k].on /
   S.decor[f].on / S.poiTypes[t].on / S.monfam[f].on / S.monsp[id].on) ; les
   feuilles absentes de la carte active ne sont simplement pas listées
   (jamais un parent bloqué « ni tout ni rien » par une couche impossible). */
const catLeaf = key => ({ get: () => !!CATS[key].on, set: on => { CATS[key].on = on; } });
const campLeaf = kind => ({ get: () => !!S.camps[kind]?.on, set: on => { if (S.camps[kind]) S.camps[kind].on = on; } });
const decorLeaf = fam => ({ get: () => !!S.decor[fam]?.on, set: on => { if (S.decor[fam]) S.decor[fam].on = on; } });
const campLeavesOf = kinds => kinds.filter(k => S.camps[k]).map(campLeaf);
const decorLeavesOfCategory = cat => decorFamsOfCategory(cat).map(decorLeaf);
/* Familles (arbre) jointes à ≥1 camp d'un kind donné ici — lignes famille
   MIROIR du groupe Creeps (rat/ratmutant : le moteur les spawne sous
   monsters ET creeps, présence double assumée — même état S.monfam, même
   teinte de rang que dans l'arbre, jamais une couche dupliquée). */
function famsOfKind(kind) {
  return monsterFamilies()
    .map((f, i) => ({ family: f.family, nCamps: f.nCamps, nPts: f.nPts, campKeys: f.campKeys, hex: familyHexByRank(i) }))
    .filter(f => [...f.campKeys].some(k => campGroupByKey(k)?.kind === kind));
}
/* Kinds de camp de chaque bucket Interactables — DÉRIVÉS de la catégorie
   cuite (voir kindsOfCategory ci-dessus), plus jamais une liste front. */
const destroyableKinds = () => kindsOfCategory(c => c === 'interactable.destroyable');
const interactivesKinds = () => kindsOfCategory(c => c === 'interactable.reactive' || c === 'interactable.searchable');
const chestsLeaves = () => [catLeaf('searchable_chest'), catLeaf('camp_chest'), ...decorLeavesOfCategory('interactable.chests')];
const destroyableLeaves = () => [...campLeavesOf(destroyableKinds()), ...decorLeavesOfCategory('interactable.destroyable')];
const interactivesLeaves = () => [...campLeavesOf(interactivesKinds()), ...decorLeavesOfCategory('interactable.reactive')];
const interOtherLeaves = () => [catLeaf('qao'), ...decorLeavesOfCategory('interactable.other')];

/* Registre des pastilles parent de sous-groupe (reconstruites à chaque
   rebuild de l'arbre). (L'ancien registre STATIQUE des groupes racine —
   groupChecks/GROUP_LEAVES/.grp-check — est RETIRÉ : correction finale
   utilisateur 2026-07-11, les en-têtes de groupe ne se cochent plus.) */
let subChecks = [];
function wireParentCheck(input, leavesFn) {
  // stopPropagation : la case vit DANS un <summary> — son clic ne doit
  // jamais déplier/replier le groupe en même temps qu'il coche.
  input.addEventListener('click', e => e.stopPropagation());
  input.addEventListener('change', () => {
    const on = input.checked;
    for (const leaf of leavesFn()) leaf.set(on);
    scheduleRedraw();
    buildFilters();       // republie lignes + cases (parents compris)
    syncHash();
  });
}
/* Republication d'AFFICHAGE des états parent (coché/partiel/décoché) —
   dérivés des feuilles, jamais l'inverse. Inclut l'état partiel des lignes
   famille (espèces cochées sous famille décochée). Sélecteurs élargis à
   TOUT #filters : les lignes famille/espèce vivent désormais dans DEUX
   groupes racine (Monsters + copies miroir Creeps — groupe Wildlife retiré
   2026-07-12), plus seulement #group-monsters-list. */
function refreshParentChecks() {
  for (const { input, leavesFn } of subChecks) {
    const vals = leavesFn().map(l => l.get());
    const all = vals.length > 0 && vals.every(Boolean);
    input.checked = all;
    input.indeterminate = !all && vals.some(Boolean);
    input.disabled = !vals.length;
    // La pastille-case (appearance:none) n'expose pas :indeterminate en CSS
    // pur sur ses VOISINS de summary (libellé) : reflété par classes sur le
    // <summary> parent — même vocabulaire off/partial que les lignes.
    const summary = input.closest('summary');
    if (summary) {
      summary.classList.toggle('off', !all && !vals.some(Boolean));
      summary.classList.toggle('partial', !all && vals.some(Boolean));
    }
  }
  const byFam = speciesByFamily();
  for (const li of document.querySelectorAll('#filters li[data-fam]')) {
    const row = li.querySelector(':scope > .filter-row');
    if (!row) continue;
    const fam = li.dataset.fam;
    const famOn = !!S.monfam[fam]?.on;
    const partial = !famOn && (byFam.get(fam) || []).some(({ id }) => S.monsp[id]?.on);
    row.classList.toggle('partial', partial);
    row.classList.toggle('off', !famOn && !partial);
    const input = row.querySelector('input');
    if (input) { input.checked = famOn; input.indeterminate = partial; }
  }
  // Lignes ESPÈCE : une même espèce peut avoir DEUX lignes (arbre des
  // familles + groupe Creeps — présence double assumée, miroir
  // des kinds moteur) : resynchroniser toutes les copies depuis S.monsp
  // (l'écouteur d'une case ne met à jour que sa propre ligne).
  for (const li of document.querySelectorAll('#filters li[data-species]')) {
    const row = li.querySelector('.species-row');
    if (!row) continue;
    const on = !!S.monsp[li.dataset.species]?.on;
    row.classList.toggle('off', !on);
    const input = row.querySelector('input');
    if (input) input.checked = on;
  }
  // Bandeau des couches actives : rejoué ici car TOUT chemin de mutation de
  // couche passe par refreshParentChecks (écouteurs filterRow/espèce directs,
  // cascades wireParentCheck → buildFilters → rebuildAllGroups, restaurations
  // layeractivate/router/urlstate → buildFilters).
  renderActiveTags();
  syncEntityRefDots();
}

/* Pastilles EntityRef affichées HORS de l'arbre (fiche ouverte, futures
   surfaces) : trois vues, UN état (spec mapref §5.3) — après toute mutation
   de couche, les pastilles E relisent S.* EN PLACE, sans attendre une
   réouverture de fiche (retour QA 2026-07-11, corroboré ×3 tranches :
   aria-pressed/remplissage figés jusqu'au re-rendu — clic sans retour
   visuel). Branché ici, dans le MÊME entonnoir que l'arbre et le bandeau.
   Résolution espèce : une ref de but porte la clé de FICHE (mk) — même
   dérivation mk→species que le routeur ref-draw (main.js). Les remplissages
   ⊘ gardent leur forme honnête (empty ⇄ empty-on), ◐ reste tel quel. */
function syncEntityRefDots() {
  for (const btn of document.querySelectorAll('.ref[data-mode="E"] [data-act="ref-draw"]')) {
    const d = btn.closest('.ref').dataset;
    let on = null;
    if (d.kind === 'species') { const sp = S.monsters?.[d.key]?.species || d.key; on = !!S.monsp[sp]?.on; }
    else if (d.kind === 'family') {
      const fams = (d.family || d.key || '').split(',').filter(Boolean);
      on = fams.length > 0 && fams.every(f => S.monfam[f]?.on);
    } else {
      const k = d.subrole || d.key;
      if (k && S.camps && S.camps[k] !== undefined) on = !!S.camps[k]?.on;
    }
    if (on === null) continue;
    btn.setAttribute('aria-pressed', String(on));
    const bub = btn.querySelector('.ref-bubble');
    if (!bub) continue;
    const f = bub.dataset.fill;
    if (f === 'empty' || f === 'empty-on') bub.dataset.fill = on ? 'empty-on' : 'empty';
    else if (f !== 'partial') bub.dataset.fill = on ? 'on' : 'off';
  }
  // Pastilles mode L (Q7, pins locate) : même loi du même-état — chaque
  // pastille locate affichée relit l'appartenance à S.locates (clé stable
  // partagée mapref.js locateRefKey, jamais re-dérivée ici). Exclusion
  // documentée : les refs [Région ●] data-subrole="goal-zone" gardent leur
  // machinerie single-slot (drawGoalZone) — pas des pins locate (voir
  // fiches.js dynamicPosBadge, suivi honnête).
  for (const btn of document.querySelectorAll('.ref[data-mode="L"] [data-act="ref-draw"]')) {
    const d = btn.closest('.ref').dataset;
    if (d.subrole === 'goal-zone') continue;
    const key = locateRefKey(d.kind, d.key, d.x, d.z, d.map);
    if (!key) continue;
    const on = !!S.locates?.has(key);
    btn.setAttribute('aria-pressed', String(on));
    const bub = btn.querySelector('.ref-bubble');
    if (bub && bub.dataset.fill !== 'partial') bub.dataset.fill = on ? 'on' : 'off';
  }
  // Pastilles mode C (catégorie : ex. `[Chests(●)]` de la section « contenants »
  // d'une fiche objet, fiches.js containersSectionHtml). L'état dessiné d'une
  // catégorie est celui de SA LIGNE D'ARBRE (la même source que le bandeau
  // collectActiveTags lit) : on relit la case cochée/indéterminée par fkey. SANS
  // cette passe, la pastille restait FIGÉE à son état de build — cliquer la
  // pastille route vers la case d'arbre (main.js ref-draw chest→input.click),
  // qui basculait bien la couche + l'arbre + la légende, mais la pastille de la
  // fiche « ne savait plus si elle était cochée » (retour owner 2026-07-12).
  for (const btn of document.querySelectorAll('.ref[data-mode="C"] [data-act="ref-draw"]')) {
    const d = btn.closest('.ref').dataset;
    if (!d.fkey) continue;
    const input = document.querySelector(`#filters li[data-fkey="${CSS.escape(d.fkey)}"] input`);
    if (!input) continue;
    const on = input.checked, partial = input.indeterminate;
    btn.setAttribute('aria-pressed', String(on || partial));
    const bub = btn.querySelector('.ref-bubble');
    if (!bub) continue;
    const f = bub.dataset.fill;
    if (f === 'empty' || f === 'empty-on') bub.dataset.fill = on ? 'empty-on' : 'empty';
    else bub.dataset.fill = partial ? 'partial' : (on ? 'on' : 'off');
  }
}

/* ── Bandeau « couches actives » — LÉGENDE en tags (sous la recherche,
   demande utilisateur 2026-07-11, reprise "tags" 2026-07-11d) : chaque
   couche actuellement dessinée est une TAG — [● pastille couleur] Nom [✕] —
   au lieu d'un simple point nu ; le bandeau se lit comme une vraie légende
   de ce qui est affiché sur la carte, pas juste un motif décoratif. La
   COLLECTE (quelles couches, quel nom, quelle couleur, dédoublonnage) est
   INCHANGÉE par rapport à l'ancien renderActiveDots — seul le RENDU change :
   - sous-groupe à pastille (POI, coffres…) → UNE tag pour tout le bucket,
     partiel compris (il peint des pins) — ses lignes internes ne sont jamais
     doublées ;
   - ligne filterRow cochée hors bucket (zones/npc/familles/kinds/…) → une
     tag chacune, dédupliquée par clé (copies miroir Creeps) ; famille
     PARTIELLE incluse en demi-teinte — demi-teinte SUR LA PASTILLE SEULE
     (.atag.partial .atag-dot), jamais sur le nom entier : le nom doit rester
     aussi lisible qu'une tag pleine ;
   - ligne ESPÈCE de niveau racine (Creeps) → une tag ; les
     sous-lignes espèce d'une famille sont représentées par leur famille.
   Nom : libellé localisé de la ligne (déjà dans l'arbre), tronqué à ~18ch
   par CSS (.atag-label, ellipsis) ; `title` = nom COMPLET en repli (tooltip
   native pour le texte coupé) — jamais la phrase de retrait ici, le ✕
   visible sur la tag porte déjà cette affordance à l'œil. `aria-label` (state
   séparé) reste la phrase d'action localisée pour les lecteurs d'écran
   (activeTagRemove : "<nom> — retirer"/"remove"/…).
   Clic : TOUTE la tag est cliquable (bouton plein, pas seulement le ✕) —
   l'<input> est résolu par CLÉ AU MOMENT du clic (l'arbre se reconstruit
   souvent — jamais une référence capturée), décoché puis change → le flux
   normal de la ligne fait tout le reste (toggle de couche, syncHash,
   refreshParentChecks → ce bandeau se republie seul).
   DÉBORDEMENT (plafond 2 rangées, demande utilisateur 2026-07-11d) : jamais
   un clip CSS qui laisserait deviner une tag coupée à moitié — on ne POSE
   JAMAIS plus de 2 rangées de tags dans le DOM. buildTagLayout ci-dessous
   mesure les rangées réelles (offsetTop de chaque tag une fois toutes
   posées) et, si une 3ᵉ apparaît, retire des tags de la fin jusqu'à ce
   qu'une tag « +N » (activeTagsMoreAria) tienne à la place sur la 2ᵉ rangée.
   Clic sur « +N » : bascule `dotsExpanded` (état de SESSION seule, même
   discipline que expandedFams/subOpen) — republie TOUTES les tags,
   bandeau autorisé à grandir (`.expanded` : max-height + défilement interne,
   jamais plus qu'un petit pan de la carte, voir style.css). Un clic HORS du
   bandeau (écouteur pointerdown en capture, posé/déposé avec l'état
   déplié), ou un retrait qui repasse sous 2 rangées, replie automatiquement.
   Recalcul de mise en page : un redimensionnement de fenêtre (debounce) ou
   la fin de la transition `padding-right` de #topbar (ouverture/fermeture du
   tiroir #detail, qui rétrécit l'espace disponible — voir style.css) rejoue
   le layout ; PAS de ResizeObserver ici (observer #active-dots lui-même
   alors qu'on mute ses propres enfants dans le callback est le piège connu
   "ResizeObserver loop" — un événement CSS ciblé est strictement suffisant
   et sans risque de boucle). */
let dotsExpanded = false;
let dotsOutsideHandler = null;

function activeTagInput(d) {
  if (d.sub) return document.querySelector(`#filters details.decor-group[data-subgroup="${CSS.escape(d.key)}"] .subgrp-check`);
  if (d.sp) return document.querySelector(`#filters li[data-species="${CSS.escape(d.key)}"] input`);
  return document.querySelector(`#filters li[data-fkey="${CSS.escape(d.key)}"] input`);
}
function collectActiveTags() {
  const tags = [];
  const seen = new Set();
  const push = d => { const id = (d.locate ? 'loc:' : d.sub ? 'sub:' : d.sp ? 'sp:' : 'row:') + d.key; if (!seen.has(id)) { seen.add(id); tags.push(d); } };
  for (const el of document.querySelectorAll('#filters details.decor-group, #filters li[data-fkey], #filters li[data-species]')) {
    if (el.matches('details.decor-group')) {
      const input = el.querySelector(':scope > summary .subgrp-check');
      if (!input || (!input.checked && !input.indeterminate)) continue;
      push({
        sub: true, key: el.dataset.subgroup,
        label: el.querySelector(':scope > summary .flabel')?.textContent || el.dataset.subgroup,
        hex: input.style.getPropertyValue('--dot').trim(),
        partial: input.indeterminate,
      });
    } else if (el.dataset.fkey) {
      if (el.closest('details.decor-group')) continue;   // représentée par la tag de son bucket
      const input = el.querySelector(':scope > .filter-row input');
      if (!input || (!input.checked && !input.indeterminate)) continue;
      // LÉGENDE VIVANTE (retour user 2026-07-11 soir) : une FAMILLE
      // PARTIELLE (certaines espèces cochées seulement) ne se tague JAMAIS
      // elle-même — le bandeau liste EXACTEMENT ce qui est dessiné, donc ses
      // espèces cochées, une par une (branche espèce + passe d'état S.monsp
      // ci-dessous). La tag famille = famille ENTIÈRE cochée, rien d'autre.
      if (el.dataset.fam && !input.checked) continue;
      push({
        sub: false, key: el.dataset.fkey,
        label: el.querySelector('.flabel')?.textContent || el.dataset.fkey,
        hex: el.querySelector('.swatch')?.style.background || '',
        partial: input.indeterminate,
      });
    } else {
      // Sous-ligne espèce d'une famille : représentée par la tag FAMILLE
      // seulement quand la famille est ENTIÈREMENT cochée ; sinon l'espèce
      // se tague elle-même (dédupliquée avec la passe d'état par 'sp:').
      const famLi = el.closest('li[data-fam]');
      if (famLi && famLi.querySelector(':scope > .filter-row input')?.checked) continue;
      const input = el.querySelector('input');
      if (!input?.checked) continue;
      push({
        sp: true, key: el.dataset.species,
        label: el.querySelector('.sp-name')?.textContent || el.dataset.species,
        hex: el.querySelector('.swatch')?.style.background || '',
      });
    }
  }
  // Passe d'ÉTAT (S.monsp) : le bandeau est la légende de la CARTE, jamais
  // du DOM de l'arbre — une espèce dessinée dont la sous-ligne n'est pas
  // rendue (famille REPLIÉE : buildSpeciesSublist est paresseux, le repli
  // retire les <li data-species>) doit quand même se taguer. Dédup 'sp:'
  // avec la boucle DOM ; une espèce d'une famille entièrement cochée reste
  // représentée par la tag famille (même règle que la branche DOM).
  for (const [id, st] of Object.entries(S.monsp || {})) {
    if (!st?.on) continue;
    const sp = S.species?.[id];
    const fam = sp ? familyKey(sp.family || 'other') : null;
    if (fam && S.monfam[fam]?.on) continue;
    push({ sp: true, key: id, label: sp?.name || pretty(id), hex: speciesLayerHex(id) });
  }
  // Pins LOCATE (Q7) : chaque pin actif est une tag de légende comme les
  // couches — libellé = celui de la référence qui l'a posé (repli : mot de
  // kind localisé), teinte = la teinte de la référence (--ref-c). TOUS les
  // pins sont listés, y compris ceux d'une AUTRE carte (l'état est global et
  // survit à la bascule — sans tag ici, un pin cross-carte deviendrait
  // irretirables sans re-basculer ; même parité que les couches espèce à
  // 0 point locaux, qui gardent leur tag). Retrait : buildTagEl route la
  // tag/le ✕ vers removeLocatePin (l'alias dot-off ratifié §2.5).
  for (const [key, p] of S.locates || []) {
    push({ locate: true, key, label: p.label || refKindLabel(p.kind || 'position'), hex: p.hex || 'var(--accent)' });
  }
  return tags;
}
/* Une tag = un <button> plein : pastille (couleur de couche, demi-teinte si
   partiel) + nom (ellipsis 18ch, title = nom complet) + ✕ décoratif
   (aria-hidden, l'affordance réelle est le clic sur tout le bouton). */
function buildTagEl(d) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'atag' + (d.partial ? ' partial' : '');
  const dot = document.createElement('span');
  dot.className = 'atag-dot';
  dot.style.setProperty('--c', d.hex);
  const label = document.createElement('span');
  label.className = 'atag-label';
  label.textContent = d.label;
  const x = document.createElement('span');
  x.className = 'atag-x';
  x.setAttribute('aria-hidden', 'true');
  x.textContent = '✕';
  b.append(dot, label, x);
  b.title = d.label;
  b.setAttribute('aria-label', tr('activeTagRemove', d.label));
  b.addEventListener('click', () => {
    // Tag de pin LOCATE (Q7) : pas de case d'arbre derrière (même famille
    // « sans input DOM » que la branche espèce d'état ci-dessous) — le clic
    // retire le pin (removeLocatePin notifie → cette légende et les
    // pastilles L des fiches se republient seules via onLocatesChange).
    if (d.locate) { removeLocatePin(d.key); return; }
    const input = activeTagInput(d);
    if (input) {
      input.checked = false;
      input.indeterminate = false;
      input.dispatchEvent(new Event('change'));
      return;
    }
    // Tag d'espèce issue de la passe d'état (sous-ligne non rendue, famille
    // repliée) : aucune case DOM à décocher — bascule l'état directement,
    // mêmes republications que la case (arbre + carte + hash). toggleSpecies
    // éteint forcément ici : la tag n'existe que couche allumée.
    if (d.sp) {
      toggleSpecies(d.key);
      buildFilters();
      scheduleRedraw();
      syncHash();
    }
  });
  return b;
}
/* Tag « +N » de débordement : même anatomie de bouton (mêmes dimensions,
   nécessaire pour que la mesure de rangée reste valide — voir
   buildTagLayout), teinte accent plutôt que la pastille neutre. Clic :
   déplie (état de session), jamais un lien vers l'arbre. */
function buildMoreChip(n) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'atag atag-more';
  b.textContent = `+${n}`;
  const aria = tr('activeTagsMoreAria', n);
  b.title = aria;
  b.setAttribute('aria-label', aria);
  b.addEventListener('click', e => {
    e.stopPropagation();
    dotsExpanded = true;
    renderActiveTags();
  });
  return b;
}
/* Replie le bandeau déplié sur tout clic HORS de lui (pointerdown en
   CAPTURE : observe seul, jamais de preventDefault/stopPropagation — le
   clic réel de l'utilisateur, où qu'il tombe, continue son cours normal).
   Écouteur reposé à chaque rendu (le précédent est retiré d'abord) : pas de
   fuite, pas de doublon. */
function collapseDotsOnOutsideClick(host) {
  if (dotsOutsideHandler) document.removeEventListener('pointerdown', dotsOutsideHandler, true);
  dotsOutsideHandler = e => {
    if (dotsExpanded && !host.contains(e.target)) {
      dotsExpanded = false;
      renderActiveTags();
    }
  };
  document.addEventListener('pointerdown', dotsOutsideHandler, true);
}
function renderActiveTags() {
  const host = document.getElementById('active-dots');
  if (!host) return;
  host.classList.remove('expanded');
  const tags = collectActiveTags();
  if (!tags.length) { host.replaceChildren(); return; }
  const els = tags.map(buildTagEl);
  host.replaceChildren(...els);   // pose TOUT d'abord : mesure de rangée fiable
  const rowTops = [...new Set(els.map(el => el.offsetTop))];
  if (rowTops.length <= 2) {
    dotsExpanded = false;   // tient déjà sur 2 rangées : rien à replier/déplier
  } else if (dotsExpanded) {
    host.classList.add('expanded');
  } else {
    const row2Top = rowTops[1];
    let visible = els.filter(el => el.offsetTop <= row2Top);
    // Rétrécit jusqu'à ce que la tag « +N » elle-même tienne sur la 2ᵉ
    // rangée (jamais une tag « +N » qui déborderait sur une 3ᵉ).
    while (visible.length) {
      const more = buildMoreChip(els.length - visible.length);
      host.replaceChildren(...visible, more);
      if (more.offsetTop <= row2Top) break;
      visible = visible.slice(0, -1);
    }
    if (!visible.length) host.replaceChildren(buildMoreChip(els.length));
  }
  collapseDotsOnOutsideClick(host);
}
/* Recalcul de mise en page sur redimensionnement (debounce léger — un
   battement de resize spamme sinon l'événement). */
let _dotsResizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(_dotsResizeTimer);
  _dotsResizeTimer = setTimeout(renderActiveTags, 120);
});
/* Recalcul sur l'ouverture/fermeture du tiroir #detail : #topbar rétrécit
   via un padding-right transitionné (voir style.css) quand #detail.open
   apparaît/disparaît — écouté ici plutôt que dans le code qui bascule cette
   classe (ailleurs, hors-scope) : générique, ne dépend d'aucun appelant. */
document.getElementById('topbar')?.addEventListener('transitionend', e => {
  if (e.propertyName === 'padding-right') renderActiveTags();
});

/* État d'ouverture des sous-groupes (session seule, même discipline que
   expandedFams — le localStorage ne persiste que les groupes side-sec). */
const subOpen = new Set();
/* Sous-groupe repliable générique (Points d'intérêt/Chests/Destroyable/… —
   classe .decor-group réutilisée telle quelle). CORRECTION VISUELLE
   utilisateur (2026-07-11, finale) : plus JAMAIS de case native visible —
   la PASTILLE COLORÉE est elle-même la case (l'<input> est stylé en
   pastille via appearance:none + --dot, voir style.css .subgrp-check :
   pleine = coché, anneau vide = décoché, demi-teinte = partiel), et le
   dépliage passe par un CHEVRON dédié à DROITE (bouton .subgrp-expand,
   même vocabulaire visuel que le chevron d'espèces .fam-expand). Zones de
   clic : pastille/libellé = bascule de cascade ; chevron = plier/déplier
   SEUL. Ces parents intermédiaires GARDENT leur pastille de cascade
   (décision utilisateur : un parent qui représente une vraie unité de
   filtre — tous les POI, tous les coffres… — se coche ; les en-têtes de
   GROUPE, eux, n'ont plus aucune case, voir index.html).
   `count` null = pas de compteur agrégé (un sous-groupe qui RECOUVRE ses
   propres lignes mentirait avec une somme ; les buckets disjoints
   affichent leur somme honnête). */
function buildSubGroup(key, label, hex, leavesFn, count = null, hidden = 0) {
  const li = document.createElement('li');
  const det = document.createElement('details');
  det.className = 'decor-group';
  det.dataset.subgroup = key;
  if (subOpen.has(key)) det.open = true;
  const summary = document.createElement('summary');
  summary.innerHTML = `<input type="checkbox" class="subgrp-check" style="--dot:${hex}" aria-label="${esc(tr('groupToggleAria'))}">
    <span class="flabel">${esc(label)}</span>
    ${count != null ? `<span class="fcount">${count.toLocaleString(numberLocale())}</span>` : ''}${hiddenBadge(hidden)}
    <button type="button" class="fam-expand subgrp-expand" aria-expanded="${det.open}" title="${esc(tr('subgroupFoldAria'))}" aria-label="${esc(tr('subgroupFoldAria'))}"></button>`;
  const input = summary.querySelector('input');
  const foldBtn = summary.querySelector('.subgrp-expand');
  det.addEventListener('toggle', () => {
    det.open ? subOpen.add(key) : subOpen.delete(key);
    foldBtn.setAttribute('aria-expanded', String(det.open));
  });
  // Zones de clic (voir doc ci-dessus). Un clic sur l'<input>-pastille ou le
  // chevron (éléments interactifs imbriqués) ne déclenche JAMAIS le pli
  // natif du <summary> (spec HTML) : la pastille bascule nativement (change
  // → cascade via wireParentCheck), le chevron plie programmatiquement ;
  // tout AUTRE clic (libellé, compteur) bascule la pastille — preventDefault
  // pour ne pas plier en même temps.
  summary.addEventListener('click', e => {
    if (e.target === input) return;
    if (e.target.closest('.subgrp-expand')) { det.open = !det.open; return; }
    e.preventDefault();
    input.checked = !input.checked;
    input.dispatchEvent(new Event('change'));
  });
  wireParentCheck(input, leavesFn);
  subChecks.push({ input, leavesFn });
  det.appendChild(summary);
  const ul = document.createElement('ul');
  ul.className = 'subfilter-list';
  det.appendChild(ul);
  li.appendChild(det);
  return { li, ul };
}

/* ── Groupe « World » : Zones · NPCs · Points d'intérêt (sous-groupe
   poiType, 8 lignes — voir buildPoiSubGroup ci-dessus) · Workshops ·
   Shrines · Soulkeepers · Gardes · Animaux paisibles · Others.
   « Animaux paisibles » (couche camp:wildlife, ~5 900 points, teinte
   #a3b18a) a rejoint World au retrait du groupe « Faune sauvage »
   (2026-07-12, décision propriétaire — seule couche dessinable qu'il
   contenait) : couche de premier niveau (appendKindRestRow avec extraClass
   '', pas indentée), placée après les kinds `world.*` — la faune paisible
   est du décor de monde au même titre que les gardes/sanctuaires.
   npc/poi/workshop/zones : critiques (premier rendu) ; les lignes camp
   (shrines/soulkeeper/guards/wildlife/other) attendent camps.bin (différé).
   Gardes : libellé honnête « Gardes (unité non identifiée) » — 2 camps/12
   points sans AUCUN lien espèce/PNJ/butin/niveau dans les données (voir
    interactives_taxonomy_INVESTIGATION.md §5) — jamais un pair
   de camp de monstre qu'il n'est pas. « Others » : sous-groupe DISTINCT du
   sous-groupe POI ci-dessus — il porte la ligne camp:other (littéralement
   les camps moteur « autres »), une notion de kind de camp, pas une famille
   d'icône POI (le 9ᵉ jeton défensif `poiType.other` n'a JAMAIS de record à
   ce jour — config.js POI_TYPES ne liste que les 8 familles réelles, voir
    */
function buildGroupWorld() {
  const ul = $('#group-world-list');
  ul.innerHTML = '';
  if (S.zonesGeo.length) {
    // Pas de notion de "sans position" pour une région (zones_geo est déjà
    // 100% ce qui est dessiné) : hidden fixé à 0, jamais de badge ici.
    ul.appendChild(filterRow('zones', tr('zonesLabel'), ZONE_HEX, S.zonesGeo.length, 0, S.zonesOn, toggleZones));
  }
  ul.appendChild(catRow('npc'));
  buildPoiSubGroup(ul);
  ul.appendChild(catRow('workshop'));
  if (!deferredReady) { ul.appendChild(loadingHintLi()); return; }
  // Lignes camp du groupe World : les kinds de catégorie cuite `world.*`
  // (shrines/soulkeeper/guards aujourd'hui — data/SCHEMA.md), points
  // décroissants (présentation, voir l'en-tête « Arbre de couches »).
  for (const kind of kindsOfCategory(c => c.startsWith('world.'), true)) {
    const li = campRow(kind, campRowLabel(kind));
    if (li) ul.appendChild(li);
  }
  // « Animaux paisibles » (ex-groupe Wildlife, retiré 2026-07-12) : la seule
  // couche dessinable du pool camp:wildlife (spawns de faune paisible sans
  // roster côté client), en couche de premier niveau (extraClass '') — voir
  // appendKindRestRow. Rien dessiné/aucune ligne si le kind est absent de la
  // carte active ou vide (garde interne d'appendKindRestRow).
  appendKindRestRow(ul, 'wildlife', '');
  // Sous-groupe « Others » : les kinds `unclassified` (hors-arbre honnête —
  // abandoned/extraction/bg, repliés en kind `other` par le pipeline).
  // quest.pool/event.pool restent hors panneau (voir l'en-tête).
  const otherKinds = kindsOfCategory(c => c === 'unclassified');
  const otherRows = otherKinds.map(k => campRow(k, null, 'filter-row-sub')).filter(Boolean);
  if (otherRows.length) {
    const total = otherKinds.reduce((s, k) => s + (S.camps[k]?.points.length || 0), 0);
    const grp = buildSubGroup('world-others', tr('subWorldOthers'), CAMP_COLORS.other,
      () => campLeavesOf(otherKinds), total);
    for (const r of otherRows) grp.ul.appendChild(r);
    ul.appendChild(grp.li);
  }
}
/* ── Groupe « Monsters » (racine — correction structure 2026-07-11) : les
   lignes FAMILLE directement dans le groupe (nœuds dépliables → sous-lignes
   espèce, chevron droit .fam-expand), triées camps joints d'abord (rang =
   couleur, design §4.3) puis les familles catalogue SANS camp ici
   (alphabétiques, grisées « 0 camp » — listées quand même : l'arbre est le
   bestiaire, chunk (d)). Total BRUT affiché par ligne (camps · points — ce
   qu'elle allumerait seule) : rat et ratmutant partagent les 10 mêmes camps
   et affichent chacun 4 045, assumé (données réelles, design §13.3) ; le
   dédoublonnage est un fait de RENDU (main.js compositeCampPoints, priorité
   espèce > famille > kind), jamais de comptage. La barre « Par famille » +
   [Tous][Aucun] est RETIRÉE (« useless », correction utilisateur — la
   cascade des pastilles couvre tout-cocher/tout-décocher). Dernière ligne :
   « Spawns non identifiés » (camps monsters SANS espèce jointe, rest-only —
   remplace l'ancienne bascule grossière « Camps de monstres », dont le
   compte incluait des camps déjà couverts par les familles ; la règle
   rest-only est universelle et data-dérivée, la couche dessine EXACTEMENT
   ce compte — voir main.js compositeCampPoints).
   GLOSSARY-PENDING : le nom affiché d'une famille est son token moteur
   prettifié (pretty(f.family) — « Boarmammoth », « Ratmutant »…) : AUCUNE
   table de localisation des familles n'existe dans les données expédiées ;
   à balayer quand l'extraction de glossaire (#86) livrera des libellés
   prouvés. */
function buildGroupMonsters() {
  const ul = $('#group-monsters-list');
  ul.innerHTML = '';
  if (!deferredReady) { ul.appendChild(loadingHintLi()); return; }
  const fams = monsterFamilies();               // familles AVEC camps joints ici (triées pts desc)
  const byFam = speciesByFamily();              // TOUTES les familles du catalogue global
  if (!fams.length && !byFam.size) return;
  // Une famille avec ≥1 espèce cochée se déplie d'elle-même : la ligne cochée
  // doit être VISIBLE (hash restauré, clic de chip — décision utilisateur
  // « auto-expanding its family so the checked row is visible »).
  for (const [fam, list] of byFam) {
    if (list.some(({ id }) => S.monsp[id]?.on)) expandedFams.add(fam);
  }
  const withCamps = new Set(fams.map(f => f.family));
  const zeroFams = [...byFam.keys()].filter(f => !withCamps.has(f)).sort();
  for (const [i, f] of fams.entries()) ul.appendChild(familyRowLi(f.family, f, familyHexByRank(i), true));
  for (const fam of zeroFams) ul.appendChild(familyRowLi(fam, { nCamps: 0, nPts: 0 }, MONSTER_HEX, true));
  appendKindRestRow(ul, 'monsters');
}
/* ── Groupe « Creeps » (racine) : lignes famille MIROIR jointes au kind
   creeps (rat/ratmutant — même état S.monfam/mêmes teintes que l'arbre
   Monsters, jamais une couche dupliquée, sans chevron d'espèces : le détail
   par espèce vit dans le groupe Monsters, jamais dupliqué) + lignes espèce
   WILD (speciesRowLi — case S.monsp, hash monsp.<token moteur> ; pas de
   fiche monstre pour ces espèces, nom non cliquable honnête via speciesRep
   → null) + la ligne « Spawns non identifiés » en DERNIER.
   (Le groupe « Wildlife » partageait autrefois ce constructeur — il est
   RETIRÉ 2026-07-12, voir l'en-tête « Arbre de couches ». Les espèces
   fauniques 0-camp qu'il listait — tortues/vache/poule/… — quittent l'arbre
   avec le groupe mais restent trouvables par la recherche : search.js
   buildWildSpeciesSearchIndex les indexe direct depuis S.wildlifeSpecies,
   indépendamment de l'arbre. Sa seule couche dessinable, « Animaux
   paisibles » (camp:wildlife), a migré dans World.) */
function buildKindGroup(listId, kind) {
  const ul = $(listId);
  if (!ul) return;
  ul.innerHTML = '';
  if (!deferredReady) { ul.appendChild(loadingHintLi()); return; }
  for (const f of famsOfKind(kind)) ul.appendChild(familyRowLi(f.family, f, f.hex, false));
  const wild = wildSpeciesOfKind(kind)
    .slice()
    .sort((a, b) => (speciesPoints(b.id)?.nPts || 0) - (speciesPoints(a.id)?.nPts || 0) || a.name.localeCompare(b.name));
  for (const w of wild) ul.appendChild(speciesRowLi(w.id, { name: w.name }));
  appendKindRestRow(ul, kind);
}
const buildGroupCreeps = () => buildKindGroup('#group-creeps-list', 'creeps');
/* ── Groupe « Harvesting » : les kinds de catégorie cuite `harvest.*`
   (herbalism/logging/mining — ordre alphabétique de catégorie, identique à
   l'ancien ordre fixe sur toutes les cartes). */
function buildGroupHarvest() {
  const ul = $('#group-harvest-list');
  ul.innerHTML = '';
  if (!deferredReady) { ul.appendChild(loadingHintLi()); return; }
  for (const kind of kindsOfCategory(c => c.startsWith('harvest.'))) {
    const li = campRow(kind);
    if (li) ul.appendChild(li);
  }
}
/* Somme HONNÊTE d'un bucket Interactables (sources DISJOINTES prouvées :
   couches CATS ≠ familles décor ≠ camps dynamiques, voir 
   interactives_taxonomy_INVESTIGATION.md §3 « point-level overlap: zero ») :
   compte principal = ce que la carte dessinerait, badge +N = enregistrements
   réels sans position (même discipline que catStats/hiddenBadge). */
function bucketStats(cats, decorFams, kinds) {
  let count = 0, hidden = 0;
  for (const c of cats) { const s = catStats(c); count += s.shown; hidden += s.hidden || 0; }
  for (const f of decorFams) { const st = S.decor[f]; if (st) { count += st.count; hidden += st.hidden || 0; } }
  for (const k of kinds) { const st = S.camps[k]; if (st) count += st.points.length; }
  return { count, hidden };
}
/* ── Groupe « Interactables » : 4 sous-groupes (Chests · Destroyable ·
   Interactives · Other) — la composition de chaque bucket est DÉRIVÉE de la
   `category` cuite des records (kinds de camp : interactable.destroyable/
   reactive/searchable ; familles décor dissoutes : interactable.chests/
   destroyable/reactive/other — voir decorFamsOfCategory/kindsOfCategory,
   ontology chunk 2). Libellés désambiguïsés — plus jamais quatre choses
   nommées « fouillable » : « Coffres fouillables » (searchable_chest, la
   vraie couche coffre à recette) garde son terme ; le kind camp
   `searchable` devient « Points de fouille (camps) » (searchSpotsRow,
   GLOSSARY-PENDING) ; les kinds destroyable/reactive prennent un suffixe
   « (camps) » (spawns dynamiques serveur, campRowLabel) pour ne pas se
   confondre avec les props PLACÉS (décor) rangés dans le même bucket.
   Défauts inchangés : les 2 couches coffres ON ; destroyable/reactive/
   searchable/décor/qao OFF (palier bruit — verdict investigation §6.2,
   0 table de butin canonique). */
function buildGroupContainers() {
  const ul = $('#group-containers-list');
  ul.innerHTML = '';
  const fillKindsAndDecor = (kindsFn, decorCat) => u => {
    for (const kind of (deferredReady ? kindsFn() : [])) {
      const c = campRow(kind, campRowLabel(kind), 'filter-row-sub');
      if (c) u.appendChild(c);
    }
    for (const f of decorFamsOfCategory(decorCat)) { const li = decorRow(f); if (li) u.appendChild(li); }
  };
  const BUCKETS = [
    ['inter-chests', 'subChests', CATS.searchable_chest.hex, chestsLeaves,
      ['searchable_chest', 'camp_chest'], 'interactable.chests', () => [],
      u => {
        u.appendChild(catRow('searchable_chest', 'filter-row-sub'));
        u.appendChild(catRow('camp_chest', 'filter-row-sub'));
        for (const f of decorFamsOfCategory('interactable.chests')) { const li = decorRow(f); if (li) u.appendChild(li); }
      }],
    ['inter-destroyable', 'subDestroyable', CAMP_COLORS.destroyable, destroyableLeaves,
      [], 'interactable.destroyable', destroyableKinds,
      fillKindsAndDecor(destroyableKinds, 'interactable.destroyable')],
    ['inter-interactives', 'subInteractives', CAMP_COLORS.reactive, interactivesLeaves,
      [], 'interactable.reactive', interactivesKinds,
      fillKindsAndDecor(interactivesKinds, 'interactable.reactive')],
    ['inter-other', 'subOther', CAMP_COLORS.other, interOtherLeaves,
      ['qao'], 'interactable.other', () => [],
      u => {
        u.appendChild(catRow('qao', 'filter-row-sub'));
        for (const f of decorFamsOfCategory('interactable.other')) { const li = decorRow(f); if (li) u.appendChild(li); }
      }],
  ];
  for (const [key, labelKey, hex, leavesFn, cats, decorCat, kindsFn, fill] of BUCKETS) {
    const { count, hidden } = bucketStats(cats, decorFamsOfCategory(decorCat), deferredReady ? kindsFn() : []);
    const grp = buildSubGroup(key, tr(labelKey), hex, leavesFn, count, hidden);
    fill(grp.ul);
    if (grp.ul.children.length) ul.appendChild(grp.li);
  }
  if (!deferredReady) ul.appendChild(loadingHintLi());
}

/* Point d'entrée unique -- nom CONSERVÉ pour ne pas toucher main.js/
   router.js/search.js, qui appellent tous buildFilters() tel quel à chaque
   cycle de vie (boot, bascule langue/carte, toggle dev-content, toggle
   zones). Reconstruit les 4 groupes + le registre des cases de sous-groupe
   + les états parent, puis rejoue le tout une fois camps.bin arrivé
   (whenDeferred : synchrone si déjà prêt — double rebuild idempotent, même
   dégénérescence assumée que l'ancien whenDeferred(buildCampFilters)). */
function rebuildAllGroups() {
  subChecks = [];
  buildGroupWorld();
  buildGroupMonsters();
  buildGroupCreeps();
  buildGroupHarvest();
  buildGroupContainers();
  refreshParentChecks();
}
function buildFilters() {
  rebuildAllGroups();
  whenDeferred(rebuildAllGroups);
}

/* (Les anciens groupes « Points d'intérêt »/« Quêtes »/« Monde » et le
   groupe repliable « Décor » — buildGroupPoi/buildGroupQuests/l'ancien
   buildGroupWorld/buildDecorGroup — sont RETIRÉS avec l'IA finale
   (2026-07-11, voir l'en-tête « Arbre de couches » ci-dessus) : leurs
   lignes vivent désormais dans World/Interactables, mêmes couches, mêmes
   tokens de hash — un lien LEGACY `on=qao`/`camp.guards`/`decor.barrel`
   restaure exactement la même carte, seule la position de la case dans le
   panneau a changé. La note historique « quest layer retirée / camp:quest
   no-op » (décisions 2026-07-11) reste documentée dans urlstate.js/
   router.js, qui portent les gardes correspondantes.) */
/* ── Bestiaire (sidebar) — RETIRÉ (2026-07-11, décision utilisateur) ──────
   La section « Bestiaire » (buildBestiary/#bestiary-list, un listing par
   famille séparé en bas du panneau) est SUPPRIMÉE : l'arbre Monstres &
   faune (les lignes famille de buildGroupMonsters) couvre exactement le
   même besoin — toutes les 224+ espèces catalogue restent parcourables par
   famille (chunk (d), « l'arbre EST le bestiaire »), chaque nom ouvre la
   même fiche, et la recherche (search.js buildMonsterSearchIndex) les
   indexe déjà toutes. Un second listing redondant, plus bas dans le même
   panneau, n'apportait plus rien. `speciesRep` (juste en dessous) est
   CONSERVÉ : partagé avec speciesRowLi (sous-ligne espèce de l'arbre,
   au-dessus dans ce fichier), toujours nécessaire. `speciesMaps` et
   `levelRangeSub` n'avaient en revanche AUCUN autre appelant (grep vérifié)
   -- retirés avec buildBestiary/bestiaryMapOnly. Les clés i18n
   bestiaryTitle/bestiaryLoading/bestiaryMapFilterLabel/bestiaryMapEmpty
   retirées des 5 dictionnaires (bestiaryZonesN reste : toujours utilisée
   par fiches.js openMonsterFiche). CSS #bestiary-list/.bst-* retiré de
   style.css ; le bloc `<details data-sec="bestiary">` retiré d'index.html. */
/* Représentant S.monsters d'une espèce -- [key, m] tuple, jamais l'objet
   espèce lui-même (fiche-monster/monster-zone attendent une clé de GROUPE
   S.monsters, voir openMonsterFiche/viewMonsterZone) : `canonicalSiteKey`
   d'abord (garanti résolvable sur les 224/224 espèces du build actuel),
   repli premier spawn présent dans S.monsters sinon (filet de sécurité, ne
   devrait jamais servir aujourd'hui). Partagé avec speciesRowLi
   (sous-ligne espèce de l'arbre Monstres & faune, ci-dessus). */
function speciesRep(sp) {
  if (sp.canonicalSiteKey && S.monsters[sp.canonicalSiteKey]) return [sp.canonicalSiteKey, S.monsters[sp.canonicalSiteKey]];
  for (const s of sp.spawns || []) { if (S.monsters[s.siteKey]) return [s.siteKey, S.monsters[s.siteKey]]; }
  return [null, null];
}

/* ── Panneau ────────────────────────────────────────────────── */
/* Sections repliables du panneau (Points d'intérêt/Monstres & faune/…/
   Suivis) : état ouvert/replié persisté par section (localStorage) — la
   sidebar fait ~3 écrans, chacun garde ouverte la partie qu'il consulte
   vraiment. */
const _secState = JSON.parse(localStorage.getItem(LS.sections) || '{}');
$$('.side-sec').forEach(sec => {
  const k = sec.dataset.sec;
  if (k in _secState) sec.open = !!_secState[k];
  sec.addEventListener('toggle', () => {
    _secState[k] = sec.open;
    localStorage.setItem(LS.sections, JSON.stringify(_secState));
  });
});

/* (Le câblage des cases de cascade de GROUPE — .grp-check/GROUP_LEAVES/
   groupChecks — est RETIRÉ : correction finale utilisateur 2026-07-11, les
   en-têtes de groupe ne sont plus sélectionnables — purs conteneurs
   plier/déplier natifs, titre + chevron. La cascade vit sur les parents
   intermédiaires à unité de filtre réelle : sous-groupes buildSubGroup +
   lignes famille — voir wireParentCheck/refreshParentChecks.) */

$('#panel-toggle').addEventListener('click', () => {
  const p = $('#panel');
  const hidden = p.classList.toggle('hidden');
  $('#panel-toggle').classList.toggle('solo', hidden);
  $('#panel-toggle').setAttribute('aria-expanded', String(!hidden));
  setTimeout(() => map.invalidateSize(), 280);
});

export { buildFilters, renderTracked, toggleTrack, toggleDone, revealMonsterNode };
