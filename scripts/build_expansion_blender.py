"""Build high-fidelity Colombo expansion landmark reconstructions and web exports in Blender.

Landmarks:
1. jami-ul-alfar: Indo-Saracenic Red Mosque in Pettah (candy-striped brickwork, minarets, onion domes)
2. old-parliament: Neo-Baroque Presidential Secretariat on Galle Face (colossal Ionic portico, dome, grand stair)
3. independence-hall: Kandyan Royal Audience Hall monument (60 carved pillars, double Kandyan roof, guardian lions)
4. town-hall: Neoclassical civic palace overlooking Viharamahadevi Park (Corinthian portico, drum & ribbed dome)
5. galle-face-hotel: 1864 Victorian colonial seaside hotel (ocean wings, verandahs, gables, dormers, saltwater pool)
6. clock-tower: 1857 Fort Lighthouse & Clock Tower (ashlar quoin masonry, Roman clock dials, lantern gallery)

Run:
  blender --background --threads 4 --python scripts/build_expansion_blender.py -- [id|all] [--no-render]
"""
import bpy, math, json, sys, random, zipfile, shutil
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).parent))
sys.dont_write_bytecode = True
import build_landmarks as BL
import heritage_landmarks as HL

OUT = ROOT / 'public/landmarks'
PI = math.pi
P = math.pi

# --- Material Setup ---
def setup_materials():
    HL.use(BL)
    BL.material('Jami Red', (.70, .10, .08), .76, 0)
    BL.material('Jami White', (.92, .91, .88), .68, 0)
    BL.material('Jami Green', (.07, .34, .16), .60, 0)
    BL.material('Sandstone', (.73, .66, .52), .80, 0)
    BL.material('Sandstone Dark', (.58, .52, .40), .84, 0)
    # Patinated copper-green dome metal, as surveyed on heritage roofs.
    BL.material('Dome Copper', (.36, .55, .47), .45, .20)
    BL.material('Verdigris Dome', (.45, .56, .52), .42, .15)
    BL.material('Kandyan Granite', (.44, .43, .41), .88, 0)
    BL.material('Kandyan Wood', (.18, .09, .04), .75, 0)
    BL.material('Colonial Buff', (.88, .82, .68), .72, 0)
    BL.material('Colonial Cream', (.92, .88, .78), .70, 0)
    BL.material('Ocean Pool', (.06, .36, .46), .16, .35)
    BL.material('Lawn Green', (.18, .36, .12), .95, 0)
    BL.material('Lighthouse Brass', (.68, .48, .14), .32, .75)
    BL.material('Clock Dial', (.94, .93, .89), .52, 0)
    BL.material('Quoin Stone', (.48, .44, .38), .85, 0)
    BL.material('Granite Base', (.32, .31, .30), .86, 0)
    BL.material('Rusticated Granite', (.42, .40, .38), .85, 0)
    BL.material('Polished Stone', (.68, .65, .60), .50, 0)
    BL.material('Ocean Glass', (.07, .24, .34), .06, 0, transmission=1.0)
    BL.material('Deep Blue Glass', (.04, .12, .22), .05, 0, transmission=1.0)
    BL.material('Champagne Metal', (.78, .74, .66), .30, .85)
    BL.material('Dark Anodized', (.16, .18, .20), .35, .88)
    BL.material('White Steel', (.94, .95, .96), .25, .45)
    BL.material('Timber Decking', (.42, .28, .16), .78, 0)
    BL.material('Tensile Fabric', (.96, .96, .98), .55, .05)
    BL.material('Yacht White', (.97, .97, .98), .15, .10)
    BL.material('Marina Water', (.04, .32, .38), .08, .45)
    BL.material('Beacon Red', (.78, .12, .08), .45, 0)

# --- Geometric & Architectural Primitives ---
def horseshoe_arch(x, y, z, w, h, mat='Jami White', depth=.50, trim=.20, fill=None):
    """Horseshoe / Moorish keyhole arch where curve continues below spring line."""
    r = w / 2
    c_z = z + h - r
    drop = r * .22
    n = 20
    for side in [-1, 1]:
        BL.box((x + side * (r + trim / 2), y, z + (h - r) / 2), (trim, depth, h - r), mat)
    start_angle = -0.22 * PI
    end_angle = 1.22 * PI
    for i in range(n):
        a1 = start_angle + (end_angle - start_angle) * i / n
        a2 = start_angle + (end_angle - start_angle) * (i + 1) / n
        v = [(x + rr * math.cos(t), yy, c_z + rr * math.sin(t))
             for yy in [y - depth / 2, y + depth / 2]
             for rr, t in [(r, a1), (r, a2), (r + trim, a2), (r + trim, a1)]]
        BL.mesh('Horseshoe arch', v, [(0,1,2,3),(7,6,5,4),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)], mat)
    if fill:
        pts = [(x - r, y + .02, z), (x + r, y + .02, z)] + \
              [(x + r * math.cos(start_angle + (end_angle - start_angle) * i / n), y + .02, c_z + r * math.sin(start_angle + (end_angle - start_angle) * i / n)) for i in range(n + 1)]
        BL.mesh('Arch infill', pts, [tuple(range(len(pts)))], fill)

def onion_dome(x, y, z, r, h, mat='Jami Red', n=24, finial=True):
    """Indo-Saracenic pointed bulbous onion dome with lotus base and gilded finial."""
    profile = [
        (r * .85, 0),
        (r * 1.0, h * .12),
        (r * 1.22, h * .35),
        (r * 1.26, h * .52),
        (r * 1.05, h * .72),
        (r * .60, h * .88),
        (r * .18, h * .96),
        (0, h)
    ]
    BL.lathe((x, y, z), profile, mat, n)
    if finial:
        BL.lathe((x, y, z + h), [(.18, 0), (.24, .3), (.12, .6), (.04, 1.4), (0, 1.8)], 'Gold', 12)
        BL.sphere((x, y, z + h + .9), (.22, .22, .26), 'Gold', 10, 6)

def kandyan_pillar(x, y, z, h, size=.52, mat_stone='Kandyan Granite', mat_wood='Kandyan Wood'):
    """Traditional Sri Lankan stone column with four-way carved wooden Pekada bracket capital."""
    BL.box((x, y, z + .25), (size * 1.35, size * 1.35, .5), mat_stone)
    BL.box((x, y, z + .75), (size, size, .5), mat_stone)
    r = size * .50
    BL.lathe((x, y, z + 1.0), [(r, 0), (r * .92, h - 1.8)], mat_stone, 16)
    BL.box((x, y, z + h - .65), (size, size, .35), mat_stone)
    BL.box((x, y, z + h - .35), (size * 1.25, size * 1.25, .25), mat_wood)
    bracket_span = size * 2.1
    BL.box((x, y, z + h - .15), (bracket_span, size * .85, .2), mat_wood)
    BL.box((x, y, z + h - .15), (size * .85, bracket_span, .2), mat_wood)
    for dx, dy in [(-bracket_span/2 + .1, 0), (bracket_span/2 - .1, 0), (0, -bracket_span/2 + .1), (0, bracket_span/2 - .1)]:
        BL.lathe((x + dx, y + dy, z + h - .35), [(.08, 0), (.11, -.12), (.06, -.24), (0, -.32)], mat_wood, 8)

def corinthian_column(x, y, z, h, r=.50, mat='White plaster'):
    """Classical fluted column with molded base and carved capital."""
    BL.box((x, y, z + .2), (r * 3.0, r * 3.0, .4), mat)
    BL.lathe((x, y, z + .4), [(r * 1.45, 0), (r * 1.35, .15), (r * 1.15, .3)], mat, 20)
    BL.lathe((x, y, z + .7), [(r, 0), (r * .84, h - 1.8)], mat, 24)
    cap_z = z + h - 1.1
    BL.lathe((x, y, cap_z), [(r * .88, 0), (r * 1.15, .35), (r * 1.4, .75)], mat, 16)
    BL.box((x, y, z + h - .15), (r * 3.1, r * 3.1, .3), mat)
    for side_x in [-1, 1]:
        for side_y in [-1, 1]:
            BL.sphere((x + side_x * r * 1.2, y + side_y * r * 1.2, cap_z + .65), (r * .35, r * .35, r * .28), mat, 8, 4)

def pediment(x, y, z, w, h, depth=1.2, mat='White plaster', crest=True):
    """Classical triangular pediment with raking cornice and sculpted tympanum crest."""
    half_w = w / 2
    v = [
        (x - half_w, y - depth/2, z), (x + half_w, y - depth/2, z), (x, y - depth/2, z + h),
        (x - half_w, y + depth/2, z), (x + half_w, y + depth/2, z), (x, y + depth/2, z + h)
    ]
    f = [(0, 1, 2), (5, 4, 3), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)]
    BL.mesh('Pediment', v, f, mat)
    BL.beam((x - half_w, y - depth/2 - .15, z), (x, y - depth/2 - .15, z + h), .45, mat)
    BL.beam((x + half_w, y - depth/2 - .15, z), (x, y - depth/2 - .15, z + h), .45, mat)
    BL.box((x, y, z), (w + .8, depth + .3, .4), mat)
    if crest:
        BL.sphere((x, y - depth/2 - .18, z + h * .38), (.85, .25, .85), mat, 16, 8)
        BL.lathe((x, y - depth/2 - .2, z + h * .38), [(.95, 0), (.98, .1)], 'Gold', 20)

def ribbed_dome(x, y, z, r, h, mat_dome='Verdigris Dome', ribs=16, lantern=True):
    """Classical hemispherical ribbed dome with ocular crown and octagonal lantern."""
    profile = [(r * math.cos(PI * i / 24), h * math.sin(PI * i / 24)) for i in range(13)]
    BL.lathe((x, y, z), profile, mat_dome, 32)
    for i in range(ribs):
        angle = 2 * PI * i / ribs
        pts = [(x + r * math.cos(PI * j / 20) * math.cos(angle),
                y + r * math.cos(PI * j / 20) * math.sin(angle),
                z + h * math.sin(PI * j / 20)) for j in range(11)]
        for k in range(len(pts) - 1):
            BL.beam(pts[k], pts[k+1], .22, 'Ivory')
    if lantern:
        l_z = z + h
        BL.lathe((x, y, l_z), [(r * .24, 0), (r * .24, h * .28)], 'Ivory', 8)
        for i in range(8):
            a = 2 * PI * i / 8
            BL.box((x + r * .22 * math.cos(a), y + r * .22 * math.sin(a), l_z + h * .14), (.25, .25, h * .18), 'Glass shade')
        BL.lathe((x, y, l_z + h * .28), [(r * .26, 0), (r * .18, h * .12), (0, h * .2)], mat_dome, 16)
        BL.lathe((x, y, l_z + h * .48), [(.08, 0), (.12, .3), (.03, 1.2), (0, 1.5)], 'Gold', 8)

def rusticated_arcade(x, y, z, count, span, arch_w, arch_h, wall_h, depth=.8, mat='Limestone'):
    """Continuous rusticated masonry arcade with semicircular arches and keystones."""
    total_w = count * span
    start_x = x - total_w / 2 + span / 2
    for i in range(count):
        bx = start_x + i * span
        BL.arch(bx, y, z, arch_w, arch_h, mat, depth, .28)
        BL.box((bx, y + depth/2 + .06, z + arch_h + .15), (.35, .15, .55), 'Ivory')
        for side in [-1, 1]:
            px = bx + side * (arch_w / 2 + (span - arch_w) / 4)
            for j in range(int(wall_h / .6)):
                BL.box((px, y, z + j * .6 + .3), ((span - arch_w) / 2, depth, .52), mat)
    BL.box((x, y, z + wall_h), (total_w + .6, depth + .3, .45), mat)

