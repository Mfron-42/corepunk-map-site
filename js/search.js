/* Kwalat — recherche : index riche (carte active + catalogues globaux),
   index cross-carte, score flou (préfixe/sous-chaîne/1-2 fautes), corpus
   de déroulé de quête, et rendu de la liste de résultats. */
import { S } from './state.js';
import {
  CATS, CAMP_COLORS, MONSTER_HEX, ZONE_HEX, LOCATION_HEX, ABILITY_HEX, EVENT_HEX, RECIPE_HEX, nodeHex,
  campLabel, campQualifierLabel, chestTypeLabel, chestDisplayName, chestHex, prettyRegion,
  rarityLabel, itemKindLabel, weaponTypeLabel, professionLabel, familyKey,
  locationKindLabel, mapName, entityColor,
} from './config.js';
import { $, esc, fmtCoord, fold, iconTag, initials, itemGlyph, npcIconUrl, pretty } from './utils.js';
import { tr, tbl, numberLocale } from './i18n/index.js';
import { map, toLL, toggleZones, showHighlight } from './mapview.js';
import { pushFocusState } from './urlstate.js';
import { addLocatePin, removeLocatePin } from './pins.js';
import { ref, locateRefKey } from './mapref.js';
import { whenDeferred } from './data.js';
import {
  itemColor, openNpcFiche, openQuestFiche, openItemFiche,
  openMonsterFiche, openFamilyFiche, openLocationFiche, openAbilityFiche, openSearchableChestFiche,
  openRecipeFiche, openNodeFiche, openWildlifeFiche, openRegionFiche,
  openTalentFiche, openSpecFiche, openProfessionFiche,
} from './fiches.js';
import { regionFicheExists } from './fiches/zone.js';
import { TALENT_HEX, SPEC_HEX, PROFESSION_HEX } from './fiches/build.js';
import { isDeprecatedItem, rarityGroupFor, rarityGroupSwatches } from './rarity.js';
import { isHiddenTest } from './devcontent.js';
import { switchMap } from './multimap.js';
import { buildFilters } from './sidebar.js';
import { speciesPoints, monsterFamilies } from './pointsets.js';
import { activateSpeciesLayer, activateFamilyLayers, activateCategoryNode } from './layeractivate.js';

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
  // Famille (mission "search activation" 2026-07-11) : PAS un monstre précis
  // — un nœud FAMILLE de l'arbre (2e barreau de l'échelle de précision,
  // COORDINATION.md). Glyphe distinct du 🐾 espèce, la puce catégorie
  // (searchCatLabel, "Famille"/"Family"…) porte l'essentiel de la
  // distinction visuelle (voir buildFamilySearchIndex/renderSearch).
  family: '🧬',
  // Build (E'c-8, blueprint §1.2 opt L3) : talent/spécialisation/métier —
  // recherche + fiche seulement, jamais une couche carte (aucune position,
  // voir fiches/build.js). 3 glyphes distincts, aucune collision avec les
  // glyphes ci-dessus (workshop garde 🛠, chest garde 🧰).
  talent: '🧩', specialization: '🎭', profession: '⚒',
  // Nœud GÉNÉRIQUE de l'arbre de filtres (mission "search categories"
  // 2026-07-11c — kind de camp/décor/type de POI/bucket Interactables…) :
  // AUCUNE clé i18n searchCat.catnode n'existe (et n'en ajoute pas ici,
  // consigne "no new i18n strings" — un nœud d'arbre n'a de toute façon
  // pas de nom de catégorie unique traduit : Bois/Coffres/Destructibles…
  // sont chacun un LIBELLÉ DE LIGNE, pas une catégorie). Ce glyphe sert à
  // la fois d'icône de repli (voir iconWithRing) et de repli de PUCE (voir
  // searchCatLabel juste en dessous) — jamais un mot anglais codé en dur.
  catnode: '🗂',
};
/* Repli glyphe (jamais le jeton brut de catégorie — c'est exactement le
   relic sweep "chest —" documenté plus haut dans ce fichier) : chaque cat
   déjà existante a sa traduction dans les 5 dictionnaires (vérifié), donc
   ce repli ne joue QUE pour 'catnode' ci-dessus. */
const searchCatLabel = key => tbl('searchCat', key) || CAT_GLYPH[key] || key;

/* Poids de CHAMP du corpus secondaire (`body`, mission "search quality"
   2026-07-11d) : remplace l'ancien plancher binaire unique (+1000, "titre ou
   +1000") par deux paliers explicites, appliqués UNIFORMÉMENT à toute
   catégorie (quêtes ET objets, plus les corpus déjà existants -- alias de
   monstre/type de coffre/digest cross-carte de quête, tous re-classés ALIAS
   ci-dessous puisqu'ils sont chacun un NOM ALTERNATIF, jamais un texte
   descriptif) :
     ALIAS (80)  -- un autre NOM/LIBELLÉ pour la même entité : donneur de
                    quête (q.giver), libellé de but court (q.goalTexts, ex.
                    "Return to Furr"), archétype d'objet (it.archetype, ex.
                    "Brain Imp Executioner" -- clé de désambiguïsation entre
                    objets de quête homonymes, data/SCHEMA.md), mot de type de
                    coffre, alias de monstre (species.namesAll), digest de
                    quête cross-carte (déjà surtout des libellés, voir
                    pipeline's _quest_search_terms).
     PROSE (400) -- texte descriptif/narratif LIBRE : objectif de quête
                    (q.objectives), résumé de journal (q.journal), texte de
                    saveur d'objet (it.desc). Moins spécifique qu'un alias
                    (un mot y apparaît "en passant", pas comme LE nom de la
                    chose), donc pénalisé davantage.
   Les deux paliers restent TOUJOURS pires que le pire score de titre
   plausible (biais max 2.4×5=12 + ~4 par jeton flou, très en dessous de 80
   même avec plusieurs jetons) -- un match de TITRE bat toujours un match de
   corpus secondaire, quel que soit son champ (règle de tri inchangée,
   vérifiée par _verify_search_quality.mjs "ranking sanity"). */
const BODY_WEIGHT = { ALIAS: 80, PROSE: 400 };

/* Jetons-TYPE de requête (mission "search quality" 2026-07-11d, demande #3) :
   quand le TOUT PREMIER jeton d'une requête à ≥2 mots nomme exactement une
   catégorie (quest/quête, item/objet, monster/monstre, npc/pnj, zone, camp,
   recipe/recette, family/famille -- alias FR/EN garantis, RU/UK/ES en
   best-effort, même table technique JAMAIS AFFICHÉE que KIND_TOKEN_ALIASES
   ci-dessous), ce jeton est CONSOMMÉ (retiré des jetons qui matchent un nom
   d'entité, jamais flou-matché lui-même) et sert seulement à BOOSTER cette
   catégorie dans le tri des résultats du reste de la requête -- "quest
   scrag" fait remonter les QUÊTES mentionnant "scrag" avant tout objet/
   monstre qui matcherait aussi "scrag", sans pour autant les faire
   disparaître (boost, pas filtre dur -- voir runSearch's BOOST_PARTITION).
   Requête à un seul mot ("quest" tapé seul) : PAS de consommation (garde
   left tokens.length>1 dans runSearch) -- aucun risque de régression sur une
   recherche littérale existante d'un mot qui se trouve aussi être un jeton-
   type (ex. "camp" tout seul reste une recherche plein-texte normale, comme
   avant cette passe). Match EXACT requis sur le jeton lui-même (jamais flou/
   préfixe) : "monst" en cours de frappe ne déclenche rien tant que
   "monster"/"monstre" n'est pas complet, aucun faux déclenchement. */
const KIND_QUERY_ALIASES = {
  quest: ['quest', 'quete', 'quête', 'квест', 'mision', 'misión'],
  item: ['item', 'objet', 'предмет', 'objeto'],
  monster: ['monster', 'monstre', 'монстр', 'monstruo'],
  npc: ['npc', 'pnj', 'нпс'],
  zone: ['zone', 'зона', 'zona'],
  camp: ['camp', 'лагерь', 'табір', 'campamento'],
  recipe: ['recipe', 'recette', 'рецепт', 'receta'],
  family: ['family', 'famille', 'семья', "сімя", 'familia'],
  // Build (E'c-8, blueprint §1.2 opt L3) : mêmes alias multilingues À LA MAIN
  // que la table ci-dessus (jamais une clé i18n — cette table technique
  // n'est jamais affichée, voir la doc de tête du fichier).
  talent: ['talent', 'талант'],
  specialization: ['specialization', 'spec', 'spécialisation', 'специализация', 'спеціалізація', 'especialización'],
  profession: ['profession', 'métier', 'metier', 'профессия', 'професія', 'profesión'],
};
const KIND_QUERY_TOKEN_TO_CAT = new Map();
for (const [cat, words] of Object.entries(KIND_QUERY_ALIASES))
  for (const w of words) KIND_QUERY_TOKEN_TO_CAT.set(fold(w), cat);

