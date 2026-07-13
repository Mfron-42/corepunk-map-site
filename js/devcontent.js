/* Kwalat — contenu dev/test masqué par défaut (feature #13). Certains
   enregistrements (monstres/items/objets de quête/quêtes) portent un champ
   `isTest: true` côté données — placeholders/doublons de dev jamais
   retirés du client, jamais destinés au joueur. Monstres en particulier
   (162/917 groupes) : ils étaient auparavant DROPÉS ENTIÈREMENT par le
   pipeline ; maintenant qu'ils sont dans les données (voir ),
   les laisser visibles par défaut ferait apparaître 162 groupes de test
   d'un coup dans la recherche/le bestiaire — d'où ce filtre, off par
   défaut : un joueur qui n'a jamais entendu parler de cette fonctionnalité
   ne voit RIEN de nouveau par rapport à avant.

   S.devOn (state.js) est le SEUL interrupteur, lu ici et nulle part
   ailleurs sous une autre forme — jamais de state parallèle dupliqué.
   Module volontairement pur (aucune dépendance UI) : le bouton qui bascule
   S.devOn et republie tout ce qui en dépend (recherche, bestiaire, couches
   carte qao/quête, fiche ouverte) vit dans main.js (buildDevToggle), même
   discipline que setLang() — un seul point qui orchestre le rebuild complet
   pour ne jamais laisser une partie de l'UI dans l'ancien état. */
import { S } from './state.js';

/* Un enregistrement isTest reste masqué SAUF si S.devOn est vrai. Ne décide
   jamais, à lui seul, d'un lien profond direct vers cet enregistrement — les
   appelants qui affichent une fiche/variante déjà OUVERTE gardent leur
   propre garde « toujours inclure la clé activement affichée » (voir
   js/fiches.js speciesVariantSpawns) : ce module ne fait que répondre à la
   question « faut-il le lister ? », pas « peut-on l'ouvrir ? » (jamais de
   404 silencieux ailleurs sur ce site, même principe ici).

   isInternal (items-obtain audit §B3, loi « toujours garder les données ») :
   les pseudo-items internes (charges de capacité/effet/talent/dialogue,
   préfixes ab_/ef_/tal_/do_… — la même classe que NOISE_KEY_RE dans
   search.js) portent `isInternal: true` côté pipeline et passent par CE même
   interrupteur : masqués du listage par défaut, révélés par le tag
   « Contenu dev », JAMAIS retirés des données — chaque jointure qu'ils
   adossent (ligne de butin, ref de recette, objectif de quête) reste
   résolvable, et leur fiche reste ouvrable par lien profond/chip (badge
   « Interne » explicite, voir fiches.js openItemFiche). */
function isHiddenTest(rec) {
  return !!(rec && (rec.isTest || rec.isInternal) && !S.devOn);
}

/* Slugs from an NPC's `quests` list (site npcs.json — quest-giver links)
   narrowed to the ones actually visible right now, same isHiddenTest gate as
   everywhere else. An NPC whose ONLY given "quests" are the hello_ / info_
   dialogue barks (isTest+isDialogue, see ())
   must not list/count them as real quests by default — fiches.js
   openNpcFiche's "N quests given" section and popups.js's map-popup
   "N quêtes" badge both read this instead of the raw `r.quests`/`n.quests`
   array (data-accuracy audit, NPC-duplication finding #4: a merged NPC pin
   (see ()) can carry BOTH a real quest
   slug and a hidden dialogue slug in the same list). `S.quests` (slug ->
   site quest record) must already be populated, see data.js::loadCritical. */
function visibleQuestSlugs(slugs) {
  return (slugs || []).filter(slug => !isHiddenTest(S.quests.get(slug)));
}

/* Bark de dialogue PNJ (hello_* / info_* : répliques d'ambiance, jamais une
   quête à objectifs). LA règle unique, partagée par toutes les surfaces qui
   listent/comptent des quêtes : quest.js (aiguillage de fiche), entity.js
   (« Quêtes données (N) »), popups.js (badge « N quêtes »), zone.js (quêtes
   d'une région). questClass (greeting|dialogue) est la source primaire,
   isDialogue le repli hérité — même doublé de garde que l'aiguillage de
   openQuestFiche, jamais deux règles qui divergent. */
