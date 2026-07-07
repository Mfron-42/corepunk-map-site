/* Kwalat — recherche : index riche (carte active + catalogues globaux),
   index cross-carte, score flou (préfixe/sous-chaîne/1-2 fautes), corpus
   de déroulé de quête, et rendu de la liste de résultats. */
import { S } from './state.js';
import {
  CATS, CAMP_COLORS, MONSTER_HEX, ZONE_HEX, LOCATION_HEX, ABILITY_HEX, EVENT_HEX,
  catLabel, campDisplayName, chestTypeLabel,
  rarityLabel, itemKindLabel, weaponTypeLabel,
  locationKindLabel, mapName,
} from './config.js';
import { $, esc, fmtCoord, fold, editLe, iconTag, initials, itemGlyph, pretty } from './utils.js';
import { tr, tbl } from './i18n/index.js';
import { map, toLL, toggleZones, showHighlight } from './mapview.js';
import { pushFocusState } from './urlstate.js';
import { goTo } from './pins.js';
import { whenDeferred } from './data.js';
import {
  itemColor, openNpcFiche, openQuestFiche, openItemFiche,
  openMonsterFiche, openLocationFiche, openAbilityFiche,
} from './fiches.js';
import { switchMap } from './multimap.js';
import { buildFilters } from './sidebar.js';

/* ── Recherche ──────────────────────────────────────────────── */
/* Bruit technique (abilities/effets/talents internes, jamais des objets
   joueur) à déprioriser dans les résultats. */
const NOISE_KEY_RE = /^(ab_|abq_|do_|ef_|efq_|tal_)/;
const PLAYER_ITEM_KINDS = new Set(['resource', 'artifact', 'consumable', 'weapon', 'synthesis', 'quest_item', 'rune', 'chip']);
function itemBias(key, it) {
  if (it?.isTest || NOISE_KEY_RE.test(key || '')) return 2;   // bruit technique -> en dernier
  if (it?.isLobby) return 1.5;   // arme de lobby non craftable (SkipForExport) -> après les vrais objets
  // Objet joueur reconnu -> en tête. Icône/rareté couvrent la majorité des
  // items, mais ~9500/16307 n'ont aucune icône extraite (voir data/SCHEMA.md) —
  // craftable (recipes[]), vendu (soldBy[]) ou lootable (drops[]) sont des
  // signaux tout aussi fiables qu'un item existe réellement pour le joueur,
  // sans quoi une arme craftable sans icône se classait derrière une arme de
  // lobby qui en a une (bug vérifié : "Assault Launcher" (lobby) devançait
  // "Assault" (craftable) sur la requête "assault").
  const recognized = PLAYER_ITEM_KINDS.has(it?.kind) &&
    (it?.rarity || it?.icon || it?.recipes?.length || it?.soldBy?.length || it?.drops?.length);
  const base = recognized ? 0 : 1;
  return it?.isRecipe ? base + 0.4 : base;   // la recette d'un objet arrive juste après lui, jamais avant
}
/* Search category TOKENS (stable, language-independent) — see
   pushSearchEntry(): `cat` used to be the already-translated French display
   string doubling as a lookup key; now it's one of these tokens, and
   searchCatLabel() resolves the displayed chip text at render time. */
const CAT_GLYPH = {
  npc: '👤', poi: '📍', quest: '❖', qao: '⚙', workshop: '🛠', camp: '⛺', item: '📦',
  monster: '🐾', zone: '🗺', location: '📖', ability: '✨', event: '⚑', chest: '🧰',
};
const searchCatLabel = key => tbl('searchCat', key) || key;
let searchIndex = [];
/* `body` (optionnel) : corpus de texte supplémentaire au-delà du libellé —
   une quête reste trouvable par un mot de son déroulé (objectif, texte de
   but) et pas seulement son titre. Générique et non localisé en dur : le
   corpus vient tel quel des champs texte déjà résolus par le pipeline
   (site/data/quests.json — objectives/goalTexts/journal), donc suit
   automatiquement la langue chargée le jour où le site en proposera d'autres
   que l'anglais du client. Chaque segment garde sa forme repliée pour la
   recherche + son texte d'origine pour l'indice affiché au résultat. */
