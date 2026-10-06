# ตารางค่าก่อนปรับระบบวัตถุดิบ rarity ของ Mossvale

**หมายเหตุ:** ตารางอุปกรณ์และสูตรคราฟต์ในเอกสารนี้เป็นข้อมูลก่อนรอบเปลี่ยน Shade essence/Sky feather/Rune stone และกางเกง ให้ใช้ `src/config/equipment.json`, `src/config/crafting.json` และ `src/config/README-TH.md` สำหรับค่าปัจจุบัน

อ้างอิง source commit `dddb8eb479299589c8d6aea0de961a635620a289` ซึ่งตรงกับรุ่นที่เผยแพร่ล่าสุด เอกสารนี้รายงานกติกาปัจจุบัน ไม่ได้เปลี่ยนค่าบาลานซ์ ค่ามอนสเตอร์ออนไลน์อาจถูก override ด้วยเมนูแอดมิน; ตารางนี้เป็นค่า default ใน source ไม่ได้อ่านฐานข้อมูล production

## 1. เลเวลและ EXP

เลเวลสูงสุด 100; EXP ที่ใช้จากเลเวล L ไป L+1 = `80 + 40L` (L=1…99) เพิ่มคงที่ 40 ทุกขั้น ไม่ใช่เพิ่มเปอร์เซ็นต์คงที่ อัตราเพิ่มเมื่อเทียบขั้นก่อน = `40/(80+40(L−1)) ×100%`

EXP สะสมจากเลเวล 1 ไปถึงเลเวล L = `20L² + 60L − 80` เมื่อ L=100 ใช้รวม **205,920 EXP** เศษ EXP ยกไปขั้นต่อไป; ถึงเลเวล 100 แล้ว EXP ถูกตั้งเป็น 0

แต่ละเลเวลได้รับแต้ม +3 เริ่มมี 3 แต้ม จึงมีแต้มลงสถานะรวม 300 ที่เลเวล 100 อัปเลเวลฟื้น HP/MP เต็ม ไม่มี EXP penalty จากความต่างเลเวลมอนสเตอร์ในสูตรปัจจุบัน

| เลเวลปัจจุบัน | EXP ไปขั้นถัดไป | EXP สะสมถึงเลเวลนี้ | แต้มทั้งหมด |
| --- | --- | --- | --- |
| 1 | 120 | 0 | 3 |
| 2 | 160 | 120 | 6 |
| 5 | 280 | 720 | 15 |
| 10 | 480 | 2520 | 30 |
| 20 | 880 | 9120 | 60 |
| 30 | 1280 | 19720 | 90 |
| 40 | 1680 | 34320 | 120 |
| 50 | 2080 | 52920 | 150 |
| 60 | 2480 | 75520 | 180 |
| 70 | 2880 | 102120 | 210 |
| 80 | 3280 | 132720 | 240 |
| 90 | 3680 | 167320 | 270 |
| 99 | 4040 | 201880 | 297 |
| 100 | เต็มแล้ว | 205920 | 300 |

## 2. สถานะตัวละคร

เริ่ม STR/VIT/AGI อย่างละ 5, HP 120, MP 60, เงิน 120 z; มี Red potion 8 และ Blue potion 4 อาชีพเริ่มต้น Swordsman ไม่มี INT/DEX/LUK หรือ MATK/MDEF แยกในระบบปัจจุบัน Mage ใช้ STR เพิ่ม ATK เช่นเดียวกับ Swordsman

| ค่า | สูตรรวมอุปกรณ์ | ผลจากเลเวล/แต้ม |
| --- | --- | --- |
| Max HP | 100 + 4×VITรวม + 12×(L−1) + HPอุปกรณ์ | +12/เลเวล; VIT +1 ให้ HP +4 |
| Max MP | 60 + 8×(L−1) + MPอุปกรณ์ | +8/เลเวล; STR/VIT/AGI ไม่เพิ่ม MP |
| ATK | 12 + 2×สถานะโจมตีรวม + 1.5×(L−1) + ATKอุปกรณ์ | +1.5/เลเวล; STR +1 ให้ ATK +2 (ดาบ/เวท); AGI +1 ให้ ATK +2 (ธนู) |
| DEF | 2×VITรวม + 0.5×L + DEFอุปกรณ์ | +0.5/เลเวล; VIT +1 ให้ DEF +2 |
| คริติคอล | min(60%, 5% + 0.2%×AGIรวม + critChanceอุปกรณ์) | เริ่ม 6%; AGI +1 ให้ +0.2 จุดเปอร์เซ็นต์ |
| ดาเมจคริ | 1.5 + critDamageอุปกรณ์/100 | เริ่ม ×1.5 |
| ความเร็วเดิน | 4.4 × (1 + min(50%, moveSpeed/100)) | สูงสุด 6.6 หน่วย/วินาที |
| ช่วงโจมตีปกติ | ช่วงอาชีพ ÷ [(1+(AGIรวม−5)×0.04)×(1+min(100%,attackSpeed/100))] | AGI เพิ่มความถี่โจมตีทุกอาชีพ |
| HP regen | Max HP × (0.5 + HPregenอุปกรณ์และเซ็ต)/100 ต่อวินาที | เริ่ม 0.5%/วินาที; ทำงานระหว่างต่อสู้ |
| MP regen | 0.7 + MPregenอุปกรณ์ ต่อวินาที | หน่วย MP/วินาที ไม่ใช่ % |

STR/VIT/AGI ไม่มี hard cap ในฟังก์ชันลงแต้ม แต่ตัวละครที่เล่นตามปกติเลเวล 100 ลงแต้ม 300 ทำให้สถานะใดสถานะหนึ่งสูงสุด **305 ก่อนอุปกรณ์** (อีกสองค่ายังเป็น 5) นี่คือเพดานจากงบแต้ม ไม่ใช่ validation cap; เซฟที่ถูกแก้ภายนอกไม่ใช่ฐานคำนวณ

