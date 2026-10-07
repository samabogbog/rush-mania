# เซิร์ฟเวอร์เกมบน Railway

Frontend และบัญชีล็อกอินอยู่ Vercel; โลกเกมรันหนึ่ง process บน Railway และเซฟลง Turso เดิม ไม่ต้องย้ายข้อมูลผู้เล่นอีกครั้ง

## สร้างบริการ

1. Railway → New Project → Deploy from GitHub repo → `samabogbog/rush-mania` เลือก branch `mossvale-latest`.
2. ใช้ `railway.json` และ `Dockerfile.realtime` ที่ root. Build สร้างเฉพาะเซิร์ฟเวอร์เกม; Start คือ `node dist/realtime/start.mjs`.
3. ตั้ง replicas **1**, เลือก region ใกล้ฐานข้อมูล Turso และผู้เล่น. อย่าเปิดหลาย replicas: มี lease ป้องกันสอง process เขียนโลกเดียวกัน.
4. ตั้ง Variables:

| Variable | ค่า |
| --- | --- |
| `TURSO_DATABASE_URL` | URL ฐานข้อมูลเดิมที่ Vercel ใช้ |
| `TURSO_AUTH_TOKEN` | token ฐานข้อมูลเดิม |
| `REALTIME_SIGNING_SECRET` | สุ่มอย่างน้อย 32 ตัวอักษร ใช้ค่าเดียวกับ Vercel |
| `REALTIME_ALLOWED_ORIGINS` | `https://rush-mania.vercel.app` (หลาย origin คั่นด้วย comma ไม่มี slash ท้าย) |

`PORT` ให้ Railway กำหนดเอง; `NODE_ENV=production` มาจาก Dockerfile. **ไม่ตั้ง `REALTIME_LOCAL_AUTH` ใน production**. ไม่ต้องตั้ง ADMIN_ACCOUNT_ID ที่ Railway เพราะสิทธิ์มาจาก ticket ที่ Vercel ออกให้.

5. Networking → Generate Domain. เปิด `https://<domain>/health` ต้องได้ HTTP 200 และ `ready:true`.
6. Vercel project rush-mania → Environment Variables → Production เพิ่ม:
   - `REALTIME_SERVER_URL=wss://<domain>/socket`
   - `REALTIME_SIGNING_SECRET` ค่าเดียวกับ Railway
7. Redeploy Vercel รุ่นที่มี realtime-ticket และ client WebSocket. เปิดเกมและล็อกอินเดิม.

## ลำดับเปิดใช้ที่รักษาเซฟ

Deploy โค้ดใหม่ที่ Vercel ก่อน โดยยังไม่ตั้ง REALTIME_SERVER_URL: เล่นด้วย HTTP เดิมและ API ticket ส่ง available:false. จากนั้นเริ่ม Railway, ตรวจ health, ตั้ง URL/secret ที่ Vercel แล้ว redeploy. ระหว่าง Railwayเริ่มถือ lease และ Vercel ยังไม่เปลี่ยน URL ระบบ HTTP จะปฏิเสธคำสั่งชั่วคราวเพื่อป้องกันเซฟชนกัน จึงควรทำขั้นตอนนี้ต่อเนื่องในช่วงคนเล่นน้อย.

เซิร์ฟเวอร์คำนวณโลก 20 ครั้ง/วินาที ส่ง snapshot 10 ครั้ง/วินาที เซฟเบื้องหลังทุก 5 วินาที และขอเซฟทันทีเมื่อทำธุรกรรมไอเท็ม/เงิน. ลูกค้าเก็บคำสั่งไว้จนเซิร์ฟเวอร์ยืนยันว่าเซฟแล้ว; เมื่อ reconnect ใช้ session และหมายเลขคำสั่งเดิมเพื่อกันการทำซ้ำ. ดาเมจ ดรอป EXP และเงินยังคำนวณที่เซิร์ฟเวอร์; เครื่องผู้เล่นคาดการณ์การเดินและท่าร่ายเท่านั้น.

เมื่อ process ดับโดยไม่มี graceful shutdown ความคืบหน้าหลัง checkpoint ล่าสุดอาจหายได้ประมาณ 5 วินาที; ธุรกรรมที่ยังไม่ยืนยันจะส่งซ้ำตามหมายเลขเดิม. Lease หมดอายุภายใน 30 วินาที; processใหม่จะไม่แย่ง processเก่าที่ lease ยังไม่หมด. ดู Logs เมื่อ restart ยังไม่ผ่าน.

## ย้อนกลับ

หยุด Railway ให้ปิด process และเซฟก่อน; ตรวจว่า lease ถูกปล่อย (หรือรอหมดอายุถ้า crash). ลบ REALTIME_SERVER_URL ที่ Vercel แล้ว redeploy รุ่นนี้เพื่อใช้ HTTP เดิม. อย่าสลับกลับ HTTP ขณะ Railway ยังรัน เพราะ writer guard จะปฏิเสธเพื่อรักษาเซฟ.

## รันและทดสอบในเครื่อง

`npm ci`, `npm run build:realtime` แล้วตั้ง TURSO_DATABASE_URL เป็น `file:/absolute/path/game.sqlite`, REALTIME_SIGNING_SECRET เป็นค่าเฉพาะเครื่องทดสอบ, REALTIME_ALLOWED_ORIGINS เป็น `http://127.0.0.1:5173`, REALTIME_SERVER_URL เป็น `ws://127.0.0.1:8788/socket`, REALTIME_LOCAL_AUTH=1 และ NODE_ENV=development. รัน `npm run start:realtime`; ตั้ง Vite proxy API ไป port8788 สำหรับ fixture นี้. Production ปฏิเสธ file database และ localAuth.

อย่า commit token, signing secret หรือไฟล์ฐานข้อมูลลง Git และอย่าส่ง token ใน chat.
