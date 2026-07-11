/* Kwalat — panneau latéral : filtres de couches, liste des camps, suivis
   (tracked/fait) et bouton d'affichage du panneau. */
import { S, LS, save } from './state.js';
import {
  CATS, CAMP_COLORS, ZONE_HEX, MONSTER_HEX, catLabel, campKindLabel, familyKey, familyHexByRank,
  chestDisplayName, chestHex, mapName, DECOR_FAMILIES, DECOR_HEX, decorFamilyLabel, prettyRegion, ecAttr,
} from './config.js';
import { $, $$, esc, pretty, fold } from './utils.js';
import { tr, numberLocale } from './i18n/index.js';
import { map, layers, scheduleRedraw, refreshIconLayer, toggleZones } from './mapview.js';
import { syncHash, pushFocusState } from './urlstate.js';
import { goTo } from './pins.js';
import { whenDeferred, deferredReady } from './data.js';
import { isHiddenTest, positionCounts } from './devcontent.js';
import { monsterFamilies } from './pointsets.js';

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

/* Groupe « Décor » (S.decor : famille -> {on, count}, voir data.js
   buildDecorGroups) — l'ancien "Coffres" catch-all conflait camp_chest/
   legacy_chest/décor sous un seul filtre ; ce sont désormais les seuls
   contenants qui restent ici, TOUS décochés par défaut (voir
   DATA_CONTRACT.md §1/§3.1 — recommandation explicite du propriétaire :
   l'ancienne couche unique "Coffres" était "le bordel"), mais toujours
   pleinement recherchables (search.js buildChestSearchIndex ne filtre
   jamais sur l'état on/off). <details> repliable (fermée par défaut, même
   discipline que .bst-family) : pas un "master switch" — le on/off réel vit
   sur CHAQUE sous-famille, jamais un simple bouton qui masquerait ce que les
   sous-lignes disent vraiment. Rejouée à chaque bascule Tous/Aucun/famille
   (jamais reconstruite par buildFilters() en entier), même discipline que
   l'ancien buildChestTypeSubfilter. Retourne null si la carte active n'a
   aucun contenant décor (S.decor vide). */
function buildDecorGroup() {
  const entries = DECOR_FAMILIES.map(f => [f, S.decor[f]]).filter(([, st]) => st);
  if (!entries.length) return null;
  const totalCount = entries.reduce((n, [, st]) => n + st.count, 0);
  // Même honnêteté que catStats/hiddenBadge ci-dessus, appliquée au total du
  // groupe repliable (chaque famille porte déjà son propre st.hidden, voir
  // data.js buildDecorGroups) : un décor réel sans position connue compte
  // ici aussi, jamais silencieusement absorbé dans le seul total replié.
  const totalHidden = entries.reduce((n, [, st]) => n + (st.hidden || 0), 0);

  const li = document.createElement('li');
  const det = document.createElement('details');
  det.className = 'decor-group';
  const summary = document.createElement('summary');
  summary.innerHTML = `<span class="swatch" style="background:${DECOR_HEX.misc}"></span>
    <span class="flabel">${esc(tr('decorGroupLabel'))}</span>
    <span class="fcount">${totalCount.toLocaleString(numberLocale())}</span>${hiddenBadge(totalHidden)}`;
  det.appendChild(summary);

  const sub = document.createElement('ul');
  sub.className = 'subfilter-list';
  const head = document.createElement('li');
  head.className = 'subfilter-head';
  head.innerHTML = `<span class="subf-title">${esc(tr('decorFamiliesTitle'))}</span>
    <span class="subf-actions">
      <button type="button" class="subf-btn" data-mode="all">${esc(tr('chestTypesAllBtn'))}</button>
      <button type="button" class="subf-btn" data-mode="none">${esc(tr('chestTypesNoneBtn'))}</button>
    </span>`;
  head.querySelector('[data-mode="all"]').addEventListener('click', () => {
    for (const [, st] of entries) st.on = true;
    scheduleRedraw(); syncHash(); refreshDecorRows(sub, entries);
  });
  head.querySelector('[data-mode="none"]').addEventListener('click', () => {
    for (const [, st] of entries) st.on = false;
    scheduleRedraw(); syncHash(); refreshDecorRows(sub, entries);
  });
  sub.appendChild(head);
  for (const [fam, st] of entries) {
    sub.appendChild(filterRow('decor:' + fam, decorFamilyLabel(fam), DECOR_HEX[fam], st.count, st.hidden, st.on, on => {
      st.on = on;
      scheduleRedraw();
    }, 'filter-row-sub'));
  }
  det.appendChild(sub);
  li.appendChild(det);
  return li;
}
/* Rafraîchit juste les cases à cocher des lignes famille après un
   Tous/Aucun (évite de reconstruire tout le groupe, perdant l'état
   open/fermé du <details>). Partagé tel quel par le sous-groupe « Par
   famille » (buildMonsterFamilyGroup ci-dessous) — même forme d'entries
   [clé, {on}]. */
