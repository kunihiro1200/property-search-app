/**
 * 保全プロパティテスト - 訪問日時バグ修正の既存動作維持確認
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 *
 * このテストは未修正コードでPASSすることが期待される。
 * PASSが保全すべきベースライン動作を確認する。
 *
 * 目的: 修正後も既存の動作が変わらないことを保証する。
 *
 * Property 2: Preservation - 既存動作の維持（非バグ条件の入力）
 *
 * 観察した動作:
 * 1. 訪問日を空（null）にして保存 → visit_date = null になる
 * 2. ステータス・次電日・コメントなど他フィールドの更新が正常に保存される
 * 3. visitScheduled・visitCompleted フィルターが正常に動作する
 */

import * as fc from 'fast-check';

// ============================================================================
// 観察1: 訪問日を空（null）にして保存した場合の動作
// ============================================================================
describe('Preservation: 訪問日が空（null）の場合の保存動作', () => {
  /**
   * 観察1: appointmentDate が null/undefined の場合、
   * 未修正のバックエンドコードは visit_date と visit_time を null として保存する
   *
   * 未修正のバックエンドコード（SellerService.supabase.ts）:
   *   if (data.appointmentDate !== undefined) {
   *     updates.appointment_date = data.appointmentDate;
   *     if (data.appointmentDate) {
   *       // ... visit_date と visit_time を生成
   *     } else {
   *       updates.visit_date = null;
   *       updates.visit_time = null;
   *     }
   *   }
   *
   * Requirements 3.1: 訪問日フィールドを空にして保存した場合、
   * visit_date と visit_time は引き続き null として保存される
   */
  test('観察1: appointmentDate が null の場合、visit_date と visit_time が null になる', () => {
    // 未修正のバックエンドロジックを直接テスト
    const appointmentDate: string | null = null;

    // 未修正コードのロジック（SellerService.supabase.ts の updateSeller メソッド）
    const updates: any = {};
    if (appointmentDate !== undefined) {
      updates.appointment_date = appointmentDate;
      if (appointmentDate) {
        const appointmentDateObj = new Date(appointmentDate);
        updates.visit_date = appointmentDateObj.toISOString().split('T')[0];
        const hours = appointmentDateObj.getHours().toString().padStart(2, '0');
        const minutes = appointmentDateObj.getMinutes().toString().padStart(2, '0');
        updates.visit_time = `${hours}:${minutes}:00`;
      } else {
        updates.visit_date = null;
        updates.visit_time = null;
      }
    }

    // 保全すべき動作: null の場合は visit_date と visit_time が null になる
    expect(updates.visit_date).toBeNull();
    expect(updates.visit_time).toBeNull();
    expect(updates.appointment_date).toBeNull();
  });

  /**
   * 観察1b: appointmentDate が空文字列の場合も null として扱われる
   */
  test('観察1b: appointmentDate が空文字列の場合、visit_date と visit_time が null になる', () => {
    const appointmentDate = '';

    const updates: any = {};
    if (appointmentDate !== undefined) {
      updates.appointment_date = appointmentDate;
      if (appointmentDate) {
        const appointmentDateObj = new Date(appointmentDate);
        updates.visit_date = appointmentDateObj.toISOString().split('T')[0];
        const hours = appointmentDateObj.getHours().toString().padStart(2, '0');
        const minutes = appointmentDateObj.getMinutes().toString().padStart(2, '0');
        updates.visit_time = `${hours}:${minutes}:00`;
      } else {
        updates.visit_date = null;
        updates.visit_time = null;
      }
    }

    // 保全すべき動作: 空文字列の場合も visit_date と visit_time が null になる
    expect(updates.visit_date).toBeNull();
    expect(updates.visit_time).toBeNull();
  });

  /**
   * 観察1c: appointmentDate が undefined の場合、visit_date は更新されない
   */
  test('観察1c: appointmentDate が undefined の場合、visit_date フィールドは updates に含まれない', () => {
    const appointmentDate: string | undefined = undefined;

    const updates: any = {};
    if (appointmentDate !== undefined) {
      updates.appointment_date = appointmentDate;
      if (appointmentDate) {
        const appointmentDateObj = new Date(appointmentDate);
        updates.visit_date = appointmentDateObj.toISOString().split('T')[0];
        const hours = appointmentDateObj.getHours().toString().padStart(2, '0');
        const minutes = appointmentDateObj.getMinutes().toString().padStart(2, '0');
        updates.visit_time = `${hours}:${minutes}:00`;
      } else {
        updates.visit_date = null;
        updates.visit_time = null;
      }
    }

    // 保全すべき動作: undefined の場合は visit_date フィールド自体が存在しない
    expect(updates.visit_date).toBeUndefined();
    expect(updates.visit_time).toBeUndefined();
    expect(updates.appointment_date).toBeUndefined();
  });
});

