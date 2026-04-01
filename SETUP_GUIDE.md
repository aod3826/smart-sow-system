# 🐷 นิพนธ์ฟาร์ม — คู่มือติดตั้งระบบ
## Smart Sow Productivity System v1.0

---

## ขั้นตอนทั้งหมด (ทำครั้งเดียว ~30 นาที)

---

## STEP 1: ตั้งค่า Google Sheets (ฐานข้อมูล)

1. ไปที่ https://sheets.google.com สร้าง Spreadsheet ใหม่
2. ตั้งชื่อ: **NipponFarm_DB**
3. สร้าง Sheet ตามนี้ (คลิก "+" ที่ด้านล่าง):
   - `SETTINGS`
   - `SOWS`
   - `BOARS`
   - `CYCLES`
   - `EVENTS`
   - `USERS`

4. ใน Sheet **SETTINGS** ให้เพิ่ม header row:
   ```
   Row 1: key | value | label
   ```
   แล้วใส่ข้อมูลตั้งต้น (Row 2 เป็นต้นไป):
   ```
   FARM_NAME | นิพนธ์ฟาร์ม | ชื่อฟาร์ม
   GESTATION_DAYS | 114 | วันอุ้มท้องมาตรฐาน
   LACTATION_TARGET | 21 | เป้าหมายวันเลี้ยงลูก
   WSI_TARGET | 7 | เป้าหมาย WSI
   PREG_CHECK_DAY1 | 21 | ตรวจท้องรอบ 1
   PREG_CHECK_DAY2 | 42 | ตรวจท้องรอบ 2
   MOVE_FARROWING_DAY | 110 | ย้ายเข้าเล้าคลอด
   CULL_MAX_PARITY | 8 | คัดทิ้งเมื่อ Parity สูงกว่า
   CULL_MIN_LIVE_BORN | 10 | คัดทิ้งเมื่อ Live Born ต่ำกว่า
   PSY_TARGET | 28 | เป้าหมาย PSY
   ```

5. ใน Sheet **USERS** เพิ่ม header:
   ```
   Row 1: username | password_hash | role | display_name | is_active
   ```
   Row 2 (Admin):
   ```
   admin | 7c222fb2927d828af22f592134e8932480637c0d | ADMIN | คุณนิพนธ์ | TRUE
   ```
   Row 3 (Staff):
   ```
   staff1 | 5baa61e4c9b93f3f0682250b6cf8331b7ee68fd8 | STAFF | สมชาย | TRUE
   ```
   > หมายเหตุ: hash ด้านบนคือ SHA-1 ของ "admin1234" และ "password"
   > *** เปลี่ยนรหัสผ่านหลังจากติดตั้งเสร็จ ***

6. ใน Sheet **BOARS** เพิ่ม header:
   ```
   boar_id | ear_tag | breed | birth_date | entry_date | is_active
   ```
   แล้วใส่ข้อมูลพ่อพันธุ์ 3 ตัว:
   ```
   B001 | P001 | Duroc | 2021-01-01 | 2022-01-01 | TRUE
   B002 | P002 | Duroc | 2021-06-01 | 2022-06-01 | TRUE
   B003 | P003 | Hampshire | 2022-01-01 | 2023-01-01 | TRUE
   ```

7. ใน Sheet **SOWS** เพิ่ม header:
   ```
   sow_id | ear_tag | breed | birth_date | entry_date | source | status | current_parity | location | notes | created_at | updated_at | is_active
   ```

8. ใน Sheet **CYCLES** เพิ่ม header:
   ```
   cycle_id | sow_id | parity | service_date | boar_id | technician | service_type | expected_farrowing | preg_check1_due | preg_check1_date | preg_check1_result | preg_check2_due | preg_check2_date | preg_check2_result | move_farrowing_due | move_farrowing_date | actual_farrowing_date | gestation_length | total_born | live_born | stillborn | mummy | birth_weight_total | fostered_in | fostered_out | weaning_date | weaned_count | weaning_weight_total | lactation_days | wsi_date | wsi_days | cycle_status | notes | created_at
   ```

9. ใน Sheet **EVENTS** เพิ่ม header:
   ```
   event_id | sow_id | event_date | event_type | details | recorded_by | notes
   ```

---

## STEP 2: Deploy Google Apps Script (Backend API)

