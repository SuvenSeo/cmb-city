"""Build editable Colombo landmark reconstructions and web exports in Blender.

Run: blender --background --threads 4 --python scripts/build_landmarks.py -- [id|all]
Geometry is authored in metres, Z up. Public reference photographs are not bundled.
"""
import bpy, math, json, sys, random, zipfile, shutil
from pathlib import Path
from mathutils import Vector
from collections import defaultdict

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0,str(Path(__file__).parent))
sys.dont_write_bytecode=True
OUT = ROOT / 'public/landmarks'
PI = math.pi
RNG = random.Random(17)
MATS = {}
PARTS = {}
GROUP = 'Architecture'
DETAIL = False

def portable_source_paths():
    """Keep packed textures portable and remove workstation browser folders."""
    for scene in bpy.data.scenes:
        if Path(scene.render.filepath).is_absolute() and not scene.render.filepath.startswith('//'):
            scene.render.filepath = '//renders/' + Path(scene.render.filepath).name
    for image in bpy.data.images:
        if image.source == 'FILE' and (image.packed_file or image.packed_files):
            image.filepath = '//textures/' + Path(image.filepath).name
            for packed in image.packed_files:
                if not packed.is_property_readonly('filepath'):
                    packed.filepath = image.filepath
    for screen in bpy.data.screens:
        for area in screen.areas:
            for space in area.spaces:
                if space.type == 'FILE_BROWSER' and space.params:
                    space.params.directory = b'//'

def material(name, color, rough=.7, metal=0, transmission=0, ior=1.45, emission=None, emission_strength=0):
    m=bpy.data.materials.new('Landmark / '+name); m.diffuse_color=(*color,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=rough; p.inputs['Metallic'].default_value=metal
    def set_input(*keys, value):
        for key in keys:
            sock=p.inputs.get(key)
            if sock is not None:
                sock.default_value=value
                return
    if transmission:
        # True dielectric glass: exports KHR_materials_transmission to glTF,
        # rendering as refractive glazing instead of brushed aluminium.
        set_input('Transmission Weight','Transmission',value=transmission)
        set_input('IOR',value=ior)
    if emission is not None:
        set_input('Emission Color',value=(*emission,1))
        set_input('Emission Strength','Emission',value=emission_strength)
    MATS[name]=m

def scale_z(factor):
    """Uniformly rescale every authored part in Z (used for surveyed-height corrections)."""
    for verts,_ in PARTS.values():
        for i,(x,y,z) in enumerate(verts):
            verts[i]=(x,y,z*factor)

def photoreal_finish(objs):
    """Edge softening, clean normals and UVs so exports shade like real materials.

    Angle-limited bevel rounds only hard 90-degree construction edges, the
    weighted-normal modifier keeps flat faces crisp, and a Smart UV Project
    gives every part texture-ready coordinates. Each step is guarded so an API
    change in a future Blender release can never break the export.
    """
    sc=bpy.context.scene
    try:
        for o in objs:
            if o.type!='MESH':continue
            bev=o.modifiers.new('Photoreal edge softening','BEVEL')
            bev.limit_method='ANGLE';bev.angle_limit=math.radians(30)
            bev.width=.05;bev.segments=2;bev.harden_normals=True
            wn=o.modifiers.new('Weighted normal','WEIGHTED_NORMAL')
            wn.keep_sharp=True
    except Exception as e:print('Notice: bevel/weighted-normal skipped:',e)
    try:
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs:
            if o.type!='MESH':continue
            sc.view_layers[0].objects.active=o;o.select_set(True)
            bpy.ops.object.mode_set(mode='EDIT')
            bpy.ops.uv.smart_project(angle_limit=66,island_margin=.02)
            bpy.ops.object.mode_set(mode='OBJECT')
            o.select_set(False)
    except Exception as e:
        print('Notice: smart UV skipped:',e)
        try:bpy.ops.object.mode_set(mode='OBJECT')
        except Exception:pass

def reset():
    global PARTS, GROUP, DETAIL, MATS
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.save_version=0
    PARTS={}; MATS={}; GROUP='Architecture'; DETAIL=False; RNG.seed(17)
    for name,c,r,m in [
        ('Limestone',(.70,.69,.62),.78,0),('Ivory',(.87,.85,.77),.68,0),
        ('White plaster',(.91,.90,.85),.78,0),('Concrete',(.57,.58,.55),.84,0),
        ('Glass',(.12,.24,.27),.06,0),('Glass light',(.24,.36,.39),.08,0),
        ('Glass shade',(.065,.13,.16),.07,0),('Metal',(.23,.27,.27),.4,.7),
        ('Gold',(.69,.40,.09),.3,.65),('Bronze',(.22,.13,.054),.47,.6),
        ('Terracotta',(.34,.15,.09),.88,0),('Roof tile',(.23,.28,.29),.74,.04),
        ('Timber',(.11,.067,.035),.85,0),('Shadow',(.025,.043,.043),.9,0),
        ('Leaves',(.10,.22,.09),.92,0),('Leaves light',(.19,.30,.105),.94,0),
        ('Paving',(.48,.47,.42),.96,0),('Gravel',(.23,.22,.20),1,0),
        ('Pool',(.065,.31,.34),.17,.3),('Red',(.54,.08,.035),.72,0)]: material(name,c,r,m)
    # Dielectric glazing: refractive transmission instead of a metallic tint.
    for g in ['Glass','Glass light','Glass shade']:
        node=MATS[g].node_tree.nodes.get('Principled BSDF')
        if node is None:continue
        for key in ['Transmission Weight','Transmission']:
            sock=node.inputs.get(key)
            if sock is not None:sock.default_value=1.0;break
        ior=node.inputs.get('IOR')
        if ior is not None:ior.default_value=1.45

def group(name, detail=False):
    global GROUP, DETAIL
    GROUP=name; DETAIL=detail

def mesh(name, verts, faces, mat, smooth=False):
    key=(GROUP,DETAIL,mat,smooth)
    if key not in PARTS: PARTS[key]=[[],[]]
    v,f=PARTS[key]; n=len(v); v.extend(verts); f.extend(tuple(n+i for i in face) for face in faces)

def box(c,s,mat='Ivory',rot=0):
    x,y,z=c; a,b,d=(q/2 for q in s); co,si=math.cos(rot),math.sin(rot)
    v=[(x+co*i-si*j,y+si*i+co*j,z+k) for i,j,k in [(-a,-b,-d),(a,-b,-d),(a,b,-d),(-a,b,-d),(-a,-b,d),(a,-b,d),(a,b,d),(-a,b,d)]]
    mesh('Block',v,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],mat)

