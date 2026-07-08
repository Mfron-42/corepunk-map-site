/* Kwalat — gabarits HTML des popups de marqueur (PNJ/POI/objet/coffre,
   quête, camp) + libellé de mob partagé avec les fiches. Vues pures :
   uniquement du HTML, les actions passent par data-act (délégué global,
   voir main.js). */
import { S } from './state.js';
import {
  CATS, CAMP_COLORS, catLabel, campKindLabel,
  campDisplayName, chestDisplayName, activableTypeLabel,
} from './config.js';
import { esc, fmtCoord, iconTag, initials, cleanLabel } from './utils.js';
import { tr } from './i18n/index.js';
import { monsterKeyFor } from './data.js';

/* ── Popups ─────────────────────────────────────────────────── */
function actionBtns(id, extra = '') {
  const tracked = S.tracked.some(t => t.id === id);
  const done = S.done.has(id);
  return `<div class="pop-actions">
    <button class="act ${tracked ? 'on' : ''}" data-act="track" data-id="${esc(id)}">${esc(tracked ? tr('trackedBtn') : tr('trackBtn'))}</button>
    <button class="act ${done ? 'on' : ''}" data-act="done" data-id="${esc(id)}">${esc(done ? tr('doneBtnActive') : tr('doneBtn'))}</button>
    ${extra}</div>`;
}

function popupHtml(cat, r, id) {
  const c = CATS[cat];
  let icon = '';
  if (cat === 'npc') icon = iconTag(r.icon ? `icons/npc_map/${encodeURIComponent(r.icon)}.png` : null, 'pop-icon', initials(r.name));
  if (cat === 'poi') icon = iconTag(r.icon ? `icons/interest_points/${encodeURIComponent(r.icon)}.png` : null, 'pop-icon', initials(r.name));
  let extraBtn = '', extraHtml = '';
  if (cat === 'npc') {
    // Fiche TOUJOURS accessible depuis la carte — pas seulement pour les
    // donneurs de quêtes. Le libellé reste sobre (« Fiche » / « Fiche ·
    // Boutique ») : l'ancien « Fiche (3 quêtes) » se lisait comme une
    // « fiche de quête » ; le compte de quêtes vit désormais dans la ligne
    // de catégorie (« PNJ · Marchand · 3 quêtes »), voir catLine.
    const label = r.vendor ? tr('ficheShopBtn') : tr('ficheBtn');
    extraBtn = `<button class="act primary" data-act="fiche-npc" data-id="${esc(id)}">${esc(label)}</button>`;
  }
  // Activable : le vrai classifieur activable_type du pipeline (r.type, ex.
  // "Radio"/"Evidence") — remplace l'ancienne prettification de la clé
  // technique brute (qao_*), qui fuitait l'identifiant interne ("qao_radio_
  // red" -> "Radio red") tel quel dans le popup.
  if (cat === 'qao' && r.type) extraHtml = `<p class="pop-extra">${esc(activableTypeLabel(r.type))}</p>`;
  // Coffre placé : bouton fiche complète seulement quand une table de butin
  // exacte est attachée. Pas de badge de type ici : le titre (h3, ci-dessous)
  // EST déjà le type physique localisé (chestDisplayName) — un badge
  // répéterait la même info deux fois dans la même popup.
  if (cat === 'chest' && r.loot?.length) {
    extraBtn = `<button class="act primary" data-act="fiche-chest" data-id="${esc(id)}">${esc(tr('ficheCompleteBtn'))}</button>`;
  }
  const catLine = catLabel(cat)
    + (cat === 'npc' && r.vendor ? tr('vendorSuffix') : '')
    + (cat === 'npc' && r.quests?.length ? tr('questCountSuffix', r.quests.length) : '');
  // Titre : nom d'affichage localisé pour un coffre (chestDisplayName — le
  // nom brut est un jeton d'asset d'art jamais localisé, voir config.js) ;
  // nettoyage TEXTURING/QItem générique (cleanLabel) pour tout le reste.
  const title = cat === 'chest' ? chestDisplayName(r) : cleanLabel(r.name);
  return `<div class="pop">
    <h3>${icon}${esc(title)}</h3>
    <div class="pop-cat" style="color:${c.hex}">${esc(catLine)}</div>
    <span class="pop-coords">${fmtCoord(r.x, r.z)}</span>
    ${extraHtml}
    ${actionBtns(id, extraBtn)}</div>`;
}

function questPopup(q) {
  const id = 'quest:' + q.slug;
  return `<div class="pop">
    <h3>${esc(q.name)}</h3>
    <div class="pop-cat" style="color:${CATS.quest.hex}">${esc(tr('questCat'))}${q.giver ? esc(tr('givenBySuffix', q.giver)) : ''}</div>
    <span class="pop-coords">${fmtCoord(q.x, q.z)}</span>
    ${actionBtns(id, `<button class="act primary" data-act="fiche-quest" data-id="${esc(q.slug)}">${esc(tr('ficheCompleteBtn'))}</button>`)}
  </div>`;
}
/* Libellé de mob commun (fiche camp / popup camp) : cliquable vers la fiche
   monstre quand elle existe, texte simple sinon. */
function mobLabelHtml(m, cls) {
  const mk = monsterKeyFor(m.key, m.name);
  return mk
    ? `<span class="${cls} link" data-act="fiche-monster" data-id="${esc(mk)}">${esc(m.name)}</span>`
    : `<span class="${cls}">${esc(m.name)}</span>`;
}

function campPopup(p, n) {
  const g = p.g;
  const det = S.campDetails[g.k];
  let extra = '';
  if (det?.mobs?.length) {
    extra = `<div class="pop-mobs">${det.mobs.slice(0, 4).map(m => {
      const mk = monsterKeyFor(m.key, m.name);
      const attrs = mk ? ` data-act="fiche-monster" data-id="${esc(mk)}"` : '';
      return `<span class="chip"${attrs}>${iconTag(m.icon ? `icons/${esc(m.icon)}` : null, 'chip-icon', initials(m.name))}${esc(m.name)}${m.lvl ? ` <i>${esc(tr('levelAbbrev', m.lvl))}</i>` : ''}</span>`;
    }).join('')}</div>`;
  }
  // Fiche TOUJOURS accessible (même sans fiche camp détaillée : la fiche
  // affiche au minimum les points de spawn + le butin probable des
  // contenants typés — voir openCampFiche).
  const ficheBtn = `<div class="pop-actions"><button class="act primary" data-act="fiche-camp" data-id="${esc(g.k)}">${esc(tr('campFicheBtn'))}</button></div>`;
  return `<div class="pop">
    <h3>${esc(campDisplayName(g.k))}</h3>
    <div class="pop-cat" style="color:${CAMP_COLORS[g.kind] || '#999'}">${esc(tr('campLabel'))} · ${esc(campKindLabel(g.kind))}${n > 1 ? esc(tr('pointsHereSuffix', n)) : ''}</div>
    <span class="pop-coords">${fmtCoord(p.x, p.z)} · ${esc(tr('spawnsTotal', g.pts.length))}</span>
    ${extra}${ficheBtn}</div>`;
}

export { popupHtml, questPopup, campPopup, mobLabelHtml };