def balustrade_y(x, y, z, d, mat='Ivory'):
    """Balustrade spanning along the Y axis."""
    BL.box((x, y, z + .85), (.34, d, .18), mat)
    BL.box((x, y, z + .08), (.40, d, .16), mat)
    count = int(d / .65)
    for i in range(count):
        yy = y - d / 2 + .35 + i * .65
        BL.lathe((x, yy, z), [(.10, .16), (.085, .3), (.13, .42), (.075, .6), (.07, .77)], mat, 8)

def glass_curtain_wall(cx, cy, z_base, w, d, h, floor_h=3.6, mat_glass='Ocean Glass', mat_mullion='Champagne Metal', balconies=True):
    """Modern glazed high-rise curtain wall with horizontal floor spandrels and vertical fins."""
    floors = max(1, int(h / floor_h))
    # Core glass volume
    BL.box((cx, cy, z_base + h / 2), (w - 0.2, d - 0.2, h), mat_glass)
    # Floor spandrels and edge slabs
    for f in range(floors + 1):
        fz = z_base + f * floor_h
        BL.box((cx, cy, fz), (w + 0.3, d + 0.3, 0.4), mat_mullion)
    # Vertical mullion fins along width (X)
    n_fins_x = max(2, int(w / 3.4))
    dx = w / n_fins_x
    for i in range(n_fins_x + 1):
        x = cx - w / 2 + i * dx
        for side_y in [-1, 1]:
            y = cy + side_y * (d / 2 + 0.15)
            BL.box((x, y, z_base + h / 2), (0.15, 0.3, h), mat_mullion)
    # Vertical mullion fins along depth (Y)
    n_fins_y = max(2, int(d / 3.4))
    dy = d / n_fins_y
    for j in range(n_fins_y + 1):
        y = cy - d / 2 + j * dy
        for side_x in [-1, 1]:
            x = cx + side_x * (w / 2 + 0.15)
            BL.box((x, y, z_base + h / 2), (0.3, 0.15, h), mat_mullion)
    if balconies:
        # Recessed corner balconies with glass balustrades
        for f in range(2, floors, 2):
            fz = z_base + f * floor_h
            for sx in [-1, 1]:
                for sy in [-1, 1]:
                    bx = cx + sx * (w / 2 - 1.5)
                    by = cy + sy * (d / 2 - 1.5)
                    BL.box((bx, by, fz + 0.5), (2.8, 2.8, 0.9), 'Glass')

def diagrid_panel(x1, y1, z1, x2, y2, z2, mat='White Steel', thick=0.45):
    """Exoskeleton structural diagrid beam connecting two 3D nodes."""
    BL.beam((x1, y1, z1), (x2, y2, z2), thick, mat)

def tensile_canopy_quad(p1, p2, p3, p4, mat='Tensile Fabric', n=8):
    """Parametric hyperbolic paraboloid / saddle tensile membrane surface."""
    v = []
    for i in range(n + 1):
        u = i / n
        pa = Vector(p1) * (1 - u) + Vector(p2) * u
        pb = Vector(p4) * (1 - u) + Vector(p3) * u
        for j in range(n + 1):
            w = j / n
            pt = pa * (1 - w) + pb * w
            sag = -math.sin(u * PI) * math.sin(w * PI) * 1.8
            v.append((pt.x, pt.y, pt.z + sag))
    faces = []
    for i in range(n):
        for j in range(n):
            a = i * (n + 1) + j
            b = a + 1
            c = (i + 1) * (n + 1) + j + 1
            d = (i + 1) * (n + 1) + j
            faces.append((a, b, c, d))
    BL.mesh('Tensile membrane', v, faces, mat, smooth=True)

def yacht(x, y, z, length=22.0, heading=0.0):
    """Sculpted luxury motor yacht with aerodynamic V-hull, teak swim platform, flybridge and radar arch."""
    co = math.cos(heading)
    si = math.sin(heading)
    def rot(dx, dy, dz):
        return (x + co * dx - si * dy, y + si * dx + co * dy, z + dz)

    w = length * 0.28
    # Main hull block
    BL.box(rot(0, 0, 0.8), (length * 0.85, w, 1.6), 'Yacht White', rot=heading)
    # Tapered bow
    BL.lathe(rot(length * 0.35, 0, 0.8), [(w * 0.48, -0.8), (w * 0.5, 0.8), (0, 0.8)], 'Yacht White', 12)
    # Stern teak swim platform
    BL.box(rot(-length * 0.48, 0, 0.3), (length * 0.12, w * 0.85, 0.2), 'Timber Decking', rot=heading)
    # Main deck salon & superstructure
    BL.box(rot(0, 0, 2.2), (length * 0.58, w * 0.78, 1.5), 'Yacht White', rot=heading)
    # Tinted panoramic windscreen
    BL.box(rot(length * 0.15, 0, 2.4), (length * 0.26, w * 0.75, 1.1), 'Glass shade', rot=heading)
    # Flybridge upper deck
    BL.box(rot(-length * 0.08, 0, 3.4), (length * 0.38, w * 0.65, 0.8), 'Yacht White', rot=heading)
    BL.box(rot(-length * 0.08, 0, 3.9), (length * 0.36, w * 0.63, 0.3), 'Timber Decking', rot=heading)
    # Radar arch & antennas
    BL.beam(rot(-length * 0.20, -w * 0.28, 3.8), rot(-length * 0.22, 0, 5.0), 0.22, 'Yacht White')
    BL.beam(rot(-length * 0.20, w * 0.28, 3.8), rot(-length * 0.22, 0, 5.0), 0.22, 'Yacht White')
    BL.box(rot(-length * 0.22, 0, 5.0), (0.7, w * 0.58, 0.22), 'Yacht White', rot=heading)
    BL.sphere(rot(-length * 0.22, -w * 0.16, 5.3), (0.3, 0.3, 0.35), 'Yacht White', 8, 4)
    BL.sphere(rot(-length * 0.22, w * 0.16, 5.3), (0.3, 0.3, 0.35), 'Yacht White', 8, 4)

# ==============================================================================
# 1. JAMI UL-ALFAR (RED MOSQUE)
# ==============================================================================
def jami_ul_alfar():
    setup_materials()
    BL.group('01 Foundations and prayer courtyard')
    BL.box((0, 0, .4), (28, 42, .8), 'Paving')
    BL.box((0, 0, 1.0), (25, 39, .4), 'Jami White')

    levels = [
        (1.2, 5.8, 'Ground prayer hall'),
        (7.0, 5.4, 'First floor mezzanine'),
        (12.4, 5.4, 'Second floor gallery'),
        (17.8, 4.8, 'Upper terrace hall')
    ]
    for bz, bh, label in levels:
        BL.group('02 Main sanctuary / ' + label)
        stripes = int(bh / .45)
        for s in range(stripes):
            mat = 'Jami Red' if s % 2 == 0 else 'Jami White'
            BL.box((0, 0, bz + s * .45 + .22), (23.8, 37.8, .44), mat)
        BL.box((0, 0, bz + bh), (24.6, 38.6, .35), 'Jami White')

    BL.group('03 Grand entrance portal')
    for dx in [-5.5, 0, 5.5]:
        horseshoe_arch(dx, -19.2, 1.2, 4.2, 5.6, 'Jami White', .9, .32, 'Shadow')
        for a in range(12):
            ang = a * PI / 12
            vx = dx + 2.4 * math.cos(ang); vz = 1.2 + 5.6 - 2.1 + 2.4 * math.sin(ang)
            BL.box((vx, -19.4, vz), (.45, .25, .25), 'Jami Red' if a % 2 == 0 else 'Jami White')
    BL.box((0, -19.3, 7.6), (18, 1.2, 1.2), 'Jami Red')
    BL.box((0, -19.3, 8.6), (14, 1.0, .8), 'Jami White')

    BL.group('04 Windows and Islamic arched balconies')
    for floor_z, fw, fh in [(7.2, 2.2, 3.8), (12.6, 2.0, 3.4)]:
        for fx in [-8.5, -4.2, 0, 4.2, 8.5]:
            horseshoe_arch(fx, -19.1, floor_z, fw, fh, 'Jami White', .6, .18, 'Jami Green')
            BL.box((fx, -19.1, floor_z + fh * .4), (fw * .7, .1, fh * .5), 'Jami Green')
        for sy in range(-14, 16, 6):
            for side in [-1, 1]:
                horseshoe_arch(side * 12.1, sy, floor_z, fw, fh, 'Jami White', .6, .18, 'Jami Green')

    BL.group('05 Roof parapets and Indo-Saracenic merlons')
    pz = 22.8
    BL.box((0, 0, pz), (24.2, 38.2, .5), 'Jami White')
    for x in range(-11, 12, 2):
        for y_side in [-18.9, 18.9]:
            BL.lathe((x, y_side, pz + .4), [(.18, 0), (.24, .4), (.15, .7), (0, .95)], 'Jami Red', 8)
    for y in range(-17, 18, 2):
        for x_side in [-11.9, 11.9]:
            BL.lathe((x_side, y, pz + .4), [(.18, 0), (.24, .4), (.15, .7), (0, .95)], 'Jami Red', 8)

    BL.group('06 Soaring twin front minarets')
    for mx, my in [(-11.5, -18.5), (11.5, -18.5)]:
        BL.lathe((mx, my, 1.2), [(2.4, 0), (2.4, 12.0)], 'Jami Red', 8)
        for s in range(16):
            if s % 2 == 1:
                BL.lathe((mx, my, 1.2 + s * .7), [(2.45, 0), (2.45, .35)], 'Jami White', 8)
        BL.lathe((mx, my, 13.2), [(2.2, 0), (2.8, .6), (2.6, 1.2)], 'Jami White', 16)
        BL.balustrade(mx, my - 2.5, 13.8, 4.5, 'Jami Red')
        BL.lathe((mx, my, 14.4), [(1.85, 0), (1.85, 10.0)], 'Jami Red', 24)
        for s in range(12):
            if s % 2 == 1:
                BL.lathe((mx, my, 14.4 + s * .8), [(1.9, 0), (1.9, .4)], 'Jami White', 24)
        BL.lathe((mx, my, 24.4), [(1.8, 0), (2.4, .6), (2.2, 1.0)], 'Jami White', 16)
        BL.lathe((mx, my, 25.4), [(1.4, 0), (1.4, 4.5)], 'Jami White', 12)
        for a in range(8):
            ang = 2 * PI * a / 8
            BL.box((mx + 1.2 * math.cos(ang), my + 1.2 * math.sin(ang), 27.6), (.35, .35, 3.2), 'Jami Green')
        onion_dome(mx, my, 29.9, 2.0, 4.8, 'Jami Red', 24, True)

    BL.group('07 Central monumental onion dome')
    BL.lathe((0, 0, 23.2), [(6.2, 0), (6.4, .8), (5.8, 1.6)], 'Jami White', 24)
    HL.clock(0, -19.4, 21.2, 1.4)
    onion_dome(0, 0, 24.8, 5.5, 9.2, 'Jami Red', 32, True)

    BL.group('08 Corner turrets and decorative finials', True)
    turret_locs = [(-11.5, 18.5), (11.5, 18.5), (-5.5, 18.5), (5.5, 18.5),
                   (-11.5, 0), (11.5, 0), (-5.5, -18.5), (5.5, -18.5)]
    for tx, ty in turret_locs:
        BL.lathe((tx, ty, 23.2), [(.95, 0), (.95, 3.2)], 'Jami Red', 12)
        onion_dome(tx, ty, 26.4, 1.1, 2.4, 'Jami White', 16, True)

