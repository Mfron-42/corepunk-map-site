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
      trackedTitle: 'Suivis',
      trackedEmptyHint: 'Épinglez un marqueur avec « Suivre » pour le retrouver ici.',
      footerNote: 'Données extraites du client du jeu · non affilié à Artificial Core.',
      langSelectorLabel: 'Langue',
      panelToggleAriaLabel: 'Afficher ou masquer le panneau',
      mapAriaLabel: 'Carte du monde',
      loadingText: 'Relevé topographique en cours…',
      zonesLabel: 'Zones (régions)',
      campLoading: 'Chargement des camps…',
      noResults: 'Aucun résultat.',
      noResultsHint: 'Essayez un mot plus court, ou vérifiez l’orthographe.',
      searchBodyHintPrefix: '› objectif : ',
      trackBtn: 'Suivre',
      trackedBtn: 'Suivi ✓',
      doneBtn: 'Fait',
      doneBtnActive: 'Fait ✓',
      removeBtn: 'Retirer',
      ficheNpcBtn: n => `Fiche (${n} quête${n > 1 ? 's' : ''})`,
      ficheBtn: 'Fiche',
      ficheShopBtn: 'Fiche · Boutique',
      loreEntryTitle: 'Bestiaire',
      lootTableKind: 'Table de butin',
      dataGeneratedAt: date => `Données du ${date}`,
      questMapsLine: names => `Cartes : ${names}`,
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
      spawnPointsCount: n => `${n} points de spawn`,
      viewOnMapBtn: 'Voir sur la carte',
      likelyMonsters: n => `Monstres probables (${n})`,
      guaranteedLabel: 'Garanti',
      chanceLabel: 'Probabilité',
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
      posDynamicZone: 'Position dynamique — zone de spawn',
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
      objectivesN: n => `Objectifs (${n})`,
      objectivesTitle: 'Objectifs',
      howToTitle: 'Comment faire',
      rewardsTitle: 'Récompenses',
      questItemsN: n => `Items de quête (${n})`,
      viewGiverBtn: 'Voir le donneur',
      viewZoneBtn: 'Voir la zone',
      onMapTitle: 'Sur la carte',
      dialogsN: n => `Dialogues (${n})`,
      journalTitle: 'Journal',
      relatedQuestsTitle: 'Quêtes liées',
      questFicheKind: region => 'Quête' + (region ? ` · ${region}` : ''),
      dropRatesTitle: 'Taux de drop',
      farmSpotsTitle: 'Spots de farm',
      soldByTitle: 'Vendu par',
      moreMerchants: n => `+ ${n} autres marchands`,
      merchantPosUnknown: 'Position du marchand non précisée.',
      recipeTitle: 'Recette',
      producesArrow: 'produit → ',
      usedInTitle: 'Utilisé dans',
      rewardBadge: 'Récompense',
      requiredBadge: 'Requis',
      pingTitle: 'Ping',
      copyLinkBtn: 'Copier le lien',
      linkCopied: 'Lien copié ✓',
      locatorTitle: 'Repère',
      mapDownload9600: 'Carte 9600px',
      mapDownload4800: 'Carte 4800px',
      loadErrorPrefix: msg => `Impossible de charger les données (${msg})`,
      closeBtnAria: 'Fermer',
      monsterLabel: 'Monstre',
      variantsNote: n => ` · +${n} variantes`,
      monsterAbilitiesN: n => `Capacités (${n})`,
      monsterCampsN: n => `Apparaît dans (${n})`,
      noLootCatalogued: 'Butin non catalogué pour ce monstre.',
      noAbilitiesKnown: 'Aucune capacité connue pour ce monstre.',
      noCampsKnown: 'Aucun camp connu pour ce monstre.',
      familyMonstersTitle: n => `Monstres de cette famille (${n})`,
      locationLabel: 'Lieu',
      abilityLabel: 'Capacité',
      harvestTitle: 'Dépeçage',
      noHarvestCatalogued: 'Aucun butin de dépeçage catalogué pour ce monstre.',
    },
    cat: {
      npc: 'PNJ', poi: "Points d'intérêt", quest: 'Quêtes',
      qao: 'Objets de quête', workshop: 'Ateliers', chest: 'Coffres',
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
      workshop: 'Atelier', camp: 'Camp', item: 'Item',
      monster: 'Monstre', zone: 'Région', location: 'Lieu',
      ability: 'Capacité', event: 'Événement', chest: 'Coffre',
    },
    campKind: {
      monsters: 'Monstres', creeps: 'Creeps', herbalism: 'Herboristerie',
      logging: 'Bois', mining: 'Minerai', searchable: 'Coffres cherchables',
      destroyable: 'Destructibles', reactive: 'Interactifs', shrines: 'Sanctuaires',
      soulkeeper: 'Soulkeepers', quest: 'Quête', wildlife: 'Animaux',
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
      chests: 'Coffres', corpses: 'Corps fouillables', sacks: 'Sacs',
      crateCorn: 'Caisse de maïs', crateCabbage: 'Caisse de choux', crateCarrot: 'Caisse de carottes',
      crateOnion: "Caisse d'oignons", crateEggplant: "Caisse d'aubergines", crateBerries: 'Caisse de baies',
      sackCorn: 'Sac de maïs', sackWheat: 'Sac de blé',
      mushrooms: 'Champignons', bottles: 'Bouteilles', pots: 'Pots',
      wooden: 'Objets en bois', leafTrash: 'Tas de feuilles',
      vegetables: 'Légumes', urban: 'Objets urbains',
    },
    // Famille de prop d'un coffre placé (tc_*) — déduite du nom, voir
    // chestTypeLabel (js/config.js). Grandes familles seulement.
    chestType: {
      barrel: 'Tonneau', boxes: 'Caisses', sci: 'Matériel scientifique',
      trash: 'Déchets', furniture: 'Mobilier', appliances: 'Électroménager',
      papers: 'Papiers', books: 'Livres', corpse: 'Dépouille', fridge: 'Réfrigérateur',
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
};
