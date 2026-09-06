"""Photograph-informed heritage architecture; dimensions are approximate metres.
Public reference photographs are linked in the model notes, never used as textures.
"""
import bpy, math, json
from pathlib import Path
from mathutils import Vector
P=math.pi
H=None

def use(api):
    global H
    H=api
    H.material('Granite',(.25,.22,.21),.8)
    H.material('Ochre tile',(.38,.19,.105),.86)
    H.material('Wood polished',(.075,.028,.011),.36)
    H.material('Sign ink',(.009,.018,.023),.56)
    H.material('Patinated gold',(.61,.37,.075),.38,.72)
    H.material('Exhibit lining',(.55,.51,.39),.82)
    H.material('Pale glazing',(.38,.49,.47),.22,.18)

def poly(points,y,depth,mat='White plaster'):
    n=len(points);v=[(x,yy,z) for yy in [y-depth/2,y+depth/2] for x,z in points]
    H.mesh('Profile',v,[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],mat)

def tube(points,r=.04,mat='Ivory',sides=6):
    if len(points)<2:return
    v=[]
    for i,p in enumerate(points):
        tangent=Vector(points[min(i+1,len(points)-1)])-Vector(points[max(i-1,0)])
        tangent.normalize();u=tangent.cross(Vector((0,1,0)))
        if u.length<.01:u=tangent.cross(Vector((0,0,1)))
        u.normalize();w=tangent.cross(u)
        v.extend(tuple(Vector(p)+r*(math.cos(j*2*P/sides)*u+math.sin(j*2*P/sides)*w)) for j in range(sides))
    H.mesh('Moulded curve',v,[(i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j) for i in range(len(points)-1) for j in range(sides)],mat,True)

def ring(x,y,z,r,thick=.04,mat='Ivory',start=0,end=2*P,n=40):
    tube([(x+r*math.cos(a),y,z+r*math.sin(a)) for a in [start+(end-start)*i/n for i in range(n+1)]],thick,mat)

def relief(x,y,z,r=.3,mat='Ivory'):
    H.sphere((x,y,z),(r*.36,r*.18,r*.36),mat,10,6)
    for i in range(8):
        a=i*P/4;H.sphere((x+r*.65*math.cos(a),y,z+r*.65*math.sin(a)),(r*.23,r*.15,r*.23),mat,8,4)

def scroll(x,y,z,s=.3,side=1,mat='Ivory'):
    tube([(x+side*s*(1-i/40*.8)*math.cos(i/40*P*3),y,z+s*(1-i/40*.8)*math.sin(i/40*P*3)) for i in range(41)],.035,mat)

def panel(x,y,z,w,h,mat='Ivory',thick=.06):
    for dx in [-w/2,w/2]:H.box((x+dx,y,z+h/2),(thick,.1,h),mat)
    for dz in [0,h]:H.box((x,y,z+dz),(w,.1,thick),mat)

def label(text,loc,width,height=None,front=-1,mat='Sign ink',sinhala=False,detail=None):
    """Text is converted and batched, retaining correctly shaped Sinhala contours."""
    c=bpy.data.curves.new(text,'CURVE' if sinhala else 'FONT')
    if sinhala:
        c.dimensions='2D';c.fill_mode='BOTH'
        data=json.loads((Path(__file__).parent/'heritage_lettering.json').read_text())[text]
        for path in data['contours']:
            if len(path)<3:continue
            sp=c.splines.new('POLY');sp.points.add(len(path)-1)
            for p,xy in zip(sp.points,path):p.co=(xy[0]/1000,xy[1]/1000,0,1)
            sp.use_cyclic_u=True
    else:c.body=text;c.align_x='CENTER';c.size=1;c.resolution_u=3
    c.extrude=.007;c.resolution_u=2
    o=bpy.data.objects.new(text,c);bpy.context.collection.objects.link(o)
    bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
    coords=[v.co.copy() for v in o.data.vertices];mins=[min(v[i] for v in coords) for i in range(2)];maxs=[max(v[i] for v in coords) for i in range(2)]
    sx=width/max(.001,maxs[0]-mins[0]);sz=(height/(maxs[1]-mins[1])) if height else sx
    x,y,z=loc;verts=[(x-front*(v.x-(maxs[0]+mins[0])/2)*sx,y+front*v.z,z+(v.y-mins[1])*sz) for v in coords]
    old=H.DETAIL
    if detail is not None:H.group(H.GROUP,detail)
    H.mesh('Lettering '+text,verts,[tuple(p.vertices) for p in o.data.polygons],mat)
    H.group(H.GROUP,old);geo=o.data;bpy.data.objects.remove(o,do_unlink=True);bpy.data.meshes.remove(geo)

def arch_trim(x,y,z,w,h,depth=.2,trim=.14,n=24,fill=None):
    r=w/2;spring=z+h-r
    v=[(x+rr*math.cos(P*i/n),yy,spring+rr*math.sin(P*i/n)) for yy in [y-depth/2,y+depth/2] for rr in [r,r+trim] for i in range(n+1)]
    k=n+1;faces=[]
    for i in range(n):faces.extend([(i,i+1,k+i+1,k+i),(2*k+i,3*k+i,3*k+i+1,2*k+i+1),(i,2*k+i,2*k+i+1,i+1),(k+i,k+i+1,3*k+i+1,3*k+i)])
    faces.extend([(0,k,3*k,2*k),(n,2*k+n,3*k+n,k+n)])
    H.mesh('Continuous archivolt',v,faces,'Ivory')
    for side in [-1,1]:H.box((x+side*(r+trim/2),y,z+(h-r)/2),(trim,depth,h-r),'Ivory')
    if fill:
        pts=[(x-r,y,z),(x+r,y,z)]+[(x+r*math.cos(P*i/n),y,spring+r*math.sin(P*i/n)) for i in range(n+1)]
        H.mesh('Arched glazing',pts,[tuple(range(len(pts)))],fill)

