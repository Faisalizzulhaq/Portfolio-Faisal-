#!/bin/sh
# Downloads every portfolio video listed in index.html from Google Drive, re-encodes it
# to a web-friendly 720p MP4 and grabs a poster frame. Idempotent: finished files are skipped,
# so the container can simply be re-run to retry anything Drive refused.
set -u
SITE=/site
mkdir -p "$SITE/videos" "$SITE/thumbs" /work
IDS=$(grep -oE "'1[A-Za-z0-9_-]{24,}'\]" "$SITE/index.html" | tr -d "']" | sort -u)
total=$(echo "$IDS" | wc -l)

for pass in 1 2 3; do
  n=0; failed=0
  for id in $IDS; do
    n=$((n+1))
    out="$SITE/videos/$id.mp4"
    [ -s "$out" ] && [ -s "$SITE/thumbs/$id.jpg" ] && continue
    echo "[pass $pass] $n/$total $id"
    rm -f /work/src
    if ! gdown --quiet "https://drive.google.com/uc?id=$id" -O /work/src; then
      echo "  download failed"; failed=$((failed+1)); continue
    fi
    if nice -n 19 ffmpeg -nostdin -loglevel error -y -i /work/src \
        -vf "scale='if(gt(iw,ih),-2,min(720,iw))':'if(gt(iw,ih),min(720,ih),-2)'" \
        -c:v libx264 -preset veryfast -crf 25 -pix_fmt yuv420p -threads 2 \
        -c:a aac -b:a 128k -movflags +faststart /work/out.mp4; then
      mv /work/out.mp4 "$out"
      ffmpeg -nostdin -loglevel error -y -ss 3 -i "$out" -frames:v 1 -vf "scale=960:-2" -q:v 4 "$SITE/thumbs/$id.jpg" \
        || ffmpeg -nostdin -loglevel error -y -i "$out" -frames:v 1 -vf "scale=960:-2" -q:v 4 "$SITE/thumbs/$id.jpg"
      echo "  done ($(du -h "$out" | cut -f1))"
    else
      echo "  encode failed"; failed=$((failed+1))
    fi
    rm -f /work/src /work/out.mp4
  done
  [ "$failed" -eq 0 ] && break
  echo "pass $pass finished with $failed failures, retrying in 10 minutes"; sleep 600
done
echo "ALL DONE: $(ls "$SITE/videos" | wc -l)/$total videos ready"
