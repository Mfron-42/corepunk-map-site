/* Dictionnaire UI — fr. Mêmes clés que les autres langues (voir js/i18n/index.js). */

export default {
    ui: {
      pageTitle: 'Kwalat — Carte communautaire Corepunk',
      pageDescription: "Carte interactive de Kwalat (Corepunk) : PNJ, quêtes, ateliers, coffres, camps et points d'intérêt.",
      panelAriaLabel: 'Légende et filtres',
      title: 'Carte de Kwalat',
      subtitle: 'Corepunk · carte communautaire',
      searchPlaceholder: 'Chercher un PNJ, une quête, un objet, un monstre…',
      searchAriaLabel: 'Recherche',
      filtersAriaLabel: 'Filtres',
      legend: 'Légende',
      campsTitle: 'Camps & ressources',
      // Arbre de couches — IA FINALE de la sidebar (2026-07-11,
      // COORDINATION.md §IA FINALE, verbatim utilisateur) : 4 groupes fixes
      // (World/Monsters/Harvesting/Interactables) remplacent les 6 groupes
      // du chunk (a). groupPoi/groupQuests retirés avec leurs groupes
      // (lignes déménagées dans World/Interactables — voir js/sidebar.js).
      // GLOSSARY-PENDING : titres = wording verbatim de l'utilisateur ;
      // à balayer quand l'extraction de glossaire (#86) prouvera des termes
      // du jeu.
      groupMonsters: 'Monstres',
      // Groupes racine Creeps/Wildlife (correction de structure utilisateur
      // 2026-07-11 : Monsters/Creeps/Wildlife montés au niveau racine).
      // groupCreeps suit le campKind expédié (« Creeps » — V20 en attente
      // d'arbitrage owner) ; groupWildlife suit ONTOLOGY.md #11 (« Faune
      // sauvage », le ◇ canonique — PAS le campKind.wildlife « Animaux »,
      // violation V8 à balayer au chunk 3).
      groupCreeps: 'Creeps',
      groupWildlife: 'Faune sauvage',
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
      // structurels).
      subWorldOthers: 'Autres',
      subChests: 'Coffres',
      subDestroyable: 'Destructibles',
      subInteractives: 'Interactifs',
      subOther: 'Autres',
      // Surcharges de libellé de ligne (affichage seul — les tokens de hash
      // restent camp.<kind>) : le libellé honnête des gardes (2 camps/12
      // pts, AUCUN lien espèce/PNJ/butin —
      // interactives_taxonomy_INVESTIGATION.md §5) ; la ligne honnête
      // « Spawns non identifiés » (camps sans espèce jointe — compte =
      // exactement ce que la couche dessine, voir pointsets.js
      // KIND_REST_ONLY ; sert désormais les TROIS groupes
      // Monsters/Creeps/Wildlife, symétrie — l'ancienne monsterCampsRow
      // « Camps de monstres » est retirée avec la bascule grossière) ; et la
      // désambiguïsation « (camps) » des kinds dynamiques rangés à côté de
      // props PLACÉS dans les buckets Interactables. Le kind `searchable`
      // reçoit un nom VRAIMENT distinct (« Points de fouille ») — plus
      // jamais quatre choses nommées « fouillable ». GLOSSARY-PENDING
      // (tokens internes d'outil de level-design, pas des termes du jeu).
      guardsRowLabel: 'Gardes (unité non identifiée)',
      kindRestRow: 'Spawns non identifiés',
      searchSpotsRow: 'Points de fouille (camps)',
      destroyableCampsRow: 'Destructibles (camps)',
      reactiveCampsRow: 'Interactifs (camps)',
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
      //  unknown_states_DESIGN.md §2 re-check #1).
      filterHiddenTooltip: n => `${n} sans position connue`,
      // (decorFamiliesTitle retirée 2026-07-11 avec le groupe « Décor »
      // dissous — ses lignes famille vivent dans les buckets Interactables,
      // voir js/sidebar.js DECOR_BUCKET. decorGroupLabel ci-dessous reste :
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
      // POI enrichis (pipeline pass 2026-07-11b) : bouton vers la fiche
      // encyclopédie (locations) + titre de lore divergent (locTitle).
      poiLoreBtn: 'Encyclopédie',
      poiLoreNamed: t => `Dans l’encyclopédie : « ${t} »`,
      // Affordance compacte « Afficher [entité] · N pts » (uniformisation
      // wording 2026-07-11 — remplace l'ancien « Voir tous les spawns dans
      // ces camps (N camps · M points) », mot « camps » banni du wording
      // quêtes/étapes/fiches ; voir js/fiches.js monsterSpawnHighlightBtn).
      showEntityBtn: 'Afficher',
      entityPtsN: p => `${p} pts`,
      // (chestTypesAllBtn/chestTypesNoneBtn RETIRÉES 2026-07-11 avec la
      // barre [Tous][Aucun] du groupe familles — plus aucun appelant.)
      // Container re-categorization (DATA_CONTRACT.md) : les 2 vraies couches
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
      ficheBtn: 'Fiche',
      ficheShopBtn: 'Fiche · Boutique',
      loreEntryTitle: 'Bestiaire',
      lootTableKind: 'Table de butin',
      priceTitle: 'Prix',
      hideHighlightBtn: 'Masquer les points',
      stockFilterPlaceholder: 'Filtrer la liste…',
      rewardTablesN: n => `Tables de récompense (${n})`,
      questCountSuffix: n => ` · ${n} quête${n > 1 ? 's' : ''}`,
      highlightPointsBtn: n => `Surligner les ${n} points`,
      dataGeneratedAt: date => `Données du ${date}`,
      questMapsLine: names => `Cartes : ${names}`,
      // bestiaryTitle/bestiaryLoading retirés (2026-07-11) avec la section
      // sidebar « Bestiaire » elle-même (voir js/sidebar.js) -- bestiaryZonesN
      // reste : toujours utilisée par fiches.js openMonsterFiche (section
      // lore de la fiche monstre), sans rapport avec cette section retirée.
      bestiaryZonesN: n => `${n} zones`,
      lootTableItemsN: n => `Contenu (${n})`,
      probableLootTitle: 'Butin probable',
      probableLootNote: name => `Table « ${name} » associée par type de contenant — à confirmer en jeu.`,
      questCat: 'Quête',
      givenBySuffix: name => ` · donnée par ${name}`,
      givenByPlain: name => `donnée par ${name}`,
      ficheCompleteBtn: 'Fiche complète',
      campLabel: 'Camp',
      pointsHereSuffix: n => ` · ${n} points ici`,
      spawnsTotal: n => `${n} spawns au total`,
      campFicheBtn: 'Fiche du camp',
      levelAbbrev: lvl => `niv ${lvl}`,
      // Fourchette de NIVEAU (task #80 — lignes d'espèce du bestiaire/faune
      // de camp, ex. une espèce couvrant niv 5-20, ou la fourchette propre
      // d'une espèce dans UN camp précis) : même famille d'abréviation que
      // levelAbbrev ci-dessus.
      levelRangeAbbrev: (min, max) => `niv ${min}–${max}`,
      spawnPointsCount: n => `${n} points de spawn`,
      viewOnMapBtn: 'Voir sur la carte',
      likelyMonsters: n => `Monstres probables (${n})`,
      guaranteedLabel: 'Garanti',
      chanceLabel: 'Probabilité',
      // Part APPROXIMATIVE (d.ch = weight / poids total de la table, voir
      // data/SCHEMA.md "chance") d'un drop non garanti + caveat honnête posé
      // en tooltip (title) sur la pastille -- voir js/fiches.js dropRateHtml.
      dropChanceApprox: pct => `≈ ${pct} %`,
      dropChanceBelowOne: '< 1 %',
      dropChanceCaveat: 'Part de cet objet dans le pool de butin de la table — pas une probabilité par kill (le nombre réel de tirages dépend du serveur).',
      lootBestRates: 'Butin (meilleurs taux)',
      mapLabel: 'Carte',
      mapSelectorLabel: 'Carte affichée',
      mapBadgeTitle: name => `Sur ${name} — cliquer pour y basculer`,
      mapTilesOnlySuffix: '(approx.)',
      mapGroupWorld: 'Monde',
      mapGroupExtraction: 'Extraction',
      mapGroupBattleground: 'Champs de bataille',
      mapGroupPve: 'Arènes JcE',
      mapGroupPvp: 'Arènes JcJ',
      mapGroupOther: 'Autres',
      // "position inconnue" bannie du site (voir data/SCHEMA.md "search_zone") :
      // ce libellé générique reste pour les lignes hors objectif de quête
      // (PNJ/objet/marchand sans position extraite) — les objectifs de
      // quête eux-mêmes utilisent posDynamic/posDynamicZone/posUncatalogued
      // ci-dessous, jamais celui-ci.
      posUnknown: 'position non précisée',
      posDynamic: 'Position dynamique',
      posDynamicZone: 'Zone de spawn',
      // Confiance "moyenne" (passe de câblage batch, simple proximité — voir
      //  zone_confidence) : libellé distinct de posDynamicZone
      // ci-dessus — un camp proche n'est pas une preuve que l'objet y apparaît
      // vraiment, jamais présenté avec la même autorité qu'une zone étayée.
      posEstimatedZone: 'Zone estimée',
      posUncatalogued: 'Position non cataloguée — à vérifier en jeu',
      // Sous-libellé de la ligne de résultat de recherche pour une QUÊTE
      // entière sans position extraite (giver/acteurs tous sans x/z — ex.
      // les quêtes de Prison Island, sur une carte/frame de coordonnées à
      // part). Honnête et distinct de posUnknown (réservé aux lignes hors
      // quête) : dit juste qu'il n'y a aucun point à montrer, pas de bouton
      // carte cassé — la fiche s'ouvre normalement au clic.
      questNoPos: 'Pas de point sur la carte',
      vendorStockTitle: 'Stock du vendeur',
      vendorStockTitleN: n => `Stock du vendeur (${n})`,
      noVendorItems: 'Aucun article connu pour ce marchand.',
      npcCat: 'PNJ',
      vendorSuffix: ' · Marchand',
      questsGivenN: n => `Quêtes données (${n})`,
      noQuestsForNpc: 'Aucune quête connue pour ce PNJ.',
      questItemBadge: 'Objet de quête',
      gameItemBadge: 'Item du jeu',
      soldTag: 'vendu',
      craftableTag: 'craftable',
      lootTag: 'loot',
      activableBadge: 'Activable',
      // Badge « Conteneur » (passe décodage mécanisme, job A) : identité de
      // l'objet propre à collect_from_object (t.label, ex. « Vieille
      // caisse ») — distinct d'activableBadge ci-dessus (objet auto-suffisant
      // de use_object, pas un conteneur où AUTRE CHOSE est trouvé).
      containerBadge: 'Conteneur',
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
      // Mécanisme receive_reward (passe décodage mécanisme, job A) : l'item
      // est obtenu en terminant une AUTRE quête (geo.py reward_of), pas remis
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
      // Mécanisme kill_collect/kill : target.drop_chance (0-100, exact,
      // depuis les octets) — distinct du dropChanceApprox générique (part
      // calculée, jamais "≈" ici, c'est le pourcentage conçu par le jeu).
      goalDropChanceLabel: pct => `(${pct} %)`,
      // Mécanisme kill_player : target.player_specs joints via heroSpecLabel
      // (fiches.js) — aucune position unique pour un objectif JcJ.
      goalKillPlayerLabel: specs => `Vaincre des joueurs (${specs})`,
      objectivesN: n => `Objectifs (${n})`,
      objectivesTitle: 'Objectifs',
      howToTitle: 'Comment faire',
      rewardsTitle: 'Récompenses',
      questItemsN: n => `Items de quête (${n})`,
      viewGiverBtn: 'Voir le donneur',
      viewZoneBtn: 'Voir la zone',
      // Pendant confiance "moyenne" (passe de câblage batch, voir
      // posEstimatedZone ci-dessus) : dessine les vrais points du camp cité
      // quand la carte active les a chargés, sinon repli sur le même cercle
      // deviné que viewZoneBtn — jamais le même libellé, pour ne jamais le
      // confondre avec une zone confirmée.
      viewEstimatedZoneBtn: "Voir l'estimation",
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
      questExplainedFull: 'Entièrement expliquée',
      questExplainedPartial: n => `${n} objectif${n > 1 ? 's' : ''} incertain${n > 1 ? 's' : ''}`,
      dialogueFicheKind: 'Dialogue PNJ',
      dialogueHeading: 'Dialogue PNJ (pas une quête)',
      dialogueNote: 'Répliques d’ambiance dites par ce personnage — ce n’est pas une quête avec objectifs ni récompenses.',
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
      // Refonte des spots de farm (farm_spot_UX_DESIGN.md, juillet 2026) :
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
      // cette classe (voir build_site_data.py).
      containersTitle: 'Également trouvable dans des coffres',
      containerCampChestHint: 'Généré côté serveur par famille de monstre — aucun placement précis à montrer sur la carte.',
      containerChanceUpTo: pct => `jusqu'à ${pct} %`,
      containerChanceBelowOne: "jusqu'à < 1 %",
      soldByTitle: 'Vendu par',
      obtainDuringQuestTitle: 'Comment obtenir',
      obtainViaKill: name => `En tuant ${name}`,
      obtainViaInteract: label => `En interagissant avec ${label}`,
      // Extension quest_source_of, passe décodage mécanisme job B (harvest/
      // reward_of/world -- given_by réutilise ui.givenByPlain, container
      // réutilise obtainViaInteract ci-dessus, voir build_site_data.py +
      // fiches.js openItemFiche).
      obtainViaHarvest: profession => `En récoltant (${profession})`,
      // Fragment, pas une phrase complète -- composé avec ui.givenByPlain en
      // « Donné par X — quest Y » (cas cross-quête de receive_reward, voir
      // la branche qs.via === 'reward_of' d'openItemFiche).
      obtainViaRewardOfQuest: name => `quête ${name}`,
      obtainViaWorld: 'Trouvé en accomplissant cette quête',
      moreMerchants: n => `+ ${n} autres marchands`,
      merchantPosUnknown: 'Position du marchand non précisée.',
      recipeTitle: 'Recette',
      producesArrow: 'produit → ',
      recipeChipLabel: name => `Recette : ${name}`,
      usedInTitle: 'Utilisé dans',
      rewardBadge: 'Récompense',
      requiredBadge: 'Requis',
      locatorTitle: 'Repère',
      // Drapeau utilisateur (#84, clic droit) -- volontairement PAS "pin"/
      // "épingle" : distinct du futur "filtre épinglé" du panneau gauche
      // (#82, glyphe épingle) et de locatorTitle ci-dessus (réticule goto).
      // Voir pins.js + COORDINATION.md §Vocabulaire.
      userFlagTitle: 'Drapeau',
      clearAllFlagsBtn: 'Effacer tous les drapeaux',
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
      // Section faune de la fiche camp (unknown_states_DESIGN.md #4/#10,
      // tâche #67) : un camp « monster-ish » (kind monsters/creeps/wildlife)
      // dont le nom de manager ne donne aucune espèce résolue — prouvé au
      // niveau des octets que les points de spawn du camp ne portent AUCUNE
      // référence d'entité (data/SCHEMA.md « camp fauna »), 43/128 camps de ce
      // type aujourd'hui. N'affichait jusqu'ici rien du tout (trou silencieux,
      // voir openCampFiche) ; remplacé par une note honnête d'état dynamique.
      campFaunaUnknownNote: "Les créatures précises de ce camp ne sont pas enregistrées dans les données client — apparition gérée dynamiquement par le serveur.",
      // Section « Objets de quête » de la fiche monstre (suivi du lien
      // monstre<->objet de quête, tâche 1/4) : liste questDrops[] cuit au
      // build -- uniquement des liens produits par le résolveur, section
      // absente si vide (jamais un bloc vide fabriqué).
      monsterQuestItemsTitle: 'Objets de quête',
      familyMonstersTitle: n => `Monstres de cette famille (${n})`,
      abilityLabel: 'Capacité',
      harvestTitle: 'Dépeçage',
      noHarvestCatalogued: 'Aucun butin de dépeçage catalogué pour ce monstre.',
      // Fiche de référence « nœud de récolte » (#81, site/data/<lang>/nodes.bin)
      // -- nom + palier + métier + ses propres lignes de butin (lootRowsHtml).
      nodeFicheKind: 'Nœud de récolte',
      // generic:true (9/30 types de nœud) : aucune localisation en jeu
      // n'existe pour cette fiche interne -- pastille state-chip honnête,
      // jamais un faux nom localisé inventé.
      nodeGenericNote: "Nom interne — aucune localisation en jeu n'existe pour ce type de nœud.",
      harvestedOnTitle: 'Récolté sur',
      statsTitle: 'Statistiques',
      realStatsBadge: 'réel',
      // Info-bulle du badge « réel » (monsters.md finding #1) : distingue
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
      // Badge « calculé » : stats issues de la formule de mise à l'échelle du
      // jeu (décodée byte-exact, voir 
      // pas une estimation.
      computedStatsBadge: 'calculé (formule du jeu)',
      // Note honnête sous la table fourchette-par-palier : le jeu assigne le
      // palier de difficulté côté serveur au spawn (aucune référence côté
      // client), d'où une plage selon le palier plutôt qu'un chiffre unique.
      statsPerTierNote: 'Palier de difficulté assigné côté serveur — fourchette selon le palier (facile → boss).',
      // Caveat honnête sur les colonnes Élite/Boss (monsters.md finding #2) :
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
      // Taxonomie « on ne sait pas » à 3 états (unknown_states_DESIGN.md,
      // tâche #67) : un seul composant `.state-chip` + vocabulaire court pour
      // tout endroit du site qui explique honnêtement une incertitude
      // (position, butin, stock vendeur, mise à l'échelle rareté/tier,
      // résidu de but de quête non résolu…) au lieu des ~6 idiomes bespoke
      // existants. "dev" réutilise devBadge ci-dessus comme libellé (cette
      // clé n'ajoute que l'info-bulle manquante) — dynamic/unknown sont les
      // deux seuls libellés réellement nouveaux. Voir stateChip() dans
      // js/fiches.js.
      devBadgeTitle: 'Contenu de test ou inachevé, jamais utilisé en jeu.',
      stateDynamic: 'Dynamique',
      stateDynamicTitle: 'Décidé par le serveur en temps réel — absent des données client.',
      stateUnknown: 'Inconnu',
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
      // + , tmp/convergence/port_map.md #8/#9/#10.
      rollRangeTitle: 'Plage de jet',
      weaponDpsTitle: "DPS d'arme",
      weaponDpsDerived: 'DPS (calculé)',
      // Groupement principale/secondaires (data-accuracy audit, items.md #1) :
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
      // Reformulé (unknown_states_DESIGN.md §2 re-check #2, tâche #67) :
      // l'ancienne formule « (probablement géré côté serveur) » affirmait une
      // cause précise NON PROUVÉE — data/SCHEMA.md lui-même ne tranche pas
      // entre mise à l'échelle côté serveur et une autre règle du jeu (ex. une
      // règle liée au nombre d'emplacements de talent). Neutre désormais, et
      // enveloppé dans une pastille d'état "unknown" par son appelant
      // (formulaHtml) plutôt qu'un simple paragraphe .hint.
      scalingServerSide: "Ne varie pas avec la rareté dans les données du client, pour une raison qui n'est pas déterminable depuis ce qui est extrait.",
      scalingNotLocated: 'Mise à l’échelle non localisée dans les données du client.',
      tierNotRarity: 'Évolue par PALIER (tier), pas par rareté.',
      useEffectTitle: 'Effet d’utilisation',
      effectVarRuntimeTooltip: 'Calculé en direct en jeu (pas une valeur fixe)',
      effectVarUnextractedTooltip: 'Valeur pas encore extraite des données du client',
      effectVarBaseTooltip: 'Valeur pour un personnage de base — évolue avec vos stats',
      effectVarFormulaTooltip: 'Dépend de vos stats (formule décodée affichée)',
    },
    cat: {
      npc: 'PNJ', poi: "Points d'intérêt", quest: 'Quêtes',
      qao: 'Objets de quête', workshop: 'Ateliers',
      // Container re-categorization : l'ancienne couche unique "Coffres"
      // (chest) est retirée, remplacée par ces 2 vraies couches — voir
      // DATA_CONTRACT.md §1/§3.1 et js/config.js CATS.
      searchable_chest: 'Coffres fouillables', camp_chest: 'Coffres de camp',
    },
    rarity: { Common: 'Commun', Uncommon: 'Peu commun', Rare: 'Rare', Epic: 'Épique' },
    kind: { npc: 'PNJ', object: 'Objet', item: 'Item', other: '—' },
    itemKind: {
      weapon: 'Arme', resource: 'Ressource', rune: 'Rune', consumable: 'Consommable',
      artifact: 'Artefact', chip: 'Puce', synthesis: 'Synthèse',
      quest_item: 'Objet de quête', recipe: 'Recette', item: 'Objet',
    },
    // Type d'arme affiché en fiche/recherche ("Pistolet · Deux mains ·
    // Bombardier") -- weaponType/weaponClass reprennent le terme officiel du
    // jeu quand il existe (ConstWeaponTypes.xml pour G/Sh/S, Units.xml pour
    // les classes Bomber/Champion/Warmonger — voir data/SCHEMA.md "i18n" sur
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
    },
    // Familles de décor (chests.bin group="decor" par family, + "legacy"
    // pour group="legacy_chest") : sous-lignes du groupe repliable "Décor"
    // (js/sidebar.js buildDecorGroup) — voir DATA_CONTRACT.md §3.1.
    decorFamily: {
      barrel: 'Tonneaux', boxes: 'Caisses', furniture: 'Meubles',
      corpse: 'Cadavres', books: 'Livres', misc: 'Divers', legacy: 'Coffre hérité',
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
      chests: 'Coffres fouillables', corpses: 'Corps fouillables', sacks: 'Sacs',
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
    // Modes de jeu des tables de présence (#93, camp_details `modes`) —
    // jetons moteur PvE/PvP/Solo*, PvE/PvP laissés tels quels (usage
    // universel), Solo composé.
    campMode: {
      PvE: 'PvE', PvP: 'PvP', SoloPvE: 'PvE solo', SoloPvP: 'PvP solo',
      SoloPvP_HC: 'PvP solo (HC)',
    },
    // Type physique d'un coffre (world_objects.json chest_type) -- ensemble
    // exact tiré de data/world_objects.json, voir data/SCHEMA.md "Chest loot + type".
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
    // toutes les langues, voir data/SCHEMA.md "Activable type".
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
    },
    // Statistiques de monstre (stats_decoded / stat_curve) -- voir
    // data/SCHEMA.md "Monster stats" + js/fiches.js::openMonsterFiche().
    statLabel: {
      health: 'Santé', attack_power: "Puissance d'attaque", weapon_damage: "Dégâts d'arme",
      armor: 'Armure', magic_resist: 'Résistance magique', accuracy: 'Précision',
      attack_speed: "Vitesse d'attaque", movement_speed: 'Vitesse de déplacement', vision: 'Vision',
      health_regen: 'Régén. de santé', mana: 'Mana', mana_regen: 'Régén. de mana',
      xp_reward: 'XP donnée', gold_reward: 'Or donné',
      phys_crit_chance: 'Chances de critique physique', magic_crit_chance: 'Chances de critique magique',
      // Ajoutés Phase 4 (stat_ranges/weapon_dps/formules -- voir
      // tmp/convergence/port_map.md #8/#9) : stats rollables/opérandes de
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
