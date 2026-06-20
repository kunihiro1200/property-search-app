/**
 * 概算書PDF生成サービス
 * スプレッドシート不依存で直接PDFを生成する
 */
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import * as fs from 'fs';
import * as path from 'path';

// ===== 計算ロジック =====

/** 印紙代計算（物件価格基準） */
function calcInshidai(price: number): number {
  if (price <= 1000000) return 500;
  if (price <= 5000000) return 1000;
  if (price <= 10000000) return 5000;
  if (price <= 50000000) return 10000;
  return 30000;
}

/** 所有権移転・抵当権設定費用（物件価格基準） */
function calcShoyuken(price: number): number {
  return price >= 25000000 ? 300000 : 200000;
}

/** 仲介手数料（物件価格基準） */
function calcChukai(price: number): number {
  if (price <= 8000000) return 330000;
  return Math.round((price * 0.03 + 60000) * 1.1);
}

/** 火災保険料（種別基準） */
function calcKasai(propertyType: string): number {
  return propertyType === 'マンション' ? 200000 : 300000;
}

/** 月額返済額計算（元利均等） */
function calcMonthlyPayment(loanAmount: number, annualRate: number, years: number): number {
  if (loanAmount <= 0) return 0;
  const monthlyRate = annualRate / 100 / 12;
  const months = years * 12;
  if (monthlyRate === 0) return Math.round(loanAmount / months);
  const payment = loanAmount * monthlyRate * Math.pow(1 + monthlyRate, months)
    / (Math.pow(1 + monthlyRate, months) - 1);
  return Math.round(payment);
}

/** 数値を円表記にフォーマット */
function formatYen(n: number): string {
  return n.toLocaleString('ja-JP');
}

/** FI物件かどうか判定 */
function isFI(propertyNumber: string): boolean {
  return propertyNumber.toUpperCase().startsWith('FI');
}

// ===== フォント読み込み =====
function loadFont(filename: string): Buffer {
  // Vercel環境対応: __dirnameからの相対パス
  const candidates = [
    path.join(__dirname, '..', 'assets', 'fonts', filename),
    path.join(process.cwd(), 'backend', 'api', 'src', 'assets', 'fonts', filename),
    path.join('/var/task', 'backend', 'api', 'src', 'assets', 'fonts', filename),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return fs.readFileSync(p);
    }
  }
  throw new Error(`Font file not found: ${filename}`);
}

// ===== メインの生成関数 =====

export interface EstimateData {
  propertyNumber: string;
  propertyName: string;   // 物件名（G列 or F列）
  propertyType: string;   // 種別（C列）
  price: number;          // 物件価格（BS列）
}

