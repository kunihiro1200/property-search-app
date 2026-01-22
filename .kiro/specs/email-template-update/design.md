# Design Document

## Overview

通話モードページのEmail送信機能において、既存の7つのテンプレートを25種類の新しいテンプレートに差し替えます。各テンプレートは種別（ラベル）、件名、本文の3つの要素で構成され、本文内のプレースホルダーは売主・物件・従業員データで動的に置換されます。

## Architecture

既存のアーキテクチャを維持し、フロントエンドのテンプレート定義のみを更新します：

1. **Frontend (CallModePage.tsx)**: テンプレート定義配列を新しい25種類に置き換え
2. **Backend (emails.ts)**: プレースホルダー置換ロジックを拡張
3. **UI Components**: 既存の確認ダイアログとドロップダウンを再利用

## Components and Interfaces

### Email Template Structure

```typescript
interface EmailTemplate {
  id: string;           // テンプレート識別子（例: 'visit_thank_you'）
  label: string;        // 種別（ドロップダウンに表示される主要ラベル）
  subject: string;      // 件名
  content: string;      // 本文（プレースホルダーを含む）
}
```

### Placeholder Mapping

プレースホルダーとデータソースのマッピング:

| プレースホルダー | データソース | 説明 |
|---|---|---|
| `<<名前(漢字のみ）>>` | `seller.name` | 売主氏名（漢字のみ） |
| `<<物件所在地>>` | `property.address` | 物件住所 |
| `<<査定額1>>` | `seller.valuationAmount1 / 10000` | 査定額1（万円） |
| `<<査定額2>>` | `seller.valuationAmount2 / 10000` | 査定額2（万円） |
| `<<査定額3>>` | `seller.valuationAmount3 / 10000` | 査定額3（万円） |
| `<<土（㎡）>>` | `property.landArea` | 土地面積 |
| `<<建（㎡）>>` | `property.buildingArea` | 建物面積 |
| `<<築年不明>>` | `property.buildYear ? '築${year}年' : '築年不明'` | 築年情報 |
| `<<営担>>` | `assignedEmployee.name` | 担当営業名 |
| `<<担当名（営業）名前>>` | `assignedEmployee.name` | 担当営業名（フルネーム） |
| `<<担当名（営業）電話番号>>` | `assignedEmployee.phoneNumber` | 担当営業電話番号 |
| `<<担当名（営業）メールアドレス>>` | `assignedEmployee.email` | 担当営業メールアドレス |
| `<<訪問日>>` | `seller.appointmentDate` | 訪問予定日 |
| `<<時間>>` | `seller.appointmentDate` | 訪問予定時刻 |
| `<<競合名>>` | `seller.competitors` | 競合会社名 |
| `<<お客様紹介文言>>` | カスタムテキスト | お客様紹介文 |
| `<<種別>>` | `property.propertyType` | 物件種別 |
| `<<状況（売主）>>` | `property.sellerSituation` | 売主状況 |

## Data Models

### New Email Templates (25 templates)