function refreshDecorRows(sub, entries) {
  const rows = sub.querySelectorAll('.filter-row-sub');
  entries.forEach(([, st], i) => {
    const row = rows[i];
    if (!row) return;
    row.classList.toggle('off', !st.on);
    const input = row.querySelector('input');
    if (input) input.checked = st.on;
  });
}

/* ── Sous-groupe « Par famille » (#82 chunk (b), design §4) ──────────────
   Gabarit exact de buildDecorGroup ci-dessus (<details> + subfilter-list +
   tête [Tous][Aucun] + lignes filter-row-sub) appliqué aux familles de
   monstres : UNE ligne par famille avec ≥1 camp joint sur la carte ACTIVE
   (~20 sur Kwalat, jointure espèce→camps du résolveur unique js/pointsets.js
   monsterFamilies() — honnête : une famille sans camp joint n'a pas de
   ligne morte, design §4.2). Chaque ligne affiche son total BRUT (camps ·
   points — ce qu'elle allumerait seule) : rat et ratmutant partagent les 10
   mêmes camps et affichent chacun 4 045, assumé (données réelles, design
   §13.3) ; le dédoublonnage est un fait de RENDU (main.js
   compositeCampPoints, priorité épinglé > famille > kind), jamais de
   comptage. Couleur par rang (familyHexByRank, ordre pts desc = ordre des
   lignes). PAS de case maîtresse (discipline Décor : le on/off vit sur
   chaque sous-ligne). Hash : `on=monfam.<famille>` (token post-alias,
   urlstate.js/router.js). Retourne null tant que species/monsters/camps ne
   sont pas chargés ou qu'aucune famille n'a de camp joint ici.
   GLOSSARY-PENDING : le nom affiché d'une famille est son token moteur
   prettifié (pretty(f.family) — « Boarmammoth », « Ratmutant »…), comme le
   bestiaire : AUCUNE table de localisation des familles n'existe dans les
   données expédiées (vérifié — le bestiaire affiche déjà ce même token brut
   dans les 5 langues) ; à balayer quand l'extraction de glossaire (#86)
   livrera des libellés prouvés. */