def arched_wall(x,y,z,bay,w,h,total,depth=.65,front=-1,ornament=False):
    """A continuous manifold spandrel leaves the arch open without internal faces."""
    spring=z+h-w/2;r=w/2
    outline=[(x-bay/2,z),(x-bay/2,z+total),(x+bay/2,z+total),(x+bay/2,z),(x+r,z)]+[(x+r*math.cos(P*i/24),spring+r*math.sin(P*i/24)) for i in range(25)]+[(x-r,z)]
    poly(outline,y,depth)
    arch_trim(x,y+front*depth*.48,z,w,h)
    H.box((x,y+front*(depth/2+.13),spring+r+.09),(.30,.25,.52),'Ivory')
    if ornament:
        old=H.DETAIL;H.group(H.GROUP,True)
        ring(x,y+front*(depth/2+.12),spring,r+.25,.047,start=0,end=P,n=36)
        for side in [-1,1]:
            H.box((x+side*(r+.10),y+front*(depth/2+.08),spring),(.62,.38,.18),'Ivory')
            ring(x+side*(r+.40),y+front*(depth/2+.11),z+total-.42,.24,.027,n=24)
        H.group(H.GROUP,old)

def sash(x,y,z,w,h,front=-1,ornate=True):
    r=w/2;spring=z+h-r
    arch_trim(x,y,z,w,h,.16,.13,18,'Glass shade')
    # Recessed full fanlight and independently modelled sash leaves.
    fy=y+front*.14
    for dx in [-w/2,0,w/2]:H.box((x+dx,fy,z+(h-r)/2),(.085,.12,h-r),'Ivory')
    H.box((x,fy,spring),(w+.15,.15,.12),'Ivory');H.box((x,fy,z),(w+.3,.30,.14),'Ivory')
    old=H.DETAIL;H.group(H.GROUP,True)
    for dx in [-w/3,-w/6,w/6,w/3]:H.box((x+dx,fy,z+(h-r)/2),(.035,.10,h-r),'Ivory')
    for j in range(1,7):H.box((x,fy,z+(h-r)*j/7),(w,.10,.036),'Ivory')
    for j in range(1,8):
        a=P*j/8;H.beam((x,fy,spring),(x+r*math.cos(a),fy,spring+r*math.sin(a)),.038,'Ivory')
    if ornate:
        ring(x,fy+front*.05,spring,r+.22,.045,start=0,end=P)
        H.box((x,fy+front*.08,z+h+.10),(.23,.20,.4),'Ivory')
    H.group(H.GROUP,old)

def paired_sash(x,y,z,w,h):
    arch_trim(x,y,z,w,h,.16,.13,24,'Glass shade')
    for side in [-1,1]:
        xx=x+side*w*.235
        arch_trim(xx,y+.15,z+.1,w*.41,h-.85,.12,.065,16)
        H.box((xx,y+.19,z+(h-1.5)/2),(.055,.12,h-1.5),'Ivory')
    H.box((x,y+.18,z+(h-1.1)/2),(.15,.2,h-1.1),'Ivory')
    ring(x,y+.21,z+h-.54,.24,.043,n=28)
    old=H.DETAIL;H.group(H.GROUP,True)
    for j in range(1,7):H.box((x,y+.20,z+j*(h-1.3)/7),(w,.09,.035),'Ivory')
    H.group(H.GROUP,old)

def balusters(x,y,z,w,mat='Ivory',step=.50,h=1):
    H.box((x,y,z+.08),(w,.38,.16),mat);H.box((x,y,z+h),(w,.38,.16),mat)
    count=int(w/step)
    for i in range(count):
        xx=x-w/2+(i+.5)*w/count
        H.lathe((xx,y,z),[(.115,.16),(.08,.23),(.14,.4),(.10,.55),(.055,.67),(.07,h-.1)],mat,8)

def urn(x,y,z,s=1):
    H.box((x,y,z+.08*s),(.52*s,.52*s,.16*s),'Ivory')
    H.lathe((x,y,z),[(.18*s,.16*s),(.13*s,.28*s),(.25*s,.50*s),(.28*s,.64*s),(.18*s,.76*s),(.23*s,.81*s),(.1*s,.93*s),(0,1.1*s)],'Ivory',16)

def clock(x,y,z,r=1.05):
    H.mesh('Black clock face',[(x,y,z)]+[(x+r*math.cos(i*2*P/64),y,z+r*math.sin(i*2*P/64)) for i in range(64)],[(0,i+1,(i+1)%64+1) for i in range(64)],'Sign ink')
    ring(x,y-.05,z,r+.06,.065,n=64);ring(x,y-.07,z,r*.75,.023,n=48)
    for i in range(12):
        a=i*P/6;H.beam((x+r*.81*math.sin(a),y-.08,z+r*.81*math.cos(a)),(x+r*.96*math.sin(a),y-.08,z+r*.96*math.cos(a)),.10,'Ivory')
    H.beam((x,y-.11,z),(x-r*.55,y-.11,z+r*.3),.09,'Ivory');H.beam((x,y-.13,z),(x+r*.58,y-.13,z+r*.53),.075,'Ivory')
    H.sphere((x,y-.15,z),(.09,.06,.09),'Ivory',12,6)

