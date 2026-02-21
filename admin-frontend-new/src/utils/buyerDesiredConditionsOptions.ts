/**
 * 買主希望条件の選択肢定義
 * 表記・順序は完全一致、変更不可
 */

// ★エリア
export const AREA_OPTIONS = [
  { value: '①中学校（王子、碩田学園、大分西）', label: '①中学校（王子、碩田学園、大分西）' },
  { value: '②中学校（滝尾、城東、原川）', label: '②中学校（滝尾、城東、原川）' },
  { value: '③中学校（明野、大東）', label: '③中学校（明野、大東）' },
  { value: '④中学校（東陽、鶴崎）', label: '④中学校（東陽、鶴崎）' },
  { value: '⑤中学校（大在、坂ノ市、鶴崎、佐賀関）', label: '⑤中学校（大在、坂ノ市、鶴崎、佐賀関）' },
  { value: '⑥中学校（南大分、城南、賀来）', label: '⑥中学校（南大分、城南、賀来）' },
  { value: '⑦中学校（植田、野津原）', label: '⑦中学校（植田、野津原）' },
  { value: '⑧中学校（判田、戸次、吉野、竹中）', label: '⑧中学校（判田、戸次、吉野、竹中）' },
  { value: '⑨青山中学校（南立石、堀田、扇山、荘園、鶴見７組、９組ルミエール除く）', label: '⑨青山中学校（南立石、堀田、扇山、荘園、鶴見７組、９組ルミエール除く）' },
  { value: '⑩中部中学校（東荘園、石垣東、北浜、京町、新港町）', label: '⑩中部中学校（東荘園、石垣東、北浜、京町、新港町）' },
  { value: '⑪北部中学校（亀川四の湯、亀川浜田町、大観山、上人本町、上人ケ浜）', label: '⑪北部中学校（亀川四の湯、亀川浜田町、大観山、上人本町、上人ケ浜）' },
  { value: '⑫朝日中学校（明礬、新別府、火売、北中、竹の内、大畑、朝日ケ丘）', label: '⑫朝日中学校（明礬、新別府、火売、北中、竹の内、大畑、朝日ケ丘）' },
  { value: '⑬東山中学校（東山、山の口）', label: '⑬東山中学校（東山、山の口）' },
  { value: '⑭鶴見台中学校（南須賀、石垣東、石垣西、中須賀元町）', label: '⑭鶴見台中学校（南須賀、石垣東、石垣西、中須賀元町）' },
  { value: '⑮別府西中学校（光町、中島町、青山町、立田町、浜脇、山家）', label: '⑮別府西中学校（光町、中島町、青山町、立田町、浜脇、山家）' },
  { value: '㊵大分', label: '㊵大分' },
  { value: '㊶別府', label: '㊶別府' },
  { value: '㊷別府駅周辺（中央町、駅前本町、上田の湯町、野口中町、西野口町、駅前町）', label: '㊷別府駅周辺（中央町、駅前本町、上田の湯町、野口中町、西野口町、駅前町）' },
  { value: '㊸鉄輪線より下（南立石２区、東荘園、ルミールの丘、石垣東、亀川中央町）', label: '㊸鉄輪線より下（南立石２区、東荘園、ルミールの丘、石垣東、亀川中央町）' },
];

// ★希望種別
export const DESIRED_PROPERTY_TYPE_OPTIONS = [
  { value: '戸建', label: '戸建' },
  { value: 'マンション', label: 'マンション' },
  { value: '土地', label: '土地' },
  { value: '戸建、土地', label: '戸建、土地' },
  { value: '戸建、マンション', label: '戸建、マンション' },
  { value: '戸建、マンション、土地', label: '戸建、マンション、土地' },
  { value: 'マンション、土地', label: 'マンション、土地' },
  { value: '収益物件', label: '収益物件' },
];

// 価格帯（戸建）
export const PRICE_RANGE_DETACHED_OPTIONS = [
  { value: '指定なし', label: '指定なし' },
  { value: '~1900万円', label: '~1900万円' },
  { value: '1000万円~2999万円', label: '1000万円~2999万円' },
  { value: '2000万円以上', label: '2000万円以上' },
  { value: 'ヒアリングできず', label: 'ヒアリングできず' },
];

// 価格帯（マンション）
export const PRICE_RANGE_MANSION_OPTIONS = [
  { value: '指定なし', label: '指定なし' },
  { value: '~1900万円', label: '~1900万円' },
  { value: '1000万円~2999万円', label: '1000万円~2999万円' },
  { value: '2000万円以上', label: '2000万円以上' },
];

// 価格帯（土地）
export const PRICE_RANGE_LAND_OPTIONS = [
  { value: '指定なし', label: '指定なし' },
  { value: '~1900万円', label: '~1900万円' },
  { value: '1000万円~2999万円', label: '1000万円~2999万円' },
  { value: '2000万円以上', label: '2000万円以上' },
];

// ★築年数
export const BUILDING_AGE_OPTIONS = [
  { value: '新築', label: '新築' },
  { value: '~3年', label: '~3年' },
  { value: '~5年', label: '~5年' },
  { value: '~10年', label: '~10年' },
  { value: '~15年', label: '~15年' },
  { value: '~25年', label: '~25年' },
  { value: '~30年', label: '~30年' },
];

// ★間取り
export const FLOOR_PLAN_OPTIONS = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
  { value: '6', label: '6' },
  { value: '7~', label: '7~' },
];

// ●P台数
export const PARKING_SPACES_OPTIONS = [
  { value: '1台', label: '1台' },
  { value: '2台以上', label: '2台以上' },
  { value: '3台以上', label: '3台以上' },
  { value: '10台以上', label: '10台以上' },
  { value: '不要', label: '不要' },
];

// ★温泉あり
export const HOT_SPRING_OPTIONS = [
  { value: 'あり', label: 'あり' },
  { value: 'どちらでも', label: 'どちらでも' },
  { value: 'なし', label: 'なし' },
];

// ★庭付き
export const GARDEN_OPTIONS = [
  { value: 'どちらでも', label: 'どちらでも' },
  { value: 'あり', label: 'あり' },
  { value: 'なし', label: 'なし' },
];

// ★ペット可
export const PET_ALLOWED_OPTIONS = [
  { value: '可', label: '可' },
  { value: '不要', label: '不要' },
  { value: 'どちらでも', label: 'どちらでも' },
];

// ★高層階
export const HIGH_FLOOR_OPTIONS = [
  { value: '高層階', label: '高層階' },
  { value: 'どちらでも', label: 'どちらでも' },
  { value: '１F', label: '１F' },
  { value: '低層階', label: '低層階' },
];

// ★角部屋
export const CORNER_ROOM_OPTIONS = [
  { value: '角部屋希望', label: '角部屋希望' },
  { value: 'どちらでも', label: 'どちらでも' },
];

// ★眺望良好
export const GOOD_VIEW_OPTIONS = [
  { value: '眺望優先', label: '眺望優先' },
  { value: 'どちらでも', label: 'どちらでも' },
];

// ★月極でも可
export const MONTHLY_PARKING_OK_OPTIONS = [
  { value: '可', label: '可' },
  { value: '不可', label: '不可' },
  { value: 'どちらでも', label: 'どちらでも' },
];
