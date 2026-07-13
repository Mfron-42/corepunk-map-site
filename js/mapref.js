/* Kwalat — EntityRef (◇) : LA référence d'entité unique du site, rendue
   uniformément « [Kind(●)] Nom » (kind TOUJOURS en premier). Un même composant
   pour tout ce qui référence une entité du jeu (espèce, objet, PNJ, camp,
   quête, recette, zone…) ; le tracé carte n'est qu'une CAPACITÉ, pas un
   prérequis. Contrat figé :  (RATIFIÉ
   2026-07-11) — §2 grammaire de la pastille, §3 vocabulaire des kinds, §5
   API/markup. VAGUE 0 : le composant + le plomberie d'événements SEULEMENT
   (aucune migration de site d'appel — les vagues 1-6 s'en chargent).

   TROIS capacités orthogonales, TROIS parties (§1.1) :
     - kind tag  : la pastille colorée qui nomme le KIND (mot localisé complet,
                   kind-first) — TOUJOURS présente ;
     - pastille  : le point d'état DANS les parens `(●)`, présent ⇔ l'entité a
                   ≥1 position et/ou ≥1 zone (dessinable) ; sa REMPLISSAGE
                   encode dessiné-maintenant (●/○/◐/⊘) — jamais un `(N)`/`(*)`
                   littéral (§2.2, ratifié Q3) ;
     - libellé   : le nom localisé, SOULIGNÉ ⇔ une fiche existe à ouvrir (§3.5).

   DEUX cibles de clic, pas de troisième (§1) :
     - clic sur le libellé souligné → `ref-open`  (ouvre la fiche) ;
     - clic sur le tag/la pastille  → `ref-draw`  (bascule le tracé carte).
   Un SEUL délégué (initMapRefDelegation) décode ces deux gestes ; le routage
   vers openXFiche/activate* vit chez l'appelant (main.js/router, §5.3) — le
   composant ne connaît AUCUN opener, il n'émet que le markup + les data-*.

   Surface publique (minimale, cf. §5.1/5.3) :
     - ref(desc)            → chaîne HTML (l'idiome template-string du site) ;
     - refEl(desc)          → nœud DOM (contextes impératifs : légende/arbre) ;
     - refList(descs)       → concat de ref() ;
     - refKindLabel(kind,o) → mot de kind localisé (pluriel = tout-vs-un) ;
     - refKindColor(desc)   → teinte §3 (source unique, jamais une teinte neuve) ;
     - initMapRefDelegation(rootEl, {open, draw}) → l'unique écouteur délégué.

   Réutilise EXCLUSIVEMENT des sources existantes : teintes de config.js
   (CATS/CAMP_COLORS/…, jamais une couleur neuve — même discipline qu'ecAttr),
   mots de kind des tables i18n déjà expédiées (searchCat/cat/campKind), état
   dessiné lu en direct sur S.* (§5.1) — la pastille ne détient jamais d'état
   privé (§5.3, garantie du même-état). */
import { S } from './state.js';
import { entityColor, kindBaseHex } from './config.js';
import { tr, tbl } from './i18n/index.js';
import { esc, pretty } from './utils.js';

/* ── i18n : repli SÛR tant que la passe i18n (autre mission) n'a pas posé les
   clés EntityRef ──────────────────────────────────────────────────────────
   tr() renvoie la clé BRUTE quand elle manque : on la remplace par un libellé
   anglais neutre (jamais un jeton technique à l'écran). Les mots de kind
   passent par tbl() (undefined si absent) + repli du même tableau. Ces replis
   disparaissent d'eux-mêmes dès que /mapref_wave0_i18n.staged.js est
   appliqué (aucune régression : mêmes clés). */
const UI_FALLBACK = {
  refDrawShow: name => `Show ${name} on map`,
  refDrawHide: name => `Hide ${name} from map`,
  refOpenLabel: name => `Open ${name}`,
};
function uiRef(key, ...args) {
  const v = tr(key, ...args);
  if (v !== key) return v;                  // clé présente (i18n appliqué)
  const fb = UI_FALLBACK[key];
  return typeof fb === 'function' ? fb(...args) : (fb ?? key);
}
/* Mots de kind ADDITIONNELS (pas dans searchCat/cat/campKind) — repli local
   jusqu'à l'application de la table i18n `refKind` (staged). */
