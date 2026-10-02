# Mossvale — แผนพัฒนาเกมระดับ B+

ปรับปรุง 2 ตุลาคม 2026 · ข้อกำหนดครบทั้ง 12 ส่วน

เป้าหมายคือ MMORPG บนเว็บที่มีวงจร **ต่อสู้ → ฟาร์ม → สร้าง/อัปเกรด → ลงดันเจียนกับเพื่อน** ที่สนุกและเชื่อถือได้ คุณภาพ B+ ต้องตัดสินจากการเล่นและความเสถียร ไม่ใช่จำนวนเมนูหรือฟีเจอร์ที่มีชื่ออยู่ในเกม

## ขอบเขตที่ต้องมี

| ส่วน | งานที่จะทำ | เกณฑ์ผ่านก่อนเปิด B+ |
| --- | --- | --- |
| 1. การต่อสู้ | แอนิเมชัน idle/เดิน/โจมตี/ใช้สกิล/โดนตี/ตาย; hit FX, เสียง, projectile; cast/windup/recovery ที่ต่างกัน; มอนสเตอร์ส่งสัญญาณก่อนโจมตี | ผู้ทดสอบใหม่อ่านท่าและหลบได้; อาวุธทั้งสามรู้สึกต่างกัน; ไม่มีโจมตีทะลุผนังหรือรับดาเมจหลังหลบพ้นแล้ว; ทดสอบที่ latency 150–250 ms |
| 2. ตัวละครและอาชีพ | นักดาบรับแรงปะทะ/ป้องกันทีม, นักเวทโจมตีพื้นที่/ควบคุมศัตรู, นักธนูระยะไกล/จุดอ่อน; 10 สกิลต่ออาชีพ, Lv สูงสุด 100, ปลดล็อกที่ 10/20/…/100; ลงแต้มและเลือกอุปกรณ์ | ทุกสกิลใช้งานได้และมีเหตุผลให้เลือก; มีอย่างน้อย 2 build ต่ออาชีพ; ทดสอบดาเมจ/มานา/cooldown/การขัดจังหวะและ level cap |
| 3. โมเดลและแอนิเมชัน | Rigged GLB พร้อม skeleton/animation; สัดส่วน chibi low poly, สีสดและขอบเขตสไตล์เดียวกัน; socket อาวุธและอุปกรณ์; ใบอนุญาตของทุก asset | แต่ละ clip เล่นและเปลี่ยนท่าได้จริง; อาวุธตามมือ; ไม่ลอย/จมหรือผิด scale; ตรวจจำนวน triangle, material, texture และขนาดไฟล์บนมือถือ |
| 4. โลกและเนื้อหา | เมืองหลัก 1, พื้นที่ฟาร์ม 4, ดันเจียน 1, มอนสเตอร์ 24–26 ชนิดรวมบอส; NPC ร้าน/ช่าง/เควส; เควสพาเดินเส้นทางเติบโต | ทุกพื้นที่เข้าถึงและกลับเมืองได้; มีชนิดศัตรูและเหตุผลฟาร์มต่างกัน; เควสเริ่ม/คืบหน้า/รับรางวัลได้ครั้งเดียว; บอสมีอย่างน้อย 3 ท่าที่อ่านได้ |
| 5. ฟาร์มและอุปกรณ์ | Drop table มีชนิด/โอกาส/แหล่ง; weapon/armor/accessory หลายแนว; คราฟต์; refinement; สมุดแหล่งวัตถุดิบ | ของทุกชิ้นมีประโยชน์หรือราคาขาย; แสดงสูตรและวัตถุดิบที่ขาด; เซิร์ฟเวอร์หักของและให้ผลลัพธ์เป็นธุรกรรมเดียว; build เปลี่ยนการเล่นได้ |
| 6. ออนไลน์ | บัญชี Sites และตัวละครเซิร์ฟเวอร์; shared map; server authority สำหรับเดิน/สกิล/ดาเมจ/EXP/drop/gold/inventory; session/reconnect | 2 บัญชีเห็นโลกเดียวกัน; แก้ state ใน browser ไม่เพิ่มเงิน/เลเวล; retry คำสั่งเดิมไม่ให้รางวัลซ้ำ; reload/เน็ตหลุดไม่ทำเซฟหาย |
| 7. เล่นร่วมกัน | World/party chat, friend request, party invite/accept/leave ขนาด 2–4; EXP แบ่งคนใกล้เหตุการณ์; loot round-robin; dungeon instance และ skill ช่วยเพื่อน | สองถึงสี่บัญชีร่วมดันเจียนจริง; ผู้หลุดไม่ยึดของ; ไม่มีรับ EXP ข้ามแผนที่; เพื่อนที่รับ invite แล้วเท่านั้นถูกเพิ่ม; นักดาบ/เวท/ธนูช่วยทีมต่างกัน |
| 8. เศรษฐกิจ | ร้าน NPC; trade สองฝ่ายยืนยันข้อเสนอเดียวกัน; marketplace escrow; listing fee/tax/refinement/crafting เป็นเงินออก; unique item IDs และ ledger | ทั้งสองฝั่งยืนยันก่อนแลก; เปลี่ยน offer ยกเลิกคำยืนยันเก่า; disconnect/ซื้อพร้อมกันไม่ทำของซ้ำ; ตรวจยอดเงินและ owner ของ item ทุกธุรกรรม |
| 9. UI/ความสะดวก | กระเป๋า filter/sort, equipment compare tooltip, drag skill hotbar, cooldown/status/cast bar; tutorial ผ่านเดิน/ตี/เก็บ/สวม/อัปเกรด | ใช้ mouse, keyboard, touch ได้; 390 px ไม่มีปุ่มบังกัน; tooltip บอกส่วนต่างค่าพลัง; tutorial มีความคืบหน้าจริงและข้าม/เปิดทบทวนได้ |
| 10. เสียง/บรรยากาศ | เพลงประจำแต่ละพื้นที่; เดิน/โจมตี/สกิล/monster/loot/UI; mix ลดเสียงซ้อน; volume music/SFX แยก | เริ่มเสียงหลัง gesture; mute ทำงาน; เปลี่ยนพื้นที่แล้วเพลงเปลี่ยนโดยไม่ซ้อน; ระบุ license/ผู้สร้างเสียง |
| 11. ประสิทธิภาพ/เสถียรภาพ | งบประมาณ graphics, GLB preload/cache/disposal, ลด draw calls; client FPS/frame-time; server load/latency; reconnect/transaction tests | เครื่องเป้าหมาย desktop 1080p ≥60 FPS และมือถือกลาง ≥30 FPS; load test ผู้เล่นพร้อมกัน 20 คน/zone ก่อน beta; p95 command latency และ error rate รายงานจากการวัด; ทดสอบ soak และ failure injection |
| 12. ดูแลหลังเปิด | Operator tools ดูตัวละคร/ledger, tuning ที่มี audit, log, backup/export/restore drill, bug report และ funnel tutorial/quest/death/disconnect | แอดมินเท่านั้นเข้าถึง; ตรวจย้อนหลังการให้ของ/ปรับ balance ได้; กู้ backup ใน staging ได้; มีขั้นตอน rollback release; dashboard ใช้เหตุการณ์จริง |

