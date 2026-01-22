import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../config/supabase';

export class BaseRepository {
  protected supabase: SupabaseClient;

  constructor() {
    this.supabase = supabase;
  }

  /**
   * テーブルからデータを取得
   */
  protected table(tableName: string) {
    return this.supabase.from(tableName);
  }

  /**
   * 生SQLクエリを実行（必要な場合のみ）
   */
  protected async rpc<T = any>(
    functionName: string,
    params?: Record<string, any>
  ): Promise<T | null> {
    const { data, error } = await this.supabase.rpc(functionName, params);
    
    if (error) {
      console.error('RPC error:', error);
      throw error;
    }
    
    return data;
  }

  /**
   * 生SQLクエリを実行して複数行を取得
   */
  protected async query<T = any>(
    sql: string,
    params?: any[]
  ): Promise<T[]> {
    const { data, error } = await this.supabase.rpc('execute_sql', {
      query: sql,
      params: params || []
    });
    
    if (error) {
      console.error('Query error:', error);
      throw error;
    }
    
    return (data || []) as T[];
  }

  /**
   * 生SQLクエリを実行して1行を取得
   */
  protected async queryOne<T = any>(
    sql: string,
    params?: any[]
  ): Promise<T | null> {
    const results = await this.query<T>(sql, params);
    return results.length > 0 ? results[0] : null;
  }
}
