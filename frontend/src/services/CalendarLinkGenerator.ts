/**
 * CalendarLinkGenerator
 * 
 * Googleカレンダーリンクを生成するサービス
 */

interface Buyer {
  buyer_number: string;
  name?: string;
  phone_number?: string;
  email?: string;
  latest_viewing_date: string;
  viewing_time: string;
  follow_up_assignee: string;
  pre_viewing_notes?: string;
  [key: string]: any;
}

interface Employee {
  name: string;
  initials: string;
  email: string;
  [key: string]: any;
}

export class CalendarLinkGenerator {
  /**
   * Googleカレンダーリンクを生成
   * @param buyer - 買主データ
   * @param employees - 従業員データ
   * @returns Googleカレンダーのイベント作成URL
   */
  static generateCalendarLink(buyer: Buyer, employees: Employee[]): string {
    // 内覧日時を取得
    const viewingDate = new Date(buyer.latest_viewing_date);
    const viewingTime = buyer.viewing_time || '14:00';
    
    // 時間をパース
    const [hours, minutes] = viewingTime.split(':').map(Number);
    viewingDate.setHours(hours, minutes, 0, 0);
    
    // 終了時刻（1時間後）
    const endDate = new Date(viewingDate);
    endDate.setHours(viewingDate.getHours() + 1);
    
    // 日時フォーマット
    const startDateStr = this.formatDateForCalendar(viewingDate);
    const endDateStr = this.formatDateForCalendar(endDate);
    
    // イベントタイトル
    const title = encodeURIComponent(`内覧: ${buyer.name || buyer.buyer_number}`);
    
    // 後続担当のメールアドレスを取得
    const assignedEmployee = employees.find(e => 
      e.name === buyer.follow_up_assignee || 
      e.initials === buyer.follow_up_assignee || 
      e.email === buyer.follow_up_assignee
    );
    const assignedEmail = assignedEmployee?.email || '';
    
    // 詳細情報（後続担当の情報を含む）
    let detailsText = `買主名: ${buyer.name || buyer.buyer_number}\n` +
      `買主番号: ${buyer.buyer_number}\n` +
      `電話: ${buyer.phone_number || 'なし'}\n` +
      `メール: ${buyer.email || 'なし'}\n`;
    
    if (assignedEmployee) {
      detailsText += `\n後続担当: ${assignedEmployee.name} (${assignedEmployee.email})\n`;
    }
    
    detailsText += `\n買主詳細ページ:\n${window.location.origin}/buyers/${buyer.buyer_number}\n` +
      `\n内覧前伝達事項: ${buyer.pre_viewing_notes || 'なし'}`;
    
    const details = encodeURIComponent(detailsText);
    
    // 後続担当をゲストとして追加（addパラメータを使用）
    // これにより、後続担当のカレンダーにもイベントが表示される
    const addParam = assignedEmail ? `&add=${encodeURIComponent(assignedEmail)}` : '';
    
    // タイムゾーンを指定（日本時間）
    const ctz = '&ctz=Asia/Tokyo';
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDateStr}/${endDateStr}&details=${details}${addParam}${ctz}`;
  }

  /**
   * Googleカレンダー用の日時フォーマット（YYYYMMDDTHHmmss）
   * @param date - フォーマットする日時
   * @returns フォーマットされた日時文字列
   */
  private static formatDateForCalendar(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}T${hour}${minute}${second}`;
  }
}
