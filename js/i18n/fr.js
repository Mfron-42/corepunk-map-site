/* Dictionnaire UI — fr. Mêmes clés que les autres langues (voir js/i18n/index.js). */

export default {
    ui: {
      // Catalogue des objets (surface de navigation à facettes, js/fiches/catalog.js).
      catTitle: 'Catalogue des objets',
      catCount: n => `${n} objets`,
      catBrowse: 'Parcourir le catalogue',
      catBrowseHint: 'Filtrer les objets par type, rareté, palier, métier…',
      catFacetKind: 'Type',
      catFacetRarity: 'Rareté',
      catFacetTier: 'Palier',
      catFacetProf: 'Métier',
      catFacetArchetype: 'Archétype',
      catFacetWclass: 'Classe',
      catFacetWuse: 'Prise',
      catFacetWspec: 'Spécialisation',
      catSortLabel: 'Trier',
      catSortName: 'Nom',
      catSortRarity: 'Rareté',
      catSortTier: 'Palier',
      catFilterPlaceholder: 'Filtrer les objets affichés…',
      catClearAll: 'Tout effacer',
      catActiveLabel: 'Filtres actifs',
      catRemoveFilter: v => `Retirer le filtre : ${v}`,
      catNoResults: 'Aucun objet ne correspond à ces filtres.',
      catHiddenNote: n => `${n} objets dev/internes masqués.`,
      catShowing: (a, b, n) => `${a}–${b} sur ${n}`,
      catPagePrev: 'Précédent',
      catPageNext: 'Suivant',
      catMoreValues: n => `+${n} de plus`,
      catNRarities: n => `${n} raretés`,
      // Référence des capacités (surface à facettes, js/fiches/ability_catalog.js).
      abcTitle: 'Référence des capacités',
      abcCount: n => `${n} capacités`,
      abcBrowse: 'Parcourir les capacités',
      abcBrowseHint: 'Filtrer les capacités par emplacement, tag, détails…',
      abcFacetSlot: 'Emplacement',
      abcFacetTag: 'Tag',
      abcFacetDetail: 'Détails',
      abcDetailDesc: 'Avec description',
      abcDetailFormula: 'Avec formule',
      abcDetailCooldown: 'Cooldown chiffré',
      abcSortName: 'Nom',
      abcSortSlot: 'Emplacement',
      abcFilterPlaceholder: 'Filtrer les capacités affichées…',
      abcNoResults: 'Aucune capacité ne correspond à ces filtres.',
      // Fiche capacité — ligne cooldown + résolution mustache (voir core.js).
      abilityCooldownLabel: 'Cooldown',
      abilityCooldownSeconds: n => `${n} s`,
      abilityCooldownUnspecified: 'non spécifié',
      abilityParamTooltip: 'Résolu depuis les paramètres de cette capacité',
      abilityNoDetail: 'Aucune description ni formule dans les données client pour cette capacité.',
      pageTitle: 'Kwalat — Carte communautaire Corepunk',
      pageDescription: "Carte interactive de Kwalat (Corepunk) : PNJ, quêtes, ateliers, coffres, camps et points d'intérêt.",
      panelAriaLabel: 'Légende et filtres',
      title: 'Carte de Kwalat',
      subtitle: 'Corepunk · carte communautaire',
      searchPlaceholder: 'Chercher un PNJ, une quête, un objet, un monstre…',
      searchAriaLabel: 'Recherche',
      filtersAriaLabel: 'Filtres',
      // Bandeau des couches actives (tags NOMMÉES et retirables sous la
      // recherche — le bandeau double de LÉGENDE de la carte, js/sidebar.js
      // renderActiveTags) : libellé du groupe + aria-label de retrait d'une
      // tag (le ✕ visible sur la tag porte déjà l'affordance à l'œil ; le
      // `title` de repli pour un nom tronqué reste le nom brut, voir
      // sidebar.js). activeTagsMoreAria : la tag « +N » de débordement
      // (plafond 2 rangées) qui déplie le bandeau.
      activeDotsLabel: 'Couches actives',
      activeTagRemove: name => `${name} — retirer`,
      activeTagsMoreAria: n => `${n} couche${n > 1 ? 's' : ''} active${n > 1 ? 's' : ''} de plus — afficher`,
      // Arbre de couches — IA FINALE de la sidebar (2026-07-11,
      //  §IA FINALE, verbatim utilisateur) : 4 groupes fixes
      // (World/Monsters/Harvesting/Interactables) remplacent les 6 groupes
      // du chunk (a). groupPoi/groupQuests retirés avec leurs groupes
      // (lignes déménagées dans World/Interactables — voir js/sidebar.js).
      // GLOSSARY-PENDING : titres = wording verbatim de l'utilisateur ;
      // à balayer quand l'extraction de glossaire (#86) prouvera des termes
      // du jeu.
      groupMonsters: 'Monstres',
      // Sections racine PLATES Monstres / Creeps / Faune paisible (reorg
      // propriétaire 2026-07-15b : l'owner a défait l'umbrella « Créatures » à
      // sous-groupes imbriqués — chacune redevient sa propre section racine).
      // groupCreeps suit le campKind expédié (« Creeps ») ; groupWildlife est le
      // TITRE DE SECTION de la Faune paisible (pool camp:wildlife) — même valeur
      // « Faune paisible » que l'ex-sous-libellé subFaunePaisible (retiré).
      groupCreeps: 'Creeps',
      groupWildlife: 'Faune paisible',
      groupHarvest: 'Récolte',
      groupContainers: 'Interactables',
      groupWorld: 'Monde',
      // Pastille de cascade des sous-groupes (js/sidebar.js buildSubGroup) —
      // les en-têtes de GROUPE racine n'en ont plus (correction finale
      // 2026-07-11 : purs conteneurs plier/déplier).
      groupToggleAria: 'Cocher ou décocher toutes les couches de ce groupe',
      // Chevron de pli des sous-groupes (bouton .subgrp-expand, à droite —
      // zones de clic : pastille/libellé = bascule, chevron = pli seul).
      subgroupFoldAria: 'Déplier ou replier',
      // Titres de sous-groupes (IA finale). GLOSSARY-PENDING (libellés
      // structurels). subChests/subDestroyable/subInteractives/subOther ne
      // sont PLUS utilisés par l'arbre (Objets interactifs à plat, 2026-07-14 —
      // les 4 seaux sont retirés) mais CONSERVÉS pour la parité i18n ;
      // subWorldOthers étiquette encore le sous-groupe World › Autres.
      subWorldOthers: 'Autres',
      subChests: 'Coffres',
      subDestroyable: 'Destructibles',
      subInteractives: 'Interactifs',
      subOther: 'Autres',
      // Surcharges de libellé de ligne (affichage seul — les tokens de hash
      // restent camp.<kind>) : le libellé honnête des gardes (2 camps/12
      // pts, AUCUN lien espèce/PNJ/butin —
      //  §5) ; la ligne honnête
      // « Spawns non identifiés » (camps sans espèce jointe — compte =
      // exactement ce que la couche dessine, voir pointsets.js
      // kindRestPoints (règle rest-only universelle, data-dérivée) ; sert désormais les TROIS groupes
      // Monsters/Creeps/Wildlife, symétrie — l'ancienne monsterCampsRow
      // « Camps de monstres » est retirée avec la bascule grossière) ; et la
      // libellés COURTS des lignes de spawn regroupées sous le parent
      // « Zones de spawn (camps) » (spawnCampsGroup) des Objets interactifs :
      // le parent porte le contexte, la ligne dit juste son type
      // (Corps/Squelettes/Autres/Destructibles/Interactifs). GLOSSARY-PENDING.
      guardsRowLabel: 'Gardes (unité non identifiée)',
      kindRestRow: 'Spawns non identifiés',
      // Parent repliable qui regroupe toutes les lignes dynamiques / de spawn
      // serveur des Objets interactifs (consolidation Option 1, 2026-07-15).
      spawnCampsGroup: 'Zones de spawn (camps)',
      // Groupe Wildlife seulement : les pools de faune paisible/sauvage
      // génériques ne lient AUCUNE espèce côté client (roster côté serveur) —
      // mais les ZONES de spawn sont réelles, donc une couche à part entière
      // « Animaux paisibles », pas un compte « donnée manquante ».
      wildlifeRestRow: 'Animaux paisibles',
      // Lignes DANS le groupe « Zones de spawn (camps) » (le parent porte le
      // contexte, la ligne dit juste son type). searchSpotsRow (ancien libellé
      // plat) conservé pour compat, plus référencé.
      searchSpotsRow: 'Zones de fouille (spawn)',
      destroyableCampsRow: 'Destructibles',
      reactiveCampsRow: 'Réactifs',
      // Seau générique `other` quand il tombe en catégorie interactable —
      // distinct du « Autres » des zones de fouille résiduelles.
      otherCampsRow: 'Autres (non typés)',
      // Lignes de spawn TYPÉES par contenu prouvé (2026-07-15, camps.bin
      // `subtype`/`corpseFraction`) : la couche dominante de spawn de corps,
      // le reste, et les camps réactifs de squelettes — teintées vers leur
      // concept (Corps mauve / Os). Le « Corps » de spawn ici et le « Corps
      // placés » de decorFamily sont le même concept en deux formes honnêtes.
      searchSpotsCorpsesRow: 'Corps',
      searchSpotsOtherRow: 'Autres',
      skeletonCampsRow: 'Squelettes',
      // Objets interactifs rangés PAR TYPE (2026-07-15) : chaque type = une
      // entrée, ses formes placée+spawn unifiées. CORPS ▸ (Placés · Zones de
      // spawn) et COFFRES ▸ (De camp · Fouillables · Hérité) sont des parents
      // repliables ; les libellés d'enfant sont COURTS (le parent porte le
      // contexte). « Zones de spawn — autres (camps) » regroupe les camps de
      // spawn non scindés par contenu (Autres · Destructibles · Réactifs).
      // GLOSSARY-PENDING (libellés structurels).
      groupCorps: 'Corps',
      subCorpsPlaces: 'Placés',
      subCorpsSpawn: 'Zones de spawn',
      groupCoffres: 'Coffres',
      subCoffresCamp: 'De camp',
      subCoffresFouillables: 'Fouillables',
      subCoffresHerite: 'Hérité',
      spawnAutresGroup: 'Zones de spawn — autres (camps)',
      // Contenu prouvé d'un pool (popup/fiche camp).
      campContentLabel: 'Contenu',
      campCorpsePct: p => `~${p} % de corps`,
      campContentPresetNote: 'Composition prouvée par le preset de spawn serveur.',
      campContentNameNote: 'Type prouvé par le nom de la zone.',
      // Objet de quête → quête(s) servie(s) (popup qao).
      qaoQuestLabel: 'Quête',
      // Coût d'échange (barter) + valeur de revente d'un objet.
      barterCostLabel: 'Échange :',
      barterCostTitle: "Coût en objets (l'or est supprimé pour ce stock).",
      itemValueLabel: 'Valeur',
      itemValueTitle: 'Valeur de revente de base.',
      // Échelle d'efficacité (fiche métier) + verrous de recette.
      professionEfficiencyTitle: 'Efficacité',
      professionEfficiencyTier: n => `Palier ${n}`,
      recipeProfLevel: (prof, lv) => `Requiert ${prof} niv. ${lv}`,
      recipeProfLevelNoProf: lv => `Requiert niveau ${lv}`,
      recipeRequiresRecipe: names => `Apprenez d'abord : ${names}`,
      // (pinFiltersTitle retiré avec le concept abandonné de filtres épinglés
      // séparés — décision utilisateur 2026-07-11, l'arbre EST le bestiaire.)
      trackedTitle: 'Suivis',
      trackedEmptyHint: 'Épinglez un marqueur avec « Suivre » pour le retrouver ici.',
      footerNote: 'Données extraites du client du jeu · non affilié à Artificial Core.',
      langSelectorLabel: 'Langue',
      panelToggleAriaLabel: 'Afficher ou masquer le panneau',
      mapAriaLabel: 'Carte du monde',
      loadingText: 'Relevé topographique en cours…',
      zonesLabel: 'Zones (régions)',
      campLoading: 'Chargement des camps…',
      // Correctif d'honnêteté du compteur légende/menu (rapport : le filtre
      // PNJ affichait 11 sur Prison Island mais un seul pin ne s'affiche
      // jamais) : tooltip du badge discret "+N" à côté du compte principal
      // d'une ligne de filtre (js/sidebar.js hiddenBadge) — N enregistrements
      // réels, non-test, sans position connue, jamais des pins que la carte
      // échouerait silencieusement à dessiner. Formulation VOLONTAIREMENT
      // neutre ("inconnu", pas "dynamique"/"apparition côté serveur") : un
      // classifieur `pos_source` prouvant un vrai spawn serveur n'existe que
      // pour 18 PNJ de Prison Island dans data/quests.json (côté pipeline,
      // niveau giver/slot) et n'est exposé dans AUCUN .bin du site (ni
      // npcs.bin ni quests.bin) — affirmer "côté serveur" pour tout le lot
      // sur-affirmerait pour le reste, simplement non classifié (voir
      //   §2 re-check #1).
      filterHiddenTooltip: n => `${n} sans position connue`,
      // (decorFamiliesTitle retirée 2026-07-11 avec le groupe « Décor »
      // dissous — ses lignes famille vivent dans les buckets Interactables,
      // voir js/sidebar.js decorFamsOfCategory (catégorie cuite des records — l’ancienne table DECOR_BUCKET est supprimée, ontology chunk 2). decorGroupLabel ci-dessous reste :
      // toujours utilisée par config.js chestKindLabel pour les lignes de
      // kind des fiches/popups.)
      // Sous-groupe « Par famille » sous Monstres & faune (#82 chunk (b),
      // js/sidebar.js buildMonsterFamilyGroup). familyCampsN : compte de
      // camps honnête d'une ligne famille — les points d'une famille sont
      // ceux des CAMPS où elle apparaît (partagés avec tout ce qui y spawn),
      // jamais « les positions de X » (design §13.1). Les NOMS de famille
      // affichés restent les tokens bruts du jeu prettifiés (aucune table de
      // localisation dans les données expédiées — GLOSSARY-PENDING #86,
      // comme le bestiaire).
      // (monsterFamiliesTitle « Par famille » RETIRÉE 2026-07-11 avec la
      // barre-séparateur + [Tous][Aucun], jugés inutiles par l'utilisateur —
      // les lignes famille vivent directement dans le groupe Monsters.)
      familyCampsN: n => `${n} camp${n > 1 ? 's' : ''}`,
      // Sous-lignes ESPÈCE de l'arbre (#82 chunk (d), « l'arbre EST le
      // bestiaire » — js/sidebar.js buildSpeciesSublist). speciesCampsPts :
      // même honnêteté que familyCampsN (les points d'une espèce = ceux des
      // CAMPS où elle peut apparaître, design §13.1) — `p` arrive déjà
      // formaté (locale). speciesZeroCamps : une espèce/famille sans camp
      // joint sur la carte active reste listée (accès fiche), grisée.
      speciesCampsPts: (n, p) => `${n} camp${n > 1 ? 's' : ''} · ${p} pts`,
      speciesZeroCamps: '0 camp sur cette carte',
      // Contexte famille d'une ligne ESPÈCE de la RECHERCHE (mission "search
      // activation" 2026-07-11, distinct du bare pretty(family) affiché
      // dans l'arbre — ici, sans nesting, le mot "Famille" doit être
      // explicite) : "Famille Wolf" — combiné à speciesCampsPts ci-dessus
      // en une seconde ligne ("Famille Wolf · 4 camps · 926 pts", voir
      // js/search.js buildMonsterSearchIndex `ctx`).
      speciesFamilyOf: fam => `Famille ${fam}`,
      // Faune 0-camp (wildlife_species.bin, job pass 2026-07-11b) : libellé
      // GLOBAL — ces espèces (tortues/poules/oies…) n'ont de camp sur AUCUNE
      // carte, contrairement à speciesZeroCamps (scopé carte active).
      wildlifeZeroCamps: '0 camp connu',
      famSpeciesToggle: 'Parcourir les espèces de cette famille',
      // #93 — fiche camp : activité + présence par mode (camp_details
      // `activity`/`modes`, voir js/fiches.js campPresenceHtml). Formulation
      // SOFT exigée (poids de registre serveur, unité exacte inconnue —
      // jamais un taux de spawn/timer garanti).
      campActivityLine: n => `Activité : ~${n} %`,
      campActivityTitle: 'Poids d’activité du registre d’apparitions serveur — unité exacte inconnue ; absent = toujours actif.',
      campModesTitle: 'Présence par mode',
      campModesHint: 'Poids d’activation serveur par mode de jeu — jamais une garantie d’apparition.',
      campModeTier: (m, n) => `${m} · palier ${n}`,
      // ── E′c-4 · roster / densité / disposition / mitigation / bande de prix ──
      campRosterServerNote: 'Le roster exact est décidé par le serveur — aucune liste de membres n’est stockée côté client.',
      campRosterServerCountNote: n => `Le roster exact est décidé par le serveur — environ ${n} créatures dans le vivier.`,
      campRosterCandidatesNote: 'Les créatures listées sont des candidats probables — le serveur décide du roster réel au spawn.',
      spawnDensityLabel: 'Densité de spawn',
      spawnDensityNote: 'Nombre de points de spawn sur la carte active, relatif au camp le plus dense ici — le nombre est exact, la barre est relative.',
      cospawnTitle: 'Co-spawn probable',
      mitigationRowLabel: 'Dégâts réduits',
      mitigationNote: 'Fraction des dégâts entrants absorbée, dérivée de l’armure de chaque palier via la courbe unique du client (identique pour l’armure et la résistance magique) — calculée, pas un relevé client.',
      priceBandTitle: 'Fourchette de prix d’achat (bande du multiplicateur serveur)',
      stockInfinity: 'Illimité',
      stockInfinityTitle: 'Toujours en stock — quantité illimitée.',
      stockChance: n => `${n} % en stock`,
      stockChanceTitle: 'Probabilité que cet article soit proposé au réapprovisionnement — pas toujours disponible.',
      // ── E′c-4b · région / bande de niveau du camp · nav de série de quêtes ──
      campRegionLabel: 'Région',
      campRegionNote: 'Régions que le nuage de spawn du camp recouvre — attribuées par point-en-polygone sur le nuage complet (dérivé).',
      campRegionAlsoIn: list => `aussi dans ${list}`,
      levelBandLabel: 'Bande de niveau',
      levelBandNote: 'Fourchettes de niveau que ce camp couvre — issues du nommage des tables de butin (un fait client).',
      tierBandElite: 'Élite',
      tierBandEliteTip: 'Ce camp comprend une bande de palier élite.',
      seriesPositionLabel: (i, n) => `${i} / ${n}`,
      seriesPrevLabel: 'Précédent',
      seriesNextLabel: 'Suivant',
      seriesGraphTip: 'Position dans la chaîne de quêtes (d’après le graphe de quêtes).',
      seriesListedTip: 'Regroupé par ordre de déclaration — une association plus lâche que le graphe de quêtes.',
      // POI enrichis (pipeline pass 2026-07-11b) : bouton vers la fiche
      // encyclopédie (locations) + titre de lore divergent (locTitle).
      poiLoreBtn: 'Encyclopédie',
      poiLoreNamed: t => `Dans l’encyclopédie : « ${t} »`,
      // Affordance compacte « Afficher [entité] · N pts » (uniformisation
      // wording 2026-07-11 — remplace l'ancien « Voir tous les spawns dans
      // ces camps (N camps · M points) », mot « camps » banni du wording
      // quêtes/étapes/fiches ; voir js/fiches.js monsterSpawnHighlightBtn).
      entityPtsN: p => `${p} pts`,
      // (chestTypesAllBtn/chestTypesNoneBtn RETIRÉES 2026-07-11 avec la
      // barre [Tous][Aucun] du groupe familles — plus aucun appelant.)
      // Container re-categorization () : les 2 vraies couches
      // de coffres + le groupe "Décor" (legacy_chest/décor par famille).
      decorGroupLabel: 'Décor',
      campChestLabel: 'Coffre de camp',
      legacyChestLabel: 'Coffre hérité (legacy)',
      lootGenericNote: 'Butin générique : le seul lien de butin connu de ce contenant est un pool fouillable large, pas une table de butin dédiée — ce n’est pas un coffre farmable ciblé.',
      searchableChestTitle: 'Coffre fouillable',
      searchableChestRarityNote: 'Rareté aléatoire : le palier (commun/rare/épique…) est déterminé par le serveur à l’apparition — non déductible des données du client.',
      noResults: 'Aucun résultat.',
      noResultsHint: 'Essayez un mot plus court, ou vérifiez l’orthographe.',
      searchBodyHintPrefix: '› objectif : ',
      trackBtn: 'Suivre',
      trackedBtn: 'Suivi ✓',
      doneBtn: 'Fait',
      doneBtnActive: 'Fait ✓',
      removeBtn: 'Retirer',
      loreEntryTitle: 'Bestiaire',
      lootTableKind: 'Table de butin',
      priceTitle: 'Prix',
      stockFilterPlaceholder: 'Filtrer la liste…',
      rewardTablesN: n => `Tables de récompense (${n})`,
      questCountSuffix: n => ` · ${n} quête${n > 1 ? 's' : ''}`,
      dataGeneratedAt: date => `Données du ${date}`,
      questMapsLine: names => `Cartes : ${names}`,
      // bestiaryTitle/bestiaryLoading retirés (2026-07-11) avec la section
      // sidebar « Bestiaire » elle-même (voir js/sidebar.js) -- bestiaryZonesN
      // reste : toujours utilisée par fiches.js openMonsterFiche (section
      // lore de la fiche monstre), sans rapport avec cette section retirée.
      monsterFoundInTitle: 'Présent dans',
      lootTableItemsN: n => `Contenu (${n})`,
      probableLootTitle: 'Butin probable',
      probableLootNote: name => `Table « ${name} » associée par type de contenant — à confirmer en jeu.`,
      campLabel: 'Camp',
      pointsHereSuffix: n => ` · ${n} points ici`,
      spawnsTotal: n => `${n} spawns au total`,
      levelAbbrev: lvl => `niv ${lvl}`,
      // Fourchette de NIVEAU (task #80 — lignes d'espèce du bestiaire/faune
      // de camp, ex. une espèce couvrant niv 5-20, ou la fourchette propre
      // d'une espèce dans UN camp précis) : même famille d'abréviation que
      // levelAbbrev ci-dessus.
      levelRangeAbbrev: (min, max) => `niv ${min}–${max}`,
      spawnPointsCount: n => `${n} points de spawn`,
      likelyMonsters: n => `Monstres probables (${n})`,
      guaranteedLabel: 'Garanti',
      // Part APPROXIMATIVE (d.ch = weight / poids total de la table, voir
      //  "chance") d'un drop non garanti + caveat honnête posé
      // en tooltip (title) sur la pastille -- voir js/fiches.js dropRateHtml.
      lootBestRates: 'Butin (meilleurs taux)',
      mapSelectorLabel: 'Carte affichée',
      mapBadgeTitle: name => `Sur ${name} — cliquer pour y basculer`,
      mapTilesOnlySuffix: '(approx.)',
      mapGroupWorld: 'Monde',
      mapGroupExtraction: 'Extraction',
      mapGroupBattleground: 'Champs de bataille',
      mapGroupPve: 'Arènes JcE',
      mapGroupPvp: 'Arènes JcJ',
      mapGroupOther: 'Autres',
      // "position inconnue" bannie du site (voir  "search_zone") :
      // ce libellé générique reste pour les lignes hors objectif de quête
      // (PNJ/objet/marchand sans position extraite) — les objectifs de
      // quête eux-mêmes utilisent posDynamic/posDynamicZone/posUncatalogued
      // ci-dessous, jamais celui-ci.
      posUnknown: 'position non précisée',
      // Confiance "moyenne" (passe de câblage batch, simple proximité — voir
      //  zone_confidence) : libellé distinct de posDynamicZone
      // ci-dessus — un camp proche n'est pas une preuve que l'objet y apparaît
      // vraiment, jamais présenté avec la même autorité qu'une zone étayée.
      // Sous-libellé de la ligne de résultat de recherche pour une QUÊTE
      // entière sans position extraite (giver/acteurs tous sans x/z — ex.
      // les quêtes de Prison Island, sur une carte/frame de coordonnées à
      // part). Honnête et distinct de posUnknown (réservé aux lignes hors
      // quête) : dit juste qu'il n'y a aucun point à montrer, pas de bouton
      // carte cassé — la fiche s'ouvre normalement au clic.
      questNoPos: 'Pas de point sur la carte',
      vendorStockTitle: 'Stock du vendeur',
      vendorStockTitleN: n => `Stock du vendeur (${n})`,
      noVendorItems: 'Aucun article connu pour ce vendeur.',
      npcCat: 'PNJ',
      // Terme canonique « Vendeur » (⚑ mot du jeu) — « Marchand » retiré
      // partout (blueprint §4.1/§4.2 : vendorSuffix/noVendorItems/moreMerchants/
      // merchantPosUnknown unifiés sur Vendeur, cohérent avec vendorStockTitle).
      vendorSuffix: ' · Vendeur',
      questsGivenN: n => `Quêtes données (${n})`,
      noQuestsForNpc: 'Aucune quête connue pour ce PNJ.',
      questItemBadge: 'Objet de quête',
      soldTag: 'vendu',
      craftableTag: 'craftable',
      lootTag: 'loot',
      // Badge « Conteneur » (passe décodage mécanisme, job A) : identité de
      // l'objet propre à collect_from_object (t.label, ex. « Vieille
      // caisse ») — distinct d'activableBadge ci-dessus (objet auto-suffisant
      // de use_object, pas un conteneur où AUTRE CHOSE est trouvé).
      // Relation explicite de la carte de cible d'objectif (design review,
      // juillet 2026) : voir en.js pour le contexte -- jamais interpolé avec
      // le nom (celui-ci reste un span cliquable séparé, voir goalTargetChip).
      goalDroppedByLabel: 'lâché par',
      goalObtainedHereLabel: 'obtenu ici',
      // Pendant « conteneur » de goalObtainedHereLabel ci-dessus, propre à
      // collect_from_object (passe décodage mécanisme, job A) : utilisé
      // seulement quand le libellé du conteneur est connu (t.label) — verbe
      // seul, le nom suit dans son propre span, même schéma que
      // goalDroppedByLabel/nameSpan.
      goalFoundInLabel: 'trouvé dans',
      // Même vocabulaire de ligne de relation, passe de câblage batch : un
      // item donné par le donneur de quête (given_by_giver, ex. "Time of
      // Death" d'eight_legged_freaks) et un item à fabriquer uniquement
      // (craft:true, ex. l'implant de construction_lesson) — ni l'un ni
      // l'autre n'est un spawn dans le monde, donc jamais de position/zone.
      goalGivenByLabel: 'donné par',
      goalCraftLabel: 'à fabriquer',
      // Libellé de la réf « zone de recherche estimée » d'un objectif
      // (dynamicPosBadge) : la zone dessinable est un meilleur-effort, jamais
      // un spawn confirmé — la réf porte toujours ce libellé explicite (ou le
      // vrai nom de région quand la zone EN est une), jamais un tag vide.
      goalSearchZoneLabel: 'Zone estimée',
      // Placements EXACTS de conteneurs (search_zone.basis === "chest_placement") :
      // le but porte les VRAIES positions des conteneurs fouillables
      // (target.placements). Le libellé de la chip dessinable énonce lui-même la
      // précision — « N emplacements » (jamais « Zone estimée ») — et sa pastille
      // dessine ces points exacts (campTrace). N = nombre d'emplacements.
      goalLocationsN: n => `${n} emplacements`,
      // Repère d'orientation honnête (target.landmark) en méta muette près de la
      // chip — jamais un pin. Le landmark livré est une phrase de guidage
      // (« … autour de Goldenfield… »), d'où le cadre neutre « Indice : ».
      goalLandmarkLabel: s => `Indice : ${s}`,
      // Plafond de sécurité du DESSIN (GOAL_PLACEMENT_CAP) : « affichage de N sur
      // M » honnête si un jeu dépasse le plafond (cas actuels ≤ 44).
      goalPlacementsCapped: (shown, total) => `affichage de ${shown} sur ${total}`,
      // Mécanisme receive_reward (passe décodage mécanisme, job A) : l'item
      // est obtenu en terminant une AUTRE quête ( reward_of), pas remis
      // par le donneur de cette quête-ci — verbe seul, un span de quête
      // cliquable par entrée reward_of suit (voir rewardOfRelRow).
      goalRewardOfLabel: 'obtenu en terminant',
      // Mécanisme harvest : un nœud de récolte (bûcheronnage/herboristerie/
      // minage — target.profession, localisé via professionLabel).
      goalHarvestLabel: profession => `récolte (${profession})`,
      // Buts de récolte dont les TYPES de nœud acceptés sont byte-prouvés
      // (#81, target.node_types -- 11 buts) -- ladder de chips nœud sous
      // l'objectif, jamais une couche carte (aucun lien nœud->point côté
      // client, voir data.js S.nodes).
      goalAcceptedNodesLabel: 'Nœuds acceptés :',
      // Blocs corps/conteneur de quête (refonte 2026-07-16, stepguide.js
      // goalCorpseExtras) — DROPDOWN-FREE, au plus DEUX étiquettes dessinables,
      // keyées sur les signaux de la donnée (jamais une quête codée) :
      //   1. Types acceptés — ligne inline « N types » (goalAcceptedSummary) ;
      //   2. 🟢 Positions (goalPositions) — UNE réf : union des placements exacts
      //      + pools role="quest" ;
      //   3. 💡 Zones de corps fouillables (goalHintZonesTag) — UNE réf : union
      //      des pools role="generic", famille 💡, comme « Animaux paisibles » ;
      //   4. 💡 Astuce joueur (playerHintLabel) — connu en jeu, pas extrait.
      goalAcceptedTypesLabel: 'Types acceptés :',
      goalAcceptedSummary: n => `${n} types`,
      goalSpawnPoolLabel: (name, n) => `Zone de spawn — ${name} (${n} pts)`,
      playerHintLabel: 'Astuce joueur',
      goalCorpsePlacedN: n => `${n} corps placés`,
      // Les DEUX étiquettes combinées de positions (chacune dessine l'union de
      // ses points d'un clic) : 🟢 la donnée (placements + pools quête), 💡 les
      // zones dérivées de la loot-table (map-wide, une seule étiquette).
      goalPositions: 'Positions',
      goalHintZonesTag: 'Zones de corps fouillables',
      // Mécanisme kill_collect/kill : target.drop_chance (0-100, exact,
      // depuis les octets) — distinct du dropChanceApprox générique (part
      // calculée, jamais "≈" ici, c'est le pourcentage conçu par le jeu).
      goalDropChanceLabel: pct => `(${pct} %)`,
      // Mécanisme kill_player : target.player_specs joints via heroSpecLabel
      // (fiches.js) — aucune position unique pour un objectif JcJ.
      objectivesN: n => `Objectifs (${n})`,
      objectivesTitle: 'Objectifs',
      howToTitle: 'Comment faire',
      rewardsTitle: 'Récompenses',
      questItemsN: n => `Items de quête (${n})`,
      viewZoneBtn: 'Voir la zone',
      // Pendant confiance "moyenne" (passe de câblage batch, voir
      // posEstimatedZone ci-dessus) : dessine les vrais points du camp cité
      // quand la carte active les a chargés, sinon repli sur le même cercle
      // deviné que viewZoneBtn — jamais le même libellé, pour ne jamais le
      // confondre avec une zone confirmée.
      // Refonte layout (juillet 2026) : tiroir replié par défaut désormais
      // (voir openQuestFiche) — compte dans le libellé comme les autres
      // tiroirs (dialogsN/questItemsN), ce n'est plus un <h3> toujours ouvert.
      onMapTitleN: n => `Sur la carte (${n})`,
      dialogsN: n => `Dialogues (${n})`,
      // Pastille de confiance en en-tête (refonte layout, juillet 2026) :
      // `q.explained` {goals_total, goals_resolved} vient tel quel du
      // décodeur de graphe de quête — 333 quêtes sur 335 décodées sont
      // intégralement expliquées aujourd'hui, 2 gardent au moins un but non
      // résolu. Jamais affichée sans graphe de buts du tout (dialogues-barks
      // etc.) — rien à confirmer ni infirmer là.
      dialogueFicheKind: 'Dialogue PNJ',
      dialogueHeading: 'Dialogue PNJ (pas une quête)',
      dialogueNote: 'Répliques d’ambiance dites par ce personnage — ce n’est pas une quête avec objectifs ni récompenses.',
      interactionFicheKind: 'Interaction PNJ',
      interactionHeading: 'Interaction — pas une quête à objectifs',
      interactionNote: 'Ce personnage propose un service par dialogue (les données du jeu ne définissent aucun objectif pour cette entrée).',
      devBarksGivenN: n => `Dialogues révélés — contenu dev (${n})`,
      // Le journal s'affiche désormais en simple paragraphe de présentation
      // juste sous le titre (refonte layout, juillet 2026) — plus de titre de
      // section (même choix que la description d'objet, voir descHtml).
      // Utilisées seulement quand le texte dépasse le seuil de clamp CSS.
      journalShowMoreBtn: 'Voir plus',
      journalShowLessBtn: 'Voir moins',
      relatedQuestsTitle: 'Quêtes liées',
      questFicheKind: region => 'Quête' + (region ? ` · ${region}` : ''),
      dropRatesTitle: 'Taux de drop',
      farmSpotsTitle: 'Comment farmer',
      // Refonte des spots de farm (, juillet 2026) :
      // lignes groupées par kind de camp (Minerai/Monstres/…) au lieu d'un
      // vidage à plat de 24 lignes — résumé d'en-tête, tiroir « +N », et les
      // replis honnêtes ci-dessous (camp non joint, aucune donnée de camp,
      // pool de récompense générique replié).
      // Comptes MINIMAUX (uniformisation wording 2026-07-11 : « 926 pts »
      // oui, « 4 camps » non — le mot « camps » est banni du wording des
      // fiches ; le 1er paramètre historique (camps) est ignoré, signature
      // conservée pour les appelants).
      farmGroupSummary: (camps, pts) => `${pts} pts`,
      farmMoreCampsN: n => `+ ${n} autres`,
      farmGenericPoolNote: n => `Aussi un drop rare parmi ${n} camps à récompense générique — pas un spot de farm ciblé.`,
      farmSourcesNotMapped: 'Sources non rattachées à un camp connu pour l’instant.',
      farmOtherSourcesTitle: 'Autres sources',
      // « Également trouvable dans des coffres » (#65) : containers[] d'un
      // item/d'une recette, agrégé PAR CLASSE (camp_chest par famille de
      // monstre, searchable_chest par bande de rareté) -- `ch` est déjà la
      // MEILLEURE chance parmi les variantes de palier/grade repliées dans
      // cette classe (voir ).
      containersTitle: 'Également trouvable dans des coffres',
      containerCampChestHint: 'Généré côté serveur par famille de monstre — aucun placement précis à montrer sur la carte.',
      containerChanceUpTo: pct => `jusqu'à ${pct} %`,
      containerChanceBelowOne: "jusqu'à < 1 %",
      soldByTitle: 'Vendu par',
      obtainDuringQuestTitle: 'Comment obtenir',
      // EntityRef vague 2 : PRÉFIXES verbe seul — la cible se rend en référence
      // `[Espèce(●)]`/`[Objet]` juste après, jamais interpolée dans la phrase.
      obtainViaKill: 'En tuant',
      obtainViaInteract: 'En interagissant avec',
      // Extension quest_source_of, passe décodage mécanisme job B (harvest/
      // reward_of/world -- given_by réutilise ui.givenByPlain, container
      // réutilise obtainViaInteract ci-dessus, voir  +
      // fiches.js openItemFiche).
      obtainViaHarvest: profession => `En récoltant (${profession})`,
      // Fragment, pas une phrase complète -- composé avec ui.givenByPlain en
      // « Donné par X — quest Y » (cas cross-quête de receive_reward, voir
      // la branche qs.via === 'reward_of' d'openItemFiche).
      obtainViaWorld: 'Trouvé en accomplissant cette quête',
      // Ligne d'obtention honnête (items-obtain audit §B2) : affichée quand
      // un objet n'a AUCUN canal d'obtention — une ligne explicite plutôt
      // qu'un vide silencieux. La formulation dit ce que les DONNÉES disent
      // ou ne disent pas, jamais « inobtenable » (affirmation invérifiable).
      obtainStatusUnknown: 'Aucune source d\'obtention référencée dans les données actuelles du jeu.',
      obtainStatusQuestOrphan: 'Objet de quête — aucune quête des données actuelles du jeu n\'y fait référence (contenu probablement inutilisé ou retiré).',
      obtainStatusCosmetic: 'Élément d\'apparence (skin) — aucune source d\'obtention référencée dans les données actuelles du jeu.',
      obtainStatusLobby: 'Équipement de lobby d\'arène — aucune source d\'obtention référencée hors des matchs d\'arène.',
      obtainStatusInternal: 'Donnée interne du jeu (effet/capacité) — pas un objet obtenable par le joueur.',
      // Coquilles de quête (questStatus, enum fermé stampé par le pipeline
      // sur les fiches de quête sans aucun but) : même registre que
      // obtainStatus — énonce ce que la DONNÉE définit, jamais du lore.
      questStatusExtractionMarker: 'Marqueur moteur (extraction/transition de zone) — pas une quête jouable : les données du jeu ne lui définissent aucun objectif.',
      questStatusDevShell: 'Coquille de développement — fiche de quête interne/test sans objectif dans les données actuelles du jeu.',
      questStatusNoObjectives: 'Aucun objectif n\'est défini pour cette quête dans les données actuelles du jeu.',
      // Badge « Interne » (audit §B3) : pseudo-items techniques masqués du
      // listage comme le contenu dev, toujours ouvrables via leurs jointures.
      internalBadge: 'Interne',
      internalBadgeTitle: 'Donnée technique du jeu (effet/capacité/talent) présente dans le client mais jamais détenue comme objet par le joueur.',
      moreMerchants: n => `+ ${n} autres vendeurs`,
      merchantPosUnknown: 'Position du vendeur non précisée.',
      recipeTitle: 'Recette',
      producesArrow: 'produit → ',
      usedInTitle: 'Utilisé dans',
      rewardBadge: 'Récompense',
      requiredBadge: 'Requis',
      locatorTitle: 'Repère',
      // Drapeau utilisateur (#84, clic droit) -- volontairement PAS "pin"/
      // "épingle" : distinct du futur "filtre épinglé" du panneau gauche
      // (#82, glyphe épingle) et de locatorTitle ci-dessus (réticule goto).
      // Voir pins.js +  §Vocabulaire.
      userFlagTitle: 'Drapeau',
      clearAllFlagsBtn: 'Effacer tous les drapeaux',
      // Bloc « Mes drapeaux » injecté dans la section Suivis (sidebar.js
      // renderUserPins, 2026-07-11c) -- même vocabulaire « drapeau », jamais « pin ».
      userFlagsBlockTitle: 'Mes drapeaux',
      mapDownload9600: 'Carte 9600px',
      mapDownload4800: 'Carte 4800px',
      loadErrorPrefix: msg => `Impossible de charger les données (${msg})`,
      closeBtnAria: 'Fermer',
      // Bandeau "données mises à jour" (js/updatecheck.js) -- le jeton
      // version.json a changé depuis le chargement de cet onglet (un
      // déploiement a eu lieu pendant qu'il restait ouvert). Jamais de
      // rechargement automatique : seulement proposé.
      dataUpdatedBanner: 'Données mises à jour — recharger la carte',
      dataUpdatedReloadBtn: 'Recharger',
      monsterLabel: 'Monstre',
      variantsNote: n => ` · +${n} variantes`,
      monsterAbilitiesN: n => `Capacités (${n})`,
      monsterCampsN: n => `Apparaît dans (${n})`,
      // (monsterHighlightAllSpawns RETIRÉE 2026-07-11, uniformisation
      // wording : remplacée par showEntityBtn/entityPtsN — « Afficher
      // [espèce] · N pts », voir js/fiches.js monsterSpawnHighlightBtn.)
      noLootCatalogued: 'Butin non catalogué pour ce monstre.',
      noAbilitiesKnown: 'Aucune capacité connue pour ce monstre.',
      noCampsKnown: 'Aucun lieu d’apparition connu pour ce monstre.',
      // Section faune de la fiche camp ( #4/#10,
      // tâche #67) : un camp « monster-ish » (kind monsters/creeps/wildlife)
      // dont le nom de manager ne donne aucune espèce résolue — prouvé au
      // niveau des octets que les points de spawn du camp ne portent AUCUNE
      // référence d'entité ( « camp fauna »), 43/128 camps de ce
      // type aujourd'hui. N'affichait jusqu'ici rien du tout (trou silencieux,
      // voir openCampFiche) ; remplacé par une note honnête d'état dynamique.
      campFaunaUnknownNote: "Les créatures précises de ce camp ne sont pas enregistrées dans les données client — apparition gérée dynamiquement par le serveur.",
      // Section « Objets de quête » de la fiche monstre (suivi du lien
      // monstre<->objet de quête, tâche 1/4) : liste questDrops[] cuit au
      // build -- uniquement des liens produits par le résolveur, section
      // absente si vide (jamais un bloc vide fabriqué).
      monsterQuestItemsTitle: 'Objets de quête',
      familyMonstersTitle: n => `Monstres de cette famille (${n})`,
      // Fiche FAMILLE de monstres (#82 chunk (e), fiches.js openFamilyFiche) :
      // page tiroir d'une famille (Wolf/Imp/Spider…) — ses espèces membres,
      // fourchette de niveau et les quêtes qui visent tout le groupe. Le NOM
      // de famille reste un jeton de jeu brut (GLOSSARY-PENDING #86), jamais
      // traduit ; seul ce chrome est localisé.
      familyFicheKind: 'Famille de monstres',
      familyMembersTitle: n => `Espèces (${n})`,
      familyQuestsN: n => `Quêtes pour cette famille (${n})`,
      // Fiche famille = LA page de bestiaire (arbre Option A+, 2026-07-14) :
      // sections subRole (tags officiels du client — jetons bruts prettifiés,
      // jamais une traduction inventée) + panier « autres membres » des
      // familles mixtes + note de provenance officielle ; familyTypesTitle =
      // l'info-bulle de la ligne types/couleurs par membre.
      familyMembersOther: n => `Autres membres (${n})`,
      familyOfficialTagsNote: 'Tag officiel du client (Boss/Servant/Witch…) — lu tel quel des données du jeu, jamais inventé.',
      familyTypesTitle: 'Types/skins et couleurs officiels de cette espèce (tags client ; les couleurs suivent le niveau des spawns).',
      // Fiche « espèce de faune » (wildlife_species.bin, fiches.js
      // openWildlifeFiche) : une vraie page pour un animal — nom + famille +
      // méthode de dépeçage + son butin. « Où les trouver » est HONNÊTE : une
      // espèce liée à un camp (dinde/lapin/…) utilise la pastille espèce de son
      // en-tête ; une espèce 0-camp (tortues/vache/…) n'a AUCUN point précis,
      // seulement le pool générique « Animaux paisibles » — offert en toggle,
      // jamais un point précis présenté comme l'animal.
      wildlifeFicheKind: 'Faune',
      wildlifeVariants: list => `Variantes : ${list}`,
      wildlifeLootSharedNote: 'Butin partagé de famille : ces drops sont liés à la famille entière, pas à cette espèce précise — chaque membre de la famille donne la même table.',
      wildlifeWhereTitle: 'Où les trouver',
      wildlifeCampedNote: (n, p) => `Apparaît dans ${n} camp${n === 1 ? '' : 's'} (${p} points sur cette carte) — utilisez la pastille à côté du titre pour les afficher.`,
      wildlifePeacefulNote: "Aucune position par espèce n'est connue — cette espèce apparaît parmi les animaux paisibles. Afficher ces zones d'apparition :",
      wildlifeNoZonesNote: "Aucune zone d'apparition connue sur cette carte.",
      abilityLabel: 'Capacité',
      // EntityRef (◇, js/mapref.js — vague 0) : phrases a11y/title des deux
      // cibles de clic (pastille = afficher/masquer, libellé = ouvrir la
      // fiche). Voir  §1.3.
      refDrawShow: name => `Afficher ${name} sur la carte`,
      refDrawHide: name => `Masquer ${name} de la carte`,
      refOpenLabel: name => `Ouvrir ${name}`,
      harvestTitle: 'Dépeçage',
      noHarvestCatalogued: 'Aucun butin de dépeçage catalogué pour ce monstre.',
      // Fiche de référence « nœud de récolte » (#81, site/data/<lang>/nodes.bin)
      // -- nom + palier + métier + ses propres lignes de butin (lootRowsHtml).
      nodeFicheKind: 'Nœud de récolte',
      nodeTierTip: t => `Palier de récolte ${t}`,
      // generic:true (9/30 types de nœud) : aucune localisation en jeu
      // n'existe pour cette fiche interne -- pastille state-chip honnête,
      // jamais un faux nom localisé inventé.
      nodeGenericNote: "Nom interne — aucune localisation en jeu n'existe pour ce type de nœud.",
      harvestedOnTitle: 'Récolté sur',
      // ── E′c-5 · bloc obtention + timers de coffre + alias de nœud ──────
      obtainDropsTitle: 'Butin',
      chestTimersTitle: 'Interaction',
      chestRegenLabel: 'Réapparition du butin',
      chestPickupRadiusLabel: 'Rayon de ramassage',
      chestBreakTimeLabel: 'Temps pour casser',
      chestKarmaLabel: "À l'ouverture",
      chestKarmaYes: 'Donne du karma',
      chestTimersAbsentNote: "Aucun minutage d'interaction n'est enregistré dans les données du client pour ce coffre.",
      unitMinutesApprox: n => `~${n} min`,
      unitSeconds: n => `${n} s`,
      unitMeters: n => `${n} m`,
      nodeAliasesLabel: names => `Aussi appelé : ${names}`,
      statsTitle: 'Statistiques',
      // Info-bulle du badge « réel » ( finding #1) : distingue
      // explicitement un relevé RÉEL du client (record m_abs_*/mbt_*_boss,
      // ex. Furious Woodraptor = 154 440 PV) de la fourchette générique
      // estimée par palier ci-dessous.
      realStatsTooltip: 'Valeurs réelles (client) — relevées directement dans les données du jeu pour ce monstre précis, pas une estimation par palier.',
      // Note honnête pour les mobs SANS relevé client réel (statsSource !==
      // "record") : une RE a montré que l'ancienne grille "estimée" lisait un
      // mauvais champ (~640× trop bas, ex. un boss niv 20 à ~544 PV pour une
      // vraie valeur serveur ~350 000) -- ce chiffre fabriqué est retiré,
      // remplacé par ce simple aveu. Voir js/fiches.js monsterStatsSection.
      statsServerNote: 'Statistiques précises résolues côté serveur (indisponibles dans les données du client).',
      bossHpBadge: 'boss',
      bossBaseHpLabel: 'PV de base',
      bossLiveHpLabel: 'PV réels (est.)',
      bossDifficultyNote: "Ce boss a son propre PV de base (issu des données du jeu). PV réels = base × un multiplicateur de difficulté côté serveur — environ 9 à 10× au niveau 20 (ex. un boss de donjon ≈ 226 000). Le multiplicateur exact est assigné par le serveur : c'est une estimation, jamais un total réel figé.",
      // Badge « calculé » : stats issues de la formule de mise à l'échelle du
      // jeu (décodée byte-exact, voir 
      // pas une estimation.
      computedStatsBadge: 'calculé (formule du jeu)',
      // Note honnête sous la table fourchette-par-palier : le jeu assigne le
      // palier de difficulté côté serveur au spawn (aucune référence côté
      // client), d'où une plage selon le palier plutôt qu'un chiffre unique.
      statsPerTierNote: 'Palier de difficulté assigné côté serveur — fourchette selon le palier (facile → boss).',
      // Caveat honnête sur les colonnes Élite/Boss ( finding #2) :
      // contrairement à facile/moyen/difficile, ces 2 paliers n'ont JAMAIS été
      // vérifiés contre une source externe -- le chiffre communautaire
      // "~350 000 PV" pour un boss niv.20 ne se reproduit avec aucune donnée
      // du client, et un vrai boss nommé peut afficher bien plus que cette
      // fourchette générique (voir le badge « réel » quand disponible).
      statsBossEliteCaveat: 'Colonnes « Élite »/« Boss » : valeurs génériques estimées, non confirmées en jeu — certains boss nommés réels sont bien plus résistants (voir le badge « réel » quand une fiche dédiée existe pour ce monstre).',
      // (bestiaryMapFilterLabel/bestiaryMapEmpty retirés 2026-07-11 avec la
      // section sidebar « Bestiaire » -- voir bestiaryZonesN plus haut.)
      alwaysGrantedTitle: 'Toujours donné',
      choiceGroupTitle: n => `Choix ${n}`,
      orWord: ' ou ',
      xpAbbrev: n => `${n} XP`,
      weaponXpAbbrev: n => `${n} XP d'arme`,
      goldAbbrev: n => `${n} or`,
      // Sélecteur de rareté (variantes même-nom, voir js/rarity.js) + indice
      // de recherche « N raretés » sur le résultat regroupé.
      rarityVariantsLabel: 'Rareté',
      rarityVariantsCount: n => `${n} raretés`,
      // Sélecteur de niveau/variante de monstre (task #80, une ESPÈCE
      // regroupe tous ses niveaux/reskins — voir js/fiches.js
      // speciesVariantSpawns) + indice de recherche « N variantes » sur le
      // résultat regroupé, même idiome que rarityVariantsCount ci-dessus.
      monsterVariantsLabel: 'Niveau',
      monsterVariantsCount: n => `${n} variantes`,
      // Compte de clés brutes/cosmétiques repliées dans UN groupe (name,level)
      // (task #80, polish — vivait avant en ligne dans kindLine via
      // variantsNote ci-dessus ; déplacé en ligne muette dédiée sous le
      // sélecteur de variante, provenance technique, pas un fait de gameplay).
      rawRecordsNote: n => `${n} enregistrements bruts`,
      // Contenu dev/test (feature #13, isTest:true masqué par défaut) : tag
      // de révélation en bas du panneau + badge apposé partout où du contenu
      // révélé s'affiche (fiche, pastille de variante, bestiaire, recherche).
      devContentTag: n => `Contenu dev (${n})`,
      devBadge: 'Test',
      // Taxonomie « on ne sait pas » à 3 états (,
      // tâche #67) : un seul composant `.state-chip` + vocabulaire court pour
      // tout endroit du site qui explique honnêtement une incertitude
      // (position, butin, stock vendeur, mise à l'échelle rareté/tier,
      // résidu de but de quête non résolu…) au lieu des ~6 idiomes bespoke
      // existants. "dev" réutilise devBadge ci-dessus comme libellé (cette
      // clé n'ajoute que l'info-bulle manquante) — dynamic/unknown sont les
      // deux seuls libellés réellement nouveaux. Voir stateChip() dans
      // js/fiches.js.
      devBadgeTitle: 'Contenu de test ou inachevé, jamais utilisé en jeu.',
      stateUnknownTitle: 'Non déterminable depuis les données client extraites.',
      // 4ᵉ état (task #80, monsterStatsSection) : un bloc de stats RÉEL
      // (relevé m_abs_* sœur, partagé par tous les niveaux d'un groupe
      // démoté) -- jamais le relevé PROPRE au mob, jamais le badge « réel »
      // ci-dessus, mais toujours de vrais octets client, contrairement à la
      // fourchette générique estimée.
      stateFixed: 'relevé fixe',
      stateFixedTitle: 'relevé fixe (arène/CBT), indépendant du niveau, non prouvé en jeu',
      // Ligne de provenance repliable sous la fourchette par palier
      // (formula_range + statsFixedReading, task #80) : le résumé montre le
      // chiffre le plus parlant (santé), le détail la source + la fourchette
      // de niveaux qu'elle couvre. Jamais affiché comme les stats PROPRES à
      // ce mob.
      statsFixedProvenanceLine: (label, value) => `Relevé fixe : ${label} ${value} — non corrélé au niveau`,
      statsFixedProvenanceDetail: (src, cbt, lvlText) => `Source : ${src}${cbt ? ' (CBT)' : ''} · niveaux ${lvlText}`,
      // Plages de jet / DPS d'arme / formules / mise à l'échelle rune-puce
      // (stat_ranges, weapon_dps, artifact_formula/formula, rarity_scaling,
      // tier_scaling) -- net-new, voir 
      // + , tmp/convergence/ #8/#9/#10.
      rollRangeTitle: 'Plage de jet',
      weaponDpsTitle: "DPS d'arme",
      weaponDpsDerived: 'DPS (calculé)',
      // Groupement principale/secondaires (data-accuracy audit,  #1) :
      // un artefact roule 1 stat PRINCIPALE garantie + un nombre limité de
      // stats SECONDAIRES tirées d'un pool partagé -- jamais toutes à la fois,
      // contrairement à l'ancien rendu plat.
      rollMainStatTitle: 'Stat principale (garantie)',
      rollSecondaryStatsTitle: 'Stats secondaires (pool)',
      rollSecondaryHintN: (n, pool) => `Jusqu’à ${n} de ces ${pool} stats roulent réellement sur l’objet (pool partagé) — pas toutes en même temps.`,
      rollSecondaryHint: 'Un nombre limité de ces stats roule réellement sur l’objet (pool partagé) — pas toutes en même temps.',
      formulaTitle: 'Formule',
      formulaRankLabel: n => `Rang ${n}`,
      formulaPartialNote: 'Une partie de cette ligne dépend d’une référence moteur non décodée.',
      rarityScalingTitle: 'Mise à l’échelle par rareté',
      tierScalingTitle: 'Mise à l’échelle par palier',
      // Reformulé ( §2 re-check #2, tâche #67) :
      // l'ancienne formule « (probablement géré côté serveur) » affirmait une
      // cause précise NON PROUVÉE —  lui-même ne tranche pas
      // entre mise à l'échelle côté serveur et une autre règle du jeu (ex. une
      // règle liée au nombre d'emplacements de talent). Neutre désormais, et
      // enveloppé dans une pastille d'état "unknown" par son appelant
      // (formulaHtml) plutôt qu'un simple paragraphe .hint.
      scalingServerSide: "Ne varie pas avec la rareté dans les données du client, pour une raison qui n'est pas déterminable depuis ce qui est extrait.",
      scalingNotLocated: 'Mise à l’échelle non localisée dans les données du client.',
      tierNotRarity: 'Évolue par PALIER (tier), pas par rareté.',
      // Scaling 0x62 des runes (base + overclocké) + préfixes de qualité de
      // jet des artefacts -- 
      overclockScalingTitle: 'Mise à l’échelle overclockée',
      overclockNote: 'Valeurs améliorées (overclockées), par rareté de rune.',
      overclockServerSide: 'Cette rune a une variante overclockée, mais sa valeur n’est pas stockée côté client — impossible d’afficher un nombre exact.',
      abilityRarityScalingTitle: 'Mise à l’échelle par rareté',
      rollQualityTitle: 'Qualité du jet',
      rollQualityIntro: 'Un meilleur jet accorde un préfixe de nom : une stat dans la tranche 33–66 % de sa plage rend l’artefact « Amélioré » (Tech) / « Fort » (Magie) ; au-delà de 66 %, « Renforcé » / « Puissant ».',
      rollQualityBand3366: 'Amélioré / Fort (33–66 %)',
      rollQualityBandMore66: 'Renforcé / Puissant (>66 %)',
      useEffectTitle: 'Effet d’utilisation',
      effectVarRuntimeTooltip: 'Calculé en direct en jeu (pas une valeur fixe)',
      effectVarUnextractedTooltip: 'Valeur pas encore extraite des données du client',
      effectVarBaseTooltip: 'Valeur pour un personnage de base — évolue avec vos stats',
      effectVarFormulaTooltip: 'Dépend de vos stats (formule décodée affichée)',
      // Lignes d'effet runes/puces (effect-lines pass, 2026-07-11) : les
      // phrases d'effet réelles de l'objet pour les variantes base /
      // améliorée / overclockée (jointures 0x4b68 prouvées à l'octet) et les
      // paliers de talent des puces. Un token par rareté rend le 4-uplet
      // décodé en ligne, jamais un chiffre unique inventé ; une variante aux
      // magnitudes côté serveur le dit explicitement (même famille
      // d'honnêteté qu'overclockServerSide).
      effectLinesTitle: 'Effet et variantes',
      enhancementEffectTitle: 'Effet d’amélioration',
      variantBase: 'Base',
      variantUpgraded: 'Améliorée',
      variantOverclocked: 'Overclockée',
      variantTierT1: 'Palier T1',
      variantTierT2: 'Palier T2',
      variantTierT3: 'Palier T3',
      variantServerSide: 'Cette variante existe dans les données du jeu, mais ses valeurs sont stockées côté serveur — impossible d’afficher des nombres exacts.',
      effectVarPerRarityTooltip: 'Valeur décodée par rareté (Commun / Peu commun / Rare / Épique)',
      // ── Vocabulaire canonique (blueprint §4 — SCAFFOLDING E′c-0) ──────────
      // NOUVELLES clés consommées par les vagues ultérieures ; aucun site
      // d'appel recâblé ici. Résolvent les collisions §4.1 (région ≠ confiance
      // de position, camp de butin hors « searchable », prop de quête ≠ objet
      // de quête, type de décor ≠ famille, chronique ≠ lieu, objet réactif,
      // « aire » jamais « zone »). ◇ = maison-par-nécessité (aucun mot du jeu)
      // — ne pas « corriger » vers un terme de jeu inexistant.
      regionFicheKind: 'Région',
      // ── ContentsBlock de la fiche région (vague E'c-R) — titres de section +
      // comptes honnêtes. regionObj* = familles d'objets de objects.byFamily. ──
      regionCampsTitle: 'Camps',
      regionCampsCount: n => `${n} camp${n > 1 ? 's' : ''} catalogué${n > 1 ? 's' : ''} ici`,
      regionMonstersTitle: 'Monstres',
      regionWildlifeTitle: 'Faune',
      regionObjectsTitle: 'Objets',
      regionObjectsCount: n => `${n} objet${n > 1 ? 's' : ''} placé${n > 1 ? 's' : ''} ici`,
      regionQuestsTitle: 'Quêtes',
      regionGiversTitle: 'Donneurs de quête ici',
      regionGoalsHere: n => `${n} quête${n > 1 ? 's' : ''} ${n > 1 ? 'ont' : 'a'} un objectif dans cette région`,
      regionUnresolvedN: n => `+${n} de plus, espèce non identifiée`,
      regionProbableTitle: 'Co-apparition probable',
      regionDistinctFamTitle: 'Familles distinctives (haut niveau)',
      regionDistinctFamHint: 'Familles présentes ici qui n’apparaissent qu’en bandes de haut niveau (16-20).',
      regionDistinctFamDerivedNote: 'La bande de butin est officielle ; l’affinité régionale est dérivée du placement des camps × bande.',
      regionNone: 'Rien de catalogué ici.',
      regionEmpty: 'Rien de catalogué dans cette région pour l’instant.',
      regionObjChest: 'Coffres',
      regionObjCraftBench: 'Établis',
      regionObjQuestObject: 'Objets de quête',
      regionObjReactive: 'Interactifs',
      regionObjShrine: 'Sanctuaires',
      regionObjDestroyable: 'Destructibles',
      regionObjUnresolved: 'Autres objets',
      // Fiches Build (opt L3, blueprint §1.2/§7 E'c-8 — talent/spécialisation/
      // métier, recherche + fiche seulement, aucune surface carte, voir
      // fiches/build.js).
      talentFicheKind: 'Talent',
      specFicheKind: 'Spécialisation',
      professionFicheKind: 'Métier',
      professionTiersTitle: 'Paliers',
      professionItemsTitle: n => `Objets (${n})`,
    },
    cat: {
      npc: 'PNJ', poi: "Points d'intérêt", quest: 'Quêtes',
      qao: 'Objets de quête', workshop: 'Ateliers',
      // Container re-categorization : l'ancienne couche unique "Coffres"
      // (chest) est retirée, remplacée par ces 2 vraies couches — voir
      //  §1/§3.1 et js/config.js CATS.
      searchable_chest: 'Coffres fouillables', camp_chest: 'Coffres de camp',
    },
    rarity: { Common: 'Commun', Uncommon: 'Peu commun', Rare: 'Rare', Epic: 'Épique', Legendary: 'Légendaire' },
    kind: { npc: 'PNJ', object: 'Objet', item: 'Item', other: '—' },
    itemKind: {
      weapon: 'Arme', resource: 'Ressource', rune: 'Rune', consumable: 'Consommable',
      artifact: 'Artefact', chip: 'Puce', synthesis: 'Synthèse',
      quest_item: 'Objet de quête', recipe: 'Recette', item: 'Objet',
    },
    // Type d'arme affiché en fiche/recherche ("Pistolet · Deux mains ·
    // Bombardier") -- weaponType/weaponClass reprennent le terme officiel du
    // jeu quand il existe (ConstWeaponTypes.xml pour G/Sh/S, Units.xml pour
    // les classes Bomber/Champion/Warmonger — voir  "i18n" sur
    // ce principe) ; les valeurs sans fiche officielle (Dagger/Bow/Knuckle/
    // Spear, useType) sont une traduction sobre maison, comme les autres
    // libellés bespoke déjà documentés (quest_hints, CAMP_KIND…).
    weaponType: {
      Gun: 'Pistolet', Sword: 'Épée', Shield: 'Bouclier', Dagger: 'Dague',
      Bow: 'Arc', Knuckle: 'Poings américains', Spear: 'Lance',
    },
    useType: {
      OneHanded: 'Une main', TwoHanded: 'Deux mains',
      OneHandedLeft: 'Une main (gauche)', OneHandedRight: 'Une main (droite)',
    },
    weaponClass: { Bomber: 'Bombardier', Champion: 'Champion', Warmonger: 'Fauteur de guerre' },
    action: {
      kill: 'Éliminer', collect: 'Collecter', use: 'Utiliser', talk: 'Parler à',
      goto: 'Se rendre à', deliver: 'Livrer', custom: 'Faire',
      repair: 'Réparer', craft: 'Fabriquer', mix: 'Mélanger',
    },
    searchCat: {
      npc: 'PNJ', poi: 'Lieu', quest: 'Quête', qao: 'Objet',
      workshop: 'Atelier', camp: 'Camp', item: 'Item', recipe: 'Recette',
      monster: 'Monstre', zone: 'Région', location: 'Lieu',
      ability: 'Capacité', event: 'Événement', chest: 'Coffre',
      searchable_chest: 'Coffre fouillable', node: 'Nœud de récolte',
      // Ligne FAMILLE de la recherche (mission "search activation"
      // 2026-07-11) : PAS un monstre précis — un filtre d'arbre (2e barreau
      // de l'échelle de précision, ). Distingue visuellement
      // la ligne "Famille Wolf" (chip "Famille" + libellé "Wolf") d'une
      // ligne espèce "Monstre" (chip "Monstre" + libellé "Wolf Alpha").
      family: 'Famille',
      // Build (E'c-8, opt L3) : rangées de recherche talent/spé/métier.
      talent: 'Talent', specialization: 'Spécialisation', profession: 'Métier',
    },
    // EntityRef (◇) : mots de kind non couverts par searchCat (table de
    // butin / position nue / joueurs PvP) — singulier seul, jamais une
    // catégorie. Voir js/mapref.js + en.js pour la doc complète.
    refKind: {
      loot: 'Table de butin', position: 'Position', players: 'Joueurs',
    },
    // EntityRef : libellés génériques dégradés (spec §6.3, ensemble FERMÉ) —
    // jamais la clé interne, jamais du lore inventé.
    refGeneric: {
      position: 'Position de quête', object: 'Objet de quête',
      area: 'Zone de quête', target: 'Cible d’objectif',
    },
    // Taxonomie de talent (E'c-8, blueprint §1.2 opt L3) — jetons `system`/
    // `subtype` de talents.bin (5 + 9 valeurs, la forme RÉELLE expédiée —
    // aucun champ niveau/position d'arbre séparé, voir fiches/build.js).
    talentSystem: {
      unclassified: 'Non classé', class_spec: 'Spécialisation de classe',
      weapon_mastery: "Maîtrise d'arme", universal: 'Universel',
      artifact_chip: "Puce d'artefact",
    },
    talentSubtype: {
      ui_or_misc: 'Interface / divers', grid_transition: 'Nœud de grille', ability: 'Capacité',
      ability_variant: 'Variante de capacité', base: 'Base', proc: 'Proc',
      artifact: 'Artefact', other: 'Autre', chip: 'Puce',
    },
    // ── Badge d'honnêteté — LE vocabulaire fermé unique (blueprint §5.2) ────
    // SCAFFOLDING E′c-0 : l'enum fermé sur 3 axes orthogonaux (provenance ×
    // précision × contenu) + 3 rendus de valeur typés. Les vagues ultérieures
    // (E′c-1) y replient .state-chip / échelle de position / .stats-badge /
    // .effect-var-* ; la prose vit dans les tooltips *Tip (aucune prose de
    // nuance libre hors de cet ensemble). tbl('badge', <clé>).
    badge: {
      // Axe provenance — d'où vient un fait
      provOfficial: 'Officiel',
      provOfficialTip: 'Lu directement dans le client du jeu.',
      provDerived: 'Dérivé',
      provDerivedTip: 'Calculé à partir de valeurs officielles (géométrie ou arithmétique).',
      provInferred: 'Inféré',
      provInferredTip: 'Rapproché par heuristique (nom, proximité ou texte) — probable, pas certain.',
      provAbsent: 'Manquant',
      provAbsentTip: 'Honnêtement absent des données extraites.',
      // Axe précision — quelle est l'exactitude d'une position
      precPinned: 'Précis',
      precPinnedTip: 'Coordonnées exactes.',
      precArea: 'Aire',
      precAreaTip: 'Approximatif — une région ou zone, pas un point exact.',
      precViaChain: 'Par chaîne',
      precViaChainTip: 'Localisable via la couche liée (son apparition ou son placement).',
      precUnlocated: 'Non localisé',
      precUnlocatedTip: 'Aucune position client — résolu côté serveur ou absent.',
      // Flag de contenu (orthogonal, rouge-danger — pas une provenance de fait)
      contentDev: 'Dev',
      contentDevTip: 'Contenu de test ou inachevé, présent dans le jeu mais jamais utilisé.',
      // Trois rendus de valeur typés (même famille visuelle, contenu propre)
      valWeightShare: 'Part de table',
      valWeightShareTip: 'La part de cet objet dans la table — pas une probabilité par kill.',
      valRosterServerSide: 'Roster serveur',
      valRosterServerSideTip: 'Le serveur décide quelles créatures apparaissent ici.',
      valCospawnProbable: 'Co-spawn probable',
      valCospawnProbableTip: 'Associé par type — probable, pas garanti.',
    },
    // Disposition d'une créature (blueprint §3.3 DispositionBadge) : posture
    // envers le joueur — une CLASSIFICATION de domaine (comme la rareté), PAS un
    // Badge d'honnêteté ; sa provenance l'accompagne en badge().
    disposition: {
      peaceful: 'Pacifique', peacefulTip: 'N’attaque jamais — ignore le joueur.',
      neutral: 'Neutre', neutralTip: 'N’attaque que si on le provoque.',
      hostile: 'Hostile', hostileTip: 'Attaque le joueur à vue.',
      other: 'Disposition', otherTip: 'Posture envers le joueur.',
    },
    // Couleurs de variante de monstre (monsters.bin `colors` — teintes de
    // skin cosmétiques, corrélées au niveau des spawns ; lignes membre de la
    // fiche famille) : des MOTS de couleur génériques, localisables sans
    // risque — pas du vocabulaire de taxonomie du jeu (contrairement aux
    // tokens famille/type/subRole, gardés bruts, GLOSSARY-PENDING).
    monsterColor: {
      brown: 'Brun', blue: 'Bleu', gray: 'Gris', green: 'Vert', red: 'Rouge',
      yellow: 'Jaune', orange: 'Orange', white: 'Blanc', black: 'Noir',
      purple: 'Violet', pink: 'Rose',
    },
    // Familles de décor (chests.bin group="decor" par family, + "legacy"
    // pour group="legacy_chest") : sous-lignes du groupe repliable "Décor"
    // (js/sidebar.js buildDecorGroup) — voir  §3.1.
    decorFamily: {
      barrel: 'Tonneaux', boxes: 'Caisses', furniture: 'Meubles',
      // `corpse` = la ligne des corps PLACÉS (concept fixe/placé) — « Corps
      // placés », distincte du « Corps » de SPAWN du groupe « Zones de spawn
      // (camps) » : le même concept en deux formes honnêtes, désormais
      // clairement sectionnées. Les libellés de RÔLE (corpse_quest/loot/decor)
      // restent : config.js chestKindLabel les affiche PAR RECORD sur la
      // fiche/le popup, jamais comme lignes d'arbre (config.js corpseRoleKey).
      corpse: 'Corps placés',
      corpse_quest: 'Corps de quête', corpse_loot: 'Corps fouillables', corpse_decor: 'Corps (décor)',
      books: 'Livres', misc: 'Divers', legacy: 'Coffre hérité',
    },
    // "searchable" et "quest" reformulés pour ne plus lire comme les couches
    // statiques de haut niveau (cat.chest "Coffres" / cat.quest "Quêtes") :
    // ce sont des lignes de FILTRE de camp (spawns dynamiques / contenants
    // fouillables), pas les mêmes couches -- voir campType.chests plus bas
    // pour le même souci sur le libellé du sous-type "Coffres — <région>".
    campKind: {
      monsters: 'Monstres', creeps: 'Creeps', herbalism: 'Herboristerie',
      logging: 'Bois', mining: 'Minerai', searchable: 'Fouillables',
      destroyable: 'Destructibles', reactive: 'Interactifs', shrines: 'Sanctuaires',
      soulkeeper: 'Soulkeepers', quest: 'Spawns de quête', wildlife: 'Animaux',
      guards: 'Gardes', event: 'Événement', other: 'Autres',
    },
    // Noms de carte localisés (sélecteur + badge). Seuls Kwalat et les 2 îles
    // d'Extraction ont un libellé dédié ; les arènes portent des noms de lieu
    // (Dendrohold, Wagon Yard…) résolus par prettyMapId() côté app.js.
    mapName: {
      Kwalat: 'Kwalat',
      Extraction_Island_large: 'Île-prison',
      Extraction_Island_small: 'Île-prison (petite)',
    },
    monsterAttack: { Melee: 'Corps à corps', Range: 'Distance', Ranged: 'Distance', Axe: 'Hache' },
    locationKind: {
      town: 'Ville', poi: "Point d'intérêt", mob: 'Bestiaire', dungeon_boss: 'Boss de donjon',
      gathering: 'Ressource', portal: 'Portail', shrine: 'Sanctuaire',
    },
    // Libellés des camps « destructibles »/« coffres cherchables » quand un
    // sous-type précis (tonneau, caisse de légume, sac, tombe…) est détecté
    // dans la clé du camp (site/js/app.js::campSearchLabel) — sinon repli sur
    // campKind.destroyable/searchable ci-dessus (déjà générique et traduit).
    campType: {
      barrels: 'Tonneaux explosifs', tombstones: 'Pierres tombales', coffins: 'Cercueils',
      chests: 'Coffres fouillables', corpses: 'Corps fouillables', skeleton: 'Squelettes', sacks: 'Sacs',
      crateCorn: 'Caisse de maïs', crateCabbage: 'Caisse de choux', crateCarrot: 'Caisse de carottes',
      crateOnion: "Caisse d'oignons", crateEggplant: "Caisse d'aubergines", crateBerries: 'Caisse de baies',
      sackCorn: 'Sac de maïs', sackWheat: 'Sac de blé',
      mushrooms: 'Champignons', bottles: 'Bouteilles', pots: 'Pots',
      wooden: 'Objets en bois', leafTrash: 'Tas de feuilles',
      vegetables: 'Légumes', urban: 'Objets urbains',
    },
    // Sous-catégories POI (interest_points.bin poiType — regroupement ◇
    // curaté d'icônes, PAS une taxonomie du jeu, voir 
    // §1 "poiType" ; les jetons sont les 8 familles réelles + "other"
    // défensif, 0 record aujourd'hui).
    poiType: {
      habitat: 'Habitations', nature: 'Nature', fort: 'Fortifications',
      curiosity: 'Curiosités', transport: 'Transport', profession: 'Métiers',
      amenity: 'Commodités', portal: 'Portails', other: 'Autres',
    },
    // Qualificatif de camp (île-prison, jeton moteur patrol|buffed —
    // sémantique byte-prouvée : base=PvE seul, patrol=seule variante
    // présente en PvP (0.6), buffed=PvP seul 10 % — formulation SOFT,
    // c'est un poids serveur, pas une garantie ni un tracé de ronde).
    campQualifier: { patrol: 'Patrouille', buffed: 'Renforcé (PvP)' },
    // Qualificatifs de membre de roster (camp_details `mobs[].qualifiers[]`) —
    // marqueurs de VARIANTE descriptifs (chips .roster-qual), distincts du
    // vocabulaire d'honnêteté Badge. `summon` = membre campSpawnUnlikely
    // (invoqué par capacité, pas placé dans le camp ; dormant aujourd'hui).
    rosterQual: {
      boss: 'Boss', bossTip: 'Une variante de palier boss de cette créature.',
      undead: 'Mort-vivant', undeadTip: 'Une variante mort-vivante de cette créature.',
      buffed: 'Renforcé', buffedTip: 'Une variante renforcée (buff).',
      event: 'Événement', eventTip: 'Apparaît dans le cadre d’un événement spécial ou limité.',
      arena: 'Arène', arenaTip: 'Une variante d’arène de cette créature.',
      affix: 'Affixe', affixTip: 'Porte un modificateur d’affixe supplémentaire.',
      summon: 'Invocation', summonTip: 'Invoqué par capacité, pas placé dans le camp — invoqué en combat.',
    },
    // Modes de jeu des tables de présence (#93, camp_details `modes`) —
    // jetons moteur PvE/PvP/Solo*, PvE/PvP laissés tels quels (usage
    // universel), Solo composé.
    campMode: {
      PvE: 'PvE', PvP: 'PvP', SoloPvE: 'PvE solo', SoloPvP: 'PvP solo',
      SoloPvP_HC: 'PvP solo (HC)',
    },
    // Type physique d'un coffre (world_objects.json chest_type) -- ensemble
    // exact tiré de data/world_objects.json, voir  "Chest loot + type".
    chestType: {
      Backpack: 'Sac à dos', Barrel: 'Tonneau', Bathroom: 'Salle de bain', Bedroom: 'Chambre',
      Boiler: 'Chaudière', Books: 'Livres', Boxes: 'Caisses', Cabinet: 'Meuble', Chest: 'Coffre',
      Closed: 'Fermé', Corpse: 'Corps', Fridge: 'Réfrigérateur', Guest: "Chambre d'amis",
      Kitchen: 'Cuisine', Papers: 'Papiers', Rest: 'Repos', Shelf: 'Étagère', Truck: 'Camion',
      Wardrobe: 'Armoire', Warehouse: 'Entrepôt',
    },
    // Nature d'un objet de quête activable (world_objects.json activable_type)
    // -- ensemble exact tiré de data/world_objects.json ; plusieurs jetons sont
    // des noms propres (personnages/objets uniques) laissés identiques dans
    // toutes les langues, voir  "Activable type".
    activableType: {
      Ancient: 'Ancien', Artifact: 'Artefact', Barrel: 'Tonneau', Bart: 'Bart', Beehive: 'Ruche',
      Black: 'Noir', Blade: 'Lame', Bloody: 'Sanglant', Blue: 'Bleu', Broken: 'Cassé',
      Building: 'Bâtiment', Captains: 'Capitaine', Cell: 'Cellule', Chain: 'Chaîne',
      Chainsaw: 'Tronçonneuse', Charging: 'En charge', Cigarette: 'Cigarette', Container: 'Conteneur',
      Crush: 'Écrasement', Data: 'Données', Deed: 'Acte de propriété', Diamond: 'Diamant',
      Document: 'Document', Door: 'Porte', Dream: 'Rêve', Drip: 'Goutte-à-goutte', Dwarf: 'Nain',
      East: 'Est', Empty: 'Vide', Energydrink: 'Boisson énergisante', Enter: 'Entrée',
      Evidence: 'Preuve', Explosive: 'Explosif', Felixs: 'Felix', Fire: 'Feu', Fishing: 'Pêche',
      Free: 'Libre', Gasoline: 'Essence', Gift: 'Cadeau', Glass: 'Verre', Green: 'Vert',
      Handle: 'Poignée', Hiding: 'Cachette', Ingredient: 'Ingrédient', Iron: 'Fer',
      Isopropyl: 'Isopropanol', Item: 'Objet', Jahri: 'Jahri', Kegs: 'Fûts', Light: 'Lumière',
      'Lock/Key': 'Serrure/Clé', Machine: 'Machine', Mask: 'Masque', Maxwell: 'Maxwell',
      Message: 'Message', Mineral: 'Minerai', Mixing: 'Mélange', Mobius: 'Mobius',
      Mysterious: 'Mystérieux', Nia: 'Nia', Node: 'Nœud', North: 'Nord', Orange: 'Orange',
      Package: 'Colis', Phylactery: 'Phylactère', Piece: 'Pièce', Place: 'Lieu', Plant: 'Plante',
      Processor: 'Processeur', Provisions: 'Provisions', Psychomushroom: 'Psychochampignon',
      Purple: 'Violet', Put: 'Dépôt', Radio: 'Radio', Recording: 'Enregistrement', Red: 'Rouge',
      Rehearsed: 'Répété', Remains: 'Restes', Renovated: 'Rénové', Robot: 'Robot', Safe: 'Coffre-fort',
      Second: 'Deuxième', Secret: 'Secret', Sensor: 'Capteur', Sewing: 'Couture', Shiny: 'Brillant',
      Shipping: 'Expédition', Shirt: 'Chemise', Sign: 'Panneau', Slippery: 'Glissant',
      Smoker: 'Fumoir', Soldier: 'Soldat', South: 'Sud', Souvenir: 'Souvenir', Special: 'Spécial',
      Statue: 'Statue', Stolen: 'Volé', Supplies: 'Fournitures', Suspicious: 'Suspect', Svi: 'Svi',
      Tool: 'Outil', Training: 'Entraînement', Transformer: 'Transformateur', Triton: 'Triton',
      Undead: 'Mort-vivant', Valuable: 'Précieux', Various: 'Divers', Vial: 'Fiole', Vodka: 'Vodka',
      Water: 'Eau', Weast: 'Weast', West: 'Ouest', Wolf: 'Loup', Workstation: 'Poste de travail',
      Yellow: 'Jaune', Zazz: 'Zazz', Zephyr: 'Zéphyr',
    },
    // Métier (item/recette `prof`) — termes officiels ConstProfession.xml.
    profession: {
      Alchemy: 'Alchimie', Butchery: 'Boucherie', Construction: 'Construction',
      Cooking: 'Cuisine', Herbalism: 'Herboristerie', Logging: 'Bûcheron',
      Mining: 'Mineur', Mysticism: 'Mysticisme', Weaponsmithing: "Forge d'armes",
    },
    // Méthode de dépeçage d'un monstre (`harvestMethod`, ex. "Flayer") —
    // même terminologie officielle que profession ci-dessus, mais keyé sur
    // le nom de nœud ConstProfession (pas toujours identique au libellé
    // d'activité : "Flayer" -> "Boucherie", "Lumberjack" -> "Bûcheron"…).
    harvestMethod: {
      Flayer: 'Boucherie', Herbalism: 'Herboristerie', Lumberjack: 'Bûcheron', Miner: 'Mineur',
      // Jetons de dépeçage de la faune (wildlife_species.bin harvestMethod) :
      // jetons moteur minuscules, distincts des Flayer/Lumberjack ci-dessus.
      butchering: 'Boucherie', logging: 'Bûcheron',
    },
    // Statistiques de monstre (stats_decoded / stat_curve) -- voir
    //  "Monster stats" + js/fiches.js::openMonsterFiche().
    statLabel: {
      health: 'Santé', attack_power: "Puissance d'attaque", weapon_damage: "Dégâts d'arme",
      armor: 'Armure', magic_resist: 'Résistance magique', accuracy: 'Précision',
      attack_speed: "Vitesse d'attaque", movement_speed: 'Vitesse de déplacement', vision: 'Vision',
      health_regen: 'Régén. de santé', mana: 'Mana', mana_regen: 'Régén. de mana',
      xp_reward: 'XP donnée', gold_reward: 'Or donné',
      phys_crit_chance: 'Chances de critique physique', magic_crit_chance: 'Chances de critique magique',
      // Ajoutés Phase 4 (stat_ranges/weapon_dps/formules -- voir
      // tmp/convergence/ #8/#9) : stats rollables/opérandes de
      // formule absentes du set "monstre" ci-dessus.
      spell_power: 'Puissance des sorts', phys_penetration: 'Pénétration physique',
      magic_penetration: 'Pénétration magique', flat_phys_penetration: 'Pénétration physique (fixe)',
      flat_magic_penetration: 'Pénétration magique (fixe)', phys_crit_power: 'Puissance de critique physique',
      magic_crit_power: 'Puissance de critique magique', lifesteal: 'Vol de vie',
      ability_steal: 'Vol de vie (capacités)', heal_shield_power: 'Puissance de soin et de bouclier',
      cooldown_reduction: 'Réduction de temps de recharge', cost_reduction: 'Réduction de coût',
      haste: 'Hâte', tenacity: 'Ténacité', slow_resistance: 'Résistance au ralentissement',
      bleed_chance: 'Chances de saignement', corruption_chance: 'Chances de corruption',
    },
    statTier: {
      easy: 'facile', medium: 'moyen', hard: 'difficile', elit: 'élite', boss: 'boss', miniboss: 'mini-boss',
    },
};
