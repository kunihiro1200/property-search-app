/**
 * Gmail Compose URL生成ユーティリティ
 * 
 * Gmailの新規メール作成画面を開くためのURLを生成します。
 */

export interface GmailComposeParams {
  from?: string;
  to?: string;
  bcc?: string;
  subject?: string;
  body?: string;
}

/**
 * Gmail Compose URLを生成
 * 
 * @param params - メールパラメータ
 * @returns Gmail Compose URL
 */
export function generateGmailComposeUrl(params: GmailComposeParams): string {
  const baseUrl = 'https://mail.google.com/mail/?view=cm&fs=1';
  const urlParams = new URLSearchParams();
  
  // authuser (送信者) - Gmailでは複数アカウントがある場合に使用
  // ただし、メールアドレスを直接指定することはできないため、
  // ユーザーがGmailで手動で選択する必要がある
  
  // to (宛先)
  if (params.to) {
    urlParams.append('to', params.to);
  }
  
  // bcc (BCC)
  if (params.bcc) {
    urlParams.append('bcc', params.bcc);
  }
  
  // su (件名)
  if (params.subject) {
    urlParams.append('su', params.subject);
  }
  
  // body (本文)
  if (params.body) {
    urlParams.append('body', params.body);
  }
  
  return `${baseUrl}&${urlParams.toString()}`;
}

/**
 * Gmail Compose URLを新しいタブで開く
 * 
 * @param params - メールパラメータ
 * @returns 開いたウィンドウオブジェクト、またはnull（ポップアップブロック時）
 */
export function openGmailCompose(params: GmailComposeParams): Window | null {
  const url = generateGmailComposeUrl(params);
  return window.open(url, '_blank');
}

/**
 * BCC宛先の上限チェック
 * Gmailの制限は500件
 */
export const MAX_BCC_RECIPIENTS = 500;

/**
 * BCC宛先が上限を超えているかチェック
 * 
 * @param emails - メールアドレスの配列
 * @returns 上限を超えている場合true
 */
export function isBccLimitExceeded(emails: string[]): boolean {
  return emails.length > MAX_BCC_RECIPIENTS;
}

/**
 * BCC宛先を上限内に制限
 * 
 * @param emails - メールアドレスの配列
 * @returns 上限内に制限されたメールアドレスの配列
 */
export function limitBccRecipients(emails: string[]): string[] {
  if (emails.length <= MAX_BCC_RECIPIENTS) {
    return emails;
  }
  return emails.slice(0, MAX_BCC_RECIPIENTS);
}
