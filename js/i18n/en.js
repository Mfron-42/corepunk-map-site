/* Dictionnaire UI — en. Mêmes clés que les autres langues (voir js/i18n/index.js). */

export default {
    ui: {
      // Item catalogue (faceted browse surface, js/fiches/catalog.js).
      catTitle: 'Item catalogue',
      catCount: n => `${n} items`,
      catBrowse: 'Browse the catalogue',
      catBrowseHint: 'Filter items by type, rarity, tier, profession…',
      catFacetKind: 'Type',
      catFacetRarity: 'Rarity',
      catFacetTier: 'Tier',
      catFacetProf: 'Profession',
      catFacetArchetype: 'Archetype',
      catFacetWclass: 'Class',
      catFacetWuse: 'Grip',
      catFacetWspec: 'Specialization',
      catSortLabel: 'Sort',
      catSortName: 'Name',
      catSortRarity: 'Rarity',
      catSortTier: 'Tier',
      catFilterPlaceholder: 'Filter shown items…',
      catClearAll: 'Clear all',
      catActiveLabel: 'Active filters',
      catRemoveFilter: v => `Remove filter: ${v}`,
      catNoResults: 'No items match these filters.',
      catHiddenNote: n => `${n} dev/internal items hidden.`,
      catShowing: (a, b, n) => `${a}–${b} of ${n}`,
      catPagePrev: 'Previous',
      catPageNext: 'Next',
      catMoreValues: n => `+${n} more`,
      catNRarities: n => `${n} rarities`,
      // Ability reference (faceted browse surface, js/fiches/ability_catalog.js).
      abcTitle: 'Ability reference',
      abcCount: n => `${n} abilities`,
      abcBrowse: 'Browse the abilities',
      abcBrowseHint: 'Filter abilities by slot, tag, details…',
      abcFacetSlot: 'Slot',
      abcFacetTag: 'Tag',
      abcFacetDetail: 'Details',
      abcDetailDesc: 'Has description',
      abcDetailFormula: 'Has formula',
      abcDetailCooldown: 'Known cooldown',
      abcSortName: 'Name',
      abcSortSlot: 'Slot',
      abcFilterPlaceholder: 'Filter shown abilities…',
      abcNoResults: 'No abilities match these filters.',
      // Ability fiche — cooldown line (a.cooldown) + effect/CC, raw params, monster origin.
      abilityCooldownLabel: 'Cooldown',
      abilityCooldownSeconds: n => `${n} s`,
      abilityCooldownUnspecified: 'not specified',
      abilityNoDetail: 'No description or formula in the client data for this ability.',
      abilityEffectTitle: 'Effect',
      abilityEffectDurationLabel: 'Duration',
      abilityParamsTitle: 'Raw parameters',
      abilityParamsHint: 'Client engine codes, verbatim — not translated to player stats.',
      abilityOriginMonster: 'Monster ability',
      pageTitle: 'Kwalat — Corepunk Community Map',
      pageDescription: 'Interactive map of Kwalat (Corepunk): NPCs, quests, workshops, chests, camps and points of interest.',
      panelAriaLabel: 'Legend and filters',
      title: 'Map of Kwalat',
      subtitle: 'Corepunk · community map',
      searchPlaceholder: 'Search an NPC, a quest, an item, a monster…',
      searchAriaLabel: 'Search',
      filtersAriaLabel: 'Filters',
      // Active-layers strip (named, removable TAG chips under the search
      // box — the strip doubles as a map legend, js/sidebar.js
      // renderActiveTags): group label + per-tag remove aria-label (the
      // chip itself already shows the ✕ affordance visually, so the
      // truncated name's `title` fallback carries the plain name, not this
      // action phrase — see sidebar.js). activeTagsMoreAria: the "+N"
      // overflow chip (2-row cap) that expands the strip.
      activeDotsLabel: 'Active layers',
      activeTagRemove: name => `${name} — remove`,
      activeTagsMoreAria: n => `${n} more active layer${n === 1 ? '' : 's'} — show`,
      // Layer tree — FINAL sidebar IA (2026-07-11,  §IA
      // FINALE, user verbatim): 4 fixed groups (World/Monsters/Harvesting/
      // Interactables) replace the 6 groups of chunk (a). groupPoi/
      // groupQuests removed with their groups (rows moved into World/
      // Interactables — see js/sidebar.js). GLOSSARY-PENDING: group titles
      // follow the user's verbatim wording; sweep when the glossary
      // extraction (#86) proves in-game terms.
      groupMonsters: 'Monsters',
      // FLAT root sections Monsters / Creeps / Peaceful fauna (owner reorg
      // 2026-07-15b: the "Creatures" umbrella with nested sub-groups was undone —
      // each becomes its own root section again). groupCreeps follows the
      // shipped campKind ("Creeps"); groupWildlife is the camp:wildlife pool
      // SECTION TITLE — UNIFIED 2026-07-16 onto the SAME term as its row/layer/
      // legend/fiche (wildlifeRestRow "Peaceful animals"): one word everywhere,
      // no more "Peaceful fauna" vs "Peaceful animals".
      groupCreeps: 'Creeps',
      groupWildlife: 'Peaceful animals',
      groupHarvest: 'Harvesting',
      // "Interactive objects" (2026-07-16) — replaces the coined anglicism
      // "Interactables" (RU/UK already said "Interactive objects").
      groupContainers: 'Interactive objects',
      groupWorld: 'World',
      // Sub-group cascade dot (js/sidebar.js buildSubGroup) — root GROUP
      // headers no longer carry one (final correction 2026-07-11: pure
      // fold/unfold containers).
      groupToggleAria: 'Check or uncheck every layer in this group',
      // Sub-group fold chevron (.subgrp-expand button, right side — click
      // zones: dot/label = toggle, chevron = fold only).
      subgroupFoldAria: 'Expand or collapse',
      // Sub-group titles (final IA). GLOSSARY-PENDING (bespoke structural
      // labels). subChests/subDestroyable/subInteractives/subOther are now
      // UNUSED by the tree (flat Interactables, 2026-07-14 — the 4 buckets
      // were removed) but KEPT for i18n parity; subWorldOthers still labels
      // the World › Others sub-group.
      subWorldOthers: 'Others',
      subChests: 'Chests',
      subDestroyable: 'Destroyable',
      subInteractives: 'Interactives',
      subOther: 'Other',
      // Row-label overrides (display only — hash tokens stay camp.<kind>):
      // the honest guards label (2 camps/12 pts, no species/NPC/loot binding
      // at all — see  §5); the honest
      // "unidentified spawns" row for kind camps with NO species binding
      // (its count is exactly what the layer draws, see pointsets.js
      // kindRestPoints (règle rest-only universelle, data-dérivée); now serves ALL THREE Monsters/Creeps/Wildlife root
      // groups symmetrically — the old monsterCampsRow "Monster camps"
      // coarse toggle is retired); and the "(camps)" disambiguation of the
      // the SHORT labels of the spawn rows gathered under the "Spawn zones
      // (camps)" parent (spawnCampsGroup) of the Interactables tree: the parent
      // carries the context, each row just names its type
      // (Corpses/Skeletons/Other/Destroyables/Interactives). GLOSSARY-PENDING.
      guardsRowLabel: 'Guards (unidentified unit)',
      kindRestRow: 'Unidentified spawns',
      // Collapsible parent gathering every dynamic / server-spawn row of the
      // Interactables tree (Option 1 consolidation, 2026-07-15).
      spawnCampsGroup: 'Spawn zones (camps)',
      // Wildlife group only: the generic peaceful/wild fauna pools bind no
      // client-side species (roster resolved server-side) — but the spawn ZONES
      // are real, so this is a first-class « Peaceful animals » layer, not a
      // « missing data » count.
      wildlifeRestRow: 'Peaceful animals',
      // Rows INSIDE the "Spawn zones (camps)" group (the parent carries the
      // context, each row just names its type). searchSpotsRow (old flat label)
      // kept for compat, no longer referenced.
      searchSpotsRow: 'Search spawn zones',
      destroyableCampsRow: 'Destroyables',
      reactiveCampsRow: 'Reactives',
      // Generic `other` bucket when it falls under an interactable category —
      // disambiguated 2026-07-16b: "Misc camps" (distinct from "Untyped search",
      // the residual search-zones ex-"Other" below).
      otherCampsRow: 'Misc camps',
      // Spawn rows TYPED by proven content (2026-07-15, camps.bin
      // `subtype`/`corpseFraction`): the dominant corpse-spawn layer, the
      // rest, and reactive skeleton camps — tinted toward their concept
      // (Corpses mauve / Bone). The spawn "Corpses" here and the "Placed
      // corpses" of decorFamily are the same concept in two honest forms.
      searchSpotsCorpsesRow: 'Corpses',
      // Residual `searchable` bucket — disambiguated 2026-07-16b: "Untyped
      // search" (no longer "Other", which doubled `other`'s "Misc camps" in the
      // same group).
      searchSpotsOtherRow: 'Untyped search',
      skeletonCampsRow: 'Skeletons',
      // Interactables arranged BY OBJECT TYPE (2026-07-15): each type = one
      // entry, its placed+spawn forms unified. CORPSES ▸ (Placed · Spawn zones)
      // and CHESTS ▸ (From camp · Searchable · Legacy) are collapsible parents;
      // child labels are SHORT (the parent carries the context). "Dynamic camps
      // (spawn)" groups the camp spawns not content-split (Untyped search ·
      // Destroyables · Reactives · Misc camps). GLOSSARY-PENDING (structural labels).
      groupCorps: 'Corpses',
      subCorpsPlaces: 'Placed',
      subCorpsSpawn: 'Spawn zones',
      groupCoffres: 'Chests',
      subCoffresCamp: 'From camp',
      subCoffresFouillables: 'Searchable',
      subCoffresHerite: 'Legacy',
      // Renamed 2026-07-16b ("Spawn zones — other (camps)" → "Dynamic camps
      // (spawn)"): the parent is no longer "… other".
      dynamicCampsGroup: 'Dynamic camps (spawn)',
      // Proven pool content (camp popup/fiche).
      campContentLabel: 'Content',
      campCorpsePct: p => `~${p}% corpses`,
      campContentPresetNote: 'Composition proven by the server spawn preset.',
      campContentNameNote: 'Type proven by the zone name.',
      // Quest object → quest(s) it serves (qao popup).
      qaoQuestLabel: 'Quest',
      // Barter cost + item sell value.
      barterCostLabel: 'Barter:',
      barterCostTitle: 'Cost in items (gold suppressed for this stock).',
      itemValueLabel: 'Value',
      itemValueTitle: 'Base sell value.',
      // Efficiency ladder (profession fiche) + recipe gates.
      professionEfficiencyTitle: 'Efficiency',
      professionEfficiencyTier: n => `Tier ${n}`,
      recipeProfLevel: (prof, lv) => `Requires ${prof} Lv ${lv}`,
      recipeProfLevelNoProf: lv => `Requires level ${lv}`,
      recipeRequiresRecipe: names => `Learn first: ${names}`,
      // (pinFiltersTitle removed with the abandoned separate pinned-filters
      // concept -- user decision 2026-07-11, the tree IS the bestiary.)
      trackedTitle: 'Tracked',
      trackedEmptyHint: 'Pin a marker with “Track” to find it here.',
      footerNote: 'Data extracted from the game client · not affiliated with Artificial Core.',
      langSelectorLabel: 'Language',
      panelToggleAriaLabel: 'Show or hide the panel',
      mapAriaLabel: 'World map',
      loadingText: 'Surveying the terrain…',
      zonesLabel: 'Zones (regions)',
      campLoading: 'Loading camps…',
      // Legend/menu counter honesty fix (report: NPC filter showed 11 on
      // Prison Island but only 1 pin ever renders): tooltip on the discreet
      // "+N" badge next to a filter row's main count (js/sidebar.js
      // hiddenBadge) — N real, non-test records with no known position,
      // never pins the map silently fails to draw. Deliberately NEUTRAL
      // ("unknown", not "dynamic"/"server-side spawn"): a `pos_source`
      // classifier proving a record is a genuine server-side spawn exists
      // for only 18 Prison-Island NPCs in the pipeline-side data/quests.json
      // (giver/slot level) and is NOT exposed in any site .bin at all (incl.
      // npcs.bin/quests.bin) — asserting "server-side spawn" for the whole
      // bucket would overclaim for the rest, which is simply unclassified
      // (see   §2 re-check #1).
      filterHiddenTooltip: n => `${n} without a known position`,
      // (decorFamiliesTitle removed 2026-07-11 with the dissolved "Decor"
      // group — its family rows now live inside the Interactables buckets,
      // see js/sidebar.js decorFamsOfCategory (catégorie cuite des records — l’ancienne table DECOR_BUCKET est supprimée, ontology chunk 2). decorGroupLabel below stays: still
      // used by config.js chestKindLabel for fiche/popup kind lines.)
      // "By family" sub-group under Monsters & wildlife (#82 chunk (b),
      // js/sidebar.js buildMonsterFamilyGroup). familyCampsN: honest camp
      // count for a family row -- a family's points are the points of the
      // CAMPS it spawns in (shared with everything else there), never
      // "positions of X" (design §13.1). Family DISPLAY names stay the
      // game's raw family tokens prettified (no localization table exists
      // in the shipped data -- GLOSSARY-PENDING #86, same as the bestiary).
      // (monsterFamiliesTitle "By family" REMOVED 2026-07-11 with the
      // divider bar + [All][None] buttons, judged useless by the user —
      // family rows live directly inside the Monsters root group.)
      // n === 1 (not n > 1): "0 camps" is the honest plural for the 0-camp
      // catalog families the tree now lists (tree-is-bestiary, chunk (d)).
      familyCampsN: n => `${n} camp${n === 1 ? '' : 's'}`,
      // Species tree rows (#82 chunk (d), "the tree IS the bestiary" —
      // js/sidebar.js buildSpeciesSublist). speciesCampsPts: same honest
      // wording as familyCampsN (a species' points are the points of the
      // CAMPS it can spawn in, design §13.1) — `p` arrives pre-formatted
      // (locale digits). speciesZeroCamps: a species/family with no joined
      // camp on the active map stays listed (fiche access), muted.
      speciesCampsPts: (n, p) => `${n} camp${n === 1 ? '' : 's'} · ${p} pts`,
      speciesZeroCamps: '0 camps on this map',
      // Family context of a SEARCH species row (mission "search activation"
      // 2026-07-11, distinct from the bare pretty(family) shown in the
      // tree — here, with no nesting, the word "Family" must be explicit):
      // "Family Wolf" — combined with speciesCampsPts above into one second
      // line ("Family Wolf · 4 camps · 926 pts", see js/search.js
      // buildMonsterSearchIndex `ctx`).
      speciesFamilyOf: fam => `Family ${fam}`,
      // 0-camp wildlife (wildlife_species.bin, job pass 2026-07-11b): GLOBAL
      // wording — these species (turtles/hens/geese…) have camps on NO map,
      // unlike speciesZeroCamps (scoped to the active map).
      wildlifeZeroCamps: '0 known camps',
      famSpeciesToggle: 'Browse this family’s species',
      // #93 — camp fiche: activity + per-mode presence (camp_details
      // `activity`/`modes`, see js/fiches.js campPresenceHtml). SOFT wording
      // required (server registry weight, exact unit unknown — never a
      // guaranteed spawn rate/timer).
      campActivityLine: n => `Activity: ~${n}%`,
      campActivityTitle: 'Server spawn-registry activity weight — exact unit unknown; absent means always active.',
      campModesTitle: 'Presence by game mode',
      campModesHint: 'Server activation weight per game mode — never a spawn guarantee.',
      campModeTier: (m, n) => `${m} · tier ${n}`,
      // ── E′c-4 · roster / density / disposition / mitigation / price band ──
      // Camp roster (camp_details `roster` {state,count}): the honesty summary
      // is the valRosterServerSide Badge; these strings ride in its tooltip.
      campRosterServerNote: 'The exact roster is decided by the server — no member list is stored client-side.',
      campRosterServerCountNote: n => `The exact roster is decided by the server — about ${n} creatures in the pool.`,
      campRosterCandidatesNote: 'The creatures listed are likely candidates — the server decides the actual roster at spawn.',
      // DensityBar (blueprint §3.3): spawn count from the FULL positions cloud
      // (never positions[0]); the bar is relative to the densest camp here.
      spawnDensityLabel: 'Spawn density',
      spawnDensityNote: 'Number of spawn points on the active map, relative to the densest camp here — the count is exact, the bar is relative.',
      // Probable co-spawn (camp_details `cospawnProbable`): a family associated
      // by type, never asserted alongside the placed family (valCospawnProbable).
      cospawnTitle: 'Probable co-spawn',
      // MitigationCurve (blueprint §3.3): damage reduction derived from each
      // difficulty tier’s armour via the client’s single mitigation curve.
      mitigationRowLabel: 'Damage mitigated',
      mitigationNote: 'Fraction of incoming damage absorbed, derived from each tier’s armour via the client’s single mitigation curve (same for armour and magic resist) — computed, not a client reading.',
      // PriceBandRow (blueprint §3.3): vendor buy price as a band when the data
      // carries it; infinity = unlimited stock; chance = restock likelihood.
      priceBandTitle: 'Buy price range (server multiplier band)',
      stockInfinity: 'Unlimited',
      stockInfinityTitle: 'Always in stock — unlimited quantity.',
      stockChance: n => `${n}% in stock`,
      stockChanceTitle: 'Chance this item is offered when the shop restocks — not always available.',
      // ── E′c-4b · camp region / level band · quest series nav ──
      // Camp region (camp_details `zones`/`dominantZone`): assigned by point-in-
      // polygon over the full spawn cloud (derived). dominantZone renders as
      // plain localized text until the region fiche ships (E′c-R).
      campRegionLabel: 'Region',
      campRegionNote: "Regions the camp's spawn cloud covers — assigned by point-in-polygon over the full cloud (derived).",
      campRegionAlsoIn: list => `also in ${list}`,
      // Camp level band (camp_details `tierBand`): the level ranges this camp
      // spans, from the loot-table tier naming (a client fact) + elite flag.
      levelBandLabel: 'Level band',
      levelBandNote: 'Level ranges this camp spans — from the loot-table tier naming (a client fact).',
      tierBandElite: 'Elite',
      tierBandEliteTip: 'This camp includes an elite-tier band.',
      // Quest series nav (blueprint §2.4): prev/next within a quest chain +
      // position. Dormant until `sequence` carries a real chain of quest slugs
      // (today it carries intra-quest goalIds — see fiches/quest.js).
      seriesPositionLabel: (i, n) => `${i} / ${n}`,
      seriesPrevLabel: 'Previous',
      seriesNextLabel: 'Next',
      seriesGraphTip: 'Position in the quest chain (from the quest graph).',
      seriesListedTip: 'Grouped by declaration order — a looser association than the quest graph.',
      // Enriched POIs (pipeline pass 2026-07-11b): encyclopedia fiche button
      // + divergent lore title (locTitle).
      poiLoreBtn: 'Encyclopedia',
      poiLoreNamed: t => `In the encyclopedia: “${t}”`,
      // Compact "Show [entity] · N pts" affordance (wording uniformization
      // 2026-07-11 — replaces the verbose "Highlight all spawns in these
      // camps (N camps · M points)"; the word "camps" is banned from
      // quest/step/fiche wording; see js/fiches.js monsterSpawnHighlightBtn).
      entityPtsN: p => `${p} pts`,
      // (chestTypesAllBtn/chestTypesNoneBtn REMOVED 2026-07-11 with the
      // family list's [All][None] bar — no caller left.)
      // Container re-categorization (): the 2 real chest
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
      loreEntryTitle: 'Bestiary',
      lootTableKind: 'Loot table',
      priceTitle: 'Price',
      stockFilterPlaceholder: 'Filter list…',
      rewardTablesN: n => `Reward tables (${n})`,
      questCountSuffix: n => ` · ${n} quest${n > 1 ? 's' : ''}`,
      dataGeneratedAt: date => `Data from ${date}`,
      questMapsLine: names => `Maps: ${names}`,
      // bestiaryTitle/bestiaryLoading retired (2026-07-11) with the sidebar
      // "Bestiary" section itself (see js/sidebar.js) -- bestiaryZonesN
      // stays: still used by fiches.js openMonsterFiche (monster fiche's lore
      // section), unrelated to this retired section.
      monsterFoundInTitle: 'Found in',
      lootTableItemsN: n => `Contents (${n})`,
      probableLootTitle: 'Likely loot',
      probableLootNote: name => `"${name}" table matched by container type — confirm in game.`,
      campLabel: 'Camp',
      pointsHereSuffix: n => ` · ${n} points here`,
      spawnsTotal: n => `${n} total spawns`,
      levelAbbrev: lvl => `lvl ${lvl}`,
      // Level RANGE (task #80 — bestiary species rows/camp fauna rows, e.g.
      // a species spanning lvl 5-20, or a camp's own level span for one
      // species): same abbreviation family as levelAbbrev above.
      levelRangeAbbrev: (min, max) => `lvl ${min}–${max}`,
      spawnPointsCount: n => `${n} spawn points`,
      likelyMonsters: n => `Likely monsters (${n})`,
      guaranteedLabel: 'Guaranteed',
      // Approximate SHARE (d.ch = weight / the table's total weight, see
      //  "chance") of a non-guaranteed drop + honest caveat set
      // as a tooltip (title) on the pill -- see js/fiches.js dropRateHtml.
      lootBestRates: 'Loot (best rates)',
      mapSelectorLabel: 'Displayed map',
      mapBadgeTitle: name => `On ${name} — click to switch`,
      mapTilesOnlySuffix: '(approx.)',
      mapGroupWorld: 'World',
      mapGroupExtraction: 'Extraction',
      mapGroupBattleground: 'Battlegrounds',
      mapGroupPve: 'PvE arenas',
      mapGroupPvp: 'PvP arenas',
      mapGroupOther: 'Other',
      // "position unknown" banned site-wide (see  "search_zone"):
      // this generic label stays only for non-goal rows (NPC/object/merchant
      // with no extracted position) — quest goals themselves use
      // posDynamic/posDynamicZone/posUncatalogued below, never this one.
      posUnknown: 'position not specified',
      // Kept short (was "Dynamic position — spawn zone"): this label sits on
      // the same row as a "View zone" button inside a quest-item fiche, and
      // the long form pushed the button off the right edge (overflow fix E).
      // Confidence "medium" (batch-wiring pass, proximity-only guess, see
      //  zone_confidence): distinct wording from posDynamicZone
      // above — a nearby camp cluster is not proof this item actually spawns
      // there, never presented with the same authority as an evidence-backed
      // zone.
      // Sub-label for a search result row for an entire QUEST with no
      // extracted position (giver/actors all lack x/z — e.g. the Prison
      // Island quests, on a separate map/coordinate frame). Honest and
      // distinct from posUnknown (reserved for non-quest rows): just says
      // there's no point to show, no broken map button — the fiche still
      // opens normally on click.
      questNoPos: 'No point on the map',
      vendorStockTitle: 'Vendor stock',
      vendorStockTitleN: n => `Vendor stock (${n})`,
      noVendorItems: 'No known items for this vendor.',
      npcCat: 'NPC',
      // Canonical term is "Vendor" (⚑ game word) — "Merchant" retired site-wide
      // (blueprint §4.1/§4.2: vendorSuffix/noVendorItems/moreMerchants/
      // merchantPosUnknown unified onto Vendor, matching vendorStockTitle).
      vendorSuffix: ' · Vendor',
      questsGivenN: n => `Quests given (${n})`,
      noQuestsForNpc: 'No known quests for this NPC.',
      questItemBadge: 'Quest item',
      soldTag: 'sold',
      craftableTag: 'craftable',
      lootTag: 'loot',
      // "Container" badge (mechanism decode job A): collect_from_object's
      // own object identity (t.label, e.g. "Old crate") — distinct from
      // activableBadge above, which is for USE_object's self-contained
      // "Activatable" prop, not a container something else is found in.
      // Goal-target card relation wording (design review, July 2026): the
      // card used to just juxtapose an item and its monster/object with no
      // word connecting them ("looks like a tag but doesn't say where to
      // get the brain"). These two short phrases are the explicit relation
      // -- never interpolated with the name (the name/level render as their
      // own separate clickable spans right after, see goalTargetChip).
      goalDroppedByLabel: 'dropped by',
      goalObtainedHereLabel: 'obtained here',
      // collect_from_object's container-specific counterpart to
      // goalObtainedHereLabel above (mechanism decode job A): used only when
      // the container's own label is known (t.label) — verb only, the name
      // renders as its own separate span right after, same pattern as
      // goalDroppedByLabel/nameSpan.
      goalFoundInLabel: 'found in',
      // Same relation-row vocabulary, batch-wiring pass: a quest-granted item
      // (given_by_giver, e.g. eight_legged_freaks' "Time of Death") and a
      // craft-only item (craft:true, e.g. construction_lesson's implant) —
      // neither is ever a world spawn, so neither ever gets a position/zone.
      goalGivenByLabel: 'given by',
      goalCraftLabel: 'craft it',
      // Label of a goal's estimated search-area reference (dynamicPosBadge):
      // the drawable zone is a best-effort cluster, never a confirmed spawn —
      // the reference always carries this explicit wording (or the real
      // region name when the zone IS a named region), never an empty tag.
      goalSearchZoneLabel: 'Estimated area',
      // Precise container placements (search_zone.basis === "chest_placement"):
      // the goal carries the REAL positions of the searchable containers
      // (target.placements). The drawable chip's own label states the honest
      // precision — "N locations" (never "Estimated area") — and its dot draws
      // those exact points (campTrace). N = count of container spots.
      goalLocationsN: n => `${n} locations`,
      // Safety cap on the DRAWN points (GOAL_PLACEMENT_CAP): honest "showing N of
      // M" if a placement set ever exceeds the cap (current cases ≤ 44).
      goalPlacementsCapped: (shown, total) => `showing ${shown} of ${total}`,
      // receive_reward mechanism (mechanism decode job A): the item is
      // granted by completing a DIFFERENT quest ('s reward_of), not
      // handed over by this quest's own giver — verb only, one clickable
      // quest-name span per reward_of entry follows (see rewardOfRelRow).
      goalRewardOfLabel: 'obtained by completing',
      // harvest mechanism: a resource-gathering node (logging/herbalism/
      // mining — target.profession, localized via professionLabel).
      goalHarvestLabel: profession => `harvest (${profession})`,
      // harvest goal targets whose accepted node TYPES are byte-proven (#81,
      // target.node_types -- 11 goals) -- rendered as a node-chip ladder
      // under the objective, never a map layer (no node-type -> point
      // binding exists client-side, see data.js S.nodes doc).
      goalAcceptedNodesLabel: 'Accepted nodes:',
      // Quest corpse/container target extras (owner rework 2026-07-16b,
      // stepguide.js goalCorpseExtras) — DROPDOWN-FREE, at most TWO rows, keyed
      // off the data's own signals (never a hardcoded quest):
      //   1. Placed corpses (goalPlacedCorpsesTag / goalPlacementsTag) — badge(official):
      //      the EXACT placements ONLY, honest name (never the over-claimed target);
      //   2. Hint 💡 — the standard [Corpses(●)] ref (refKind.corpse), a REAL
      //      toggle of the "Corpses" layers; label goalHintZonesTag, the nuance
      //      (goalHintZonesNote) in a tooltip. The 💡 is its mark, not a sentence.
      goalSpawnPoolLabel: (name, n) => `Spawn zone — ${name} (${n} pts)`,
      goalCorpsePlacedN: n => `${n} placed corpses`,
      // HONEST labels for the official tier (exact placements ONLY): "Placed
      // corpses" when the goal accepts corpse types, else "Locations".
      goalPlacedCorpsesTag: 'Placed corpses',
      goalPlacementsTag: 'Locations',
      // Label of the [Corpses(●)] hint ref — no trailing "corpse" (the bubble
      // already carries the "Corpses" kind): the ref reads `[Corpses(●)] Spawn zones`.
      goalHintZonesTag: 'Spawn zones',
      goalHintZonesNote: 'Any corpse of these types counts, anywhere on the map.',
      // kill_collect/kill mechanism: target.drop_chance (0-100, byte-exact),
      // shown next to the dropped-by name+level — distinct from the generic
      // loot-table dropChanceApprox (that one is a computed weight SHARE,
      // this one is the game's own designed percentage, never "≈").
      goalDropChanceLabel: pct => `(${pct} %)`,
      // kill_player mechanism: target.player_specs joined via heroSpecLabel
      // (fiches.js) — no single world location for a PvP objective.
      objectivesN: n => `Objectives (${n})`,
      objectivesTitle: 'Objectives',
      howToTitle: 'How to',
      rewardsTitle: 'Rewards',
      questItemsN: n => `Quest items (${n})`,
      viewZoneBtn: 'View zone',
      // "medium" confidence counterpart (batch-wiring pass, see posEstimatedZone
      // above): draws the cited camp's real points when the active map has
      // them loaded, else falls back to the same guessed circle as viewZoneBtn
      // — never the same label, so it's never mistaken for a confirmed zone.
      // Layout rework (July 2026): now a collapsed-by-default drawer (see
      // openQuestFiche) — count in the label like the other drawers
      // (dialogsN/questItemsN) since it's no longer an always-open <h3>.
      onMapTitleN: n => `On the map (${n})`,
      dialogsN: n => `Dialogue (${n})`,
      // Header-area trust badge (layout rework, July 2026): `q.explained`
      // {goals_total, goals_resolved} comes straight from the quest-graph
      // decoder — 333/335 decoded quests are fully explained today, 2 keep
      // at least one unresolved goal. Never shown when there's no goal graph
      // at all (dialogue barks etc.) — nothing to confirm either way there.
      // Dialogue-bark "quest" (hello_*/info_* NPC greeting graph, isDialogue —
      // no goals/rewards): its fiche is headed with this instead of the empty
      // quest layout, so opening one (dev-content ON, or a direct q= link) is
      // never a blank quest sheet.
      dialogueFicheKind: 'NPC dialogue',
      dialogueHeading: 'NPC dialogue (not a quest)',
      dialogueNote: 'Idle greeting lines this character says — not a quest with objectives or rewards.',
      interactionFicheKind: 'NPC interaction',
      interactionHeading: 'Interaction — not an objective quest',
      interactionNote: 'This character offers a dialogue-driven service (the game data defines no objectives for this entry).',
      devBarksGivenN: n => `Revealed dialogues — dev content (${n})`,
      // Journal now renders as a plain presentation paragraph right under the
      // title (layout rework, July 2026) — no more section heading (same
      // choice as the item description, see descHtml). Only shown when the
      // text is long enough to actually need the CSS clamp+expand toggle.
      journalShowMoreBtn: 'Show more',
      journalShowLessBtn: 'Show less',
      relatedQuestsTitle: 'Related quests',
      questFicheKind: region => 'Quest' + (region ? ` · ${region}` : ''),
      dropRatesTitle: 'Drop rates',
      farmSpotsTitle: 'How to farm',
      // Farm-spot redesign (, July 2026): rows grouped
      // by camp kind (Mining/Monsters/…) instead of a flat 24-row dump —
      // header summary, "+N more" expander, and the honest fallbacks below
      // (unjoined camp, no camp data at all, generic reward-pool collapse).
      // MINIMAL counts (wording uniformization 2026-07-11: "926 pts" yes,
      // "4 camps" no — the word "camps" is banned from fiche wording; the
      // historical first param (camps) is ignored, signature kept).
      farmGroupSummary: (camps, pts) => `${pts} pts`,
      farmMoreCampsN: n => `+ ${n} more`,
      farmGenericPoolNote: n => `Also a rare drop from ${n} generic reward camps — not a targeted farm spot.`,
      farmSourcesNotMapped: 'Sources not mapped to a known camp yet.',
      farmOtherSourcesTitle: 'Other sources',
      // "Also found in containers" (#65): an item/recipe's containers[]
      // aggregated per class (camp_chest by monster family, searchable_chest
      // by rarity band) -- `ch` is already the BEST chance across every
      // grade/band variant folded into that class (see ).
      containersTitle: 'Also found in containers',
      containerCampChestHint: 'Spawned per monster family by the server — no single placement to point at on the map.',
      containerChanceUpTo: pct => `up to ${pct} %`,
      containerChanceBelowOne: 'up to < 1 %',
      soldByTitle: 'Sold by',
      // Quest-scripted-only obtain fallback (quest-guide-feature plan sec
      // 5.2/6.3): shown ONLY when an item has no generic recipe/drop/vendor
      // path at all (the dominant case for a genuine quest item) -- the
      // quest goal that actually resolved this item is the only true source.
      obtainDuringQuestTitle: 'How to obtain',
      // EntityRef wave 2: verb-only PREFIXES — the target now renders as its
      // own `[Species(●)]`/`[Object]` ref right after (owner: "By killing
      // [Monster(●)] Imp Witch"), never interpolated into the sentence.
      obtainViaKill: 'By killing',
      obtainViaInteract: 'By interacting with',
      // Mechanism decode job B: quest_source_of extension (harvest/reward_of/
      // world -- given_by reuses ui.givenByPlain, container reuses
      // obtainViaInteract above, see  + fiches.js openItemFiche).
      obtainViaHarvest: profession => `By harvesting (${profession})`,
      // Fragment, not a full sentence -- composed with ui.givenByPlain as
      // "Given by X — quest Y" (receive_reward's cross-quest case, see
      // openItemFiche's qs.via === 'reward_of' branch).
      obtainViaWorld: 'Found while completing this quest',
      // Honest obtain-status line (items-obtain audit §B2): shown when an
      // item ships NO obtain channel at all — one explicit line instead of
      // silent blank space. Wording states what the DATA does or doesn't
      // say, never "unobtainable" (a claim about the game we can't prove).
      // Enum baked by , mapped in
      // fiches.js openItemFiche (OBTAIN_STATUS_KEY).
      obtainStatusUnknown: 'Not referenced as obtainable in the current game data.',
      obtainStatusQuestOrphan: 'Quest item — no quest in the current game data references it (likely unused or removed content).',
      obtainStatusCosmetic: 'Appearance/skin asset — not referenced as obtainable in the current game data.',
      obtainStatusLobby: 'Arena-lobby equipment — not referenced as obtainable outside arena matches.',
      obtainStatusInternal: 'Internal game record (effect/ability data) — not a player-obtainable item.',
      // Quest shells (questStatus, closed enum stamped by the pipeline on
      // zero-goal quest records — extraction markers / dev shells / no
      // decoded objectives): same register as obtainStatus above — states
      // what the DATA defines, never lore, never "broken quest". Mapped in
      // fiches.js openQuestFiche (QUEST_STATUS_KEY).
      questStatusExtractionMarker: 'Engine marker (extraction/zone transition) — not a playable quest: the game data defines no objectives for it.',
      questStatusDevShell: 'Development shell — an internal/test quest record with no objectives in the current game data.',
      questStatusNoObjectives: 'No objectives are defined for this quest in the current game data.',
      // "Internal" badge (items-obtain audit §B3): pseudo-item records
      // (ability/effect payloads) display-gated like dev content, still
      // openable through their joins — the badge says what it is.
      internalBadge: 'Internal',
      internalBadgeTitle: 'Technical game record (effect/ability/talent data) the game ships but players never hold as an item.',
      moreMerchants: n => `+ ${n} more vendors`,
      merchantPosUnknown: 'Vendor position not specified.',
      recipeTitle: 'Recipe',
      producesArrow: 'produces → ',
      // Prominent recipe chip on a craftable item's own fiche (task #78b) +
      // recipe search result / fiche kind label (task #78a) -- see
      // openItemFiche's recipeChipHtml / search.js buildSearch / openRecipeFiche.
      usedInTitle: 'Used in',
      rewardBadge: 'Reward',
      requiredBadge: 'Required',
      locatorTitle: 'Marker',
      // User flag (#84, right-click on the map) -- deliberately NOT "pin":
      // distinct from the future sidebar "pinned filter" (#82, pin glyph)
      // and from locatorTitle above (the goto reticle). See pins.js.
      userFlagTitle: 'Flag',
      clearAllFlagsBtn: 'Clear all flags',
      // Bloc "My flags" injecté dans la section Suivi (sidebar.js
      // renderUserPins, 2026-07-11c) -- même vocabulaire "flag", jamais "pin".
      userFlagsBlockTitle: 'My flags',
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
      // (monsterHighlightAllSpawns REMOVED 2026-07-11, wording
      // uniformization: replaced by showEntityBtn/entityPtsN — "Show
      // [species] · N pts", see js/fiches.js monsterSpawnHighlightBtn.)
      noLootCatalogued: 'No catalogued loot for this monster.',
      noAbilitiesKnown: 'No known abilities for this monster.',
      noCampsKnown: 'No known spawn location for this monster.',
      // Camp fiche fauna section ( #4/#10, task #67):
      // a "monster-ish" camp (monsters/creeps/wildlife kind) whose manager
      // name yields zero resolved species — byte-proven the camp's own spawn
      // points carry no entity reference at all ( "camp fauna"),
      // 43/128 such camps today. Used to render nothing at all (silent gap,
      // see openCampFiche); now an honest dynamic-state note instead.
      campFaunaUnknownNote: "This camp's specific creatures aren't recorded in the client data — spawned dynamically by the server.",
      // Monster fiche "Quest items" section (monster<->quest-item link
      // follow-up, task 1/4): lists questDrops[] baked at build time --
      // ONLY resolver-produced kill links, section omitted entirely when
      // empty (never an empty fabricated block).
      monsterQuestItemsTitle: 'Quest items',
      familyMonstersTitle: n => `Monsters of this family (${n})`,
      // Monster FAMILY fiche (#82 chunk (e), fiches.js openFamilyFiche): a
      // right-drawer page for a monster family (Wolf/Imp/Spider…) — its member
      // species, level span, and the quests that target the whole group.
      // Family NAMES themselves are raw game tokens (GLOSSARY-PENDING #86,
      // pretty()'d), never translated; only this chrome is localized.
      familyFicheKind: 'Monster family',
      familyMembersTitle: n => `Species (${n})`,
      familyQuestsN: n => `Quests for this family (${n})`,
      // Family fiche = THE bestiary page (tree Option A+, 2026-07-14):
      // subRole sections (official client tags — raw tokens prettified,
      // never an invented translation) + an "other members" bucket for mixed
      // families + the official-tags provenance note; familyTypesTitle
      // tooltips the per-member types/colors line.
      familyMembersOther: n => `Other members (${n})`,
      familyOfficialTagsNote: 'Official client tag (Boss/Servant/Witch…) — read as-is from the game data, never invented.',
      familyTypesTitle: 'Official types/skins and colors of this species (client tags; colors correlate with spawn level).',
      // Wildlife-species fiche (wildlife_species.bin, fiches.js
      // openWildlifeFiche): a real page for a peaceful animal — name + family +
      // butchering method + its loot. "Where to find" is HONEST: a camp-bound
      // species (turkey/rabbit/…) uses its header species dot; a 0-camp species
      // (turtles/cow/…) has NO precise per-species pin, only the generic
      // « Peaceful animals » pool — offered as a toggle, never claiming a
      // specific point IS that animal.
      wildlifeFicheKind: 'Wildlife',
      wildlifeVariants: list => `Variants: ${list}`,
      wildlifeLootSharedNote: 'Shared family loot: these drops are bound to the whole species family, not this exact species — every member of the family yields the same table.',
      wildlifeWhereTitle: 'Where to find',
      wildlifeCampedNote: (n, p) => `Spawns in ${n} camp${n === 1 ? '' : 's'} (${p} points on this map) — use the dot next to the title to show them.`,
      wildlifePeacefulNote: 'No per-species position is known — this species spawns among the peaceful animals. Show those spawn zones:',
      wildlifeNoZonesNote: 'No known spawn zones on this map.',
      abilityLabel: 'Ability',
      // EntityRef (◇, js/mapref.js — wave 0): a11y/title phrases of the two
      // hit targets — the tag/dot ("show/hide on map", aria-pressed toggle)
      // and the underlined name ("open the fiche"). See
      //  §1.3.
      refDrawShow: name => `Show ${name} on map`,
      refDrawHide: name => `Hide ${name} from map`,
      refOpenLabel: name => `Open ${name}`,
      harvestTitle: 'Harvesting',
      noHarvestCatalogued: 'No catalogued harvest loot for this monster.',
      // Gathering-node reference fiche (#81, site/data/<lang>/nodes.bin) --
      // name + tier + profession + its own harvest drop rows (lootRowsHtml).
      nodeFicheKind: 'Gathering node',
      // Node-tier badge tooltip (Lot 1, config.js nodeTierBadge): the T1-T3
      // gathering tier promoted from plain subtitle text to a coloured chip.
      nodeTierTip: t => `Gathering tier ${t}`,
      // generic:true (9/30 node types): no in-game localization exists for
      // this internal record anywhere in the client -- state-chip-style
      // note, never a fabricated display name.
      nodeGenericNote: 'Internal name — no in-game localization exists for this node type.',
      harvestedOnTitle: 'Harvested from',
      // ── E′c-5 · obtain block + chest timers + node aliases ──────────────
      // Item obtain DROP section (item.js obtainDropRows): the loot tables an
      // item appears in, each carrying the closed weight-share Badge — NOT a
      // "% chance" (the true per-roll chance is server-side, SCHEMA §0.3).
      obtainDropsTitle: 'Drops',
      // Chest TimerRow (world.js chestTimersHtml, chests.bin objectStats):
      // interaction timings — only meaningful values shown; a 0 / missing
      // field renders as honest absence, never a fabricated "0".
      chestTimersTitle: 'Interaction',
      chestRegenLabel: 'Loot respawns',
      chestPickupRadiusLabel: 'Pickup radius',
      chestBreakTimeLabel: 'Time to break',
      chestKarmaLabel: 'On opening',
      chestKarmaYes: 'Grants karma',
      chestTimersAbsentNote: 'No interaction timing is recorded in the client data for this chest.',
      unitMinutesApprox: n => `~${n} min`,
      unitSeconds: n => `${n} s`,
      unitMeters: n => `${n} m`,
      // Gathering-node internal aliases (nodes.bin `aliases`, generic node
      // types): the harvest-node keys, prettified — the only identifiers for a
      // node type with no in-game localization.
      nodeAliasesLabel: names => `Also known as: ${names}`,
      statsTitle: 'Stats',
      // "real" badge tooltip ( finding #1): explicitly distinguish
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
      bossHpBadge: 'boss',
      bossBaseHpLabel: 'Base HP',
      bossLiveHpLabel: 'Live HP (est.)',
      bossDifficultyNote: "This boss has its own base HP (from the game data). Live HP = base × a server-side difficulty multiplier — about 9–10× at level 20 (e.g. a dungeon boss ≈ 226,000). The exact multiplier is assigned server-side, so this is an estimate, never an exact live total.",
      computedStatsBadge: 'computed (game formula)',
      statsPerTierNote: 'Difficulty tier assigned server-side — range shown per tier (easy → boss).',
      // Honest caveat on the Elite/Boss columns ( finding #2):
      // unlike easy/medium/hard, these 2 tiers were NEVER checked against an
      // external source — the community's "~350,000 HP" level-20 boss figure
      // doesn't reproduce from any client data, and a real named boss can run
      // far above this generic range (see the "real" badge when available).
      statsBossEliteCaveat: '"Elite"/"Boss" columns: generic estimated values, not confirmed in-game — some real named bosses are far tougher (see the "real" badge when a dedicated record exists for that monster).',
      // (bestiaryMapFilterLabel/bestiaryMapEmpty retired 2026-07-11 with the
      // sidebar "Bestiary" section -- see bestiaryZonesN above.)
      alwaysGrantedTitle: 'Always granted',
      choiceGroupTitle: n => `Choice ${n}`,
      orWord: ' or ',
      xpAbbrev: n => `${n} XP`,
      weaponXpAbbrev: n => `${n} weapon XP`,
      goldAbbrev: n => `${n} gold`,
      // Rarity selector (same-name variants, see js/rarity.js) + grouped-
      // result search hint "N rarities".
      rarityVariantsLabel: 'Rarity',
      rarityVariantsCount: n => `${n} rarities`,
      // Monster level/variant selector (task #80 — a species groups all its
      // levels/reskins together, see js/fiches.js speciesVariantSpawns) +
      // grouped-result search hint "N variants", same idiom as
      // rarityVariantsCount above.
      monsterVariantsLabel: 'Level',
      monsterVariantsCount: n => `${n} variants`,
      // Raw cosmetic key count folded into ONE (name,level) group (task #80
      // polish — used to ride inline in the fiche's kind line via
      // variantsNote above; moved to its own muted provenance line under the
      // variant selector, since it's a technical fold count, not a gameplay
      // fact).
      rawRecordsNote: n => `${n} raw records`,
      // Dev/test content (feature #13, isTest:true hidden by default): reveal
      // tag at the bottom of the panel + badge shown wherever revealed
      // content is displayed (fiche, variant pill, bestiary, search).
      devContentTag: n => `Dev content (${n})`,
      devBadge: 'Test',
      // "We don't know" 3-state taxonomy (, task #67):
      // one shared `.state-chip` component + short vocabulary for every "why
      // don't we know this" spot on the site (position, loot, vendor stock,
      // rarity/tier scaling, unresolved quest-goal residuals…) instead of the
      // ~6 independent bespoke idioms that already existed. "dev" reuses
      // devBadge above as its label (this key only adds the missing tooltip)
      // — dynamic/unknown are the two genuinely new labels. See stateChip()
      // in js/fiches.js.
      devBadgeTitle: 'Unfinished or test content the game ships but never uses.',
      stateUnknownTitle: "Can't be determined from the extracted client data.",
      // 4th state (task #80, monsterStatsSection): a REAL client stat block
      // (m_abs_* fixed-stat sibling record) shared across every level of a
      // demoted group — never the mob's OWN reading, never the "real" badge
      // above, but still real bytes, unlike the generic per-tier estimate.
      stateFixed: 'fixed reading',
      stateFixedTitle: 'Fixed reading (arena/CBT) — level-independent, not proven in-game.',
      // Collapsible provenance line under the per-tier range (formula_range +
      // statsFixedReading, task #80): summary shows the one number that says
      // the most (health), detail shows the source template + level span it
      // covers. Never displayed as this mob's OWN stats.
      statsFixedProvenanceLine: (label, value) => `Fixed reading: ${label} ${value} — not correlated with level`,
      statsFixedProvenanceDetail: (src, cbt, lvlText) => `Source: ${src}${cbt ? ' (CBT)' : ''} · levels ${lvlText}`,
      // Roll ranges / weapon DPS / formulas / rune-chip scaling
      // (stat_ranges, weapon_dps, artifact_formula/formula, rarity_scaling,
      // tier_scaling) -- net-new, see 
      // + , tmp/convergence/ #8/#9/#10.
      rollRangeTitle: 'Roll range',
      weaponDpsTitle: 'Weapon DPS',
      weaponDpsDerived: 'DPS (computed)',
      // Main/secondary grouping (data-accuracy audit,  #1): an
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
      // Reworded ( §2 re-check #2, task #67): the old
      // "(likely handled server-side)" phrasing asserted a specific, UNPROVEN
      // cause —  itself can't tell whether this is server-side
      // scaling or a different in-game rule (e.g. a talent-slot-count rule).
      // Neutral now, and wrapped in an `unknown` state-chip by its caller
      // (formulaHtml) instead of the old bare `.hint` paragraph.
      scalingServerSide: "Doesn't vary with rarity in the client data, for a reason that can't be pinned down from what's extracted.",
      scalingNotLocated: 'Scaling not located in the client data.',
      tierNotRarity: 'Scales by TIER, not by rarity.',
      // Rune 0x62-table scaling (base + overclocked) + artifact roll-quality
      // prefixes --  (item hard-numbers pass).
      overclockScalingTitle: 'Overclocked scaling',
      overclockNote: 'Enhanced (overclocked) magnitudes, per rune rarity.',
      overclockServerSide: "This rune has an overclocked variant, but its magnitude isn't stored client-side — it can't be shown as an exact number.",
      abilityRarityScalingTitle: 'Scaling by rarity',
      rollQualityTitle: 'Roll quality',
      rollQualityIntro: 'A higher roll earns a name prefix: a stat rolling in the 33–66% band of its range makes the artifact “Improved” (Tech) / “Strong” (Magic); above 66%, “Reinforced” / “Powerful”.',
      rollQualityBand3366: 'Improved / Strong (33–66%)',
      rollQualityBandMore66: 'Reinforced / Powerful (>66%)',
      // "Use effect" section ( Phase B): a linked ability's
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
      // Rune/chip effect lines (effect-lines pass, 2026-07-11): the item's
      // real effect sentence(s) for the base / upgraded / overclocked
      // variants (byte-proven 0x4b68 variant joins) and chip talent tiers.
      // A per-rarity token renders the decoded 4-tuple inline, never one
      // invented number; a variant whose magnitudes live server-side says
      // so explicitly (same honesty family as overclockServerSide).
      effectLinesTitle: 'Effect & variants',
      enhancementEffectTitle: 'Enhancement effect',
      variantBase: 'Base',
      variantUpgraded: 'Upgraded',
      variantOverclocked: 'Overclocked',
      variantTierT1: 'Tier T1',
      variantTierT2: 'Tier T2',
      variantTierT3: 'Tier T3',
      variantServerSide: 'This variant exists in the game data, but its magnitudes are stored server-side — no exact numbers can be shown.',
      effectVarPerRarityTooltip: 'Decoded value per rarity (Common / Uncommon / Rare / Epic)',
      // ── Canonical vocabulary (blueprint §4 — SCAFFOLDING E′c-0) ───────────
      // NEW keys the later waves consume; call-sites are NOT rewired here.
      // These resolve §4.1's collisions (region≠zone-confidence, loot-camp off
      // "searchable", quest-prop≠quest-item, decor-type≠family, lore≠place,
      // reactive-object, "area" never "zone"). ◇ = ours-by-necessity (no game
      // term) — do NOT "correct" toward a nonexistent game word.
      regionFicheKind: 'Region',
      // ── Region fiche ContentsBlock (vague E'c-R) — section titles + honest
      // counts. regionObj* = the object families of objects.byFamily. ─────────
      regionCampsTitle: 'Camps',
      regionCampsCount: n => `${n} camp${n > 1 ? 's' : ''} catalogued here`,
      regionMonstersTitle: 'Monsters',
      regionWildlifeTitle: 'Wildlife',
      regionObjectsTitle: 'Objects',
      regionObjectsCount: n => `${n} object${n > 1 ? 's' : ''} placed here`,
      regionQuestsTitle: 'Quests',
      regionGiversTitle: 'Quest givers here',
      regionGoalsHere: n => `${n} quest${n > 1 ? 's' : ''} have an objective in this region`,
      regionUnresolvedN: n => `+${n} more, species not identified`,
      regionProbableTitle: 'Probable co-spawn',
      // Distinctive high-level families (Lot 3, zone.js): the useful zone signal
      // is family↔region affinity — a few families (golem, dendroids) carry only
      // 16-20 loot bands and thus sit only in specific regions. Shown instead of
      // the flat, near-uniform derived levelRange. Derived badge: the band is
      // official (loot-table naming), the "distinctive here" affinity is ours.
      regionDistinctFamTitle: 'Distinctive families (high level)',
      regionDistinctFamHint: 'Families placed here that only appear in high-level (16-20) bands.',
      regionDistinctFamDerivedNote: 'The loot band is official; the region affinity is derived from camp placement × band.',
      regionNone: 'None catalogued here.',
      regionEmpty: 'Nothing catalogued in this region yet.',
      regionObjChest: 'Chests',
      regionObjCraftBench: 'Craft benches',
      regionObjQuestObject: 'Quest objects',
      regionObjReactive: 'Interactives',
      regionObjShrine: 'Shrines',
      regionObjDestroyable: 'Destroyables',
      regionObjUnresolved: 'Other objects',
      // Build fiches (opt L3, blueprint §1.2/§7 E'c-8 — talent/specialization/
      // profession, search+fiche only, no map surface, see fiches/build.js).
      talentFicheKind: 'Talent',
      specFicheKind: 'Specialization',
      professionFicheKind: 'Profession',
      professionTiersTitle: 'Tiers',
      professionItemsTitle: n => `Items (${n})`,
    },
    cat: {
      npc: 'NPCs', poi: 'Points of interest', quest: 'Quests',
      qao: 'Quest objects', workshop: 'Workshops',
      // Container re-categorization: the old single "Chests" layer (chest)
      // is removed, replaced by these 2 real layers — see
      //  §1/§3.1 and js/config.js CATS.
      searchable_chest: 'Searchable chests', camp_chest: 'Camp chests',
    },
    rarity: { Common: 'Common', Uncommon: 'Uncommon', Rare: 'Rare', Epic: 'Epic', Legendary: 'Legendary' },
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
      workshop: 'Workshop', camp: 'Camp', item: 'Item', recipe: 'Recipe',
      monster: 'Monster', zone: 'Region', location: 'Place',
      ability: 'Ability', event: 'Event', chest: 'Chest',
      searchable_chest: 'Searchable chest', node: 'Gathering node',
      // FAMILY row (mission "search activation" 2026-07-11): NOT a precise
      // monster — a tree filter (rung 2 of the precision ladder,
      // ). Visually distinguishes the "Family Wolf" row
      // (chip "Family" + label "Wolf") from a species "Monster" row (chip
      // "Monster" + label "Wolf Alpha").
      family: 'Family',
      // Build (E'c-8, opt L3): talent/spec/profession search rows.
      talent: 'Talent', specialization: 'Specialization', profession: 'Profession',
    },
    // EntityRef (◇) kind words that no searchCat key already covers (loot
    // table / bare position / PvP players). Singular only — these kinds are
    // never a category (all-vs-one), so no plural form. See js/mapref.js.
    refKind: {
      loot: 'Loot table', position: 'Position', players: 'Players',
      // The tree's "Corpses" group (a goal corpse-search hint) — same word as
      // groupCorps; tint supplied by the caller (DECOR_HEX.corpse).
      corpse: 'Corpses',
    },
    // EntityRef degraded generic labels (spec §6.3) — the CLOSED set shown
    // when the backing entity is display-gated: never the internal key, never
    // invented lore. The kind tag still names the honest kind.
    refGeneric: {
      position: 'Quest position', object: 'Quest object',
      area: 'Quest area', target: 'Objective target',
    },
    // Talent taxonomy (E'c-8, blueprint §1.2 opt L3) — talents.bin `system`/
    // `subtype` tokens (5 + 9 values, the REAL shape shipped — no separate
    // level/tree-position field exists, see fiches/build.js doc). Closed
    // vocabulary, tbl('talentSystem'|'talentSubtype', token).
    talentSystem: {
      unclassified: 'Unclassified', class_spec: 'Class specialization',
      weapon_mastery: 'Weapon mastery', universal: 'Universal',
      artifact_chip: 'Artifact chip',
    },
    talentSubtype: {
      ui_or_misc: 'UI / misc', grid_transition: 'Grid node', ability: 'Ability',
      ability_variant: 'Ability variant', base: 'Base', proc: 'Proc',
      artifact: 'Artifact', other: 'Other', chip: 'Chip',
    },
    // ── Honesty Badge — the ONE closed vocabulary (blueprint §5.2) ──────────
    // SCAFFOLDING E′c-0: the closed Badge enum on 3 orthogonal axes
    // (provenance × precision × content) + 3 typed value-renders. Later waves
    // (E′c-1 Badge primitive) fold .state-chip / pos-ladder / .stats-badge /
    // .effect-var-* onto these keys; prose lives in the *Tip tooltips (no free
    // hedging prose ships outside this set). tbl('badge', <key>).
    badge: {
      // Provenance axis — where a fact comes from
      provOfficial: 'Official',
      provOfficialTip: 'Read directly from the game client.',
      provDerived: 'Derived',
      provDerivedTip: 'Computed from official values (geometry or arithmetic).',
      provInferred: 'Inferred',
      provInferredTip: 'Matched heuristically (by name, proximity or text) — likely, not certain.',
      provAbsent: 'Missing',
      provAbsentTip: 'Honestly absent from the extracted data.',
      // "Player tip" tier — known IN-GAME from play experience, never provable
      // from the extracted data; dashed-amber tone distinct from "derived"
      // (reuses the ex-playerHintLabel wording).
      provPlayerKnowledge: 'Player tip',
      provPlayerKnowledgeTip: 'Known in-game from play experience — never provable from the extracted data.',
      // Precision axis — how exact a location is
      precPinned: 'Pinned',
      precPinnedTip: 'Exact coordinates.',
      precArea: 'Area',
      precAreaTip: 'Approximate — a region or zone, not an exact point.',
      precViaChain: 'Via chain',
      precViaChainTip: 'Locate it through the linked layer (its spawn or placement).',
      precUnlocated: 'Unlocated',
      precUnlocatedTip: 'No client position — resolved server-side or absent.',
      // Content flag (orthogonal, danger-red — not a fact-provenance)
      contentDev: 'Dev',
      contentDevTip: 'Unfinished or test content the game ships but never uses.',
      // Three typed value-renders (same visual family, bespoke content)
      valWeightShare: 'Table share',
      valWeightShareTip: "This item's share of the table — not a per-kill drop chance.",
      valRosterServerSide: 'Server roster',
      valRosterServerSideTip: 'The server decides which creatures spawn here.',
      valCospawnProbable: 'Probable co-spawn',
      valCospawnProbableTip: 'Associated by type — probable, not guaranteed.',
    },
    // Creature disposition (blueprint §3.3 DispositionBadge): stance toward the
    // player — a DOMAIN classification (like rarity), NOT an honesty Badge; its
    // provenance rides alongside as a badge(). monsters.disposition is a STRING,
    // creeps.disposition an OBJECT{value}; both normalized on read (SCHEMA §5.2).
    disposition: {
      peaceful: 'Peaceful', peacefulTip: 'Never attacks — ignores the player.',
      neutral: 'Neutral', neutralTip: 'Won’t attack unless provoked.',
      hostile: 'Hostile', hostileTip: 'Attacks the player on sight.',
      other: 'Disposition', otherTip: 'Stance toward the player.',
    },
    // Monster color variants (monsters.bin `colors` — cosmetic skin tints,
    // correlated with spawn level; family-fiche member lines): generic color
    // WORDS, safely localized — NOT game taxonomy vocabulary (unlike the
    // family/type/subRole tokens, which stay raw, GLOSSARY-PENDING).
    monsterColor: {
      brown: 'Brown', blue: 'Blue', gray: 'Gray', green: 'Green', red: 'Red',
      yellow: 'Yellow', orange: 'Orange', white: 'White', black: 'Black',
      purple: 'Purple', pink: 'Pink',
    },
    // Decor families (chests.bin group="decor" by family, + "legacy" for
    // group="legacy_chest") — sub-rows of the collapsible "Decor" group
    // (js/sidebar.js buildDecorGroup), see  §3.1.
    decorFamily: {
      barrel: 'Barrels', boxes: 'Boxes', furniture: 'Furniture',
      // `corpse` = the PLACED corpses row (fixed/placed concept) — "Placed
      // corpses", distinct from the SPAWN "Corpses" of the "Spawn zones
      // (camps)" group: the same concept in two honest forms, now clearly
      // sectioned. The ROLE labels (corpse_quest/loot/decor) stay: config.js
      // chestKindLabel shows them PER RECORD on the fiche/popup, never as tree
      // rows (config.js corpseRoleKey).
      corpse: 'Placed corpses',
      corpse_quest: 'Quest corpses', corpse_loot: 'Searchable corpses', corpse_decor: 'Corpses (decor)',
      books: 'Books', misc: 'Misc', legacy: 'Legacy chest',
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
      chests: 'Searchable chests', corpses: 'Searchable corpses', skeleton: 'Skeletons', sacks: 'Sacks',
      crateCorn: 'Corn crate', crateCabbage: 'Cabbage crate', crateCarrot: 'Carrot crate',
      crateOnion: 'Onion crate', crateEggplant: 'Eggplant crate', crateBerries: 'Berry crate',
      sackCorn: 'Corn sack', sackWheat: 'Wheat sack',
      mushrooms: 'Mushrooms', bottles: 'Bottles', pots: 'Pots',
      wooden: 'Wooden props', leafTrash: 'Leaf piles',
      vegetables: 'Vegetables', urban: 'Urban props',
    },
    // POI sub-categories (interest_points.bin poiType — OUR curated icon
    // grouping, NOT a game taxonomy, see  §1 "poiType";
    // 8 real families + a defensive "other", 0 records today).
    poiType: {
      habitat: 'Dwellings', nature: 'Nature', fort: 'Fortifications',
      curiosity: 'Curiosities', transport: 'Transport', profession: 'Professions',
      amenity: 'Amenities', portal: 'Portals', other: 'Other',
    },
    // Camp qualifier (Prison Island, engine token patrol|buffed —
    // byte-proven semantics: base=PvE-only, patrol=only variant present in
    // PvP (0.6), buffed=PvP-only 10% — SOFT wording, it is a server weight,
    // never a guarantee nor a drawable patrol route).
    campQualifier: { patrol: 'Patrol', buffed: 'Buffed (PvP)' },
    // Roster member qualifiers (camp_details `mobs[].qualifiers[]`) — DESCRIPTIVE
    // variant markers rendered as .roster-qual chips in the camp RosterRow, kept
    // visually distinct from the honesty Badge vocabulary. `summon` covers a
    // campSpawnUnlikely member (ability-spawned, not camp-placed; dormant today).
    rosterQual: {
      boss: 'Boss', bossTip: 'A boss-tier variant of this creature.',
      undead: 'Undead', undeadTip: 'An undead variant of this creature.',
      buffed: 'Buffed', buffedTip: 'A strengthened (buffed) variant.',
      event: 'Event', eventTip: 'Appears as part of a limited-time or special event.',
      arena: 'Arena', arenaTip: 'An arena variant of this creature.',
      affix: 'Affix', affixTip: 'Carries an extra affix modifier.',
      summon: 'Summon', summonTip: 'Ability-spawned, not camp-placed — summoned during combat.',
    },
    // Game-mode tokens of the presence tables (#93, camp_details `modes`).
    campMode: {
      PvE: 'PvE', PvP: 'PvP', SoloPvE: 'Solo PvE', SoloPvP: 'Solo PvP',
      SoloPvP_HC: 'Solo PvP (HC)',
    },
    // Physical chest type (world_objects.json chest_type) -- exact set from
    // data/world_objects.json, see  "Chest loot + type".
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
    // see  "Activable type".
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
      // Wildlife-species harvest tokens (wildlife_species.bin harvestMethod):
      // lowercase engine tokens distinct from the Flayer/Lumberjack ones above.
      butchering: 'Butchery', logging: 'Logging',
    },
    statLabel: {
      health: 'Health', attack_power: 'Attack power', weapon_damage: 'Weapon damage',
      armor: 'Armor', magic_resist: 'Magic resist', accuracy: 'Accuracy',
      attack_speed: 'Attack speed', movement_speed: 'Movement speed', vision: 'Vision',
      health_regen: 'Health regen', mana: 'Mana', mana_regen: 'Mana regen',
      xp_reward: 'XP given', gold_reward: 'Gold given',
      phys_crit_chance: 'Physical crit chance', magic_crit_chance: 'Magic crit chance',
      // Added Phase 4 (stat_ranges/weapon_dps/formulas -- see
      // tmp/convergence/ #8/#9): rollable stats/formula operands
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
