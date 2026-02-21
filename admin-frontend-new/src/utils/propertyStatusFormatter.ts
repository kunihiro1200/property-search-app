/**
 * 物件の現況（current_status）を短縮形に変換
 * データベース: '空き家' → 表示: '空'
 */
export function formatCurrentStatus(status: string | null | undefined): string {
  if (!status) return '未設定';
  
  const statusMap: Record<string, string> = {
    '空き家': '空',
    '居住中': '居',
    '賃貸中': '賃',
    '古屋あり': '古有',
    '更地': '更',
  };
  
  return statusMap[status] || status;
}

/**
 * 物件の現況（current_status）を詳細形に変換
 * 表示: '空' → 詳細: '空（空き家）'
 */
export function formatCurrentStatusDetailed(status: string | null | undefined): string {
  if (!status) return '未設定';
  
  const statusMap: Record<string, string> = {
    '空き家': '空（空き家）',
    '居住中': '居（居住中）',
    '賃貸中': '賃（賃貸中）',
    '古屋あり': '古有（古屋あり）',
    '更地': '更（更地）',
    '空': '空（空き家）',
    '居': '居（居住中）',
    '賃': '賃（賃貸中）',
    '古有': '古有（古屋あり）',
    '更': '更（更地）',
  };
  
  return statusMap[status] || status;
}
