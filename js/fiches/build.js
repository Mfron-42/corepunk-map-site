/* Kwalat — fiches/build.js (NEW, vague E'c-8, blueprint §1.2/§6.2/§7/§8 R5).
   Talent / spécialisation / métier — catalogues GLOBAUX SANS position (aucune
   surface carte : blueprint §5 R5 "search+fiche only", opt L3, lowest
   priority, cuttable). openTalentFiche(node) / openSpecFiche(code) /
   openProfessionFiche(key), câblés dans fiches/core.js (jetons tal/spec/prof)
   et le barrel fiches.js.

   FORME RÉELLE des 3 bins (talents.bin/specializations.bin/professions.bin,
   scaffolding E'c-0, décodés directement pour cette mission — LA leçon
   récurrente : le blueprint supposait un champ level/tree-position séparé
   par talent, qui N'EXISTE PAS) :
     - talent   : {system, subtype, node, name?, description?} — `node` est la
       clé STABLE (1386/1462 en portent une, unique ; 76 entrées "artifact_chip"
       n'ont NI node NI name — des stubs sans contenu, jamais indexés/ouvrables,
       absence honnête). Pas de champ level/position numérique : `node`
       encode positionnellement l'emplacement dans une grille de talents côté
       moteur (ex. "BOM_S1_E1E2"), jamais décomposé ici en coordonnées
       inventées — montré tel quel en dernier recours (repli pretty()).
     - spécialisation : {code, class, name, description?, avatar_icon?} — 20
       entrées. `avatar_icon` (chemin client brut, ex.
       "UI/Icons/HeroAvatars/Hero/Cha_destroyer_f") NE correspond À AUCUN
       fichier réellement servi sous site/icons (vérifié : aucune des 20
       valeurs ne matche un asset -- seuls 6 spec/mastery icons existent sous
       des noms complètement différents, ex. npc_specialization_mastery_
       destroyer.png) → jamais utilisé comme src d'image (aucune URL devinée),
       aucun avatar rendu (repli honnête, comme un item sans icône).
     - métier : {key, display_name, description?, tier_unlocks?} — 18
       entrées. `display_name` EST déjà le jeton que professionLabel()
       traduit ailleurs (item.prof, ex. "Alchemy"/"Mining" — vérifié
       byte-exact contre config.js i18n `profession` table) : réutilisé tel
       quel, aucune nouvelle table de libellés pour les 9 métiers déjà
       couverts (Alchemy/Butchery/Construction/Cooking/Herbalism/Logging/
       Mining/Mysticism/Weaponsmithing) ; les 9 autres (Archeology/Artisan/
       Assassin/Assembler/Fisher/Merchant/Pathfinder/Robber/Tamer) dégradent
       honnêtement sur l'anglais (aucune traduction inventée).

   Réalité DONNÉES à noter (rapport de mission) : les 3 bins EN/FR/RU/UK/ES
   expédient actuellement un contenu IDENTIQUE (name/description anglais dans
   les 5 bundles langue — vérifié byte-exact) : le texte affiché ne varie pas
   encore avec la langue active, comme tout contenu non encore localisé côté
   pipeline (hors périmètre de cette vague, data/pipeline). Le CHROME de ce
   module (titres de section, mots de kind, badges) est lui pleinement ×5.

   Honnêteté :
   - `{{mustache}}` non résolu (talent.description, ~455/1382 descriptions
     décodées) → le placeholder de rang SANCTIONNÉ (varPlaceholder,
     core.js), jamais affiché brut.
   - Tags de mise en forme du CLIENT (<w>/<gray>/<rh>/<hpow>/<md>/<ctrl>/…,
     92 % des descriptions de talent) : AUCUN canal de rendu riche n'existe
     encore côté site pour ce vocabulaire précis (le canal capacité les a
     déjà nettoyés en amont côté pipeline pour abilities.bin ; talents.bin
     non) — dépouillés en texte clair plutôt qu'échappés bruts (qui
     afficherait un plat "&lt;w&gt;" illisible) : perte de la coloration du
     jeu, jamais de garbage ni de HTML non échappé.
   - AUCUN ref() drawable ici : talent/spécialisation/métier n'ont aucune
     position (mode 'N' implicite de mapref.js pour tout kind non enregistré
     dans son registre KINDS — cette vague n'y ajoute rien, voir le rapport :
     mapref.js/main.js sont hors périmètre de cette mission).
   - Croisements CROISÉS, jamais inventés :
     · talent → capacité : nom IDENTIQUE (fold) à une entrée S.abilities →
       `[Ability]` cliquable (ref(), kind DÉJÀ câblé dans main.js) + badge
       `inferred` explicite (jointure par nom, jamais une clé assertée —
       même discipline que le nom-fold donneur de quête ailleurs).
     · talent (system=class_spec) → spécialisation : préfixe BYTE-EXACT de
       `node` (`node===code` ou `node.startsWith(code+'_')`), PAS de fold/
       heuristique — ne couvre que 5/20 codes aujourd'hui (BOM_S1/BOM_S3/
       CHA_S1/CHA_S2/CHA_S3, vérifié par décodage direct ; les 15 autres,
       dont le cas "WAR_S1" côté moteur qui correspond en réalité à ORC_S1
       — avatar_icon "War_legionary_m" — ne sont PAS devinés ici, absence
       honnête plutôt qu'un mapping non prouvé). Rendu en TEXTE SIMPLE, PAS
       un ref() cliquable : 'spec' n'est pas un kind du registre mapref.js
       et main.js n'a pas de case pour lui (voir rapport) — un ref() ici
       serait un clic mort.
     · métier → objets : `it.prof === profession.display_name` (jointure
       BYTE-EXACTE, vérifiée sur les 9 métiers craft/récolte, 21 à 417
       objets chacun) → `itemChip()` (kind 'item', déjà câblé partout). */