# ==============================================================================
# 2. OLD PARLIAMENT BUILDING
# ==============================================================================
def old_parliament():
    setup_materials()
    BL.group('01 Rusticated granite podium and monumental stair')
    BL.box((0, 0, .6), (134, 46, 1.2), 'Granite Base')
    for step in range(14):
        sz = .6 + step * .22
        sy = -23.0 - (14 - step) * .65
        BL.box((0, sy, sz / 2), (32, 1.2, sz), 'Granite Base')
    for side in [-1, 1]:
        bx = side * 16.5
        BL.beam((bx, -31.5, 1.2), (bx, -22.5, 4.2), .6, 'Sandstone')
        HL.urn(bx, -31.5, 1.4, 1.4)
        HL.urn(bx, -22.5, 4.4, 1.4)

    BL.group('02 Ground floor rusticated ashlar wings')
    for wing_x in [-38, 38]:
        BL.box((wing_x, 0, 4.6), (56, 42, 6.8), 'Sandstone')
        for j in range(11):
            BL.box((wing_x, -21.15, 1.6 + j * .6), (56.2, .4, .54), 'Sandstone Dark')
        for k in range(-3, 4):
            wx = wing_x + k * 7.2
            BL.arch(wx, -21.2, 2.2, 2.4, 4.0, 'Sandstone', .6, .24, 'Glass shade')

    BL.group('03 Piano nobile and classical colonnade')
    for wing_x in [-38, 38]:
        BL.box((wing_x, 0, 11.8), (56, 42, 7.6), 'Sandstone')
        for k in range(-3, 4):
            wx = wing_x + k * 7.2
            HL.sash(wx, -21.2, 8.8, 2.5, 4.8, 1, True)
            if k % 2 == 0:
                pediment(wx, -21.3, 13.8, 3.2, 1.2, .4, 'Sandstone', False)
            else:
                BL.arch(wx, -21.3, 13.6, 2.8, 1.2, 'Sandstone', .4, .2, 'Sandstone')

    BL.group('04 Attic story and balustraded roof parapet')
    for wing_x in [-38, 38]:
        BL.box((wing_x, 0, 17.6), (56, 42, 4.0), 'Sandstone')
        for k in range(-3, 4):
            wx = wing_x + k * 7.2
            BL.window(wx, -21.2, 16.2, 2.2, 2.4, 1)
        BL.balustrade(wing_x, -21.2, 19.8, 56.4, 'Sandstone')
        for k in range(-4, 5):
            HL.urn(wing_x + k * 6.8, -21.2, 20.8, 1.1)

    BL.group('05 Monumental Ionic portico')
    BL.box((0, -18.5, 10.8), (30, 9, 17.6), 'Sandstone')
    for i in range(6):
        col_x = -13.5 + i * 5.4
        corinthian_column(col_x, -23.2, 3.8, 13.2, .58, 'Sandstone')
    BL.box((0, -22.8, 17.4), (32, 3.5, 1.4), 'Sandstone')
    pediment(0, -22.8, 18.8, 32, 6.8, 3.2, 'Sandstone', True)

    BL.group('06 Central octagonal drum and ribbed dome')
    BL.lathe((0, 2.0, 19.6), [(11.2, 0), (11.2, 6.2)], 'Sandstone', 16)
    for a in range(8):
        ang = 2 * PI * a / 8
        wx = 10.8 * math.cos(ang); wy = 2.0 + 10.8 * math.sin(ang)
        BL.arch(wx, wy, 20.8, 2.4, 3.8, 'Sandstone', .6, .2, 'Glass shade')
    ribbed_dome(0, 2.0, 25.8, 10.8, 7.8, 'Dome Copper', 16, True)

# ==============================================================================
# 3. INDEPENDENCE MEMORIAL HALL
# ==============================================================================
def independence_hall():
    setup_materials()
    BL.group('01 Four-tiered stepped granite plinth')
    tiers = [
        (62, 34, .7, .35),
        (58, 30, .7, 1.05),
        (54, 26, .7, 1.75),
        (50, 22, .7, 2.45)
    ]
    for w, d, h, z in tiers:
        BL.box((0, 0, z), (w, d, h), 'Kandyan Granite')
        BL.box((0, 0, z + h / 2), (w + .4, d + .4, .18), 'Kandyan Granite')

    BL.group('02 Four ceremonial stairways and guardstones')
    stair_configs = [
        (0, -18.5, 14, 'South'), (0, 18.5, 14, 'North'),
        (-32.5, 0, 10, 'West'), (32.5, 0, 10, 'East')
    ]
    for sx, sy, sw, name in stair_configs:
        is_ns = abs(sy) > 0
        for step in range(8):
            st_z = step * .35
            st_dist = (8 - step) * .65
            px = sx if is_ns else (sx + math.copysign(st_dist, sx))
            py = (sy + math.copysign(st_dist, sy)) if is_ns else sy
            BL.box((px, py, st_z / 2), (sw if is_ns else 1.1, 1.1 if is_ns else sw, st_z), 'Kandyan Granite')
        for side in [-1, 1]:
            kx = (sx + side * (sw / 2 + .3)) if is_ns else sx
            ky = sy if is_ns else (sy + side * (sw / 2 + .3))
            BL.beam((kx, ky, 2.8), (kx + (0 if is_ns else math.copysign(5.5, sx)), ky + (math.copysign(5.5, sy) if is_ns else 0), .2), .45, 'Kandyan Granite')
            BL.box((kx + (0 if is_ns else math.copysign(6.0, sx)), ky + (math.copysign(6.0, sy) if is_ns else 0), .6), (.5, .5, 1.2), 'Kandyan Granite')

    BL.group('03 Sixty carved guardian lions (Singha)')
    lion_xs = list(range(-22, 23, 4))
    for lx in lion_xs:
        for ly in [-9.8, 9.8]:
            BL.box((lx, ly, 3.1), (.7, .7, .6), 'Kandyan Granite')
            BL.lathe((lx, ly, 3.4), [(.28, 0), (.32, .5), (.22, .9), (.15, 1.2)], 'Kandyan Granite', 8)
            BL.sphere((lx, ly, 4.4), (.22, .26, .22), 'Kandyan Granite', 8, 6)
    for ly in range(-8, 9, 4):
        for lx in [-23.8, 23.8]:
            BL.box((lx, ly, 3.1), (.7, .7, .6), 'Kandyan Granite')
            BL.lathe((lx, ly, 3.4), [(.28, 0), (.32, .5), (.22, .9), (.15, 1.2)], 'Kandyan Granite', 8)
            BL.sphere((lx, ly, 4.4), (.22, .26, .22), 'Kandyan Granite', 8, 6)

    BL.group('04 Sixty carved Kandyan stone columns')
    for cx in range(-20, 21, 4):
        for cy in [-8.0, 8.0]:
            kandyan_pillar(cx, cy, 2.8, 5.8, .48)
    for cy in range(-6, 7, 4):
        for cx in [-22.0, 22.0]:
            kandyan_pillar(cx, cy, 2.8, 5.8, .48)
    for cx in range(-16, 17, 4):
        for cy in [-4.0, 4.0]:
            kandyan_pillar(cx, cy, 2.8, 6.8, .54)

    BL.group('05 Monumental double-tiered Kandyan roof')
    BL.box((0, 0, 8.7), (47, 19, .4), 'Kandyan Wood')
    BL.hip(0, 0, 8.8, 52, 24, 3.6, 'Terracotta')
    BL.box((0, -12.1, 8.7), (52.4, .12, .45), 'Kandyan Wood')
    BL.box((0, 12.1, 8.7), (52.4, .12, .45), 'Kandyan Wood')
    BL.box((-26.1, 0, 8.7), (.12, 24.4, .45), 'Kandyan Wood')
    BL.box((26.1, 0, 8.7), (.12, 24.4, .45), 'Kandyan Wood')
    BL.box((0, 0, 12.6), (36, 13, 2.4), 'Kandyan Wood')
    BL.hip(0, 0, 13.8, 40, 17, 5.2, 'Terracotta')
    for kx in range(-12, 13, 4):
        BL.lathe((kx, 0, 19.0), [(.12, 0), (.22, .4), (.14, .9), (.04, 1.8), (0, 2.2)], 'Gold', 12)

    BL.group('06 Memorial chamber and D. S. Senanayake statue')
    BL.box((0, 0, 3.2), (8, 6, .6), 'Limestone')
    BL.box((0, 0, 3.8), (3, 3, .8), 'Kandyan Granite')
    statue_y = -32.0
    BL.box((0, statue_y, .8), (5.2, 5.2, 1.6), 'Granite Base')
    BL.box((0, statue_y, 2.4), (3.6, 3.6, 1.8), 'Kandyan Granite')
    BL.box((0, statue_y, 4.0), (3.0, 3.0, 1.4), 'Kandyan Granite')
    BL.lathe((0, statue_y, 4.7), [(.42, 0), (.48, 1.4), (.38, 2.4), (.25, 2.7)], 'Bronze', 16)
    BL.sphere((0, statue_y, 7.6), (.28, .26, .34), 'Bronze', 12, 8)

# ==============================================================================
# 4. COLOMBO TOWN HALL
# ==============================================================================
def town_hall():
    setup_materials()
    BL.group('01 Neoclassical podium and carriage drive')
    BL.box((0, 0, .5), (102, 54, 1.0), 'Limestone')
    for step in range(10):
        BL.box((0, -26.0 - (10 - step) * .6, .1 + step * .14), (32, .8, step * .14 + .2), 'Limestone')

    BL.group('02 Rusticated ground arcade and wings')
    for wing_x in [-32, 32]:
        rusticated_arcade(wing_x, -21.0, 1.0, 4, 6.2, 3.6, 5.2, 6.6, 1.0, 'White plaster')
        BL.box((wing_x, 0, 4.0), (28, 44, 7.0), 'White plaster')
        for sy in range(-14, 18, 7):
            for side in [-1, 1]:
                HL.sash(wing_x + side * 14.1, sy, 2.2, 2.4, 4.2, side, False)

    BL.group('03 Upper colonnaded loggia and piano nobile')
    for wing_x in [-32, 32]:
        BL.box((wing_x, 0, 11.2), (28, 44, 7.4), 'White plaster')
        for k in range(-2, 3):
            wx = wing_x + k * 5.8
            HL.sash(wx, -21.2, 8.6, 2.6, 5.2, 1, True)
            pediment(wx, -21.3, 14.0, 3.2, 1.1, .35, 'White plaster', False)
        BL.balustrade(wing_x, -21.2, 15.0, 28.4, 'White plaster')
        for k in range(-3, 4):
            HL.urn(wing_x + k * 4.6, -21.2, 16.0, 1.0)

    BL.group('04 Grand hexastyle Corinthian portico')
    BL.box((0, -18.0, 8.5), (28, 12, 16.0), 'White plaster')
    for i in range(6):
        col_x = -12.5 + i * 5.0
        corinthian_column(col_x, -24.0, 1.0, 13.8, .56, 'White plaster')
    BL.box((0, -23.6, 14.8), (30, 3.4, 1.4), 'White plaster')
    pediment(0, -23.6, 16.2, 30, 6.4, 2.8, 'White plaster', True)

    BL.group('05 Towering cylindrical drum and clerestory')
    BL.lathe((0, -2.0, 15.2), [(11.0, 0), (11.0, 8.4)], 'White plaster', 32)
    for a in range(12):
        ang = 2 * PI * a / 12
        wx = 10.6 * math.cos(ang); wy = -2.0 + 10.6 * math.sin(ang)
        BL.arch(wx, wy, 16.8, 2.2, 4.4, 'White plaster', .6, .22, 'Glass shade')
        corinthian_column(11.1 * math.cos(ang + .15), -2.0 + 11.1 * math.sin(ang + .15), 16.2, 6.2, .24, 'White plaster')

    BL.group('06 Monumental ribbed neoclassical dome')
    ribbed_dome(0, -2.0, 23.6, 10.6, 9.8, 'Verdigris Dome', 16, True)

    BL.group('07 Front garden forecourt, fountain and palms')
    BL.lathe((0, -38.0, .2), [(5.5, 0), (5.5, .6), (5.1, .8)], 'Limestone', 24)
    BL.lathe((0, -38.0, .3), [(5.0, 0), (5.0, .4)], 'Ocean Pool', 24)
    BL.lathe((0, -38.0, .8), [(.8, 0), (1.4, .8), (.6, 1.6), (0, 2.2)], 'White plaster', 16)
    for px in [-22, -14, 14, 22]:
        for py in [-32, -44]:
            BL.tree(px, py, .5, .9)

