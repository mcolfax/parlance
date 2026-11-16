"use strict";
/* ===================== YOUR WEEK (a recap of last week, Monday to Sunday) =====================
   Built from what's already saved: days (XP and goal days, all languages), and this language's lessons, stories and
   cards. Shown on Learn Monday to Wednesday until opened or dismissed (remembered on this device), and from Me any time. */
const RECAP_KEY = 'parlance.recap';
function recapGet(){ try { return localStorage.getItem(RECAP_KEY) || ''; } catch (e) { return ''; } }
function recapSet(v){ try { localStorage.setItem(RECAP_KEY, v); } catch (e) {} }
function mondayOf(k){ return addDays(k, -((parseDay(k).getDay() + 6) % 7)); }
function lastMonday(t){ return addDays(mondayOf(t || today()), -7); }
function weekRecap(lang, mon){
  const days = [...Array(7)].map((_, i) => addDays(mon, i)), xps = days.map(k => goalXP(S.days[k]));
  const tot = k => (S.days[k] && +S.days[k].xp) || 0;
  const xp = days.map(tot).reduce((a, b) => a + b, 0), top = Math.max(...xps), inWeek = at => !!at && at >= days[0] && at <= days[6];
  const prevXp = [...Array(7)].map((_, i) => tot(addDays(mon, i - 7))).reduce((a, b) => a + b, 0);
  const L = S.langs[lang], t = today(); let upcoming = 0;
  for (const c of Object.values(L.cards)) if (c && c.due && daysBetween(t, c.due) <= 7) upcoming++;
  return { lang, mon, days, xps, xp, prevXp,
    goalDays: days.filter(k => S.days[k] && S.days[k].met).length, activeDays: xps.filter(x => x > 0).length,
    bestDay: top > 0 ? days[xps.indexOf(top)] : null, bestXp: top,
    lessons: Object.values(L.done).filter(d => d && inWeek(d.at)).length, stories: Object.values(L.stories).filter(d => d && inWeek(d.at)).length,
    streak: streakInfo().count, upcoming };
}
/* the Monday a recap card should show for on day t, or null */
function recapDue(lang, t){
  const mon = lastMonday(t), dow = (parseDay(t).getDay() + 6) % 7;
  if (dow > 2 || recapGet() === mon) return null;
  return weekRecap(lang, mon).activeDays > 0 ? mon : null;
}
function recapRange(mon){ const f = k => parseDay(k).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); return f(mon) + ' – ' + f(addDays(mon, 6)); }
function recapCompare(r){
  if (!r.prevXp) return !r.xp ? '' : Object.keys(S.days).some(k => k < addDays(r.mon, -7) && S.days[k] && +S.days[k].xp > 0) ? 'A fresh start after a quiet week.' : 'Your first week. A great start.';
  const pct = Math.round((r.xp - r.prevXp) / r.prevXp * 100);
  return pct >= 0 ? 'Up ' + pct + '% on the week before.' : 'Down ' + (-pct) + '% on the week before. A short lesson today gets you going again.';
}
function recapShareText(r){
  return 'My week learning ' + LANGS[r.lang].name + ' on Parlance: ' + r.xp + ' XP, ' + r.goalDays + ' of 7 goal days' + (r.streak ? ', and a ' + r.streak + '-day streak' : '') + '.';
}
function shareRecap(r){
  const text = recapShareText(r), url = Web.on ? FRIENDS.links.web : FRIENDS.links.claude;
  const copy = () => copyThen(text + ' ' + url, 'Copied. Paste it anywhere.');
  if (navigator.share) navigator.share({ text, url }).catch(e => { if (!e || e.name !== 'AbortError') copy(); }); else copy();
}
function recapCard(){
  const lang = S.settings.lang, mon = recapDue(lang, today()); if (!mon) return null;
  const r = weekRecap(lang, mon);
  return h('section', { class: 'card recap-card' },
    h('div', { class: 'row' }, h('span', { class: 'eyebrow' }, 'Your week'), h('span', { class: 'spacer' }), h('span', { class: 'small muted' }, recapRange(mon))),
    h('h3', null, r.xp + ' XP · ' + r.goalDays + ' of 7 goal days'),
    h('button', { class: 'btn btn-quiet btn-wide', type: 'button', onclick: () => openRecap(mon) }, ic('spark'), 'See your week'),
    h('button', { class: 'linkish small', type: 'button', onclick: () => { recapSet(mon); UI.animate = false; render(); } }, 'Not now'));
}
function openRecap(mon){
  const lang = S.settings.lang, r = weekRecap(lang, mon), goal = S.settings.goal, max = Math.max(goal * 1.25, ...r.xps, 1);
  const names = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  recapSet(mon);
  const li = (txt) => txt ? h('li', null, txt) : null;
  sheet('Your week', h('div', { class: 'recap' },
    h('div', { class: 'row recap-top' }, pip(r.goalDays >= 5 ? 'dance' : r.activeDays >= 3 ? 'cheer' : 'happy', 64, { tap: false }), h('div', { class: 'grow' }, h('p', { class: 'small muted' }, recapRange(mon) + ' · ' + LANGS[lang].name), h('p', null, recapCompare(r)))),
    h('div', { class: 'tiles3' },
      h('div', { class: 'stat' }, h('span', { class: 'num' }, r.xp), h('span', { class: 'lbl' }, 'XP')),
      h('div', { class: 'stat' }, h('span', { class: 'num' }, r.goalDays + '/7'), h('span', { class: 'lbl' }, 'goal days')),
      h('div', { class: 'stat' }, h('span', { class: 'num' }, r.streak), h('span', { class: 'lbl' }, 'day streak'))),
    h('div', { class: 'bars', role: 'img', 'aria-label': 'XP per day, Monday to Sunday: ' + r.xps.join(', ') },
      h('span', { class: 'goal-line', style: 'bottom:' + (24 + Math.round(goal / max * 100)) + 'px' }, h('span', null, goal)),
      r.days.map((k, i) => h('div', { class: 'bar' + (r.xps[i] >= goal ? '' : ' miss') }, h('i', { style: 'height:' + Math.max(3, Math.round(r.xps[i] / max * 100)) + 'px;--d:' + i }), h('span', null, names[parseDay(k).getDay()])))),
    h('ul', { class: 'recap-list' },
      li(r.lessons ? r.lessons + ' ' + plural(r.lessons, 'lesson') + ' finished' : ''),
      li(r.stories ? r.stories + ' ' + plural(r.stories, 'story', 'stories') + ' read' : ''),
      li(r.bestDay ? 'Best day: ' + parseDay(r.bestDay).toLocaleDateString(undefined, { weekday: 'long' }) + ', ' + r.bestXp + ' XP' : ''),
      li(r.upcoming ? r.upcoming + ' ' + plural(r.upcoming, 'review', 'reviews') + ' due now or this week' : ''))),
    [{ label: 'Share my week', run: () => { shareRecap(r); return true; } }, { label: 'Done', primary: true, run: () => { UI.animate = false; render(); } }]);
}
