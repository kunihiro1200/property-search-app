/**
 * 買主テンプレートサービス
 * AppSheetのAPPFORMULA式をそのまま使用してテンプレートを提供
 */
export class BuyerTemplateService {
  /**
   * 買主用テンプレートを取得（ハードコーディング）
   * スクショの順番に並び替え
   * @returns テンプレート一覧
   */
  async getBuyerTemplates(): Promise<BuyerTemplate[]> {
    const templates: BuyerTemplate[] = [
      // 1. メールアドレス確認
      {
        id: 'buyer_email_confirm',
        category: '買主',
        type: 'メールアドレス確認',
        subject: 'メールアドレス確認【株式会社いふうでございます】',
        content: `<<●氏名・会社名>>様

この度はお問い合わせありがとうございます。
株式会社いふうと申します。

メールアドレスの確認をさせていただきたく、ご連絡いたしました。
お手数ですが、このメールにご返信いただけますでしょうか。

ご不明な点等ございましたら、お気軽にお問い合わせください。

株式会社 いふう
TEL：097-533-2022
`,
      },
      // 2. 資料請求メール（戸、マ）
      {
        id: 'buyer_9',
        category: '買主',
        type: '資料請求メール（戸、マ）',
        subject: '<<住居表示>>に関して【株式会社いふうでございます】',
        content: `<<●氏名・会社名>>様

この度はお問い合わせありがとうございます。
株式会社いふうと申します。

所在地：<<住居表示>>
<<athome URL>>
上記の物件のお問い合わせ、ありがとうございます。
<<GoogleMap>>
<<内覧前伝達事項v>>
ご不明な点等ございましたら、お気軽にお問い合わせください。

また、ご内覧希望の場合は、こちらからご予約お願いいたします↓↓

https://docs.google.com/forms/d/e/1FAIpQLSefXwsYKryraVM4jtnLgcYtboUg3w-lx7tasftVA47E5jXUlQ/viewform?usp=pp_url&entry.267319544=<<買主番号>>&entry.2056434590=<<住居表示>>

★非公開の物件はこちらから↓↓
https://property-site-frontend-kappa.vercel.app/public/properties
お気軽にお問い合わせください。

また、他社物件もご紹介できますので、気になる物件がございましたらお気軽にご連絡ください。

株式会社 いふう
TEL：097-533-2022
`,
      },
      // 3. 資料請求メール（土）許可不要
      {
        id: 'buyer_1',
        category: '買主',
        type: '資料請求メール（土）許可不要',
        subject: '<<住居表示>>に関して【株式会社いふうでございます】',
        content: `<<●氏名・会社名>>様

この度はお問い合わせありがとうございます。
株式会社いふうと申します。

所在地：<<住居表示>>
<<athome URL>>
上記の物件のお問い合わせ、ありがとうございます。
<<GoogleMap>>
<<内覧前伝達事項v>>
現地確認につきましては、敷地外からはご自由に見ていただいて大丈夫です。

所在地：<<住居表示>>
★非公開の物件はこちらから↓↓
https://property-site-frontend-kappa.vercel.app/public/properties
ご不明な点等ございましたら、お気軽にお問い合わせください。

また、他社物件もご紹介できますので、気になる物件がございましたらお気軽にご連絡ください。

株式会社 いふう
TEL：097-533-2022
`,
      },
      // 4. 資料請求メール（土）売主へ要許可
      {
        id: 'buyer_3',
        category: '買主',
        type: '資料請求メール（土）売主へ要許可',
        subject: '<<住居表示>>に関して【株式会社いふうでございます】',
        content: `<<●氏名・会社名>>様

この度はお問い合わせありがとうございます。
株式会社いふうと申します。

<<athome URL>>
上記の物件のお問い合わせ、ありがとうございます。
<<GoogleMap>>
<<内覧前伝達事項v>>

現地確認につきましては、当社で売主様へ許可を取った後に、敷地外からはご自由に見ていただくことになります。
そこで、現地に行かれる日程が決まりましたら下記より日程をご予約いただければと思います

所在地：<<住居表示>>

https://docs.google.com/forms/d/e/1FAIpQLSefXwsYKryraVM4jtnLgcYtboUg3w-lx7tasftVA47E5jXUlQ/viewform?usp=pp_url&entry.267319544=<<買主番号>>&entry.2056434590=<<住居表示>>

★非公開の物件はこちらから↓↓
https://property-site-frontend-kappa.vercel.app/public/properties
ご不明な点等ございましたら、お気軽にお問い合わせください。

また、他社物件もご紹介できますので、気になる物件がございましたらお気軽にご連絡くださいませ。

株式会社 いふう
TEL：097-533-2022
`,
      },
      // 5. 買付あり内覧NG
      {
        id: 'buyer_4',
        category: '買主',
        type: '買付あり内覧NG',
        subject: '<<住居表示>>に関して【株式会社いふうでございます】',
        content: `<<●氏名・会社名>>様

この度はお問い合わせありがとうございます。
株式会社いふうと申します。

所在地：<<住居表示>>
<<athome URL>>

大変申し訳ございませんが、こちらの物件は他のお客様より只今申込みをいただいております。
万が一契約まで至らなかった場合、ご連絡さしあげるという形でよろしいでしょうか？

他に気になる物件がございましたら、他社の物件でもご紹介可能ですので、お気軽にお問い合わせくださいませ。
★非公開の物件はこちらから↓↓
https://property-site-frontend-kappa.vercel.app/public/properties

株式会社 いふう
TEL：097-533-2022
`,
      },
      // 6. 買付あり内覧OK
      {
        id: 'buyer_5',
        category: '買主',
        type: '買付あり内覧OK',
        subject: '<<住居表示>>に関して【株式会社いふうでございます】',
        content: `<<●氏名・会社名>>様

この度はお問い合わせありがとうございます。
株式会社いふうと申します。

所在地：<<住居表示>>
<<athome URL>>

大変申し訳ございませんが、こちらの物件は他のお客様より只今申込みをいただいております。
その方が契約に至らない場合もございますので、随時、内覧は可能です。（申込みを頂いた場合は２番手以降となります）
上記をご承知の上、内覧をご希望される場合は、下記ご入力後返信いただくか、お電話で直接受け付けます。
<<GoogleMap>>
内覧のご予約はこちらから↓↓
https://docs.google.com/forms/d/e/1FAIpQLSefXwsYKryraVM4jtnLgcYtboUg3w-lx7tasftVA47E5jXUlQ/viewform?usp=pp_url&entry.267319544=<<買主番号>>&entry.2056434590=<<住居表示>>

★非公開の物件はこちらから↓↓
https://property-site-frontend-kappa.vercel.app/public/properties


周辺エリアで物件をお探しでしたら、メールにて公開前・新着物件をご案内しておりますのでご利用ください。
また、他社物件もご紹介できますので、気になる物件がございましたらお気軽にご連絡ください。

それでは、引き続きよろしくお願いいたします。



★★ 新着情報配信中！！ ★★
メールで公開前の最新情報を優先的にご案内しております。物件探しにぜひご活用ください！
配信希望／配信内容変更は こちら から（アンケートフォームに移動します）
https://docs.google.com/forms/d/e/1FAIpQLSewA5GfWaELWJd2Q_4sYWHNHWYPGhWliUdS4MTQ-WQlSmjYOg/viewform


株式会社 いふう
TEL：097-533-2022
`,
      },
      // 7. 前回問合せ後反応なし
      {
        id: 'buyer_6',
        category: '買主',
        type: '前回問合せ後反応なし',
        subject: '<<住居表示>>に関して【株式会社いふうでございます】',
        content: `<<●氏名・会社名>>様

先日は<<住居表示>>のお問い合わせを頂き誠にありがとうございました。
<<SUUMO　URLの表示>>
その後物件探しのご状況はいかがでしょうか？
まだ物件をお探しであれば是非いふうにてお手伝い出来ればと存じますのでお気軽にお申し付け下さい。
以前お問合せ頂いた物件に関しまして、ご内覧希望日時を記載してご返信頂きましたら
直ぐにご確認可能でございます。
是非一度ご案内させて頂ければ幸いです

内覧のご予約はこちらから↓↓
https://docs.google.com/forms/d/e/1FAIpQLSefXwsYKryraVM4jtnLgcYtboUg3w-lx7tasftVA47E5jXUlQ/viewform?usp=pp_url&entry.267319544=<<買主番号>>&entry.2056434590=<<住居表示>>

既に当社で別の物件を内覧予定、済でしたら申し訳ございません、本メールは無視してください。
気になる物件がございましたら他社様の物件もご内覧可能です。
★非公開の物件はこちらから↓↓
https://property-site-frontend-kappa.vercel.app/public/properties
引き続き宜しくお願い致します。

株式会社 いふう
TEL：097-533-2022
`,
      },
      // 8. 前回問合せ後反応なし（買付あり、物件不適合）
      {
        id: 'buyer_7',
        category: '買主',
        type: '前回問合せ後反応なし（買付あり、物件不適合）',
        subject: '<<住居表示>>に関して【株式会社いふうでございます】',
        content: `<<●氏名・会社名>>様

先日は<<住居表示>>のお問い合わせを頂き誠にありがとうございました。
物件案内がご要望に添えず、大変申し訳ございませんでした。
その後物件探しのご状況はいかがでしょうか？
まだ物件をお探しであれば是非いふうにてお手伝い出来ればと存じますのでお気軽にお申し付け下さい。

他に気になる物件がございましたら他社様の物件もご内覧可能です。
★非公開の物件はこちらから↓↓
https://property-site-frontend-kappa.vercel.app/public/properties
引き続き宜しくお願い致します。

株式会社 いふう
TEL：097-533-2022
`,
      },
      // 9. 物件指定なし問合せ（Pinrich)
      {
        id: 'buyer_8',
        category: '買主',
        type: '物件指定なし問合せ（Pinrich)',
        subject: 'ご登録ありがとうございます【株式会社いふうでございます】',
        content: `<<●氏名・会社名>>様
先日は、ご登録いただきましてありがとうございました！その後物件探しのご状況はいかがでしょうか？
まだ物件をお探しであれば是非いふうにてお手伝い出来ればと存じますのでお気軽にお申し付け下さい。

他に気になる物件がございましたら他社様の物件もご内覧可能です。
★非公開の物件はこちらから↓↓
https://property-site-frontend-kappa.vercel.app/public/properties
引き続き宜しくお願い致します。

株式会社 いふう
TEL：097-533-2022
`,
      },
      // 10. 民泊問合せ
      {
        id: 'buyer_2',
        category: '買主',
        type: '民泊問合せ',
        subject: '<<住居表示>>に関して【株式会社いふうでございます】',
        content: `<<●氏名・会社名>>様

この度はお問い合わせありがとうございます。
株式会社いふうと申します。

所在地：<<住居表示>>
<<athome URL>>
上記の物件のお問い合わせ、ありがとうございます。
民泊につきましては、 民泊新法（営業180日以内）であればどの用途地域でも民泊が可能です。 保健所に届け出をする際に「近隣住民に説明したか」が必須の項目になりますので、反対が出た場合は難しい可能性もあります。保健所は届け出た際に説明した内容、方法、説明した人たちの氏名を届け出書で確認するだけですので、反対があった場合に勝手にやっていてトラブルになった場合は関与しないとのことです。
ご不明な点等ございましたら、東部保健所（0977-67-2511）へお問い合わせください。

また、ご内覧希望の場合は、こちらからご予約お願いいたします↓↓

https://docs.google.com/forms/d/e/1FAIpQLSefXwsYKryraVM4jtnLgcYtboUg3w-lx7tasftVA47E5jXUlQ/viewform?usp=pp_url&entry.267319544=<<買主番号>>&entry.2056434590=<<住居表示>>

★お急ぎで内覧をご希望の方は、直接お電話にてお申込みも承っております！
お気軽にお問い合わせください。

また、他社物件もご紹介できますので、気になる物件がございましたらお気軽にご連絡ください。

株式会社 いふう
TEL：097-533-2022
`,
      },
      // 11. 持家ヒアリング
      {
        id: 'buyer_owned_home',
        category: '買主',
        type: '持家ヒアリング',
        subject: '持家ヒアリング【株式会社いふうでございます】',
        content: `<<●氏名・会社名>>様

この度はお問い合わせありがとうございます。
株式会社いふうと申します。

現在お住まいの物件について、いくつかお伺いしたいことがございます。

1. 現在のお住まいは持家ですか？賃貸ですか？
2. 持家の場合、売却のご予定はございますか？
3. 住宅ローンの残債はございますか？

お手数ですが、ご回答いただけますと幸いです。

ご不明な点等ございましたら、お気軽にお問い合わせください。

株式会社 いふう
TEL：097-533-2022
`,
      },
    ];

    return templates;
  }