def olcott(x,y,z):
    H.group('05 Olcott memorial / pedestal and sculpture')
    H.box((x,y,z+.12),(4.4,4.0,.24),'Granite');H.box((x,y,z+.4),(3.7,3.4,.36),'Granite')
    # Tapered black masonry plinth, freestanding in front of the station.
    v=[(x+dx*w,y+dy*d,z+zz) for w,d,zz in [(1.5,1.3,.58),(1.05,.94,4.1)] for dx,dy in [(-1,-1),(1,-1),(1,1),(-1,1)]]
    H.mesh('Tapered memorial stone',v,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],'Sign ink')
    H.box((x,y,z+4.2),(2.4,2.15,.25),'Granite');panel(x,y-1.12,z+1.55,1.25,1.8,'Metal',.035)
    label('HENRY STEEL OLCOTT',(x,y-1.18,z+2.9),1.0,.12,mat='Gold',detail=True)
    label('1832 - 1907',(x,y-1.19,z+2.63),.70,.10,mat='Gold',detail=True)
    s=1.7;oz=z+4.34
    def point(a):return (x+a[0]*s,y+a[1]*s,oz+a[2]*s)
    def ell(c,sz):H.sphere(point(c),tuple(k*s for k in sz),'Patinated gold',16,10)
    def limb(a,b,r1,r2):
        a,b=Vector(point(a)),Vector(point(b));d=b-a;u=d.normalized().cross(Vector((0,1,0))).normalized();v=d.normalized().cross(u);n=12
        verts=[tuple(p+s*r*(u*math.cos(i*2*P/n)+v*math.sin(i*2*P/n))) for p,r in [(a,r1),(b,r2)] for i in range(n)]
        H.mesh('Sculpted limb',verts,[(i,(i+1)%n,n+(i+1)%n,n+i) for i in range(n)],'Patinated gold',True)
    for side in [-1,1]:
        ell((side*.20,-.1,.10),(.17,.33,.12));limb((side*.19,0,.16),(side*.21,.01,.9),.13,.17);limb((side*.21,.01,.85),(side*.19,.01,1.43),.17,.21)
    # Coat flares at hem, narrows at waist, and broadens over the shoulders.
    levels=[(.44,.25,1.10),(.36,.23,1.45),(.35,.25,1.78),(.48,.24,2.03),(.37,.21,2.13)]
    verts=[point((rx*math.cos(i*2*P/24),ry*math.sin(i*2*P/24),zz)) for rx,ry,zz in levels for i in range(24)]
    H.mesh('Tailored coat',verts,[(j*24+i,j*24+(i+1)%24,(j+1)*24+(i+1)%24,(j+1)*24+i) for j in range(4) for i in range(24)],'Patinated gold',True)
    # His right arm is akimbo; the opposite hand rests near the coat pocket.
    limb((-.43,0,2.0),(-.77,-.08,1.75),.17,.14);limb((-.77,-.08,1.75),(-.39,-.28,1.48),.14,.10);ell((-.35,-.28,1.46),(.13,.09,.15))
    limb((.42,0,2.0),(.46,-.02,1.57),.17,.13);limb((.46,-.02,1.57),(.33,-.28,1.27),.13,.09);ell((.33,-.28,1.23),(.10,.075,.14))
    ell((0,0,2.20),(.14,.14,.19));ell((0,-.025,2.43),(.225,.205,.29));ell((0,-.204,2.39),(.07,.10,.12))
    for side in [-1,1]:ell((side*.22,-.005,2.42),(.045,.065,.09))
    ell((0,-.16,2.20),(.17,.13,.22))
    H.group('05 Olcott memorial / facial and garment detail',True)
    for side in [-1,1]:
        ell((side*.085,-.209,2.49),(.06,.025,.02));ell((side*.045,-.223,2.30),(.065,.035,.038))
        ell((side*.19,.025,2.50),(.055,.17,.18))
        poly([(x+side*.05*s,oz+1.62*s),(x+side*.22*s,oz+2.08*s),(x+side*.02*s,oz+1.90*s)],y-.26*s,.035,'Gold')
    for i in range(7):
        dx=(i-3)*.043;tube([point((dx,-.25,2.33)),point((dx*.9,-.29,2.22)),point((dx*.4,-.25,2.06))],.018,'Gold')
    for zz in [1.42,1.62,1.82]:ell((.02,-.26,zz),(.024,.025,.024))
    tube([point((0,-.26,1.12)),point((0,-.255,1.7))],.012,'Bronze')

