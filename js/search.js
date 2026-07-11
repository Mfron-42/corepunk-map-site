/* Kwalat — recherche : index riche (carte active + catalogues globaux),
   index cross-carte, score flou (préfixe/sous-chaîne/1-2 fautes), corpus
   de déroulé de quête, et rendu de la liste de résultats. */
import { S } from './state.js';
import {
  CATS, CAMP_COLORS, MONSTER_HEX, ZONE_HEX, LOCATION_HEX, ABILITY_HEX, EVENT_HEX, RECIPE_HEX, nodeHex,
  catLabel, campDisplayName, chestTypeLabel, chestDisplayName, chestHex, prettyRegion,
  rarityLabel, itemKindLabel, weaponTypeLabel, professionLabel,
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
  openMonsterFiche, openLocationFiche, openAbilityFiche, openSearchableChestFiche,
  openRecipeFiche, openNodeFiche,
} from './fiches.js';
import { isDeprecatedItem, rarityGroupFor, rarityGroupSwatches } from './rarity.js';
import { isHiddenTest } from './devcontent.js';
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
  searchable_chest: '🗝', recipe: '📜', node: '🌿',
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
    // `pinCat` (facultatif) : clé de couche carte (mapview.js `layers`) quand
    // (x,z) coïncident avec un marqueur RÉELLEMENT rendu de cette couche --
    // voir pins.js goTo()'s pinRef. Un résultat sans pinCat garde le réticule
    // ambré historique (comportement inchangé pour camp/coffre-skin/etc.,
    // voir buildCampSearchIndex/buildChestSearchIndex qui ont chacun leur
    // propre mécanisme de surlignage, pas un pin unique adressable ici).
    pinCat: (opts && opts.pinCat) || null,
    // `ring` (facultatif) : pastilles [{rarity,hex}] d'un groupe multi-rareté
    // (voir rarity.js rarityGroupSwatches, poussé uniquement par l'entrée
    // "item" représentante d'un groupe ci-dessous) -- consommé par
    // renderSearch()'s iconWithRing() pour dessiner l'anneau conique autour
    // de l'icône ; null partout ailleurs (objet à rareté unique ou toute
    // autre catégorie), aucun changement visuel pour eux.
    ring: (opts && opts.ring) || null,
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
  // `pinCat` (npc/poi/workshop/quest/qao ci-dessous) : ces catégories
  // correspondent chacune à UNE couche carte adressable par coordonnées
  // exactes (mapview.js findRenderedMarker) — un clic de résultat met alors
  // en avant le marqueur RÉEL déjà rendu au lieu de poser un réticule ambré
  // par-dessus (npc_dual_identity_INVESTIGATION.md, cas Ophelia Voss via
  // recherche). camp/coffre-skin gardent le réticule : leur clic déclenche
  // déjà son propre mécanisme de surlignage (showHighlight, voir
  // buildCampSearchIndex/buildChestSearchIndex), pas un pin unique.
  S.data.npc.forEach((r, i) => push(r.name, 'npc', CATS.npc.hex, r.x, r.z, () => openNpcFiche(i),
    null, r.x == null ? tr('posUnknown') : null, initials(r.name), 0, null, { pinCat: 'npc' }));
  S.data.poi.forEach(r => push(r.name, 'poi', CATS.poi.hex, r.x, r.z, null, null, null, null, 0, null, { pinCat: 'poi' }));
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
  // Quêtes/objets de quête isTest (feature #13) : masqués de la recherche
  // par défaut (S.devOn faux) — voir js/devcontent.js. Jamais retirés des
  // données elles-mêmes, juste pas poussés dans l'index tant que le tag
  // « Contenu dev » (main.js buildDevToggle) n'a pas été cliqué.
  S.data.quest.forEach(q => {
    if (isHiddenTest(q)) return;
    push(q.name, 'quest', CATS.quest.hex, q.x, q.z, () => openQuestFiche(q.slug),
      null, q.x == null ? tr('questNoPos') : null, null, 0, questSearchBody(q), { map: q.map, ref: q.slug, pinCat: 'quest' });
  });
  S.data.qao.forEach(r => { if (!isHiddenTest(r)) push(r.name, 'qao', CATS.qao.hex, r.x, r.z, null, null, null, null, 0, null, { pinCat: 'qao' }); });
  S.data.workshop.forEach(r => push(r.name, 'workshop', CATS.workshop.hex, r.x, r.z, null, null, null, null, 0, null, { pinCat: 'workshop' }));
  // Base de données objets : icône + rareté, pas de position (fiche seule).
  // Bruit technique (ab_/ef_/… , is_test) déprioritisé au profit des objets joueur.
  // Sous-libellé : rareté/nature + type d'arme court (ex. "Rare · Pistolet")
  // quand connu, pour distinguer d'un coup d'œil plusieurs résultats "Arme".
  Object.entries(S.items).forEach(([key, it]) => {
    // (a) doublon `_old` déprécié : jamais indexé (voir isDeprecatedItem).
    if (isDeprecatedItem(key, it)) return;
    // (a-bis) isTest (feature #13) : masqué par défaut, même garde que
    // quêtes/objets de quête ci-dessus — 128 items concernés.
    if (isHiddenTest(it)) return;
    // (a-ter) Recette (task #78a, recipes-searchable pass) : it.kind==='recipe'
    // est un pseudo-item catalogue de RÉFÉRENCE (une entrée standalone par
    // craft distinct, name/icon/rarities copiés de l'objet produit — voir
    // data/SCHEMA.md recipes.json "Site propagation") plutôt qu'un objet du
    // jeu. AVANT cette passe il retombait dans la branche générique ci-dessous
    // (cat "item", couleur de rareté -- souvent grise faute de it.rarity
    // propre --, et un clic ouvrait openItemFiche() sur un titre IDENTIQUE à
    // celui de l'objet qu'il sert à fabriquer, ex. "Ronin Bow" apparaissait
    // deux fois sans rien pour les distinguer) : sa propre catégorie/couleur
    // (RECIPE_HEX) + sa propre fiche (openRecipeFiche) le rendent immédiatement
    // reconnaissable et cohérent avec le chip [Recette : X] de la fiche objet
    // (task #78b) -- "Ronin Bow" recherché sort maintenant l'ARME (item) ET sa
    // RECETTE (recipe), chacune avec son kind propre. Bias PARTAGÉ (itemBias
    // -- même dosage "juste après l'objet qu'elle fabrique", voir son doc).
    if (it.kind === 'recipe') {
      const devSub = it.isTest ? tr('devBadge') : '';
      push(it.name, 'recipe', RECIPE_HEX, null, null, () => openRecipeFiche(key),
        it.icon ? `icons/${it.icon}` : null, [professionLabel(it.prof), devSub].filter(Boolean).join(' · '),
        '📜', itemBias(key, it));
      return;
    }
    // (b) membre non-représentant d'un groupe de rareté (voir rarity.js) :
    // une seule entrée par groupe (le représentant), la rareté se choisit
    // sur la fiche (pill selector, voir openItemFiche).
    const grp = rarityGroupFor(key);
    if (grp && S.rarityGroupOf.get(key) !== key) return;
    // Représentant d'un groupe : sous-libellé = nature de l'objet + indice
    // « N raretés » (au lieu de la seule rareté du représentant, arbitraire),
    // pour que le résultat unique se lise « plusieurs raretés dispo ».
    const kindSub = (grp ? itemKindLabel(it.kind) : rarityLabel(it.rarity)) || itemKindLabel(it.kind) || '';
    const wtSub = it.weapon?.weapon_type ? weaponTypeLabel(it.weapon.weapon_type) : '';
    const grpSub = grp ? tr('rarityVariantsCount', Object.keys(grp.variants).length) : '';
    // Item isTest révélé (S.devOn) : marqué explicitement dans le
    // sous-libellé, jamais confondu avec un vrai objet joueur.
    const devSub = it.isTest ? tr('devBadge') : '';
    // Anneau multi-rareté (design pass, multi-rarity search rows) : un groupe
    // n'a pas UNE couleur, il en a N -- la puce catégorie (chip-c) ne peut en
    // porter qu'une seule à la fois, donc elle redevient neutre (comme un
    // objet sans rareté connue, itemColor's propre repli) plutôt que de
    // continuer à montrer la rareté du seul représentant comme si elle
    // suffisait à décrire tout le groupe. Les N vraies couleurs vivent sur
    // l'anneau autour de l'icône (renderSearch's iconWithRing) à la place.
    const ring = grp ? rarityGroupSwatches(grp) : null;
    push(it.name, 'item', ring ? 'var(--muted)' : itemColor(it), null, null, () => openItemFiche(key),
      it.icon ? `icons/${it.icon}` : null, [kindSub, wtSub, grpSub, devSub].filter(Boolean).join(' · '),
      itemGlyph(it), itemBias(key, it), null, ring ? { ring } : null);
  });
  // Régions nommées (zonesGeo, chargé au critique — voir loadCritical),
  // coffres placés (S.data.chest, idem) et coffres fouillables réels
  // (S.data.searchable_chest, idem) : exhaustivité de la recherche demandée
  // par la mission, aucun des trois n'attend camps.json.
  buildZoneSearchIndex();
  buildChestSearchIndex();
  buildSearchableChestSearchIndex();
  // Monstres/bestiaire-lore/capacités nommées/événements + camps : ajoutés
  // une fois leurs jeux de données différés arrivés (voir loadDeferred) —
  // le tableau searchIndex est déjà branché sur la barre de recherche, un
  // simple push suffit à chacun.
  whenDeferred(buildCampSearchIndex);
  whenDeferred(buildMonsterSearchIndex);
  whenDeferred(buildLocationSearchIndex);
  whenDeferred(buildAbilitySearchIndex);
  whenDeferred(buildEventSearchIndex);
  whenDeferred(buildNodeSearchIndex);
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
    // Dev/test + dialogue-bark gating parity (data-accuracy audit, dialogue-
    // search finding #1): a hello_/info_ NPC greeting "quest" (isTest+
    // isDialogue) that lives on a map OTHER than the one loaded came in
    // through THIS cross-map path, which — unlike the per-map rich index
    // (buildSearch above) and the map's own quest dense layer — had no
    // isHiddenTest() gate, so searching an NPC name surfaced its empty
    // "Hello X" dialogue fiche by default. The pipeline now stamps isTest/
    // isDialogue onto every search_index.bin quest entry (build_site_data.py
    // build_map_bundles) so the SAME single gate applies here too; revealed
    // with the dev-content toggle exactly like everywhere else.
    if (isHiddenTest(e)) continue;
    const key = `${e.cat}|${e.ref || fold(e.label)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const hex = e.cat === 'quest' ? CATS.quest.hex
      : e.cat === 'npc' ? CATS.npc.hex
        : e.cat === 'qao' ? CATS.qao.hex
          // Coffre placé cross-carte : pas de r complet ici (juste l'entrée
          // légère search_index.bin, sans group/family) — repli neutre
          // décor plutôt qu'un CATS.chest qui n'existe plus (voir
          // DATA_CONTRACT.md §5 : group/family ne sont PAS dans l'index).
          : e.cat === 'chest' ? '#6c757d'
            : e.cat === 'searchable_chest' ? CATS.searchable_chest.hex
              : e.cat === 'workshop' ? CATS.workshop.hex
                : e.cat === 'camp' ? (CAMP_COLORS[e.kind] || '#888') : '#8d99ae';
    // `terms` (quests only, build_site_data.py::_quest_search_terms): a
    // compact localized digest (name + goal actions/labels + item labels +
    // objective keywords). A quest on another map ships NO objectives/
    // goalTexts/journal in the light cross-map index — this single string is
    // the only objective/item text it carries, fed in as one `body` segment
    // so runSearch()'s token matching (bodyMatch) can surface it by objective
    // wording too, not just its title (issue D, cross-map parity with the
    // active map's questSearchBody()).
    const body = e.terms ? [e.terms] : null;
    pushSearchEntry(e.label, e.cat, hex, e.x ?? null, e.z ?? null,
      () => crossMapOpen(e), null, null, null, 0, body, { map: e.map, ref: e.ref });
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

/* Coffres placés (tc_*, S.data.chest — ~3830 marqueurs individuels, chargés
   au critique). Un skin de prop (ex. "Chest barrel elenian 02 grey") se
   répète souvent des centaines de fois à l'identique — indexer chaque
   marqueur ferait des centaines de doublons pour une seule recherche ; une
   seule entrée par NOM DISTINCT (~130) suffit et reste honnête (aucune
   position n'est cachée, juste dédoublonnée). Le libellé affiché utilise le
   nom d'affichage partagé (chestDisplayName, js/config.js — type physique
   localisé, jamais le jeton d'asset d'art brut), préfixé par le libellé de
   catégorie déjà traduit (catLabel('chest')) pour que "coffre" (FR) /
   "chest" (EN) / etc. matche quand même. Plusieurs skins DISTINCTS partagent
   souvent le même type (ex. 7 noms distincts de Barrel sur Kwalat) — donc,
   depuis que le libellé affiché est le type seul, plusieurs entrées peuvent
   désormais se lire pareil (différenciées seulement par leurs coordonnées,
   affichées à droite de chaque ligne). `opts.ref` (clé stable = nom brut,
   jamais affichée) est donc OBLIGATOIRE ici : searchDedupKey retombe sinon
   sur le libellé replié (fold(label)) quand `ref` est absent, et aurait fait
   disparaître silencieusement 6 des 7 skins de Barrel (un seul survit à la
   dédup) — régression détectée en vérifiant ce correctif (voir
   dupe_check.json de la passe de vérif). */
function chestSearchLabel(r) {
  const rest = chestDisplayName(r);
  return rest ? `${catLabel('chest')} — ${rest}` : catLabel('chest');
}
function buildChestSearchIndex() {
  const seen = new Map();
  S.data.chest.forEach(r => { if (!seen.has(r.name)) seen.set(r.name, r); });
  // Clic → surligne TOUTES les instances de ce skin de prop (chaque coffre
  // placé porte son nom exact — 142 « Chest boxes elenian 01 grey »…).
  seen.forEach(r => {
    // `body` : le mot de type localisé ET le jeton anglais brut, chacun son
    // propre segment — une requête "tonneau" (UI fr) ou "barrel" (tapé quelle
    // que soit la langue active) doit matcher tout coffre de type Barrel,
    // même si le libellé affiché (chestSearchLabel, maintenant lui-même le
    // type localisé) ne matche pas déjà tout seul dans une AUTRE langue que
    // celle active. Le sous-libellé affiché (sub) vient du vrai type
    // physique (r.type, classifieur chest_type du pipeline), pas d'une
    // heuristique sur le nom.
    const typeLabel = r.type ? chestTypeLabel(r.type) : null;
    const body = r.type ? [typeLabel, r.type] : null;
    // Couleur RÉELLE (chestHex — camp_chest/décor par famille/legacy, voir
    // config.js) : un skin d'asset donné (r.name) est TOUJOURS de la même
    // group/family, donc homogène pour tout le lot dédupliqué ci-dessus.
    pushSearchEntry(chestSearchLabel(r), 'chest', chestHex(r), r.x, r.z,
      () => showHighlight(S.data.chest.filter(c => c.name === r.name), chestHex(r)),
      null, typeLabel, null, 0, body, { ref: 'chest:' + r.name });
  });
}

/* Coffres fouillables RÉELS (searchable_chests.bin, poi_searchable_chest_* —
   voir DATA_CONTRACT.md §4) : chaque point de spawn a son propre id stable
   (r.k) et sa propre région — contrairement aux placements chest ci-dessus
   (aucun skin répété à dédoublonner), une entrée par point (487) reste
   parfaitement lisible. Clic -> fiche complète (region + note de rareté +
   recette), même que le clic sur le marqueur carte. */
function buildSearchableChestSearchIndex() {
  (S.data.searchable_chest || []).forEach(r => {
    const region = prettyRegion(r.region);
    pushSearchEntry(tr('searchableChestTitle'), 'searchable_chest', CATS.searchable_chest.hex, r.x, r.z,
      () => openSearchableChestFiche(r.k), null, region, null, 0, null, { ref: 'searchable_chest:' + r.k, pinCat: 'searchable_chest' });
  });
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

/* Monstres : DÉDUPLIQUÉS PAR ESPÈCE (task #80, monster-model overhaul part 2
   — site/data/<lang>/species.bin) au lieu d'une entrée par groupe brut (917
   groupes, ex. jusqu'à 14 lignes identiques "Sanglier mammouth maigre" pour
   une seule créature déclinée niveau 3 à 20) OU par modèle (335 -- l'ancien
   axe utilisé ici, plus étroit qu'une espèce : "Troll"/"Mighty Troll"/
   "Overweight Troll" sont 3 modèles DIFFÉRENTS -- CamelCase-glué, voir
   data/SCHEMA.md "Known limitation" -- qui ne partagent pourtant AUCUN nom en
   commun avec le nom canonique, donc ne pouvaient jamais se retrouver l'un
   l'autre par le texte de leur PROPRE titre). Regroupement fait ici sur
   `m.species` (garanti présent sur les 916/916 groupes du build actuel,
   voir data/SCHEMA.md "monster_species.json"). Une seule entrée par espèce,
   avec un indice "N variantes" quand elle couvre plus d'un groupe (name,level)
   (même idiome que "N raretés" pour les objets ci-dessus) ; clic -> fiche
   (openMonsterFiche) ouverte sur le représentant de l'espèce
   (canonicalSiteKey — même règle de richesse que la fiche modèle/l'arbre
   Monstres & faune, voir js/sidebar.js speciesRowLi).
   ALIAS DE RECHERCHE (audit punch #6, "63 lost names") : `species.namesAll`
   liste CHAQUE nom distinct replié dans l'espèce, y compris ceux qu'aucun
   MODÈLE ne partage avec le représentant (ex. "Young Woodraptor"/"Overweight
   Troll"/"Gravecrusher" — rejoints par simple égalité de nom, pas de modèle,
   voir data/SCHEMA.md "monster_species.json" "connected components") :
   auparavant totalement absents de tout titre de recherche (seul le nom du
   REPRÉSENTANT du modèle était indexé), ils sont maintenant chacun leur
   propre segment de corpus (`body`, même mécanisme que questSearchBody plus
   haut) — "young woodraptor" matche via bodyMatch même si le titre affiché
   reste "Woodraptor".
   Monstres isTest (162/917, feature #13) exclus du regroupement par défaut
   -- une espèce 100 % test disparaît alors entièrement de la recherche tant
   que S.devOn est faux. */
function buildMonsterSearchIndex() {
  const bySpecies = new Map();   // species id -> [[key, m], …] (membres VISIBLES seulement)
  for (const [key, m] of Object.entries(S.monsters)) {
    if (isHiddenTest(m)) continue;
    const spId = m.species || key;   // repli défensif -- `species` est garanti sur chaque groupe (voir data/SCHEMA.md)
    let arr = bySpecies.get(spId);
    if (!arr) bySpecies.set(spId, arr = []);
    arr.push([key, m]);
  }
  for (const [spId, members] of bySpecies) {
    members.sort((a, b) => (a[1].level ?? 99) - (b[1].level ?? 99) || a[0].localeCompare(b[0]));
    const sp = S.species[spId];
    const canon = sp?.canonicalSiteKey;
    const rep = (canon && members.find(([k]) => k === canon)) || members[0];
    const [repKey, repM] = rep;
    const sub = [repM.level != null ? tr('levelAbbrev', repM.level) : null, repM.family ? pretty(repM.family) : null]
      .filter(Boolean).join(' · ');
    const variantsSub = members.length > 1 ? tr('monsterVariantsCount', members.length) : '';
    // Dev marker (feature #13) : seulement quand la variante REPRÉSENTATIVE
    // elle-même est isTest. Une espèce MIXTE (ex. boarmammoth_albion :
    // niveaux réels + quelques skins SkinTest annexes) garde un représentant
    // non-test et n'affiche donc PAS ce badge ici — les variantes de test
    // restent marquées individuellement dans la fiche (voir fiches.js
    // monsterVariantPickHtml), jamais étiqueter toute une créature "Test" à
    // cause d'un seul reskin.
    const devSub = repM.isTest ? tr('devBadge') : '';
    // Alias namesAll -- exclut le nom du représentant lui-même (déjà le
    // titre affiché, un doublon dans `body` serait sans effet mais inutile).
    const aliases = (sp?.namesAll || []).filter(nm => fold(nm) !== fold(repM.name));
    pushSearchEntry(repM.name, 'monster', MONSTER_HEX, null, null, () => openMonsterFiche(repKey),
      repM.icon ? `icons/${repM.icon}` : null, [sub, variantsSub, devSub].filter(Boolean).join(' · '), '🐾',
      0, aliases.length ? aliases : null);
  }
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

/* Nœuds de récolte (#81, S.nodes -- 30 types gn_*, chargés en différé comme
   S.abilities/S.locations ci-dessus) : pas de position (aucun lien nœud->point
   n'existe côté client, voir data.js/state.js) -- fiche seule (openNodeFiche),
   comme une capacité nommée. Sous-libellé = palier + métier ; le nom affiché
   pour un nœud `generic:true` (9/30) est déjà le repli honnête posé par le
   pipeline (pretty(clé), voir nodes.json) -- la pastille "unknown" explicite
   vit sur SA FICHE (openNodeFiche), jamais dupliquée ici en un badge "Test"
   qui mentirait sur la nature du contenu (réel, juste non localisé). */
function buildNodeSearchIndex() {
  Object.entries(S.nodes || {}).forEach(([key, n]) => {
    const sub = [n.tier || null, n.prof ? professionLabel(n.prof) : null].filter(Boolean).join(' · ');
    pushSearchEntry(n.name, 'node', nodeHex(n), null, null, () => openNodeFiche(key), null, sub, '🌿');
  });
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

/* Anneau conique multi-rareté (design pass, multi-rarity search rows) : un
   camembert CSS pur (aucun timer/boucle JS) des N couleurs RÉELLES
   (rarityGroupSwatches, ordre canonique déjà trié) autour de l'icône d'un
   résultat groupé -- voir style.css `.sr-icon-ring` pour le seul mouvement au
   REPOS (léger agrandissement + halo au survol d'UNE ligne à la fois, jamais
   une boucle qui tournerait en continu dans une liste qui peut compter
   plusieurs entrées multi-rareté). Segments à bord dur (deux valeurs de
   %/deg identiques par frontière, pas de dégradé) : chaque quartier reste
   une couleur plate et lisible même à 20px. */
function ringGradient(swatches) {
  const n = swatches.length;
  const step = 360 / n;
  const stops = swatches.map((s, i) => `${s.hex} ${(i * step).toFixed(2)}deg ${((i + 1) * step).toFixed(2)}deg`);
  return `conic-gradient(${stops.join(', ')})`;
}
/* Calques de survol (hover-cycle, design pass "sliced ring crossfade") : un
   `<span class="sr-var">` par variante, empilés en position absolute par-
   dessus l'icône de base (voir style.css .sr-var) -- opacité 0 au repos
   (AUCUNE règle d'animation hors :hover/.active, coût idle strictement nul),
   et sous #search-results li:hover/.active un fondu-enchaîné CSS pur cycle
   chaque variante ~0.9s (voir @keyframes sr-cycle-n2..n5). Chaque calque
   porte SA PROPRE icône (s.icon, rarity.js rarityGroupSwatches) : sur les 3
   groupes à art distinct par palier (ex. synthesis_item_upgrade_t1_*) l'image
   change vraiment ; sur les 10 autres (même image pour toutes les raretés)
   c'est la même icône que la base mais la teinte --vc (couleur RARITY de
   cette variante) continue de défiler par-dessus -- l'effet reste donc
   significatif pour les 13 groupes, pas seulement les 3 à art distinct.
   `--n`/`--i` (nombre de variantes / index dans l'ordre canonique) pilotent
   respectivement le choix de la classe sr-var-nN (voir pourquoi dans
   style.css -- les % d'un @keyframes ne peuvent pas dépendre d'une variable
   CSS, un jeu de keyframes par N distinct est donc généré à l'avance) et le
   délai de démarrage de CE calque dans le cycle. */
function variantLayers(it) {
  const swatches = it.ring;
  const n = swatches.length;
  return swatches.map((s, i) => {
    const img = iconTag(s.icon ? `icons/${s.icon}` : null, 'sr-icon', it.glyph);
    return `<span class="sr-var sr-var-n${n}" style="--vc:${s.hex};--i:${i}">${img}</span>`;
  }).join('');
}
/* Icône + anneau si l'entrée est un représentant multi-rareté (it.ring, voir
   pushSearchEntry), icône seule sinon -- comportement/markup inchangés pour
   tout le reste de la recherche (objets à rareté unique compris). `title`
   (libellés de rareté localisés, ex. "Peu commun · Rare · Épique") donne le
   même renseignement que l'anneau à qui ne peut pas distinguer les couleurs
   (lecteur d'écran/survol), en plus du sous-libellé "N raretés" déjà affiché
   à côté -- la couleur n'est jamais le SEUL canal d'info. L'état statique
   (repos, ce bloc seul) reste EXACTEMENT le camembert conique existant :
   les calques de survol (variantLayers) sont ajoutés dans le markup mais
   n'ont aucun effet visuel tant que #search-results li:hover/.active ne les
   active pas côté CSS (voir style.css .sr-var) -- rien ne change pour qui ne
   survole/active jamais la ligne. */
function iconWithRing(it) {
  const img = iconTag(it.icon, 'sr-icon', it.glyph);
  if (!it.ring || it.ring.length < 2) return img;
  const title = it.ring.map(s => rarityLabel(s.rarity)).join(' · ');
  return `<span class="sr-icon-ring" style="--ring-grad:${ringGradient(it.ring)}" title="${esc(title)}">${img}${variantLayers(it)}</span>`;
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
      ${iconWithRing(it)}
      <span class="sr-label">${esc(it.label)}</span>
      ${mapBadge}
      <span class="muted">${it.x != null ? fmtCoord(it.x, it.z) : esc(it.sub || '')}</span>
    </div>${hint}`;
    li.onclick = () => {
      pushFocusState();   // avant mutation — voir pushFocusState()'s doc
      resBox.hidden = true; $('#search').value = it.label;
      const focus = () => {
        if (it.x != null) goTo(it.x, it.z, 3, it.label, it.pinCat ? { cat: it.pinCat } : null);
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
