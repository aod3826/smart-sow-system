// ============================================================
// นิพนธ์ฟาร์ม — Google Apps Script Backend
// Smart Sow Productivity System v1.0
// Deploy: Extensions > Apps Script > Deploy > Web App
// Execute as: Me | Access: Anyone
// ============================================================

const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

const SHEETS = {
  SETTINGS: 'SETTINGS',
  SOWS: 'SOWS',
  BOARS: 'BOARS',
  CYCLES: 'CYCLES',
  EVENTS: 'EVENTS',
  USERS: 'USERS'
};

// ── CORS Helper ──────────────────────────────────────────────
function setCORSHeaders(output) {
  return output
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    const params = e.parameter;
    const postData = e.postData ? JSON.parse(e.postData.contents || '{}') : {};
    const action = params.action || postData.action;

    let result;
    switch (action) {
      case 'login':            result = login(postData); break;
      case 'getDashboard':     result = getDashboard(postData); break;
      case 'getTasksToday':    result = getTasksToday(postData); break;
      case 'getSows':          result = getSows(postData); break;
      case 'getSowDetail':     result = getSowDetail(postData); break;
      case 'addSow':           result = addSow(postData); break;
      case 'updateSow':        result = updateSow(postData); break;
      case 'getBoars':         result = getBoars(); break;
      case 'recordService':    result = recordService(postData); break;
      case 'recordPregCheck':  result = recordPregCheck(postData); break;
      case 'recordFarrowing':  result = recordFarrowing(postData); break;
      case 'recordWeaning':    result = recordWeaning(postData); break;
      case 'getCycles':        result = getCycles(postData); break;
      case 'getSettings':      result = getSettings(); break;
      case 'updateSettings':   result = updateSettings(postData); break;
      case 'getReports':       result = getReports(postData); break;
      case 'cullSow':          result = cullSow(postData); break;
      default:                 result = { success: false, error: 'Unknown action: ' + action };
    }

    return setCORSHeaders(ContentService.createTextOutput(JSON.stringify(result)));
  } catch (err) {
    return setCORSHeaders(ContentService.createTextOutput(
      JSON.stringify({ success: false, error: err.message })
    ));
  }
}

// ── Helpers ──────────────────────────────────────────────────
function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(name);
}

function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function formatDate(date) {
  if (!date || date === '') return '';
  if (typeof date === 'string') return date;
  const d = new Date(date);
  return Utilities.formatDate(d, 'Asia/Bangkok', 'yyyy-MM-dd');
}

function addDays(dateStr, days) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

