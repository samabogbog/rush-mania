import bpy,math,os
from mathutils import Vector
base='/workspace/rush-mania/art/vendor-candidates'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for i,name in enumerate(['Knight','Mage','Rogue']):
 before=set(bpy.data.objects)
 bpy.ops.import_scene.gltf(filepath=f'{base}/kaykit-adventurers/addons/kaykit_character_pack_adventures/Characters/gltf/{name}.glb')
 obs=set(bpy.data.objects)-before
 roots=[o for o in obs if o.parent is None]
 for o in roots:o.location.x+=(i-1)*3
 for o in obs:
  if o.type=='MESH' and not any(m.type=='ARMATURE' for m in o.modifiers):
   keep={'Knight':['Knight_Helmet','Knight_Cape','1H_Sword','Badge_Shield'],'Mage':['Mage_Hat','Mage_Cape','2H_Staff'],'Rogue':['Rogue_Hood','Rogue_Cape','2H_Crossbow']}
   o.hide_render=o.name.split('.')[0] not in keep[name]
  if o.type=='ARMATURE':
   o.animation_data.action=None
   for tr in o.animation_data.nla_tracks:tr.mute=True
   acts=[a for a in bpy.data.actions if a.name.startswith('Idle')]
   if acts:o.animation_data.action=acts[-1]
scene=bpy.context.scene;scene.frame_set(1)
bpy.ops.mesh.primitive_plane_add(size=200);bpy.context.object.location.z=-.015
mat=bpy.data.materials.new('Ground');mat.diffuse_color=(.07,.085,.11,1);bpy.context.object.data.materials.append(mat)
bpy.ops.object.camera_add(location=(7,-14,8));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,1.1))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=10;scene.camera=cam
for loc,power,size in [((1,-6,9),1700,7),((-5,3,6),1200,5)]:
 bpy.ops.object.light_add(type='AREA',location=loc);bpy.context.object.data.energy=power;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=size;bpy.context.object.rotation_euler=(Vector((0,0,1))-bpy.context.object.location).to_track_quat('-Z','Y').to_euler()
scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=False;scene.render.resolution_x=1500;scene.render.resolution_y=750;scene.render.resolution_percentage=100
scene.world.color=(.2,.2,.2);scene.view_settings.view_transform='Standard';scene.render.filepath=base+'/kaykit-contact-sheet.png';bpy.ops.render.render(write_still=True)
