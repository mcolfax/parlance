"""Concept art for the Parlance design review: four Pip parrots (three moods each) and three cast styles."""
import os
OUT = os.path.join(os.path.dirname(__file__), 'art')
INK = '#1B1B22'

def eyes(mood, l=(82, 76), r=(118, 76), ring=None):
    s = ''
    for (x, y) in (l, r):
        if ring: s += f'<circle cx="{x}" cy="{y}" r="{ring[1]}" fill="{ring[0]}"/>'
        if mood == 'cheer':
            s += f'<path d="M{x-8} {y+3} Q{x} {y-8} {x+8} {y+3}" fill="none" stroke="{INK}" stroke-width="4.6" stroke-linecap="round"/>'
        elif mood == 'oops':
            s += f'<circle cx="{x}" cy="{y+1}" r="6" fill="{INK}"/><circle cx="{x+2}" cy="{y-1}" r="1.8" fill="#fff"/>'
        else:
            s += f'<circle cx="{x}" cy="{y}" r="7.6" fill="{INK}"/><circle cx="{x+2.6}" cy="{y-2.6}" r="2.6" fill="#fff"/>'
    if mood == 'oops':
        s += f'<path d="M{l[0]-10} {l[1]-12} L{l[0]+7} {l[1]-18}" stroke="{INK}" stroke-width="3.6" stroke-linecap="round"/>'
        s += f'<path d="M{r[0]+10} {r[1]-12} L{r[0]-7} {r[1]-18}" stroke="{INK}" stroke-width="3.6" stroke-linecap="round"/>'
        s += '<path d="M150 46 q7 11 0 16 q-7 -5 0 -16z" fill="#7CC4F2"/>'
    return s

def beak(mood, upper, lower, small=False):
    k = 0.78 if small else 1
    def sc(path):  # scale beak around its top centre (100, 86)
        return f'<g transform="translate(100 86) scale({k}) translate(-100 -86)">{path}</g>'
    if mood == 'cheer':
        return sc(f'<path d="M89 104 Q100 128 111 104 Q100 110 89 104Z" fill="{lower}"/><ellipse cx="100" cy="114" rx="5" ry="3.4" fill="#F27A8C"/>'
                  f'<path d="M85 86 Q100 77 115 86 Q115 100 100 108 Q85 100 85 86Z" fill="{upper}"/>')
    return sc(f'<path d="M91 101 Q100 117 109 101 Q105 111 100 113 Q95 111 91 101Z" fill="{lower}"/>'
              f'<path d="M85 87 Q100 78 115 87 Q115 103 100 114 Q85 103 85 87Z" fill="{upper}"/>')

def wings(mood, base, top=None, tip=None, scallop=None, patch=None):
    w = 'M64 118 C46 126 42 156 56 182 C68 174 76 150 72 120Z'
    s = f'<path d="{w}" fill="{base}"/>'
    if tip: s += f'<path d="M50 160 C52 170 54 176 56 182 C62 177 66 170 69 160 C62 164 56 164 50 160Z" fill="{tip}"/>'
    if top: s += f'<path d="M64 118 C52 124 48 136 49 148 C58 146 68 140 72 126 C71 122 68 119 64 118Z" fill="{top}"/>'
    if scallop: s += ''.join(f'<path d="M{52+i*2} {136+i*12} q6 5 12 0" fill="none" stroke="{scallop}" stroke-width="2.6" stroke-linecap="round"/>' for i in range(3))
    if patch: s += f'<ellipse cx="66" cy="126" rx="6" ry="8" fill="{patch}" transform="rotate(20 66 126)"/>'
    rot = 58 if mood == 'cheer' else (-6 if mood == 'oops' else 0)  # positive swings the wing out and up
    left = f'<g transform="rotate({rot} 68 120)">{s}</g>'
    right = f'<g transform="translate(200 0) scale(-1 1)"><g transform="rotate({rot} 68 120)">{s}</g></g>'
    return left + right

def feet(): return '<g fill="#8D99A6"><ellipse cx="86" cy="188" rx="9" ry="5"/><ellipse cx="114" cy="188" rx="9" ry="5"/></g>'
def shadow(): return '<ellipse cx="100" cy="206" rx="46" ry="6" fill="#000" opacity=".10"/>'
def blush(mood, color='#FF8FA3'): return '' if mood == 'oops' else f'<ellipse cx="70" cy="98" rx="8" ry="4.6" fill="{color}" opacity=".55"/><ellipse cx="130" cy="98" rx="8" ry="4.6" fill="{color}" opacity=".55"/>'
def svg(inner, vb='0 -24 200 240'): return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="400" height="480">{inner}</svg>'
def hop(mood, inner): return f'<g transform="translate(0 {-8 if mood == "cheer" else 0})">{inner}</g>'

