# Mossvale Online — Web RPG Prototype

ต้นแบบเกม RPG 3D low poly สำหรับเล่นบนเว็บ สร้างด้วย Three.js, TypeScript และ Vite

## เริ่มเล่นบน Windows

1. ติดตั้ง Node.js 22.12 ขึ้นไป (แนะนำ Node.js 24 LTS)
2. แตกไฟล์โปรเจกต์ แล้วเปิด PowerShell ในโฟลเดอร์ที่มี `package.json`
3. รัน:

```powershell
npm install
npm run dev
```

เปิด http://localhost:5173 ใน Chrome หรือ Edge ที่เปิด hardware acceleration

ถ้าใช้ไฟล์ build ที่อยู่ใน `dist/` และมี Python สามารถรันโดยไม่ต้องติดตั้ง Node.js:

```powershell
py -m http.server 8080 --directory dist
```

แล้วเปิด http://localhost:8080 (อย่าเปิด `dist/index.html` ด้วย file:// โดยตรง)

## วิธีเล่น

- คลิกพื้นเพื่อเดิน หรือใช้ WASD; มือถือมีปุ่มเดินบนหน้าจอ
- คลิกมอนสเตอร์เพื่อเดินเข้าโจมตีอัตโนมัติ; Tab เลือกตัวที่ใกล้ที่สุด
- 1: Power Strike / 2: Whirlwind / 3: ยา HP / 4: ยา MP
- F: เก็บของดรอปในระยะใกล้
- I: กระเป๋า / K: สกิล / C: สถานะ / M: แผนที่ / Esc: ปิดหน้าต่าง
- เลื่อนล้อเมาส์เพื่อซูม; ปุ่ม Focus รีเซ็ตมุมกล้อง
- เปิดหน้าต่าง Forge เพื่อตีบวกดาบ, Shop เพื่อซื้อยาและขายวัตถุดิบ
- กำจัดมอนสเตอร์ 5 ตัว แล้วกด Claim reward เพื่อรับรางวัลเควส
- ทุกเลเวลได้รับแต้มสถานะ 3 แต้ม; STR เพิ่มดาเมจ, VIT เพิ่ม HP, AGI เพิ่มความเร็วโจมตี
- Auto เปิดการล่ามอนสเตอร์ต่อเนื่อง ยังคงได้รับดาเมจและต้องใช้ยาเอง

## ขอบเขตต้นแบบ

- ตัวละครหลัก 1 ตัว, แผนที่ Moonlit Glade 1 แผนที่
- มอนสเตอร์ 15 ตัวจาก 3 ชนิด: Dewdrop, Wildcap, Leafling; เกิดใหม่หลังตาย 13 วินาที
- ต่อสู้, สกิลและ cooldown, ยา, EXP/level, แต้มสถานะ, ของดรอป, เก็บของ, ร้านค้า, ตีบวกดาบ, เควสเริ่มต้น
- บันทึกความคืบหน้าด้วย localStorage ในเบราว์เซอร์ทุก 5 วินาทีและเมื่อสถานะเปลี่ยน
- เมนูเปิดแล้วพักเกม; หาก HP หมดจะกลับจุดเริ่มและเสียค่าฟื้นฟู 15 z
- เป็น **single-player prototype** ยังไม่มี multiplayer, บัญชีผู้เล่น, เซิร์ฟเวอร์เกม, แชตออนไลน์ หรือ economy ที่ป้องกันการโกง
- แชตในหน้าจอเป็นบันทึกเหตุการณ์และโน้ตเฉพาะเครื่องเท่านั้น
- บันทึกขึ้นกับ origin ของเว็บ การเปลี่ยนพอร์ต/โดเมนหรือการล้างข้อมูลเว็บจะไม่ใช้เซฟเดิม

## ภาพอ้างอิง

ตรวจวิดีโอ ref.mp4 ที่แนบมา (49.75 วินาที): gameplay Brawl Stars ที่แสดงอยู่ในแอปโซเชียล
นำมุมกล้องจากด้านบน พื้นโทนม่วง พุ่มไม้ฟ้าเขียว กำแพงบล็อก แถบเลือดเหนือหัว วงเป้าหมาย และตัวเลขดาเมจมาเป็นแนวทาง
เพิ่ม HUD และหน้าต่างสำหรับการเล่น RPG ตามคำขอ ไม่รวม UI แอปโซเชียลที่อยู่รอบคลิป
โมเดลในต้นแบบเป็นงาน procedural ที่สร้างใหม่ ไม่ได้ใช้โมเดลหรือตัวละครจาก Brawl Stars/Ragnarok

## โครงสร้าง

- `src/simulation.ts`: state, AI, combat, progression, pathfinding, loot, saving
- `src/world.ts`: Three.js scene, procedural models, camera, raycast, visual effects, static batching
- `src/main.ts`: DOM HUD, dialogs, inputs, local activity log, ambient audio
- `src/style.css`: responsive game UI
- `tests/adventure.spec.ts`: browser checks covering gameplay, upgrades, persistence, navigation, mobile menus
- `artifacts/`: screenshots captured during playtesting

## Build และตรวจสอบ

```sh
npm run build
npm run preview
npm test
```

สำหรับ browser tests ต้องเปิด dev server ด้วย `npm run dev` ก่อน หากไม่มี Chromium ของระบบ ให้รัน `npx playwright install chromium` ก่อนทดสอบ

## Assets และ licenses

โมเดลตัวละคร มอนสเตอร์ ฉาก และเอฟเฟกต์สร้างขึ้นใหม่ในโค้ด ส่วนภาพ avatar และไอคอนเป็น PNG ที่สร้างขึ้นสำหรับโปรเจกต์นี้ จึงไม่มีโมเดลหรือ texture ภายนอกที่ต้องดาวน์โหลดเมื่อเปิดเกม
Three.js และ Vite: MIT; Nunito font: SIL Open Font License 1.1
ฟอนต์และ dependencies ถูก bundle ใน build ไม่โหลดจาก CDN ระหว่างเล่น

## UI revision — 2 October 2026

เปลี่ยน UI เป็นสไตล์เกมการ์ตูน: กรอบครีมขอบเข้ม ปุ่มสกิลสีสด แถบเลือด/มานาแบบเกม และฉากทุ่งหญ้าสีสด
ไอคอนเมนู ไอเท็ม สกิล และปุ่มควบคุมทั้งหมดใช้ PNG ที่สร้างใหม่ 36 ภาพ แทน SVG แบบเส้นและอีโมจิ

- `public/icons/`: PNG พื้นหลังโปร่งใส 128 × 128 px
- ภาพแต่ละรูปมีด้านยาว 96 px อยู่กึ่งกลาง และเว้นขอบอย่างน้อย 16 px ทุกด้าน
- `artwork/icon-atlas.png`: ภาพต้นฉบับชุดเดียวกันจาก image generation
- `artwork/icon-manifest.json`: ขนาดภาพและระยะขอบของทุกไอคอน
- `tools/prepare_icons.py`: แยก atlas ตามช่องว่างระหว่างภาพ แล้วจัดขนาดให้สม่ำเสมอ (ต้องมี Python และ Pillow)
- `src/game-theme.css`: ธีม UI เกมแยกจากกฎ layout เพื่อปรับสีและกรอบได้ง่าย

ไอคอนไม่ต้องโหลดจากอินเทอร์เน็ตระหว่างเล่น และใช้ชุดเดียวกันใน HUD, กระเป๋า, สกิล, สถานะ และร้านค้า