### สูตรและกฎ combat

`Damage = ATK × (100 / (DEF + 100))` เป็นขั้นคำนวณพื้นฐาน จากนั้นใช้ตัวคูณสกิล, damage roll ±10%, critical และ buff ตามลำดับที่ระบุในโค้ดเดียวกันบนเซิร์ฟเวอร์ การโจมตีปกติมีตั้งแต่ Lv1; สกิลทั้งสิบปลดล็อกทุก 10 เลเวล รวมสกิลสุดท้ายที่ Lv100 ต้องจำลองครบทั้งช่วงเลเวลเพื่อปรับ EXP curve และความเร็วในการอัปเกรด

## เส้นทางโลกที่ออกแบบไว้

| พื้นที่ | ช่วงเลเวล | สิ่งที่ทำให้ต่างกัน | วัตถุดิบ/เป้าหมาย |
| --- | --- | --- | --- |
| Sprout Town | เมืองปลอดภัย | ร้าน ช่าง เควส บอร์ดปาร์ตี้ ตลาด | สอนคราฟต์และชี้แหล่งของ |
| Moonlit Glade | 1–20 | Slime/เห็ด/พืช, ท่าระยะประชิดง่าย | อุปกรณ์เริ่มต้นและยารักษา |
| Amber Orchard | 20–40 | แมลง/หมูป่า, charge แบบเส้นตรง | build ความเร็ว/critical |
| Crystal Marsh | 40–65 | วิญญาณ/เต่า/แมงกะพรุน, พื้นที่ slow | build มานา/เวท/ต้านทาน |
| Frostpeak Trail | 65–100 | สัตว์น้ำแข็ง/โกเล็ม, พื้นที่โจมตีวงกว้าง | อุปกรณ์ท้ายเกมและของลงดันเจียน |
| Rootheart Ruins | ปาร์ตี้ 2–4, scale ตามช่วงที่เข้าถึง | หลายห้อง, mini-boss, บอส Rootheart Guardian | วัตถุดิบหายาก, อุปกรณ์ทีม, เป้าหมายเล่นซ้ำ |

