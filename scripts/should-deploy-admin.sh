#!/bin/bash

# 管理画面プロジェクト用のIgnored Build Stepスクリプト
# 公開サイト専用ファイルのみが変更された場合はデプロイをスキップ

echo "🔍 Checking if admin deployment should proceed..."

# 前回のデプロイから変更されたファイルを取得
CHANGED_FILES=$(git diff --name-only HEAD^ HEAD 2>/dev/null || git diff --name-only HEAD)

# 変更がない場合はデプロイを実行
if [ -z "$CHANGED_FILES" ]; then
  echo "🚀 No changed files detected. Proceeding with deployment."
  exit 1
fi

echo "📝 Changed files:"
echo "$CHANGED_FILES"

# 公開サイト専用ファイルのパターン
PUBLIC_ONLY_PATTERNS=(
  "frontend/src/pages/PublicPropertyListPage.tsx"
  "frontend/src/pages/PublicPropertyDetailPage.tsx"
  "frontend/src/components/PublicProperty"
)

# 変更されたファイルが公開サイト専用ファイルのみかチェック
ONLY_PUBLIC_CHANGES=true
HAS_FRONTEND_CHANGES=false

while IFS= read -r file; do
  # 空行をスキップ
  if [ -z "$file" ]; then
    continue
  fi
  
  # frontendディレクトリの変更があるかチェック
  if [[ $file =~ ^frontend/ ]]; then
    HAS_FRONTEND_CHANGES=true
    
    # 公開サイト専用ファイルかチェック
    IS_PUBLIC_ONLY=false
    for pattern in "${PUBLIC_ONLY_PATTERNS[@]}"; do
      if [[ $file =~ $pattern ]]; then
        IS_PUBLIC_ONLY=true
        break
      fi
    done
    
    # 公開サイト専用ファイル以外の変更があれば、管理画面をデプロイ
    if [[ $IS_PUBLIC_ONLY == false ]]; then
      ONLY_PUBLIC_CHANGES=false
      break
    fi
  else
    # frontendディレクトリ以外の変更は管理画面に影響する可能性がある
    ONLY_PUBLIC_CHANGES=false
    break
  fi
done <<< "$CHANGED_FILES"

# frontendディレクトリの変更がない場合はデプロイを実行
if [[ $HAS_FRONTEND_CHANGES == false ]]; then
  echo "🚀 No frontend changes detected. Proceeding with deployment."
  exit 1
fi

# 公開サイト専用ファイルのみが変更された場合はデプロイをスキップ
if [[ $ONLY_PUBLIC_CHANGES == true ]]; then
  echo "✅ Only public site files changed. Skipping admin deployment."
  exit 0
else
  echo "🚀 Admin files or shared files changed. Proceeding with deployment."
  exit 1
fi