function daysBetween(d1, d2) {
  if (!d1 || !d2) return null;
  const ms = new Date(d2) - new Date(d1);
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

function getSettingsMap() {
  const sheet = getSheet(SHEETS.SETTINGS);
  const data = sheetToObjects(sheet);
  const map = {};
  data.forEach(r => { map[r.key] = r.value; });
  return map;
}

// ── AUTH ─────────────────────────────────────────────────────
function login(data) {
  const { username, password } = data;
  const sheet = getSheet(SHEETS.USERS);
  const users = sheetToObjects(sheet);
  const hash = simpleHash(password);
  const user = users.find(u =>
    u.username === username && u.password_hash === hash && u.is_active == true
  );
  if (!user) return { success: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
  return {
    success: true,
    user: { username: user.username, role: user.role, display_name: user.display_name }
  };
}

// ── DASHBOARD ────────────────────────────────────────────────
function getDashboard() {
  const sows = sheetToObjects(getSheet(SHEETS.SOWS)).filter(s => s.is_active == true);
  const cycles = sheetToObjects(getSheet(SHEETS.CYCLES));
  const settings = getSettingsMap();

  const statusCounts = { OPEN: 0, SERVED: 0, PREGNANT: 0, LACTATING: 0 };
  sows.forEach(s => { if (statusCounts[s.status] !== undefined) statusCounts[s.status]++; });

  const completedCycles = cycles.filter(c => c.cycle_status === 'COMPLETE' && c.weaned_count > 0);
  const avgLiveBorn = completedCycles.length > 0
    ? completedCycles.reduce((sum, c) => sum + Number(c.live_born || 0), 0) / completedCycles.length : 0;
  const avgWeaned = completedCycles.length > 0
    ? completedCycles.reduce((sum, c) => sum + Number(c.weaned_count || 0), 0) / completedCycles.length : 0;

  const wsiCycles = completedCycles.filter(c => c.wsi_days > 0);
  const avgWSI = wsiCycles.length > 0
    ? wsiCycles.reduce((sum, c) => sum + Number(c.wsi_days || 0), 0) / wsiCycles.length : 0;

  const activeSows = sows.length;
  const littersPerYear = 365 / (Number(settings.GESTATION_DAYS || 114) + Number(settings.LACTATION_TARGET || 21) + Number(settings.WSI_TARGET || 7));
  const psy = avgWeaned * littersPerYear;

  const recentCycles = completedCycles.slice(-20);
  const farrowingRateData = recentCycles.map(c => ({
    label: c.cycle_id,
    live_born: Number(c.live_born || 0),
    stillborn: Number(c.stillborn || 0),
    mummy: Number(c.mummy || 0)
  }));

  return {
    success: true,
    statusCounts,
    kpis: {
      total_sows: activeSows,
      avg_live_born: Math.round(avgLiveBorn * 10) / 10,
      avg_weaned: Math.round(avgWeaned * 10) / 10,
      avg_wsi: Math.round(avgWSI * 10) / 10,
      psy: Math.round(psy * 10) / 10,
      total_cycles: completedCycles.length
    },
    chartData: { farrowingRateData }
  };
}

// ── TASKS TODAY ───────────────────────────────────────────────
function getTasksToday() {
  const today = formatDate(new Date());
  const tomorrow = addDays(today, 1);
  const upcoming3 = addDays(today, 3);

  const cycles = sheetToObjects(getSheet(SHEETS.CYCLES)).filter(c => c.cycle_status === 'ACTIVE');
  const tasks = [];

  cycles.forEach(c => {
    const sowId = c.sow_id;

    // ตรวจท้องรอบ 1 (วันที่ 21)
    if (!c.preg_check1_date && c.preg_check1_due && c.preg_check1_due <= upcoming3) {
      tasks.push({
        type: 'PREG_CHECK_1',
        sow_id: sowId, cycle_id: c.cycle_id,
        due_date: formatDate(c.preg_check1_due),
        priority: c.preg_check1_due <= today ? 'URGENT' : 'UPCOMING',
        label: `ตรวจท้องรอบ 1 — ${sowId}`
      });
    }

    // ตรวจท้องรอบ 2 (วันที่ 42)
    if (c.preg_check1_result === 'POSITIVE' && !c.preg_check2_date &&
        c.preg_check2_due && c.preg_check2_due <= upcoming3) {
      tasks.push({
        type: 'PREG_CHECK_2',
        sow_id: sowId, cycle_id: c.cycle_id,
        due_date: formatDate(c.preg_check2_due),
        priority: c.preg_check2_due <= today ? 'URGENT' : 'UPCOMING',
        label: `ยืนยันการตั้งท้อง — ${sowId}`
      });
    }

    // ย้ายเข้าเล้าคลอด (วันที่ 110)
    if (!c.move_farrowing_date && c.move_farrowing_due && c.move_farrowing_due <= upcoming3) {
      tasks.push({
        type: 'MOVE_FARROWING',
        sow_id: sowId, cycle_id: c.cycle_id,
        due_date: formatDate(c.move_farrowing_due),
        priority: c.move_farrowing_due <= today ? 'URGENT' : 'UPCOMING',
        label: `ย้ายเข้าเล้าคลอด — ${sowId}`
      });
    }

    // แจ้งเตือนใกล้คลอด (7 วันก่อน)
    if (!c.actual_farrowing_date && c.expected_farrowing) {
      const daysToFarrow = daysBetween(today, formatDate(c.expected_farrowing));
      if (daysToFarrow !== null && daysToFarrow >= 0 && daysToFarrow <= 7) {
        tasks.push({
          type: 'NEAR_FARROWING',
          sow_id: sowId, cycle_id: c.cycle_id,
          due_date: formatDate(c.expected_farrowing),
          priority: daysToFarrow <= 1 ? 'URGENT' : 'UPCOMING',
          label: `ใกล้ถึงกำหนดคลอด (${daysToFarrow} วัน) — ${sowId}`
        });
      }
    }
  });

  // ตรวจสอบแม่สุกรที่ควรหย่านม (lactation > 23 วัน)
  const lactatingCycles = sheetToObjects(getSheet(SHEETS.CYCLES))
    .filter(c => c.actual_farrowing_date && !c.weaning_date && c.cycle_status === 'ACTIVE');
  lactatingCycles.forEach(c => {
    const lacDays = daysBetween(formatDate(c.actual_farrowing_date), today);
    if (lacDays >= 21) {
      tasks.push({
        type: 'WEANING_DUE',
        sow_id: c.sow_id, cycle_id: c.cycle_id,
        due_date: formatDate(c.actual_farrowing_date),
        priority: lacDays >= 24 ? 'URGENT' : 'UPCOMING',
        label: `ครบกำหนดหย่านม (เลี้ยง ${lacDays} วัน) — ${c.sow_id}`
      });
    }
  });

  tasks.sort((a, b) => {
    const p = { URGENT: 0, UPCOMING: 1 };
    return p[a.priority] - p[b.priority];
  });

  return { success: true, tasks, today };
}

// ── SOWS ─────────────────────────────────────────────────────
function getSows(data) {
  const sows = sheetToObjects(getSheet(SHEETS.SOWS));
  let filtered = sows.filter(s => s.is_active == true || s.is_active === 'TRUE');
  if (data && data.status) filtered = filtered.filter(s => s.status === data.status);
  return { success: true, sows: filtered };
}

function getSowDetail(data) {
  const { sow_id } = data;
  const sows = sheetToObjects(getSheet(SHEETS.SOWS));
  const sow = sows.find(s => s.sow_id === sow_id);
  if (!sow) return { success: false, error: 'ไม่พบข้อมูลแม่สุกร: ' + sow_id };

  const cycles = sheetToObjects(getSheet(SHEETS.CYCLES))
    .filter(c => c.sow_id === sow_id)
    .sort((a, b) => Number(b.parity) - Number(a.parity));

  const settings = getSettingsMap();
  const cullWarnings = [];

  if (Number(sow.current_parity) >= Number(settings.CULL_MAX_PARITY || 8)) {
    cullWarnings.push(`ท้องที่ ${sow.current_parity} เกินเกณฑ์ (${settings.CULL_MAX_PARITY})`);
  }

  const recent3 = cycles.slice(0, 3).filter(c => c.live_born > 0);
  if (recent3.length >= 2) {
    const avgLB = recent3.reduce((s, c) => s + Number(c.live_born), 0) / recent3.length;
    if (avgLB < Number(settings.CULL_MIN_LIVE_BORN || 10)) {
      cullWarnings.push(`ลูกมีชีวิตเฉลี่ย 3 ท้องล่าสุด: ${avgLB.toFixed(1)} ตัว (ต่ำกว่า ${settings.CULL_MIN_LIVE_BORN})`);
    }
  }

  return { success: true, sow, cycles, cullWarnings };
}

function addSow(data) {
  const sheet = getSheet(SHEETS.SOWS);
  const { ear_tag, breed, birth_date, entry_date, source, notes } = data;
  const sows = sheetToObjects(sheet);

  const existing = sows.find(s => s.ear_tag === ear_tag && s.is_active == true);
  if (existing) return { success: false, error: `เบอร์หู ${ear_tag} มีในระบบแล้ว` };

  const paddedNum = String(sows.length + 1).padStart(3, '0');
  const sow_id = 'S' + paddedNum;
  const now = formatDate(new Date());

  sheet.appendRow([
    sow_id, ear_tag, breed || 'Landrace x Yorkshire',
    birth_date || '', entry_date || now,
    source || '', 'OPEN', 0, '', notes || '', now, now, true
  ]);

  return { success: true, sow_id, message: `เพิ่มแม่สุกร ${ear_tag} (${sow_id}) สำเร็จ` };
}

function updateSow(data) {
  const sheet = getSheet(SHEETS.SOWS);
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const sowIdIdx = headers.indexOf('sow_id');

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][sowIdIdx] === data.sow_id) {
      if (data.location !== undefined) rows[i][headers.indexOf('location')] = data.location;
      if (data.notes !== undefined) rows[i][headers.indexOf('notes')] = data.notes;
      if (data.status !== undefined) rows[i][headers.indexOf('status')] = data.status;
      rows[i][headers.indexOf('updated_at')] = formatDate(new Date());
      sheet.getRange(i + 1, 1, 1, rows[i].length).setValues([rows[i]]);
      return { success: true, message: 'อัปเดตข้อมูลสำเร็จ' };
    }
  }
  return { success: false, error: 'ไม่พบ sow_id: ' + data.sow_id };
}