export async function generateEstimatePdfBuffer(data: EstimateData): Promise<Buffer> {
  const { propertyNumber, propertyName, propertyType, price } = data;
  const isFiProperty = isFI(propertyNumber);

  // --- 諸経費計算 ---
  const inshidai = calcInshidai(price);
  const shoyuken = calcShoyuken(price);
  const chukai = calcChukai(price);
  const kasai = calcKasai(propertyType);
  const ginkoInshi = 22000;
  const ginkoJimu = 220000;
  const shokeihi = inshidai + shoyuken + chukai + kasai + ginkoInshi + ginkoJimu;
  const total = price + shokeihi;

  // --- ローン計算 ---
  const loanYears = 35;
  const rate1 = 0.95; // 変動
  const rate2 = 1.30; // フラット35
  const monthly1 = calcMonthlyPayment(total, rate1, loanYears);
  const monthly2 = calcMonthlyPayment(total, rate2, loanYears);
  const bank1 = isFiProperty ? '福岡銀行' : '大分銀行';
  const bonus = 50000;

  // --- 署名欄 ---
  const signature = isFiProperty
    ? '㈱くじら不動産　福岡市中央区舞鶴3－1－10　TEL：092－401－5331　MAIL: tenant@ifoo-oita.com'
    : '㈱いふう　大分市舞鶴町1-3-30　TEL:097-533-2022　MAIL: tenant@ifoo-oita.com';

  // --- 作成日 ---
  const today = new Date();
  const dateStr = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;

  // ===== PDF生成 =====
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  // フォント読み込み
  const regularFontBytes = loadFont('NotoSansJP-Regular.otf');
  const boldFontBytes = loadFont('NotoSansJP-Bold.otf');
  const fontRegular = await pdfDoc.embedFont(regularFontBytes);
  const fontBold = await pdfDoc.embedFont(boldFontBytes);

  // A4ページ
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  // カラー定義
  const black = rgb(0, 0, 0);
  const white = rgb(1, 1, 1);
  const darkGray = rgb(0.2, 0.2, 0.2);
  const lightGray = rgb(0.85, 0.85, 0.85);
  const headerBg = rgb(0.15, 0.15, 0.15);
  const sectionBg = rgb(0.92, 0.92, 0.92);

  const margin = 40;
  const tableWidth = width - margin * 2;

  let y = height - 30;

  // ===== ヘルパー関数 =====
  const drawText = (text: string, x: number, yPos: number, size: number, font = fontRegular, color = black) => {
    page.drawText(text, { x, y: yPos, size, font, color });
  };

  const drawRect = (x: number, yPos: number, w: number, h: number, fillColor = white, borderColor = black, borderWidth = 0.5) => {
    page.drawRectangle({ x, y: yPos, width: w, height: h, color: fillColor, borderColor, borderWidth });
  };

  const drawLine = (x1: number, y1: number, x2: number, y2: number, thickness = 0.5) => {
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color: black });
  };

  // ===== レイアウト =====

  // --- 物件番号（左上） ---
  drawText('物件番号', margin, y, 9, fontRegular);
  drawText(propertyNumber, margin + 50, y, 9, fontRegular);
  y -= 8;
  drawLine(margin, y, margin + 200, y);
  y -= 5;

  // --- タイトル ---
  const titleText = '資金計画書《概算》';
  const titleSize = 18;
  const titleWidth = fontBold.widthOfTextAtSize(titleText, titleSize);
  drawRect(margin, y - 28, tableWidth, 32, headerBg, headerBg, 0);
  drawText(titleText, (width - titleWidth) / 2, y - 22, titleSize, fontBold, white);
  y -= 38;

  // --- 作成日 ---
  drawText(`作成日：`, width - 180, y, 9, fontRegular);
  drawText(dateStr, width - 130, y, 9, fontRegular);
  y -= 16;

  // --- 物件名・種別 ---
  drawRect(margin, y - 24, tableWidth * 0.6, 28, white, black, 0.5);
  drawRect(margin + tableWidth * 0.6, y - 24, tableWidth * 0.4, 28, white, black, 0.5);
  drawText('物件名：', margin + 6, y - 16, 11, fontBold);
  drawText(propertyName.substring(0, 20), margin + 55, y - 16, 10, fontRegular);
  drawText('種別：', margin + tableWidth * 0.6 + 6, y - 16, 11, fontBold);
  drawText(propertyType, margin + tableWidth * 0.6 + 45, y - 16, 10, fontRegular);
  y -= 34;

  // --- 購入費用セクション ---
  drawRect(margin, y - 20, tableWidth, 24, sectionBg, black, 0.5);
  const koTitle = '購入費用（概算）';
  const koTitleW = fontBold.widthOfTextAtSize(koTitle, 12);
  drawText(koTitle, (width - koTitleW) / 2, y - 14, 12, fontBold);
  y -= 26;

  // 物件価格・諸経費・総額の行
  const col1W = tableWidth * 0.4;
  const col2W = tableWidth * 0.45;
  const col3W = tableWidth * 0.15;
  const rowH = 24;

  const rows3 = [
    { label: '物件価格', value: price > 0 ? formatYen(price) : '', unit: '円' },
    { label: '諸経費', value: formatYen(shokeihi), unit: '円' },
    { label: '総額', value: formatYen(total), unit: '円' },
  ];

  for (const row of rows3) {
    drawRect(margin, y - rowH, col1W, rowH, white, black, 0.5);
    drawRect(margin + col1W, y - rowH, col2W, rowH, white, black, 0.5);
    drawRect(margin + col1W + col2W, y - rowH, col3W, rowH, white, black, 0.5);
    const labelW = fontBold.widthOfTextAtSize(row.label, 12);
    drawText(row.label, margin + (col1W - labelW) / 2, y - 16, 12, fontBold);
    const valW = fontRegular.widthOfTextAtSize(row.value, 11);
    drawText(row.value, margin + col1W + col2W - valW - 8, y - 16, 11, fontRegular);
    drawText(row.unit, margin + col1W + col2W + 4, y - 16, 10, fontRegular);
    y -= rowH;
  }

  y -= 10;

  // --- 住宅ローンテーブル（共通描画関数） ---
  const drawLoanTable = (label: string, bank: string, rate: number, monthly: number) => {
    // セクションヘッダー
    drawRect(margin, y - 18, tableWidth, 20, sectionBg, black, 0.5);
    drawText('【住宅ローン】', margin + 6, y - 13, 9, fontBold);
    drawText(label, margin + 80, y - 13, 9, fontBold);
    y -= 22;

    // 列定義
    const lCols = [
      { label: '借入先', w: tableWidth * 0.2 },
      { label: '借入期間（年）', w: tableWidth * 0.18 },
      { label: '借入金額', w: tableWidth * 0.22 },
      { label: '金利', w: tableWidth * 0.15 },
      { label: '月額返済額', w: tableWidth * 0.15 },
      { label: 'ボーナス返済\n（2回）', w: tableWidth * 0.1 },
    ];

    // ヘッダー行
    let cx = margin;
    for (const col of lCols) {
      drawRect(cx, y - 24, col.w, 26, sectionBg, black, 0.5);
      const lines = col.label.split('\n');
      if (lines.length === 2) {
        const w1 = fontRegular.widthOfTextAtSize(lines[0], 7.5);
        const w2 = fontRegular.widthOfTextAtSize(lines[1], 7.5);
        drawText(lines[0], cx + (col.w - w1) / 2, y - 12, 7.5, fontRegular);
        drawText(lines[1], cx + (col.w - w2) / 2, y - 20, 7.5, fontRegular);
      } else {
        const w1 = fontRegular.widthOfTextAtSize(col.label, 7.5);
        drawText(col.label, cx + (col.w - w1) / 2, y - 16, 7.5, fontRegular);
      }
      cx += col.w;
    }
    y -= 28;

    // データ行
    cx = margin;
    const dataRow = [
      bank,
      String(loanYears),
      formatYen(total),
      `${rate}%`,
      formatYen(monthly),
      formatYen(bonus),
    ];
    for (let i = 0; i < lCols.length; i++) {
      drawRect(cx, y - 22, lCols[i].w, 24, white, black, 0.5);
      const tw = fontRegular.widthOfTextAtSize(dataRow[i], 9);
      drawText(dataRow[i], cx + (lCols[i].w - tw) / 2, y - 15, 9, fontRegular);
      cx += lCols[i].w;
    }
    y -= 26;
  };

  drawLoanTable('★変動金利', bank1, rate1, monthly1);
  y -= 6;
  drawLoanTable('★フラット35（固定金利）', 'ARUHI', rate2, monthly2);
  y -= 10;

  // --- 諸経費内訳テーブル ---
  const detailCols = [
    { label: '内訳', w: tableWidth * 0.42 },
    { label: '金額（概算）', w: tableWidth * 0.23 },
    { label: '備考', w: tableWidth * 0.35 },
  ];

  // ヘッダー
  let dx = margin;
  for (const col of detailCols) {
    drawRect(dx, y - 20, col.w, 22, sectionBg, black, 0.5);
    const tw = fontBold.widthOfTextAtSize(col.label, 9);
    drawText(col.label, dx + (col.w - tw) / 2, y - 14, 9, fontBold);
    dx += col.w;
  }
  y -= 22;

  // 内訳行
  const detailRows = [
    { name: '印紙代（売買契約書貼付）', value: formatYen(inshidai), note: '' },
    { name: '所有権移転、抵当権設定費用等', value: formatYen(shoyuken), note: '評価額によって異なります' },
    { name: '仲介手数料', value: formatYen(chukai), note: '●801万円以上(3%+6万×消費税）\n●800万円以下(33万円)' },
    { name: '固定資産税・都市計画税の清算金', value: '実費', note: '引渡日で按分します' },
    { name: '火災保険料・地震保険料', value: formatYen(kasai), note: 'プランによって異なります' },
    { name: '銀行金消契約印紙代', value: formatYen(ginkoInshi), note: '住宅ローンの契約書に貼る\n印紙です' },
    { name: '銀行融資事務手数料', value: formatYen(ginkoJimu), note: '各銀行により異なります' },
  ];

  for (const row of detailRows) {
    const noteLines = row.note.split('\n');
    const rowHeight = noteLines.length > 1 ? 30 : 22;

    dx = margin;
    drawRect(dx, y - rowHeight, detailCols[0].w, rowHeight, white, black, 0.5);
    drawText(row.name, dx + 5, y - 14, 8.5, fontRegular);
    dx += detailCols[0].w;

    drawRect(dx, y - rowHeight, detailCols[1].w, rowHeight, white, black, 0.5);
    const vw = fontRegular.widthOfTextAtSize(row.value, 9);
    drawText(row.value, dx + detailCols[1].w - vw - 6, y - 14, 9, fontRegular);
    dx += detailCols[1].w;

    drawRect(dx, y - rowHeight, detailCols[2].w, rowHeight, white, black, 0.5);
    if (noteLines.length > 1) {
      drawText(noteLines[0], dx + 4, y - 10, 7, fontRegular);
      drawText(noteLines[1], dx + 4, y - 19, 7, fontRegular);
    } else {
      drawText(row.note, dx + 4, y - 14, 7.5, fontRegular);
    }
    y -= rowHeight;
  }

  // 諸経費合計行
  dx = margin;
  drawRect(dx, y - 22, detailCols[0].w, 24, sectionBg, black, 0.5);
  drawText('諸経費合計（概算）', dx + 5, y - 15, 9, fontBold);
  dx += detailCols[0].w;

  drawRect(dx, y - 22, detailCols[1].w, 24, sectionBg, black, 0.5);
  const totalVw = fontBold.widthOfTextAtSize(formatYen(shokeihi), 9);
  drawText(formatYen(shokeihi), dx + detailCols[1].w - totalVw - 6, y - 15, 9, fontBold);
  dx += detailCols[1].w;

  drawRect(dx, y - 22, detailCols[2].w, 24, sectionBg, black, 0.5);
  drawText('*物件価格以外にかかる\n費用です', dx + 4, y - 10, 7, fontRegular);
  drawText('費用です', dx + 4, y - 19, 7, fontRegular);
  y -= 26;

  y -= 8;

  // --- 署名欄 ---
  drawRect(margin, y - 20, tableWidth, 22, lightGray, black, 0.5);
  drawText(signature, margin + 6, y - 14, 8, fontRegular);

  // ===== PDF出力 =====
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
