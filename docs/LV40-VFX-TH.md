# VFX สกิล Lv40 ทั้ง 6 สกิล

ฐานงาน: branch `mossvale-latest`, commit `e2f1da6d9124cfe09c2070a4dcb9f86545904732` ซึ่งผู้ใช้ยืนยันว่า deploy แล้ว อ่าน `docs/PRODUCTION-RULES.md` ก่อนแก้ แยกเจ้าของ runtime กับ QA และหยุดแก้ runtime ระหว่าง build/บันทึกหลักฐาน

| อาชีพ | สกิล | เอฟเฟกต์ใหม่ |
| --- | --- | --- |
| Swordsman | Shield Bash | โล่และคมกระแทกแบบมีทิศทาง ตามด้วยเสากระแทกและเศษหิน |
| Swordsman | Sweeping Challenge | มงกุฎคมดาบหกวงหมุนสวนกัน พร้อมเกลียวกลางและรัศมีพุ่งสามทิศ |
| Mage | Lightning | สายฟ้าหลักแตกแขนง สายฟ้ารองสามจุดลงเหลื่อมเวลา และวงพลังบนอากาศ |
| Mage | Thorn Burst | ต้นไม้กลางสนาม หอหนามหกด้านและกลีบใบเปิดด้านบน |
| Archer | Pinning Shot | ลูกศรขนาดใหญ่ในตราวงเอียง พร้อมลำแสงปักเข้าจุดกระแทก |
| Archer | Herbal Tonic Burst | น้ำพุพลังพืชพุ่งขึ้น เกลียวและกลีบใบหกทิศ |

Lv40 ปล่อยผลกระแทกทันทีตาม callback เดิม คลื่นตกแต่งสามวงขยายถึงรัศมี 7.8 หน่วย (Lv30: 6.6) มีชั้นหลักราว 0.44 วินาที (Lv30: 0.32) และส่วนหางถึง 0.85 วินาที รูปทรงหลักครบทั้ง low/high; high เพิ่มรายละเอียดรอบนอก ห้ามตีความขนาดคลื่นตกแต่งเป็นระยะโจมตีใหม่

ไฟล์ runtime ที่แก้มีเพียง `src/render/skill-vfx.ts` ไม่แก้ skill definitions, ดาเมจ, ระยะ, cooldown, schema เซฟ, server authority หรือบัญชีผู้เล่น ใช้ geometry/material procedural ของโครงการเดิม ไม่เพิ่ม assets ภายนอก, textures, sprites หรือ billboards เพดานเดิม: active 40 low / 96 high, mesh pool 160

## หลักฐานและวิธีตรวจ

หลักฐานอยู่ที่ `artifacts/lv40-vfx/`: `lv40-six-skills.png`, ภาพเทียบแต่ละอาชีพ, high/low ที่ 80/240/560 ms, JSON การร่ายจริง และภาพ motion ที่สุ่มจากวิดีโอ WebM วิดีโอฉบับเต็มอยู่ใน workspace แต่ไม่รวมใน Git เช่นเดียวกับรอบ Lv30

- Render-only fixture: โมเดลตัวละครจริง โหลดสำเร็จครบก่อน capture, modelErrors = 0 เปรียบเทียบ Lv30/Lv40 ในมุมกล้องเดียวกัน ไม่เปลี่ยน Simulation state
- Gameplay fixture: practice mode, ตัวละคร Lv100 rank1 เพื่อรักษาความปลอดภัยของการบันทึก ใช้เซฟที่มี prerequisite Lv10–Lv30 แล้วเรียน Lv40 ผ่าน UI กด K เปิดสกิล, M เลือกจุดเดินบนแผนที่, D ยกเลิกปลายทางหลังเดินถึง และ 1 ร่ายสกิล ตรวจตำแหน่งเดิน, การเรียน, MP, cooldown, kills และการคืน active VFX เป็นศูนย์ ผลนี้แยกจาก render-only preview
- ตรวจทั้ง low/high ใน render fixture; gameplay ทั้งหกใช้ low ตรวจ regression Lv10/Lv20/Lv30, การซ้อน cast, pool reuse, disposal, skill ranks/เซฟ และ server-authoritative commands ด้วยชุดตรวจโค้ด
- ก่อน browser QA หน้าเว็บ `/` และ API `/api/auth/status` ตอบ HTTP200 ใช้ API/SQLite ในเครื่องเท่านั้น ไม่มีการเขียนฐานข้อมูล production
- `validation.json` รวมข้อมูล idle/impact frame p50/p95, draw calls, scene meshes, active effect count และ materials จาก render fixture ภาพ impact ถูก freeze ขณะเก็บค่าจึงเป็นค่า render cost เปรียบเทียบ ไม่ใช่ benchmark gameplay เต็มฉาก

`npm run build` ผ่าน (มีคำเตือน chunk ขนาดใหญ่เช่นเดิม) ชุดตรวจที่ผ่านและครอบคลุม runtime รอบนี้มี 41 ข้อไม่ซ้ำ รวม 32 ข้อฝั่งโค้ดและ 9 ข้อใน browser โดยแยกการรันทวนเพื่อปรับคุณภาพหลักฐานออกจากจำนวนข้อ

รันใหม่ได้ด้วย `npm ci`, `npm run dev`, `npm run dev:server` และ `npx playwright test tests/lv40-vfx.spec.ts tests/lv40-vfx-browser.spec.ts` ใช้ Chromium ระบบหรือ `PLAYWRIGHT_CHROMIUM_PATH` และติดตั้ง FFmpeg ของ Playwright/จัดเตรียม executable ให้ recorder ใช้งานได้

## ขอบเขตการยืนยัน

สภาพแวดล้อมตรวจคือ headless Chromium ANGLE SwiftShader (software renderer) ค่าที่วัดไม่ใช่ FPS เครื่องผู้เล่น และยังไม่ยืนยันเป้าหมาย desktop 60 FPS / mobile 30 FPS ไม่มีการให้คะแนนศิลป์รวม 8–9 จาก test count ขอบเขตนี้ประเมินเฉพาะ VFX Lv40 เทียบ Lv30 ตามภาพ/คลิปที่ดูจริง

เอฟเฟกต์สูงอาจยื่นพ้นกรอบภาพเมื่อซูมใกล้ โดยเฉพาะ Lightning; preview ใช้กล้องกว้างเพื่อเห็นรูปทรงทั้งหมด ภาพ gameplay เก็บจากกล้องเกมจริง เอฟเฟกต์หนาอาจบังเป้าหมายชั่วครู่ช่วงกระแทก ก่อนเปิดพื้นที่ด้วยคลื่นช่วงท้าย

รอบแรกของ fixture พบ dependency optimization ของ Vite เปลี่ยน URL shader และโมเดลโหลดไม่สำเร็จ จึงไม่นับหลักฐานรอบนั้น หลัง warm dependency ได้โหลดโมเดลครบและบันทึกใหม่ ชุดทดสอบแก้การเดินเวลาของ VFX ให้เดินต่อหลัง animation recovery จบ และเก็บภาพหลังเอฟเฟกต์หมดเพื่อเห็นการคืนสภาพ

ยังไม่ได้ push หรือ deploy การเปลี่ยนแปลงนี้