const KIND_WORD_FALLBACK = {
  loot: 'Loot table', position: 'Position', players: 'Players',
};
const kindWord = key => tbl('refKind', key) || KIND_WORD_FALLBACK[key] || pretty(key);
/* Libellés génériques anonymisés (§6.3, ensemble FERMÉ) — utilisés quand
   l'entité de fond est masquée/curatée : jamais la clé interne, jamais du lore
   inventé. Repli local jusqu'à la table i18n `refGeneric` (staged). */
const GENERIC_FALLBACK = {
  position: 'Quest position', object: 'Quest object',
  area: 'Quest area', target: 'Objective target',
};
const genericLabel = key => tbl('refGeneric', key) || GENERIC_FALLBACK[key] || '';

/* Petits accès aux tables i18n existantes (mots de kind déjà localisés ×5). */
const sc = k => tbl('searchCat', k);        // Monster/Item/Npc/Family/… (singulier)
const ck = k => tbl('campKind', k);         // Monsters/Destroyables/… (kind de camp)
const ct = k => tbl('cat', k);              // NPCs/Workshops/… (catégorie, pluriel)

/* ── Registre des kinds (§3) ────────────────────────────────────────────────
   Chaque kind → { word(desc,plural), fiche (défaut has-fiche), mode (cycle de
   vie de tracé par défaut : E persistant-entité / C persistant-catégorie /
   L localise / N jamais dessinable) }.
   `word` renvoie le mot localisé : `plural` (vrai en mode catégorie) choisit
   la forme « tout » (pluriel), sinon la forme « un » (singulier) — c'est le
   pluriel/singulier du mot de kind qui porte la distinction tout-vs-un (§2.2),
   la pastille restant un pur indicateur d'état.
   COULEUR : plus AUCUNE teinte n'est stockée ici — refKindColor/refKindBaseColor
   délèguent à entityColor/kindBaseHex (config.js), LA source unique (le KIND
   fixe l'ancre du tag, l'IDENTITÉ la nuance du nom/de la pastille). L'appelant
   peut toujours forcer la teinte précise via desc.hex (espèce/famille/rareté). */
