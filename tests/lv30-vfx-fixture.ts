// Independent render-only fixture with draw-call instrumentation.
import {SceneInstrumentation} from '@babylonjs/core/Instrumentation/sceneInstrumentation.js';
import './lv10-vfx-fixture';
const review=(window as any).review;
const instrumentation=new SceneInstrumentation(review.scene);
review.drawCalls=()=>instrumentation.drawCallsCounter.current;