let searchIndex = [];
/* Compteur de version (mission "search quality" 2026-07-11d) : bumpé à
   chaque pushSearchEntry -- sert à invalider paresseusement l'index de
   candidats flous (ensureFuzzyBuckets) sans le reconstruire à CHAQUE frappe,
   seulement quand l'index change réellement (nouveau lot différé, bascule
   de carte/langue). Compteur monotone -- jamais réinitialisé, même quand
   `searchIndex = []` repart de zéro (buildSearch) : un futur rebuild qui
   retomberait par coïncidence sur le même NOMBRE final d'entrées ne serait
   donc jamais pris pour "déjà à jour". */
let searchIndexVersion = 0;
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
   = carte active : jamais de badge ni de bascule pour eux, toujours dispo.
   `keyTokens` (facultatif, mission "search categories" 2026-07-11c) : mots
   supplémentaires unis au libellé DANS `n`/`words` eux-mêmes (le corpus de
   matching PREMIER NIVEAU déjà utilisé pour le titre) plutôt que poussés via
   `body` (corpus SECONDAIRE, toujours pénalisé +1000 et donc noyé dès qu'une
   requête a ≥24 meilleurs matches ailleurs — vérifié : la clé moteur brute
   d'un nœud d'arbre (ex. `logging`/alias "wood") n'est pas du texte
   accessoire, c'est un AUTRE NOM de la même ligne, au même titre que son
   libellé affiché — jamais affiché nulle part (n'apparaît dans aucun champ
   RENDU de l'entrée), seulement dans le corpus de correspondance. Aucun
   changement pour tout appelant existant (keyTokens absent = comportement
   identique à avant cette option, un simple fold(label)). */
function pushSearchEntry(label, cat, hex, x, z, open, icon, sub, glyph, bias, body, opts) {
  const keyTokens = (opts && opts.keyTokens) || null;
  const n = keyTokens && keyTokens.length ? fold([label, ...keyTokens].join(' ')) : fold(label);
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
    // `ctx` (facultatif, mission "search activation" 2026-07-11) : ligne de
    // CONTEXTE secondaire ("Famille Wolf · 4 camps · 926 pts") — jamais
    // empilée dans le libellé muted à droite (qui reste court, voir
    // style.css `#search-results .muted { white-space:nowrap }` — un
    // débordement horizontal est un risque réel avec famille+points
    // concaténés là), rendue comme une seconde ligne dédiée par
    // renderSearch() (même style que .sr-hint). Posé par
    // buildMonsterSearchIndex (contexte famille d'une espèce du catalogue)
    // ci-dessous ; null partout ailleurs, aucun changement visuel pour eux.
    ctx: (opts && opts.ctx) || null,
  };
  // `body[i]` accepte soit une chaîne brute (repli historique -- coffres/
  // alias de monstre/digest de quête cross-carte, voir BODY_WEIGHT plus bas :
  // ce sont tous des SYNONYMES/NOMS alternatifs, jamais de la prose, d'où le
  // repli au palier ALIAS), soit `{text, weight}` explicite (quêtes/objets,
  // mission "search quality" 2026-07-11d -- palier de champ choisi par
  // l'appelant, voir questSearchBody/itemSearchBody). `weight` remplace
  // l'ancien plancher fixe +1000 : un score de corpus secondaire est
  // désormais `weight + score-de-jetons`, jamais confondu avec le palier
  // TITRE (n/words, poids 0) quel que soit le champ -- voir runSearch.
  if (body && body.length) {
    entry.body = body.filter(Boolean).map(s => {
      const text = typeof s === 'string' ? s : s.text;
      const weight = typeof s === 'string' ? BODY_WEIGHT.ALIAS : s.weight;
      const bn = fold(text);
      return { text, n: bn, words: bn.split(' '), weight };
    });
  }
  searchIndex.push(entry);
  searchIndexVersion++;
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
  const out = [];
  // Donneur (q.giver) : jamais indexé pour la quête avant cette passe (mission
  // "search quality" 2026-07-11d, field-weighted scoring) -- chercher le nom
  // du PNJ qui donne une quête trouve maintenant aussi la quête elle-même,
  // pas seulement l'entrée PNJ séparée.
  if (q.giver) out.push({ text: q.giver, weight: BODY_WEIGHT.ALIAS });
  for (const t of (q.goalTexts || [])) out.push({ text: t, weight: BODY_WEIGHT.ALIAS });
  for (const t of (q.objectives || [])) out.push({ text: t, weight: BODY_WEIGHT.PROSE });
  if (q.journal) out.push({ text: q.journal, weight: BODY_WEIGHT.PROSE });
  return out;
}
/* Corpus secondaire d'un OBJET (mission "search quality" 2026-07-11d) :
   archétype (it.archetype -- clé de désambiguïsation entre objets de quête
   homonymes, ex. "Brain Imp Executioner" pour un "Imp Brain" parmi 3, voir
   data/SCHEMA.md/pipeline build_site_data.py) et texte de saveur
   (it.desc). AUCUN des deux n'était indexé du tout avant cette passe (le
   push d'objet plus bas passait toujours `body=null`) -- 459/6542 objets ont
   un archétype, 357/6542 une description (mesuré sur items.bin EN). Même
   distinction ALIAS/PROSE que questSearchBody ci-dessus : l'archétype est un
   NOM alternatif court (même nature qu'un alias de monstre), la description
   un texte de saveur libre. */
function itemSearchBody(it) {
  const out = [];
  if (it.archetype) out.push({ text: it.archetype, weight: BODY_WEIGHT.ALIAS });
  if (it.desc) out.push({ text: it.desc, weight: BODY_WEIGHT.PROSE });
  return out;
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
  // Icône = le PORTRAIT PROPRE du PNJ (npcIconUrl, exactement la même source
  // que sa fiche/popup/puce — voir utils.js), plus le glyphe d'initiales en
  // repli honnête : un résultat de recherche montre donc l'icône DE CETTE
  // entité, jamais une générique ni celle d'un voisin (owner : "en tapant un
  // nom je tombe sur la MAUVAISE icône"). r.icon absent -> null -> initiales.
  // La puce de catégorie d'une ligne de recherche = le TAG de kind : elle porte
  // l'ANCRE du kind (entityColor(cat, null), LA source unique — byte-égale à
  // CATS[cat].hex), exactement comme la pilule d'une réf à deux tons ; l'identité
  // de l'entité est portée par son icône/portrait + son nom, pas par la puce.
  S.data.npc.forEach((r, i) => push(r.name, 'npc', entityColor('npc', null), r.x, r.z, () => openNpcFiche(i),
    npcIconUrl(r.icon), r.x == null ? tr('posUnknown') : null, initials(r.name), 0, null, { pinCat: 'npc' }));
  S.data.poi.forEach(r => push(r.name, 'poi', entityColor('poi', null), r.x, r.z, null, null, null, null, 0, null, { pinCat: 'poi' }));
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
    push(q.name, 'quest', entityColor('quest', null), q.x, q.z, () => openQuestFiche(q.slug),
      null, q.x == null ? tr('questNoPos') : null, null, 0, questSearchBody(q), { map: q.map, ref: q.slug, pinCat: 'quest' });
  });
  S.data.qao.forEach(r => { if (!isHiddenTest(r)) push(r.name, 'qao', entityColor('qao', null), r.x, r.z, null, null, null, null, 0, null, { pinCat: 'qao' }); });
  S.data.workshop.forEach(r => push(r.name, 'workshop', entityColor('workshop', null), r.x, r.z, null, null, null, null, 0, null, { pinCat: 'workshop' }));
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
      itemGlyph(it), itemBias(key, it), itemSearchBody(it), ring ? { ring } : null);
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
  // Familles + faune/creeps (mission "search activation" 2026-07-11) :
  // mêmes gardes deferredReady (S.species/S.wildlifeSpecies arrivent avec
  // ce même lot) — voir buildFamilySearchIndex/buildWildSpeciesSearchIndex.
  whenDeferred(buildFamilySearchIndex);
  whenDeferred(buildWildSpeciesSearchIndex);
  // Nœuds de l'arbre de filtres (mission "search categories" 2026-07-11c) :
  // même garde deferredReady que les builders ci-dessus (le DOM des
  // groupes Harvesting/Interactables/Monsters n'est complet qu'une fois
  // camps.bin arrivé, voir sidebar.js rebuildAllGroups) — sa propre
  // whenDeferred() entre TOUJOURS après celle de buildFilters() (appelé
  // avant buildSearch() partout, voir main.js), donc le DOM est déjà à
  // jour au moment de ce scan (voir buildCategorySearchIndex's doc).
  whenDeferred(buildCategorySearchIndex);
  whenDeferred(buildLocationSearchIndex);
  whenDeferred(buildAbilitySearchIndex);
  whenDeferred(buildEventSearchIndex);
  whenDeferred(buildNodeSearchIndex);
  // Build (E'c-8, opt L3) : mêmes 3 bins que data.js charge en différé
  // (talents/specializations/professions.bin, 404-tolérants) -- whenDeferred
  // les attend exactement comme les autres catalogues globaux ci-dessus.
  whenDeferred(buildTalentSearchIndex);
  whenDeferred(buildSpecSearchIndex);
  whenDeferred(buildProfessionSearchIndex);
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
    // Camp d'une autre carte : les entrées search_index expédient désormais
    // le nom PROPRE + `qualifier` (pipeline pass 2026-07-11b, 8 entrées île)
    // — même suffixe texte localisé que campSearchLabel ci-dessous.
    const label = (e.cat === 'camp' && e.qualifier)
      ? `${e.label} — ${campQualifierLabel(e.qualifier)}` : e.label;
    pushSearchEntry(label, e.cat, hex, e.x ?? null, e.z ?? null,
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
   position n'est cachée, juste dédoublonnée). Le libellé affiché est le nom
   d'affichage partagé SEUL (chestDisplayName, js/config.js — type physique
   localisé, jamais le jeton d'asset d'art brut) : la puce de catégorie
   affiche déjà "Coffre"/"Chest"/… (searchCat.chest, INCHANGÉE) — préfixer le
   libellé du même mot ferait doublon, comme aucune autre catégorie de cette
   liste ne le fait (un PNJ ne s'affiche jamais "PNJ — Bob").
   RELIC SWEEP (mission "search activation" 2026-07-11, #2) : ce libellé
   préfixait auparavant chaque entrée avec `catLabel('chest')` — une clé
   i18n (`cat.chest`) RETIRÉE de toutes les locales quand l'ancienne couche
   unifiée CATS.chest a été scindée en `searchable_chest`/`camp_chest` (voir
   config.js, DATA_CONTRACT.md §1/§3.1). `catLabel()` n'a alors plus de
   traduction à trouver et retombe sur la clé BRUTE, si bien que les 132
   entrées dédupliquées de cette couche affichaient un "chest —" anglais en
   dur au-devant du libellé — dans TOUTES les locales, y compris FR/RU/UK/ES
   (repli silencieux passé inaperçu car "chest" reste un mot anglais
   plausible en EN). Purgé ici : la fonction ne référence plus aucune clé
   morte. Plusieurs skins DISTINCTS partagent souvent le même type (ex. 7
   noms distincts de Barrel sur Kwalat) — donc plusieurs entrées peuvent se
   lire pareil (différenciées seulement par leurs coordonnées, affichées à
   droite de chaque ligne). `opts.ref` (clé stable = nom brut, jamais
   affichée) est donc OBLIGATOIRE ici : searchDedupKey retombe sinon sur le
   libellé replié (fold(label)) quand `ref` est absent, et aurait fait
   disparaître silencieusement 6 des 7 skins de Barrel (un seul survit à la
   dédup) — régression détectée en vérifiant ce correctif (voir
   dupe_check.json de la passe de vérif). */
function chestSearchLabel(r) {
  return chestDisplayName(r);
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

/* Libellé de recherche d'un camp : nom d'affichage partagé (campLabel,
   js/config.js — LE formateur unique : nom EXPÉDIÉ propre + sous-type CUIT
   g.subtype (ontology chunk 2 — type de contenant localisé + reste de clé,
   pour que "carotte"/"tonneau"/"pot"/"champignon" trouvent quelque chose))
   + suffixe qualificatif TEXTE (— Patrouille / — Renforcé (PvP)) quand le
   groupe en porte un (l'entrée de recherche est du texte plat, pas un chip
   HTML — même contenu, autre support). Seule spécificité recherche : les 5
   camps "for-delete-*" (restes de dev) sont exclus de l'index entièrement
   (exclusion morte pour les bins racine — le pipeline ne les expédie plus —
   mais gardée en défense, la donnée canonique les garde et un futur bundle
   pourrait fuiter). */
function campSearchLabel(g) {
  if (g.k.includes('for-delete')) return null;   // reste de dev — exclu de la recherche
  const base = campLabel(g.k, g.kind, g.name, g.subtype);
  return g.qualifier ? `${base} — ${campQualifierLabel(g.qualifier)}` : base;
}

/* Entrées « Camp » ajoutées à l'index une fois camps.json arrivé (chargement
   différé) — le tableau searchIndex est déjà branché sur la barre de
   recherche, un simple push suffit. */
function buildCampSearchIndex() {
  Object.values(S.camps).forEach(st => st.groups.forEach(g => {
    if (!g.pts.length) return;
    const label = campSearchLabel(g);
    if (label == null) return;
    // Clic → surligne TOUS les points du groupe (pas seulement le premier) :
    // « montre-moi toutes les caisses de maïs », voir showHighlight.
    pushSearchEntry(label, 'camp', CAMP_COLORS[g.kind] || '#888', g.pts[0][0], g.pts[0][1],
      () => showHighlight(g.pts.map(([x, z]) => ({ x, z })), CAMP_COLORS[g.kind] || '#888'));
  }));
}

/* Régions nommées (zones_geo.json, chargé au critique — voir loadCritical) :
   clic -> OUVRE la fiche RÉGION (vague E'c-R : openRegionFiche, contenu inversé
   du polygone + focus du contour) quand une région cataloguée porte ce nom
   (regionFicheExists — zones_contents.bin) ; sinon repli honnête sur l'ancien
   comportement (zoom sur les anneaux réels + activation de la couche « Zones »)
   pour une région tracée sans contenu inversé catalogué. Une zone est ainsi
   trouvable par NOM et ouvre sa fiche (blueprint §1.1 « adds zone kind »). */
function buildZoneSearchIndex() {
  S.zonesGeo.forEach(z => {
    if (!z.rings?.length) return;
    pushSearchEntry(z.name, 'zone', ZONE_HEX, null, null, () => {
      if (regionFicheExists(z.name)) { openRegionFiche(z.name); return; }
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
    // Niveau seul ici — le contexte famille+camps migre vers `ctx` (seconde
    // ligne dédiée) ci-dessous, mission "search activation" : le répéter
    // aussi ici ferait doublon (voir la doc `ctx` de pushSearchEntry).
    const sub = repM.level != null ? tr('levelAbbrev', repM.level) : '';
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
    // Contexte famille + camps (mission "search activation" 2026-07-11 —
    // « Species rows show their family context ») : "Famille Wolf · 4 camps
    // · 926 pts", résolu par le résolveur UNIQUE (pointsets.js speciesPoints,
    // actif-carte, JAMAIS re-dérivé) — exactement la même donnée que la
    // ligne espèce de l'arbre (sidebar.js speciesRowLi's `res`), les deux
    // surfaces s'accordent donc toujours.
    const res = speciesPoints(spId);
    const campsCtx = res ? tr('speciesCampsPts', res.nCamps, res.nPts.toLocaleString(numberLocale())) : tr('speciesZeroCamps');
    const ctx = repM.family ? `${tr('speciesFamilyOf', pretty(repM.family))} · ${campsCtx}` : campsCtx;
    // Clic-double-effet (même modèle EXACT que les chips d'entité de
    // fiche/quête, décision utilisateur COORDINATION.md — étendu ici à la
    // recherche, mission "search activation") : ouvre la fiche ET coche le
    // nœud ESPÈCE de l'arbre (auto-dépliage de sa famille) quand un
    // point-set existe (js/layeractivate.js activateSpeciesLayer, résolveur
    // d'orchestration PARTAGÉ avec main.js — jamais une seconde composition
    // du même geste) ; sinon fiche seule, comme avant cette passe — le clic
    // n'est jamais mort.
    const open = () => {
      openMonsterFiche(repKey);
      if (res) activateSpeciesLayer(spId);
    };
    // Vignette (monster portraits investigation, avenue 2+3 — 78/224
    // espèces, species.bin `portrait`) : PRIME sur l'icône de variante
    // (repM.icon, souvent absente/générique) quand elle existe — même
    // convention `icons/<chemin>` que tout le reste (it.icon/repM.icon
    // ci-dessus/ci-dessous), le champ porte déjà son propre sous-dossier
    // (monsters/…, quelques items/… pour les portraits résolus via un nom
    // d'objet partagé — voir data/SCHEMA.md §monster_species). 146/224
    // espèces n'en ont encore aucune : repli honnête sur repM.icon puis le
    // glyphe 🐾, exactement comme avant cette passe.
    const icon = sp?.portrait ? `icons/${sp.portrait}` : (repM.icon ? `icons/${repM.icon}` : null);
    pushSearchEntry(repM.name, 'monster', MONSTER_HEX, null, null, open,
      icon, [sub, variantsSub, devSub].filter(Boolean).join(' · '), null,
      0, aliases.length ? aliases : null, { ctx });
  }
}

/* Familles de monstres (mission "search activation" 2026-07-11 — grain 2 de
   l'échelle de précision, COORDINATION.md) : une entrée par famille du
   CATALOGUE GLOBAL (S.species, post-alias familyKey — même univers que
   buildMonsterSearchIndex ci-dessus), qu'elle ait ou non des camps joints
   sur la carte active — même honnêteté « 0 camp » que la ligne famille de
   l'arbre (sidebar.js familyRowLi/l'arbre EST le bestiaire) : une famille
   sans camp ICI reste listée, jamais absente de la recherche parce qu'elle
   n'aurait rien à activer sur cette carte précise. Comptage RÉEL tiré du
   résolveur UNIQUE (pointsets.js monsterFamilies, jamais re-dérivé) pour les
   familles jointes ; complété par un simple parcours du catalogue pour les
   familles sans camp (aucun join ici, juste une énumération de noms).
   Le clic fait DEUX choses (même double effet qu'une ligne espèce, section (2)
   du harness search_activation) : (a) il OUVRE la fiche famille (openFamilyFiche
   — le roster des membres + le toggle de couche en pastille d'en-tête ; cette
   fiche EXISTE depuis chunk (e), l'ancien commentaire « aucune fiche famille »
   était périmé), et (b) il coche la ligne FAMILLE de l'arbre (cascade toutes
   ses espèces) + la révèle, EXACTEMENT le même geste que le chip family-layer
   d'une étape de quête (js/layeractivate.js activateFamilyLayers, résolveur
   d'orchestration PARTAGÉ — jamais une deuxième implémentation du même clic).
   Visuellement DISTINCT d'une ligne
   espèce (demande mission #1, « visually distinct row stating it's a family
   filter ») : même hue MONSTRE (uniformité demandée, #3) mais une puce de
   catégorie dédiée (searchCat.family, « Famille »/« Family »…) + un glyphe
   dédié (CAT_GLYPH.family) + une classe de ligne dédiée (voir renderSearch,
   style.css .sr-family-row) — jamais une seconde couleur qui romprait l'axe
   couleur = nature d'entité (ONTOLOGY.md #39, config.js ecAttr). */
function familySearchRows() {
  const camped = new Map(monsterFamilies().map(f => [f.family, f]));
  const rows = [...camped.values()];
  const seen = new Set(camped.keys());
  for (const sp of Object.values(S.species || {})) {
    if (isHiddenTest(sp)) continue;
    const fam = familyKey(sp.family || 'other');
    if (seen.has(fam)) continue;
    seen.add(fam);
    rows.push({ family: fam, nCamps: 0, nPts: 0 });
  }
  return rows;
}
function buildFamilySearchIndex() {
  for (const f of familySearchRows()) {
    const sub = f.nPts ? tr('speciesCampsPts', f.nCamps, f.nPts.toLocaleString(numberLocale())) : tr('speciesZeroCamps');
    pushSearchEntry(pretty(f.family), 'family', MONSTER_HEX, null, null,
      () => { activateFamilyLayers([f.family]); openFamilyFiche(f.family); }, null, sub, null, 0, null, { ref: 'family:' + f.family });
  }
}

/* Faune (wildlife_species.bin, catalogue GLOBAL 25 espèces SANS record
   species.bin — ONTOLOGY.md #11) : mission "search activation" —
   « searching dinde/turkey surfaces the creeps species similarly ».
   Le clic OUVRE désormais une VRAIE FICHE (fiches.js openWildlifeFiche) — ces
   espèces ont une page (nom + famille + méthode de dépeçage + BUTIN) : avant
   ce correctif, un clic sur « Green Turtle » n'ouvrait RIEN (activateSpeciesLayer
   seul, aucun point pour les 19 espèces 0-camp → mutation muette). L'affordance
   carte n'est pas perdue : la fiche porte la pastille ESPÈCE (couche de spawn)
   pour les espèces campées et le pool « Animaux paisibles » pour les 0-camp
   (localisation honnête par ZONE). Comptage du sous-libellé via le résolveur
   UNIQUE (pointsets.js speciesPoints, ACTIF-CARTE) : jamais re-dérivé depuis les
   champs `camps`/`pts` de wildlife_species.bin, qui listent TOUTES les cartes.
   Même hue/chip que les espèces catalogue (cat 'monster', uniformité #3) — ce
   sont des créatures au même titre. */
function buildWildSpeciesSearchIndex() {
  for (const [id, w] of Object.entries(S.wildlifeSpecies || {})) {
    const res = speciesPoints(id);
    const sub = res ? tr('speciesCampsPts', res.nCamps, res.nPts.toLocaleString(numberLocale())) : tr('wildlifeZeroCamps');
    pushSearchEntry(w.name, 'monster', MONSTER_HEX, null, null,
      () => openWildlifeFiche(id), null, sub, null, 0, null, { ref: 'wildsp:' + id });
  }
}

/* Alias explicites de jeton moteur -> mots anglais courants qui ne
   s'épellent PAS dans le slug brut (mission "search categories"
   2026-07-11c, exigence explicite du harnais : taper "wood" doit trouver
   "Bois" en FR via la clé — le kind moteur RÉEL est `logging`
   (campKind.logging), jamais `wood`, voir config.js/i18n campKind). Table
   TECHNIQUE À LA MAIN, jamais affichée nulle part (nourrit seulement le
   corpus `body` ci-dessous, même mécanisme que les alias `namesAll` des
   monstres plus haut) — PAS une chaîne i18n (aucune traduction nouvelle,
   aucun texte montré à l'écran). Étendre si un autre jeton s'avère aussi
   opaque (revu par la prochaine passe de tri/score, SCOPE GUARD
   2026-07-11c — cette table n'est qu'une SOURCE de jetons pour elle). */
const KIND_TOKEN_ALIASES = { logging: ['wood', 'timber'] };
// (Revu au fil de la vérification : ces jetons sont fournis à pushSearchEntry
// via `opts.keyTokens` — corpus PREMIER NIVEAU (n/words, même tier que le
// libellé), PAS `body` — voir la doc de pushSearchEntry plus haut. Une clé
// moteur passée en `body` serait pénalisée +1000 et noyée dès qu'une requête
// a ≥24 meilleurs matches ailleurs (vérifié empiriquement sur "wood" : ~24
// entités "Wooden"/"Woods" non-liées remplissaient déjà le quota avant que
// l'alias body-only n'ait sa chance).
/* Jetons du SLUG moteur brut d'une clé de nœud (fkey `camp:logging` /
   clé de sous-groupe `inter-chests`…) — découpage naïf sur les séparateurs
   structurels, jamais un mot traduit : couvre déjà gratuitement les cas où
   le slug est LUI-MÊME un mot anglais courant (ex. taper "chest" en FR
   retrouve le bucket "inter-chests" via son propre jeton "chests", sans
   alias à la main) ; KIND_TOKEN_ALIASES ci-dessus ne couvre que les rares
   cas où ça ne suffit pas. */
function slugTokens(key) {
  return key.split(/[:._-]/).filter(Boolean);
}
function catNodeKeyTokens(key) {
  const toks = new Set(slugTokens(key));
  for (const t of [...toks]) for (const alias of (KIND_TOKEN_ALIASES[t] || [])) toks.add(alias);
  return [...toks];
}
/* Nœuds COCHABLES de l'arbre de filtres (mission "search categories"
   2026-07-11c) : indexe CHAQUE ligne/bucket du panneau gauche — kind de
   camp (harvest/world/other), famille décor, type de POI, bucket
   Interactables/Coffres/POI à pastille — comme un résultat de recherche
   activable au clic (layeractivate.js activateCategoryNode, `.click()`
   natif sur la case RÉELLE de la ligne — même cascade EXACTE qu'un clic
   utilisateur, AUCUNE règle de cascade réimplémentée ici).

   SAUF : lignes FAMILLE (data-fam — déjà indexées par
   buildFamilySearchIndex ci-dessus avec leur propre contexte camps/pts et
   leur propre activation setFamilyOn, jamais dédoublées ici) et lignes
   ESPÈCE (data-species — catalogue GLOBAL déjà couvert par
   buildMonsterSearchIndex/buildWildSpeciesSearchIndex, pas seulement ce
   qui est actuellement rendu dans l'arbre).

   Scan APRÈS que l'arbre soit rendu : mis en file par whenDeferred (voir
   buildSearch ci-dessous) — buildFilters() est TOUJOURS appelé avant
   buildSearch() à chaque cycle de vie partagé (boot/setLang/bascule
   carte/dev-toggle, voir main.js), son whenDeferred(rebuildAllGroups)
   entre donc TOUJOURS en tête de la même file FIFO (data.js
   onDeferredReady) — le DOM est déjà complet au moment de CE scan. Le
   `key` (fkey/clé de sous-groupe) est RETENU pour l'activation (résolu à
   nouveau par sélecteur au clic, voir layeractivate.js) — jamais une
   référence DOM capturée ici, qui deviendrait caduque au premier rebuild
   de l'arbre (langue, carte, cascade d'un bucket…).

   Libellé = texte RENDU (.flabel), déjà localisé par sidebar.js — aucune
   nouvelle clé i18n ici. Sous-libellé = le compte RENDU (.fcount, un
   nombre nu déjà affiché tel quel dans l'arbre — pas un mot à traduire).
   Couleur = la VRAIE couleur de la ligne/du bucket (.swatch / --dot),
   jamais une teinte générique — voir iconWithRing pour la puce ronde
   assortie (mission : "the row's colored dot if recoverable"). */
function buildCategorySearchIndex() {
  const filters = document.getElementById('filters');
  if (!filters) return;
  filters.querySelectorAll('li[data-fkey]').forEach(li => {
    if (li.dataset.fam) return;   // ligne famille : buildFamilySearchIndex ci-dessus
    const key = li.dataset.fkey;
    const label = li.querySelector('.flabel')?.textContent.trim();
    if (!label) return;
    const hex = li.querySelector('.swatch')?.style.background || '#888';
    const sub = li.querySelector('.fcount')?.textContent.trim() || null;
    pushSearchEntry(label, 'catnode', hex, null, null,
      () => activateCategoryNode('row', key), null, sub, null, 0,
      null, { ref: 'catnode:row:' + key, keyTokens: catNodeKeyTokens(key) });
  });
  filters.querySelectorAll('details.decor-group[data-subgroup]').forEach(det => {
    const key = det.dataset.subgroup;
    const summary = det.querySelector(':scope > summary');
    const label = summary?.querySelector('.flabel')?.textContent.trim();
    if (!label) return;
    const hex = summary.querySelector('.subgrp-check')?.style.getPropertyValue('--dot').trim() || '#888';
    const sub = summary.querySelector('.fcount')?.textContent.trim() || null;
    pushSearchEntry(label, 'catnode', hex, null, null,
      () => activateCategoryNode('bucket', key), null, sub, null, 0,
      null, { ref: 'catnode:sub:' + key, keyTokens: catNodeKeyTokens(key) });
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

/* ── Build (E'c-8, blueprint §1.2/§7 opt L3) : talent/spécialisation/métier —
   recherche + fiche seulement, jamais une position/couche carte (voir
   fiches/build.js pour la forme réelle des 3 bins). Même idiome que
   buildAbilitySearchIndex/buildNodeSearchIndex ci-dessus (catalogue GLOBAL,
   chargé en différé comme S.abilities/S.nodes). ── */
/* Talents (S.talents[], tableau — 1462 entrées) : seules celles avec un `name`
   ET un `node` (clé stable de la fiche) sont indexées -- les 76 stubs
   "artifact_chip" sans l'un ni l'autre n'ont RIEN à chercher ni à ouvrir
   (absence honnête, voir la doc de fiches/build.js), jamais un résultat vide
   de sens. Sous-libellé = système/sous-type (même mot que la fiche, tbl). */
function buildTalentSearchIndex() {
  (S.talents || []).forEach(t => {
    if (!t || !t.name || !t.node) return;
    const sub = [tbl('talentSystem', t.system) || null, tbl('talentSubtype', t.subtype) || null]
      .filter(Boolean).join(' · ');
    pushSearchEntry(t.name, 'talent', TALENT_HEX, null, null,
      () => openTalentFiche(t.node), null, sub, '🧩', 0, null, { ref: 'talent:' + t.node });
  });
}
/* Spécialisations (S.specializations[], 20 entrées) : sous-libellé = jeton de
   classe brut (même repli honnête que la fiche, aucune table de traduction
   fiable pour ces abréviations — voir fiches/build.js openSpecFiche). */
function buildSpecSearchIndex() {
  (S.specializations || []).forEach(s => {
    if (!s || !s.name) return;
    pushSearchEntry(s.name, 'specialization', SPEC_HEX, null, null,
      () => openSpecFiche(s.code), null, s.class || null, '🎭', 0, null, { ref: 'spec:' + s.code });
  });
}
/* Métiers (S.professions[], 18 entrées) : libellé affiché = professionLabel()
   (même traduction que item.prof ailleurs, réutilisée telle quelle — voir
   fiches/build.js openProfessionFiche). */
function buildProfessionSearchIndex() {
  (S.professions || []).forEach(p => {
    if (!p || !p.key) return;
    pushSearchEntry(professionLabel(p.display_name), 'profession', PROFESSION_HEX, null, null,
      () => openProfessionFiche(p.key), null, null, '⚒', 0, null, { ref: 'profession:' + p.key });
  });
}

/* Distance d'édition bornée AVEC TRANSPOSITION ADJACENTE (Damerau-Levenshtein
   restreint / "optimal string alignment", bande de largeur maxD, abandon dès
   que la ligne dépasse maxD -- mission "search quality" 2026-07-11d).
   Insertion/suppression/substitution ET l'inversion de deux lettres voisines
   comptent chacune pour 1 -- une Levenshtein classique compte une inversion
   comme 2 (deux substitutions), ce qui ratait exactement la classe de faute
   la plus commune (« scarg »→« scrag », « exectuioner »→« executioner » :
   les DEUX ancres de vérification de cette mission sont des lettres
   inversées). Même API/forme que l'ancien editLe (site/js/utils.js, encore
   utilisé nulle part ailleurs -- gardé intact là-bas, ce fichier a sa PROPRE
   copie pour ne pas toucher un utilitaire partagé hors du périmètre confié
   à cette mission). */
function editDist(a, b, maxD) {
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > maxD) return maxD + 1;
  const INF = maxD + 1;
  let rowM2 = new Array(lb + 1).fill(INF);   // d[i-2][*] -- lu seulement dès i>=2
  let rowM1 = new Array(lb + 1);
  for (let j = 0; j <= lb; j++) rowM1[j] = j;   // d[0][*] (cas de base)
  let rowCur = new Array(lb + 1);
  for (let i = 1; i <= la; i++) {
    rowCur[0] = i;
    const from = Math.max(1, i - maxD), to = Math.min(lb, i + maxD);
    let rowMin = i;
    for (let j = 1; j <= lb; j++) {
      if (j < from || j > to) { rowCur[j] = INF; continue; }
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(rowM1[j] + 1, rowCur[j - 1] + 1, rowM1[j - 1] + cost);
      if (i >= 2 && j >= 2 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, rowM2[j - 2] + 1);
      rowCur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > maxD) return INF;
    const tmp = rowM2; rowM2 = rowM1; rowM1 = rowCur; rowCur = tmp;
  }
  return rowM1[lb];
}
/* Mémoïsation (jeton, mot, maxD) -> distance, réinitialisée à CHAQUE appel de
   runSearch (voir plus bas) : un même mot de titre ("Scrag", "Wolf"…) revient
   dans des dizaines/centaines d'entrées différentes -- sans ce cache,
   editDist serait rejoué à l'identique autant de fois. Coût O(1) par accès
   Map, négligeable devant le DP lui-même. */
let editMemo = null;
function cachedEditDist(tok, w, maxD) {
  const key = tok + '\u0001' + w + '\u0001' + maxD;
  let d = editMemo.get(key);
  if (d === undefined) { d = editDist(tok, w, maxD); editMemo.set(key, d); }
  return d;
}

/* Index de CANDIDATS flous (mission "search quality" 2026-07-11d) : sacs
   d'entrées par (PREMIÈRE LETTRE, LONGUEUR) de chacun de leurs mots de TITRE
   (n/words -- jamais le corpus `body`, bien plus restreint et déjà limité
   aux entrées dont le titre a échoué, voir bodyMatch/tokenScore plus bas).
   Reconstruit PARESSEUSEMENT (versionné par searchIndexVersion, jamais à
   chaque frappe -- seulement quand l'index a réellement changé, ex. arrivée
   d'un lot différé ou bascule carte/langue) : le coût de construction (un
   passage sur toutes les entrées) est payé une poignée de fois par session,
   jamais par keystroke.
   POURQUOI la longueur EN PLUS de la lettre (mesuré, pas théorique) : sur
   l'index Kwalat EN (7237 entrées), un sac par SEULE première lettre est
   bien trop grossier -- 's'/'c'/'b' contiennent chacun >2000 entrées (mots
   anglais courants très inégalement répartis), et RÉUNIR juste deux tels
   sacs pour construire l'ensemble de candidats coûtait à lui seul plusieurs
   ms/jeton avant même le premier appel à editDist (mesuré : "chest" ~3.5ms,
   "steppe" ~9.8ms). Composer la longueur du mot dans la clé exploite une
   propriété EXACTE de la distance d'édition bornée (aucune perte de rappel,
   contrairement à un filtre heuristique) : un mot à distance ≤maxD de `tok`
   a nécessairement une longueur dans [tok.length-maxD, tok.length+maxD] --
   c'est la MÊME borne déjà vérifiée à l'intérieur d'editDist, simplement
   appliquée en amont pour réduire le sac consulté au lieu du sac entier
   d'une lettre. Coupe la taille moyenne d'un sac consulté d'un facteur
   ~10-15 (mots répartis sur une dizaine de longueurs plausibles),
   ramenant le pire cas mesuré à <2ms/jeton (voir _debugFuzzyTime).
   Mots de 1-2 lettres exclus des sacs : la plus petite cible plausible pour
   un jeton flou (≥4 lettres, maxD=1 minimum) a 3 lettres (4-1) -- aucun mot
   plus court n'est jamais candidat, quel que soit le jeton. */
const bucketKey = (c, len) => c + '#' + len;
let fuzzyBucketVersion = -1;
let entriesByBucket = new Map();
function ensureFuzzyBuckets() {
  if (fuzzyBucketVersion === searchIndexVersion) return;
  entriesByBucket = new Map();
  for (const e of searchIndex) {
    const seen = new Set();
    for (const w of e.words) {
      if (w.length < 3) continue;
      const k = bucketKey(w[0], w.length);
      if (seen.has(k)) continue;
      seen.add(k);
      let arr = entriesByBucket.get(k);
      if (!arr) entriesByBucket.set(k, arr = []);
      arr.push(e);
    }
  }
  fuzzyBucketVersion = searchIndexVersion;
}
/* Pour UN jeton (déjà réduit au flou -- maxD>0), calcule le meilleur score
   flou (2+d) par ENTRÉE candidate -- Map<entry, score>, calculée UNE FOIS par
   jeton (pas par entrée visitée dans runSearch, voir plus bas). Sacs
   consultés : (première lettre DU jeton, chaque longueur plausible dans
   [tok.length-maxD, tok.length+maxD]) ET la MÊME combinaison avec la
   SECONDE lettre du jeton (tolère une lettre EN TROP en tête de la requête,
   ex. jeton "xwolf" pour "wolf" -- sans ce second sac, seule la première
   lettre du jeton compterait et une faute EN DÉBUT de mot resterait
   invisible). Limite connue, assumée : une faute qui altère la toute
   première lettre d'un mot (jamais la 2e) reste hors du filet de CE filtre
   bon marché -- même limite que la plupart des moteurs de recherche flous à
   préfixe (ex. Elasticsearch fuzzy par défaut), aucune des deux ancres de
   vérification de cette mission ("scarg", "exectuioner") n'en dépend (leur
   première lettre est intacte). */
function fuzzyEntryScores(tok, maxD) {
  const out = new Map();
  if (!maxD) return out;
  const cands = new Set();
  const lenMin = Math.max(3, tok.length - maxD), lenMax = tok.length + maxD;
  for (const c of [tok[0], tok.length > 1 ? tok[1] : null]) {
    if (c == null) continue;
    for (let len = lenMin; len <= lenMax; len++) {
      const arr = entriesByBucket.get(bucketKey(c, len));
      if (arr) for (const e of arr) cands.add(e);
    }
  }
  for (const e of cands) {
    let best = Infinity;
    for (const w of e.words) {
      let d = cachedEditDist(tok, w, maxD);
      if (tok.length < w.length) d = Math.min(d, cachedEditDist(tok, w.slice(0, tok.length + maxD), maxD));
      if (d <= maxD && 2 + d < best) best = 2 + d;
    }
    if (best !== Infinity) out.set(e, best);
  }
  return out;
}

/* Score d'un jeton de requête contre une entrée/segment (plus bas = meilleur) :
   0 mot exact · 1 préfixe de mot · 2 sous-chaîne · 3 ≈1 faute · 4 ≈2 fautes
   (tolérance activée dès 4 lettres, 2 fautes dès 8 -- seuils alignés sur la
   mission "search quality" 2026-07-11d) ; Infinity = pas trouvé. Le préfixe
   flou couvre la frappe en cours (« steelhar » → Steelheart).
   `fuzzyMap` (Map<entry,score> précalculée par fuzzyEntryScores pour CE
   jeton -- voir runSearch) : SEULE source du palier flou, jamais recalculée
   ici. Absent (bodyMatch ci-dessous, corpus secondaire -- objectifs/journal
   de quête, description d'objet…) : la tolérance aux fautes s'ARRÊTE au
   palier exact/préfixe/sous-chaîne, PAS de repli flou mot-à-mot sur ce
   corpus. Décision de perf délibérée (mission "search quality"
   2026-07-11d, budget p95<15ms) : une phrase d'objectif/description a 10-20
   MOTS -- lui appliquer le même repli flou qu'un titre (2-5 mots) aurait
   multiplié le nombre d'appels editDist par corpus secondaire entier
   (mesuré : p95 passait de <15ms à >20ms rien qu'avec ~800 objets ayant
   désormais un `body` archétype/description, voir le rapport de mission).
   La tolérance aux fautes reste néanmoins le cœur de la demande #1
   ("smart search" sur les NOMS d'entité) -- le corpus secondaire, lui,
   gagne la recherche exacte/sous-chaîne qu'il n'avait pas avant sur
   archétype/description (demande #2), jamais perdu, simplement pas
   flou-toléré. */
function tokenScore(tok, entry, fuzzyMap) {
  if (entry.n.includes(tok)) {
    let best = 2;
    for (const w of entry.words) {
      if (w === tok) return 0;
      if (w.startsWith(tok)) best = 1;
    }
    return best;
  }
  if (!fuzzyMap) return Infinity;
  const maxD = tok.length >= 8 ? 2 : tok.length >= 4 ? 1 : 0;
  if (!maxD) return Infinity;
  return fuzzyMap.has(entry) ? fuzzyMap.get(entry) : Infinity;
}

/* Repli « texte de déroulé » quand le titre ne matche pas : un même segment
   (une phrase d'objectif) doit couvrir la requête — pas la somme éparpillée
   du corpus, sinon deux mots sans rapport dans deux phrases différentes
   produiraient un faux positif. Tolère UN jeton absent (mot parasite —
   « voir » dans « Return voir Slick ») dès 3 jetons ; en dessous, exact.
   `null` si aucun segment n'atteint ce seuil. Paliers de champ (mission
   "search quality" 2026-07-11d) : à nombre de jetons touchés égal, préfère
   le segment du poids le PLUS FAIBLE (BODY_WEIGHT.ALIAS avant .PROSE) --
   voir pushSearchEntry/BODY_WEIGHT. */
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
    if (!best || hits > best.hits ||
      (hits === best.hits && (seg.weight < best.seg.weight || (seg.weight === best.seg.weight && score < best.score)))) {
      best = { seg, hits, score };
    }
  }
  return best ? { seg: best.seg, hits: best.hits, score: best.score, weight: best.seg.weight } : null;
}

/* Pénalité de partition du jeton-type (KIND_QUERY_ALIASES ci-dessus) : assez
   grande pour placer TOUTE entrée hors de la catégorie boostée après TOUTE
   entrée de la catégorie boostée, quel que soit son propre palier (titre le
   pire ≈12+quelques jetons flous, corpus secondaire le pire 400+4/jeton --
   5000 domine confortablement les deux). Boost, jamais un filtre dur : une
   entrée hors catégorie reste dans `scored`, simplement repoussée après --
   voir runSearch. Choix délibéré (pas d'exception "match exact ailleurs") :
   le jeton-type exprime une intention explicite de l'utilisateur ("je veux
   des QUÊTES"), donc une préférence de catégorie inconditionnelle reste la
   règle la plus prévisible -- un match exact ailleurs peut encore apparaître,
   juste après, jamais masqué (seul le plafond de 24 résultats peut
   l'évincer, exactement comme n'importe quelle autre entrée moins bien
   classée). */
const BOOST_PARTITION = 5000;

function runSearch(raw) {
  const q = fold(raw);
  if (!q) return [];
  let tokens = q.split(' ');
  // Jeton-type en tête (mission "search quality" 2026-07-11d, demande #3) :
  // consommé seulement si la requête a AU MOINS un second mot (voir la doc
  // de KIND_QUERY_ALIASES ci-dessus -- aucune régression sur une recherche
  // mono-mot existante).
  let boostCat = null;
  if (tokens.length > 1) {
    const kind = KIND_QUERY_TOKEN_TO_CAT.get(tokens[0]);
    if (kind) { boostCat = kind; tokens = tokens.slice(1); }
  }
  const qRest = tokens.join(' ');   // requête SANS le jeton-type consommé -- sert au bonus "départ exact" ci-dessous
  ensureFuzzyBuckets();
  editMemo = new Map();
  // Précalcul PAR JETON (pas par entrée) des candidats flous -- voir
  // fuzzyEntryScores. `tokenScore` y pioche ensuite en O(1) au lieu de
  // rejouer editDist sur chaque entrée visitée.
  const fuzzyMaps = tokens.map(tok => {
    const maxD = tok.length >= 8 ? 2 : tok.length >= 4 ? 1 : 0;
    return maxD ? fuzzyEntryScores(tok, maxD) : null;
  });
  const scored = [];
  for (const it of searchIndex) {
    let titleScore = 0;
    let ok = true;
    for (let ti = 0; ti < tokens.length; ti++) {
      const s = tokenScore(tokens[ti], it, fuzzyMaps[ti]);
      if (s === Infinity) { ok = false; break; }
      titleScore += s;
    }
    let score, bodyHit = null;
    if (ok) {
      score = it.bias * 5 + titleScore;
    } else if (it.body) {
      // Le titre ne matche pas : essaie le corpus étendu (donneur/but/
      // objectif/journal de quête, archétype/description d'objet…), au
      // palier de poids du champ qui a matché (BODY_WEIGHT, voir
      // bodyMatch) -- toujours moins prioritaire qu'un match de titre, quel
      // que soit le champ.
      const bm = bodyMatch(tokens, it.body);
      if (bm) { ok = true; score = bm.weight + bm.score; bodyHit = bm.seg.text; }
    }
    if (!ok) continue;
    if (!bodyHit && it.n.startsWith(qRest)) score -= 0.5;   // départ exact de libellé (titre uniquement)
    if (boostCat && it.cat !== boostCat) score += BOOST_PARTITION;
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
  // Nœud d'arbre (mission "search categories" 2026-07-11c) : pas d'icône
  // d'entité — une puce RONDE de la VRAIE couleur de la ligne/du bucket
  // (mission : "the row's colored dot if recoverable"), même recette
  // visuelle que .swatch/.atag-dot (voir style.css .sr-cat-dot) plutôt
  // qu'un glyphe qui redirait la même chose que la puce de catégorie
  // juste à côté (celle-ci montre déjà le glyphe neutre, voir CAT_GLYPH).
  if (it.cat === 'catnode') return `<span class="sr-icon sr-cat-dot" style="background:${it.hex};--c:${it.hex}"></span>`;
  const img = iconTag(it.icon, 'sr-icon', it.glyph);
  if (!it.ring || it.ring.length < 2) return img;
  const title = it.ring.map(s => rarityLabel(s.rarity)).join(' · ');
  return `<span class="sr-icon-ring" style="--ring-grad:${ringGradient(it.ring)}" title="${esc(title)}">${img}${variantLayers(it)}</span>`;
}

const resBox = $('#search-results');
const searchInput = $('#search');
let searchTimer = null;
searchInput.addEventListener('input', e => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => renderSearch(e.target.value), 70);
});
/* Raccourcis clavier (repositionnement 2026-07-11, barre flottante
   haut-centre) : « / » focus la barre depuis n'importe où — SAUF si le
   focus est déjà dans un champ de saisie (input/textarea/contenteditable,
   ce qui couvre aussi #search lui-même : taper un "/" dans une recherche
   reste un caractère normal, jamais intercepté). Échap ferme le dropdown
   de résultats et/ou quitte le focus de la barre — jamais un effet de bord
   sur un Échap tapé ailleurs (aucun des deux n'a lieu si ni l'un ni
   l'autre n'est actif). */
document.addEventListener('keydown', e => {
  if (e.key === '/') {
    const ae = document.activeElement;
    if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return;
    e.preventDefault();
    searchInput.focus();
    searchInput.select();
  } else if (e.key === 'Escape' && (document.activeElement === searchInput || !resBox.hidden)) {
    resBox.hidden = true;
    searchInput.blur();
  }
});
/* ── Lignes de résultat en EntityRef « [Kind(●)] Nom » (owner 2026-07-13,
   « la quête doit être [Quest(●)] épinglable, plus de Position séparée — cette
   quête ET TOUTES les quêtes » ; vague 4 du contrat mapref_component_SPEC.md) ──
   Chaque ligne d'ENTITÉ rend le composant unique (mapref.js ref()) au lieu de
   l'ancien cat-chip + libellé + coordonnée : le NOM souligné ouvre la fiche
   (closure `open` existante), la PASTILLE épingle la position (kinds locate,
   Q7) ou bascule/surligne la couche (kinds catégorie/groupe) — DEUX cibles de
   clic, plus le clic-ligne historique préservé sur le corps (voir le délégué).
   Un nœud d'ARBRE (catnode) n'a AUCUN kind d'entité unique (kind de camp /
   famille décor / type de POI / bucket Interactables) → il garde sa puce 🗂
   legacy (le kind y vit dans le libellé de la ligne, pas dans une pilule). */
const SEARCH_REF_KIND = {
  npc: 'npc', poi: 'poi', quest: 'quest', qao: 'qao', workshop: 'workshop',
  item: 'item', recipe: 'recipe', monster: 'species', family: 'family',
  zone: 'zone', location: 'location', ability: 'ability', event: 'event',
  chest: 'chest', searchable_chest: 'searchable_chest', node: 'node',
  talent: 'talent', specialization: 'specialization', profession: 'profession',
};
/* Kinds mono-entité à POSITION unique → la pastille pose/retire un pin LOCATE
   (Q7 verbatim owner : « épinglable, apparaît sous la barre, retirable ») quand
   x est connu — c'est LE geste que l'owner réclamait pour la quête. */
const SEARCH_LOCATE_CATS = new Set(['npc', 'poi', 'quest', 'qao', 'workshop', 'searchable_chest', 'location', 'event']);
/* Kinds « groupe de points » (camp / skin de coffre) : aucun nœud d'arbre, aucun
   pin unique — la pastille rejoue leur surlignage de LOT (closure showHighlight). */
const SEARCH_HIGHLIGHT_CATS = new Set(['camp', 'chest']);

/* Clé STABLE du pin locate d'une ligne — la MÊME source pour l'état affiché de
   la pastille (drawn) ET la bascule au clic, jamais re-dérivée séparément. */
function entryLocateKey(it) {
  return locateRefKey(it.cat, it.ref, it.x, it.z, it.map);
}
/* La pastille de cette ligne pose/retire un pin locate ? (kind mono-entité + x connu) */
function entryPins(it) {
  return SEARCH_LOCATE_CATS.has(it.cat) && it.x != null;
}
/* HTML « [Kind(●)] Nom » d'une ligne — null pour un nœud d'arbre (rendu legacy).
   Souligné (fiche) ⇔ la closure `open` ouvre une VRAIE fiche (pas un simple
   surlignage) ; zone : seulement si une fiche région cataloguée porte ce nom
   (honnêteté §3.5). Pastille ⇔ position (locate) OU couche (catégorie/groupe) ;
   aucune sinon (objet/recette/capacité/nœud, ou entité sans position) → nom
   souligné seul, honnête (les états questNoPos/posUnknown restent en méta). */
function searchRefHtml(it) {
  const kind = SEARCH_REF_KIND[it.cat];
  if (!kind) return null;
  const highlight = SEARCH_HIGHLIGHT_CATS.has(it.cat);
  const hasFiche = it.cat === 'zone' ? regionFicheExists(it.label)
    : highlight ? false : !!it.open;
  const desc = { kind, key: it.ref || undefined, label: it.label, hex: it.hex, hasFiche };
  if (entryPins(it)) {
    // Pin LOCATE : la pastille reflète l'appartenance à S.locates (même clé que
    // la bascule) et bascule ce pin (dropdown transitoire re-rendu à chaque frappe).
    desc.mode = 'L';
    desc.pos = { x: it.x, z: it.z, map: it.map };
    desc.drawable = true;
    desc.drawn = !!(S.locates && S.locates.has(entryLocateKey(it)));
  } else if (highlight) {
    desc.drawable = true; desc.drawn = false;   // surlignage de lot transitoire, jamais persisté
  } else if (kind === 'zone') {
    desc.drawable = true; desc.drawn = !!S.zonesOn;   // la pastille suit la couche « Zones »
  } else if (kind === 'species' || kind === 'family') {
    // Couche d'arbre : pastille dessinable ; la bascule/le double-effet passe par
    // la closure `open` (activateSpeciesLayer/activateFamilyLayers) — jamais une
    // seconde sémantique. État non résolu ici (dropdown transitoire) → ○ honnête.
    desc.drawable = true; desc.drawn = false;
  } else {
    // Aucune position, aucune couche (objet/recette/capacité/nœud, ou entité
    // sans position connue) → aucune pastille : « [Kind] Nom » souligné seul.
    desc.drawable = false;
  }
  return ref(desc);
}

/* Dernière liste rendue — le délégué de résultats retrouve l'entrée par index
   (data-i) plutôt qu'une closure par ligne (une seule écoute déléguée, posée une
   fois sur #search-results, survit à chaque reconstruction du dropdown). */
let searchResults = [];
function renderSearch(raw) {
  const v = raw.trim();
  resBox.innerHTML = ''; resBox.hidden = !v;
  searchResults = [];
  if (!v) return;
  const res = runSearch(v);
  if (!res.length) {
    resBox.innerHTML = `<li class="hint no-results">
      <span class="no-results-main">${esc(tr('noResults'))}</span>
      <span class="no-results-hint">${esc(tr('noResultsHint'))}</span>
    </li>`;
    return;
  }
  searchResults = res;
  res.forEach((it, i) => {
    const li = document.createElement('li');
    li.dataset.i = i;   // ancre stable pour le délégué (jamais une closure par ligne)
    // Ligne de contexte (mission "search activation" — species rows show
    // their family context) : "Famille Wolf · 4 camps · 926 pts", posée par
    // buildMonsterSearchIndex ci-dessus — même style discret que le bodyHit.
    const ctxLine = it.ctx ? `<div class="sr-hint sr-ctx">${esc(it.ctx)}</div>` : '';
    // Indice discret : la quête sort sur un mot de son déroulé, pas de son titre.
    const hint = it.bodyHit ? `<div class="sr-hint">${esc(tr('searchBodyHintPrefix'))}${esc(it.bodyHit)}</div>` : '';
    // Résultat d'une AUTRE carte : badge de carte discret + le clic bascule.
    const otherMap = it.map && it.map !== S.map;
    const mapBadge = otherMap
      ? `<span class="map-badge" title="${esc(tr('mapBadgeTitle', mapName(it.map)))}">${esc(mapName(it.map))}</span>` : '';
    // Ligne FAMILLE : classe dédiée (liseré + libellé en gras, voir style.css).
    if (it.cat === 'family') li.className = 'sr-family-row';
    const refHtml = searchRefHtml(it);
    let rowInner;
    if (refHtml) {
      // Sous-libellé HONNÊTE conservé (rareté/niveau/région/« sans position
      // fixe »…) ; la COORDONNÉE séparée disparaît — la pastille porte
      // désormais la position (owner 2026-07-13, « plus de Position séparée »).
      const metaHtml = it.sub ? `<span class="muted">${esc(it.sub)}</span>` : '';
      rowInner = `${iconWithRing(it)}${refHtml}${mapBadge}${metaHtml}`;
    } else {
      // Nœud d'arbre (catnode) : rendu legacy inchangé (puce 🗂 + libellé).
      rowInner = `<span class="cat-chip" style="--chip-c:${it.hex}">${esc(searchCatLabel(it.cat))}</span>
      ${iconWithRing(it)}
      <span class="sr-label">${esc(it.label)}</span>
      ${mapBadge}
      <span class="muted">${it.x != null ? fmtCoord(it.x, it.z) : esc(it.sub || '')}</span>`;
    }
    li.innerHTML = `<div class="sr-row">${rowInner}</div>${ctxLine}${hint}`;
    resBox.appendChild(li);
  });
}

/* Délégué de la liste de résultats (§1/§4.6 SPEC EntityRef) : chaque ligne a
   DEUX cibles — le NOM (data-act ref-open) ouvre la fiche via la closure `open`
   existante ; la PASTILLE (data-act ref-draw) épingle/bascule la carte. On
   ARRÊTE la propagation : la recherche possède le routage de SES lignes (closures
   bespoke — cross-carte, surlignage de lot, nœud d'arbre, double-effet espèce/
   famille — que le délégué EntityRef GLOBAL de main.js ne saurait rejouer depuis
   un simple kind/clé), jamais un double déclenchement. Un clic AILLEURS sur la
   ligne (icône/corps) rejoue le geste « clic-ligne » historique : ouvre la fiche,
   ou pour une ligne SANS fiche, l'action carte — comportement d'avant intégralement
   préservé (les tests whole-row du harnais restent verts). */
resBox.addEventListener('click', e => {
  const li = e.target.closest('li');
  if (!li || !resBox.contains(li) || li.dataset.i == null) return;
  const it = searchResults[+li.dataset.i];
  if (!it) return;
  e.stopPropagation();
  if (e.target.closest('[data-act="ref-draw"]')) drawSearchResult(it);
  else openSearchResult(it);
});
function selectSearchResult(it) {
  resBox.hidden = true;
  $('#search').value = it.label;
}
/* Clic NOM / corps de ligne : ouvre la fiche (closure `open` — inclut le
   double-effet espèce/famille et la bascule cross-carte). Une ligne SANS fiche
   (poi/qao/atelier/événement, camp/coffre en surlignage) fait son action carte —
   le clic n'est jamais mort. Une entrée d'historique par navigation (modèle existant). */
function openSearchResult(it) {
  pushFocusState();
  selectSearchResult(it);
  const run = () => { if (it.open) it.open(); else drawSearchMap(it); };
  if (it.map && it.map !== S.map) switchMap(it.map, { keepView: true }).then(run);
  else run();
}
/* Clic PASTILLE : action carte SEULE (pas de fiche, pas d'historique — même
   registre qu'un toggle d'arbre/de légende). */
function drawSearchResult(it) {
  selectSearchResult(it);
  drawSearchMap(it);
}
function drawSearchMap(it) {
  if (entryPins(it)) { toggleSearchPin(it); return; }   // locate → pin épinglable/retirable
  // Espèce/famille/zone/camp/coffre : leur couche/surlignage = exactement ce que
  // la closure `open` fait pour ces kinds (aucune fiche à part) — jamais re-dérivé.
  const run = () => { if (it.open) it.open(); };
  if (it.map && it.map !== S.map) switchMap(it.map, { keepView: true }).then(run);
  else run();
}
/* Pin LOCATE d'un résultat (Q7) : TOGGLE — déjà épinglé ⇒ retrait ; sinon pose
   (caméra centrée par addLocatePin), cross-carte ⇒ bascule d'abord. Teinte/nom
   du pin = ceux de la ligne (mêmes données que le bandeau-légende affichera). */
function toggleSearchPin(it) {
  const key = entryLocateKey(it);
  if (!key) return;
  if (S.locates && S.locates.has(key)) { removeLocatePin(key); return; }
  const pin = { x: it.x, z: it.z, map: it.map || S.map, label: it.label, hex: it.hex, kind: it.cat };
  if (it.map && it.map !== S.map) switchMap(it.map, { keepView: true }).then(() => addLocatePin(key, pin));
  else addLocatePin(key, pin);
}
document.addEventListener('click', e => {
  if (!e.target.closest('.search-wrap')) resBox.hidden = true;
});

/* Masque la liste de résultats (bascule de carte, changement de langue). */
function hideSearchResults() { resBox.hidden = true; }

/* `runSearch`/`searchIndexSize` (mission "search quality" 2026-07-11d) :
   exportés UNIQUEMENT pour le harnais de vérification headless
   (_verify_search_quality.mjs, `await import('./js/search.js')` -- même
   idiome que les autres _verify_*.mjs qui importent déjà state.js/config.js
   directement) ; aucun autre appelant applicatif (main.js n'importe que
   buildSearch/hideSearchResults, inchangé ci-dessus) -- runSearch reste
   piloté par la frappe utilisateur (renderSearch) partout ailleurs. */
const searchIndexSize = () => searchIndex.length;
export { buildSearch, hideSearchResults, runSearch, searchIndexSize, editDist };