function buildMonsterFamilyGroup() {
  const fams = monsterFamilies();
  if (!fams.length) return null;
  // État par famille : créé à la première apparition — sauf s'il existe déjà
  // (hash `monfam.*` restauré AVANT l'arrivée des données différées, voir
  // router.js applyLocationState : l'état précède la ligne, jamais écrasé).
  const entries = fams.map((f, i) => {
    const st = S.monfam[f.family] || (S.monfam[f.family] = { on: false });
    return [f.family, st, f, familyHexByRank(i)];
  });

  const li = document.createElement('li');
  const det = document.createElement('details');
  det.className = 'decor-group';
  const summary = document.createElement('summary');
  summary.innerHTML = `<span class="swatch" style="background:${MONSTER_HEX}"></span>
    <span class="flabel">${esc(tr('monsterFamiliesTitle'))}</span>
    <span class="fcount">${fams.length.toLocaleString(numberLocale())}</span>`;
  det.appendChild(summary);

  const sub = document.createElement('ul');
  sub.className = 'subfilter-list';
  const head = document.createElement('li');
  head.className = 'subfilter-head';
  head.innerHTML = `<span class="subf-title">${esc(tr('monsterFamiliesTitle'))}</span>
    <span class="subf-actions">
      <button type="button" class="subf-btn" data-mode="all">${esc(tr('chestTypesAllBtn'))}</button>
      <button type="button" class="subf-btn" data-mode="none">${esc(tr('chestTypesNoneBtn'))}</button>
    </span>`;
  const refresh = () => refreshDecorRows(sub, entries);
  head.querySelector('[data-mode="all"]').addEventListener('click', () => {
    for (const [, st] of entries) st.on = true;
    scheduleRedraw(); syncHash(); refresh();
  });
  head.querySelector('[data-mode="none"]').addEventListener('click', () => {
    for (const [, st] of entries) st.on = false;
    scheduleRedraw(); syncHash(); refresh();
  });
  sub.appendChild(head);
  for (const [fam, st, f, hex] of entries) {
    const row = filterRow('monfam:' + fam, pretty(fam), hex, f.nPts, 0, st.on, on => {
      st.on = on;
      scheduleRedraw();
    }, 'filter-row-sub');
    // « N camps » entre le libellé et le compte de points (mock design §2 :
    // « Rat   10 camps · 4 045 ») — libellé honnête : ce sont les points des
    // CAMPS où la famille apparaît, jamais « positions de X » (design §13.1).
    // Style inline plutôt qu'une classe : style.css est en édition
    // concurrente par une autre mission (multi-rareté) et la classe partagée
    // max-height (#85) n'existe pas encore — à migrer quand elle livre.
    row.querySelector('.flabel').insertAdjacentHTML('afterend',
      `<span class="fam-camps" style="color:var(--muted);font-size:.68rem;white-space:nowrap;margin-right:5px">${esc(tr('familyCampsN', f.nCamps))}</span>`);
    sub.appendChild(row);
  }
  det.appendChild(sub);
  li.appendChild(det);
  return li;
}

/* ── Arbre de couches (#82 chunk (a) — refacto de PRÉSENTATION seulement) ──
   Les anciens conteneurs #filter-list (7 CATS + Zones + groupe Décor) et
   #camp-list (14 kinds de camp à plat) fusionnent en 6 groupes fixes
   side-sec (voir index.html +  unified_layers_DESIGN.md §2/§12(a)) :
   MÊMES lignes (filterRow/hiddenBadge/buildDecorGroup réutilisés tels
   quels), MÊME hash `on=`/`camp.*`/`decor.*` (urlstate.js lit CATS/S.camps/
   S.decor/S.zonesOn directement -- jamais une position DOM) -- zéro
   nouvelle couche, zéro nouveau point-set. L'ordre des kinds par groupe est
   FIXE (celui du mock du design, pas un tri par volume) ; un kind absent de
   la carte active n'affiche simplement pas sa ligne -- même garde que
   l'ancien buildCampFilters, qui n'itérait déjà que sur Object.entries
   (S.camps). Le sous-groupe « Par famille » (Monstres & faune) est livré
   par le chunk (b) (buildMonsterFamilyGroup, résolveur js/pointsets.js) ;
   le découpage qao par type (Quêtes) reste hors scope (chunk (c)). */
const CAMP_KIND_GROUPS = {
  monsters: ['monsters', 'creeps', 'wildlife'],
  harvest: ['herbalism', 'logging', 'mining'],
  containers: ['destroyable', 'searchable', 'reactive'],
  quests: ['quest'],
  world: ['shrines', 'soulkeeper', 'guards', 'other'],
};

/* Ligne de filtre CATS (npc/poi/quest/qao/workshop/searchable_chest/
   camp_chest) -- même corps que l'ancienne boucle Object.entries(CATS) de
   buildFilters(), extrait pour être appelable PAR CLÉ depuis chaque groupe. */
function catRow(key) {
  const c = CATS[key];
  const { shown, hidden } = catStats(key);
  return filterRow(key, catLabel(key), c.hex, shown, hidden, c.on, on => {
    c.on = on;
    if (c.dense) scheduleRedraw();
    else on ? map.addLayer(layers[key]) : map.removeLayer(layers[key]);
  });
}
/* Ligne de filtre camp:<kind> -- même corps que l'ancien buildCampFilters,
   par kind (null si ce kind n'existe pas sur la carte active : S.camps ne
   contient QUE les kinds présents, voir data.js loadDeferred/loadMapData). */
