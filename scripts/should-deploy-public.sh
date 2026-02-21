#!/bin/bash

# 公開サイトプロジェクト用のIgnored Build Stepスクリプト
# 管理画面専用ファイルのみが変更された場合はデプロイをスキップ

echo "🔍 Checking if public site deployment should proceed..."

# 前回のデプロイから変更されたファイルを取得
CHANGED_FILES=$(git diff --name-only HEAD^ HEAD 2>/dev/null || git diff --name-only HEAD)

# 変更がない場合はデプロイを実行
if [ -z "$CHANGED_FILES" ]; then
  echo "🚀 No changed files detected. Proceeding with deployment."
  exit 1
fi

echo "📝 Changed files:"
echo "$CHANGED_FILES"

# 管理画面専用ファイルのパターン
ADMIN_ONLY_PATTERNS=(
  "frontend/src/pages/SellerListPage.tsx"
  "frontend/src/pages/SellerDetailPage.tsx"
  "frontend/src/pages/CallModePage.tsx"
  "frontend/src/pages/PropertyListPage.tsx"
  "frontend/src/pages/PropertyDetailPage.tsx"
  "frontend/src/pages/BuyerListPage.tsx"
  "frontend/src/pages/BuyerDetailPage.tsx"
  "frontend/src/pages/BuyerNearbyPropertiesPage.tsx"
  "frontend/src/pages/WorkTaskListPage.tsx"
  "frontend/src/pages/NewBuyerPage.tsx"
  "frontend/src/components/Seller"
  "frontend/src/components/Buyer"
  "frontend/src/components/WorkTask"
  "frontend/src/components/CallMode"
)

# 変更されたファイルが管理画面専用ファイルのみかチェック
ONLY_ADMIN_CHANGES=true
HAS_FRONTEND_CHANGES=false

while IFS= read -r file; do
  # 空行をスキップ
  if [ -z "$file" ]; then
    continue
  fi
  
  # frontendディレクトリの変更があるかチェック
  if [[ $file =~ ^frontend/ ]]; then
    HAS_FRONTEND_CHANGES=true
    
    # PublicProperty*は公開サイト専用なので、管理画面専用ではない
    if [[ $file =~ frontend/src/components/PublicProperty ]]; then
      ONLY_ADMIN_CHANGES=false
      break
    fi
    
    # PublicPropertyListPage.tsxとPublicPropertyDetailPage.tsxは公開サイト専用
    if [[ $file =~ frontend/src/pages/PublicPropertyListPage.tsx ]] || [[ $file =~ frontend/src/pages/PublicPropertyDetailPage.tsx ]]; then
      ONLY_ADMIN_CHANGES=false
      break
    fi
    
    # 管理画面専用ファイルかチェック
    IS_ADMIN_ONLY=false
    for pattern in "${ADMIN_ONLY_PATTERNS[@]}"; do
      if [[ $file =~ $pattern ]]; then
        IS_ADMIN_ONLY=true
        break
      fi
    done
    
    # 管理画面専用ファイル以外の変更があれば、公開サイトをデプロイ
    if [[ $IS_ADMIN_ONLY == false ]]; then
      ONLY_ADMIN_CHANGES=false
      break
    fi
  else
    # frontendディレクトリ以外の変更は公開サイトに影響する可能性がある
    ONLY_ADMIN_CHANGES=false
    break
  fi
done <<< "$CHANGED_FILES"

# frontendディレクトリの変更がない場合はデプロイを実行
if [[ $HAS_FRONTEND_CHANGES == false ]]; then
  echo "🚀 No frontend changes detected. Proceeding with deployment."
  exit 1
fi

# 管理画面専用ファイルのみが変更された場合はデプロイをスキップ
if [[ $ONLY_ADMIN_CHANGES == true ]]; then
  echo "✅ Only admin files changed. Skipping public site deployment."
  exit 0
else
  echo "🚀 Public site files or shared files changed. Proceeding with deployment."
  exit 1
fi
