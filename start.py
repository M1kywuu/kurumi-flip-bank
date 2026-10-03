#!/usr/bin/env python3
"""Serve the finished static website with only Python's standard library."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
import threading
import webbrowser

parser = argparse.ArgumentParser()
parser.add_argument('--port', type=int, default=8080)
parser.add_argument('--no-browser', action='store_true')
args = parser.parse_args()
directory = Path(__file__).resolve().parent / 'dist'
if not (directory / 'index.html').is_file():
    raise SystemExit('没有找到完成版网页。请将 start.py 与 dist 文件夹放在一起。')
handler = partial(SimpleHTTPRequestHandler, directory=str(directory))
try:
    server = ThreadingHTTPServer(('127.0.0.1', args.port), handler)
except OSError:
    server = ThreadingHTTPServer(('127.0.0.1', 0), handler)
url = f'http://127.0.0.1:{server.server_port}/'
print(f'翻页银行已准备好：{url}\n关闭此窗口或按 Ctrl+C 停止。', flush=True)
if not args.no_browser:
    threading.Timer(0.25, lambda: webbrowser.open(url)).start()
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