function campRow(kind) {
  const st = S.camps[kind];
  if (!st) return null;
  // st.points vient directement de g.pts (data.js/multimap.js loadMapData) :
  // chaque entrée a TOUJOURS x/z, jamais de gap position -- hidden fixé à 0.
  return filterRow('camp:' + kind, campKindLabel(kind), CAMP_COLORS[kind] || '#888',
    st.points.length, 0, st.on, on => { st.on = on; scheduleRedraw(); });
}
function appendCampRows(ul, kinds) {
  for (const kind of kinds) { const li = campRow(kind); if (li) ul.appendChild(li); }
}
function loadingHintLi() {
  const li = document.createElement('li');
  li.className = 'hint camp-loading';
  li.textContent = tr('campLoading');
  return li;
}

/* Groupe « Points d'intérêt » : npc/poi/workshop (CATS, critique -- dispo
   dès le premier rendu) + Zones (régions). Rien ici ne dépend de camps.bin
   (différé) : un seul appel suffit, jamais rejoué par whenDeferred. */
function buildGroupPoi() {
  const ul = $('#group-poi-list');
  ul.innerHTML = '';
  ul.appendChild(catRow('npc'));
  ul.appendChild(catRow('poi'));
  ul.appendChild(catRow('workshop'));
  if (S.zonesGeo.length) {
    // Pas de notion de "sans position" pour une région (zones_geo est déjà
    // 100% ce qui est dessiné) : hidden fixé à 0, jamais de badge ici.
    ul.appendChild(filterRow('zones', tr('zonesLabel'), ZONE_HEX, S.zonesGeo.length, 0, S.zonesOn, toggleZones));
  }
}
/* Groupe « Monstres & faune » : 3 lignes camp:<kind> à plat (couverture
   COMPLÈTE, ~35 k pts — les familles seules ne peuvent pas les remplacer,
   design §4.4/§13.2) + le sous-groupe repliable « Par famille » (chunk (b),
   buildMonsterFamilyGroup ci-dessus). */
function buildGroupMonsters() {
  const ul = $('#group-monsters-list');
  ul.innerHTML = '';
  if (!deferredReady) { ul.appendChild(loadingHintLi()); return; }
  appendCampRows(ul, CAMP_KIND_GROUPS.monsters);
  const famLi = buildMonsterFamilyGroup();
  if (famLi) ul.appendChild(famLi);
}
/* Groupe « Récolte » : les 3 métiers de camp:<kind>. */
function buildGroupHarvest() {
  const ul = $('#group-harvest-list');
  ul.innerHTML = '';
  if (!deferredReady) { ul.appendChild(loadingHintLi()); return; }
  appendCampRows(ul, CAMP_KIND_GROUPS.harvest);
}
/* Groupe « Contenants & interactifs » : les 2 vraies couches de coffres
   (CATS, critique) + 3 camp:<kind> (différé) + le groupe repliable Décor
   (S.decor -- lui aussi critique, voir data.js buildDecorGroups appelé
   depuis loadCritical, JAMAIS loadDeferred) EN DERNIER, même ordre que le
   mock du design (§2). Reconstruit en entier à chaque appel (avant ET
   après l'arrivée du différé) pour ne jamais insérer les lignes camp AVANT
   les 2 lignes CATS ni APRÈS le groupe Décor. */
function buildGroupContainers() {
  const ul = $('#group-containers-list');
  ul.innerHTML = '';
  ul.appendChild(catRow('searchable_chest'));
  ul.appendChild(catRow('camp_chest'));
  if (!deferredReady) ul.appendChild(loadingHintLi());
  else appendCampRows(ul, CAMP_KIND_GROUPS.containers);
  const decorLi = buildDecorGroup();
  if (decorLi) ul.appendChild(decorLi);
}
/* Groupe « Quêtes » : qao (CATS, critique) + camp:quest (différé, "Camps
   d'objets de quête" -- déménagé ici depuis l'ancienne section Camps à
   plat, voir design §5). qao reste une SEULE ligne pour cette tranche
   (chunk (c) la scindera en sous-lignes par type d'activable, voir design
   §5) -- GLOSSARY-PENDING : catLabel('qao') ("Objets de quête"/"Quest
   objects", table i18n `cat`) réutilisé tel quel, aucun nouveau libellé
   introduit ici.
   Décision utilisateur (2026-07-11, « les quêtes sont sur les PNJ ; les
   PNJ portent les quêtes ») : la ligne de filtre `quest` (le point violet
   posé à la position du donneur, canvas registerDense -- voir main.js) a
   été RETIRÉE, plus la couche carte elle-même -- elle dupliquait à
   l'identique le pin PNJ du même donneur depuis le giver-pos-snap (~576
   quêtes/319 avec position, TOUTES rattachées à un pin PNJ, vérifié). Le
   titre « Quêtes » du groupe reste juste : qao (objets de quête posés sur
   la carte) et les camps `camp:quest` (camps d'objets de quête) SONT
   toujours deux vraies couches carte quête, seule la 3e (le point par
   quête individuelle) disparaît -- pas de renommage de groupe, pas de
   déplacement d'ul (minimal-diff, voir la mission). Une quête se lit
   maintenant sur le pin/la fiche de son donneur (« N quêtes » -- déjà en
   place, voir popups.js/fiches.js::openNpcFiche) et reste pleinement
   trouvable par recherche (search.js indexe aussi les 24 quêtes SANS
   donneur/position connue -- ouvre directement la fiche, jamais filtré). */