def station(api):
    use(api)
    H.group('01 Station / foundations and accessible forecourt')
    H.box((0,8,.1),(250,126,.2),'Paving');H.box((-15,-23,.48),(185,20,.65),'Limestone')
    # The model is authored looking toward local +Y. Placement rotates its front north.
    H.group('02 Entrance / walls and open passages')
    for x in range(-102,75,8):
        if x in [-22,-14]:continue
        H.box((x,-20,.85),(7.8,.60,.65),'Granite')
        H.box((x,-20,4.75),(7.8,.60,1.4),'White plaster')
        for dx in [-3.4,3.4]:H.box((x+dx,-20,2.5),(1.1,.60,4.0),'White plaster')
        H.box((x,-20,1.55),(5.7,.6,1.10),'White plaster')
        H.box((x,-20,3.90),(5.7,.6,.50),'White plaster')
        # Counter recesses remain behind their projecting sills and frames.
        H.box((x,-19.75,2.85),(5.8,.15,1.6),'Shadow')
        H.box((x,-20.4,2.05),(6.2,.7,.15),'Granite')
        for dx in [-2.8,-1.4,0,1.4,2.8]:H.box((x+dx,-20.16,2.9),(.10,.13,1.6),'Timber')
        panel(x,-20.17,2.08,5.8,1.62,'Timber',.1)
    for x in [-110,79]:H.box((x,-22,2.9),(.7,17,5),'White plaster')
    H.box((-16,-13,4.9),(188,.65,1.3),'White plaster')
    for x in range(-106,79,12):H.box((x,-13,2.6),(3,.6,4.6),'White plaster')
    H.group('Roof / station entrance')
    H.hip(-16,-20,5.65,191,17,2.65,'Roof tile')
    H.group('03 Historic canopy / scalloped fascia')
    # A continuous corrugated valance with shallow segmental scallops, as photographed.
    for i in range(24):
        x=-110+i*8;pts=[(x,7.5),(x+8,7.5)]+[(x+8-j/24*8,4.25+.62*math.sin(P*j/24)) for j in range(25)]
        poly(pts,-31.8,.14,'White plaster')
        H.box((x+4,-26,6.45),(8,11.5,.16),'Roof tile')
        H.cyl((x,-31.3,2.75),.085,5.05,'Metal',10)
        for side in [-1,1]:tube([(x,-31.3,3.7),(x+side*.45,-31.3,4.35),(x+side*1.5,-31.3,4.92),(x+side*2.5,-31.3,5.1)],.055,'Metal')
        H.beam((x,-31.3,5.3),(x,-20,6.3),.11,'Metal')
    H.group('03 Historic canopy / corrugations',True)
    for i in range(640):
        x=-110+i*.3;phase=(x+110)%8/8;bottom=4.25+.62*math.sin(P*phase)
        H.box((x,-31.9,(bottom+7.5)/2),(.021,.028,7.5-bottom),'Ivory')
    H.group('04 Station / Sinhala and English signage')
    label('කොටුව දුම්රිය ස්ථානය',(-18,-31.99,4.55),32,2.72,sinhala=True)
    label('FORT RAILWAY STATION',(23,-31.98,5.20),36,1.05)
    label('COLOMBO FORT',(-65,-31.98,5.20),29,1.05)
    H.group('04 Clock pavilion / masonry')
    cx=-18;fy=-21.1
    H.box((cx,-20.5,7.40),(29,1.1,3.0),'White plaster')
    for z,w,d in [(6.45,31,1.6),(7.0,30,1.4),(8.65,30,1.55),(8.95,29,1.1)]:H.box((cx,fy,z),(w,d,.25),'Ivory')
    # Broad segmental cap on a shouldered body, not a pointed or semicircular doorway.
    outline=[(cx-6,8.8),(cx+6,8.8),(cx+6,11.9),(cx+6.7,12.25)]+[(cx+6.7*math.cos(P*i/48),12.25+3.55*math.sin(P*i/48)) for i in range(49)]+[(cx-6,11.9)]
    poly(outline,fy,1.15)
    tube([(cx+6.85*math.cos(P*i/60),fy-.65,12.3+3.68*math.sin(P*i/60)) for i in range(61)],.19,'Ivory')
    tube([(cx+6.4*math.cos(P*i/60),fy-.70,12.35+3.18*math.sin(P*i/60)) for i in range(61)],.09,'Ivory')
    for side in [-1,1]:
        H.box((cx+side*13.8,fy,9.9),(1.5,1.2,2.0),'White plaster');panel(cx+side*13.8,fy-.66,9.45,1.02,1.0)
        H.box((cx+side*6.7,fy,9.9),(1.6,1.2,2.0),'White plaster');panel(cx+side*6.7,fy-.66,9.45,1.05,1)
        balusters(cx+side*10.2,fy,9.0,5.2,h=1.6);H.box((cx+side*10.2,fy,10.84),(7.6,1.4,.25),'Ivory');urn(cx+side*13.8,fy,11,1.25)
        tube([(cx+side*(6.0+i/20*1.6),fy-.67,12.15-1.15*math.sin(i/20*P/2)) for i in range(21)],.15)
        panel(cx+side*9.5,fy-.66,7.27,7,1.0)
    clock(cx,fy-.77,10.3,1.05)
    H.group('04 Clock pavilion / dentils garlands and cartouche',True)
    for i in range(1,31):
        a=P*i/32;H.box((cx+6.43*math.cos(a),fy-.76,12.35+3.25*math.sin(a)),(.19,.20,.18),'Ivory')
    # Abstracted low relief cartouche and festoons, using the photograph's composition.
    relief(cx,fy-.7,14.23,.48)
    for side in [-1,1]:
        relief(cx+side*.74,fy-.7,14.03,.21)
        for j in range(9):
            t=j/8;relief(cx+side*(.5+2.6*t),fy-.7,13.65-.66*math.sin(P*t),.13)
        scroll(cx+side*1.9,fy-.8,9.07,.35,side)
        tube([(cx+side*3.8*math.cos(a),fy-.70,10.15+2.6*math.sin(a)) for a in [P*i/48 for i in range(49)]],.065)
    H.group('04 Clock pavilion / flagpole')
    H.beam((cx,fy,15.8),(cx,fy,18.2),.05,'Metal')
    H.group('04 Clock pavilion / timetable housings',True)
    # Historic timetable housings are blank: no invented operational schedule.
    for i,name in enumerate(['NEXT TRAIN','','KANDY','NEGOMBO','MATARA']):
        xx=cx-8+i*4;H.box((xx,-31.96,7.18),(3.5,.08,.51),'Pale glazing');panel(xx,-32.04,6.93,3.5,.51,'Sign ink',.035)
        if name:label(name,(xx,-32.06,7.02),2.5,.16,detail=True)
    for (name,detail,mat,smooth),(verts,faces) in H.PARTS.items():
        if name.startswith('04 Clock pavilion /') and 'timetable' not in name:
            for i,(x,y,z) in enumerate(verts):verts[i]=(-18+(x+18)*.75,fy+(y-fy)*.75,7.5+(z-6.5)*.75)
    olcott(-10,-43,.2)
    H.group('06 Forecourt / memorial fence and planting')
    for yy in [-48,-38]:
        H.box((-10,yy,.32),(20,.4,.35),'Granite')
        for x in range(-20,1):
            H.cyl((x,yy,1.35),.034,2,'Metal',6);H.lathe((x,yy,2.35),[(.075,0),(0,.18)],'Gold',6)
        for zz in [.9,1.9]:H.beam((-20,yy,zz),(0,yy,zz),.065,'Metal')
    for x in [-24,4]:
        for yy in [-45,-41]:H.bush(x,yy,.3,1.1)
    for x in [1,5,9]:
        H.cyl((x,-42,4.7),.055,9,'Metal',10)
    # Cloth is kept unmarked rather than inventing a national emblem.
    H.group('07 Platforms / decks and yellow safety edges')
    rows=[-9,8,25,42,59]
    for row,yy in enumerate(rows):
        length=224-row*4;H.box((0,yy,.72),(length,7.5,1.05),'Limestone')
        for side in [-1,1]:H.box((0,yy+side*3.45,1.26),(length,.18,.025),'Gold')
        H.group('Roof / station platform canopies')
        H.hip(0,yy,6.2,length+1,9,1.7,'Roof tile')
        H.group('08 Platforms / cast iron columns and lattice trusses')
        for x in range(-105,106,14):
            H.lathe((x,yy,1.25),[(.24,0),(.17,.25),(.13,4.45),(.22,4.65),(.24,4.85)],'Ivory',8)
            H.beam((x,yy-4.4,6.12),(x,yy+4.4,6.12),.11,'Metal')
            for side in [-1,1]:
                H.beam((x,yy,4.9),(x,yy+side*3.5,6.15),.09,'Metal')
                H.beam((x,yy+side*4.4,6.12),(x,yy,7.8),.12,'Metal')
            old=H.DETAIL;H.group('08 Platforms / roof lattice detail',True)
            for k in range(8):
                a=-4+k;b=a+1;H.beam((x,yy+a,6.17),(x,yy+b,7.7-abs(b)*.34),.042,'Metal')
            H.group('08 Platforms / cast iron columns and lattice trusses',old)
        H.group('07 Platforms / decks and yellow safety edges')
    H.group('09 Broad gauge track / rails and ballast')
    for yy in [-1,16,33,50,67]:
        H.box((0,yy,.28),(246,6,.35),'Gravel')
        for dy in [-.838,.838]:H.box((0,yy+dy,.55),(246,.12,.16),'Metal')
        for xx in range(-122,123):
            H.group('09 Broad gauge track / sleepers',bool(xx%2));H.box((xx,yy,.42),(.23,2.7,.14),'Timber')
        H.group('09 Broad gauge track / rails and ballast')
    H.group('10 Passenger bridges / decks rails and stairs')
    for xx,finish in [(-75,63),(67,63),(-18,27)]:
        start=-9;mid=(start+finish)/2;length=finish-start
        H.box((xx,mid,8.3),(3.2,length,.3),'Concrete')
        H.group('Roof / station footbridges');H.gable(xx,mid,10.5,3.8,length+1,.7,'Roof tile');H.group('10 Passenger bridges / decks rails and stairs')
        for side in [-1,1]:
            H.beam((xx+side*1.5,start,9.5),(xx+side*1.5,finish,9.5),.08,'Metal')
            for yy in range(start,finish,4):
                H.beam((xx+side*1.5,yy,8.4),(xx+side*1.5,min(yy+4,finish),9.6),.055,'Metal')
                H.beam((xx+side*1.5,yy,9.6),(xx+side*1.5,min(yy+4,finish),8.4),.055,'Metal')
        for yy in rows:
            if yy>finish:continue
            for side in [-1,1]:H.beam((xx+side*1.3,yy,1.2),(xx+side*1.3,yy,8.25),.18,'Metal')
            for step in range(28):H.box((xx+2+step*.30,yy,8.15-step*.245),(.33,2,.15),'Concrete')
            for side in [-1,1]:H.beam((xx+2,yy+side,9.15),(xx+10.1,yy+side,2.5),.065,'Metal')
    H.group('Interior / station ticket hall and queues',True)
    H.box((-18,-25,.86),(184,10,.10),'Ochre tile')
    for i,x in enumerate(range(-100,76,8)):
        if -25<x<-9:continue
        label(str(i+1),(x,-20.4,3.95),.43,.43,mat='Red')
        label('TICKETS',(x,-20.42,3.6),1.5,.18)
        for xx in [x-2,x,x+2]:
            for yy in [-27,-23]:H.cyl((xx,yy,1.46),.027,1.1,'Metal',8)
            H.beam((xx,-27,2.01),(xx,-23,2.01),.055,'Metal')
        # Glass slot, security grille and numbered counter boards.
        for dx in [-2.6,-2,-1.4,-.8,-.2,.4,1,1.6,2.2,2.6]:H.box((x+dx,-20.25,2.88),(.035,.045,1.5),'Metal')
        H.box((x,-20.45,4.30),(2.7,.07,.68),'Ivory')
        label('COUNTER '+str(i+1),(x,-20.51,4.4),2.35,.2,mat='Red')
    H.group('Interior / station platform furniture and wayfinding',True)
    for i,yy in enumerate(rows):
        for xx in [-90,-40,25,90]:
            H.box((xx,yy,1.75),(3,.6,.14),'Timber');H.box((xx,yy+.28,2.12),(3,.12,.72),'Timber')
            for dx in [-1.15,1.15]:H.box((xx+dx,yy,1.5),(.09,.5,.5),'Metal')
            H.box((xx,yy,4.7),(1.2,.10,.85),'Sign ink');label(str(3+i*2),(xx,yy-.07,4.38),.52,.6,mat='Ivory')
            H.box((xx+5,yy,1.75),(.55,.55,1.0),'Metal')
    label('කොළඹ කොටුව',(-18,-13.5,4.85),10,.65,sinhala=True)
    label('COLOMBO FORT',(-18,-13.55,4.2),9,.5)
    # Repeated fixtures are static; no live display or invented timetable is baked in.
    for xx in range(-95,75,12):
        H.beam((xx,-25,6.2),(xx,-25,5.5),.035,'Metal');H.cyl((xx,-25,5.4),.17,.08,'Metal',12)
        for a in [0,2*P/3,4*P/3]:H.box((xx+.5*math.cos(a),-25+.5*math.sin(a),5.4),(.85,.16,.04),'Metal',a)

