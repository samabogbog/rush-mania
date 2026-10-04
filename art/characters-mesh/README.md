# Continuous hero candidate — REJECTED, NOT SHIPPED

Authored source: `tools/author-mesh-characters.py`. Blender source and GLB remain isolated here until controller approval. This first candidate is **unrigged**, with no animation claims.

The skin is one explicitly authored connected quad control cage. Shoulder quads are omitted and their exact shared vertices are extended into shaped arms/hands; the pelvis boundary splits on a shared crotch vertex into two shaped legs. The head, cheek, chin, neck and torso rings are the same mesh. Subdivision smooths the authored topology. No primitive merging, voxel fusion or remeshing is used. Eyes are meaningful separate surfaces; tunic, boots, hair, face details and weapon are separate authored parts.

Candidate source uses Blender Z-up and faces -Y; GLB export converts to Y-up / +Z forward. Feet are slightly above origin in this first studio candidate and total height ~2.9 source units. Final approval would require scale to ~1.8m, ground offset, rig, exact eleven Motion clips and attachment bone names.

Not a delivered 8–9 quality score: inspect the actual front/side/three-quarter images before deciding whether to refine or reject. Materials are simple PBR colors. Hair lacks texture-level detail, blade is a simple stylized silhouette, and this draft has no finger articulation.

## Controller decision

Controller reviewed the actual front render and rejected this candidate at approximately 5–6/10. This authored exploration is frozen. No rig, animation clips, runtime or public assets were changed. Use the approved free CC0 fallback for production integration.

Measured GLB: 13,646 vertices, 28 meshes, 9 materials. Authored body control cage: 357 vertices / 343 faces, one connected component, zero boundary edges and zero nonmanifold edges. `body-topology.png` is a projection of actual source cage vertices/edges, not a beauty render. Remaining shortcomings include pinched shoulders, weak arm/hand anatomy, thigh topology twisting, simplistic clothing/hair and lack of fingers.
