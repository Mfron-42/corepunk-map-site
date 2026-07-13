/* Kwalat — GoatCounter (stats de fréquentation), PRODUCTION UNIQUEMENT.
   Site à page unique piloté par le hash (voir urlstate.js/router.js) : le
   compteur de vues classique (1 requête = 1 chargement de page) ne verrait
   jamais les navigations internes (ouverture de fiche, changement de carte…)
   qui ne rechargent jamais le document. On compte donc nous-mêmes des
   PSEUDO-PAGES dérivées du hash (`window.goatcounter.count({path})`,
   `no_onload:true` pour désactiver le comptage auto de count.js).

   Gate PRODUCTION stricte (location.hostname se terminant par "github.io" —
   seul domaine de déploiement réel, cf. TILE_BASE dans config.js) : ailleurs
   (localhost, 127.0.0.1, file://, harnais headless _verify_*.mjs/boot_probe)
   ce module est un NO-OP TOTAL, aucune requête réseau, aucune sortie
   console, aucun écouteur posé — protège le garde-fou "zéro erreur console"
   du boot ( et garde le trafic de test hors des
   vraies stats. */

/* Dérivation PURE hash → pseudo-page. Exportée pour le test autonome
    (Node, sans DOM ni `location`) : ne
   lit RIEN de global, uniquement la chaîne passée en argument. Priorité
   (une seule pseudo-page à la fois, mêmes clés que urlstate.js carryKeys) :
   q > i > mon > fam > npc > camp > zone > ch > sc > lt > node > loc > ab > rec > tal > spec > prof > map (absent ⇒ Kwalat, cf. readHash). Jamais de
   querystring, jamais `lang`, jamais x/z/zm — le pan/zoom ne doit JAMAIS
   compter une visite (voir dédoublonnage de l'effet de bord plus bas). */
export function hashToPseudoPath(hash) {
  const p = new URLSearchParams(String(hash || '').replace(/^#/, ''));
  if (p.has('q')) return '/quest/' + encodeURIComponent(p.get('q'));
  if (p.has('i')) return '/item/' + encodeURIComponent(p.get('i'));
  if (p.has('mon')) return '/monster/' + encodeURIComponent(p.get('mon'));
  if (p.has('fam')) return '/family/' + encodeURIComponent(p.get('fam'));
  if (p.has('npc')) return '/npc/' + encodeURIComponent(p.get('npc'));
  if (p.has('camp')) return '/camp/' + encodeURIComponent(p.get('camp'));
  // Fiche RÉGION (vague E'c-R) : jeton `zone=<zone_id>`, même carry-key que les
  // autres jetons de fiche (urlstate.js) — une pseudo-page par région ouverte.
  if (p.has('zone')) return '/zone/' + encodeURIComponent(p.get('zone'));
  // Vague E'c-6 — les 7 surfaces nouvellement deep-linkables (coffre placé,
  // coffre fouillable, table de butin, noeud de recolte, chronique/lore,
  // capacite, recette) : une pseudo-page dediee par type, memes carry-keys que
  // ci-dessus (urlstate.js FICHE_HASH_KEYS). Jetons mutuellement exclusifs :
  // l'ordre ci-dessous n'est un departage que theorique.
  if (p.has('ch')) return '/chest/' + encodeURIComponent(p.get('ch'));
  if (p.has('sc')) return '/searchable-chest/' + encodeURIComponent(p.get('sc'));
  if (p.has('lt')) return '/loot/' + encodeURIComponent(p.get('lt'));
  if (p.has('node')) return '/node/' + encodeURIComponent(p.get('node'));
  if (p.has('loc')) return '/lore/' + encodeURIComponent(p.get('loc'));
  if (p.has('ab')) return '/ability/' + encodeURIComponent(p.get('ab'));
  if (p.has('rec')) return '/recipe/' + encodeURIComponent(p.get('rec'));
  // Vague E'c-8 — fiches Build (talent/spécialisation/métier) deep-linkables :
  // jetons tal=/spec=/prof= dans FICHE_HASH_KEYS (urlstate.js) donc reportés au
  // pan/zoom comme les autres — une pseudo-page dédiée par node de build ouvert.
  if (p.has('tal')) return '/talent/' + encodeURIComponent(p.get('tal'));
  if (p.has('spec')) return '/spec/' + encodeURIComponent(p.get('spec'));
  if (p.has('prof')) return '/profession/' + encodeURIComponent(p.get('prof'));
  return '/map/' + encodeURIComponent(p.get('map') || 'Kwalat');
}

// Tout ce qui suit est un EFFET DE BORD, gated PRODUCTION (voir en-tête). La
// garde `typeof window !== 'undefined'` rend aussi ce module important sans
// crasher sous Node : _verify_analytics_paths.mjs n'importe QUE
// hashToPseudoPath ci-dessus, dans un contexte sans `window`/`location`.
if (typeof window !== 'undefined' && typeof document !== 'undefined' &&
    typeof location !== 'undefined' && /github\.io$/.test(location.hostname || '')) {
  // `no_onload` DOIT être posé AVANT que count.js ne se charge (contrat
  // GoatCounter) : on compte nous-mêmes, count.js ne doit rien faire seul.
  window.goatcounter = { no_onload: true };
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://gc.zgo.at/count.js';
  script.setAttribute('data-goatcounter', 'https://mfron.goatcounter.com/count');

  let lastCounted = null;
  // Dédoublonnage PAR PSEUDO-PAGE (pas par événement déclencheur) : le pan/
  // zoom fait tourner urlstate.js syncHash → history.replaceState toutes les
  // 250ms, mais x/z/zm ne participent jamais à hashToPseudoPath ci-dessus →
  // même chemin qu'avant → no-op ici, gratuit comme voulu. `goatcounter.count`
  // peut ne pas encore exister (count.js encore en chargement async) : on
  // saute SILENCIEUSEMENT plutôt que de mettre en file d'attente — la
  // navigation SUIVANTE (ou le `load` du script ci-dessous, qui couvre le
  // chargement initial) retentera avec le chemin courant ; rien n'est jamais
  // compté en double, et rien n'est perdu au-delà du tout premier instant.
  function countIfChanged() {
    const path = hashToPseudoPath(location.hash);
    if (path === lastCounted) return;
    if (!(window.goatcounter && typeof window.goatcounter.count === 'function')) return;
    lastCounted = path;
    window.goatcounter.count({ path });
  }
  // Chargement initial (y compris un lien profond direct vers une fiche) :
  // compté dès que count.js est prêt, pas avant (goatcounter.count n'existe
  // pas tant que le script n'a pas exécuté).
  script.addEventListener('load', countIfChanged);
  document.head.appendChild(script);

  // Navigations SPA suivantes : hash (hashchange), historique natif
  // (popstate — Précédent/Suivant), et wrapping pushState/replaceState
  // puisque ni l'un ni l'autre ne déclenche `hashchange` seul (pushFocusState/
  // syncHash, urlstate.js, appellent ces deux méthodes directement).
  window.addEventListener('hashchange', countIfChanged);
  window.addEventListener('popstate', countIfChanged);
  for (const method of ['pushState', 'replaceState']) {
    const orig = history[method].bind(history);
    history[method] = function (...args) {
      const ret = orig(...args);
      countIfChanged();
      return ret;
    };
  }
}
