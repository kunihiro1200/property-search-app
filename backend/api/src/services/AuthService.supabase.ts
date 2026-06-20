import { BaseRepository } from '../repositories/BaseRepository';
import { Employee, EmployeeRole } from '../types';
import { extractDisplayName, GoogleUserMetadata } from '../utils/employeeUtils';

export class AuthService extends BaseRepository {
  /**
   * Supabase Authのユーザー情報から社員レコードを取得または作成
   */
  async getOrCreateEmployee(
    userId: string,
    email: string,
    userMetadata: GoogleUserMetadata | null | undefined
  ): Promise<Employee> {
    // メタデータから名前を抽出
    const extractedName = extractDisplayName(userMetadata, email);
    
    console.log('[AuthService] getOrCreateEmployee called:', {
      userId,
      email,
      metadata: userMetadata,
      extractedName,
    });

    // 既存の社員を検索
    const { data: existing, error: fetchError } = await this.table('employees')
      .select('*')
      .eq('google_id', userId)
      .single();

    if (existing && !fetchError) {
      console.log('[AuthService] Existing employee found:', {
        id: existing.id,
        currentName: existing.name,
        extractedName,
      });

      // 既存の名前が無効な場合は更新する
      const shouldUpdateName = this.isInvalidName(existing.name);
      
      if (shouldUpdateName) {
        console.log('[AuthService] Updating invalid employee name:', {
          oldName: existing.name,
          newName: extractedName,
        });

        await this.table('employees')
          .update({
            name: extractedName,
            last_login_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        return { ...existing, name: extractedName, lastLoginAt: new Date() };
      } else {
        // 最終ログイン日時のみ更新
        await this.table('employees')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', existing.id);

        return { ...existing, lastLoginAt: new Date() };
      }
    }

    // 新規社員を作成
    console.log('[AuthService] Creating new employee:', {
      userId,
      email,
      name: extractedName,
    });

    const { data: newEmployee, error: createError } = await this.table('employees')
      .insert({
        google_id: userId,
        email,
        name: extractedName,
        role: EmployeeRole.AGENT,
        is_active: true,
        last_login_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError || !newEmployee) {
      console.error('[AuthService] Failed to create employee:', createError);
      throw new Error('Failed to create employee');
    }

    console.log('[AuthService] New employee created:', {
      id: newEmployee.id,
      name: newEmployee.name,
    });

    return newEmployee;
  }

  /**
   * 名前が無効かどうかをチェック
   * 暗号化されたような文字列、"不明"、空文字列などを検出
   */
  private isInvalidName(name: string): boolean {
    if (!name || name.trim().length === 0) {
      return true;
    }

    // "不明"をチェック
    if (name === '不明' || name === 'Unknown') {
      return true;
    }

    // 暗号化されたような文字列をチェック（Base64パターン）
    // 長い英数字の羅列で、スペースがない場合
    const base64Pattern = /^[A-Za-z0-9+/=]{20,}$/;
    if (base64Pattern.test(name)) {
      return true;
    }

    // メールアドレスそのものが名前になっている場合
    if (name.includes('@')) {
      return true;
    }

    return false;
  }

  /**
   * セッションを検証
   */
  async validateSession(accessToken: string): Promise<Employee> {
    // Supabase Authでトークンを検証（SERVICE_ROLE_KEYを使用）
    const { data: { user }, error } = await this.supabase.auth.getUser(accessToken);

    if (error || !user) {
      throw new Error('Invalid or expired session');
    }

    // 社員情報を取得
    const { data: employee, error: employeeError } = await this.table('employees')
      .select('*')
      .eq('google_id', user.id)
      .eq('is_active', true)
      .single();

    if (employeeError || !employee) {
      throw new Error('Employee not found or inactive');
    }

    return employee;
  }

  /**
   * ログアウト
   */
  async logout(accessToken: string): Promise<void> {
    // Supabase Authでログアウト
    await this.supabase.auth.admin.signOut(accessToken);
  }
}