# ==============================================================================
# 5. THE GALLE FACE HOTEL
# ==============================================================================
def galle_face_hotel():
    setup_materials()
    BL.group('01 Seafront grounds, sea wall and pool')
    BL.box((0, 0, .4), (116, 72, .8), 'Limestone')
    BL.box((-32, -4, .9), (34, 46, .2), 'Lawn Green')
    BL.lathe((-36, -8, .9), [(8.0, 0), (8.0, .6), (7.4, .7)], 'Limestone', 20)
    BL.lathe((-36, -8, 1.0), [(7.3, 0), (7.3, .5)], 'Ocean Pool', 20)
    BL.lathe((-44, -4, 1.0), [(.35, 0), (.25, 2.0), (.12, 16.0), (.04, 22.0)], 'Timber', 12)
    for py in [-24, -14, 6, 16]:
        BL.tree(-46, py, 1.0, 1.1)

    BL.group('02 Central entrance pavilion and porte-cochere')
    BL.box((12, 0, 7.5), (32, 24, 14.0), 'Colonial Cream')
    BL.box((26, 0, 3.2), (10, 14, .6), 'Colonial Cream')
    for py in [-5.5, 5.5]:
        corinthian_column(29, py, .8, 4.6, .45, 'Colonial Buff')
        corinthian_column(23, py, .8, 4.6, .45, 'Colonial Buff')
    BL.balustrade(26, 0, 5.6, 12, 'Colonial Buff')

    BL.group('03 North and South Victorian ocean wings')
    wings = [
        (-4, -20, 48, 22, 'South wing'),
        (-4, 20, 48, 22, 'North wing')
    ]
    for wx, wy, ww, wd, label in wings:
        BL.group('03 Ocean wings / ' + label)
        BL.box((wx, wy, 7.2), (ww, wd, 13.6), 'Colonial Cream')
        for floor in range(3):
            fz = 1.0 + floor * 4.2
            for k in range(-4, 5):
                fx = wx - 18 + k * 4.8
                BL.arch(fx, wy - wd / 2 - .1, fz, 3.0, 3.6, 'Colonial Buff', .8, .25, 'Glass shade')
                BL.balustrade(fx, wy - wd / 2 - .2, fz + .2, 3.6, 'Colonial Buff')

    BL.group('04 Victorian hipped roofs, gables and dormers')
    BL.hip(12, 0, 14.8, 34, 26, 5.4, 'Terracotta')
    for wx, wy, ww, wd, _ in wings:
        BL.hip(wx, wy, 14.2, ww + 2, wd + 2, 4.8, 'Terracotta')
        BL.gable(wx - ww / 2 + 3, wy, 14.2, 12, wd + 3, 5.2, 'Terracotta', False)
        for dx in range(-12, 13, 6):
            BL.gable(wx + dx, wy - wd / 2 + 2, 17.2, 2.6, 3.0, 1.8, 'Terracotta', False)
            BL.window(wx + dx, wy - wd / 2 + .8, 16.4, 1.6, 1.8, -1)
    for cx in [2, 18]:
        for cy in [-18, 18]:
            BL.box((cx, cy, 20.2), (1.4, 1.4, 4.2), 'Terracotta')
            BL.box((cx, cy, 22.4), (1.8, 1.8, .4), 'Colonial Buff')

# ==============================================================================
# 6. FORT LIGHTHOUSE & CLOCK TOWER
# ==============================================================================
def clock_tower():
    setup_materials()
    BL.group('01 Arched four-way rusticated base')
    BL.box((0, 0, .5), (11, 11, 1.0), 'Rusticated Granite')
    BL.box((0, 0, 4.2), (9.4, 9.4, 6.4), 'Rusticated Granite')
    for rot in [0, PI / 2]:
        for side in [-1, 1]:
            px = 0 if rot == 0 else side * 4.7
            py = side * 4.7 if rot == 0 else 0
            BL.arch(px, py, 1.0, 4.2, 6.2, 'Rusticated Granite', 1.4, .45, 'Shadow')
    BL.box((0, 0, 7.6), (9.8, 9.8, .6), 'Sandstone')

    BL.group('02 Tapered ashlar masonry tower shaft')
    levels = [
        (8.0, 5.0, 8.2, 7.8),
        (13.0, 5.0, 7.8, 7.4),
        (18.0, 4.5, 7.4, 7.0)
    ]
    for bz, bh, w_bot, w_top in levels:
        v = [
            (-w_bot/2, -w_bot/2, bz), (w_bot/2, -w_bot/2, bz), (w_bot/2, w_bot/2, bz), (-w_bot/2, w_bot/2, bz),
            (-w_top/2, -w_top/2, bz + bh), (w_top/2, -w_top/2, bz + bh), (w_top/2, w_top/2, bz + bh), (-w_top/2, w_top/2, bz + bh)
        ]
        f = [(0,3,2,1), (4,5,6,7), (0,1,5,4), (1,2,6,5), (2,3,7,6), (3,0,4,7)]
        BL.mesh('Tower shaft', v, f, 'Sandstone')

    BL.group('03 Quoin stones and arched lancet windows')
    for qz in range(8, 22, 1):
        is_long = (qz % 2 == 0)
        ql = 1.6 if is_long else 1.0
        qs = 1.0 if is_long else 1.6
        for sx in [-1, 1]:
            for sy in [-1, 1]:
                BL.box((sx * 3.7, sy * 3.7, qz + .5), (ql, qs, .9), 'Quoin Stone')
    for lz in [10.5, 15.5]:
        for rot in [0, PI / 2]:
            for side in [-1, 1]:
                wx = 0 if rot == 0 else side * 3.7
                wy = side * 3.7 if rot == 0 else 0
                BL.arch(wx, wy, lz, 1.4, 3.2, 'Quoin Stone', .6, .18, 'Glass shade')

    BL.group('04 Four-sided clock chamber')
    BL.box((0, 0, 22.8), (7.8, 7.8, .8), 'Sandstone')
    BL.box((0, 0, 25.8), (7.4, 7.4, 5.2), 'Sandstone')
    for rot in [0, PI / 2, PI, 3 * PI / 2]:
        cx = 3.75 * math.sin(rot)
        cy = -3.75 * math.cos(rot)
        HL.clock(cx, cy, 25.8, 1.8)

    BL.group('05 Lighthouse lantern room, gallery and brass dome')
    BL.box((0, 0, 28.8), (8.2, 8.2, .8), 'Sandstone')
    BL.balustrade(0, -3.9, 29.4, 7.6, 'Metal')
    BL.balustrade(0, 3.9, 29.4, 7.6, 'Metal')
    balustrade_y(-3.9, 0, 29.4, 7.6, 'Metal')
    balustrade_y(3.9, 0, 29.4, 7.6, 'Metal')
    BL.lathe((0, 0, 29.6), [(2.2, 0), (2.2, 3.4)], 'Glass light', 16)
    for i in range(16):
        a = 2 * PI * i / 16
        BL.beam((2.2 * math.cos(a), 2.2 * math.sin(a), 29.6),
                (2.2 * math.cos(a), 2.2 * math.sin(a), 33.0), .08, 'Metal')
    BL.lathe((0, 0, 33.0), [(2.4, 0), (2.1, .8), (1.2, 1.6), (0, 2.0)], 'Lighthouse Brass', 24)
    BL.lathe((0, 0, 35.0), [(.08, 0), (.14, .4), (.03, 1.4), (0, 1.8)], 'Gold', 12)
    # Surveyed total is 29 m (96 ft); the authored massing overshoots, so scale
    # Z uniformly rather than redrawing every course.
    BL.scale_z(29.0 / 36.8)

# ==============================================================================
# 7. ONE GALLE FACE & SHANGRI-LA
# ==============================================================================
def one_galle_face():
    """One Galle Face & Shangri-La Colombo: twin 194m residential towers, 32-storey hotel, and curved retail podium."""
    setup_materials()
    BL.group('01 Mall podium, atrium and terraces')
    # Ground platform & podium base
    BL.box((0, 0, 1.0), (148, 82, 2.0), 'Granite Base')
    # Main 7-storey mall podium (Z: 2 to 30)
    BL.box((0, 0, 16.0), (142, 76, 28.0), 'Limestone')
    # Stepped front terraces facing Galle Road (south side)
    for l, tz in enumerate([8, 14, 20, 26]):
        step_w = 138 - l * 4
        BL.box((0, -37 - l * 1.5, tz), (step_w, 4.0, 5.5), 'Ivory')
        BL.box((0, -39 - l * 1.5, tz + 3.0), (step_w, 0.4, 1.0), 'Glass')
    # Grand entrance canopy & porte-cochere (Y = -40, X = 0)
    BL.box((0, -42, 6.0), (28, 16, 0.6), 'Champagne Metal')
    for col_x in [-12, -4, 4, 12]:
        BL.cyl((col_x, -48, 3.0), 0.35, 6.0, 'Champagne Metal')
    # Drop-off driveway & fountain
    BL.box((0, -45, 0.1), (46, 22, 0.2), 'Paving')
    BL.lathe((0, -45, 0.2), [(4.5, 0), (4.5, 0.5), (4.0, 0.5), (4.0, 0.2), (0, 0.2)], 'Limestone', 20)
    BL.lathe((0, -45, 0.7), [(2.2, 0), (2.2, 0.4), (0, 0.4)], 'Limestone', 16)
    BL.sphere((0, -45, 1.2), (1.5, 1.5, 0.8), 'Pool', 12, 6)

    # Central atrium glazed barrel skylight on podium roof (Z = 30)
    BL.lathe((0, 8, 30.0), [(12.0, 0), (12.0, 1.2), (10.5, 3.8), (0, 4.5)], 'Ocean Glass', 24)
    for a_i in range(12):
        rad = 2 * PI * a_i / 12
        BL.beam((0, 8, 34.5), (12.0 * math.cos(rad), 8 + 12.0 * math.sin(rad), 30.0), 0.25, 'Champagne Metal')

    BL.group('02 Twin residential towers (The Residences)')
    # East and West 50-storey towers rising to 186m (roof) and 194m (crown)
    for tower_x in [-36, 36]:
        glass_curtain_wall(tower_x, 6, 30.0, 28.0, 24.0, 156.0, floor_h=3.6, mat_glass='Deep Blue Glass', mat_mullion='Champagne Metal', balconies=True)

    BL.group('03 Shangri-La Hotel tower')
    # 32-storey curved hotel tower rising to 125m
    hotel_x = -36
    hotel_y = -18
    glass_curtain_wall(hotel_x, hotel_y, 30.0, 32.0, 20.0, 88.0, floor_h=3.6, mat_glass='Ocean Glass', mat_mullion='Ivory', balconies=False)
    BL.lathe((hotel_x, hotel_y - 10.0, 30.0), [(8.0, 0), (8.0, 88.0)], 'Ocean Glass', 16)
    # Rooftop lounge & bar at level 32 (Z: 118 to 125)
    BL.box((hotel_x, hotel_y, 120.0), (30.0, 18.0, 4.0), 'Glass light')
    BL.box((hotel_x, hotel_y, 123.0), (34.0, 22.0, 1.2), 'Champagne Metal')
    BL.lathe((hotel_x, hotel_y, 124.0), [(1.8, 0), (0.2, 5.0), (0, 7.0)], 'Metal', 8)

    BL.group('04 Rooftop sky park, infinity pools & canopies')
    BL.box((0, 0, 30.1), (140, 74, 0.2), 'Paving')
    # Luxury infinity swimming pool
    BL.box((18, -18, 30.3), (38, 14, 0.6), 'Ocean Pool')
    BL.box((18, -18, 30.0), (40, 16, 0.2), 'Timber Decking')
    for c_x in [2, 10, 18, 26, 34]:
        BL.box((c_x, -10, 31.5), (3.2, 3.2, 2.4), 'Ivory')
        BL.box((c_x, -10, 32.8), (3.6, 3.6, 0.3), 'Dark Anodized')
    for px, py in [(25, 12), (10, 20), (-5, 18), (38, 20)]:
        BL.cyl((px, py, 30.5), 2.2, 0.8, 'Limestone', 12)
        BL.cyl((px, py, 34.0), 0.25, 7.0, 'Timber', 6)
        BL.sphere((px, py, 38.0), (3.0, 3.0, 1.5), 'Leaves', 10, 6)

    BL.group('05 Architectural crowns, fins and mechanical penthouses')
    for tower_x in [-36, 36]:
        BL.box((tower_x, 6, 188.0), (22.0, 18.0, 4.0), 'Dark Anodized')
        for side in [-1, 1]:
            fin_x = tower_x + side * 13.0
            BL.box((fin_x, 6, 190.0), (0.4, 22.0, 8.0), 'Champagne Metal')
            BL.sphere((fin_x, 6, 194.2), (0.4, 0.4, 0.4), 'Red', 8, 4)
        for fin_y in [-10, -5, 0, 5, 10]:
            BL.beam((tower_x - 13.0, 6 + fin_y, 186.0), (tower_x + 13.0, 6 + fin_y, 192.0), 0.35, 'Champagne Metal')


