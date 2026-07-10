/* Dictionnaire UI — uk. Mêmes clés que les autres langues (voir js/i18n/index.js). */
import { pluralSlavic } from './langs.js';

export default {
    ui: {
      pageTitle: 'Kwalat — Карта спільноти Corepunk',
      pageDescription: 'Інтерактивна карта Квалата (Corepunk): НПС, квести, майстерні, скрині, табори та точки інтересу.',
      panelAriaLabel: 'Легенда та фільтри',
      title: 'Карта Квалата',
      subtitle: 'Corepunk · карта спільноти',
      searchPlaceholder: 'Знайти НПС, квест, предмет, монстра…',
      searchAriaLabel: 'Пошук',
      filtersAriaLabel: 'Фільтри',
      legend: 'Легенда',
      campsTitle: 'Табори та ресурси',
      trackedTitle: 'Відстежуване',
      trackedEmptyHint: 'Закріпіть маркер кнопкою «Відстежувати», щоб знайти його тут.',
      footerNote: 'Дані видобуто з клієнта гри · не пов’язано з Artificial Core.',
      langSelectorLabel: 'Мова',
      panelToggleAriaLabel: 'Показати або сховати панель',
      mapAriaLabel: 'Карта світу',
      loadingText: 'Знімання місцевості…',
      zonesLabel: 'Зони (регіони)',
      campLoading: 'Завантаження таборів…',
      decorFamiliesTitle: 'Категорії декору',
      chestTypesAllBtn: 'Усі',
      chestTypesNoneBtn: 'Жодного',
      // Реорганізація контейнерів (DATA_CONTRACT.md): 2 реальних шари скринь
      // + група "Декор" (legacy_chest/decor за категорією).
      decorGroupLabel: 'Декор',
      campChestLabel: 'Табірна скриня',
      legacyChestLabel: 'Застаріла скриня зі скарбом',
      lootGenericNote: 'Загальна здобич: єдиний відомий зв’язок здобичі цього контейнера — широкий обшукуваний пул, а не виділена таблиця здобичі — це не цільова фармована скриня.',
      searchableChestTitle: 'Обшукувана скриня',
      searchableChestRarityNote: 'Випадкова рідкість: рівень (звичайний/рідкісний/епічний…) визначається сервером у момент появи — не виводиться з даних клієнта.',
      noResults: 'Немає результатів.',
      noResultsHint: 'Спробуйте коротше слово або перевірте написання.',
      searchBodyHintPrefix: '› мета: ',
      trackBtn: 'Відстежувати',
      trackedBtn: 'Відстежується ✓',
      doneBtn: 'Готово',
      doneBtnActive: 'Готово ✓',
      removeBtn: 'Прибрати',
      ficheBtn: 'Картка',
      ficheShopBtn: 'Картка · Крамниця',
      loreEntryTitle: 'Бестіарій',
      lootTableKind: 'Таблиця здобичі',
      priceTitle: 'Ціна',
      hideHighlightBtn: 'Приховати точки',
      stockFilterPlaceholder: 'Фільтр списку…',
      rewardTablesN: n => `Нагородні таблиці (${n})`,
      questCountSuffix: n => ` · ${n} ${pluralSlavic(n, 'квест', 'квести', 'квестів')}`,
      highlightPointsBtn: n => `Підсвітити точки (${n})`,
      dataGeneratedAt: date => `Дані від ${date}`,
      questMapsLine: names => `Мапи: ${names}`,
      bestiaryTitle: 'Бестіарій',
      bestiaryLoading: 'Завантаження бестіарію…',
      bestiaryZonesN: n => `${n} ${pluralSlavic(n, 'зона', 'зони', 'зон')}`,
      lootTableItemsN: n => `Вміст (${n})`,
      probableLootTitle: 'Ймовірна здобич',
      probableLootNote: name => `Таблицю «${name}» зіставлено за типом контейнера — перевірте у грі.`,
      questCat: 'Квест',
      givenBySuffix: name => ` · квестодавець: ${name}`,
      givenByPlain: name => `квестодавець: ${name}`,
      ficheCompleteBtn: 'Повна картка',
      campLabel: 'Табір',
      pointsHereSuffix: n => ` · ${n} точок тут`,
      spawnsTotal: n => `${n} спавнів усього`,
      campFicheBtn: 'Картка табору',
      levelAbbrev: lvl => `рів. ${lvl}`,
      spawnPointsCount: n => `${n} точок спавну`,
      viewOnMapBtn: 'Дивитися на карті',
      likelyMonsters: n => `Ймовірні монстри (${n})`,
      guaranteedLabel: 'Гарантовано',
      chanceLabel: 'Шанс',
      // ПРИБЛИЗНА частка (d.ch = вага / сумарна вага таблиці, див.
      // data/SCHEMA.md "chance") негарантованого дропу + чесна примітка у
      // спливаючій підказці (title) — див. js/fiches.js dropRateHtml.
      dropChanceApprox: pct => `≈ ${pct} %`,
      dropChanceBelowOne: '< 1 %',
      dropChanceCaveat: 'Частка цього предмета в пулі здобичі таблиці — не ймовірність за одне вбивство (реальна кількість кидків визначається сервером).',
      lootBestRates: 'Здобич (найкращі шанси)',
      mapLabel: 'Карта',
      mapSelectorLabel: 'Показана карта',
      mapBadgeTitle: name => `На карті «${name}» — натисніть, щоб перейти`,
      mapTilesOnlySuffix: '(прибл.)',
      mapGroupWorld: 'Світ',
      mapGroupExtraction: 'Евакуація',
      mapGroupBattleground: 'Поля бою',
      mapGroupPve: 'PvE-арени',
      mapGroupPvp: 'PvP-арени',
      mapGroupOther: 'Інше',
      // «позиція невідома» заборонена на сайті (див. data/SCHEMA.md "search_zone"):
      // це загальне позначення лишається лише для рядків поза метою квесту
      // (НПС/об’єкт/торговець без знайденої позиції) — самі цілі квестів
      // використовують posDynamic/posDynamicZone/posUncatalogued нижче.
      posUnknown: 'позиція не вказана',
      posDynamic: 'Динамічна позиція',
      posDynamicZone: 'Зона спавну',
      posUncatalogued: 'Позиція не каталогізована — перевірте в грі',
      // Підпис рядка результату пошуку для ЦІЛОГО КВЕСТУ без знайденої
      // позиції (у видавця/учасників немає x/z — напр. квести Prison
      // Island, на окремій карті/системі координат). Чесно і окремо від
      // posUnknown: просто немає точки на карті, кнопка карти не показана —
      // картка квесту все одно відкривається по кліку.
      questNoPos: 'Немає точки на карті',
      vendorStockTitle: 'Товари торговця',
      vendorStockTitleN: n => `Товари торговця (${n})`,
      noVendorItems: 'Немає відомих товарів у цього торговця.',
      npcCat: 'НПС',
      vendorSuffix: ' · Торговець',
      questsGivenN: n => `Видані квести (${n})`,
      noQuestsForNpc: 'Немає відомих квестів для цього НПС.',
      questItemBadge: 'Предмет квесту',
      gameItemBadge: 'Ігровий предмет',
      soldTag: 'продається',
      craftableTag: 'крафтиться',
      lootTag: 'лут',
      activableBadge: 'Активується',
      // Явний зв'язок на картці цілі об'єктиву (design review, липень 2026):
      // контекст див. у en.js -- ніколи не інтерполюється з іменем (воно
      // лишається окремим клікабельним span, див. goalTargetChip).
      goalDroppedByLabel: 'дроп з',
      goalObtainedHereLabel: 'отримано тут',
      objectivesN: n => `Цілі (${n})`,
      objectivesTitle: 'Цілі',
      howToTitle: 'Як виконати',
      rewardsTitle: 'Нагороди',
      questItemsN: n => `Предмети квесту (${n})`,
      viewGiverBtn: 'До квестодавця',
      viewZoneBtn: 'Дивитися зону',
      onMapTitle: 'На карті',
      dialogsN: n => `Діалоги (${n})`,
      dialogueFicheKind: 'Діалог НПС',
      dialogueHeading: 'Діалог НПС (не квест)',
      dialogueNote: 'Репліки, які говорить цей персонаж, — це не квест із цілями та нагородами.',
      journalTitle: 'Журнал',
      relatedQuestsTitle: 'Пов’язані квести',
      questFicheKind: region => 'Квест' + (region ? ` · ${region}` : ''),
      dropRatesTitle: 'Шанси випадіння',
      farmSpotsTitle: 'Місця фарму',
      soldByTitle: 'Продається у',
      obtainDuringQuestTitle: 'Як отримати',
      obtainViaKill: name => `Вбивши ${name}`,
      obtainViaInteract: label => `Взаємодіючи з ${label}`,
      moreMerchants: n => `+ ${n} інших торговців`,
      merchantPosUnknown: 'Позиція торговця не вказана.',
      recipeTitle: 'Рецепт',
      producesArrow: 'створює → ',
      usedInTitle: 'Використовується в',
      rewardBadge: 'Нагорода',
      requiredBadge: 'Потрібно',
      pingTitle: 'Пінг',
      copyLinkBtn: 'Скопіювати посилання',
      linkCopied: 'Посилання скопійовано ✓',
      locatorTitle: 'Мітка',
      mapDownload9600: 'Карта 9600px',
      mapDownload4800: 'Карта 4800px',
      loadErrorPrefix: msg => `Не вдалося завантажити дані (${msg})`,
      closeBtnAria: 'Закрити',
      // Банер «дані оновлено» (js/updatecheck.js) — токен version.json
      // змінився з моменту завантаження цієї вкладки (відбувся новий
      // деплой, поки вкладка залишалася відкритою). Без автоматичного
      // перезавантаження — лише пропозиція.
      dataUpdatedBanner: 'Дані оновлено — перезавантажте карту',
      dataUpdatedReloadBtn: 'Перезавантажити',
      monsterLabel: 'Монстр',
      variantsNote: n => ` · ще ${n} ${pluralSlavic(n, 'варіант', 'варіанти', 'варіантів')}`,
      monsterAbilitiesN: n => `Здібності (${n})`,
      monsterCampsN: n => `З'являється в (${n})`,
      noLootCatalogued: 'Здобич для цього монстра не каталогізована.',
      noAbilitiesKnown: 'Немає відомих здібностей у цього монстра.',
      noCampsKnown: 'Немає відомих таборів для цього монстра.',
      // Секція «Квестові предмети» на картці монстра (продовження зв'язку
      // монстр<->квестовий предмет, завдання 1/4): список questDrops[],
      // запечений під час збірки -- лише зв'язки від резолвера, секція
      // відсутня, якщо порожньо (ніколи не вигаданий порожній блок).
      monsterQuestItemsTitle: 'Квестові предмети',
      familyMonstersTitle: n => `Монстри цього виду (${n})`,
      abilityLabel: 'Здібність',
      harvestTitle: 'Здобич',
      noHarvestCatalogued: 'Здобич при обробці цього монстра не каталогізована.',
      statsTitle: 'Характеристики',
      realStatsBadge: 'реальні',
      // Підказка бейджа «реальні» (monsters.md finding #1): явно відрізняє
      // РЕАЛЬНИЙ клієнтський замір (запис m_abs_*/mbt_*_boss, напр. Furious
      // Woodraptor = 154 440 HP) від загальної оцінної фурчетки за рівнями нижче.
      realStatsTooltip: 'Реальні значення (клієнт) — зчитані напряму з даних гри для цього конкретного монстра, а не оцінка за рівнем складності.',
      // Чесна примітка для мобів БЕЗ реального клієнтського заміру
      // (statsSource !== "record"): реверс-інжиніринг показав, що стара
      // "оцінна" таблиця читала не те поле (приблизно у 640 разів занижене
      // значення, напр. бос 20 рів. показував ~544 HP при реальному
      // серверному значенні ~350 000) — цей вигаданий номер прибрано,
      // замість нього — чесне визнання. Див. js/fiches.js monsterStatsSection.
      statsServerNote: 'Точні характеристики визначаються на сервері (недоступні в даних клієнта).',
      computedStatsBadge: 'розрахунок (формула гри)',
      statsPerTierNote: 'Рівень складності призначається на сервері — діапазон за рівнями (легкий → бос).',
      // Чесна примітка для колонок Еліта/Бос (monsters.md finding #2): на
      // відміну від легкий/середній/важкий, ці 2 рівні НІКОЛИ не перевірялися
      // за зовнішнім джерелом — цифра спільноти "~350 000 HP" для боса
      // 20 рівня не відтворюється на жодних клієнтських даних, а реальний
      // іменний бос може значно перевищувати цю загальну фурчетку (див.
      // бейдж «реальні», якщо він доступний).
      statsBossEliteCaveat: 'Колонки «Еліта»/«Бос»: загальні оцінні значення, не підтверджені в грі — деякі реальні іменні боси набагато міцніші (див. бейдж «реальні», якщо для цього монстра є окремий запис).',
      bestiaryMapFilterLabel: map => `На цій карті (${map})`,
      bestiaryMapEmpty: 'На цій карті немає монстрів. Зніміть галочку, щоб показати всіх.',
      alwaysGrantedTitle: 'Видається завжди',
      choiceGroupTitle: n => `Вибір ${n}`,
      orWord: ' або ',
      xpAbbrev: n => `${n} XP`,
      goldAbbrev: n => `${n} золота`,
      // Селектор рідкості (однойменні варіанти, див. js/rarity.js) +
      // підказка пошуку «N рідкостей» на згрупованому результаті.
      rarityVariantsLabel: 'Рідкість',
      rarityVariantsCount: n => { const m = n % 100, u = n % 10; const w = (u === 1 && m !== 11) ? 'рідкість' : (u >= 2 && u <= 4 && (m < 12 || m > 14)) ? 'рідкості' : 'рідкостей'; return `${n} ${w}`; },
      // Селектор рівня/варіанта монстра (feature #12 — модель об'єднує всі
      // рівні/скіни однієї істоти, див. js/fiches.js monsterModelVariants) +
      // підказка пошуку «N варіантів» на згрупованому результаті, той самий
      // принцип, що й rarityVariantsCount вище.
      monsterVariantsLabel: 'Рівень',
      monsterVariantsCount: n => `${n} ${pluralSlavic(n, 'варіант', 'варіанти', 'варіантів')}`,
      // Тестовий контент (feature #13, isTest:true прихований за
      // замовчуванням): тег розкриття внизу панелі + позначка на будь-якому
      // розкритому контенті (картка, пігулка варіанта, бестіарій, пошук).
      devContentTag: n => `Тестовий контент (${n})`,
      devBadge: 'Тест',
      // Діапазони характеристик / DPS зброї / формули / масштабування рун і
      // чипів (stat_ranges, weapon_dps, artifact_formula/formula,
      // rarity_scaling, tier_scaling) -- нове, див.
      //  + ,
      // tmp/convergence/port_map.md #8/#9/#10.
      rollRangeTitle: 'Діапазон значень',
      weaponDpsTitle: 'DPS зброї',
      weaponDpsDerived: 'DPS (розрахунковий)',
      // Групування основна/додаткові (аудит точності даних, items.md #1):
      // артефакт отримує 1 гарантовану ОСНОВНУ характеристику + обмежену
      // кількість ДОДАТКОВИХ характеристик зі спільного пулу -- ніколи всі одразу.
      rollMainStatTitle: 'Основна характеристика (гарантована)',
      rollSecondaryStatsTitle: 'Додаткові характеристики (пул)',
      rollSecondaryHintN: (n, pool) => `До ${n} з цих ${pool} характеристик реально випадають на предметі (спільний пул) — не всі одразу.`,
      rollSecondaryHint: 'Обмежена кількість цих характеристик реально випадає на предметі (спільний пул) — не всі одразу.',
      formulaTitle: 'Формула',
      formulaRankLabel: n => `Ранг ${n}`,
      formulaPartialNote: 'Частина цього рядка залежить від нерозшифрованого посилання рушія.',
      rarityScalingTitle: 'Масштабування за рідкістю',
      tierScalingTitle: 'Масштабування за рівнем',
      scalingServerSide: 'Не змінюється залежно від рідкості в даних клієнта (ймовірно, обробляється на сервері).',
      scalingNotLocated: 'Масштабування не знайдено в даних клієнта.',
      tierNotRarity: 'Масштабується за РІВНЕМ (тіром), а не за рідкістю.',
      useEffectTitle: 'Ефект використання',
      effectVarRuntimeTooltip: 'Обчислюється наживо в грі (не фіксоване значення)',
      effectVarUnextractedTooltip: 'Значення ще не видобуте з даних клієнта',
      effectVarBaseTooltip: 'Значення для базового персонажа — зростає з вашими характеристиками',
      effectVarFormulaTooltip: 'Залежить від ваших характеристик (показано декодовану формулу)',
    },
    cat: {
      npc: 'НПС', poi: 'Точки інтересу', quest: 'Квести',
      qao: 'Об’єкти квестів', workshop: 'Майстерні',
      // Реорганізація контейнерів: старий єдиний шар "Скрині" (chest)
      // прибрано, замінено цими 2 реальними шарами — див. DATA_CONTRACT.md
      // §1/§3.1 та js/config.js CATS.
      searchable_chest: 'Обшукувані скрині', camp_chest: 'Табірні скрині',
    },
    rarity: { Common: 'Звичайний', Uncommon: 'Незвичайний', Rare: 'Рідкісний', Epic: 'Епічний' },
    kind: { npc: 'НПС', object: 'Об’єкт', item: 'Предмет', other: '—' },
    itemKind: {
      weapon: 'Зброя', resource: 'Ресурс', rune: 'Руна', consumable: 'Витратні предмети',
      artifact: 'Артефакт', chip: 'Чип', synthesis: 'Синтез',
      quest_item: 'Предмет квесту', recipe: 'Рецепт', item: 'Предмет',
    },
    weaponType: {
      Gun: 'Пістолет', Sword: 'Меч', Shield: 'Щит', Dagger: 'Кинджал',
      Bow: 'Лук', Knuckle: 'Кастети', Spear: 'Спис',
    },
    useType: {
      OneHanded: 'Одноручна', TwoHanded: 'Дворучна',
      OneHandedLeft: 'Одноручна (ліва)', OneHandedRight: 'Одноручна (права)',
    },
    weaponClass: { Bomber: 'Бомбер', Champion: 'Чемпіон', Warmonger: 'Вармонгер' },
    action: {
      kill: 'Знищити', collect: 'Зібрати', use: 'Використати', talk: 'Поговорити з',
      goto: 'Піти до', deliver: 'Доставити', custom: 'Зробити',
      repair: 'Полагодити', craft: 'Створити', mix: 'Змішати',
    },
    searchCat: {
      npc: 'НПС', poi: 'Місце', quest: 'Квест', qao: 'Об’єкт',
      workshop: 'Майстерня', camp: 'Табір', item: 'Предмет',
      monster: 'Монстр', zone: 'Регіон', location: 'Місце',
      ability: 'Здібність', event: 'Подія', chest: 'Скриня',
      searchable_chest: 'Обшукувана скриня',
    },
    // Категорії декору (chests.bin group="decor" за family, + "legacy" для
    // group="legacy_chest") — підрядки згортної групи "Декор"
    // (js/sidebar.js buildDecorGroup), див. DATA_CONTRACT.md §3.1.
    decorFamily: {
      barrel: 'Бочки', boxes: 'Ящики', furniture: 'Меблі',
      corpse: 'Трупи', books: 'Книги', misc: 'Різне', legacy: 'Застаріла скриня',
    },
    // "searchable" і "quest" переформульовано, щоб не читатися як
    // верхньорівневі статичні шари (cat.chest "Скрині" / cat.quest
    // "Квести"): це рядки ФІЛЬТРА табору (динамічні спавни / обшукувані
    // контейнери), а не ті самі шари — див. campType.chests нижче про таку
    // саму правку підпису підтипу "Скрині — <регіон>".
    campKind: {
      monsters: 'Монстри', creeps: 'Кріпи', herbalism: 'Травництво',
      logging: 'Лісорубство', mining: 'Гірництво', searchable: 'Обшукувані',
      destroyable: 'Руйнівні', reactive: 'Інтерактивні', shrines: 'Святилища',
      soulkeeper: 'Охоронці душ', quest: 'Спавни завдань', wildlife: 'Дикі тварини',
      guards: 'Стражі', event: 'Подія', other: 'Інше',
    },
    mapName: {
      Kwalat: 'Квалат',
      Extraction_Island_large: 'Тюремний острів',
      Extraction_Island_small: 'Тюремний острів (малий)',
    },
    monsterAttack: { Melee: 'Ближній бій', Range: 'Дальній бій', Ranged: 'Дальній бій', Axe: 'Сокира' },
    locationKind: {
      town: 'Місто', poi: 'Точка інтересу', mob: 'Бестіарій', dungeon_boss: 'Бос підземелля',
      gathering: 'Ресурс', portal: 'Портал', shrine: 'Святилище',
    },
    campType: {
      barrels: 'Вибухові бочки', tombstones: 'Надгробки', coffins: 'Труни',
      chests: 'Обшукувані скрині', corpses: 'Обшукувані трупи', sacks: 'Мішки',
      crateCorn: 'Ящик кукурудзи', crateCabbage: 'Ящик капусти', crateCarrot: 'Ящик моркви',
      crateOnion: 'Ящик цибулі', crateEggplant: 'Ящик баклажанів', crateBerries: 'Ящик ягід',
      sackCorn: 'Мішок кукурудзи', sackWheat: 'Мішок пшениці',
      mushrooms: 'Гриби', bottles: 'Пляшки', pots: 'Горщики',
      wooden: "Дерев'яні об'єкти", leafTrash: 'Купи листя',
      vegetables: 'Овочі', urban: "Міські об'єкти",
    },
    chestType: {
      Backpack: 'Рюкзак', Barrel: 'Бочка', Bathroom: 'Ванна кімната', Bedroom: 'Спальня',
      Boiler: 'Котел', Books: 'Книги', Boxes: 'Ящики', Cabinet: 'Шафка', Chest: 'Скриня',
      Closed: 'Закритий', Corpse: 'Труп', Fridge: 'Холодильник', Guest: 'Гостьова кімната',
      Kitchen: 'Кухня', Papers: 'Папери', Rest: 'Відпочинок', Shelf: 'Полиця', Truck: 'Вантажівка',
      Wardrobe: 'Гардероб', Warehouse: 'Склад',
    },
    activableType: {
      Ancient: 'Стародавній', Artifact: 'Артефакт', Barrel: 'Бочка', Bart: 'Барт', Beehive: 'Вулик',
      Black: 'Чорний', Blade: 'Клинок', Bloody: 'Кривавий', Blue: 'Синій', Broken: 'Зламаний',
      Building: 'Будівля', Captains: 'Капітанський', Cell: 'Камера', Chain: 'Ланцюг',
      Chainsaw: 'Бензопила', Charging: 'Заряджання', Cigarette: 'Сигарета', Container: 'Контейнер',
      Crush: 'Давилка', Data: 'Дані', Deed: 'Документ на власність', Diamond: 'Діамант',
      Document: 'Документ', Door: 'Двері', Dream: 'Мрія', Drip: 'Крапельниця', Dwarf: 'Гном',
      East: 'Схід', Empty: 'Порожній', Energydrink: 'Енергетик', Enter: 'Вхід',
      Evidence: 'Доказ', Explosive: 'Вибухівка', Felixs: 'Фелікс', Fire: 'Вогонь', Fishing: 'Риболовля',
      Free: 'Вільний', Gasoline: 'Бензин', Gift: 'Подарунок', Glass: 'Скло', Green: 'Зелений',
      Handle: "Руків'я", Hiding: 'Схованка', Ingredient: 'Інгредієнт', Iron: 'Залізо',
      Isopropyl: 'Ізопропіл', Item: 'Предмет', Jahri: 'Джахрі', Kegs: 'Бочонки', Light: 'Світло',
      'Lock/Key': 'Замок/Ключ', Machine: 'Машина', Mask: 'Маска', Maxwell: 'Максвелл',
      Message: 'Повідомлення', Mineral: 'Мінерал', Mixing: 'Змішування', Mobius: 'Мебіус',
      Mysterious: 'Таємничий', Nia: 'Ніа', Node: 'Вузол', North: 'Північ', Orange: 'Помаранчевий',
      Package: 'Посилка', Phylactery: 'Філактерія', Piece: 'Частина', Place: 'Місце', Plant: 'Рослина',
      Processor: 'Процесор', Provisions: 'Провізія', Psychomushroom: 'Психогриб',
      Purple: 'Фіолетовий', Put: 'Вкладення', Radio: 'Радіо', Recording: 'Запис', Red: 'Червоний',
      Rehearsed: 'Відрепетований', Remains: 'Останки', Renovated: 'Відремонтований', Robot: 'Робот', Safe: 'Сейф',
      Second: 'Другий', Secret: 'Секрет', Sensor: 'Датчик', Sewing: 'Шиття', Shiny: 'Блискучий',
      Shipping: 'Відвантаження', Shirt: 'Сорочка', Sign: 'Вивіска', Slippery: 'Слизький',
      Smoker: 'Коптильня', Soldier: 'Солдат', South: 'Південь', Souvenir: 'Сувенір', Special: 'Особливий',
      Statue: 'Статуя', Stolen: 'Викрадений', Supplies: 'Припаси', Suspicious: 'Підозрілий', Svi: 'Свi',
      Tool: 'Інструмент', Training: 'Тренування', Transformer: 'Трансформатор', Triton: 'Тритон',
      Undead: 'Нежить', Valuable: 'Цінний', Various: 'Різне', Vial: 'Флакон', Vodka: 'Горілка',
      Water: 'Вода', Weast: 'Віст', West: 'Захід', Wolf: 'Вовк', Workstation: 'Робоче місце',
      Yellow: 'Жовтий', Zazz: 'Зазз', Zephyr: 'Зефір',
    },
    profession: {
      Alchemy: 'Алхімія', Butchery: 'Забій', Construction: 'Будівництво',
      Cooking: 'Кулінарія', Herbalism: 'Травництво', Logging: 'Лісорубство',
      Mining: 'Рудокопство', Mysticism: 'Містицизм', Weaponsmithing: 'Зброярство',
    },
    harvestMethod: {
      Flayer: 'Забій', Herbalism: 'Травництво', Lumberjack: 'Лісорубство', Miner: 'Рудокопство',
    },
    statLabel: {
      health: "Здоров'я", attack_power: 'Сила атаки', weapon_damage: 'Шкода зброї',
      armor: 'Броня', magic_resist: 'Магічний опір', accuracy: 'Точність',
      attack_speed: 'Швидкість атаки', movement_speed: 'Швидкість руху', vision: 'Огляд',
      health_regen: "Регенерація здоров'я", mana: 'Мана', mana_regen: 'Регенерація мани',
      xp_reward: 'Досвід за вбивство', gold_reward: 'Золото за вбивство',
      phys_crit_chance: 'Шанс фіз. криту', magic_crit_chance: 'Шанс маг. криту',
      // Додано на Фазі 4 (stat_ranges/weapon_dps/формули -- див.
      // tmp/convergence/port_map.md #8/#9): характеристики спорядження та
      // операнди формул, відсутні в наборі "монстр" вище.
      spell_power: 'Сила заклять', phys_penetration: 'Фізичне пробиття',
      magic_penetration: 'Магічне пробиття', flat_phys_penetration: 'Фіксоване фізичне пробиття',
      flat_magic_penetration: 'Фіксоване магічне пробиття', phys_crit_power: 'Сила фізичного криту',
      magic_crit_power: 'Сила магічного криту', lifesteal: 'Крадіжка життя',
      ability_steal: 'Крадіжка життя (здібності)', heal_shield_power: 'Сила лікування та щитів',
      cooldown_reduction: 'Скорочення перезарядки', cost_reduction: 'Зниження вартості',
      haste: 'Прискорення', tenacity: 'Стійкість', slow_resistance: 'Опір уповільненню',
      bleed_chance: 'Шанс кровотечі', corruption_chance: 'Шанс псування',
    },
    statTier: {
      easy: 'легкий', medium: 'середній', hard: 'складний', elit: 'елітний', boss: 'бос', miniboss: 'міні-бос',
    },
};