ที่เลเวล 100 ไม่สวมอุปกรณ์และยังไม่ลงแต้ม: HP 1,308 / MP 852 / ATK 170.5 / DEF 60 ลง VIT ทั้งหมด: HP 2,508 / DEF 660; ลงสถานะโจมตีทั้งหมด: ATK 770.5 ค่าเหล่านี้เป็นคนละ build ไม่สามารถได้พร้อมกันทั้งหมด

รวมอุปกรณ์หลักและรองจากทั้ง 6 ช่องด้วยการบวก รวมโบนัสเซ็ตภายหลัง ไม่จำกัด ATK/DEF/HP/MP ด้วยเพดานตัวเลขตายตัว

| อาชีพ | ระยะโจมตีปกติ | ช่วงโจมตีเริ่มต้น |
| --- | --- | --- |
| Swordsman | 1.8 | 0.7 s |
| Mage | 7 | 1 s |
| Archer | 8 | 0.8 s |

## 3. เพดานสถานะรองที่ใช้จริง

ค่าที่สุ่มได้ต่อชิ้น กับเพดานรวมที่สูตร combat ใช้ เป็นคนละเรื่อง โบนัสสะสมอาจเกินเพดานแต่ผลส่วนเกินไม่ทำงาน

| ค่า | เพดานผลใช้งานรวม |
| --- | --- |
| Critical chance | 60% รวมฐานและ AGI |
| Critical damage | ไม่มี hard cap |
| Damage bonus / Skill damage | ไม่มี hard cap; คูณแยกกัน |
| Lifesteal | 25% ของ HP ที่ทำความเสียหายได้จริง ไม่รวม overkill |
| HP regen | ไม่มี cap รวม; ชิ้นละสูงสุด 0.5%/s |
| MP regen | ไม่มี cap รวม |
| Attack speed affix | โบนัสสูงสุด 100%; ส่วน AGI ไม่ถูก cap ที่นี่ |
| Move speed | โบนัส 50% |
| Armor penetration | 60% ของ DEF มอนสเตอร์ |
| Damage reduction | 60%; คูณแยกกับ Guard |
| Dodge chance | 35%; AGI ไม่เพิ่ม dodge |
| EXP / Gold bonus | ไม่มี cap รวม |
| Healing bonus | 100% → ฟื้นฟูสูงสุด ×2 |
| Cooldown reduction | 40% → cooldown เหลืออย่างน้อย 60% |

## 4. อุปกรณ์และ rarity

6 ช่อง: Weapon / Helmet / Armor / Gloves / Boots / Accessory มี 5 เซ็ต ×8 แบบ = 40 แบบ (อาวุธ 3 อาชีพและของทั่วไป 5 ชิ้น) และสูตรคราฟต์เดิม 18 แบบ รวม **58 แบบ** เซ็ตดรอปคราฟต์ไม่ได้

| Rarity | ตัวคูณสถานะหลักของของเซ็ตดรอป | จำนวนสถานะรอง |
| --- | --- | --- |
| Common | 1.00 | 0 |
| Rare | 1.10 | 1 |
| Epic | 1.25 | 2 |
| Legend | 1.45 | 3 |

ตัวคูณ rarity ใช้เฉพาะของ `dropOnly` (5 เซ็ต) อุปกรณ์คราฟต์เดิมไม่ใช้ตัวคูณนี้ แม้เสกเป็น Legend ได้

สูตรสถานะหลักสุดท้ายต่อชิ้น = `round2(round(ค่าพื้นฐาน × rarityMultiplier) × (1 + โบนัสตีบวก/100))` ปัด rarity เป็นจำนวนเต็มก่อน แล้วปัดผลท้ายสองตำแหน่ง ตีบวกเพิ่มทุกค่าสถานะหลักที่ชิ้นนั้นมี รวม STR/VIT/AGI/HP/MP แต่ **ไม่เพิ่มค่าสถานะรองและโบนัสเซ็ต**

### ค่าพื้นฐานอุปกรณ์ทุกแบบ และค่าสูงสุด +10

คอลัมน์สูงสุดหมายถึง Legend +10 สำหรับของดรอป; ของคราฟต์ +10 ไม่มีตัวคูณ rarity ไม่มี affix สุ่มค่าสถานะหลักในปัจจุบัน

