# Equality ItemCode Watcher Desktop

แอป Electron สำหรับ Windows และ macOS โดยใช้ `equality-itemcode-version` เป็น worker เบื้องหลัง

## เริ่มใช้งานในโหมดพัฒนา

```bash
cd desktop-app
npm install
npm start
```

เมื่อเปิดครั้งแรก แอปจะตรวจสอบ Node.js, yt-dlp, FFmpeg, OCR และ Playwright Chromium
ถ้ารายการใดยังไม่พร้อม ให้กด `Download` ที่รายการนั้น แล้วกด `ตรวจสอบอีกครั้ง`

ก่อนเข้าหน้าหลัก แอปจะเปิดหน้า `Login Discord` หรือ `Activate License code` และตรวจสอบสิทธิ์กับ Discord auth
server ที่ตั้งไว้ใน `service_config.json`:

```json
{
  "discord_auth_server_url": "https://auth.example.com"
}
```

โปรดดู server ตัวอย่างที่ `../discord-auth-server` สำหรับการตั้งค่า OAuth2,
`AUTHORIZED_SERVER_IDS` และ `DISCORD_CONTACT_URL` โดยโฟลเดอร์นี้ตั้งใจให้ deploy
แยกต่างหากและไม่ถูกรวมใน desktop build

เมื่อ Login สำเร็จ desktop จะเรียก `GET /api/discord/session` และ
`GET /api/authorized-servers` แล้วเปรียบเทียบ Server ID หากไม่ตรงกันจะแสดงปุ่ม
`Contact me` แทนหน้าหลัก โดย Discord session มีอายุ 30 วัน

ผู้ใช้ที่เข้าใช้งานด้วย License code จะใช้ได้ตามอายุ License, ถูกจำกัดบัญชีรับ
ItemCode เหลือ 1 บัญชี และจะไม่แสดง Telegram/Discord Notification ในหน้าจอ

## สร้างไฟล์ติดตั้ง

```bash
npm run dist -- --mac
npm run dist -- --win
```

หน้าจอหลักมีบัญชี Check Serial และรายการบัญชีรับ ItemCode ที่เพิ่มได้หลายรายการ
ระบบจะรับ ItemCode ตามลำดับบัญชีที่เพิ่มไว้ แล้ววนกลับรายการแรกเมื่อถึงรายการสุดท้าย
สามารถลากจุดจับเพื่อเรียงลำดับบัญชีได้ และสถานะย่อของ Requirement/ข้อมูลบัญชีจะถูกจำไว้
เมื่อ Requirement ครบ ระบบจะย่อส่วน Requirement ให้อัตโนมัติเมื่อเปิดแอปครั้งถัดไป
พร้อม Discord Webhook หลายรายการที่เปิด/ปิดได้, ปุ่มทดสอบการแจ้งเตือน,
ปุ่ม `Start/Stop` ด้านบน, ปุ่มตรวจสอบ Update ข้างสถานะการทำงาน,
Changelog ภาษาไทย และ log ที่กรองได้ทุกสถานะ

## Auto update ผ่าน GitHub Releases

โปรเจกต์ตั้งค่า `electron-updater` ให้ใช้ public repository
`nucrasenaa/itemcode` แล้ว การปล่อยเวอร์ชันให้เพิ่ม version ใน
`package.json` เช่น `0.2.1` และสร้าง tag ให้ตรงกัน เช่น `v0.2.1` จากนั้น GitHub Actions
จะ build และ publish artifacts ของ macOS/Windows ไปยัง GitHub Release

```bash
git tag v0.2.1
git push origin v0.2.1
```

แอปจะตรวจสอบ Update อัตโนมัติหลังเปิดประมาณ 3 วินาที และมีปุ่มตรวจสอบเอง
เมื่อพบเวอร์ชันใหม่จะดาวน์โหลดเบื้องหลัง พร้อมแจ้งเตือนว่ามีหรือไม่มี Update
บน macOS ให้คลิกการแจ้งเตือนเมื่อดาวน์โหลดเสร็จเพื่อเปิด DMG แล้วลากแอปไปที่ Applications
ส่วน Windows สามารถคลิกการแจ้งเตือนเพื่อปิดแอปและติดตั้งได้

macOS DMG แบบไม่ code sign ยังแจกและติดตั้งด้วยการกด Trust ได้ แต่ auto-update
ของ macOS ต้องใช้ signed app จึงจะทำงานได้สมบูรณ์
