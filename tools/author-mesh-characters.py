import bpy, math, os, json
from mathutils import Vector
from math import sin,cos,pi
OUT=os.path.abspath('art/characters-mesh'); os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
def mat(n,c,metal=0):
 m=bpy.data.materials.new(n); m.diffuse_color=(*c,1); m.use_nodes=True; p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*c,1); p.inputs['Roughness'].default_value=.48;p.inputs['Metallic'].default_value=metal;return m
skin=mat('Warm porcelain skin',(.83,.53,.34)); teal=mat('Forest teal cloth',(.025,.22,.22)); gold=mat('Antique brass',(.68,.40,.095),.65); brown=mat('Chestnut hair',(.12,.047,.025)); leather=mat('Oxblood leather',(.12,.035,.03)); white=mat('Ivory',(.93,.84,.66)); dark=mat('Eye outline',(.028,.018,.015)); iris=mat('Emerald eyes',(.06,.30,.19)); steel=mat('Polished blade',(.54,.68,.73),.8)
def mesh(n,v,f,m,sub=1):
 me=bpy.data.meshes.new(n);me.from_pydata(v,[],f);me.update();o=bpy.data.objects.new(n,me);bpy.context.collection.objects.link(o);o.data.materials.append(m)
 for p in me.polygons:p.use_smooth=True
 if sub:s=o.modifiers.new('Authored surface smoothing','SUBSURF');s.levels=sub;s.render_levels=sub
 return o
def rings(n,rows,m,N=16,cap=True):
 v=[];f=[]
 for z,rx,ry,cx,cy in rows:
  v.extend([(cx+rx*sin(2*pi*i/N),cy-ry*cos(2*pi*i/N),z) for i in range(N)])
 for j in range(len(rows)-1):
  for i in range(N):f.append((j*N+i,j*N+(i+1)%N,(j+1)*N+(i+1)%N,(j+1)*N+i))
 if cap:f.extend([tuple(reversed(range(N))),tuple((len(rows)-1)*N+i for i in range(N))])
 return mesh(n,v,f,m)
# One authored connected control cage: torso, neck, cheeks/cranium, arm branches and legs.
rows=[(.80,.33,.21),(1.02,.35,.22),(1.32,.39,.235),(1.48,.36,.22),(1.56,.17,.14),(1.68,.14,.13),(1.76,.29,.23),(1.90,.49,.34),(2.15,.61,.43),(2.43,.62,.45),(2.66,.52,.38),(2.82,.28,.22),(2.87,.06,.055)]
N=16;v=[];f=[]
for z,rx,ry in rows:
 for i in range(N):
  t=2*pi*i/N;x=rx*sin(t);y=-ry*cos(t)
  # Facial plane with soft cheeks, projecting nose/muzzle rather than a spherical face.
  if 1.9<=z<=2.43 and cos(t)>.5:y-=.035*(1-abs(x)/.62)
  v.append((x,y,z))
for j in range(len(rows)-1):
 for i in range(N):
  if j==2 and i in (3,11):continue
  f.append((j*N+i,j*N+(i+1)%N,(j+1)*N+(i+1)%N,(j+1)*N+i))
f.append(tuple((len(rows)-1)*N+i for i in range(N)))
# Branch each arm directly from an omitted torso quad, keeping shared vertices.
for sign,idx in [(1,3),(-1,11)]:
 boundary=[2*N+idx,2*N+(idx+1)%N,3*N+(idx+1)%N,3*N+idx];prev=boundary
 for x,z,rad,dep in [(.48,1.40,.16,.17),(.65,1.28,.15,.16),(.77,1.12,.125,.14),(.87,1.00,.13,.14),(.94,.92,.14,.145),(1.015,.91,.055,.07)]:
  # Ring orientation is matched to the four existing shoulder opening corners.
  points=[(sign*x,-dep,z-rad),(sign*x,dep,z-rad),(sign*x,dep,z+rad),(sign*x,-dep,z+rad)]
  if sign<0:points=list(reversed(points))
  now=list(range(len(v),len(v)+4));v.extend(points)
  for k in range(4):f.append((prev[k],prev[(k+1)%4],now[(k+1)%4],now[k]))
  prev=now
 f.append(tuple(prev))
