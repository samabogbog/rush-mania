# ปรับสมดุล Mossvale ด้วย JSON

แก้ไฟล์ที่ต้องการ บันทึก แล้ว rebuild และ restart/deploy **ทั้ง client และ server รุ่นเดียวกัน** ค่าโหลดเมื่อ import module ไม่ใช่ live editor และไม่มีเมนูแอดมินใหม่ ไม่มีการเปลี่ยนเวอร์ชันเซฟ รีเซ็ตบัญชี หรือย้าย progression ผู้เล่นเดิม

| ไฟล์ | ค่าแก้หลัก |
| --- | --- |
| progression.json | `levels` ตาราง EXP 1–100, `pointsPerLevel`, สูตร HP/MP/ATK/DEF, crit/regen, `caps`, ค่าเริ่มผู้เล่นใหม่ |
| classes.json | `classes` ระยะ/ช่วงโจมตี, `skills` 60 รายการ: MP, cooldown, power, range, radius, duration, cast, level |
| equipment.json | `crafted` 18 สูตรเดิม, `sets` 5 เซ็ต, `pieceFormulas`, rarity, affix, โบนัสเซ็ต, `drops.levels`, `drops.slotMultipliers`, `eliteDrops` |
| salvage.json | `levels`: จำนวนต่อวัสดุแต่ละชนิด Common/Rare/Epic; `materials` คู่ offense/defense; `sale`: สัดส่วนราคาขาย/ตัวคูณ rarity (Ancient/Legend ไม่ย่อย) |
| refinement.json | success 10 ขั้น, rareMultiplier, bonusLinear, cost, downgrade, stoneCraftCount และดรอปหิน |
| content.json | `normalBalance` checkpoints/multipliers, `species` identity/AI/legacy stats, `zones.level` ระดับเข้า, `recommendedLevel` เริ่มช่วงแนะนำ, `maxLevel` จบช่วงแนะนำ/รายชื่อมอนสเตอร์, `quests` รางวัล |
| monster-groups.json | รัศมีเขต/จุดเกิด, ความเร็ววิ่ง, ตำแหน่งและจำนวน6–8ตัวต่อกลุ่ม; ตรวจด้วย `validateMonsterGroupConfig` ใน map-data.ts |
| economy.json | ยา/ราคา, EXP Tome/Charm, ตาย, party/support/dungeon/market, respawn/พักโจมตี/ฟื้นเมื่อกลับบ้าน, safe radius |
| schema.json | รูปร่างข้อมูลสำหรับตรวจเมื่อเริ่มเกม ไม่ใช่ค่าบาลานซ์; ห้ามแก้เพื่อข้าม validation |
| manifest.json | รายชื่อไฟล์และรุ่นรูปแบบสำหรับค้นหา |

## หน่วยและสูตร

- เวลาเป็นวินาที ระยะเป็นหน่วยโลก ราคาเป็น zeny
- affix และโบนัสอุปกรณ์เป็น **จุดเปอร์เซ็นต์**: `critChance:5` คือ 5%; `hpRegen:0.5` คือ 0.5% Max HP ต่อวินาที; `mpRegen` เป็น MP ต่อวินาที
- `progression.critBase:0.05` คือ 5%, `critAgi:0.002` คือเพิ่ม 0.2 จุดเปอร์เซ็นต์ต่อ AGI; `caps.crit:0.6` คือ 60%. `caps` ทั้งหมดเป็น **สัดส่วน 0–1** (attackSpeed 0.25 คือโบนัสสูงสุด 25%, healing 1 คือโบนัส 100%) ไม่ใช่หน่วยเดียวกับ affix
- โอกาส `success`, `dropChance`, `downgradeChance`, `marketFee` เป็นสัดส่วน 0–1 เช่น 0.15=15%. `crafting.rarityThresholds` และ `stoneDropThresholds` เป็นขอบสะสม เรียงขึ้น (ไม่ใช่โอกาสแยกแต่ละ rarity)
- `power` ของ hit/area/stun/slow/poison เป็นตัวคูณ ATK; heal เป็นสัดส่วน Max HP; guard/fury เป็นสัดส่วนลดดาเมจ/เพิ่ม ATK. Guard ต้องไม่เกิน 1
- EXP ขั้นถัดไป = `levels[level-1].nextLevelXp` ตาม XLSX (Lv100 runtime=0); ค่า HP/MP/ATK ต่อเลเวลใช้ (level−1), DEF ใช้ level
- `pieceFormulas` เก็บ `[ตัวคูณเลเวล,ค่าคงที่]`: ATK/DEF ปัด Math.round; STR/AGI ปัด Math.ceil; HP/MP ไม่ปัด. rarity ปัดหลักเป็นจำนวนเต็มก่อนตีบวก แล้วปัดสุดท้าย 2 ตำแหน่ง
- refinement bonus = n×(bonusLinear+n)/2; success[n] เป็นโอกาสจาก +n ไป +(n+1). Rare คูณ rareMultiplier และ cap100%; downgrade เป็นโอกาส **เมื่อ fail แล้ว**

