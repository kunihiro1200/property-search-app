# Design Document

## Overview

買主詳細画面のインライン編集フィールドから必須バリデーションを削除する。現在、`fieldValidation.ts`の`getValidationRulesForFieldType`関数で、email、phone、nameフィールドに対して自動的に`required`バリデーションが追加されている。この設計では、これらの必須バリデーションを削除し、形式バリデーションのみを維持する。

## Architecture

変更は単一ファイル（`frontend/src/utils/fieldValidation.ts`）に限定される。

```
frontend/
└── src/
    └── utils/
        └── fieldValidation.ts  ← 変更対象
```

## Components and Interfaces

### 変更対象: getValidationRulesForFieldType関数

現在の実装:
```typescript
export function getValidationRulesForFieldType(
  fieldType: string,
  fieldName: string
): ValidationRule[] {
  const rules: ValidationRule[] = [];

  switch (fieldType) {
    case 'email':
      rules.push({ type: 'required', message: 'Email is required' });  // 削除
      rules.push({ type: 'email', message: 'Please enter a valid email address' });
      break;

    case 'phone':
      rules.push({ type: 'required', message: 'Phone number is required' });  // 削除
      rules.push({ type: 'phone', message: 'Please enter a valid phone number' });
      break;

    case 'text':
      if (fieldName === 'name') {
        rules.push({ type: 'required', message: 'Name is required' });  // 削除
        rules.push({ type: 'minLength', value: 2, message: '...' });  // 削除
      }
      break;
    // ...
  }
  return rules;
}
```

変更後の実装:
```typescript
export function getValidationRulesForFieldType(
  fieldType: string,
  fieldName: string
): ValidationRule[] {
  const rules: ValidationRule[] = [];

  switch (fieldType) {
    case 'email':
      // 形式バリデーションのみ（空の場合はスキップ）
      rules.push({ type: 'email', message: 'Please enter a valid email address' });
      break;

    case 'phone':
      // 形式バリデーションのみ（空の場合はスキップ）
      rules.push({ type: 'phone', message: 'Please enter a valid phone number' });
      break;

    case 'text':
      // nameフィールドの必須・最小文字数バリデーションを削除
      break;
    // ...
  }
  return rules;
}
```

### 変更対象: validateEmail関数

現在の実装:
```typescript
export function validateEmail(value: string): ValidationResult {
  if (!value || value.trim() === '') {
    return { isValid: false, error: 'Email is required' };  // 削除
  }
  // ...
}
```

変更後の実装:
```typescript
export function validateEmail(value: string): ValidationResult {
  // 空の場合は有効とする
  if (!value || value.trim() === '') {
    return { isValid: true };
  }
  // 形式チェックのみ実行
  if (!EMAIL_PATTERN.test(value.trim())) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  return { isValid: true };
}
```

### 変更対象: validatePhone関数

現在の実装:
```typescript
export function validatePhone(value: string): ValidationResult {
  if (!value || value.trim() === '') {
    return { isValid: false, error: 'Phone number is required' };  // 削除
  }
  // ...
}
```

変更後の実装:
```typescript
export function validatePhone(value: string): ValidationResult {
  // 空の場合は有効とする
  if (!value || value.trim() === '') {
    return { isValid: true };
  }
  // 形式チェックのみ実行
  // ...
}
```

## Data Models

変更なし。既存のValidationRule型とValidationResult型をそのまま使用。

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 空の値は常に有効

*For any* フィールド（email、phone、name）において、空の値（null、undefined、空文字列）が入力された場合、バリデーションは成功（isValid: true）を返す

**Validates: Requirements 1.1, 1.2, 2.1, 2.2, 3.1, 3.2**

### Property 2: 形式バリデーションは値がある場合のみ実行

*For any* email/phoneフィールドにおいて、値が入力されている場合のみ形式バリデーションが実行され、無効な形式の場合はエラーを返す

**Validates: Requirements 1.3, 2.3, 4.1, 4.2, 4.3**

## Error Handling

- 形式バリデーションエラーは従来通りユーザーに表示
- 空の値に対するエラーは表示しない

## Testing Strategy

### Unit Tests

1. `validateEmail`関数のテスト
   - 空文字列で`isValid: true`を返すことを確認
   - 有効なメールアドレスで`isValid: true`を返すことを確認
   - 無効なメールアドレスで`isValid: false`を返すことを確認

2. `validatePhone`関数のテスト
   - 空文字列で`isValid: true`を返すことを確認
   - 有効な電話番号で`isValid: true`を返すことを確認
   - 無効な電話番号で`isValid: false`を返すことを確認

3. `getValidationRulesForFieldType`関数のテスト
   - emailタイプで`required`ルールが含まれないことを確認
   - phoneタイプで`required`ルールが含まれないことを確認
   - textタイプ（name）で`required`と`minLength`ルールが含まれないことを確認

### Property-Based Tests

- 空の値（空文字列、null、undefined）に対して常にバリデーションが成功することを確認
- 有効な形式の値に対して常にバリデーションが成功することを確認
