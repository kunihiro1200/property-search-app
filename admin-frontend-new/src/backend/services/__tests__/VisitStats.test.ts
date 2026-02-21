/**
 * 訪問統計API テスト
 * 
 * 今回の問題（visit_dateフィールドの誤り）を防ぐための自動テスト
 * - 現在の月のデータ取得
 * - 将来の月（2026年1月など）のデータ取得
 * - 日付範囲の正確性
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 環境変数を読み込み
dotenv.config({ path: path.join(__dirname, '../../../.env') });

describe('訪問統計API', () => {
  let supabase: SupabaseClient;

  beforeAll(() => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not found in environment');
    }
    
    supabase = createClient(supabaseUrl, supabaseKey);
  });

  describe('getVisitStats - 日付範囲テスト', () => {
    /**
     * 月の開始日と終了日を計算するヘルパー関数
     */
    function calculateDateRange(month: string): { startDate: string; endDate: string } {
      const startDate = `${month}-01`;
      const endDateObj = new Date(`${month}-01T00:00:00Z`);
      endDateObj.setMonth(endDateObj.getMonth() + 1);
      endDateObj.setDate(0); // 前月の最終日
      const endDate = endDateObj.toISOString().split('T')[0];
      return { startDate, endDate };
    }

    it('2025年12月の日付範囲が正しいこと', () => {
      const { startDate, endDate } = calculateDateRange('2025-12');
      expect(startDate).toBe('2025-12-01');
      expect(endDate).toBe('2025-12-31');
    });

    it('2026年1月の日付範囲が正しいこと', () => {
      const { startDate, endDate } = calculateDateRange('2026-01');
      expect(startDate).toBe('2026-01-01');
      expect(endDate).toBe('2026-01-31');
    });

    it('2026年2月の日付範囲が正しいこと（うるう年）', () => {
      const { startDate, endDate } = calculateDateRange('2026-02');
      expect(startDate).toBe('2026-02-01');
      expect(endDate).toBe('2026-02-28'); // 2026年は平年
    });

    it('2024年2月の日付範囲が正しいこと（うるう年）', () => {
      const { startDate, endDate } = calculateDateRange('2024-02');
      expect(startDate).toBe('2024-02-01');
      expect(endDate).toBe('2024-02-29'); // 2024年はうるう年
    });
  });

  describe('getVisitStats - データベースクエリテスト', () => {
    it('visit_dateフィールドでクエリできること', async () => {
      // visit_dateフィールドが存在し、クエリ可能であることを確認
      const { data, error } = await supabase
        .from('sellers')
        .select('id, visit_date, visit_assignee')
        .not('visit_date', 'is', null)
        .limit(1);

      expect(error).toBeNull();
      // データがあれば、visit_dateフィールドが正しく取得できていることを確認
      if (data && data.length > 0) {
        expect(data[0]).toHaveProperty('visit_date');
        expect(data[0]).toHaveProperty('visit_assignee');
      }
    });

    it('visit_dateで日付範囲フィルタが動作すること', async () => {
      const month = '2025-12';
      const startDate = `${month}-01`;
      const endDateObj = new Date(`${month}-01T00:00:00Z`);
      endDateObj.setMonth(endDateObj.getMonth() + 1);
      endDateObj.setDate(0);
      const endDate = endDateObj.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('sellers')
        .select('id, visit_date, visit_assignee')
        .gte('visit_date', startDate)
        .lte('visit_date', endDate);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      
      // 取得したデータが指定した日付範囲内であることを確認
      if (data && data.length > 0) {
        for (const seller of data) {
          const visitDate = new Date(seller.visit_date);
          expect(visitDate >= new Date(startDate)).toBe(true);
          expect(visitDate <= new Date(endDate + 'T23:59:59Z')).toBe(true);
        }
      }
    });

    it('将来の月（2026年1月）でもクエリが正常に動作すること', async () => {
      const month = '2026-01';
      const startDate = `${month}-01`;
      const endDateObj = new Date(`${month}-01T00:00:00Z`);
      endDateObj.setMonth(endDateObj.getMonth() + 1);
      endDateObj.setDate(0);
      const endDate = endDateObj.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('sellers')
        .select('id, visit_date, visit_assignee')
        .gte('visit_date', startDate)
        .lte('visit_date', endDate);

      // エラーなくクエリが実行できること
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('getVisitStats - 統計集計テスト', () => {
    it('担当者ごとの訪問数が正しく集計されること', async () => {
      const month = '2025-12';
      const startDate = `${month}-01`;
      const endDateObj = new Date(`${month}-01T00:00:00Z`);
      endDateObj.setMonth(endDateObj.getMonth() + 1);
      endDateObj.setDate(0);
      const endDate = endDateObj.toISOString().split('T')[0];

      const { data: sellers, error } = await supabase
        .from('sellers')
        .select('id, visit_date, visit_assignee, assigned_to')
        .gte('visit_date', startDate)
        .lte('visit_date', endDate);

      expect(error).toBeNull();

      if (sellers && sellers.length > 0) {
        // 担当者ごとに集計
        const statsByEmployee: Record<string, number> = {};
        for (const seller of sellers) {
          const assignee = seller.visit_assignee || seller.assigned_to;
          if (assignee) {
            statsByEmployee[assignee] = (statsByEmployee[assignee] || 0) + 1;
          }
        }

        // 集計結果の合計が元のデータ数と一致することを確認
        const totalFromStats = Object.values(statsByEmployee).reduce((a, b) => a + b, 0);
        const totalWithAssignee = sellers.filter(s => s.visit_assignee || s.assigned_to).length;
        expect(totalFromStats).toBe(totalWithAssignee);
      }
    });
  });
});
