#!/usr/bin/env python3
"""Static BBOMS snapshot for UI review.

Serves the real public/assets CSS and JS plus static copies of the app's pages,
so the shell, client-side navigation, skeleton loader and page fade behave like
the PHP app. Forms and database writes are inert: this is a preview harness, not
the application. Pages carry the .php names the real app.js expects.
"""

import mimetypes
import os
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
ASSETS = os.path.join(ROOT, "public", "assets")
PORT = 3000

PAGES = {
    "dashboard.php": "Dashboard",
    "inventory.php": "Inventory",
    "shiftlog.php": "Shift log",
    "sales.php": "Sales",
    "users.php": "User management",
}
NAV = [
    ("dashboard.php", "Dashboard"),
    ("inventory.php", "Inventory"),
    ("shiftlog.php", "Shift log"),
    ("sales.php", "Sales"),
    ("users.php", "Users"),
]

LOGIN_SHELL = """<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#faf6ef">
<title>Log in · BBOMS</title>
<link rel="icon" type="image/png" href="/assets/favicon.png">
<link rel="stylesheet" href="/assets/styles.css">
<script defer src="/assets/app.js"></script>
</head><body>
<a href="#content" class="skip">Skip to content</a>
<header class="site-head"><div class="head-row">
<a class="brand" href="/dashboard.php" aria-label="BBOMS home"><img class="brand-logo" src="/assets/bigbrew-icon.png" alt="BigBrew icon" width="46" height="46"><span>BigBrew</span></a>
</div></header>
<main id="content" class="container">
{body}
</main>
</body></html>
"""

SHELL = """<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#faf6ef">
<title>{title} · BBOMS</title>
<link rel="icon" type="image/png" href="/assets/favicon.png">
<link rel="stylesheet" href="/assets/styles.css">
<script defer src="/assets/app.js"></script>
</head><body>
<a href="#content" class="skip">Skip to content</a>
<header class="site-head"><div class="head-row">
<a class="brand" href="/dashboard.php" aria-label="BBOMS home"><img class="brand-logo" src="/assets/bigbrew-icon.png" alt="BigBrew icon" width="46" height="46"><span>BigBrew</span></a>
<div class="account"><span><strong>manager</strong><small>Manager</small></span><form method="post" action="/logout.php"><button class="signout" type="submit">Log out</button></form></div>
</div>
<nav class="site-nav" aria-label="Primary"><div class="nav-scroll">{nav}</div></nav>
</header>
<main id="content" class="container">
{body}
</main>
</body></html>
"""


def read_page(name: str) -> str:
    with open(os.path.join(HERE, name), encoding="utf-8") as handle:
        return handle.read()


def shell(name: str) -> str:
    nav = "".join(
        '<a href="/{href}"{active}>{label}</a>'.format(
            href=href,
            label=label,
            active=' class="active" aria-current="page"' if href == name else "",
        )
        for href, label in NAV
    )
    return SHELL.replace("{title}", PAGES[name]).replace("{nav}", nav).replace(
        "{body}", read_page(name)
    )


class Handler(BaseHTTPRequestHandler):
    server_version = "BBOMSStaticPreview"

    def log_message(self, *args):  # keep the terminal quiet
        pass

    def _send(self, code: int, body: bytes = b"", ctype: str = "text/html; charset=utf-8"):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if body:
            self.wfile.write(body)

    def _redirect(self, location: str):
        self.send_response(303)
        self.send_header("Location", location)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path
        if path == "/":
            return self._redirect("/dashboard.php")
        if path.startswith("/assets/"):
            return self._asset(path[len("/assets/"):])
        name = path.lstrip("/")
        if name == "login.php":
            return self._send(200, LOGIN_SHELL.replace("{body}", read_page(name)).encode("utf-8"))
        if name in PAGES:
            return self._send(200, shell(name).encode("utf-8"))
        if name == "logout.php":
            return self._redirect("/dashboard.php")
        return self._send(404, b"<p>Not part of this snapshot.</p>")

    def do_POST(self):
        # Forms are inert in the snapshot: return to the same page.
        path = urllib.parse.urlparse(self.path).path
        return self._redirect(path if path.endswith(".php") else "/dashboard.php")

    def _asset(self, name: str):
        safe = os.path.normpath(name).lstrip("/")
        target = os.path.join(ASSETS, safe)
        if not target.startswith(ASSETS + os.sep) or not os.path.isfile(target):
            return self._send(404, b"missing")
        ctype = mimetypes.guess_type(target)[0] or "application/octet-stream"
        with open(target, "rb") as handle:
            return self._send(200, handle.read(), ctype)


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
