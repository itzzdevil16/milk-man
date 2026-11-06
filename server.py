import http.server
import socketserver
import os
import sys

PORT = 8080
DIRECTORY = r"C:\Users\Prathamesh\.gemini\antigravity\scratch\milk-distributor-erp"

os.chdir(DIRECTORY)

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

try:
    with socketserver.TCPServer(("0.0.0.0", PORT), Handler) as httpd:
        print(f"HTTP Server started on 0.0.0.0:{PORT}", flush=True)
        httpd.serve_forever()
except Exception as e:
    print(f"Error starting server: {e}", file=sys.stderr, flush=True)
