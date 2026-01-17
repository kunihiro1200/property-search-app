/**
 * メール構造テストスクリプト
 * 画像付きメールの実際の構造を確認（メール送信なし）
 */

async function testEmailStructure() {
  console.log('🧪 Testing email structure with embedded images...\n');

  // テスト用のHTML（画像が本文の途中に配置されている）
  const testHtml = `
<p>こんにちは、テストメールです。</p>
<p>最初の段落の後に画像1があります：</p>
<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" alt="test-image-1" style="max-width: 100%; height: auto;">
<p>画像1の後のテキストです。</p>
<p>次に画像2があります：</p>
<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==" alt="test-image-2" style="max-width: 100%; height: auto;">
<p>画像2の後のテキストです。これが最後の段落です。</p>
`;

  console.log('📄 Original HTML:');
  console.log(testHtml);
  console.log('\n' + '='.repeat(80) + '\n');

  // 画像を抽出してCID参照に置き換える処理をシミュレート
  const inlineImages: Array<{ filename: string; mimeType: string; cid: string; size: number }> = [];
  let processedBody = testHtml;
  let imageIndex = 0;

  const imageRegex = /<img([^>]*)src="data:image\/([^;]+);base64,([^"]+)"([^>]*)>/gi;

  processedBody = processedBody.replace(imageRegex, (fullMatch, beforeSrc, mimeType, base64Data, afterSrc) => {
    try {
      const imageBuffer = Buffer.from(base64Data, 'base64');
      const cid = `image-${imageIndex}`;

      inlineImages.push({
        filename: `embedded-image-${imageIndex}.${mimeType}`,
        mimeType: `image/${mimeType}`,
        cid: cid,
        size: imageBuffer.length,
      });

      console.log(`✅ Extracted embedded image ${imageIndex}: ${imageBuffer.length} bytes, CID: ${cid}`);
      imageIndex++;

      // data:image/...をcid:に置き換え
      return `<img${beforeSrc}src="cid:${cid}"${afterSrc}>`;
    } catch (error) {
      console.error(`❌ Error extracting embedded image ${imageIndex}:`, error);
      return fullMatch;
    }
  });

  console.log(`\n✅ Extracted ${inlineImages.length} embedded images from body`);
  console.log('\n📄 Processed body HTML (CID references):');
  console.log(processedBody);
  console.log('\n' + '='.repeat(80) + '\n');

  // CID参照の位置を確認
  const cidMatches = processedBody.match(/src="cid:[^"]+"/g);
  console.log('🔍 CID references found:', cidMatches);

  // 最終的なHTML構造を表示
  const finalHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Meiryo', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 10px 0;
    }
  </style>
</head>
<body>
${processedBody}
</body>
</html>`;

  console.log('\n📄 Final HTML body (first 1000 chars):');
  console.log(finalHtml.substring(0, 1000));
  console.log('\n' + '='.repeat(80) + '\n');

  console.log('📊 Summary:');
  console.log(`  - Original images: ${inlineImages.length}`);
  console.log(`  - CID references: ${cidMatches?.length || 0}`);
  console.log(`  - Images extracted successfully: ${inlineImages.length === cidMatches?.length ? '✅' : '❌'}`);

  console.log('\n💡 画像の位置確認:');
  const lines = processedBody.split('\n');
  lines.forEach((line, index) => {
    if (line.includes('cid:')) {
      console.log(`  Line ${index + 1}: ${line.trim()}`);
    }
  });

  console.log('\n✅ テスト完了！');
  console.log('\n📝 次のステップ:');
  console.log('  1. アプリケーションのUIからメールを送信してテスト');
  console.log('  2. バックエンドのログで上記と同じ構造が出力されることを確認');
  console.log('  3. 受信したメールで画像の位置を確認');
}

// スクリプト実行
testEmailStructure().catch(console.error);
