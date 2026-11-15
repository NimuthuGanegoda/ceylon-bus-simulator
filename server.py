#!/usr/bin/env python3
"""
Ceylon Bus Simulator - Local Development Server
Provides zero-dependency static file serving with CORS and disabled caching.
"""

import http.server
import socketserver
import os
import sys

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Prevent caching during local development
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

def run_server():
    port = PORT
    for _ in range(10):
        try:
            with socketserver.TCPServer(("", port), Handler) as httpd:
                print("=" * 60)
                print(f"🚌 Ceylon Bus Simulator Dev Server")
                print(f"📍 Local URL: http://localhost:{port}")
                print(f"📂 Root Dir : {DIRECTORY}")
                print("⚡ Press Ctrl+C to terminate.")
                print("=" * 60)
                httpd.serve_forever()
        except OSError as e:
            if e.errno == 98:  # Address already in use
                port += 1
            else:
                raise e

if __name__ == '__main__':
    try:
        run_server()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped.")
        sys.exit(0)
