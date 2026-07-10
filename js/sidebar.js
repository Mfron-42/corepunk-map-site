/* Kwalat — panneau latéral : filtres de couches, liste des camps, suivis
   (tracked/fait) et bouton d'affichage du panneau. */
import { S, LS, save } from './state.js';
import {
  CATS, CAMP_COLORS, ZONE_HEX, MONSTER_HEX, catLabel, campKindLabel, familyKey,
  chestDisplayName, chestHex, mapName, DECOR_FAMILIES, DECOR_HEX, decorFamilyLabel, prettyRegion, ecAttr,
} from './config.js';
import { $, $$, esc, pretty, fold } from './utils.js';
import { tr, numberLocale } from './i18n/index.js';
import { map, layers, scheduleRedraw, refreshIconLayer, toggleZones } from './mapview.js';
import { syncHash, pushFocusState } from './urlstate.js';
import { goTo } from './pins.js';
import { whenDeferred, deferredReady } from './data.js';
import { isHiddenTest, positionCounts } from './devcontent.js';

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
   générale "un tableau S.data par clé CATS". */
function catStats(key) {
  if (key === 'quest') return positionCounts(S.data.quest);
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
   open/fermé du <details>). */
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

function buildFilters() {
  const ul = $('#filter-list');
  ul.innerHTML = '';
  for (const [key, c] of Object.entries(CATS)) {
    const { shown, hidden } = catStats(key);
    const li = filterRow(key, catLabel(key), c.hex, shown, hidden, c.on, on => {
      c.on = on;
      if (c.dense) scheduleRedraw();
      else on ? map.addLayer(layers[key]) : map.removeLayer(layers[key]);
    });
    ul.appendChild(li);
  }
  if (S.zonesGeo.length) {
    // Pas de notion de "sans position" pour une région (zones_geo est déjà
    // 100% ce qui est dessiné) : hidden fixé à 0, jamais de badge ici.
    ul.appendChild(filterRow('zones', tr('zonesLabel'), ZONE_HEX,
      S.zonesGeo.length, 0, S.zonesOn, toggleZones));
  }
  const decorLi = buildDecorGroup();
  if (decorLi) ul.appendChild(decorLi);
  const cl = $('#camp-list');
  if (!deferredReady) {
    cl.innerHTML = `<li class="hint camp-loading">${esc(tr('campLoading'))}</li>`;
  }
  whenDeferred(buildCampFilters);
}

/* Liste des camps (sidebar) — reconstruite une fois camps.json arrivé
   (chargement différé, voir loadDeferred). */
function buildCampFilters() {
  const cl = $('#camp-list');
  cl.innerHTML = '';
  const kinds = Object.entries(S.camps).sort((a, b) => b[1].points.length - a[1].points.length);
  for (const [kind, st] of kinds) {
    // st.points vient directement de g.pts (data.js/multimap.js loadMapData) :
    // chaque entrée a TOUJOURS x/z, jamais de gap position -- hidden fixé à 0.
    cl.appendChild(filterRow('camp:' + kind, campKindLabel(kind), CAMP_COLORS[kind] || '#888',
      st.points.length, 0, st.on, on => { st.on = on; scheduleRedraw(); }));
  }
}
/* ── Bestiaire (sidebar) ─────────────────────────────────────
   Monstres du catalogue GLOBAL groupés par famille (repliables), triés par
   taille de famille décroissante ; chaque monstre : nom cliquable → fiche
   (data-act, délégué global de main.js — pas d'import de vues ici), niveau,
   zones où il apparaît (champ cuit `m.zones`, hors zone attrape-tout — voir
   build_site_data.py::_monster_zone_names) et, quand une région est dessinable,
   une affordance « voir la zone » qui trace son/ses polygone(s) sur la carte.
   Filtre PAR CARTE : les mobs dont `m.maps` ne contient pas la carte active
   sont masqués (un mob SANS donnée de carte reste toujours affiché — couverture
   maps partielle, 332/917 groupes) ; le filtre se met à jour à la bascule de
   carte (main.js onMapSwitch) et se bascule via la case en tête de liste. */
let bestiaryMapOnly = true;   // filtrer le bestiaire à la carte active (défaut : oui)
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
  for (const [key, m] of Object.entries(S.monsters)) {
    // Contenu dev (feature #13) : monstres isTest masqués du bestiaire par
    // défaut, même garde que la recherche (voir js/devcontent.js /
    // search.js buildMonsterSearchIndex) — 162/917 groupes concernés.
    if (isHiddenTest(m)) continue;
    // Filtre par-carte : masque un mob CONFIRMÉ sur d'autres cartes seulement
    // (m.maps présent sans la carte active). Un mob SANS m.maps (couverture
    // partielle) n'est jamais masqué — on ne cache pas sur une donnée absente.
    if (bestiaryMapOnly && Array.isArray(m.maps) && m.maps.length && !m.maps.includes(S.map)) {
      hiddenByMap++;
      continue;
    }
    const fam = familyKey(m.family || 'other');   // alias (robo→robot…), voir config.js
    let arr = fams.get(fam);
    if (!arr) fams.set(fam, arr = []);
    arr.push({ key, m });
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
    list.sort((a, b) => (a.m.level ?? 99) - (b.m.level ?? 99) || a.m.name.localeCompare(b.m.name));
    const rows = list.map(({ key, m }) => {
      const zones = m.zones || [];
      const zoneTxt = zones.length > 2 ? tr('bestiaryZonesN', zones.length) : zones.join(' · ');
      // 📍 devant le nom de zone : un nom de ZONE du jeu (ex. "Restricted
      // Area") se lisait avant comme un statut du monstre plutôt qu'un lieu
      // ("niv 14 · Zone restreinte" ressemblait à un état) — même correctif
      // que openMonsterFiche (js/fiches.js), aucune traduction requise (le
      // nom de zone est déjà localisé côté données).
      const zoneBit = zoneTxt ? `📍 ${zoneTxt}` : '';
      const sub = [m.level != null ? tr('levelAbbrev', m.level) : '', zoneBit].filter(Boolean).join(' · ');
      // « Voir la zone » : n'apparaît que si au moins une des régions du mob a
      // un polygone chargé (S.zonesGeo, propre à Kwalat) — sinon rien à
      // dessiner. Trace le(s) polygone(s) sur la carte (viewMonsterZone,
      // délégué main.js) sans ouvrir la fiche.
      const zoneDrawable = zones.length && (S.zonesGeo || []).some(z => zones.some(n => fold(n) === fold(z.name)));
      const zoneBtn = zoneDrawable
        ? `<button type="button" class="bst-zone" data-act="monster-zone" data-id="${esc(key)}" title="${esc(tr('viewZoneBtn'))}" aria-label="${esc(tr('viewZoneBtn'))}">📍</button>`
        : '';
      // N'apparaît que si S.devOn est vrai (sinon isHiddenTest l'aurait déjà
      // exclu de `list` plus haut) : marque explicitement un monstre isTest
      // révélé, jamais confondu avec une vraie créature du jeu.
      const devMark = m.isTest ? `<span class="dev-mark" title="${esc(tr('devBadgeTitle'))}">${esc(tr('devBadge'))}</span>` : '';
      return `<li class="bst-row">
        <span class="bst-name"${ecAttr(MONSTER_HEX, 'monster')} data-act="fiche-monster" data-id="${esc(key)}">${esc(m.name)}${devMark}</span>
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
