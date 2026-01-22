// 市名抽出サービス
export class CityNameExtractor {
  /**
   * 住所から市名を抽出
   * @param address 住所文字列
   * @returns 抽出された市名、または抽出失敗時はnull
   */
  extractCityFromAddress(address: string | null | undefined): string | null {
    if (!address || address.trim() === '') {
      return null;
    }

    const normalizedAddress = address.trim();

    // パターン1: 都道府県 + 市区町村 (例: "大分県大分市...")
    const pattern1 = /([^\s]+?[都道府県])([^\s]+?[市区町村])/;
    const match1 = normalizedAddress.match(pattern1);
    if (match1) {
      return match1[2]; // 市区町村部分を返す
    }

    // パターン2: 市区町村のみ (例: "大分市...")
    const pattern2 = /^([^\s]+?[市区町村])/;
    const match2 = normalizedAddress.match(pattern2);
    if (match2) {
      return match2[1];
    }

    // パターン3: 特定の市名を直接検索
    const knownCities = [
      '大分市',
      '別府市',
      '中津市',
      '日田市',
      '佐伯市',
      '臼杵市',
      '津久見市',
      '竹田市',
      '豊後高田市',
      '杵築市',
      '宇佐市',
      '豊後大野市',
      '由布市',
      '国東市',
    ];

    for (const city of knownCities) {
      if (normalizedAddress.includes(city)) {
        return city;
      }
    }

    return null;
  }

  /**
   * 市名を正規化
   * @param cityName 市名
   * @returns 正規化された市名
   */
  normalizeCityName(cityName: string | null | undefined): string | null {
    if (!cityName || cityName.trim() === '') {
      return null;
    }

    return cityName
      .trim()
      .replace(/\s+/g, '') // 空白を削除
      .replace(/[　]+/g, ''); // 全角空白を削除
  }

  /**
   * 複数の住所から市名を一括抽出
   * @param addresses 住所の配列
   * @returns 抽出結果の配列 { address, city }
   */
  batchExtractCities(
    addresses: Array<{ id: string; address: string | null }>
  ): Array<{ id: string; address: string | null; city: string | null }> {
    return addresses.map((item) => ({
      id: item.id,
      address: item.address,
      city: this.extractCityFromAddress(item.address),
    }));
  }
}
