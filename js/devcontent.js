/* Kwalat — contenu dev/test masqué par défaut (feature #13). Certains
   enregistrements (monstres/items/objets de quête/quêtes) portent un champ
   `isTest: true` côté données — placeholders/doublons de dev jamais
   retirés du client, jamais destinés au joueur. Monstres en particulier
   (162/917 groupes) : ils étaient auparavant DROPÉS ENTIÈREMENT par le
   pipeline ; maintenant qu'ils sont dans les données (voir data/SCHEMA.md),
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
   js/fiches.js monsterModelVariants) : ce module ne fait que répondre à la
   question « faut-il le lister ? », pas « peut-on l'ouvrir ? » (jamais de
   404 silencieux ailleurs sur ce site, même principe ici). */
function isHiddenTest(rec) {
  return !!(rec && rec.isTest && !S.devOn);
}

/* Slugs from an NPC's `quests` list (site npcs.json — quest-giver links)
   narrowed to the ones actually visible right now, same isHiddenTest gate as
   everywhere else. An NPC whose ONLY given "quests" are the hello_ / info_
   dialogue barks (isTest+isDialogue, see build_site_data.py::quest_hints())
   must not list/count them as real quests by default — fiches.js
   openNpcFiche's "N quests given" section and popups.js's map-popup
   "N quêtes" badge both read this instead of the raw `r.quests`/`n.quests`
   array (data-accuracy audit, NPC-duplication finding #4: a merged NPC pin
   (see build_site_data.py::link_npc_quests()) can carry BOTH a real quest
   slug and a hidden dialogue slug in the same list). `S.quests` (slug ->
   site quest record) must already be populated, see data.js::loadCritical. */
function visibleQuestSlugs(slugs) {
  return (slugs || []).filter(slug => !isHiddenTest(S.quests.get(slug)));
}

/* Comptes bruts (pas dédupliqués par modèle) pour l'étiquette « Contenu dev
   (N) » — reflète exactement les 4 jeux de données concernés par la mission
   (monstres/items/objets de quête/quêtes). Recalculé à chaque appel (pas de
   cache) : les tableaux concernés sont courts (au plus quelques dizaines de
   milliers d'items), un filter() est largement assez rapide pour un simple
   libellé de bouton rejoué à l'arrivée des données/au changement de langue. */
function devContentCounts() {
  const monsters = Object.values(S.monsters || {}).filter(m => m.isTest).length;
  const items = Object.values(S.items || {}).filter(it => it.isTest).length;
  const qao = (S.data.qao || []).filter(o => o.isTest).length;
  const quests = (S.data.quest || []).filter(q => q.isTest).length;
  return { monsters, items, qao, quests, total: monsters + items + qao + quests };
}

/* Legend/menu honesty fix (report: "NPC category shows 11 but only 1 pin
   renders on Prison Island") — the count a filter row displays must match
   what the map layer actually draws, not the raw record count. Splits a
   category's records into `shown` (will actually render: known x/z AND not
   dev-gated) vs `hidden` (real, non-test record, just no known position —
   e.g. Captain Rob/Doc Greene/Jax, server-side spawns never placed on the
   client map). Mirrors EXACTLY the two gates already applied at render time
   (mapview.js renderDomCulled/renderDense via main.js registerAllDenseRenderers:
   `r.x == null || r.z == null` skip + `isHiddenTest(r)` skip) — never a
   separate/looser rule that could drift from what's actually drawn. An
   isTest record hidden by the dev-content gate counts in NEITHER bucket: it
   already has its own counter (devContentCounts/buildDevToggle above), and
   must never be double-counted as a "position-less" gap here (dev-content
   gating parity, same discipline as everywhere else in this module) — when
   S.devOn flips on, isHiddenTest() itself starts returning false, so such a
   record naturally lands in `shown` or `hidden` instead, no separate branch
   needed. */
function positionCounts(list) {
  let shown = 0, hidden = 0;
  for (const r of (list || [])) {
    if (isHiddenTest(r)) continue;
    if (r && r.x != null && r.z != null) shown++; else hidden++;
  }
  return { shown, hidden };
}

export { isHiddenTest, devContentCounts, visibleQuestSlugs, positionCounts };
