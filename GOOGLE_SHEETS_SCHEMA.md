# นิพนธ์ฟาร์ม — Google Sheets Database Schema
## Smart Sow Productivity System (PigCHAMP Standard)

---

## วิธีตั้งค่า Google Sheets

1. สร้าง Google Spreadsheet ใหม่ ชื่อ "NipponFarm_DB"
2. สร้าง Sheet ตามรายชื่อด้านล่างทุก Sheet
3. ตั้งค่า Google Apps Script ตาม Code.gs ที่แนบมา
4. Deploy เป็น Web App (Execute as: Me, Access: Anyone)
5. คัดลอก Web App URL ไปใส่ใน script.js ของ Frontend

---

## Sheet 1: SETTINGS (การตั้งค่าฟาร์ม)
| คอลัมน์ | Header | ตัวอย่าง | หมายเหตุ |
|---------|--------|---------|---------|
| A | key | GESTATION_DAYS | ชื่อตัวแปร |
| B | value | 114 | ค่า |
| C | label | วันอุ้มท้องมาตรฐาน | คำอธิบาย |

**ข้อมูลเริ่มต้นที่ต้องกรอก:**
```
FARM_NAME | นิพนธ์ฟาร์ม
GESTATION_DAYS | 114
LACTATION_TARGET | 21
WSI_TARGET | 7
PREG_CHECK_DAY1 | 21
PREG_CHECK_DAY2 | 42
MOVE_FARROWING_DAY | 110
CULL_MAX_PARITY | 8
CULL_MIN_LIVE_BORN | 10
CULL_MAX_RETURNS | 3
PSY_TARGET | 28
LINE_TOKEN | (ใส่ LINE Token ตอน Deploy)
```

---

## Sheet 2: SOWS (ทะเบียนแม่พันธุ์)
| คอลัมน์ | Header | ตัวอย่าง | ชนิด |
|---------|--------|---------|------|
| A | sow_id | S001 | TEXT (Primary Key) |
| B | ear_tag | 001 | TEXT |
| C | breed | Landrace | TEXT |
| D | birth_date | 2022-01-15 | DATE |
| E | entry_date | 2022-07-01 | DATE |
| F | source | ฟาร์มพ่อแม่พันธุ์A | TEXT |
| G | status | SERVED | TEXT (OPEN/SERVED/PREGNANT/LACTATING/CULLED) |
| H | current_parity | 3 | NUMBER |
| I | location | G-A12 | TEXT |
| J | notes | - | TEXT |
| K | created_at | 2022-07-01 | DATE |
| L | updated_at | 2024-01-15 | DATE |
| M | is_active | TRUE | BOOLEAN |

---

## Sheet 3: BOARS (ทะเบียนพ่อพันธุ์)
| คอลัมน์ | Header | ตัวอย่าง | ชนิด |
|---------|--------|---------|------|
| A | boar_id | B001 | TEXT (Primary Key) |
| B | ear_tag | P001 | TEXT |
| C | breed | Duroc | TEXT |
| D | birth_date | 2021-06-01 | DATE |
| E | entry_date | 2022-01-01 | DATE |
| F | is_active | TRUE | BOOLEAN |

---

