// ブラウザのコンソールで実行する診断スクリプト
// 使い方: 
// 1. http://localhost:5173/public/properties を開く
// 2. F12で開発者ツールを開く
// 3. このスクリプトをコンソールにコピー&ペーストして実行

(function diagnoseFilterButtons() {
  console.log('=== 物件タイプフィルターボタン診断（改善版） ===\n');

  // ボタンコンテナを探す
  const container = document.querySelector('.property-type-filter-buttons');
  
  if (!container) {
    console.error('❌ .property-type-filter-buttons が見つかりません');
    console.log('\n🔍 詳細診断:');
    
    // Reactコンポーネントがマウントされているか確認
    const root = document.getElementById('root');
    if (!root) {
      console.error('  ❌ #root 要素が見つかりません - Reactアプリが起動していない可能性があります');
    } else {
      console.log('  ✅ #root 要素は存在します');
      console.log('  📝 #root の内容:', root.innerHTML.substring(0, 200) + '...');
    }
    
    // 「物件を絞り込む」セクションを探す
    const filterSection = Array.from(document.querySelectorAll('div')).find(
      el => el.textContent.includes('物件を絞り込む')
    );
    
    if (filterSection) {
      console.log('  ✅ 「物件を絞り込む」セクションは見つかりました');
      console.log('  📝 セクションの内容:', filterSection.innerHTML.substring(0, 300) + '...');
    } else {
      console.error('  ❌ 「物件を絞り込む」セクションが見つかりません');
    }
    
    console.log('\n💡 推奨アクション:');
    console.log('  1. ページを完全にリロード（Ctrl+Shift+R または Cmd+Shift+R）');
    console.log('  2. 開発サーバーを再起動');
    console.log('  3. ブラウザのキャッシュをクリア');
    return;
  }

  console.log('✅ ボタンコンテナが見つかりました\n');
  
  // コンテナの可視性を確認
  const rect = container.getBoundingClientRect();
  console.log('📐 コンテナの位置とサイズ:');
  console.log('  top:', Math.round(rect.top), 'px');
  console.log('  left:', Math.round(rect.left), 'px');
  console.log('  width:', Math.round(rect.width), 'px');
  console.log('  height:', Math.round(rect.height), 'px');
  console.log('  画面内に表示:', rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth ? '✅ はい' : '⚠️ いいえ（スクロールが必要かもしれません）');
  console.log('');

  // 計算済みスタイルを取得
  const computedStyle = window.getComputedStyle(container);
  
  console.log('📊 計算済みスタイル:');
  console.log('  display:', computedStyle.display);
  console.log('  visibility:', computedStyle.visibility);
  console.log('  opacity:', computedStyle.opacity);
  console.log('  flex-direction:', computedStyle.flexDirection);
  console.log('  flex-wrap:', computedStyle.flexWrap);
  console.log('  gap:', computedStyle.gap);
  console.log('  width:', computedStyle.width);
  console.log('  height:', computedStyle.height);
  console.log('  position:', computedStyle.position);
  console.log('  z-index:', computedStyle.zIndex);
  console.log('');

  // 期待値との比較
  const issues = [];
  
  // 可視性チェック
  if (computedStyle.display === 'none') {
    issues.push('❌ display: none が設定されています - コンポーネントが非表示です');
  } else if (computedStyle.visibility === 'hidden') {
    issues.push('❌ visibility: hidden が設定されています - コンポーネントが非表示です');
  } else if (parseFloat(computedStyle.opacity) === 0) {
    issues.push('❌ opacity: 0 が設定されています - コンポーネントが透明です');
  } else {
    console.log('✅ コンポーネントは可視状態です');
  }
  
  if (computedStyle.display !== 'inline-flex' && computedStyle.display !== 'flex') {
    issues.push(`⚠️ display が "${computedStyle.display}" です（期待値: flex）`);
  } else {
    console.log('✅ display は正しく設定されています');
  }

  if (computedStyle.flexDirection !== 'row') {
    issues.push(`⚠️ flex-direction が "${computedStyle.flexDirection}" です（期待値: row）`);
  } else {
    console.log('✅ flex-direction は正しく設定されています');
  }

  if (computedStyle.flexWrap !== 'nowrap') {
    issues.push(`⚠️ flex-wrap が "${computedStyle.flexWrap}" です（期待値: nowrap）`);
  } else {
    console.log('✅ flex-wrap は正しく設定されています');
  }

  console.log('');

  // ボタンの配置を確認
  const buttons = container.querySelectorAll('.filter-button');
  console.log(`📍 ボタン数: ${buttons.length} (期待値: 4)`);
  
  if (buttons.length === 0) {
    issues.push('❌ ボタンが1つも見つかりません - Reactコンポーネントがレンダリングされていない可能性があります');
  } else if (buttons.length !== 4) {
    issues.push(`⚠️ ボタン数が ${buttons.length} です（期待値: 4）`);
  }
  
  if (buttons.length > 0) {
    console.log('\n🔘 各ボタンの詳細:');
    buttons.forEach((button, index) => {
      const btnRect = button.getBoundingClientRect();
      const btnStyle = window.getComputedStyle(button);
      console.log(`  ボタン ${index + 1}: "${button.textContent}"`);
      console.log(`    位置: top=${Math.round(btnRect.top)}, left=${Math.round(btnRect.left)}`);
      console.log(`    サイズ: ${Math.round(btnRect.width)}x${Math.round(btnRect.height)}px`);
      console.log(`    display: ${btnStyle.display}, visibility: ${btnStyle.visibility}`);
      
      // ボタンが画面外にあるかチェック
      if (btnRect.width === 0 || btnRect.height === 0) {
        issues.push(`❌ ボタン ${index + 1} のサイズが0です`);
      }
    });
    
    console.log('');
    
    const firstButton = buttons[0];
    const lastButton = buttons[buttons.length - 1];
    const firstRect = firstButton.getBoundingClientRect();
    const lastRect = lastButton.getBoundingClientRect();
    
    // ボタンが横並びかチェック
    const isHorizontal = Math.abs(firstRect.top - lastRect.top) < 5;
    if (isHorizontal) {
      console.log('✅ ボタンは横並びになっています');
      console.log(`  横幅の合計: 約 ${Math.round(lastRect.right - firstRect.left)}px`);
    } else {
      issues.push('❌ ボタンが縦並びになっています');
      console.log(`  最初のボタンのtop: ${Math.round(firstRect.top)}`);
      console.log(`  最後のボタンのtop: ${Math.round(lastRect.top)}`);
      console.log(`  差分: ${Math.round(Math.abs(firstRect.top - lastRect.top))}px`);
    }
  }

  console.log('');

  // 親要素のスタイルを確認
  const parent = container.parentElement;
  if (parent) {
    const parentStyle = window.getComputedStyle(parent);
    console.log('👨 親要素のスタイル:');
    console.log('  display:', parentStyle.display);
    console.log('  flex-direction:', parentStyle.flexDirection);
    console.log('  width:', parentStyle.width);
    
    if (parentStyle.display === 'flex' && parentStyle.flexDirection === 'column') {
      console.log('  ℹ️ 親要素は flex-col です（これは正常です）');
    }
  }

  console.log('');

  // CSSファイルの読み込み確認
  const stylesheets = Array.from(document.styleSheets);
  const hasFilterButtonsCSS = stylesheets.some(sheet => {
    try {
      const rules = Array.from(sheet.cssRules || []);
      return rules.some(rule => 
        rule.selectorText && rule.selectorText.includes('property-type-filter-buttons')
      );
    } catch (e) {
      return false;
    }
  });

  if (hasFilterButtonsCSS) {
    console.log('✅ PropertyTypeFilterButtons.css が読み込まれています');
  } else {
    issues.push('❌ PropertyTypeFilterButtons.css が読み込まれていない可能性があります');
  }

  console.log('');

  // 問題のまとめ
  if (issues.length > 0) {
    console.log('🔴 検出された問題:');
    issues.forEach(issue => console.log('  ' + issue));
    console.log('');
  } else {
    console.log('🎉 問題は検出されませんでした');
    console.log('   ボタンは正しく表示されているはずです');
    console.log('');
  }
  
  // 推奨アクション
  console.log('💡 推奨アクション:');
  if (issues.some(i => i.includes('display: none') || i.includes('visibility: hidden'))) {
    console.log('  1. CSSファイルが正しく読み込まれているか確認');
    console.log('  2. 他のCSSルールが上書きしていないか確認');
    console.log('  3. ブラウザの開発者ツールでElementsタブを確認');
  } else if (issues.some(i => i.includes('ボタンが1つも見つかりません'))) {
    console.log('  1. Reactコンポーネントが正しくマウントされているか確認');
    console.log('  2. ページを完全にリロード（Ctrl+Shift+R）');
    console.log('  3. 開発サーバーを再起動');
  } else if (issues.some(i => i.includes('縦並び'))) {
    console.log('  1. PropertyTypeFilterButtons.css が読み込まれているか確認');
    console.log('  2. flex-direction: row が適用されているか確認');
    console.log('  3. 親要素のスタイルが影響していないか確認');
  } else {
    console.log('  1. ブラウザのキャッシュをクリア（Ctrl+Shift+Delete）');
    console.log('  2. ページを完全にリロード（Ctrl+Shift+R）');
    console.log('  3. 開発サーバーを再起動');
  }

  console.log('\n=== 診断完了 ===');
  
  // 視覚的にハイライト
  if (container) {
    container.style.outline = '3px solid red';
    container.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
    setTimeout(() => {
      container.style.outline = '';
      container.style.backgroundColor = '';
    }, 3000);
    console.log('ℹ️ ボタンコンテナを3秒間赤枠でハイライトしました');
  }
  
  // ボタンもハイライト
  if (buttons.length > 0) {
    buttons.forEach(btn => {
      btn.style.outline = '2px solid blue';
    });
    setTimeout(() => {
      buttons.forEach(btn => {
        btn.style.outline = '';
      });
    }, 3000);
    console.log('ℹ️ 各ボタンを3秒間青枠でハイライトしました');
  }
})();
