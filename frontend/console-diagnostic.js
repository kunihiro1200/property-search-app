// 物件タイプバッジ診断スクリプト
// ブラウザのConsoleに貼り付けて実行してください

console.log('=== 物件タイプバッジ診断開始 ===\n');

// 1. 物件カードの確認
const cards = document.querySelectorAll('.property-card');
console.log(`✓ 物件カード数: ${cards.length}`);

// 2. バッジ要素の確認
const badges = document.querySelectorAll('.property-type-badge');
console.log(`✓ バッジ要素数: ${badges.length}`);

if (badges.length === 0) {
  console.error('❌ バッジ要素が見つかりません！');
  console.log('\n【原因の可能性】');
  console.log('1. Reactコンポーネントがレンダリングされていない');
  console.log('2. CSSクラス名が間違っている');
  console.log('3. コンポーネントの条件分岐でバッジが表示されていない');
  
  // 画像コンテナの確認
  const imageContainers = document.querySelectorAll('.property-card-image-container');
  console.log(`\n画像コンテナ数: ${imageContainers.length}`);
  
  if (imageContainers.length > 0) {
    console.log('画像コンテナは存在します。バッジがレンダリングされていない可能性があります。');
    
    // 最初の画像コンテナの中身を確認
    console.log('\n最初の画像コンテナの内容:');
    console.log(imageContainers[0].innerHTML);
  }
} else {
  console.log('✓ バッジ要素が見つかりました\n');
  
  // 3. 各バッジの詳細情報
  badges.forEach((badge, i) => {
    const styles = window.getComputedStyle(badge);
    const rect = badge.getBoundingClientRect();
    
    console.log(`\n【バッジ ${i + 1}】`);
    console.log(`  テキスト: "${badge.textContent}"`);
    console.log(`  表示状態:`);
    console.log(`    display: ${styles.display}`);
    console.log(`    visibility: ${styles.visibility}`);
    console.log(`    opacity: ${styles.opacity}`);
    console.log(`  位置:`);
    console.log(`    position: ${styles.position}`);
    console.log(`    top: ${styles.top}`);
    console.log(`    left: ${styles.left}`);
    console.log(`    z-index: ${styles.zIndex}`);
    console.log(`  サイズ:`);
    console.log(`    width: ${rect.width}px`);
    console.log(`    height: ${rect.height}px`);
    console.log(`  色:`);
    console.log(`    background: ${styles.backgroundColor}`);
    console.log(`    color: ${styles.color}`);
    console.log(`  画面上の位置:`);
    console.log(`    top: ${rect.top}px`);
    console.log(`    left: ${rect.left}px`);
    console.log(`    画面内: ${rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth ? 'はい' : 'いいえ'}`);
    
    // 問題の診断
    if (styles.display === 'none') {
      console.warn(`  ⚠️ display: none が設定されています`);
    }
    if (styles.visibility === 'hidden') {
      console.warn(`  ⚠️ visibility: hidden が設定されています`);
    }
    if (parseFloat(styles.opacity) === 0) {
      console.warn(`  ⚠️ opacity: 0 が設定されています`);
    }
    if (rect.width === 0 || rect.height === 0) {
      console.warn(`  ⚠️ サイズが0です`);
    }
    if (rect.top < 0 || rect.left < 0) {
      console.warn(`  ⚠️ 画面外に配置されています`);
    }
  });
}

// 4. CSS変数の確認
console.log('\n\n【CSS変数の確認】');
const root = document.documentElement;
const rootStyles = getComputedStyle(root);
const cssVars = {
  'space-lg': rootStyles.getPropertyValue('--space-lg'),
  'space-md': rootStyles.getPropertyValue('--space-md'),
  'space-xs': rootStyles.getPropertyValue('--space-xs'),
  'radius-full': rootStyles.getPropertyValue('--radius-full'),
  'font-size-xs': rootStyles.getPropertyValue('--font-size-xs'),
  'font-weight-semibold': rootStyles.getPropertyValue('--font-weight-semibold'),
};

Object.entries(cssVars).forEach(([key, value]) => {
  if (value) {
    console.log(`  --${key}: ${value}`);
  } else {
    console.error(`  ❌ --${key}: 未定義`);
  }
});

// 5. CSSルールの確認
console.log('\n\n【CSSルールの確認】');
let foundRules = 0;
try {
  Array.from(document.styleSheets).forEach(sheet => {
    try {
      Array.from(sheet.cssRules || []).forEach(rule => {
        if (rule.selectorText && rule.selectorText.includes('property-type-badge')) {
          console.log(`  ✓ ${rule.selectorText}`);
          console.log(`    ${rule.style.cssText}`);
          foundRules++;
        }
      });
    } catch (e) {
      // CORS制限でアクセスできないスタイルシートはスキップ
    }
  });
  
  if (foundRules === 0) {
    console.error('  ❌ .property-type-badge のCSSルールが見つかりません');
  } else {
    console.log(`  ✓ ${foundRules}件のCSSルールが見つかりました`);
  }
} catch (error) {
  console.error('  ❌ CSSルールの確認中にエラー:', error.message);
}

// 6. APIレスポンスの確認
console.log('\n\n【APIレスポンスの確認】');
fetch('http://localhost:3000/api/public/properties?limit=3')
  .then(r => r.json())
  .then(data => {
    console.log(`  ✓ ${data.properties.length}件の物件を取得`);
    data.properties.forEach((p, i) => {
      console.log(`  物件 ${i + 1}:`);
      console.log(`    物件番号: ${p.property_number}`);
      console.log(`    物件タイプ: ${p.property_type}`);
      
      // タイプの妥当性チェック
      const validTypes = ['detached_house', 'apartment', 'land', 'other', 'income'];
      if (!validTypes.includes(p.property_type)) {
        console.error(`    ❌ 無効な物件タイプ: ${p.property_type}`);
      }
    });
    
    console.log('\n=== 診断完了 ===');
    console.log('\n【診断結果サマリー】');
    console.log(`物件カード: ${cards.length}件`);
    console.log(`バッジ要素: ${badges.length}件`);
    console.log(`CSSルール: ${foundRules}件`);
    console.log(`API物件: ${data.properties.length}件`);
    
    if (badges.length === 0) {
      console.log('\n【推奨アクション】');
      console.log('1. フロントエンドを再起動してください');
      console.log('   cd frontend');
      console.log('   npm run dev');
      console.log('2. ブラウザでスーパーリロード（Ctrl+Shift+R）');
      console.log('3. シークレットモードで確認');
    } else if (badges.length !== cards.length) {
      console.log('\n【推奨アクション】');
      console.log('バッジの数が物件カードの数と一致しません。');
      console.log('一部の物件でバッジがレンダリングされていない可能性があります。');
    } else {
      console.log('\n【推奨アクション】');
      console.log('バッジ要素は正しくレンダリングされています。');
      console.log('上記の詳細情報を確認して、表示されない原因を特定してください。');
    }
  })
  .catch(error => {
    console.error('  ❌ APIエラー:', error.message);
    console.log('\n【推奨アクション】');
    console.log('バックエンドが起動しているか確認してください');
    console.log('  cd backend');
    console.log('  npm run dev');
  });
