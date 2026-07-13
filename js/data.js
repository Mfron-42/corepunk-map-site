/* Kwalat — accès aux données : décodage .bin (en-tête 4 octets + gzip),
   chargements critique/différé, et requêtes de catalogue (résolutions
   mob→monstre, nom→PNJ, monstre→bestiaire — index paresseux, invalidés
   à chaque rechargement des jeux différés). */
import { S } from './state.js';
import { fold } from './utils.js';
import { buildRarityGroups } from './rarity.js';
import { DECOR_FAMILIES } from './config.js';
import { setClassLabels } from './classlabels.js';
import { positionCounts, isHiddenTest } from './devcontent.js';

/* ── Version stamp (cache-busting) ──────────────────────────────────────
   Incident réel motivant ce bloc : un onglet resté ouvert des heures a
   continué de montrer des données de quête d'avant déploiement (les bundles
   .bin ne sont chargés qu'une fois par onglet + GitHub Pages cache
   agressivement) — au point que le joueur a conclu qu'une fonctionnalité
   pourtant livrée n'existait pas. version.json n'est écrit QUE par le script
   de déploiement ( directement dans le clone de
   staging, jamais commité dans site/ source) avec un jeton frais à CHAQUE
   déploiement — {"v": "<horodatage>"}. Il n'existe donc PAS du tout en local
   (serveur de dev, harnais Playwright _verify_*.mjs) ni avant le tout premier
   déploiement qui embarque cette fonctionnalité : 404/erreur réseau/JSON
   invalide tolérés en silence (jamais de console.error, jamais de carte
   cassée), auquel cas aucun `?v=` n'est ajouté nulle part ci-dessous — le
   comportement de cache du navigateur reste alors exactement celui d'avant
   cette fonctionnalité. Chargé une seule fois au boot (main.js::init, AVANT
   loadCritical) et figé pour toute la durée de vie de l'onglet : c'est très
   exactement le jeton qu'un onglet resté longtemps ouvert doit détecter comme
   PÉRIMÉ — voir js/updatecheck.js, qui revérifie périodiquement/au focus si
   un jeton plus récent existe côté serveur et propose un rechargement (jamais
   automatique) sans jamais toucher à ce jeton figé ici. */
