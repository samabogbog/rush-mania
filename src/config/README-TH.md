# ปรับสมดุล Mossvale ด้วย JSON

แก้ไฟล์ที่ต้องการ บันทึก แล้ว rebuild และ restart/deploy **ทั้ง client และ server รุ่นเดียวกัน** ค่าโหลดเมื่อ import module ไม่ใช่ live editor และไม่มีเมนูแอดมินใหม่ ไม่มีการเปลี่ยนเวอร์ชันเซฟ รีเซ็ตบัญชี หรือย้าย progression ผู้เล่นเดิม

| ไฟล์ | ค่าแก้หลัก |
| --- | --- |
| progression.json | `xpBase`, `xpPerLevel`, `pointsPerLevel`, สูตร HP/MP/ATK/DEF, crit/regen, `caps`, ค่าเริ่มผู้เล่นใหม่ |
| classes.json | `classes` ระยะ/ช่วงโจมตี, `skills` 60 รายการ: MP, cooldown, power, range, radius, duration, cast, level |
| equipment.json | `crafted` 18 สูตรเดิม, `sets` 5 เซ็ต, `pieceFormulas`, rarity, affix, โบนัสเซ็ต, ดรอป |
| refinement.json | success 10 ขั้น, rareMultiplier, bonusLinear, cost, downgrade, stoneCraftCount และดรอปหิน |
| content.json | `species` 37 มอนสเตอร์ **ค่าสุดท้ายต่อชนิด**, `zones` ระดับเข้า/รายชื่อมอนสเตอร์, `quests` รางวัล |
| economy.json | ยา/ราคา, EXP Tome/Charm, ตาย, party/support/dungeon/market, respawn/พักโจมตี/ฟื้นเมื่อกลับบ้าน, safe radius |
| schema.json | รูปร่างข้อมูลสำหรับตรวจเมื่อเริ่มเกม ไม่ใช่ค่าบาลานซ์; ห้ามแก้เพื่อข้าม validation |
| manifest.json | รายชื่อไฟล์และรุ่นรูปแบบสำหรับค้นหา |

## หน่วยและสูตร

- เวลาเป็นวินาที ระยะเป็นหน่วยโลก ราคาเป็น zeny
- affix และโบนัสอุปกรณ์เป็น **จุดเปอร์เซ็นต์**: `critChance:5` คือ 5%; `hpRegen:0.5` คือ 0.5% Max HP ต่อวินาที; `mpRegen` เป็น MP ต่อวินาที
- `progression.critBase:0.05` คือ 5%, `critAgi:0.002` คือเพิ่ม 0.2 จุดเปอร์เซ็นต์ต่อ AGI; `caps.crit:0.6` คือ 60%. `caps` ทั้งหมดเป็น **สัดส่วน 0–1** (attackSpeed/healing 1 คือโบนัส 100%) ไม่ใช่หน่วยเดียวกับ affix
- โอกาส `success`, `dropChance`, `downgradeChance`, `marketFee` เป็นสัดส่วน 0–1 เช่น 0.15=15%. `rarityThresholds` และ `stoneDropThresholds` เป็นขอบสะสม เรียงขึ้น (ไม่ใช่โอกาสแยกแต่ละ rarity)
- `power` ของ hit/area/stun/slow/poison เป็นตัวคูณ ATK; heal เป็นสัดส่วน Max HP; guard/fury เป็นสัดส่วนลดดาเมจ/เพิ่ม ATK. Guard ต้องไม่เกิน 1
- EXP ขั้นถัดไป = xpBase + level×xpPerLevel; ค่า HP/MP/ATK ต่อเลเวลใช้ (level−1), DEF ใช้ level
- `pieceFormulas` เก็บ `[ตัวคูณเลเวล,ค่าคงที่]`: ATK/DEF ปัด Math.round; STR/AGI ปัด Math.ceil; HP/MP ไม่ปัด. rarity ปัดหลักเป็นจำนวนเต็มก่อนตีบวก แล้วปัดสุดท้าย 2 ตำแหน่ง
- refinement bonus = n×(bonusLinear+n)/2; success[n] เป็นโอกาสจาก +n ไป +(n+1). Rare คูณ rareMultiplier และ cap100%; downgrade เป็นโอกาส **เมื่อ fail แล้ว**

