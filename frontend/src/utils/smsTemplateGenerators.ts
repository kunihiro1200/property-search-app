import { Seller, PropertyInfo, Employee } from '../types';
import { getEmployeeName } from './employeeUtils';

/**
 * 1. 初回不通時キャンセル案内
 * サイト別に異なるキャンセル案内を生成
 */
export const generateInitialCancellationGuidance = (
  seller: Seller,
  property: PropertyInfo | null
): string => {
  const site = seller.site || seller.inquirySite || '';
  const name = seller.name || '';
  const propertyAddress = property?.address || seller.address || '';
  
  if (site === 'ウ') {
    // イエウール専用
    return `${name}様[改行][改行]この度はイエウールより${propertyAddress}の査定依頼をいただきましてありがとうございます。[改行][改行]お電話させていただきましたが、ご不在のようでしたのでメッセージを送らせていただきました。[改行][改行]もし、査定のご依頼をキャンセルされる場合は、イエウールのサポートセンターまでご連絡をお願いいたします。[改行][改行]【イエウールサポートセンター】[改行]TEL: 05054971590[改行]Mail: ieul-support@speee.jp[改行][改行]またご連絡させていただきます。[改行][改行]㈱いふう[改行]大分市舞鶴町1-3-30 STビル１F[改行]TEL: 097-533-2022`;
  } else if (site === 'L' || site === 'Y') {
    // ライフルホームズ、Yahoo
    return `${name}様[改行][改行]この度は${propertyAddress}の査定依頼をいただきましてありがとうございます。[改行][改行]お電話させていただきましたが、ご不在のようでしたのでメッセージを送らせていただきました。[改行][改行]もし、査定のご依頼をキャンセルされる場合は、このメッセージに返信する形でお知らせください。[改行][改行]またご連絡させていただきます。[改行][改行]㈱いふう[改行]大分市舞鶴町1-3-30 STビル１F[改行]TEL: 097-533-2022`;
  } else if (site === 'す') {
    // すまいステップ
    return `${name}様[改行][改行]この度は${propertyAddress}の査定依頼をいただきましてありがとうございます。[改行][改行]お電話させていただきましたが、ご不在のようでしたのでメッセージを送らせていただきました。[改行][改行]もし、査定のご依頼をキャンセルされる場合は、下記のGoogleフォームよりお手続きください。[改行]https://forms.gle/iu3rLdPJ784WJxJW7[改行][改行]またご連絡させていただきます。[改行][改行]㈱いふう[改行]大分市舞鶴町1-3-30 STビル１F[改行]TEL: 097-533-2022`;
  } else if (site === 'H') {
    // HOME4U
    return `${name}様[改行][改行]この度は${propertyAddress}の査定依頼をいただきましてありがとうございます。[改行][改行]お電話させていただきましたが、ご不在のようでしたのでメッセージを送らせていただきました。[改行][改行]またご連絡させていただきます。[改行][改行]㈱いふう[改行]大分市舞鶴町1-3-30 STビル１F[改行]TEL: 097-533-2022`;
  } else {
    // その他のサイト（基本メッセージ）
    return `${name}様[改行][改行]この度は${propertyAddress}の査定依頼をいただきましてありがとうございます。[改行][改行]お電話させていただきましたが、ご不在のようでしたのでメッセージを送らせていただきました。[改行][改行]またご連絡させていただきます。[改行][改行]㈱いふう[改行]大分市舞鶴町1-3-30 STビル１F[改行]TEL: 097-533-2022`;
  }
};

/**
 * 2. キャンセル案内
 * サイト別のキャンセル手続き案内を生成
 */
