/**
 * Google Chat メッセージ送信サービス
 * 
 * 買付情報をGoogle Chatに送信する機能を提供します。
 */

export class GoogleChatService {
  private readonly GOOGLE_CHAT_WEBHOOK_URL = 
    'https://chat.googleapis.com/v1/spaces/AAAA6iEDkiU/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=azlyf21pENCpLLUdJPjnRNXOzsIAP550xebOMVxYRMQ';

  /**
   * 買付情報をGoogle Chatに送信
   * 
   * @param buyer 買主データ
   * @param property 物件データ
   * @param offerComment 買付コメント（任意）
   * @throws Error Google Chat APIへのリクエストが失敗した場合
   */
  async sendOfferMessage(
    buyer: any,
    property: any,
    offerComment: string
  ): Promise<void> {
    try {
      // メッセージ内容を生成
      const message = this.generateOfferMessage(buyer, property, offerComment);
      
      console.log('[GoogleChatService] Sending message to Google Chat:', {
        buyerNumber: buyer.buyer_number,
        propertyNumber: property.property_number,
        messageLength: message.length,
      });
      
      // Google Chat APIにPOST
      const response = await fetch(this.GOOGLE_CHAT_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: message,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[GoogleChatService] Google Chat API error:', {
          status: response.status,
          statusText: response.statusText,
          errorText,
        });
        throw new Error(`Google Chat API error: ${response.statusText}`);
      }

      console.log('[GoogleChatService] Message sent successfully');
    } catch (error: any) {
      console.error('[GoogleChatService] Error:', {
        buyerNumber: buyer.buyer_number,
        propertyNumber: property.property_number,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * メッセージ内容を動的生成
   * 
   * 4つのパターンに対応：
   * 1. 業者問合せ以外 × 専任媒介
   * 2. 業者問合せ以外 × 一般媒介
   * 3. 業者問合せ × 専任媒介
   * 4. 業者問合せ × 一般媒介
   * 
   * @param buyer 買主データ
   * @param property 物件データ
   * @param offerComment 買付コメント（任意）
   * @returns 生成されたメッセージ
   */
  private generateOfferMessage(
    buyer: any,
    property: any,
    offerComment: string
  ): string {
    const brokerInquiry = buyer.broker_inquiry || '';
    const atbbStatus = property.atbb_status || '';
    
    // 業者問合せかどうか
    const isBrokerInquiry = brokerInquiry === '業者問合せ';
    
    // 専任媒介かどうか（専任を優先的にチェック）
    const isExclusive = atbbStatus.includes('専任');
    const isGeneral = !isExclusive && atbbStatus.includes('一般');
    
    // メッセージのヘッダー部分（買主番号と<<>>記号を削除）
    let message = `${buyer.latest_status}\n`;
    
    // 媒介契約種別による警告メッセージ
    if (isExclusive) {
      message += '⚠atbbの業者向けを非公開お願いします！！\n';
    } else if (isGeneral) {
      message += '⚠一般媒介なので、atbbは公開のままにしてください！！\n';
    }
    
    // 業者問合せの場合は他社名を追加
    if (isBrokerInquiry && buyer.other_company_name) {
      message += `他社名：${buyer.other_company_name}\n`;
    }
    
    // キャンペーン該当/未（空でない場合のみ表示）
    if (buyer.campaign_applicable && buyer.campaign_applicable.trim()) {
      message += `${buyer.campaign_applicable}\n`;
    }
    
    // 買付コメント（空でない場合のみ表示）
    if (offerComment && offerComment.trim()) {
      message += `${offerComment}\n`;
    }
    
    // 物件情報（買主番号と<<>>記号を削除）
    message += `物件番号: ${property.property_number}\n`;
    message += `物件所在地: ${property.display_address || property.address}\n`;
    message += `価格: ${property.price}\n`;
    message += `物件担当: ${property.sales_assignee}\n`;
    message += `内覧担当: ${buyer.follow_up_assignee}\n`;
    
    return message;
  }
}
