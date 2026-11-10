/************************ 設定（ここだけ確認）***********************/
var TARGET_SPREADSHEET_ID = "1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY";
var TARGET_SHEET_NAME     = "買主リスト";
var LOG_SHEET_NAME        = "GAS_LOG";

var SEQUENCE_SPREADSHEET_ID = "19yAuVYQRm-_zhjYX7M7zjiGbnBibkG77Mpz93sN1xxs";
var SEQUENCE_SHEET_NAME     = "連番";
var SEQUENCE_CELL           = "B2";

var SRC_HEADERS = {
  TIMESTAMP:   "タイムスタンプ",
  PROPERTY_NO: "物件番号（アルファベット2文字から始まる番号です）\n（ATBBの会員間メッセージに記載があります）＊半角記入です",
  COMPANY:     "会社名",
  PERSON:      "担当社名",
  PHONE:       "電話番号",
  EMAIL:       "メールアドレス",
  D1:          "①第一希望日程（水曜定休）",
  T1:          "①開始時刻(10時～17時）",
  D2:          "②第二希望日程（水曜定休）",
  T2:          "②開始時刻（10時～17時）",
  D3:          "③第三希望日程（水曜定休）",
  T3:          "③開始時刻（10時～17時）",
  NOTE:        "ご質問やご要望がございましたらご記入ください。"
};

var DST_HEADERS = {
  BUYER_ID:      "買主番号",
  CREATED_AT:    "作成日時",
  RECEIPT_DATE:  "受付日",
  PROPERTY_NO:   "物件番号",
  CORP:          "法人名",
  NAME_CORP:     "●氏名・会社名",
  PHONE:         "●電話番号（ハイフン不要）",
  EMAIL:         "●メアド",
  HEARING:       "●問合時ヒアリング",
  DELIVERY_TYPE: "配信種別",
  VENDOR_INQ:    "業者問合せ",
  SURVEY_VENDOR: "業者向けアンケート",
  PINRICH:       "Pinrich"
};

