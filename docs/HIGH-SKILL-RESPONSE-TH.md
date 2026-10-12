# เวลาร่ายสกิลสูงและแรงสั่น

สกิล Lv90–100 ที่มีเวลาร่ายเดิมถูกคูณสาม ทำให้รอนาน 1.2–3 วินาที รอบนี้จำกัดเวลาร่ายไว้ 0.05 วินาทีทั้ง local simulation, authoritative server, realtime client และ anticipation ของ VFX สกิล instant เดิมยังออกผลทันที รักษา recovery สามเท่าและการใช้ทีละสกิล

| ระดับ | สกิล | ร่ายเดิมจริง | ร่ายใหม่ |
| --- | --- | --- | --- |
| 90 | Starfall | 2.4 วินาที | 0.05 วินาที |
| 90 | Root Prison | 1.8 วินาที | 0.05 วินาที |
| 100 | Meteor Blade | 1.8 วินาที | 0.05 วินาที |
| 100 | Guardian Quake | 1.2 วินาที | 0.05 วินาที |
| 100 | Astral Storm | 3 วินาที | 0.05 วินาที |
| 100 | Worldtree Bloom Burst | 2.4 วินาที | 0.05 วินาที |
| 100 | Sky Barrage | 1.5 วินาที | 0.05 วินาที |

Earthbreaker, Unbreakable Crash, Crippling Shot, Toxic Fang และ Wild Hunt Strike ไม่มีเวลาร่ายอยู่แล้ว คง instant ทั้งห้า กติกาดาเมจ/rank/MP/cooldown/เซฟไม่เปลี่ยน

| ระดับ | แรงสั่นเดิม → ใหม่ (หน่วยโลก) | เวลาเดิม → ใหม่ |
| --- | --- | --- |
| 80 | 0.045 → 0.085 | 0.24 → 0.36 วินาที |
| 90 | 0.075 → 0.105 | 0.30 → 0.45 วินาที |
| 100 | 0.110 → 0.110 | 0.36 → 0.54 วินาที (+50%) |

กล้องยังสั่นเฉพาะตอนออกผล ลดแรงคืนศูนย์ ไม่สะสมแรง และเคารพ Reduce Motion ตรวจ source พบว่าการคืนกล้อง/โดนโจมตีไม่ได้ยกเลิกแรงสั่นผิดจังหวะ สาเหตุคือ impulse เดิมเบาและสั้น

เงื่อนไขเวลาคือสกิลพร้อมใช้ มี MP/เป้าหมาย/ระยะที่ถูกต้องและไม่อยู่ระหว่าง recovery การตรวจดาเมจใช้ผล HP จริงของ simulation และเส้นทางคำสั่งเซิร์ฟเวอร์ ไม่จำลองดาเมจฝั่ง client การส่ง packet, snapshot และเครือข่ายอาจเพิ่มเวลา wall clock ที่ผู้เล่นเห็น จึงไม่รับรอง latency รวมเมื่อเครือข่ายช้าหรือ renderer ค้าง

งานภาพ VFX และการเคลื่อนไหวเดิมคงเดิม ตรวจ source skill-vfx ต่างเพียง argument level ให้ helper ระยะเวลา ภาพและ JSON จากการเรียน/r่ายผ่าน UI อยู่ใน artifacts/high-skill-response วิดีโอ WebM เก็บใน workspace ไม่ commit การวัด browser ใช้ Chromium ANGLE SwiftShader เป็น software renderer ไม่ใช่ FPS หรือ latency รับรองบนเครื่องผู้เล่น

ตรวจ source สุดท้ายหลังเจ้าของหยุดแก้: build ผ่าน, code ชุดหลัก61 + realtime client1 = 62 และ browser18 = 80 รายการผ่าน ทั้ง12สกิลLv90/100ผ่านเส้นทางดาเมจจริงภายใน200msด้วย step10/25/50/200msและคำสั่งauthoritative รวมกันกดซ้ำ/command replay ตรวจLv80จริงสามอาชีพ และReduce Motionทุกระดับ ผู้ควบคุมเปิดภาพ15กรณีกับลำดับเฟรมตัวแทน7กรณีแล้วผ่านการตรวจรับ ไม่พบpage/model errors กล้องกับVFXคืนศูนย์ครบ

เกณฑ์ browser เก็บเวลา keydown→RAF สังเกตผล ไว้ใน [REVIEW.md](../artifacts/high-skill-response/REVIEW.md) และ [validation.json](../artifacts/high-skill-response/validation.json) บางค่ามากกว่า200msจากrenderer/RAF scheduling โดยเฉพาะสกิลinstantที่ดาเมจเกิดในinput handler จึงไม่นำค่าที่สังเกตหลังเฟรมไปอ้างเป็นเวลาร่าย/executeจริง หรือรับรองlatencyรวมออนไลน์
