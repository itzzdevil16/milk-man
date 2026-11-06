"""
Milk Distributor ERP Runner
===========================
Starts the ERP web server for PC & mobile browser access.
"""

import http.server
import socketserver
import os
import sys
import webbrowser
import socket

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

def get_ip_address():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format, *args):
        pass

def main():
    os.chdir(DIRECTORY)
    local_ip = get_ip_address()
    
    print("=" * 60)
    print(">> Nikhil Milk Dairy ERP - Server Started")
    print("=" * 60)
    print(f"PC / Local Access   : http://localhost:{PORT}")
    print(f"Phone / Wi-Fi Access: http://{local_ip}:{PORT}")
    print("=" * 60)
    print("Press Ctrl + C anytime to stop the server.")
    print("-" * 60)

    try:
        webbrowser.open(f"http://localhost:{PORT}")
    except Exception:
        pass

    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer(("0.0.0.0", PORT), Handler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
    except Exception as e:
        print(f"\nError running server on port {PORT}: {e}")

if __name__ == "__main__":
    main()
