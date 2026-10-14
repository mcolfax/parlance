"use strict";
/* ===================== BOOT =====================
   Order matters: content first (built-in + cached live packs), then saved state (which migrates
   old review-card keys against that content), then the learner's bird, then the first render, then account sync
   and live updates.
   ================================================ */
loadCachedContent();
assembleCourse();
S = loadLocal();
reindex();
applyLang();
if (recOn()) recIndex(S.settings.lang);   // the recorded voices' index, so the first tap can use it
setTimeout(() => { if (recOn()) recWarm(S.settings.lang, [LANGS[S.settings.lang].hello, ...Object.values(PIP_SAYS[S.settings.lang] || {}).flat()]); }, 1500); // and the pack with the greetings and the birds' lines
function boot(){
  render();
  initCaps();
  const remoteP = initRemote();
  setTimeout(() => { if (homeMusicOn()) songPrefetch(); }, 1200); // fetch the theme song early so the first tap can start it
  Promise.race([remoteP, sleep(2600)]).then(() => {
    if (!S.settings.onboarded && !busy()) openOnboarding(false);
    else setTimeout(() => { if (!maybeWhatsNew()) afterLiveConfig(); }, 600);
  });
}
/* a learner who picked a bird other than Pip sees it from the first screen: its part sheet loads first (a moment;
   Pip stands in if it takes longer than that) */
if (S.settings.mascot !== 'pip' && MASCOTS[S.settings.mascot]) Promise.race([loadMascot(S.settings.mascot).catch(() => {}), sleep(2500)]).then(boot);
else boot();
/* test and debugging hooks */
window.__parlance = { APP_VERSION, lexToks, ARTICLES, blankSaid, COURSE, STORIES, CAST, BADGES, QUESTS, Packs, Live, buildLesson, glossLookup, checkBadges, questIds, mergeDays, mergeBadges, evaluate, check, answerDiff, closestAnswer, norm, fold, englishVariants, tileTokens, reviewEx, streakInfo, srsUpdate, sanitizeLesson, speechScore, mergeLang, mergeCore, mergeGen, mergeWhole, makeBackupCode, readBackup, defaultState, mergeState, itemKey, resolveKey, migrateCardKeys, validatePack, applyContentDocs, allStories, filmActors, voiceLines, recKey, get S(){ return S; }, set S(v){ S = v; } };
