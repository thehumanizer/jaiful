// ============================================================
// JAIFUL — Google Sheets Sync via Apps Script
// ============================================================
// วิธีใช้:
// 1. เปิด Extensions > Apps Script ใน Google Sheet
// 2. แทนที่โค้ดทั้งหมดด้วยไฟล์นี้
// 3. กด Run > setupHeaders() ครั้งแรกครั้งเดียว
// 4. Deploy > New Deployment > Web App > Execute as: Me, Who has access: Anyone
// 5. Copy Web App URL แล้วส่งให้เบนซ์
// ============================================================

const SPREADSHEET_ID = '1cgK3Phgk4UZZodTKvfSbFDWuRqgTDARKrGibjDUEJrc';

const REG_HEADERS = [
  'JAIFUL ID', 'ชื่อ-นามสกุล', 'ชื่อเล่น', 'เบอร์โทร', 'อีเมล', 'LINE ID',
  'บริษัท', 'ตำแหน่ง', 'Workshop', 'สถานะ', 'การชำระเงิน',
  'หมายเหตุ', 'วันที่สมัคร', 'วันที่ยืนยัน', 'reg_id'
];

const MEMBER_HEADERS = [
  'JAIFUL ID', 'ชื่อ-นามสกุล', 'ชื่อเล่น', 'เบอร์โทร', 'อีเมล', 'LINE ID',
  'บริษัท', 'ตำแหน่ง', 'สถานะสมาชิก', 'JAI', 'วันที่สมัครครั้งแรก'
];

// ── Setup (รันครั้งแรกครั้งเดียว) ─────────────────────────────
function setupHeaders() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Sheet 1: Registrations
  let regSheet = ss.getSheetByName('Registrations');
  if (!regSheet) {
    regSheet = ss.getSheets()[0];
    regSheet.setName('Registrations');
  }
  _applyHeaders(regSheet, REG_HEADERS);

  // Sheet 2: Members
  let memSheet = ss.getSheetByName('Members');
  if (!memSheet) {
    memSheet = ss.insertSheet('Members');
  }
  _applyHeaders(memSheet, MEMBER_HEADERS);

  SpreadsheetApp.flush();
  Logger.log('✅ Headers setup complete!');
}

function _applyHeaders(sheet, headers) {
  sheet.clearContents();
  const range = sheet.getRange(1, 1, 1, headers.length);
  range.setValues([headers]);
  range.setBackground('#1a2f5e');
  range.setFontColor('#ffffff');
  range.setFontWeight('bold');
  range.setFontSize(11);
  range.setHorizontalAlignment('center');
  sheet.setFrozenRows(1);

  // Column widths
  const widths = {
    'JAIFUL ID': 130, 'ชื่อ-นามสกุล': 160, 'ชื่อเล่น': 90,
    'เบอร์โทร': 115, 'อีเมล': 190, 'LINE ID': 110,
    'บริษัท': 160, 'ตำแหน่ง': 140, 'Workshop': 110,
    'สถานะ': 110, 'การชำระเงิน': 110, 'หมายเหตุ': 180,
    'วันที่สมัคร': 140, 'วันที่ยืนยัน': 140,
    'สถานะสมาชิก': 120, 'JAI': 70, 'วันที่สมัครครั้งแรก': 150,
    'reg_id': 0  // hidden
  };
  headers.forEach((h, i) => {
    if (widths[h] !== undefined) {
      const col = i + 1;
      if (widths[h] === 0) {
        sheet.hideColumns(col);
      } else {
        sheet.setColumnWidth(col, widths[h]);
      }
    }
  });
}

// ── Webhook receiver ──────────────────────────────────────────
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);

    // Verify secret
    const secret = PropertiesService.getScriptProperties().getProperty('SYNC_SECRET');
    if (secret && payload.secret !== secret) {
      return _json({ error: 'unauthorized' });
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const { registration, member } = payload;

    if (registration && member) _upsertRegistration(ss, registration, member);
    if (member)                 _upsertMember(ss, member);

    return _json({ success: true });
  } catch (err) {
    return _json({ error: err.message });
  }
}

function _upsertRegistration(ss, reg, member) {
  const sheet = ss.getSheetByName('Registrations');
  if (!sheet) return;

  const regIdCol = REG_HEADERS.indexOf('reg_id') + 1;  // 1-indexed
  const lastRow  = Math.max(sheet.getLastRow(), 1);
  const data     = lastRow > 1
    ? sheet.getRange(2, regIdCol, lastRow - 1, 1).getValues()
    : [];

  let targetRow = -1;
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === reg.reg_id) { targetRow = i + 2; break; }
  }

  const row = [
    member.jaiful_id    || '',
    member.full_name    || '',
    member.nickname     || '',
    member.phone        || '',
    member.email        || '',
    member.line_id      || '',
    member.company      || '',
    member.position     || '',
    reg.workshop_id     || '',
    reg.status          || '',
    reg.payment_status  || '',
    reg.notes           || '',
    _thDate(reg.created_at),
    _thDate(reg.confirmed_at),
    reg.reg_id          || ''
  ];

  if (targetRow > 0) {
    sheet.getRange(targetRow, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
    // Color new row lightly
    const newRow = sheet.getLastRow();
    sheet.getRange(newRow, 1, 1, row.length).setBackground('#f0f4ff');
  }
}

function _upsertMember(ss, member) {
  const sheet = ss.getSheetByName('Members');
  if (!sheet) return;

  const lastRow = Math.max(sheet.getLastRow(), 1);
  const data    = lastRow > 1
    ? sheet.getRange(2, 1, lastRow - 1, 1).getValues()
    : [];

  let targetRow = -1;
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === member.jaiful_id) { targetRow = i + 2; break; }
  }

  const row = [
    member.jaiful_id    || '',
    member.full_name    || '',
    member.nickname     || '',
    member.phone        || '',
    member.email        || '',
    member.line_id      || '',
    member.company      || '',
    member.position     || '',
    member.member_status || '',
    member.jai_balance  || 0,
    _thDate(member.created_at)
  ];

  if (targetRow > 0) {
    sheet.getRange(targetRow, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
}

function _thDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
}

function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── ตั้ง secret (รันครั้งเดียว หลัง deploy) ──────────────────
function setSecret() {
  PropertiesService.getScriptProperties()
    .setProperty('SYNC_SECRET', '2a9958523079088b0d90234fdb0d0779');
  Logger.log('✅ Secret set!');
}