const KINDS = {
  // ── Dessinable + fiche (triple capacité) ──
  species:      { word: (d, pl) => pl ? ck('monsters') : sc('monster'), fiche: true, mode: 'E' },
  family:       { word: () => sc('family'),                             fiche: true, mode: 'E' },
  camp:         { word: () => sc('camp'),                               fiche: true, mode: 'E' },
  npc:          { word: (d, pl) => pl ? ct('npc') : sc('npc'),          fiche: true, mode: 'E' },
  workshop:     { word: (d, pl) => pl ? ct('workshop') : sc('workshop'), fiche: true, mode: 'C' },
  poi:          { word: (d, pl) => pl ? ct('poi') : sc('poi'),          fiche: true, mode: 'C' },
  zone:         { word: () => sc('zone'),                               fiche: false, mode: 'L' },  // souligné une fois la fiche région livrée (vague R)
  qao:          { word: (d, pl) => pl ? ct('qao') : sc('qao'),          fiche: false, mode: 'C' },
  chest:        { word: () => sc('chest'),                              fiche: true, mode: 'C' },
  // Coffre fouillable (searchable_chests.bin) : entité mono-point sans couche
  // d'arbre — mot localisé = son titre existant (searchableChestTitle, ×5) ;
  // déjà utilisé comme kind par la pastille d'en-tête (world.js scDot) et le
  // popup, jamais tombé sur pretty() anglais. mode N (l'affordance carte est un
  // pin LOCATE explicite, jamais une couche de catégorie).
  searchable_chest: { word: () => tr('searchableChestTitle'),           fiche: true, mode: 'N' },
  shrine:       { word: () => ck('shrines'),                            fiche: false, mode: 'C' },
  soulkeeper:   { word: () => ck('soulkeeper'),                         fiche: false, mode: 'C' },
  guard:        { word: () => ck('guards'),                             fiche: false, mode: 'C' },
  destructible: { word: () => ck('destroyable'),                        fiche: false, mode: 'C' },
  reactive:     { word: () => ck('reactive'),                           fiche: false, mode: 'C' },
  harvest:      { word: d => ck(d.subrole) || sc('node'),               fiche: false, mode: 'C' },
  // Couche « Animaux paisibles » (pool camp:wildlife) : la LOCALISATION
  // HONNÊTE par ZONE d'une espèce de faune SANS camp connu (tortues/vache/…,
  // fiches.js openWildlifeFiche — « montre la zone plutôt que rien »). Mode C
  // (couche de catégorie, aucune fiche) : la pastille bascule la couche d'arbre
  // camp:wildlife (fkey `camp:wildlife` → ref-draw retombe sur activateCategoryNode,
  // main.js) — jamais un point précis présenté comme l'animal lui-même.
  wildlife:     { word: () => ck('wildlife'),                           fiche: false, mode: 'C' },
  node:         { word: () => sc('node'),                               fiche: true, mode: 'N' },
  // ── Fiche seule (tag + libellé souligné, PAS de pastille) ──
  item:         { word: () => sc('item'),                               fiche: true, mode: 'N' },
  quest_item:   { word: () => tr('questItemBadge'),                     fiche: true, mode: 'N' },
  recipe:       { word: () => sc('recipe'),                             fiche: true, mode: 'N' },
  quest:        { word: () => sc('quest'),                              fiche: true, mode: 'N' },
  location:     { word: () => sc('location'),                           fiche: true, mode: 'N' },
  loot:         { word: () => kindWord('loot'),                         fiche: true, mode: 'N' },
  ability:      { word: () => sc('ability'),                            fiche: true, mode: 'N' },
  // Build (vague E'c-8, fiches/build.js) : talent/spécialisation/métier —
  // catalogues globaux SANS position (blueprint §1.2/§5 R5, opt L3) → aucune
  // pastille possible, mode 'N' honnête comme item/recipe/quest ci-dessus.
  // Mots déjà expédiés côté i18n (searchCat.talent/specialization/profession,
  // E'c-8) — réutilisés tels quels, aucune nouvelle clé. Le kind mapref
  // 'specialization' reste distinct du kind interne S.openFiche 'spec' (voir
  // fiches/core.js FICHE_TOKEN / fiches/build.js) : ce registre ne connaît que
  // le vocabulaire ref(), jamais le kind interne d'un opener.
  talent:       { word: () => sc('talent'),                             fiche: true, mode: 'N' },
  specialization: { word: () => sc('specialization'),                  fiche: true, mode: 'N' },
  profession:   { word: () => sc('profession'),                        fiche: true, mode: 'N' },
  // ── Localise / libellé seul (pas de fiche) ──
  position:     { word: () => kindWord('position'),                     fiche: false, mode: 'L' },
  players:      { word: () => kindWord('players'),                      fiche: false, mode: 'N' },
};

/* Mode de tracé effectif (surcharge desc.mode possible, sinon défaut du kind,
   sinon 'N' = jamais dessinable). */
function refMode(desc) {
  return desc.mode || (KINDS[desc.kind] && KINDS[desc.kind].mode) || 'N';
}

/* Mot de kind localisé — helper EXPORTÉ (les vagues 1-6 le réutilisent pour
   composer leurs descripteurs uniformément). `plural` force la forme « tout »
   (mode catégorie) ; le repli reste honnête (pretty(kind), jamais un jeton
   brut à l'écran). */
function refKindLabel(kind, { plural = false, subrole = null } = {}) {
  const spec = KINDS[kind];
  if (!spec) return pretty(kind);
  const w = spec.word({ kind, subrole }, plural);
  return w || pretty(kind);
}

/* Teinte PRÉCISE de la référence (--ref-c : le NOM + la pastille) — helper
   EXPORTÉ. Priorité : teinte propre à l'entité fournie par l'appelant
   (desc.hex — rareté/espèce/famille, même source que le pin/filtre carte) >
   entityColor(kind, IDENTITÉ) (config.js, LA source unique : ancre du kind +
   nuance par identité). L'IDENTITÉ = le nom (desc.label) sinon la clé ; une réf
   de CATÉGORIE (mode C) n'a PAS d'identité → seed nul → ancre exacte du kind
   (mono-ton). Jamais une couleur inventée ici : on ne fait que router. */