import { S } from '../state.js';
import { professionLabel, ABILITY_HEX } from '../config.js';
import { esc, fold, pretty } from '../utils.js';
import { tr, tbl } from '../i18n/index.js';
import { ref } from '../mapref.js';
import { ficheHeader, openFiche, setFicheHash, badge, varPlaceholder, itemChip, farmCapRows } from './core.js';

/* ── Palette locale ───────────────────────────────────────────────────────
   config.js est hors périmètre de cette vague (E'c-0 n'y a pas pré-posé de
   teinte build — seules région/disposition/palier-de-nœud l'ont été, voir
   config.js "SCAFFOLDING E'c-0"). 3 teintes choisies ici, cohérentes avec la
   palette existante (ADN cartographe + accent ambre), jamais dupliquées
   d'un kind existant — sans risque de collision de légende puisqu'AUCUNE des
   3 n'apparaît jamais dans l'arbre/la légende carte (aucune position, donc
   jamais une couche, blueprint §1.2). À faire migrer vers config.js si une
   vague ultérieure rouvre ce fichier. */
const TALENT_HEX = '#8dbf6b';       // vert sauge — nœud d'arbre de talents
const SPEC_HEX = '#c968a8';         // rose-magenta — identité de classe/rôle
const PROFESSION_HEX = '#b8973a';   // bronze doré — parenté thématique avec RECIPE_HEX (artisanat)

/* ── Index paresseux node -> talent (mémoïsé sur l'IDENTITÉ de S.talents,
   même idiome que fiches/zone.js nameToId — un sentinel ≠ toute valeur
   réelle distingue "pas encore posé" de "posé mais vide"). ── */
const TAL_UNSET = Symbol('tal-unset');
let _talByNode = new Map(), _talSrc = TAL_UNSET;
function talentIndex() {
  if (_talSrc !== S.talents) {
    _talByNode = new Map();
    for (const t of (S.talents || [])) if (t && t.node) _talByNode.set(String(t.node), t);
    _talSrc = S.talents;
  }
  return _talByNode;
}
function talentByNode(node) {
  if (node == null || node === '') return null;
  return talentIndex().get(String(node)) || null;
}

/* ── Index paresseux nom replié -> clé de capacité (jointure INFÉRÉE, jamais
   assertée — badge `inferred` posé à l'affichage). ── */
const AB_UNSET = Symbol('ab-unset');
let _abByName = new Map(), _abSrc = AB_UNSET;
function abilityNameIndex() {
  if (_abSrc !== S.abilities) {
    _abByName = new Map();
    for (const [k, a] of Object.entries(S.abilities || {})) {
      if (a && a.name) { const f = fold(a.name); if (!_abByName.has(f)) _abByName.set(f, k); }
    }
    _abSrc = S.abilities;
  }
  return _abByName;
}
function abilityKeyForName(name) {
  if (!name) return null;
  return abilityNameIndex().get(fold(name)) || null;
}

/* Spécialisation par code (20 entrées — un .find() suffit, aucun index). */
function specByCode(code) {
  return (S.specializations || []).find(s => s && s.code === code) || null;
}
/* Jointure talent(class_spec) -> spécialisation par préfixe BYTE-EXACT de
   `node` (voir doc de module). Le plus LONG code correspondant gagne (garde
   contre un futur code court qui serait aussi préfixe d'un code plus
   spécifique, ex. "BOM_S1" vs "BOM_S1_NEW" — pas observé aujourd'hui mais
   pas prouvé impossible). */
