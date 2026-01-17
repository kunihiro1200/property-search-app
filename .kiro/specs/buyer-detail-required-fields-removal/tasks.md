# Implementation Plan: 買主詳細画面の必須項目削除

## Overview

`frontend/src/utils/fieldValidation.ts`を修正して、メールアドレス、電話番号、氏名フィールドの必須バリデーションを削除する。形式バリデーションは維持する。

## Tasks

- [x] 1. validateEmail関数の修正
  - 空の値に対してエラーを返さないように変更
  - 空の場合は`{ isValid: true }`を返す
  - 値がある場合のみ形式チェックを実行
  - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.3_

- [x] 2. validatePhone関数の修正
  - 空の値に対してエラーを返さないように変更
  - 空の場合は`{ isValid: true }`を返す
  - 値がある場合のみ形式チェックを実行
  - _Requirements: 2.1, 2.2, 2.3, 4.2, 4.3_

- [x] 3. getValidationRulesForFieldType関数の修正
  - emailタイプから`required`ルールを削除
  - phoneタイプから`required`ルールを削除
  - textタイプ（name）から`required`と`minLength`ルールを削除
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 4. Checkpoint - 動作確認
  - 買主詳細画面でメールアドレスを空にして保存できることを確認
  - 買主詳細画面で電話番号を空にして保存できることを確認
  - 買主詳細画面で氏名を空にして保存できることを確認
  - 無効な形式の値を入力した場合にエラーが表示されることを確認

## Notes

- 変更は1ファイル（`frontend/src/utils/fieldValidation.ts`）のみ
- 形式バリデーションは維持（データ品質のため）
- バックエンド側の変更は不要
