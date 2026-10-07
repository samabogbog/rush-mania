# แผนที่และดรอปอุปกรณ์ — 7 ตุลาคม 2026

ตารางนี้แทนค่าแผนที่/ดรอปอุปกรณ์ก่อนหน้า ปรับได้ใน `src/config/content.json`, `monster-groups.json`, `equipment.json` และ `economy.json`. ต้อง rebuild/restart ทั้ง client และ server

| แผนที่ | Lvเข้า | ช่วงแนะนำ | Lvมอนสเตอร์ปกติ | Boss/Mini |
| --- | --- | --- | --- | --- |
| Sprout Town | 1 | 1–100 | ไม่มี | ไม่มี |
| Moonlit Glade | 1 | 1–20 | 5,10,15 | 20 |
| Amber Orchard | 10 | 20–40 | 25,35 | 40 |
| Crystal Marsh | 30 | 40–60 | 45,55 | 60 |
| Frostpeak Trail | 50 | 60–80 | 65,75 | 80 |
| Rootheart Ruins | 70 | 80–100 | 85,95 | 100 |

Town ไม่มีมอนสเตอร์หรือกลุ่มมอนสเตอร์ทุกจุด แผนที่อื่นยังมี6กลุ่ม×6–8ตัวและBoss/Miniอย่างละ1. เก็บ species ธีมเดิมและ id เดิม; กลุ่มวนใช้speciesทำให้ระดับที่ระบุเกิดจริงทั้งหมด. Ruinsออนไลน์ยังต้องparty2–4และทุกคนLv70ขึ้นไป; recommended rangeเป็นคำแนะนำไม่ใช่ข้อจำกัดเข้า

## อุปกรณ์

ผู้ใช้ยืนยันสุ่ม **แยกต่อช่อง** ทุกkillมี6การสุ่ม: weapon, helmet, armor, pants, boots, accessory. Common/Rareใช้หนึ่งrollร่วมในแต่ละช่องและไม่ซ้อนกัน; หลายช่องดรอปพร้อมกันได้ สูงสุด6ชิ้น. ตารางนี้ใช้เฉพาะมอนสเตอร์ปกติ; Boss/Miniใช้ตารางสองชิ้นในส่วนeliteด้านล่าง. อาวุธที่ดรอปเลือกดาบ/ไม้เท้า/ธนูเท่าๆกัน ไม่ล็อกอาชีพผู้เล่น

| Lvมอนสเตอร์ | Lvอุปกรณ์เซ็ต | Commonต่อช่องโจมตี | Rareต่อช่องโจมตี |
| --- | --- | --- | --- |
| 5 | 10 | 1% | 0.2% |
| 10 | 10 | 1.5% | 0.3% |
| 15 | 10 | 2% | 0.4% |
| 25 | 30 | 1% | 0.2% |
| 35 | 30 | 2% | 0.4% |
| 45 | 50 | 1% | 0.2% |
| 55 | 50 | 2% | 0.4% |
| 65 | 70 | 1% | 0.2% |
| 75 | 70 | 2% | 0.4% |
| 85 | 90 | 1% | 0.2% |
| 95 | 90 | 2% | 0.4% |

ช่องโจมตี=weapon/accessory; ช่องป้องกัน=helmet(หมวก)/armor(เสื้อ)/pants(กางเกง)/boots(รองเท้า) คูณทั้งCommonและRareด้วย1.5. เช่นLv5แต่ละช่องป้องกันCommon1.5%, Rare0.3%. ค่าJSONเป็นสัดส่วน1%=0.01 ไม่ใช่1. จำนวนชิ้นคาดหมายของLv5คือ2×(0.01+0.002)+4×1.5×(0.01+0.002)=0.096ชิ้นต่อkill (ไม่ใช่โอกาสรวม9.6% เพราะอาจดรอปหลายชิ้น)

`drops.levels` ระบุระดับ/เซ็ต/โอกาส, `drops.slotMultipliers` ระบุตัวคูณแต่ละช่อง. ระดับอื่นที่ไม่ได้เกิดตามตารางใช้แถวก่อนหน้า (ต่ำกว่า5ใช้แถว5, สูงกว่า95ใช้แถว95) เพื่อให้ค่าแอดมิน/เนื้อหาเพิ่มเติมมีfallbackชัดเจน. ไม่มีการสุ่มEpic/Legendในเส้นทางมอนสเตอร์ปกติ แต่ของเดิม Epic/Legend และสูตรคราฟต์/affixเดิมคงอยู่

## การย้ายโลกที่เซฟไว้

layout revision6/balance revision4สร้างกลุ่มตามค่าใหม่และล้างtown monsters. จับคู่มอนสเตอร์ธีมเดิมเพื่อรักษาสัดส่วนHPจากsnapshotrevision2หรือrevision3ก่อนเปลี่ยนlevel, การตาย/respawn/status timers, overrideแอดมิน. เปลี่ยนtarget/cast/routeที่ผูกกับโลกเก่าเท่านั้นและเปลี่ยนsessionเพื่อกันคำสั่งค้าง; ไม่รีเซ็ตlevel/EXP/gold/stats/quests/inventory/บัญชีหรือlootที่ผู้เล่นถือไว้. ตรวจและย้ายเพียงครั้งเดียว. `normalBalance.previousRevisionHp` มีไว้สำหรับmigrationเท่านั้น