ชื่อและช่วงเลเวลนี้เป็นข้อเสนอเริ่มต้นสำหรับสร้างเนื้อหา ไม่ใช่การอ้างว่ามีแผนที่เหล่านี้อยู่ในรุ่นปัจจุบันแล้ว

## สถาปัตยกรรม

- **Babylon.js** ดูแล render, camera, picking, rig/animation, FX, resource lifecycle; DOM ดูแล HUD/หน้าต่าง/touch/accessibility
- **Simulation TypeScript** แยกจาก engine และใช้ rules/catalog ชุดเดียวกันกับ server
- **Sites Worker + D1** ใช้ตัวตนจาก dispatcher, เก็บตัวละครและ shared realm, รับเฉพาะคำสั่งผู้เล่นที่ validate ได้, คำนวณจากเวลาของ server
- **Command session + sequence** ทำให้คำสั่งที่ replay หลัง response หายไม่หักเงิน/ให้ของซ้ำ; compare-and-swap revision ป้องกันเขียนทับข้อมูลจากคำขอพร้อมกัน
- รุ่นออนไลน์แรกใช้ HTTP snapshot 5 Hz และ realm aggregate ขนาดจำกัด เป็นจุดเริ่มทดสอบ authority/persistence; ก่อนเพิ่ม concurrency ต้องวัด D1 contention/ค่าใช้จ่ายจริง แล้วแยก actor/zone, ใช้ persistent room actor และ WebSocket เมื่อ runtime รองรับ ไม่อ้างว่า poll-based alpha เป็นโครงสร้าง MMO ขนาดใหญ่เสร็จแล้ว
- เซฟเดิมใน browser คงไว้สำหรับ **Practice** แยกจาก online character; ไม่ import เงิน/เลเวลที่ client อ้างเข้าสู่ระบบออนไลน์

## ลำดับส่งงานและเงื่อนไขการจบแต่ละเฟส

1. **Online foundation:** บัญชี, server save, คำสั่ง, shared monster, peers/chat, reconnect/idempotency, transactional tests — เป็นฐานให้ทุกระบบที่มีของและเงิน
2. **Playable world slice:** เมือง + Glade + dungeon ห้องแรก; NPC, quest chain, rigged player/monster, death/respawn; ฟาร์มคราฟต์อุปกรณ์หนึ่ง build แล้วสู้บอสได้
3. **Equipment + social:** inventory compare/filter, recipes/refinement, เพื่อน/party/EXP/drop sharing, team skills; ทดสอบ party 2–4 ครบ loop
4. **Full content:** พื้นที่ฟาร์มอีก 3, มอนสเตอร์รวม 24–26, boss/dungeon encounter, 2 builds ต่ออาชีพ, level/EXP/drop balance ครบ 1–100
5. **Economy:** confirmed player trade, marketplace escrow, currency sinks/ledger, duplicate/concurrency/failure tests
6. **Beta gate:** tutorial, เพลง/เสียงครบ, มือถือ, operator/backup/restore/telemetry, target-device & 20-player load/soak test; รอบ playtest และปรับ balance