def beam(a,b,width,mat='Ivory',depth=None):
    a,b=Vector(a),Vector(b); w=(b-a).normalized(); u=w.cross(Vector((0,0,1)))
    if u.length<.01:u=w.cross(Vector((0,1,0)))
    u.normalize(); u*=width/2; v=w.cross(u).normalized()*(depth or width)/2
    pts=[tuple(p+i*u+j*v) for p in [a,b] for i,j in [(-1,-1),(1,-1),(1,1),(-1,1)]]
    mesh('Beam',pts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],mat)

def lathe(c,profile,mat='Ivory',n=24):
    x,y,z=c; v=[(x+r*math.cos(2*PI*i/n),y+r*math.sin(2*PI*i/n),z+h) for r,h in profile for i in range(n)]
    f=[(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(len(profile)-1) for i in range(n)]
    f.extend([tuple(reversed(range(n))),tuple((len(profile)-1)*n+i for i in range(n))]); mesh('Turned form',v,f,mat,True)

def cyl(c,r,h,mat='Ivory',n=20): lathe(c,[(r,-h/2),(r,h/2)],mat,n)

def sphere(c,s,mat='Leaves',n=10,rings=6):
    profile=[(math.sin(PI*i/rings),-math.cos(PI*i/rings)) for i in range(rings+1)]
    x,y,z=c; v=[(x+s[0]*r*math.cos(2*PI*j/n),y+s[1]*r*math.sin(2*PI*j/n),z+s[2]*h) for r,h in profile for j in range(n)]
    f=[(i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j) for i in range(rings) for j in range(n)]; mesh('Organic form',v,f,mat,True)

def arch(x,y,z,w,h,mat='Ivory',depth=.45,trim=.22,fill=None):
    # True open semicircular arch, spring height measured from the sill.
    r=w/2; spring=z+h-r
    for side in [-1,1]:box((x+side*(r+trim/2),y,z+(h-r)/2),(trim,depth,h-r),mat)
    n=18
    for i in range(n):
        a,b=PI*i/n,PI*(i+1)/n
        v=[(x+rr*math.cos(t),yy,spring+rr*math.sin(t)) for yy in [y-depth/2,y+depth/2] for rr,t in [(r,a),(r,b),(r+trim,b),(r+trim,a)]]
        mesh('Arch stone',v,[(0,1,2,3),(7,6,5,4),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],mat)
    if fill:
        pts=[(x-r,y+.02,z),(x+r,y+.02,z)]+[(x+r*math.cos(PI*i/n),y+.02,spring+r*math.sin(PI*i/n)) for i in range(n+1)]
        mesh('Recess',pts,[tuple(range(len(pts)))],fill)

def window(x,y,z,w,h,front=-1):
    box((x,y,z+h/2),(w,.12,h),'Glass shade')
    for dx in [-w/2,w/2]:box((x+dx,y+front*.14,z+h/2),(.12,.18,h+.2),'Ivory')
    for dz in [0,h,h/2]:box((x,y+front*.14,z+dz),(w+.2,.18,.13),'Ivory')
    box((x,y+front*.15,z+h/2),(.10,.18,h),'Ivory')
    if DETAIL:
        for dz in [h/4,h*3/4]:box((x,y+front*.16,z+dz),(w,.19,.065),'Ivory')

def hip(x,y,z,w,d,rise,mat='Terracotta'):
    k=min(w,d)*.35
    if w>=d: top=[(x-w/2+k,y,z+rise),(x+w/2-k,y,z+rise)]
    else: top=[(x,y-d/2+k,z+rise),(x,y+d/2-k,z+rise)]
    v=[(x-w/2,y-d/2,z),(x+w/2,y-d/2,z),(x+w/2,y+d/2,z),(x-w/2,y+d/2,z)]+top
    faces=[(0,1,5,4),(1,2,5),(2,3,4,5),(3,0,4)] if w>=d else [(0,1,4),(1,2,5,4),(2,3,5),(3,0,4,5)]
    mesh('Hipped roof',v,faces,mat)
    beam(top[0],top[1],.24,mat)
    for a,b in [(0,1),(1,2),(2,3),(3,0)]:beam(v[a],v[b],.24,'Ivory' if mat=='Terracotta' else 'Timber')
    for i in range(4):beam(v[i],top[(1 if i in [1,2] else 0) if w>=d else (1 if i in [2,3] else 0)],.18,mat)

def gable(x,y,z,w,d,rise,mat='Roof tile',ornate=False):
    v=[(x-w/2,y-d/2,z),(x+w/2,y-d/2,z),(x-w/2,y+d/2,z),(x+w/2,y+d/2,z),(x,y-d/2,z+rise),(x,y+d/2,z+rise)]
    mesh('Gable roof',v,[(0,4,5,2),(4,1,3,5)],mat)
    for yy in [y-d/2,y+d/2]:
        for side in [-1,1]:beam((x+side*w/2,yy,z),(x,yy,z+rise),.26,'Gold' if ornate else 'Ivory')
    beam((x,y-d/2,z+rise),(x,y+d/2,z+rise),.26,'Gold' if ornate else mat)
    if ornate:
        for yy in [y-d/2,y+d/2]:
            for side in [-1,1]:
                a=(x+side*w/2,yy,z); b=(x+side*(w/2+.45),yy,z+1.8)
                beam(a,b,.22,'Gold'); sphere(b,(.22,.22,.42),'Gold')
            for i in range(1,19):
                xx=x-w/2+w*i/20;zz=z+rise*(1-abs(xx-x)/(w/2))
                lathe((xx,yy,zz),[(.09,0),(.15,.18),(.04,.44),(0,.62)],'Gold',8)
    # Raised tile runs, omitted from the map export.
    old=DETAIL; group(GROUP,True)
    for side in [-1,1]:
        for j in range(int(d/.5)+1):
            yy=y-d/2+j*.5
            beam((x+side*w/2,yy,z+.08),(x,yy,z+rise+.08),.085,mat)
    group(GROUP,old)

def column(x,y,z,h,r=.32):
    lathe((x,y,z),[(r*1.6,0),(r*1.6,.18),(r*1.25,.28),(r,.4),(r*.83,h-.4),(r*1.3,h-.23),(r*1.6,h-.16),(r*1.6,h)],'Ivory',16)

def balustrade(x,y,z,w,mat='Ivory'):
    box((x,y,z+.85),(w,.34,.18),mat);box((x,y,z+.08),(w,.4,.16),mat)
    for i in range(int(w/.65)):
        xx=x-w/2+.35+i*.65
        lathe((xx,y,z),[(.10,.16),(.085,.3),(.13,.42),(.075,.6),(.07,.77)],mat,8)

def bush(x,y,z,r=1):
    sphere((x,y,z+r*.55),(r,r*.8,r*.65),'Leaves',8,4)

def tree(x,y,z,scale=1):
    cyl((x,y,z+2.5*scale),.3*scale,5*scale,'Timber',10)
    for i in range(7):
        a=i*2.4; xx=x+math.cos(a)*2*scale;yy=y+math.sin(a)*2*scale
        beam((x,y,z+3*scale),(xx,yy,z+(5+i%3)*scale),.2*scale,'Timber')
        sphere((xx,yy,z+(5+i%3)*scale),(2.4*scale,2.1*scale,2*scale),'Leaves' if i%2 else 'Leaves light',10,6)

def text_label(body,location,size,mat='Metal',rotation=(PI/2,0,0)):
    c=bpy.data.curves.new(body,'FONT'); c.body=body;c.align_x='CENTER';c.size=size;c.extrude=.015;c.resolution_u=4
    o=bpy.data.objects.new(body,c);bpy.context.collection.objects.link(o);o.location=location;o.rotation_euler=rotation;c.materials.append(MATS[mat])
    o['detail']=False
    bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)

