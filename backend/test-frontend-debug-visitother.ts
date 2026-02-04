/**
 * フロントエンドのデバッグ用スクリプト
 * 
 * ユーザーに以下の手順を実行してもらう:
 * 1. ブラウザで売主リストページを開く
 * 2. F12でデベロッパーツールを開く
 * 3. Consoleタブを開く
 * 4. 「その他(U)」ボタンをクリック
 * 5. コンソールに表示されるログをコピーして貼り付ける
 * 
 * 確認するログ:
 * - [fetchSellers] Before visitOther check: { ... }
 * - [fetchSellers] visitOther category selected with assignee: U
 * - [fetchSellers] params after setting visitAssignee: { ... }
 * - [listSellers] Requesting with params: { ... }
 * 
 * 期待される結果:
 * - selectedCategory: "visitOther"
 * - selectedVisitAssignee: "U"
 * - params.visitAssignee: "U"
 * 
 * もしこれらのログが表示されない場合:
 * - onCategorySelectコールバックが正しく呼ばれていない
 * - selectedCategoryまたはselectedVisitAssigneeの状態が正しく更新されていない
 */

console.log('このスクリプトは実行不要です。ユーザーにブラウザのコンソールログを確認してもらってください。');
