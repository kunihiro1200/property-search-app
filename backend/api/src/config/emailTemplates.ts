import { EmailTemplate } from '../types/emailTemplate';

/**
 * Default email templates for buyer communication
 * These templates include placeholders that will be replaced with actual data
 */
export const emailTemplates: EmailTemplate[] = [
  {
    id: 'inquiry-response',
    name: '問合せ返信',
    description: '物件問合せに対する返信テンプレート',
    subject: '【{{propertyNumber}}】物件のお問い合わせありがとうございます',
    body: `{{buyerName}}様

お問い合わせいただきありがとうございます。

■物件情報
物件番号: {{propertyNumber}}
所在地: {{propertyAddress}}
価格: {{price}}円

詳細につきましては、お気軽にお問い合わせください。
ご内覧のご希望などございましたら、日程調整させていただきます。

何かご不明な点がございましたら、お気軽にご連絡ください。

よろしくお願いいたします。`,
    placeholders: [
      '{{buyerName}}',
      '{{propertyNumber}}',
      '{{propertyAddress}}',
      '{{price}}'
    ]
  },
  {
    id: 'viewing-invitation',
    name: '内覧案内',
    description: '物件内覧の案内テンプレート',
    subject: '【{{propertyNumber}}】内覧のご案内',
    body: `{{buyerName}}様

{{propertyNumber}}の内覧についてご案内いたします。

■物件情報
所在地: {{propertyAddress}}
価格: {{price}}円

ご都合の良い日時をお知らせください。
複数の候補日をいただけますと、調整がスムーズに進みます。

内覧時には、物件の詳細や周辺環境についてもご説明させていただきます。

よろしくお願いいたします。`,
    placeholders: [
      '{{buyerName}}',
      '{{propertyNumber}}',
      '{{propertyAddress}}',
      '{{price}}'
    ]
  },
  {
    id: 'follow-up',
    name: 'フォローアップ',
    description: '問合せ後のフォローアップテンプレート',
    subject: '{{propertyNumber}}の件でご連絡',
    body: `{{buyerName}}様

先日お問い合わせいただいた物件について、
その後ご検討状況はいかがでしょうか。

■物件情報
物件番号: {{propertyNumber}}
所在地: {{propertyAddress}}
価格: {{price}}円

ご不明な点やご質問がございましたら、お気軽にお問い合わせください。
また、他の物件のご紹介も可能ですので、ご希望がございましたらお知らせください。

引き続きよろしくお願いいたします。`,
    placeholders: [
      '{{buyerName}}',
      '{{propertyNumber}}',
      '{{propertyAddress}}',
      '{{price}}'
    ]
  }
];

/**
 * Get all available email templates
 */
export function getEmailTemplates(): EmailTemplate[] {
  return emailTemplates;
}

/**
 * Get a specific email template by ID
 */
export function getEmailTemplateById(templateId: string): EmailTemplate | undefined {
  return emailTemplates.find(template => template.id === templateId);
}

/**
 * Get template IDs
 */
export function getTemplateIds(): string[] {
  return emailTemplates.map(template => template.id);
}