def classical_column(x,y,z,h,r=.23):
    H.column(x,y,z,h,r)
    old=H.DETAIL;H.group('Museum / carved capitals and fluting',True)
    for side in [-1,1]:scroll(x+side*r*.9,y+.1,z+h-.17,r*.52,side)
    for i in range(12):
        a=i*P/6;H.beam((x+r*.96*math.cos(a),y+r*.96*math.sin(a),z+.45),(x+r*.80*math.cos(a),y+r*.80*math.sin(a),z+h-.44),.017,'Ivory')
    H.group('Museum / architectural columns',old)

def cornice(x,y,z,w,front=1):
    for dz,d,h in [(0,.4,.18),(.18,.65,.13),(.33,.85,.16),(.49,1.0,.13)]:H.box((x,y+front*d/2,z+dz),(w,d,h),'Ivory')

def portico_door(x,y,z,w=2.7,h=4.15):
    sash(x,y,z,w,h,1)
    # Solid panelled timber double door under an arched iron fanlight.
    H.box((x,y+.08,z+(h-w/2)/2),(w,.16,h-w/2),'Timber')
    old=H.DETAIL;H.group('Museum / door joinery and fanlights',True)
    for side in [-1,1]:
        for zz in [.25,1.22]:panel(x+side*w/4,y+.18,z+zz,w*.36,.85,'Wood polished',.065)
        H.sphere((x+side*.13,y+.21,z+1.35),(.035,.04,.055),'Gold',8,4)
    H.group('Museum / facade openings',old)