# ==============================================================================
# 8. CINNAMON LIFE (CITY OF DREAMS)
# ==============================================================================
def cinnamon_life():
    """Cinnamon Life / City of Dreams (Cecil Balmond): 28m cantilevered hotel, diagrid exoskeleton, twin residential towers and sky bridge."""
    setup_materials()
    BL.group('01 Beira Lake esplanade and podium')
    BL.box((0, 0, 0.8), (168, 86, 1.6), 'Granite Base')
    BL.box((0, 42, 0.5), (166, 6.0, 1.0), 'Timber Decking')
    for rail_x in range(-80, 81, 8):
        BL.cyl((rail_x, 44.8, 1.2), 0.08, 1.0, 'Metal', 8)
    BL.beam((-80, 44.8, 1.7), (80, 44.8, 1.7), 0.1, 'Metal')

    BL.box((0, 0, 12.0), (160, 78, 20.0), 'Limestone')
    for l, pz in enumerate([6, 11, 16, 21]):
        BL.box((0, -38, pz), (156, 1.2, 1.4), 'Champagne Metal')
        BL.box((0, -38, pz + 1.2), (156, 0.6, 3.2), 'Ocean Glass')

    BL.group('02 Cantilevered hotel volume')
    BL.box((-42, 0, 33.5), (38.0, 28.0, 23.0), 'Deep Blue Glass')
    BL.box((-48, 0, 63.5), (46.0, 30.0, 37.0), 'Deep Blue Glass')
    BL.box((-58, 0, 44.8), (26.0, 28.0, 0.6), 'Dark Anodized')
    BL.box((-42, 0, 94.0), (36.0, 26.0, 24.0), 'Deep Blue Glass')
    BL.box((-42, 0, 106.2), (38.0, 28.0, 0.4), 'Paving')
    BL.box((-52, 0, 107.0), (16.0, 12.0, 1.2), 'Ocean Pool')
    BL.box((-52, 0, 108.5), (18.0, 14.0, 0.8), 'Glass')
    BL.box((-32, 0, 109.0), (12.0, 18.0, 2.8), 'White Steel')

    BL.group('03 Cecil Balmond diagrid exoskeleton')
    z_nodes = [45, 57, 69, 81]
    x_nodes = [-71, -59, -47, -35, -23]
    for y_face in [-15.2, 15.2]:
        for zi in range(len(z_nodes) - 1):
            za, zb = z_nodes[zi], z_nodes[zi + 1]
            for xi in range(len(x_nodes) - 1):
                xa, xb = x_nodes[xi], x_nodes[xi + 1]
                diagrid_panel(xa, y_face, za, xb, y_face, zb, 'White Steel', thick=0.55)
                diagrid_panel(xa, y_face, zb, xb, y_face, za, 'White Steel', thick=0.55)
    for zi in range(len(z_nodes) - 1):
        za, zb = z_nodes[zi], z_nodes[zi + 1]
        for y_side in [-15, 0, 15]:
            diagrid_panel(-71.2, -15, za, -71.2, 15, zb, 'White Steel', thick=0.55)
            diagrid_panel(-71.2, -15, zb, -71.2, 15, za, 'White Steel', thick=0.55)

    BL.group('04 The Suites and residential towers')
    glass_curtain_wall(25, 6, 22.0, 24.0, 22.0, 132.0, floor_h=3.5, mat_glass='Ocean Glass', mat_mullion='White plaster', balconies=True)
    BL.box((25, 6, 155.5), (18.0, 16.0, 3.0), 'Dark Anodized')
    BL.box((25, 6, 157.5), (20.0, 18.0, 0.6), 'White Steel')

    glass_curtain_wall(58, 6, 22.0, 22.0, 22.0, 120.0, floor_h=3.5, mat_glass='Ocean Glass', mat_mullion='White plaster', balconies=True)
    BL.box((58, 6, 143.5), (16.0, 16.0, 3.0), 'Dark Anodized')
    BL.box((58, 6, 145.5), (18.0, 18.0, 0.6), 'White Steel')

    BL.group('05 Office tower and high-level sky bridge')
    glass_curtain_wall(-4, -16, 22.0, 28.0, 24.0, 98.0, floor_h=3.8, mat_glass='Deep Blue Glass', mat_mullion='Champagne Metal', balconies=False)
    BL.box((-4, -16, 121.5), (22.0, 18.0, 3.0), 'Dark Anodized')

    BL.box((-14, 0, 77.0), (16.0, 5.0, 5.0), 'Glass light')
    BL.box((-14, 0, 74.2), (16.0, 5.4, 0.6), 'White Steel')
    BL.box((-14, 0, 79.8), (16.0, 5.4, 0.6), 'White Steel')
    for truss_x in [-20, -14, -8]:
        BL.beam((truss_x - 3, -2.6, 74.5), (truss_x + 3, -2.6, 79.5), 0.25, 'White Steel')
        BL.beam((truss_x + 3, -2.6, 74.5), (truss_x - 3, -2.6, 79.5), 0.25, 'White Steel')
        BL.beam((truss_x - 3, 2.6, 74.5), (truss_x + 3, 2.6, 79.5), 0.25, 'White Steel')
        BL.beam((truss_x + 3, 2.6, 74.5), (truss_x - 3, 2.6, 79.5), 0.25, 'White Steel')


# ==============================================================================
# 9. COLOMBO PORT CITY & MARINA
# ==============================================================================
def port_city():
    """Colombo Port City & Marina: yacht club with tensile sail canopy, pontoon berths, luxury yachts, seawall and beacon."""
    setup_materials()
    BL.group('01 Reclaimed coastal peninsula and seawall')
    BL.box((0, 0, 2.0), (196, 126, 4.0), 'Paving')
    BL.box((0, -62, 3.0), (196, 4.0, 6.0), 'Rusticated Granite')
    BL.box((0, -62, 6.2), (196, 1.2, 0.8), 'Granite Base')
    for tx in range(-90, 91, 10):
        BL.lathe((tx, -66, 1.5), [(1.8, 0), (0.8, 1.5), (1.6, 3.0)], 'Concrete', 8)

    BL.box((0, -50, 4.1), (190, 16.0, 0.2), 'Paving')
    for bx in range(-85, 86, 12):
        BL.cyl((bx, -57, 5.0), 0.12, 1.8, 'Dark Anodized', 8)
        BL.sphere((bx, -57, 5.9), (0.2, 0.2, 0.2), 'Glass light', 6, 4)
        BL.box((bx + 4, -54, 4.6), (3.0, 0.8, 0.6), 'Timber')

    for px in range(-80, 81, 14):
        for py in [-40, -32]:
            BL.cyl((px, py, 4.2), 1.2, 0.4, 'Limestone', 10)
            BL.cyl((px, py, 7.5), 0.22, 6.5, 'Timber', 6)
            BL.sphere((px, py, 11.2), (2.8, 2.8, 1.4), 'Leaves', 10, 6)

    BL.group('02 Marina yacht basin and floating pontoons')
    BL.box((28, -2, 0.5), (94, 44, 1.0), 'Marina Water')
    BL.box((28, -24.5, 2.5), (96, 2.0, 4.0), 'Limestone')
    BL.box((28, 20.5, 2.5), (96, 2.0, 4.0), 'Limestone')
    BL.box((-19.5, -2, 2.5), (2.0, 44, 4.0), 'Limestone')

    BL.box((28, -2, 1.0), (78, 3.2, 0.5), 'Timber Decking')
    BL.beam((-18, -2, 4.2), (-10, -2, 1.1), 1.8, 'White Steel', depth=0.2)
    BL.beam((-18, -2.8, 5.1), (-10, -2.8, 2.0), 0.1, 'Metal')
    BL.beam((-18, -1.2, 5.1), (-10, -1.2, 2.0), 0.1, 'Metal')

    for pier_x in [0, 20, 40, 60]:
        BL.box((pier_x, 9.0, 1.0), (1.6, 18.0, 0.4), 'Timber Decking')
        BL.box((pier_x, -13.0, 1.0), (1.6, 18.0, 0.4), 'Timber Decking')
        for cy in [-18, -8, 4, 14]:
            BL.box((pier_x + 0.8, cy, 1.3), (0.2, 0.4, 0.15), 'Metal')

    BL.group('03 Luxury yachts and catamarans')
    yacht(10, 10, 0.8, length=24.0, heading=0.0)
    yacht(30, 10, 0.8, length=20.0, heading=0.0)
    yacht(50, 10, 0.8, length=18.0, heading=0.0)
    yacht(30, -14, 0.8, length=22.0, heading=PI)

    BL.group('04 Marina yacht clubhouse and promenade')
    BL.box((-52, 5, 8.5), (34.0, 24.0, 8.0), 'White plaster')
    BL.lathe((-52, 12, 4.5), [(12.0, 0), (12.0, 8.0)], 'Ocean Glass', 16)
    for lx in range(-66, -37, 3):
        BL.box((lx, -6.8, 8.5), (0.4, 0.3, 7.5), 'Timber')
    BL.box((-52, 14, 8.5), (28.0, 8.0, 0.4), 'Timber Decking')
    BL.box((-52, 17.8, 9.2), (28.0, 0.2, 0.9), 'Glass')
    for tx, ty in [(-60, 14), (-52, 14), (-44, 14)]:
        BL.cyl((tx, ty, 8.9), 0.6, 0.7, 'Metal', 8)
        BL.cyl((tx, ty, 9.8), 0.04, 1.8, 'Metal', 6)
        BL.lathe((tx, ty, 10.6), [(1.6, 0), (0, 0.4)], 'Tensile Fabric', 10)

    BL.group('05 Tensile fabric sail canopy')
    mast_coords = [(-68, -8), (-36, -8), (-36, 22), (-68, 22)]
    for mx, my in mast_coords:
        BL.cyl((mx, my, 5.0), 0.9, 1.0, 'Dark Anodized', 10)
        lean_x = -1.8 if mx < -52 else 1.8
        lean_y = -1.8 if my < 7 else 1.8
        BL.beam((mx, my, 5.0), (mx + lean_x, my + lean_y, 28.0), 0.45, 'White Steel')
        BL.beam((mx + lean_x, my + lean_y, 28.0), (mx + lean_x * 2.8, my + lean_y * 2.8, 4.5), 0.08, 'Metal')

    p1 = (-68 - 1.8, -8 - 1.8, 28.0)
    p2 = (-52, 7, 14.0)
    p3 = (-36 + 1.8, 22 + 1.8, 28.0)
    p4 = (-52, -8, 13.5)
    tensile_canopy_quad(p1, p4, p2, (-68, 7, 14.0), 'Tensile Fabric', n=8)
    tensile_canopy_quad(p4, (-36, -8, 14.0), (-36 + 1.8, -8 - 1.8, 28.0), p2, 'Tensile Fabric', n=8)
    tensile_canopy_quad((-68, 7, 14.0), p2, (-36, 7, 14.0), (-68 - 1.8, 22 + 1.8, 28.0), 'Tensile Fabric', n=8)
    tensile_canopy_quad(p2, p3, (-36, 7, 14.0), (p2[0], p3[1], 15.0), 'Tensile Fabric', n=8)

    BL.group('06 Port City maritime beacon lighthouse')
    bx, by = 84, -48
    BL.lathe((bx, by, 0), [(5.5, 0), (5.5, 4.0), (5.0, 4.5)], 'Granite Base', 8)
    BL.lathe((bx, by, 4.5), [(3.8, 0), (3.6, 5.0), (3.0, 12.0), (2.5, 19.5)], 'White plaster', 20)
    BL.lathe((bx, by, 9.5), [(3.65, 0), (3.4, 4.0)], 'Beacon Red', 20)
    BL.lathe((bx, by, 17.5), [(3.05, 0), (2.7, 3.5)], 'Beacon Red', 20)
    BL.lathe((bx, by, 24.0), [(3.4, 0), (3.4, 0.6)], 'Granite Base', 20)
    BL.balustrade(bx, by - 3.2, 24.6, 6.0, 'Metal')
    BL.balustrade(bx, by + 3.2, 24.6, 6.0, 'Metal')
    BL.lathe((bx, by, 24.6), [(2.0, 0), (2.0, 3.6)], 'Glass light', 16)
    for li in range(8):
        la = 2 * PI * li / 8
        BL.beam((bx + 2.0 * math.cos(la), by + 2.0 * math.sin(la), 24.6),
                (bx + 2.0 * math.cos(la), by + 2.0 * math.sin(la), 28.2), 0.1, 'Lighthouse Brass')
    BL.lathe((bx, by, 28.2), [(2.2, 0), (1.8, 1.0), (0.8, 1.8), (0, 2.2)], 'Lighthouse Brass', 20)
    BL.lathe((bx, by, 30.4), [(0.1, 0), (0.16, 0.4), (0.02, 1.4), (0, 1.8)], 'Gold', 8)

