# Faisal Izzulhaq — Video Editor & Videographer Portfolio

Single-page portfolio landing page (`index.html`, no build step).

- Videos are served as 1080p MP4s listed in `media.json` (built on the server by `deploy/build-media.sh`). A video that is not encoded yet shows a "being prepared" state with a Google Drive link.
- Edit projects, experience and skills in the `PROJECTS`, `EXP` and `SKILLS` arrays at the bottom of `index.html`.

## Swarm animation

`assets/swarm.js` and `assets/swarm.css` add colored editor cursors that draw selection frames and reveal the real page elements as you scroll. Replay build repeats the visible section; Pause swarm remembers the visitor's choice. The effect respects reduced motion, suspends in background tabs, and keeps links and video controls clickable. No build step or external runtime dependency is needed.

The build-as-you-scroll concept is inspired by [Swarm Rebuild](https://github.com/DhvanilPatel/swarm-cursors) and [Joel Califa's Swarm](https://califa.github.io/swarm-site/). This is an independent website implementation; it does not bundle the extension's code.

## Publish
Live at https://faisalportofolio.site. Deploy copy: the public repo `Faisalizzulhaq/Portfolio-Faisal-` (same `index.html`, `assets/`, `deploy/`).
It runs on the Hostinger VPS as the Docker project `portfolio` from `deploy/docker-compose.yaml`:
nginx serves the page behind the existing Traefik, and a one-off `media` container downloads each
Drive video and encodes it to 1080p (`deploy/build-media.sh`). Redeploy the project to pick up changes.
