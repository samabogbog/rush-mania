# ย้ายบัญชีและตัวละครจาก Sites ไป Turso

ฐานข้อมูลใหม่ไม่ได้เชื่อมกับฐานข้อมูล Sites อัตโนมัติ ต้องย้ายทั้ง `game_accounts` และ `realms` ให้ตรงกัน โดยรักษา account ID, player ID, password hash, salt และ state ของโลกทั้งรายการ ไม่คัดลอก session หรือข้อมูลจำกัดการล็อกอิน

เครื่องมืออ่านตาราง Sites มีการตัด cell ยาว ต้องตรวจ `model_projection.truncated_values` ก่อนใช้ข้อมูล ทุก snapshot ที่ถูกตัดถือว่าใช้ย้ายไม่ได้ ห้ามเดาหรือเติมข้อมูลที่ขาดจาก local save

การส่งออกเซฟเต็มจากเกมเดิม: เข้าบัญชีผู้ดูแลบน Sites → Settings → Realm operations → Pause realm for maintenance → Export current realm ไฟล์ `mossvale-realm-<revision>.json` เก็บโลกและตัวละครทั้งหมด จากนั้นอ่านบัญชีฉบับเต็มอีกครั้งหลังหยุดโลก และรวมเป็นไฟล์ส่วนตัว `.local/` ห้าม commit เซฟหรือ password hash ลง repository

รูปแบบไฟล์นำเข้า:

```json
{
  "format": "mossvale-sites-transfer-v1",
  "accounts": [],
  "realms": [{"id":"glade-01","revision":0,"updated_at":0,"state":"JSON ของ Realm ฉบับเต็ม"}]
}
```

ตัวเลข revision ต้องมาจาก export หรือตารางต้นทางจริง ไม่ใช้ค่าตัวอย่างข้างบน ตัวละครเดิมที่ยังไม่เคยผูกกับบัญชีเกมต้องเก็บไว้โดยไม่สร้างบัญชีหรือผูก identity ให้เอง

เครื่องมือนำเข้าจะตรวจความครบถ้วนและตรวจว่าปลายทางว่างก่อนเขียน บัญชีและโลกต้องเขียนใน transaction เดียว ไม่มีการแทนที่ข้อมูลเดิม หากปลายทางมีข้อมูลอยู่แล้วต้องหยุดเพื่อเลือกวิธีรวมข้อมูลต่างหาก

ตั้ง `TURSO_DATABASE_URL` และ `TURSO_AUTH_TOKEN` ผ่าน environment ส่วนตัว แล้วตรวจโดยไม่เขียน:

```sh
node tools/import-sites-turso.mjs .local/sites-transfer.json
```

เมื่อข้อมูลครบและ dry run ผ่าน:

```sh
node tools/import-sites-turso.mjs .local/sites-transfer.json --apply --reopen-realm
```

`--reopen-realm` เปลี่ยนเฉพาะสถานะ maintenance ของสำเนาปลายทาง ไม่แก้ต้นทาง ใช้ `--sqlite` หากต้นทางเป็นไฟล์ SQLite เต็มแทน JSON เครื่องมือไม่รองรับ SQL dump โดยตรง และจะไม่ทำ schema migration ให้เอง

ตรวจหลังย้าย: จำนวนบัญชีและตัวละครเท่าต้นทาง, player ID ตรงเดิม, รหัสผ่านเดิมล็อกอินได้, เลเวล เงิน อุปกรณ์ กระเป๋า และสกิลตรง snapshot และข้อมูลยังอยู่หลังเชื่อมต่อใหม่ ผู้เล่นต้องล็อกอินใหม่บนโดเมน Vercel

สถานะการย้าย: ได้รับ `operations.json` ฉบับเต็มแล้ว revision 279991 ตรงกับข้อมูล Sites หลังหยุดโลก มีบัญชี 2 รายการและตัวละคร 2 ตัว (Lv100 และ Lv36) ทั้งสองตัวผูกบัญชีครบ อ่านบัญชีอีกครั้งจากต้นทางก่อนรวม bundle ตรวจโครงสร้างครบและทดสอบนำ snapshot จริงเข้า SQLite ชั่วคราวแล้วตรวจบัญชีและ state ทั้งหมดตรงกัน ผ่าน 4 tests (ล็อกอินรหัสผ่านเดิม, dry run/ไม่เขียนทับ, เซฟไม่ครบ/maintenance, rollback เมื่อเขียนล้มเหลว)

ยังไม่ได้เขียน Turso จริง: environment ของ Vercel เป็นชนิด Sensitive; แม้เรียกอ่านพร้อม decrypt=true ก็ไม่คืน value จึงเตรียมชุดนำเข้าส่วนตัว `.local/mossvale-player-transfer.zip` ให้เจ้าของรันด้วย database URL/token ใน `.env` เครื่องตนเอง ไม่ส่ง token ในแชต ข้อมูลจริงและ ZIP ถูก gitignore และตั้งสิทธิ์ไฟล์เฉพาะเจ้าของ ไม่อยู่ใน repository