// ── BOARS ────────────────────────────────────────────────────
function getBoars() {
  const boars = sheetToObjects(getSheet(SHEETS.BOARS))
    .filter(b => b.is_active == true || b.is_active === 'TRUE');
  return { success: true, boars };
}

// ── CYCLE RECORDING ──────────────────────────────────────────
function recordService(data) {
  const { sow_id, service_date, boar_id, technician, service_type, notes } = data;
  const settings = getSettingsMap();
  const gestDays = Number(settings.GESTATION_DAYS || 114);
  const check1Days = Number(settings.PREG_CHECK_DAY1 || 21);
  const check2Days = Number(settings.PREG_CHECK_DAY2 || 42);
  const moveFarrowDay = Number(settings.MOVE_FARROWING_DAY || 110);

  const sowSheet = getSheet(SHEETS.SOWS);
  const sowRows = sowSheet.getDataRange().getValues();
  const sowHeaders = sowRows[0];
  const sowIdIdx = sowHeaders.indexOf('sow_id');
  const parityIdx = sowHeaders.indexOf('current_parity');
  const statusIdx = sowHeaders.indexOf('status');
  const updatedIdx = sowHeaders.indexOf('updated_at');

  let currentParity = 0;
  let sowRowIndex = -1;

  for (let i = 1; i < sowRows.length; i++) {
    if (sowRows[i][sowIdIdx] === sow_id) {
      currentParity = Number(sowRows[i][parityIdx]) + 1;
      sowRowIndex = i;
      break;
    }
  }
  if (sowRowIndex === -1) return { success: false, error: 'ไม่พบ sow_id: ' + sow_id };

  const cycle_id = `${sow_id}-${currentParity}`;
  const cycleSheet = getSheet(SHEETS.CYCLES);
  const existing = sheetToObjects(cycleSheet).find(c => c.cycle_id === cycle_id);
  if (existing) return { success: false, error: `วงจร ${cycle_id} มีอยู่แล้ว` };

  const expected_farrowing = addDays(service_date, gestDays);
  const preg_check1_due = addDays(service_date, check1Days);
  const preg_check2_due = addDays(service_date, check2Days);
  const move_farrowing_due = addDays(service_date, moveFarrowDay);
  const now = formatDate(new Date());

  cycleSheet.appendRow([
    cycle_id, sow_id, currentParity,
    service_date, boar_id, technician, service_type || 'AI',
    expected_farrowing, preg_check1_due, '', '', preg_check2_due, '', '',
    move_farrowing_due, '', '', '', '', '', '', '', '', 0, 0,
    '', '', '', 0, '', '', 'ACTIVE', notes || '', now
  ]);

  // อัปเดตสถานะแม่สุกร
  sowRows[sowRowIndex][parityIdx] = currentParity;
  sowRows[sowRowIndex][statusIdx] = 'SERVED';
  sowRows[sowRowIndex][updatedIdx] = now;
  sowSheet.getRange(sowRowIndex + 1, 1, 1, sowRows[sowRowIndex].length).setValues([sowRows[sowRowIndex]]);

  return {
    success: true, cycle_id,
    expected_farrowing, preg_check1_due, preg_check2_due, move_farrowing_due,
    message: `บันทึกการผสม ${sow_id} ท้องที่ ${currentParity} สำเร็จ`
  };
}

