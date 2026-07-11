/* Kwalat — panneau latéral : filtres de couches, liste des camps, suivis
   (tracked/fait) et bouton d'affichage du panneau. */
import { S, LS, save } from './state.js';
import {
  CATS, CAMP_COLORS, ZONE_HEX, MONSTER_HEX, catLabel, campKindLabel, familyKey, familyHexByRank,
  chestDisplayName, chestHex, DECOR_FAMILIES, DECOR_HEX, decorFamilyLabel, prettyRegion, ecAttr,
  speciesLayerHex,
} from './config.js';
import { $, $$, esc, pretty, fold } from './utils.js';
import { tr, numberLocale } from './i18n/index.js';
import { map, layers, scheduleRedraw, refreshIconLayer, toggleZones } from './mapview.js';
import { syncHash, pushFocusState } from './urlstate.js';
import { goTo } from './pins.js';
import { whenDeferred, deferredReady } from './data.js';
import { isHiddenTest, positionCounts } from './devcontent.js';
import {
  monsterFamilies, speciesPoints, campGroupByKey, wildSpeciesOfKind, kindRestPoints,
} from './pointsets.js';
import { setFamilyOn } from './specieslayer.js';

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
   buildDecorGroups, couches decor:<fam>, hash decor.*) sont re-rangées
   D'AFFICHAGE dans les sous-groupes du groupe Interactables, chacune selon
   sa nature (voir DECOR_BUCKET ci-dessous). Toujours toutes décochées par
   défaut (DATA_CONTRACT.md §1/§3.1) et pleinement recherchables
   (search.js buildChestSearchIndex ne filtre jamais sur l'état on/off).

   INTERIM — replaced by pipeline-level canonical classification (see
    enforcement plan); delete this map when records ship
   category/subtype fields.

   Jugement par famille (affichage SEUL, la donnée ne bouge pas) :
   - legacy    → chests        (coffre-trésor hérité : prop skinné COFFRE)
   - barrel    → destroyable   (tonneaux : prop cassable — même vocabulaire
                                que les camps destroyable « explosive barrels »)
   - boxes     → destroyable   (caisses : prop cassable, même famille de
                                vocabulaire que les crates destroyable)
   - furniture → interactives  (mobilier — armoires/frigos/étagères : on
                                l'OUVRE/fouille, prop ambiant, jamais cassé)
   - corpse    → interactives  (cadavres : fouille par interaction — même
                                nature que les camps searchable « corpses »)
   - books     → interactives  (livres/papiers : prop ambiant consultable)
   - misc      → other         (divers : nature indéterminable depuis les
                                données — rangé honnêtement en « Autres ») */
const DECOR_BUCKET = {
  legacy: 'chests',
  barrel: 'destroyable', boxes: 'destroyable',
  furniture: 'interactives', corpse: 'interactives', books: 'interactives',
  misc: 'other',
};
const decorFamsOf = bucket =>
  DECOR_FAMILIES.filter(f => DECOR_BUCKET[f] === bucket && S.decor[f]);
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
   Tous/Aucun — est RETIRÉ avec le groupe Décor : les boutons Tous/Aucun de
   la liste des familles cascadent désormais aussi sur les sous-lignes
   espèce (setFamilyOn), un rebuild complet du groupe est donc de toute
   façon nécessaire — voir buildMonsterFamilyGroup.) */

/* ── L'arbre EST le bestiaire (#82 chunk (d), décision utilisateur) ──────
   Chaque ligne famille de la liste des familles (aplatie directement dans
   « Monstres & faune », voir buildMonsterFamilyGroup plus bas — le niveau
   « Par famille » séparé a été retiré, 2026-07-11) est un NŒUD DÉPLIABLE :
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
   n'appartient qu'aux chips des panneaux de droite) + méta honnête. */
function speciesRowLi(id, sp) {
  const st = S.monsp[id] || (S.monsp[id] = { on: false });
  const res = speciesPoints(id);
  const meta = res
    ? tr('speciesCampsPts', res.nCamps, res.nPts.toLocaleString(numberLocale()))
    : tr('speciesZeroCamps');
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
   rencontré en remontant, quel qu'en soit le nombre — deux aujourd'hui
   (le sous-groupe « Hostiles », IA finale 2026-07-11, puis le groupe
   « Monsters » lui-même, .side-sec ; l'ouverture programmatique déclenche
   bien l'événement toggle, donc subOpen/le localStorage des groupes restent
   synchrones). AUCUN mouvement caméra (le geste caméra reste goto/zone). */
function revealMonsterNode(kind, id) {
  const target = kind === 'species'
    ? document.querySelector(`#group-monsters-list li[data-species="${CSS.escape(id)}"] .species-row`)
    : document.querySelector(`#group-monsters-list li[data-fam="${CSS.escape(id)}"] .filter-row`);
  if (!target) return;
  for (let el = target.parentElement; el; el = el.parentElement) {
    if (el.tagName === 'DETAILS' && !el.open) el.open = true;
  }
  target.classList.add('node-flash');
  setTimeout(() => target.classList.remove('node-flash'), 1600);
  target.scrollIntoView({ block: 'nearest' });
}

/* ── Liste des familles de monstres (le cœur de l'arbre « Hostiles ») ─────
   IA FINALE (2026-07-11) : la liste — plate depuis le retrait du niveau
   « Par famille » le même jour — vit désormais DANS le sous-groupe
   « Hostiles » du groupe Monsters (buildGroupMonsters ci-dessous), juste
   sous la ligne kind « Camps de monstres » (bascule GROSSIÈRE conservée :
   elle seule couvre les ~25 k points de camp que les familles jointes ne
   recouvrent pas, design §4.4/§13.2 — un retrait perdrait de la
   couverture). La barre [Tous][Aucun] reste un séparateur NON repliable
   (libellé `monsterFamiliesTitle` en repère de section) — et cascade
   désormais familles + espèces (setFamilyOn, décision cascade).
   Chaque ligne famille reste : UNE ligne par famille avec ≥1 camp joint sur
   la carte ACTIVE (~20 sur Kwalat, jointure espèce→camps du résolveur
   unique js/pointsets.js monsterFamilies() — honnête : une famille sans
   camp joint n'a pas de ligne morte, design §4.2) + toutes les familles
   catalogue SANS camp ici (grisées « 0 camp », listées quand même — l'arbre
   est le bestiaire, chunk (d)). Total BRUT affiché (camps · points — ce
   qu'elle allumerait seule) : rat et ratmutant partagent les 10 mêmes camps
   et affichent chacun 4 045, assumé (données réelles, design §13.3) ; le
   dédoublonnage est un fait de RENDU (main.js compositeCampPoints, priorité
   espèce > famille > kind), jamais de comptage. Couleur par rang
   (familyHexByRank, ordre pts desc = ordre des lignes). La case d'une ligne
   famille est à la fois sa COUCHE (S.monfam, couleur famille) et un parent
   de cascade (cocher = toutes ses espèces aussi, setFamilyOn ; décochée
   avec ≥1 espèce cochée = état partiel, voir refreshParentChecks). Hash :
   `on=monfam.<famille>` (token post-alias, urlstate.js/router.js — un lien
   legacy sans tokens monsp.* restaure l'ancien rendu couleur-famille tel
   quel). Retourne null tant que species/monsters/camps ne sont pas chargés
   ou qu'aucune famille n'a de camp joint ici. GLOSSARY-PENDING : le nom
   affiché d'une famille est son token moteur prettifié (pretty(f.family) —
   « Boarmammoth », « Ratmutant »…), comme le bestiaire : AUCUNE table de
   localisation des familles n'existe dans les données expédiées ; à
   balayer quand l'extraction de glossaire (#86) livrera des libellés
   prouvés. */
function buildMonsterFamilyGroup() {
  const fams = monsterFamilies();               // familles AVEC camps joints ici (triées pts desc)
  const byFam = speciesByFamily();              // TOUTES les familles du catalogue global
  if (!fams.length && !byFam.size) return null;
  // Une famille avec ≥1 espèce cochée se déplie d'elle-même : la ligne cochée
  // doit être VISIBLE (hash restauré, clic de chip — décision utilisateur
  // « auto-expanding its family so the checked row is visible »).
  for (const [fam, list] of byFam) {
    if (list.some(({ id }) => S.monsp[id]?.on)) expandedFams.add(fam);
  }
  // Ordre : familles avec camps (rang = couleur, design §4.3) puis les
  // familles SANS camp ici (alphabétiques, grisées « 0 camp » — listées
  // quand même : l'arbre est le bestiaire, chunk (d)). État par famille :
  // créé à la première apparition — sauf s'il existe déjà (hash `monfam.*`
  // restauré AVANT l'arrivée des données différées, voir router.js).
  const withCamps = new Set(fams.map(f => f.family));
  const zeroFams = [...byFam.keys()].filter(f => !withCamps.has(f)).sort();
  const entries = [
    ...fams.map((f, i) => [f.family, null, f, familyHexByRank(i)]),
    ...zeroFams.map(f => [f, null, { nCamps: 0, nPts: 0 }, MONSTER_HEX]),
  ].map(([fam, , f, hex]) => {
    const st = S.monfam[fam] || (S.monfam[fam] = { on: false });
    return [fam, st, f, hex];
  });

  // UN SEUL <li>, contenant directement la <ul class="subfilter-list"> — plus
  // de <details class="decor-group">/<summary> intermédiaire (voir la doc
  // ci-dessus). `.family-list` en classe ADDITIONNELLE (IA finale) : la
  // liste vit désormais imbriquée DANS le sous-groupe « Hostiles » (lui-même
  // une .subfilter-list) — les consommateurs (harnais, CSS futur) ont besoin
  // d'un sélecteur qui la distingue des .subfilter-list de sous-groupe.
  const li = document.createElement('li');
  const sub = document.createElement('ul');
  sub.className = 'subfilter-list family-list';
  const head = document.createElement('li');
  head.className = 'subfilter-head';
  head.innerHTML = `<span class="subf-title">${esc(tr('monsterFamiliesTitle'))}</span>
    <span class="subf-actions">
      <button type="button" class="subf-btn" data-mode="all">${esc(tr('chestTypesAllBtn'))}</button>
      <button type="button" class="subf-btn" data-mode="none">${esc(tr('chestTypesNoneBtn'))}</button>
    </span>`;
  // [Tous]/[Aucun] : familles ET espèces (cascade, IA finale — cocher une
  // famille coche tous ses enfants, voir setFamilyOn). Rebuild complet du
  // groupe : les sous-lignes espèce dépliées doivent refléter la cascade.
  head.querySelector('[data-mode="all"]').addEventListener('click', () => {
    for (const [fam] of entries) setFamilyOn(fam, true);
    scheduleRedraw(); syncHash();
    buildGroupMonsters(); refreshParentChecks();
  });
  head.querySelector('[data-mode="none"]').addEventListener('click', () => {
    for (const [fam] of entries) setFamilyOn(fam, false);
    for (const id of Object.keys(S.monsp)) S.monsp[id].on = false;
    scheduleRedraw(); syncHash();
    buildGroupMonsters(); refreshParentChecks();
  });
  sub.appendChild(head);
  for (const [fam, st, f, hex] of entries) {
    const zero = !f.nPts;
    // CASCADE (IA finale) : la case famille coche/décoche aussi TOUTES ses
    // espèces (setFamilyOn) — rebuild du groupe pour que les sous-lignes
    // espèce dépliées reflètent le geste (syncHash/refreshParentChecks sont
    // déjà joués par l'écouteur générique de filterRow après ce callback).
    const row = filterRow('monfam:' + fam, pretty(fam), hex, f.nPts, 0, st.on, on => {
      setFamilyOn(fam, on);
      scheduleRedraw();
      buildGroupMonsters();
    }, 'filter-row-sub' + (zero ? ' fam-zero' : ''));
    // « N camps » entre le libellé et le compte de points (mock design §2 :
    // « Rat   10 camps · 4 045 ») — libellé honnête : ce sont les points des
    // CAMPS où la famille apparaît, jamais « positions de X » (design §13.1).
    // Style inline plutôt qu'une classe : style.css est en édition
    // concurrente par une autre mission (multi-rareté) et la classe partagée
    // max-height (#85) n'existe pas encore — à migrer quand elle livre.
    row.querySelector('.flabel').insertAdjacentHTML('afterend',
      `<span class="fam-camps" style="color:var(--muted);font-size:.68rem;white-space:nowrap;margin-right:5px">${esc(tr('familyCampsN', f.nCamps))}</span>`);
    // Nœud dépliable (chunk (d), « l'arbre EST le bestiaire ») : chevron +
    // sous-lignes espèce paresseuses.
    sub.appendChild(attachFamilyNode(row, fam));
  }
  li.appendChild(sub);
  return li;
}

/* ── Arbre de couches : IA FINALE du panneau gauche (2026-07-11) ──────────
   4 groupes fixes (COORDINATION.md §IA FINALE DU PANNEAU GAUCHE, verbatim
   utilisateur — SUPERSEDE les 6 groupes du chunk (a)) :
     1. World         — Zones · NPCs · POI (ligne plate, sous-familles
                        d'icônes au step 2) · Workshops · Shrines ·
                        Soulkeepers · Gardes (libellé honnête) · Others
     2. Monsters      — MIROIR des 3 kinds moteur, data-natif (décision
                        utilisateur, redirect 2026-07-11 — aucun axe
                        inventé) : sous-groupe Monsters (ligne « Camps de
                        monstres » + l'arbre familles→espèces existant) ·
                        sous-groupe Creeps (familles jointes rat/ratmutant
                        — présence DOUBLE assumée avec l'arbre, le moteur
                        les spawne sous les 2 kinds — + espèces wild
                        turkey/rabbit/fox/squirrel/porcupine via
                        camp_details, + ligne « Spawns non identifiés » =
                        les pools creeps-<région> sans espèce) · sous-groupe
                        Wildlife (leaf_dragon + pools non identifiés)
     3. Harvesting    — Herbalism · Logging · Mining (inchangé)
     4. Interactables — Chests · Destroyable · Interactives · Other
                        (le groupe Décor y est dissous, voir DECOR_BUCKET)
   Groupes RETIRÉS : « Lieux & personnages » (lignes → World), « Quêtes »
   (qao → Interactables > Other, le découpage par type reste à venir),
   « Monde » (lignes → World), « Décor » (dissous). MÊMES lignes
   (filterRow/hiddenBadge), MÊME hash `on=`/`camp.*`/`decor.*`/`monfam.*`/
   `monsp.*` (urlstate.js lit l'ÉTAT, jamais une position DOM) — zéro
   nouvelle couche, zéro nouveau token : les lignes ne font que déménager.

   INTERIM — replaced by pipeline-level canonical classification (see
    enforcement plan); delete this map when records ship
   category/subtype fields. (Rangement kind→groupe/sous-groupe d'AFFICHAGE,
   même dette que DECOR_BUCKET ci-dessus.) */
const KIND_PLACEMENT = {
  world: ['shrines', 'soulkeeper', 'guards'],   // + guards : libellé honnête, voir buildGroupWorld
  worldOthers: ['other'],                       // sous-groupe « Others » (familles d'icônes POI au step 2)
  monstersKind: ['monsters'],                   // sous-groupe Monsters (kind moteur)
  kindSubGroups: ['creeps', 'wildlife'],        // sous-groupes miroir : espèces jointes + « Spawns non identifiés »
  harvest: ['herbalism', 'logging', 'mining'],
  interDestroyable: ['destroyable'],
  interInteractives: ['reactive', 'searchable'],
};

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

/* ── CASCADE (décision utilisateur : « quand je coche une category parent ça
   coche tous les enfants ») ─────────────────────────────────────────────
   Chaque parent (groupe side-sec, sous-groupe) porte une vraie case à
   cocher : cocher = TOUTES les feuilles du sous-arbre passent on ; décocher
   = toutes off ; certaines seulement = état partiel natif (indeterminate).
   Le parent n'est PAS une couche : il n'a aucun état propre (jamais
   sérialisé dans le hash — les tokens existants suffisent, aucun nouveau
   namespace), son affichage est DÉRIVÉ des feuilles à chaque
   refreshParentChecks(). Seule exception : la ligne FAMILLE, qui est à la
   fois une couche (S.monfam, couleur famille du compositeur) et un parent
   (cascade sur ses espèces via setFamilyOn) — son état partiel = famille
   décochée mais ≥1 espèce cochée.
   Une « feuille » = {get, set} sur l'état réel (CATS[x].on / S.camps[k].on /
   S.decor[f].on / S.zonesOn / S.monfam[f].on / S.monsp[id].on) ; les
   feuilles absentes de la carte active ne sont simplement pas listées
   (jamais un parent bloqué « ni tout ni rien » par une couche impossible). */
const catLeaf = key => ({ get: () => !!CATS[key].on, set: on => { CATS[key].on = on; } });
const campLeaf = kind => ({ get: () => !!S.camps[kind]?.on, set: on => { if (S.camps[kind]) S.camps[kind].on = on; } });
const decorLeaf = fam => ({ get: () => !!S.decor[fam]?.on, set: on => { if (S.decor[fam]) S.decor[fam].on = on; } });
// famLeaf.set CASCADE (setFamilyOn) : cocher une famille — par sa ligne OU
// par un parent — coche toujours aussi ses espèces, une seule sémantique.
const famLeaf = fam => ({ get: () => !!S.monfam[fam]?.on, set: on => setFamilyOn(fam, on) });
const spLeaf = id => ({ get: () => !!S.monsp[id]?.on, set: on => { (S.monsp[id] || (S.monsp[id] = { on: false })).on = on; } });
const campLeavesOf = kinds => kinds.filter(k => S.camps[k]).map(campLeaf);
const decorLeavesOfBucket = bucket => decorFamsOf(bucket).map(decorLeaf);

function worldLeaves() {
  const l = [catLeaf('npc'), catLeaf('poi'), catLeaf('workshop')];
  if (S.zonesGeo.length) l.push({ get: () => S.zonesOn, set: on => toggleZones(on) });
  l.push(...campLeavesOf([...KIND_PLACEMENT.world, ...KIND_PLACEMENT.worldOthers]));
  return l;
}
/* Sous-groupe Monsters (kind) = la ligne kind « Camps de monstres » + TOUT
   l'arbre familles→espèces (catalogue global — cocher le parent coche
   récursivement les familles ET leurs espèces, décision cascade ; les
   0-camp ne dessinent rien, leur état reste honnête). */
function monstersKindLeaves() {
  const l = campLeavesOf(KIND_PLACEMENT.monstersKind);
  for (const [fam, list] of speciesByFamily()) {
    l.push(famLeaf(fam));
    for (const { id } of list) l.push(spLeaf(id));
  }
  return l;
}
/* Familles (arbre) jointes à ≥1 camp d'un kind donné ici — lignes famille
   MIROIR du sous-groupe Creeps (rat/ratmutant : le moteur les spawne sous
   monsters ET creeps, présence double assumée — même état S.monfam, même
   teinte de rang que dans l'arbre, jamais une couche dupliquée). */
function famsOfKind(kind) {
  return monsterFamilies()
    .map((f, i) => ({ family: f.family, nCamps: f.nCamps, nPts: f.nPts, campKeys: f.campKeys, hex: familyHexByRank(i) }))
    .filter(f => [...f.campKeys].some(k => campGroupByKey(k)?.kind === kind));
}
/* Sous-groupe kind miroir (Creeps/Wildlife) : familles jointes + espèces
   wild (camp_details) + la ligne kind « Spawns non identifiés ». */
function kindSubLeaves(kind) {
  return [
    ...famsOfKind(kind).map(f => famLeaf(f.family)),
    ...wildSpeciesOfKind(kind).map(w => spLeaf(w.id)),
    ...campLeavesOf([kind]),
  ];
}
const harvestLeaves = () => campLeavesOf(KIND_PLACEMENT.harvest);
const chestsLeaves = () => [catLeaf('searchable_chest'), catLeaf('camp_chest'), ...decorLeavesOfBucket('chests')];
const destroyableLeaves = () => [...campLeavesOf(KIND_PLACEMENT.interDestroyable), ...decorLeavesOfBucket('destroyable')];
const interactivesLeaves = () => [...campLeavesOf(KIND_PLACEMENT.interInteractives), ...decorLeavesOfBucket('interactives')];
const interOtherLeaves = () => [catLeaf('qao'), ...decorLeavesOfBucket('other')];
const interactLeaves = () => [...chestsLeaves(), ...destroyableLeaves(), ...interactivesLeaves(), ...interOtherLeaves()];
/* Feuilles par groupe STATIQUE (clé = data-sec d'index.html) — consommées
   par le câblage unique des .grp-check tout en bas de ce module. */
const GROUP_LEAVES = {
  'group-world': worldLeaves,
  'group-monsters': () => [
    ...monstersKindLeaves(),
    ...KIND_PLACEMENT.kindSubGroups.flatMap(kindSubLeaves),
  ],
  'group-harvest': harvestLeaves,
  'group-containers': interactLeaves,
};

/* Registres des cases parent : statiques (groupes, câblés une fois au
   chargement du module) + dynamiques (sous-groupes, reconstruits à chaque
   rebuild de l'arbre). */
const groupChecks = [];
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
   famille (espèces cochées sous famille décochée). */
function refreshParentChecks() {
  for (const { input, leavesFn } of [...groupChecks, ...subChecks]) {
    const vals = leavesFn().map(l => l.get());
    const all = vals.length > 0 && vals.every(Boolean);
    input.checked = all;
    input.indeterminate = !all && vals.some(Boolean);
    input.disabled = !vals.length;
  }
  const byFam = speciesByFamily();
  for (const li of document.querySelectorAll('#group-monsters-list li[data-fam]')) {
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
  // familles + sous-groupe Creeps/Wildlife — présence double assumée,
  // miroir des kinds moteur) : resynchroniser toutes les copies depuis
  // S.monsp (l'écouteur d'une case ne met à jour que sa propre ligne).
  for (const li of document.querySelectorAll('#group-monsters-list li[data-species]')) {
    const row = li.querySelector('.species-row');
    if (!row) continue;
    const on = !!S.monsp[li.dataset.species]?.on;
    row.classList.toggle('off', !on);
    const input = row.querySelector('input');
    if (input) input.checked = on;
  }
}

/* État d'ouverture des sous-groupes (session seule, même discipline que
   expandedFams — le localStorage ne persiste que les groupes side-sec). */
const subOpen = new Set();
/* Sous-groupe repliable générique (Monsters/Creeps/Wildlife/Chests/… —
   même vocabulaire visuel que l'ex-groupe Décor, classe .decor-group
   réutilisée telle quelle) + case de cascade dans son <summary>. `count`
   null = pas de compteur agrégé (les sous-groupes Monsters/Creeps/Wildlife
   RECOUVRENT leurs propres lignes — rat allume aussi des camps monsters
   depuis Creeps — une somme mentirait ; les buckets Interactables sont
   disjoints, eux affichent leur somme honnête). */
function buildSubGroup(key, label, hex, leavesFn, count = null, hidden = 0) {
  const li = document.createElement('li');
  const det = document.createElement('details');
  det.className = 'decor-group';
  det.dataset.subgroup = key;
  if (subOpen.has(key)) det.open = true;
  det.addEventListener('toggle', () => { det.open ? subOpen.add(key) : subOpen.delete(key); });
  const summary = document.createElement('summary');
  summary.innerHTML = `<input type="checkbox" class="subgrp-check" aria-label="${esc(tr('groupToggleAria'))}">
    <span class="swatch" style="background:${hex}"></span>
    <span class="flabel">${esc(label)}</span>
    ${count != null ? `<span class="fcount">${count.toLocaleString(numberLocale())}</span>` : ''}${hiddenBadge(hidden)}`;
  const input = summary.querySelector('input');
  wireParentCheck(input, leavesFn);
  subChecks.push({ input, leavesFn });
  det.appendChild(summary);
  const ul = document.createElement('ul');
  ul.className = 'subfilter-list';
  det.appendChild(ul);
  li.appendChild(det);
  return { li, ul };
}

/* ── Groupe « World » : Zones · NPCs · POI (plate, step 2 = familles
   d'icônes) · Workshops · Shrines · Soulkeepers · Gardes · Others.
   npc/poi/workshop/zones : critiques (premier rendu) ; les lignes camp
   (shrines/soulkeeper/guards/other) attendent camps.bin (différé).
   Gardes : libellé honnête « Gardes (unité non identifiée) » — 2 camps/12
   points sans AUCUN lien espèce/PNJ/butin/niveau dans les données (voir
    interactives_taxonomy_INVESTIGATION.md §5) — jamais un pair
   de camp de monstre qu'il n'est pas. « Others » : sous-groupe destiné aux
   familles d'icônes POI (step 2, regen en cours) — il porte déjà la ligne
   camp:other (littéralement les camps « autres »), plutôt qu'une coquille
   vide ou une 2ᵉ ligne « Autres » à plat à côté du futur sous-groupe. */
function buildGroupWorld() {
  const ul = $('#group-world-list');
  ul.innerHTML = '';
  if (S.zonesGeo.length) {
    // Pas de notion de "sans position" pour une région (zones_geo est déjà
    // 100% ce qui est dessiné) : hidden fixé à 0, jamais de badge ici.
    ul.appendChild(filterRow('zones', tr('zonesLabel'), ZONE_HEX, S.zonesGeo.length, 0, S.zonesOn, toggleZones));
  }
  ul.appendChild(catRow('npc'));
  ul.appendChild(catRow('poi'));
  ul.appendChild(catRow('workshop'));
  if (!deferredReady) { ul.appendChild(loadingHintLi()); return; }
  for (const kind of KIND_PLACEMENT.world) {
    const li = campRow(kind, kind === 'guards' ? tr('guardsRowLabel') : null);
    if (li) ul.appendChild(li);
  }
  const otherRow = campRow('other', null, 'filter-row-sub');
  if (otherRow) {
    const st = S.camps.other;
    const grp = buildSubGroup('world-others', tr('subWorldOthers'), CAMP_COLORS.other,
      () => campLeavesOf(KIND_PLACEMENT.worldOthers), st.points.length);
    grp.ul.appendChild(otherRow);
    ul.appendChild(grp.li);
  }
}
/* ── Groupe « Monsters » : MIROIR des 3 kinds moteur (redirect utilisateur
   2026-07-11 — data-natif, aucun axe Hostile/Neutre inventé).
   1. Sous-groupe MONSTERS (kind) : la ligne kind « Camps de monstres »
      (bascule GROSSIÈRE : elle seule couvre les camps monsters non joints
      aux familles, design §4.4/§13.2 — gardée comme PREMIÈRE LIGNE du
      sous-groupe plutôt qu'en bascule de son <summary> : la case du summary
      reste un pur maître de cascade, uniforme avec tous les autres parents,
      et la couverture kind garde sa ligne dédiée, comptée et décochable
      indépendamment) + l'arbre familles→espèces existant
      (buildMonsterFamilyGroup, inchangé).
   2. Sous-groupe CREEPS : lignes famille jointes (rat/ratmutant — le moteur
      les spawne sous monsters ET creeps, présence double ASSUMÉE, même état
      S.monfam/mêmes teintes que l'arbre, jamais une dédup fabriquée) +
      lignes espèce WILD (turkey/rabbit/fox/squirrel/porcupine — liaison
      camp_details, resolver js/pointsets.js wildSpeciesOfKind) + la ligne
      « Spawns non identifiés » (les pools creeps-<région> sans espèce —
      token camp.creeps conservé, compte honnête kindRestPoints, la couche
      ne dessine QUE ces camps, voir KIND_REST_ONLY).
   3. Sous-groupe WILDLIFE : même modèle (leaf_dragon + pools non
      identifiés — honnête : c'est TOUT ce que la donnée lie aujourd'hui).
   Auto-ouverture d'un sous-groupe quand quelque chose y est coché (une
   ligne cochée doit rester visible — hash restauré, clic de chip ;
   contrepartie assumée : replié-avec-coche se rouvre au prochain rebuild). */
function buildGroupMonsters() {
  const ul = $('#group-monsters-list');
  ul.innerHTML = '';
  if (!deferredReady) { ul.appendChild(loadingHintLi()); return; }
  if (monstersKindLeaves().some(l => l.get())) subOpen.add('monsters-kind');
  const mGrp = buildSubGroup('monsters-kind', campKindLabel('monsters'), CAMP_COLORS.monsters, monstersKindLeaves);
  const mRow = campRow('monsters', tr('monsterCampsRow'), 'filter-row-sub');
  if (mRow) mGrp.ul.appendChild(mRow);
  const famLi = buildMonsterFamilyGroup();
  if (famLi) mGrp.ul.appendChild(famLi);
  if (mGrp.ul.children.length) ul.appendChild(mGrp.li);
  for (const kind of KIND_PLACEMENT.kindSubGroups) appendKindSubGroup(ul, kind);
}
/* Sous-groupe kind miroir (Creeps/Wildlife — voir la doc du groupe). */
function appendKindSubGroup(ul, kind) {
  const st = S.camps[kind];
  const fams = famsOfKind(kind);
  const wild = wildSpeciesOfKind(kind)
    .slice()
    .sort((a, b) => (speciesPoints(b.id)?.nPts || 0) - (speciesPoints(a.id)?.nPts || 0) || a.name.localeCompare(b.name));
  if (!st && !fams.length && !wild.length) return;
  const leavesFn = () => kindSubLeaves(kind);
  if (leavesFn().some(l => l.get())) subOpen.add('monsters-' + kind);
  const grp = buildSubGroup('monsters-' + kind, campKindLabel(kind), CAMP_COLORS[kind] || '#888', leavesFn);
  for (const f of fams) {
    // Ligne famille MIROIR : même case/état que la ligne de l'arbre (une
    // seule couche S.monfam), cascade identique (setFamilyOn), même méta
    // « N camps » honnête — sans chevron d'espèces (le détail par espèce
    // vit dans l'arbre du sous-groupe Monsters, jamais dupliqué).
    const stF = S.monfam[f.family] || (S.monfam[f.family] = { on: false });
    const row = filterRow('monfam:' + f.family, pretty(f.family), f.hex, f.nPts, 0, stF.on, on => {
      setFamilyOn(f.family, on);
      scheduleRedraw();
      buildGroupMonsters();
    }, 'filter-row-sub');
    row.dataset.fam = f.family;   // resynchronisée par refreshParentChecks (copies multiples)
    row.querySelector('.flabel').insertAdjacentHTML('afterend',
      `<span class="fam-camps" style="color:var(--muted);font-size:.68rem;white-space:nowrap;margin-right:5px">${esc(tr('familyCampsN', f.nCamps))}</span>`);
    grp.ul.appendChild(row);
  }
  // Espèces WILD : mêmes lignes que les sous-lignes espèce de l'arbre
  // (speciesRowLi — case S.monsp, hash monsp.<token moteur>, méta
  // « N camps · M pts » via le resolver étendu au canal wild). Pas de fiche
  // monstre pour ces espèces (aucun enregistrement monsters.bin) : le nom
  // reste non cliquable, honnête (speciesRep → null).
  for (const w of wild) grp.ul.appendChild(speciesRowLi(w.id, { name: w.name }));
  // « Spawns non identifiés » : les pools du kind sans AUCUNE espèce jointe
  // (creeps-<région>, peaceful-animals-*…) — compte = exactement ce que la
  // couche kind dessine désormais (KIND_REST_ONLY, main.js).
  if (st) {
    const rest = kindRestPoints(kind);
    if (rest.nPts) {
      grp.ul.appendChild(filterRow('camp:' + kind, tr('kindRestRow'), CAMP_COLORS[kind] || '#888',
        rest.nPts, 0, st.on, on => { st.on = on; scheduleRedraw(); }, 'filter-row-sub'));
    }
  }
  if (grp.ul.children.length) ul.appendChild(grp.li);
}
/* ── Groupe « Harvesting » : les 3 métiers de camp:<kind>, inchangé. */
function buildGroupHarvest() {
  const ul = $('#group-harvest-list');
  ul.innerHTML = '';
  if (!deferredReady) { ul.appendChild(loadingHintLi()); return; }
  for (const kind of KIND_PLACEMENT.harvest) { const li = campRow(kind); if (li) ul.appendChild(li); }
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
   Interactives · Other), le groupe Décor y est DISSOUS (DECOR_BUCKET,
   affichage seul). Libellés désambiguïsés — plus jamais quatre choses
   nommées « fouillable » : « Coffres fouillables » (searchable_chest, la
   vraie couche coffre à recette) garde son terme ; le kind camp
   `searchable` devient « Points de fouille (camps) » (searchSpotsRow,
   GLOSSARY-PENDING) ; les kinds destroyable/reactive prennent un suffixe
   « (camps) » (spawns dynamiques serveur) pour ne pas se confondre avec
   les props PLACÉS (décor) rangés dans le même bucket. Défauts inchangés :
   les 2 couches coffres ON ; destroyable/reactive/searchable/décor/qao OFF
   (palier bruit — verdict investigation §6.2, 0 table de butin canonique). */
function buildGroupContainers() {
  const ul = $('#group-containers-list');
  ul.innerHTML = '';
  const BUCKETS = [
    ['inter-chests', 'subChests', CATS.searchable_chest.hex, chestsLeaves,
      ['searchable_chest', 'camp_chest'], 'chests', [],
      u => {
        u.appendChild(catRow('searchable_chest', 'filter-row-sub'));
        u.appendChild(catRow('camp_chest', 'filter-row-sub'));
        for (const f of decorFamsOf('chests')) { const li = decorRow(f); if (li) u.appendChild(li); }
      }],
    ['inter-destroyable', 'subDestroyable', CAMP_COLORS.destroyable, destroyableLeaves,
      [], 'destroyable', KIND_PLACEMENT.interDestroyable,
      u => {
        const c = campRow('destroyable', tr('destroyableCampsRow'), 'filter-row-sub');
        if (c) u.appendChild(c);
        for (const f of decorFamsOf('destroyable')) { const li = decorRow(f); if (li) u.appendChild(li); }
      }],
    ['inter-interactives', 'subInteractives', CAMP_COLORS.reactive, interactivesLeaves,
      [], 'interactives', KIND_PLACEMENT.interInteractives,
      u => {
        const r = campRow('reactive', tr('reactiveCampsRow'), 'filter-row-sub');
        if (r) u.appendChild(r);
        const s = campRow('searchable', tr('searchSpotsRow'), 'filter-row-sub');
        if (s) u.appendChild(s);
        for (const f of decorFamsOf('interactives')) { const li = decorRow(f); if (li) u.appendChild(li); }
      }],
    ['inter-other', 'subOther', CAMP_COLORS.other, interOtherLeaves,
      ['qao'], 'other', [],
      u => {
        u.appendChild(catRow('qao', 'filter-row-sub'));
        for (const f of decorFamsOf('other')) { const li = decorRow(f); if (li) u.appendChild(li); }
      }],
  ];
  for (const [key, labelKey, hex, leavesFn, cats, decorBucket, kinds, fill] of BUCKETS) {
    const { count, hidden } = bucketStats(cats, decorFamsOf(decorBucket), deferredReady ? kinds : []);
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
   faune (buildMonsterFamilyGroup ci-dessus) couvre désormais exactement le
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

/* Cases de CASCADE des 4 groupes statiques (.grp-check dans chaque
   <summary>, voir index.html) — câblées UNE seule fois au chargement du
   module : contrairement aux sous-groupes (reconstruits par buildFilters),
   les summaries des groupes survivent à tous les rebuilds. Leur état
   coché/partiel est ensuite republié par refreshParentChecks() à chaque
   rebuild/changement de feuille. */
$$('#filters .side-sec').forEach(sec => {
  const input = sec.querySelector(':scope > summary > .grp-check');
  const leavesFn = GROUP_LEAVES[sec.dataset.sec];
  if (!input || !leavesFn) return;
  wireParentCheck(input, leavesFn);
  groupChecks.push({ input, leavesFn });
});

$('#panel-toggle').addEventListener('click', () => {
  const p = $('#panel');
  const hidden = p.classList.toggle('hidden');
  $('#panel-toggle').classList.toggle('solo', hidden);
  $('#panel-toggle').setAttribute('aria-expanded', String(!hidden));
  setTimeout(() => map.invalidateSize(), 280);
});

export { buildFilters, renderTracked, toggleTrack, toggleDone, revealMonsterNode };
