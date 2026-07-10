/* Dictionnaire UI — es. Mêmes clés que les autres langues (voir js/i18n/index.js). */

export default {
    ui: {
      pageTitle: 'Kwalat — Mapa comunitario de Corepunk',
      pageDescription: 'Mapa interactivo de Kwalat (Corepunk): PNJ, misiones, talleres, cofres, campamentos y puntos de interés.',
      panelAriaLabel: 'Leyenda y filtros',
      title: 'Mapa de Kwalat',
      subtitle: 'Corepunk · mapa comunitario',
      searchPlaceholder: 'Buscar un PNJ, una misión, un objeto, un monstruo…',
      searchAriaLabel: 'Búsqueda',
      filtersAriaLabel: 'Filtros',
      legend: 'Leyenda',
      campsTitle: 'Campamentos y recursos',
      trackedTitle: 'Seguimiento',
      trackedEmptyHint: 'Fija un marcador con «Seguir» para encontrarlo aquí.',
      footerNote: 'Datos extraídos del cliente del juego · no afiliado con Artificial Core.',
      langSelectorLabel: 'Idioma',
      panelToggleAriaLabel: 'Mostrar u ocultar el panel',
      mapAriaLabel: 'Mapa del mundo',
      loadingText: 'Levantamiento del terreno…',
      zonesLabel: 'Zonas (regiones)',
      campLoading: 'Cargando campamentos…',
      decorFamiliesTitle: 'Familias de decoración',
      chestTypesAllBtn: 'Todos',
      chestTypesNoneBtn: 'Ninguno',
      // Recategorización de contenedores (DATA_CONTRACT.md): las 2 capas
      // reales de cofres + el grupo "Decoración" (legacy_chest/decor por
      // familia).
      decorGroupLabel: 'Decoración',
      campChestLabel: 'Cofre de campamento',
      legacyChestLabel: 'Cofre del tesoro heredado',
      lootGenericNote: 'Botín genérico: el único vínculo de botín conocido de este contenedor es un grupo registrable amplio, no una tabla de botín dedicada — no es un cofre farmeable específico.',
      searchableChestTitle: 'Cofre registrable',
      searchableChestRarityNote: 'Rareza aleatoria: el nivel (común/raro/épico…) lo decide el servidor al aparecer — no se puede deducir de los datos del cliente.',
      noResults: 'Sin resultados.',
      noResultsHint: 'Prueba con una palabra más corta o revisa la ortografía.',
      searchBodyHintPrefix: '› objetivo: ',
      trackBtn: 'Seguir',
      trackedBtn: 'Siguiendo ✓',
      doneBtn: 'Hecho',
      doneBtnActive: 'Hecho ✓',
      removeBtn: 'Quitar',
      ficheBtn: 'Ficha',
      ficheShopBtn: 'Ficha · Tienda',
      loreEntryTitle: 'Bestiario',
      lootTableKind: 'Tabla de botín',
      priceTitle: 'Precio',
      hideHighlightBtn: 'Ocultar puntos',
      stockFilterPlaceholder: 'Filtrar lista…',
      rewardTablesN: n => `Tablas de recompensa (${n})`,
      questCountSuffix: n => ` · ${n} misión${n > 1 ? 'es' : ''}`,
      highlightPointsBtn: n => `Resaltar los ${n} puntos`,
      dataGeneratedAt: date => `Datos del ${date}`,
      questMapsLine: names => `Mapas: ${names}`,
      bestiaryTitle: 'Bestiario',
      bestiaryLoading: 'Cargando bestiario…',
      bestiaryZonesN: n => `${n} zonas`,
      lootTableItemsN: n => `Contenido (${n})`,
      probableLootTitle: 'Botín probable',
      probableLootNote: name => `Tabla «${name}» asociada por tipo de contenedor — confirmar en el juego.`,
      questCat: 'Misión',
      givenBySuffix: name => ` · dado por ${name}`,
      givenByPlain: name => `dado por ${name}`,
      ficheCompleteBtn: 'Ficha completa',
      campLabel: 'Campamento',
      pointsHereSuffix: n => ` · ${n} puntos aquí`,
      spawnsTotal: n => `${n} apariciones en total`,
      campFicheBtn: 'Ficha del campamento',
      levelAbbrev: lvl => `niv. ${lvl}`,
      spawnPointsCount: n => `${n} puntos de aparición`,
      viewOnMapBtn: 'Ver en el mapa',
      likelyMonsters: n => `Monstruos probables (${n})`,
      guaranteedLabel: 'Garantizado',
      chanceLabel: 'Probabilidad',
      // Proporción APROXIMADA (d.ch = weight / peso total de la tabla, ver
      // data/SCHEMA.md "chance") de un botín no garantizado + advertencia
      // honesta en un tooltip (title) sobre la píldora — ver js/fiches.js
      // dropRateHtml.
      dropChanceApprox: pct => `≈ ${pct} %`,
      dropChanceBelowOne: '< 1 %',
      dropChanceCaveat: 'Proporción de este objeto en el grupo de botín de la tabla — no una probabilidad por muerte (el número real de tiradas depende del servidor).',
      lootBestRates: 'Botín (mejores probabilidades)',
      mapLabel: 'Mapa',
      mapSelectorLabel: 'Mapa mostrado',
      mapBadgeTitle: name => `En ${name} — haz clic para cambiar`,
      mapTilesOnlySuffix: '(aprox.)',
      mapGroupWorld: 'Mundo',
      mapGroupExtraction: 'Extracción',
      mapGroupBattleground: 'Campos de batalla',
      mapGroupPve: 'Arenas JcE',
      mapGroupPvp: 'Arenas JcJ',
      mapGroupOther: 'Otros',
      // «posición desconocida» prohibido en el sitio (ver data/SCHEMA.md "search_zone"):
      // esta etiqueta genérica solo se usa para filas sin objetivo de misión
      // (PNJ/objeto/comerciante sin posición extraída) — los propios objetivos
      // de misión usan posDynamic/posDynamicZone/posUncatalogued más abajo.
      posUnknown: 'posición no especificada',
      posDynamic: 'Posición dinámica',
      posDynamicZone: 'Zona de aparición',
      posUncatalogued: 'Posición no catalogada — verificar en el juego',
      // Subtítulo de la fila de resultado de búsqueda para una MISIÓN
      // entera sin posición extraída (el dador/actores no tienen x/z — p.
      // ej. las misiones de Prison Island, en un mapa/sistema de
      // coordenadas aparte). Honesto y distinto de posUnknown: solo dice
      // que no hay punto que mostrar, sin botón de mapa roto — la ficha
      // igual se abre al hacer clic.
      questNoPos: 'Sin punto en el mapa',
      vendorStockTitle: 'Inventario del vendedor',
      vendorStockTitleN: n => `Inventario del vendedor (${n})`,
      noVendorItems: 'No se conocen artículos para este comerciante.',
      npcCat: 'PNJ',
      vendorSuffix: ' · Comerciante',
      questsGivenN: n => `Misiones otorgadas (${n})`,
      noQuestsForNpc: 'No se conocen misiones para este PNJ.',
      questItemBadge: 'Objeto de misión',
      gameItemBadge: 'Objeto del juego',
      soldTag: 'en venta',
      craftableTag: 'crafteable',
      lootTag: 'botín',
      activableBadge: 'Activable',
      objectivesN: n => `Objetivos (${n})`,
      objectivesTitle: 'Objetivos',
      howToTitle: 'Cómo hacerlo',
      rewardsTitle: 'Recompensas',
      questItemsN: n => `Objetos de misión (${n})`,
      viewGiverBtn: 'Ver a quien la da',
      viewZoneBtn: 'Ver la zona',
      onMapTitle: 'En el mapa',
      dialogsN: n => `Diálogos (${n})`,
      dialogueFicheKind: 'Diálogo de PNJ',
      dialogueHeading: 'Diálogo de PNJ (no es una misión)',
      dialogueNote: 'Frases de ambiente que dice este personaje; no es una misión con objetivos ni recompensas.',
      journalTitle: 'Diario',
      relatedQuestsTitle: 'Misiones relacionadas',
      questFicheKind: region => 'Misión' + (region ? ` · ${region}` : ''),
      dropRatesTitle: 'Probabilidades de botín',
      farmSpotsTitle: 'Zonas de farmeo',
      soldByTitle: 'Vendido por',
      obtainDuringQuestTitle: 'Cómo obtenerlo',
      obtainViaKill: name => `Matando a ${name}`,
      obtainViaInteract: label => `Interactuando con ${label}`,
      moreMerchants: n => `+ ${n} comerciantes más`,
      merchantPosUnknown: 'Posición del comerciante no especificada.',
      recipeTitle: 'Receta',
      producesArrow: 'produce → ',
      usedInTitle: 'Se usa en',
      rewardBadge: 'Recompensa',
      requiredBadge: 'Requerido',
      pingTitle: 'Ping',
      copyLinkBtn: 'Copiar enlace',
      linkCopied: 'Enlace copiado ✓',
      locatorTitle: 'Marcador',
      mapDownload9600: 'Mapa 9600px',
      mapDownload4800: 'Mapa 4800px',
      loadErrorPrefix: msg => `No se pudieron cargar los datos (${msg})`,
      closeBtnAria: 'Cerrar',
      // Aviso "datos actualizados" (js/updatecheck.js) -- el token de
      // version.json cambió desde que se cargó esta pestaña (hubo un nuevo
      // despliegue mientras seguía abierta). Nunca se recarga solo: solo se
      // ofrece la opción.
      dataUpdatedBanner: 'Datos actualizados — recarga el mapa',
      dataUpdatedReloadBtn: 'Recargar',
      monsterLabel: 'Monstruo',
      variantsNote: n => ` · +${n} variantes`,
      monsterAbilitiesN: n => `Habilidades (${n})`,
      monsterCampsN: n => `Aparece en (${n})`,
      noLootCatalogued: 'Botín no catalogado para este monstruo.',
      noAbilitiesKnown: 'No se conocen habilidades para este monstruo.',
      noCampsKnown: 'No se conoce ningún campamento para este monstruo.',
      // Sección "Objetos de misión" de la ficha de monstruo (seguimiento del
      // vínculo monstruo<->objeto de misión, tarea 1/4): lista questDrops[]
      // horneado en la compilación -- solo enlaces producidos por el
      // resolutor, sección ausente si está vacía (nunca un bloque vacío
      // fabricado).
      monsterQuestItemsTitle: 'Objetos de misión',
      familyMonstersTitle: n => `Monstruos de esta familia (${n})`,
      abilityLabel: 'Habilidad',
      harvestTitle: 'Recolección',
      noHarvestCatalogued: 'No hay botín de recolección catalogado para este monstruo.',
      statsTitle: 'Estadísticas',
      realStatsBadge: 'real',
      // Info-bulle del badge « real » (monsters.md finding #1): distingue un
      // registro REAL del cliente (record m_abs_*/mbt_*_boss, p. ej. Furious
      // Woodraptor = 154.440 HP) del rango genérico estimado por nivel de abajo.
      realStatsTooltip: 'Valores reales (cliente) — leídos directamente de los datos del juego para este monstruo concreto, no una estimación por nivel.',
      // Nota honesta para mobs SIN un registro real del cliente (statsSource
      // !== "record"): la ingeniería inversa mostró que la antigua tabla
      // "estimada" leía el campo equivocado (~640 veces demasiado bajo, p.
      // ej. un jefe de nivel 20 mostraba ~544 HP para un valor real de
      // servidor de ~350.000) — esa cifra inventada se elimina, reemplazada
      // por esta simple advertencia. Ver js/fiches.js monsterStatsSection.
      statsServerNote: 'Las estadísticas precisas se resuelven en el servidor (no disponibles en los datos del cliente).',
      computedStatsBadge: 'calculado (fórmula del juego)',
      statsPerTierNote: 'Nivel de dificultad asignado en el servidor — rango según el nivel (fácil → jefe).',
      // Advertencia honesta sobre las columnas Élite/Jefe (monsters.md finding
      // #2): a diferencia de fácil/medio/difícil, estos 2 niveles nunca se
      // verificaron contra una fuente externa — la cifra comunitaria de
      // "~350.000 HP" para un jefe de nivel 20 no se reproduce con ningún dato
      // del cliente, y un jefe nombrado real puede superar ampliamente este
      // rango genérico (ver el badge « real » cuando esté disponible).
      statsBossEliteCaveat: 'Columnas « Élite »/« Jefe »: valores genéricos estimados, no confirmados en el juego — algunos jefes nombrados reales son mucho más resistentes (ver el badge « real » cuando exista un registro dedicado para ese monstruo).',
      bestiaryMapFilterLabel: map => `En este mapa (${map})`,
      bestiaryMapEmpty: 'Ningún monstruo atribuido a este mapa. Desmarca para mostrar todos.',
      alwaysGrantedTitle: 'Siempre otorgado',
      choiceGroupTitle: n => `Elección ${n}`,
      orWord: ' o ',
      xpAbbrev: n => `${n} XP`,
      goldAbbrev: n => `${n} de oro`,
      // Selector de rareza (variantes con el mismo nombre, ver js/rarity.js)
      // + pista de búsqueda «N rarezas» en el resultado agrupado.
      rarityVariantsLabel: 'Rareza',
      rarityVariantsCount: n => `${n} rarezas`,
      // Selector de nivel/variante de monstruo (feature #12 — un modelo
      // agrupa todos sus niveles/reskins, ver js/fiches.js
      // monsterModelVariants) + pista de búsqueda «N variantes» en el
      // resultado agrupado, mismo idioma que rarityVariantsCount arriba.
      monsterVariantsLabel: 'Nivel',
      monsterVariantsCount: n => `${n} variantes`,
      // Contenido de prueba (feature #13, isTest:true oculto por defecto):
      // etiqueta de revelación al fondo del panel + insignia mostrada donde
      // sea que aparezca contenido revelado (ficha, píldora de variante,
      // bestiario, búsqueda).
      devContentTag: n => `Contenido de prueba (${n})`,
      devBadge: 'Prueba',
      // Rangos de tirada / DPS de arma / fórmulas / escalado de runas y chips
      // (stat_ranges, weapon_dps, artifact_formula/formula, rarity_scaling,
      // tier_scaling) -- nuevo, ver  +
      // , tmp/convergence/port_map.md #8/#9/#10.
      rollRangeTitle: 'Rango de tirada',
      weaponDpsTitle: 'DPS del arma',
      weaponDpsDerived: 'DPS (calculado)',
      // Agrupación principal/secundaria (auditoría data-accuracy, items.md #1):
      // un artefacto tira 1 stat PRINCIPAL garantizada + un número limitado de
      // stats SECUNDARIAS de un pool compartido -- nunca todas a la vez.
      rollMainStatTitle: 'Stat principal (garantizada)',
      rollSecondaryStatsTitle: 'Stats secundarias (pool)',
      rollSecondaryHintN: (n, pool) => `Hasta ${n} de estas ${pool} stats tiran realmente en el objeto (pool compartido) — no todas a la vez.`,
      rollSecondaryHint: 'Un número limitado de estas stats tira realmente en el objeto (pool compartido) — no todas a la vez.',
      formulaTitle: 'Fórmula',
      formulaRankLabel: n => `Rango ${n}`,
      formulaPartialNote: 'Parte de esta línea depende de una referencia del motor no decodificada.',
      rarityScalingTitle: 'Escalado por rareza',
      tierScalingTitle: 'Escalado por nivel',
      scalingServerSide: 'No varía con la rareza en los datos del cliente (probablemente gestionado en el servidor).',
      scalingNotLocated: 'Escalado no localizado en los datos del cliente.',
      tierNotRarity: 'Escala por NIVEL (tier), no por rareza.',
      useEffectTitle: 'Efecto de uso',
      effectVarRuntimeTooltip: 'Calculado en vivo en el juego (no es un valor fijo)',
      effectVarUnextractedTooltip: 'Valor aún no extraído de los datos del cliente',
    },
    cat: {
      npc: 'PNJ', poi: 'Puntos de interés', quest: 'Misiones',
      qao: 'Objetos de misión', workshop: 'Talleres',
      // Recategorización de contenedores: la antigua capa única "Cofres"
      // (chest) se elimina, reemplazada por estas 2 capas reales — ver
      // DATA_CONTRACT.md §1/§3.1 y js/config.js CATS.
      searchable_chest: 'Cofres registrables', camp_chest: 'Cofres de campamento',
    },
    rarity: { Common: 'Común', Uncommon: 'Poco común', Rare: 'Raro', Epic: 'Épico' },
    kind: { npc: 'PNJ', object: 'Objeto', item: 'Ítem', other: '—' },
    itemKind: {
      weapon: 'Arma', resource: 'Recurso', rune: 'Runa', consumable: 'Consumible',
      artifact: 'Artefacto', chip: 'Chip', synthesis: 'Síntesis',
      quest_item: 'Objeto de misión', recipe: 'Receta', item: 'Objeto',
    },
    weaponType: {
      Gun: 'Pistola', Sword: 'Espada', Shield: 'Escudo', Dagger: 'Daga',
      Bow: 'Arco', Knuckle: 'Puño americano', Spear: 'Lanza',
    },
    useType: {
      OneHanded: 'Una mano', TwoHanded: 'Dos manos',
      OneHandedLeft: 'Una mano (izquierda)', OneHandedRight: 'Una mano (derecha)',
    },
    weaponClass: { Bomber: 'Bombardero', Champion: 'Champion', Warmonger: 'Belicista' },
    action: {
      kill: 'Eliminar', collect: 'Recolectar', use: 'Usar', talk: 'Hablar con',
      goto: 'Ir a', deliver: 'Entregar', custom: 'Hacer',
      repair: 'Reparar', craft: 'Fabricar', mix: 'Mezclar',
    },
    searchCat: {
      npc: 'PNJ', poi: 'Lugar', quest: 'Misión', qao: 'Objeto',
      workshop: 'Taller', camp: 'Campamento', item: 'Ítem',
      monster: 'Monstruo', zone: 'Región', location: 'Lugar',
      ability: 'Habilidad', event: 'Evento', chest: 'Cofre',
      searchable_chest: 'Cofre registrable',
    },
    // Familias de decoración (chests.bin group="decor" por family, +
    // "legacy" para group="legacy_chest") — sub-filas del grupo plegable
    // "Decoración" (js/sidebar.js buildDecorGroup), ver DATA_CONTRACT.md §3.1.
    decorFamily: {
      barrel: 'Barriles', boxes: 'Cajas', furniture: 'Muebles',
      corpse: 'Cadáveres', books: 'Libros', misc: 'Varios', legacy: 'Cofre heredado',
    },
    // "searchable" y "quest" reformulados para que no se lean como las capas
    // estáticas de nivel superior (cat.chest "Cofres" / cat.quest
    // "Misiones"): son filas de FILTRO de campamento (apariciones dinámicas /
    // contenedores registrables), no esas mismas capas — ver campType.chests
    // más abajo para el mismo ajuste en la etiqueta del subtipo
    // "Cofres — <región>".
    campKind: {
      monsters: 'Monstruos', creeps: 'Creeps', herbalism: 'Herboristería',
      logging: 'Tala', mining: 'Minería', searchable: 'Registrables',
      destroyable: 'Destructibles', reactive: 'Interactivos', shrines: 'Santuarios',
      soulkeeper: 'Guardianes de almas', quest: 'Apariciones de misión', wildlife: 'Fauna',
      guards: 'Guardias', event: 'Evento', other: 'Otros',
    },
    mapName: {
      Kwalat: 'Kwalat',
      Extraction_Island_large: 'Isla Prisión',
      Extraction_Island_small: 'Isla Prisión (pequeña)',
    },
    monsterAttack: { Melee: 'Cuerpo a cuerpo', Range: 'A distancia', Ranged: 'A distancia', Axe: 'Hacha' },
    locationKind: {
      town: 'Ciudad', poi: 'Punto de interés', mob: 'Bestiario', dungeon_boss: 'Jefe de mazmorra',
      gathering: 'Recurso', portal: 'Portal', shrine: 'Santuario',
    },
    campType: {
      barrels: 'Barriles explosivos', tombstones: 'Lápidas', coffins: 'Ataúdes',
      chests: 'Cofres registrables', corpses: 'Cadáveres registrables', sacks: 'Sacos',
      crateCorn: 'Cajón de maíz', crateCabbage: 'Cajón de repollo', crateCarrot: 'Cajón de zanahorias',
      crateOnion: 'Cajón de cebollas', crateEggplant: 'Cajón de berenjenas', crateBerries: 'Cajón de bayas',
      sackCorn: 'Saco de maíz', sackWheat: 'Saco de trigo',
      mushrooms: 'Setas', bottles: 'Botellas', pots: 'Macetas',
      wooden: 'Objetos de madera', leafTrash: 'Montones de hojas',
      vegetables: 'Verduras', urban: 'Objetos urbanos',
    },
    chestType: {
      Backpack: 'Mochila', Barrel: 'Barril', Bathroom: 'Baño', Bedroom: 'Dormitorio',
      Boiler: 'Caldera', Books: 'Libros', Boxes: 'Cajas', Cabinet: 'Armario', Chest: 'Cofre',
      Closed: 'Cerrado', Corpse: 'Cadáver', Fridge: 'Refrigerador', Guest: 'Habitación de invitados',
      Kitchen: 'Cocina', Papers: 'Papeles', Rest: 'Descanso', Shelf: 'Estante', Truck: 'Camión',
      Wardrobe: 'Armario ropero', Warehouse: 'Almacén',
    },
    activableType: {
      Ancient: 'Antiguo', Artifact: 'Artefacto', Barrel: 'Barril', Bart: 'Bart', Beehive: 'Colmena',
      Black: 'Negro', Blade: 'Hoja', Bloody: 'Sangriento', Blue: 'Azul', Broken: 'Roto',
      Building: 'Edificio', Captains: 'Del capitán', Cell: 'Celda', Chain: 'Cadena',
      Chainsaw: 'Motosierra', Charging: 'Cargando', Cigarette: 'Cigarrillo', Container: 'Contenedor',
      Crush: 'Aplastadora', Data: 'Datos', Deed: 'Escritura', Diamond: 'Diamante',
      Document: 'Documento', Door: 'Puerta', Dream: 'Sueño', Drip: 'Gotero', Dwarf: 'Enano',
      East: 'Este', Empty: 'Vacío', Energydrink: 'Bebida energética', Enter: 'Entrada',
      Evidence: 'Prueba', Explosive: 'Explosivo', Felixs: 'Felix', Fire: 'Fuego', Fishing: 'Pesca',
      Free: 'Libre', Gasoline: 'Gasolina', Gift: 'Regalo', Glass: 'Vidrio', Green: 'Verde',
      Handle: 'Mango', Hiding: 'Escondite', Ingredient: 'Ingrediente', Iron: 'Hierro',
      Isopropyl: 'Isopropilo', Item: 'Objeto', Jahri: 'Jahri', Kegs: 'Barriles', Light: 'Luz',
      'Lock/Key': 'Cerradura/Llave', Machine: 'Máquina', Mask: 'Máscara', Maxwell: 'Maxwell',
      Message: 'Mensaje', Mineral: 'Mineral', Mixing: 'Mezcla', Mobius: 'Mobius',
      Mysterious: 'Misterioso', Nia: 'Nia', Node: 'Nodo', North: 'Norte', Orange: 'Naranja',
      Package: 'Paquete', Phylactery: 'Filacteria', Piece: 'Pieza', Place: 'Lugar', Plant: 'Planta',
      Processor: 'Procesador', Provisions: 'Provisiones', Psychomushroom: 'Psicohongo',
      Purple: 'Morado', Put: 'Depósito', Radio: 'Radio', Recording: 'Grabación', Red: 'Rojo',
      Rehearsed: 'Ensayado', Remains: 'Restos', Renovated: 'Renovado', Robot: 'Robot', Safe: 'Caja fuerte',
      Second: 'Segundo', Secret: 'Secreto', Sensor: 'Sensor', Sewing: 'Costura', Shiny: 'Brillante',
      Shipping: 'Envío', Shirt: 'Camisa', Sign: 'Cartel', Slippery: 'Resbaladizo',
      Smoker: 'Ahumador', Soldier: 'Soldado', South: 'Sur', Souvenir: 'Recuerdo', Special: 'Especial',
      Statue: 'Estatua', Stolen: 'Robado', Supplies: 'Suministros', Suspicious: 'Sospechoso', Svi: 'Svi',
      Tool: 'Herramienta', Training: 'Entrenamiento', Transformer: 'Transformador', Triton: 'Tritón',
      Undead: 'No-muerto', Valuable: 'Valioso', Various: 'Varios', Vial: 'Vial', Vodka: 'Vodka',
      Water: 'Agua', Weast: 'Weast', West: 'Oeste', Wolf: 'Lobo', Workstation: 'Estación de trabajo',
      Yellow: 'Amarillo', Zazz: 'Zazz', Zephyr: 'Céfiro',
    },
    profession: {
      Alchemy: 'Alquimia', Butchery: 'Desuello', Construction: 'Construcción',
      Cooking: 'Cocina', Herbalism: 'Herboristería', Logging: 'Tala',
      Mining: 'Minería', Mysticism: 'Misticismo', Weaponsmithing: 'Herrería de armas',
    },
    harvestMethod: {
      Flayer: 'Desuello', Herbalism: 'Herboristería', Lumberjack: 'Tala', Miner: 'Minería',
    },
    statLabel: {
      health: 'Salud', attack_power: 'Poder de ataque', weapon_damage: 'Daño de arma',
      armor: 'Armadura', magic_resist: 'Resistencia mágica', accuracy: 'Precisión',
      attack_speed: 'Velocidad de ataque', movement_speed: 'Velocidad de movimiento', vision: 'Visión',
      health_regen: 'Regen. de salud', mana: 'Maná', mana_regen: 'Regen. de maná',
      xp_reward: 'XP otorgada', gold_reward: 'Oro otorgado',
      phys_crit_chance: 'Prob. de crítico físico', magic_crit_chance: 'Prob. de crítico mágico',
      // Añadido en la Fase 4 (stat_ranges/weapon_dps/fórmulas -- ver
      // tmp/convergence/port_map.md #8/#9): estadísticas de equipo y
      // operandos de fórmula ausentes del conjunto "monstruo" de arriba.
      spell_power: 'Poder de hechizo', phys_penetration: 'Penetración física',
      magic_penetration: 'Penetración mágica', flat_phys_penetration: 'Penetración física fija',
      flat_magic_penetration: 'Penetración mágica fija', phys_crit_power: 'Poder de crítico físico',
      magic_crit_power: 'Poder de crítico mágico', lifesteal: 'Robo de vida',
      ability_steal: 'Robo de vida (habilidades)', heal_shield_power: 'Poder de curación y escudo',
      cooldown_reduction: 'Reducción de reutilización', cost_reduction: 'Reducción de coste',
      haste: 'Celeridad', tenacity: 'Tenacidad', slow_resistance: 'Resistencia a la ralentización',
      bleed_chance: 'Prob. de sangrado', corruption_chance: 'Prob. de corrupción',
    },
    statTier: {
      easy: 'fácil', medium: 'medio', hard: 'difícil', elit: 'élite', boss: 'jefe', miniboss: 'minijefe',
    },
};
