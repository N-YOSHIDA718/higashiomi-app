// ============================================================
// 工場管理システム - Google Apps Script APIサーバー
// このファイルをGoogle Apps Scriptにコピーしてデプロイしてください
// ============================================================

const SHEET_ID = 'YOUR_SPREADSHEET_ID'; // ← スプレッドシートIDに書き換えてください
const API_KEY  = 'YOUR_SECRET_KEY';      // ← 任意の秘密キーに変えてください

// シート名定数
const S = {
  DRAWINGS:  '図番マスタ',
  MATERIALS: '材料在庫',
  STOCK_LOG: '入出庫履歴',
  PROCESS:   '工程進捗',
  MISTAKES:  'ミス記録',
};

// ============================================================
// HTTPエントリポイント
// ============================================================
function doGet(e)  { return handleRequest(e, 'GET'); }
function doPost(e) { return handleRequest(e, 'POST'); }

function handleRequest(e, method) {
  try {
    // 認証チェック
    const key = (e.parameter && e.parameter.key) ||
                (e.postData && JSON.parse(e.postData.contents || '{}').key);
    if (key !== API_KEY) return json({ error: 'Unauthorized' }, 401);

    const action = e.parameter.action || 
                   (e.postData && JSON.parse(e.postData.contents || '{}').action);
    const body   = e.postData ? JSON.parse(e.postData.contents || '{}') : {};

    switch (action) {
      // ---- 図番マスタ ----
      case 'getDrawings':       return json(getDrawings());
      case 'saveDrawing':       return json(saveDrawing(body));
      case 'updateDrawing':     return json(updateDrawing(body));

      // ---- 材料在庫 ----
      case 'getMaterials':      return json(getMaterials());
      case 'stockIn':           return json(stockIn(body));
      case 'stockOut':          return json(stockOut(body));
      case 'stockScrap':        return json(stockScrap(body));
      case 'getStockLog':       return json(getStockLog(body));

      // ---- 工程進捗 ----
      case 'getProcesses':      return json(getProcesses(body));
      case 'updateProcess':     return json(updateProcess(body));

      // ---- ミス記録 ----
      case 'getMistakes':       return json(getMistakes(body));
      case 'saveMistake':       return json(saveMistake(body));

      // ---- QRコード生成 ----
      case 'generateQR':        return json(generateQR(body));

      default: return json({ error: 'Unknown action: ' + action }, 400);
    }
  } catch (err) {
    return json({ error: err.message, stack: err.stack }, 500);
  }
}

function json(data, code) {
  const out = ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return out;
}

// ============================================================
// スプレッドシートユーティリティ
// ============================================================
function getSheet(name) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  return sh;
}

function ensureHeaders(sh, headers) {
  if (sh.getLastRow() === 0) {
    sh.appendRow(headers);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
}

function sheetToObjects(sh) {
  if (sh.getLastRow() < 2) return [];
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  return rows
    .filter(r => r[0] !== '')
    .map(r => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = r[i]; });
      return obj;
    });
}

// ============================================================
// 図番マスタ
// ============================================================
// 列: 図番 | 品名 | 数量 | 材料種別 | 材料費 | レーザー費 | 曲げ費 | 溶接費 |
//          | タップ費 | 切断費 | その他加工費 | 検査費 | 事務費 | 原価合計 | 販売単価 |
//          | 粗利率 | 案件番号 | 納期 | 備考 | 更新日時

const DRAWING_HEADERS = [
  '図番','品名','数量','材料種別',
  '材料費','レーザー費','曲げ費','溶接費','タップ費','切断費','その他加工費','検査費','事務費',
  '原価合計','販売単価','粗利率','案件番号','納期','備考','更新日時'
];

function getDrawings() {
  const sh = getSheet(S.DRAWINGS);
  ensureHeaders(sh, DRAWING_HEADERS);
  return sheetToObjects(sh);
}

function saveDrawing(data) {
  const sh = getSheet(S.DRAWINGS);
  ensureHeaders(sh, DRAWING_HEADERS);
  
  const now = new Date().toISOString();
  const matCost = Number(data.材料費 || 0);
  const procCosts = ['レーザー費','曲げ費','溶接費','タップ費','切断費','その他加工費','検査費','事務費']
    .map(k => Number(data[k] || 0));
  const total = matCost + procCosts.reduce((a,b) => a+b, 0);
  const price = Number(data.販売単価 || 0);
  const margin = price > 0 ? Math.round((price - total) / price * 100) : 0;

  sh.appendRow([
    data.図番, data.品名, data.数量, data.材料種別,
    matCost, ...procCosts,
    total, price, margin,
    data.案件番号, data.納期, data.備考, now
  ]);
  
  // QRコード自動生成
  generateQR({ id: data.図番, type: 'drawing' });
  
  return { success: true, 図番: data.図番, 原価合計: total, 粗利率: margin };
}

