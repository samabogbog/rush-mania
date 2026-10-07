# Deploy Mossvale บน Vercel + Turso

โปรเจกต์ใช้ Vite/Babylon.js สำหรับหน้าเกม, Vercel Functions สำหรับ API และ Turso สำหรับ SQLite ถาวร ไฟล์ SQLite ในเครื่องหรือ `/tmp` ของ Vercel ไม่ใช่ฐานข้อมูล production ของเกม

## ตั้งค่า

1. สร้างฐานข้อมูล Turso ในภูมิภาคใกล้ Singapore และสร้าง database token สำหรับฐานข้อมูลนี้ ตั้งค่าผ่านหน้าบริการโดยตรง ไม่ส่ง token ในแชตหรือ commit ลง Git
2. Import GitHub repository `samabogbog/rush-mania` เข้า Vercel และเลือก branch **mossvale-latest** ซึ่งมีเกมล่าสุด; branch `main` ของ GitHub ยังเป็นรุ่นเก่า
3. ตั้งชื่อโปรเจกต์ `mossvale-rush-mania`, framework Vite และ Node.js 24.x ค่า build/output อ่านจาก `vercel.json`: `npm run build:vercel` → `dist/client` และ API อยู่ใน `api/`
4. เพิ่ม environment variables ใน Vercel: `TURSO_DATABASE_URL` และ `TURSO_AUTH_TOKEN` เลือก environment ให้ตรงกับ deployment ที่จะใช้งาน อย่าใช้ URL/token ของ production กับ preview สำหรับการทดลองที่แก้ข้อมูล
5. Deploy แล้วเปิดหน้าเกมเพื่อสมัครบัญชี การเรียก API ครั้งแรกสร้างตารางจาก migration ที่ตรวจสอบ checksum ภายใน write transaction; การเรียกซ้ำไม่ลบข้อมูลเดิม

ถ้ายังไม่ได้ตั้งค่า Turso API จะตอบ 503 อย่างชัดเจน หน้าเกมมีลิงก์ไป Practice (`?practice=1`) ซึ่งเซฟบนเครื่องและแยกจากบัญชีออนไลน์

## แอดมินและข้อมูลเดิม

ตั้ง `ADMIN_ACCOUNT_ID` เป็น ID ของบัญชีที่ต้องการให้เป็นแอดมินจากตาราง `game_accounts` แล้ว redeploy ผู้เล่นต้องล็อกอินบัญชีนั้นด้วย session ที่ถูกต้อง ข้อมูล ID/อีเมลที่ผู้ใช้ส่งมาใน header ไม่ให้สิทธิ์แอดมิน

Turso ใหม่เริ่มแยกจาก Sites เดิม ข้อมูลบัญชี/ตัวละครที่ Sites ยังอยู่ที่เดิม ไม่ย้ายหรือผูกตัวละครให้อัตโนมัติ การย้ายจริงต้อง export/import อย่างเชื่อถือได้และตรวจ revision/บัญชีครบก่อนเปิดบริการ ไม่ใช้ SQLite ทดสอบหรือข้อมูลจากแชตแทนข้อมูล production

สคริปต์ migration ทางเลือก: `npm run db:migrate:turso` อ่านตัวแปรจาก environment ของเครื่องนั้น; ใช้กับฐานข้อมูลที่ตั้งใจไว้เท่านั้น ตัวฐานข้อมูลและ secret ไม่อยู่ใน repository

เมื่อเพิ่ม migration ใหม่ ต้องอัปเดต `server/migrations.json` ให้ตรงกับ SQL ใน `drizzle/`; ชุดทดสอบตรวจทั้ง checksum และ SQL เพื่อป้องกันใช้ migration คนละรุ่น

## ตรวจหลัง deploy

ตรวจ `/api/auth/status`, สมัครสมาชิก/ล็อกอิน/ล็อกเอาต์, เซฟและโหลดตัวละครอีกครั้ง, ทดลองสองบัญชี, และตรวจว่า API ไม่ส่งหน้า HTML กลับมาแทน JSON ทดสอบ production ของจริงหลังตั้งฐานข้อมูลแล้วจึงถือว่า deployment เสร็จ

ตอนเตรียมโค้ดครั้งแรก การสร้างโปรเจกต์ผ่านการเชื่อมต่อ Vercel ถูกปฏิเสธด้วย **HTTP 403: You don't have permission to create the project** จึงไม่สามารถ deploy ผ่านการเชื่อมต่อนั้น ต่อมาผู้ใช้สร้างและ deploy `https://rush-mania.vercel.app` ผ่าน dashboard เอง การเชื่อมต่อของผู้ช่วยยังไม่ได้รับสิทธิ์อ่าน log ของโปรเจกต์นี้ การตั้ง permission ของปลั๊กอิน ChatGPT ไม่ใช่การเพิ่มสิทธิ์ Vercel API นี้

ผลตรวจโค้ดที่เตรียม: Node.js 24.19.0, production build ผ่าน, ทดสอบ API/SQLite 17 ข้อผ่าน และตรวจ bundle/import API 6 entry สำเร็จ พร้อมตรวจว่าขาด database config แล้วตอบ 503 การทดสอบ libSQL ใช้ SQLite file ชั่วคราวในเครื่อง ไม่ใช่ Turso production และยังไม่มีผลตรวจ live Vercel/Turso

## การแก้ Function startup บน Vercel

การ deploy ครั้งแรกพบ `ERR_MODULE_NOT_FOUND` ที่ `/var/task/server/vercel-handler` เนื่องจาก import ของ Node ESM ไม่มีนามสกุล `.js` การทดสอบ bundle เดิมรวมโมดูลเข้าด้วยกันจึงไม่พบข้อผิดพลาดที่เกิดเมื่อ Vercel แปลง TypeScript เป็นไฟล์ JavaScript แยกกัน

แก้ import ทั้งหก API entry และ dependency ที่โหลดต่อทั้งหมดให้ใช้ `.js` พร้อมเพิ่ม `tsconfig.vercel-node.json` สำหรับ compile แยกไฟล์ตามโครงสร้างจริง ชุดทดสอบ `tests/vercel-node-package.spec.ts` เปิดแต่ละ API ใน Node process ใหม่โดยไม่ bundle และเรียก handler จริง จึงตรวจได้ทั้งการ resolve module/JSON และการตอบข้อผิดพลาดเมื่อไม่ได้ตั้งฐานข้อมูล

ผลตรวจรุ่นแก้ ESM: production build ผ่าน, ระบบ API/SQLite และ native unbundled API 23 ข้อผ่าน, browser ตรวจโหลดเกม/ขาย/ใช้ยา/ย่อย/ตีบวกทั้ง desktop/mobile อีก 1 ข้อผ่าน รวม 24 ข้อ การยืนยัน live ต้องเปิด /api/auth/status หลัง Vercel deploy commit ล่าสุด หากตั้ง Turso ถูกต้องและยังไม่ล็อกอิน จะได้ JSON {"account":null}
