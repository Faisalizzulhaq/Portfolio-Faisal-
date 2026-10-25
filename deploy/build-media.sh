#!/bin/sh
# Downloads every portfolio video listed in index.html from Google Drive, encodes it to a
# 1080p H.264 MP4 (v/) with a poster frame (p/), and keeps media.json listing what is ready.
# Idempotent: finished files are skipped, so re-running the container retries failures.
set -u
SITE=/site
mkdir -p "$SITE/v" "$SITE/p" /work
IDS=$(grep -oE "'1[A-Za-z0-9_-]{24,}'\]" "$SITE/index.html" | tr -d "']" | sort -u)
total=$(echo "$IDS" | wc -l)

# media.json maps a Drive id to its files. Older 720p encodes (videos/, thumbs/) are listed
# until the 1080p version replaces them, so the page never waits on an encode.
write_manifest() {
  {
    printf '{'; sep=''
    for mid in $IDS; do
      if [ -s "$SITE/v/$mid.mp4" ] && [ -s "$SITE/p/$mid.jpg" ]; then v="v/$mid.mp4"; p="p/$mid.jpg"
      elif [ -s "$SITE/videos/$mid.mp4" ] && [ -s "$SITE/thumbs/$mid.jpg" ]; then v="videos/$mid.mp4"; p="thumbs/$mid.jpg"
      else continue; fi
      printf '%s"%s":{"v":"%s","p":"%s"}' "$sep" "$mid" "$v" "$p"; sep=','
    done
    printf '}\n'
  } > "$SITE/media.json.tmp" && mv "$SITE/media.json.tmp" "$SITE/media.json"
}
write_manifest

for pass in 1 2 3; do
  n=0; failed=0
  for id in $IDS; do
    n=$((n+1))
    [ -s "$SITE/v/$id.mp4" ] && [ -s "$SITE/p/$id.jpg" ] && continue
    echo "[pass $pass] $n/$total $id"
    rm -f /work/src /work/out.mp4
    if ! gdown --quiet "https://drive.google.com/uc?id=$id" -O /work/src; then
      echo "download failed"; failed=$((failed+1)); continue
    fi
    if nice -n 19 ffmpeg -nostdin -loglevel error -y -i /work/src \
        -vf "scale='if(gt(iw,ih),-2,min(1080,iw))':'if(gt(iw,ih),min(1080,ih),-2)':flags=lanczos" \
        -c:v libx264 -preset veryfast -crf 21 -maxrate 8M -bufsize 16M -profile:v high -pix_fmt yuv420p -threads 2 \
        -c:a aac -b:a 160k -movflags +faststart /work/out.mp4; then
      ffmpeg -nostdin -loglevel error -y -ss 1 -t 12 -i /work/out.mp4 -vf "thumbnail=120,scale=1280:-2" -frames:v 1 -q:v 3 /work/p.jpg \
        || ffmpeg -nostdin -loglevel error -y -i /work/out.mp4 -vf "scale=1280:-2" -frames:v 1 -q:v 3 /work/p.jpg
      mv /work/p.jpg "$SITE/p/$id.jpg" && mv /work/out.mp4 "$SITE/v/$id.mp4"
      rm -f "$SITE/videos/$id.mp4" "$SITE/thumbs/$id.jpg"
      write_manifest
      echo "done ($(du -h "$SITE/v/$id.mp4" | cut -f1))"
    else
      echo "encode failed"; failed=$((failed+1))
    fi
    rm -f /work/src /work/out.mp4
  done
  [ "$failed" -eq 0 ] && break
  echo "pass $pass finished with $failed failures, retrying in 10 minutes"; sleep 600
done
write_manifest
echo "ALL DONE: $(ls "$SITE/v" | wc -l)/$total videos ready"