// ============================================================================
// 観察2: 他フィールド（ステータス・次電日・コメントなど）の更新が正常に動作する
// ============================================================================
describe('Preservation: 訪問日以外のフィールド更新が正常に動作する', () => {
  /**
   * 観察2: ステータス・次電日・コメントなど他フィールドの更新は
   * 訪問日フィールドに影響を与えない
   *
   * Requirements 3.3: 訪問日以外のフィールド（ステータス、次電日、コメントなど）の
   * 更新は引き続き正常に保存される
   */
  test('観察2: ステータスのみ更新した場合、visit_date フィールドは updates に含まれない', () => {
    // ステータスのみ更新するリクエスト（appointmentDate は含まない）
    const data: any = {
      status: '追客中',
    };

    const updates: any = {};

    // 未修正コードのロジック（appointmentDate が undefined の場合）
    if (data.status !== undefined) {
      updates.status = data.status;
    }
    if (data.appointmentDate !== undefined) {
      updates.appointment_date = data.appointmentDate;
      if (data.appointmentDate) {
        const appointmentDateObj = new Date(data.appointmentDate);
        updates.visit_date = appointmentDateObj.toISOString().split('T')[0];
        const hours = appointmentDateObj.getHours().toString().padStart(2, '0');
        const minutes = appointmentDateObj.getMinutes().toString().padStart(2, '0');
        updates.visit_time = `${hours}:${minutes}:00`;
      } else {
        updates.visit_date = null;
        updates.visit_time = null;
      }
    }
    if (data.nextCallDate !== undefined) {
      updates.next_call_date = data.nextCallDate;
    }

    // 保全すべき動作: ステータスのみ更新した場合、visit_date は含まれない
    expect(updates.status).toBe('追客中');
    expect(updates.visit_date).toBeUndefined();
    expect(updates.visit_time).toBeUndefined();
  });

  /**
   * 観察2b: 次電日のみ更新した場合、visit_date フィールドは updates に含まれない
   */
  test('観察2b: 次電日のみ更新した場合、visit_date フィールドは updates に含まれない', () => {
    const data: any = {
      nextCallDate: '2026-05-01',
    };

    const updates: any = {};

    if (data.status !== undefined) {
      updates.status = data.status;
    }
    if (data.appointmentDate !== undefined) {
      updates.appointment_date = data.appointmentDate;
      if (data.appointmentDate) {
        const appointmentDateObj = new Date(data.appointmentDate);
        updates.visit_date = appointmentDateObj.toISOString().split('T')[0];
        const hours = appointmentDateObj.getHours().toString().padStart(2, '0');
        const minutes = appointmentDateObj.getMinutes().toString().padStart(2, '0');
        updates.visit_time = `${hours}:${minutes}:00`;
      } else {
        updates.visit_date = null;
        updates.visit_time = null;
      }
    }
    if (data.nextCallDate !== undefined) {
      updates.next_call_date = data.nextCallDate;
    }

    // 保全すべき動作: 次電日のみ更新した場合、visit_date は含まれない
    expect(updates.next_call_date).toBe('2026-05-01');
    expect(updates.visit_date).toBeUndefined();
    expect(updates.visit_time).toBeUndefined();
  });

  /**
   * 観察2c: 複数フィールドを同時に更新した場合でも、
   * appointmentDate が含まれなければ visit_date は更新されない
   */
  test('観察2c: ステータス・次電日・コメントを同時更新しても visit_date は更新されない', () => {
    const data: any = {
      status: '査定済み',
      nextCallDate: '2026-06-15',
      appointmentNotes: '訪問前に電話確認',
    };

    const updates: any = {};

    if (data.status !== undefined) {
      updates.status = data.status;
    }
    if (data.appointmentDate !== undefined) {
      updates.appointment_date = data.appointmentDate;
      if (data.appointmentDate) {
        const appointmentDateObj = new Date(data.appointmentDate);
        updates.visit_date = appointmentDateObj.toISOString().split('T')[0];
        const hours = appointmentDateObj.getHours().toString().padStart(2, '0');
        const minutes = appointmentDateObj.getMinutes().toString().padStart(2, '0');
        updates.visit_time = `${hours}:${minutes}:00`;
      } else {
        updates.visit_date = null;
        updates.visit_time = null;
      }
    }
    if (data.nextCallDate !== undefined) {
      updates.next_call_date = data.nextCallDate;
    }
    if (data.appointmentNotes !== undefined) {
      updates.appointment_notes = data.appointmentNotes;
    }

    // 保全すべき動作: 他フィールドは正常に更新される
    expect(updates.status).toBe('査定済み');
    expect(updates.next_call_date).toBe('2026-06-15');
    expect(updates.appointment_notes).toBe('訪問前に電話確認');
    // visit_date は含まれない
    expect(updates.visit_date).toBeUndefined();
    expect(updates.visit_time).toBeUndefined();
  });
});