function specForTalent(t) {
  if (!t || t.system !== 'class_spec' || !t.node) return null;
  let best = null;
  for (const s of (S.specializations || [])) {
    if (!s || !s.code) continue;
    if (t.node === s.code || t.node.startsWith(s.code + '_')) {
      if (!best || s.code.length > best.code.length) best = s;
    }
  }
  return best;
}

/* Métier par clé (18 entrées). */
function professionByKey(key) {
  return (S.professions || []).find(p => p && p.key === key) || null;
}

/* ── Texte de talent : {{mustache}} -> placeholder de rang sanctionné, tags
   de mise en forme du client dépouillés en clair (voir doc de module — aucun
   canal riche pour ce vocabulaire côté site aujourd'hui). Même sentinelle
   \x01N\x01 que fiches/item.js effectResolvedTextHtml, copie locale
   volontaire (module distinct, pas d'export interne à réutiliser sans
   toucher item.js — hors périmètre de cette vague). ── */
const MUSTACHE_RE = /\{\{[^}]*\}\}/g;
const CLIENT_TAG_RE = /<\/?[a-zA-Z][\w]*\b[^>]*>/g;
const SENTINEL_RE = /\x01(\d+)\x01/g;
function renderTalentDescHtml(raw) {
  if (!raw) return '';
  const tokens = [];
  const withSentinels = String(raw).replace(MUSTACHE_RE, m => { tokens.push(m); return `\x01${tokens.length - 1}\x01`; });
  const stripped = withSentinels.replace(CLIENT_TAG_RE, '');
  let out = '', last = 0, m;
  SENTINEL_RE.lastIndex = 0;
  while ((m = SENTINEL_RE.exec(stripped))) {
    out += esc(stripped.slice(last, m.index)).replace(/\n/g, '<br>');
    // `runtime:false` -- valeur réelle simplement non extraite du client à ce
    // jour (jamais une valeur calculée en jeu par nature, qu'on ne peut pas
    // distinguer ici sans classification pipeline — voir doc de module) ;
    // ton muet cohérent avec une absence honnête plutôt que le ton accent
    // "runtime" (réservé aux cas confirmés ShieldValue/CurrentStack ailleurs).
    out += varPlaceholder(false, tokens[+m[1]]);
    last = SENTINEL_RE.lastIndex;
  }
  out += esc(stripped.slice(last)).replace(/\n/g, '<br>');
  return out;
}

const talentSystemLabel = s => tbl('talentSystem', s) || pretty(s);
const talentSubtypeLabel = s => tbl('talentSubtype', s) || pretty(s);

/* ── openTalentFiche(node) ──────────────────────────────────────────────── */
function openTalentFiche(node) {
  const t = talentByNode(node);
  if (!t) return;   // clé inconnue (ou un des 76 stubs sans node) -- jamais une fiche vide
  S.openFiche = { kind: 'talent', id: t.node };
  const name = t.name || pretty(t.node);   // jamais de titre vide -- repli honnête sur la clé
  const kindBits = [tr('talentFicheKind'), talentSystemLabel(t.system), talentSubtypeLabel(t.subtype)]
    .filter(Boolean).join(' · ');
  const descHtml = t.description
    ? `<div class="fiche-section"><p class="use-effect-text">${renderTalentDescHtml(t.description)}</p></div>` : '';
  // Spécialisation portante (préfixe node byte-exact, 5/20 codes seulement) :
  // TEXTE simple, jamais un ref() -- voir doc de module, 'spec' n'a pas de
  // case main.js (clic mort évité).
  const spec = specForTalent(t);
  const specHtml = spec
    ? `<div class="fiche-section"><p class="hint">${esc(tr('specFicheKind'))} — ${esc(spec.name)}</p></div>` : '';
  // Capacité au nom identique (jointure INFÉRÉE, badge explicite) : `[Ability]`
  // cliquable -- kind DÉJÀ câblé dans main.js (ref-open -> openAbilityFiche).
  const abKey = abilityKeyForName(t.name);
  const abilityHtml = abKey
    ? `<div class="fiche-section"><h4 class="fiche-sub">${esc(tr('abilityLabel'))}</h4>
        <div class="frow">${ref({ kind: 'ability', key: abKey, label: S.abilities[abKey].name, hasFiche: true, hex: ABILITY_HEX })}${badge({ axis: 'provenance', value: 'inferred' })}</div></div>`
    : '';
  openFiche(`
    ${ficheHeader({ name, hex: TALENT_HEX, sub: esc(kindBits) })}
    ${descHtml}${specHtml}${abilityHtml}`);
  setFicheHash(null);
}