## ตัวอย่างแก้

1. เปลี่ยน EXP ขั้นถัดไป: `progression.json` → `levels[level-1].nextLevelXp`; เซฟเดิมไม่ถูก reset
2. ให้ Red potion ฟื้น 80 ราคา 18: `economy.json` → `redPotion:{"heal":80,"cost":18}`. ร้านค้า tooltip และ simulation ใช้ค่าเดียวกัน
3. เพิ่มโอกาส Common ต่อช่องของมอนสเตอร์Lv5จาก1%เป็น2%: `equipment.json` → `drops.levels[0].common:0.02`; ไม่กระทบ Rare. `slotMultipliers` ของ helmet/armor/pants/boots เท่ากับ1.5; weapon/accessoryเท่ากับ1
4. ลด Fire Bolt ใช้ MP: หา id `mage-1` ใน `classes.json`, แก้ `mp`; คำบรรยายที่ใส่ตัวเลขเองควรแก้ `description` ด้วย
5. เปลี่ยน HP มอนสเตอร์: `content.json` → `normalBalance.checkpoints[].hp` และ elite multipliers. ค่า hp/atk/defense/xp/gold ใน species เป็น legacy snapshot สำหรับตรวจย้อนหลังและ migration ไม่ใช่ default runtime; server admin override ยังมีลำดับเหนือ default ใหม่

## เงื่อนไขร่วมและขอบเขต

คง id อาชีพ/สกิล/เซ็ต/อุปกรณ์/มอนสเตอร์/เควส, ชื่อยา/วัสดุ, slot, stage/branch และจำนวนรายการเดิมเพื่อรองรับเซฟและ artwork. maxLevel100, bagCapacity144, 10 stage×2 branch, 6 gear slots และ layout/hotbar เป็นโครงสร้างระบบ ไม่ใช่ค่าปรับสมดุลทั่วไป; validation ปฏิเสธการเปลี่ยน cap100 และ capacity144. การเพิ่มชนิด/ช่อง/สกิลต้องพัฒนา schema/UI/save migration ต่างหาก

สูตรเซ็ตขึ้นกับ `sets[].level` และ pieceFormulas; gear level, zone level, skill level และ dungeonLevel ไม่เปลี่ยนตามกันอัตโนมัติ ให้ตรวจความสัมพันธ์ทุกครั้ง. ค่าเริ่ม HP/MP/gold/stats/potions ใช้เฉพาะผู้เล่นใหม่ ไม่เขียนทับเซฟเดิม. ค่าเริ่ม HP/MP ควรไม่เกินสูตร max ของผู้เล่นใหม่. คำบรรยาย prose ใน JSON แก้ด้วยมือเมื่อมีเลขระบุ (ตัวเลข runtime และ preview อ่าน config)

server authoritative และ monster overrides เดิมคงอยู่. ตำแหน่งกลุ่มและความเร็ววิ่งแก้ใน monster-groups.json; Collision/ขนาด terrain/แอนิเมชัน/VFX/ข้อจำกัดระบบตลาดและเครือข่ายไม่ใช่บาลานซ์ในไฟล์นี้. เปลี่ยนการต่อสู้ต้องทดสอบทั้ง practice และ online; JSON ไม่รับ code/formula executable

validateConfiguration ใช้ได้ใน browser และ Worker ไม่ต้อง Node ตรวจ key ที่สะกดผิด รูปร่าง/จำนวนรายการ ตัวเลข finite/nonnegative (ยกเว้น x/z), probability, threshold, divisor, จำนวนเต็ม และอ้างอิง zone/species. ผิดจะหยุด import พร้อม path ชัดเจน. ทดสอบ: `npx tsc --noEmit` และ `npx playwright test tests/balance-config.spec.ts`; golden catalog ใน docs/balance/catalog.json ตรวจ default ทั้งหมดเหมือนเดิม

## วัตถุดิบและการคราฟต์แยก rarity