EXP/HP/ATK/DEF/เงินยังใช้normalBalanceและprogressionระดับใหม่; ตารางmaterial/stoneและสูตรอื่นไม่ได้เปลี่ยนในงานนี้. ค่าชนิดมอนสเตอร์ดิบในspeciesเป็นlegacy snapshot; ค่าปัจจุบันมาจากSimulation.monsterSpec

## ผลตรวจรอบแผนที่ก่อนปรับบอส

Production build ผ่าน; ตรวจ config, ตารางทั้ง11ระดับ×6ช่อง, ดรอปหลายชิ้นแบบ solo/party, server authority, การเข้าแผนที่และย้ายเซฟ71รายการผ่าน. Browser ตรวจ1200×800ในpracticeด้วยตัวละครLv10: โหลดโมเดลครบและไม่มีmodel/page errors, townไม่มีมอนสเตอร์/วงหวงห้าม, แสดงentry/recommendedครบ6พื้นที่, orchardเปิดให้เข้าและmarshถูกล็อก, เดินไปportalและเข้าorchardจริง พบ44มอนสเตอร์. ภาพใน `artifacts/map-balance/`. ใช้headless Chromium SwiftShaderเพื่อความถูกต้อง ไม่ใช่ผลFPSเครื่องผู้เล่น.

## Boss / Mini-boss ล่าสุด

Boss/Miniอยู่Lv20/40/60/80/100ตามglade/orchard/marsh/frost/ruins และดรอปเซ็ตLv10/30/50/70/90ตามลำดับ. Townยังไม่มีมอนสเตอร์

| ประเภท | HPเทียบnormalระดับเดียวกัน | ATK | DEF | เงินฐาน |
| --- | --- | --- | --- | --- |
| Boss | ×30 | ×6 | ×2 | Lv×50 z |
| Mini | ×15 | ×3 | ×1.5 | Lv×30 z |

goldBonusของผู้รับยังคูณเงินฐานตามสูตรเดิม; partyแบ่งฐานก่อนคูณโบนัสรายคน. กฎEXPไม่เปลี่ยน: base monsterXpของระดับนั้นจากprogression แล้วBoss×12/Mini×4. เปลี่ยนlevelทำให้baseEXPเปลี่ยนตามตารางเดิม ไม่ได้เพิ่มสูตรXPใหม่

**รับประกันอุปกรณ์2ชิ้นต่อkill** (ไม่ใช่2ชิ้นต่อสมาชิกparty). แต่ละชิ้นสุ่มกลุ่มด้วยน้ำหนักต่อไปนี้ แล้วเลือกslotเท่าๆกันภายในกลุ่ม. สองชิ้นสุ่มอิสระ ซ้ำslot/แบบอุปกรณ์ได้ แต่แต่ละชิ้นมีUUIDและaffixของตัวเอง

| กลุ่ม | Boss | Mini |
| --- | --- | --- |
| Attack Rare | 12% | 20% |
| Defense Rare | 18% | 30% |
| Attack Epic | 28% | 20% |
| Defense Epic | 42% | 30% |

Attackคือweapon/accessory; Defenseคือhelmet/armor/pants/boots. เมื่อเลือกweaponแล้วเลือกอาวุธ3อาชีพเท่าๆกัน. รวมBoss Rare30%/Epic70%, Mini Rare50%/Epic50%; ทั้งคู่Attack40%/Defense60%. ไม่มีCommonหรือLegendในelite equipment drops. ตัวคูณป้องกัน1.5ของnormal tableไม่ใช้ซ้ำกับelite เพราะน้ำหนักDefenseรวมอยู่แล้ว

จุดแก้: `content.normalBalance.boss/mini` (hp/atk/defense/goldPerLevel), `equipment.eliteDrops` (levels/count/groups/weights). countต้อง2, weightsต้องรวม1; ตรวจเมื่อimport. `normalBalance.revision3Hp` เป็นsnapshotHPเก่าก่อนeliteรอบนี้เพื่อmigration ห้ามใช้ปรับHPปัจจุบัน. snapshotrevision2เดิมยังคงไว้ให้เซฟเก่าข้ามหลายรุ่นได้

## ผลตรวจรอบบอสล่าสุด

Production build ผ่าน; 52 targeted checks ผ่าน ครอบคลุมค่าพลัง/เงินทุกelite tier, น้ำหนักและขอบเขตการสุ่มทุกกลุ่ม, ดรอป2ชิ้นพร้อมUUIDต่างกัน, solo/partyและmigrationจากbalance revision3 รวมถึงเซฟเก่าก่อนหน้า. Browser regression1รายการผ่าน: เมืองปลอดมอนสเตอร์และตัวละครLv10เดินผ่านportalเข้าOrchardได้, โมเดลโหลดครบและไม่มีmodel/page errors. การฆ่าelite/ดรอป/เงินตรวจผ่านsimulation/server tests; browserรอบนี้ไม่ได้อ้างทดสอบการฆ่าบอสจริง.
