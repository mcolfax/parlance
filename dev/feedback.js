"use strict";
/* Feedback → Claude Code → thanks. Prints SQL to run on the web version's Supabase project (ibrweunxigetiazzuwiz) with
   execute_sql; it never connects anywhere itself.

   node dev/feedback.js open                              open notes (not yet closed) and approved proposals
   node dev/feedback.js close <version> "<message>" --proposal <id>
   node dev/feedback.js close <version> "<message>" --notes <id,id,...>

   close stamps each note with resolved: { at, version, proposal, note } in that learner's feedback doc. The next time they
   open Parlance they get a thank-you with your message, once (maybeThanks in js/ui/feedback.js). With --proposal it also
   marks the proposal shipped. Notes already closed are left alone, so running it twice is safe.
   (The Claude artifact's own database can't be reached with SQL; Studio → Proposals → Mark shipped does the same there.) */
const q = s => "'" + String(s).replace(/'/g, "''") + "'";
const [cmd, ...rest] = process.argv.slice(2);
const flag = n => { const i = rest.indexOf(n); return i < 0 ? null : rest[i + 1]; };

if (cmd === 'open'){
  console.log(`-- open learner notes (rating taps are left out)
select d.path as uid_path, i->>'id' as id, i->>'type' as type, to_timestamp((i->>'at')::bigint / 1000) as sent, i->>'text' as text, i->'ctx' as ctx
from public.docs d, jsonb_array_elements(d.data->'items') i
where d.coll = 'feedback' and i->>'type' <> 'rating' and not (i ? 'resolved')
order by (i->>'at')::bigint desc;

-- approved proposals waiting to be built
select path, data->>'title' as title, data->>'kind' as kind, data->>'change' as change, data->>'note' as owner_note, data->'evidence' as notes
from public.docs where coll = 'proposals' and path <> 'proposals/_meta' and data->>'status' = 'approved';`);
} else if (cmd === 'close'){
  const [version, message] = rest;
  const proposal = flag('--proposal'), notes = flag('--notes');
  if (!/^\d+\.\d+\.\d+$/.test(version || '') || !message || message.startsWith('--') || (!proposal && !notes)){
    console.error('usage: node dev/feedback.js close <version> "<message>" (--proposal <id> | --notes <id,id,...>)'); process.exit(1);
  }
  const ids = proposal ? `(select jsonb_array_elements_text(data->'evidence') from public.docs where path = ${q('proposals/' + proposal)})` : `(select unnest(array[${notes.split(',').map(s => q(s.trim())).join(', ')}]))`;
  console.log(`-- close the notes${proposal ? ' behind proposal ' + proposal : ''} in ${version}
update public.docs d set updated_at = now(), data = jsonb_set(d.data, '{items}', (
  select jsonb_agg(case when (i->>'id') in ${ids} and not (i ? 'resolved')
    then i || jsonb_build_object('resolved', jsonb_build_object('at', (extract(epoch from now()) * 1000)::bigint, 'version', ${q(version)}, 'proposal', ${q(proposal || '')}, 'note', ${q(message)}))
    else i end order by ord)
  from jsonb_array_elements(d.data->'items') with ordinality t(i, ord)))
where d.coll = 'feedback' and exists (select 1 from jsonb_array_elements(d.data->'items') i where (i->>'id') in ${ids});`);
  if (proposal) console.log(`
update public.docs set updated_at = now(), data = data || jsonb_build_object('status', 'shipped', 'version', ${q(version)}, 'shippedAt', (extract(epoch from now()) * 1000)::bigint, 'thanks', ${q(message)}, 'updatedAt', (extract(epoch from now()) * 1000)::bigint)
where path = ${q('proposals/' + proposal)};`);
} else { console.error('usage: node dev/feedback.js open | close <version> "<message>" (--proposal <id> | --notes <id,id,...>)'); process.exit(1); }