`crafting.json` เป็นจุดปรับใหม่: มอนสเตอร์ปกติทุกแผนที่มีโอกาสดรอปวัตถุดิบ 65% ครั้งละ 1 ชิ้น บอส 100% ครั้งละ 3 ชิ้น เลือก Shade essence / Sky feather / Rune stone เท่ากันทั้งสามชนิด ไม่ต้องไปพื้นที่เลเวลสูงเพื่อหาวัตถุดิบเริ่มต้น ดรอปประจำชนิดมอนสเตอร์และอุปกรณ์เดิมยังอยู่

- `dropChance`, `dropCount`: โอกาสและจำนวนใน helper วัตถุดิบ/บอส; มอนสเตอร์ปกติในเกมใช้ `content.normalBalance.checkpoints[].drops` แยกวัตถุดิบสามชนิด × Common/Rare จากตารางสมดุลที่นำเข้า
- `rarityThresholds`: ขอบสะสมปกติ `[0.75,0.95,0.995]` = Common75%, Rare20%, Epic4.5%, Ancient0.5%; บอส `[0.4,0.75,0.95]` = Common40%, Rare35%, Epic20%, Ancient5%; Legend ใหม่ไม่ดรอปโดยตรง
- `recipe`: ค่าเริ่มที่เลือกเพราะผู้เล่นไม่ได้ระบุจำนวน เป็นจำนวนบวกเพิ่มตามเลเวล `tier=floor(level/levelDivisor)`; Shade essence=`essenceBase+tier` (เริ่ม2); วัตถุดิบคู่=`partnerBase+tier` (เริ่ม1); ราคา=`level×zenyPerLevel` (เริ่ม12) จึง Lv1 ใช้2+1, Lv90 ใช้11+10 ราคา1080z
- อาวุธและเครื่องประดับใช้ Shade essence + Rune stone; หมวก เสื้อ กางเกง รองเท้าใช้ Shade essence + Sky feather วัตถุดิบทั้งคู่ต้อง rarity ตรงกับที่เลือกใน Forge ทุกชิ้นใน catalog รวมเซ็ตเลเวลสูงคราฟต์ได้ทั้ง Common/Rare/Epic/Ancient/Legend และยังต้องมีเลเวลตามสูตร
- `upgradeCount=5`: วัตถุดิบชนิดเดียวและ rarity เดียว 5 ชิ้น → rarity ถัดไป 1 ชิ้น ฟรี zeny; Legend อัปต่อไม่ได้ ค่านี้ตรวจเป็น5ตามกติกาผู้เล่น
- `primary`: สูตร fallback ATK/STR/AGI สำหรับอาวุธ, ATK สำหรับเครื่องประดับที่ใช้ได้ทุกอาชีพ, DEF/HP สำหรับชิ้นป้องกัน ไม่มี ATK หลักบนชิ้นป้องกัน ค่าที่กำหนดใน equipment.json ยังใช้กับ ATK/DEF/HP ที่ตรงบทบาท; STR/AGI อาวุธคำนวณตามเลเวลและอาชีพ
- `equipment.json` ยังปรับ rarity multiplier, จำนวน/ช่วง secondary affix, เซ็ต และดรอปอุปกรณ์ได้ secondary affix ใช้ pool เดิม ไม่แก้เซ็ตโบนัส

การย้ายข้อมูลรุ่นก่อน (version7): บัญชี เงิน อุปกรณ์ unique ID rarity ตีบวก และ secondary เดิม วัตถุดิบสามชนิดที่ไม่มี rarity เป็นCommon สแต็กชนิด/rarityเดียวกันรวมโดยรักษาจำนวน สแต็กต่างrarityแยกกันทั้ง Bag/Trade/Market/Admin/loot กางเกงแทนถุงมือใน6ช่องเดิม: gear ID ลงท้าย `-gloves` คงไว้เพื่ออ้างอิงเซฟ แต่แสดง Pants ไอคอน `gear-pants` และย้าย equipped.gloves ไปpants

หมายเหตุ `docs/balance/catalog.json` เป็น snapshot ก่อนระบบนี้ ไม่ใช่ค่าคราฟต์ปัจจุบัน; tests ตรวจว่า ID อุปกรณ์เดิมคงอยู่และตรวจสูตร/บทบาทใหม่แยกกัน

รายละเอียดไฟล์อัปโหลดและกติกาการ mapping: `docs/IMPORTED-BALANCE.md`.

## แผนที่และดรอปอุปกรณ์ 7 ต.ค. 2026