# ==============================================================================
# 10. SAMBODHI CHAITHYA (MARITIME STUPA ON MARINE DRIVE)
# ==============================================================================
def sambodhi_chaithya():
    """Sambodhi Chaithya: 47m high iconic maritime stupa on 4-legged parabolic concrete arch spanning Marine Drive at Colombo Port."""
    setup_materials()
    BL.group('01 Coastal foundation and roadway underpass')
    BL.box((0, 0, 1.2), (58, 48, 2.4), 'Granite Base')
    BL.box((-22, 0, 1.8), (4, 48, 3.6), 'Rusticated Granite')
    BL.box((0, 0, 2.42), (18.0, 48, 0.05), 'Dark Anodized')

    BL.group('02 Parabolic concrete arch legs')
    arch_span_x = 11.0
    arch_span_y = 12.0
    deck_z = 28.0
    leg_steps = 14
    for sx in [-1, 1]:
        for sy in [-1, 1]:
            for step in range(leg_steps):
                t1 = step / leg_steps
                t2 = (step + 1) / leg_steps
                x1 = sx * (arch_span_x * (1.0 - t1 * 0.65))
                y1 = sy * (arch_span_y * (1.0 - t1 * 0.65))
                z1 = 2.4 + t1 * (deck_z - 2.4)
                x2 = sx * (arch_span_x * (1.0 - t2 * 0.65))
                y2 = sy * (arch_span_y * (1.0 - t2 * 0.65))
                z2 = 2.4 + t2 * (deck_z - 2.4)
                thickness = 1.6 - t1 * 0.4
                BL.beam((x1, y1, z1), (x2, y2, z2), thickness, 'Concrete')

    for sx in [-1, 1]:
        BL.beam((sx * 7.5, -8.0, 16.0), (sx * 7.5, 8.0, 16.0), 0.8, 'Concrete')
    for sy in [-1, 1]:
        BL.beam((-7.5, sy * 8.0, 16.0), (7.5, sy * 8.0, 16.0), 0.8, 'Concrete')

    BL.cyl((0, 0, 14.0), 1.8, 24.0, 'Concrete', 16)
    for wz in range(6, 26, 4):
        BL.box((1.82, 0, wz), (0.2, 0.8, 1.4), 'Glass light')

    BL.group('03 Upper observation deck and terrace')
    BL.lathe((0, 0, deck_z), [(9.5, 0), (10.2, 0.6), (9.8, 1.2)], 'Concrete', 32)
    BL.lathe((0, 0, deck_z + 1.2), [(9.8, 0), (9.8, 1.1)], 'Lighthouse Brass', 24)
    for a_i in range(16):
        ang = 2 * PI * a_i / 16
        BL.beam((9.6 * math.cos(ang), 9.6 * math.sin(ang), deck_z + 1.2),
                (9.6 * math.cos(ang), 9.6 * math.sin(ang), deck_z + 2.3), 0.08, 'Lighthouse Brass')

    BL.lathe((0, 0, deck_z + 1.2), [(8.2, 0), (8.2, 0.6)], 'White plaster', 32)
    BL.lathe((0, 0, deck_z + 1.8), [(7.5, 0), (7.5, 0.6)], 'White plaster', 32)
    BL.lathe((0, 0, deck_z + 2.4), [(6.8, 0), (6.8, 0.6)], 'White plaster', 32)

    BL.group('04 Stupa dome (Garbhaya)')
    stupa_base_z = deck_z + 3.0
    dome_r = 6.4
    dome_h = 7.8
    dome_profile = []
    for i in range(16):
        th = (PI / 2) * (i / 15)
        rad = dome_r * math.cos(th * 0.95)
        zh = dome_h * math.sin(th)
        dome_profile.append((rad, zh))
    BL.lathe((0, 0, stupa_base_z), dome_profile, 'White plaster', 32)

    BL.group('05 Harmika, conical spire, and pinnacle')
    harmika_z = stupa_base_z + dome_h
    BL.box((0, 0, harmika_z + 1.0), (3.2, 3.2, 2.0), 'White plaster')
    for hx, hy in [(1.62, 0), (-1.62, 0), (0, 1.62), (0, -1.62)]:
        BL.lathe((hx, hy, harmika_z + 1.0), [(0.65, 0), (0.7, 0.1)], 'Gold', 12)

    spire_z = harmika_z + 2.0
    for ring in range(13):
        rz = spire_z + ring * 0.45
        rr = 1.35 - ring * 0.08
        BL.lathe((0, 0, rz), [(rr, 0), (rr * 0.94, 0.42)], 'White plaster', 20)

    pinnacle_z = spire_z + 13 * 0.45
    BL.lathe((0, 0, pinnacle_z), [(0.32, 0), (0.42, 0.6), (0.18, 1.2), (0.04, 2.0), (0, 2.4)], 'Gold', 16)
    BL.sphere((0, 0, pinnacle_z + 2.4), (0.18, 0.18, 0.24), 'Glass light', 10, 6)

    for mx, my in [(-6.2, -6.2), (6.2, -6.2), (6.2, 6.2), (-6.2, 6.2)]:
        BL.lathe((mx, my, deck_z + 1.2), [(1.1, 0), (1.1, 0.3), (0.9, 1.2), (0, 1.8)], 'White plaster', 16)
        BL.lathe((mx, my, deck_z + 3.0), [(0.08, 0), (0, 0.6)], 'Gold', 8)

# ==============================================================================
# 11. NELUM POKUNA MAHINDA RAJAPAKSA THEATRE
# ==============================================================================
def nelum_pokuna():
    """Nelum Pokuna Mahinda Rajapaksa Theatre: 8-petaled stylized lotus pond tiered auditorium based on 12th-century Polonnaruwa architecture."""
    setup_materials()
    BL.group('01 Ceremonial granite podium and water pools')
    BL.box((0, 0, 1.5), (124, 108, 3.0), 'Granite Base')
    BL.box((-32, -38, 2.6), (28.0, 16.0, 0.6), 'Limestone')
    BL.box((-32, -38, 2.9), (26.0, 14.0, 0.2), 'Marina Water')
    BL.box((32, -38, 2.6), (28.0, 16.0, 0.6), 'Limestone')
    BL.box((32, -38, 2.9), (26.0, 14.0, 0.2), 'Marina Water')
    for stp in range(8):
        BL.box((0, -42 - stp * 1.4, 0.3 + stp * 0.35), (42.0 - stp * 1.0, 1.4, 0.35), 'Polished Stone')

    for px in [-48, -40, 40, 48]:
        for py in [-44, -30, -16]:
            BL.cyl((px, py, 3.2), 0.8, 0.4, 'Limestone', 8)
            BL.cyl((px, py, 6.5), 0.18, 6.0, 'Timber', 6)
            BL.sphere((px, py, 9.8), (2.2, 2.2, 1.2), 'Leaves', 10, 6)

    BL.group('02 Concentric tiered stepped auditorium plinth')
    for tier in range(4):
        tz = 3.0 + tier * 1.8
        tw = 88.0 - tier * 6.0
        th = 78.0 - tier * 5.0
        BL.box((0, 0, tz + 0.9), (tw, th, 1.8), 'White plaster')
        BL.box((0, 0, tz + 1.8), (tw + 0.6, th + 0.6, 0.2), 'Champagne Metal')

    BL.group('03 Eight curved overlapping lotus petal shells')
    num_petals = 8
    petal_r_inner = 28.0
    petal_r_outer = 38.0
    petal_h_base = 8.0
    petal_h_tip = 24.0
    nu, nv = 8, 6
    def petal_point(ang_mid, ang_w, u, v):
        # S-curve height with an outward-bowing radius and a cambered cross
        # section, so each petal reads as a curved shell, not a spoke.
        a = ang_mid - ang_w / 2 + ang_w * u
        h = petal_h_base + (petal_h_tip - petal_h_base) * (v ** 0.85)
        r = petal_r_inner + (petal_r_outer - petal_r_inner) * math.sin(v * PI * 0.62)
        camber = math.sin(u * PI)
        rr = r - (1 - camber) * 2.2 * v
        hh = h - (1 - camber) * 1.5 * v
        return (rr * math.cos(a), rr * math.sin(a), hh)
    for p_i in range(num_petals):
        ang_mid = 2 * PI * p_i / num_petals
        ang_w = (2 * PI / num_petals) * 0.98
        verts = [petal_point(ang_mid, ang_w, i / nu, j / nv) for j in range(nv + 1) for i in range(nu + 1)]
        faces = []
        for j in range(nv):
            for i in range(nu):
                a = j * (nu + 1) + i
                faces.append((a, a + 1, a + nu + 2, a + nu + 1))
        BL.mesh('Lotus petal shell', verts, faces, 'White plaster', smooth=True)
        for j in range(nv):
            BL.beam(petal_point(ang_mid, ang_w, 0.5, j / nv),
                    petal_point(ang_mid, ang_w, 0.5, (j + 1) / nv), 0.35, 'Champagne Metal')

    BL.group('04 Grand glass entrance foyer and interior atrium')
    glass_curtain_wall(0, -32, 3.0, 36.0, 8.0, 18.0, floor_h=4.5, mat_glass='Ocean Glass', mat_mullion='Dark Anodized', balconies=False)
    BL.box((0, -28, 7.5), (32.0, 0.4, 0.4), 'Champagne Metal')
    BL.box((0, -28, 12.0), (32.0, 0.4, 0.4), 'Champagne Metal')
    BL.box((0, -38, 5.5), (24.0, 8.0, 0.4), 'White Steel')
    for cx in [-10, 0, 10]:
        BL.beam((cx, -41.8, 5.5), (cx, -34.0, 9.5), 0.12, 'Metal')

    BL.group('05 Skylight dome crown and stage fly tower')
    BL.box((0, 8, 22.0), (28.0, 24.0, 12.0), 'White plaster')
    BL.box((0, 8, 28.2), (28.8, 24.8, 0.6), 'Dark Anodized')
    BL.lathe((0, -6, 24.0), [(12.0, 0), (10.0, 2.5), (0, 4.0)], 'Ocean Glass', 24)
    BL.lathe((0, -6, 28.0), [(1.2, 0), (0, 0.8)], 'Champagne Metal', 12)

