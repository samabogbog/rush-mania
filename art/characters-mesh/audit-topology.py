import bpy,json
bpy.ops.wm.open_mainfile(filepath='/workspace/rush-mania/art/characters-mesh/swordsman-candidate.blend')
o=bpy.data.objects['Hero continuous body authored cage'];m=o.data;adj={i:set() for i in range(len(m.vertices))}
for e in m.edges:a,b=e.vertices;adj[a].add(b);adj[b].add(a)
seen=set();todo=[0]
while todo:
 a=todo.pop()
 if a not in seen:seen.add(a);todo.extend(adj[a]-seen)
uses={tuple(sorted(e.vertices)):0 for e in m.edges}
for p in m.polygons:
 for e in p.edge_keys:uses[tuple(sorted(e))]+=1
json.dump({'body_control_vertices':len(m.vertices),'body_control_faces':len(m.polygons),'body_connected_vertices':len(seen),'body_components':1 if len(seen)==len(m.vertices) else 'ERROR','boundary_edges':sum(n==1 for n in uses.values()),'nonmanifold_edges':sum(n>2 for n in uses.values()),'method':'Explicit shared-vertex branched quad cage; no primitive fusion','status':'unrigged rejected-for-target review candidate'},open('/workspace/rush-mania/art/characters-mesh/topology.json','w'),indent=2)

json.dump({'vertices':[list(v.co) for v in m.vertices],'edges':[list(e.vertices) for e in m.edges]},open('/workspace/rush-mania/art/characters-mesh/body-cage.json','w'))
