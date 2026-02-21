/**
 * ISO 8601 形式の日時文字列を「2025/12/1 14:30」形式にフォーマット
 * 
 * @param dateString ISO 8601 形式の日時文字列
 * @returns フォーマットされた日時文字列（例: "2025/12/1 14:30"）
 */
export function formatDateTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    
    // 無効な日付の場合
    if (isNaN(date.getTime())) {
      return dateString;
    }

    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 月は0から始まるので+1
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();

    // 分を2桁にフォーマット
    const formattedMinutes = minutes.toString().padStart(2, '0');

    return `${year}/${month}/${day} ${hours}:${formattedMinutes}`;
  } catch (error) {
    // エラーが発生した場合は元の文字列を返す
    return dateString;
  }
}
