# ใช้สกิลทีละสกิล

ก่อนแก้ `castSkill` ตรวจเฉพาะช่วง cast แต่สกิลออกผลทันทีไม่มี cast ค้างไว้ ออโต้จึงเริ่มสกิลถัดไปใน tick ถัดมา และ normal hit เขียนทับ actionTime ทำให้ช่วงคืนท่าของสกิลสั้นลง

แก้ที่ `src/simulation.ts` ใช้ actionTime ที่ส่งใน snapshot เดิมเป็นตัวล็อก ทั้งการกดเองและออโต้จะเริ่มสกิลใหม่ได้เมื่อ cast จบและ actionTime เป็นศูนย์ การโจมตีปกติและการไล่เป้าหมายรอช่วงคืนท่าด้วย ช่วงคืนท่าตรงกับการแสดงผลตาม stage: 0.372–0.48 วินาทีหลังออกผล นอกเหนือจาก cast ของสกิลนั้น การเดินด้วย input ยังขัดจังหวะ cast ตามกติกาเดิม

ออโต้วน hotbar ตาม cursor เดิม ข้ามช่องว่าง สกิลไม่ได้เรียน สกิล cooldown และ MP ไม่พอ การกดระหว่างติดล็อกไม่หัก MP และไม่เริ่ม cooldown สกิลอื่น AoE และ poison hit ไม่เขียนทับหรือเริ่มช่วงคืนท่าใหม่ ทุกคนใช้ Simulation ร่วมกัน จึงบังคับฝั่งเซิร์ฟเวอร์ด้วย ไม่ใช่แค่ปุ่มใน UI

ไม่เปลี่ยนดาเมจ ระยะ MP cost cooldown รายสกิล เซฟ schema หรือ protocol ใช้ actionTime เดิมที่ capture/hydrate อยู่แล้ว Pause หยุด timer, death/travel ล้าง timer เอฟเฟกต์ตกแต่งที่กำลังจางอาจยังอยู่หลังท่าจบ แต่ไม่ใช่การเริ่ม action หลายสกิลพร้อมกัน

## ตรวจรับ

Build ผ่าน; 56 checks ผ่านบน runtime ที่หยุดแก้: 34 simulation/auto/rank/authority/choreography checks, 20 realtime/API native Node package checks และ browser desktop/mobile สองรายการ

- Auto ทั้งสามอาชีพพร้อมสกิลหกช่อง ใช้ตามลำดับพร้อมช่วง cast/recovery ครบ
- ส่งหกคำสั่งใน packet เดียว ฝั่ง authoritative ยอมรับเพียงสกิลแรก ร้องขอระหว่าง recovery ไม่เสีย MP/cooldown ใหม่ และยอมรับสกิลถัดไปหลัง recovery
- Cast completion ไม่เริ่มสกิลที่สองหรือโจมตีปกติใน tick ออกผลเดียวกัน
- AoE/poison ไม่ลดหรือเริ่ม actionTime ใหม่; pause คงเวลาที่เหลือ
- Browser ใช้ touch Auto จริง ยืนยันช่วงที่มี cooldown เพียงสกิลแรกก่อนมีสองสกิล โดยสกิลที่สองเริ่มหลังสกิลแรก 0.475 วินาทีใน simulation; MP ลด kill เพิ่ม ตำแหน่งคงเดิม และ cooldown ลดต่อเนื่อง
- แก้ fixture unit ให้โหลด network UI ที่ติดตั้ง DOM listener ได้ และอัปเดต assertion save migration จาก v8 ที่เก่าเป็น v10 ที่ runtime เดิมใช้อยู่แล้ว ไม่มีการเปลี่ยน version เซฟใน implementation

หลักฐาน `artifacts/sequential-skills/mobile-auto-timeline.json`, `evidence.json` และภาพ desktop/mobile ใช้ Chromium151 ANGLE SwiftShader ไม่ใช่ FPS เครื่องผู้เล่น

Runtime SHA256: `c6c3f3609ef8fb6656cb3721c126b809febcd63b4893bccf5288958ddb3173fc`

```sh
npm run build
npx playwright test tests/sequential-skills.spec.ts tests/mobile-input-auto.spec.ts tests/skill-ranks.spec.ts tests/skill-paths.spec.ts tests/online-authority.spec.ts tests/skill-choreography.spec.ts --reporter=line --max-failures=1
npx playwright test tests/vercel-node-package.spec.ts tests/realtime-server.spec.ts --reporter=line --max-failures=1
npx playwright test tests/mobile-joystick-auto.spec.ts --reporter=line --max-failures=1
```