1. ใน Google Sheets ที่สร้างไว้ คลิก **Extensions > Apps Script**
2. ลบโค้ดเดิมทิ้งทั้งหมด
3. คัดลอกโค้ดจากไฟล์ **Code.gs** ที่แนบมาวางแทน
4. กด **Save** (Ctrl+S)
5. คลิก **Deploy > New deployment**
6. ตั้งค่า:
   - Type: **Web app**
   - Description: `NipponFarm v1.0`
   - Execute as: **Me (your email)**
   - Who has access: **Anyone**
7. คลิก **Deploy**
8. **คัดลอก Web app URL** ที่ได้ (รูปแบบ: https://script.google.com/macros/s/XXXX.../exec)

---

## STEP 3: ตั้งค่า Frontend

1. เปิดไฟล์ **index.html** ด้วย Text Editor (Notepad++ / VS Code)
2. หาบรรทัดนี้ (ใกล้ด้านบนของ `<script>`):
   ```javascript
   const API_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';
   ```
3. แทนที่ `YOUR_SCRIPT_ID` ด้วย URL จริงที่ได้จาก Step 2
4. บันทึกไฟล์

---

## STEP 4: Deploy บน GitHub Pages (เข้าถึงจากมือถือได้)

1. สร้าง Account ที่ https://github.com (ฟรี)
2. สร้าง Repository ใหม่ ชื่อ `nippon-farm`
3. Upload ไฟล์ `index.html` ขึ้นไป
4. ไปที่ **Settings > Pages**
5. Source: **Deploy from branch** > Branch: **main** > Folder: **/ (root)**
6. กด **Save**
7. รอ ~1 นาที แล้วเข้าได้ที่: `https://[username].github.io/nippon-farm`

---

## STEP 5: ทดสอบระบบ

เข้าสู่ระบบด้วย:
- Username: `admin`  
- Password: `admin1234`

ทดสอบการทำงาน:
- [ ] Login สำเร็จ
- [ ] Dashboard โหลด KPI
- [ ] เพิ่มแม่สุกรใหม่
- [ ] บันทึกการผสม (ระบบคำนวณวันอัตโนมัติ)
- [ ] ดูรายงาน

---

## การเปลี่ยนรหัสผ่าน

รหัสผ่านในระบบเก็บเป็น SHA-1 Hash  
วิธีสร้าง hash ใหม่:
1. เปิด https://emn178.github.io/online-tools/sha1.html
2. พิมพ์รหัสผ่านใหม่
3. คัดลอก hash ไปใส่ใน Google Sheets > USERS > คอลัมน์ password_hash

---

## การตั้งค่า LINE Notification (ขั้นสูง)

1. ไปที่ https://notify-bot.line.me
2. สร้าง Token สำหรับ "นิพนธ์ฟาร์ม"
3. นำ Token ไปใส่ใน Google Sheets > SETTINGS > `LINE_TOKEN`
4. เพิ่ม function ใน Code.gs:

```javascript
function sendLineNotify(message) {
  const token = getSettingsMap()['LINE_TOKEN'];
  if (!token) return;
  UrlFetchApp.fetch('https://notify-api.line.me/api/notify', {
    method: 'post',
    headers: { 'Authorization': 'Bearer ' + token },
    payload: { message: '\n' + message }
  });
}

// เรียกใช้ใน recordFarrowing() หลังบันทึกสำเร็จ:
// sendLineNotify(`🐣 ${sow_id} คลอดแล้ว! ลูกมีชีวิต ${live_born} ตัว`);
```

---

## คำถามที่พบบ่อย

**Q: ระบบช้ามาก?**  
A: Google Apps Script มี "Cold Start" ครั้งแรกอาจใช้เวลา 3-5 วินาที ครั้งต่อไปจะเร็วขึ้น

**Q: ข้อมูลหาย?**  
A: ข้อมูลอยู่ใน Google Sheets ทั้งหมด สามารถเปิดดูและ Backup ได้โดยตรง

**Q: เพิ่มผู้ใช้งานได้ไหม?**  
A: ได้ เพิ่มแถวใน Sheet USERS ได้เลย

**Q: ใช้กับมือถือ Android/iPhone ได้ไหม?**  
A: ได้ทั้งคู่ เปิดผ่าน Chrome/Safari แล้ว "Add to Home Screen" เพื่อใช้งานเหมือน App

---

## โครงสร้างไฟล์

```
nippon-farm/
├── index.html          ← Frontend ทั้งหมด (SPA)
├── Code.gs             ← Google Apps Script (วางใน Apps Script Editor)
├── GOOGLE_SHEETS_SCHEMA.md  ← คู่มือโครงสร้าง Database
└── SETUP_GUIDE.md      ← ไฟล์นี้
```
