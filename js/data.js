/* Kwalat — accès aux données : décodage .bin (en-tête 4 octets + gzip),
   chargements critique/différé, et requêtes de catalogue (résolutions
   mob→monstre, nom→PNJ, monstre→bestiaire — index paresseux, invalidés
   à chaque rechargement des jeux différés). */
import { S } from './state.js';
import { fold } from './utils.js';
import { buildRarityGroups } from './rarity.js';

/* ── Chargement des données ─────────────────────────────────── */
/* Chaque *.json de data/ est publié en .bin : un en-tête custom de 4 octets
   (friction anti-scraping — ce n'est PAS du chiffrement, juste de quoi faire
   échouer `curl | gunzip`/`file`/`zcat` — plus reconnu comme gzip sans
   passer par ce module) suivi d'un flux gzip -9 du JSON. site_meta.json
   reste seul en clair (petit, non sensible). Décodage mesuré < 40 ms/fichier
   (fetch + DecompressionStream natif, même API que tout navigateur récent). */
const BIN_HEADER_LEN = 4; // doit rester synchro avec le générateur des .bin
async function fetchBin(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(path + ' → ' + r.status);
  const gz = (await r.arrayBuffer()).slice(BIN_HEADER_LEN);
  const stream = new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'));
  return JSON.parse(await new Response(stream).text());
}
async function fetchJson(path) {
  if (path.endsWith('.bin')) return fetchBin(path);
  const r = await fetch(path);
  if (!r.ok) throw new Error(path + ' → ' + r.status);
  return r.json();
}

/* Every language-sensitive dataset file lives under site/data/<lang>/ (one
   full, self-contained build per site language). tiles/icons/tiles_meta.json
   stay unprefixed (language-independent, shared, never duplicated). */
const dataPath = name => `data/${S.lang}/${name}`;

/* Sous-types de contenant placé (chests.bin `type` : Chest/Barrel/Boxes/
   Cabinet/Kitchen/Corpse… — champ moteur réel, voir config.js chestTypeLabel
   et data/SCHEMA.md "Chest loot + type") : compte chaque type présent et
   reconstruit S.chestTypes en préservant l'état on/off précédent (même
   principe que le prevOn de loadDeferred ci-dessous pour S.camps) — un type
   déjà connu garde son cochage, un type nouvellement vu démarre coché (le
   sous-filtre affiche tout par défaut). */
function buildChestTypes(chests, prevOn = {}) {
  const counts = {};
  for (const c of chests) {
    const t = c.type || 'Chest';
    counts[t] = (counts[t] || 0) + 1;
  }
  const next = {};
  for (const [t, count] of Object.entries(counts)) next[t] = { on: t in prevOn ? prevOn[t] : true, count };
  return next;
}

/* Chemin critique : tout ce qu'il faut pour la première peinture (carte,
   panneau, recherche PNJ/POI/quêtes/objets, fiche quête complète avec ses
   items). Coupe ~5,7 Mo (camps + recettes + vendeurs + fiches camp) du
   JSON chargé avant que le voile de chargement ne disparaisse. */