def macaw(m):  # B · Rojo, a scarlet macaw
    body = '#E2352D'; belly = '#EF5A45'
    s = shadow() + hop(m,
        '<path d="M88 176 L80 222 L100 212 L120 222 L112 176Z" fill="#2C6BE0"/><path d="M95 176 L94 216 L100 211 L106 216 L105 176Z" fill="#E2352D"/>' +
        feet() + f'<ellipse cx="100" cy="142" rx="44" ry="46" fill="{body}"/><ellipse cx="100" cy="152" rx="27" ry="31" fill="{belly}"/>' +
        wings(m, '#2C6BE0', top='#FFC93C', tip='#1E3F9E') +
        f'<circle cx="100" cy="78" r="46" fill="{body}"/>' +
        '<ellipse cx="80" cy="78" rx="16" ry="18" fill="#FFF3EA"/><ellipse cx="120" cy="78" rx="16" ry="18" fill="#FFF3EA"/>' +
        '<g stroke="#E2352D" stroke-width="1.6" stroke-linecap="round" opacity=".55"><path d="M70 86 l6 1 M72 92 l6 0 M124 87 l6 -1 M122 92 l6 0"/></g>' +
        eyes(m) + beak(m, '#F3E4CC', '#2A2A2E') + blush(m, '#FF9A7A'))
    return svg(s)

def budgie(m):  # C · Kiwi, a budgie
    s = shadow() + hop(m,
        '<path d="M93 176 L90 224 L100 216 L110 224 L107 176Z" fill="#2E7F87"/>' + feet() +
        '<ellipse cx="100" cy="144" rx="42" ry="44" fill="#7DCB45"/><ellipse cx="100" cy="154" rx="26" ry="29" fill="#A8E06C"/>' +
        wings(m, '#5BAE37', tip='#2F6E2A', scallop='#24402A') +
        '<circle cx="100" cy="80" r="44" fill="#F7D84A"/>' +
        '<g fill="none" stroke="#2A2A2E" stroke-width="3" stroke-linecap="round"><path d="M76 46 q6 -6 12 0 M94 40 q6 -6 12 0 M112 46 q6 -6 12 0 M84 34 q6 -5 12 0 M104 34 q6 -5 12 0"/></g>' +
        eyes(m, (80, 78), (120, 78)) +
        '<ellipse cx="72" cy="104" rx="6" ry="7.5" fill="#4F6BDF"/><ellipse cx="128" cy="104" rx="6" ry="7.5" fill="#4F6BDF"/>' +
        '<g fill="#2A2A2E"><circle cx="86" cy="118" r="2.8"/><circle cx="95" cy="121" r="2.8"/><circle cx="105" cy="121" r="2.8"/><circle cx="114" cy="118" r="2.8"/></g>' +
        '<rect x="90" y="82" width="20" height="7" rx="3.5" fill="#5C7FE0"/>' + beak(m, '#E9C979', '#C9A85A', small=True))
    return svg(s)

def cockatoo(m):  # D · Kakadu, a sulphur-crested cockatoo
    outline = '#C5CDD6'
    ang = {'happy': [-34, -14, 6, 26], 'cheer': [-52, -28, -4, 20, 44], 'oops': [-78, -66, 66, 78]}[m]
    sc = {'happy': .86, 'cheer': 1.0, 'oops': .74}[m]
    crest = ''.join(f'<path d="M100 44 C90 28 90 8 100 -12 C110 8 110 28 100 44Z" fill="#FFCF3A" stroke="#E5A919" stroke-width="2" transform="rotate({a} 100 44) translate(100 44) scale({sc}) translate(-100 -44)"/>' for a in ang)
    s = shadow() + hop(m,
        f'<path d="M88 176 L84 222 L100 213 L116 222 L112 176Z" fill="#FBFAF6" stroke="{outline}" stroke-width="3" stroke-linejoin="round"/>' +
        '<path d="M94 190 L92 214 L100 210 L108 214 L106 190Z" fill="#FFE27A"/>' + feet() + crest +
        f'<ellipse cx="100" cy="142" rx="44" ry="46" fill="#FBFAF6" stroke="{outline}" stroke-width="3"/><ellipse cx="100" cy="152" rx="27" ry="31" fill="#F2EEE4"/>' +
        wings(m, '#F4F2EC', scallop='#D3D9E0') +
        f'<circle cx="100" cy="78" r="46" fill="#FBFAF6" stroke="{outline}" stroke-width="3"/>' +
        '<ellipse cx="66" cy="98" rx="9" ry="6" fill="#FFE27A" opacity=".75"/><ellipse cx="134" cy="98" rx="9" ry="6" fill="#FFE27A" opacity=".75"/>' +
        eyes(m, ring=('#CFE8F7', 12.5)) + beak(m, '#3A3A42', '#26262C'))
    return svg(s)