function buildGroupQuests() {
  const ul = $('#group-quests-list');
  ul.innerHTML = '';
  ul.appendChild(catRow('qao'));
  if (!deferredReady) ul.appendChild(loadingHintLi());
  else appendCampRows(ul, CAMP_KIND_GROUPS.quests);
}
/* Groupe « Monde » : sanctuaires/soulkeepers/gardes/autres camps. */
function buildGroupWorld() {
  const ul = $('#group-world-list');
  ul.innerHTML = '';
  if (!deferredReady) { ul.appendChild(loadingHintLi()); return; }
  appendCampRows(ul, CAMP_KIND_GROUPS.world);
}

/* Point d'entrée unique (remplace l'ancien couple buildFilters+
   buildCampFilters) -- nom CONSERVÉ pour ne pas toucher main.js/router.js/
   search.js, qui appellent tous buildFilters() tel quel à chaque cycle de
   vie (boot, bascule langue/carte, toggle dev-content, toggle zones). */
function buildFilters() {
  buildGroupPoi();
  buildGroupContainers();
  buildGroupQuests();
  buildGroupMonsters();
  buildGroupHarvest();
  buildGroupWorld();
  // Rejoue les 5 groupes dépendants de camps.bin une fois arrivé
  // (whenDeferred : synchrone si déjà prêt -- chaque appel post-boot de
  // buildFilters() les reconstruit donc deux fois de suite sans effet
  // visible, idempotent -- même dégénérescence que l'ancien
  // whenDeferred(buildCampFilters)).
  whenDeferred(() => {
    buildGroupContainers();
    buildGroupQuests();
    buildGroupMonsters();
    buildGroupHarvest();
    buildGroupWorld();
  });
}
/* ── Bestiaire (sidebar) ─────────────────────────────────────
   ESPÈCES du catalogue GLOBAL (site/data/<lang>/species.bin, task #80 —
   monster-model overhaul part 2) groupées par famille (repliables), triées
   par taille de famille décroissante ; ~224 espèces au lieu des 754-917
   groupes (name,level) bruts d'avant cette passe — "Woodraptor"/"Young
   Woodraptor"/"Frenzied Woodraptor"/"Furious Woodraptor" ne faisaient QUATRE
   lignes de bestiaire pour la même créature, désormais une seule. Chaque
   ligne : nom cliquable → la fiche du `canonicalSiteKey` de l'espèce (même
   choix de richesse que partout ailleurs — modèles, recherche), niveau
   FOURCHETTE (`levelMin`–`levelMax`, voir data/SCHEMA.md), zones où le
   représentant apparaît (repris de son enregistrement `S.monsters`, champ
   cuit `zones` — species.bin lui-même n'en porte pas) et, quand une région
   est dessinable, une affordance « voir la zone ». Filtre PAR CARTE : une
   espèce dont AUCUN spawn connu n'atteste la carte active est masquée (une
   espèce sans aucune donnée de carte sur AUCUN de ses spawns reste toujours
   affichée — couverture `maps` partielle, voir _monster_zone_names/maps
   attribution) ; le filtre se met à jour à la bascule de carte (main.js
   onMapSwitch) et se bascule via la case en tête de liste. */
