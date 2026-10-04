# Dynamic skill motion and volumetric VFX review

Status: final runtime frozen; production build and 20 targeted tests passed. Root has inspected and accepted the requested Sword/Mage/Archer visual scope. All requested final build, targeted, gameplay, performance/pool and cancellation/loaded zone checks have passed; the final bounded residual VFX settling observation also passed. Publication has not occurred.

QA owns tests/dynamic-skills*.spec.ts, this report, artifacts/dynamic-skills. Runtime changes belong to motion and VFX owners.

Input verified from src/main.ts and src/world.ts: WASD moves (W decreases z, D increases x); Tab selects nearest monster; keys 1–6 activate learned hotbar skills; K opens skill tree; Escape closes; left click selects monsters or moves to ground. Real tests learn all ten stages through the tree and assign through actual UI. Level-100 offline saves are seeded for repeatability; no live account or authority schema is changed.

Gameplay acceptance: each of six class/branch combinations at low and high quality, stage 1 and stage 10, checks learned id, MP decrease, cooldown acceptance, authored cast total where applicable, target HP/kills or support HP/buff UI, eventual motion recovery, and observed WASD movement after recovery. Visual previews are reported separately from real learned combat.

Current final freeze: build and 20 targeted checks passed; local page/API readiness confirmed; Archer all20 preview, continuous motion, grounding and interruption resets passed. Sword/Mage visual samples remain previously accepted carried evidence. All three remaining genuine learned gameplay cases and final sustained pools, comparative idle/burst timing, cancellation and loaded zone reset have passed.

All browser performance numbers will be labeled ANGLE SwiftShader software renderer, not player hardware FPS. Root must open image/video evidence before approval. No 8–9 art score is inferred from unit tests or geometry counts.

## Review iterations (not final acceptance)

The first frozen build passed 17 targeted unit tests (VFX including timing, choreography, EXP preservation) and the three-hero 15-alias provenance check. Ten genuine class/branch/quality gameplay cases completed, one weak-target fixture race needed correction, and the last high archer case was interrupted before casting. Existing screenshots/videos prove their observed MP/cooldown/cast/damage/support states; they are explicitly pre-correction evidence.

Root inspected the actual mage movie and identified a long anticipation hold after a short nonloop source clip. Owner corrected anticipation looping and frozen-to-live same-skill restart. That second build again passed 17 targeted units and the 15-alias check. The isolated QA fixture initially mixed raw Babylon module registries with Vite dependency modules; it was repaired as a canonical Vite TypeScript fixture. One dependency optimization readiness timeout and cached-bone sampling were fixture issues. Follow-up motion sampling now reads linked glTF joint TransformNodes local transforms (excluding the actor/pivot) and samples actual visual progress rather than assuming wall time equals simulation time.

The swordsman 20-skill high/low geometry preview completed, with 80 keyframes and reset checks. Root opened the contact sheet and rejected visible striped self-blending and oversized overlapping crescents. Browser QA was stopped and confirmed closed before the VFX owner corrective material/geometry work. This rejected visual pass is not approval. Its raw proof remains local for comparison.

## Historical Archer landing diagnostic (2026-10-04, superseded)

After the latest landing transition fix, both Archer stage-10 branches pass visible skinned body/feet and rigid `2H_Crossbow` world-space minimum y >= -0.05 at frozen progress .68/.72/.76/.80/.84/.90/1. The faithful continuous preview passes sampled active release thresholds; post-release idle fails with crossbow minimum y approximately -0.342. A separate fresh actor, before any skill, also reaches approximately -0.342 after one second of the authored idle. This isolates the remaining problem to Archer idle rather than skill displacement. The crossbow has no skeleton and is parented to `archer-handslot.r`; QA reads its raw position vertices and transforms them once by its world matrix. Low side images show the weapon crossing the ground plane.

The diagnostic was observed before the final fix. The named `archer-grounding-final.json`, `archer-idle-baseline.json`, `ground-fresh-idle-one-second.png`, and `ground-archer-10-post-idle.png` in `artifacts/dynamic-skills` have since been overwritten with passing final evidence and no longer substantiate the historical negative bounds. Frozen images have exact requested progress. Live records include actual simulation progress; the short .48-second release may cross multiple requested thresholds in one rendered frame. Live screenshots taken after a browser round trip are illustrative and are not exact progress evidence. The fixture now leaves live blending defaults to runtime and captures live threshold records inside one browser RAF loop.

Runtime ownership remains with the motion owner; QA has not edited runtime. At that diagnostic point full final build/gameplay/performance captures waited for the narrow idle and blend-lifetime fix; it is now frozen and validated as below. Previously accepted Sword/Mage visual sheets remain carried evidence, not reruns on this final runtime.


