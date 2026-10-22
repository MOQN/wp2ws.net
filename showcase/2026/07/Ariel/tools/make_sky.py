# make_sky.py — paints the night sky for The Butterfly Affect (no photos, no stitching)
# The image is an equirectangular map of the UPPER half of the sky:
# top row = straight up (zenith), bottom row = the horizon; left/right edges meet (seamless).
import numpy as np
from PIL import Image
rng = np.random.default_rng(7)
W, H = 4096, 1024

# ---------- 3D value noise (on the sphere -> automatically seamless) ----------
perm = rng.permutation(256); perm = np.concatenate([perm, perm])
vals = rng.random(256)
def lattice(ix, iy, iz):
    return vals[perm[(perm[(perm[ix & 255] + iy) & 255] + iz) & 255]]
def vnoise(p):
    x, y, z = p[..., 0], p[..., 1], p[..., 2]
    xi, yi, zi = np.floor(x).astype(int), np.floor(y).astype(int), np.floor(z).astype(int)
    xf, yf, zf = x - xi, y - yi, z - zi
    u, v, w = [t * t * (3 - 2 * t) for t in (xf, yf, zf)]
    c = {}
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                c[dx, dy, dz] = lattice(xi + dx, yi + dy, zi + dz)
    x00 = c[0,0,0]*(1-u)+c[1,0,0]*u; x10 = c[0,1,0]*(1-u)+c[1,1,0]*u
    x01 = c[0,0,1]*(1-u)+c[1,0,1]*u; x11 = c[0,1,1]*(1-u)+c[1,1,1]*u
    return (x00*(1-v)+x10*v)*(1-w) + (x01*(1-v)+x11*v)*w
def fbm(p, octaves=5):
    s, a, f, n = 0, 0.5, 1.0, 0
    for _ in range(octaves):
        s += a * vnoise(p * f + 13.7 * _); n += a; a *= 0.5; f *= 2.03
    return s / n

def directions(w, h):
    y, x = np.mgrid[0:h, 0:w]
    lat = np.radians(90 * (1 - (y + 0.5) / h)); lon = 2 * np.pi * (x + 0.5) / w
    return np.stack([np.cos(lat) * np.cos(lon), np.sin(lat), np.cos(lat) * np.sin(lon)], -1), lat

# ---------- nebula + milky way (computed small, then scaled up: they are soft) ----------
w2, h2 = 1024, 256
d, lat2 = directions(w2, h2)
# the milky way: a band across the sky (like picture 3), deep navy, with dark dust lanes
n = np.array([0.35, 0.45, 0.82]); n /= np.linalg.norm(n)
band = np.exp(-((d @ n) / 0.22) ** 2)
clumps = fbm(d * 4.0)
lanes = np.clip((fbm(d * 9.0 + 5) - 0.5) * 3, 0, 1)
milky = band * np.clip(clumps * 1.4 - 0.2, 0, 1) * (1 - 0.7 * lanes)
# the silk nebula (like picture 2, but violet): warped noise -> flowing ridges
warp = np.stack([fbm(d * 1.6 + 1), fbm(d * 1.6 + 7), fbm(d * 1.6 + 11)], -1)
q = fbm(d * 2.4 + warp * 2.2)
ridge = (1 - np.abs(2 * q - 1)) ** 5          # thin silky streaks
mask = np.clip((fbm(d * 1.2 + 21) - 0.42) * 4, 0, 1)  # only in some parts of the sky
silk = ridge * mask
small = np.zeros((h2, w2, 3))
small += milky[..., None] * np.array([0.07, 0.08, 0.20])                     # navy
deep, light = np.array([0.10, 0.04, 0.22]), np.array([0.42, 0.30, 0.80])  # violet -> lavender
small += (silk[..., None] * (deep + (light - deep) * silk[..., None])) * 0.55
small += mask[..., None] * np.array([0.02, 0.01, 0.04])                    # a faint violet haze
small[..., :] *= (0.55 + 0.45 * np.sin(lat2))[..., None] ** 0.0            # (keep even)
big = np.asarray(Image.fromarray((np.clip(small, 0, 1) * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)).astype(float) / 255
silk_big = np.asarray(Image.fromarray((silk * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)).astype(float) / 255

img = np.zeros((H, W, 3)) + np.array([0.008, 0.006, 0.016])  # almost black, a little violet
img += big

# ---------- glitter inside the silk (picture 2) ----------
g = rng.random((H, W)) < silk_big * 0.012
img[g] += np.array([0.55, 0.5, 0.8]) * rng.random(g.sum())[:, None]

# ---------- stars (pictures 1 and 3) ----------
yy_all, xx_all = np.mgrid[0:H, 0:W]
def add_star(x, y, r, color, spikes=0.0):
    latr = np.radians(90 * (1 - y / H)); stretch = 1 / max(np.cos(latr), 0.15)  # stay round near the top
    R = int(np.ceil(max(r * 4, spikes) * stretch)) + 2; Ry = int(np.ceil(max(r * 4, spikes))) + 2
    x0, x1, y0, y1 = int(x) - R, int(x) + R + 1, max(int(y) - Ry, 0), min(int(y) + Ry + 1, H)
    xs = np.arange(x0, x1) % W; ys = np.arange(y0, y1)
    X, Y = np.meshgrid(np.arange(x0, x1) - x, ys - y)
    Xs = X / stretch
    core = np.exp(-(Xs ** 2 + Y ** 2) / (2 * r * r))
    if spikes > 0:  # four-point star, like the bright stars in picture 1
        thin = 0.6
        core += 0.6 * np.exp(-(Y ** 2) / (2 * thin ** 2)) * np.exp(-np.abs(Xs) / (spikes * 0.35))
        core += 0.6 * np.exp(-(Xs ** 2) / (2 * thin ** 2)) * np.exp(-np.abs(Y) / (spikes * 0.35))
    img[np.ix_(ys, xs)] += core[..., None] * color

def star_color():
    t = rng.random()
    return np.array([0.85, 0.9, 1.0]) if t < 0.5 else (np.array([1.0, 0.97, 0.92]) if t < 0.85 else np.array([0.8, 0.75, 1.0]))

def random_pos(count):
    # more sky near the horizon than near the top: area-correct
    lat = np.arcsin(rng.random(count)); y = (1 - lat / (np.pi / 2)) * H
    return rng.random(count) * W, np.clip(y, 0, H - 1)
xs, ys = random_pos(26000)                       # the dust of tiny stars
b = rng.random(26000) ** 6
for x, y, bb in zip(xs, ys, b):
    img[int(y), int(x) % W] += star_color() * (0.15 + 0.85 * bb)
xs, ys = random_pos(900)                         # small round stars
for x, y in zip(xs, ys):
    add_star(x, y, rng.uniform(0.6, 1.3), star_color() * rng.uniform(0.4, 0.9))
xs, ys = random_pos(30)                          # a few bright stars with spikes
for x, y in zip(xs, ys):
    if y < H * 0.2: continue                     # keep spikes away from the very top
    add_star(x, y, rng.uniform(1.4, 2.2), star_color() * rng.uniform(0.9, 1.3), spikes=rng.uniform(10, 26))

out = (np.clip(img, 0, 1) ** (1 / 1.1) * 255).astype(np.uint8)
Image.fromarray(out).save('../assets/sky/night_sky.jpg', quality=93)
Image.fromarray(out).resize((1400, 350), Image.LANCZOS).save('sky_preview.jpg', quality=90)
print('done')
