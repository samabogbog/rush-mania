# ชุดเผยแพร่ Lv40/Lv50 และ UI ตัวละคร

เตรียมเผยแพร่บน Vercel โปรเจกต์เดิม `rush-mania` (`prj_MI0GwaY5hQJCqNNJ1WWxY1OVhYqM`), ทีม `samabogbogs-projects` (`team_mO25qw2ArU5QTN5aAxCw3QPI`), production `https://rush-mania.vercel.app` จาก branch `mossvale-latest` ฐานเดิม `e2f1da6d9124cfe09c2070a4dcb9f86545904732` ตรวจ Vercel ยืนยัน baseline นี้ก่อนเริ่ม

ชุด source ประกอบด้วย VFX Lv40 ทั้งหก, VFX Lv50 ทั้งหกที่ตรวจเทียบภาพไอคอน v4 และคำอธิบายจริง, HP/MP/ATK/DEF แสดงค่ารวมและค่าเพิ่มภายนอกเป็นจำนวนเต็ม และ tooltip/item details อยู่เหนือ hotbar ไม่มีการเปลี่ยน API, config balance, migration, env หรือบัญชีและข้อมูลผู้เล่น

## การตรวจรับก่อนเผยแพร่

- Build ผ่านบน Node24.19.0 พร้อมคำเตือน chunk ขนาดใหญ่เดิม
- โค้ด/authority/choreography/pool และ inventory UI 37 รายการ พร้อม browser Lv50 9 รายการ รวม 46 รายการบน runtime ที่หยุดแก้รอบสุดท้าย
- Preview เปรียบเทียบ Lv40/Lv50 Low/High 84 เฟรม และการร่ายจริงที่เรียนครบหกสกิล: MP ลด cooldown เริ่ม kill เพิ่ม และ active VFX คืนศูนย์ ไม่มี model/page errors
- Runtime SHA256 หลังปรับตามไอคอน: `384b83d896079b92c149b8b1ef09cb48604a3d38bd99261653202bc5d93ad52f`
- UI source digest คงเดิมจากการตรวจหน้าสถานะและ overlay ทั้งสามอาชีพ/มือถือก่อนหน้านี้; inventory UI ตรวจซ้ำรอบเผยแพร่
- เปิดดูหลักฐานภาพ Low/High และ motion จากวิดีโอจริงก่อนอนุมัติขอบเขตงานภาพสกิลสำหรับเผยแพร่

รายละเอียด: `docs/LV40-VFX-TH.md`, `docs/LV50-VFX-TH.md`, `artifacts/lv50-vfx/ICON-AUDIT-TH.md`, `artifacts/lv50-vfx/validation.json` และ review ของทั้งสามงาน รายงานก่อนหน้าที่ระบุว่ายังไม่ deploy เป็นสถานะขณะทดสอบงานนั้น ไม่ใช่สถานะ release นี้

## ข้อจำกัด

การตรวจ browser ใช้ Chromium151 ANGLE SwiftShader ไม่ใช่ FPS เครื่องผู้เล่น เป้าหมาย desktop60/mobile30 ยังไม่ได้วัดบนอุปกรณ์จริง คลื่น 9.2 หน่วยเป็นภาพตกแต่ง ไม่เพิ่มรัศมีดาเมจ และเอฟเฟกต์ใหญ่บังเป้าหมายได้ชั่วครู่เมื่อซูมใกล้ ไม่มีการรับรองคะแนนงานภาพทั้งเกม

สถานะ deployment จริงและ commit ที่เผยแพร่ต้องตรวจจาก Vercel หลัง push/build เป็น READY พร้อมตรวจหน้าเว็บและ `/api/auth/status` อีกครั้ง ไม่ถือว่ารายงานนี้เป็นหลักฐาน deploy สำเร็จโดยตัวมันเอง