function refKindColor(desc) {
  if (desc.hex) return desc.hex;
  const seed = refMode(desc) === 'C'
    ? null
    : (desc.label != null && desc.label !== '' ? desc.label
      : (desc.key != null && desc.key !== '' ? String(desc.key) : null));
  return entityColor(desc.kind, seed, { subrole: desc.subrole });
}
/* Teinte d'ANCRE du kind (--ref-kc : le TAG) — présentation à deux tons : la
   pilule de kind porte la couleur CATÉGORIE (uniforme pour tous les PNJ, toutes
   les quêtes…), le nom/la pastille portent la nuance précise de l'entité. Pour
   les kinds sans ancre propre décidable (objet=rareté, camp sans sous-rôle) :
   repli sur la teinte précise → tag = nom (mono-ton, jamais un tag gris). */
function refKindBaseColor(desc) {
  return kindBaseHex(desc.kind, desc.subrole) || refKindColor(desc);
}

/* Has-fiche : le libellé est souligné ⇔ une page existe (§1.1). En mode
   catégorie (C), JAMAIS de page (exception ratifiée §3.5 : `[Npcs ●] All`
   n'est pas souligné) ; sinon défaut du kind ; surcharge desc.hasFiche. */
function hasFiche(desc) {
  if (desc.hasFiche !== undefined) return !!desc.hasFiche;
  if (refMode(desc) === 'C') return false;
  return !!(KINDS[desc.kind] && KINDS[desc.kind].fiche);
}

/* Dessinable : les kinds E/C/L portent une pastille (concept dessinable) —
   même vides ici (⊘), l'absence de pastille est réservée aux kinds N (rien à
   dessiner : `[Quest Item] Imp brain`). desc.drawable === false force l'absence. */
function isDrawable(desc) {
  if (desc.drawable === false) return false;
  return refMode(desc) !== 'N';
}

/* ── Q7 (spec §9, ratifié 2026-07-11 soir) : clé STABLE d'un pin locate ──
   Les pastilles mode L sont des TOGGLES (plus jamais un ping one-shot) : leur
   appartenance vit dans S.locates (Map clé→pin, session seule, posée par
   pins.js — jamais le hash en v1). La clé : data-key quand présent, sinon
   kind + carte + coordonnées ARRONDIES — deux refs qui visent le même point
   partagent donc la même clé (même pin, même état : deux conteneurs placés
   au MÊME endroit — ex. Posters 02/03 — sont UN SEUL pin, honnête). Helper
   EXPORTÉ : main.js (toggle) et sidebar.js (resync des pastilles) composent
   la MÊME clé, jamais re-dérivée par surface. Accepte les deux formes
   x/z (dataset relu) et pos:{x,z,map} (descripteur). */
function locateRefKey(kind, key, x, z, mapId) {
  if (key != null && key !== '') return `${kind}:${key}`;
  if (x == null || z == null || !Number.isFinite(+x) || !Number.isFinite(+z)) return null;
  return `${kind}:${mapId || S.map}:${Math.round(+x)},${Math.round(+z)}`;
}

/* État dessiné LU EN DIRECT sur S.* (§5.1/§5.3, garantie du même-état) —
   la pastille est une VUE de l'état, jamais un état privé. Priorité :
   desc.drawn explicite (les vagues fournissent l'état calculé) > lecture live.
   L'état ◐ partiel reste explicite (desc.partial) en vague 0 — sa dérivation
   (une catégorie dont certains enfants sont cochés) appartient à l'arbre
   (sidebar.js, vague 6). Mode L (Q7) : l'appartenance au jeu de pins locate
   S.locates EST l'état dessiné — aria-pressed/remplissage suivent tout seuls
   (refFill/tagHtml inchangés). Exception documentée : les refs zone
   data-subrole="goal-zone" (dynamicPosBadge) gardent leur drawn:false
   explicite — leur machinerie single-slot (drawGoalZone/currentGoalZones,
   indexée par fiche ouverte) n'est PAS un pin locate, suivi honnête en
   attente (voir fiches.js dynamicPosBadge). */
function liveDrawn(desc) {
  if (refMode(desc) === 'L') {
    const k = locateRefKey(desc.kind, desc.key, desc.pos?.x, desc.pos?.z, desc.pos?.map);
    return !!(k && S.locates?.has(k));
  }
  switch (desc.kind) {
    case 'species': return !!(S.monsp[desc.key] && S.monsp[desc.key].on);
    case 'family':  return !!(S.monfam[desc.key] && S.monfam[desc.key].on);
    case 'zone':    return !!S.zonesOn;
    // Couche « Animaux paisibles » (pool camp:wildlife) — l'état vit sur
    // S.camps.wildlife.on (la MÊME source que sa ligne d'arbre) ; jamais un
    // état privé. syncEntityRefDots resynchronise en plus par fkey (mode C).
    case 'wildlife': return !!(S.camps.wildlife && S.camps.wildlife.on);
    case 'poi':     return !!(S.poiTypes[desc.subrole || desc.key] && S.poiTypes[desc.subrole || desc.key].on);
    case 'camp': case 'shrine': case 'soulkeeper': case 'guard':
    case 'harvest': case 'destructible': case 'reactive': {
      const k = desc.subrole || desc.key;
      return !!(S.camps[k] && S.camps[k].on);
    }
    default: return false;
  }
}