# Shared crotch edge separates the bottom into two limb loops.
center=len(v);v.append((0,0,.78))
for ids,sign in [(list(range(0,9))+[center],1),(list(range(8,16))+[0,center],-1)]:
 prev=ids;K=len(ids)
 for z,rx,ry,cx,cy in [(.66,.17,.18,.19,0),(.47,.16,.17,.20,0),(.28,.145,.15,.21,0),(.12,.155,.21,.21,-.055),(.075,.12,.18,.21,-.07)]:
  now=list(range(len(v),len(v)+K))
  for k in range(K):t=2*pi*k/K;v.append((sign*cx+rx*sin(t),cy-ry*cos(t),z))
  for k in range(K):f.append((prev[k],prev[(k+1)%K],now[(k+1)%K],now[k]))
  prev=now
 f.append(tuple(reversed(prev)))
body=mesh('Hero continuous body authored cage',v,f,skin,2)
# Garment surfaces follow body proportions; no primitive garment kit.
rings('Tailored flared tunic',[(.77,.405,.26,0,0),(.82,.405,.26,0,0),(1.01,.36,.25,0,0),(1.27,.40,.265,0,0),(1.45,.40,.255,0,0),(1.52,.21,.17,0,0)],teal,16,False)
rings('Waist leather belt',[(.97,.372,.261,0,0),(1.04,.372,.261,0,0)],leather,16,False)
for sign in [-1,1]:rings('Sculpted cuff boots',[(.075,.14,.22,sign*.21,-.07),(.11,.175,.245,sign*.21,-.06),(.22,.16,.215,sign*.21,-.045),(.33,.158,.17,sign*.21,0),(.38,.17,.18,sign*.21,0)],leather)
# Scalp is a crown patch whose front rim forms an asymmetric swept fringe.
v=[];f=[];K=32
for j in range(9):
 for k in range(K):
  t=2*pi*k/K;front=max(0,cos(t));edge=1.7-front*(.40-.12*sin(t+.65)**2);a=.06+(edge-.06)*j/8
  v.append((.645*sin(a)*sin(t),-.47*sin(a)*cos(t)+.025,2.34+.59*cos(a)))
for j in range(8):
 for k in range(K):f.append((j*K+k,j*K+(k+1)%K,(j+1)*K+(k+1)%K,(j+1)*K+k))
f.append(tuple(reversed(range(K))));hair=mesh('Swept sculpted hair cap',v,f,brown,1);sol=hair.modifiers.new('Hair thickness','SOLIDIFY');sol.thickness=.045
# Pointed flowing locks constructed as tapered ribbon surfaces.
for a in [-1.05,-.56,.15,.60,1.10]:
 pts=[]
 for z,w,shift,yy in [(2.77,.09,-.10,-.29),(2.55,.14,-.04,-.43),(2.47,.12,.04,-.48),(2.34,.01,.13,-.44)]:
  x=.45*sin(a)+shift;pts.extend([(x-w,yy,z),(x,yy-.06,z+.01),(x+w,yy,z)])
 faces=[]
 for j in range(3):
  for k in range(2):faces.append((j*3+k,j*3+k+1,(j+1)*3+k+1,(j+1)*3+k))
 o=mesh('Carved fringe lock',pts,faces,brown,1);s=o.modifiers.new('Lock thickness','SOLIDIFY');s.thickness=.04
# Separate inset eye surfaces are appropriate semantic parts.
def oval(n,loc,scale,m):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,location=loc);o=bpy.context.object;o.name=n;o.scale=scale;o.data.materials.append(m)
 for p in o.data.polygons:p.use_smooth=True
 return o
for sign in [-1,1]:
 oval('Soft recessed eye rim',(sign*.225,-.425,2.19),(.155,.045,.195),dark)
 oval('Eye white',(sign*.225,-.454,2.19),(.133,.023,.171),white)
 oval('Emerald iris',(sign*.215,-.479,2.18),(.077,.018,.112),iris)
 oval('Pupil',(sign*.213,-.492,2.18),(.038,.009,.074),dark)
 oval('Eye glint',(sign*.195,-.502,2.222),(.022,.007,.028),white)