export const generateCancellationGuidance = (
  seller: Seller,
  property: PropertyInfo | null
): string => {
  const site = seller.site || seller.inquirySite || '';
  const name = seller.name || '';
  const propertyAddress = property?.address || seller.address || '';
  
  if (site === 'ウ') {
    // イエウール
    return `${name}様[改行][改行]お世話になっております。大分市舞鶴町にございます不動産会社のいふうです。[改行][改行]${propertyAddress}の査定依頼についてご連絡させていただきました。[改行][改行]もし査定のご依頼をキャンセルされる場合は、イエウールのサポートセンターへメールにて以下の内容をお送りください。[改行][改行]【送信先】ieul-support@speee.jp[改行]【件名】査定依頼のキャンセルについて[改行]【本文】[改行]査定依頼をキャンセルしたいです。[改行]物件住所：${propertyAddress}[改行]お名前：${name}[改行][改行]ご不明な点がございましたら、お気軽にお問い合わせください。[改行][改行]㈱いふう[改行]大分市舞鶴町1-3-30 STビル１F[改行]TEL: 097-533-2022`;
  } else if (site === 'す') {
    // すまいステップ
    return `${name}様[改行][改行]お世話になっております。大分市舞鶴町にございます不動産会社のいふうです。[改行][改行]${propertyAddress}の査定依頼についてご連絡させていただきました。[改行][改行]もし査定のご依頼をキャンセルされる場合は、下記のGoogleフォームよりお手続きください。[改行]https://forms.gle/iu3rLdPJ784WJxJW7[改行][改行]ご不明な点がございましたら、お気軽にお問い合わせください。[改行][改行]㈱いふう[改行]大分市舞鶴町1-3-30 STビル１F[改行]TEL: 097-533-2022`;
  } else if (site === 'L') {
    // ライフルホームズ
    return `${name}様[改行][改行]お世話になっております。大分市舞鶴町にございます不動産会社のいふうです。[改行][改行]${propertyAddress}の査定依頼についてご連絡させていただきました。[改行][改行]もし査定のご依頼をキャンセルされる場合は、このメッセージに返信する形で「キャンセル希望」とお知らせください。24時間以内にキャンセル手続きをさせていただきます。[改行][改行]ご不明な点がございましたら、お気軽にお問い合わせください。[改行][改行]㈱いふう[改行]大分市舞鶴町1-3-30 STビル１F[改行]TEL: 097-533-2022`;
  } else {
    // その他のサイト
    return `${name}様[改行][改行]お世話になっております。[改行][改行]${propertyAddress}の査定依頼について、キャンセル案内不要です。`;
  }
};

/**
 * 3. 査定Sメール
 * 査定結果を3段階の価格帯で通知
 */
export const generateValuationSMS = (
  seller: Seller,
  property: PropertyInfo | null
): string => {
  const name = seller.name || '';
  const propertyAddress = property?.address || seller.address || '';
  
  // 査定額を万円単位に変換
  const amount1 = seller.valuationAmount1 
    ? Math.round(seller.valuationAmount1 / 10000) 
    : 0;
  const amount2 = seller.valuationAmount2 
    ? Math.round(seller.valuationAmount2 / 10000) 
    : 0;
  const amount3 = seller.valuationAmount3 
    ? Math.round(seller.valuationAmount3 / 10000) 
    : 0;
  
  let message = `${name}様[改行][改行]お世話になっております。大分市舞鶴町にございます不動産会社のいふうです。[改行][改行]${propertyAddress}の査定をさせていただきました。[改行][改行]【査定結果】[改行]`;
  
  if (amount1 > 0 && amount2 > 0 && amount3 > 0) {
    message += `①${amount1}万円～${amount2}万円（相場価格）[改行]②${amount2}万円～${amount3}万円（チャレンジ価格）[改行][改行]`;
  } else {
    message += `査定額：未設定[改行][改行]`;
  }
  
  // 築年不明の場合の注記
  if (!property?.buildYear || property.buildYear <= 0) {
    message += `※新築年が不明のため、築35年で算出しております。相違がある場合はお申し付けくださいませ。[改行][改行]`;
  }
  
  message += `当社のお客様で${propertyAddress}周辺の物件を探されている方がいらっしゃいます。[改行][改行]詳しいお話をさせていただきたく、訪問査定のご予約を承っております。[改行]下記リンクよりご都合の良い日時をお選びください。[改行]http://bit.ly/44U9pjl[改行][改行]ご不明な点がございましたら、お気軽にお問い合わせください。[改行][改行]㈱いふう[改行]大分市舞鶴町1-3-30 STビル１F[改行]TEL: 097-533-2022`;
  
  return message;
};

/**
 * 4. 訪問事前通知メール
 * 訪問予定日の前日に送信（木曜日の場合は明後日表記）
 */