/************************ メイン：フォーム送信トリガー***********************/
function onFormSubmit(e) {
  var log = getLogSheet_();
  try {
    if (!e || !e.namedValues) {
      throw new Error("イベントオブジェクトが取得できません（トリガーから実行してください）");
    }
    var nv = e.namedValues;
    Logger.log("=== namedValues の中身 ===");
    Logger.log(JSON.stringify(nv, null, 2));

    var ts         = pick_(nv, SRC_HEADERS.TIMESTAMP);
    var propertyNo = pick_(nv, SRC_HEADERS.PROPERTY_NO);
    var company    = pick_(nv, SRC_HEADERS.COMPANY);
    var person     = pick_(nv, SRC_HEADERS.PERSON);
    var phone      = pick_(nv, SRC_HEADERS.PHONE);

    var email = pick_(nv, SRC_HEADERS.EMAIL);
    if (!email && nv["メールアドレス"] && Array.isArray(nv["メールアドレス"])) {
      email = nv["メールアドレス"].filter(function(v) { return v && v.toString().trim(); })[0] || "";
    }

    var d1   = pick_(nv, SRC_HEADERS.D1);
    var t1   = pick_(nv, SRC_HEADERS.T1);
    var d2   = pick_(nv, SRC_HEADERS.D2);
    var t2   = pick_(nv, SRC_HEADERS.T2);
    var d3   = pick_(nv, SRC_HEADERS.D3);
    var t3   = pick_(nv, SRC_HEADERS.T3);
    var note = pick_(nv, SRC_HEADERS.NOTE);

    Logger.log("物件番号: " + propertyNo);
    Logger.log("電話番号: " + phone);
    Logger.log("メールアドレス: " + email);

    var formattedTs = formatAsJst_(ts) || formatAsJst_(new Date());

    // 重複チェック
    if (isDuplicateEntry_(formattedTs, phone, email)) {
      Logger.log("重複検知: タイムスタンプ=" + formattedTs + " 電話=" + phone + " スキップします");
      if (log) {
        log.appendRow([new Date(), "SKIP_DUPLICATE", "", propertyNo, person, phone, email, "重複検知のためスキップ"]);
      }
      return;
    }

    var hearingText = buildHearingText_(d1, t1, d2, t2, d3, t3, note);

    // 買主ID発番（排他ロック付き）
    var buyerId = generateBuyerId_();
    Logger.log("生成された買主番号: " + buyerId);

    var targetSS    = SpreadsheetApp.openById(TARGET_SPREADSHEET_ID);
    var targetSheet = targetSS.getSheetByName(TARGET_SHEET_NAME);
    if (!targetSheet) {
      throw new Error("転記先シートが見つかりません: " + TARGET_SHEET_NAME);
    }

    var headerMap = getHeaderMap_(targetSheet, 1);
    var lastCol   = targetSheet.getLastColumn();
    var row       = [];
    for (var i = 0; i < lastCol; i++) { row.push(""); }

    setByHeader_(row, headerMap, DST_HEADERS.BUYER_ID,      buyerId);
    setByHeader_(row, headerMap, DST_HEADERS.CREATED_AT,    formattedTs);
    setByHeader_(row, headerMap, DST_HEADERS.PROPERTY_NO,   propertyNo);
    setByHeader_(row, headerMap, DST_HEADERS.CORP,          company);
    setByHeader_(row, headerMap, DST_HEADERS.NAME_CORP,     company ? company + " " + person : person);
    setByHeader_(row, headerMap, DST_HEADERS.PHONE,         "'" + phone);
    setByHeader_(row, headerMap, DST_HEADERS.EMAIL,         email);
    setByHeader_(row, headerMap, DST_HEADERS.HEARING,       hearingText);
    setByHeader_(row, headerMap, DST_HEADERS.RECEIPT_DATE,  formatAsJstDate_(ts));
    setByHeader_(row, headerMap, DST_HEADERS.DELIVERY_TYPE, "不要");
    setByHeader_(row, headerMap, DST_HEADERS.VENDOR_INQ,    "業者問合せ");
    setByHeader_(row, headerMap, DST_HEADERS.SURVEY_VENDOR, "未");
    setByHeader_(row, headerMap, DST_HEADERS.PINRICH,       "登録不要（不可）");

    var surveyResponseCol = headerMap["内覧アンケート回答"] || headerMap[normalizeHeader_("内覧アンケート回答")];
    if (surveyResponseCol !== undefined) {
      row[surveyResponseCol] = "";
    }

    targetSheet.appendRow(row);

    if (log) {
      log.appendRow([new Date(), "OK", buyerId, propertyNo, person, phone, email, "買主番号 " + buyerId + " を生成しました"]);
    }
    Logger.log("買主番号 " + buyerId + " を生成し、買主リストに記録しました");

  } catch (err) {
    if (log) {
      log.appendRow([new Date(), "ERROR", "", "", "", "", "", (err && err.stack) ? err.stack : String(err)]);
    }
    throw err;
  }
}