| ชื่อ | Lv | ช่อง/อาชีพ | หลักพื้นฐาน | หลักสูงสุด +10 |
| --- | --- | --- | --- | --- |
| Sprout Blade | 1 | weapon/swordsman | atk 12, str 2 | atk 29.4, str 4.9 |
| Bloom Staff | 1 | weapon/mage | atk 12, mp 20, str 2 | atk 29.4, mp 49, str 4.9 |
| Willow Bow | 1 | weapon/archer | atk 10, agi 3 | atk 24.5, agi 7.35 |
| Field Coat | 1 | armor | def 10, hp 30 | def 24.5, hp 73.5 |
| Leaf Charm | 1 | accessory | agi 3 | agi 7.35 |
| Amber Cleaver | 20 | weapon/swordsman | atk 38, str 5 | atk 93.1, str 12.25 |
| Amber Wand | 20 | weapon/mage | atk 32, mp 50, str 5 | atk 78.4, mp 122.5, str 12.25 |
| Horn Bow | 20 | weapon/archer | atk 32, agi 7 | atk 78.4, agi 17.15 |
| Shell Vest | 40 | armor | def 50, vit 6, hp 150 | def 122.5, vit 14.7, hp 367.5 |
| Wisp Robe | 40 | armor | def 20, mp 100, str 10 | def 49, mp 245, str 24.5 |
| Crystal Band | 40 | accessory | str 8, mp 60 | str 19.6, mp 147 |
| Reed Feather | 40 | accessory | agi 10, def 10 | agi 24.5, def 24.5 |
| Frost Edge | 65 | weapon/swordsman | atk 100, str 15, def 25 | atk 245, str 36.75, def 61.25 |
| Snow Staff | 65 | weapon/mage | atk 95, str 18, mp 120 | atk 232.75, str 44.1, mp 294 |
| Sky Bow | 65 | weapon/archer | atk 90, agi 20 | atk 220.5, agi 49 |
| Rootheart Plate | 65 | armor | def 100, hp 350, vit 10 | def 245, hp 857.5, vit 24.5 |
| Shade Mantle | 65 | armor | def 35, str 20, agi 10, mp 100 | def 85.75, str 49, agi 24.5, mp 245 |
| Rootheart Signet | 65 | accessory | atk 30, def 30, mp 60 | atk 73.5, def 73.5, mp 147 |
| Thornwood Blade | 10 | weapon/swordsman | atk 32, str 1 | atk 112.7, str 2.45 |
| Thornwood Staff | 10 | weapon/mage | atk 31, mp 20, str 1 | atk 110.25, mp 71.05, str 2.45 |
| Thornwood Bow | 10 | weapon/archer | atk 30, agi 2 | atk 107.8, agi 7.35 |
| Thornwood Helmet | 10 | helmet | def 8, hp 20 | def 29.4, hp 71.05 |
| Thornwood Coat | 10 | armor | def 22, hp 40 | def 78.4, hp 142.1 |
| Thornwood Gloves | 10 | gloves | atk 7, def 5 | atk 24.5, def 17.15 |
| Thornwood Boots | 10 | boots | def 7, agi 1 | def 24.5, agi 2.45 |
| Thornwood Charm | 10 | accessory | hp 20, mp 10, str 1 | hp 71.05, mp 36.75, str 2.45 |
| Suncrest Blade | 30 | weapon/swordsman | atk 68, str 3 | atk 242.55, str 9.8 |
| Suncrest Staff | 30 | weapon/mage | atk 65, mp 60, str 3 | atk 230.3, mp 213.15, str 9.8 |
| Suncrest Bow | 30 | weapon/archer | atk 62, agi 4 | atk 220.5, agi 14.7 |
| Suncrest Helmet | 30 | helmet | def 16, hp 60 | def 56.35, hp 213.15 |
| Suncrest Coat | 30 | armor | def 46, hp 120 | def 164.15, hp 426.3 |
| Suncrest Gloves | 30 | gloves | atk 14, def 11 | atk 49, def 39.2 |
| Suncrest Boots | 30 | boots | def 15, agi 2 | def 53.9, agi 7.35 |
| Suncrest Charm | 30 | accessory | hp 60, mp 30, str 2 | hp 213.15, mp 107.8, str 7.35 |
| Moonveil Blade | 50 | weapon/swordsman | atk 104, str 5 | atk 369.95, str 17.15 |
| Moonveil Staff | 50 | weapon/mage | atk 99, mp 100, str 5 | atk 352.8, mp 355.25, str 17.15 |
| Moonveil Bow | 50 | weapon/archer | atk 94, agi 7 | atk 333.2, agi 24.5 |
| Moonveil Helmet | 50 | helmet | def 24, hp 100 | def 85.75, hp 355.25 |
| Moonveil Coat | 50 | armor | def 70, hp 200 | def 249.9, hp 710.5 |
| Moonveil Gloves | 50 | gloves | atk 21, def 17 | atk 73.5, def 61.25 |
| Moonveil Boots | 50 | boots | def 23, agi 4 | def 80.85, agi 14.7 |
| Moonveil Charm | 50 | accessory | hp 100, mp 50, str 3 | hp 355.25, mp 178.85, str 9.8 |
| Frostguard Blade | 70 | weapon/swordsman | atk 140, str 7 | atk 497.35, str 24.5 |
| Frostguard Staff | 70 | weapon/mage | atk 133, mp 140, str 6 | atk 472.85, mp 497.35, str 22.05 |
| Frostguard Bow | 70 | weapon/archer | atk 126, agi 9 | atk 448.35, agi 31.85 |
| Frostguard Helmet | 70 | helmet | def 32, hp 140 | def 112.7, hp 497.35 |
| Frostguard Coat | 70 | armor | def 94, hp 280 | def 333.2, hp 994.7 |
| Frostguard Gloves | 70 | gloves | atk 28, def 23 | atk 100.45, def 80.85 |
| Frostguard Boots | 70 | boots | def 31, agi 5 | def 110.25, agi 17.15 |
| Frostguard Charm | 70 | accessory | hp 140, mp 70, str 4 | hp 497.35, mp 249.9, str 14.7 |
| Starfall Blade | 90 | weapon/swordsman | atk 176, str 9 | atk 624.75, str 31.85 |
| Starfall Staff | 90 | weapon/mage | atk 167, mp 180, str 8 | atk 592.9, mp 639.45, str 29.4 |
| Starfall Bow | 90 | weapon/archer | atk 158, agi 12 | atk 561.05, agi 41.65 |
| Starfall Helmet | 90 | helmet | def 40, hp 180 | def 142.1, hp 639.45 |
| Starfall Coat | 90 | armor | def 118, hp 360 | def 418.95, hp 1278.9 |
| Starfall Gloves | 90 | gloves | atk 35, def 29 | atk 124.95, def 102.9 |
| Starfall Boots | 90 | boots | def 39, agi 6 | def 139.65, agi 22.05 |
| Starfall Charm | 90 | accessory | hp 180, mp 90, str 5 | hp 639.45, mp 320.95, str 17.15 |

### โบนัสเซ็ตสะสม

2 ชิ้น: HP +2×Lvเซ็ต; 4 ชิ้น: เพิ่ม ATK round(0.4Lv) และ DEF round(0.3Lv); 6 ชิ้น: เพิ่ม Damage bonus 5%, Move speed 5%, HP regen ตามตาราง ทุกขั้นสะสม ไม่ถูกขยายด้วย rarity/ตีบวก

| เซ็ต | Lv | HP (2 ชิ้น) | ATK / DEF (4 ชิ้น) | HPregen เพิ่ม (6 ชิ้น) |
| --- | --- | --- | --- | --- |
| Thornwood | 10 | 20 | 4 / 3 | 0.06%/s |
| Suncrest | 30 | 60 | 12 / 9 | 0.17%/s |
| Moonveil | 50 | 100 | 20 / 15 | 0.28%/s |
| Frostguard | 70 | 140 | 28 / 21 | 0.39%/s |
| Starfall | 90 | 180 | 36 / 27 | 0.5%/s |