def stair_flight(x,y,z,w,n,run,rise,direction=1):
    for i in range(n):
        yy=y+direction*i*run;zz=z+(i+1)*rise
        H.box((x,yy,zz-.055),(w,run+.04,.11),'Wood polished')
        H.box((x,yy-direction*run/2,zz-rise/2),(w,.065,rise),'Timber')
        for side in [-1,1]:
            xx=x+side*(w/2-.06)
            H.cyl((xx,yy,zz+.45),.025,.9,'Bronze',8)
            # Scrollwork in the metal balustrade, beneath a broad timber handrail.
            for dz in [.24,.66]:
                tube([(xx+.08*math.cos(a),yy+.09*math.sin(a),zz+dz+.15*math.sin(a)) for a in [j*2*P/12 for j in range(13)]],.012,'Bronze',5)
    for side in [-1,1]:
        xx=x+side*(w/2-.06)
        H.beam((xx,y,z+rise+.97),(xx,y+direction*(n-1)*run,z+n*rise+.97),.115,'Wood polished')
        H.beam((xx,y,z),(xx,y+direction*(n-1)*run,z+n*rise-.2),.22,'Timber')
        for yy,zz in [(y,z+rise),(y+direction*(n-1)*run,z+n*rise)]:
            H.lathe((xx,yy,zz),[(.11,0),(.10,.78),(.16,.82),(.13,.96),(.18,1.03),(.09,1.15),(0,1.20)],'Wood polished',16)

