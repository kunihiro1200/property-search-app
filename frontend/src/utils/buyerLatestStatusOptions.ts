/**
 * 買主の最新状況（latest_status）フィールドの選択肢定義
 * 
 * 買主詳細ページの「★最新状況」フィールドで使用するドロップダウン選択肢
 */

export interface LatestStatusOption {
  value: string;
  label: string;
}

/**
 * 最新状況の選択肢一覧
 * 順序は要件で指定された通り
 */
export const LATEST_STATUS_OPTIONS: LatestStatusOption[] = [
  { value: 'A:この物件を気に入っている（こちらからの一押しが必要）', label: 'A:この物件を気に入っている（こちらからの一押しが必要）' },
  { value: 'B:1年以内に引っ越し希望だが、この物件ではない。駐車場の要件や、日当たり等が合わない。', label: 'B:1年以内に引っ越し希望だが、この物件ではない。駐車場の要件や、日当たり等が合わない。' },
  { value: 'C:引っ越しは1年以上先', label: 'C:引っ越しは1年以上先' },
  { value: 'D:配信・追客不要案件（業者や確度が低く追客不要案件等）', label: 'D:配信・追客不要案件（業者や確度が低く追客不要案件等）' },
  { value: '買付外れました', label: '買付外れました' },
  { value: '買（一般 両手）', label: '買（一般 両手）' },
  { value: '買（一般 片手）', label: '買（一般 片手）' },
  { value: '買（専任 両手）', label: '買（専任 両手）' },
  { value: '買（専任 片手）', label: '買（専任 片手）' },
  { value: '買（他社、片手）', label: '買（他社、片手）' },
  { value: '他決', label: '他決' },
  { value: '2番手', label: '2番手' },
  { value: '3番手', label: '3番手' },
  { value: 'AZ:Aだが次電日不要', label: 'AZ:Aだが次電日不要' },
  { value: '2番手買付提出済み', label: '2番手買付提出済み' },
  { value: '3番手買付提出済み', label: '3番手買付提出済み' },
];