```typescript
const emailTemplates: EmailTemplate[] = [
  {
    id: 'visit_thank_you',
    label: '訪問査定後御礼メール',
    subject: '御礼（㈱いふうの<<営担>>でございます。）',
    content: `<<名前(漢字のみ）>>様

お世話になっております。㈱いふうの<<営担>>です。

本日は、訪問査定のために貴重な時間を割いていただき、誠にありがとうございました。

いくつかの不動産会社のお話を聞かれて、どこと契約を結ぶかお考えだと思います。

弊社としましては、<<名前(漢字のみ）>>様の大切な不動産の売却のお手伝いをいふうスタッフ一同で精一杯努めてまいりたいと思っております。

ご検討いただく中で、ご不明な点や弊社で何かお手伝いできることがございましたら、どうぞお気軽にお申し付けくださいませ。

今後ともよろしくお願い致します。

***************************
株式会社 いふう
（実績はこちら↓
https://www.google.com/maps/d/edit?mid=18nB7nxEC6XQxJ6FDNw0rgwGkrIrC6Io&usp=sharing）
<<担当名（営業）名前>>
〒870-0044大分市舞鶴町1丁目3-30
TEL：<<担当名（営業）電話番号>>
FAX：097-529-7160
MAIL: <<担当名（営業）メールアドレス>>
HP：https://ifoo-oita.com/
***************************`
  },
  {
    id: 'web_meeting_offer',
    label: 'WEB打合せどうですかメール',
    subject: '<<物件所在地>>の件で売却までの流れのご説明',
    content: `<<名前(漢字のみ）>>様

お世話になっております。㈱いふうです。

<<物件所在地>>の訪問打合せが難しいとのことで、WEBで下記のご説明を差し上げることも可能です。

・売却までの流れ
・税金対策

宜しければ、このメールに日程の件ご連絡いただくか、下記URLよりWEB打合せのご予約をしていただければと思います。

http://bit.ly/44U9pjl

弊社としましては、<<名前(漢字のみ）>>様の大切な不動産の売却のお手伝いをいふうスタッフ一同で精一杯努めてまいりたいと思っております。

ご検討いただく中で、ご不明な点や弊社で何かお手伝いできることがございましたら、どうぞお気軽にお申し付けくださいませ。

今後ともよろしくお願い致します。

***************************
株式会社 いふう
（実績はこちら：bit.ly/4l8lWFF　）
〒870-0044大分市舞鶴町1丁目3-30
TEL：097-533-2022
FAX：097-529-7160
MAIL：tenant@ifoo-oita.com
HP：https://ifoo-oita.com/
採用HP：https://en-gage.net/ifoo-oita/
***************************`
  },
  {
    id: 'valuation_inheritance',
    label: '査定額案内メール(相続）',
    subject: '<<物件所在地>>の机上査定のご案内（株式会社いふう）',
    content: `<<名前(漢字のみ）>> 様

この度は査定依頼を頂きまして誠に有難うございます。
大分市舞鶴町にございます、不動産会社の"株式会社いふう"です。

机上査定は以下の通りとなっております。※土地<<土（㎡）>>㎡、建物<<建（㎡）>>㎡で算出しております。

＜相場価格＞　　　<<査定額1>>万円～<<査定額2>>万円（3ヶ月で売却可能）
＜チャレンジ価格＞<<査定額2>>万円～<<査定額3>>万円（6ヶ月以上も可）
＜買取価格＞　　　ご訪問後査定させて頂くことが可能です。

<<築年不明>>

【訪問査定をご希望の方】（電話でも可能です）
★無料です！所要時間は1時間程度です。↓こちらよりご予約可能です！
★遠方の方はWEB打合せも可能となっておりますので、ご連絡下さい！
http://bit.ly/44U9pjl

↑↑訪問査定はちょっと・・・でも来店して、「売却の流れの説明を聞きたい！！」という方もぜひご予約ください！！

机上査定はあくまで固定資産税路線価や周辺事例の平均値で自動計算されております。
チャレンジ価格以上の金額での売出も可能ですが、売却までにお時間がかかる可能性があります。ご了承ください。

●当該エリアは、子育て世代のファミリー層から人気で問い合せの多い地域となっております。
●13名のお客様が周辺で物件を探されています。

売却には自信がありますので、是非当社でご紹介させて頂ければと思います。

売却の流れから良くあるご質問をまとめた資料はこちらになります。
chrome-extension://efaidnbmnnnibpcajpcglclefindmkaj/https://ifoo-oita.com/testsite/wp-content/uploads/2020/12/d58af49c9c6dd87c7aee1845265204b6.pdf

なお、上記は概算での金額であり、正式には訪問査定後となりますのでご了承ください。

【不動産の相続について】
◆相続登記の義務化（2024年4月～）
　相続から3年以内に申請をしないと10万円以下の罰金の対象です！
2024年4月から施行ですが、過去にさかのぼって罰金の対象となります。

相続登記手続きに強い司法書士事務所のご紹介も承っておりますので、ご相談ください。
（紹介料等は一切いただいておりませんので、ご安心ください。）

また、不動産を売却した際には譲渡所得税というものが課税されます。
相続物件については、相続日から起算して3年以内の売却で3000万円の特別控除制度がございます。
詳細はお気軽にお問い合わせください。

相続登記について、流れや詳細情報をまとめた法務局のHPをご参考になさって下さい。
https://houmukyoku.moj.go.jp/homu/page7_000001_00014.html　

***************************
株式会社 いふう
（実績はこちら：bit.ly/4l8lWFF）　
〒870-0044大分市舞鶴町1丁目3-30
TEL：097-533-2022
FAX：097-529-7160
MAIL：tenant@ifoo-oita.com
HP：https://ifoo-oita.com/
採用HP：https://en-gage.net/ifoo-oita/
店休日：毎週水曜日　年末年始、GW、盆
***************************`
  },
  {
    id: 'valuation_non_inheritance',
    label: '査定額案内メール(相続以外）',
    subject: '<<物件所在地>>の机上査定のご案内（株式会社いふう）',
    content: `<<名前(漢字のみ）>>様

この度は査定依頼を頂きまして誠に有難うございます。
大分市舞鶴町にございます、不動産会社の株式会社いふうです。

机上査定は以下の通りとなっております。※土地<<土（㎡）>>㎡、建物<<建（㎡）>>㎡で算出しております。

＜相場価格＞　　　<<査定額1>>万円～<<査定額2>>万円（3ヶ月で売却可能）
＜チャレンジ価格＞<<査定額2>>万円～<<査定額3>>万円（6ヶ月以上も可）
＜買取価格＞　　　ご訪問後査定させて頂くことが可能です。

<<築年不明>>

【訪問査定をご希望の方】（電話でも可能です）
★無料です！所要時間は1時間程度です。↓こちらよりご予約可能です！
★遠方の方はWEB打合せも可能となっておりますので、ご連絡下さい！
http://bit.ly/44U9pjl

↑↑訪問査定はちょっと・・・でも来店して、「売却の流れの説明を聞きたい！！」という方もぜひご予約ください！！

机上査定はあくまで固定資産税路線価や周辺事例の平均値で自動計算されております。
チャレンジ価格以上の金額での売出も可能ですが、売却までにお時間がかかる可能性があります。ご了承ください。

●当該エリアは、子育て世代のファミリー層から人気で問い合せの多い地域となっております。
●13名のお客様が周辺で物件を探されています。

売却には自信がありますので、是非当社でご紹介させて頂ければと思います。

なお、上記は概算での金額であり、正式には訪問査定後となりますのでご了承ください。

訪問査定は30分程度で終わり、無料となっておりますのでお気軽にお申し付けください。

売却の流れから良くあるご質問をまとめた資料はこちらになります。
https://ifoo-oita.com/testsite/wp-content/uploads/2020/12/d58af49c9c6dd87c7aee1845265204b6.pdf

また、不動産を売却した際には譲渡所得税というものが課税されます。
控除方法もございますが、住宅ローン控除との併用は出来ません。詳細はお問い合わせくださいませ。

不動産売却のほか、住み替え先のご相談や物件紹介などについてもお気軽にご相談ください。

何卒よろしくお願い致します。

***************************
株式会社 いふう
（実績はこちら：bit.ly/4l8lWFF　）
〒870-0044大分市舞鶴町1丁目3-30
TEL：097-533-2022
FAX：097-529-7160
MAIL：tenant@ifoo-oita.com
HP：https://ifoo-oita.com/
採用HP：https://en-gage.net/ifoo-oita/
店休日：毎週水曜日　年末年始、GW、盆
***************************`
  },
  {
    id: 'empty_template',
    label: '空',
    subject: '<<物件所在地>>の査定の件',
    content: `<<名前(漢字のみ）>> 様

この度は査定依頼を頂きまして誠に有難うございます。
大分市舞鶴町にございます、不動産会社の株式会社いふうです。

よろしくお願い申し上げます。

***************************
株式会社 いふう
（実績はこちら：bit.ly/4l8lWFF）
〒870-0044大分市舞鶴町1丁目3-30
TEL：097-533-2022
FAX：097-529-7160
MAIL：tenant@ifoo-oita.com
HP：https://ifoo-oita.com/
採用HP：https://en-gage.net/ifoo-oita/
店休日：毎週水曜日 年末年始、GW、盆
***************************`
  }
  // ... 残り20テンプレートは実装タスクで追加
];
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: All placeholders are replaced

*For any* email template and any valid seller/property data, when the template is populated, all placeholders in the content should be replaced with actual data values (or appropriate defaults for missing data).

**Validates: Requirements 1.2, 1.3, 3.1-3.10**

### Property 2: Template dropdown displays all new templates

*For any* rendering of the email dropdown, the dropdown should contain exactly 25 template options with the new template IDs, and should not contain any of the 7 old template IDs.

**Validates: Requirements 1.1, 5.1, 5.2, 5.3**

### Property 3: Email sending triggers activity log

*For any* email template sent to a seller, the system should create an activity log entry with type 'email' containing the template label and timestamp.

**Validates: Requirements 1.5**

### Property 4: Confirmation dialog shows populated content

*For any* email template selection, the confirmation dialog should display the subject line and body with all placeholders replaced before sending.

**Validates: Requirements 4.1, 4.2, 4.3**

### Property 5: Cancel prevents email sending

*For any* email template selection, when the user clicks cancel in the confirmation dialog, no email should be sent and no activity log should be created.

**Validates: Requirements 4.5**

### Property 6: Template UI displays three information levels

*For any* email template in the dropdown, the menu item should display the label (種別), subject (件名), and a preview of the content (本文).

**Validates: Requirements 2.1, 2.2, 2.3**

### Property 7: Missing data handled gracefully

*For any* email template with placeholders, when seller or property data is missing or null, the system should not crash and should either show default text or leave the placeholder blank.

**Validates: Requirements 3.10**

## Error Handling

### Missing Data Scenarios

1. **Missing Seller Name**: Use empty string or "お客様"
2. **Missing Property Address**: Use "物件" or empty string
3. **Missing Valuation Amounts**: Use "-" or "未設定"
4. **Missing Employee Info**: Use "担当者" or empty string
5. **Missing Dates**: Use appropriate date format or "-"

### Template Selection Errors

1. **Invalid Template ID**: Log error and show user-friendly message
2. **Email Send Failure**: Show error alert and do not create activity log
3. **Network Errors**: Retry logic with user notification

## Testing Strategy

### Unit Tests

1. Test placeholder replacement function with various data combinations
2. Test template array contains exactly 25 templates
3. Test old template IDs are not present
4. Test confirmation dialog rendering
5. Test cancel button behavior
6. Test activity log creation after email send

### Property-Based Tests

We will use a property-based testing library appropriate for TypeScript/React (such as fast-check) to verify the correctness properties defined above.

Each property-based test should:
- Run a minimum of 100 iterations
- Generate random seller and property data
- Verify the property holds across all generated inputs
- Be tagged with a comment referencing the design document property

Example test structure:
```typescript
// Feature: email-template-update, Property 1: All placeholders are replaced
test('all placeholders are replaced with actual data', () => {
  fc.assert(
    fc.property(
      sellerArbitrary,
      propertyArbitrary,
      templateArbitrary,
      (seller, property, template) => {
        const populated = populateTemplate(template, seller, property);
        // Verify no placeholders remain (except for intentionally missing data)
        return !populated.includes('<<') || hasValidDefaults(populated);
      }
    ),
    { numRuns: 100 }
  );
});
```



## Implementation Details

### Frontend Changes (CallModePage.tsx)

1. **Replace emailTemplates array**: 既存の7テンプレートを25テンプレートに置き換え
2. **Update dropdown rendering**: MenuItemのスタイリングを維持（3階層の情報表示）
3. **Maintain existing handlers**: `handleEmailTemplateSelect`, `handleConfirmSend`, `handleCancelSend`は変更不要

### Backend Changes (emails.ts route)

1. **Extend placeholder replacement logic**: 新しいプレースホルダーに対応
2. **Add helper functions**: 
   - `formatBuildYear(buildYear)`: 築年情報のフォーマット
   - `formatValuationAmount(amount)`: 査定額を万円に変換
   - `getAssignedEmployee(sellerId)`: 担当者情報の取得
3. **Error handling**: 欠損データの適切な処理

### Placeholder Replacement Function

```typescript
function replacePlaceholders(
  template: string,
  seller: Seller,
  property: PropertyInfo | null,
  employee: Employee | null
): string {
  let result = template;
  
  // 売主情報
  result = result.replace(/<<名前\(漢字のみ）>>/g, seller.name || 'お客様');
  
  // 物件情報
  if (property) {
    result = result.replace(/<<物件所在地>>/g, property.address || '物件');
    result = result.replace(/<<土（㎡）>>/g, property.landArea?.toString() || '-');
    result = result.replace(/<<建（㎡）>>/g, property.buildingArea?.toString() || '-');
    result = result.replace(/<<種別>>/g, getPropertyTypeLabel(property.propertyType));
    result = result.replace(/<<状況（売主）>>/g, property.sellerSituation || '-');
    
    // 築年情報
    const buildYearText = property.buildYear 
      ? `築${property.buildYear}年` 
      : '築年不明';
    result = result.replace(/<<築年不明>>/g, buildYearText);
  }
  
  // 査定額
  if (seller.valuationAmount1) {
    result = result.replace(/<<査定額1>>/g, Math.round(seller.valuationAmount1 / 10000).toString());
  }
  if (seller.valuationAmount2) {
    result = result.replace(/<<査定額2>>/g, Math.round(seller.valuationAmount2 / 10000).toString());
  }
  if (seller.valuationAmount3) {
    result = result.replace(/<<査定額3>>/g, Math.round(seller.valuationAmount3 / 10000).toString());
  }
  
  // 担当者情報
  if (employee) {
    result = result.replace(/<<営担>>/g, employee.name || '担当者');
    result = result.replace(/<<担当名（営業）名前>>/g, employee.name || '担当者');
    result = result.replace(/<<担当名（営業）電話番号>>/g, employee.phoneNumber || '-');
    result = result.replace(/<<担当名（営業）メールアドレス>>/g, employee.email || '-');
  }
  
  // 訪問日時
  if (seller.appointmentDate) {
    const date = new Date(seller.appointmentDate);
    result = result.replace(/<<訪問日>>/g, formatDate(date));
    result = result.replace(/<<時間>>/g, formatTime(date));
  }
  
  // 競合
  if (seller.competitors) {
    result = result.replace(/<<競合名>>/g, seller.competitors);
  }
  
  return result;
}
```

## Migration Strategy

### Phase 1: Add New Templates (Backward Compatible)

1. Add all 25 new templates to the emailTemplates array
2. Keep old templates temporarily for backward compatibility
3. Deploy to production
4. Monitor for any issues

### Phase 2: Remove Old Templates

1. Remove the 7 old templates from the array
2. Update any hardcoded references to old template IDs
3. Deploy to production
4. Verify dropdown only shows new templates

### Rollback Plan

If issues are discovered:
1. Revert to previous version with old templates
2. Investigate and fix issues
3. Re-deploy with fixes

## Performance Considerations

1. **Template Array Size**: 25 templates is still small enough for efficient rendering
2. **Placeholder Replacement**: O(n) complexity where n is template length - acceptable for email-sized text
3. **Dropdown Rendering**: Material-UI Select handles 25 options efficiently
4. **Memory Usage**: Minimal impact - templates are static strings

## Security Considerations

1. **Email Injection**: Sanitize all user input before inserting into templates
2. **XSS Prevention**: Escape HTML characters in placeholder values
3. **Data Privacy**: Ensure email content doesn't expose sensitive information unintentionally
4. **Access Control**: Verify user has permission to send emails to the seller

## Accessibility

1. **Keyboard Navigation**: Dropdown should be fully keyboard accessible
2. **Screen Readers**: Template labels should be descriptive
3. **Focus Management**: Confirmation dialog should trap focus appropriately
4. **Color Contrast**: Ensure text in dropdown meets WCAG standards