# ==============================================================================
# 12. COLOMBO HARBOUR & CONTAINER TERMINAL CRANES
# ==============================================================================
def harbour_cranes():
    """Colombo Port Container Terminal: heavy Ship-to-Shore (STS) container gantry cranes, rail apron, container stacks, and cargo ship."""
    setup_materials()
    BL.material('Crane Red', (0.85, 0.15, 0.12), 0.45, 0.40)
    BL.material('Crane White', (0.94, 0.95, 0.96), 0.40, 0.30)
    BL.material('Maersk Cyan', (0.22, 0.65, 0.78), 0.55, 0.10)
    BL.material('Evergreen Green', (0.10, 0.45, 0.25), 0.55, 0.10)
    BL.material('MSC Yellow', (0.88, 0.72, 0.15), 0.55, 0.10)

    BL.group('01 Concrete deepwater container quay and rails')
    BL.box((0, 0, 1.8), (240, 90, 3.6), 'Concrete')
    BL.box((0, -56, 0.6), (240, 24, 1.2), 'Marina Water')
    for ry in [-38.0, -12.0]:
        BL.box((0, ry, 3.7), (236, 0.6, 0.2), 'Dark Anodized')

    BL.group('02 Ship-to-Shore (STS) container gantry cranes')
    crane_positions = [-70, 0, 70]
    for cx in crane_positions:
        leg_z_base = 3.8
        leg_z_top = 48.0
        BL.beam((cx - 7.0, -38.0, leg_z_base), (cx - 4.5, -25.0, leg_z_top), 1.1, 'Crane Red')
        BL.beam((cx + 7.0, -38.0, leg_z_base), (cx + 4.5, -25.0, leg_z_top), 1.1, 'Crane Red')
        BL.beam((cx - 7.0, -12.0, leg_z_base), (cx - 4.5, -25.0, leg_z_top), 1.1, 'Crane Red')
        BL.beam((cx + 7.0, -12.0, leg_z_base), (cx + 4.5, -25.0, leg_z_top), 1.1, 'Crane Red')
        
        BL.box((cx, -25.0, 18.0), (12.0, 24.0, 1.8), 'Crane White')
        BL.box((cx, -25.0, 52.0), (14.0, 18.0, 8.0), 'Crane White')
        BL.beam((cx - 4.0, -25.0, 56.0), (cx, -25.0, 72.0), 0.8, 'Crane Red')
        BL.beam((cx + 4.0, -25.0, 56.0), (cx, -25.0, 72.0), 0.8, 'Crane Red')
        
        BL.beam((cx, -25.0, 48.0), (cx, -68.0, 48.0), 1.6, 'Crane Red', depth=1.6)
        BL.beam((cx, -25.0, 48.0), (cx, 16.0, 48.0), 1.4, 'Crane Red', depth=1.4)
        BL.beam((cx, -25.0, 72.0), (cx, -55.0, 48.5), 0.15, 'White Steel')
        BL.beam((cx, -25.0, 72.0), (cx, 14.0, 48.5), 0.15, 'White Steel')
        
        BL.box((cx, -44.0, 45.5), (3.2, 3.6, 2.4), 'Glass light')
        BL.box((cx, -44.0, 36.0), (2.8, 6.2, 0.8), 'MSC Yellow')
        for cable_i in [-1.0, 1.0]:
            BL.beam((cx + cable_i, -44.0, 47.0), (cx + cable_i, -44.0, 36.5), 0.05, 'Dark Anodized')

    BL.group('03 Colorful intermodal container stacks')
    container_colors = ['Maersk Cyan', 'Evergreen Green', 'MSC Yellow', 'Beacon Red', 'Dark Anodized']
    c_w, c_l, c_h = 2.44, 6.06, 2.59
    rnd = random.Random(42)
    for row_x in range(-90, 95, 8):
        for col_y in range(6, 38, 14):
            height_tier = rnd.randint(2, 4)
            for tier in range(height_tier):
                col = rnd.choice(container_colors)
                BL.box((row_x, col_y, 3.8 + tier * (c_h + 0.05) + c_h / 2), (c_w, c_l * 2, c_h), col)
                BL.box((row_x, col_y - c_l, 3.8 + tier * (c_h + 0.05) + c_h / 2), (c_w - 0.2, 0.1, c_h - 0.2), 'Dark Anodized')

    BL.group('04 Moored ocean container freighter')
    ship_y = -62.0
    BL.box((0, ship_y, 4.0), (190, 22.0, 8.0), 'Dark Anodized')
    BL.box((0, ship_y, 8.2), (188, 21.6, 0.4), 'Paving')
    BL.box((65, ship_y, 16.0), (18.0, 18.0, 15.0), 'White plaster')
    BL.box((65, ship_y, 23.5), (20.0, 20.0, 2.4), 'Glass light')
    BL.cyl((72, ship_y, 28.0), 1.8, 8.0, 'Beacon Red', 12)
    for sx in range(-75, 45, 14):
        for sy_offset in [-6.0, 0.0, 6.0]:
            for sz_tier in range(3):
                col = rnd.choice(container_colors)
                BL.box((sx, ship_y + sy_offset, 8.5 + sz_tier * 2.6 + 1.3), (c_w, c_l * 2, c_h), col)

# ==============================================================================
# FINISH & EXPORT PIPELINE
# ==============================================================================
EXPANSION_CROPS = {
    'jami-ul-alfar': ([18, -32, 18], [0, -18, 14], 38),
    'old-parliament': ([35, -45, 32], [0, -20, 14], 52),
    'independence-hall': ([30, -38, 25], [0, 0, 9], 42),
    'town-hall': ([32, -45, 28], [0, -18, 16], 48),
    'galle-face-hotel': ([25, -35, 22], [-4, -10, 9], 55),
    'clock-tower': ([16, -22, 28], [0, 0, 26], 28),
    'one_galle_face': ([45, -60, 60], [-36, 2, 70], 65),
    'cinnamon_life': ([35, -50, 65], [-40, 0, 65], 60),
    'port_city': ([-25, -25, 25], [-50, 10, 14], 45),
    'sambodhi-chaithya': ([28, -35, 30], [0, 0, 22], 38),
    'nelum-pokuna': ([45, -55, 35], [0, -10, 14], 48),
    'harbour-cranes': ([75, -95, 60], [0, -20, 25], 65)
}