/* ── openSpecFiche(code) ───────────────────────────────────────────────── */
function openSpecFiche(code) {
  const s = specByCode(code);
  if (!s) return;
  S.openFiche = { kind: 'spec', id: s.code };
  // `s.class` (jeton moteur brut, ex. "BOM"/"CHA"/"ORC") : aucune table de
  // libellé fiable n'existe pour ces abréviations (classlabels.js couvre un
  // AUTRE système, coffres/décor -- voir son en-tête) -- montré tel quel,
  // jamais traduit au hasard (même discipline que les codes moteur AC1/ACP1
  // de item.js rarityColsGridHtml : "jamais des noms de stats joueur, on
  // n'en invente pas").
  const sub = [tr('specFicheKind'), s.class].filter(Boolean).join(' · ');
  const descHtml = s.description
    ? `<div class="fiche-section"><p class="fiche-journal">${esc(s.description)}</p></div>` : '';
  openFiche(`
    ${ficheHeader({ name: s.name || pretty(s.code), hex: SPEC_HEX, sub: esc(sub) })}
    ${descHtml}`);
  setFicheHash(null);
}

/* Objets requérant ce métier (it.prof === profession.display_name, jointure
   BYTE-EXACTE -- voir doc de module). Plafonné + "+N" (farmCapRows, même
   composant que la section farm de la fiche objet), chaque ligne = itemChip
   (kind 'item', déjà câblé) -- réutilise tel quel le libellé "+N" partagé
   (farmMoreCampsN est un texte générique "+N de plus/more/…" dans les 5
   locales malgré son nom, aucune nouvelle clé nécessaire). isTest exclu
   (même garde que partout : contenu dev jamais montré par défaut). */
function professionItemsHtml(p) {
  const keys = Object.entries(S.items || {})
    .filter(([, it]) => it.prof === p.display_name && !it.isTest)
    .sort((a, b) => (a[1].name || '').localeCompare(b[1].name || ''))
    .map(([k]) => k);
  if (!keys.length) return '';
  return `<div class="fiche-section"><h3>${esc(tr('professionItemsTitle', keys.length))}</h3>
    ${farmCapRows(keys, itemChip, n => tr('farmMoreCampsN', n))}</div>`;
}
/* Paliers de progression (p.tier_unlocks[], texte libre du client) — puce
   simple par ligne (aucun style dédié : réutilise .hint, aucune CSS neuve). */
function professionTiersHtml(p) {
  if (!p.tier_unlocks?.length) return '';
  return `<div class="fiche-section"><h3>${esc(tr('professionTiersTitle'))}</h3>
    ${p.tier_unlocks.map(u => `<p class="hint">• ${esc(u)}</p>`).join('')}</div>`;
}

/* ── openProfessionFiche(key) ─────────────────────────────────────────── */
function openProfessionFiche(key) {
  const p = professionByKey(key);
  if (!p) return;
  S.openFiche = { kind: 'profession', id: p.key };
  // `professionLabel` (config.js) traduit déjà `display_name` pour les 9
  // métiers craft/récolte préexistants (item.prof partage EXACTEMENT ces
  // mêmes chaînes, vérifié) -- réutilisé tel quel, aucune nouvelle table :
  // les 9 métiers non couverts (Archeology/Artisan/Assassin/Assembler/
  // Fisher/Merchant/Pathfinder/Robber/Tamer) dégradent honnêtement sur son
  // repli pretty() (l'anglais déjà correct, jamais une traduction devinée).
  const label = professionLabel(p.display_name);
  const descHtml = p.description
    ? `<div class="fiche-section"><p class="fiche-journal">${esc(p.description)}</p></div>` : '';
  openFiche(`
    ${ficheHeader({ name: label, hex: PROFESSION_HEX, sub: esc(tr('professionFicheKind')) })}
    ${descHtml}
    ${professionTiersHtml(p)}
    ${professionItemsHtml(p)}`);
  setFicheHash(null);
}

// Teintes exportées pour search.js (rangées de résultats build) -- SOURCE
// UNIQUE, jamais un hex dupliqué en dur au second site d'appel.
export { openTalentFiche, openSpecFiche, openProfessionFiche, TALENT_HEX, SPEC_HEX, PROFESSION_HEX };