## Sheet 4: CYCLES (บันทึกวงจรการผลิต — หัวใจของระบบ)
| คอลัมน์ | Header | ตัวอย่าง | ชนิด |
|---------|--------|---------|------|
| A | cycle_id | CYC-S001-003 | TEXT (PK: sow_id + parity) |
| B | sow_id | S001 | TEXT (FK) |
| C | parity | 3 | NUMBER |
| D | service_date | 2024-01-10 | DATE |
| E | boar_id | B002 | TEXT (FK) |
| F | technician | สมชาย | TEXT |
| G | service_type | AI | TEXT (AI/Natural) |
| H | expected_farrowing | 2024-05-04 | DATE (auto: +114d) |
| I | preg_check1_due | 2024-01-31 | DATE (auto: +21d) |
| J | preg_check1_date | 2024-01-30 | DATE |
| K | preg_check1_result | POSITIVE | TEXT (POSITIVE/NEGATIVE/REPEAT) |
| L | preg_check2_due | 2024-02-21 | DATE (auto: +42d) |
| M | preg_check2_date | 2024-02-20 | DATE |
| N | preg_check2_result | CONFIRMED | TEXT |
| O | move_farrowing_due | 2024-04-29 | DATE (auto: +110d) |
| P | move_farrowing_date | 2024-04-28 | DATE |
| Q | actual_farrowing_date | 2024-05-03 | DATE |
| R | gestation_length | 113 | NUMBER (auto: Q-D) |
| S | total_born | 13 | NUMBER |
| T | live_born | 12 | NUMBER |
| U | stillborn | 1 | NUMBER |
| V | mummy | 0 | NUMBER |
| W | birth_weight_total | 15.6 | NUMBER (kg) |
| X | fostered_in | 0 | NUMBER |
| Y | fostered_out | 0 | NUMBER |
| Z | weaning_date | 2024-05-24 | DATE |
| AA | weaned_count | 11 | NUMBER |
| AB | weaning_weight_total | 77 | NUMBER (kg) |
| AC | lactation_days | 21 | NUMBER (auto: Z-Q) |
| AD | wsi_date | 2024-05-29 | DATE (วันผสมครั้งถัดไป) |
| AE | wsi_days | 5 | NUMBER (auto: AD-Z) |
| AF | cycle_status | COMPLETE | TEXT (ACTIVE/COMPLETE/CULLED) |
| AG | notes | - | TEXT |
| AH | created_at | 2024-01-10 | DATE |

---

## Sheet 5: EVENTS (บันทึกเหตุการณ์เพิ่มเติม)
| คอลัมน์ | Header | ตัวอย่าง | ชนิด |
|---------|--------|---------|------|
| A | event_id | EVT-001 | TEXT |
| B | sow_id | S001 | TEXT (FK) |
| C | event_date | 2024-01-15 | DATE |
| D | event_type | VACCINE | TEXT (VACCINE/DEWORM/TREATMENT/BCS/DEATH/CULL) |
| E | details | วัคซีน PRRS | TEXT |
| F | recorded_by | สมชาย | TEXT |
| G | notes | - | TEXT |

---

## Sheet 6: USERS (ผู้ใช้งาน)
| คอลัมน์ | Header | ตัวอย่าง |
|---------|--------|---------|
| A | username | admin |
| B | password_hash | (SHA256) |
| C | role | ADMIN | (ADMIN/STAFF) |
| D | display_name | คุณนิพนธ์ |
| E | is_active | TRUE |

**ข้อมูลเริ่มต้น:**
```
admin | (hash ของ admin1234) | ADMIN | คุณนิพนธ์ | TRUE
staff1 | (hash ของ staff1234) | STAFF | สมชาย | TRUE
```

---

## Sheet 7: DAILY_TASKS_LOG (บันทึกการทำงานรายวัน — auto generated)
ระบบจะ query จาก CYCLES แบบ dynamic ไม่ต้องกรอกเอง

---

## ดัชนีสำคัญที่ระบบคำนวณอัตโนมัติ

| KPI | สูตร | เป้าหมาย |
|-----|------|---------|
| PSY | (avg_weaned_per_litter × litters_per_year) | > 28 |
| Farrowing Rate | (farrow_count / service_count) × 100 | > 85% |
| Pre-weaning Mortality | (live_born - weaned) / live_born × 100 | < 12% |
| WSI Average | avg(wsi_days) | < 7 วัน |
| NPD per sow | sum(open_days + wsi_days + return_days) | < 35 วัน/ปี |
| Gestation Length | avg(actual_farrowing - service_date) | 113-115 วัน |

---

## หมายเหตุสำคัญ
- ห้ามลบ Row ในทุก Sheet ให้ใช้ is_active = FALSE แทน
- cycle_id ใช้รูปแบบ: sow_id + "-" + parity (เช่น S001-3)
- การ CULL แม่สุกร: อัปเดต sows.status = CULLED และ sows.is_active = FALSE
- Backup Google Sheets ทุกสัปดาห์ด้วย File > Download