function recordPregCheck(data) {
  const { cycle_id, check_round, check_date, result } = data;
  const cycleSheet = getSheet(SHEETS.CYCLES);
  const rows = cycleSheet.getDataRange().getValues();
  const headers = rows[0];
  const cycleIdIdx = headers.indexOf('cycle_id');

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][cycleIdIdx] === cycle_id) {
      if (check_round === 1 || check_round === '1') {
        rows[i][headers.indexOf('preg_check1_date')] = check_date;
        rows[i][headers.indexOf('preg_check1_result')] = result;
      } else {
        rows[i][headers.indexOf('preg_check2_date')] = check_date;
        rows[i][headers.indexOf('preg_check2_result')] = result;
      }

      if (result === 'NEGATIVE') {
        updateSowStatus(rows[i][headers.indexOf('sow_id')], 'OPEN');
        rows[i][headers.indexOf('cycle_status')] = 'CULLED';
      } else if (result === 'CONFIRMED') {
        updateSowStatus(rows[i][headers.indexOf('sow_id')], 'PREGNANT');
      }

      cycleSheet.getRange(i + 1, 1, 1, rows[i].length).setValues([rows[i]]);
      return { success: true, message: `บันทึกผลตรวจท้องรอบ ${check_round} สำเร็จ` };
    }
  }
  return { success: false, error: 'ไม่พบ cycle_id: ' + cycle_id };
}

