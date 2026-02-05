/**
 * 大分市の住所ベースエリアマッピングサービス
 * 
 * 大分市内の特定地域を、対応するエリア番号にマッピングします。
 * 例: 萩原 → ②
 */
export class OitaCityAreaMappingService {
  /**
   * 住所から配信エリア番号を取得
   * @param address 物件住所
   * @returns エリア番号文字列（例: "②"）、マッピングがない場合はnull
   */
  async getDistributionAreasForAddress(address: string): Promise<string | null> {
    if (!address) {
      return null;
    }

    const normalizedAddress = address.trim();

    // ⑥エリア（先にチェック - 「国分新町」「森ノ木」の競合を避けるため）
    const area6Patterns = [
      '賀来北', '賀来西', '賀来南', '国分新町', '国分台', '国分団地', '東野台',
      '大字賀来', '大字国分', '大字東院', '大字中尾',
      'カームタウン', '野田', '中尾', '森ノ木', '脇', '大字野田', '宮苑',
      '大字平横瀬', '大字宮苑', '餅田'
    ];
    if (area6Patterns.some(pattern => normalizedAddress.includes(pattern))) {
      console.log(`[OitaCityAreaMapping] ⑥エリア detected → ⑥`);
      return '⑥';
    }

    // ④エリア（⑥エリアの後にチェック）
    const area4Patterns = [
      '鶴崎コスモス団地', '森', '金谷', '大字下徳丸', '下徳丸', '関園', '常行', '南関', '門迫', '堂園',
      '大字常行', '大字鶴瀬', '大字丸亀', '亀甲', '上徳丸', '大字南つるさき', '陽光台',
      '宮河内ハイランド', 'リバーサイド', '若葉台',
      '大字迫', '大字種具', '種具', '大字広内', '大字宮河内', '杵河内', '迫', '阿蘇', '入新田', '浄土寺', '宮谷',
      '別保'
    ];
    if (area4Patterns.some(pattern => normalizedAddress.includes(pattern))) {
      console.log(`[OitaCityAreaMapping] ④エリア detected → ④`);
      return '④';
    }

    // ②エリア（先にチェック - 「新町」の競合を避けるため）
    const area2Patterns = [
      '萩原',
      '新貝', '新栄町', '高城新町', '高城本町', '高城西町', '高城南町',
      '高松1丁目', '高松2丁目', '高松東1丁目', '高松東2丁目', '高松東3丁目',
      '花高松1丁目', '花高松2丁目', '花高松3丁目',
      '原川1丁目', '原川2丁目', '原川3丁目', '原新町',
      '日岡1丁目', '日岡2丁目', '日岡3丁目', '日吉町',
      '松原町1丁目', '松原町2丁目', '松原町3丁目',
      '向原沖1丁目', '向原沖2丁目', '向原沖3丁目',
      '向原西1丁目', '向原西2丁目',
      '向原東1丁目', '向原東2丁目',
      '岡', '岡新町', '乙津港町', '千歳', '千歳団地', '寺崎町', '仲西町',
      '三川上', '三川下', '三川新町', '桃園団地',
      '山津', '山津町1丁目', '山津町2丁目', '小池原'
    ];
    if (area2Patterns.some(pattern => normalizedAddress.includes(pattern))) {
      console.log(`[OitaCityAreaMapping] ②エリア detected → ②`);
      return '②';
    }

    // ①エリア（大道町周辺）
    const area1Patterns = [
      '大道町', '要町', '新町', '末広町', '太平町', '田室町',
      '大道西', '大道東', '大道',
      '王子北町', '王子新町', '王子中町', '王子西町', '王子町', '王子港町', '王子南町', '王子山の手町',
      '新春日町', '勢家町', '中春日町', '西春日町', '東春日町', '南春日町', '南王子町',
      '上春日町', '季の坂', '椎迫', '志手',
      'にじが丘', 'ほたるの杜団地',
      '府内町',
      '中央町', '金池町', '荷揚町', '城崎町'
    ];
    if (area1Patterns.some(pattern => normalizedAddress.includes(pattern))) {
      console.log(`[OitaCityAreaMapping] ①エリア detected → ①`);
      return '①';
    }

    // ③エリア
    const area3Patterns = [
      '久保山団地', '新明治', '横尾東町', 'パークヒルズ久保山',
      '大字猪野', '猪野南', '大字葛木', '葛木', '大字森', '大字横尾',
      '法勝台', '小池原', '公園通り', '京が丘',
      '大字大津留', '毛井', '松岡',
      '下郡', '明野高尾'
    ];
    if (area3Patterns.some(pattern => normalizedAddress.includes(pattern))) {
      console.log(`[OitaCityAreaMapping] ③エリア detected → ③`);
      return '③';
    }

    // ⑦エリア
    const area7Patterns = [
      'ふじが丘', '富士見が丘', '田尻', '光吉',
      '大字今市', '石合', '一本櫟', '今市町', '上石合', '白家', '摺練ケ迫', '山中',
      '大字入蔵', '吉熊', '日方', '羽原',
      '大字太田', '太田', '田ノ口', '原村',
      '大字上詰', '湛水',
      '大字沢田', '沢田',
      '大字下原',
      '大字高原',
      '大字竹矢',
      '大字辻原',
      '大字荷尾杵',
      '大字野津原',
      '大字福宗',
      '大字廻栖野',
      '敷戸', '古国府'
    ];
    if (area7Patterns.some(pattern => normalizedAddress.includes(pattern))) {
      console.log(`[OitaCityAreaMapping] ⑦エリア detected → ⑦`);
      return '⑦';
    }

    // ⑧エリア
    const area8Patterns = [
      '戸次', '中判田',
      '大字安藤', '大字河原内', '大字竹中', '大字端登',
      '鴛野'
    ];
    if (area8Patterns.some(pattern => normalizedAddress.includes(pattern))) {
      console.log(`[OitaCityAreaMapping] ⑧エリア detected → ⑧`);
      return '⑧';
    }

    // マッピングなし
    return null;
  }
}