/* `opts` (optionnel) : { map, ref } pour la recherche cross-carte (vague C).
   `map` = carte à laquelle appartient l'entrée (défaut : carte active) ; si
   elle diffère de la carte courante, le résultat porte un badge de carte et le
   clic bascule d'abord dessus (voir renderSearch). `ref` = clé stable (slug de
   quête…) pour dédoublonner rich-index vs index cross-carte. Les catalogues
   globaux (objets/monstres/…) sont réindexés sur CHAQUE carte donc leur `map`
   = carte active : jamais de badge ni de bascule pour eux, toujours dispo. */
function pushSearchEntry(label, cat, hex, x, z, open, icon, sub, glyph, bias, body, opts) {
  const n = fold(label);
  const entry = {
    label, n, words: n.split(' '), cat, hex, x, z, open,
    icon: icon || null, sub: sub || null,
    glyph: glyph || CAT_GLYPH[cat] || '❖', bias: bias || 0,
    map: (opts && opts.map) || S.map,
    ref: (opts && opts.ref) || null,
  };
  if (body && body.length) {
    entry.body = body.filter(Boolean).map(s => { const bn = fold(s); return { text: s, n: bn, words: bn.split(' ') }; });
  }
  searchIndex.push(entry);
  return entry;
}
/* Clé de dédoublonnage rich-index ⨯ index cross-carte : une quête présente à
   la fois dans les données chargées (par son slug) et dans search_index.bin ne
   doit sortir qu'une fois. `ref` (slug) prime, sinon cat+libellé replié. */
const searchDedupKey = e => `${e.cat}|${e.ref || e.n || fold(e.label)}`;
/* Corpus de recherche « déroulé » d'une quête : objectifs textuels + phrasé
   par but (goalTexts — texte libre distinct du graphe goals[] machine-exact)
   + résumé de journal. Purement additif au titre, jamais affiché tel quel
   (voir renderSearch pour l'indice ponctuel). */
function questSearchBody(q) {
  return [...(q.objectives || []), ...(q.goalTexts || []), ...(q.journal ? [q.journal] : [])];
}
function buildSearch() {
  searchIndex = [];
  const push = pushSearchEntry;
  // Un PNJ connu seulement par le dialogue/graphe de quête (pas de marqueur
  // carte) n'a ni x ni z : la ligne de résultat le dit explicitement plutôt
  // que de laisser un espace vide (le sous-libellé n'était sinon utilisé que
  // pour x/z absents).
  S.data.npc.forEach((r, i) => push(r.name, 'npc', CATS.npc.hex, r.x, r.z, () => openNpcFiche(i),
    null, r.x == null ? tr('posUnknown') : null, initials(r.name)));
  S.data.poi.forEach(r => push(r.name, 'poi', CATS.poi.hex, r.x, r.z));
  // Une quête sans x/z (giver et acteurs tous sans position extraite — ex.
  // les quêtes de Prison Island, cf. questNoPos) reste indexée : le clic
  // ouvre sa fiche exactement comme d'habitude (openQuestFiche tolère déjà
  // q.x null), simplement pas de saut/centrage carte — même traitement que
  // les PNJ sans position juste au-dessus.
  // Chaque quête porte sa vraie carte (q.map) et son slug (ref) : sur Kwalat,
  // le fichier racine contient TOUTES les quêtes (dont celles de Prison Island
  // via questNoPos) — une quête d'une autre carte reçoit un badge et son clic
  // bascule dessus (voir renderSearch). Ses x/z sont toujours dans le repère de
  // q.map (le giver, ou l'objectif via le bundle par carte), donc un goTo APRÈS
  // bascule tombe juste.
  S.data.quest.forEach(q => push(q.name, 'quest', CATS.quest.hex, q.x, q.z, () => openQuestFiche(q.slug),
    null, q.x == null ? tr('questNoPos') : null, null, 0, questSearchBody(q), { map: q.map, ref: q.slug }));
  S.data.qao.forEach(r => push(r.name, 'qao', CATS.qao.hex, r.x, r.z));
  S.data.workshop.forEach(r => push(r.name, 'workshop', CATS.workshop.hex, r.x, r.z));
  // Base de données objets : icône + rareté, pas de position (fiche seule).
  // Bruit technique (ab_/ef_/… , is_test) déprioritisé au profit des objets joueur.
  // Sous-libellé : rareté/nature + type d'arme court (ex. "Rare · Pistolet")
  // quand connu, pour distinguer d'un coup d'œil plusieurs résultats "Arme".
  Object.entries(S.items).forEach(([key, it]) => {
    const kindSub = rarityLabel(it.rarity) || itemKindLabel(it.kind) || '';
    const wtSub = it.weapon?.weapon_type ? weaponTypeLabel(it.weapon.weapon_type) : '';
    push(it.name, 'item', itemColor(it), null, null, () => openItemFiche(key),
      it.icon ? `icons/${it.icon}` : null, [kindSub, wtSub].filter(Boolean).join(' · '),
      itemGlyph(it), itemBias(key, it));
  });
  // Régions nommées (zonesGeo, chargé au critique — voir loadCritical) et
  // coffres placés (S.data.chest, idem) : exhaustivité de la recherche
  // demandée par la mission, ni l'un ni l'autre n'attend camps.json.
  buildZoneSearchIndex();
  buildChestSearchIndex();
  // Monstres/bestiaire-lore/capacités nommées/événements + camps : ajoutés
  // une fois leurs jeux de données différés arrivés (voir loadDeferred) —
  // le tableau searchIndex est déjà branché sur la barre de recherche, un
  // simple push suffit à chacun.
  whenDeferred(buildCampSearchIndex);
  whenDeferred(buildMonsterSearchIndex);
  whenDeferred(buildLocationSearchIndex);
  whenDeferred(buildAbilitySearchIndex);
  whenDeferred(buildEventSearchIndex);
  // Recherche CROSS-CARTE : les entités des AUTRES cartes (non chargées
  // localement) viennent de search_index.bin. Ajoutées ici pour que la
  // recherche spanne tout dès le boot, quelle que soit la carte active.
  buildCrossMapSearch();
}