def amazon(m):  # E · Mango, a yellow-headed amazon (a parrot from Mexico)
    s = shadow() + hop(m,
        '<path d="M88 176 L82 222 L100 212 L118 222 L112 176Z" fill="#2E9E57"/><path d="M84 210 L82 222 L100 212 L118 222 L116 210 L100 204Z" fill="#E7D24A"/>' + feet() +
        '<ellipse cx="100" cy="142" rx="44" ry="46" fill="#2E9E57"/><ellipse cx="100" cy="152" rx="27" ry="31" fill="#5BBE74"/>' +
        wings(m, '#23874A', tip='#2D5FBF', patch='#E2412F') +
        '<circle cx="100" cy="78" r="46" fill="#FFD447"/><path d="M58 98 C70 120 130 120 142 98 C130 112 70 112 58 98Z" fill="#9CCB4E" opacity=".9"/>' +
        eyes(m, ring=('#FFFFFF', 12)) + beak(m, '#EBDDBF', '#B9A784') + blush(m, '#FF9A6B'))
    return svg(s)

# ---------- cast ----------
CAST = {
  'lena':  dict(skin='#F2C6A8', hair='#B5562B', shirt='#2F7F86', bg='#D7EBED', style='bob', freckles=True),
  'emre':  dict(skin='#C98E64', hair='#1E1B1A', shirt='#C22E29', bg='#F9E2DF', style='short', beard=True),
  'sofia': dict(skin='#D9A27A', hair='#2B1D18', shirt='#1A8448', bg='#DBF0E4', style='long', earrings=True),
  'diego': dict(skin='#C68A5E', hair='#3A2A20', shirt='#F4F1EA', bg='#FAEDCB', style='curly', beard=True, chef=True),
}
def dark(hexc, k=0.82):
    h = hexc.lstrip('#'); r, g, b = (int(h[i:i+2], 16) for i in (0, 2, 4))
    return '#%02X%02X%02X' % (int(r*k), int(g*k), int(b*k))

def hair_back(c):
    st = c['style']; col = c['hair']
    if st == 'bob': return f'<path d="M33 58 C29 30 45 21 60 21 C76 21 91 30 87 58 L89 76 C81 80 76 74 76 68 L44 68 C44 74 39 80 31 76Z" fill="{col}"/>'
    if st == 'long': return f'<path d="M31 60 C27 28 44 19 60 19 C78 19 93 30 89 60 L93 104 C81 108 72 98 74 86 L46 86 C48 98 39 108 27 104Z" fill="{col}"/>'
    return ''
def hair_front(c):
    st = c['style']; col = c['hair']
    if st == 'bob': return f'<path d="M36 47 C39 30 51 26 62 27 C74 28 83 34 84 47 C72 40 58 38 36 47Z" fill="{col}"/>'
    if st == 'long': return f'<path d="M36 51 C38 30 54 23 65 25 C77 27 85 36 84 49 C70 36 54 35 36 51Z" fill="{col}"/>'
    if st == 'short': return f'<path d="M36 49 C36 30 47 23 60 23 C74 23 85 31 84 49 C79 40 70 35 60 35 C50 35 41 40 36 49Z" fill="{col}"/>'
    if st == 'curly': return ''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{col}"/>' for x, y, r in [(41,42,9),(48,32,10),(60,27,11),(72,31,10),(80,41,9),(37,52,6),(84,51,6)])
    return ''