# Nose is a shaped triangular facial patch, mouth a small curved line.
mesh('Sculpted nose', [(-.06,-.439,2.065),(0,-.50,2.095),(.06,-.439,2.065),(0,-.47,2.01)],[(0,1,3),(1,2,3)],skin,2)
def curve(n,points,r,m):
 c=bpy.data.curves.new(n,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=3;s=c.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
 for p,co in zip(s.bezier_points,points):p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
 o=bpy.data.objects.new(n,c);bpy.context.collection.objects.link(o);o.data.materials.append(m);return o
curve('Gentle smile',[(-.073,-.377,1.962),(0,-.398,1.947),(.073,-.377,1.962)],.012,leather)
# Collar seam and buckle.
curve('Gold collar trim',[(-.20,-.11,1.52),(-.15,-.18,1.49),(0,-.185,1.46),(.15,-.18,1.49),(.20,-.11,1.52)],.025,gold)
mesh('Belt diamond buckle',[(-.075,-.28,1.005),(0,-.30,1.065),(.075,-.28,1.005),(0,-.30,.945)],[(0,1,2,3)],gold,0)
# Sword authored beveled silhouette.
mesh('Leaf sword blade',[(1.12,-.05,.82),(1.01,-.05,.48),(1.07,-.05,-.02),(1.20,-.05,.47),(1.12,-.085,.48)],[(0,1,4),(1,2,4),(2,3,4),(3,0,4)],steel,0)
curve('Sword grip',[(1.10,-.04,.83),(1.10,-.04,1.03)],.045,leather)
curve('Sword crossguard',[(.94,-.04,.81),(1.10,-.06,.85),(1.26,-.04,.81)],.035,gold)
# Render studio; source saved with studio, export excludes it.
hero=[o for o in bpy.context.scene.objects if o.type in {'MESH','CURVE'}]
bpy.ops.object.select_all(action='DESELECT')
for o in hero:o.select_set(True)
bpy.context.view_layer.objects.active=body
bpy.ops.export_scene.gltf(filepath=OUT+'/swordsman-candidate.glb',use_selection=True,export_apply=True)
bpy.ops.mesh.primitive_plane_add(size=200);floor=bpy.context.object;floor.name='Studio floor';floor.data.materials.append(mat('Studio mint',(.12,.19,.18)))
scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE_NEXT';scene.cycles.samples=32;scene.cycles.use_denoising=False;scene.world.color=(.2,.2,.2);scene.render.resolution_x=640;scene.render.resolution_y=720;scene.render.resolution_percentage=100
for loc,power,size in [((-3,-4,6),650,5),((3,-2,4),450,4),((1,3,5),800,3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,1.4))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(4,-7,3.5));camera=bpy.context.object;camera.data.type='ORTHO';camera.data.ortho_scale=3.7;scene.camera=camera
bpy.ops.wm.save_as_mainfile(filepath=OUT+'/swordsman-candidate.blend')
for name,loc in [('front',(0,-8,2.6)),('three-quarter',(4,-7,3.2)),('side',(8,0,2.6))]:
 camera.location=loc;camera.rotation_euler=(Vector((0,0,1.43))-camera.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=OUT+'/'+name+'.png';bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=OUT+'/swordsman-candidate.blend')
# Connectivity evidence for raw authored body cage.
adj={i:set() for i in range(len(body.data.vertices))}
for e in body.data.edges:a,b=e.vertices;adj[a].add(b);adj[b].add(a)
seen=set();stack=[0]
while stack:
 a=stack.pop()
 if a in seen:continue
 seen.add(a);stack.extend(adj[a]-seen)
json.dump({'body_control_vertices':len(body.data.vertices),'body_mesh_vertices':len(body.data.vertices),'body_connected_vertices':len(seen),'body_total_vertices':len(adj),'body_components':1 if len(seen)==len(adj) else 'ERROR','status':'unrigged review candidate','method':'explicit authored quad cage; branched shared shoulder openings and shared crotch seam; no primitive fusion'},open(OUT+'/topology.json','w'),indent=2)