## 5. ช่วงสุ่มสถานะรอง

แต่ละชิ้นสุ่มจาก pool 16 ค่า โอกาสเลือกเท่ากันและไม่ซ้ำภายในชิ้น Rarity เปลี่ยนจำนวนแถว ไม่เปลี่ยนช่วงสุ่ม

ยกเว้น HPregen: ค่า = `round1(randomRange × (0.65 + Lvอุปกรณ์/140))`; HPregen ใช้ช่วง 0.10–0.50%/s โดยตรง ปัดสองตำแหน่ง ไม่คูณเลเวล ช่วงด้านล่างเป็นค่าต่ำสุด–สูงสุดหลังปัด ค่าสูงสุดไปถึงได้จากการปัดแม้ RNG ไม่คืน 1

| สถานะ | หน่วย | Lv10 | Lv30 | Lv50 | Lv70 | Lv90 |
| --- | --- | --- | --- | --- | --- | --- |
| critChance | % | 0.7–3.6 | 0.9–4.3 | 1–5 | 1.2–5.8 | 1.3–6.5 |
| critDamage | % | 3.6–13 | 4.3–15.6 | 5–18.1 | 5.8–20.7 | 6.5–23.3 |
| damageBonus | % | 1.4–5.1 | 1.7–6.1 | 2–7.1 | 2.3–8 | 2.6–9.1 |
| skillDamage | % | 2.2–7.2 | 2.6–8.6 | 3–10.1 | 3.5–11.5 | 3.9–12.9 |
| lifesteal | % | 0.7–2.9 | 0.9–3.5 | 1–4 | 1.2–4.6 | 1.3–5.2 |
| hpRegen | %/s | 0.1–0.5 | 0.1–0.5 | 0.1–0.5 | 0.1–0.5 | 0.1–0.5 |
| mpRegen | MP/s | 0.1–0.7 | 0.2–0.9 | 0.2–1 | 0.2–1.2 | 0.3–1.3 |
| attackSpeed | % | 1.4–5.8 | 1.7–6.9 | 2–8.1 | 2.3–9.2 | 2.6–10.3 |
| moveSpeed | % | 1.4–4.3 | 1.7–5.2 | 2–6 | 2.3–6.9 | 2.6–7.8 |
| armorPen | % | 1.4–5.8 | 1.7–6.9 | 2–8.1 | 2.3–9.2 | 2.6–10.3 |
| damageReduction | % | 0.7–3.6 | 0.9–4.3 | 1–5 | 1.2–5.8 | 1.3–6.5 |
| dodgeChance | % | 0.7–2.9 | 0.9–3.5 | 1–4 | 1.2–4.6 | 1.3–5.2 |
| expBonus | % | 2.2–6.5 | 2.6–7.8 | 3–9.1 | 3.5–10.4 | 3.9–11.6 |
| goldBonus | % | 2.2–7.2 | 2.6–8.6 | 3–10.1 | 3.5–11.5 | 3.9–12.9 |
| healingBonus | % | 2.2–6.5 | 2.6–7.8 | 3–9.1 | 3.5–10.4 | 3.9–11.6 |
| cooldownReduction | % | 1.4–4.3 | 1.7–5.2 | 2–6 | 2.3–6.9 | 2.6–7.8 |

อุปกรณ์สูงสุดใน catalog คือ Lv90 (factor≈1.292857) ไม่มี Lv100 gear ตอนนี้ เช่น critChance สูงสุด 6.5%/ชิ้น, critDamage 23.3%, skillDamage 12.9%, cooldownReduction 7.8% หากสวม 6 ชิ้นที่สุ่มแถวเดียวกันสูงสุด จะได้ critDamage +139.8 จุดเปอร์เซ็นต์ → คริ ×2.898; CDR รวม 46.8% แต่ใช้จริง 40%; HPregen 6 ชิ้น +3%/s รวมฐาน 0.5% และเซ็ต Starfall 0.5% ได้ **4% Max HP/s** ตัวอย่างเหล่านี้เป็นเพดานเฉพาะค่านั้น ไม่ใช่ทุกค่าได้เต็มพร้อมกัน เพราะ Legend มีเพียง 3 แถวต่อชิ้น

## 6. ตีบวกและหิน

สูงสุด +10 โบนัสสะสม `n(19+n)/2`% วัตถุดิบครั้งละหิน 1 ก้อนและเงิน `60 + 40×ระดับปัจจุบัน` สำเร็จเพิ่ม 1; ล้มเหลวมี 15% ที่ลดระดับ (เป็นโอกาสมีเงื่อนไขหลัง fail ไม่ใช่ 15% ต่อการตีทุกครั้ง) Common ลดเหลือ 0; Rare ลดลง 1

Rare เพิ่ม success เป็นสองเท่าและ cap 100%; Common 5 ก้อนคราฟต์ Rare 1 ก้อน ไม่มีค่าเงินคราฟต์

| เป้าหมาย | โบนัสขั้นนี้ | โบนัสสะสม | Common success | Rare success | เงิน/ครั้ง |
| --- | --- | --- | --- | --- | --- |
| +1 | 10% | 10% | 100% | 100% | 60 |
| +2 | 11% | 21% | 100% | 100% | 100 |
| +3 | 12% | 33% | 80% | 100% | 140 |
| +4 | 13% | 46% | 60% | 100% | 180 |
| +5 | 14% | 60% | 40% | 80% | 220 |
| +6 | 15% | 75% | 20% | 40% | 260 |
| +7 | 16% | 91% | 10% | 20% | 300 |
| +8 | 17% | 108% | 6% | 12% | 340 |
| +9 | 18% | 126% | 3% | 6% | 380 |
| +10 | 19% | 145% | 1% | 2% | 420 |

## 7. สูตรดาเมจ