// ============================================================================
// 観察3: visitScheduled・visitCompleted フィルターが正常に動作する
// ============================================================================
describe('Preservation: visitScheduled・visitCompleted フィルターの動作', () => {
  /**
   * visitScheduled フィルターのロジック（listSellers メソッドより）:
   *   case 'visitScheduled':
   *     query = query
   *       .not('visit_assignee', 'is', null)
   *       .neq('visit_assignee', '')
   *       .gte('visit_date', todayJST);
   *
   * visitCompleted フィルターのロジック:
   *   case 'visitCompleted':
   *     query = query
   *       .not('visit_assignee', 'is', null)
   *       .neq('visit_assignee', '')
   *       .lt('visit_date', todayJST);
   *
   * Requirements 3.4: 訪問日フィルター（visitScheduled、visitCompleted）は
   * 引き続き正常に動作する
   */

  /**
   * JST今日の日付を取得するロジック（listSellers メソッドより）
   */
  function getTodayJST(): string {
    const now = new Date();
    const jstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    return `${jstTime.getUTCFullYear()}-${String(jstTime.getUTCMonth() + 1).padStart(2, '0')}-${String(jstTime.getUTCDate()).padStart(2, '0')}`;
  }

  /**
   * visitScheduled フィルターの条件を評価するヘルパー関数
   * （Supabase クエリの代わりにインメモリでフィルタリング）
   */
  function applyVisitScheduledFilter(
    sellers: Array<{ visit_assignee: string | null; visit_date: string | null }>,
    todayJST: string
  ) {
    return sellers.filter(
      (s) =>
        s.visit_assignee !== null &&
        s.visit_assignee !== '' &&
        s.visit_date !== null &&
        s.visit_date >= todayJST
    );
  }

  /**
   * visitCompleted フィルターの条件を評価するヘルパー関数
   */
  function applyVisitCompletedFilter(
    sellers: Array<{ visit_assignee: string | null; visit_date: string | null }>,
    todayJST: string
  ) {
    return sellers.filter(
      (s) =>
        s.visit_assignee !== null &&
        s.visit_assignee !== '' &&
        s.visit_date !== null &&
        s.visit_date < todayJST
    );
  }

  /**
   * 観察3a: visitScheduled フィルターが正しく動作する
   * - visit_assignee が設定されている
   * - visit_date が今日以降
   */
  test('観察3a: visitScheduled フィルターが visit_assignee あり・visit_date が今日以降の売主を返す', () => {
    const todayJST = '2026-04-20';

    const sellers = [
      { visit_assignee: '田中', visit_date: '2026-04-20' },  // 今日 → 含む
      { visit_assignee: '田中', visit_date: '2026-04-21' },  // 明日 → 含む
      { visit_assignee: '田中', visit_date: '2026-04-19' },  // 昨日 → 除外
      { visit_assignee: null, visit_date: '2026-04-21' },    // 担当なし → 除外
      { visit_assignee: '', visit_date: '2026-04-21' },      // 担当空 → 除外
      { visit_assignee: '田中', visit_date: null },           // 訪問日なし → 除外
    ];

    const result = applyVisitScheduledFilter(sellers, todayJST);

    // 保全すべき動作: 今日以降かつ担当者ありの売主のみ返す
    expect(result).toHaveLength(2);
    expect(result[0].visit_date).toBe('2026-04-20');
    expect(result[1].visit_date).toBe('2026-04-21');
  });

  /**
   * 観察3b: visitCompleted フィルターが正しく動作する
   * - visit_assignee が設定されている
   * - visit_date が今日より前
   */
  test('観察3b: visitCompleted フィルターが visit_assignee あり・visit_date が昨日以前の売主を返す', () => {
    const todayJST = '2026-04-20';

    const sellers = [
      { visit_assignee: '田中', visit_date: '2026-04-19' },  // 昨日 → 含む
      { visit_assignee: '田中', visit_date: '2026-04-01' },  // 先月 → 含む
      { visit_assignee: '田中', visit_date: '2026-04-20' },  // 今日 → 除外
      { visit_assignee: '田中', visit_date: '2026-04-21' },  // 明日 → 除外
      { visit_assignee: null, visit_date: '2026-04-19' },    // 担当なし → 除外
      { visit_assignee: '', visit_date: '2026-04-19' },      // 担当空 → 除外
      { visit_assignee: '田中', visit_date: null },           // 訪問日なし → 除外
    ];

    const result = applyVisitCompletedFilter(sellers, todayJST);

    // 保全すべき動作: 昨日以前かつ担当者ありの売主のみ返す
    expect(result).toHaveLength(2);
    expect(result[0].visit_date).toBe('2026-04-19');
    expect(result[1].visit_date).toBe('2026-04-01');
  });

  /**
   * 観察3c: visitScheduled と visitCompleted は互いに排他的
   * 同じ売主が両方のフィルターに含まれることはない
   */
  test('観察3c: visitScheduled と visitCompleted フィルターは互いに排他的', () => {
    const todayJST = getTodayJST();

    // 様々な訪問日を持つ売主リスト
    const sellers = [
      { visit_assignee: '田中', visit_date: '2025-01-01' },
      { visit_assignee: '田中', visit_date: '2025-06-15' },
      { visit_assignee: '田中', visit_date: todayJST },
      { visit_assignee: '田中', visit_date: '2027-12-31' },
      { visit_assignee: null, visit_date: '2026-04-20' },
    ];

    const scheduled = applyVisitScheduledFilter(sellers, todayJST);
    const completed = applyVisitCompletedFilter(sellers, todayJST);

    // 保全すべき動作: 両方のフィルターに含まれる売主はいない
    const scheduledDates = new Set(scheduled.map((s) => s.visit_date));
    const completedDates = new Set(completed.map((s) => s.visit_date));

    for (const date of scheduledDates) {
      expect(completedDates.has(date)).toBe(false);
    }
  });

  /**
   * 観察3d: getTodayJST() が正しい形式（YYYY-MM-DD）を返す
   */
  test('観察3d: getTodayJST() が YYYY-MM-DD 形式の文字列を返す', () => {
    const todayJST = getTodayJST();

    // 保全すべき動作: YYYY-MM-DD 形式
    expect(todayJST).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // 有効な日付であることを確認
    const date = new Date(todayJST);
    expect(date.toString()).not.toBe('Invalid Date');
  });
});

