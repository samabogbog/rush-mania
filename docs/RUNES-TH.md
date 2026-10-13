# ระบบรูนในเกม

อัปเดตล่าสุด: รูนไม่รวมกองแล้ว ใช้ชิ้นจริงและ Save 12 รายละเอียดการย้ายเซฟ/รายการตลาดเก่าอยู่ใน [PHYSICAL-RUNES-TH.md](PHYSICAL-RUNES-TH.md) ผล QA ด้านล่างเป็นหลักฐานการส่งมอบระบบรูนครั้งแรก

เพิ่มรูน 10 ชนิด 5 rarity ตามแผน โดยค่าตายตัวถึง 3 ตำแหน่ง ไม่สุ่ม ไม่เพิ่มตามเลเวลอุปกรณ์หรือตีบวก

- Forge → Craft → Runes: เลือก rarity/รูนผลลัพธ์ แล้วเลือกวัตถุดิบ 4 ชนิดต่างกันเพื่อ Convert เป็นหนึ่งอัน rarity เดิม วัตถุดิบมีชนิดเดียวกับผลลัพธ์ได้
- ปุ่ม Upgrade ใช้รูนชนิดเดียวกัน rarity เดียวกัน 2 อัน → 1 อัน rarity ถัดไป สูงสุด Legend ทั้งสองสูตรฟรีและสำเร็จแน่นอน
- Forge → Runes: เลือกอุปกรณ์และช่อง แล้วเลือกรูนแต่ละชิ้นเพื่อฝังหรือเปลี่ยน ฟรีทุกครั้ง อุปกรณ์มี 2 ช่อง ต้องคนละชนิด ถอดคืน Bag ฟรี
- Bag มีตัวกรอง Runes และรายละเอียดอุปกรณ์แสดงทั้งสองช่อง ไอเท็มชื่อซ้ำยังเลือกด้วย ID ของชิ้นนั้น
- มอนสเตอร์ทั่วไปสุ่มแยก 10 ชนิด Common ด้วยโอกาส `(Lv+40)/250%` ต่อชนิด Boss/Mini Boss ไม่เพิ่มดรอปรูน ปาร์ตี้หมุนผู้รับตามระบบเดิม
- กระเป๋าเต็มต้องมีพื้นที่หลังหักวัตถุดิบและคืนรูนเก่า มิฉะนั้นปฏิเสธทั้งรายการ ต้องถอดรูนก่อนขาย/แยกอุปกรณ์ รูนไม่ถูกขายด้วย Sell all materials

ตารางค่าครบ 50 แบบอยู่ใน RUNE-SYSTEM-PLAN-TH.md

## การรักษาของเดิมและสถานะ

Save version 11 และ realm itemRevision 3 เติมช่องว่างสองช่องให้ gear เดิม โดยคง UUID/refine/secondary/rarity/การสวมใส่ ค่ารูนรวมหลัง normalize affix เดิมเพื่อไม่ตัด HP/MP ของรูน และ cache ตรวจช่อง/ชนิด/rarity รูนด้วย การ trade, market escrow, queued loot, checkpoint และ reconnect เก็บรูนครบ

Client ส่งเฉพาะชนิด/rarity/ช่องและไอเท็มเจ้าของ เซิร์ฟเวอร์คำนวณค่าและตรวจวัตถุดิบเอง ระบบ session sequence เดิมป้องกัน replay ทุกการคราฟ/ฝัง/ถอดสำเร็จมี ledger แบบไม่หักเงิน เพดานรวมการต่อสู้เดิมคงไว้

## หลักฐานตรวจ

- Build client + Worker ผ่าน
- 75 tests กติกา/authority/regression/persistent realm ผ่าน รวมทั้งทดสอบบันทึก SQLite แล้วเปิด realm ใหม่พร้อม replay คำสั่งฝัง/ถอด
- Browser 4 flows ผ่าน: คราฟ/อัป/ฝัง/ถอด/duplicate/reload, มือถือ 390×844 และ 360×740 พร้อม gear60+rune50 stacks, NetworkSimulation หน่วง HTTP response ที่เรียก realm.transact จริงเพื่อพิสูจน์ pending และไม่ส่งคำสั่งซ้ำ
- อีก 2 config regressions และ normal kill → ground loot → Collect ผ่าน รวม 82 unique tests บน source สุดท้าย
- เปิดดูภาพ Craft, socket desktop และ mobile จริงแล้ว หน้ามือถือไม่ล้นหรือเลื่อนเพื่อกดยืนยัน ภาพอยู่ใน artifacts/runes
- Browser ใช้ Chromium SwiftShader ตรวจความถูกต้อง UI ไม่ใช่ผล FPS เครื่องผู้เล่น ทดสอบ transport จำลองบน browser และ persistent realm กับฐานข้อมูล local ไม่ใช้บัญชี production เพื่อสร้างไอเท็มทดสอบ