ดู [ตารางและกติกาล่าสุด](../../docs/MAP-DROP-BALANCE-TH.md). อุปกรณ์ใช้ `equipment.drops` แทน global dropChance/rarityThresholds เดิม: สุ่มแยก6ช่องต่อkill, Common/Rareไม่ซ้อนในช่องเดียว, มอนสเตอร์ปกติไม่มี Epic/Ancient/Legend; boss/miniรับประกัน2ชิ้นRare/EpicตามeliteDrops. Item เดิมทุกrarityยังอยู่และคราฟต์ได้ตามระบบเดิม. `normalBalance.previousRevisionHp` เป็น snapshot migration revision2 (revision3Hpสำหรับrevision3) ห้ามแก้เพื่อปรับHPปัจจุบัน. Town species/groups ว่าง; แผนที่อื่นคง6กลุ่ม.

Eliteล่าสุด: `content.normalBalance.boss/mini` กำหนดHP/ATK/DEF multiplierเทียบnormalระดับเดียวกันและgoldPerLevel. `equipment.eliteDrops` แยกboss/mini4กลุ่มน้ำหนักรวม1, รับประกัน2independentdraws, ซ้ำslotได้. normaldropsไม่เปลี่ยน. รายละเอียดตารางในdocs/MAP-DROP-BALANCE-TH.md

## Skill ranks ล่าสุด

`skill-ranks.json` ระบุ10ระดับปลดล็อก×5rank, damagePercent (เช่น200=200%ATK), targets, defaultAttackRadius, maxRank5 และงบ1SPต่อlevel/1SPต่อrank. ทุก60สกิลเป็นโจมตีแล้วตามคำขอ; heal/guard/furyเดิมเปลี่ยนarea ไม่มีpartyheal/buff. ดู [ตารางและกติกา](../../docs/SKILL-RANKS-TH.md). Damageจริงมาจากranktable ไม่ใช่powerเดิมในclasses.json. การเรียน/upgrade/resetแชร์งบข้ามอาชีพ เซฟเดิมchoicesเริ่มrank1ในversion8โดยคงข้อมูลผู้เล่นเดิม

จำนวน affix ใหม่ใน equipment.json: Common1 Rare2 Epic3 Ancient4 Legend5; ไม่ reroll หรือเพิ่ม affix ให้ชิ้นเดิม. Salvage จำนวนต่อวัสดุ **แต่ละชนิด** (Lv10 Common: Shade2 + Rune2 สำหรับ offense), เก็บ rarity เดิม. Gear รุ่นเก่าใช้ tier สูงสุดที่ไม่เกิน level (ต่ำกว่า10ใช้10); Ancient/Legend ย่อยไม่ได้. ขาย/ย่อยชิ้นที่ใส่อยู่ต้องถอดก่อน และย่อยตรวจพื้นที่วัสดุครบสองชนิดก่อนตัดชิ้นเดิม. แก้ JSON ต้อง build/restart เช่นเดียวกับไฟล์อื่น.

item-migration.json เก็บรายชื่อวัสดุที่เลิกใช้และ revision ของ migration ไม่ใช่รายการดรอป. เซฟ9/realm itemRevision1 เปลี่ยน Legend เดิมเป็น Ancient (1.45×/4 affix) และลบเฉพาะวัสดุเก่าที่ระบุ; Legend ใหม่1.75×/5 affix ได้จากวัสดุ5Ancient→1Legend ไม่ดรอปตรง. ID material:*:legend เดิมเปลี่ยน ancient พร้อม trade reference; UUID gear/refine/secondary/gold/quest progress คงเดิม.

## Normal attack speed

`classes.classes.*.speed` is the normal attack interval in seconds at total AGI 5: Swordsman 1.0, Mage 1.2, Archer 1.1. Client and server use the same Simulation. `progression.attackAgiBase=5`, `attackRateCeiling=2` attacks/sec and `attackAgiHalfSaturation=50` control diminishing AGI returns:

`extraAgi=max(0,totalAGI-attackAgiBase)`; `baseRate=1/class.speed`; `rate=baseRate+(attackRateCeiling-baseRate)*extraAgi/(extraAgi+attackAgiHalfSaturation)`. At 55 total AGI the rate is halfway between its class baseline and the ceiling; finite AGI approaches the ceiling from below. Gear AGI contributes to total AGI.

Gear attackSpeed affixes use percentage points, separately capped by `progression.caps.attackSpeed=0.25`: `interval=1/(rate*(1+min(0.25,gearSpeed/100)))`. The character panel shows this capped effective gear bonus (maximum 25%). Gear speed can raise the final rate above 2 attacks/sec; the AGI ceiling excludes this bonus.
