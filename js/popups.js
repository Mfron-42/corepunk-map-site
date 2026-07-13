/* Kwalat — gabarits HTML des popups de marqueur (PNJ/POI/objet/coffre,
   quête, camp) + libellé de mob partagé avec les fiches. Vues pures :
   uniquement du HTML.
   E'c-3 : l'en-tête de chaque popup est une RÉFÉRENCE `EntityRef` compacte
   `[Kind] Nom` (js/mapref.js) — le TAG de kind remplace l'ex-ligne .pop-cat
   couleur-seule ET le bouton fiche séparé (le nom souligné ouvre la fiche via
   ref-open, routé par main.js). Fini la forme verbeuse « Nom / [Kind] /
   [Position] » empilée. Popups honesty-light (blueprint §1.1) : AUCUNE pastille
   dans l'en-tête (le marqueur cliqué EST déjà la position) ; le locate persistant
   vit dans la FICHE, pas ici. Suivre/Fait restent des boutons d'état personnel
   (data-act track/done), jamais des références. */
import { S } from './state.js';
import {
  CATS, CAMP_COLORS, MONSTER_HEX, campKindLabel,
  campLabel, campQualifierChip, chestDisplayName, activableTypeLabel,
  chestHex, chestKindLabel, prettyRegion, speciesLayerHex,
} from './config.js';
import { esc, fmtCoord, iconTag, initials, npcIconUrl, cleanLabel } from './utils.js';
import { tr } from './i18n/index.js';
import { monsterKeyFor, locationIndexForId } from './data.js';
import { visibleQuestSlugs } from './devcontent.js';
import { ref } from './mapref.js';

/* ── Popups ─────────────────────────────────────────────────── */
function actionBtns(id, extra = '') {
  const tracked = S.tracked.some(t => t.id === id);
  const done = S.done.has(id);
  return `<div class="pop-actions">
    <button class="act ${tracked ? 'on' : ''}" data-act="track" data-id="${esc(id)}">${esc(tracked ? tr('trackedBtn') : tr('trackBtn'))}</button>
    <button class="act ${done ? 'on' : ''}" data-act="done" data-id="${esc(id)}">${esc(done ? tr('doneBtnActive') : tr('doneBtn'))}</button>
    ${extra}</div>`;
}

/* En-tête compacte `[Kind] Nom` (EntityRef) : l'icône du marqueur reste en tête
   de ligne, le tag+nom viennent du composant partagé (ref). */
function popHead(icon, desc) {
  return `<div class="pop-head">${icon}${ref(desc)}</div>`;
}