export const generateVisitReminderSMS = (
  seller: Seller,
  property: PropertyInfo | null
): string => {
  const name = seller.name || '';
  const appointmentDate = seller.appointmentDate 
    ? new Date(seller.appointmentDate) 
    : null;
  
  if (!appointmentDate) {
    return `${name}様[改行][改行]訪問予定日時が設定されていません。`;
  }
  
  // 曜日を取得
  const dayOfWeek = appointmentDate.toLocaleDateString('ja-JP', { weekday: 'long' });
  const isThursday = dayOfWeek === '木曜日';
  const dayText = isThursday ? '明後日' : '明日';
  
  // 日付と時刻をフォーマット
  const dateText = appointmentDate.toLocaleDateString('ja-JP', { 
    month: 'long', 
    day: 'numeric' 
  }).replace('月', '月').replace('日', '日');
  
  const timeText = appointmentDate.toLocaleTimeString('ja-JP', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false
  });
  
  return `【訪問、打合せのご連絡　☆返信不可☆】[改行]${name}様[改行][改行]お世話になっております。大分市舞鶴町にございます不動産会社のいふうです。[改行][改行]${dayText}${dateText}${timeText}に訪問査定にお伺いさせていただきます。[改行][改行]お時間の変更等ございましたら、下記までご連絡ください。[改行][改行]㈱いふう[改行]大分市舞鶴町1-3-30 STビル１F[改行]TEL: 097-533-2022[改行]Email: tenant@ifoo-oita.com[改行]営業時間: 9:00～18:00（水曜定休）[改行][改行]※このメッセージは返信できません。ご連絡は上記の電話番号またはメールアドレスまでお願いいたします。`;
};

/**
 * 5. 訪問後御礼メール
 * 訪問査定後の御礼メッセージ（担当者名を含む）
 */
export const generatePostVisitThankYouSMS = (
  seller: Seller,
  property: PropertyInfo | null,
  employees?: Employee[]
): string => {
  const name = seller.name || '';
  
  // フィールド優先順位: visitAssignee > assignedTo
  const assigneeIdentifier = seller.visitAssignee || seller.assignedTo || '';
  
  // getEmployeeName関数を使用して担当者名を解決
  const assigneeName = getEmployeeName(assigneeIdentifier, employees);
  
  return `${name}様[改行][改行]お世話になっております。㈱いふうの${assigneeName}です。[改行][改行]本日はお忙しい中、お時間をいただきまして誠にありがとうございました。[改行][改行]ご不明な点やご質問がございましたら、お気軽にご連絡ください。[改行][改行]今後ともよろしくお願いいたします。[改行][改行]㈱いふう`;
};

/**
 * 6. 除外前・長期客Sメール
 * 長期間連絡が取れていない顧客への確認メッセージ
 */
export const generateLongTermCustomerSMS = (
  seller: Seller,
  property: PropertyInfo | null
): string => {
  const name = seller.name || '';
  const propertyAddress = property?.address || seller.address || '';
  
  return `${name}様[改行][改行]お世話になっております。大分市舞鶴町にございます不動産会社のいふうです。[改行][改行]${propertyAddress}の売却について、その後ご検討状況はいかがでしょうか。[改行][改行]当社のお客様で${propertyAddress}周辺の物件を探されている方がいらっしゃいます。[改行][改行]もしご売却をお考えでしたら、訪問査定のご予約を承っております。[改行]下記リンクよりご都合の良い日時をお選びください。[改行]http://bit.ly/44U9pjl[改行][改行]今後のご連絡が不要な場合は、お手数ですがその旨お知らせください。[改行][改行]㈱いふう[改行]大分市舞鶴町1-3-30 STビル１F[改行]実績: bit.ly/3J61wzG[改行]TEL: 097-533-2022`;
};

/**
 * 7. 当社が電話したというリマインドメール
 * 電話後のフォローアップメッセージ
 */
export const generateCallReminderSMS = (
  seller: Seller,
  property: PropertyInfo | null
): string => {
  const name = seller.name || '';
  
  return `${name}様[改行][改行]お世話になっております。先ほどお電話でお話させていただきましてありがとうございました。大分市舞鶴町にございます不動産会社のいふうです。[改行]なるべく${name}様のご要望に沿った形で計画的ご提案できればと考えておりますので、宜しくお願い申し上げます。[改行]ご不明点等がございましたら、こちらのメールに返信いただければと思います。宜しくお願い申し上げます。[改行][改行]大分市舞鶴町1-3-30[改行]株式会社いふう[改行]売買実績はこちら：bit.ly/3J61wzG[改行]097-533-2022`;
};

/**
 * 改行プレースホルダーを実際の改行文字に変換
 */
export const convertLineBreaks = (message: string): string => {
  return message.replace(/\[改行\]/g, '\n');
};
