"use strict";
/* ===================== REVIEW TAB (with your word list) ===================== */
function viewReview(){
  const lang = S.settings.lang; const due = dueCount(lang); const all = learnedEntries(lang);
  const t = today(); let tomorrow = 0, week = 0;
  for (const e of all){ const d = daysBetween(t, e.card.due); if (d === 1) tomorrow++; if (d >= 1 && d <= 7) week++; }
  const v = h('div', { class: 'view' }, topBar());
  const fix = mistakeEntries(lang).length, forms = formLessons(lang).length;
  v.append(h('section', { class: 'hero' },
    h('div', { class: 'hero-art', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')),
    h('div', { class: 'hero-top' },
      h('div', { class: 'grow' },
        h('span', { class: 'eyebrow' }, 'Spaced repetition · ' + LANGS[lang].name),
        h('h2', null, due ? due + ' ' + plural(due, 'item') + ' ready' : 'You’re all caught up'),
        h('p', { class: 'muted' }, due ? 'Each item returns just before you’d forget it. Get it right and it waits longer next time.' : (all.length ? 'Coming up: ' + tomorrow + ' tomorrow, ' + week + ' this week.' : 'Finish a lesson and its words and phrases land here.'))),
      pip(due ? 'ready' : all.length ? 'sleep' : 'think', 72, { cls: 'hero-pip', say: due ? null : all.length ? 'Zzz…' : null })),
    due ? h('button', { class: 'btn btn-primary btn-wide shine', type: 'button', onclick: () => startReview(false) }, 'Review ' + Math.min(due, 20) + ' ' + plural(Math.min(due, 20), 'item')) : null,
    fix ? h('button', { class: 'btn btn-quiet btn-wide', type: 'button', onclick: () => startMistakes() }, ic('flag'), 'Fix my mistakes (' + fix + ')') : null,
    all.length ? h('button', { class: 'btn btn-ghost btn-wide', type: 'button', onclick: () => startReview(true) }, 'Practice my weakest items') : null,
    forms ? h('button', { class: 'btn btn-ghost btn-wide', type: 'button', onclick: () => startForms() }, ic('bulb'), 'Practice verb forms and endings') : null));
  const counts = { new: 0, learning: 0, strong: 0 };
  for (const e of all){ const n = e.card.n || 0; if (n === 0) counts.new++; else if (n < 3) counts.learning++; else counts.strong++; }
  const total = Math.max(1, all.length);
  if (all.length) v.append(h('section', { class: 'card' }, h('div', { class: 'row' }, h('h3', null, 'Memory strength'), h('span', { class: 'spacer' }), h('span', { class: 'small muted' }, all.length + ' ' + plural(all.length, 'item'))),
    h('div', { class: 'strength-bar', role: 'img', 'aria-label': counts.new + ' new, ' + counts.learning + ' learning, ' + counts.strong + ' strong' },
      h('i', { class: 's-new', style: 'flex:' + counts.new / total }), h('i', { class: 's-learn', style: 'flex:' + counts.learning / total }), h('i', { class: 's-strong', style: 'flex:' + counts.strong / total })),
    h('div', { class: 'legend' }, h('span', null, h('i', { class: 's-new' }), counts.new + ' new'), h('span', null, h('i', { class: 's-learn' }), counts.learning + ' learning'), h('span', null, h('i', { class: 's-strong' }), counts.strong + ' strong')),
    h('p', { class: 'small muted' }, 'Every item keeps its own interval: 1 day, then 3, then longer each time you get it right first try. As items mature, multiple choice gives way to typing.')));
  // word list
  const list = h('div', { id: 'word-list' });
  const search = h('input', { class: 'input', type: 'search', id: 'word-search', placeholder: 'Search ' + LANGS[lang].name + ' or English', value: UI.wordQuery, autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', oninput: e => { UI.wordQuery = e.target.value; fillWords(list); } });
  v.append(h('section', { class: 'words-sec' },
    h('div', { class: 'row' }, h('h2', null, 'Your words'), h('span', { class: 'spacer' }), h('span', { class: 'small muted' }, 'tap to hear')),
    h('div', { class: 'field' }, h('label', { for: 'word-search', class: 'sr' }, 'Search words'), search),
    h('div', { class: 'chips' }, [['v', 'My words'], ['s', 'My phrases'], ['all', 'All course words']].map(([k, label]) =>
      h('button', { class: 'chip', type: 'button', 'aria-pressed': String(UI.wordFilter === k), onclick: () => { UI.wordFilter = k; render(); } }, label))),
    lang === 'de' ? h('div', { class: 'legend g' }, h('span', { class: 'g-m' }, 'der · masculine'), h('span', { class: 'g-f' }, 'die · feminine'), h('span', { class: 'g-n' }, 'das · neuter'), h('span', { class: 'g-pl' }, 'die · plural')) : null,
    list));
  fillWords(list);
  return v;
}
function fillWords(list){
  const lang = S.settings.lang; const q = fold(norm(UI.wordQuery, 'en'));
  let rows;
  if (UI.wordFilter === 'all'){
    const seen = new Set(); rows = [];
    for (const l of allLessons(lang)) l.vocab.forEach((it, i) => { const k = it.t; if (seen.has(k)) return; seen.add(k); rows.push({ item: it, card: cardsFor(lang)[itemKey(l, 'v', i)] || null, lesson: l }); });
  } else rows = learnedEntries(lang, UI.wordFilter).map(e => ({ item: e.item, card: e.card, lesson: e.lesson }));
  if (q) rows = rows.filter(r => fold(norm(r.item.t, lang)).includes(q) || r.item.e.some(e => fold(norm(e, 'en')).includes(q)));
  const t = today();
  if (!rows.length){ list.replaceChildren(h('div', { class: 'empty' }, pip(UI.wordFilter === 'all' || q ? 'shrug' : 'think', 64, { tap: UI.wordFilter === 'all' || q }), h('p', { class: 'muted' }, UI.wordFilter === 'all' ? 'No words match that search.' : q ? 'Nothing saved matches that search.' : 'Finish a lesson and its ' + (UI.wordFilter === 's' ? 'phrases' : 'words') + ' show up here.'))); return; }
  const shown = rows.slice(0, UI.wordLimit || 150);
  const more = rows.length > shown.length ? h('button', { class: 'btn btn-quiet btn-wide', type: 'button', onclick: () => { UI.wordLimit = (UI.wordLimit || 150) + 300; fillWords(list); } }, 'Show more (' + (rows.length - shown.length) + ')') : null;
  list.replaceChildren(h('p', { class: 'small muted' }, rows.length + ' ' + plural(rows.length, UI.wordFilter === 's' ? 'phrase' : 'word')), ...shown.map(r => {
    let meta = '';
    if (r.card){ const d = daysBetween(t, r.card.due); meta = d <= 0 ? 'due now' : 'next in ' + d + ' ' + plural(d, 'day'); }
    const n = r.card ? r.card.n || 0 : -1;
    return h('div', { class: 'wrow' },
      h('div', { class: 'w-main' }, h('div', { class: 't' }, itemText(r.item, lang)), h('div', { class: 'e' }, r.item.e.slice(0, 3).join(', '),
        h('span', { class: 'w-meta' }, ' · ' + r.lesson.level + (meta ? ' · ' + meta : '')),
        r.card ? h('span', { class: 'strength', title: 'Strength', 'aria-label': 'Strength ' + Math.min(4, n + 1) + ' of 4' }, [0, 1, 2, 3].map(i => h('i', { class: i <= Math.min(3, n) ? 'on' : '' }))) : null)),
      speakBtn(r.item.t, lang));
  }), more);
}

