/* Kwalat — panneau latéral : filtres de couches, liste des camps, suivis
   (tracked/fait) et bouton d'affichage du panneau. */
import { S, save } from './state.js';
import { CATS, CAMP_COLORS, ZONE_HEX, MONSTER_HEX, catLabel, campKindLabel } from './config.js';
import { $, esc, pretty } from './utils.js';
import { tr, numberLocale } from './i18n/index.js';
import { map, layers, scheduleRedraw, refreshIconLayer, toggleZones } from './mapview.js';
import { syncHash, pushFocusState } from './urlstate.js';
import { goTo } from './pins.js';
import { whenDeferred, deferredReady, monsterZones } from './data.js';

/* ── Suivis / fait ──────────────────────────────────────────── */
function trackedTargetById(id) {
  const [cat, key] = id.split(':');
  if (cat === 'quest') { const q = S.quests.get(key); return q && { name: q.name, x: q.x, z: q.z, hex: CATS.quest.hex }; }
  const r = S.data[cat]?.[+key];
  return r && { name: r.name, x: r.x, z: r.z, hex: CATS[cat]?.hex || '#999' };
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
function filterRow(key, label, hex, count, on, toggle) {
  const li = document.createElement('li');
  li.innerHTML = `<label class="filter-row ${on ? '' : 'off'}">
    <input type="checkbox" ${on ? 'checked' : ''}>
    <span class="swatch" style="background:${hex}"></span>
    <span class="flabel">${esc(label)}</span>
    <span class="fcount">${count.toLocaleString(numberLocale())}</span></label>`;
  li.querySelector('input').addEventListener('change', e => {
    li.querySelector('.filter-row').classList.toggle('off', !e.target.checked);
    toggle(e.target.checked);
    syncHash();
  });
  return li;
}

function buildFilters() {
  const ul = $('#filter-list');
  ul.innerHTML = '';
  for (const [key, c] of Object.entries(CATS)) {
    const count = key === 'quest' ? S.data.quest.length : S.data[key].length;
    ul.appendChild(filterRow(key, catLabel(key), c.hex, count, c.on, on => {
      c.on = on;
      if (c.dense) scheduleRedraw();
      else on ? map.addLayer(layers[key]) : map.removeLayer(layers[key]);
    }));
  }
  if (S.zonesGeo.length) {
    ul.appendChild(filterRow('zones', tr('zonesLabel'), ZONE_HEX,
      S.zonesGeo.length, S.zonesOn, toggleZones));
  }
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
    cl.appendChild(filterRow('camp:' + kind, campKindLabel(kind), CAMP_COLORS[kind] || '#888',
      st.points.length, st.on, on => { st.on = on; scheduleRedraw(); }));
  }
}
/* ── Bestiaire (sidebar) ─────────────────────────────────────
   Monstres du catalogue GLOBAL groupés par famille (repliables), triés par
   taille de famille décroissante ; chaque monstre : nom cliquable → fiche
   (data-act, délégué global de main.js — pas d'import de vues ici), niveau
   et zones où il apparaît (croisement camps ⨯ régions, voir data.js
   monsterZones). Catalogue global : indépendant de la carte active, donc
   jamais reconstruit à la bascule de carte — seulement au boot (données
   différées) et au changement de langue (voir main.js). */
function buildBestiary() {
  const box = $('#bestiary-list');
  const title = $('#bestiary-title');
  if (!box || !title) return;
  if (!deferredReady) {
    box.innerHTML = `<p class="hint bst-loading">${esc(tr('bestiaryLoading'))}</p>`;
    return;
  }
  const fams = new Map();
  for (const [key, m] of Object.entries(S.monsters)) {
    const fam = m.family || 'other';
    let arr = fams.get(fam);
    if (!arr) fams.set(fam, arr = []);
    arr.push({ key, m });
  }
  const hasAny = fams.size > 0;
  title.hidden = !hasAny;
  box.innerHTML = '';
  if (!hasAny) return;
  const sorted = [...fams.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [fam, list] of sorted) {
    list.sort((a, b) => (a.m.level ?? 99) - (b.m.level ?? 99) || a.m.name.localeCompare(b.m.name));
    const rows = list.map(({ key, m }) => {
      const zones = monsterZones(key);
      const zoneTxt = zones.length > 2 ? tr('bestiaryZonesN', zones.length) : zones.join(' · ');
      const sub = [m.level != null ? tr('levelAbbrev', m.level) : '', zoneTxt].filter(Boolean).join(' · ');
      return `<li class="bst-row">
        <span class="bst-name" data-act="fiche-monster" data-id="${esc(key)}">${esc(m.name)}</span>
        ${sub ? `<span class="muted">${esc(sub)}</span>` : ''}
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
$('#panel-toggle').addEventListener('click', () => {
  const p = $('#panel');
  const hidden = p.classList.toggle('hidden');
  $('#panel-toggle').classList.toggle('solo', hidden);
  $('#panel-toggle').setAttribute('aria-expanded', String(!hidden));
  setTimeout(() => map.invalidateSize(), 280);
});

export { buildFilters, renderTracked, toggleTrack, toggleDone, buildBestiary };
