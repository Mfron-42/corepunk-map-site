/* Kwalat — libellés ⚑ OFFICIELS des jetons de classification
   (site/data/<lang>/class_labels.bin, pipeline chunk 1 — voir 
   « ⚑ label source »). Module minuscule et SANS dépendance (consommé par
   config.js, rempli par data.js loadDeferred) pour éviter tout import
   croisé config ⇄ data.

   Contrat de provenance (ontology, NORMATIF) :
   - `src: "game"` = mot byte-vérifié du client (Interactive.xml) → PEUT
     remplacer un libellé ◇ du site (gameLabel ci-dessous).
   - `src: "game_tooltip_mt"` (campKind — traduction machine d'un tooltip de
     debug, PAS une chaîne joueur) → ne remplace JAMAIS un libellé du site en
     silence : gameLabel n'y touche pas, la donnée reste seulement disponible
     (classLabelsData) pour la passe i18n qui arbitrera à la main.
   Décision d'application (chunk 2, documentée au rapport) : l'overlay ⚑ est
   branché sur chestType/activableType (jeton = le nom de la CLASSE d'objet,
   surfaces au singulier — titres de popup/fiche d'UN prop placé ; déjà
   byte-alignés dans les 5 locales expédiées, donc zéro changement visible
   aujourd'hui, et toute future locale hérite du mot officiel). campType et
   decorFamily gardent leurs libellés ◇ : ils portent des qualificatifs
   byte-dérivés (« Tonneaux explosifs », « Coffres fouillables ») ou un
   pluriel de ligne de couche que le nom de classe du jeu (« Tonneau »,
   singulier) APPAUVRIRAIT — remplacer serait une perte d'information, pas un
   upgrade. poiIcon : aucun jeton d'icône POI n'est affiché comme texte à ce
   jour (poiTypeLabel travaille sur les 8 familles ◇, pas les icônes) — rien
   à brancher. */
let classLabels = null;

function setClassLabels(data) {
  classLabels = (data && typeof data === 'object') ? data : null;
}
/* Libellé ⚑ d'un jeton, ou null — SEULE la provenance `game` est éligible
   (jamais `game_tooltip_mt`, voir l'en-tête). */
function gameLabel(group, token) {
  const e = classLabels && classLabels.subtypes && classLabels.subtypes[group]
    && classLabels.subtypes[group][token];
  return (e && e.src === 'game' && e.label) ? e.label : null;
}

export { setClassLabels, gameLabel };
