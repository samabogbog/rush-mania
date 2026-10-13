# เงานุ่มและสีสด

ผู้ใช้ขอคืนเงาต้นไม้/ตัวละคร ทำขอบเงาฟุ้งเหมือนแหล่งแสงใหญ่ และเพิ่มความสดของภาพ

สาเหตุที่ยืนยันจาก source เดิม `b3571142acd0ae029ffe14a5db3009b6f3454069`: Low/autoReduced ปิด scene.shadowsEnabled ทั้งฉาก ส่วน High มี caster ครบแต่ blurred close ESM จางมาก เมื่อทดลองขยาย kernel ยิ่งเกิดการเฉลี่ย depth ของฉากว่างจนเงาเลือนหาย

การวินิจฉัยใช้ hook เฉพาะ response ของ test โดยไม่เพิ่ม debug controls ลง product: อ่าน shadow map Float32 ที่มีข้อมูลจริง min .045/max 1/caster ที่แสดง 135 และเทียบภาพเปิด/ปิด/เปลี่ยน filter เป็น hard เงาต้นไม้และตัวละครปรากฏชัดใน hard แต่ close ESM แทบไม่ต่างจาก off ภาพ diagnostic ไม่ใช่ภาพผลส่งมอบ และไม่ถือการเปิด flags เพียงอย่างเดียวว่าคืนเงาสำเร็จ

กำหนดให้ทุกโหมดเก็บ live shadows ลดเพียงขนาด map/จำนวนตัวอย่าง การทำเงานุ่มด้วย contact-hardening ใช้ขนาดแหล่งแสงในหน่วย UV ของ shadow map มิใช่การเพิ่มลูกบอลดวงอาทิตย์ที่มองเห็นในฉาก ต้องเปิดดูภาพต้นไม้และตัวละครที่เดินจริง รวมถึง fallback/Low/Auto และตรวจว่าไม่มี error

ความสดปรับเฉพาะ palette/material ของ renderer ได้แก่ หญ้า ใบไม้ ดินเผา น้ำ ไม่เปลี่ยนสูตรเกม เซฟ คูลดาวน์ ดรอป และ source สกิล VFX การตรวจ resource ใช้ Chromium SwiftShader ไม่มีการรับรอง FPS เครื่องผู้เล่น

ผลตรวจและค่าที่ส่งมอบจะบันทึกหลัง runtime READY/FROZEN และผ่านภาพจริง

## ส่งมอบและตรวจรับ

ใช้ PCSS/contact-hardening จริงเมื่อ engine รองรับ shadow comparison samplers ตั้ง source size UV = .06; low/autoReduced ใช้ 16 blocker + 16 PCF, auto/high 16 blocker + 32 PCF ขนาด map 512/1024/2048 ตามลำดับ เงา live ไม่ถูกปิดใน Low หรือเมื่อ Auto ลดคุณภาพ

อุปกรณ์ที่ไม่รองรับใช้ true blurred exponential shadow map (filter ID 3), depth scale 20, kernel 6/12/24 และ blurScale 2 หลีกเลี่ยง close ESM และ hard Poisson fallback ตรวจด้วย Chromium ที่ปิด WebGL2 จริง ได้ WebGL1 และ filter3 พร้อมเงาต้นไม้/ตัวละครที่ปรากฏในภาพ

สีหญ้า/ใบไม้เพิ่ม chroma เป็นเขียวสดขึ้น หลังคาสีดินเผาอิ่มขึ้น และน้ำฟ้าอมเขียวชัดขึ้น ไม่ใช้ global grade เพื่อรักษาสี VFX และ HUD

Build สำเร็จ ตรวจ source ชุดสุดท้าย 6 code checks + 7 browser checks รวม13 ผ่าน: geometry/collision/monstersV3/save migration, High/Low/AutoReduced, หน้าจอ390×844, quality switchesไม่สะสมtexture/mesh, WebGL1 fallback, การเดิน/เลือกเป้าหมาย/ร่ายสกิลจริง MP852→827และkills0→1 มีภาพก่อน–หลังและวิดีโอ52.44วินาทีใน `artifacts/soft-shadows` ผู้ควบคุมเปิดดูภาพเงาจริงทุกโหมดและเฟรมวิดีโอแล้ว ไม่ใช้การเปิดflagอย่างเดียวเป็นหลักฐานคืนเงา

ภาพ fallbackมีpenumbraกว้างแบบGaussian ส่วนPCSSคำนวณตามระยะblockerจึงมี contact แน่นใกล้เท้าและขอบฟุ้งเมื่อห่างพื้น Source UVเป็นพารามิเตอร์การสุ่มในshadow map ไม่ใช่ขนาดดวงอาทิตย์ในหน่วยเมตร ไม่มีการรับรองFPS60/30ของเครื่องผู้เล่นจากSwiftShader
