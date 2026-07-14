/* Dictionnaire UI — es. Mêmes clés que les autres langues (voir js/i18n/index.js). */

export default {
    ui: {
      // Catálogo de objetos (navegación por facetas, js/fiches/catalog.js).
      catTitle: 'Catálogo de objetos',
      catCount: n => `${n} objetos`,
      catBrowse: 'Explorar el catálogo',
      catBrowseHint: 'Filtrar objetos por tipo, rareza, nivel, profesión…',
      catFacetKind: 'Tipo',
      catFacetRarity: 'Rareza',
      catFacetTier: 'Nivel',
      catFacetProf: 'Profesión',
      catFacetArchetype: 'Arquetipo',
      catFacetWclass: 'Clase',
      catFacetWuse: 'Agarre',
      catFacetWspec: 'Especialización',
      catSortLabel: 'Ordenar',
      catSortName: 'Nombre',
      catSortRarity: 'Rareza',
      catSortTier: 'Nivel',
      catFilterPlaceholder: 'Filtrar objetos mostrados…',
      catClearAll: 'Borrar todo',
      catActiveLabel: 'Filtros activos',
      catRemoveFilter: v => `Quitar filtro: ${v}`,
      catNoResults: 'Ningún objeto coincide con estos filtros.',
      catHiddenNote: n => `${n} objetos dev/internos ocultos.`,
      catShowing: (a, b, n) => `${a}–${b} de ${n}`,
      catPagePrev: 'Anterior',
      catPageNext: 'Siguiente',
      catMoreValues: n => `+${n} más`,
      catNRarities: n => `${n} rarezas`,
      // Referencia de habilidades (superficie por facetas, js/fiches/ability_catalog.js).
      abcTitle: 'Referencia de habilidades',
      abcCount: n => `${n} habilidades`,
      abcBrowse: 'Explorar las habilidades',
      abcBrowseHint: 'Filtrar habilidades por ranura, etiqueta, detalles…',
      abcFacetSlot: 'Ranura',
      abcFacetTag: 'Etiqueta',
      abcFacetDetail: 'Detalles',
      abcDetailDesc: 'Con descripción',
      abcDetailFormula: 'Con fórmula',
      abcDetailCooldown: 'Enfriamiento conocido',
      abcSortName: 'Nombre',
      abcSortSlot: 'Ranura',
      abcFilterPlaceholder: 'Filtrar habilidades mostradas…',
      abcNoResults: 'Ninguna habilidad coincide con estos filtros.',
      // Ficha de habilidad — línea de enfriamiento + resolución mustache (ver core.js).
      abilityCooldownLabel: 'Enfriamiento',
      abilityCooldownSeconds: n => `${n} s`,
      abilityCooldownUnspecified: 'no especificado',
      abilityParamTooltip: 'Resuelto a partir de los parámetros de esta habilidad',
      abilityNoDetail: 'No hay descripción ni fórmula en los datos del cliente para esta habilidad.',
      pageTitle: 'Kwalat — Mapa comunitario de Corepunk',
      pageDescription: 'Mapa interactivo de Kwalat (Corepunk): PNJ, misiones, talleres, cofres, campamentos y puntos de interés.',
      panelAriaLabel: 'Leyenda y filtros',
      title: 'Mapa de Kwalat',
      subtitle: 'Corepunk · mapa comunitario',
      searchPlaceholder: 'Buscar un PNJ, una misión, un objeto, un monstruo…',
      searchAriaLabel: 'Búsqueda',
      filtersAriaLabel: 'Filtros',
      // Franja de capas activas (chips ETIQUETA nombradas y eliminables bajo
      // la búsqueda — la franja funciona también como leyenda del mapa,
      // js/sidebar.js renderActiveTags). activeTagsMoreAria: el chip
      // "+N" de desbordamiento (tope de 2 filas) que despliega la franja.
      activeDotsLabel: 'Capas activas',
      activeTagRemove: name => `${name} — quitar`,
      activeTagsMoreAria: n => `${n} capa${n === 1 ? '' : 's'} activa${n === 1 ? '' : 's'} más — mostrar`,
      // IA FINAL de la barra lateral (2026-07-11): 4 grupos fijos —
      // groupPoi/groupQuests retirados con sus grupos (filas trasladadas a
      // World/Interactables, ver js/sidebar.js). GLOSSARY-PENDING.
      groupMonsters: 'Monstruos',
      // Grupos raíz Creeps/Wildlife (corrección de estructura 2026-07-11).
      groupCreeps: 'Creeps',
      groupHarvest: 'Recolección',
      groupContainers: 'Interactuables',
      groupWorld: 'Mundo',
      // Casillas de cascada (IA final): aria-label compartido de cada
      // casilla maestra de grupo/subgrupo (js/sidebar.js wireParentCheck).
      groupToggleAria: 'Marcar o desmarcar todas las capas de este grupo',
      subgroupFoldAria: 'Expandir o contraer',
      // Títulos de subgrupos (IA final). Los del grupo Monstruos
      // (Monsters/Creeps/Wildlife) reutilizan la tabla campKind — espejo
      // literal de los kinds del motor. GLOSSARY-PENDING.
      subWorldOthers: 'Otros',
      subChests: 'Cofres',
      subDestroyable: 'Destructibles',
      subInteractives: 'Interactivos',
      subOther: 'Otros',
      // Etiquetas de fila (solo visual — los tokens de hash siguen siendo
      // camp.<kind>): fila kind gruesa del subgrupo Monstruos; guardias con
      // etiqueta honesta (2 campamentos/12 pts, sin NINGÚN vínculo de
      // especie/PNJ/botín); «apariciones sin identificar» (pools sin especie
      // vinculada — el recuento es exactamente lo que dibuja la capa, ver
      // pointsets.js kindRestPoints (règle rest-only universelle, data-dérivée)); y el sufijo «(campamentos)» de los
      // kinds dinámicos colocados junto a props FIJOS en los buckets de
      // Interactuables. GLOSSARY-PENDING.
      guardsRowLabel: 'Guardias (unidad sin identificar)',
      kindRestRow: 'Apariciones sin identificar',
      // Solo grupo Wildlife: los pools genéricos de fauna pacífica/salvaje no
      // vinculan ninguna especie del lado cliente (roster del lado servidor),
      // pero las ZONAS de aparición son reales — capa propia « Animales
      // pacíficos », no un recuento de « datos faltantes ».
      wildlifeRestRow: 'Animales pacíficos',
      // Decisión ratificada #4 (2026-07-14): la etiqueta dice el CONTENIDO
      // para el jugador que la capa dibuja realmente (9 pools de cofres
      // registrables + 3 de cuerpos), nunca la taxonomía interna.
      searchSpotsRow: 'Cofres y cuerpos registrables',
      destroyableCampsRow: 'Destructibles (campamentos)',
      reactiveCampsRow: 'Interactivos (campamentos)',
      // (pinFiltersTitle retirado con el concepto abandonado de filtros anclados.)
      trackedTitle: 'Seguimiento',
      trackedEmptyHint: 'Fija un marcador con «Seguir» para encontrarlo aquí.',
      footerNote: 'Datos extraídos del cliente del juego · no afiliado con Artificial Core.',
      langSelectorLabel: 'Idioma',
      panelToggleAriaLabel: 'Mostrar u ocultar el panel',
      mapAriaLabel: 'Mapa del mundo',
      loadingText: 'Levantamiento del terreno…',
      zonesLabel: 'Zonas (regiones)',
      campLoading: 'Cargando campamentos…',
      // Corrección de honestidad del contador de leyenda/menú (informe: el
      // filtro de PNJ mostraba 11 en Prison Island pero solo se dibuja 1
      // marcador): tooltip del distintivo discreto "+N" junto al recuento
      // principal de una fila de filtro (js/sidebar.js hiddenBadge) — N
      // registros reales, no de prueba, sin posición conocida, nunca
      // marcadores que el mapa deja de dibujar en silencio. Redacción
      // DELIBERADAMENTE neutra ("desconocido", no "dinámico"/"aparición del
      // servidor"): un clasificador `pos_source` que demuestre una aparición
      // real del lado del servidor solo existe para 18 PNJ de Prison Island
      // en data/quests.json (lado del pipeline, nivel giver/slot) y no se
      // expone en ningún .bin del sitio (ni npcs.bin ni quests.bin) —
      // afirmar "lado del servidor" para todo el lote exageraría para el
      // resto, simplemente sin clasificar (ver 
      //  §2 re-check #1).
      filterHiddenTooltip: n => `${n} sin posición conocida`,
      // (decorFamiliesTitle retirada 2026-07-11 con el grupo «Decoración»
      // disuelto — sus filas viven en los buckets de Interactuables, ver
      // js/sidebar.js decorFamsOfCategory (catégorie cuite des records — l’ancienne table DECOR_BUCKET est supprimée, ontology chunk 2). decorGroupLabel sigue en uso:
      // config.js chestKindLabel.)
      // Subgrupo "Por familia" bajo Monstruos y fauna (#82 chunk (b),
      // js/sidebar.js buildMonsterFamilyGroup) — los puntos de una familia
      // son los de los CAMPAMENTOS donde aparece, nunca "posiciones de X"
      // (design §13.1). Los nombres de familia mostrados son los tokens del
      // juego prettificados (GLOSSARY-PENDING #86, como el bestiario).
      // (monsterFamiliesTitle eliminada 2026-07-11 con la barra
      // [Todos][Ninguno] — las filas de familia viven directamente en el
      // grupo raíz Monstruos.)
      // n === 1 (no n > 1): «0 campamentos» es el plural honesto para las
      // familias sin campamento que el árbol ahora lista (chunk (d)).
      familyCampsN: n => `${n} campamento${n === 1 ? '' : 's'}`,
      // Sublíneas de ESPECIE del árbol (#82 chunk (d), "el árbol ES el
      // bestiario" — js/sidebar.js buildSpeciesSublist). Misma honestidad
      // que familyCampsN (los puntos de una especie = los de los
      // CAMPAMENTOS donde puede aparecer, design §13.1) — `p` llega ya
      // formateado (locale).
      speciesCampsPts: (n, p) => `${n} campamento${n === 1 ? '' : 's'} · ${p} pts`,
      speciesZeroCamps: '0 campamentos en este mapa',
      // Contexto de familia de una fila de ESPECIE en la BÚSQUEDA (mission
      // "search activation" 2026-07-11, distinto del pretty(family) plano
      // del árbol — aquí, sin anidamiento, la palabra "Familia" debe ser
      // explícita): "Familia Wolf" — combinado con speciesCampsPts arriba en
      // una segunda línea ("Familia Wolf · 4 campamentos · 926 pts", ver
      // js/search.js buildMonsterSearchIndex `ctx`).
      speciesFamilyOf: fam => `Familia ${fam}`,
      // Fauna sin campamentos (wildlife_species.bin, pass 2026-07-11b):
      // redacción GLOBAL — estas especies no tienen campamento en NINGÚN
      // mapa, a diferencia de speciesZeroCamps (mapa activo).
      wildlifeZeroCamps: '0 campamentos conocidos',
      famSpeciesToggle: 'Explorar las especies de esta familia',
      // #93 — ficha de campamento: actividad + presencia por modo
      // (camp_details `activity`/`modes`, js/fiches.js campPresenceHtml).
      // Redacción SUAVE (peso del registro del servidor, unidad exacta
      // desconocida — nunca un temporizador garantizado).
      campActivityLine: n => `Actividad: ~${n} %`,
      campActivityTitle: 'Peso de actividad del registro de apariciones del servidor — unidad exacta desconocida; ausente = siempre activo.',
      campModesTitle: 'Presencia por modo',
      campModesHint: 'Peso de activación del servidor por modo de juego — nunca una garantía de aparición.',
      campModeTier: (m, n) => `${m} · nivel ${n}`,
      // ── E′c-4 · lista / densidad / disposición / mitigación / franja de precio ──
      campRosterServerNote: 'El servidor decide la lista exacta — no se guarda ninguna lista de miembros en el cliente.',
      campRosterServerCountNote: n => `El servidor decide la lista exacta — unas ${n} criaturas en el grupo.`,
      campRosterCandidatesNote: 'Las criaturas listadas son candidatas probables — el servidor decide la lista real al aparecer.',
      spawnDensityLabel: 'Densidad de aparición',
      spawnDensityNote: 'Número de puntos de aparición en el mapa activo, relativo al campamento más denso de aquí — el número es exacto, la barra es relativa.',
      cospawnTitle: 'Aparición conjunta probable',
      mitigationRowLabel: 'Daño mitigado',
      mitigationNote: 'Fracción del daño entrante absorbida, derivada de la armadura de cada nivel mediante la única curva del cliente (igual para armadura y resistencia mágica) — calculada, no leída del cliente.',
      priceBandTitle: 'Franja de precio de compra (banda del multiplicador del servidor)',
      stockInfinity: 'Ilimitado',
      stockInfinityTitle: 'Siempre disponible — cantidad ilimitada.',
      stockChance: n => `${n}% en stock`,
      stockChanceTitle: 'Probabilidad de que el artículo se ofrezca al reponer — no siempre disponible.',
      // ── E′c-4b · región / banda de nivel del campamento · nav de serie ──
      campRegionLabel: 'Región',
      campRegionNote: 'Regiones que cubre la nube de aparición del campamento — asignadas por punto-en-polígono sobre toda la nube (derivado).',
      campRegionAlsoIn: list => `también en ${list}`,
      levelBandLabel: 'Banda de nivel',
      levelBandNote: 'Rangos de nivel que abarca este campamento — del nombre de las tablas de botín (un dato del cliente).',
      tierBandElite: 'Élite',
      tierBandEliteTip: 'Este campamento incluye una banda de nivel élite.',
      seriesPositionLabel: (i, n) => `${i} / ${n}`,
      seriesPrevLabel: 'Anterior',
      seriesNextLabel: 'Siguiente',
      seriesGraphTip: 'Posición en la cadena de misiones (del grafo de misiones).',
      seriesListedTip: 'Agrupado por orden de declaración — una asociación más débil que el grafo de misiones.',
      // POI enriquecidos (pass 2026-07-11b): botón hacia la ficha de la
      // enciclopedia + título de lore divergente (locTitle).
      poiLoreBtn: 'Enciclopedia',
      poiLoreNamed: t => `En la enciclopedia: «${t}»`,
      // Botón compacto «Mostrar [entidad] · N pts» (uniformización de
      // redacción 2026-07-11 — sustituye al antiguo botón verboso; la
      // palabra «campamentos» queda fuera de la redacción de misiones/
      // fichas; ver js/fiches.js monsterSpawnHighlightBtn).
      entityPtsN: p => `${p} pts`,
      // (chestTypesAllBtn/chestTypesNoneBtn eliminadas 2026-07-11 — sin
      // llamadores.)
      // Recategorización de contenedores (): las 2 capas
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
      loreEntryTitle: 'Bestiario',
      lootTableKind: 'Tabla de botín',
      priceTitle: 'Precio',
      stockFilterPlaceholder: 'Filtrar lista…',
      rewardTablesN: n => `Tablas de recompensa (${n})`,
      questCountSuffix: n => ` · ${n} misión${n > 1 ? 'es' : ''}`,
      dataGeneratedAt: date => `Datos del ${date}`,
      questMapsLine: names => `Mapas: ${names}`,
      // bestiaryTitle/bestiaryLoading retiradas (2026-07-11) con la propia
      // sección lateral "Bestiario" (ver js/sidebar.js) -- bestiaryZonesN se
      // mantiene: sigue en uso por fiches.js openMonsterFiche (sección de
      // lore de la ficha de monstruo), sin relación con esta sección retirada.
      monsterFoundInTitle: 'Se encuentra en',
      lootTableItemsN: n => `Contenido (${n})`,
      probableLootTitle: 'Botín probable',
      probableLootNote: name => `Tabla «${name}» asociada por tipo de contenedor — confirmar en el juego.`,
      campLabel: 'Campamento',
      pointsHereSuffix: n => ` · ${n} puntos aquí`,
      spawnsTotal: n => `${n} apariciones en total`,
      levelAbbrev: lvl => `niv. ${lvl}`,
      // Rango de NIVEL (task #80 — filas de especie del bestiario/fauna de
      // campamento, ej. una especie que cubre niv. 5-20): misma familia de
      // abreviatura que levelAbbrev arriba.
      levelRangeAbbrev: (min, max) => `niv. ${min}–${max}`,
      spawnPointsCount: n => `${n} puntos de aparición`,
      likelyMonsters: n => `Monstruos probables (${n})`,
      guaranteedLabel: 'Garantizado',
      // Proporción APROXIMADA (d.ch = weight / peso total de la tabla, ver
      //  "chance") de un botín no garantizado + advertencia
      // honesta en un tooltip (title) sobre la píldora — ver js/fiches.js
      // dropRateHtml.
      lootBestRates: 'Botín (mejores probabilidades)',
      mapSelectorLabel: 'Mapa mostrado',
      mapBadgeTitle: name => `En ${name} — haz clic para cambiar`,
      mapTilesOnlySuffix: '(aprox.)',
      mapGroupWorld: 'Mundo',
      mapGroupExtraction: 'Extracción',
      mapGroupBattleground: 'Campos de batalla',
      mapGroupPve: 'Arenas JcE',
      mapGroupPvp: 'Arenas JcJ',
      mapGroupOther: 'Otros',
      // «posición desconocida» prohibido en el sitio (ver  "search_zone"):
      // esta etiqueta genérica solo se usa para filas sin objetivo de misión
      // (PNJ/objeto/comerciante sin posición extraída) — los propios objetivos
      // de misión usan posDynamic/posDynamicZone/posUncatalogued más abajo.
      posUnknown: 'posición no especificada',
      // Confianza "media" (pase de cableado por lotes, solo proximidad — ver
      //  zone_confidence): texto distinto de posDynamicZone
      // arriba — un campamento cercano no prueba que el objeto realmente
      // aparezca ahí, nunca presentado con la misma autoridad que una zona
      // respaldada por evidencia.
      // Subtítulo de la fila de resultado de búsqueda para una MISIÓN
      // entera sin posición extraída (el dador/actores no tienen x/z — p.
      // ej. las misiones de Prison Island, en un mapa/sistema de
      // coordenadas aparte). Honesto y distinto de posUnknown: solo dice
      // que no hay punto que mostrar, sin botón de mapa roto — la ficha
      // igual se abre al hacer clic.
      questNoPos: 'Sin punto en el mapa',
      vendorStockTitle: 'Inventario del vendedor',
      vendorStockTitleN: n => `Inventario del vendedor (${n})`,
      noVendorItems: 'No se conocen artículos para este vendedor.',
      npcCat: 'PNJ',
      // Término canónico «Vendedor» (⚑ palabra del juego) — «Comerciante»
      // retirado (blueprint §4.1/§4.2): vendorSuffix/noVendorItems/moreMerchants/
      // merchantPosUnknown unificados en Vendedor, igual que vendorStockTitle.
      vendorSuffix: ' · Vendedor',
      questsGivenN: n => `Misiones otorgadas (${n})`,
      noQuestsForNpc: 'No se conocen misiones para este PNJ.',
      questItemBadge: 'Objeto de misión',
      soldTag: 'en venta',
      craftableTag: 'crafteable',
      lootTag: 'botín',
      // Insignia «Contenedor» (decodificación de mecanismo, tarea A):
      // identidad propia del objeto de collect_from_object (t.label, p. ej.
      // "Caja vieja") — distinta de activableBadge de arriba (objeto
      // autosuficiente de use_object, no un contenedor donde se encuentra
      // OTRA COSA).
      // Relación explícita de la tarjeta de objetivo (design review, julio
      // 2026): ver en.js para el contexto -- nunca interpolado con el
      // nombre (que queda como span cliqueable aparte, ver goalTargetChip).
      goalDroppedByLabel: 'soltado por',
      goalObtainedHereLabel: 'obtenido aquí',
      // Contraparte "contenedor" de goalObtainedHereLabel de arriba, propia
      // de collect_from_object (decodificación de mecanismo, tarea A): solo
      // se usa cuando se conoce la etiqueta del contenedor (t.label) — solo
      // el verbo, el nombre va en su propio span justo después, mismo
      // esquema que goalDroppedByLabel/nameSpan.
      goalFoundInLabel: 'encontrado en',
      // Mismo vocabulario de fila de relación, pase de cableado por lotes: un
      // objeto entregado por quien da la misión (given_by_giver, p. ej.
      // "Time of Death" de eight_legged_freaks) y un objeto solo crafteable
      // (craft:true, p. ej. el implante de construction_lesson) — ninguno de
      // los dos es una aparición en el mundo, así que nunca llevan posición
      // ni zona.
      goalGivenByLabel: 'entregado por',
      // Mecanismo receive_reward (decodificación de mecanismo, tarea A): el
      // objeto se obtiene al completar OTRA misión ( reward_of), no
      // entregado por quien da esta misión — solo el verbo, sigue un span de
      // misión cliqueable por cada entrada de reward_of (ver rewardOfRelRow).
      goalRewardOfLabel: 'obtenido al completar',
      // Mecanismo harvest: un nodo de recolección de recursos (tala/
      // herboristería/minería — target.profession, localizado vía
      // professionLabel).
      goalHarvestLabel: profession => `recolectar (${profession})`,
      // Objetivos de recolección cuyos TIPOS de nodo aceptados están
      // probados a nivel de bytes (#81, target.node_types -- 11 objetivos) --
      // una hilera de chips de nodo bajo el objetivo, nunca una capa del
      // mapa (no existe un vínculo tipo-de-nodo -> punto en el cliente).
      goalAcceptedNodesLabel: 'Nodos aceptados:',
      // Mecanismo kill_collect/kill: target.drop_chance (0-100, exacto por
      // bytes) — distinto del dropChanceApprox genérico (parte calculada,
      // nunca "≈" aquí, es el porcentaje diseñado por el juego).
      goalDropChanceLabel: pct => `(${pct} %)`,
      // Mecanismo kill_player: target.player_specs combinados vía
      // heroSpecLabel (fiches.js) — no hay una única ubicación para un
      // objetivo JcJ.
      goalCraftLabel: 'a craftear',
      // Etiqueta de la referencia «zona estimada» de un objetivo
      // (dynamicPosBadge): la zona dibujable es una estimación, nunca un
      // spawn confirmado — la referencia nunca queda sin etiqueta.
      goalSearchZoneLabel: 'Zona estimada',
      objectivesN: n => `Objetivos (${n})`,
      objectivesTitle: 'Objetivos',
      howToTitle: 'Cómo hacerlo',
      rewardsTitle: 'Recompensas',
      questItemsN: n => `Objetos de misión (${n})`,
      viewZoneBtn: 'Ver la zona',
      // Contraparte de confianza "media" (pase de cableado por lotes, ver
      // posEstimatedZone arriba): dibuja los puntos reales del campamento
      // citado cuando el mapa activo los tiene cargados, si no recurre al
      // mismo círculo estimado que viewZoneBtn — nunca el mismo texto, para
      // no confundirlo con una zona confirmada.
      onMapTitleN: n => `En el mapa (${n})`,
      dialogsN: n => `Diálogos (${n})`,
      // Insignia de confianza en la cabecera (rediseño de layout, julio 2026):
      // `q.explained` {goals_total, goals_resolved} viene tal cual del
      // decodificador del grafo de misión — 333 de 335 misiones decodificadas
      // están hoy totalmente explicadas, 2 conservan al menos un objetivo sin
      // resolver. Nunca se muestra sin grafo de objetivos en absoluto
      // (diálogos de ambiente, etc.).
      dialogueFicheKind: 'Diálogo de PNJ',
      dialogueHeading: 'Diálogo de PNJ (no es una misión)',
      dialogueNote: 'Frases de ambiente que dice este personaje; no es una misión con objetivos ni recompensas.',
      interactionFicheKind: 'Interacción con PNJ',
      interactionHeading: 'Interacción — no es una misión con objetivos',
      interactionNote: 'Este personaje ofrece un servicio mediante diálogo (los datos del juego no definen objetivos para esta entrada).',
      devBarksGivenN: n => `Diálogos revelados — contenido dev (${n})`,
      journalShowMoreBtn: 'Ver más',
      journalShowLessBtn: 'Ver menos',
      relatedQuestsTitle: 'Misiones relacionadas',
      questFicheKind: region => 'Misión' + (region ? ` · ${region}` : ''),
      dropRatesTitle: 'Probabilidades de botín',
      farmSpotsTitle: 'Cómo farmear',
      // Rediseño de zonas de farmeo (, julio 2026):
      // filas agrupadas por tipo de campamento (Minería/Monstruos/…) en vez
      // de un volcado plano de 24 filas — resumen de cabecera, desplegable
      // «+N», y los repliegues honestos de abajo (campamento sin unir, sin
      // datos de campamento, pool de recompensa genérica colapsado).
      // Recuentos MÍNIMOS (uniformización 2026-07-11 — «926 pts» sí,
      // «4 campamentos» no; primer parámetro histórico ignorado).
      farmGroupSummary: (camps, pts) => `${pts} pts`,
      farmMoreCampsN: n => `+ ${n} más`,
      farmGenericPoolNote: n => `También un botín raro entre ${n} campamentos de recompensa genérica — no es una zona de farmeo específica.`,
      farmSourcesNotMapped: 'Fuentes aún no vinculadas a un campamento conocido.',
      farmOtherSourcesTitle: 'Otras fuentes',
      // «También se encuentra en cofres» (#65): containers[] de un ítem/una
      // receta, agregado POR CLASE (camp_chest por familia de monstruo,
      // searchable_chest por banda de rareza) -- `ch` ya es la MEJOR
      // probabilidad entre las variantes de grado/nivel plegadas en esa
      // clase (ver ).
      containersTitle: 'También se encuentra en cofres',
      containerCampChestHint: 'Generado por el servidor según la familia de monstruo — no hay una ubicación concreta que mostrar en el mapa.',
      containerChanceUpTo: pct => `hasta ${pct} %`,
      containerChanceBelowOne: 'hasta < 1 %',
      soldByTitle: 'Vendido por',
      obtainDuringQuestTitle: 'Cómo obtenerlo',
      // EntityRef wave 2: prefijos de verbo solo — el objetivo se renderiza
      // como su propia referencia `[Species(●)]`/`[Object]` justo después.
      obtainViaKill: 'Matando a',
      obtainViaInteract: 'Interactuando con',
      // Extensión de quest_source_of, decodificación de mecanismo, tarea B
      // (harvest/reward_of/world -- given_by reutiliza ui.givenByPlain,
      // container reutiliza obtainViaInteract de arriba, ver
      //  + fiches.js openItemFiche).
      obtainViaHarvest: profession => `Recolectando (${profession})`,
      // Fragmento, no una frase completa -- se combina con ui.givenByPlain
      // como "Dado por X — quest Y" (caso cruzado de receive_reward, ver la
      // rama qs.via === 'reward_of' de openItemFiche).
      obtainViaWorld: 'Se encuentra al completar esta misión',
      // Línea honesta de obtención (items-obtain audit §B2): se muestra
      // cuando un objeto NO tiene ningún canal de obtención — una línea
      // explícita en lugar de un vacío silencioso. El texto habla de los
      // DATOS, nunca «inobtenible» (afirmación indemostrable sobre el juego).
      obtainStatusUnknown: 'Sin fuente de obtención registrada en los datos actuales del juego.',
      obtainStatusQuestOrphan: 'Objeto de misión — ninguna misión de los datos actuales del juego hace referencia a él (contenido probablemente sin usar o eliminado).',
      obtainStatusCosmetic: 'Elemento de apariencia (skin) — sin fuente de obtención registrada en los datos actuales del juego.',
      obtainStatusLobby: 'Equipo del lobby de arena — sin fuente de obtención registrada fuera de las partidas de arena.',
      obtainStatusInternal: 'Registro interno del juego (datos de efecto/habilidad) — no es un objeto obtenible por el jugador.',
      // Cascarones de misión (questStatus, enum cerrado estampado por el
      // pipeline en misiones sin ningún objetivo): mismo registro que
      // obtainStatus — dice lo que definen los DATOS, nunca lore.
      questStatusExtractionMarker: 'Marcador del motor (extracción/transición de zona) — no es una misión jugable: los datos del juego no le definen ningún objetivo.',
      questStatusDevShell: 'Cascarón de desarrollo — registro de misión interno/de prueba sin objetivos en los datos actuales del juego.',
      questStatusNoObjectives: 'Los datos actuales del juego no definen objetivos para esta misión.',
      // Insignia «Interno» (audit §B3): pseudoobjetos técnicos ocultos de los
      // listados como el contenido dev, siempre abribles por sus enlaces.
      internalBadge: 'Interno',
      internalBadgeTitle: 'Registro técnico del juego (efecto/habilidad/talento) presente en el cliente pero que el jugador nunca posee como objeto.',
      moreMerchants: n => `+ ${n} vendedores más`,
      merchantPosUnknown: 'Posición del vendedor no especificada.',
      recipeTitle: 'Receta',
      producesArrow: 'produce → ',
      usedInTitle: 'Se usa en',
      rewardBadge: 'Recompensa',
      requiredBadge: 'Requerido',
      locatorTitle: 'Marcador',
      // Bandera de usuario (#84, clic derecho) -- deliberadamente NO "pin":
      // distinta del futuro "filtro fijado" del panel izquierdo (#82,
      // icono de chincheta) y de locatorTitle arriba (retícula goto).
      // Ver pins.js.
      userFlagTitle: 'Bandera',
      clearAllFlagsBtn: 'Quitar todas las banderas',
      // Bloque "Mis banderas" inyectado en la sección Seguimiento
      // (sidebar.js renderUserPins, 2026-07-11c) -- mismo vocabulario
      // "bandera", nunca "pin".
      userFlagsBlockTitle: 'Mis banderas',
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
      // Botón de grupo "resaltar todo" (ficha de monstruo, julio 2026):
      // vínculo solo a nivel de CAMPAMENTO — dibuja la unión de las nubes de
      // puntos de todos los campamentos donde aparece este monstruo, nunca
      // una afirmación sobre qué punto exacto genera qué variante (ver el
      // manejador camp-highlight, main.js). Texto "en estos campamentos"
      // deliberado, distinto de "Ver estimación" del paso de misión
      // (viewEstimatedZoneBtn), que dibuja otro conjunto de datos (puntos de
      // campamento del OBJETO de misión).
      // (monsterHighlightAllSpawns eliminada 2026-07-11 — sustituida por
      // showEntityBtn/entityPtsN, ver js/fiches.js.)
      noLootCatalogued: 'Botín no catalogado para este monstruo.',
      noAbilitiesKnown: 'No se conocen habilidades para este monstruo.',
      noCampsKnown: 'Ningún lugar de aparición conocido para este monstruo.',
      // Sección de fauna de la ficha de campamento (
      // #4/#10, tarea #67): un campamento "de tipo monstruo" (kind monsters/
      // creeps/wildlife) cuyo nombre de manager no da ninguna especie
      // resuelta — probado a nivel de bytes que los puntos de aparición del
      // campamento no llevan NINGUNA referencia de entidad (
      // "camp fauna"), 43/128 campamentos así hoy. Antes no mostraba nada en
      // absoluto (vacío silencioso, ver openCampFiche); ahora una nota
      // honesta de estado dinámico.
      campFaunaUnknownNote: 'Las criaturas concretas de este campamento no están registradas en los datos del cliente — aparecen de forma dinámica por el servidor.',
      // Sección "Objetos de misión" de la ficha de monstruo (seguimiento del
      // vínculo monstruo<->objeto de misión, tarea 1/4): lista questDrops[]
      // horneado en la compilación -- solo enlaces producidos por el
      // resolutor, sección ausente si está vacía (nunca un bloque vacío
      // fabricado).
      monsterQuestItemsTitle: 'Objetos de misión',
      familyMonstersTitle: n => `Monstruos de esta familia (${n})`,
      // Ficha de FAMILIA de monstruos (#82 chunk (e), fiches.js
      // openFamilyFiche): página lateral de una familia (Wolf/Imp/Spider…) —
      // sus especies, rango de nivel y las misiones dirigidas a todo el grupo.
      // El NOMBRE de familia es un token de juego en bruto (GLOSSARY-PENDING
      // #86), nunca traducido; solo se localiza este texto de interfaz.
      familyFicheKind: 'Familia de monstruos',
      familyMembersTitle: n => `Especies (${n})`,
      familyQuestsN: n => `Misiones para esta familia (${n})`,
      // Ficha de familia = LA página de bestiario (árbol Opción A+, 2026-07-14):
      // secciones por subRole (tags oficiales del cliente — tokens en bruto,
      // nunca una traducción inventada) + cajón «otros miembros» + nota de
      // procedencia oficial; familyTypesTitle = tooltip de la línea
      // tipos/colores por miembro.
      familyMembersOther: n => `Otros miembros (${n})`,
      familyOfficialTagsNote: 'Tag oficial del cliente (Boss/Servant/Witch…) — leído tal cual de los datos del juego, nunca inventado.',
      familyTypesTitle: 'Tipos/aspectos y colores oficiales de esta especie (tags del cliente; los colores siguen el nivel de los spawns).',
      // Ficha de especie de fauna (wildlife_species.bin, fiches.js
      // openWildlifeFiche): una página real de un animal — nombre + familia +
      // método de despiece + su botín. «Dónde encontrarlos» es HONESTO: una
      // especie ligada a un campamento (pavo/conejo/…) usa el punto de especie
      // de su cabecera; una especie sin campamento (tortugas/vaca/…) no tiene
      // punto preciso, solo el conjunto genérico «Animales pacíficos» — ofrecido
      // como interruptor, nunca un punto concreto presentado como el animal.
      wildlifeFicheKind: 'Fauna',
      wildlifeVariants: list => `Variantes: ${list}`,
      wildlifeWhereTitle: 'Dónde encontrarlos',
      wildlifeCampedNote: (n, p) => `Aparece en ${n} campamento${n === 1 ? '' : 's'} (${p} puntos en este mapa) — usa el punto junto al título para mostrarlos.`,
      wildlifePeacefulNote: 'No se conoce ninguna posición por especie: esta especie aparece entre los animales pacíficos. Muestra esas zonas de aparición:',
      wildlifeNoZonesNote: 'No se conocen zonas de aparición en este mapa.',
      abilityLabel: 'Habilidad',
      // EntityRef (◇, js/mapref.js — ola 0): frases a11y/title de los dos
      // objetivos de clic (punto = mostrar/ocultar, etiqueta = abrir la
      // ficha). Ver  §1.3.
      refDrawShow: name => `Mostrar ${name} en el mapa`,
      refDrawHide: name => `Ocultar ${name} del mapa`,
      refOpenLabel: name => `Abrir ${name}`,
      harvestTitle: 'Recolección',
      noHarvestCatalogued: 'No hay botín de recolección catalogado para este monstruo.',
      // Ficha de referencia «nodo de recolección» (#81, site/data/<lang>/
      // nodes.bin) -- nombre + nivel + profesión + sus propias filas de
      // botín (lootRowsHtml).
      nodeFicheKind: 'Nodo de recolección',
      nodeTierTip: t => `Nivel de recolección ${t}`,
      // generic:true (9/30 tipos de nodo): no existe localización en el
      // juego para este registro interno -- nota honesta al estilo
      // state-chip, nunca un nombre localizado inventado.
      nodeGenericNote: 'Nombre interno — no existe localización en el juego para este tipo de nodo.',
      harvestedOnTitle: 'Recolectado en',
      // ── E′c-5 · bloque de obtención + temporizadores de cofre + alias ──
      obtainDropsTitle: 'Botín',
      chestTimersTitle: 'Interacción',
      chestRegenLabel: 'Reaparición del botín',
      chestPickupRadiusLabel: 'Radio de recogida',
      chestBreakTimeLabel: 'Tiempo para romper',
      chestKarmaLabel: 'Al abrir',
      chestKarmaYes: 'Otorga karma',
      chestTimersAbsentNote: 'No hay ningún tiempo de interacción registrado en los datos del cliente para este cofre.',
      unitMinutesApprox: n => `~${n} min`,
      unitSeconds: n => `${n} s`,
      unitMeters: n => `${n} m`,
      nodeAliasesLabel: names => `También conocido como: ${names}`,
      statsTitle: 'Estadísticas',
      // Info-bulle del badge « real » ( finding #1): distingue un
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
      bossHpBadge: 'jefe',
      bossBaseHpLabel: 'PV base',
      bossLiveHpLabel: 'PV reales (est.)',
      bossDifficultyNote: 'Este jefe tiene su propio PV base (de los datos del juego). PV reales = base × un multiplicador de dificultad del servidor — unos 9-10× a nivel 20 (p. ej. un jefe de mazmorra ≈ 226 000). El multiplicador exacto lo asigna el servidor: es una estimación, nunca un total real fijo.',
      computedStatsBadge: 'calculado (fórmula del juego)',
      statsPerTierNote: 'Nivel de dificultad asignado en el servidor — rango según el nivel (fácil → jefe).',
      // Advertencia honesta sobre las columnas Élite/Jefe ( finding
      // #2): a diferencia de fácil/medio/difícil, estos 2 niveles nunca se
      // verificaron contra una fuente externa — la cifra comunitaria de
      // "~350.000 HP" para un jefe de nivel 20 no se reproduce con ningún dato
      // del cliente, y un jefe nombrado real puede superar ampliamente este
      // rango genérico (ver el badge « real » cuando esté disponible).
      statsBossEliteCaveat: 'Columnas « Élite »/« Jefe »: valores genéricos estimados, no confirmados en el juego — algunos jefes nombrados reales son mucho más resistentes (ver el badge « real » cuando exista un registro dedicado para ese monstruo).',
      // (bestiaryMapFilterLabel/bestiaryMapEmpty retiradas 2026-07-11 con la
      // sección lateral "Bestiario" -- ver bestiaryZonesN más arriba.)
      alwaysGrantedTitle: 'Siempre otorgado',
      choiceGroupTitle: n => `Elección ${n}`,
      orWord: ' o ',
      xpAbbrev: n => `${n} XP`,
      weaponXpAbbrev: n => `${n} XP de arma`,
      goldAbbrev: n => `${n} de oro`,
      // Selector de rareza (variantes con el mismo nombre, ver js/rarity.js)
      // + pista de búsqueda «N rarezas» en el resultado agrupado.
      rarityVariantsLabel: 'Rareza',
      rarityVariantsCount: n => `${n} rarezas`,
      // Selector de nivel/variante de monstruo (task #80 — una ESPECIE
      // agrupa todos sus niveles/reskins, ver js/fiches.js
      // speciesVariantSpawns) + pista de búsqueda «N variantes» en el
      // resultado agrupado, mismo idioma que rarityVariantsCount arriba.
      monsterVariantsLabel: 'Nivel',
      monsterVariantsCount: n => `${n} variantes`,
      // Recuento de claves brutas/cosméticas plegadas en UN grupo (nombre,
      // nivel) (task #80, pulido — antes en línea en kindLine vía
      // variantsNote arriba; movido a su propia línea silenciada bajo el
      // selector de variante, provenance técnica, no un hecho de juego).
      rawRecordsNote: n => `${n} registros brutos`,
      // Contenido de prueba (feature #13, isTest:true oculto por defecto):
      // etiqueta de revelación al fondo del panel + insignia mostrada donde
      // sea que aparezca contenido revelado (ficha, píldora de variante,
      // bestiario, búsqueda).
      devContentTag: n => `Contenido de prueba (${n})`,
      devBadge: 'Prueba',
      // Taxonomía de 3 estados "no lo sabemos" (,
      // tarea #67): un único componente `.state-chip` + vocabulario corto
      // para cada rincón del sitio que explica honestamente una incertidumbre
      // (posición, botín, stock del vendedor, escalado de rareza/nivel,
      // residuo de objetivo de misión sin resolver…) en vez de los ~6
      // idiomas artesanales que ya existían. "dev" reutiliza devBadge de
      // arriba como etiqueta (esta clave solo añade el tooltip que faltaba)
      // — dynamic/unknown son las dos únicas etiquetas realmente nuevas. Ver
      // stateChip() en js/fiches.js.
      devBadgeTitle: 'Contenido inacabado o de prueba que el juego incluye pero nunca usa.',
      stateUnknownTitle: 'No se puede determinar a partir de los datos del cliente extraídos.',
      // 4º estado (task #80, monsterStatsSection): un bloque de estadísticas
      // REAL (registro hermano m_abs_*, compartido por todos los niveles de
      // un grupo degradado) — nunca la lectura PROPIA del monstruo, nunca la
      // insignia "real" de arriba, pero siempre bytes reales del cliente, a
      // diferencia del rango genérico estimado.
      stateFixed: 'lectura fija',
      stateFixedTitle: 'Lectura fija (arena/CBT) — independiente del nivel, no confirmada en el juego.',
      // Línea de procedencia plegable bajo el rango por nivel (formula_range +
      // statsFixedReading, task #80): el resumen muestra el número más
      // elocuente (salud), el detalle la fuente + el rango de niveles que
      // cubre. Nunca mostrado como las estadísticas PROPIAS de este monstruo.
      statsFixedProvenanceLine: (label, value) => `Lectura fija: ${label} ${value} — no correlacionada con el nivel`,
      statsFixedProvenanceDetail: (src, cbt, lvlText) => `Fuente: ${src}${cbt ? ' (CBT)' : ''} · niveles ${lvlText}`,
      // Rangos de tirada / DPS de arma / fórmulas / escalado de runas y chips
      // (stat_ranges, weapon_dps, artifact_formula/formula, rarity_scaling,
      // tier_scaling) -- nuevo, ver  +
      // , tmp/convergence/ #8/#9/#10.
      rollRangeTitle: 'Rango de tirada',
      weaponDpsTitle: 'DPS del arma',
      weaponDpsDerived: 'DPS (calculado)',
      // Agrupación principal/secundaria (auditoría data-accuracy,  #1):
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
      // Reformulado ( §2 re-check #2, tarea #67): la
      // antigua frase "(probablemente gestionado en el servidor)" afirmaba
      // una causa concreta NO PROBADA —  por sí mismo no puede
      // determinar si es escalado del lado del servidor u otra regla del
      // juego (p. ej. una regla ligada al número de ranuras de talento).
      // Neutro ahora, y envuelto en una pastilla de estado "unknown" por su
      // llamador (formulaHtml) en vez de un simple párrafo .hint.
      scalingServerSide: 'No varía con la rareza en los datos del cliente, por un motivo que no se puede determinar a partir de lo extraído.',
      scalingNotLocated: 'Escalado no localizado en los datos del cliente.',
      tierNotRarity: 'Escala por NIVEL (tier), no por rareza.',
      // Escalado 0x62 de runas (base + overclock) + prefijos de calidad de
      // tirada de artefactos -- 
      overclockScalingTitle: 'Escalado overclock',
      overclockNote: 'Valores mejorados (overclock), por rareza de runa.',
      overclockServerSide: 'Esta runa tiene una variante overclock, pero su valor no se guarda en el cliente — no se puede mostrar un número exacto.',
      abilityRarityScalingTitle: 'Escalado por rareza',
      rollQualityTitle: 'Calidad de tirada',
      rollQualityIntro: 'Una tirada más alta otorga un prefijo al nombre: una estadística en el rango 33–66 % de su intervalo hace el artefacto «Mejorado» (Tec) / «Fuerte» (Magia); por encima del 66 %, «Reforzado» / «Poderoso».',
      rollQualityBand3366: 'Mejorado / Fuerte (33–66 %)',
      rollQualityBandMore66: 'Reforzado / Poderoso (>66 %)',
      useEffectTitle: 'Efecto de uso',
      effectVarRuntimeTooltip: 'Calculado en vivo en el juego (no es un valor fijo)',
      effectVarUnextractedTooltip: 'Valor aún no extraído de los datos del cliente',
      effectVarBaseTooltip: 'Valor para un personaje base — escala con tus estadísticas',
      effectVarFormulaTooltip: 'Depende de tus estadísticas (se muestra la fórmula decodificada)',
      // Líneas de efecto de runas/chips (effect-lines pass, 2026-07-11).
      effectLinesTitle: 'Efecto y variantes',
      enhancementEffectTitle: 'Efecto de mejora',
      variantBase: 'Base',
      variantUpgraded: 'Mejorada',
      variantOverclocked: 'Overclockeada',
      variantTierT1: 'Nivel T1',
      variantTierT2: 'Nivel T2',
      variantTierT3: 'Nivel T3',
      variantServerSide: 'Esta variante existe en los datos del juego, pero sus magnitudes se almacenan en el servidor — no se pueden mostrar números exactos.',
      effectVarPerRarityTooltip: 'Valor decodificado por rareza (Común / Poco común / Rara / Épica)',
      // ── Vocabulario canónico (blueprint §4 — SCAFFOLDING E′c-0) ───────────
      // Claves NUEVAS que consumen las oleadas posteriores; los puntos de uso NO
      // se reconectan aquí. Resuelven las colisiones §4.1 (región ≠ confianza de
      // posición, campamento de botín en vez de «searchable», accesorio de misión
      // ≠ objeto de misión, tipo de decoración ≠ familia, crónica ≠ lugar, objeto
      // reactivo, «área» nunca «zona»).
      regionFicheKind: 'Región',
      // ── ContentsBlock de la ficha de región (oleada E'c-R) — títulos de
      // sección + recuentos honestos. regionObj* = familias de objects.byFamily.
      regionCampsTitle: 'Campamentos',
      regionCampsCount: n => `${n} campamento${n > 1 ? 's' : ''} catalogado${n > 1 ? 's' : ''} aquí`,
      regionMonstersTitle: 'Monstruos',
      regionWildlifeTitle: 'Fauna',
      regionObjectsTitle: 'Objetos',
      regionObjectsCount: n => `${n} objeto${n > 1 ? 's' : ''} colocado${n > 1 ? 's' : ''} aquí`,
      regionQuestsTitle: 'Misiones',
      regionGiversTitle: 'Dan misiones aquí',
      regionGoalsHere: n => `${n} ${n > 1 ? 'misiones tienen' : 'misión tiene'} un objetivo en esta región`,
      regionUnresolvedN: n => `+${n} más, especie sin identificar`,
      regionProbableTitle: 'Aparición conjunta probable',
      regionDistinctFamTitle: 'Familias distintivas (alto nivel)',
      regionDistinctFamHint: 'Familias presentes aquí que solo aparecen en bandas de alto nivel (16-20).',
      regionDistinctFamDerivedNote: 'La banda de botín es oficial; la afinidad regional se deriva de la ubicación de los campamentos × banda.',
      regionNone: 'Nada catalogado aquí.',
      regionEmpty: 'Aún no hay nada catalogado en esta región.',
      regionObjChest: 'Cofres',
      regionObjCraftBench: 'Mesas de trabajo',
      regionObjQuestObject: 'Objetos de misión',
      regionObjReactive: 'Interactivos',
      regionObjShrine: 'Santuarios',
      regionObjDestroyable: 'Destructibles',
      regionObjUnresolved: 'Otros objetos',
      // Fichas Build (opt L3, blueprint §1.2/§7 E'c-8 — talento/
      // especialización/profesión, solo búsqueda + ficha, sin mapa, ver
      // fiches/build.js).
      talentFicheKind: 'Talento',
      specFicheKind: 'Especialización',
      professionFicheKind: 'Profesión',
      professionTiersTitle: 'Niveles',
      professionItemsTitle: n => `Objetos (${n})`,
    },
    cat: {
      npc: 'PNJ', poi: 'Puntos de interés', quest: 'Misiones',
      qao: 'Objetos de misión', workshop: 'Talleres',
      // Recategorización de contenedores: la antigua capa única "Cofres"
      // (chest) se elimina, reemplazada por estas 2 capas reales — ver
      //  §1/§3.1 y js/config.js CATS.
      searchable_chest: 'Cofres registrables', camp_chest: 'Cofres de campamento',
    },
    rarity: { Common: 'Común', Uncommon: 'Poco común', Rare: 'Raro', Epic: 'Épico', Legendary: 'Legendario' },
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
      searchable_chest: 'Cofre registrable', recipe: 'Receta', node: 'Nodo de recolección',
      // Fila de FAMILIA (mission "search activation" 2026-07-11): NO es un
      // monstruo preciso — un filtro de árbol (2.º peldaño de la escala de
      // precisión, ). Distingue visualmente la fila "Familia
      // Wolf" (chip "Familia" + etiqueta "Wolf") de una fila de especie
      // "Monstruo" (chip "Monstruo" + etiqueta "Wolf Alpha").
      family: 'Familia',
      // Build (E'c-8, opt L3): filas de búsqueda talento/especialización/profesión.
      talent: 'Talento', specialization: 'Especialización', profession: 'Profesión',
    },
    // EntityRef (◇): palabras de kind no cubiertas por searchCat (tabla de
    // botín / posición / jugadores PvP) — solo singular, nunca una
    // categoría. Ver js/mapref.js + en.js para la doc completa.
    refKind: {
      loot: 'Tabla de botín', position: 'Posición', players: 'Jugadores',
    },
    // EntityRef: etiquetas genéricas degradadas (spec §6.3, conjunto
    // CERRADO) — nunca la clave interna, nunca lore inventado.
    refGeneric: {
      position: 'Posición de misión', object: 'Objeto de misión',
      area: 'Área de misión', target: 'Objetivo',
    },
    // Taxonomía de talentos (E'c-8, blueprint §1.2 opt L3) — tokens `system`/
    // `subtype` de talents.bin (5 + 9 valores, la forma REAL enviada — sin
    // campo de nivel/posición de árbol separado, ver fiches/build.js).
    talentSystem: {
      unclassified: 'Sin clasificar', class_spec: 'Especialización de clase',
      weapon_mastery: 'Maestría de arma', universal: 'Universal',
      artifact_chip: 'Chip de artefacto',
    },
    talentSubtype: {
      ui_or_misc: 'Interfaz / varios', grid_transition: 'Nodo de cuadrícula', ability: 'Habilidad',
      ability_variant: 'Variante de habilidad', base: 'Base', proc: 'Proc',
      artifact: 'Artefacto', other: 'Otro', chip: 'Chip',
    },
    // ── Insignia de honestidad — el ÚNICO vocabulario cerrado (blueprint §5.2) ─
    // SCAFFOLDING E′c-0: el conjunto cerrado Badge en 3 ejes ortogonales
    // (procedencia × precisión × contenido) + 3 valores tipados. Las oleadas
    // posteriores pliegan aquí .state-chip / escala de posición / .stats-badge /
    // .effect-var-*; la prosa vive en los tooltips *Tip. tbl('badge', <clave>).
    badge: {
      // Eje de procedencia — de dónde viene un dato
      provOfficial: 'Oficial',
      provOfficialTip: 'Leído directamente del cliente del juego.',
      provDerived: 'Derivado',
      provDerivedTip: 'Calculado a partir de valores oficiales (geometría o aritmética).',
      provInferred: 'Inferido',
      provInferredTip: 'Emparejado de forma heurística (por nombre, proximidad o texto): probable, no seguro.',
      provAbsent: 'Ausente',
      provAbsentTip: 'Honestamente ausente de los datos extraídos.',
      // Eje de precisión — cuán exacta es una posición
      precPinned: 'Exacto',
      precPinnedTip: 'Coordenadas exactas.',
      precArea: 'Área',
      precAreaTip: 'Aproximado: una región o zona, no un punto exacto.',
      precViaChain: 'Por cadena',
      precViaChainTip: 'Se localiza a través de la capa vinculada (su aparición o colocación).',
      precUnlocated: 'Sin ubicar',
      precUnlocatedTip: 'Sin posición en el cliente: se resuelve en el servidor o está ausente.',
      // Marca de contenido (ortogonal, rojo-peligro — no es procedencia del dato)
      contentDev: 'Dev',
      contentDevTip: 'Contenido de prueba o sin terminar que el juego incluye pero nunca usa.',
      // Tres valores tipados (misma familia visual, texto propio)
      valWeightShare: 'Parte de la tabla',
      valWeightShareTip: 'La parte de este objeto en la tabla, no una probabilidad por muerte.',
      valRosterServerSide: 'Lista del servidor',
      valRosterServerSideTip: 'El servidor decide qué criaturas aparecen aquí.',
      valCospawnProbable: 'Co-aparición probable',
      valCospawnProbableTip: 'Asociado por tipo: probable, no garantizado.',
    },
    // Disposición de una criatura (blueprint §3.3 DispositionBadge): actitud
    // hacia el jugador — una CLASIFICACIÓN de dominio (como la rareza), NO un
    // Badge de honestidad; su procedencia va al lado como badge().
    disposition: {
      peaceful: 'Pacífico', peacefulTip: 'Nunca ataca — ignora al jugador.',
      neutral: 'Neutral', neutralTip: 'Solo ataca si se le provoca.',
      hostile: 'Hostil', hostileTip: 'Ataca al jugador en cuanto lo ve.',
      other: 'Disposición', otherTip: 'Actitud hacia el jugador.',
    },
    // Colores de variante de monstruo (monsters.bin `colors` — tintes de
    // aspecto cosméticos, correlacionados con el nivel de los spawns; líneas
    // de miembro de la ficha de familia): PALABRAS de color genéricas,
    // localizables sin riesgo — no vocabulario de taxonomía del juego.
    monsterColor: {
      brown: 'Marrón', blue: 'Azul', gray: 'Gris', green: 'Verde', red: 'Rojo',
      yellow: 'Amarillo', orange: 'Naranja', white: 'Blanco', black: 'Negro',
      purple: 'Morado', pink: 'Rosa',
    },
    // Familias de decoración (chests.bin group="decor" por family, +
    // "legacy" para group="legacy_chest") — sub-filas del grupo plegable
    // "Decoración" (js/sidebar.js buildDecorGroup), ver  §3.1.
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
    // Subcategorías POI (interest_points.bin poiType — agrupación curada
    // NUESTRA de iconos, NO una taxonomía del juego, ver 
    //  §1 "poiType").
    poiType: {
      habitat: 'Viviendas', nature: 'Naturaleza', fort: 'Fortificaciones',
      curiosity: 'Curiosidades', transport: 'Transporte', profession: 'Oficios',
      amenity: 'Servicios', portal: 'Portales', other: 'Otros',
    },
    // Calificador de campamento (Isla-prisión, token del motor
    // patrol|buffed — semántica probada byte a byte: base=solo PvE,
    // patrol=única variante en PvP (0.6), buffed=solo PvP 10 %).
    campQualifier: { patrol: 'Patrulla', buffed: 'Reforzado (PvP)' },
    // Calificadores de miembro del roster (camp_details `mobs[].qualifiers[]`) —
    // marcadores de VARIANTE descriptivos (chips .roster-qual), distintos del
    // vocabulario de honestidad Badge. `summon` = miembro campSpawnUnlikely
    // (invocado por habilidad, no colocado en el campamento; latente hoy).
    rosterQual: {
      boss: 'Jefe', bossTip: 'Una variante de nivel jefe de esta criatura.',
      undead: 'No-muerto', undeadTip: 'Una variante no-muerta de esta criatura.',
      buffed: 'Reforzado', buffedTip: 'Una variante reforzada (mejorada).',
      event: 'Evento', eventTip: 'Aparece como parte de un evento especial o limitado.',
      arena: 'Arena', arenaTip: 'Una variante de arena de esta criatura.',
      affix: 'Afijo', affixTip: 'Lleva un modificador de afijo adicional.',
      summon: 'Invocación', summonTip: 'Invocado por habilidad, no colocado en el campamento — invocado en combate.',
    },
    // Modos de juego de las tablas de presencia (#93, camp_details `modes`).
    campMode: {
      PvE: 'PvE', PvP: 'PvP', SoloPvE: 'PvE individual', SoloPvP: 'PvP individual',
      SoloPvP_HC: 'PvP individual (HC)',
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
      // Tokens de despiece de la fauna (wildlife_species.bin harvestMethod):
      // tokens de motor en minúsculas, distintos de Flayer/Lumberjack de arriba.
      butchering: 'Desuello', logging: 'Tala',
    },
    statLabel: {
      health: 'Salud', attack_power: 'Poder de ataque', weapon_damage: 'Daño de arma',
      armor: 'Armadura', magic_resist: 'Resistencia mágica', accuracy: 'Precisión',
      attack_speed: 'Velocidad de ataque', movement_speed: 'Velocidad de movimiento', vision: 'Visión',
      health_regen: 'Regen. de salud', mana: 'Maná', mana_regen: 'Regen. de maná',
      xp_reward: 'XP otorgada', gold_reward: 'Oro otorgado',
      phys_crit_chance: 'Prob. de crítico físico', magic_crit_chance: 'Prob. de crítico mágico',
      // Añadido en la Fase 4 (stat_ranges/weapon_dps/fórmulas -- ver
      // tmp/convergence/ #8/#9): estadísticas de equipo y
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