/************************ 重複チェック***********************/
function isDuplicateEntry_(formattedTs, phone, email) {
  try {
    var targetSS    = SpreadsheetApp.openById(TARGET_SPREADSHEET_ID);
    var targetSheet = targetSS.getSheetByName(TARGET_SHEET_NAME);
    if (!targetSheet) { return false; }

    var data    = targetSheet.getDataRange().getValues();
    var headers = data[0];

    var createdAtIdx = -1;
    var phoneIdx     = -1;
    var emailIdx     = -1;
    for (var c = 0; c < headers.length; c++) {
      var h = headers[c].toString();
      if (h.indexOf("作成日時") !== -1) { createdAtIdx = c; }
      if (normalizeHeader_(h) === normalizeHeader_("●電話番号（ハイフン不要）")) { phoneIdx = c; }
      if (normalizeHeader_(h) === normalizeHeader_("●メアド")) { emailIdx = c; }
    }

    if (createdAtIdx === -1) { return false; }

    var normalizedPhone = (phone || "").replace(/[^0-9]/g, "");
    var normalizedEmail = (email || "").toLowerCase().trim();

    for (var i = 1; i < data.length; i++) {
      var rowTs    = (data[i][createdAtIdx] || "").toString().trim();
      var rowPhone = phoneIdx >= 0 ? (data[i][phoneIdx] || "").toString().replace(/[^0-9]/g, "") : "";
      var rowEmail = emailIdx >= 0 ? (data[i][emailIdx] || "").toString().toLowerCase().trim() : "";

      if (rowTs === formattedTs) {
        if ((normalizedPhone && rowPhone === normalizedPhone) ||
            (normalizedEmail && rowEmail === normalizedEmail)) {
          return true;
        }
      }
    }
    return false;
  } catch (e) {
    Logger.log("重複チェックエラー（スキップして続行）: " + e.message);
    return false;
  }
}

/************************ 買主ID発番（排他ロック付き）***********************/
function generateBuyerId_() {
  Logger.log("[買主番号生成] 開始");

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    throw new Error("買主番号生成のロック取得に失敗しました（タイムアウト）: " + e.message);
  }

  try {
    var sequenceSS    = SpreadsheetApp.openById(SEQUENCE_SPREADSHEET_ID);
    var sequenceSheet = sequenceSS.getSheetByName(SEQUENCE_SHEET_NAME);
    if (!sequenceSheet) {
      throw new Error("シート「" + SEQUENCE_SHEET_NAME + "」が見つかりません");
    }
    var currentValue = sequenceSheet.getRange(SEQUENCE_CELL).getValue();
    Logger.log("[買主番号生成] 現在の連番: " + currentValue);
    if (typeof currentValue !== "number" || isNaN(currentValue)) {
      throw new Error("連番セル（" + SEQUENCE_CELL + "）の値が数値ではありません: " + currentValue);
    }
    var newBuyerNumber = currentValue + 1;
    sequenceSheet.getRange(SEQUENCE_CELL).setValue(newBuyerNumber);
    SpreadsheetApp.flush();
    Logger.log("[買主番号生成] 完了: " + newBuyerNumber);
    return newBuyerNumber;
  } finally {
    lock.releaseLock();
  }
}

/************************ トリガー作成***********************/
function installTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "onFormSubmit") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger("onFormSubmit")
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onFormSubmit()
    .create();
}

/************************ 手動テスト***********************/
function testFromLastRow() {
  var ss      = SpreadsheetApp.getActiveSpreadsheet();
  var sheet   = ss.getSheets()[0];
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var values  = sheet.getRange(lastRow, 1, 1, lastCol).getValues()[0];

  var namedValues = {};
  for (var i = 0; i < headers.length; i++) {
    var key = headers[i].toString();
    var val = String(values[i] !== undefined ? values[i] : "");
    if (namedValues[key]) {
      if (Array.isArray(namedValues[key])) {
        namedValues[key].push(val);
      } else {
        namedValues[key] = [namedValues[key], val];
      }
    } else {
      namedValues[key] = [val];
    }
  }
  onFormSubmit({ namedValues: namedValues });
}

/************************ 買主番号生成テスト***********************/
function testBuyerNumberGeneration() {
  try {
    Logger.log("=== 買主番号生成テスト開始 ===");
    var sequenceSS    = SpreadsheetApp.openById(SEQUENCE_SPREADSHEET_ID);
    var sequenceSheet = sequenceSS.getSheetByName(SEQUENCE_SHEET_NAME);
    var currentValue  = sequenceSheet.getRange(SEQUENCE_CELL).getValue();
    Logger.log("現在の連番値: " + currentValue);
    var buyerNumber = generateBuyerId_();
    Logger.log("生成された買主番号: " + buyerNumber);
    var newValue = sequenceSheet.getRange(SEQUENCE_CELL).getValue();
    Logger.log("更新後の連番値: " + newValue);
    if (newValue === currentValue + 1 && buyerNumber === newValue) {
      Logger.log("テスト成功");
    } else {
      Logger.log("テスト失敗");
    }
  } catch (error) {
    Logger.log("テストエラー: " + error.message);
    Logger.log(error.stack);
  }
}

