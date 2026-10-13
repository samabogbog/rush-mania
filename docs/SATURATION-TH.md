# Saturation +60

ผู้ใช้ขอให้ภาพสดขึ้นชัดเจนหลังการปรับ palette ยังไม่เพียงพอ ใช้ Babylon ColorCurves.globalSaturation = 60 ซึ่งให้ตัวคูณ chroma 1.6 (`1 + saturation × .01`) ค่า exposure/contrast คง 1 ไม่มีการปรับแสง PCSS shadow map source size หรือสูตรเกม

ส่งมอบด้วย ImageProcessingPostProcess เดียวที่กล้อง ใช้ scene shared configuration applyByPostProcess=true และ fromLinearSpace=true จึงไม่เพิ่ม ColorCurves ลง shader ของแต่ละวัสดุ และไม่เกิดการ grade/gamma ซ้ำ DOM HUD ไม่ถูกปรับสี มีหนึ่ง fullscreen pass กับ render target สำหรับการปรับสี

วิธี inline ที่ทดลองก่อนหน้ามี PBR ไม่พร้อมแสดงและถูกทิ้งหลังตรวจภาพ ตัวตรวจ readiness ดูเฉพาะ PBR ใน active meshes ที่อยู่ในมุมกล้อง ไม่รวมโมเดลนอกจอที่ยังไม่มี color shader effect การตรวจรับชุดสุดท้ายยืนยันทั้ง GLB ครบและ shader ของ PBR ที่กำลังแสดงพร้อม ตรวจภาพจริงเห็นฮีโร่/มอนสเตอร์ครบใน High และ Low

Build ผ่าน และ browser 2 ข้อผ่านบน source สุดท้าย: High/Low มุมกล้องเดียวกัน, เงา PCSS ยังเปิด, โมเดลพร้อม, สลับ quality แล้ว texture/mesh ไม่สะสม, pageErrors เป็นศูนย์ ภาพก่อน/หลังและค่า mean HSV saturation ของบริเวณหญ้า `[250,450,430,610]` ใน `artifacts/saturation/pixel-comparison.json` เพิ่มประมาณ54% ทั้งสองโหมด ตัวเลขเป็นบริเวณที่วัด ไม่ใช่เปอร์เซ็นต์ของทุก pixel ในภาพ

ใช้ Chromium SwiftShader เพื่อความถูกต้องของภาพ ไม่รับรอง FPS เครื่องผู้เล่น รูปภาพไม่มีการแก้สีภายหลัง capture