function updateDrawing(data) {
  const sh = getSheet(S.DRAWINGS);
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.図番) {
      const now = new Date().toISOString();
      const matCost = Number(data.材料費 || 0);
      const procCosts = ['レーザー費','曲げ費','溶接費','タップ費','切断費','その他加工費','検査費','事務費']
        .map(k => Number(data[k] || 0));
      const total = matCost + procCosts.reduce((a,b) => a+b, 0);
      const price = Number(data.販売単価 || 0);
      const margin = price > 0 ? Math.round((price - total) / price * 100) : 0;
      
      sh.getRange(i+1, 1, 1, DRAWING_HEADERS.length).setValues([[
        data.図番, data.品名, data.数量, data.材料種別,
        matCost, ...procCosts,
        total, price, margin,
        data.案件番号, data.納期, data.備考, now
      ]]);
      return { success: true };
    }
  }
  return { error: '図番が見つかりません: ' + data.図番 };
}

// ============================================================
// 材料在庫
// ============================================================
// 列: 材料ID | 材料名 | 規格 | 単位 | 現在庫 | 単価 | 最小在庫 | 保管場所 | QRコード | 更新日時

const MATERIAL_HEADERS = [
  '材料ID','材料名','規格','単位','現在庫','単価','最小在庫','保管場所','QRコード','更新日時'
];

function getMaterials() {
  const sh = getSheet(S.MATERIALS);
  ensureHeaders(sh, MATERIAL_HEADERS);
  return sheetToObjects(sh);
}

function stockIn(data) {
  const sh = getSheet(S.MATERIALS);
  ensureHeaders(sh, MATERIAL_HEADERS);
  const rows = sh.getDataRange().getValues();
  const now = new Date().toISOString();
  const qty = Number(data.数量);
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.材料ID) {
      const newQty = Number(rows[i][4]) + qty;
      sh.getRange(i+1, 5).setValue(newQty);
      sh.getRange(i+1, 10).setValue(now);
      logStock({ ...data, 区分: '入庫', 前在庫: rows[i][4], 後在庫: newQty });
      return { success: true, 材料ID: data.材料ID, 現在庫: newQty };
    }
  }
  // 新規材料
  const qrUrl = generateQRUrl('mat_' + data.材料ID);
  sh.appendRow([
    data.材料ID, data.材料名, data.規格, data.単位,
    qty, data.単価 || 0, data.最小在庫 || 0, data.保管場所 || '', qrUrl, now
  ]);
  logStock({ ...data, 区分: '入庫(新規)', 前在庫: 0, 後在庫: qty });
  return { success: true, 材料ID: data.材料ID, 現在庫: qty };
}

function stockOut(data) {
  const sh = getSheet(S.MATERIALS);
  const rows = sh.getDataRange().getValues();
  const now = new Date().toISOString();
  const qty = Number(data.数量);
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.材料ID) {
      const current = Number(rows[i][4]);
      if (current < qty) return { error: '在庫不足: 現在庫=' + current };
      const newQty = current - qty;
      sh.getRange(i+1, 5).setValue(newQty);
      sh.getRange(i+1, 10).setValue(now);
      logStock({ ...data, 区分: '出庫', 前在庫: current, 後在庫: newQty });
      return { success: true, 材料ID: data.材料ID, 現在庫: newQty };
    }
  }
  return { error: '材料IDが見つかりません: ' + data.材料ID };
}

function stockScrap(data) {
  // 端材入庫（既存材料の端材を別IDで登録）
  const scrapId = data.材料ID + '_SCRAP_' + new Date().getTime();
  return stockIn({ ...data, 材料ID: scrapId, 材料名: data.材料名 + '（端材）' });
}

function logStock(data) {
  const sh = getSheet(S.STOCK_LOG);
  ensureHeaders(sh, ['日時','材料ID','材料名','区分','数量','単位','前在庫','後在庫','図番','担当者','備考']);
  sh.appendRow([
    new Date().toISOString(), data.材料ID, data.材料名, data.区分,
    data.数量, data.単位 || '', data.前在庫, data.後在庫,
    data.図番 || '', data.担当者 || '', data.備考 || ''
  ]);
}

