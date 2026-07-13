/* Kwalat — fiches/zone.js (vague E'c-R : la fiche RÉGION, nouvelle surface).
   openRegionFiche(zoneId) : en-tête `[Région(●)] Nom` (la pastille bascule le
   contour de la région sur la carte — drawNamedZone, réutilisé READ-ONLY) +
   le ContentsBlock (blueprint §1.2/§3.3) : le contenu INVERSÉ du polygone lu
   dans zones_contents.bin — camps {count, byKind}, monstres {resolved,
   probable, unresolved}, faune/creeps {resolved, unresolved}, objets
   {byFamily}, quêtes {donneurs ici, objectifs ici}. Honnêteté (blueprint §5) :
   le roster reste décidé serveur (Badge), le co-spawn probable est badgé, les
   seaux non résolus sont montrés tels quels (jamais rembourrés), une catégorie
   vide dit « rien » et une région vide reste une fiche valide.

   Ce module fournit AUSSI la référence `[Région(●)]` partagée (regionRef) et le
   test d'existence de fiche (regionFicheExists) que les fiches monstre/camp/
   quête utilisent pour transformer un NOM de région en clair en une référence
   cliquable — le payoff de la vague (les noms de région deviennent cliquables).
   Aucune couleur/mot de kind ré-dérivé : tout passe par mapref.js ref() +
   config.js (ZONE_HEX/REGION_HEX) + i18n. */
import { S } from '../state.js';
import { REGION_HEX, ZONE_HEX, CAMP_COLORS, campKindLabel } from '../config.js';
import { esc, fold, pretty } from '../utils.js';
import { tr } from '../i18n/index.js';
import { zoneContentsFor } from '../data.js';
import { campGroupByKey } from '../pointsets.js';
import { visibleQuestSlugsSplit } from '../devcontent.js';
import { ref } from '../mapref.js';
import { ficheHeader, openFiche, setFicheHash, badge, campRef, drawNamedZone, questRef } from './core.js';

/* ── Résolution NOM de région → zone_id ──────────────────────────────────────
   zones_contents.bin est indexé par zone_id ; son champ `display` porte le nom
   affiché résolu (le registre zones.bin laisse beaucoup de noms non résolus,
   `[[Zones/…/Name]]`). Les surfaces qui citent une région le font par NOM (m.zones
   d'une fiche monstre, dominantZone d'un camp, label d'objectif enter_zone) — on
   les rejoint donc au zone_id par le nom REPLIÉ (fold, insensible casse/espaces —
   « Badlands » ⇔ «  Badlands » du polygone). Mémoïsé sur l'IDENTITÉ de l'objet
   S.zonesContents (réassigné au chargement différé / au changement de langue) —
   jamais un cache périmé quand la donnée arrive ou change. */
const N2I_UNSET = Symbol('n2i-unset');   // sentinel ≠ toute valeur réelle (dont `undefined` : S.zonesContents n'est pas encore posé au boot, AVANT le chargement différé — sans ce sentinel le cache « vide » ressemblait à jour et renvoyait null → crash sur .get()).
let _n2i = new Map(), _n2iSrc = N2I_UNSET;
function nameToId() {
  if (_n2iSrc !== S.zonesContents) {
    _n2i = new Map();
    const zc = S.zonesContents;
    const put = (name, id) => { const f = fold(name); if (f && id != null && !_n2i.has(f)) _n2i.set(f, String(id)); };
    if (Array.isArray(zc)) zc.forEach(z => z && put(z.display, z.zone_id != null ? z.zone_id : z.id));
    else if (zc && typeof zc === 'object') for (const [id, z] of Object.entries(zc)) put(z && z.display, id);
    _n2iSrc = S.zonesContents;
  }
  return _n2i;
}
/* zone_id d'une région à partir d'un NOM (replié) — null si aucune. */
function regionIdForName(name) {
  if (name == null || name === '') return null;
  return nameToId().get(fold(name)) || null;
}
/* Une fiche région existe-t-elle pour ce NOM ? (garde de lien : un nom qui ne
   résout à aucune région cataloguée reste en clair, jamais un lien mort — le
   sous-lieu de quête « House Hilda Deeproot » n'est pas une région.) */
function regionFicheExists(name) {
  const id = regionIdForName(name);
  return !!(id && zoneContentsFor(id));
}
/* La région a-t-elle un polygone chargé sur la carte active ? (contour
   dessinable — 3 régions îles/dépôt n'en ont pas, honnête : pas de pastille). */
function regionOutlineDrawable(name) {
  return (S.zonesGeo || []).some(z => fold(z.name) === fold(name));
}

/* ── Référence `[Région(●)] Nom` PARTAGÉE ────────────────────────────────────
   La forme unique par laquelle toute surface-phrase cite une région : le TAG
   nomme le kind (Région), le NOM est souligné ⇔ une fiche région existe
   (ref-open → openRegionFiche, routé par main.js), la PASTILLE bascule le
   contour du polygone (ref-draw, subrole « region » → drawNamedZone, main.js) ⇔
   la région a un polygone chargé. Teinte ZONE_HEX (config.js, source unique).
   `key` = le NOM (drawNamedZone résout par nom ; main.js openRegionFiche résout
   nom→id). `drawn:false` explicite : contour single-slot transitoire (effacé à
   la fermeture de fiche), jamais un pin locate persistant — même contrat que la
   réf « Présent dans » d'une fiche monstre. */
