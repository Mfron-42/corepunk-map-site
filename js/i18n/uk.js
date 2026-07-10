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
      // Чесність лічильника легенди/меню (звіт: фільтр НПС показував 11 на
      // Prison Island, але малюється лише 1 маркер): підказка скромного
      // значка "+N" поруч з основним рахунком рядка фільтра (js/sidebar.js
      // hiddenBadge) — N реальних, не тестових записів без відомої позиції,
      // ніколи не маркери, які карта мовчки не малює. Формулювання НАВМИСНЕ
      // нейтральне («невідомо», а не «динамічно»/«поява на боці сервера»):
      // класифікатор `pos_source`, що доводить реальний серверний спавн,
      // існує лише для 18 НПС Prison Island у data/quests.json (на боці
      // пайплайна, рівень giver/slot) і НЕ передається в жоден .bin сайту
      // (ні npcs.bin, ні quests.bin) — твердження «на боці сервера» для
      // всього набору було б перебільшенням для решти, просто не
      // класифікованих (див.  unknown_states_DESIGN.md §2
      // re-check #1).
      filterHiddenTooltip: n => `${n} без відомої позиції`,
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
      // Діапазон РІВНІВ (task #80 — рядки видів бестіарію/фауни табору,
      // напр. вид, що охоплює рів. 5-20): та сама абревіатура, що й
      // levelAbbrev вище.
      levelRangeAbbrev: (min, max) => `рів. ${min}–${max}`,
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
      // Середня впевненість (пакетне доопрацювання, лише близькість — див.
      //  zone_confidence): формулювання відрізняється від
      // posDynamicZone вище — сусідній табір не доводить, що предмет справді
      // з'являється саме там, ніколи не подається з такою ж впевненістю, як
      // зона з підтвердженням.
      posEstimatedZone: 'Орієнтовна зона',
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
      // Значок «Контейнер» (декодування механізму, задача A): власна
      // ідентичність об'єкта в collect_from_object (t.label, напр. «Стара
      // скриня») — відрізняється від activableBadge вище (самодостатній
      // об'єкт use_object, а не контейнер, де знаходиться ЩОСЬ ІНШЕ).
      containerBadge: 'Контейнер',
      // Явний зв'язок на картці цілі об'єктиву (design review, липень 2026):
      // контекст див. у en.js -- ніколи не інтерполюється з іменем (воно
      // лишається окремим клікабельним span, див. goalTargetChip).
      goalDroppedByLabel: 'дроп з',
      goalObtainedHereLabel: 'отримано тут',
      // «Контейнерний» відповідник goalObtainedHereLabel вище, специфічний
      // для collect_from_object (декодування механізму, задача A):
      // використовується лише коли відома мітка контейнера (t.label) —
      // тільки дієслово, ім'я йде окремим span одразу після, як і
      // goalDroppedByLabel/nameSpan.
      goalFoundInLabel: 'знайдено в',
      // Та сама схема рядка зв'язку, пакетне доопрацювання: предмет, виданий
      // квестодавцем (given_by_giver, напр. "Time of Death" з
      // eight_legged_freaks) і предмет лише для крафту (craft:true, напр.
      // імплант із construction_lesson) — жодне з двох не з'являється у
      // світі, тому ніколи не показується ані позиція, ані зона.
      goalGivenByLabel: 'отримано від',
      goalCraftLabel: 'потрібно скрафтити',
      // Механізм receive_reward (декодування механізму, задача A): предмет
      // отримується за виконання ІНШОГО квесту (geo.py reward_of), а не
      // видається квестодавцем цього квесту — тільки дієслово, далі йде
      // клікабельний span квесту на кожен запис reward_of (див. rewardOfRelRow).
      goalRewardOfLabel: 'отримано за виконання',
      // Механізм harvest: вузол видобутку ресурсів (лісозаготівля/
      // травництво/видобуток руди — target.profession, локалізовано через
      // professionLabel).
      goalHarvestLabel: profession => `видобуток (${profession})`,
      // Механізм kill_collect/kill: target.drop_chance (0-100, побайтово
      // точне значення) — відрізняється від загального dropChanceApprox
      // (розрахункова частка, тут ніколи немає "≈" — це заданий грою відсоток).
      goalDropChanceLabel: pct => `(${pct} %)`,
      // Механізм kill_player: target.player_specs, об'єднані через
      // heroSpecLabel (fiches.js) — єдиної позиції для PvP-цілі не буває.
      goalKillPlayerLabel: specs => `Перемогти гравців (${specs})`,
      objectivesN: n => `Цілі (${n})`,
      objectivesTitle: 'Цілі',
      howToTitle: 'Як виконати',
      rewardsTitle: 'Нагороди',
      questItemsN: n => `Предмети квесту (${n})`,
      viewGiverBtn: 'До квестодавця',
      viewZoneBtn: 'Дивитися зону',
      // Пара для середньої впевненості (пакетне доопрацювання, див.
      // posEstimatedZone вище): малює реальні точки згаданого табору, якщо
      // активна карта їх завантажила, інакше — те саме орієнтовне коло, що й
      // viewZoneBtn, але ніколи з тим самим підписом, щоб не сплутати з
      // підтвердженою зоною.
      viewEstimatedZoneBtn: 'Дивитися орієнтовно',
      onMapTitleN: n => `На карті (${n})`,
      dialogsN: n => `Діалоги (${n})`,
      // Значок довіри в шапці (переробка макета, липень 2026): `q.explained`
      // {goals_total, goals_resolved} надходить як є з декодера графа квесту
      // — 333 з 335 розібраних квестів сьогодні пояснені повністю, у 2
      // лишається хоча б одна нерозв'язана ціль. Ніколи не показується без
      // графа цілей взагалі (діалоги-репліки тощо).
      questExplainedFull: 'Повністю пояснено',
      questExplainedPartial: n => `${n} ${pluralSlavic(n, 'ціль', 'цілі', 'цілей')} під питанням`,
      dialogueFicheKind: 'Діалог НПС',
      dialogueHeading: 'Діалог НПС (не квест)',
      dialogueNote: 'Репліки, які говорить цей персонаж, — це не квест із цілями та нагородами.',
      journalShowMoreBtn: 'Показати повністю',
      journalShowLessBtn: 'Згорнути',
      relatedQuestsTitle: 'Пов’язані квести',
      questFicheKind: region => 'Квест' + (region ? ` · ${region}` : ''),
      dropRatesTitle: 'Шанси випадіння',
      farmSpotsTitle: 'Як фармити',
      // Перероблення місць фарму (farm_spot_UX_DESIGN.md, липень 2026):
      // рядки згруповані за типом табору (Видобуток/Монстри/…) замість
      // плаского списку з 24 рядків — підсумок у заголовку, розгортання
      // «+N», і чесні запасні варіанти нижче (незв’язаний табір, немає даних
      // про табір, згорнутий загальний пул нагород).
      farmGroupSummary: (camps, pts) => `${camps} таборів · ${pts} точок`,
      farmMoreCampsN: n => `+ ${n} таборів`,
      farmGenericPoolNote: n => `Також зрідка випадає в ${n} таборах із загальною нагородою — це не цільове місце фарму.`,
      farmSourcesNotMapped: 'Джерела ще не прив’язані до відомого табору.',
      farmOtherSourcesTitle: 'Інші джерела',
      soldByTitle: 'Продається у',
      obtainDuringQuestTitle: 'Як отримати',
      obtainViaKill: name => `Вбивши ${name}`,
      obtainViaInteract: label => `Взаємодіючи з ${label}`,
      // Розширення quest_source_of, декодування механізму, задача B (harvest/
      // reward_of/world -- given_by перевикористовує ui.givenByPlain,
      // container перевикористовує obtainViaInteract вище, див.
      // build_site_data.py + fiches.js openItemFiche).
      obtainViaHarvest: profession => `Здобувши (${profession})`,
      // Фрагмент, а не закінчена фраза -- поєднується з ui.givenByPlain як
      // «Отримано від X — quest Y» (крос-квестовий випадок receive_reward,
      // див. гілку qs.via === 'reward_of' в openItemFiche).
      obtainViaRewardOfQuest: name => `квест ${name}`,
      obtainViaWorld: 'Знаходиться під час виконання цього квесту',
      moreMerchants: n => `+ ${n} інших торговців`,
      merchantPosUnknown: 'Позиція торговця не вказана.',
      recipeTitle: 'Рецепт',
      producesArrow: 'створює → ',
      recipeChipLabel: name => `Рецепт: ${name}`,
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
      // Групова кнопка «підсвітити все» (картка монстра, липень 2026):
      // прив'язка лише на рівні ТАБОРУ — малює об'єднання точок усіх таборів,
      // де з'являється цей монстр, а не твердження про те, яка саме точка
      // породжує який варіант (див. обробник camp-highlight, main.js).
      // Формулювання «в цих таборах» навмисне, відрізняється від «Дивитися
      // оцінку» кроку завдання (viewEstimatedZoneBtn), яка малює інший набір
      // даних (точки табору ОБ'ЄКТА завдання).
      monsterHighlightAllSpawns: (camps, pts) => `Показати всі спавни в цих таборах (${camps} ${pluralSlavic(camps, 'табір', 'табори', 'таборів')} · ${pts} ${pluralSlavic(pts, 'точка', 'точки', 'точок')})`,
      noLootCatalogued: 'Здобич для цього монстра не каталогізована.',
      noAbilitiesKnown: 'Немає відомих здібностей у цього монстра.',
      noCampsKnown: 'Немає відомих таборів для цього монстра.',
      // Секція фауни картки табору (unknown_states_DESIGN.md #4/#10, завдання
      // #67): «монстровий» табір (kind monsters/creeps/wildlife), чиє ім'я
      // менеджера не дає жодного розпізнаного виду — байт-доведено, що точки
      // появи табору взагалі не несуть посилання на сутність (data/SCHEMA.md
      // «camp fauna»), таких таборів сьогодні 43/128. Раніше тут не
      // показувалося зовсім нічого (мовчазна прогалина, див. openCampFiche);
      // тепер чесна позначка про динамічний стан.
      campFaunaUnknownNote: "Конкретні істоти цього табору не зафіксовані в даних клієнта — з'являються динамічно на сервері.",
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
      // Селектор рівня/варіанта монстра (task #80 — ВИД об'єднує всі
      // рівні/скіни однієї істоти, див. js/fiches.js speciesVariantSpawns) +
      // підказка пошуку «N варіантів» на згрупованому результаті, той самий
      // принцип, що й rarityVariantsCount вище.
      monsterVariantsLabel: 'Рівень',
      monsterVariantsCount: n => `${n} ${pluralSlavic(n, 'варіант', 'варіанти', 'варіантів')}`,
      // Кількість вихідних/косметичних ключів, згорнутих в ОДНУ групу
      // (ім'я, рівень) (task #80, доопрацювання — раніше жило в kindLine
      // через variantsNote вище; перенесено в окремий приглушений рядок під
      // селектором варіантів -- технічна позначка, не ігровий факт).
      // Формулювання "Вихідних записів: N" уникає узгодження прикметника з
      // числівником (безпечно для будь-якого N).
      rawRecordsNote: n => `Вихідних записів: ${n}`,
      // Тестовий контент (feature #13, isTest:true прихований за
      // замовчуванням): тег розкриття внизу панелі + позначка на будь-якому
      // розкритому контенті (картка, пігулка варіанта, бестіарій, пошук).
      devContentTag: n => `Тестовий контент (${n})`,
      devBadge: 'Тест',
      // Таксономія «ми не знаємо» з 3 станів (unknown_states_DESIGN.md,
      // завдання #67): один спільний компонент `.state-chip` + короткий
      // словник для будь-якого місця сайту, що чесно пояснює невизначеність
      // (позиція, здобич, асортимент торговця, масштабування рідкості/рівня,
      // невирішений залишок цілі квесту…) замість ~6 розрізнених саморобних
      // рішень. «dev» використовує devBadge вище як підпис (цей ключ лише
      // додає підказку, якої бракувало) — dynamic/unknown єдині справді нові
      // підписи. Див. stateChip() у js/fiches.js.
      devBadgeTitle: 'Незавершений або тестовий контент, який є у грі, але ніколи не використовується.',
      stateDynamic: 'Динаміка',
      stateDynamicTitle: 'Визначається сервером у реальному часі — не зберігається в даних клієнта.',
      stateUnknown: 'Невідомо',
      stateUnknownTitle: 'Неможливо визначити за видобутими даними клієнта.',
      // 4-й стан (task #80, monsterStatsSection): РЕАЛЬНИЙ блок характеристик
      // (споріднений запис m_abs_*, спільний для всіх рівнів демотованої
      // групи) — ніколи власний для цього моба, ніколи бейдж «реальні» вище,
      // але завжди справжні байти клієнта, на відміну від загального
      // оцінного діапазону.
      stateFixed: 'фіксовані',
      stateFixedTitle: 'Фіксовані показники (арена/ЗБТ) — не залежать від рівня, не підтверджені в грі.',
      // Розкривний рядок походження під таблицею за рівнями (formula_range +
      // statsFixedReading, task #80): короткий опис показує найбільш
      // промовисте число (здоров'я), деталь — джерело + діапазон рівнів, який
      // воно охоплює. Ніколи не показується як ВЛАСНІ характеристики цього
      // моба.
      statsFixedProvenanceLine: (label, value) => `Фіксовані дані: ${label} ${value} — не корелюють з рівнем`,
      statsFixedProvenanceDetail: (src, cbt, lvlText) => `Джерело: ${src}${cbt ? ' (ЗБТ)' : ''} · рівні ${lvlText}`,
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
      // Переформульовано (unknown_states_DESIGN.md §2, re-check #2, завдання
      // #67): стара фраза «(ймовірно, обробляється на сервері)» стверджувала
      // конкретну, НЕ ДОВЕДЕНУ причину — саме data/SCHEMA.md не може
      // визначити, чи йдеться про серверне масштабування, чи про інше ігрове
      // правило (напр., пов'язане з кількістю слотів таланту). Тепер
      // нейтрально, і огортається викликачем (formulaHtml) у пігулку стану
      // "unknown" замість простого абзацу .hint.
      scalingServerSide: 'Не змінюється залежно від рідкості в даних клієнта — причину не можна встановити за видобутими даними.',
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