  /**
   * テンプレート内のプレースホルダーを置換
   * @param template テンプレート文字列
   * @param buyer 買主データ
   * @param employee 担当者データ
   * @returns 置換後の文字列
   */
  replacePlaceholders(
    template: string,
    buyer: any,
    employee?: any
  ): string {
    let result = template;

    // 買主情報の置換
    result = result.replace(/<<氏名>>/g, buyer.name || '');
    result = result.replace(/<<電話番号>>/g, buyer.phone_number || '');
    result = result.replace(/<<メールアドレス>>/g, buyer.email || '');
    result = result.replace(/<<買主番号>>/g, buyer.buyer_number || '');

    // 担当者情報の置換
    if (employee) {
      result = result.replace(/<<担当者名>>/g, employee.name || '');
      result = result.replace(/<<担当者電話番号>>/g, employee.phoneNumber || '');
      result = result.replace(/<<担当者メールアドレス>>/g, employee.email || '');
    }

    // 会社情報の置換
    result = result.replace(/<<会社名>>/g, '株式会社アットホーム');
    result = result.replace(/<<住所>>/g, '〒874-0000 大分県別府市○○町1-1-1');
    result = result.replace(/<<会社電話番号>>/g, '0977-00-0000');
    result = result.replace(/<<会社メールアドレス>>/g, 'info@athome-beppu.com');

    return result;
  }

  /**
   * SMS用に署名を簡略化
   * @param content 本文
   * @returns 簡略化された本文
   */
  simplifySmsSignature(content: string): string {
    // 署名部分を簡略化（最後の署名欄を会社名、住所、電話番号、メアドのみに）
    // 例: 複数行の署名を1行にまとめる
    let result = content;

    // 署名の簡略化パターン（必要に応じて調整）
    const signaturePattern = /---+\s*\n([\s\S]*?)$/;
    const match = result.match(signaturePattern);

    if (match) {
      // 署名部分を簡略化
      const simplifiedSignature = `
---
<<会社名>>
<<住所>>
TEL: <<会社電話番号>>
Email: <<会社メールアドレス>>`;

      result = result.replace(signaturePattern, simplifiedSignature);
    }

    return result;
  }
}

/**
 * 買主テンプレート型定義
 */
export interface BuyerTemplate {
  id: string;
  category: string; // 区分（買主）
  type: string; // 種別（D列）
  subject: string; // 件名（E列、メールの場合のみ）
  content: string; // 本文（F列）
}
