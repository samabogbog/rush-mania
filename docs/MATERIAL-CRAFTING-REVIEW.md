# ตรวจรับวัตถุดิบ rarity และคราฟต์

สถานะ: runtime FROZEN พร้อมให้ผู้ควบคุม build/browser QA รอบสุดท้าย (6 ต.ค. 2026)

สิ่งที่เปลี่ยน: Shade essence+Sky feather สำหรับหมวก/เสื้อ/กางเกง/รองเท้า; Shade essence+Rune stone สำหรับอาวุธ/เครื่องประดับ ทุกอุปกรณ์ใน catalog คราฟต์ได้4rarity เลือกCommonเริ่มต้น วัตถุดิบตรงrarityเท่านั้น อัปวัตถุดิบ5→1 rarityถัดไป Legendเป็นสูงสุด ดรอปทุกแผนที่ทั้งปกติ/บอส/party ผ่านserver authorityเดิม

กางเกงแทนช่องถุงมือ รวม6ช่อง IDอุปกรณ์เก่า `*-gloves` คงเดิม แต่ชื่อPantsและPNG gear-pants ที่ผู้ควบคุมสร้างใหม่ equipped.gloves ย้ายไปpants ไม่ลบID/ตีบวก/rarity/secondaryของอุปกรณ์เดิม วัตถุดิบเก่าไม่มีrarityเป็นCommon และรวมสแต็กซ้ำชนิด/rarityเดียวกันโดยคงจำนวน

ค่าบวกที่เลือกเป็นdefaultเมื่อผู้เล่นไม่ระบุจำนวน: Lv1ใช้2Shade+1วัตถุดิบคู่, เพิ่มอีก1ทุก10Lv, zeny=Lv×12; normal65%ดรอป1, boss100%ดรอป3; คู่มือและค่าทั้งหมดอยู่src/config/crafting.json / README-TH.md. ไม่ถือว่าค่านี้ผ่านการบาลานซ์เศรษฐกิจจริงแล้ว

ATK/STRสำหรับswordsman/mage, ATK/AGIสำหรับarcher; เครื่องประดับทั่วไปให้ATKเพื่อใช้ได้ทุกอาชีพ; ชิ้นป้องกันมีDEF/HPหลักเท่านั้น secondaryและเซ็ตโบนัสเดิมยังอยู่ rarity multiplier ใช้กับอุปกรณ์ทุกสูตร

การตรวจที่เสร็จ:
- `npx tsc --noEmit` ผ่าน
- `npx playwright test tests/material-crafting.spec.ts tests/item-admin.spec.ts tests/regen-crafting.spec.ts tests/equipment-drops.spec.ts tests/balance-config.spec.ts tests/community-economy.spec.ts tests/online-authority.spec.ts tests/refinement.spec.ts --reporter=line` : **48ผ่าน** ไม่มีbrowser (ทุกเคสเป็นsimulation/server)
- ครอบคลุมทุกอุปกรณ์×4rarity/affixcounts/roleprimaries, วัตถุดิบผิดrarityไม่คิดเงินหรือทำลาย, สแต็ก2+3ย้ายเป็นCommon5อย่างidempotent, fullbagอัปและคราฟต์โดยใช้ช่องที่วัตถุดิบหมด, overflowไม่เสียของ, normal/bossทุกแผนที่/party, servervalidate/replayของcraftและupgrade, adminrarity, market/tradeเก็บrarity, pantsmigrationเก็บID/ตีบวก/rarity
- เพิ่มbrowserเคสในtests/craft-ui.spec.ts สำหรับเลือกrarity, 5→1, tooltips/สีแยกrarity, Lv90สูตรและPantsPNG; **ยังไม่ได้รันbrowser/build** ต้องรอผู้ควบคุมตรวจ

baselineแยก: tests/world-equipment.spec.tsสามเคสเก่ามีข้อสมมติ26species/เมืองไม่มีมอนสเตอร์ (ปัจจุบัน37และมีบอสเมือง) และlegacyv1realmzoneundefined ไม่แก้worldruntimeในงานนี้ เคสคราฟต์/ค่าใช้จ่ายในไฟล์นั้นอัปเดตให้ตรงสูตรใหม่และผ่านในการรัน33เคสก่อนหน้า (30ผ่าน+3baselineล้ม) docs/balance/catalog.jsonคงhistoricalsnapshot; paritytestตรวจID/สกิล/อาชีพ/เควสต์เดิมและสูตรใหม่โดยตรง

ไฟล์หลัก: src/game/crafting.ts, src/config/crafting.json, equipment.ts, items.ts, simulation.ts, network.ts, main.ts, world.ts(สีloot), server/realm.ts, server/community.ts, configschema/manifest/balance/คู่มือ, testsที่ระบุด้านบน. ไม่มีเปลี่ยนaccount/serverstorage/schemaSaveversion ไม่มีpublish/pushในขั้นนี้

## ผลตรวจรับสุดท้ายโดยผู้ควบคุม

TypeScript/Vite/client/Worker build ผ่าน (warning Babylon chunk ใหญ่เดิม). ชุด logic/server ขยายเป็น 64 กรณีผ่านรวม material/admin/regen/equipment/config/community/authority/refinement/world migration/expanded world/skill paths. Browser craft-ui ทั้ง4กรณีผ่านหลังแก้ QA-only ให้รอ GLB และภาพครบ และใช้ preview sessions ที่คงอยู่; ไม่แก้ runtimeหลังfreeze. ผู้ควบคุมเปิดภาพ craft-grid.png, material-rarity-craft.png และ material-rarity-inventory.png ตรวจสูตรLv90 กางเกง/icon รarityเลือกEpic วัตถุดิบตรงระดับ การคราฟต์สำเร็จ และแยกสแต็ก/tooltipRareEpic. มือถือผ่าน8column/nooverflow/info interaction. Browser Chromium SwiftShaderใช้ตรวจการทำงานและภาพ ไม่อ้างFPSเครื่องจริง.

ข้อผิดพลาดรอบแรกคือ fixture ตรวจภาพก่อนloadและ preview process ถูกปิด ไม่ใช่บั๊ก runtimeที่นำมารวมเป็นผลผ่าน. Config craftingใหม่คือแหล่งค่าอัตราดรอป/จำนวน/สูตรคราฟต์ปัจจุบัน; เอกสาร balanceเก่าติดหมายเหตุว่าเป็นข้อมูลก่อนรอบนี้. กางเกงใหม่ใช้PNGที่สร้างเฉพาะและอุปกรณ์legacyIDเดิม. ยอมรับการเปลี่ยนในขอบเขตที่ผู้ใช้ระบุ; ค่า defaultเศรษฐกิจยังปรับต่อได้โดยแก้JSON.
