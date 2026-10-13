# ไอคอนรูน/หินตีบวกและ potion ใหม่

รูน 10 ชนิดใช้ภาพอัญมณีมีสัญลักษณ์และกรอบทอง งานวาดเงา/ไฮไลต์เข้ากับชุดไอคอนเดิม หิน Common/Rare ใช้ทรงอัญมณีเหมือนกัน สีฟ้าและม่วง ไฟล์โปร่งใส 256×256

แหล่งงานภาพ: image_gen สร้าง atlas 12 ช่องโดยอ้างอิง public/icons/leaf-charm.png, health-potion.png, anvil.png; source /workspace/generated_images/exec-68a87eba-b650-4442-b20c-e99b13ad5a72.png หลังสร้างทำเฉพาะตัดช่อง/ปรับขนาด/จัดกึ่งกลางโดยคง transparency ใช้ URL ใหม่ runes-v2 และ refine-stone-common/rare เพื่อไม่ให้ Service Worker cache ภาพเก่า

Red/Blue potion ฟื้น 20% ของ max HP/MP ณ เวลาใช้ ตลอด 2 วินาที ไม่มีฟื้นทันที คูลดาวน์ร่วม 2 วินาทีและราคาซื้อเดิม บันทึก effect amount/remaining/duration ใน actor snapshot เพื่อไม่รีเซ็ตเมื่อ reconnect/replay; ตายแล้วหยุดผลยา ค่าฟื้น passive ของตัวละครคงเดิมและคำนวณแยกจากยา

มอนสเตอร์ทั่วไปทุกเลเวลสุ่ม HP และ MP แยกกัน โอกาสชนิดละ 0.5% อาจได้ 0/1/2 ขวด Boss/Mini Boss ไม่เพิ่ม potion drops ปาร์ตี้สุ่มหนึ่งครั้งต่อการฆ่าและหมุนผู้รับแบบเดิม

การตรวจ: build ผ่าน, 33 unit/authority/regression checks และ 1 browser flow ผ่าน รวม 34 unique tests ตรวจเวลา/ปริมาณแยกจาก passive regen, ตาย/เต็ม/cooldown, replay/reconnect, RNG boundary/elite exclusion, kill→loot→collect, party rotation, Rune/Refine regression และเปิดดูภาพไอคอนในเกมจริง Browser ใช้ Chromium SwiftShader ไม่ใช่การวัด FPS เครื่องผู้เล่น ภาพหลักฐาน artifacts/icons-potions/runes.png และ gems.png
