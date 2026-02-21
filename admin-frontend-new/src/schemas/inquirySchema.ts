import { z } from 'zod';

// 問い合わせフォームのバリデーションスキーマ
export const inquirySchema = z.object({
  name: z
    .string()
    .min(1, 'お名前を入力してください')
    .max(100, 'お名前は100文字以内で入力してください'),
  
  email: z
    .string()
    .min(1, 'メールアドレスを入力してください')
    .email('有効なメールアドレスを入力してください')
    .max(255, 'メールアドレスは255文字以内で入力してください'),
  
  phone: z
    .string()
    .min(1, '電話番号を入力してください')
    .regex(
      /^[0-9\-\(\)\s]+$/,
      '電話番号は数字、ハイフン、括弧、スペースのみ使用できます'
    )
    .max(20, '電話番号は20文字以内で入力してください'),
  
  message: z
    .string()
    .min(1, 'お問い合わせ内容を入力してください')
    .min(10, 'お問い合わせ内容は10文字以上で入力してください')
    .max(2000, 'お問い合わせ内容は2000文字以内で入力してください'),
});

export type InquiryFormData = z.infer<typeof inquirySchema>;
