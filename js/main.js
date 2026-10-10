"use strict";
/* ===================== BOOT =====================
   Order matters: content first (built-in + cached live packs), then saved state (which migrates
   old review-card keys against that content), then the first render, then account sync and live updates.
   ================================================ */
loadCachedContent();
assembleCourse();
S = loadLocal();
reindex();
applyLang();
render();
initCaps();
const remoteP = initRemote();
setTimeout(() => { if (homeMusicOn()) songPrefetch(); }, 1200); // fetch the theme song early so the first tap can start it
Promise.race([remoteP, sleep(2600)]).then(() => {
  if (!S.settings.onboarded && !busy()) openOnboarding(false);
  else setTimeout(() => { if (!maybeWhatsNew()) afterLiveConfig(); }, 600);
});
/* test and debugging hooks */
window.__parlance = { APP_VERSION, COURSE, STORIES, CAST, BADGES, QUESTS, Packs, Live, buildLesson, glossLookup, checkBadges, questIds, mergeDays, mergeBadges, evaluate, check, norm, fold, englishVariants, tileTokens, reviewEx, streakInfo, srsUpdate, sanitizeLesson, speechScore, mergeLang, mergeCore, mergeGen, mergeWhole, makeBackupCode, readBackup, defaultState, mergeState, itemKey, resolveKey, migrateCardKeys, validatePack, applyContentDocs, allStories, filmActors, get S(){ return S; }, set S(v){ S = v; } };