## ตัวอย่างแก้

1. ให้ EXP เพิ่มต่อขั้น 50 แทน 40: `progression.json` → `xpPerLevel:50`; เซฟเดิมไม่ถูก reset
2. ให้ Red potion ฟื้น 80 ราคา 18: `economy.json` → `redPotion:{"heal":80,"cost":18}`. ร้านค้า tooltip และ simulation ใช้ค่าเดียวกัน
3. เพิ่มโอกาสอุปกรณ์ปกติจาก16%เป็น20%: `equipment.json` → `dropChance.normal:0.2`; ไม่ต้องเปลี่ยน rarityThresholds
4. ลด Fire Bolt ใช้ MP: หา id `mage-1` ใน `classes.json`, แก้ `mp`; คำบรรยายที่ใส่ตัวเลขเองควรแก้ `description` ด้วย
5. เปลี่ยน Dewdrop HP: `content.json` → `species.Dewdrop.hp`. ค่ามอนสเตอร์ในไฟล์นี้เป็นค่าที่คำนวณแล้ว ไม่มีสูตร base/elite อีกชุดที่ต้องแก้; server admin override ยังมีลำดับเหนือ default นี้

## เงื่อนไขร่วมและขอบเขต

คง id อาชีพ/สกิล/เซ็ต/อุปกรณ์/มอนสเตอร์/เควส, ชื่อยา/วัสดุ, slot, stage/branch และจำนวนรายการเดิมเพื่อรองรับเซฟและ artwork. maxLevel100, bagCapacity144, 10 stage×2 branch, 6 gear slots และ layout/hotbar เป็นโครงสร้างระบบ ไม่ใช่ค่าปรับสมดุลทั่วไป; validation ปฏิเสธการเปลี่ยน cap100 และ capacity144. การเพิ่มชนิด/ช่อง/สกิลต้องพัฒนา schema/UI/save migration ต่างหาก

สูตรเซ็ตขึ้นกับ `sets[].level` และ pieceFormulas; gear level, zone level, skill level และ dungeonLevel ไม่เปลี่ยนตามกันอัตโนมัติ ให้ตรวจความสัมพันธ์ทุกครั้ง. ค่าเริ่ม HP/MP/gold/stats/potions ใช้เฉพาะผู้เล่นใหม่ ไม่เขียนทับเซฟเดิม. ค่าเริ่ม HP/MP ควรไม่เกินสูตร max ของผู้เล่นใหม่. คำบรรยาย prose ใน JSON แก้ด้วยมือเมื่อมีเลขระบุ (ตัวเลข runtime และ preview อ่าน config)

server authoritative และ monster overrides เดิมคงอยู่. Collision/ขนาด terrain/ตำแหน่ง spawn/แอนิเมชัน/VFX/ความเร็ว AI ทางเดิน/ข้อจำกัดระบบตลาดและเครือข่ายไม่ใช่บาลานซ์ในไฟล์นี้. เปลี่ยนการต่อสู้ต้องทดสอบทั้ง practice และ online; JSON ไม่รับ code/formula executable

validateConfiguration ใช้ได้ใน browser และ Worker ไม่ต้อง Node ตรวจ key ที่สะกดผิด รูปร่าง/จำนวนรายการ ตัวเลข finite/nonnegative (ยกเว้น x/z), probability, threshold, divisor, จำนวนเต็ม และอ้างอิง zone/species. ผิดจะหยุด import พร้อม path ชัดเจน. ทดสอบ: `npx tsc --noEmit` และ `npx playwright test tests/balance-config.spec.ts`; golden catalog ใน docs/balance/catalog.json ตรวจ default ทั้งหมดเหมือนเดิม