def face(c, line=None):
    sk = c['skin']; ink = line or INK
    s = f'<ellipse cx="37" cy="57" rx="4.5" ry="6" fill="{sk}"/><ellipse cx="83" cy="57" rx="4.5" ry="6" fill="{sk}"/>'
    s += f'<ellipse cx="60" cy="55" rx="23" ry="26" fill="{sk}"/>'
    if c.get('beard'):
        s += f'<path d="M38 58 C39 75 49 83 60 83 C71 83 81 75 82 58 C77 67 70 71 60 71 C50 71 43 67 38 58Z" fill="{c["hair"]}"/>'
    s += f'<g fill="{ink}"><circle cx="51" cy="55" r="2.7"/><circle cx="69" cy="55" r="2.7"/></g>'
    s += f'<path d="M46 48 q5 -3 9 -1 M65 47 q5 -2 9 1" fill="none" stroke="{c["hair"] if c["style"] != "bob" else dark(c["hair"])}" stroke-width="2.2" stroke-linecap="round"/>'
    s += f'<path d="M60 57 q-2.4 5 1 6" fill="none" stroke="{dark(sk, .7)}" stroke-width="1.8" stroke-linecap="round"/>'
    mouth = '#FFFFFF' if c.get('beard') else dark(sk, .55)
    s += f'<path d="M53 67 Q60 72 67 67" fill="none" stroke="{mouth}" stroke-width="2.2" stroke-linecap="round"/>'
    if c.get('freckles'): s += '<g fill="#C9774E" opacity=".7"><circle cx="45" cy="62" r="1"/><circle cx="48" cy="64" r="1"/><circle cx="72" cy="64" r="1"/><circle cx="75" cy="62" r="1"/></g>'
    if c.get('earrings'): s += '<g fill="#E5B23A"><circle cx="37" cy="66" r="2.6"/><circle cx="83" cy="66" r="2.6"/></g>'
    return s
def body(c):
    sh = c['shirt']
    s = f'<rect x="52" y="70" width="16" height="18" rx="4" fill="{dark(c["skin"], .88)}"/>'
    s += f'<path d="M14 122 C17 94 38 85 60 85 C82 85 103 94 106 122Z" fill="{sh}"/>'
    if c.get('chef'): s += '<path d="M60 86 L60 122" stroke="#D8D2C4" stroke-width="2"/><g fill="#B9AF9C"><circle cx="52" cy="98" r="2"/><circle cx="52" cy="108" r="2"/><circle cx="68" cy="98" r="2"/><circle cx="68" cy="108" r="2"/></g>'
    else: s += f'<path d="M50 86 Q60 96 70 86" fill="none" stroke="{dark(sh, .75)}" stroke-width="2.4"/>'
    return s
def figure(c): return hair_back(c) + body(c) + face(c) + hair_front(c)

def cast_flat(c):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="240" height="240"><clipPath id="k"><circle cx="60" cy="60" r="60"/></clipPath><g clip-path="url(#k)"><rect width="120" height="120" fill="{c["bg"]}"/>{figure(c)}</g></svg>'

def outline_only(svgfrag, ink='#1D1D2B', w=2.2):
    import re
    s = re.sub(r'fill="#[0-9A-Fa-f]{6}"', 'fill="none"', svgfrag)
    s = s.replace('fill="none"', f'fill="none" stroke="{ink}" stroke-width="{w}" stroke-linejoin="round" stroke-linecap="round"', -1)
    return s
