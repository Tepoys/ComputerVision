# Webcam Viewer

A small React (Vite) app that opens the browser's webcam via `getUserMedia`,
shows a live preview, lets you switch cameras when more than one is
available, and capture/download a still frame as PNG.

## Run with Docker

```bash
docker build -t webcam-app .
docker run -p 8080:80 webcam-app
```

or with Compose:

```bash
docker compose up --build
```

Then open **http://localhost:8080**.

## Important: camera access requires a "secure context"

Browsers only allow `getUserMedia` (camera access) on:
- `https://` origins, or
- `http://localhost` / `http://127.0.0.1`

This means:
- Visiting the container at `http://localhost:8080` from the same machine
  running Docker works fine — the browser treats `localhost` as secure even
  though the container itself only serves plain HTTP.
- Visiting the container's IP or a hostname from **another** machine (e.g.
  `http://192.168.1.20:8080` or a server's public IP) will **not** get camera
  access, because that's treated as an insecure origin. For that case, put
  the container behind a reverse proxy (nginx, Caddy, Traefik) that
  terminates TLS, or use a tool like `mkcert`/Let's Encrypt for a real or
  local-trusted certificate.

## Local development (without Docker)

```bash
npm install
npm run dev
```

Vite's dev server runs at `http://localhost:5173`.

## Project structure

```
webcam-app/
├── src/
│   ├── App.jsx        # top-level component
│   ├── Webcam.jsx      # camera logic + UI
│   ├── index.css       # styling
│   └── main.jsx        # React entry point
├── index.html
├── vite.config.js
├── package.json
├── Dockerfile           # multi-stage: node build -> nginx serve
├── nginx.conf
├── docker-compose.yml
└── .dockerignore
```