def altair():
    group('01 Podium and retail promenade')
    box((0,0,1),(123,80,2),'Paving');box((0,0,6),(116,70,8),'Ivory');box((0,0,7),(114,70.2,5),'Glass')
    for xx in range(-54,55,9):
        for yy in [-35.4,35.4]:column(xx,yy,2,7.5,.55)
    box((0,0,10.5),(120,76,1),'Ivory')
    # Vertical slab to the west; the eastern leg steps back in plan toward it.
    for floor in range(69):
        z=11+floor*3.28
        group(f'02 Vertical tower / floors {floor//10*10+1:02d}–{min(69,floor//10*10+10):02d}')
        box((-36,-4,z),(28,51,.30),'Ivory')
        box((-36,-4,z+1.67),(26,48,3.02),'Glass')
        for xx in [-50.4,-21.6]:
            for yy in [-25,-17,-9,-1,7,15]:box((xx,yy,z+1.7),(.70,1,3.3),'Ivory')
        for yy in [-29.7,21.7]:
            for xx in [-47,-41,-35,-29,-23]:box((xx,yy,z+1.7),(.7,.9,3.3),'Ivory')
        if floor>1:
            group('03 Vertical balconies and window frames',True)
            for yy in [-30,22]:
                box((-36,yy,z+1.2),(27,.16,.15),'Metal')
                for xx in range(-48,-22,3):box((xx,yy,z+1.8),(.1,.15,2.9),'Metal')
    # Surveyed lean is 13.8 degrees over levels 5-39, then vertical: 28.2 m of
    # lateral shift, frozen above floor 39.
    def lean(f):
        k=min(max(f-4,0),35)
        return 40-k*.805, 10-k*.39
    for floor in range(61):
        z=11+floor*3.28;xx,yy=lean(floor)
        group(f'04 Leaning tower / floors {floor//10*10+1:02d}–{min(61,floor//10*10+10):02d}')
        box((xx,yy,z),(29,32,.32),'Ivory');box((xx,yy,z+1.7),(26,28.8,3.02),'Glass')
        # Balcony edges remain physically separated from recessed glazing.
        for edge in [-1,1]:box((xx,yy+edge*16,z+.95),(29,.24,.48),'Ivory')
        if 5<floor<60:
            group('05 Garden terraces')
            box((xx+12,yy+12,z+.55),(2.1,6,.7),'Limestone')
            bush(xx+12,yy+12,z+.9,.6+(floor%5)*.2)
            box((xx-12,yy+12,z+.55),(2.1,6,.7),'Limestone')
            bush(xx-12,yy+12,z+.9,.7+((floor+2)%5)*.18)
        group('06 Balcony rails',True)
        for edge in [-1,1]:
            beam((xx-14,yy+edge*16,z+1.4),(xx+14,yy+edge*16,z+1.4),.12,'Metal')
            for k in range(-12,14,4):box((xx+k,yy+edge*16,z+.85),(.10,.12,1.15),'Metal')
    group('07 Diagonal structural exoskeleton')
    for f in range(0,58,3):
        x1,y1=lean(f);x2,y2=lean(f+3)
        for side in [-1,1]:
            for col in range(4):
                a=-14+col*7;b=a+7
                if (f//3)%2:a,b=b,a
                beam((x1+a,y1+side*16.4,11+f*3.28),(x2+b,y2+side*16.4,11+(f+3)*3.28),.58,'Ivory')
                beam((x1+b,y1+side*16.4,11+f*3.28),(x2+a,y2+side*16.4,11+(f+3)*3.28),.58,'Ivory')
            for col in range(4):
                a=-15+col*7.5;b=a+7.5
                if (f//3)%2:a,b=b,a
                beam((x1+side*14.6,y1+a,11+f*3.28),(x2+side*14.6,y2+b,11+(f+3)*3.28),.58,'Ivory')
                beam((x1+side*14.6,y1+b,11+f*3.28),(x2+side*14.6,y2+a,11+(f+3)*3.28),.58,'Ivory')
    group('08 Sky garden and crown')
    xx,yy=lean(60);box((xx,yy,212),(30,33,.65),'Ivory');box((xx,yy,212.6),(27,28,.55),'Paving')
    box((xx,yy+5,213),(20,5,.25),'Pool')
    for x in [-12,-5,2,9]:bush(xx+x,yy-12,213,1.3)
    # Steel outrigger links between the towers at levels 39/41.
    for oz in [11+39*3.28,11+41*3.28]:
        ox1,oy1=lean(39);beam((-36,oy1,oz),(ox1,oy1,oz),1.2,'Metal')
    box((-36,-4,238),(28,51,.6),'Ivory');box((-36,-4,239),(12,19,2),'Concrete')
    group('09 Roof plant',True)
    for x in [-42,-32]:
        for y in [-18,-6,6]:box((x,y,240),(3,5,1.8),'Metal')

def wtc():
    group('01 Retail podium')
    box((0,-9,1),(106,83,2),'Paving')
    for f in range(4):
        z=2+f*3.6;box((0,-8,z+1.8),(95,66,3.2),'Limestone');box((0,-8,z+2),(95.2,66.2,2),'Glass')
        box((0,-8,z+3.45),(97,68,.38),'Ivory')
        for x in range(-44,45,8):box((x,-41.2,z+1.8),(.65,.35,3.6),'Limestone')
    group('02 Twin curved towers')
    # D-shaped plan: rounded glazed north face and flat service spine to south.
    poly=[(18*math.cos(PI*i/40),18*math.sin(PI*i/40)) for i in range(41)]+[(-18,-17),(18,-17)]
    for tx in [-28,28]:
        for f in range(39):
            z=16.4+f*3.46
            group(f'03 {"West" if tx<0 else "East"} tower / curtain wall')
            for i,p in enumerate(poly):
                q=poly[(i+1)%len(poly)]
                a=(tx+p[0],p[1],z+.45);b=(tx+q[0],q[1],z+.45);c=(*b[:2],z+3.46);d=(*a[:2],z+3.46)
                mesh('Curved curtain panel',[a,b,c,d],[(0,1,2,3)],'Glass')
                beam((tx+p[0],p[1],z+.2),(tx+q[0],q[1],z+.2),.30,'Limestone',.3)
                if i<40:
                    group('04 Glazing divisions',True)
                    beam(a,d,.075,'Metal')
                    group(f'03 {"West" if tx<0 else "East"} tower / curtain wall')
            # Square rear walls, punched windows and vertical piers.
            box((tx,-17.08,z+1.7),(36,.35,3.4),'Limestone')
            for k in range(8):box((tx-15.2+k*4.3,-17.31,z+1.7),(2.5,.16,2.05),'Glass')
            for side in [-1,1]:
                box((tx+side*18,-8.5,z+1.7),(.55,17,3.46),'Limestone')
                for yy in [-14.5,-10.5,-6.5,-2.5]:box((tx+side*18.36,yy,z+1.7),(.14,2.6,2.05),'Glass')
        group('05 Roof parapets and service core')
        mesh('D-shaped roof deck',[(tx+x,y,151.0) for x,y in poly],[tuple(range(len(poly)))],'Limestone')
        box((tx,-2,151.5),(15,18,1.2),'Concrete')
        group('06 Roof mechanical equipment',True)
        for x in [-5,5]:
            for y in [-7,2]:box((tx+x,y,152),(3.5,5,1.2),'Metal')
    group('07 Entry atrium')
    for x in [-12,-6,0,6,12]:beam((x,20,2),(x,15,9),.20,'Metal')
    mesh('Glass entry canopy',[(-14,20,2),(14,20,2),(14,15,9),(-14,15,9)],[(0,1,2,3)],'Glass light')
    for x in [-43,43]:
        for y in [-24,20,28]:tree(x,y,2,.65)

def pediment(x,y,z,w,h):
    mesh('Pediment',[(x-w/2,y,z),(x+w/2,y,z),(x,y,z+h),(x-w/2,y-.6,z),(x+w/2,y-.6,z),(x,y-.6,z+h)],[(0,1,2),(5,4,3),(0,3,4,1),(1,4,5,2),(2,5,3,0)],'White plaster')
    for a,b in [((x-w/2,y+.15,z),(x,y+.15,z+h)),((x,y+.15,z+h),(x+w/2,y+.15,z))]:beam(a,b,.3,'Ivory')
    box((x,y,z),(w+.6,1,.35),'Ivory')

def buddha(x,y,z,s=1,standing=False):
    # Simplified sculpture; facial and iconographic detail is not claimed exact.
    lathe((x,y,z),[(.6*s,0),(.65*s,.15*s),(.45*s,.3*s)],'Gold',16)
    if standing:
        lathe((x,y,z),[(.35*s,.3*s),(.29*s,1.4*s),(.43*s,2.1*s),(.22*s,2.3*s)],'Gold',16)
        sphere((x,y,z+2.6*s),(.24*s,.22*s,.3*s),'Gold',16,8)
        for side in [-1,1]:beam((x+side*.37*s,y,z+2*s),(x+side*.35*s,y-.12*s,z+1.25*s),.17*s,'Gold')
    else:
        sphere((x,y,z+.48*s),(.72*s,.45*s,.27*s),'Gold',16,8)
        sphere((x,y,z+1*s),(.38*s,.29*s,.57*s),'Gold',16,8)
        sphere((x,y,z+1.66*s),(.23*s,.23*s,.29*s),'Gold',16,8)
        for side in [-1,1]:beam((x+side*.32*s,y,z+1.15*s),(x+side*.52*s,y-.25*s,z+.55*s),.13*s,'Gold')
    sphere((x,y,z+(2.91 if standing else 1.98)*s),(.11*s,.11*s,.15*s),'Gold',12,6)

def gangaramaya():
    group('01 Main temple compound')
    box((0,0,.3),(74,86,.6),'Paving')
    # Main land-based temple; the separate Seema Malaka lake pavilion is not part of this model.
    for x,y,w,d,h in [(-25,0,17,78,8.7),(0,31,34,17,7.8),(26,28,16,24,7),(22,-29,26,16,6.5)]:
        box((x,y,h/2+.6),(w,d,h),'Ivory');gable(x,y,h+.6,w+3,d+3,4,'Roof tile',True)
        for xx in range(int(x-w/2+2),int(x+w/2),4):
            for z in [1.2,4.8]:window(xx,y-d/2-.1,z,1.8,2.1)
    group('02 White entrance gateway')
    # Entry faces east in the map after the model rotation.
    box((0,-35,9),(13,7,7),'White plaster')
    for x in [-5.7,5.7]:box((x,-36,3),(2,7,5.4),'White plaster')
    arch(0,-39, .7,6.8,5.2,'Ivory',1.1,.58)
    for x in [-2,2]:
        arch(x,-38.6,7.2,2.7,3.7,'Ivory',.45,.27,'Shadow');window(x,-38.85,7.3,2.4,2.5)
    for x in [-5.5,5.5]:
        box((x,-39,9),(.75,.45,6),'Ivory')
        for z in [6,6.8,7.6,8.4,9.2,10,10.8,11.6]:box((x,-39.2,z),(1,.55,.2),'Ivory')
    for z,w in [(6,14),(6.4,14.4),(12.1,14)]:box((0,-38,z),(w,1.5,.35),'Ivory')

    group('02 Gateway carved surround',True)
    # Paired sash grilles and floral roundels, modelled rather than decal textures.
    for xx in [-2,2]:
        for dx in [-.9,-.6,-.3,0,.3,.6,.9]:box((xx+dx,-39.03,8.8),(.055,.08,2.6),'Ivory')
        for zz in [8,8.4,8.8,9.2,9.6]:box((xx,-39.04,zz),(2.35,.08,.055),'Ivory')
        for a in range(7):
            angle=PI*a/6
            beam((xx,-39.03,9.55),(xx+1.05*math.cos(angle),-39.03,9.55+1.05*math.sin(angle)),.055,'Ivory')
    for xx in [-5.5,5.5]:
        for zz in [7,9,11]:
            for a in range(8):sphere((xx+.22*math.cos(a*PI/4),-39.58,zz+.22*math.sin(a*PI/4)),(.095,.07,.095),'Ivory',8,4)
    outline=[(-5,-39.1,12.1),(5,-39.1,12.1)]+[(5*math.cos(PI*i/24),-39.1,12.4+2.3*math.sin(PI*i/24)) for i in range(25)]
    mesh('Curved gable relief',outline,[tuple(range(len(outline)))],'White plaster')
    for a,b in zip(outline[2:],outline[3:]):beam(a,b,.2,'Ivory')
    sphere((0,-39.3,13.0),(.6,.10,.5),'Ivory',20,10)
    group('02 White entrance gateway')
    gable(0,-35,12.5,17,12,4,'Roof tile',True)
    group('03 Guardian figures and ceremonial urns')
    for x in [-4.3,4.3]:buddha(x,-40.5,.6,1.25,True)
    for x in [-8,8]:lathe((x,-41,.6),[(.6,0),(.5,.3),(.95,1.2),(.7,1.8),(.75,1.95)],'Bronze',24)
    group('04 Dagoba and courtyard shrines')
    lathe((11,6,.6),[(6,0),(6,.4),(5.6,.5),(5.6,.9),(5,1),(4.6,1.4),(4.4,2.4),(3.9,4),(3.1,5.3),(1.8,6.4),(.9,6.8)],'White plaster',48)
    box((11,6,8.2),(1.8,1.8,1.6),'Ivory')
    lathe((11,6,9),[(1,0),(.85,.3),(.7,.7),(.55,1.2),(.4,1.8),(.2,2.5),(0,4.2)],'Gold',32)
    for x in [1,21]:
        for y in [-2,14]:cyl((x,y,2.3),.22,3.4,'Gold');sphere((x,y,4.2),(.35,.35,.45),'Gold')
    group('05 Bodhi tree enclosure')
    box((-3,-13,1),(17,17,1.2),'Ivory');tree(-3,-13,1.6,1.8)
    for yy in [-21,-5]:balustrade(-3,yy,1.6,16,'Gold')
    group('06 Terraced Buddha court')
    for row in range(3):
        box((27,-4+row*3,1+row*.75),(15,3,.6),'Limestone')
        for col in range(5):buddha(21+col*3,-4+row*3,1.3+row*.75,.9)
    group('07 Temple roof ornament',True)
    for x in range(-30,33,3):lathe((x,39,8.5),[(.13,0),(.23,.3),(.1,.65),(0,.95)],'Gold',10)

def fort():
    from heritage_landmarks import station
    station(sys.modules[__name__])


def museum():
    from heritage_landmarks import museum as build_museum
    build_museum(sys.modules[__name__])

SPECS={
 'altair': dict(name='Altair', builder=altair, position=[-414,0,896], rotation=0, mask=[-478,-849,-349,-939], view=[340,-440,275],target=[0,0,110], description='69-level vertical tower, stepped leaning leg, diagonal concrete frame, garden terraces, retail podium and sky garden.', reference='https://www.safdiearchitects.com/projects/altair-residences'),
 'wtc':dict(name='World Trade Center',builder=wtc,position=[-1599,8,-633],rotation=0,mask=[-1653,674,-1546,588],view=[200,320,175],target=[0,0,72],description='Twin curved office towers with 39 tower levels, a four-level podium, articulated glass panels, stone bands and an entrance canopy.',reference='https://wtc.lk/about/'),
 'gangaramaya':dict(name='Gangaramaya Temple',builder=gangaramaya,position=[-190,0,1169],rotation=-PI/2,mask=[-230,-1124,-139,-1215],view=[125,-180,110],target=[0,0,4],description='Main land-based temple compound with an ornate white gateway, gilded roof trim, dagoba, Bodhi enclosure and a terraced sculpture court.',reference='https://gangaramaya.com/about-us/'),
 'fort':dict(name='Colombo Fort Station',builder=fort,position=[-951,-1,-723],rotation=PI-.085,mask=[-1087,792,-813,641],view=[205,-240,155],target=[0,5,0],description='Curved clock pediment, shaped Sinhala lettering, scalloped canopy, Olcott memorial, ticket hall, lattice roof trusses and three footbridges.',reference='https://railway.gov.lk/'),
 'museum':dict(name='Colombo National Museum',builder=museum,position=[291,6,1833],rotation=-.185,mask=[243,-1773,341,-1892],view=[135,220,110],target=[0,12,5],description='Italianate arcades, fanlight sash windows, rusticated portico, carved capitals, urn finials and a furnished interior with a bifurcated timber staircase.',reference='https://www.museum.gov.lk/'),
}

def finish(id,spec,render=True):
    dest=OUT/id;dest.mkdir(parents=True,exist_ok=True)
    for (name,detail,mat,smooth),(verts,faces) in PARTS.items():
        col=bpy.data.collections.get(name)
        if not col:col=bpy.data.collections.new(name);bpy.context.scene.collection.children.link(col)
        geo=bpy.data.meshes.new(name+' / '+mat);geo.from_pydata(verts,[],faces);geo.update()
        ob=bpy.data.objects.new(name+' / '+mat,geo);col.objects.link(ob);geo.materials.append(MATS[mat]);ob['detail']=detail
        for p in geo.polygons:p.use_smooth=smooth
    photoreal_finish([o for o in bpy.context.scene.objects if o.type=='MESH'])
    sc=bpy.context.scene;sc.unit_settings.system='METRIC';sc.unit_settings.scale_length=1
    sc['landmark']=spec['name'];sc['accuracy']='Photograph-informed architectural reconstruction. Approximate dimensions; see README and REFERENCES for scope and uncertain details.'
    sc['reference']=spec['reference'];sc['orientation']='Metres. Blender Z up. Map placement is in catalog.json. Microdetail may be hidden for web use.'
    # Map export excludes fine roof tile ribs and small rail/window details.
    objs=[o for o in sc.objects if o.type=='MESH']
    for o in sc.objects:o.select_set(False)
    for o in objs:o.select_set(not o.get('detail',False))
    bpy.ops.export_scene.gltf(filepath=str(dest/'map.glb'),export_format='GLB',use_selection=True,export_extras=True,export_yup=True,export_animations=False)
    for o in objs:o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(dest/(id+'.glb')),export_format='GLB',use_selection=True,export_extras=True,export_yup=True,export_animations=False)
    counts={}
    for label,collection in [('triangles',objs),('mapTriangles',[o for o in objs if not o.get('detail',False)])]:
        counts[label]=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in collection)
    bounds=[min((o.matrix_world@Vector(v))[i] for o in objs for v in o.bound_box) for i in range(3)], [max((o.matrix_world@Vector(v))[i] for o in objs for v in o.bound_box) for i in range(3)]
    # A lightweight studio for reusable source files and matching exterior/interior views.
    heritage=id in ['fort','museum']
    studio=bpy.data.collections.new('Studio / excluded from exports');sc.collection.children.link(studio)
    cam=bpy.data.objects.new('Preview camera',bpy.data.cameras.new('Preview camera'));studio.objects.link(cam);cam.location=spec['view'];cam.rotation_euler=(Vector(spec['target'])-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO'
    extent=max(bounds[1][i]-bounds[0][i] for i in range(3));cam.data.ortho_scale=extent*1.44;sc.camera=cam
    for name,loc,energy,size in [('Key',(-170,-200,330),1800000,200),('Fill',(180,120,220),1100000,180)]:
        light=bpy.data.lights.new(name,'AREA');light.energy=energy;light.shape='DISK';light.size=size
        ob=bpy.data.objects.new(name,light);studio.objects.link(ob);ob.location=loc;ob.rotation_euler=(Vector(spec['target'])-ob.location).to_track_quat('-Z','Y').to_euler()
    world=bpy.data.worlds.new('Soft daylight studio');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.38,.46,.50,1);world.node_tree.nodes['Background'].inputs[1].default_value=.55;sc.world=world
    sc.render.engine='CYCLES';sc.cycles.device='CPU';sc.cycles.samples=32 if heritage else 24;sc.cycles.use_denoising=True;sc.render.threads_mode='FIXED';sc.render.threads=4
    sc.render.resolution_x=1600 if heritage else 1200;sc.render.resolution_y=1000;sc.render.resolution_percentage=100;sc.render.film_transparent=True
    sc.view_settings.view_transform='AgX';sc.render.image_settings.file_format='PNG';sc.render.filepath='//preview.png'
    for o in sc.objects:o.select_set(False)
    # Set a useful initial solid viewport in the editable file.
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=='VIEW_3D':
                area.spaces.active.region_3d.view_distance=extent*1.6
                area.spaces.active.region_3d.view_location=spec['target']
    views=[('preview',spec['view'],spec['target'],extent*1.44,'ORTHO')]
    crops={'altair':([180,-240,150],[5,-4,142],120),'wtc':([160,240,130],[0,0,130],95),'fort':([-10,-130,11],[-18,-26,8],71),'museum':([12,150,16],[0,42,7.5],83),'gangaramaya':([25,-100,27],[0,-30,7],42)}
    loc,target,scale=crops[id];views.append(('detail',loc,target,scale,'ORTHO'))
    if heritage:
        if id=='fort':
            views.extend([('interior',[-47,-29,2.9],[-18,-20,3.0],23,'PERSP'),('cutaway',[140,-170,160],[0,12,0],300,'ORTHO')])
        else:
            views.extend([('interior',[0,32,3.3],[0,22,4.9],20,'PERSP'),('cutaway',[75,105,130],[0,0,3],135,'ORTHO')])
    cameras={}
    for name,loc,target,scale,kind in views:
        c=cam if name=='preview' else bpy.data.objects.new(name.title()+' camera',bpy.data.cameras.new(name.title()+' camera'))
        if name!='preview':studio.objects.link(c)
        c.location=loc;c.rotation_euler=(Vector(target)-c.location).to_track_quat('-Z','Y').to_euler();c.data.type=kind
        if kind=='ORTHO':c.data.ortho_scale=scale
        else:c.data.lens=scale;c.data.clip_start=.06
        cameras[name]=c
    interior_lights=[]
    if heritage:
        locations=[(-40,-27,5.9),(-14,-26,5.9),(20,-26,5.9)] if id=='fort' else [(0,26,10.9),(0,18,10.9),(10,24,9.5),(-10,24,9.5)]
        for i,loc in enumerate(locations):
            light=bpy.data.lights.new('Interior soft light '+str(i),'AREA');light.energy=900 if id=='fort' else 1800;light.size=5
            o=bpy.data.objects.new(light.name,light);studio.objects.link(o);o.location=loc
            light.color=(1,.89,.73);o.hide_render=True;interior_lights.append(o)
    sc.camera=cam
    portable_source_paths()
    bpy.ops.wm.save_as_mainfile(filepath=str(dest/(id+'.blend')),compress=True)
    if render:
        for name,_,_,_,_ in views:
            sc.camera=cameras[name]
            for o in interior_lights:o.hide_render=name!='interior'
            hidden=[]
            if name=='cutaway':
                for o in objs:
                    if o.name.startswith('Roof /'):o.hide_render=True;hidden.append(o)
            sc.render.filepath=str(dest/(name+'.png'));bpy.ops.render.render(write_still=True)
            for o in hidden:o.hide_render=False
    sc.camera=cam
    readme=f"""# {spec['name']} — Colombo landmark model

{spec['description']}

## Included files
- {id}.blend: editable Blender 5.1 source, organized architectural collections, PBR materials, preview camera and lighting.
- {id}.glb: standalone detailed model; metres, glTF Y up; no external textures needed.
- map.glb: lighter export without the smallest rail, tile and window details.
- preview.png: rendered preview, transparent background.

## Fidelity
Exterior visual reconstruction from public photographs, mapped footprint context and published building descriptions. Heights, plans, colours and ornament are approximate unless supported by the reference. No measured survey, interior reconstruction or photogrammetry is claimed. Decorative sculpture is simplified. Suitable for city visualization and further refinement; not construction or navigation.

Detailed mesh: {counts['triangles']:,} triangles. Map mesh: {counts['mapTriangles']:,} triangles.
Dimensions (X / Y / Z in Blender metres): {' / '.join(str(round(bounds[1][i]-bounds[0][i],2)) for i in range(3))}.

Reference: {spec['reference']}
Reference photos are not included or embedded as textures. Original geometry and materials are editable; no third-party model is included. Architectural designs and names remain associated with their respective owners. A public redistribution licence has not been assigned to this model package.

Map origin / placement (Three.js X east, Y up, Z south): {spec['position']}; local Blender Z rotation: {spec['rotation']} rad.
Built from scripts/build_landmarks.py. To change detail, edit the named architectural collections or the reusable builder. Studio objects are intentionally excluded from GLB exports.
"""
    if heritage:
        readme=readme.replace('No measured survey, interior reconstruction or photogrammetry is claimed. Decorative sculpture is simplified.', 'Selected interiors are reconstructed from visitor photographs. Room dimensions, connections, ornament and sculpture are interpretive; no measured survey or photogrammetry is claimed. See REFERENCES.md for feature-level evidence and limitations.')
        readme=readme.replace('- preview.png: rendered preview, transparent background.', '- preview.png and detail.png: exterior studio views.\n- interior.png: ticket hall or staircase view.\n- cutaway.png: roof removed to reveal the interior structure.\n- REFERENCES.md: visual evidence, coverage and uncertainty.\n- FONT-LICENSE.txt: licence for the shaped Sinhala sign geometry.')
        readme=readme.replace('lighter export without the smallest rail, tile and window details.', 'lighter export without interiors, micro-ornament, fine tiles or small window bars.')
        readme+='\nInterior collections begin with Interior /. Hide Roof / collections for a cutaway. Four named cameras are saved in the source. Supplemental interior lights are in the Studio collection, disabled for exterior views; enable them when rendering an interior. No interior or studio light is loaded into the city map.\n'
        shutil.copy(ROOT/'scripts/fonts/OFL.txt',dest/'FONT-LICENSE.txt')
        shutil.copy(ROOT/'scripts/references'/f'{id}.md',dest/'REFERENCES.md')
    (dest/'README.md').write_text(readme)
    files=[id+'.blend',id+'.glb','map.glb','preview.png','detail.png','README.md']
    if heritage:files+=['interior.png','cutaway.png','REFERENCES.md','FONT-LICENSE.txt']
    with zipfile.ZipFile(dest/(id+'-model.zip'),'w',zipfile.ZIP_DEFLATED) as z:
        for filename in files:
            if (dest/filename).exists():z.write(dest/filename,id+'/'+filename)
    result={k:v for k,v in spec.items() if k not in ['builder','view','target']};result.update(id=id,files=files,interiors=heritage,**counts,bounds=bounds,bytes=(dest/'map.glb').stat().st_size,downloadBytes=(dest/(id+'-model.zip')).stat().st_size)
    (dest/'metadata.json').write_text(json.dumps(result,indent=2))
    print('LANDMARK_COMPLETE',json.dumps(result),flush=True)

if __name__=='__main__':
    args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['all']
    ids=list(SPECS) if not args or args[0]=='all' else [args[0]]
    for id in ids:
        reset();SPECS[id]['builder']();finish(id,SPECS[id],render='--no-render' not in args)
    catalog=[json.loads((OUT/id/'metadata.json').read_text()) for id in SPECS if (OUT/id/'metadata.json').exists()]
    (OUT/'catalog.json').write_text(json.dumps(catalog,indent=2))