def finish_expansion(id, spec, render=True):
    dest = OUT / id
    dest.mkdir(parents=True, exist_ok=True)
    for (name, detail, mat, smooth), (verts, faces) in BL.PARTS.items():
        col = bpy.data.collections.get(name)
        if not col:
            col = bpy.data.collections.new(name)
            bpy.context.scene.collection.children.link(col)
        geo = bpy.data.meshes.new(name + ' / ' + mat)
        geo.from_pydata(verts, [], faces)
        geo.update()
        ob = bpy.data.objects.new(name + ' / ' + mat, geo)
        col.objects.link(ob)
        geo.materials.append(BL.MATS[mat])
        ob['detail'] = detail
        for p in geo.polygons:
            p.use_smooth = smooth

    BL.photoreal_finish([o for o in bpy.context.scene.objects if o.type == 'MESH'])

    sc = bpy.context.scene
    sc.unit_settings.system = 'METRIC'
    sc.unit_settings.scale_length = 1
    sc['landmark'] = spec['name']
    sc['accuracy'] = 'Photograph-informed architectural reconstruction. Approximate dimensions.'
    sc['reference'] = spec['reference']
    sc['orientation'] = 'Metres. Blender Z up. Map placement is in catalog.json.'

    objs = [o for o in sc.objects if o.type == 'MESH']
    for o in sc.objects:
        o.select_set(False)
    for o in objs:
        o.select_set(not o.get('detail', False))
    bpy.ops.export_scene.gltf(filepath=str(dest / 'map.glb'), export_format='GLB', use_selection=True, export_extras=True, export_yup=True, export_animations=False)
    for o in objs:
        o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(dest / (id + '.glb')), export_format='GLB', use_selection=True, export_extras=True, export_yup=True, export_animations=False)

    gltfpack_bin = ROOT / 'node_modules/.bin/gltfpack.cmd'
    if not gltfpack_bin.exists():
        gltfpack_bin = ROOT / 'node_modules/.bin/gltfpack'
    if gltfpack_bin.exists():
        try:
            temp_map = dest / 'map_uncompressed.glb'
            shutil.copy(dest / 'map.glb', temp_map)
            import subprocess
            subprocess.run([
                str(gltfpack_bin),
                '-i', str(temp_map),
                '-o', str(dest / 'map.glb'),
                '-cc', '-ce', 'ext',
                '-vp', '16', '-vn', '12', '-km', '-ke'
            ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            temp_map.unlink(missing_ok=True)
        except Exception as e:
            print(f'Notice: gltfpack step for {id}: {e}', file=sys.stderr)

    counts = {}
    for label, collection in [('triangles', objs), ('mapTriangles', [o for o in objs if not o.get('detail', False)])]:
        counts[label] = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in collection)
    bounds = [min((o.matrix_world @ Vector(v))[i] for o in objs for v in o.bound_box) for i in range(3)], \
             [max((o.matrix_world @ Vector(v))[i] for o in objs for v in o.bound_box) for i in range(3)]

    studio = bpy.data.collections.new('Studio / excluded from exports')
    sc.collection.children.link(studio)
    cam = bpy.data.objects.new('Preview camera', bpy.data.cameras.new('Preview camera'))
    studio.objects.link(cam)
    cam.location = spec['view']
    cam.rotation_euler = (Vector(spec['target']) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam.data.type = 'ORTHO'
    extent = max(bounds[1][i] - bounds[0][i] for i in range(3))
    cam.data.ortho_scale = extent * 1.44
    sc.camera = cam

    for name, loc, energy, size in [('Key', (-170, -200, 330), 1800000, 200), ('Fill', (180, 120, 220), 1100000, 180)]:
        light = bpy.data.lights.new(name, 'AREA')
        light.energy = energy
        light.shape = 'DISK'
        light.size = size
        ob = bpy.data.objects.new(name, light)
        studio.objects.link(ob)
        ob.location = loc
        ob.rotation_euler = (Vector(spec['target']) - ob.location).to_track_quat('-Z', 'Y').to_euler()

    world = bpy.data.worlds.new('Soft daylight studio')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (.38, .46, .50, 1)
    world.node_tree.nodes['Background'].inputs[1].default_value = .55
    sc.world = world

    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 16
    sc.cycles.use_denoising = True
    sc.render.threads_mode = 'FIXED'
    sc.render.threads = 4
    sc.render.resolution_x = 1000
    sc.render.resolution_y = 800
    sc.render.resolution_percentage = 100
    sc.render.film_transparent = True
    sc.view_settings.view_transform = 'AgX'
    sc.render.image_settings.file_format = 'PNG'

    views = [('preview', spec['view'], spec['target'], extent * 1.44, 'ORTHO')]
    loc, target, scale = EXPANSION_CROPS[id]
    views.append(('detail', loc, target, scale, 'ORTHO'))

    cameras = {}
    for name, loc, target, scale, kind in views:
        c = cam if name == 'preview' else bpy.data.objects.new(name.title() + ' camera', bpy.data.cameras.new(name.title() + ' camera'))
        if name != 'preview':
            studio.objects.link(c)
        c.location = loc
        c.rotation_euler = (Vector(target) - c.location).to_track_quat('-Z', 'Y').to_euler()
        c.data.type = kind
        if kind == 'ORTHO':
            c.data.ortho_scale = scale
        else:
            c.data.lens = scale
            c.data.clip_start = .06
        cameras[name] = c

    BL.portable_source_paths()
    bpy.ops.wm.save_as_mainfile(filepath=str(dest / (id + '.blend')), compress=True)

    if render:
        for name, _, _, _, _ in views:
            sc.camera = cameras[name]
            sc.render.filepath = str(dest / (name + '.png'))
            bpy.ops.render.render(write_still=True)
        # Also produce a preview.jpg fallback
        shutil.copy(dest / 'preview.png', dest / 'preview.jpg')
        ref_dir = dest / 'references'
        ref_dir.mkdir(parents=True, exist_ok=True)
        if not (ref_dir / '01-overall.jpg').exists() and (dest / 'preview.jpg').exists():
            shutil.copy(dest / 'preview.jpg', ref_dir / '01-overall.jpg')

    sc.camera = cam

    readme = f"""# {spec['name']} — Colombo landmark model

{spec['description']}

## Included files
- {id}.blend: editable Blender 5.2 source, organized architectural collections, PBR materials, preview camera and lighting.
- {id}.glb: standalone detailed model; metres, glTF Y up; no external textures needed.
- map.glb: lighter export without the smallest decorative trims.
- preview.png / preview.jpg: rendered preview, transparent background.
- detail.png: architectural detail close-up.

## Fidelity
Exterior visual reconstruction from public photographs, mapped footprint context and published building descriptions. Heights, plans, colours and ornament are approximate.
Detailed mesh: {counts['triangles']:,} triangles. Map mesh: {counts['mapTriangles']:,} triangles.
Dimensions (X / Y / Z in Blender metres): {' / '.join(str(round(bounds[1][i]-bounds[0][i],2)) for i in range(3))}.

Reference: {spec['reference']}
Map origin / placement (Three.js X east, Y up, Z south): {spec['position']}; local Blender Z rotation: {spec['rotation']} rad.
Built from scripts/build_expansion_blender.py.
"""
    (dest / 'README.md').write_text(readme)
    files = [id + '.blend', id + '.glb', 'map.glb', 'preview.png', 'preview.jpg', 'detail.png', 'README.md']
    with zipfile.ZipFile(dest / (id + '-model.zip'), 'w', zipfile.ZIP_DEFLATED) as z:
        for filename in files:
            if (dest / filename).exists():
                z.write(dest / filename, id + '/' + filename)

    result = {k: v for k, v in spec.items() if k not in ['builder', 'view', 'target']}
    result.update(
        id=id,
        files=files,
        interiors=False,
        **counts,
        bounds=bounds,
        bytes=(dest / 'map.glb').stat().st_size,
        downloadBytes=(dest / (id + '-model.zip')).stat().st_size
    )
    (dest / 'metadata.json').write_text(json.dumps(result, indent=2))
    print('EXPANSION_LANDMARK_COMPLETE', json.dumps(result), flush=True)
    return result

# ==============================================================================
# SPECIFICATIONS & EXPORT CATALOG
# ==============================================================================
EXPANSION_SPECS = {
    'jami-ul-alfar': dict(
        name='Jami Ul-Alfar Mosque (Red Mosque)',
        builder=jami_ul_alfar,
        position=[-715, 0, -1265],
        rotation=0,
        mask=[-740, 1290, -690, 1240],
        view=[80, -110, 65],
        target=[0, 0, 18],
        description='1908 Indo-Saracenic candy-striped red and white brick jewel in Pettah with horseshoe arch entrance, twin soaring minarets, clock tower, and pomegranate onion domes.',
        reference='Second Cross Street, Pettah, Colombo 11'
    ),
    'old-parliament': dict(
        name='Old Parliament Building',
        builder=old_parliament,
        position=[-1580, 0, -180],
        rotation=0,
        mask=[-1660, 240, -1490, 110],
        view=[140, -160, 95],
        target=[0, 0, 14],
        description='1930 Neo-Baroque buff sandstone palace facing Galle Face Green with grand monumental staircase, hexastyle Ionic portico, and central dome.',
        reference='Galle Face North, Fort, Colombo 01'
    ),
    'independence-hall': dict(
        name='Independence Memorial Hall',
        builder=independence_hall,
        position=[240, 0, 2580],
        rotation=0,
        mask=[190, -2470, 290, -2640],
        view=[95, -125, 75],
        target=[0, 0, 10],
        description='Kandyan Royal Audience Hall national monument featuring 60 carved stone pillars with Pekada floral bracket capitals, four-tiered plinth, guardian lions, and double Kandyan terracotta roof.',
        reference='Independence Square, Cinnamon Gardens, Colombo 07'
    ),
    'town-hall': dict(
        name='Colombo Town Hall',
        builder=town_hall,
        position=[120, 0, 1220],
        rotation=0,
        mask=[50, -1170, 190, -1280],
        view=[120, -150, 90],
        target=[0, 0, 16],
        description='Neoclassical civic palace overlooking Viharamahadevi Park with colossal Corinthian hexastyle portico, pediment, rusticated arcades, and high ribbed dome.',
        reference='F. R. Senanayake Mawatha, Cinnamon Gardens, Colombo 07'
    ),
    'galle-face-hotel': dict(
        name='The Galle Face Hotel',
        builder=galle_face_hotel,
        position=[-1354, 0, 753],
        rotation=0,
        mask=[-1420, -700, -1290, -810],
        view=[130, -145, 80],
        target=[0, 0, 11],
        description='1864 Victorian colonial seaside grand hotel on Galle Face with North and South ocean wings, multi-tier verandah loggias, terracotta hipped roofs with gables and dormers, and seafront pool.',
        reference='2 Galle Road, Kollupitiya, Colombo 03'
    ),
    'clock-tower': dict(
        name='Fort Light & Clock Tower',
        builder=clock_tower,
        position=[-1480, 0, -880],
        rotation=0,
        mask=[-1500, 895, -1460, 865],
        view=[65, -85, 60],
        target=[0, 0, 17],
        description='1857 Victorian ashlar lighthouse and clock tower at Chatham Street crossroads with four-way arched rusticated base, quoined shaft, Roman clock faces, and brass lantern dome.',
        reference='Chatham Street & Janadhipathi Mawatha, Fort, Colombo 01'
    ),
    'one_galle_face': dict(
        name='One Galle Face & Shangri-La Colombo',
        builder=one_galle_face,
        position=[-1450, 0, 20],
        rotation=0,
        mask=[-1560, 60, -1340, -40],
        view=[160, -190, 130],
        target=[0, 0, 75],
        description='Twin 50-storey glass towers (194m) and Shangri-La Hotel commanding the Galle Face oceanfront with curved retail mall podium, infinity pools, and high-performance reflective curtain walls.',
        reference='1A Centre Road, Galle Face, Colombo 02'
    ),
    'cinnamon_life': dict(
        name='Cinnamon Life · City of Dreams',
        builder=cinnamon_life,
        position=[-1115, 0, 220],
        rotation=0,
        mask=[-1220, -140, -1010, -290],
        view=[150, -180, 110],
        target=[0, 0, 60],
        description='Cecil Balmond’s deconstructivist integrated resort with iconic 28m cantilevered hotel over Beira Lake, diamond diagrid exoskeleton, twin residential towers, and connecting sky bridge.',
        reference='Justice Akbar Mawatha, Slave Island, Colombo 02'
    ),
    'port_city': dict(
        name='Colombo Port City & Marina',
        builder=port_city,
        position=[-1950, 0, -350],
        rotation=0,
        mask=[-2060, 430, -1840, 260],
        view=[140, -170, 75],
        target=[0, 0, 15],
        description='Reclaimed maritime peninsula with Port City Marina yacht club, iconic sweeping tensile fabric sail canopy, deep-water pontoon berths with luxury yachts, ocean seawall promenade, and lighthouse beacon.',
        reference='Port City Boulevard, Port City, Colombo 01'
    ),
    'sambodhi-chaithya': dict(
        name='Sambodhi Chaithya · Maritime Stupa',
        builder=sambodhi_chaithya,
        position=[-1720, 0, -1180],
        rotation=0,
        mask=[-1760, 1210, -1680, 1150],
        view=[55, -75, 45],
        target=[0, 0, 24],
        description='Iconic 47m high Buddhist maritime stupa perched on a 4-legged parabolic concrete archway spanning Marine Drive with vehicular traffic passing underneath at Colombo Harbour entrance.',
        reference='Marine Drive / Chaitya Road, Colombo Port Entrance, Colombo 01'
    ),
    'nelum-pokuna': dict(
        name='Nelum Pokuna Mahinda Rajapaksa Theatre',
        builder=nelum_pokuna,
        position=[554, 0, 1803],
        rotation=0,
        mask=[494, -1753, 614, -1853],
        view=[75, -95, 45],
        target=[0, 0, 14],
        description='Auditorium designed in the shape of an 8-petaled stylized lotus pond inspired by the 12th-century Nelum Pokuna in Polonnaruwa, with concentric stepped tiers, white curved petal shells, and reflection pools.',
        reference='Nelum Pokuna Mawatha, Cinnamon Gardens, Colombo 07'
    ),
    'harbour-cranes': dict(
        name='Colombo Harbour & Container Terminals',
        builder=harbour_cranes,
        position=[-1450, 0, -1850],
        rotation=0,
        mask=[-1600, 1950, -1300, 1750],
        view=[110, -140, 75],
        target=[0, 0, 28],
        description='Colombo Port deepwater container quay with towering 75m Ship-to-Shore (STS) gantry cranes, rail tracks, colorful intermodal container stacks, and moored container cargo vessel.',
        reference='Colombo Harbour & Jaya Container Terminal, Colombo 01'
    )
}

if __name__ == '__main__':
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['all']
    ids = list(EXPANSION_SPECS) if not args or args[0] == 'all' else [args[0]]
    render = '--no-render' not in args
    results = []
    for landmark_id in ids:
        if landmark_id not in EXPANSION_SPECS:
            print(f'Unknown landmark {landmark_id}', file=sys.stderr)
            continue
        print(f'=== BUILDING {landmark_id.upper()} ===', flush=True)
        BL.reset()
        setup_materials()
        spec = EXPANSION_SPECS[landmark_id]
        spec['builder']()
        res = finish_expansion(landmark_id, spec, render=render)
        results.append(res)
        print(f'=== {landmark_id.upper()} COMPLETE ===', flush=True)

    # Update expansion_catalog.json
    exp_cat_path = OUT / 'expansion_catalog.json'
    existing = []
    if exp_cat_path.exists():
        try:
            existing = json.loads(exp_cat_path.read_text())
        except Exception:
            existing = []
    existing_dict = {item['id']: item for item in existing}
    for res in results:
        existing_dict[res['id']] = res
    updated_catalog = list(existing_dict.values())
    exp_cat_path.write_text(json.dumps(updated_catalog, indent=2))
    print(f'Updated expansion catalog with {len(updated_catalog)} entries.')
