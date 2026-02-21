// Gmail配信用のメールテンプレート定義

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  placeholders: string[];
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'price-reduction',
    name: '値下げメール配信',
    subject: '【価格変更】{address}',
    body: `お世話になっております。

{address}の物件価格が変更となりました。

物件番号: {propertyNumber}

詳細はお問い合わせください。

よろしくお願いいたします。`,
    placeholders: ['address', 'propertyNumber']
  },
  {
    id: 'new-listing',
    name: '新着物件配信',
    subject: '【新着物件】{address}',
    body: `お世話になっております。

新着物件のご案内です。

物件住所: {address}
物件番号: {propertyNumber}

詳細はお問い合わせください。

よろしくお願いいたします。`,
    placeholders: ['address', 'propertyNumber']
  }
];

/**
 * テンプレート内のプレースホルダーを実際の値に置換
 * @param template テンプレート文字列
 * @param data 置換データ
 * @returns 置換後の文字列
 */
export function replacePlaceholders(
  template: string,
  data: Record<string, string>
): string {
  let result = template;
  
  Object.entries(data).forEach(([key, value]) => {
    const placeholder = `{${key}}`;
    result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value || '');
  });
  
  return result;
}

/**
 * IDからテンプレートを取得
 * @param id テンプレートID
 * @returns テンプレート、または見つからない場合はundefined
 */
export function getTemplateById(id: string): EmailTemplate | undefined {
  return EMAIL_TEMPLATES.find(t => t.id === id);
}

/**
 * すべてのテンプレートを取得
 * @returns テンプレート配列
 */
export function getAllTemplates(): EmailTemplate[] {
  return [...EMAIL_TEMPLATES];
}