let bestiaryMapOnly = true;   // filtrer le bestiaire à la carte active (défaut : oui)
/* Représentant S.monsters d'une espèce -- [key, m] tuple, jamais l'objet
   espèce lui-même (fiche-monster/monster-zone attendent une clé de GROUPE
   S.monsters, voir openMonsterFiche/viewMonsterZone) : `canonicalSiteKey`
   d'abord (garanti résolvable sur les 224/224 espèces du build actuel),
   repli premier spawn présent dans S.monsters sinon (filet de sécurité, ne
   devrait jamais servir aujourd'hui). */
function speciesRep(sp) {
  if (sp.canonicalSiteKey && S.monsters[sp.canonicalSiteKey]) return [sp.canonicalSiteKey, S.monsters[sp.canonicalSiteKey]];
  for (const s of sp.spawns || []) { if (S.monsters[s.siteKey]) return [s.siteKey, S.monsters[s.siteKey]]; }
  return [null, null];
}
/* Cartes attestées pour une espèce : union des `maps` (S.monsters, déjà
   cuit — voir "Monster map attribution" data/SCHEMA.md) de CHAQUE spawn
   présent dans le catalogue chargé -- species.bin ne porte pas son propre
   champ `maps`, cette jointure cliente reste bon marché (au plus quelques
   spawns par espèce) et honnête (null = couverture inconnue, jamais masqué,
   même discipline que l'ancien filtre par-groupe). */
