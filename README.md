# Carte de Kwalat — Corepunk

Carte interactive communautaire de **Corepunk** : PNJ, quêtes, ateliers, objets,
coffres, camps de monstres et de ressources, points d'intérêt et zones.

Site statique, sans backend ni étape de build — hébergé via GitHub Pages.
Modules ES natifs, Leaflet en seule dépendance (vendorisée).

## Lancer en local

```sh
python3 -m http.server 8000
# puis http://localhost:8000
```

(Un serveur HTTP est requis : `fetch()` des données et modules ES ne
fonctionnent pas en `file://`.)

## Architecture (js/)

Graphe de dépendances strictement descendant — aucun cycle :

```
main.js                amorçage, délégué global data-act, bascule de langue
└─ router.js           restauration d'état (hash → carte/caméra/fiche/filtres)
   ├─ fiches.js        drawer de détail : PNJ/quête/objet/camp/monstre/lore/capacité
   ├─ search.js        index riche + cross-carte, score flou, rendu résultats
   ├─ multimap.js      manifeste maps.json, switchMap, sélecteur, hooks UI
   ├─ sidebar.js       filtres de couches, liste des camps, suivis, panneau
   ├─ pins.js          goTo/réticule/ping (repères partageables)
   └─ popups.js        gabarits HTML des popups de marqueur
      ├─ urlstate.js   hash partageable + modèle d'historique Précédent/Suivant
      ├─ mapview.js    Leaflet, transform monde↔pixel, tuiles, couches denses
      └─ data.js       décodage .bin, chargements critique/différé, catalogues
         ├─ config.js  constantes, palettes, résolveurs de libellés
         ├─ state.js   état applicatif unique (S) + localStorage
         ├─ utils.js   DOM/format/repli d'image/normalisation de recherche
         └─ i18n/      runtime (index.js) + un dictionnaire par langue
```

Conventions :
- **« fiche »** est le terme du domaine (drawer de détail d'une entité) —
  utilisé tel quel dans le code, le CSS (`.fiche-*`) et les `data-act`.
- Les actions UI passent par des attributs `data-act` traités par UN SEUL
  délégué global (main.js) — jamais de `onclick` inline dans les gabarits.
- Les libellés viennent toujours de `tr()`/`tbl()` (jamais de texte en dur) ;
  une langue = un fichier `js/i18n/<code>.js` + un build `data/<code>/`.

## Données (data/<lang>/*.bin)

Chaque `.bin` = en-tête custom de 4 octets (friction anti-scraping, pas du
chiffrement) suivi d'un flux gzip du JSON. Décodés côté client via
`DecompressionStream` (voir `js/data.js`). Les tuiles (~645 Mo) vivent sur un
dépôt GitHub Pages dédié (voir `TILE_BASE` dans `js/config.js`).

## Mise à jour des données

Les fichiers `data/` sont republiés par le pipeline d'extraction (dépôt
source du projet) — ne pas les éditer à la main ici.
