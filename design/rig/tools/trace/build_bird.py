"""Write js/core/<bird>.js for one of the cast's other birds: its template (birds/<bird>.tpl.js, the hand-written part:
the states the sheet doesn't draw, the palette, pivots and pose changes) with the traced drawings and measures from its
trace (<work>/trace/t.json, written by birds/<bird>.py) put in. __TRACED__ becomes the drawings, one per line with
the trace's notes as comments, and __CONSTS__ the measures (C in the template).
Usage: python3 -I build_bird.py <bird>"""
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from kit import work

bird = sys.argv[1]
W, CFG = work(bird)
J = json.load(open(W + '/trace/t.json'))
tpl = open(os.path.join(HERE, 'birds', bird + '.tpl.js')).read()
OUT = os.path.join(HERE, '..', '..', '..', '..', 'js', 'core', bird + '.js')


def js_str(s): return "'" + s.replace('\\', '\\\\').replace("'", "\\'") + "'"


def js_val(v):
    if isinstance(v, dict): return '{ ' + ', '.join(k + ': ' + js_val(x) for k, x in v.items()) + ' }'
    if isinstance(v, (list, tuple)): return '[' + ', '.join(js_val(x) for x in v) + ']'
    if isinstance(v, float): return '%g' % round(v, 4)
    return json.dumps(v)


notes = J.get('notes', {})
lines = []
for k, v in J['T'].items():
    if k in notes: lines.append('    /* ' + notes[k] + ' */')
    lines.append('    ' + k + ': ' + js_str(v) + ',')
js = tpl.replace('__TRACED__', '\n'.join(lines).rstrip(',')).replace('__CONSTS__', js_val(J['consts']))
open(OUT, 'w').write(js)
print('wrote', os.path.normpath(OUT), len(js), 'bytes')
