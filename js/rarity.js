/* Kwalat — regroupement des variantes de rareté « même nom » : plusieurs
   clés d'objet distinctes qui partagent le MÊME nom d'affichage et ne
   diffèrent que par le dernier token de rareté de leur clé (ex.
   synthesis_item_upgrade_t1_uncommon / _rare / _epic = « Synthesis Item
   Upgrade T1 »). Calculé côté client (aucune donnée régénérée) : deux Maps
   posées sur S — rarityGroups (repKey -> {baseName, variants:{Rareté: clé}})
   et rarityGroupOf (chaque membre, représentant compris, -> repKey).

   Module séparé (pas fiches.js) pour éviter un cycle d'import : data.js
   appelle buildRarityGroups() juste après avoir peuplé S.items (voir
   loadCritical()), et fiches.js/search.js lisent seulement rarityGroupFor/
   isDeprecatedItem — si ce code vivait dans fiches.js, data.js devrait
   l'importer alors que fiches.js importe déjà data.js (monsterKeyFor,
   npcIndexByName…), un cycle interdit par l'architecture du site (voir
   tmp/convergence/architecture_map.md, "Strictly downward, no cycles"). */
import { S } from './state.js';
import { fold, capitalize } from './utils.js';
import { RARITY } from './config.js';

const RARITY_TOKEN_RE = /_(common|uncommon|rare|epic|legendary)$/i;
const RARITY_ORDER = { Common: 0, Uncommon: 1, Rare: 2, Epic: 3, Legendary: 4 };

/* Doublon déprécié laissé dans les données : clé en `_old` OU nom finissant
   par « Old » (ex. « Synthesis Item Upgrade T1 Uncommon Old »). Jamais membre
   ni représentant d'un groupe, et jamais indexé en recherche. */
function isDeprecatedItem(key, it) {
  return /_old$/i.test(key || '') || /\bold$/i.test((it && it.name || '').trim());
}

function buildRarityGroups() {
  const buckets = new Map();   // (stem \0 nomReplié) -> {Rareté: clé}
  for (const [key, it] of Object.entries(S.items || {})) {
    if (isDeprecatedItem(key, it)) continue;
    const m = RARITY_TOKEN_RE.exec(key);
    if (!m) continue;   // pas de rareté en dernier token -> pas une variante
    const rarity = capitalize(m[1]);
    // stem ET nom replié doivent coïncider : deux items sans rapport qui
    // partagent juste un stem (ou un nom) ne fusionnent jamais.
    const bk = key.slice(0, m.index) + ' ' + fold(it.name);
    let b = buckets.get(bk);
    if (!b) buckets.set(bk, b = {});
    if (!(rarity in b)) b[rarity] = key;   // 1re clé rencontrée gagne (déterministe)
  }
  S.rarityGroups = new Map();
  S.rarityGroupOf = new Map();
  for (const variants of buckets.values()) {
    const rars = Object.keys(variants);
    if (rars.length < 2) continue;   // un groupe réel a >=2 raretés distinctes
    // Représentant déterministe : rareté canonique la plus basse, départage
    // par clé pour être stable d'un chargement à l'autre.
    rars.sort((a, b) => (RARITY_ORDER[a] - RARITY_ORDER[b]) || variants[a].localeCompare(variants[b]));
    const repKey = variants[rars[0]];
    S.rarityGroups.set(repKey, { baseName: S.items[repKey].name, variants });
    for (const r of rars) S.rarityGroupOf.set(variants[r], repKey);
  }
}

/* Groupe de rareté d'une clé item (null si l'item n'en fait pas partie).
   Membre non-représentant : renvoie quand même le groupe (via son repKey),
   pour que la fiche d'une variante précise affiche le sélecteur complet. */
function rarityGroupFor(key) {
  const rep = S.rarityGroupOf && S.rarityGroupOf.get(key);
  return rep ? S.rarityGroups.get(rep) : null;
}

/* Pastilles de rareté RÉELLES d'un groupe, triées dans l'ordre canonique
   croissant (Common → Legendary) : [{rarity, hex, icon}]. Alimente l'anneau
   conique du résultat de recherche multi-rareté (js/search.js) -- la seule
   couleur qu'un item groupé pouvait montrer jusqu'ici était celle de son
   représentant (rareté canonique la plus basse, souvent Uncommon -- voir
   itemColor(repIt) ailleurs), ce qui affichait UNE rareté arbitraire comme
   si c'était LA rareté de l'objet alors que la recherche annonce déjà "N
   raretés" en toutes lettres à côté. Chaque hex vient de la même table
   RARITY que tout le reste du site (config.js) -- jamais une teinte
   dupliquée en dur ici.
   `icon` (ajout hover-cycle, design pass "sliced ring crossfade") : l'icône
   PROPRE de cette variante (S.items[clé].icon), pas celle du représentant --
   sur 13 groupes site-wide, 3 ont un art distinct par palier (ex.
   synthesis_item_upgrade_t1_* -> Item_improving_consumable_t1/t2/t3.png,
   vérifié sur les données) et 10 partagent la même image pour toutes les
   raretés. null si cette variante précise n'a pas d'icône extraite (même
   repli que partout ailleurs -- iconTag affiche alors le glyph). Le camembert
   statique (ringGradient) continue de ne lire QUE .hex ; .icon n'est consommé
   que par le cycle de survol (voir search.js iconWithRing). */
function rarityGroupSwatches(grp) {
  if (!grp) return [];
  return Object.keys(grp.variants)
    .sort((a, b) => RARITY_ORDER[a] - RARITY_ORDER[b])
    .map(r => ({
      rarity: r,
      hex: (RARITY[r] && RARITY[r].hex) || 'var(--muted)',
      icon: (S.items[grp.variants[r]] && S.items[grp.variants[r]].icon) || null,
    }));
}

export { RARITY_ORDER, isDeprecatedItem, buildRarityGroups, rarityGroupFor, rarityGroupSwatches };