function getStockLog(data) {
  const sh = getSheet(S.STOCK_LOG);
  ensureHeaders(sh, ['日時','材料ID','材料名','区分','数量','単位','前在庫','後在庫','図番','担当者','備考']);
  const all = sheetToObjects(sh);
  if (data.材料ID) return all.filter(r => r['材料ID'] === data.材料ID);
  if (data.図番)   return all.filter(r => r['図番'] === data.図番);
  return all.slice(-200); // 最新200件
}

// ============================================================
// 工程進捗
// ============================================================
// 列: 図番 | 案件番号 | 工程 | 担当者 | 予定開始 | 予定終了 | 実績開始 | 実績終了 |
//          | ステータス | 備考 | QRコード | 更新日時

const PROCESS_HEADERS = [
  '図番','案件番号','工程','担当者','予定開始','予定終了','実績開始','実績終了',
  'ステータス','備考','QRコード','更新日時'
];
const PROCESS_TYPES = ['レーザー','曲げ','溶接','タップ','切断','検査'];

function getProcesses(data) {
  const sh = getSheet(S.PROCESS);
  ensureHeaders(sh, PROCESS_HEADERS);
  const all = sheetToObjects(sh);
  if (data && data.図番) return all.filter(r => r['図番'] === data.図番);
  if (data && data.案件番号) return all.filter(r => r['案件番号'] === data.案件番号);
  return all;
}

function updateProcess(data) {
  const sh = getSheet(S.PROCESS);
  ensureHeaders(sh, PROCESS_HEADERS);
  const rows = sh.getDataRange().getValues();
  const now = new Date().toISOString();
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.図番 && rows[i][2] === data.工程) {
      const cols = { 担当者:4, 予定開始:5, 予定終了:6, 実績開始:7, 実績終了:8, ステータス:9, 備考:10 };
      Object.keys(cols).forEach(k => {
        if (data[k] !== undefined) sh.getRange(i+1, cols[k]).setValue(data[k]);
      });
      sh.getRange(i+1, 12).setValue(now);
      return { success: true };
    }
  }
  // 新規
  const qrUrl = generateQRUrl('proc_' + data.図番 + '_' + data.工程);
  sh.appendRow([
    data.図番, data.案件番号, data.工程, data.担当者 || '',
    data.予定開始 || '', data.予定終了 || '',
    data.実績開始 || '', data.実績終了 || '',
    data.ステータス || '未着手', data.備考 || '', qrUrl, now
  ]);
  return { success: true };
}

// ============================================================
// ミス記録
// ============================================================
// 列: 日時 | 図番 | 案件番号 | 工程 | ミス種別 | 数量 | 損失金額 | 原因 | 対策 | 担当者

function getMistakes(data) {
  const sh = getSheet(S.MISTAKES);
  ensureHeaders(sh, ['日時','図番','案件番号','工程','ミス種別','数量','損失金額','原因','対策','担当者']);
  const all = sheetToObjects(sh);
  if (data && data.図番) return all.filter(r => r['図番'] === data.図番);
  return all;
}

function saveMistake(data) {
  const sh = getSheet(S.MISTAKES);
  ensureHeaders(sh, ['日時','図番','案件番号','工程','ミス種別','数量','損失金額','原因','対策','担当者']);
  sh.appendRow([
    new Date().toISOString(),
    data.図番, data.案件番号, data.工程,
    data.ミス種別, data.数量, data.損失金額,
    data.原因, data.対策, data.担当者
  ]);
  return { success: true };
}

// ============================================================
// QRコード生成（Google Charts API）
// ============================================================
function generateQRUrl(id) {
  const data = encodeURIComponent(JSON.stringify({ id, t: Date.now() }));
  return 'https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=' + data;
}

function generateQR(data) {
  const url = generateQRUrl(data.id);
  return { url, id: data.id };
}

// ============================================================
// 初期セットアップ（初回のみ実行）
// ============================================================
function setupSheets() {
  [S.DRAWINGS, S.MATERIALS, S.STOCK_LOG, S.PROCESS, S.MISTAKES].forEach(name => {
    getSheet(name);
  });
  SpreadsheetApp.flush();
  Logger.log('シートの初期化完了');
}