อย่าขยายเป็น 26 มอนสเตอร์ก่อนวงจรต่อสู้และฟาร์มของพื้นที่แรกสนุกพอ และอย่าเปิดตลาดก่อน ownership/transaction tests ผ่าน

## สิ่งที่มีแล้วและสิ่งที่ยังขาด

**มีแล้วก่อนแผนนี้:** Babylon runtime และ render boundary, HUD/icons PNG สดใส, 3 อาชีพ/30 สกิล, Lv100/unlock, damage formula/variance/crit, stun/slow/poison/buffs/casts, telegraph และ dodge, local inventory/merchant/refinement/quest, original procedural map/models/audio, mobile controls, save migration และ browser tests

**เพิ่มใน online foundation:** Worker/D1 schema & migrations, dispatcher identity, server-owned character/clock/actions, shared monster state, remote-player silhouettes, realm chat, session/replay protection, optimistic persistence, reconnect queue, Practice separation; tests สำหรับ authority/parallel writes/replay และ browser/network interruption

**เพิ่มใน alpha 0.2:** เมือง+ฟาร์ม 4 แห่ง+party dungeon, มอนสเตอร์ 26 ชนิด, GLB original rigs 29 ตัว/6 clips, gear 18 แบบ/craft/equip/refine, quests/tutorial, inventory filter/sort/compare, party/friends/team buffs/rewards, confirmed trade/market escrow, area music/monster sounds, quality modes, owner maintenance/backup/restore/tuning/bug reports/command metrics

**ยังต้องผ่านก่อนเรียก B+:** human playtest ความสนุกและความชัดของท่า, art/animation polish, progression/monster/build/economy balance ระยะยาว, FPS บนเครื่องเป้าหมายจริง, network/concurrency/soak บน Sites D1 จริงและหลายบัญชีที่ได้รับสิทธิ์, restore drill production, retention/funnel cohort metrics เชิงลึกและแนวปฏิบัติดูแลเกม รายละเอียดสถานะและหลักฐานอยู่ใน [BPLUS-IMPLEMENTATION.md](BPLUS-IMPLEMENTATION.md)

## สิ่งที่ต้องวัดใน playtest

- 5 นาทีแรก: ผู้เล่นเดิน เลือกเป้าหมาย หลบท่า เก็บของ และรู้ว่าจะพัฒนาตัวละครอย่างไร โดยไม่ต้องอ่านคู่มือยาว
- 30 นาทีแรก: ได้เปลี่ยนอุปกรณ์ ใช้สกิลที่ปลดล็อก เห็นเป้าหมายไปฟาร์มต่อ และเล่นร่วมกับเพื่อนได้
- ระยะยาว: แต่ละ build มีจุดดี/จุดเสีย, เหตุผลลง dungeon ซ้ำ, เงินเข้า/ออกสมดุล, ไม่มี grind ที่ยาวเพียงเพื่อยืดเวลา
- ความผิดพลาด: browser reload, response หายหลัง commit, ส่งคำสั่งซ้ำ, ซื้อพร้อมกัน, disconnect ระหว่าง loot/trade, graphics context loss, deploy/rollback และกู้ backup

ระยะเวลาถึง B+ ต้องประเมินหลัง playable slice และ playtest เพราะงาน art/animation, จำนวน encounter และรอบ balance เป็นตัวแปรหลัก ไม่ควรสัญญาว่าต้นแบบที่ผ่าน unit tests จะเป็นเกม B+ โดยอัตโนมัติ
