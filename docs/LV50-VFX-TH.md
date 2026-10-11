# VFX สกิล Lv50

ปรับครบ 6 สกิลโดยใช้ Lv40 เป็นฐาน เปลี่ยนภาพหลักเฉพาะสายและเพิ่มคลื่นตกแต่งจากรัศมี 7.8 เป็น 9.2 หน่วย ชั้นภาพหลักอยู่ประมาณ 0.6–0.7 วินาที คลื่นสะท้อนท้ายจางหมดภายใน 0.98 วินาที รัศมีนี้เป็นภาพตกแต่ง ไม่เปลี่ยนระยะดาเมจ

| อาชีพ/สาย | ภาพ Lv50 |
| --- | --- |
| Swordsman A: Second Wind Burst | ปีกคมดาบยกตัวสองข้าง ซุ้มพลัง และวงคลื่นตามหลัง |
| Swordsman B: Fortress Stance Crash | ซุ้มป้อมหนา หอคอยสี่ด้าน และมงกุฎทอง |
| Mage A: Vital Bloom Burst | ดอกบัวใบโค้งสองชั้น วงโคจรทอง และซุ้มกลีบ |
| Mage B: Living Shelter Crash | หลังคาใบไม้หลายชั้น ซุ้มโค้งใหญ่ มงกุฎและเสาราก |
| Archer A: Field Remedy Burst | ดาวหางสมุนไพรสามแนว ใบไม้ลอยหลายชั้น และดาวกระแทก |
| Archer B: Stalker Focus Strike | วงเล็งไขว้ จันทร์เสี้ยวยกสูง ดาวทอง และลูกศรเข้าจุดศูนย์กลาง |

ภาพสร้างจาก procedural mesh/material ใหม่ใน `src/render/skill-vfx.ts` ไม่มี assets ภายนอก ใช้โครงสร้างสามมิติ ไม่ใช้ billboard texture ปรับเฉพาะการแสดงผล ไม่เปลี่ยนดาเมจ MP cooldown ระยะโจมตี เซฟ หรือ server authority ชื่อสกิลที่เกี่ยวกับฟื้นฟู/ป้องกันยังใช้พฤติกรรมโจมตีพื้นที่เดิมของเกม

## การตรวจรับ

เจ้าของ runtime หยุดแก้ก่อน build และ browser QA รอบสุดท้าย Build ผ่าน การตรวจโค้ดและ inventory UI 37 รายการและ browser 9 รายการผ่าน รวม 46 รายการ นับเฉพาะ runtime รอบสุดท้าย

ภาพเปรียบเทียบ Lv40/Lv50 ใช้มุมกล้องเดียวกันครบสามอาชีพ สองสาย Low/High รวม 84 เฟรม พร้อมคลิปปล่อยเอฟเฟกต์ต่อเนื่อง แยกจากการเล่น practice จริงซึ่งเรียนสกิล rank1 ผ่าน UI เดินไปกลุ่มมอนสเตอร์แล้วร่ายครบหกสกิล ยืนยัน MP ลด cooldown เริ่ม kill เพิ่ม และ active VFX กลับเป็นศูนย์ ไม่มี model/page error

เพดานเดิม: Low 40 / High 96 active และ pool 160 ตรวจการร่ายทับซ้ำ การคืน pool และ disposal ด้วย NullEngine รายงาน frame p50/p95, draw calls และ mesh/material เทียบ idle/impact อยู่ใน `artifacts/lv50-vfx/REVIEW.md` และ `validation.json`

ทดสอบบน Debian13 x86_64, Node24.19.0, Chromium151 ANGLE SwiftShader ค่าการเรนเดอร์แบบ software ใช้เทียบในเครื่องเดียวกัน ไม่ใช่ FPS เครื่องผู้เล่น เป้าหมาย desktop60/mobile30 ยังไม่ได้วัดบนอุปกรณ์จริง มงกุฎขนาดใหญ่บังเป้าหมายได้ชั่วครู่เมื่อซูมใกล้ ก่อนคลื่นขยายและจางลง การอนุมัติจำกัดงานภาพ Lv50 สำหรับตรวจโดยผู้ใช้ ไม่ใช่คะแนน 8–9 ของทั้งเกม

## เปิดหลักฐานและตรวจซ้ำ

- `artifacts/lv50-vfx/lv50-high-six-skills.png` และ `lv50-low-six-skills.png`: ภาพหลักทั้งหก
- `*-comparison.png`: เทียบ Lv40 กับ Lv50
- `*-preview-motion.png`: ภาพตามเวลาจากคลิป preview
- `*-gameplay-motion.png`, `*-real-cast.png`, `*-recovered.png`: การร่ายจริงและคืนท่า
- `validation.json`: digest runtime ผลการร่ายและข้อมูล performance
- WebM เก็บใน workspace และไม่รวมใน Git

```sh
npm run build
npx playwright test tests/lv50-vfx.spec.ts tests/lv40-vfx.spec.ts tests/lv30-vfx.spec.ts tests/lv20-vfx.spec.ts tests/lv10-vfx.spec.ts tests/skill-vfx.spec.ts tests/skill-choreography.spec.ts tests/skill-ranks.spec.ts tests/online-authority.spec.ts tests/inventory-ui.spec.ts --reporter=line --max-failures=1
npx playwright test tests/lv50-vfx-browser.spec.ts --reporter=line --max-failures=1
```

Browser QA ต้องมี Vite localhost5173 และ API localhost8787 พร้อม proxy และหยุดแก้ runtime ระหว่างตรวจ สถานะเผยแพร่บันทึกแยกใน `docs/RELEASE-LV50-TH.md` หลังการตรวจรับ

ตรวจภาพไอคอน v4 จริงครบหกภาพและปรับสี/องค์ประกอบที่ไม่ตรง รายละเอียดอยู่ใน `artifacts/lv50-vfx/ICON-AUDIT-TH.md`