function recordFarrowing(data) {
  const { cycle_id, farrowing_date, live_born, stillborn, mummy, birth_weight_total, notes } = data;
  const cycleSheet = getSheet(SHEETS.CYCLES);
  const rows = cycleSheet.getDataRange().getValues();
  const headers = rows[0];

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][headers.indexOf('cycle_id')] === cycle_id) {
      const serviceDate = formatDate(rows[i][headers.indexOf('service_date')]);
      const gestLen = daysBetween(serviceDate, farrowing_date);

      rows[i][headers.indexOf('actual_farrowing_date')] = farrowing_date;
      rows[i][headers.indexOf('gestation_length')] = gestLen;
      rows[i][headers.indexOf('total_born')] = Number(live_born) + Number(stillborn) + Number(mummy);
      rows[i][headers.indexOf('live_born')] = Number(live_born);
      rows[i][headers.indexOf('stillborn')] = Number(stillborn || 0);
      rows[i][headers.indexOf('mummy')] = Number(mummy || 0);
      rows[i][headers.indexOf('birth_weight_total')] = Number(birth_weight_total || 0);
      if (notes) rows[i][headers.indexOf('notes')] = notes;

      cycleSheet.getRange(i + 1, 1, 1, rows[i].length).setValues([rows[i]]);
      updateSowStatus(rows[i][headers.indexOf('sow_id')], 'LACTATING');

      return {
        success: true,
        gestation_length: gestLen,
        total_born: Number(live_born) + Number(stillborn) + Number(mummy),
        message: `บันทึกการคลอด ${cycle_id} สำเร็จ`
      };
    }
  }
  return { success: false, error: 'ไม่พบ cycle_id: ' + cycle_id };
}

function recordWeaning(data) {
  const { cycle_id, weaning_date, weaned_count, weaning_weight_total } = data;
  const cycleSheet = getSheet(SHEETS.CYCLES);
  const rows = cycleSheet.getDataRange().getValues();
  const headers = rows[0];

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][headers.indexOf('cycle_id')] === cycle_id) {
      const farrowDate = formatDate(rows[i][headers.indexOf('actual_farrowing_date')]);
      const lacDays = daysBetween(farrowDate, weaning_date);

      rows[i][headers.indexOf('weaning_date')] = weaning_date;
      rows[i][headers.indexOf('weaned_count')] = Number(weaned_count);
      rows[i][headers.indexOf('weaning_weight_total')] = Number(weaning_weight_total || 0);
      rows[i][headers.indexOf('lactation_days')] = lacDays;
      rows[i][headers.indexOf('cycle_status')] = 'COMPLETE';

      cycleSheet.getRange(i + 1, 1, 1, rows[i].length).setValues([rows[i]]);
      updateSowStatus(rows[i][headers.indexOf('sow_id')], 'OPEN');

      return {
        success: true,
        lactation_days: lacDays,
        message: `บันทึกการหย่านม ${cycle_id} สำเร็จ — เลี้ยงลูก ${lacDays} วัน`
      };
    }
  }
  return { success: false, error: 'ไม่พบ cycle_id: ' + cycle_id };
}

function getCycles(data) {
  const cycles = sheetToObjects(getSheet(SHEETS.CYCLES));
  if (data && data.sow_id) {
    return { success: true, cycles: cycles.filter(c => c.sow_id === data.sow_id) };
  }
  if (data && data.status) {
    return { success: true, cycles: cycles.filter(c => c.cycle_status === data.status) };
  }
  return { success: true, cycles };
}

// ── SETTINGS ─────────────────────────────────────────────────
function getSettings() {
  return { success: true, settings: sheetToObjects(getSheet(SHEETS.SETTINGS)) };
}