/* Remplissage de la pastille (§2.1) : null = pas de pastille ; sinon
   'empty' ⊘ (dessinable mais 0 point sur la carte active — honnête, toujours
   montré) / 'empty-on' (⊘ ALLUMÉ : la couche est cochée mais n'a rien à
   dessiner ICI — feedback QA 2026-07-11 : un clic qui mute l'état sans
   aucun retour visuel est interdit, l'état dessiné se lit TOUJOURS, même à
   0 point) / 'partial' ◐ / 'on' ● / 'off' ○. Le 0-point (⊘) PRIME sur la
   forme : une référence dessinable avec 0 point ici n'est jamais « pas de
   pastille » — mais il ne masque plus l'état. */
function refFill(desc) {
  if (!isDrawable(desc)) return null;
  const drawn = desc.drawn !== undefined ? desc.drawn : liveDrawn(desc);
  if (desc.count === 0) return drawn ? 'empty-on' : 'empty';
  if (desc.partial) return 'partial';
  return drawn ? 'on' : 'off';
}

/* Suffixe méta muet (`· 926 pts`, niveau…) — explicite (desc.meta) sinon
   composé du compte via entityPtsN (réutilisé, jamais un `(N)` dans le tag). */
function refMeta(desc) {
  if (desc.meta != null) return desc.meta;
  if (desc.count != null && isDrawable(desc)) return `· ${tr('entityPtsN', desc.count)}`;
  return '';
}

/* Attributs de provenance non-visibles (§6.4) — traçabilité de la source
   masquée d'une référence dégradée ; consommés par _verify_ref_integrity.mjs,
   jamais montrés au joueur. */
function provAttrs(desc) {
  const p = desc.provenance;
  if (!p) return '';
  const a = [];
  if (p.srcKey) a.push(`data-src-key="${esc(p.srcKey)}"`);
  if (p.degradedFrom) a.push(`data-degraded="${esc(p.degradedFrom)}"`);
  if (p.gated) a.push(`data-gated="${esc(p.gated)}"`);
  return a.join(' ');
}

/* Cœur PARTAGÉ ref()/refEl() : résout toutes les facettes une fois. */
function refParts(desc) {
  const mode = refMode(desc);
  const plural = mode === 'C';
  return {
    kind: desc.kind,
    mode,
    color: refKindColor(desc),
    kindColor: refKindBaseColor(desc),
    word: refKindLabel(desc.kind, { plural, subrole: desc.subrole }),
    fiche: hasFiche(desc),
    fill: refFill(desc),
    label: desc.label != null ? desc.label : (desc.generic ? genericLabel(desc.generic) : ''),
    meta: refMeta(desc),
    count: desc.count,
  };
}

/* Le tag (pastille de kind) : BOUTON `ref-draw` quand dessinable (le mot + la
   bulle forment une seule cible de clic, §5.2), sinon un span inerte
   (décoratif). Titre/aria = Afficher/Masquer + compte honnête au survol. */
function tagHtml(p, name) {
  const word = `<span class="ref-kindword">${esc(p.word)}</span>`;
  if (p.fill == null) {
    return `<span class="ref-tag ref-tag-inert">${word}</span>`;
  }
  const on = p.fill === 'on' || p.fill === 'empty-on';
  const cntSuffix = p.count != null ? ` · ${tr('entityPtsN', p.count)}` : '';
  const title = `${on ? uiRef('refDrawHide', name) : uiRef('refDrawShow', name)}${cntSuffix}`;
  const aria = `${on ? uiRef('refDrawHide', name) : uiRef('refDrawShow', name)}${cntSuffix}`;
  return `<button type="button" class="ref-tag" data-act="ref-draw" aria-pressed="${on}"`
    + ` title="${esc(title)}" aria-label="${esc(aria)}">`
    + `${word}<span class="ref-bubble" data-fill="${p.fill}"></span></button>`;
}

