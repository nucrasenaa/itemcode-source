# Changelog

การเปลี่ยนแปลงสำคัญของ `Equality ItemCode Watcher`

## [3.0.0] - 2026-10-09 (macOS / Windows)

### เพิ่มเติม

- เพิ่ม Discord Sign-in พร้อมตรวจสอบสมาชิกจากรายการ Server ID ที่อนุญาตบน auth server
- เพิ่มการ Activate License code อายุ 3, 7 และ 30 วัน พร้อมจำกัดบัญชีรับ ItemCode ได้ 1 บัญชี
- Discord session อยู่ได้ 30 วัน และ License แสดงจำนวนวันที่เหลือโดยอัปเดตตามวัน
- ซ่อน Telegram Notification และ Discord Notification สำหรับผู้ใช้ License code
- ใช้ production auth endpoint `https://equalityitemcode.threemandev.com`
- ป้องกันไฟล์ JavaScript ใน release ด้วย obfuscation, ASAR integrity และ Electron fuses
- รวม Node.js, FFmpeg, yt-dlp และ Playwright Chromium ไว้ในตัวติดตั้ง ลดการดาวน์โหลด runtime หลังติดตั้ง

## [Unreleased]

### เพิ่มเติม

- เพิ่มหน้า Login Discord ก่อนเข้าหน้าหลัก และตรวจสมาชิกกับ Server ID ที่อนุญาตจาก Node auth server
- เพิ่มปุ่ม `Contact me` สำหรับผู้ใช้ที่ยังไม่มีสิทธิ์เข้า Server
- เพิ่มการ Activate License code จากหน้าจอแรก รองรับอายุ 3, 7 และ 30 วัน
- ผู้ใช้ License จำกัดบัญชีรับ ItemCode 1 บัญชี และซ่อน Telegram/Discord Notification
- เพิ่ม session Discord อายุ 30 วัน, heartbeat และหน้า License Manager สำหรับดู active users

## [0.2.14] - 2026-10-09 (macOS / Windows)

- เปลี่ยนจุดตรวจสอบ Update ไปยัง nucrasenaa/itemcode-releases
- ใช้เป็นรุ่นเชื่อมต่อสำหรับผู้ใช้รุ่นเดิมก่อนย้ายไประบบ Release-only

## [0.2.13] - 2026-10-06 (macOS / Windows)

- เพิ่มการแจ้งเตือนในตัวแอปเมื่อ retry เติม ItemCode ผ่าน Browser ครบแล้วแต่ยังไม่สำเร็จ
- คงการแจ้งเตือน Telegram และ Discord ตามเดิม

## [0.2.12] - 2026-10-06 (macOS / Windows)

- ลบ section Service Debug Log และ YouTube Live Chat โดยยังอ่านแชตตามเดิม
- ItemCode Log แสดงเฉพาะผลสุดท้ายต่อบัญชี หลังตรวจรายละเอียดรางวัลได้และลองเติมผ่านหน้าเว็บแล้ว
- เปลี่ยนหัวตารางเป็น no / code / detail / id / status โดย id คือบัญชีที่ใช้เติม
- ซ่อนทั้ง section ตรวจสอบ Requirement เมื่อครบ และแสดงกลับเมื่อขาดหรือตรวจสอบไม่สำเร็จ

## [0.2.11] - 2026-10-05 (macOS / Windows)

- ปรับจำนวนครั้งสูงสุดในการรับ ItemCode ผ่าน Browser เป็น 20 ครั้งต่อบัญชีโดยค่าเริ่มต้น
- เพิ่มช่องกำหนดจำนวนครั้ง 1–100 (รวมครั้งแรก) พร้อมบันทึกค่าไว้ใช้เมื่อเปิดโปรแกรมใหม่
- หยุดลองทันทีเมื่อรับไอเทมสำเร็จ และแสดงจำนวนครั้งตามค่าที่ตั้งไว้

## [0.2.10] - 2026-10-01 (macOS)

- เพิ่มโหมด Fast สำรองอัตโนมัติเมื่อ OCR โหมดละเอียดเกินเวลา 10 วินาที (ความแม่นยำอาจลดลง)
- แยกข้อผิดพลาด OCR ออกจากกรณีอ่านไม่พบข้อความ พร้อมรายละเอียด timeout และ signal
- คอมไพล์ตัวช่วย Swift OCR ใหม่ก่อนสร้างไฟล์ติดตั้ง macOS

## [0.2.9] - 2026-09-28

### เพิ่ม

- เปิดใช้ YouTube Live Chat บน Windows เพิ่มเติมจาก macOS
- เพิ่ม section แสดงคอมเมนต์จาก YouTube Live Chat ต่อจาก Service Debug Log
- แสดงชื่อผู้ส่ง เวลา และข้อความคอมเมนต์ พร้อมล้างและย่อ/ขยาย section ได้

### แก้ไข

- ยกเลิกช่วงหยุดพัก OCR อัตโนมัติ และไม่หยุดพักการอ่าน YouTube Live Chat

## [0.2.8] - 2026-09-28 (macOS)

### เพิ่ม

- อ่าน YouTube Live Chat ควบคู่กับ OCR โดยใช้ `youtube-chat-next` ไม่ต้องตั้งค่า API Key
- ส่งข้อความแชตเข้าเงื่อนไขตรวจ ItemCode เดิม เพื่อไม่ให้กฎการจับ/แปลงรหัสเปลี่ยน
- ให้ ItemCode จาก Live Chat แซงคิว OCR ที่รออยู่
- เพิ่มสวิตช์เปิด/ปิดการอ่านแชตในหน้าแอป macOS

### หมายเหตุ

- ตัวอ่านแชตเป็นไลบรารีไม่เป็นทางการ จึงอาจหยุดทำงานเมื่อ YouTube เปลี่ยนระบบ

## [0.2.7] - 2026-09-28 (Windows)

### แก้ไข

- ปรับ Windows OCR ด้วยภาพ threshold หลายระดับและ upscale เพื่ออ่านข้อความ ItemCode ที่ทับบนภาพสตรีม
- รวมผล OCR หลาย pass และแก้ความสับสน `I`/`1`, `S`/`5` ในรหัส 12 ตัว
- เพิ่ม regression fixtures สำหรับภาพทั้งสามและคำสั่ง `npm run test:ocr`

## [0.2.6] - 2026-09-13

### แก้ไข

- ปรับ Windows stream scanner ให้ทนต่อ network/FFmpeg สะดุดชั่วคราวได้นานขึ้น
- ไม่หยุดสแกนทันทีเมื่อ `yt-dlp` ตรวจสถานะไลฟ์พลาดครั้งเดียว
- เพิ่มการ reconnect อัตโนมัติเมื่อการสแกนหยุดจากข้อผิดพลาดชั่วคราว
- เพิ่ม log `code` และ `signal` เมื่อ worker หยุดผิดปกติ เพื่อช่วยวิเคราะห์สาเหตุ
