# Changelog

การเปลี่ยนแปลงสำคัญของ `Equality ItemCode Watcher`

## [Unreleased]

### เพิ่มเติม

- เพิ่มหน้า Login Discord ก่อนเข้าหน้าหลัก และตรวจสมาชิกกับ Server ID ที่อนุญาตจาก Node auth server
- เพิ่มปุ่ม `Contact me` สำหรับผู้ใช้ที่ยังไม่มีสิทธิ์เข้า Server
- เพิ่มการ Activate License code จากหน้าจอแรก รองรับอายุ 3, 7 และ 30 วัน
- ผู้ใช้ License จำกัดบัญชีรับ ItemCode 1 บัญชี และซ่อน Telegram/Discord Notification
- เพิ่ม session Discord อายุ 30 วัน, heartbeat และหน้า License Manager สำหรับดู active users

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