/* Le libellé : BOUTON `ref-open` souligné quand une fiche existe, sinon un
   span en clair (jamais souligné — le soulignement EST le signal « ouvre une
   page », utilisé nulle part ailleurs, §1.1). Omis quand il n'y a pas de nom. */
function labelHtml(p) {
  if (!p.label) return '';
  if (p.fiche) {
    return `<button type="button" class="ref-label" data-act="ref-open"`
      + ` aria-label="${esc(uiRef('refOpenLabel', p.label))}">${esc(p.label)}</button>`;
  }
  return `<span class="ref-label ref-label-plain">${esc(p.label)}</span>`;
}

/* Attributs du conteneur `.ref` : le contrat DOM stable que le délégué relit
   pour router (kind/key/mode/fkey/family/position/zone) + provenance. */
function wrapAttrs(desc, p) {
  const a = [
    `class="ref${p.fiche ? ' ref-has-fiche' : ''}${p.fill === 'empty' ? ' ref-empty' : ''}${p.fill === 'partial' ? ' ref-partial' : ''}"`,
    `data-kind="${esc(desc.kind)}"`,
    `data-mode="${esc(p.mode)}"`,
    desc.key != null ? `data-key="${esc(String(desc.key))}"` : '',
    desc.fkey ? `data-fkey="${esc(desc.fkey)}"` : '',
    desc.family ? `data-family="${esc(desc.family)}"` : '',
    desc.subrole ? `data-subrole="${esc(desc.subrole)}"` : '',
    desc.pos ? `data-x="${esc(String(desc.pos.x))}" data-z="${esc(String(desc.pos.z))}"${desc.pos.map ? ` data-map="${esc(desc.pos.map)}"` : ''}` : '',
    desc.zone != null ? `data-zone="${esc(String(desc.zone))}"` : '',
    // Nom de l'entité porté sur le conteneur pour les refs LOCATE (mode L) :
    // une pastille d'EN-TÊTE (refDot) n'a PAS de `.ref-label` d'où relire le
    // nom, donc le pin déposé (et sa tag de légende) retomberait sur le mot de
    // kind (« Quête »/« PNJ ») au lieu du nom réel (« Facing the Flame »/
    // « Zugg Clankwhistle »). data-label le fournit à readRefInfo → même nom
    // partout : titre, pin, bandeau-légende. Émis seulement en mode L (les refs
    // pleines portent déjà leur nom dans `.ref-label`).
    p.mode === 'L' && p.label ? `data-label="${esc(p.label)}"` : '',
    provAttrs(desc),
    // Deux tons : --ref-c = teinte PRÉCISE de l'entité (nom + pastille) ;
    // --ref-kc = ancre du KIND (tag). Émis même quand identiques (catégorie /
    // kind sans ancre → mono-ton visuel, aucune régression).
    `style="--ref-c:${p.color};--ref-kc:${p.kindColor}"`,
  ];
  return a.filter(Boolean).join(' ');
}

/* ── API publique ─────────────────────────────────────────────────────────── */

/* ref(desc) → chaîne HTML. `desc` : { kind (requis), key, label, fkey, mode,
   hex, hasFiche, drawable, drawn, partial, count, pos:{x,z,map?}, zone,
   subrole, generic, provenance } — tout optionnel sauf kind ; le builder
   résout le reste (couleur, capacités, état) pour que les appelants ne
   re-dérivent jamais (§5.1). */
function ref(desc) {
  if (!desc || !desc.kind) return '';
  const p = refParts(desc);
  const name = p.label || p.word;
  return `<span ${wrapAttrs(desc, p)}>${tagHtml(p, name)}${labelHtml(p)}${p.meta ? `<span class="ref-meta">${esc(p.meta)}</span>` : ''}</span>`;
}