## Final frozen runtime validation (2026-10-04)

Archer idle now holds the final frame of the authored aiming animation, including fresh attachment. Blend suppression applies only to the selected aiming transition and restores ordinary defaults on the next motion transition. No actor lift, weapon hiding, GLB rebuild, damage rule, or save schema change was used. Final grounding and fresh idle tests passed; the run/basic attack to idle check also passed. Both branches at frozen .68/.72/.76/.80/.84/.90/1 and sampled live thresholds keep visible rigid crossbow and feet at y >= -0.05. Earlier diagnostic negative idle bounds are historical, superseded by the current files.

The production command `npm run build` passed (TypeScript, Vite client, Worker bundle); Vite retains its ordinary large Babylon chunk warning. Final targeted checks: seven VFX tests, four choreography tests, eight EXP item/authority regression tests, and one three-character GLB provenance test: **20 passed**, including fifteen motion aliases for each character. Three Archer grounding/idle/transition checks are reported separately, not included in that unit total.

Current Archer render-only evidence has 80 high/low preview records covering all 20 skills, representative three-angle and eight-frame sequences, cancel/hurt/death/hidden pivot reset checks, zero model/page errors, maximum 24 active VFX and 39 pooled shapes. The continuous movie checks frozen-to-live restart and both branches at stages 1/4/7/10. Root opened the all20 contact, both frozen eight-frame strips, low side idle/landing images, and the actual recorded Sky Barrage flip-to-aim-to-ground strip and accepted this visual scope. Sword/Mage accepted sheets are carried evidence from their earlier frozen review, not rerun or added to the final Archer test count. Sixty skill recipes reuse authored source animation families; they are not sixty uniquely authored source clips.

`artifacts/dynamic-skills/final-runtime-sha256.txt` identifies the uncommitted final runtime and character assets. `artifacts/dynamic-skills/review/` is the curated review set; raw failure/blank clips remain outside that set. A transient execution transport reset terminated the local preview/API processes; the first missing-gameplay attempt failed before navigation. Those blank attempts provide no gameplay evidence. Local services were restarted and both `/` and `/api/game` returned HTTP 200 before the corrected attempt.

Visual limitation: Archer uses a static weapon-safe aiming hold while idle; this is a deliberate safe stance rather than a breathing idle loop.

Packaging: full raw JSON/video captures remain local. The source archive retains the compact `artifacts/dynamic-skills/review/final-evidence.json`, representative PNG strips/contact sheets and current stage10 gameplay screenshots, README and runtime SHA256 list; curated files currently total about 5.2 MB.


Final genuine gameplay on this runtime: Sword branch 1 low, Mage branch 0 high, Archer branch 1 high all passed learned stages 1/10, MP/cooldown/cast acceptance, damage/support result and post-recovery observed WASD movement. The earlier ten gameplay cases remain carried results and are not falsely counted as twelve final reruns.

The software renderer measurement/pool check passed: 30 frames per idle/burst sample at each actual quality, then all 60 skills repeated three times (180 per-preview semantic snapshots). Max pool 84, active VFX 26, VFX materials 31; previews preserve position, HP, MP, kills and cooldown state. Batching happens inside the browser between rendering frames and tests allocation bounds, not a real-time combat load benchmark.

| SwiftShader, 1440×900 | Idle p50/p95 ms | Burst p50/p95 ms | Idle/burst draw calls |
| --- | --- | --- | --- |
| Low | 297.2 / 379.5 | 296.9 / 338.3 | 31 / 34 |
| High | 784.8 / 866.9 | 788.8 / 809.4 | 60 / 64 |

These are same-environment software-renderer comparisons only. Desktop 60 FPS and mobile 30 FPS on real player hardware remain unverified. No art score or player FPS claim follows from this pass.

Genuine Mage stage10 cancellation passed: accepted remaining=1 second, MP 852→792, cooldown 28; actual D moved x by 1.1, canceled cast and local skill motion, and the accepted target HP did not change. Loaded town transition passed with no skill motion/poses, model errors zero and all models ready. Immediate cancellation retained three short-lived anticipation shapes; bounded fade-to-zero passed within the 10-second ceiling, with target HP still unchanged, and is not described as an immediate hard clear. One initial performance fixture timed out on the hidden native graphics select; it was corrected to the actual custom combobox. Placement attempts were QA fixture failures from dense moving monsters/boundary constraints, before any cancellation acceptance. Their rejected attempts are excluded from curated proof.

Final freeze: all requested checks complete, source/runtime SHA256 rechecked unchanged; compact evidence and this report are frozen for owner review/publication. No deployment was performed by QA. Full raw movies remain local; the curated source-package proof includes the compact summary, selected images and recorded motion strips.
