# Faisal Izzulhaq — Video Editor & Videographer Portfolio

Single-page portfolio landing page (`index.html`, no build step).

- Videos are served as 1080p MP4s listed in `media.json` (built on the server by `deploy/build-media.sh`). A video that is not encoded yet shows a "being prepared" state with a Google Drive link.
- Edit projects, experience and skills in the `PROJECTS`, `EXP` and `SKILLS` arrays at the bottom of `index.html`.

## Publish
Live at https://faisalportofolio.site. Deploy copy: the public repo `Faisalizzulhaq/Portfolio-Faisal-` (same `index.html`, `assets/`, `deploy/`).
It runs on the Hostinger VPS as the Docker project `portfolio` from `deploy/docker-compose.yaml`:
nginx serves the page behind the existing Traefik, and a one-off `media` container downloads each
Drive video and encodes it to 1080p (`deploy/build-media.sh`). Redeploy the project to pick up changes.