/* Index cross-carte (search_index.bin) : une entrée légère par entité
   map-scopée de CHAQUE carte {cat, label, map, x?, z?, ref?, kind?}. On
   n'ajoute QUE les entités d'une AUTRE carte que la carte courante (celles de
   la carte active sont déjà dans le rich-index ci-dessus), et on saute tout
   doublon déjà présent (une quête est dans le fichier racine Kwalat ET dans
   search_index — dédoublonnée par slug). Le clic bascule sur entry.map puis
   focus/fiche (voir renderSearch → crossMapOpen). */
function buildCrossMapSearch() {
  if (!S.crossIndex.length) return;
  const seen = new Set(searchIndex.map(searchDedupKey));
  for (const e of S.crossIndex) {
    if (e.map === S.map) continue;
    const key = `${e.cat}|${e.ref || fold(e.label)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const hex = e.cat === 'quest' ? CATS.quest.hex
      : e.cat === 'npc' ? CATS.npc.hex
        : e.cat === 'qao' ? CATS.qao.hex
          : e.cat === 'chest' ? CATS.chest.hex
            : e.cat === 'workshop' ? CATS.workshop.hex
              : e.cat === 'camp' ? (CAMP_COLORS[e.kind] || '#888') : '#8d99ae';
    pushSearchEntry(e.label, e.cat, hex, e.x ?? null, e.z ?? null,
      () => crossMapOpen(e), null, null, null, 0, null, { map: e.map, ref: e.ref });
  }
}

/* Ouverture d'un résultat d'une AUTRE carte : bascule d'abord (charge ses
   données), puis rouvre la fiche / focus. Appelé après que switchMap a résolu
   (voir renderSearch) — les données de la carte cible sont donc déjà là. */
function crossMapOpen(e) {
  if (e.cat === 'quest' && e.ref && S.quests.has(e.ref)) openQuestFiche(e.ref);
  else if (e.cat === 'npc') {
    const i = S.data.npc.findIndex(n => n.name === e.label);
    if (i >= 0) openNpcFiche(i);
  }
}

/* Libellé de recherche d'un camp : nom d'affichage partagé (campDisplayName,
   js/config.js — type de contenant localisé + reste de clé prettifié, pour
   que "carotte"/"tonneau"/"pot"/"champignon" trouvent quelque chose). Seule
   spécificité recherche : les 5 camps "for-delete-*" (restes de dev) sont
   exclus de l'index entièrement. */
function campSearchLabel(k) {
  if (k.includes('for-delete')) return null;   // reste de dev — exclu de la recherche
  return campDisplayName(k);
}

/* Entrées « Camp » ajoutées à l'index une fois camps.json arrivé (chargement
   différé) — le tableau searchIndex est déjà branché sur la barre de
   recherche, un simple push suffit. */
function buildCampSearchIndex() {
  Object.values(S.camps).forEach(st => st.groups.forEach(g => {
    if (!g.pts.length) return;
    const label = campSearchLabel(g.k);
    if (label == null) return;
    // Clic → surligne TOUS les points du groupe (pas seulement le premier) :
    // « montre-moi toutes les caisses de maïs », voir showHighlight.
    pushSearchEntry(label, 'camp', CAMP_COLORS[g.kind] || '#888', g.pts[0][0], g.pts[0][1],
      () => showHighlight(g.pts.map(([x, z]) => ({ x, z })), CAMP_COLORS[g.kind] || '#888'));
  }));
}

/* Coffres placés (tc_*, S.data.chest — ~3830 marqueurs individuels, chargés
   au critique). Un skin de prop (ex. "Chest barrel elenian 02 grey") se
   répète souvent des centaines de fois à l'identique — indexer chaque
   marqueur ferait des centaines de doublons pour une seule recherche ; une
   seule entrée par NOM DISTINCT (~130) suffit et reste honnête (aucune
   position n'est cachée, juste dédoublonnée). Le nom brut n'est pas
   localisé (pas une entrée Localization/, voir data/SCHEMA.md chests) —
   préfixé par le libellé de catégorie déjà traduit (catLabel('chest')) pour
   que "coffre" (FR) / "chest" (EN) / etc. matche quand même. */
function chestSearchLabel(name) {
  // Famille de prop localisée quand reconnue ("Coffre · Tonneau — Elenian 02
  // grey") — même détection que le popup (chestTypeLabel, js/config.js).
  const type = chestTypeLabel(name);
  const head = type ? `${catLabel('chest')} · ${type}` : catLabel('chest');
  const rest = (name || '').replace(/^(small\s+)?chest\s+/i, '').trim();
  return rest ? `${head} — ${pretty(rest)}` : head;
}
function buildChestSearchIndex() {
  const seen = new Map();
  S.data.chest.forEach(r => { if (!seen.has(r.name)) seen.set(r.name, r); });
  // Clic → surligne TOUTES les instances de ce skin de prop (chaque coffre
  // placé porte son nom exact — 142 « Chest boxes elenian 01 grey »…).
  seen.forEach(r => pushSearchEntry(chestSearchLabel(r.name), 'chest', CATS.chest.hex, r.x, r.z,
    () => showHighlight(S.data.chest.filter(c => c.name === r.name), CATS.chest.hex)));
}

/* Régions nommées (zones_geo.json, chargé au critique — voir loadCritical) :
   clic -> zoom sur les anneaux réels de la région (pas juste son point
   d'étiquette) + active la couche "Zones" si elle était masquée, pour que
   le polygone soit effectivement visible. */
function buildZoneSearchIndex() {
  S.zonesGeo.forEach(z => {
    if (!z.rings?.length) return;
    pushSearchEntry(z.name, 'zone', ZONE_HEX, null, null, () => {
      if (!S.zonesOn) { S.zonesOn = true; toggleZones(true); buildFilters(); }
      map.flyToBounds(L.latLngBounds(z.rings.flat().map(([x, zz]) => toLL(x, zz))).pad(0.15));
    }, null, null, '🗺');
  });
}

/* Monstres : nom (déjà dédupliqué/regroupé au build), sous-libellé "niv X ·
   famille", clic -> fiche (pas de position fixe unique : un monstre peut
   apparaître dans plusieurs camps, listés DANS la fiche). */
function buildMonsterSearchIndex() {
  Object.entries(S.monsters).forEach(([key, m]) => {
    const sub = [m.level != null ? tr('levelAbbrev', m.level) : null, m.family ? pretty(m.family) : null]
      .filter(Boolean).join(' · ');
    pushSearchEntry(m.name, 'monster', MONSTER_HEX, null, null, () => openMonsterFiche(key),
      m.icon ? `icons/${m.icon}` : null, sub, '🐾');
  });
}

/* Bestiaire/lore (MapMarkers.xml) : index = clé de fiche (S.locations est un
   tableau, pas un objet). Sous-libellé = nature (Ville/Bestiaire/Ressource…) ;
   position quand connue (38/208 depuis un pin _ip, le reste sans coordonnée
   fiable — fiche seule, comme un PNJ connu seulement par le dialogue). */
function buildLocationSearchIndex() {
  S.locations.forEach((l, i) => {
    pushSearchEntry(l.title, 'location', LOCATION_HEX, l.x ?? null, l.z ?? null,
      () => openLocationFiche(i), null, locationKindLabel(l.kind), '📖');
  });
}

/* Capacités NOMMÉES seulement (202/1765 — sorts de héros Q/W/E/R/MA ; les
   capacités de monstre n'ont aucune localisation dans le client, voir
   data/SCHEMA.md abilities.json) : indexer les ~1560 restantes n'aurait
   affiché que des libellés de repli vides de sens, sans bénéfice pour la
   recherche. */
function buildAbilitySearchIndex() {
  Object.entries(S.abilities).forEach(([key, a]) => {
    pushSearchEntry(a.name, 'ability', ABILITY_HEX, null, null, () => openAbilityFiche(key),
      null, a.slot || '', '✨');
  });
}

/* Événements de monde NOMMÉS seulement (28/454 — les points anonymes
   WE_SmallPoint/WE_Arena générique/Ghost n'ont pas de nom propre à taper,
   donc restent exclus). Pas de fiche dédiée (comme les points d'intérêt) :
   clic -> va juste voir sur la carte. */
function buildEventSearchIndex() {
  S.events.forEach(e => pushSearchEntry(e.name, 'event', EVENT_HEX, e.x, e.z, null, null, pretty(e.kind), '⚑'));
}

/* Score d'un jeton de requête contre une entrée (plus bas = meilleur) :
   0 mot exact · 1 préfixe de mot · 2 sous-chaîne · 3 ≈1 faute · 4 ≈2 fautes
   (tolérance activée dès 4 lettres, 2 fautes dès 7) ; Infinity = pas trouvé.
   Le préfixe flou couvre la frappe en cours (« steelhar » → Steelheart). */
function tokenScore(tok, entry) {
  let best = Infinity;
  if (entry.n.includes(tok)) {
    best = 2;
    for (const w of entry.words) {
      if (w === tok) return 0;
      if (w.startsWith(tok)) best = 1;
    }
    return best;
  }
  const maxD = tok.length >= 7 ? 2 : tok.length >= 4 ? 1 : 0;
  if (!maxD) return Infinity;
  for (const w of entry.words) {
    let d = editLe(tok, w, maxD);
    if (tok.length < w.length) d = Math.min(d, editLe(tok, w.slice(0, tok.length + maxD), maxD));
    if (d <= maxD) best = Math.min(best, 2 + d);
    if (best === 3) break;
  }
  return best;
}

/* Repli « texte de déroulé » quand le titre ne matche pas : un même segment
   (une phrase d'objectif) doit couvrir la requête — pas la somme éparpillée
   du corpus, sinon deux mots sans rapport dans deux phrases différentes
   produiraient un faux positif. Tolère UN jeton absent (mot parasite —
   « voir » dans « Return voir Slick ») dès 3 jetons ; en dessous, exact.
   `null` si aucun segment n'atteint ce seuil. */
function bodyMatch(tokens, body) {
  const required = tokens.length <= 2 ? tokens.length : tokens.length - 1;
  let best = null;
  for (const seg of body) {
    let score = 0, hits = 0;
    for (const tok of tokens) {
      const s = tokenScore(tok, seg);
      if (s !== Infinity) { hits++; score += s; } else { score += 6; }
    }
    if (hits < required) continue;
    if (!best || hits > best.hits || (hits === best.hits && score < best.score)) best = { seg, hits, score };
  }
  return best;
}

function runSearch(raw) {
  const q = fold(raw);
  if (!q) return [];
  const tokens = q.split(' ');
  const scored = [];
  for (const it of searchIndex) {
    let score = it.bias * 5;
    let ok = true;
    for (const tok of tokens) {
      const s = tokenScore(tok, it);
      if (s === Infinity) { ok = false; break; }
      score += s;
    }
    let bodyHit = null;
    if (!ok && it.body) {
      // Le titre ne matche pas : essaie le corpus étendu (objectifs/texte de
      // quête). Toujours moins prioritaire qu'un match de titre, quel que
      // soit le nombre/la finesse des jetons (+1000 de plancher).
      const bm = bodyMatch(tokens, it.body);
      if (bm) { ok = true; score = 1000 + bm.score; bodyHit = bm.seg.text; }
    }
    if (!ok) continue;
    if (!bodyHit && it.n.startsWith(q)) score -= 0.5;   // départ exact de libellé (titre uniquement)
    scored.push({ it, score, len: it.n.length, bodyHit });
  }
  scored.sort((a, b) => a.score - b.score || a.len - b.len);
  // Dédoublonnage final (rich-index ⨯ cross-carte) : une même entité peut
  // exister des deux côtés (quête dans le fichier racine ET dans
  // search_index). On garde la meilleure occurrence (déjà triée).
  const seen = new Set();
  const out = [];
  for (const s of scored) {
    const k = searchDedupKey(s.it);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ ...s.it, bodyHit: s.bodyHit });
    if (out.length >= 24) break;
  }
  return out;
}

const resBox = $('#search-results');
let searchTimer = null;
$('#search').addEventListener('input', e => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => renderSearch(e.target.value), 70);
});
function renderSearch(raw) {
  const v = raw.trim();
  resBox.innerHTML = ''; resBox.hidden = !v;
  if (!v) return;
  const res = runSearch(v);
  if (!res.length) {
    resBox.innerHTML = `<li class="hint no-results">
      <span class="no-results-main">${esc(tr('noResults'))}</span>
      <span class="no-results-hint">${esc(tr('noResultsHint'))}</span>
    </li>`;
    return;
  }
  res.forEach(it => {
    const li = document.createElement('li');
    // Indice discret : la quête sort sur un mot de son déroulé, pas de son
    // titre — on montre la phrase qui a matché pour que ce soit lisible.
    const hint = it.bodyHit ? `<div class="sr-hint">${esc(tr('searchBodyHintPrefix'))}${esc(it.bodyHit)}</div>` : '';
    // Résultat d'une AUTRE carte : badge de carte discret + le clic bascule.
    const otherMap = it.map && it.map !== S.map;
    const mapBadge = otherMap
      ? `<span class="map-badge" title="${esc(tr('mapBadgeTitle', mapName(it.map)))}">${esc(mapName(it.map))}</span>` : '';
    li.innerHTML = `<div class="sr-row">
      <span class="cat-chip" style="--chip-c:${it.hex}">${esc(searchCatLabel(it.cat))}</span>
      ${iconTag(it.icon, 'sr-icon', it.glyph)}
      <span class="sr-label">${esc(it.label)}</span>
      ${mapBadge}
      <span class="muted">${it.x != null ? fmtCoord(it.x, it.z) : esc(it.sub || '')}</span>
    </div>${hint}`;
    li.onclick = () => {
      pushFocusState();   // avant mutation — voir pushFocusState()'s doc
      resBox.hidden = true; $('#search').value = it.label;
      const focus = () => {
        if (it.x != null) goTo(it.x, it.z, 3, it.label);
        if (it.open) it.open();
      };
      // Cross-carte : basculer d'abord (charge la carte cible), PUIS focus —
      // les x/z de l'entrée sont dans le repère de it.map, donc le goTo tombe
      // juste une fois la bascule faite. Même carte : comportement inchangé.
      if (otherMap) switchMap(it.map, { keepView: true }).then(focus);
      else focus();
    };
    resBox.appendChild(li);
  });
}
document.addEventListener('click', e => {
  if (!e.target.closest('.search-wrap')) resBox.hidden = true;
});

/* Masque la liste de résultats (bascule de carte, changement de langue). */
function hideSearchResults() { resBox.hidden = true; }

export { buildSearch, hideSearchResults };
