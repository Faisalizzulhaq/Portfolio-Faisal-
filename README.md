# Faisal Izzulhaq — Video Editor & Videographer Portfolio

Single-page portfolio landing page (`index.html`, no build step).

- Videos are served as 1080p MP4s listed in `media.json` (built on the server by `deploy/build-media.sh`). A video that is not encoded yet shows a "being prepared" state with a Google Drive link.
- Edit projects, experience and skills in the `PROJECTS`, `EXP` and `SKILLS` arrays at the bottom of `index.html`.

## Swarm animation

`assets/swarm.js` is a standalone implementation written for this portfolio. It captures the site's styled elements into an inert blueprint, covers the original page with an opaque stage, and assigns drawing, typing, image placement, alignment-guide and duplication jobs to animated cursors. Content becomes available to build as visitors scroll. Tour scrolls through the build automatically; 1×–3× controls pace; optional synthesized sound starts after interaction. Go live or Escape restores the interactive portfolio, with replay available afterward.

The effect respects reduced motion and background tabs. The original page remains the accessible source; its controls are inert while the decorative reconstruction is showing. Resize exits the snapshot to avoid displaying stale geometry. The capture is tailored to this page's static DOM and images, not arbitrary WebGL or embedded content.

The visual concept is inspired by [Swarm Rebuild](https://github.com/DhvanilPatel/swarm-cursors) and [Joel Califa's Swarm](https://califa.github.io/swarm-site/). No source code, cursor graphics, sound engine or runtime from either repository is included.

## Publish
Live at https://faisalportofolio.site. Deploy copy: the public repo `Faisalizzulhaq/Portfolio-Faisal-` (same `index.html`, `assets/`, `deploy/`).
It runs on the Hostinger VPS as the Docker project `portfolio` from `deploy/docker-compose.yaml`:
nginx serves the page behind the existing Traefik, and a one-off `media` container downloads each
Drive video and encodes it to 1080p (`deploy/build-media.sh`). Redeploy the project to pick up changes.
