# VFX สกิล Lv70

ตรวจไอคอน v4 จริงและ description ทั้งหกสกิลก่อนออกแบบ ดูตารางและภาพใน artifacts/lv70-vfx/ICON-AUDIT-TH.md และ icon-reference.png

ใช้ Lv60 เป็นฐาน: รูปทรงหลัก 0.78 วินาที รัศมีคลื่นตกแต่ง 10.8 หน่วย จบ 1.22 วินาที Lv70 เพิ่มรูปทรงหลักเป็น 0.96 วินาที รัศมี 12.6 หน่วย และคลื่นตามหลังจบ 1.54 วินาที ทั้งหกมีรูปทรงเฉพาะตามไอคอน ไม่ได้เพิ่มรัศมีดาเมจจริง

| สกิล | แนวทางภาพ |
| --- | --- |
| Cleave | คมดาบแดงขาวกวาดหลายชั้นจากผู้ร่าย |
| Battle Renewal Burst | พายุดาบฟ้าพุ่งขึ้นพร้อมหินกระแทก |
| Blizzard | พายุผลึกน้ำแข็งฟ้า พุ่งจากด้านบนสู่พื้นที่เป้าหมาย |
| Verdant Renewal Burst | วังวนใบไม้เขียวและพลังเวทขยายจากจุดกระแทก |
| Piercing Volley | ลูกศรเงินหลายแนวกับประกายทะลวงสีฟ้า |
| Camouflage Guard Crash | กรอบป้องกันใบไม้สีเขียวแตกเป็นคลื่นกระแทก |

งานแสดงผลเท่านั้น: ไม่เปลี่ยน ranked damage, MP, cooldown, slow, ระยะ, save/schema หรือ server authority เวลาร่ายและคืนท่าสามเท่ายังใช้ร่วมกันตามเดิม ชื่อ Renewal/Guard ไม่ได้ทำให้เกิด heal หรือ stealth

ขีดจำกัด Low40/High96 และ pool160 คงเดิม จัดองค์ประกอบหลักก่อนเศษตกแต่ง Low จึงรักษารูปทรงสำคัญ งานภาพใช้ procedural mesh/material ต้นฉบับ ไม่มี asset ภายนอกเพิ่ม

การตรวจรับเปรียบเทียบ Lv60/Lv70 ทั้งสองสาย Low/High ในกล้องเดียวกัน แยก render-only preview จากการเรียนและร่าย rank1 ผ่าน UI จริง ตรวจ input ด้วยผลที่สังเกตได้: hotbar/unlock, เส้นทางและตำแหน่ง, MP/cooldown/kill, release cue และ motion, effect กลับศูนย์ Blizzard ต้องยังปล่อยภาพหลัง HP ลดระหว่างร่าย รักษาการแก้ lifecycle จาก Lv60

ผลตรวจรับรอบสุดท้ายบันทึกใน validation.json และ REVIEW.md พร้อมภาพและ motion sheets ข้อมูล Chromium ANGLE SwiftShader เป็น software renderer ใช้เปรียบเทียบภายในเครื่องเดียวกัน ไม่รับรองเป้าหมาย FPS desktop60/mobile30 หรือคะแนนภาพทั้งเกม

Build ผ่านและ 57 checks ผ่าน (48 code/authority/timing/pool, 9 browser) ตรวจภาพเทียบ 96 เฟรมและ motion sheets ทั้งหมด ยืนยันการเรียนและออกผลจริงครบหกสกิล effect กลับศูนย์ ไม่มี model/page error Blizzard บันทึก HP ลดระหว่างร่ายและยังเห็น release ครบ อนุมัติขอบเขต VFX Lv70 เพื่อเผยแพร่และให้ผู้เล่นตรวจต่อ