/************************ 共通関数***********************/
function pick_(namedValues, key) {
  var v = namedValues[key];
  if (!v) { return ""; }
  if (Array.isArray(v)) { return (v[0] !== undefined ? v[0] : "").toString().trim(); }
  return (v !== undefined ? v : "").toString().trim();
}

function formatAsJst_(value) {
  if (!value) { return ""; }
  var tz = "Asia/Tokyo";
  var d;
  if (value instanceof Date) {
    d = value;
  } else {
    var parsed = new Date(value);
    d = isNaN(parsed.getTime()) ? new Date() : parsed;
  }
  return Utilities.formatDate(d, tz, "yyyy/MM/dd HH:mm:ss");
}

function formatAsJstDate_(value) {
  if (!value) { return ""; }
  var tz  = "Asia/Tokyo";
  var d   = (value instanceof Date) ? value : new Date(value);
  var safe = isNaN(d.getTime()) ? new Date() : d;
  return Utilities.formatDate(safe, tz, "yyyy/MM/dd");
}

/************************ ヒアリング文***********************/
function buildHearingText_(d1, t1, d2, t2, d3, t3, note) {
  var lines = [];
  lines.push("［業者より内覧回答自動転記］");
  if (d1 || t1) { lines.push("第一希望：" + formatDateTime_(d1, t1)); }
  if (d2 || t2) { lines.push("第二希望：" + formatDateTime_(d2, t2)); }
  if (d3 || t3) { lines.push("第三希望：" + formatDateTime_(d3, t3)); }
  if (note)     { lines.push("要望・質問：" + note); }
  return lines.join("\n");
}

function formatDateTime_(dateValue, timeValue) {
  var tz = "Asia/Tokyo";
  var dateStr = "";
  if (dateValue) {
    var d = (dateValue instanceof Date) ? dateValue : new Date(dateValue);
    if (!isNaN(d.getTime())) {
      dateStr = Utilities.formatDate(d, tz, "yyyy/MM/dd");
    }
  }
  var timeStr = "";
  if (timeValue) {
    if (timeValue instanceof Date) {
      timeStr = Utilities.formatDate(timeValue, tz, "HH:mm");
    } else {
      timeStr = timeValue.toString().trim();
    }
  }
  if (dateStr && timeStr) { return dateStr + " " + timeStr; }
  if (dateStr) { return dateStr; }
  if (timeStr) { return timeStr; }
  return "";
}

