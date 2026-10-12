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
if (recOn()) recIndex(S.settings.lang);   // the recorded voices' index, so the first tap can use it
setTimeout(() => { if (recOn()) recWarm(S.settings.lang, [LANGS[S.settings.lang].hello, ...Object.values(PIP_SAYS[S.settings.lang] || {}).flat()]); }, 1500); // and the pack with the greetings and Pip's lines
Promise.race([remoteP, sleep(2600)]).then(() => {
  if (!S.settings.onboarded && !busy()) openOnboarding(false);
  else setTimeout(() => { if (!maybeWhatsNew()) afterLiveConfig(); }, 600);
});
/* test and debugging hooks */
window.__parlance = { APP_VERSION, COURSE, STORIES, CAST, BADGES, QUESTS, Packs, Live, buildLesson, glossLookup, checkBadges, questIds, mergeDays, mergeBadges, evaluate, check, answerDiff, closestAnswer, norm, fold, englishVariants, tileTokens, reviewEx, streakInfo, srsUpdate, sanitizeLesson, speechScore, mergeLang, mergeCore, mergeGen, mergeWhole, makeBackupCode, readBackup, defaultState, mergeState, itemKey, resolveKey, migrateCardKeys, validatePack, applyContentDocs, allStories, filmActors, voiceLines, recKey, get S(){ return S; }, set S(v){ S = v; } };