`Damage = max(1, round(ATK × skillPower × variance × critMultiplier × (1+damageBonus/100) × (1+skillDamage/100 เมื่อเป็นสกิล) × (1+FuryPower) × 100/(100+DEFหลังเจาะเกราะ)))`

โจมตีปกติ skillPower=1; variance สุ่ม 0.9…1.1; เจาะเกราะลด DEF เป็นเปอร์เซ็นต์ สูงสุด 60% การปัดทำตอนท้าย HP/DEF/ATK ไม่ได้ cap สูงสุดตายตัว

ดาเมจที่ผู้เล่นรับ = `max(1, round(monsterATK × variance ×100/(100+playerDEF) ×(1−GuardPower) ×(1−damageReduction)))` ทดสอบ dodge ก่อนดาเมจ

Poison: ดาเมจฐานต่อ tick = 0.25×ATK ตอนติดพิษ, tick ประมาณทุก 1 วินาที ผ่าน hit แบบสกิล จึงสุ่มคริ/variance, ได้ damage/skill bonus, Fury และ lifesteal เช่นเดียวกัน ไม่ได้ใช้ skillPower เป็นตัวคูณทุก tick Slow ลดความเร็วเดินมอนสเตอร์ครึ่งหนึ่ง; Stun หยุดและยกเลิก windup

## 8. สกิลทุกอาชีพ

อาชีพละ 20 สกิล 2 สาย ×10 ขั้น ปลดล็อกทุก 10 เลเวล แต่ละขั้นเลือกหนึ่งในสองสกิล ต้องเรียนขั้นก่อน เลเวล 100 จึงเลือกได้ 10 จาก 20 ต่ออาชีพ Hotbar มี 6 ช่องสกิลและ 4 ช่องเสริม

Power ของ hit/area/stun/slow/poison = ตัวคูณ ATK ของการโจมตีครั้งแรก; heal = สัดส่วน Max HP; guard = สัดส่วนลดดาเมจ; fury = สัดส่วนเพิ่ม ATK สกิล heal และยาคูณ Healing multiplier สกิลใหม่แทนที่ buff ชนิดเดิม ไม่บวก buff ชนิดเดียวกันซ้อน

Cooldown จริง = cooldownพื้นฐาน ×(1−min(0.4,CDR/100)); การเคลื่อนที่ระหว่าง cast ยกเลิกร่าย ตารางเป็นวินาทีและระยะหน่วยโลก

### swordsman

| สาย | Lv | ชื่อ | Effect | Power | MP | CD | Range | Radius | Duration | Cast |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 10 | Power Strike | hit | 1.8 | 10 | 4 | 2.8 | — | — | 0 |
| 1 | 20 | Whirlwind | area | 1.4 | 18 | 7 | 2.8 | 4 | — | 0 |
| 1 | 30 | Iron Guard | guard | 0.5 | 15 | 15 | 2.8 | — | 6 | 0 |
| 1 | 40 | Shield Bash | stun | 1.3 | 16 | 10 | 2.8 | — | 2 | 0 |
| 1 | 50 | Second Wind | heal | 0.3 | 20 | 20 | 2.8 | — | — | 0 |
| 1 | 60 | War Cry | fury | 0.35 | 24 | 18 | 2.8 | — | 8 | 0 |
| 1 | 70 | Cleave | area | 2.2 | 28 | 10 | 2.8 | 3 | — | 0 |
| 1 | 80 | Hamstring | slow | 2 | 25 | 12 | 2.8 | — | 5 | 0 |
| 1 | 90 | Earthbreaker | area | 3 | 35 | 15 | 2.8 | 5 | — | 0 |
| 1 | 100 | Meteor Blade | area | 4.5 | 50 | 25 | 2.8 | 5 | — | 0.6 |
| 2 | 10 | Bulwark | guard | 0.35 | 8 | 9 | 2.8 | — | 4 | 0 |
| 2 | 20 | Concussion | stun | 1.1 | 14 | 8 | 2.8 | — | 2.5 | 0 |
| 2 | 30 | Field Recovery | heal | 0.22 | 16 | 14 | 2.8 | — | — | 0 |
| 2 | 40 | Sweeping Challenge | area | 1.1 | 19 | 7 | 2.8 | 5 | — | 0 |
| 2 | 50 | Fortress Stance | guard | 0.65 | 24 | 18 | 2.8 | — | 7 | 0 |
| 2 | 60 | Crushing Advance | slow | 2.4 | 26 | 11 | 2.8 | — | 5 | 0 |
| 2 | 70 | Battle Renewal | heal | 0.4 | 32 | 22 | 2.8 | — | — | 0 |
| 2 | 80 | Rallying Standard | fury | 0.5 | 30 | 22 | 2.8 | — | 12 | 0 |
| 2 | 90 | Unbreakable | guard | 0.8 | 40 | 25 | 2.8 | — | 8 | 0 |
| 2 | 100 | Guardian Quake | area | 3.5 | 44 | 20 | 2.8 | 6 | 5 | 0.4 |

### mage