/************************ 列名ゆらぎ吸収***********************/
function normalizeHeader_(s) {
  return (s || "").toString().trim()
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, function(ch) { return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0); })
    .replace(/[\s　]/g, "")
    .replace(/[●・，,．.\-ー―–—\(\)（）［］\[\]【】「」『』"']/g, "")
    .replace(/[：:]/g, "")
    .toLowerCase();
}

function getHeaderMap_(sheet, headerRow) {
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(headerRow, 1, 1, lastCol).getValues()[0];
  var map = {};
  for (var i = 0; i < headers.length; i++) {
    var raw = (headers[i] || "").toString().trim();
    if (!raw) { continue; }
    map[raw] = i;
    map[normalizeHeader_(raw)] = i;
  }
  return map;
}

function setByHeader_(rowArray, headerMap, headerName, value) {
  var rawKey  = (headerName || "").toString().trim();
  var normKey = normalizeHeader_(rawKey);
  var idx = headerMap[rawKey];
  if (idx === undefined) { idx = headerMap[normKey]; }
  if (idx === undefined) {
    throw new Error("転記先に列が見つかりません: 「" + headerName + "」");
  }
  rowArray[idx] = value;
}

/************************ ログシート***********************/
function getLogSheet_() {
  try {
    var ss = SpreadsheetApp.openById(TARGET_SPREADSHEET_ID);
    return ss.getSheetByName(LOG_SHEET_NAME) || ss.insertSheet(LOG_SHEET_NAME);
  } catch (e) {
    return null;
  }
}

/************************ 転記漏れチェック機能***********************/
function checkMissingTransfers() {
  try {
    Logger.log("=== 転記漏れチェック開始 ===");
    var ss          = SpreadsheetApp.getActiveSpreadsheet();
    var formSheet   = ss.getSheets()[0];
    var targetSS    = SpreadsheetApp.openById(TARGET_SPREADSHEET_ID);
    var targetSheet = targetSS.getSheetByName(TARGET_SHEET_NAME);
    var log         = getLogSheet_();

    var formData    = formSheet.getDataRange().getValues();
    var formHeaders = formData[0];

    var propertyNoColIndex = -1;
    var timestampColIndex  = -1;
    var phoneColIndex      = -1;
    var emailColIndex      = -1;
    for (var c = 0; c < formHeaders.length; c++) {
      var fh = formHeaders[c].toString();
      if (fh.indexOf("物件番号") !== -1)    { propertyNoColIndex = c; }
      if (fh.indexOf("タイムスタンプ") !== -1) { timestampColIndex = c; }
      if (fh.indexOf("電話番号") !== -1)    { phoneColIndex = c; }
      if (fh.indexOf("メールアドレス") !== -1) { emailColIndex = c; }
    }
    if (propertyNoColIndex === -1) {
      Logger.log("物件番号の列が見つかりません");
      return;
    }

    var targetData    = targetSheet.getDataRange().getValues();
    var targetHeaders = targetData[0];
    var targetCreatedAtColIndex = -1;
    var targetPhoneColIndex     = -1;
    var targetEmailColIndex     = -1;
    for (var tc = 0; tc < targetHeaders.length; tc++) {
      var th = targetHeaders[tc].toString();
      if (th.indexOf("作成日時") !== -1) { targetCreatedAtColIndex = tc; }
      if (normalizeHeader_(th) === normalizeHeader_("●電話番号（ハイフン不要）")) { targetPhoneColIndex = tc; }
      if (normalizeHeader_(th) === normalizeHeader_("●メアド")) { targetEmailColIndex = tc; }
    }

    // 転記済みキーを「タイムスタンプ_電話番号」または「タイムスタンプ_メール」で登録
    var transferredKeys = {};
    for (var ti = 1; ti < targetData.length; ti++) {
      var tTs    = targetCreatedAtColIndex >= 0 ? (targetData[ti][targetCreatedAtColIndex] || "").toString().trim() : "";
      var tPhone = targetPhoneColIndex >= 0     ? (targetData[ti][targetPhoneColIndex] || "").toString().replace(/[^0-9]/g, "") : "";
      var tEmail = targetEmailColIndex >= 0     ? (targetData[ti][targetEmailColIndex] || "").toString().toLowerCase().trim() : "";
      if (tTs) {
        if (tPhone) { transferredKeys[tTs + "_" + tPhone] = true; }
        if (tEmail) { transferredKeys[tTs + "_" + tEmail] = true; }
      }
    }

    Logger.log("転記済みキー数: " + Object.keys(transferredKeys).length);

    var missingRows = [];
    for (var fi = 1; fi < formData.length; fi++) {
      var pNo = formData[fi][propertyNoColIndex];
      if (!pNo) { continue; }
      var rawTs      = timestampColIndex >= 0 ? formData[fi][timestampColIndex] : "";
      var formPhone  = phoneColIndex >= 0     ? (formData[fi][phoneColIndex] || "").toString().replace(/[^0-9]/g, "") : "";
      var formEmail  = emailColIndex >= 0     ? (formData[fi][emailColIndex] || "").toString().toLowerCase().trim() : "";
      var fmtTs      = formatAsJst_(rawTs);

      var keyPhone       = fmtTs + "_" + formPhone;
      var keyEmail       = fmtTs + "_" + formEmail;
      var isTransferred  = transferredKeys[keyPhone] || transferredKeys[keyEmail];

      Logger.log("行" + (fi + 1) + " タイムスタンプ: " + fmtTs + " 転記済み: " + (isTransferred ? "YES" : "NO"));
      if (!isTransferred) {
        missingRows.push({ rowIndex: fi, propertyNo: pNo.toString().trim(), timestamp: rawTs });
      }
    }

    if (missingRows.length > 0) {
      Logger.log("転記漏れを" + missingRows.length + "件発見しました");
      var successCount = 0;
      var failCount    = 0;
      for (var mi = 0; mi < missingRows.length; mi++) {
        var missing = missingRows[mi];
        try {
          var namedValues = {};
          for (var hi = 0; hi < formHeaders.length; hi++) {
            namedValues[formHeaders[hi].toString()] = [formData[missing.rowIndex][hi]];
          }
          onFormSubmit({ namedValues: namedValues });
          successCount++;
          if (log) {
            log.appendRow([new Date(), "AUTO_REPAIR", "", missing.propertyNo, "", "", "",
              "転記漏れを自動修復しました（行" + (missing.rowIndex + 1) + "）"]);
          }
        } catch (repairErr) {
          failCount++;
          if (log) {
            log.appendRow([new Date(), "AUTO_REPAIR_FAILED", "", missing.propertyNo, "", "", "",
              "転記漏れの自動修復に失敗: " + repairErr.message]);
          }
        }
      }
      sendNotificationEmail(missingRows, successCount, failCount);
      Logger.log("転記漏れチェック完了: 成功" + successCount + "件、失敗" + failCount + "件");
    } else {
      Logger.log("転記漏れはありませんでした");
    }
    Logger.log("=== 転記漏れチェック終了 ===");
  } catch (error) {
    Logger.log("転記漏れチェックエラー: " + error.message);
    Logger.log(error.stack);
  }
}

function sendNotificationEmail(missingRows, successCount, failCount) {
  try {
    var adminEmail = Session.getActiveUser().getEmail();
    var subject, body;
    if (failCount > 0) {
      subject = "【重要】フォーム転記漏れの自動修復に失敗しました（" + failCount + "件）";
      body    = "フォーム回答の転記漏れを検知し、自動修復を試みましたが、一部失敗しました。\n\n修復成功: " + successCount + "件\n修復失敗: " + failCount + "件\n\n以下の物件番号を手動で確認してください:\n\n";
    } else {
      subject = "【通知】フォーム転記漏れを自動修復しました（" + successCount + "件）";
      body    = "フォーム回答の転記漏れを検知し、自動修復しました。\n\n修復件数: " + successCount + "件\n\n修復した物件番号:\n\n";
    }
    for (var i = 0; i < missingRows.length; i++) {
      body += "- 物件番号: " + missingRows[i].propertyNo + "\n  送信日時: " + missingRows[i].timestamp + "\n\n";
    }
    body += "\n---\nこのメールは自動送信されています。\n詳細はGAS_LOGシートを確認してください。";
    MailApp.sendEmail({ to: adminEmail, subject: subject, body: body });
    Logger.log("通知メールを送信しました: " + adminEmail);
  } catch (error) {
    Logger.log("通知メール送信エラー: " + error.message);
  }
}

function installCheckTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "checkMissingTransfers") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger("checkMissingTransfers")
    .timeBased()
    .everyHours(1)
    .create();
  Logger.log("転記漏れチェックトリガーをインストールしました（1時間ごと）");
}

function testCheckMissingTransfers() {
  checkMissingTransfers();
}