function popupHtml(cat, r, id) {
  const c = CATS[cat];
  let icon = '';
  if (cat === 'npc') icon = iconTag(npcIconUrl(r.icon), 'pop-icon', initials(r.name));
  if (cat === 'poi') icon = iconTag(r.icon ? `icons/interest_points/${encodeURIComponent(r.icon)}.png` : null, 'pop-icon', initials(r.name));

  let extraHtml = '', extraRef = '';
  // POI enrichis (vrais noms InterestPoint.xml, desc/locTitle/loc joints) : le
  // titre de lore divergent (locTitle) et le paragraphe d'encyclopédie (desc)
  // restent des blocs distincts. La CHRONIQUE (lore) est une entité DISTINCTE du
  // POI → sa propre réf `[Chronique] Titre` (souligné → fiche lore via ref-open),
  // jamais fondue dans le nom du POI. Chargement DIFFÉRÉ : le popup est construit
  // au clic (quasi toujours résolu) ; sinon la réf est simplement omise.
  if (cat === 'poi') {
    const locTitleHtml = (r.locTitle && r.locTitle !== r.name)
      ? `<p class="pop-extra">${esc(tr('poiLoreNamed', r.locTitle))}</p>` : '';
    const descHtml = r.desc ? `<p class="pop-desc">${esc(r.desc)}</p>` : '';
    extraHtml = locTitleHtml + descHtml;
    const locIdx = r.loc ? locationIndexForId(r.loc) : null;
    if (locIdx != null) {
      const loreName = S.locations?.[locIdx]?.title || tr('poiLoreBtn');
      extraRef = `<div class="pop-actions">${ref({ kind: 'location', key: locIdx, label: loreName, hasFiche: true, drawable: false })}</div>`;
    }
  }

  // « N quêtes » : seulement les quêtes RÉELLEMENT visibles (jamais un
  // dialogue-bark hello_*/info_* masqué par défaut, voir devcontent.js).
  const npcQuests = cat === 'npc' ? visibleQuestSlugs(r.quests) : null;

  // Titre : nom d'affichage localisé pour un coffre (vrai nom officiel
  // r.displayName sinon chestDisplayName — le nom brut est un jeton d'asset
  // jamais localisé) ; nettoyage TEXTURING/QItem générique (cleanLabel) sinon.
  const title = cat === 'chest' ? (r.displayName || chestDisplayName(r)) : cleanLabel(r.name);

  // Descripteur EntityRef par catégorie. Fiche pliée dans le nom souligné
  // (ref-open) là où une fiche existe et route ; sinon nom en clair honnête
  // (poi/qao/atelier — pas de fiche directe). Aucune pastille (drawable:false —
  // honesty-light, le marqueur EST la position).
  let desc;
  if (cat === 'npc') {
    // Fiche PNJ TOUJOURS accessible : le nom souligné remplace l'ex-bouton
    // « Fiche »/« Fiche · Boutique ». Rôle vendeur + compte de quêtes → méta
    // muette (l'ex-ligne pop-cat « PNJ · Marchand · 3 quêtes »).
    const meta = `${r.vendor ? tr('vendorSuffix') : ''}${npcQuests.length ? tr('questCountSuffix', npcQuests.length) : ''}`;
    desc = { kind: 'npc', key: id, label: title, hasFiche: true, drawable: false, meta };
  } else if (cat === 'poi') {
    desc = { kind: 'poi', label: title, hex: c.hex, hasFiche: false, drawable: false, meta: r.region ? ` · ${r.region}` : '' };
  } else if (cat === 'qao') {
    // Activable : le vrai classifieur activable_type (r.type, ex. « Radio ») en
    // méta — remplace l'ancienne prettification du jeton technique brut.
    desc = { kind: 'qao', label: title, hex: c.hex, hasFiche: false, drawable: false, meta: r.type ? ` · ${activableTypeLabel(r.type)}` : '' };
  } else if (cat === 'chest') {
    // Fiche complète seulement quand une table de butin exacte est attachée
    // (nom souligné ⇔ r.loot présent). La VRAIE catégorie (chestKindLabel :
    // camp_chest / décor par famille / legacy) passe en méta.
    desc = { kind: 'chest', key: id, label: title, hex: chestHex(r), hasFiche: !!r.loot?.length, drawable: false, meta: ` · ${chestKindLabel(r)}` };
  } else {
    // Atelier / autre couche à pictogramme : `[Kind] Nom` non souligné.
    desc = { kind: cat, label: title, hex: c ? c.hex : null, hasFiche: false, drawable: false };
  }

  return `<div class="pop">
    ${popHead(icon, desc)}
    <span class="pop-coords">${fmtCoord(r.x, r.z)}</span>
    ${extraHtml}
    ${extraRef}
    ${actionBtns(id)}</div>`;
}

/* Popup « coffre fouillable » (searchable_chests.bin — LE vrai coffre farmable
   de recette, voir  §4) : distinct des placements chest.
   En-tête `[Coffre fouillable] <région>` : le tag nomme le kind, la région
   (seule info distinctive — aucun nom propre côté données) est le libellé,
   souligné → fiche recette quand une table est attachée (même garde qu'avant). */
function searchableChestPopup(r) {
  const id = 'searchable_chest:' + r.k;
  const region = prettyRegion(r.region);
  const desc = {
    kind: 'searchable_chest', key: r.k, label: region || tr('searchableChestTitle'),
    hex: CATS.searchable_chest.hex, hasFiche: !!r.loot?.length, drawable: false,
  };
  return `<div class="pop">
    ${popHead('', desc)}
    <span class="pop-coords">${fmtCoord(r.x, r.z)}</span>
    ${actionBtns(id)}</div>`;
}