let versionStamp = null;
async function fetchVersionStamp() {
  try {
    const r = await fetch('version.json', { cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json();
    return (j && typeof j.v === 'string' && j.v) ? j.v : null;
  } catch (e) { return null; }
}
async function initVersion() {
  versionStamp = await fetchVersionStamp();
  return versionStamp;
}
const bootVersionStamp = () => versionStamp;
/* Ajoute `?v=<jeton>` à une URL de données si un jeton a pu être chargé au
   boot — sinon l'URL est rendue TELLE QUELLE (repli local/dev/pré-1er-déploi
   silencieux, voir ci-dessus). */
function withVersion(path) {
  if (!versionStamp) return path;
  return path + (path.includes('?') ? '&' : '?') + 'v=' + encodeURIComponent(versionStamp);
}

/* ── Chargement des données ─────────────────────────────────── */
/* Chaque *.json de data/ est publié en .bin : un en-tête custom de 4 octets
   (friction anti-scraping — ce n'est PAS du chiffrement, juste de quoi faire
   échouer `curl | gunzip`/`file`/`zcat` — plus reconnu comme gzip sans
   passer par ce module) suivi d'un flux gzip -9 du JSON. site_meta.json
   reste seul en clair (petit, non sensible). Décodage mesuré < 40 ms/fichier
   (fetch + DecompressionStream natif, même API que tout navigateur récent). */
const BIN_HEADER_LEN = 4; // doit rester synchro avec le générateur des .bin
async function fetchBin(path) {
  const r = await fetch(withVersion(path));
  if (!r.ok) throw new Error(path + ' → ' + r.status);
  const gz = (await r.arrayBuffer()).slice(BIN_HEADER_LEN);
  const stream = new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'));
  return JSON.parse(await new Response(stream).text());
}
async function fetchJson(path) {
  if (path.endsWith('.bin')) return fetchBin(path);
  const r = await fetch(withVersion(path));
  if (!r.ok) throw new Error(path + ' → ' + r.status);
  return r.json();
}

/* Every language-sensitive dataset file lives under site/data/<lang>/ (one
   full, self-contained build per site language). tiles/icons/tiles_meta.json
   stay unprefixed (language-independent, shared, never duplicated). */
const dataPath = name => `data/${S.lang}/${name}`;

/* Groupe « Décor » (chests.bin `group==="decor"` par `family`, +
   `group==="legacy_chest"` regroupé sous la clé fixe 'legacy') : compte
   chaque famille présente et reconstruit S.decor en préservant l'état
   on/off précédent (même principe que le prevOn de loadDeferred ci-dessous
   pour S.camps) — une famille déjà connue garde son cochage, une famille
   nouvellement vue démarre DÉCOCHÉE (Décor est masqué par défaut, voir
    §3.1 — contrairement à l'ancien buildChestTypes qui
   démarrait tout coché). camp_chest/searchable_chest n'entrent jamais ici :
   ce sont désormais leurs propres couches de haut niveau (config.js CATS),
   pas des sous-filtres. */
function buildDecorGroups(chests, prevOn = {}) {
  const byFam = {};
  for (const c of chests) {
    let fam = null;
    if (c.group === 'decor') fam = c.family || 'misc';
    else if (c.group === 'legacy_chest') fam = 'legacy';
    else continue;
    (byFam[fam] || (byFam[fam] = [])).push(c);
  }
  const next = {};
  for (const fam of DECOR_FAMILIES) {
    if (!(fam in byFam)) continue;
    // { count, hidden } : même honnêteté que catStats (js/sidebar.js) —
    // `count` = ce qui sera réellement dessiné (position connue, hors gate
    // dev), `hidden` = décor réel mais sans position connue (voir
    // devcontent.js::positionCounts, jamais un isTest -- déjà exclu des deux).
    const { shown, hidden } = positionCounts(byFam[fam]);
    // `category` : la classification CUITE des records (ontology chunk 2,
    //  « Chest/decor placements » — interactable.chests/
    // destroyable/reactive/other), homogène par famille (vérifié 1:1 sur
    // toutes cartes). C'est elle qui range la famille dans son bucket
    // Interactables du panneau (sidebar.js decorFamsOfCategory) — l'ancienne
    // table d'affichage DECOR_BUCKET est SUPPRIMÉE. Repli honnête
    // interactable.other pour un record retardataire sans champ.
    next[fam] = {
      on: fam in prevOn ? prevOn[fam] : false, count: shown, hidden,
      category: byFam[fam][0].category || 'interactable.other',
    };
  }
  return next;
}

/* Chemin critique : tout ce qu'il faut pour la première peinture (carte,
   panneau, recherche PNJ/POI/quêtes/objets, fiche quête complète avec ses
   items). Coupe ~5,7 Mo (camps + recettes + vendeurs + fiches camp) du
   JSON chargé avant que le voile de chargement ne disparaisse. */
async function loadCritical() {
  const [npcs, pois, quests, qao, workshops, chests, searchableChests, meta, zonesGeo, zonesQuest, items] = await Promise.all([
    fetchJson(dataPath('npcs.bin')), fetchJson(dataPath('interest_points.bin')),
    fetchJson(dataPath('quests.bin')), fetchJson(dataPath('quest_objects.bin')),
    fetchJson(dataPath('workshops.bin')), fetchJson(dataPath('chests.bin')),
    // Coffres fouillables réels (searchable_chests.bin, Kwalat racine
    // seulement aujourd'hui — voir  §2) : 404-tolérant, comme
    // tout fichier optionnel par carte (autre carte sans ce fichier -> []).
    fetchJson(dataPath('searchable_chests.bin')).catch(() => []),
    fetchJson(dataPath('site_meta.json')).catch(() => ({})),
    fetchJson(dataPath('zones_geo.bin')).catch(() => []),
    fetchJson(dataPath('zones_quest_geo.bin')).catch(() => ({})),
    fetchJson(dataPath('items.bin')).catch(() => ({})),
  ]);
  S.data = {
    npc: npcs, poi: pois, quest: quests, qao, workshop: workshops, chest: chests,
    searchable_chest: searchableChests,
  };
  S.meta = meta;
  S.zonesGeo = zonesGeo;
  S.zonesQuest = zonesQuest;
  S.items = items;
  // Ces coffres sont TOUJOURS ceux de Kwalat (racine, voir dataPath) même si
  // une autre carte est active (setLang() écrase S.data juste après avec le
  // bundle de la carte active via reloadActiveMapForLang → loadMapData) —
  // même garde Kwalat-only que S.camps dans loadDeferred ci-dessous, pour ne
  // pas perdre/écraser le sous-filtre de la carte réellement affichée.
  const kwPrevOn = {};
  const kwPrevSrc = S.map === 'Kwalat' ? S.decor : (S.mapCache.Kwalat && S.mapCache.Kwalat.decor) || {};
  for (const [f, st] of Object.entries(kwPrevSrc)) kwPrevOn[f] = st.on;
  const kwDecor = buildDecorGroups(chests, kwPrevOn);
  if (S.mapCache.Kwalat) S.mapCache.Kwalat.decor = kwDecor;
  if (S.map === 'Kwalat') S.decor = kwDecor;
  buildRarityGroups();    // regroupe les variantes de rareté « même nom » (voir rarity.js)
  lootTableIdxFallback = null;   // index paresseux table→items de repli (voir lootTableItems)
  quests.forEach(q => S.quests.set(q.slug, q));
}

/* Chemin différé : camps (1,9 Mo / 116k points, filtres tous décochés par
   défaut), fiches camp, recettes, stock des vendeurs, monstres, bestiaire/
   lore, capacités nommées et événements de monde (tous consultés uniquement
   depuis une fiche ou la recherche, jamais la première peinture). Démarré
   juste après le premier rendu, sans bloquer le panneau ni les fiches
   quête/item. */
export let deferredReady = false;
const onDeferredReady = [];
function whenDeferred(fn) { deferredReady ? fn() : onDeferredReady.push(fn); }
async function loadDeferred() {
  const [camps, campDetails, recipes, vendors, monsters, species, locations, abilities, events, lootTableContents, nodes, wildlifeSpecies, classLabels, zonesContents, creeps, talents, specializations, professions] = await Promise.all([
    fetchJson(dataPath('camps.bin')).catch(() => []),
    fetchJson(dataPath('camp_details.bin')).catch(() => ({})),
    fetchJson(dataPath('recipes.bin')).catch(() => ({})),
    fetchJson(dataPath('vendors.bin')).catch(() => ({})),
    fetchJson(dataPath('monsters.bin')).catch(() => ({})),
    // Espèces (task #80 — monster-model overhaul part 2, site/data/<lang>/
    // species.bin, voir  "monster_species.json") : l'unité
    // "créature" au sens joueur (~224), un cran plus large que `model`
    // ci-dessus (un modèle peut sur-scinder — ex. Imp servant sur 9 modèles
    // d'arme tenue ; une espèce peut au contraire UNIR plusieurs modèles qui
    // partagent un nom, ex. Troll/Mighty Troll/Overweight Troll). Alimente
    // l'arbre Monstres & faune (js/sidebar.js buildMonsterFamilyGroup, le
    // grain espèce -- "l'arbre EST le bestiaire"), la recherche (js/search.js
    // buildMonsterSearchIndex — alias namesAll), le sélecteur de variante et
    // monsterKeyFor (js/fiches.js / ci-dessous) — 404-tolérant comme le reste
    // de ce bundle (une carte/build sans ce fichier retombe juste sur les
    // anciens mécanismes model/nom, jamais un plantage).
    fetchJson(dataPath('species.bin')).catch(() => ({})),
    fetchJson(dataPath('locations.bin')).catch(() => []),
    fetchJson(dataPath('abilities.bin')).catch(() => ({})),
    fetchJson(dataPath('events.bin')).catch(() => []),
    // Table de butin COMPLÈTE par libellé ( finding #2) : bundle dédié
    // construit directement depuis loot_tables.json côté pipeline (voir
    // ()) -- remplace l'ancienne
    // inversion de items.*.drops (tronquée, voir lootTableItems ci-dessous).
    // 404-tolérant comme tout fichier optionnel : une carte/build sans ce
    // bundle retombe juste sur "aucune table" plutôt que de planter.
    fetchJson(dataPath('loot_table_contents.bin')).catch(() => ({})),
    // Nœuds de récolte (#81, site/data/<lang>/nodes.bin) : 30 types gn_* —
    // référence seule (fiche + recherche + jointures item/but de quête),
    // jamais une couche carte (voir S.nodes, js/state.js). 404-tolérant comme
    // le reste de ce lot différé.
    fetchJson(dataPath('nodes.bin')).catch(() => ({})),
    // Faune sauvage curatée (job pass 2026-07-11b, site/data/<lang>/
    // wildlife_species.bin — voir , js/state.js S.wildlifeSpecies) :
    // catalogue GLOBAL (indépendant de la carte, comme species.bin), jamais
    // une couche carte propre. Depuis le retrait du groupe « Faune sauvage »
    // (2026-07-12), ces espèces 0-camp ne sont plus listées dans l'arbre —
    // elles restent trouvables par la RECHERCHE (js/search.js
    // buildWildSpeciesSearchIndex les indexe direct depuis S.wildlifeSpecies).
    // 404-tolérant comme le reste de ce lot différé.
    fetchJson(dataPath('wildlife_species.bin')).catch(() => ({})),
    // Libellés ⚑ officiels des jetons de classification (class_labels.bin,
    // pipeline chunk 1 — voir  « ⚑ label source » et
    // js/classlabels.js pour le contrat de provenance game/game_tooltip_mt).
    // Différé comme le reste : consommé par les résolveurs de libellés
    // (config.js chestTypeLabel/activableTypeLabel) — avant l'arrivée du
    // fichier ils rendent le libellé ◇ du site, identique à avant. Scopé
    // LANGUE (jamais par carte) : rechargé par setLang via ce même load.
    // 404-tolérant -> null (les libellés ◇ restent, jamais un plantage).
    fetchJson(dataPath('class_labels.bin')).catch(() => null),
    // ── Nouveaux jeux différés (SCAFFOLDING E′c-0,  §2) ──
    // Enregistrés ici EXACTEMENT comme species.bin/nodes.bin ci-dessus, tous
    // 404-tolérants (doctrine additive : un déploiement partiel dégrade en
    // silence, jamais un plantage). Ils EXISTENT déjà sur disque (construits en
    // amont) mais RIEN ne consomme encore leurs index (zoneContentsFor/
    // creepFor/dispositionFor plus bas) — le rendu reste donc identique, ils se
    // chargent silencieusement en attendant leurs vagues (région E′c-R, faune/
    // disposition E′c-4, builds E′c-8).
    // Contenus inversés par région (zones_contents.bin) : zone_id -> {display,
    // camps, monsters, creeps, objects, quests} — future fiche région.
    fetchJson(dataPath('zones_contents.bin')).catch(() => ({})),
    // Creeps (creeps.bin) : clé -> {name, family, disposition, …} — catalogue
    // GLOBAL (indépendant de la carte, comme species.bin), jamais une couche.
    fetchJson(dataPath('creeps.bin')).catch(() => ({})),
    // Builds (opt L3, blueprint §5 R5) : talents/spécialisations/métiers —
    // recherche + fiche seulement, aucune surface carte (aucune position).
    fetchJson(dataPath('talents.bin')).catch(() => ({})),
    fetchJson(dataPath('specializations.bin')).catch(() => ({})),
    fetchJson(dataPath('professions.bin')).catch(() => ({})),
  ]);
  setClassLabels(classLabels);
  S.campDetails = campDetails;
  S.recipes = recipes;
  S.vendors = vendors;
  S.monsters = monsters;
  S.species = species;
  S.locations = locations;
  S.abilities = abilities;
  S.events = events;
  S.lootTableContents = lootTableContents;
  S.nodes = nodes;
  S.wildlifeSpecies = wildlifeSpecies;
  // Nouveaux jeux différés (SCAFFOLDING E′c-0) — posés sur S comme le reste ;
  // aucun lecteur aujourd'hui (voir le bloc Promise.all ci-dessus).
  S.zonesContents = zonesContents;
  S.creeps = creeps;
  S.talents = talents;
  S.specializations = specializations;
  S.professions = professions;
  monsterNameIdx = null;   // index paresseux mob→monstre (voir monsterKeyFor)
  speciesNameIdx = null;   // index paresseux nom (replié, alias namesAll inclus) → id d'espèce (voir monsterKeyFor)
  monsterLoreIdx = null;   // index paresseux monstre→entrée de bestiaire (voir loreIndexFor)
  locationIdIdx = null;    // index paresseux id de lieu (POI `loc`) → index S.locations (voir locationIndexForId)
  zoneContentsIdx = null;  // index paresseux zone_id→contenu de région (voir zoneContentsFor)
  creepIdx = null;         // index paresseux clé→creep (voir creepFor)
  dispositionIdx = null;   // index paresseux entity→disposition normalisée (voir dispositionFor)
  // Camps are PER-MAP: Kwalat's live in the root camps.bin loaded here; other
  // maps ship their own in their bundle (loadMapData). This deferred load is
  // Kwalat's — only apply it to S.camps when Kwalat is the ACTIVE map, else it
  // would clobber the current map's camps (and leave dense renderers pointing
  // at removed kinds → crash). Always stash into the Kwalat cache so a later
  // switch back restores them. Re-callable (setLang): preserve each kind's
  // on/off before rebuilding, else re-running would duplicate points/groups.
  const prevSrc = S.map === 'Kwalat' ? S.camps : (S.mapCache.Kwalat && S.mapCache.Kwalat.camps) || {};
  const prevOn = {};
  for (const [k, st] of Object.entries(prevSrc)) prevOn[k] = st.on;
  const kwCamps = {};
  camps.forEach(g => {
    const k = g.kind;
    if (!kwCamps[k]) kwCamps[k] = { on: prevOn[k] || false, points: [], groups: [] };
    kwCamps[k].groups.push(g);
    g.pts.forEach(pt => kwCamps[k].points.push({ x: pt[0], z: pt[1], g }));
  });
  if (S.mapCache.Kwalat) S.mapCache.Kwalat.camps = kwCamps;
  if (S.map === 'Kwalat') S.camps = kwCamps;
  deferredReady = true;
  onDeferredReady.splice(0).forEach(fn => fn());
}
/* ── Résolution croisée mob/PNJ → fiche ───────────────────────
   Un mob de camp (camp_details) ou une cible de but de quête (goalTargetChip)
   porte sa clé de variante exacte ; le catalogue monstres (S.monsters) ne
   garde qu'une variante REPRÉSENTATIVE par (nom, niveau) — reliés ici en
   cascade, jamais de lien inventé si aucune fiche n'existe :
     1) `key` tel quel, quand il désigne DÉJÀ une clé de groupe (le cas
        courant — la clé brute EST la clé représentative) ;
     2) ESPÈCE (species.bin, task #80) : résout par nom, alias `namesAll`
        compris (namesAll couvre aussi des noms qu'AUCUN modèle ne partage —
        "Overweight Troll"/"Mighty Troll" rejoignent l'espèce "Troll" par
        égalité de nom, pas de modèle, voir 
        "monster_species.json") — choix déterministe parmi les spawns
        VISIBLES de l'espèce : le spawn dont le niveau est le plus proche de
        `levelHint` quand l'appelant en connaît un (ex. le niveau du mob dans
        CE camp précis, camp_details `m.lvl`/`m.lvlMax`, ou celui de la zone
        de quête résolue — voir js/fiches.js goalTargetChip), sinon le
        `canonicalSiteKey` de l'espèce (même règle de richesse que partout
        ailleurs), sinon son premier spawn ;
     3) repli FINAL, historique : nom replié -> première clé S.monsters
        trouvée (filet de sécurité pour les enregistrements sans espèce —
        aucun aujourd'hui, 224/224 espèces couvrent 100% de S.monsters, mais
        gardé au cas où un futur build en laisse hors du regroupement).
   Index paresseux, invalidés quand S.monsters/S.species sont rechargés
   (loadDeferred/setLang). */
let monsterNameIdx = null;
let speciesNameIdx = null;
function buildMonsterNameIdx() {
  monsterNameIdx = new Map();
  for (const [k, m] of Object.entries(S.monsters)) {
    const n = fold(m.name);
    if (!monsterNameIdx.has(n)) monsterNameIdx.set(n, k);
  }
  speciesNameIdx = new Map();
  for (const [id, sp] of Object.entries(S.species || {})) {
    const names = sp.namesAll?.length ? sp.namesAll : [sp.name];
    for (const nm of names) {
      const n = fold(nm);
      if (!speciesNameIdx.has(n)) speciesNameIdx.set(n, id);
    }
  }
}
function monsterKeyFor(key, name, levelHint) {
  if (key && S.monsters[key]) return key;
  if (!monsterNameIdx) buildMonsterNameIdx();
  // (Audit quêtes 2026-07-11, classe C : un repli SINGULIER — « Turtles » →
  // « Turtle » — a été essayé ici puis RETIRÉ après scan complet : 0 des 6
  // libellés en défaut ne correspond à une espèce du registre sous AUCUNE
  // forme (« Turtles »/« Hyena Faidens » n'existent qu'en faune sauvage ou
  // pas du tout) — la classe C est un fix PIPELINE (labels), pas front ;
  // fold() couvre déjà parenthèses/casse.)
  const n = fold(name || '');
  const sp = S.species[speciesNameIdx.get(n)];
  if (sp) {
    // Un spawn isTest révélé nulle part par défaut ici : ce repli sert des
    // données publiques (camp/quête), jamais un lien profond direct assumé
    // déjà ouvert -- même garde que speciesVariantSpawns (js/fiches.js).
    const spawns = (sp.spawns || []).filter(s => S.monsters[s.siteKey] && !isHiddenTest(S.monsters[s.siteKey]));
    if (spawns.length) {
      if (levelHint != null) {
        const bySame = spawns.filter(s => s.level != null);
        const pool = bySame.length ? bySame : spawns;
        return pool.reduce((best, s) => Math.abs(s.level - levelHint) < Math.abs(best.level - levelHint) ? s : best, pool[0]).siteKey;
      }
      if (sp.canonicalSiteKey && spawns.some(s => s.siteKey === sp.canonicalSiteKey)) return sp.canonicalSiteKey;
      return spawns[0].siteKey;
    }
  }
  return monsterNameIdx.get(n) || null;
}
/* PNJ par nom → index de fiche (carte ACTIVE uniquement : les données
   vendeurs/acteurs citent des noms, pas des index). Exact d'abord, puis
   repli par égalité REPLIÉE (fold — casse/accents/ponctuation, audit quêtes
   2026-07-11 classe A : les `t.label` des cibles de but divergent parfois
   du catalogue par la casse seule) — jamais un match flou au-delà. -1 si
   inconnu ici. */
function npcIndexByName(name) {
  if (!name) return -1;
  const arr = S.data.npc || [];
  const exact = arr.findIndex(n => n.name === name);
  if (exact >= 0) return exact;
  const f = fold(name);
  return f ? arr.findIndex(n => fold(n.name) === f) : -1;
}
/* Entrée de bestiaire/lore d'un monstre (S.locations, MapMarkers.xml) :
   index inverse paresseux clé de monstre → index de fiche lore — 105 des
   755 monstres du catalogue apparaissent dans une famille du bestiaire ;
   les autres n'affichent simplement pas la section. Invalidé avec
   monsterNameIdx quand les données différées sont rechargées. */
let monsterLoreIdx = null;
function loreIndexFor(key) {
  if (!monsterLoreIdx) {
    monsterLoreIdx = new Map();
    S.locations.forEach((l, i) => (l.monsters || []).forEach(fm => {
      if (!monsterLoreIdx.has(fm.key)) monsterLoreIdx.set(fm.key, i);
    }));
  }
  const i = monsterLoreIdx.get(key);
  return i == null ? null : i;
}

/* POI `loc` (interest_points.bin, pipeline pass 2026-07-11b — jointure vers
   MapMarkers.xml, S.locations `id`) -> index de fiche lore (même forme que
   loreIndexFor ci-dessus, index inversé PAR id plutôt que par clé de
   monstre). Sert le bouton « encyclopédie » du popup POI (js/popups.js
   popupHtml) : ~32/156 POI ont un `loc` joint. Invalidé avec monsterLoreIdx
   quand les données différées sont rechargées (setLang/loadDeferred). */
let locationIdIdx = null;
function locationIndexForId(id) {
  if (!id) return null;
  if (!locationIdIdx) {
    locationIdIdx = new Map();
    S.locations.forEach((l, i) => { if (l.id && !locationIdIdx.has(l.id)) locationIdIdx.set(l.id, i); });
  }
  const i = locationIdIdx.get(id);
  return i == null ? null : i;
}

/* Table de butin COMPLÈTE par libellé ( finding #2) : lue directement
   depuis S.lootTableContents (bundle dédié construit côté pipeline depuis
   loot_tables.json -- voir (),
   chargé en différé dans loadDeferred() ci-dessus), donc toujours 100%
   complète (max observé : 582 lignes, les 13 tables lt_poi_chest_hidden_* de
   coffre de recette) -- plus jamais reconstruite en inversant le cache
   `dropped_in` tronqué de chaque item (l'ancienne méthode, gardée juste en
   dessous en repli), qui rendait justement CES tables-là vides ou
   incomplètes (0/582 avant ce correctif). `ch` (part approximative dans le
   pool, voir  "chance") toujours propagée au même titre que
   w/c/g -- fiches.js::dropRateHtml en a besoin pour ne jamais retomber sur le
   poids brut `w` comme faux pourcentage. */
let lootTableIdxFallback = null;
function lootTableItems(label) {
  const rows = S.lootTableContents && S.lootTableContents[label];
  if (rows) return rows;
  // Repli (bundle dédié absent -- échec réseau ponctuel, ou build sans ce
  // fichier) : ancienne inversion de items.*.drops, paresseuse, invalidée
  // quand le catalogue d'objets est rechargé (setLang, voir loadCritical).
  if (!lootTableIdxFallback) {
    lootTableIdxFallback = new Map();
    for (const [key, it] of Object.entries(S.items)) {
      for (const d of it.drops || []) {
        let arr = lootTableIdxFallback.get(d.label);
        if (!arr) lootTableIdxFallback.set(d.label, arr = []);
        arr.push({ key, name: it.name, icon: it.icon || null, w: d.w, c: d.c, g: d.g, ch: d.ch });
      }
    }
  }
  return lootTableIdxFallback.get(label) || null;
}

/* ── Index paresseux des nouveaux jeux différés (SCAFFOLDING E′c-0) ──────────
   Mêmes idiomes que monsterKeyFor/loreIndexFor/lootTableItems ci-dessus : une
   variable d'index au niveau module, construite à la PREMIÈRE lecture et
   invalidée (=null) au rechargement des jeux différés (loadDeferred/setLang).
   RIEN ne les appelle aujourd'hui — ils ne se construisent donc jamais et le
   rendu reste identique ; ils attendent leurs vagues (région/faune/build). */

/* Contenu inversé d'une région (zones_contents.bin,  §2) :
   zone_id -> {display, camps, monsters, creeps, objects, quests}. Le bundle est
   déjà un objet indexé par zone_id (accès direct comme lootTableContents) ; le
   Map paresseux tolère aussi une forme tableau {zone_id|id, …} par robustesse.
   Consommé par la future fiche région (openRegionFiche, vague E′c-R). */
let zoneContentsIdx = null;
function zoneContentsFor(zoneId) {
  if (zoneId == null) return null;
  if (!zoneContentsIdx) {
    zoneContentsIdx = new Map();
    const zc = S.zonesContents;
    if (Array.isArray(zc)) {
      zc.forEach(z => { const id = z && (z.zone_id != null ? z.zone_id : z.id); if (id != null && !zoneContentsIdx.has(id)) zoneContentsIdx.set(id, z); });
    } else if (zc && typeof zc === 'object') {
      for (const [id, z] of Object.entries(zc)) zoneContentsIdx.set(id, z);
    }
  }
  const v = zoneContentsIdx.get(zoneId);
  return v == null ? null : v;
}

/* Creep par clé (creeps.bin,  §2) : clé -> {name, family,
   disposition, …}. Objet indexé par clé (le cas courant) ou tableau {key|id, …}
   par robustesse. Consommé par la future fiche faune/creep (openWildlifeFiche)
   et dispositionFor ci-dessous. */
let creepIdx = null;
function creepFor(key) {
  if (!key) return null;
  if (!creepIdx) {
    creepIdx = new Map();
    const cr = S.creeps;
    if (Array.isArray(cr)) {
      cr.forEach(c => { const k = c && (c.key != null ? c.key : c.id); if (k != null && !creepIdx.has(k)) creepIdx.set(k, c); });
    } else if (cr && typeof cr === 'object') {
      for (const [k, c] of Object.entries(cr)) creepIdx.set(k, c);
    }
  }
  const v = creepIdx.get(key);
  return v == null ? null : v;
}

/* Disposition NORMALISÉE d'une entité -> "peaceful"|"neutral"|"hostile"|… :
   `creeps.disposition` est une CHAÎNE (creeps.bin) ; une future disposition de
   monstre pourra arriver en chaîne OU en objet {value} ( §2 /
   blueprint §3.3 « normalize on read ») — aplatie ici à la lecture. Index
   paresseux fusionnant S.creeps puis S.monsters (le creep gagne si les deux
   portent la clé). Consommé par la future DispositionBadge (vague E′c-4). */
let dispositionIdx = null;
function normDisposition(d) {
  if (d == null) return null;
  if (typeof d === 'string') return d;
  if (typeof d === 'object') return d.value != null ? d.value : null;
  return null;
}
function dispositionFor(key) {
  if (!key) return null;
  if (!dispositionIdx) {
    dispositionIdx = new Map();
    for (const [k, c] of Object.entries(S.creeps || {})) {
      const d = normDisposition(c && c.disposition);
      if (d != null) dispositionIdx.set(k, d);
    }
    for (const [k, m] of Object.entries(S.monsters || {})) {
      if (dispositionIdx.has(k)) continue;
      const d = normDisposition(m && m.disposition);
      if (d != null) dispositionIdx.set(k, d);
    }
  }
  const v = dispositionIdx.get(key);
  return v == null ? null : v;
}

/* Zones nommées où un monstre apparaît : désormais SERVIES par le pipeline
   (champ `m.zones`,  — croisement camps
   ⨯ régions, hors zone attrape-tout « Restricted Area »). L'ancien calcul
   client (monsterZones/pointInRing, buggé par la dominance de Restricted Area)
   est retiré : les vues lisent directement `m.zones`, cohérent avec la
   géométrie zones_geo.json que le même build publie. */

/* Rechargement (setLang) : les jeux différés vont être re-fetchés — repartir
   « non prêts » pour que whenDeferred() re-file bien après le nouveau load. */
function resetDeferred() { deferredReady = false; }

export {
  fetchJson, dataPath, loadCritical, loadDeferred, whenDeferred,
  resetDeferred, monsterKeyFor, npcIndexByName, loreIndexFor, locationIndexForId, lootTableItems,
  zoneContentsFor, creepFor, dispositionFor,
  buildDecorGroups, initVersion, bootVersionStamp, fetchVersionStamp,
};