async function loadCritical() {
  const [npcs, pois, quests, qao, workshops, chests, meta, zonesGeo, zonesQuest, items] = await Promise.all([
    fetchJson(dataPath('npcs.bin')), fetchJson(dataPath('interest_points.bin')),
    fetchJson(dataPath('quests.bin')), fetchJson(dataPath('quest_objects.bin')),
    fetchJson(dataPath('workshops.bin')), fetchJson(dataPath('chests.bin')),
    fetchJson(dataPath('site_meta.json')).catch(() => ({})),
    fetchJson(dataPath('zones_geo.bin')).catch(() => []),
    fetchJson(dataPath('zones_quest_geo.bin')).catch(() => ({})),
    fetchJson(dataPath('items.bin')).catch(() => ({})),
  ]);
  S.data = { npc: npcs, poi: pois, quest: quests, qao, workshop: workshops, chest: chests };
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
  const kwPrevSrc = S.map === 'Kwalat' ? S.chestTypes : (S.mapCache.Kwalat && S.mapCache.Kwalat.chestTypes) || {};
  for (const [t, st] of Object.entries(kwPrevSrc)) kwPrevOn[t] = st.on;
  const kwChestTypes = buildChestTypes(chests, kwPrevOn);
  if (S.mapCache.Kwalat) S.mapCache.Kwalat.chestTypes = kwChestTypes;
  if (S.map === 'Kwalat') S.chestTypes = kwChestTypes;
  buildRarityGroups();    // regroupe les variantes de rareté « même nom » (voir rarity.js)
  lootTableIdx = null;    // index paresseux table→items (voir lootTableItems)
  monsterZonesIdx = null; // les zones (zonesGeo) viennent d'être rechargées (voir monsterZones)
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
  const [camps, campDetails, recipes, vendors, monsters, monsterModels, locations, abilities, events] = await Promise.all([
    fetchJson(dataPath('camps.bin')).catch(() => []),
    fetchJson(dataPath('camp_details.bin')).catch(() => ({})),
    fetchJson(dataPath('recipes.bin')).catch(() => ({})),
    fetchJson(dataPath('vendors.bin')).catch(() => ({})),
    fetchJson(dataPath('monsters.bin')).catch(() => ({})),
    // Modèles de monstre (feature #12 — un modèle regroupe tous les niveaux/
    // variantes d'une même créature ; voir data/SCHEMA.md, js/fiches.js
    // openMonsterFiche « fiche modèle + sélecteur de variante »). Chargé ici
    // (déferré) plutôt qu'au critique : jamais consulté avant la première
    // fiche/recherche monstre, comme monsters.bin lui-même.
    fetchJson(dataPath('monster_models.bin')).catch(() => ({})),
    fetchJson(dataPath('locations.bin')).catch(() => []),
    fetchJson(dataPath('abilities.bin')).catch(() => ({})),
    fetchJson(dataPath('events.bin')).catch(() => []),
  ]);
  S.campDetails = campDetails;
  S.recipes = recipes;
  S.vendors = vendors;
  S.monsters = monsters;
  S.monsterModels = monsterModels;
  S.locations = locations;
  S.abilities = abilities;
  S.events = events;
  monsterNameIdx = null;   // index paresseux mob→monstre (voir monsterKeyFor)
  monsterLoreIdx = null;   // index paresseux monstre→entrée de bestiaire (voir loreIndexFor)
  monsterZonesIdx = null;  // index paresseux monstre→zones (voir monsterZones)
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
   Un mob de camp (camp_details) porte sa clé de variante exacte ; le
   catalogue monstres (S.monsters) ne garde qu'une variante REPRÉSENTATIVE
   par nom (488/576 clés directes) — repli par nom replié pour les variantes
   regroupées, jamais de lien inventé si aucune fiche n'existe. Index paresseux,
   invalidé quand S.monsters est rechargé (loadDeferred/setLang). */
let monsterNameIdx = null;
function monsterKeyFor(key, name) {
  if (key && S.monsters[key]) return key;
  if (!monsterNameIdx) {
    monsterNameIdx = new Map();
    for (const [k, m] of Object.entries(S.monsters)) {
      const n = fold(m.name);
      if (!monsterNameIdx.has(n)) monsterNameIdx.set(n, k);
    }
  }
  return monsterNameIdx.get(fold(name || '')) || null;
}
/* PNJ par nom exact → index de fiche (carte ACTIVE uniquement : les données
   vendeurs/acteurs citent des noms, pas des index). -1 si inconnu ici. */
function npcIndexByName(name) {
  if (!name) return -1;
  return (S.data.npc || []).findIndex(n => n.name === name);
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

/* Index inverse des tables de butin : items.bin ne stocke le butin QUE côté
   item (item → [{label, w, c, g}]) ; on le retourne ici en table → items
   pour les fiches « table de butin » (coffres fouillables, caisses de la
   ferme, cercueils…). Chaque ligne reprend TELS QUELS les taux déjà publiés
   côté item — aucune donnée nouvelle, juste l'autre sens de lecture.
   Paresseux, invalidé quand le catalogue d'objets est rechargé (setLang). */
let lootTableIdx = null;
function lootTableItems(label) {
  if (!lootTableIdx) {
    lootTableIdx = new Map();
    for (const [key, it] of Object.entries(S.items)) {
      for (const d of it.drops || []) {
        let arr = lootTableIdx.get(d.label);
        if (!arr) lootTableIdx.set(d.label, arr = []);
        arr.push({ key, name: it.name, icon: it.icon || null, w: d.w, c: d.c, g: d.g });
      }
    }
  }
  return lootTableIdx.get(label) || null;
}

/* Zones nommées où un monstre apparaît : croisement de ses camps (points
   représentatifs x/z) avec les polygones des régions (zonesGeo, Kwalat) par
   lancer de rayon ; repli sur la clé de camp quand le point ne tombe dans
   aucun anneau (les clés se terminent par le slug de la région, ex.
   "monsters-boarmammoth-windreach-woods" → "Windreach Woods"). Index
   paresseux pour tout le catalogue, invalidé quand monstres OU zones sont
   rechargés (setLang). Ne fabrique rien : un monstre sans camp catalogué
   n'a simplement aucune zone. */
let monsterZonesIdx = null;
function pointInRing(x, z, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i], [xj, zj] = ring[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
function monsterZones(key) {
  if (!monsterZonesIdx) {
    monsterZonesIdx = new Map();
    const zones = S.zonesGeo || [];
    const bySlug = zones.map(zn => ({ zn, slug: fold(zn.name) }));
    for (const [k, m] of Object.entries(S.monsters || {})) {
      const names = new Set();
      for (const c of m.camps || []) {
        let hit = null;
        if (c.x != null) {
          for (const zn of zones) {
            if (zn.rings?.some(ring => pointInRing(c.x, c.z, ring))) { hit = zn.name; break; }
          }
        }
        if (!hit && c.camp) {
          const folded = fold(String(c.camp));
          for (const { zn, slug } of bySlug) {
            if (slug && folded.endsWith(slug)) { hit = zn.name; break; }
          }
        }
        if (hit) names.add(hit);
      }
      monsterZonesIdx.set(k, [...names]);
    }
  }
  return monsterZonesIdx.get(key) || [];
}

/* Rechargement (setLang) : les jeux différés vont être re-fetchés — repartir
   « non prêts » pour que whenDeferred() re-file bien après le nouveau load. */
function resetDeferred() { deferredReady = false; }

export {
  fetchJson, dataPath, loadCritical, loadDeferred, whenDeferred,
  resetDeferred, monsterKeyFor, npcIndexByName, loreIndexFor, lootTableItems,
  monsterZones, buildChestTypes,
};
