#!/usr/bin/env python3
"""One-off migration: split the single-file jozve (source/jozve.html) into the React project.

    python tools/split.py

Writes (and overwrites):
    content/home.html, content/ch1.html .. content/chN.html, content/sources.html
    public/img/*                      images that were base64 inside the HTML
    src/assets/fonts/vazirmatn.woff2  the embedded font
    src/styles/jozve.css              the original stylesheet (font moved to a file)
    src/legacy/notes.js               highlight/notes script, made page-aware
    src/legacy/notes-ui.html          the markup that script binds to

After this the files in content/ are the source of truth; this script and
source/jozve.html are only kept so the migration can be repeated.
"""
import base64
import hashlib
import html
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'source' / 'jozve.html'


def once(s, needle, what):
    assert s.count(needle) == 1, f'{what}: expected exactly one match, found {s.count(needle)}'
    return s.index(needle)


def replace_once(s, old, new, what):
    once(s, old, what)
    return s.replace(old, new)


def write(rel, text):
    p = ROOT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding='utf-8', newline='\n')


t = SRC.read_text(encoding='utf-8')

style_open = once(t, '<style>', '<style>')
style_close = once(t, '</style>', '</style>')
css = t[style_open + 7:style_close]
cover_start = once(t, '<header class="cover">', 'cover')
hl_start = once(t, '<div id="hl-bar"', 'hl-bar')
notes_ui = t[hl_start:cover_start].strip()
home_html = t[cover_start:once(t, '<div class="shell">', '.shell')].strip()
main_close = once(t, '</main>', '</main>')
tail = t[main_close:]

# ------------------------------------------------------------------ assets
DATA_URI = re.compile(r'data:(image/png|image/svg\+xml|font/woff2);base64,([A-Za-z0-9+/=]+)')
EXT = {'image/png': 'png', 'image/svg+xml': 'svg', 'font/woff2': 'woff2'}
n_img = 0


def externalize(s, font_url=None):
    def f(m):
        global n_img
        mime, raw = m.group(1), base64.b64decode(m.group(2))
        if mime == 'font/woff2':
            write_bytes('src/assets/fonts/vazirmatn.woff2', raw)
            return font_url
        name = hashlib.sha1(raw).hexdigest()[:10] + '.' + EXT[mime]
        write_bytes('public/img/' + name, raw)
        n_img += 1
        return 'img/' + name
    return DATA_URI.sub(f, s)


def write_bytes(rel, data):
    p = ROOT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_bytes(data)


# -------------------------------------------------------------- stylesheet
css = replace_once(css, 'section.ch{content-visibility:auto;contain-intrinsic-size:auto 9000px}', '', 'content-visibility rule')
css = replace_once(css, '@media print{section.ch{content-visibility:visible}}', '', 'print content-visibility rule')
css = externalize(css, font_url='../assets/fonts/vazirmatn.woff2')
write('src/styles/jozve.css', css.strip() + '\n')

# ---------------------------------------------------------------- chapters
starts = [(m.start(), m.group(1)) for m in re.finditer(r'<section class="ch" id="(ch\d+)"', t)]
src_start = once(t, '<section class="ch foot" id="src">', 'sources section')
style_attr = re.compile(r' style="contain-intrinsic-size:[^"]*"')
for i, (p, cid) in enumerate(starts):
    q = starts[i + 1][0] if i + 1 < len(starts) else src_start
    seg = t[p:q]
    sec = seg[:seg.rindex('</section>') + len('</section>')]
    sec = style_attr.sub('', sec, count=1)
    write(f'content/{cid}.html', externalize(sec) + '\n')
assert [c for _, c in starts] == ['ch%d' % i for i in range(1, len(starts) + 1)]

write('content/sources.html', externalize(t[src_start:main_close].strip()) + '\n')

# the home page gets its call-to-action buttons
home_html = replace_once(home_html, '</ul>\n  </div>\n  <svg class="helm"',
                         '</ul>\n    <p class="cta"><a class="go" href="#ch1">شروع از فصل ۱</a>'
                         '<a href="#roadmap">نقشه‌ی راه</a><a href="#plan">برنامه‌ی مطالعه</a><a href="#pathway">مسیر سریع</a></p>\n  </div>\n  <svg class="helm"',
                         'cover end')
write('content/home.html', externalize(home_html) + '\n')

# ------------------------------------------------------------- notes script
scripts = re.findall(r'<script>(.*?)</script>', tail, re.S)
notes = [s for s in scripts if "KEY='jozve-notes'" in s]
assert len(notes) == 1
js = notes[0].strip()
js = replace_once(js, "(function(){\n  'use strict';\n", "let started = null;\n\n/** Highlights and notes. Binds to the markup in notes-ui.html; call refresh() after a chapter is shown. */\nexport function initNotes(){\n  if(started) return started;\n", 'notes head')
js = replace_once(js, """  function chInfo(id){
    var s=document.getElementById(id);if(!s) return {n:'',t:id};
    var n=s.querySelector('.ch-num'),h=s.querySelector('.ch-head h2')||s.querySelector('h2');
    return {n:n?n.textContent.trim():'',t:h?h.textContent.replace(/\\s+/g,' ').trim():id};
  }
  function chOrder(){var o={};[].forEach.call(document.querySelectorAll('section.ch[id]'),function(s,i){o[s.id]=i;});return o;}""",
"""  var CH=window.JOZVE_CH||{};
  function chInfo(id){var c=CH[id];return c?{n:c.n,t:c.t}:{n:'',t:id};}
  function chOrder(){var o={};Object.keys(CH).forEach(function(k){o[k]=CH[k].o;});return o;}""", 'notes chInfo/chOrder')
js = replace_once(js, "if(!sec){by[ch].forEach(function(it){it.lost=true;});return;}",
                  "if(!sec){if(!CH[ch])by[ch].forEach(function(it){it.lost=true;});return;}", 'notes apply()')
js = replace_once(js, "if(a==='go'){if(it.lost)return;closePanel();jump(id);}",
                  "if(a==='go'){if(it.lost)return;closePanel();if(document.getElementById(it.ch))jump(id);else if(CH[it.ch])window.jozveGo(CH[it.ch].h+'#hl='+encodeURIComponent(id));}", 'notes go')
tail_at = once(js, "  badge();\n  function boot()", 'notes tail')
js = js[:tail_at] + "  badge();\n  function refresh(){apply(data.items);badge();}\n  started={refresh:refresh,jump:jump};\n  return started;\n}\n"
write('src/legacy/notes.js', js)
write('src/legacy/notes-ui.html', notes_ui + '\n')

print(f'content: home + {len(starts)} chapters + sources; {n_img} images; css {len(css) // 1000} KB; notes.js {len(js) // 1000} KB')
