# Faisal Izzulhaq — Video Editor & Videographer Portfolio

Single-page portfolio landing page (`index.html`, no build step).

- Videos are served as 720p MP4s from `videos/` (built on the server); while a file is missing the page falls back to the Google Drive player, so Drive files must stay shared as "Anyone with the link".
- Edit projects, experience and skills in the `PROJECTS`, `EXP` and `SKILLS` arrays at the bottom of `index.html`.

## Publish
Live copy: the public repo `Faisalizzulhaq/Portfolio-Faisal-` (same `index.html`, `assets/`, `deploy/`).
It runs on the Hostinger VPS as the Docker project `portfolio` from `deploy/docker-compose.yaml`:
nginx serves the page behind the existing Traefik, and a one-off `media` container downloads each
Drive video and encodes it to 720p (`deploy/build-media.sh`). Redeploy the project to pick up changes.