| สาย | Lv | ชื่อ | Effect | Power | MP | CD | Range | Radius | Duration | Cast |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 10 | Fire Bolt | hit | 2 | 12 | 4 | 8 | — | — | 0.35 |
| 1 | 20 | Frost Nova | area | 1.5 | 20 | 8 | 8 | 3 | 3 | 0.4 |
| 1 | 30 | Arcane Barrier | guard | 0.6 | 18 | 16 | 8 | — | 5 | 0 |
| 1 | 40 | Lightning | stun | 1.6 | 22 | 10 | 8 | — | 2 | 0.3 |
| 1 | 50 | Vital Bloom | heal | 0.35 | 25 | 20 | 8 | — | — | 0 |
| 1 | 60 | Arcane Focus | fury | 0.4 | 25 | 18 | 8 | — | 8 | 0 |
| 1 | 70 | Blizzard | area | 2.5 | 35 | 12 | 8 | 4 | 4 | 0.7 |
| 1 | 80 | Venom Cloud | poison | 1.2 | 30 | 14 | 8 | — | 6 | 0 |
| 1 | 90 | Starfall | area | 3.4 | 42 | 18 | 8 | 5 | — | 0.8 |
| 1 | 100 | Astral Storm | area | 5 | 60 | 28 | 8 | 6 | — | 1 |
| 2 | 10 | Bramble Bolt | slow | 1.4 | 9 | 5 | 8 | — | 3 | 0 |
| 2 | 20 | Restoring Dew | heal | 0.18 | 15 | 11 | 8 | — | — | 0 |
| 2 | 30 | Spore Hex | poison | 1 | 16 | 10 | 8 | — | 7 | 0 |
| 2 | 40 | Thorn Burst | area | 1.35 | 20 | 7 | 8 | 4 | 2 | 0 |
| 2 | 50 | Living Shelter | guard | 0.5 | 22 | 14 | 8 | — | 8 | 0 |
| 2 | 60 | Moonbeam | stun | 2.4 | 28 | 12 | 8 | — | 3 | 0.5 |
| 2 | 70 | Verdant Renewal | heal | 0.48 | 38 | 24 | 8 | — | — | 0 |
| 2 | 80 | Spirit Surge | fury | 0.55 | 32 | 22 | 8 | — | 12 | 0 |
| 2 | 90 | Root Prison | slow | 3.5 | 38 | 16 | 8 | — | 10 | 0.6 |
| 2 | 100 | Worldtree Bloom | heal | 0.7 | 65 | 35 | 8 | — | — | 0.8 |

### archer

| สาย | Lv | ชื่อ | Effect | Power | MP | CD | Range | Radius | Duration | Cast |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 10 | Power Shot | hit | 1.9 | 10 | 4 | 9 | — | — | 0 |
| 1 | 20 | Arrow Rain | area | 1.5 | 18 | 8 | 9 | 3 | — | 0 |
| 1 | 30 | Evasive Stance | guard | 0.45 | 15 | 14 | 9 | — | 6 | 0 |
| 1 | 40 | Pinning Shot | stun | 1.4 | 18 | 10 | 9 | — | 2 | 0 |
| 1 | 50 | Field Remedy | heal | 0.25 | 18 | 18 | 9 | — | — | 0 |
| 1 | 60 | Hunter Focus | fury | 0.3 | 22 | 16 | 9 | — | 10 | 0 |
| 1 | 70 | Piercing Volley | area | 2.2 | 28 | 10 | 9 | 3.5 | — | 0 |
| 1 | 80 | Poison Arrow | poison | 1.1 | 24 | 12 | 9 | — | 8 | 0 |
| 1 | 90 | Crippling Shot | slow | 3 | 32 | 14 | 9 | — | 6 | 0 |
| 1 | 100 | Sky Barrage | area | 4.5 | 48 | 24 | 9 | 5 | — | 0.5 |
| 2 | 10 | Snaring Arrow | slow | 1.2 | 8 | 5 | 9 | — | 4 | 0 |
| 2 | 20 | Venom Dart | poison | 0.9 | 14 | 8 | 9 | — | 6 | 0 |
| 2 | 30 | Scatter Volley | area | 1.4 | 18 | 7 | 9 | 4 | — | 0 |
| 2 | 40 | Herbal Tonic | heal | 0.2 | 16 | 14 | 9 | — | — | 0 |
| 2 | 50 | Stalker Focus | fury | 0.4 | 22 | 16 | 9 | — | 9 | 0 |
| 2 | 60 | Shock Arrow | stun | 2.2 | 25 | 12 | 9 | — | 3 | 0 |
| 2 | 70 | Camouflage Guard | guard | 0.6 | 30 | 18 | 9 | — | 8 | 0 |
| 2 | 80 | Entangling Volley | area | 2.4 | 34 | 12 | 9 | 5 | 5 | 0 |
| 2 | 90 | Toxic Fang | poison | 2.6 | 36 | 16 | 9 | — | 12 | 0 |
| 2 | 100 | Wild Hunt | fury | 0.8 | 48 | 28 | 9 | — | 14 | 0 |

## 9. มอนสเตอร์และแผนที่

สูตรปกติเมื่อไม่มี override: HP=60+18Lv; ATK=7+2.4Lv; DEF=8+1.4Lv; EXP=20+12Lv; เงิน=6+floor(0.6Lv) มีมอนสเตอร์เริ่มต้นและชนิดเกราะสูงบางตัว override ตารางด้านล่างเป็นค่า final default

Boss เทียบสูตรปกติระดับเดียวกัน: HP×16, ATK/DEF×3, EXP/เงิน×12; Mini: HP×5, ATK/DEF×1.8, EXP/เงิน×4 ไม่มี bonus elite เพิ่มอีกหลังจากตารางนี้

เกิดใหม่: ปกติ 13s / Mini 60s / Boss 180s; Boss autoaggro 10 หน่วย leash17; Mini autoaggro8 leash14; กลับบ้านฟื้น HP25% Max HP/s และเต็มเมื่อถึงบ้าน Boss range4 windup1.65s; Mini range3.2 windup1.25s หลังโจมตี bossพัก2.2s ปกติและ mini1.4s แยกจาก windup