def cast_ink(c):
    # riso feel: flat spot colours printed slightly off-register under a single ink line drawing
    import re
    ink = '#1D1D2B'
    spot = f'<g transform="translate(2.8 2.4)" opacity=".88">{hair_back(c)}{body(c)}<ellipse cx="60" cy="55" rx="23" ry="26" fill="{c["skin"]}"/>{hair_front(c)}' + (f'<path d="M38 58 C39 75 49 83 60 83 C71 83 81 75 82 58 C77 67 70 71 60 71 C50 71 43 67 38 58Z" fill="{c["hair"]}"/>' if c.get('beard') else '') + '</g>'
    L = f'fill="none" stroke="{ink}" stroke-width="2.1" stroke-linejoin="round" stroke-linecap="round"'
    shapes = re.sub(r'fill="#[0-9A-Fa-f]{6}"', L, hair_back(c) + f'<path d="M14 122 C17 94 38 85 60 85 C82 85 103 94 106 122" fill="#000000"/>' )
    shapes += f'<ellipse cx="60" cy="55" rx="23" ry="26" fill="{c["skin"]}" stroke="{ink}" stroke-width="2.1"/>'  # registered skin hides the hair line behind the face
    FL = f'stroke="{ink}" stroke-width="2.1" stroke-linejoin="round"'
    front = re.sub(r'fill="(#[0-9A-Fa-f]{6})"', lambda m: f'fill="{m.group(1)}" {FL}', hair_front(c))  # hair is solid ink-lined colour, so the face line hides under it
    beard = f'<path d="M38 58 C39 75 49 83 60 83 C71 83 81 75 82 58 C77 67 70 71 60 71 C50 71 43 67 38 58Z" fill="{c["hair"]}" {FL}/>' if c.get('beard') else ''
    feat = (f'<path d="M37.5 52 q-5 5 0 11 M82.5 52 q5 5 0 11" {L}/>'
            f'<g fill="{ink}"><circle cx="51" cy="55" r="2.6"/><circle cx="69" cy="55" r="2.6"/></g>'
            f'<path d="M46 48 q5 -3 9 -1 M65 47 q5 -2 9 1 M60 57 q-2.4 5 1 6 M53 67 Q60 72 67 67" {L}/>'
            + (f'<path d="M50 86 Q60 96 70 86" {L}/>' if not c.get('chef') else f'<path d="M60 86 L60 122" {L}/><g fill="{ink}"><circle cx="52" cy="98" r="1.8"/><circle cx="52" cy="108" r="1.8"/><circle cx="68" cy="98" r="1.8"/><circle cx="68" cy="108" r="1.8"/></g>')
            + ('<g fill="#C9774E"><circle cx="45" cy="62" r="1"/><circle cx="48" cy="64" r="1"/><circle cx="72" cy="64" r="1"/><circle cx="75" cy="62" r="1"/></g>' if c.get('freckles') else '')
            + (f'<g {L}><circle cx="37" cy="67" r="2.6"/><circle cx="83" cy="67" r="2.6"/></g>' if c.get('earrings') else ''))
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="240" height="240"><circle cx="60" cy="60" r="60" fill="#F6F3EC"/><clipPath id="k"><circle cx="60" cy="60" r="60"/></clipPath><g clip-path="url(#k)">{spot}{shapes}{beard}{front}{feat}</g></svg>'

def cast_sticker(c):
    fig = f'<g transform="translate(60 62) scale(1.06) translate(-60 -62)">{hair_back(c)}{body(c)}<g transform="translate(60 55) scale(1.1) translate(-60 -55)">{face(c)}{hair_front(c)}</g></g>'
    import re
    white = re.sub(r'fill="(#[0-9A-Fa-f]{6})"', 'fill="#FFFFFF" stroke="#FFFFFF" stroke-width="9" stroke-linejoin="round"', fig)
    shade = re.sub(r'fill="(#[0-9A-Fa-f]{6})"', 'fill="#000000" stroke="#000000" stroke-width="9" stroke-linejoin="round"', fig)
    cheeks = '<g transform="translate(60 55) scale(1.1) translate(-60 -55)"><ellipse cx="44" cy="63" rx="5" ry="3" fill="#FF7F8E" opacity=".45"/><ellipse cx="76" cy="63" rx="5" ry="3" fill="#FF7F8E" opacity=".45"/></g>'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="240" height="240"><rect x="3" y="3" width="114" height="114" rx="28" fill="{c["bg"]}"/>'
            f'<clipPath id="k"><rect x="3" y="3" width="114" height="114" rx="28"/></clipPath><g clip-path="url(#k)"><g transform="translate(1.5 3)" opacity=".14">{shade}</g>{white}{fig}{cheeks}</g></svg>')

os.makedirs(OUT, exist_ok=True)
for name, fn in [('rojo', macaw), ('kiwi', budgie), ('kakadu', cockatoo), ('mango', amazon)]:
    for m in ('happy', 'cheer', 'oops'):
        open(os.path.join(OUT, f'pip-{name}-{m}.svg'), 'w').write(fn(m))
for style, fn in [('flat', cast_flat), ('ink', cast_ink), ('sticker', cast_sticker)]:
    for cid, c in CAST.items():
        open(os.path.join(OUT, f'cast-{style}-{cid}.svg'), 'w').write(fn(c))
print(len(os.listdir(OUT)), 'files')
