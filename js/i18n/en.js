/* Dictionnaire UI — en. Mêmes clés que les autres langues (voir js/i18n/index.js). */

export default {
    ui: {
      pageTitle: 'Kwalat — Corepunk Community Map',
      pageDescription: 'Interactive map of Kwalat (Corepunk): NPCs, quests, workshops, chests, camps and points of interest.',
      panelAriaLabel: 'Legend and filters',
      title: 'Map of Kwalat',
      subtitle: 'Corepunk · community map',
      searchPlaceholder: 'Search an NPC, a quest, an item, a monster…',
      searchAriaLabel: 'Search',
      filtersAriaLabel: 'Filters',
      legend: 'Legend',
      campsTitle: 'Camps & resources',
      trackedTitle: 'Tracked',
      trackedEmptyHint: 'Pin a marker with “Track” to find it here.',
      footerNote: 'Data extracted from the game client · not affiliated with Artificial Core.',
      langSelectorLabel: 'Language',
      panelToggleAriaLabel: 'Show or hide the panel',
      mapAriaLabel: 'World map',
      loadingText: 'Surveying the terrain…',
      zonesLabel: 'Zones (regions)',
      campLoading: 'Loading camps…',
      decorFamiliesTitle: 'Decor families',
      chestTypesAllBtn: 'All',
      chestTypesNoneBtn: 'None',
      // Container re-categorization (DATA_CONTRACT.md): the 2 real chest
      // layers + the "Decor" group (legacy_chest/decor by family).
      decorGroupLabel: 'Decor',
      campChestLabel: 'Camp chest',
      legacyChestLabel: 'Legacy treasure chest',
      lootGenericNote: 'Generic loot: the only known loot link for this container is a broad searchable pool, not a dedicated loot table — this is not a targeted farmable chest.',
      searchableChestTitle: 'Searchable chest',
      searchableChestRarityNote: 'Random rarity: the tier (common/rare/epic…) is decided by the server at spawn time — not derivable from the client data.',
      noResults: 'No results.',
      noResultsHint: 'Try a shorter word, or check the spelling.',
      searchBodyHintPrefix: '› objective: ',
      trackBtn: 'Track',
      trackedBtn: 'Tracked ✓',
      doneBtn: 'Done',
      doneBtnActive: 'Done ✓',
      removeBtn: 'Remove',
      ficheBtn: 'Details',
      ficheShopBtn: 'Details · Shop',
      loreEntryTitle: 'Bestiary',
      lootTableKind: 'Loot table',
      priceTitle: 'Price',
      hideHighlightBtn: 'Hide points',
      stockFilterPlaceholder: 'Filter list…',
      rewardTablesN: n => `Reward tables (${n})`,
      questCountSuffix: n => ` · ${n} quest${n > 1 ? 's' : ''}`,
      highlightPointsBtn: n => `Highlight all ${n} points`,
      dataGeneratedAt: date => `Data from ${date}`,
      questMapsLine: names => `Maps: ${names}`,
      bestiaryTitle: 'Bestiary',
      bestiaryLoading: 'Loading bestiary…',
      bestiaryZonesN: n => `${n} zones`,
      lootTableItemsN: n => `Contents (${n})`,
      probableLootTitle: 'Likely loot',
      probableLootNote: name => `"${name}" table matched by container type — confirm in game.`,
      questCat: 'Quest',
      givenBySuffix: name => ` · given by ${name}`,
      givenByPlain: name => `given by ${name}`,
      ficheCompleteBtn: 'Full details',
      campLabel: 'Camp',
      pointsHereSuffix: n => ` · ${n} points here`,
      spawnsTotal: n => `${n} total spawns`,
      campFicheBtn: 'Camp details',
      levelAbbrev: lvl => `lvl ${lvl}`,
      spawnPointsCount: n => `${n} spawn points`,
      viewOnMapBtn: 'View on map',
      likelyMonsters: n => `Likely monsters (${n})`,
      guaranteedLabel: 'Guaranteed',
      chanceLabel: 'Chance',
      // Approximate SHARE (d.ch = weight / the table's total weight, see
      // data/SCHEMA.md "chance") of a non-guaranteed drop + honest caveat set
      // as a tooltip (title) on the pill -- see js/fiches.js dropRateHtml.
      dropChanceApprox: pct => `≈ ${pct} %`,
      dropChanceBelowOne: '< 1 %',
      dropChanceCaveat: "This item's share of the table's loot pool — not a per-kill probability (the real roll count is handled server-side).",
      lootBestRates: 'Loot (best rates)',
      mapLabel: 'Map',
      mapSelectorLabel: 'Displayed map',
      mapBadgeTitle: name => `On ${name} — click to switch`,
      mapTilesOnlySuffix: '(approx.)',
      mapGroupWorld: 'World',
      mapGroupExtraction: 'Extraction',
      mapGroupBattleground: 'Battlegrounds',
      mapGroupPve: 'PvE arenas',
      mapGroupPvp: 'PvP arenas',
      mapGroupOther: 'Other',
      // "position unknown" banned site-wide (see data/SCHEMA.md "search_zone"):
      // this generic label stays only for non-goal rows (NPC/object/merchant
      // with no extracted position) — quest goals themselves use
      // posDynamic/posDynamicZone/posUncatalogued below, never this one.
      posUnknown: 'position not specified',
      posDynamic: 'Dynamic position',
      // Kept short (was "Dynamic position — spawn zone"): this label sits on
      // the same row as a "View zone" button inside a quest-item fiche, and
      // the long form pushed the button off the right edge (overflow fix E).
      posDynamicZone: 'Spawn zone',
      posUncatalogued: 'Uncatalogued position — check in-game',
      // Sub-label for a search result row for an entire QUEST with no
      // extracted position (giver/actors all lack x/z — e.g. the Prison
      // Island quests, on a separate map/coordinate frame). Honest and
      // distinct from posUnknown (reserved for non-quest rows): just says
      // there's no point to show, no broken map button — the fiche still
      // opens normally on click.
      questNoPos: 'No point on the map',
      vendorStockTitle: 'Vendor stock',
      vendorStockTitleN: n => `Vendor stock (${n})`,
      noVendorItems: 'No known items for this merchant.',
      npcCat: 'NPC',
      vendorSuffix: ' · Merchant',
      questsGivenN: n => `Quests given (${n})`,
      noQuestsForNpc: 'No known quests for this NPC.',
      questItemBadge: 'Quest item',
      gameItemBadge: 'Game item',
      soldTag: 'sold',
      craftableTag: 'craftable',
      lootTag: 'loot',
      activableBadge: 'Activatable',
      objectivesN: n => `Objectives (${n})`,
      objectivesTitle: 'Objectives',
      howToTitle: 'How to',
      rewardsTitle: 'Rewards',
      questItemsN: n => `Quest items (${n})`,
      viewGiverBtn: 'View giver',
      viewZoneBtn: 'View zone',
      onMapTitle: 'On the map',
      dialogsN: n => `Dialogue (${n})`,
      // Dialogue-bark "quest" (hello_*/info_* NPC greeting graph, isDialogue —
      // no goals/rewards): its fiche is headed with this instead of the empty
      // quest layout, so opening one (dev-content ON, or a direct q= link) is
      // never a blank quest sheet.
      dialogueFicheKind: 'NPC dialogue',
      dialogueHeading: 'NPC dialogue (not a quest)',
      dialogueNote: 'Idle greeting lines this character says — not a quest with objectives or rewards.',
      journalTitle: 'Journal',
      relatedQuestsTitle: 'Related quests',
      questFicheKind: region => 'Quest' + (region ? ` · ${region}` : ''),
      dropRatesTitle: 'Drop rates',
      farmSpotsTitle: 'Farm spots',
      soldByTitle: 'Sold by',
      // Quest-scripted-only obtain fallback (quest-guide-feature plan sec
      // 5.2/6.3): shown ONLY when an item has no generic recipe/drop/vendor
      // path at all (the dominant case for a genuine quest item) -- the
      // quest goal that actually resolved this item is the only true source.
      obtainDuringQuestTitle: 'How to obtain',
      obtainViaKill: name => `By killing ${name}`,
      obtainViaInteract: label => `By interacting with ${label}`,
      moreMerchants: n => `+ ${n} more merchants`,
      merchantPosUnknown: 'Merchant position not specified.',
      recipeTitle: 'Recipe',
      producesArrow: 'produces → ',
      usedInTitle: 'Used in',
      rewardBadge: 'Reward',
      requiredBadge: 'Required',
      pingTitle: 'Ping',
      copyLinkBtn: 'Copy link',
      linkCopied: 'Link copied ✓',
      locatorTitle: 'Marker',
      mapDownload9600: 'Map 9600px',
      mapDownload4800: 'Map 4800px',
      loadErrorPrefix: msg => `Could not load data (${msg})`,
      closeBtnAria: 'Close',
      // Live "data updated" banner (js/updatecheck.js) -- version.json
      // token changed since this tab loaded (a new deploy happened while
      // the tab was open). Never auto-reload: this just offers one.
      dataUpdatedBanner: 'New data available — reload the map',
      dataUpdatedReloadBtn: 'Reload',
      monsterLabel: 'Monster',
      variantsNote: n => ` · +${n} variants`,
      monsterAbilitiesN: n => `Abilities (${n})`,
      monsterCampsN: n => `Spawns in (${n})`,
      noLootCatalogued: 'No catalogued loot for this monster.',
      noAbilitiesKnown: 'No known abilities for this monster.',
      noCampsKnown: 'No known camp for this monster.',
      // Monster fiche "Quest items" section (monster<->quest-item link
      // follow-up, task 1/4): lists questDrops[] baked at build time --
      // ONLY resolver-produced kill links, section omitted entirely when
      // empty (never an empty fabricated block).
      monsterQuestItemsTitle: 'Quest items',
      familyMonstersTitle: n => `Monsters of this family (${n})`,
      abilityLabel: 'Ability',
      harvestTitle: 'Harvesting',
      noHarvestCatalogued: 'No catalogued harvest loot for this monster.',
      statsTitle: 'Stats',
      realStatsBadge: 'real',
      // "real" badge tooltip (monsters.md finding #1): explicitly distinguish
      // a REAL client reading (m_abs_*/mbt_*_boss record, e.g. Furious
      // Woodraptor = 154,440 HP) from the generic per-tier estimate below.
      realStatsTooltip: 'Real values (client) — read directly from the game data for this specific monster, not a per-tier estimate.',
      // Honest note for mobs WITHOUT a real client stat reading (statsSource
      // !== "record"): reverse engineering showed the old "estimated" grid
      // read the wrong field (~640x too low, e.g. a level-20 boss showing
      // ~544 HP for a real server value of ~350,000) -- that fabricated
      // number is removed, replaced by this plain admission. See
      // js/fiches.js monsterStatsSection.
      statsServerNote: 'Precise stats are resolved server-side (not available in the client data).',
      computedStatsBadge: 'computed (game formula)',
      statsPerTierNote: 'Difficulty tier assigned server-side — range shown per tier (easy → boss).',
      // Honest caveat on the Elite/Boss columns (monsters.md finding #2):
      // unlike easy/medium/hard, these 2 tiers were NEVER checked against an
      // external source — the community's "~350,000 HP" level-20 boss figure
      // doesn't reproduce from any client data, and a real named boss can run
      // far above this generic range (see the "real" badge when available).
      statsBossEliteCaveat: '"Elite"/"Boss" columns: generic estimated values, not confirmed in-game — some real named bosses are far tougher (see the "real" badge when a dedicated record exists for that monster).',
      bestiaryMapFilterLabel: map => `On this map (${map})`,
      bestiaryMapEmpty: 'No monsters attributed to this map. Uncheck to show all.',
      alwaysGrantedTitle: 'Always granted',
      choiceGroupTitle: n => `Choice ${n}`,
      orWord: ' or ',
      xpAbbrev: n => `${n} XP`,
      goldAbbrev: n => `${n} gold`,
      // Rarity selector (same-name variants, see js/rarity.js) + grouped-
      // result search hint "N rarities".
      rarityVariantsLabel: 'Rarity',
      rarityVariantsCount: n => `${n} rarities`,
      // Monster level/variant selector (feature #12 — a model groups all its
      // levels/reskins together, see js/fiches.js monsterModelVariants) +
      // grouped-result search hint "N variants", same idiom as
      // rarityVariantsCount above.
      monsterVariantsLabel: 'Level',
      monsterVariantsCount: n => `${n} variants`,
      // Dev/test content (feature #13, isTest:true hidden by default): reveal
      // tag at the bottom of the panel + badge shown wherever revealed
      // content is displayed (fiche, variant pill, bestiary, search).
      devContentTag: n => `Dev content (${n})`,
      devBadge: 'Test',
      // Roll ranges / weapon DPS / formulas / rune-chip scaling
      // (stat_ranges, weapon_dps, artifact_formula/formula, rarity_scaling,
      // tier_scaling) -- net-new, see 
      // + , tmp/convergence/port_map.md #8/#9/#10.
      rollRangeTitle: 'Roll range',
      weaponDpsTitle: 'Weapon DPS',
      weaponDpsDerived: 'DPS (computed)',
      // Main/secondary grouping (data-accuracy audit, items.md #1): an
      // artifact rolls 1 guaranteed MAIN stat + a limited number of
      // SECONDARY stats drawn from a shared pool -- never all at once, unlike
      // the old flat rendering.
      rollMainStatTitle: 'Main stat (guaranteed)',
      rollSecondaryStatsTitle: 'Secondary stats (pool)',
      rollSecondaryHintN: (n, pool) => `Up to ${n} of these ${pool} stats actually roll on the item (shared pool) — not all at once.`,
      rollSecondaryHint: 'A limited number of these stats actually roll on the item (shared pool) — not all at once.',
      formulaTitle: 'Formula',
      formulaRankLabel: n => `Rank ${n}`,
      formulaPartialNote: 'Part of this line depends on an undecoded engine reference.',
      rarityScalingTitle: 'Rarity scaling',
      tierScalingTitle: 'Tier scaling',
      scalingServerSide: "Doesn't vary with rarity in the client data (likely handled server-side).",
      scalingNotLocated: 'Scaling not located in the client data.',
      tierNotRarity: 'Scales by TIER, not by rarity.',
      // "Use effect" section (item_desc_PLAN.md Phase B): a linked ability's
      // own tooltip prose, joined from item.abilities[] at build time (see
      //  build_catalog()). Never a fabricated
      // number: every token this build can't honestly resolve renders as a
      // small "?" marker chip instead of the raw {{mustache}} path, with the
      // raw token surfaced only in the tooltip for the curious. Two
      // distinct kinds of gap, two distinct tooltip texts (manager's UX
      // override) -- "runtime" (ShieldValue/CurrentStack, computed live
      // in-game BY NATURE, never a data gap) vs "unextracted" (Modifiers/
      // TotalTime/etc, a real static value this build just hasn't decoded
      // yet, see Phase C in the plan).
      useEffectTitle: 'Use effect',
      effectVarRuntimeTooltip: 'Computed live in-game (not a fixed value)',
      effectVarUnextractedTooltip: 'Value not yet extracted from client data',
      effectVarBaseTooltip: 'Value for a base character — scales with your stats',
      effectVarFormulaTooltip: 'Depends on your stats (decoded formula shown)',
    },
    cat: {
      npc: 'NPCs', poi: 'Points of interest', quest: 'Quests',
      qao: 'Quest objects', workshop: 'Workshops',
      // Container re-categorization: the old single "Chests" layer (chest)
      // is removed, replaced by these 2 real layers — see
      // DATA_CONTRACT.md §1/§3.1 and js/config.js CATS.
      searchable_chest: 'Searchable chests', camp_chest: 'Camp chests',
    },
    rarity: { Common: 'Common', Uncommon: 'Uncommon', Rare: 'Rare', Epic: 'Epic' },
    kind: { npc: 'NPC', object: 'Object', item: 'Item', other: '—' },
    itemKind: {
      weapon: 'Weapon', resource: 'Resource', rune: 'Rune', consumable: 'Consumable',
      artifact: 'Artifact', chip: 'Chip', synthesis: 'Synthesis',
      quest_item: 'Quest item', recipe: 'Recipe', item: 'Item',
    },
    weaponType: {
      Gun: 'Gun', Sword: 'Sword', Shield: 'Shield', Dagger: 'Dagger',
      Bow: 'Bow', Knuckle: 'Knuckles', Spear: 'Spear',
    },
    useType: {
      OneHanded: 'One-handed', TwoHanded: 'Two-handed',
      OneHandedLeft: 'One-handed (left)', OneHandedRight: 'One-handed (right)',
    },
    weaponClass: { Bomber: 'Bomber', Champion: 'Champion', Warmonger: 'Warmonger' },
    action: {
      kill: 'Kill', collect: 'Collect', use: 'Use', talk: 'Talk to',
      goto: 'Go to', deliver: 'Deliver', custom: 'Do',
      repair: 'Repair', craft: 'Craft', mix: 'Mix',
    },
    searchCat: {
      npc: 'NPC', poi: 'Place', quest: 'Quest', qao: 'Object',
      workshop: 'Workshop', camp: 'Camp', item: 'Item',
      monster: 'Monster', zone: 'Region', location: 'Place',
      ability: 'Ability', event: 'Event', chest: 'Chest',
      searchable_chest: 'Searchable chest',
    },
    // Decor families (chests.bin group="decor" by family, + "legacy" for
    // group="legacy_chest") — sub-rows of the collapsible "Decor" group
    // (js/sidebar.js buildDecorGroup), see DATA_CONTRACT.md §3.1.
    decorFamily: {
      barrel: 'Barrels', boxes: 'Boxes', furniture: 'Furniture',
      corpse: 'Corpses', books: 'Books', misc: 'Misc', legacy: 'Legacy chest',
    },
    // "searchable" and "quest" reworded so they no longer read as the
    // top-level static layers (cat.chest "Chests" / cat.quest "Quests"):
    // these are camp FILTER rows (dynamic spawns / searchable containers),
    // not the same layers -- see campType.chests below for the matching fix
    // on the "Chests — <region>" sub-type label.
    campKind: {
      monsters: 'Monsters', creeps: 'Creeps', herbalism: 'Herbalism',
      logging: 'Logging', mining: 'Mining', searchable: 'Searchable',
      destroyable: 'Destroyables', reactive: 'Interactives', shrines: 'Shrines',
      soulkeeper: 'Soulkeepers', quest: 'Quest spawns', wildlife: 'Wildlife',
      guards: 'Guards', event: 'Event', other: 'Other',
    },
    mapName: {
      Kwalat: 'Kwalat',
      Extraction_Island_large: 'Prison Island',
      Extraction_Island_small: 'Prison Island (small)',
    },
    monsterAttack: { Melee: 'Melee', Range: 'Ranged', Ranged: 'Ranged', Axe: 'Axe' },
    locationKind: {
      town: 'Town', poi: 'Point of interest', mob: 'Bestiary', dungeon_boss: 'Dungeon boss',
      gathering: 'Resource', portal: 'Portal', shrine: 'Shrine',
    },
    campType: {
      barrels: 'Explosive barrels', tombstones: 'Tombstones', coffins: 'Coffins',
      chests: 'Searchable chests', corpses: 'Searchable corpses', sacks: 'Sacks',
      crateCorn: 'Corn crate', crateCabbage: 'Cabbage crate', crateCarrot: 'Carrot crate',
      crateOnion: 'Onion crate', crateEggplant: 'Eggplant crate', crateBerries: 'Berry crate',
      sackCorn: 'Corn sack', sackWheat: 'Wheat sack',
      mushrooms: 'Mushrooms', bottles: 'Bottles', pots: 'Pots',
      wooden: 'Wooden props', leafTrash: 'Leaf piles',
      vegetables: 'Vegetables', urban: 'Urban props',
    },
    // Physical chest type (world_objects.json chest_type) -- exact set from
    // data/world_objects.json, see data/SCHEMA.md "Chest loot + type".
    chestType: {
      Backpack: 'Backpack', Barrel: 'Barrel', Bathroom: 'Bathroom', Bedroom: 'Bedroom',
      Boiler: 'Boiler', Books: 'Books', Boxes: 'Boxes', Cabinet: 'Cabinet', Chest: 'Chest',
      Closed: 'Closed', Corpse: 'Corpse', Fridge: 'Fridge', Guest: 'Guest room',
      Kitchen: 'Kitchen', Papers: 'Papers', Rest: 'Rest', Shelf: 'Shelf', Truck: 'Truck',
      Wardrobe: 'Wardrobe', Warehouse: 'Warehouse',
    },
    // Activatable quest-object nature (world_objects.json activable_type) --
    // exact set from data/world_objects.json; several tokens are proper
    // nouns (characters/unique objects) left identical in every language,
    // see data/SCHEMA.md "Activable type".
    activableType: {
      Ancient: 'Ancient', Artifact: 'Artifact', Barrel: 'Barrel', Bart: 'Bart', Beehive: 'Beehive',
      Black: 'Black', Blade: 'Blade', Bloody: 'Bloody', Blue: 'Blue', Broken: 'Broken',
      Building: 'Building', Captains: "Captain's", Cell: 'Cell', Chain: 'Chain',
      Chainsaw: 'Chainsaw', Charging: 'Charging', Cigarette: 'Cigarette', Container: 'Container',
      Crush: 'Crush', Data: 'Data', Deed: 'Deed', Diamond: 'Diamond',
      Document: 'Document', Door: 'Door', Dream: 'Dream', Drip: 'Drip', Dwarf: 'Dwarf',
      East: 'East', Empty: 'Empty', Energydrink: 'Energy drink', Enter: 'Enter',
      Evidence: 'Evidence', Explosive: 'Explosive', Felixs: "Felix's", Fire: 'Fire', Fishing: 'Fishing',
      Free: 'Free', Gasoline: 'Gasoline', Gift: 'Gift', Glass: 'Glass', Green: 'Green',
      Handle: 'Handle', Hiding: 'Hiding spot', Ingredient: 'Ingredient', Iron: 'Iron',
      Isopropyl: 'Isopropyl', Item: 'Item', Jahri: 'Jahri', Kegs: 'Kegs', Light: 'Light',
      'Lock/Key': 'Lock/Key', Machine: 'Machine', Mask: 'Mask', Maxwell: 'Maxwell',
      Message: 'Message', Mineral: 'Mineral', Mixing: 'Mixing', Mobius: 'Mobius',
      Mysterious: 'Mysterious', Nia: 'Nia', Node: 'Node', North: 'North', Orange: 'Orange',
      Package: 'Package', Phylactery: 'Phylactery', Piece: 'Piece', Place: 'Place', Plant: 'Plant',
      Processor: 'Processor', Provisions: 'Provisions', Psychomushroom: 'Psychomushroom',
      Purple: 'Purple', Put: 'Deposit', Radio: 'Radio', Recording: 'Recording', Red: 'Red',
      Rehearsed: 'Rehearsed', Remains: 'Remains', Renovated: 'Renovated', Robot: 'Robot', Safe: 'Safe',
      Second: 'Second', Secret: 'Secret', Sensor: 'Sensor', Sewing: 'Sewing', Shiny: 'Shiny',
      Shipping: 'Shipping', Shirt: 'Shirt', Sign: 'Sign', Slippery: 'Slippery',
      Smoker: 'Smoker', Soldier: 'Soldier', South: 'South', Souvenir: 'Souvenir', Special: 'Special',
      Statue: 'Statue', Stolen: 'Stolen', Supplies: 'Supplies', Suspicious: 'Suspicious', Svi: 'Svi',
      Tool: 'Tool', Training: 'Training', Transformer: 'Transformer', Triton: 'Triton',
      Undead: 'Undead', Valuable: 'Valuable', Various: 'Various', Vial: 'Vial', Vodka: 'Vodka',
      Water: 'Water', Weast: 'Weast', West: 'West', Wolf: 'Wolf', Workstation: 'Workstation',
      Yellow: 'Yellow', Zazz: 'Zazz', Zephyr: 'Zephyr',
    },
    profession: {
      Alchemy: 'Alchemy', Butchery: 'Butchery', Construction: 'Construction',
      Cooking: 'Cooking', Herbalism: 'Herbalism', Logging: 'Logging',
      Mining: 'Mining', Mysticism: 'Mysticism', Weaponsmithing: 'Weaponsmithing',
    },
    harvestMethod: {
      Flayer: 'Butchery', Herbalism: 'Herbalism', Lumberjack: 'Logging', Miner: 'Mining',
    },
    statLabel: {
      health: 'Health', attack_power: 'Attack power', weapon_damage: 'Weapon damage',
      armor: 'Armor', magic_resist: 'Magic resist', accuracy: 'Accuracy',
      attack_speed: 'Attack speed', movement_speed: 'Movement speed', vision: 'Vision',
      health_regen: 'Health regen', mana: 'Mana', mana_regen: 'Mana regen',
      xp_reward: 'XP given', gold_reward: 'Gold given',
      phys_crit_chance: 'Physical crit chance', magic_crit_chance: 'Magic crit chance',
      // Added Phase 4 (stat_ranges/weapon_dps/formulas -- see
      // tmp/convergence/port_map.md #8/#9): rollable stats/formula operands
      // missing from the "monster" set above.
      spell_power: 'Spell power', phys_penetration: 'Physical penetration',
      magic_penetration: 'Magic penetration', flat_phys_penetration: 'Flat physical penetration',
      flat_magic_penetration: 'Flat magic penetration', phys_crit_power: 'Physical crit power',
      magic_crit_power: 'Magic crit power', lifesteal: 'Lifesteal',
      ability_steal: 'Ability lifesteal', heal_shield_power: 'Heal and shield power',
      cooldown_reduction: 'Cooldown reduction', cost_reduction: 'Cost reduction',
      haste: 'Haste', tenacity: 'Tenacity', slow_resistance: 'Slow resistance',
      bleed_chance: 'Bleed chance', corruption_chance: 'Corruption chance',
    },
    statTier: {
      easy: 'easy', medium: 'medium', hard: 'hard', elit: 'elite', boss: 'boss', miniboss: 'mini-boss',
    },
};
