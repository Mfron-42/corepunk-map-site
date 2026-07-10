/* Dictionnaire UI — ru. Mêmes clés que les autres langues (voir js/i18n/index.js). */
import { pluralSlavic } from './langs.js';

export default {
    ui: {
      pageTitle: 'Kwalat — Карта сообщества Corepunk',
      pageDescription: 'Интерактивная карта Квалата (Corepunk): НПС, задания, мастерские, сундуки, лагеря и точки интереса.',
      panelAriaLabel: 'Легенда и фильтры',
      title: 'Карта Квалата',
      subtitle: 'Corepunk · карта сообщества',
      searchPlaceholder: 'Найти НПС, задание, предмет, монстра…',
      searchAriaLabel: 'Поиск',
      filtersAriaLabel: 'Фильтры',
      legend: 'Легенда',
      campsTitle: 'Лагеря и ресурсы',
      trackedTitle: 'Отслеживаемое',
      trackedEmptyHint: 'Закрепите маркер кнопкой «Отслеживать», чтобы найти его здесь.',
      footerNote: 'Данные извлечены из клиента игры · не связано с Artificial Core.',
      langSelectorLabel: 'Язык',
      panelToggleAriaLabel: 'Показать или скрыть панель',
      mapAriaLabel: 'Карта мира',
      loadingText: 'Съёмка местности…',
      zonesLabel: 'Зоны (регионы)',
      campLoading: 'Загрузка лагерей…',
      // Честность счётчика легенды/меню (отчёт: фильтр НПС показывал 11 на
      // Prison Island, но отрисовывается только 1 маркер): подсказка
      // скромного значка "+N" рядом с основным счётом строки фильтра
      // (js/sidebar.js hiddenBadge) — N реальных, не тестовых записей без
      // известной позиции, никогда не маркеры, которые карта молча не
      // рисует. Формулировка НАМЕРЕННО нейтральная («неизвестно», а не
      // «динамически»/«появление на стороне сервера»): классификатор
      // `pos_source`, доказывающий реальный серверный спавн, существует
      // только для 18 НПС Prison Island в data/quests.json (на стороне
      // пайплайна, уровень giver/slot) и НЕ передаётся ни в один .bin сайта
      // (ни npcs.bin, ни quests.bin) — утверждение «на стороне сервера» для
      // всего набора было бы преувеличением для остальных, просто не
      // классифицированных (см.  unknown_states_DESIGN.md §2
      // re-check #1).
      filterHiddenTooltip: n => `${n} без известной позиции`,
      decorFamiliesTitle: 'Категории декора',
      chestTypesAllBtn: 'Все',
      chestTypesNoneBtn: 'Нет',
      // Реорганизация контейнеров (DATA_CONTRACT.md): 2 реальных слоя
      // сундуков + группа "Декор" (legacy_chest/decor по категории).
      decorGroupLabel: 'Декор',
      campChestLabel: 'Лагерный сундук',
      legacyChestLabel: 'Устаревший сундук с сокровищами',
      lootGenericNote: 'Общая добыча: единственная известная связь добычи этого контейнера — широкий обыскиваемый пул, а не выделенная таблица добычи — это не целевой фармящийся сундук.',
      searchableChestTitle: 'Обыскиваемый сундук',
      searchableChestRarityNote: 'Случайная редкость: уровень (обычный/редкий/эпический…) определяется сервером в момент появления — не выводится из данных клиента.',
      noResults: 'Нет результатов.',
      noResultsHint: 'Попробуйте более короткое слово или проверьте написание.',
      searchBodyHintPrefix: '› цель: ',
      trackBtn: 'Отслеживать',
      trackedBtn: 'Отслеживается ✓',
      doneBtn: 'Готово',
      doneBtnActive: 'Готово ✓',
      removeBtn: 'Убрать',
      ficheBtn: 'Карточка',
      ficheShopBtn: 'Карточка · Магазин',
      loreEntryTitle: 'Бестиарий',
      lootTableKind: 'Таблица добычи',
      priceTitle: 'Цена',
      hideHighlightBtn: 'Скрыть точки',
      stockFilterPlaceholder: 'Фильтр списка…',
      rewardTablesN: n => `Наградные таблицы (${n})`,
      questCountSuffix: n => ` · ${n} ${pluralSlavic(n, 'задание', 'задания', 'заданий')}`,
      highlightPointsBtn: n => `Подсветить точки (${n})`,
      dataGeneratedAt: date => `Данные от ${date}`,
      questMapsLine: names => `Карты: ${names}`,
      bestiaryTitle: 'Бестиарий',
      bestiaryLoading: 'Загрузка бестиария…',
      bestiaryZonesN: n => `${n} ${pluralSlavic(n, 'зона', 'зоны', 'зон')}`,
      lootTableItemsN: n => `Содержимое (${n})`,
      probableLootTitle: 'Вероятная добыча',
      probableLootNote: name => `Таблица «${name}» сопоставлена по типу контейнера — проверьте в игре.`,
      questCat: 'Задание',
      givenBySuffix: name => ` · квестодатель: ${name}`,
      givenByPlain: name => `квестодатель: ${name}`,
      ficheCompleteBtn: 'Полная карточка',
      campLabel: 'Лагерь',
      pointsHereSuffix: n => ` · ${n} точек здесь`,
      spawnsTotal: n => `${n} спавнов всего`,
      campFicheBtn: 'Карточка лагеря',
      levelAbbrev: lvl => `ур. ${lvl}`,
      spawnPointsCount: n => `${n} точек спавна`,
      viewOnMapBtn: 'Смотреть на карте',
      likelyMonsters: n => `Вероятные монстры (${n})`,
      guaranteedLabel: 'Гарантировано',
      chanceLabel: 'Шанс',
      // ПРИБЛИЗИТЕЛЬНАЯ доля (d.ch = вес / суммарный вес таблицы, см.
      // data/SCHEMA.md "chance") негарантированного дропа + честная оговорка
      // во всплывающей подсказке (title) — см. js/fiches.js dropRateHtml.
      dropChanceApprox: pct => `≈ ${pct} %`,
      dropChanceBelowOne: '< 1 %',
      dropChanceCaveat: 'Доля этого предмета в пуле добычи таблицы — не вероятность за один килл (реальное число бросков определяется сервером).',
      lootBestRates: 'Добыча (лучшие шансы)',
      mapLabel: 'Карта',
      mapSelectorLabel: 'Отображаемая карта',
      mapBadgeTitle: name => `На карте «${name}» — нажмите, чтобы перейти`,
      mapTilesOnlySuffix: '(прибл.)',
      mapGroupWorld: 'Мир',
      mapGroupExtraction: 'Эвакуация',
      mapGroupBattleground: 'Поля боя',
      mapGroupPve: 'PvE-арены',
      mapGroupPvp: 'PvP-арены',
      mapGroupOther: 'Прочее',
      // «позиция неизвестна» под запретом сайта (см. data/SCHEMA.md "search_zone"):
      // это общее обозначение остаётся только для строк без цели квеста
      // (ПНЖ/объект/торговец без найденной позиции) — сами цели заданий
      // используют posDynamic/posDynamicZone/posUncatalogued ниже.
      posUnknown: 'позиция не указана',
      posDynamic: 'Динамическая позиция',
      posDynamicZone: 'Зона спавна',
      // Средняя уверенность (пакетная доработка, только близость — см.
      //  zone_confidence): формулировка отличается от
      // posDynamicZone выше — соседний лагерь не доказывает, что предмет
      // реально там появляется, никогда не подаётся с той же уверенностью,
      // что и зона с подтверждением.
      posEstimatedZone: 'Примерная область',
      posUncatalogued: 'Позиция не каталогизирована — проверьте в игре',
      // Подпись строки результата поиска для ЗАДАНИЯ целиком без найденной
      // позиции (у выдающего/участников нет x/z — напр. задания Prison
      // Island, на отдельной карте/системе координат). Честно и отдельно от
      // posUnknown: просто нет точки на карте, кнопка карты не показана —
      // карточка задания всё равно открывается по клику.
      questNoPos: 'Нет точки на карте',
      vendorStockTitle: 'Товары торговца',
      vendorStockTitleN: n => `Товары торговца (${n})`,
      noVendorItems: 'Нет известных товаров у этого торговца.',
      npcCat: 'НПС',
      vendorSuffix: ' · Торговец',
      questsGivenN: n => `Выданные задания (${n})`,
      noQuestsForNpc: 'Нет известных заданий для этого НПС.',
      questItemBadge: 'Предмет задания',
      gameItemBadge: 'Игровой предмет',
      soldTag: 'продаётся',
      craftableTag: 'крафтится',
      lootTag: 'лут',
      activableBadge: 'Активируется',
      // Значок «Контейнер» (декодирование механизма, задача A): собственная
      // идентичность объекта у collect_from_object (t.label, напр. «Старый
      // ящик») — отличается от activableBadge выше (самодостаточный объект
      // use_object, а не контейнер, где находится ЧТО-ТО ДРУГОЕ).
      containerBadge: 'Контейнер',
      // Явная связь на карточке цели объектива (design review, июль 2026):
      // контекст см. в en.js -- никогда не интерполируется с именем (оно
      // остаётся отдельным кликабельным span, см. goalTargetChip).
      goalDroppedByLabel: 'дроп с',
      goalObtainedHereLabel: 'получено здесь',
      // «Контейнерный» аналог goalObtainedHereLabel выше, специфичный для
      // collect_from_object (декодирование механизма, задача A): используется
      // только когда известна метка контейнера (t.label) — только глагол,
      // имя идёт отдельным span сразу после, как и goalDroppedByLabel/nameSpan.
      goalFoundInLabel: 'найдено в',
      // Та же схема строки связи, пакетная доработка: предмет, выданный
      // квестодателем (given_by_giver, напр. "Time of Death" из
      // eight_legged_freaks) и предмет только для крафта (craft:true, напр.
      // имплант из construction_lesson) — ни то, ни другое не спавнится в
      // мире, поэтому ни позиции, ни зоны никогда не показывается.
      goalGivenByLabel: 'получено от',
      goalCraftLabel: 'нужно скрафтить',
      // Механизм receive_reward (декодирование механизма, задача A): предмет
      // получается за прохождение ДРУГОГО задания (geo.py reward_of), а не
      // выдаётся квестодателем этого задания — только глагол, дальше идёт
      // кликабельный span задания на каждую запись reward_of (см. rewardOfRelRow).
      goalRewardOfLabel: 'получено за прохождение',
      // Механизм harvest: узел добычи ресурсов (лесозаготовка/травничество/
      // добыча руды — target.profession, локализовано через professionLabel).
      goalHarvestLabel: profession => `добыча (${profession})`,
      // Механизм kill_collect/kill: target.drop_chance (0-100, побайтово
      // точное значение) — отличается от общего dropChanceApprox (расчётная
      // доля, здесь никогда нет "≈" — это заданный игрой процент).
      goalDropChanceLabel: pct => `(${pct} %)`,
      // Механизм kill_player: target.player_specs, объединённые через
      // heroSpecLabel (fiches.js) — единой позиции для PvP-цели не бывает.
      goalKillPlayerLabel: specs => `Победить игроков (${specs})`,
      objectivesN: n => `Цели (${n})`,
      objectivesTitle: 'Цели',
      howToTitle: 'Как выполнить',
      rewardsTitle: 'Награды',
      questItemsN: n => `Предметы задания (${n})`,
      viewGiverBtn: 'К квестодателю',
      viewZoneBtn: 'Смотреть зону',
      // Пара для средней уверенности (пакетная доработка, см. posEstimatedZone
      // выше): рисует реальные точки указанного лагеря, если активная карта
      // их загрузила, иначе — тот же примерный круг, что и viewZoneBtn, но
      // никогда с той же подписью, чтобы не путать с подтверждённой зоной.
      viewEstimatedZoneBtn: 'Смотреть примерно',
      onMapTitleN: n => `На карте (${n})`,
      dialogsN: n => `Диалоги (${n})`,
      // Значок доверия в шапке (переработка макета, июль 2026): `q.explained`
      // {goals_total, goals_resolved} приходит как есть из декодера графа
      // задания — 333 из 335 разобранных заданий сегодня объяснены
      // полностью, у 2 остаётся хотя бы одна неразрешённая цель. Никогда не
      // показывается без графа целей вовсе (диалоги-реплики и т. п.).
      questExplainedFull: 'Полностью объяснено',
      questExplainedPartial: n => `${n} ${pluralSlavic(n, 'цель', 'цели', 'целей')} под вопросом`,
      dialogueFicheKind: 'Диалог НПС',
      dialogueHeading: 'Диалог НПС (не задание)',
      dialogueNote: 'Реплики, которые говорит этот персонаж, — это не задание с целями и наградами.',
      journalShowMoreBtn: 'Показать полностью',
      journalShowLessBtn: 'Свернуть',
      relatedQuestsTitle: 'Связанные задания',
      questFicheKind: region => 'Задание' + (region ? ` · ${region}` : ''),
      dropRatesTitle: 'Шансы выпадения',
      farmSpotsTitle: 'Как фармить',
      // Переработка мест фарма (farm_spot_UX_DESIGN.md, июль 2026): строки
      // сгруппированы по типу лагеря (Добыча/Монстры/…) вместо плоского
      // списка из 24 строк — сводка в заголовке, разворачиваемое «+N», и
      // честные запасные варианты ниже (несвязанный лагерь, нет данных о
      // лагере, свёрнутый общий пул наград).
      farmGroupSummary: (camps, pts) => `${camps} лагерей · ${pts} точек`,
      farmMoreCampsN: n => `+ ${n} лагерей`,
      farmGenericPoolNote: n => `Также изредка выпадает в ${n} лагерях с общей наградой — это не целевое место фарма.`,
      farmSourcesNotMapped: 'Источники пока не привязаны к известному лагерю.',
      farmOtherSourcesTitle: 'Другие источники',
      soldByTitle: 'Продаётся у',
      obtainDuringQuestTitle: 'Как получить',
      obtainViaKill: name => `Убив ${name}`,
      obtainViaInteract: label => `Взаимодействуя с ${label}`,
      // Расширение quest_source_of, декодирование механизма, задача B
      // (harvest/reward_of/world -- given_by переиспользует ui.givenByPlain,
      // container переиспользует obtainViaInteract выше, см. build_site_data.py
      // + fiches.js openItemFiche).
      obtainViaHarvest: profession => `Добыв (${profession})`,
      // Фрагмент, а не законченная фраза -- сочетается с ui.givenByPlain как
      // «Получено от X — quest Y» (кросс-квестовый случай receive_reward, см.
      // ветку qs.via === 'reward_of' в openItemFiche).
      obtainViaRewardOfQuest: name => `задание ${name}`,
      obtainViaWorld: 'Находится по ходу этого задания',
      moreMerchants: n => `+ ${n} других торговцев`,
      merchantPosUnknown: 'Позиция торговца не указана.',
      recipeTitle: 'Рецепт',
      producesArrow: 'создаёт → ',
      usedInTitle: 'Используется в',
      rewardBadge: 'Награда',
      requiredBadge: 'Требуется',
      pingTitle: 'Пинг',
      copyLinkBtn: 'Скопировать ссылку',
      linkCopied: 'Ссылка скопирована ✓',
      locatorTitle: 'Метка',
      mapDownload9600: 'Карта 9600px',
      mapDownload4800: 'Карта 4800px',
      loadErrorPrefix: msg => `Не удалось загрузить данные (${msg})`,
      closeBtnAria: 'Закрыть',
      // Баннер «данные обновлены» (js/updatecheck.js) — токен version.json
      // изменился с момента загрузки этой вкладки (был выполнен новый
      // деплой, пока вкладка оставалась открытой). Без автоматической
      // перезагрузки — только предложение.
      dataUpdatedBanner: 'Данные обновлены — перезагрузите карту',
      dataUpdatedReloadBtn: 'Перезагрузить',
      monsterLabel: 'Монстр',
      variantsNote: n => ` · ещё ${n} ${pluralSlavic(n, 'вариант', 'варианта', 'вариантов')}`,
      monsterAbilitiesN: n => `Способности (${n})`,
      monsterCampsN: n => `Появляется в (${n})`,
      noLootCatalogued: 'Добыча для этого монстра не каталогизирована.',
      noAbilitiesKnown: 'Нет известных способностей у этого монстра.',
      noCampsKnown: 'Нет известных лагерей для этого монстра.',
      // Секция «Квестовые предметы» на карточке монстра (продолжение связи
      // монстр<->квестовый предмет, задача 1/4): список questDrops[],
      // запечённый при сборке -- только связи от резолвера, секция
      // отсутствует, если пусто (никогда не выдуманный пустой блок).
      monsterQuestItemsTitle: 'Квестовые предметы',
      familyMonstersTitle: n => `Монстры этого вида (${n})`,
      abilityLabel: 'Способность',
      harvestTitle: 'Добыча',
      noHarvestCatalogued: 'Добыча при разделке этого монстра не каталогизирована.',
      statsTitle: 'Характеристики',
      realStatsBadge: 'реальные',
      // Подсказка бейджа «реальные» (monsters.md finding #1): явно отличает
      // РЕАЛЬНЫЙ клиентский замер (запись m_abs_*/mbt_*_boss, напр. Furious
      // Woodraptor = 154 440 HP) от общей оценочной фурчетки по уровням ниже.
      realStatsTooltip: 'Реальные значения (клиент) — считаны напрямую из данных игры для этого конкретного монстра, а не оценка по уровню сложности.',
      // Честная пометка для мобов БЕЗ реального клиентского замера
      // (statsSource !== "record"): реверс-инжиниринг показал, что старая
      // "оценочная" таблица читала не то поле (~в 640 раз заниженное значение,
      // напр. босс 20 ур. показывал ~544 HP при реальном серверном значении
      // ~350 000) — этот выдуманный номер убран, вместо него — честное
      // признание. См. js/fiches.js monsterStatsSection.
      statsServerNote: 'Точные характеристики определяются на сервере (недоступны в данных клиента).',
      computedStatsBadge: 'расчёт (формула игры)',
      statsPerTierNote: 'Уровень сложности назначается на сервере — диапазон по уровням (лёгкий → босс).',
      // Честная оговорка для колонок Элита/Босс (monsters.md finding #2): в
      // отличие от лёгкий/средний/тяжёлый, эти 2 уровня НИКОГДА не проверялись
      // по внешнему источнику — цифра сообщества "~350 000 HP" для босса
      // 20 уровня не воспроизводится ни на каких клиентских данных, а
      // реальный именной босс может значительно превышать эту общую
      // фурчетку (см. бейдж «реальные», если он доступен).
      statsBossEliteCaveat: 'Колонки «Элита»/«Босс»: общие оценочные значения, не подтверждённые в игре — некоторые реальные именные боссы намного крепче (см. бейдж «реальные», если для этого монстра есть отдельная запись).',
      bestiaryMapFilterLabel: map => `На этой карте (${map})`,
      bestiaryMapEmpty: 'На этой карте нет монстров. Снимите галочку, чтобы показать всех.',
      alwaysGrantedTitle: 'Выдаётся всегда',
      choiceGroupTitle: n => `Выбор ${n}`,
      orWord: ' или ',
      xpAbbrev: n => `${n} XP`,
      goldAbbrev: n => `${n} золота`,
      // Селектор редкости (одноимённые варианты, см. js/rarity.js) +
      // подсказка поиска «N редкостей» на сгруппированном результате.
      rarityVariantsLabel: 'Редкость',
      rarityVariantsCount: n => { const m = n % 100, u = n % 10; const w = (u === 1 && m !== 11) ? 'редкость' : (u >= 2 && u <= 4 && (m < 12 || m > 14)) ? 'редкости' : 'редкостей'; return `${n} ${w}`; },
      // Селектор уровня/варианта монстра (feature #12 — модель объединяет все
      // уровни/скины одного существа, см. js/fiches.js monsterModelVariants)
      // + подсказка поиска «N вариантов» на сгруппированном результате, тот
      // же принцип, что и rarityVariantsCount выше.
      monsterVariantsLabel: 'Уровень',
      monsterVariantsCount: n => `${n} ${pluralSlavic(n, 'вариант', 'варианта', 'вариантов')}`,
      // Тестовый контент (feature #13, isTest:true скрыт по умолчанию): тег
      // раскрытия внизу панели + значок на любом раскрытом контенте (карточка,
      // пастилька варианта, бестиарий, поиск).
      devContentTag: n => `Тестовый контент (${n})`,
      devBadge: 'Тест',
      // Диапазоны характеристик / DPS оружия / формулы / масштабирование рун
      // и чипов (stat_ranges, weapon_dps, artifact_formula/formula,
      // rarity_scaling, tier_scaling) -- новое, см.
      //  + ,
      // tmp/convergence/port_map.md #8/#9/#10.
      rollRangeTitle: 'Диапазон значений',
      weaponDpsTitle: 'DPS оружия',
      weaponDpsDerived: 'DPS (расчётный)',
      // Группировка основная/дополнительные (аудит точности данных, items.md #1):
      // у артефакта есть 1 гарантированная ОСНОВНАЯ характеристика + ограниченное
      // число ДОПОЛНИТЕЛЬНЫХ характеристик из общего пула -- никогда все сразу.
      rollMainStatTitle: 'Основная характеристика (гарантирована)',
      rollSecondaryStatsTitle: 'Дополнительные характеристики (пул)',
      rollSecondaryHintN: (n, pool) => `До ${n} из этих ${pool} характеристик реально выпадают на предмете (общий пул) — не все сразу.`,
      rollSecondaryHint: 'Ограниченное число этих характеристик реально выпадает на предмете (общий пул) — не все сразу.',
      formulaTitle: 'Формула',
      formulaRankLabel: n => `Ранг ${n}`,
      formulaPartialNote: 'Часть этой строки зависит от нерасшифрованной ссылки движка.',
      rarityScalingTitle: 'Масштабирование по редкости',
      tierScalingTitle: 'Масштабирование по уровню',
      scalingServerSide: 'Не меняется в зависимости от редкости в данных клиента (вероятно, обрабатывается на сервере).',
      scalingNotLocated: 'Масштабирование не найдено в данных клиента.',
      tierNotRarity: 'Масштабируется по УРОВНЮ (тиру), а не по редкости.',
      useEffectTitle: 'Эффект использования',
      effectVarRuntimeTooltip: 'Вычисляется в реальном времени в игре (не фиксированное значение)',
      effectVarUnextractedTooltip: 'Значение ещё не извлечено из данных клиента',
      effectVarBaseTooltip: 'Значение для базового персонажа — растёт с вашими характеристиками',
      effectVarFormulaTooltip: 'Зависит от ваших характеристик (показана декодированная формула)',
    },
    cat: {
      npc: 'НПС', poi: 'Точки интереса', quest: 'Задания',
      qao: 'Объекты заданий', workshop: 'Мастерские',
      // Реорганизация контейнеров: старый единый слой "Сундуки" (chest)
      // убран, заменён этими 2 реальными слоями — см. DATA_CONTRACT.md
      // §1/§3.1 и js/config.js CATS.
      searchable_chest: 'Обыскиваемые сундуки', camp_chest: 'Лагерные сундуки',
    },
    rarity: { Common: 'Обычное', Uncommon: 'Необычное', Rare: 'Редкое', Epic: 'Эпическое' },
    kind: { npc: 'НПС', object: 'Объект', item: 'Предмет', other: '—' },
    itemKind: {
      weapon: 'Оружие', resource: 'Ресурс', rune: 'Руна', consumable: 'Расходники',
      artifact: 'Артефакт', chip: 'Чип', synthesis: 'Синтез',
      quest_item: 'Предмет задания', recipe: 'Рецепт', item: 'Предмет',
    },
    weaponType: {
      Gun: 'Пистолет', Sword: 'Меч', Shield: 'Щит', Dagger: 'Кинжал',
      Bow: 'Лук', Knuckle: 'Кастеты', Spear: 'Копьё',
    },
    useType: {
      OneHanded: 'Одноручное', TwoHanded: 'Двуручное',
      OneHandedLeft: 'Одноручное (левое)', OneHandedRight: 'Одноручное (правое)',
    },
    weaponClass: { Bomber: 'Bomber', Champion: 'Champion', Warmonger: 'Warmonger' },
    action: {
      kill: 'Уничтожить', collect: 'Собрать', use: 'Использовать', talk: 'Поговорить с',
      goto: 'Отправиться к', deliver: 'Доставить', custom: 'Сделать',
      repair: 'Починить', craft: 'Создать', mix: 'Смешать',
    },
    searchCat: {
      npc: 'НПС', poi: 'Место', quest: 'Задание', qao: 'Объект',
      workshop: 'Мастерская', camp: 'Лагерь', item: 'Предмет',
      monster: 'Монстр', zone: 'Регион', location: 'Место',
      ability: 'Способность', event: 'Событие', chest: 'Сундук',
      searchable_chest: 'Обыскиваемый сундук',
    },
    // Категории декора (chests.bin group="decor" по family, + "legacy" для
    // group="legacy_chest") — подстроки сворачиваемой группы "Декор"
    // (js/sidebar.js buildDecorGroup), см. DATA_CONTRACT.md §3.1.
    decorFamily: {
      barrel: 'Бочки', boxes: 'Ящики', furniture: 'Мебель',
      corpse: 'Трупы', books: 'Книги', misc: 'Разное', legacy: 'Устаревший сундук',
    },
    // "searchable" и "quest" переформулированы, чтобы не читаться как
    // верхнеуровневые статичные слои (cat.chest "Сундуки" / cat.quest
    // "Задания"): это строки ФИЛЬТРА лагерей (динамические спавны /
    // обыскиваемые контейнеры), а не те же слои — см. campType.chests ниже
    // про такую же правку подписи подтипа "Сундуки — <регион>".
    campKind: {
      monsters: 'Монстры', creeps: 'Крипы', herbalism: 'Травничество',
      logging: 'Лесозаготовка', mining: 'Горное дело', searchable: 'Обыскиваемые',
      destroyable: 'Разрушаемые', reactive: 'Интерактивные', shrines: 'Святилища',
      soulkeeper: 'Хранители душ', quest: 'Спавны заданий', wildlife: 'Дикие животные',
      guards: 'Стражи', event: 'Событие', other: 'Другое',
    },
    mapName: {
      Kwalat: 'Квалат',
      Extraction_Island_large: 'Тюремный остров',
      Extraction_Island_small: 'Тюремный остров (малый)',
    },
    monsterAttack: { Melee: 'Ближний бой', Range: 'Дальний бой', Ranged: 'Дальний бой', Axe: 'Топор' },
    locationKind: {
      town: 'Город', poi: 'Точка интереса', mob: 'Бестиарий', dungeon_boss: 'Босс подземелья',
      gathering: 'Ресурс', portal: 'Портал', shrine: 'Святилище',
    },
    campType: {
      barrels: 'Взрывающиеся бочки', tombstones: 'Надгробия', coffins: 'Гробы',
      chests: 'Обыскиваемые сундуки', corpses: 'Обыскиваемые трупы', sacks: 'Мешки',
      crateCorn: 'Ящик кукурузы', crateCabbage: 'Ящик капусты', crateCarrot: 'Ящик моркови',
      crateOnion: 'Ящик лука', crateEggplant: 'Ящик баклажанов', crateBerries: 'Ящик ягод',
      sackCorn: 'Мешок кукурузы', sackWheat: 'Мешок пшеницы',
      mushrooms: 'Грибы', bottles: 'Бутылки', pots: 'Горшки',
      wooden: 'Деревянные объекты', leafTrash: 'Кучи листьев',
      vegetables: 'Овощи', urban: 'Городские объекты',
    },
    chestType: {
      Backpack: 'Рюкзак', Barrel: 'Бочка', Bathroom: 'Ванная', Bedroom: 'Спальня',
      Boiler: 'Котёл', Books: 'Книги', Boxes: 'Ящики', Cabinet: 'Шкафчик', Chest: 'Сундук',
      Closed: 'Закрытый', Corpse: 'Труп', Fridge: 'Холодильник', Guest: 'Гостевая комната',
      Kitchen: 'Кухня', Papers: 'Бумаги', Rest: 'Отдых', Shelf: 'Полка', Truck: 'Грузовик',
      Wardrobe: 'Гардероб', Warehouse: 'Склад',
    },
    activableType: {
      Ancient: 'Древний', Artifact: 'Артефакт', Barrel: 'Бочка', Bart: 'Барт', Beehive: 'Улей',
      Black: 'Чёрный', Blade: 'Клинок', Bloody: 'Кровавый', Blue: 'Синий', Broken: 'Сломанный',
      Building: 'Здание', Captains: 'Капитанский', Cell: 'Камера', Chain: 'Цепь',
      Chainsaw: 'Бензопила', Charging: 'Зарядка', Cigarette: 'Сигарета', Container: 'Контейнер',
      Crush: 'Давилка', Data: 'Данные', Deed: 'Документ на собственность', Diamond: 'Алмаз',
      Document: 'Документ', Door: 'Дверь', Dream: 'Мечта', Drip: 'Капельница', Dwarf: 'Гном',
      East: 'Восток', Empty: 'Пустой', Energydrink: 'Энергетик', Enter: 'Вход',
      Evidence: 'Улика', Explosive: 'Взрывчатка', Felixs: 'Феликс', Fire: 'Огонь', Fishing: 'Рыбалка',
      Free: 'Свободный', Gasoline: 'Бензин', Gift: 'Подарок', Glass: 'Стекло', Green: 'Зелёный',
      Handle: 'Рукоять', Hiding: 'Тайник', Ingredient: 'Ингредиент', Iron: 'Железо',
      Isopropyl: 'Изопропил', Item: 'Предмет', Jahri: 'Джахри', Kegs: 'Бочонки', Light: 'Свет',
      'Lock/Key': 'Замок/Ключ', Machine: 'Машина', Mask: 'Маска', Maxwell: 'Максвелл',
      Message: 'Сообщение', Mineral: 'Минерал', Mixing: 'Смешивание', Mobius: 'Мёбиус',
      Mysterious: 'Таинственный', Nia: 'Ниа', Node: 'Узел', North: 'Север', Orange: 'Оранжевый',
      Package: 'Посылка', Phylactery: 'Филактерия', Piece: 'Часть', Place: 'Место', Plant: 'Растение',
      Processor: 'Процессор', Provisions: 'Провизия', Psychomushroom: 'Психогриб',
      Purple: 'Фиолетовый', Put: 'Вложение', Radio: 'Радио', Recording: 'Запись', Red: 'Красный',
      Rehearsed: 'Отрепетированный', Remains: 'Останки', Renovated: 'Отремонтированный', Robot: 'Робот', Safe: 'Сейф',
      Second: 'Второй', Secret: 'Секрет', Sensor: 'Датчик', Sewing: 'Шитьё', Shiny: 'Блестящий',
      Shipping: 'Отгрузка', Shirt: 'Рубашка', Sign: 'Вывеска', Slippery: 'Скользкий',
      Smoker: 'Коптильня', Soldier: 'Солдат', South: 'Юг', Souvenir: 'Сувенир', Special: 'Особый',
      Statue: 'Статуя', Stolen: 'Украденный', Supplies: 'Припасы', Suspicious: 'Подозрительный', Svi: 'Сви',
      Tool: 'Инструмент', Training: 'Тренировка', Transformer: 'Трансформатор', Triton: 'Тритон',
      Undead: 'Нежить', Valuable: 'Ценный', Various: 'Разное', Vial: 'Флакон', Vodka: 'Водка',
      Water: 'Вода', Weast: 'Уист', West: 'Запад', Wolf: 'Волк', Workstation: 'Рабочее место',
      Yellow: 'Жёлтый', Zazz: 'Зазз', Zephyr: 'Зефир',
    },
    profession: {
      Alchemy: 'Алхимия', Butchery: 'Разделка', Construction: 'Строительство',
      Cooking: 'Кулинария', Herbalism: 'Травничество', Logging: 'Лесозаготовка',
      Mining: 'Горное дело', Mysticism: 'Мистицизм', Weaponsmithing: 'Оружейное дело',
    },
    harvestMethod: {
      Flayer: 'Разделка', Herbalism: 'Травничество', Lumberjack: 'Лесозаготовка', Miner: 'Горное дело',
    },
    statLabel: {
      health: 'Здоровье', attack_power: 'Сила атаки', weapon_damage: 'Урон оружия',
      armor: 'Броня', magic_resist: 'Магическое сопротивление', accuracy: 'Точность',
      attack_speed: 'Скорость атаки', movement_speed: 'Скорость передвижения', vision: 'Обзор',
      health_regen: 'Реген. здоровья', mana: 'Мана', mana_regen: 'Реген. маны',
      xp_reward: 'Опыт за убийство', gold_reward: 'Золото за убийство',
      phys_crit_chance: 'Шанс физ. крита', magic_crit_chance: 'Шанс маг. крита',
      // Добавлено на Фазе 4 (stat_ranges/weapon_dps/формулы -- см.
      // tmp/convergence/port_map.md #8/#9): характеристики брони/оружия и
      // операнды формул, отсутствующие в наборе "монстр" выше.
      spell_power: 'Сила заклинаний', phys_penetration: 'Физическое пробитие',
      magic_penetration: 'Магическое пробитие', flat_phys_penetration: 'Фиксированное физическое пробитие',
      flat_magic_penetration: 'Фиксированное магическое пробитие', phys_crit_power: 'Сила физического крита',
      magic_crit_power: 'Сила магического крита', lifesteal: 'Похищение жизни',
      ability_steal: 'Похищение жизни (способности)', heal_shield_power: 'Сила лечения и щитов',
      cooldown_reduction: 'Сокращение перезарядки', cost_reduction: 'Снижение стоимости',
      haste: 'Ускорение', tenacity: 'Стойкость', slow_resistance: 'Сопротивление замедлению',
      bleed_chance: 'Шанс кровотечения', corruption_chance: 'Шанс порчи',
    },
    statTier: {
      easy: 'лёгкий', medium: 'средний', hard: 'сложный', elit: 'элитный', boss: 'босс', miniboss: 'мини-босс',
    },
};