/* questPopup a été retirée avec la couche registerDense('quest', ...) : une
   quête se lit désormais sur le pin de son donneur (popup PNJ « N quêtes » +
   fiche « Quêtes données ») et via la recherche, jamais via son propre marqueur. */

/* Libellé de mob commun (partagé fiche/popup) : `[Espèce] Nom` (EntityRef,
   identité — souligné → fiche monstre quand elle existe). Honesty-light : pas de
   pastille (contexte popup). Note : ce helper n'a plus d'appelant vivant (rendu
   des mobs de popup inliné dans campPopup) ; conservé pour compat d'export. */
function mobLabelHtml(m, cls) {
  const mk = monsterKeyFor(m.key, m.name, m.lvl);
  const spId = mk ? S.monsters?.[mk]?.species : null;
  const hex = spId ? speciesLayerHex(spId) : MONSTER_HEX;
  return ref({ kind: 'species', key: mk || null, label: m.name, hex, hasFiche: !!mk, drawable: false });
}

function campPopup(p, n) {
  const g = p.g;
  const det = S.campDetails[g.k];
  let extra = '';
  if (det?.mobs?.length) {
    extra = `<div class="pop-mobs">${det.mobs.slice(0, 4).map(m => {
      // `m.lvl` (camp_details) sert d'indice de niveau à monsterKeyFor (#80) :
      // la fiche ouverte doit être la variante d'ESPÈCE la plus proche de CE
      // niveau, pas un repli arbitraire.
      const mk = monsterKeyFor(m.key, m.name, m.lvl);
      const spId = mk ? S.monsters?.[mk]?.species : null;
      const hex = spId ? speciesLayerHex(spId) : MONSTER_HEX;   // teinte précise d'espèce (Q6)
      // Fourchette de niveau du camp (m.lvlMax) quand elle diffère de m.lvl.
      const lvlTxt = m.lvl != null
        ? (m.lvlMax != null && m.lvlMax !== m.lvl ? tr('levelRangeAbbrev', m.lvl, m.lvlMax) : tr('levelAbbrev', m.lvl))
        : '';
      // EntityRef (E'c-3) : `[Espèce] Nom` (identité, honesty-light — pas de
      // pastille en popup) REMPLACE l'ex-`.chip` + ecAttr + data-act. Icône en
      // tête, niveau en méta muette.
      return `<span class="pop-mob">${iconTag(m.icon ? `icons/${esc(m.icon)}` : null, 'chip-icon', initials(m.name))}${ref({ kind: 'species', key: mk || null, label: m.name, hex, hasFiche: !!mk, drawable: false, meta: lvlTxt })}</span>`;
    }).join('')}</div>`;
  }
  // En-tête compacte `[Camp] Nom · <kind>[ · N ici]` : le tag remplace l'ex-ligne
  // .pop-cat, le nom souligné remplace l'ex-bouton « Fiche camp » (ref-open camp,
  // fiche TOUJOURS accessible). Sous-type cuit (campLabel) + chip qualificatif
  // (— Patrouille / — Renforcé (PvP)) conservés. Honesty-light : pas de pastille.
  const name = campLabel(g.k, g.kind, g.name, g.subtype);
  const meta = `· ${campKindLabel(g.kind)}${n > 1 ? tr('pointsHereSuffix', n) : ''}`;
  const desc = { kind: 'camp', key: g.k, label: name, hex: CAMP_COLORS[g.kind] || '#999', hasFiche: true, drawable: false, meta };
  return `<div class="pop">
    <div class="pop-head">${ref(desc)}${campQualifierChip(g.qualifier)}</div>
    <span class="pop-coords">${fmtCoord(p.x, p.z)} · ${esc(tr('spawnsTotal', g.pts.length))}</span>
    ${extra}</div>`;
}

export { popupHtml, campPopup, mobLabelHtml, searchableChestPopup };
