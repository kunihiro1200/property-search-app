import { Router } from 'express';
import { EmailService } from '../services/EmailService';
import { BuyerService } from '../services/BuyerService';

const router = Router();
const emailService = new EmailService();
const buyerService = new BuyerService();

// 買主へのGmail送信エンドポイント
router.post('/send-to-buyer', async (req, res) => {
  try {
    const { buyerId, propertyIds, templateId, customizations } = req.body;

    // 買主情報を取得
    const buyer = await buyerService.getBuyerById(buyerId);
    if (!buyer || !buyer.email) {
      return res.status(404).json({ error: '買主が見つからないか、メールアドレスが登録されていません' });
    }

    // メール送信
    const result = await emailService.sendEmailWithImages({
      to: buyer.email,
      subject: customizations?.subject || 'お問い合わせの物件について',
      body: customizations?.body || '',
      propertyIds: propertyIds || [],
      templateId: templateId
    });

    res.json({ success: true, result });
  } catch (error) {
    console.error('Gmail送信エラー:', error);
    res.status(500).json({ error: 'メール送信に失敗しました' });
  }
});

export default router;
