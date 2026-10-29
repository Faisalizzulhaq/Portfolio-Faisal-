"""Song + beat-synced SFX for the Klikweb Meta ads (4 angles x 3 sizes).

  python3 mix.py <src_dir> <out_dir>

Every size of an angle is the same animation, so each angle gets one song cue and one hit list, applied to its
9x16, 1x1 and 16x9 file alike. Hit times are the animation onsets (frame differencing + frame strips); the song is
cut so its drop (first kick after the break, found on the bass envelope) lands on the angle's big scene change.
"""
import os, subprocess, sys
import numpy as np

SRC, OUT = sys.argv[1], sys.argv[2]
LIB = '/home/user/Puretray-Landingpage/motion-graphics/puretray-horeca-ads/footage'
SONGS = os.path.join(LIB, 'songs')
KIT = {n: os.path.join(LIB, 'sfx', n + '.wav') for n in
       ['whoosh_0', 'whoosh_1', 'pop_0', 'pop_1', 'pop_2', 'pop_3', 'click_0', 'shutter_0', 'hit_0', 'rise_0', 'chaching_0', 'notif_0', 'ding_0']}
KIT.update(bubble=os.path.join(LIB, 'sfx_yt', 'bubble.wav'), vineboom=os.path.join(LIB, 'sfx_yt', 'vineboom.wav'))


def anchor(path):
    """Seconds from file start to the transient (first sample within 20 dB of the peak); risers peak at the end."""
    if path.endswith('rise_0.wav'):
        return 2.248
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', '48000', '-f', 's16le', '-'], capture_output=True).stdout
    a = np.abs(np.frombuffer(raw, np.int16).astype(float))
    return int(np.argmax(a > a.max() / 10)) / 48000


def drop(t):
    """Whoosh into the scene change, impact on it, riser peaking on it."""
    return [(t - 0.40, 'whoosh_1', .45), (t, 'hit_0', .6), (t, 'rise_0', .35)]


typing = [(1.12 + i * 0.13 + (0.03 if i % 3 == 1 else 0), 'click_0', .35) for i in range(17)]

ANGLES = {
    # Google search: typing, results, "usahamu belum ada di sini" -> orange "Biar kamu yang muncul"
    'v1-dicari-muncul': dict(song='mmg_elart', cue=165.70, at=6.23, hits=[
        (0.23, 'whoosh_0', .5), (0.30, 'pop_0', .8), *typing,
        (3.43, 'pop_1', .8), (4.03, 'pop_2', .7), (4.57, 'pop_3', .7),
        (5.03, 'vineboom', .45),                                    # "Usahamu belum ada di sini."
        *drop(6.23), (6.93, 'pop_0', .8), (7.87, 'shutter_0', .7),
        (9.43, 'notif_0', .95)]),
    # 2-3 hari kerja: site builds, TAYANG stamp -> orange price list
    'v2-cepat-jelas': dict(song='tabola_party', cue=151.60, at=8.30, hits=[
        (0.23, 'whoosh_0', .5), (0.30, 'pop_0', .8), (2.93, 'pop_1', .8), (4.67, 'click_0', 1.1),
        (5.90, 'shutter_0', .85), (6.27, 'pop_2', .8), (6.67, 'pop_3', .8),
        (7.23, 'hit_0', .55),                                       # TAYANG stamp
        *drop(8.30), (9.03, 'pop_0', .8), (9.53, 'pop_1', .8), (10.03, 'chaching_0', .8),
        (11.63, 'notif_0', .95)]),
    # WhatsApp chat -> peach "Dikelola perusahaan" checklist
    'v3-mudah-terpercaya': dict(song='bintang5_elart', cue=142.20, at=7.43, hits=[
        (0.23, 'whoosh_0', .5), (0.30, 'pop_0', .8),
        (1.03, 'bubble', .7), (2.63, 'bubble', .7), (4.23, 'bubble', .7), (5.63, 'bubble', .7),
        *drop(7.43), (8.23, 'pop_0', .8),
        (8.60, 'ding_0', .35), (9.33, 'ding_0', .35), (10.03, 'ding_0', .35),   # checklist ticks
        (11.23, 'notif_0', .95)]),
    # 404 -> orange "Era digital" -> peach price -> dark "Konsultasi gratis"
    'v4-narasi': dict(song='astaga_thai', cue=14.15, at=3.53, hits=[
        (0.17, 'pop_0', .8), (0.93, 'whoosh_0', .5), (1.00, 'pop_1', .8),
        (2.77, 'vineboom', .45),                                    # "Sayang banget."
        *drop(3.53), (4.13, 'pop_2', .8), (5.03, 'shutter_0', .8), (6.07, 'pop_3', .7), (6.23, 'pop_0', .7),
        (9.53, 'whoosh_1', .45), (9.93, 'hit_0', .55), (10.97, 'chaching_0', .8),
        (11.67, 'whoosh_1', .45), (12.07, 'hit_0', .6), (13.27, 'notif_0', .95)]),
}
ANCHOR = {n: anchor(p) for n, p in KIT.items()}


def dur(path):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path],
                                capture_output=True, text=True).stdout)


os.makedirs(OUT, exist_ok=True)
for f in sorted(os.listdir(SRC)):
    angle = f.rsplit('_', 1)[0]
    a = ANGLES[angle]
    d = dur(os.path.join(SRC, f))
    args = ['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', os.path.join(SRC, f),
            '-ss', f"{a['cue'] - a['at']:.3f}", '-t', f'{d:.3f}', '-i', os.path.join(SONGS, a['song'] + '.wav')]
    chains = [f'[1:a]aresample=48000,volume=0.62,afade=t=in:d=0.25,afade=t=out:st={d - 1.2:.3f}:d=1.2[m]']
    labels = ['[m]']
    for i, (t, name, g) in enumerate(a['hits']):
        args += ['-i', KIT[name]]
        ms = max(0, int(round((t - ANCHOR[name]) * 1000)))
        chains.append(f'[{i + 2}:a]aresample=48000,aformat=channel_layouts=stereo,volume={g},adelay={ms}|{ms}[s{i}]')
        labels.append(f'[s{i}]')
    chains.append(''.join(labels) + f'amix=inputs={len(labels)}:normalize=0:duration=first,'
                  'loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]')
    args += ['-filter_complex', ';'.join(chains), '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
             '-ar', '48000', '-t', f'{d:.3f}', '-movflags', '+faststart', os.path.join(OUT, f)]
    subprocess.run(args, check=True)
    print(f, a['song'], len(a['hits']), 'hits')
