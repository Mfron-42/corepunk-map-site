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
      chestTypesTitle: 'Types de conteneurs',
      chestTypesAllBtn: 'Tous',
      chestTypesNoneBtn: 'Aucun',
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
      bestiaryTitle: 'Bestiaire',
      bestiaryLoading: 'Chargement du bestiaire…',
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
      abilityLabel: 'Capacité',
      harvestTitle: 'Dépeçage',
      noHarvestCatalogued: 'Aucun butin de dépeçage catalogué pour ce monstre.',
      statsTitle: 'Statistiques',
      realStatsBadge: 'réel',
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
      // Case de filtre par-carte du bestiaire (map = nom de la carte active).
      bestiaryMapFilterLabel: map => `Sur cette carte (${map})`,
      bestiaryMapEmpty: 'Aucun monstre attribué à cette carte. Décochez pour tout afficher.',
      alwaysGrantedTitle: 'Toujours donné',
      choiceGroupTitle: n => `Choix ${n}`,
      orWord: ' ou ',
      xpAbbrev: n => `${n} XP`,
      goldAbbrev: n => `${n} or`,
      // Sélecteur de rareté (variantes même-nom, voir js/rarity.js) + indice
      // de recherche « N raretés » sur le résultat regroupé.
      rarityVariantsLabel: 'Rareté',
      rarityVariantsCount: n => `${n} raretés`,
      // Sélecteur de niveau/variante de monstre (feature #12, un modèle
      // regroupe tous ses niveaux/reskins — voir js/fiches.js
      // monsterModelVariants) + indice de recherche « N variantes » sur le
      // résultat regroupé, même idiome que rarityVariantsCount ci-dessus.
      monsterVariantsLabel: 'Niveau',
      monsterVariantsCount: n => `${n} variantes`,
      // Contenu dev/test (feature #13, isTest:true masqué par défaut) : tag
      // de révélation en bas du panneau + badge apposé partout où du contenu
      // révélé s'affiche (fiche, pastille de variante, bestiaire, recherche).
      devContentTag: n => `Contenu dev (${n})`,
      devBadge: 'Test',
      // Plages de jet / DPS d'arme / formules / mise à l'échelle rune-puce
      // (stat_ranges, weapon_dps, artifact_formula/formula, rarity_scaling,
      // tier_scaling) -- net-new, voir 
      // + , tmp/convergence/port_map.md #8/#9/#10.
      rollRangeTitle: 'Plage de jet',
      weaponDpsTitle: "DPS d'arme",
      weaponDpsDerived: 'DPS (calculé)',
      formulaTitle: 'Formule',
      formulaRankLabel: n => `Rang ${n}`,
      formulaPartialNote: 'Une partie de cette ligne dépend d’une référence moteur non décodée.',
      rarityScalingTitle: 'Mise à l’échelle par rareté',
      tierScalingTitle: 'Mise à l’échelle par palier',
      scalingServerSide: 'Ne varie pas avec la rareté dans les données du client (probablement géré côté serveur).',
      scalingNotLocated: 'Mise à l’échelle non localisée dans les données du client.',
      tierNotRarity: 'Évolue par PALIER (tier), pas par rareté.',
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