function regionRef(name, opts = {}) {
  if (!name) return '';
  return ref({
    kind: 'zone', subrole: 'region', key: name, label: name,
    hex: ZONE_HEX, hasFiche: regionFicheExists(name),
    drawable: regionOutlineDrawable(name), drawn: false,
    meta: opts.meta != null ? opts.meta : '',
  });
}

/* ── ContentsBlock (blueprint §3.3) ──────────────────────────────────────────
   Le contenu inversé du polygone, seau par seau, avec les NOMS DE CHAMP RÉELS
   du bin (display, camps{count,byKind,items}, monsters{resolved,probable,
   unresolved}, creeps{resolved,unresolved}, objects{count,byFamily},
   quests{givers?,questsWithGoal}). Chaque entrée monstre/creep est une CLÉ DE
   CAMP (ex. « monsters-rat-goldenfield-town ») — rendue en `[Camp(●)]` (la
   fiche camp porte le roster décidé serveur, la pastille surligne ses points de
   spawn = la densité). */

function section(title, inner) {
  if (!inner) return '';
  return `<div class="fiche-section region-cat"><h3>${esc(title)}</h3>${inner}</div>`;
}
/* Chip de compte agrégé (byKind camps / byFamily objets) — non cliquable : un
   agrégat n'est pas une entité adressable. Teinte du kind quand connue. */
function countChip(label, n, hex) {
  const style = hex ? ` style="--chip-c:${hex}"` : '';
  return `<span class="region-count-chip"${style}><span class="region-cc-label">${esc(label)}</span><span class="region-cc-n">${n}</span></span>`;
}
/* Une ligne de camp du seau (résolue → campRef complet ; non jointe sur la
   carte active → réf honnête sans fiche/pastille). extraBadge : le badge
   « co-spawn probable » pour le seau probable. */
function campBucketRow(entry, extraBadge = '') {
  const key = entry && entry.camp;
  if (!key) return '';
  const g = campGroupByKey(key);
  const refHtml = g
    ? campRef(key, g)
    : ref({ kind: 'camp', key, label: pretty(key), hasFiche: false, drawable: false });
  return `<div class="frow region-camp-row">${refHtml}${extraBadge}</div>`;
}
function campBucketRows(list, extraBadge = '') {
  return (list || []).map(e => campBucketRow(e, extraBadge)).join('');
}
/* Seau « non résolu » : un simple COMPTE honnête (jamais rembourré en fausses
   entités — blueprint §5). */
function unresolvedNote(n) {
  return n > 0 ? `<p class="hint region-unresolved">${esc(tr('regionUnresolvedN', n))}</p>` : '';
}

function campsBlock(camps) {
  if (!camps || !camps.count) return '';
  const chips = Object.entries(camps.byKind || {})
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => countChip(campKindLabel(k), n, CAMP_COLORS[k])).join('');
  return section(tr('regionCampsTitle'),
    `<p class="region-count">${esc(tr('regionCampsCount', camps.count))}</p>`
    + (chips ? `<div class="region-count-chips">${chips}</div>` : ''));
}

function monstersBlock(mon) {
  if (!mon) return '';
  const resolved = mon.resolved || [];
  const probable = mon.probable || [];
  const nUnres = (mon.unresolved || []).length;
  if (!resolved.length && !probable.length && !nUnres) return '';
  const resHtml = campBucketRows(resolved);
  const probBadge = badge({ axis: 'value', value: 'cospawn-probable' });
  const probHtml = probable.length
    ? `<h4 class="fiche-sub">${esc(tr('regionProbableTitle'))}</h4>${campBucketRows(probable, probBadge)}` : '';
  // Honnêteté (blueprint §1.2) : le roster À L'INTÉRIEUR de chaque camp reste
  // décidé serveur — la fiche liste les CAMPS (chacun ouvrable, son roster
  // server-side y est badgé), jamais un roster de région fabriqué. Un seul
  // rappel de section (pas par ligne — ce serait du bruit).
  const serverNote = (resHtml || probHtml)
    ? `<p class="hint region-server-note">${badge({ axis: 'value', value: 'roster-server-side' })}</p>` : '';
  const inner = (resHtml || probHtml)
    ? `${serverNote}${resHtml}${probHtml}${unresolvedNote(nUnres)}`
    : (nUnres ? unresolvedNote(nUnres) : `<p class="hint">${badge({ axis: 'provenance', value: 'absent', text: tr('regionNone') })}</p>`);
  return section(tr('regionMonstersTitle'), inner);
}

function creepsBlock(cr) {
  if (!cr) return '';
  const resolved = cr.resolved || [];
  const nUnres = (cr.unresolved || []).length;
  if (!resolved.length && !nUnres) return '';
  const inner = `${campBucketRows(resolved)}${unresolvedNote(nUnres)}`;
  return section(tr('regionWildlifeTitle'), inner);
}