function updateSettings(data) {
  const sheet = getSheet(SHEETS.SETTINGS);
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const keyIdx = headers.indexOf('key');
  const valIdx = headers.indexOf('value');

  Object.keys(data.settings || {}).forEach(key => {
    let found = false;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][keyIdx] === key) {
        rows[i][valIdx] = data.settings[key];
        sheet.getRange(i + 1, valIdx + 1).setValue(data.settings[key]);
        found = true;
        break;
      }
    }
    if (!found) {
      sheet.appendRow([key, data.settings[key], '']);
    }
  });
  return { success: true, message: 'บันทึกการตั้งค่าสำเร็จ' };
}

// ── REPORTS ──────────────────────────────────────────────────
function getReports(data) {
  const cycles = sheetToObjects(getSheet(SHEETS.CYCLES));
  const completed = cycles.filter(c => c.cycle_status === 'COMPLETE');

  const month = data && data.month ? data.month : null;
  const filtered = month
    ? completed.filter(c => formatDate(c.weaning_date).startsWith(month))
    : completed;

  const technicianStats = {};
  cycles.forEach(c => {
    if (!c.technician) return;
    if (!technicianStats[c.technician]) {
      technicianStats[c.technician] = { services: 0, farrowings: 0, total_live_born: 0 };
    }
    technicianStats[c.technician].services++;
    if (c.actual_farrowing_date) {
      technicianStats[c.technician].farrowings++;
      technicianStats[c.technician].total_live_born += Number(c.live_born || 0);
    }
  });

  const pendingCull = sheetToObjects(getSheet(SHEETS.SOWS)).filter(s => {
    const settings = getSettingsMap();
    return s.is_active == true &&
      (Number(s.current_parity) >= Number(settings.CULL_MAX_PARITY || 8));
  });

  return {
    success: true,
    summary: {
      total_farrowings: filtered.length,
      avg_live_born: filtered.length > 0
        ? Math.round(filtered.reduce((s, c) => s + Number(c.live_born || 0), 0) / filtered.length * 10) / 10 : 0,
      avg_weaned: filtered.length > 0
        ? Math.round(filtered.reduce((s, c) => s + Number(c.weaned_count || 0), 0) / filtered.length * 10) / 10 : 0,
      total_live_born: filtered.reduce((s, c) => s + Number(c.live_born || 0), 0),
      total_weaned: filtered.reduce((s, c) => s + Number(c.weaned_count || 0), 0)
    },
    technicianStats,
    pendingCull,
    recentCycles: filtered.slice(-30).map(c => ({
      cycle_id: c.cycle_id,
      sow_id: c.sow_id,
      parity: c.parity,
      live_born: c.live_born,
      weaned_count: c.weaned_count,
      lactation_days: c.lactation_days,
      wsi_days: c.wsi_days,
      weaning_date: formatDate(c.weaning_date)
    }))
  };
}

// ── CULL ─────────────────────────────────────────────────────
function cullSow(data) {
  const { sow_id, reason, recorded_by } = data;
  const sheet = getSheet(SHEETS.SOWS);
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][headers.indexOf('sow_id')] === sow_id) {
      rows[i][headers.indexOf('status')] = 'CULLED';
      rows[i][headers.indexOf('is_active')] = false;
      rows[i][headers.indexOf('notes')] = `CULLED: ${reason} (${formatDate(new Date())})`;
      rows[i][headers.indexOf('updated_at')] = formatDate(new Date());
      sheet.getRange(i + 1, 1, 1, rows[i].length).setValues([rows[i]]);

      getSheet(SHEETS.EVENTS).appendRow([
        `EVT-CULL-${sow_id}-${Date.now()}`, sow_id, formatDate(new Date()),
        'CULL', reason, recorded_by || 'system', ''
      ]);

      return { success: true, message: `คัดทิ้ง ${sow_id} สำเร็จ` };
    }
  }
  return { success: false, error: 'ไม่พบ sow_id: ' + sow_id };
}

// ── Internal Helper ───────────────────────────────────────────
function updateSowStatus(sow_id, status) {
  const sheet = getSheet(SHEETS.SOWS);
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][headers.indexOf('sow_id')] === sow_id) {
      rows[i][headers.indexOf('status')] = status;
      rows[i][headers.indexOf('updated_at')] = formatDate(new Date());
      sheet.getRange(i + 1, 1, 1, rows[i].length).setValues([rows[i]]);
      return;
    }
  }
}