/* refDot(desc) → SEULEMENT la pastille toggle (le contrat DOM `.ref` + le
   bouton `ref-draw` + `.ref-bubble`), SANS mot de kind ni libellé — pour
   l'EN-TÊTE DE FICHE (TASK 1) où le NOM est le titre h2 séparé (coloré) et le
   mot de kind vit dans le sous-titre. Même cœur (refParts/refFill/wrapAttrs)
   qu'un ref() complet → UNE seule source d'état : la pastille d'en-tête se
   resynchronise via syncEntityRefDots (sélecteur `.ref[data-mode] [data-act=
   "ref-draw"]`, indépendant de la présence du mot/libellé) et se route par la
   MÊME délégation (initMapRefDelegation) qu'une pastille d'arbre/de chip —
   aucune sémantique parallèle.
   Renvoie '' quand la référence n'est PAS dessinable (règle owner 2026-07-12 :
   pas de pastille s'il n'y a AUCUNE position/point à afficher sur la carte
   active — une pastille qui ne bascule rien est inutile) : l'en-tête n'affiche
   alors qu'un titre coloré, sans pastille. L'appelant gate `drawable` sur
   l'existence réelle de points (speciesPoints/familyPoints) ou de position
   (locate) — le ⊘ « dessinable mais 0 point ici » n'est plus émis pour ces
   pastilles d'affordance. */
function refDot(desc) {
  if (!desc || !desc.kind) return '';
  const p = refParts(desc);
  if (p.fill == null) return '';                 // non dessinable → aucune pastille
  const name = (desc.label != null && desc.label !== '') ? desc.label : p.word;
  const on = p.fill === 'on' || p.fill === 'empty-on';
  const cntSuffix = desc.count != null ? ` · ${tr('entityPtsN', desc.count)}` : '';
  const title = `${on ? uiRef('refDrawHide', name) : uiRef('refDrawShow', name)}${cntSuffix}`;
  return `<span ${wrapAttrs(desc, p)}>`
    + `<button type="button" class="ref-tag ref-dot-btn" data-act="ref-draw" aria-pressed="${on}"`
    + ` title="${esc(title)}" aria-label="${esc(title)}">`
    + `<span class="ref-bubble" data-fill="${p.fill}"></span></button></span>`;
}

/* refEl(desc) → nœud DOM (légende/arbre impératifs — vague 6). Même cœur. */
function refEl(desc) {
  const t = document.createElement('template');
  t.innerHTML = ref(desc).trim();
  return t.content.firstElementChild;
}

/* refList(descs) → concat de ref() (listes de cibles d'étape, membres…). */
function refList(descs) {
  return (descs || []).map(ref).join('');
}

/* ── Délégation (l'UNIQUE écouteur, §5.3) ───────────────────────────────────
   Décode les deux gestes sémantiques et route vers les handlers fournis par
   l'appelant (main.js/router) : le composant ne connaît AUCUN opener, il ne
   fait que relire le contrat DOM du `.ref` cliqué. Enter/Espace fonctionnent
   nativement (les deux cibles sont de vrais <button>) — ce même écouteur les
   couvre (un bouton dispatche `click` au clavier). Les deux cibles sont des
   frères, jamais imbriquées : `closest` isole celle cliquée, jamais de
   déclenchement croisé pastille⇄libellé. */
function readRefInfo(wrap) {
  const d = wrap.dataset;
  return {
    kind: d.kind,
    key: d.key != null ? d.key : null,
    fkey: d.fkey || null,
    mode: d.mode || null,
    family: d.family || null,
    subrole: d.subrole || null,
    zone: d.zone != null ? d.zone : null,
    x: d.x != null ? +d.x : null,
    z: d.z != null ? +d.z : null,
    map: d.map || null,
    // Nom : le `.ref-label` (refs pleines) d'abord, sinon data-label (pastilles
    // d'en-tête refDot, sans libellé rendu) — le pin locate garde ainsi le NOM
    // de l'entité, jamais le mot de kind (voir wrapAttrs data-label).
    label: (wrap.querySelector('.ref-label') || {}).textContent || wrap.dataset.label || null,
    el: wrap,
  };
}
function initMapRefDelegation(rootEl, handlers = {}) {
  const root = rootEl || document;
  root.addEventListener('click', e => {
    const btn = e.target.closest('[data-act="ref-open"],[data-act="ref-draw"]');
    if (!btn || !root.contains(btn)) return;
    const wrap = btn.closest('.ref');
    if (!wrap) return;
    const info = readRefInfo(wrap);
    if (btn.dataset.act === 'ref-open') { if (handlers.open) handlers.open(info, e); }
    else { if (handlers.draw) handlers.draw(info, e); }
  });
}

export { ref, refDot, refEl, refList, refKindLabel, refKindColor, locateRefKey, initMapRefDelegation };
