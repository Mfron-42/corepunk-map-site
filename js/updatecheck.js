/* Kwalat — détection de mise à jour des données en direct (complément du
   cache-busting ?v=<jeton> de js/data.js). Ce module ne s'occupe QUE d'un
   onglet resté ouvert PENDANT qu'un nouveau déploiement a lieu ailleurs : il
   revérifie périodiquement (+ à la reprise de focus/visibilité) version.json
   (no-store, jamais mis en cache) et, si le jeton diffère de celui chargé au
   boot de cet onglet, affiche un bandeau discret proposant un rechargement —
   JAMAIS de rechargement automatique (un joueur en pleine consultation de la
   carte ne doit jamais se la faire arracher sous les pieds). Incident réel
   motivant ce module : un onglet resté ouvert des heures continuait de
   montrer des données de quête d'avant déploiement, au point que le joueur a
   conclu qu'une fonctionnalité pourtant livrée n'existait pas.

   Dégradation gracieuse totale, comme data.js::fetchVersionStamp : sans
   version.json au boot (local/dev/pré-1er-déploi), ce module ne démarre même
   pas de surveillance (rien à comparer) — jamais d'erreur console, jamais de
   bandeau fantôme. */
import { tr } from './i18n/index.js';
import { bootVersionStamp, fetchVersionStamp } from './data.js';

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000; // 5 min (voir spec : "toutes les 5-10 min")

/* Intervalle testable via le hash `#updateCheckMs=2000` — même idiome que
   `on=devcontent` (state.js::initialDevOn) ou `lang=` (i18n/index.js) : lu
   UNE FOIS au démarrage, jamais recréé dynamiquement. Sans ce paramètre (le
   cas normal en production), l'intervalle par défaut ci-dessus s'applique. */
function resolveIntervalMs() {
  try {
    const p = new URLSearchParams(location.hash.replace(/^#/, ''));
    const raw = p.get('updateCheckMs');
    const n = raw ? parseInt(raw, 10) : NaN;
    if (Number.isFinite(n) && n > 0) return n;
  } catch (e) { /* ignore */ }
  return DEFAULT_INTERVAL_MS;
}

let banner = null;
let shown = false;
let checking = false;

function ensureBanner() {
  if (banner) return banner;
  banner = document.createElement('div');
  banner.className = 'update-banner';
  banner.setAttribute('role', 'status');
  const msg = document.createElement('span');
  msg.className = 'update-banner-msg';
  const reload = document.createElement('button');
  reload.type = 'button';
  reload.className = 'update-banner-reload';
  reload.addEventListener('click', () => location.reload());
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'update-banner-close';
  close.addEventListener('click', hideBanner);
  banner.append(msg, reload, close);
  document.body.appendChild(banner);
  return banner;
}

function renderBannerText() {
  if (!banner) return;
  banner.querySelector('.update-banner-msg').textContent = tr('dataUpdatedBanner');
  banner.querySelector('.update-banner-reload').textContent = tr('dataUpdatedReloadBtn');
  const close = banner.querySelector('.update-banner-close');
  close.textContent = '×';
  close.setAttribute('aria-label', tr('closeBtnAria'));
}

function showBanner() {
  if (shown) return;
  shown = true;
  ensureBanner();
  renderBannerText();
  // rAF : laisse le navigateur peindre l'état initial (opacity 0/translaté)
  // avant d'ajouter la classe qui déclenche la transition CSS d'entrée.
  requestAnimationFrame(() => banner.classList.add('is-shown'));
}

function hideBanner() {
  if (!banner) return;
  banner.classList.remove('is-shown');
}

/* Ré-appelée par main.js (applyStaticI18n) si la langue change PENDANT que le
   bandeau est déjà affiché — sans ça il resterait figé dans l'ancienne
   langue. No-op tant que le bandeau n'a jamais été montré. */
function refreshUpdateBannerI18n() {
  if (shown) renderBannerText();
}

async function checkForUpdate(bootStamp) {
  if (checking || shown) return;
  checking = true;
  try {
    const fresh = await fetchVersionStamp();
    if (fresh && fresh !== bootStamp) showBanner();
  } catch (e) { /* réseau capricieux : le prochain tick réessaiera */ }
  finally { checking = false; }
}

/* Démarre la surveillance périodique + focus/visibilitychange. Ne fait
   RIEN si aucun jeton n'a pu être chargé au boot (site local/dev, ou premier
   déploiement pas encore fait) : il n'y a alors rien à comparer, et créer un
   minuteur qui ne ferait jamais rien serait juste du bruit. */
function startUpdateWatcher() {
  const bootStamp = bootVersionStamp();
  if (!bootStamp) return;
  const intervalMs = resolveIntervalMs();
  setInterval(() => checkForUpdate(bootStamp), intervalMs);
  window.addEventListener('focus', () => checkForUpdate(bootStamp));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate(bootStamp);
  });
}

export { startUpdateWatcher, refreshUpdateBannerI18n };