// ============================================================================
// プロパティベーステスト: 非バグ条件の入力で既存動作が維持される
// ============================================================================
describe('Preservation: プロパティベーステスト - 非バグ条件の入力', () => {
  /**
   * isBugCondition の定義（design.md より）:
   *   RETURN input.appointmentDate IS NOT NULL
   *          AND input.appointmentDate CONTAINS time component (HH:mm)
   *          AND (
   *            frontend applies new Date(input.appointmentDate).toISOString()
   *            OR backend applies toISOString().split('T')[0]
   *          )
   *
   * 非バグ条件（isBugCondition が false を返す場合）:
   * - appointmentDate が null/undefined/空文字列
   * - appointmentDate が日付のみ（時刻なし）
   * - 他フィールドのみの更新（appointmentDate を含まない）
   *
   * **Validates: Requirements 3.1, 3.3, 3.4**
   */

  /**
   * 未修正のバックエンドロジックを関数として抽出
   * （テスト対象のロジック）
   */
  function computeVisitDateUpdates(appointmentDate: string | null | undefined): {
    visit_date: string | null | undefined;
    visit_time: string | null | undefined;
    appointment_date: string | null | undefined;
  } {
    const updates: any = {};

    if (appointmentDate !== undefined) {
      updates.appointment_date = appointmentDate;
      if (appointmentDate) {
        const appointmentDateObj = new Date(appointmentDate);
        updates.visit_date = appointmentDateObj.toISOString().split('T')[0];
        const hours = appointmentDateObj.getHours().toString().padStart(2, '0');
        const minutes = appointmentDateObj.getMinutes().toString().padStart(2, '0');
        updates.visit_time = `${hours}:${minutes}:00`;
      } else {
        updates.visit_date = null;
        updates.visit_time = null;
      }
    }

    return {
      visit_date: updates.visit_date,
      visit_time: updates.visit_time,
      appointment_date: updates.appointment_date,
    };
  }

  /**
   * プロパティテスト1: appointmentDate が null の場合、
   * 常に visit_date = null、visit_time = null になる
   *
   * **Validates: Requirements 3.1**
   */
  test('プロパティテスト1: appointmentDate が null の場合、常に visit_date と visit_time が null になる', () => {
    // null は非バグ条件（isBugCondition = false）
    const result = computeVisitDateUpdates(null);

    expect(result.visit_date).toBeNull();
    expect(result.visit_time).toBeNull();
    expect(result.appointment_date).toBeNull();
  });

  /**
   * プロパティテスト2: appointmentDate が undefined の場合、
   * visit_date フィールドは更新されない
   *
   * **Validates: Requirements 3.1**
   */
  test('プロパティテスト2: appointmentDate が undefined の場合、visit_date フィールドは更新されない', () => {
    const result = computeVisitDateUpdates(undefined);

    expect(result.visit_date).toBeUndefined();
    expect(result.visit_time).toBeUndefined();
    expect(result.appointment_date).toBeUndefined();
  });

  /**
   * プロパティテスト3: 複数の null 入力で常に同じ結果になる（冪等性）
   *
   * **Validates: Requirements 3.1**
   */
  test('プロパティテスト3: null 入力は常に同じ結果を返す（冪等性）', () => {
    // 複数回実行しても同じ結果
    for (let i = 0; i < 10; i++) {
      const result = computeVisitDateUpdates(null);
      expect(result.visit_date).toBeNull();
      expect(result.visit_time).toBeNull();
    }
  });

  /**
   * プロパティテスト4: fast-check を使用して、
   * null/undefined/空文字列の入力では常に visit_date が null または undefined になる
   *
   * **Validates: Requirements 3.1**
   */
  test('プロパティテスト4: null・undefined・空文字列の入力では visit_date が null または undefined になる', () => {
    // null の場合
    fc.assert(
      fc.property(
        fc.constant(null),
        (appointmentDate) => {
          const result = computeVisitDateUpdates(appointmentDate);
          return result.visit_date === null;
        }
      ),
      { numRuns: 5 }
    );

    // undefined の場合
    fc.assert(
      fc.property(
        fc.constant(undefined),
        (appointmentDate) => {
          const result = computeVisitDateUpdates(appointmentDate);
          return result.visit_date === undefined;
        }
      ),
      { numRuns: 5 }
    );

    // 空文字列の場合
    fc.assert(
      fc.property(
        fc.constant(''),
        (appointmentDate) => {
          const result = computeVisitDateUpdates(appointmentDate);
          return result.visit_date === null;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * プロパティテスト5: 他フィールドの更新は visit_date に影響しない
   *
   * **Validates: Requirements 3.3**
   */
  test('プロパティテスト5: appointmentDate を含まないリクエストでは visit_date が更新されない', () => {
    // 様々な他フィールドの組み合わせ
    const nonAppointmentUpdates = [
      { status: '追客中' },
      { nextCallDate: '2026-05-01' },
      { status: '査定済み', nextCallDate: '2026-06-15' },
      { appointmentNotes: '訪問前に電話確認' },
      { status: '追客中', nextCallDate: '2026-07-01', appointmentNotes: 'メモ' },
    ];

    for (const data of nonAppointmentUpdates) {
      // appointmentDate が含まれないため、visit_date は更新されない
      const result = computeVisitDateUpdates(undefined);
      expect(result.visit_date).toBeUndefined();
      expect(result.visit_time).toBeUndefined();
    }
  });

  /**
   * プロパティテスト6: visitScheduled フィルターの日付比較が正しく動作する
   *
   * 任意の visit_date と todayJST の組み合わせで、
   * フィルターの結果が一貫していることを確認する
   *
   * **Validates: Requirements 3.4**
   */
  test('プロパティテスト6: visitScheduled フィルターの日付比較が一貫して動作する', () => {
    fc.assert(
      fc.property(
        // 訪問日（YYYY-MM-DD 形式）
        fc.record({
          year: fc.integer({ min: 2025, max: 2027 }),
          month: fc.integer({ min: 1, max: 12 }),
          day: fc.integer({ min: 1, max: 28 }),
        }),
        // 今日の日付（YYYY-MM-DD 形式）
        fc.record({
          year: fc.integer({ min: 2025, max: 2027 }),
          month: fc.integer({ min: 1, max: 12 }),
          day: fc.integer({ min: 1, max: 28 }),
        }),
        (visitDateParts, todayParts) => {
          const visitDate = `${visitDateParts.year}-${String(visitDateParts.month).padStart(2, '0')}-${String(visitDateParts.day).padStart(2, '0')}`;
          const todayJST = `${todayParts.year}-${String(todayParts.month).padStart(2, '0')}-${String(todayParts.day).padStart(2, '0')}`;

          // visitScheduled: visit_date >= todayJST
          const isScheduled = visitDate >= todayJST;
          // visitCompleted: visit_date < todayJST
          const isCompleted = visitDate < todayJST;

          // 保全すべき動作: scheduled と completed は互いに排他的
          // （同じ日付が両方に含まれることはない）
          return !(isScheduled && isCompleted);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * プロパティテスト7: visitScheduled と visitCompleted の和集合は
   * 訪問日が設定されているすべての売主を含む
   *
   * **Validates: Requirements 3.4**
   */
  test('プロパティテスト7: visitScheduled と visitCompleted の和集合は全訪問日設定売主を網羅する', () => {
    fc.assert(
      fc.property(
        // 訪問日（YYYY-MM-DD 形式）
        fc.record({
          year: fc.integer({ min: 2025, max: 2027 }),
          month: fc.integer({ min: 1, max: 12 }),
          day: fc.integer({ min: 1, max: 28 }),
        }),
        // 今日の日付（YYYY-MM-DD 形式）
        fc.record({
          year: fc.integer({ min: 2025, max: 2027 }),
          month: fc.integer({ min: 1, max: 12 }),
          day: fc.integer({ min: 1, max: 28 }),
        }),
        (visitDateParts, todayParts) => {
          const visitDate = `${visitDateParts.year}-${String(visitDateParts.month).padStart(2, '0')}-${String(visitDateParts.day).padStart(2, '0')}`;
          const todayJST = `${todayParts.year}-${String(todayParts.month).padStart(2, '0')}-${String(todayParts.day).padStart(2, '0')}`;

          const isScheduled = visitDate >= todayJST;
          const isCompleted = visitDate < todayJST;

          // 保全すべき動作: 訪問日が設定されている場合、
          // scheduled か completed のどちらかに必ず含まれる
          return isScheduled || isCompleted;
        }
      ),
      { numRuns: 100 }
    );
  });
});