def museum(api):
    use(api)
    H.group('Museum / foundations and forecourt')
    H.box((0,0,.2),(78,105,.4),'Paving');H.box((0,-4,.65),(75,88,.6),'Limestone')
    H.group('Museum / ground floor slabs')
    H.box((0,30,.95),(75,25,.15),'Ochre tile')
    for x in [-30,30]:H.box((x,-10,.95),(15,69,.15),'Ochre tile')
    H.box((0,-42,.95),(75,15,.15),'Ochre tile')
    # The two long wings are hollow, with physically cut window openings.
    H.group('Museum / side and rear wall shells')
    for x in [-37.1,37.1,-22.9,22.9]:
        for yy in range(-38,40,7):
            for z in [1,6.2]:
                # Build one bay in the X/Z plane then rotate its newly appended vertices.
                keys={k:len(v[0]) for k,v in H.PARTS.items()}
                arched_wall(0,0,z,7,2.6,4.2,5.2,.60,1)
                sash(0,.1,z+.2,2.6,3.8,1,False)
                for k,(v,f) in H.PARTS.items():
                    for i in range(keys.get(k,0),len(v)):
                        xx,dy,zz=v[i];v[i]=(x+dy,yy-xx,zz)
    for yy in [-49,-35]:
        for x in range(-33,34,6):
            for z in [1,6.2]:arched_wall(x,yy,z,6,2.5,4.0,5.2,.6,1);sash(x,yy+.04,z+.3,2.5,3.6,1,False)
    H.group('Museum / upper floor slabs around stair void')
    for x in [-25,25]:H.box((x,29,6.05),(24,25,.28),'Timber')
    for x in [-30,30]:H.box((x,-10,6.05),(15,70,.28),'Timber')
    H.box((0,-42,6.05),(75,15,.28),'Timber')
    H.box((0,37,6.05),(27,8,.28),'Timber')
    H.box((0,16.1,6.05),(27,2,.28),'Timber')
    H.group('Roof / museum hipped wings')
    for x in [-30,30]:H.hip(x,-5,11.9,16,80,3.0,'Terracotta')
    H.hip(0,-42,11.9,76,16,3.0,'Terracotta');H.hip(0,33,11.9,76,17,3.2,'Terracotta')
    H.group('Roof / museum tile courses',True)
    for x in [-30,30]:
        for j in range(156):
            yy=-44+j*.50
            for side in [-1,1]:H.beam((x+side*8,yy,11.94),(x,max(-39.4,min(29.4,yy)),14.94),.065,'Terracotta')
    for j in range(145):
        x=-36+j*.5
        for yy in [-42,33]:
            for side in [-1,1]:H.beam((x,yy+side*8,11.95),(max(-32.4,min(32.4,x)),yy,14.95),.060,'Terracotta')
    H.group('Museum / facade openings')
    # Three deep open upper loggia bays on each side of the portico.
    arcades=[-19.2,-14.6,-10,10,14.6,19.2,-35,35]
    for x in arcades:
        arched_wall(x,42,6.2,4.6,3.75,4.7,5.2,.72,1,True)
        portico_door(x,38.8,6.25,2.7,4.0)
        # Lower sash windows: dense square panes beneath a radial fanlight.
        arched_wall(x,40.5,1,4.6,3.1,4.35,5.2,.65,1,True)
        sash(x,40.60,1.25,3.0,3.95,1)
        balusters(x,42.1,1,4.4,h=.70)
        balusters(x,42.45,6.2,4.4,h=.78)
        for dx in [-2.11,2.11]:classical_column(x+dx,42.2,6.25,2.7,.16)
    H.group('Museum / side pavilions')
    for x in [-27,27]:
        for z in [1,6.2]:
            arched_wall(x,43,z,9,2.85,4.25,5.2,.80,1,True)
            paired_sash(x,43.1,z+.3,2.85,3.85) if z>2 else sash(x,43.1,z+.3,2.85,3.85,1)
            for dx in [-3.85,3.85]:
                H.box((x+dx,43.5,z+2.5),(.5,.44,5.05),'Ivory')
                for dz in [.12,4.9]:H.box((x+dx,43.6,z+dz),(.85,.6,.2),'Ivory')
            old=H.DETAIL;H.group('Museum / pavilion incised rustication',True)
            for j in range(1,10):
                zz=z+j*.5
                for side in [-1,1]:H.box((x+side*2.85,43.43,zz),(2.5,.04,.055),'Limestone')
            H.group('Museum / side pavilions',old)
        H.pediment(x,43.4,12.05,10.2,2.3)
    H.group('Museum / central portico arcade')
    for x in [-4.8,0,4.8]:
        arched_wall(x,47,1,4.8,3.95,4.30,4.85,1.1,1,True)
        portico_door(x,38.5,1.05,2.75,4.15)
        arched_wall(x,43.35,6.2,4.8,2.65,4.5,5.55,.85,1,True)
        paired_sash(x,43.40,6.65,2.65,3.95)
    for side in [-1,1]:
        keys={k:len(v[0]) for k,v in H.PARTS.items()}
        arched_wall(0,0,1,7.8,4.4,4.30,4.85,.9,1,True)
        for k,(v,f) in H.PARTS.items():
            for i in range(keys.get(k,0),len(v)):
                x,y,z=v[i];v[i]=(side*7.35+y,43-x,z)
    for x in [-7.15,-2.4,2.4,7.15]:
        for j in range(5):H.box((x,47.65,1.3+j*.5),(.80,.22,.33),'Ivory')
    H.box((0,44,5.91),(15.5,8,.30),'White plaster');cornice(0,47.3,5.80,16)
    for x in [-5.5,0,5.5]:balusters(x,47.7,6.40,4.5,h=.85)
    for x in [-8.1,-2.6,2.6,8.1]:
        H.box((x,47.7,6.91),(.8,.60,1.16),'White plaster');panel(x,48.02,6.7,.6,.55)
    H.group('Museum / central pediment and inscribed frieze')
    H.pediment(0,43.65,12.25,17.5,3.3)
    label('M U S E U M',(0,44.22,11.58),8.5,.53,1)
    H.group('Museum / cornices parapets and urn finials')
    for yy,z in [(42,5.65),(41.4,11.35)]:cornice(0,yy,z,76)
    for x in [-15,15]:balusters(x,41.8,12.02,14,h=.70)
    for x in [-36.7,-31.4,-22.2,-7.8,7.8,22.2,31.4,36.7]:urn(x,42.0,12.85,.9)
    H.group('Museum / floral spandrels and pediment relief',True)
    for x in [-4.8,0,4.8]:
        relief(x,44.10,11.05,.18)
        for dx in [-2.2,2.2]:
            ring(x+dx,47.68,5.16,.28,.043,n=32)
            tube([(x+dx-.35,47.68,5.6),(x+dx+.35,47.68,5.6),(x+dx,47.68,5.26)],.027)
    relief(0,44.13,13.25,.68)
    for side in [-1,1]:
        for j in range(8):relief(side*(.70+j*.30),44.10,13.1-.35*math.sin(j/8*P),.14)
    for x in range(-37,38):H.box((x,42.25,11.46),(.18,.3,.19),'Ivory')
    # Joinery, ceilings and floor courses live only in the downloadable source/GLB.
    H.group('Interior / museum entrance and stair hall',True)
    H.box((0,25,1.0),(27,20,.10),'Ochre tile')
    for x in [-13.5,13.5]:H.box((x,25,6.45),(.65,24,10.9),'White plaster')
    arched_wall(0,33,1.05,27,4.1,4.5,10.3,.60,1,True)
    arched_wall(0,14.5,1.05,27,3.8,4.5,10.3,.60,1,True)
    for x in [-8.5,8.5]:
        for y in [14.85,32.65]:
            H.box((x,y,2.25),(7,.16,2.4),'Timber')
            for dx in [-3,-1.5,0,1.5,3]:panel(x+dx,y+.10,1.2,1.1,1.9,'Wood polished')
    # Bifurcated timber stair with a broad first flight and two returning flights.
    H.group('Interior / museum bifurcated staircase',True)
    stair_flight(0,29.5,1.05,3.6,16,.38,.1625,-1)
    H.box((0,21.1,3.61),(11.5,5.6,.25),'Wood polished')
    H.box((0,18.5,2.3),(11.5,.35,2.6),'Timber')
    for side in [-1,1]:
        H.box((side*5.6,21,2.3),(.24,5.3,2.6),'Timber')
        for yy in [19.2,20.6,22.0]:
            H.box((side*5.75,yy,2.3),(.08,1.1,2.1),'Wood polished')
    for side in [-1,1]:stair_flight(side*4,23.3,3.65,2.3,16,.38,.1625,1)
    for x in [-4,4]:H.box((x,31.4,6.21),(3.0,5,.16),'Wood polished')
    for side in [-1,1]:
        H.beam((side*5.6,18.3,4.64),(side*5.6,23.3,4.64),.12,'Wood polished')
        for j in range(12):H.cyl((side*5.6,18.4+j*.42,4.14),.03,.95,'Bronze',8)
    H.group('Interior / museum exhibit cabinetry',True)
    for x in [-8.6,8.6]:
        for y in [15.0,32.55]:
            H.box((x,y,3.1),(5.4,.4,3.25),'Timber');H.box((x,y+.24,3.2),(4.9,.05,2.45),'Exhibit lining')
            for dx in [-1.7,0,1.7]:
                panel(x+dx,y+.30,2.0,1.58,2.35,'Wood polished',.055)
                H.lathe((x+dx,y+.45,2.15),[(.20,0),(.17,.12),(.34,.45),(.28,.68),(.12,.77),(.15,.91)],'Terracotta',20)
    # Architectural display furniture is representative, not a catalogue of artifacts.
    H.group('Interior / museum wing galleries and panelled doors',True)
    for x in [-30,30]:
        for yy in [-27,-8,11]:
            for z in [1.05,6.25]:
                arched_wall(x,yy,z,14,2.6,4.1,5.0,.35,1,False)
                for dx in [-4.1,4.1]:
                    H.box((x+dx,yy+3,z+.45),(2.7,1.2,.9),'Timber')
                    for xx in [x+dx-1.3,x+dx+1.3]:
                        for y in [yy+2.42,yy+3.58]:H.beam((xx,y,z+.90),(xx,y,z+1.85),.055,'Metal')
                    H.box((x+dx,yy+3,z+1.86),(2.7,1.2,.07),'Pale glazing')
    H.group('Interior / museum upper timber floors and verandas',True)
    for x in [-30,30]:
        for j in range(26):H.box((x-7+j*.55,-6,6.215),(.535,75,.035),'Wood polished')
    for x in [-15,15]:H.box((x,40.4,6.23),(14,3.0,.045),'Ochre tile')
    H.group('Roof / museum coffered interior ceilings',True)
    H.box((0,25,11.65),(27,25,.15),'White plaster')
    for x in [-10,-5,0,5,10]:
        for yy in [18,23,28,33]:
            for dx in [-2.35,2.35]:H.box((x+dx,yy,11.50),(.11,4.7,.16),'Ivory')
            for dy in [-2.35,2.35]:H.box((x,yy+dy,11.50),(4.7,.11,.16),'Ivory')
    # Broad moulding courses are kept separated to avoid coplanar shimmer.
    for yy in [14.9,32.65]:
        for z in [5.4,10.8]:cornice(0,yy,z,26,1)
    H.group('Museum / entry steps and front garden')
    for i in range(6):H.box((0,48.6+i*.6,.91-i*.135),(15.2,.64,.20),'Limestone')
    for x in [-22,22]:
        H.box((x,48,.30),(23,2.9,.50),'Limestone')
        for j in range(12):H.bush(x-10.5+j*1.9,48,.55,.80)
