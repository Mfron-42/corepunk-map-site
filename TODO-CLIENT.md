# TODO — reprises nécessitant le CLIENT DU JEU (PC Windows)

> Prérequis : le PC Windows avec **le client Corepunk installé** et **la
> pipeline d'extraction** (le projet qui pousse les commits « Deploy Corepunk
> community map site » sous l'identité `corepunk-map-bot`). Reprendre la
> conversation Claude avec ce fichier ouvert : chaque point dit quoi extraire
> et où le brancher côté site.

## 0. ⚠️ URGENT — corriger la pipeline du bot (avant tout le reste)

La pipeline pousse un **snapshot complet du site** depuis son clone local, qui
contient encore l'ancienne architecture (`js/app.js` monolithique) : elle a
déjà écrasé la refonte modulaire une fois (commit `8e6ec434`).

- **À faire dans la pipeline** : ne committer QUE `data/` (+ rien d'autre),
  ou faire un `git pull --rebase` avant de committer, ou mettre à jour son
  gabarit de site avec l'état actuel du dépôt.
- Un garde-fou existe côté GitHub Actions (`.github/workflows/deploy-pages.yml`,
  tag `site-code`) qui auto-répare le déploiement, mais la vraie correction
  est à la source.

## 1. Icônes manquantes (1 212 items sans icône)

- **Constat** : 1 212 / 5 488 items n'ont AUCUNE icône extraite — dont les
  **kits d'amélioration** `synthesis_item_upgrade_t1/t2/t3_{uncommon,rare,epic}`,
  les rerolls (`synthesis_item_reroll_secondary_*`), 927 items « divers »,
  98 armes, 120 objets de quête. Zéro référence cassée côté site : c'est
  bien l'extraction qui n'a pas exporté ces PNG ni le lien item→icône
  (les variantes voisines `*_t1_epic` / `skin_upgrade_t1/t3` l'ont, preuve
  que l'art existe dans le client).
- Manquent aussi : 36 avatars de PNJ, la quasi-totalité des icônes de
  monstres (`monsters.bin` : `icon: null` presque partout).
- **À extraire** : les PNG + le mapping item→icône complet.
- **Côté site** : rien à changer — `items.bin`/`icons/items/` sont branchés,
  le repli en glyphe disparaîtra tout seul.

## 2. Lien officiel contenant → table de butin

- **Constat** : les tables de butin existent (486 tables pondérées, ex.
  `Searchable Chest`, `Destroyable Farmsacks Corn`) mais le **lien
  prop → table n'est pas exporté**. Le site fait un rapprochement PAR TYPE
  exact uniquement (`js/config.js` → `CAMP_LOOT_TABLE_RULES`, affiché
  « Butin probable … à confirmer en jeu »).
- **À extraire** : `loot_table_id` de chaque prefab de prop — pour les 63
  groupes de camps searchable/destroyable/reactive ET les 3 834 coffres
  placés (`tc_*`, `chests.bin`).
- **Côté site** : ajouter le champ (ex. `loot` sur chaque groupe de
  `camps.bin` / entrée de `chests.bin`) puis remplacer l'heuristique par le
  lien exact dans `js/fiches.js` (`openCampFiche`) et le popup coffre.

## 3. Skin par point pour les groupes génériques

- **Constat** : « la quête dit caisses en bois » — mais les gros groupes
  (`searchable-windreach-woods`, 4 558 points…) n'ont que des `[x, z]` nus :
  impossible de distinguer caisse / pot / tonneau par point. Seuls les
  groupes typés (caisse de maïs…) et les coffres `tc_*` ont leur type.
- **À extraire** : le prefab/skin de chaque spawn point de camp.
- **Côté site** : `camps.bin` par point `[x, z, skin]` ; le surlignage par
  type (`showHighlight`) et `campDisplayName` sont prêts à l'exploiter.

## 4. Stats de monstres

- **Constat** : `monsters.bin` n'a QUE niveau/famille/type d'attaque/tags/
  capacités/butin — pas de PV, dégâts, armure, vitesse, résistances.
- **À extraire** : les stats de combat par variante de monstre.
- **Côté site** : section « Stats » dans `openMonsterFiche` (js/fiches.js).

## 5. Tables de butin complètes côté conteneur

- **Constat** : le site reconstruit table→items en INVERSANT `items.bin`
  (`js/data.js` → `lootTableItems`). Fidèle mais dépendant de la couverture
  côté item ; les quantités min/max et les tirages « pick N » ne sont pas
  distingués.
- **À extraire** : chaque LootBox du client telle quelle (id → entrées avec
  poids/quantités/mode de tirage) dans un `loot_tables.bin`.

## 6. Trous des builds RU/UK

- **Constat** : `data/ru/npcs.bin` perd des champs `vendor` présents en EN
  (ex. Penny Stardust Furbank, idx 46 : `vendor` null en RU). À re-extraire.

## 7. Familles de monstres fragmentées

- **Constat** : tokens `family` incohérents (`robo` vs `robot` ; fragments
  `old`, `lost`, `island`, `leaf`). Alias provisoire côté site
  (`FAMILY_ALIAS`, js/config.js) — normaliser à l'export.

## 8. Provenance des lignes de butin monstre

- **Constat** : le butin de kill et les tables de récompense (recettes
  `*_unlocked`, Champions Tribute) arrivent mélangés dans `monsters.bin`.
  Séparation heuristique côté site (`isRewardRow`, js/fiches.js).
- **À extraire** : la table SOURCE de chaque ligne de butin.

## 9. Divers pipeline

- `site_meta.json` : `hasMonsters` / `hasZoneGeo` ne sont plus lus — à
  retirer ; ajouter éventuellement la version du jeu extraite.
- Étendre l'extraction des activables (`quest_objects.bin`) avec un vrai
  champ de type (aujourd'hui seule la clé `qao_*` existe).