| มอนสเตอร์ | ประเภท | Lv | HP | ATK | DEF | EXP | เงิน | วัสดุ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dewdrop | Normal | 1 | 55 | 7 | 8 | 24 | 8 | Dew jelly |
| Wildcap | Normal | 2 | 85 | 8 | 18 | 38 | 8 | Forest mushroom |
| Leafling | Normal | 2 | 70 | 8 | 12 | 30 | 8 | Verdant leaf |
| Sunbee | Normal | 5 | 150 | 19 | 15 | 80 | 9 | Honey drop |
| RibbonHare | Normal | 7 | 186 | 23.8 | 17.799999999999997 | 104 | 10 | Soft fur |
| Applesprout | Normal | 20 | 420 | 55 | 36 | 260 | 18 | Amber leaf |
| AmberBoar | Normal | 24 | 492 | 64.6 | 41.599999999999994 | 308 | 20 | Boar tusk |
| Honeybug | Normal | 26 | 528 | 69.4 | 44.4 | 332 | 21 | Golden honey |
| Sporeguard | Normal | 30 | 600 | 79 | 50 | 380 | 24 | Amber spore |
| OrchardStag | Normal | 35 | 690 | 91 | 57 | 440 | 27 | Amber antler |
| GlowWisp | Normal | 40 | 780 | 103 | 64 | 500 | 30 | Wisp essence |
| MarshTurtle | Normal | 44 | 852 | 112.6 | 120 | 548 | 32 | River shell |
| ReedSprite | Normal | 48 | 924 | 122.19999999999999 | 75.19999999999999 | 596 | 34 | Marsh reed |
| PuddleJelly | Normal | 52 | 996 | 131.8 | 80.8 | 644 | 37 | Crystal jelly |
| CrystalMoth | Normal | 60 | 1140 | 151 | 92 | 740 | 42 | Crystal dust |
| FrostCub | Normal | 65 | 1230 | 163 | 99 | 800 | 45 | Frost fur |
| IceGolem | Normal | 70 | 1320 | 175 | 180 | 860 | 48 | Ice shard |
| Snowcap | Normal | 76 | 1428 | 189.4 | 114.39999999999999 | 932 | 51 | Snow spore |
| PeakOwl | Normal | 82 | 1536 | 203.79999999999998 | 122.8 | 1004 | 55 | Sky feather |
| FrostWolf | Normal | 90 | 1680 | 223 | 134 | 1100 | 60 | Frost fang |
| Rootling | Normal | 40 | 780 | 103 | 64 | 500 | 30 | Ancient root |
| RuinSentinel | Normal | 45 | 870 | 115 | 71 | 560 | 33 | Rune stone |
| ShadeWisp | Normal | 50 | 960 | 127 | 78 | 620 | 36 | Shade essence |
| StoneWarden | Normal | 55 | 1050 | 139 | 160 | 680 | 39 | Warden stone |
| VineBeast | Normal | 60 | 1140 | 151 | 92 | 740 | 42 | Living vine |
| TownWildwoodKing | Boss | 8 | 3264 | 78.6 | 57.599999999999994 | 1392 | 120 | Soft fur |
| TownBrambleCaptain | Mini | 8 | 1020 | 47.16 | 34.56 | 464 | 40 | Verdant leaf |
| MooncapMonarch | Boss | 15 | 5280 | 129 | 87 | 2400 | 180 | Forest mushroom |
| DewdropMatriarch | Mini | 15 | 1650 | 77.4 | 52.2 | 800 | 60 | Dew jelly |
| AmberAntlerKing | Boss | 35 | 11040 | 273 | 171 | 5280 | 324 | Amber antler |
| HoneyHiveMarshal | Mini | 35 | 3450 | 163.8 | 102.60000000000001 | 1760 | 108 | Golden honey |
| CrystalShellSovereign | Boss | 60 | 18240 | 453 | 276 | 8880 | 504 | River shell |
| MarshWispHerald | Mini | 60 | 5700 | 271.8 | 165.6 | 2960 | 168 | Wisp essence |
| FrostfangSovereign | Boss | 90 | 26880 | 669 | 402 | 13200 | 720 | Frost fang |
| IceboundSentinel | Mini | 90 | 8400 | 401.40000000000003 | 241.20000000000002 | 4400 | 240 | Ice shard |
| RootheartGuardian | Boss | 65 | 19680 | 489 | 297 | 9600 | 540 | Rootheart core |
| RuinShadeHerald | Mini | 65 | 6150 | 293.40000000000003 | 178.20000000000002 | 3200 | 180 | Shade essence |

| แผนที่ | Lv เข้า | ช่วงแนะนำ |
| --- | --- | --- |
| Sprout Town | 1 | 1–100 |
| Moonlit Glade | 1 | 1–20 |
| Amber Orchard | 20 | 20–40 |
| Crystal Marsh | 40 | 40–65 |
| Frostpeak Trail | 65 | 65–100 |
| Rootheart Ruins | 40 | 40–100 |

ทุกแผนที่ ground96×96 เดินได้ −46…46; ruins ออนไลน์ต้อง party2–4 และทุกคน Lv40 พื้นที่กลางเมืองปลอดภัย radius16; ใกล้ portal radius5 และ NPC radius4 ไม่ autoaggro

## 10. ดรอปและรางวัล

อุปกรณ์ดรอป 1 ชิ้นต่อการสุ่ม: Normal/Mini 16%, Boss75% เลือกเซ็ตสูงสุดที่ Lvมอนสเตอร์ถึง (10/30/50/70/90) มอนสเตอร์ต่ำกว่า10ยังดรอปเซ็ต10ได้ จากนั้นเลือก 1 ใน8แบบเท่าๆ กัน (รวมอาวุธอาชีพอื่น)

| Rarity | สัดส่วนเมื่อมีอุปกรณ์ดรอป Normal/Mini | โอกาสต่อ kill Normal/Mini | สัดส่วน Boss | โอกาสต่อ kill Boss |
| --- | --- | --- | --- | --- |
| Common | 70% | 11.2% | 20% | 15% |
| Rare | 23% | 3.68% | 40% | 30% |
| Epic | 6% | 0.96% | 30% | 22.5% |
| Legend | 1% | 0.16% | 10% | 7.5% |

Mini ใช้อัตราดรอปปกติใน implementation ปัจจุบัน ไม่ใช่ Boss หินสุ่มแยกจากอุปกรณ์: Normal/Mini Rare3%, Common20%, ไม่ดรอป77%; Boss Rare20%, Common60%, ไม่ดรอป20% วัสดุประจำชนิด 1 ชิ้นต่อ kill

EXPเดี่ยว = round(EXPมอนสเตอร์ ×(1+EXPbonus/100) ×EXPCharmMultiplier) เงินเดี่ยว = round(เงินมอนสเตอร์ ×(1+Goldbonus/100)) EXP Charm ×9999 ใช้เมื่อมีของในกระเป๋าและใส่ช่องเสริม ไม่ต้องกดใช้ ไม่กินของ ไม่มีซ้อนหลายช่อง EXP Tome ให้1000 ไม่คูณ charm

