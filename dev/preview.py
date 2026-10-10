"""Local preview: wraps index.html in the same page skeleton the artifact host adds, then serves the folder.
Usage: python3 dev/preview.py [port]   → open http://127.0.0.1:8765/_preview.html
The page runs without the artifact runtime (no account sync, database or tutor), which the app handles gracefully."""
import http.server, os, socketserver, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SKELETON = ('<!doctype html><html><head><meta charset="utf8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
            '<style>:root{color-scheme:light;padding:env(safe-area-inset-top,0) 0 env(safe-area-inset-bottom,0)}body{margin:0;font:14px system-ui}'
            'img{max-width:100%}[hidden]{display:none!important}</style></head><body>')
with open(os.path.join(ROOT, 'index.html'), encoding='utf8') as f: page = f.read()
with open(os.path.join(ROOT, '_preview.html'), 'w', encoding='utf8') as f: f.write(SKELETON + page + '</body></html>')
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
os.chdir(ROOT)
print('Serving http://127.0.0.1:%d/_preview.html' % port)
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(('127.0.0.1', port), http.server.SimpleHTTPRequestHandler) as httpd: httpd.serve_forever()