const OBJ_FAMILY_KEY = {
  chest: 'regionObjChest', craft_bench: 'regionObjCraftBench',
  quest_active_object: 'regionObjQuestObject', reactive: 'regionObjReactive',
  shrine: 'regionObjShrine', destroyable: 'regionObjDestroyable', unresolved: 'regionObjUnresolved',
};
function objFamilyLabel(fam) {
  const k = OBJ_FAMILY_KEY[fam];
  return k ? tr(k) : pretty(fam);
}
function objectsBlock(obj) {
  if (!obj || !obj.count) return '';
  const chips = Object.entries(obj.byFamily || {})
    .sort((a, b) => b[1] - a[1])
    .map(([f, n]) => countChip(objFamilyLabel(f), n)).join('');
  return section(tr('regionObjectsTitle'),
    `<p class="region-count">${esc(tr('regionObjectsCount', obj.count))}</p>`
    + (chips ? `<div class="region-count-chips">${chips}</div>` : ''));
}

function questsBlock(q) {
  if (!q) return '';
  // Donneurs ICI (quests.givers, présent sur les régions habitées) : chaque
  // `{slug, npcKey}` → une réf `[Quête] Nom` (soulignée ⇔ la quête est au
  // catalogue ET visible). VRAIES quêtes seulement : un dialogue-bark révélé
  // par le contenu dev n'est pas une quête de la région — même partition
  // partagée que la fiche PNJ et le badge « N quêtes » des popups
  // (devcontent.js::visibleQuestSlugsSplit).
  const givers = (q.givers || []).map(gv => gv && gv.slug).filter(Boolean);
  const visible = new Set(visibleQuestSlugsSplit(givers).real);
  const giverRefs = givers
    .filter(slug => visible.has(slug) && S.quests.has(slug))
    .map(slug => `<div class="frow region-quest-row">${questRef(slug)}</div>`)
    .join('');
  // Objectifs ICI (quests.questsWithGoal) : un COMPTE honnête (le bin ne porte
  // pas la liste des quêtes-à-objectif, juste leur nombre — jamais fabriquer
  // des liens qu'on n'a pas).
  const nGoals = q.questsWithGoal || 0;
  const goalsHtml = nGoals ? `<p class="hint region-goals-here">${esc(tr('regionGoalsHere', nGoals))}</p>` : '';
  if (!giverRefs && !goalsHtml) return '';
  const giversHtml = giverRefs ? `<h4 class="fiche-sub">${esc(tr('regionGiversTitle'))}</h4>${giverRefs}` : '';
  return section(tr('regionQuestsTitle'), `${giversHtml}${goalsHtml}`);
}

/* ── Opener ──────────────────────────────────────────────────────────────────
   openRegionFiche(zoneRef) : accepte un zone_id (lien profond `zone=<id>`) OU
   un NOM (réf `[Région]` d'une autre fiche) — résolu à l'un ou l'autre. No-op
   honnête si la région est inconnue (jamais une fiche vide pour un non-lieu).
   Une région VIDE (île sans contenu catalogué) reste une fiche valide : « rien
   de catalogué ici » est une information. */
function openRegionFiche(zoneRef) {
  if (zoneRef == null || zoneRef === '') return;
  const asStr = String(zoneRef);
  let id = null, contents = zoneContentsFor(asStr);
  if (contents) id = asStr;
  else { id = regionIdForName(zoneRef); contents = id ? zoneContentsFor(id) : null; }
  if (!contents) return;
  const name = contents.display || pretty(id);
  S.openFiche = { kind: 'region', id };

  const drawable = regionOutlineDrawable(name);
  const dot = drawable
    ? { kind: 'zone', subrole: 'region', key: name, label: name, hex: ZONE_HEX, drawable: true, drawn: false }
    : null;

  const blocks = [
    campsBlock(contents.camps),
    monstersBlock(contents.monsters),
    creepsBlock(contents.creeps),
    objectsBlock(contents.objects),
    questsBlock(contents.quests),
  ].filter(Boolean).join('');
  // Région entièrement vide (îles) : fiche valide, absence honnête — le libellé
  // de la Badge EST la phrase (text:), pas juste « Absent » suivi d'une bulle.
  const body = blocks || `<div class="fiche-section"><p class="hint">${badge({ axis: 'provenance', value: 'absent', text: tr('regionEmpty') })}</p></div>`;

  openFiche(`
    ${ficheHeader({
      name, hex: REGION_HEX || ZONE_HEX, dot,
      sub: esc(tr('regionFicheKind')),
    })}
    <div class="region-contents">${body}</div>`);
  setFicheHash('region', id);
  // Focus le contour du polygone sur la carte (blueprint §1.2). drawNamedZone
  // efface d'abord tout contour précédent puis dessine + recadre ; no-op de
  // dessin quand la région n'a pas de polygone chargé (île), sans jamais
  // inventer un contour.
  drawNamedZone(name);
}

export { openRegionFiche, regionRef, regionFicheExists, regionIdForName };