Party: สมาชิกต้องมีชีวิต อยู่ห้องเดียวกัน และใกล้มอนสเตอร์ <30หน่วย EXPฐานแบ่ง floor(EXP/N) ขั้นต่ำ1 และเงิน floor(Gold/N) แล้วคูณโบนัสของแต่ละคน วัสดุ/หิน/อุปกรณ์แจกวนสมาชิก ไม่มี party EXP multiplier พิเศษ

เควส EXP ไม่คูณ EXPbonusอุปกรณ์ในเส้นทาง claim แต่คูณ EXP Charm; มอนสเตอร์ที่ถูกแอดมินปรับจะใช้ค่า override

| เควส | เป้าหมาย | EXP | เงิน | ของ/จำนวน |
| --- | --- | --- | --- | --- |
| Woodland fieldwork | 15 | 300 | 200 | Red potion ×4 |
| Made with your own hands | 1 | 200 | 120 | Blue potion ×4 |
| Orchard trouble | 12 | 1600 | 450 | Amber spore ×3 |
| A light in the marsh | 12 | 3500 | 700 | Crystal dust ×3 |
| The long climb | 15 | 7000 | 1200 | Frost fang ×3 |
| The Rootheart awakens | 1 | 8000 | 1800 | Rootheart core ×1 |

## 11. ยา เศรษฐกิจ และจุดแก้ค่า

Red potion ฟื้น65HP ราคา15z; Blue potion ฟื้น40MP ราคา20z; cooldownร่วม2s ทั้ง4ช่องเสริม; Healingโบนัสใช้กับทั้งHPและMP เสียชีวิตเสีย15z (ไม่ติดลบ), รอ1.2s แล้วกลับ (0,2) HP/MPเต็ม ไม่เสียEXP กระเป๋า144ช่อง (8×6×3) อุปกรณ์แต่ละชิ้นกินหนึ่งช่อง วัสดุและยา stackตามชื่อ

ไฟล์ปรับสมดุล:
- `src/simulation.ts`: maxXp, HP/MP/ATK/DEF, critical/regen/caps, addExperienceแต้มต่อเลเวล, ดาเมจ, ยา, ค่าตาย
- `src/game/equipment.ts`: 58นิยามอุปกรณ์, สูตร5เซ็ต, rarityMultiplier, affixRanges/factor, setBonuses, ดรอป
- `src/game/refinement.ts`: โอกาสสำเร็จ, โบนัสสะสม, downgrade, ค่าเงิน, หินดรอป
- `src/game/classes.ts`: MAX_LEVEL, อาชีพ, สกิล60รายการ, damageAfterDefense
- `src/game/content.ts`: มอนสเตอร์37ชนิด/elite, แผนที่, เควส
- `src/game/items.ts`: EXPCharm/Tome
- `server/community.ts`: แบ่งรางวัล/การช่วยเพื่อนใน party
- `server/realm.ts`: monster balance overrides และกฎออนไลน์

รายการ CSV อยู่โฟลเดอร์เดียวกันเพื่อเปิดใน spreadsheet ค่าสถานะที่คำนวณเป็นทศนิยมใช้ JavaScript Math.round ใน runtime ตารางช่วงสุ่มจัดรูปแบบเพื่อให้อ่านง่าย ค่า scalar สถานะรองเก็บเป็นเปอร์เซ็นต์ เช่น critChance5 หมายถึง5% ไม่ใช่0.05

## 12. ตัวอย่างปลายเกมสำหรับเทียบ build

สวม Starfall ครบ6ช่อง Legend +10 (ไม่รวมสถานะรอง/Buff):

| อาชีพ | ATK เมื่อลงสถานะโจมตีทั้งหมด | HP เมื่อลง VIT ทั้งหมด | DEF เมื่อลง VIT ทั้งหมด | MP |
| --- | --- | --- | --- | --- |
| swordsman | 1654.2 | 5245.8 | 1490.6 | 1172.95 |
| mage | 1617.45 | 5245.8 | 1490.6 | 1812.4 |
| archer | 1619.9 | 5245.8 | 1490.6 | 1172.95 |

แต่ละคอลัมน์ที่ลงแต้มเป็นคนละ build ไม่ใช่ตัวละครเดียวได้ทั้งหมด และเป็นตัวอย่างเซ็ตสูงสุด ไม่ใช่การพิสูจน์ว่า build ผสมอุปกรณ์ทุกแบบจะต่ำกว่าเสมอ เช่น ของคราฟต์บางชิ้นมี STR หรือ VIT ซึ่งเซ็ตไม่มี หากต้องการ hard cap ควรกำหนดแยกจากตัวอย่างนี้

กฎเพิ่มเติม: รีเซ็ตสกิลฟรีเมื่อออกจากต่อสู้และรอ buff/cooldownหมด ไม่รีเซ็ตแต้ม STR/VIT/AGI; สกิลช่วยเพื่อนใน party ระยะ8หน่วย ฟื้นHPเพื่อน60%ของ powerผู้ใช้ (คูณ healingของผู้รับ) หรือให้ Guard/Fury70%ของ powerผู้ใช้ ระยะเวลาเท่าต้นฉบับ; Swordsman Guard ดึง aggro มอนสเตอร์ใน5หน่วย ตลาดหักค่าธรรมเนียม10% ผู้ขายรับ floor(ราคา×0.9)

## การปรับค่าหลังแยก config

ปัจจุบันแก้ค่าผ่านไฟล์ JSON ใน `src/config/` ตามคู่มือ `src/config/README-TH.md` แทนการแก้ตัวเลขในโค้ดที่ระบุด้านบน ตารางในเอกสารนี้เป็นค่า default ณ ก่อนเปลี่ยนบาลานซ์ ไม่อัปเดตตัวเองเมื่อคุณแก้ JSON หลังแก้ต้อง build/restart ทั้ง client และ server ให้ตรงกัน