function speciesMaps(sp) {
  const maps = new Set();
  let any = false;
  for (const s of sp.spawns || []) {
    const m = S.monsters[s.siteKey];
    if (m?.maps?.length) { any = true; m.maps.forEach(x => maps.add(x)); }
  }
  return any ? maps : null;
}
function levelRangeSub(min, max) {
  if (min == null) return '';
  return (max != null && max !== min) ? tr('levelRangeAbbrev', min, max) : tr('levelAbbrev', min);
}
function buildBestiary() {
  const box = $('#bestiary-list');
  const title = $('#bestiary-title');
  if (!box || !title) return;
  if (!deferredReady) {
    box.innerHTML = `<p class="hint bst-loading">${esc(tr('bestiaryLoading'))}</p>`;
    return;
  }
  const fams = new Map();
  let hiddenByMap = 0;
  for (const [id, sp] of Object.entries(S.species)) {
    // Contenu dev (feature #13) : espèce 100% test masquée par défaut, même
    // garde que la recherche (voir js/devcontent.js / search.js
    // buildMonsterSearchIndex) -- species.bin's `isTest` n'est vrai que
    // quand CHAQUE membre replié l'est (voir data/SCHEMA.md).
    if (isHiddenTest(sp)) continue;
    // Filtre par-carte : masque une espèce CONFIRMÉE sur d'autres cartes
    // seulement (maps résolues sans la carte active). Une espèce SANS aucune
    // donnée de carte (couverture partielle) n'est jamais masquée.
    const maps = speciesMaps(sp);
    if (bestiaryMapOnly && maps && !maps.has(S.map)) {
      hiddenByMap++;
      continue;
    }
    const fam = familyKey(sp.family || 'other');   // alias (robo→robot…), voir config.js
    let arr = fams.get(fam);
    if (!arr) fams.set(fam, arr = []);
    arr.push({ id, sp });
  }
  const hasAny = fams.size > 0;
  const sec = title.closest('.side-sec');
  (sec || title).hidden = !hasAny && !hiddenByMap;
  box.innerHTML = '';
  // Bascule du filtre par-carte (libellé + case) — toujours visible tant que le
  // bestiaire l'est, pour que l'utilisateur sache qu'il est filtré et puisse
  // tout réafficher (utile quand le filtre masque tout sur une petite carte).
  const mapFilterRow = document.createElement('label');
  mapFilterRow.className = 'bst-mapfilter';
  mapFilterRow.innerHTML = `<input type="checkbox" ${bestiaryMapOnly ? 'checked' : ''}>
    <span>${esc(tr('bestiaryMapFilterLabel', mapName(S.map)))}</span>`;
  mapFilterRow.querySelector('input').addEventListener('change', e => {
    bestiaryMapOnly = e.target.checked;
    buildBestiary();
  });
  box.appendChild(mapFilterRow);
  if (!hasAny) {
    const empty = document.createElement('p');
    empty.className = 'hint';
    empty.textContent = tr('bestiaryMapEmpty');
    box.appendChild(empty);
    return;
  }
  const sorted = [...fams.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [fam, list] of sorted) {
    list.sort((a, b) => (a.sp.levelMin ?? 99) - (b.sp.levelMin ?? 99) || a.sp.name.localeCompare(b.sp.name));
    const rows = list.map(({ id, sp }) => {
      const [key, m] = speciesRep(sp);
      const zones = m?.zones || [];
      const zoneTxt = zones.length > 2 ? tr('bestiaryZonesN', zones.length) : zones.join(' · ');
      // 📍 devant le nom de zone : un nom de ZONE du jeu (ex. "Restricted
      // Area") se lisait avant comme un statut du monstre plutôt qu'un lieu
      // ("niv 14 · Zone restreinte" ressemblait à un état) — même correctif
      // que openMonsterFiche (js/fiches.js), aucune traduction requise (le
      // nom de zone est déjà localisé côté données).
      const zoneBit = zoneTxt ? `📍 ${zoneTxt}` : '';
      const sub = [levelRangeSub(sp.levelMin, sp.levelMax), zoneBit].filter(Boolean).join(' · ');
      // « Voir la zone » : n'apparaît que si au moins une des régions du
      // représentant a un polygone chargé (S.zonesGeo, propre à Kwalat) —
      // sinon rien à dessiner. Trace le(s) polygone(s) sur la carte
      // (viewMonsterZone, délégué main.js) sans ouvrir la fiche.
      const zoneDrawable = key && zones.length && (S.zonesGeo || []).some(z => zones.some(n => fold(n) === fold(z.name)));
      const zoneBtn = zoneDrawable
        ? `<button type="button" class="bst-zone" data-act="monster-zone" data-id="${esc(key)}" title="${esc(tr('viewZoneBtn'))}" aria-label="${esc(tr('viewZoneBtn'))}">📍</button>`
        : '';
      // N'apparaît que si S.devOn est vrai (sinon isHiddenTest l'aurait déjà
      // exclu de `list` plus haut) : marque explicitement une espèce isTest
      // révélée, jamais confondue avec une vraie créature du jeu.
      const devMark = sp.isTest ? `<span class="dev-mark" title="${esc(tr('devBadgeTitle'))}">${esc(tr('devBadge'))}</span>` : '';
      const nameAttrs = key ? ` data-act="fiche-monster" data-id="${esc(key)}"` : '';
      return `<li class="bst-row">
        <span class="bst-name${key ? '' : ' bst-name-unresolved'}"${ecAttr(MONSTER_HEX, 'monster')}${nameAttrs}>${esc(sp.name)}${devMark}</span>
        ${sub ? `<span class="muted">${esc(sub)}</span>` : ''}
        ${zoneBtn}
      </li>`;
    }).join('');
    const det = document.createElement('details');
    det.className = 'bst-family';
    det.innerHTML = `<summary>
        <span class="swatch" style="background:${MONSTER_HEX}"></span>
        <span class="bst-fam-label">${esc(pretty(fam))}</span>
        <span class="fcount">${list.length.toLocaleString(numberLocale())}</span>
      </summary>
      <ul class="bst-list">${rows}</ul>`;
    box.appendChild(det);
  }
}

/* ── Panneau ────────────────────────────────────────────────── */
/* Sections repliables du panneau (Légende/Camps/Bestiaire) : état ouvert/
   replié persisté par section (localStorage) — la sidebar fait ~3 écrans,
   chacun garde ouverte la partie qu'il consulte vraiment. */
const _secState = JSON.parse(localStorage.getItem(LS.sections) || '{}');
$$('.side-sec').forEach(sec => {
  const k = sec.dataset.sec;
  if (k in _secState) sec.open = !!_secState[k];
  sec.addEventListener('toggle', () => {
    _secState[k] = sec.open;
    localStorage.setItem(LS.sections, JSON.stringify(_secState));
  });
});

$('#panel-toggle').addEventListener('click', () => {
  const p = $('#panel');
  const hidden = p.classList.toggle('hidden');
  $('#panel-toggle').classList.toggle('solo', hidden);
  $('#panel-toggle').setAttribute('aria-expanded', String(!hidden));
  setTimeout(() => map.invalidateSize(), 280);
});

export { buildFilters, renderTracked, toggleTrack, toggleDone, buildBestiary };
