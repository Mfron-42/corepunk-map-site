/* Kwalat — panneau latéral : filtres de couches, liste des camps, suivis
   (tracked/fait) et bouton d'affichage du panneau. */
import { S, save } from './state.js';
import { CATS, CAMP_COLORS, ZONE_HEX, catLabel, campKindLabel } from './config.js';
import { $, esc } from './utils.js';
import { tr, numberLocale } from './i18n/index.js';
import { map, layers, scheduleRedraw, refreshIconLayer, toggleZones } from './mapview.js';
import { syncHash, pushFocusState } from './urlstate.js';
import { goTo } from './pins.js';
import { whenDeferred, deferredReady } from './data.js';

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
/* ── Panneau ────────────────────────────────────────────────── */
$('#panel-toggle').addEventListener('click', () => {
  const p = $('#panel');
  const hidden = p.classList.toggle('hidden');
  $('#panel-toggle').classList.toggle('solo', hidden);
  $('#panel-toggle').setAttribute('aria-expanded', String(!hidden));
  setTimeout(() => map.invalidateSize(), 280);
});

export { buildFilters, renderTracked, toggleTrack, toggleDone };