function isDialogueBark(rec) {
  return !!(rec && (rec.isDialogue || rec.questClass === 'greeting'
    || rec.questClass === 'dialogue'));
}

/* Partition des slugs VISIBLES d'un porteur (PNJ/région) : `real` = vraies
   quêtes — les seules à compter dans un « Quêtes données (N) » / badge
   « N quêtes » ; `barks` = barks de dialogue actuellement visibles (donc
   contenu dev actif, puisqu'un bark est isTest) — à lister À PART avec leur
   marquage dev, jamais mélangés ni comptés comme quêtes. */
function visibleQuestSlugsSplit(slugs) {
  const real = [], barks = [];
  for (const slug of visibleQuestSlugs(slugs)) {
    (isDialogueBark(S.quests.get(slug)) ? barks : real).push(slug);
  }
  return { real, barks };
}

/* Comptes bruts (pas dédupliqués par modèle) pour l'étiquette « Contenu dev
   (N) » — reflète exactement les 4 jeux de données concernés par la mission
   (monstres/items/objets de quête/quêtes). Recalculé à chaque appel (pas de
   cache) : les tableaux concernés sont courts (au plus quelques dizaines de
   milliers d'items), un filter() est largement assez rapide pour un simple
   libellé de bouton rejoué à l'arrivée des données/au changement de langue. */
function devContentCounts() {
  const monsters = Object.values(S.monsters || {}).filter(m => m.isTest).length;
  // items : isTest OU isInternal — les deux classes que le tag révèle (même
  // périmètre que isHiddenTest ci-dessus, jamais deux règles qui divergent).
  const items = Object.values(S.items || {}).filter(it => it.isTest || it.isInternal).length;
  const qao = (S.data.qao || []).filter(o => o.isTest).length;
  // quêtes : isTest OU isInternal — isInternal couvre les déclencheurs moteur
  // (portes/zones d'extraction, coquilles dev vides) masqués par défaut, même
  // périmètre que isHiddenTest ci-dessus (jamais deux règles qui divergent).
  const quests = (S.data.quest || []).filter(q => q.isTest || q.isInternal).length;
  return { monsters, items, qao, quests, total: monsters + items + qao + quests };
}

/* Legend/menu honesty fix (report: "NPC category shows 11 but only 1 pin
   renders on Prison Island") — the count a filter row displays must match
   what the map layer actually draws, not the raw record count. Splits a
   category's records into `shown` (will actually render: known x/z AND not
   dev-gated) vs `hidden` (real, non-test record, just no known position —
   e.g. Captain Rob/Doc Greene/Jax on Prison Island). Mirrors EXACTLY the two
   gates already applied at render time (mapview.js renderDomCulled/
   renderDense via main.js registerAllDenseRenderers: `r.x == null || r.z ==
   null` skip + `isHiddenTest(r)` skip) — never a separate/looser rule that
   could drift from what's actually drawn. An isTest record hidden by the
   dev-content gate counts in NEITHER bucket: it already has its own counter
   (devContentCounts/buildDevToggle above), and must never be double-counted
   as a "position-less" gap here (dev-content gating parity, same discipline
   as everywhere else in this module) — when S.devOn flips on, isHiddenTest()
   itself starts returning false, so such a record naturally lands in `shown`
   or `hidden` instead, no separate branch needed.
   IMPORTANT — do NOT word `hidden` as proven "server-side spawn"/"dynamic"
   anywhere this is displayed: only 18 Prison-Island NPCs carry an actual
   `pos_source: server_spawn` classifier, and that field lives ONLY in the
   pipeline-side data/quests.json (per giver/slot) — it is not exposed in any
   site .bin (npcs.bin/quests.bin/etc. carry no such field at all, verified
   directly). The rest of `hidden`, for every category, is simply
   UNCLASSIFIED, not confirmed-dynamic. See i18n/*.js::filterHiddenTooltip
   (deliberately neutral "without a known position", no parenthetical claim)
   and   §2 re-check #1. */
function positionCounts(list) {
  let shown = 0, hidden = 0;
  for (const r of (list || [])) {
    if (isHiddenTest(r)) continue;
    if (r && r.x != null && r.z != null) shown++; else hidden++;
  }
  return { shown, hidden };
}

export { isHiddenTest, devContentCounts, visibleQuestSlugs, visibleQuestSlugsSplit, isDialogueBark, positionCounts };
