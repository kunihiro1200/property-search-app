import { BaseRepository } from '../repositories/BaseRepository';

/**
 * 従業員の詳細情報
 */
export interface EmployeeLookupResult {
  id: string;
  name: string;
  email: string;
  initials: string;
}

/**
 * Google OAuth user metadata structure
 */
export interface GoogleUserMetadata {
  full_name?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  [key: string]: any;
}

/**
 * Extract display name from Google OAuth user metadata
 * Implements fallback logic: full_name → name → given_name + family_name → email prefix → email
 * 
 * @param userMetadata - Google OAuth user metadata object
 * @param email - User's email address
 * @returns Extracted display name (never empty)
 */
export function extractDisplayName(userMetadata: GoogleUserMetadata | null | undefined, email: string): string {
  console.log('[extractDisplayName] Extracting name from metadata:', {
    metadata: userMetadata,
    email
  });

  // Try full_name first
  if (userMetadata?.full_name && userMetadata.full_name.trim().length > 0) {
    const name = userMetadata.full_name.trim();
    console.log('[extractDisplayName] Using full_name:', name);
    return name;
  }

  // Try name field
  if (userMetadata?.name && userMetadata.name.trim().length > 0) {
    const name = userMetadata.name.trim();
    console.log('[extractDisplayName] Using name:', name);
    return name;
  }

  // Try combining given_name and family_name
  if (userMetadata?.given_name || userMetadata?.family_name) {
    const givenName = userMetadata.given_name?.trim() || '';
    const familyName = userMetadata.family_name?.trim() || '';
    
    if (givenName && familyName) {
      const name = `${givenName} ${familyName}`;
      console.log('[extractDisplayName] Using given_name + family_name:', name);
      return name;
    } else if (givenName) {
      console.log('[extractDisplayName] Using given_name only:', givenName);
      return givenName;
    } else if (familyName) {
      console.log('[extractDisplayName] Using family_name only:', familyName);
      return familyName;
    }
  }

  // Extract from email prefix
  const emailPrefix = extractNameFromEmail(email);
  console.log('[extractDisplayName] Using email-based extraction:', emailPrefix);
  return emailPrefix;
}

/**
 * Extract and format a name from an email address
 * Takes the part before @ symbol, formats it to be human-readable
 * 
 * @param email - Email address
 * @returns Formatted name from email prefix
 */
export function extractNameFromEmail(email: string): string {
  if (!email || email.trim().length === 0) {
    console.warn('[extractNameFromEmail] Empty email provided, returning email as-is');
    return email;
  }

  // Get the part before @
  const atIndex = email.indexOf('@');
  const prefix = atIndex > 0 ? email.substring(0, atIndex) : email;

  // Replace dots and underscores with spaces
  let formatted = prefix.replace(/[._]/g, ' ');

  // Capitalize first letter of each word
  formatted = formatted
    .split(' ')
    .map(word => {
      if (word.length === 0) return '';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ')
    .trim();

  // If formatting resulted in empty string, return the original prefix
  if (formatted.length === 0) {
    return prefix;
  }

  console.log('[extractNameFromEmail] Formatted email prefix:', {
    original: email,
    prefix,
    formatted
  });

  return formatted;
}

/**
 * 従業員関連のユーティリティ関数
 */
export class EmployeeUtils extends BaseRepository {
  /**
   * 有効な社員でメールアドレスが存在するものを取得
   * @returns 有効な社員の配列
   */
  async getActiveEmployeesWithEmail(): Promise<Array<{ id: string; email: string; name: string; role: string; initials: string }>> {
    try {
      const { data: employees, error } = await this.table('employees')
        .select('id, email, name, role, initials')
        .eq('is_active', true)
        .not('email', 'is', null)
        .order('name');

      if (error) {
        console.error('Error fetching active employees with email:', error);
        throw error;
      }

      return employees || [];
    } catch (error) {
      console.error('Error in getActiveEmployeesWithEmail:', error);
      throw error;
    }
  }

  /**
   * 従業員のイニシャルから従業員IDを取得
   * @param initials 従業員のイニシャル（例: "TK", "YS"）
   * @returns 従業員ID、見つからない場合はnull
   */
  async getEmployeeIdByInitials(initials: string): Promise<string | null> {
    if (!initials || initials.trim().length === 0) {
      return null;
    }

    try {
      // イニシャルを大文字に正規化
      const normalizedInitials = initials.trim().toUpperCase();

      // 全従業員を取得してイニシャルでフィルタリング
      // Note: Supabaseではクライアント側でフィルタリングする必要がある
      const { data: employees, error } = await this.table('employees')
        .select('id, name')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching employees:', error);
        return null;
      }

      if (!employees || employees.length === 0) {
        return null;
      }

      // 名前からイニシャルを抽出してマッチング
      const matchedEmployee = employees.find((employee) => {
        const extractedInitials = this.extractInitials(employee.name);
        return extractedInitials === normalizedInitials;
      });

      return matchedEmployee ? matchedEmployee.id : null;
    } catch (error) {
      console.error('Error in getEmployeeIdByInitials:', error);
      return null;
    }
  }

  /**
   * 名前からイニシャルを抽出
   * @param name 従業員の名前（例: "田中 太郎", "Tanaka Taro", "国広智子"）
   * @returns イニシャル（例: "TT", "国"）
   */
  private extractInitials(name: string): string {
    if (!name) {
      return '';
    }

    // スペースで分割
    const parts = name.trim().split(/\s+/);

    if (parts.length === 0) {
      return '';
    }

    // スペースがない場合（例: "国広智子"）は最初の文字のみ
    if (parts.length === 1 && parts[0].length > 0) {
      return parts[0][0].toUpperCase();
    }

    // 各パートの最初の文字を取得
    const initials = parts
      .map((part) => {
        if (part.length === 0) return '';
        // ローマ字の場合は最初の文字
        if (/^[A-Za-z]/.test(part)) {
          return part[0].toUpperCase();
        }
        // 日本語の場合は最初の文字を使用
        return part[0];
      })
      .join('');

    return initials.toUpperCase();
  }

  /**
   * 従業員IDから従業員情報を取得
   * @param employeeId 従業員ID
   * @returns 従業員情報、見つからない場合はnull
   */
  async getEmployeeById(employeeId: string): Promise<any | null> {
    try {
      const { data: employee, error } = await this.table('employees')
        .select('*')
        .eq('id', employeeId)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching employee:', error);
        return null;
      }

      return employee;
    } catch (error) {
      console.error('Error in getEmployeeById:', error);
      return null;
    }
  }

  /**
   * イニシャルから従業員の完全な情報を取得（メールアドレスを含む）
   * @param initials 従業員のイニシャル（例: "生野", "国"）
   * @returns 従業員の詳細情報、見つからない場合はnull
   */
  async getEmployeeByInitials(initials: string): Promise<EmployeeLookupResult | null> {
    console.log('[EmployeeUtils] Looking up employee by initials:', initials);

    if (!initials || initials.trim().length === 0) {
      console.log('[EmployeeUtils] Empty initials provided');
      return null;
    }

    try {
      // イニシャルを正規化
      const normalizedInitials = initials.trim().toUpperCase();
      console.log('[EmployeeUtils] Normalized initials:', normalizedInitials);

      // 全従業員を取得
      const { data: employees, error } = await this.table('employees')
        .select('id, name, email')
        .eq('is_active', true);

      if (error) {
        console.error('[EmployeeUtils] Error fetching employees:', error);
        return null;
      }

      if (!employees || employees.length === 0) {
        console.log('[EmployeeUtils] No active employees found');
        return null;
      }

      console.log(`[EmployeeUtils] Searching through ${employees.length} active employees`);

      // 名前からイニシャルを抽出してマッチング
      const matchedEmployees = employees.filter((employee) => {
        const extractedInitials = this.extractInitials(employee.name);
        return extractedInitials === normalizedInitials;
      });

      // 重複チェック
      if (matchedEmployees.length > 1) {
        const names = matchedEmployees.map(e => e.name).join(', ');
        console.error(`[EmployeeUtils] DUPLICATE INITIALS DETECTED: "${normalizedInitials}" matches multiple employees: ${names}`);
        throw new Error(`イニシャル（${initials}）が複数の社員に一致します: ${names}`);
      }

      if (matchedEmployees.length === 0) {
        console.log(`[EmployeeUtils] No employee found with initials: ${normalizedInitials}`);
        return null;
      }

      const matchedEmployee = matchedEmployees[0];
      const result: EmployeeLookupResult = {
        id: matchedEmployee.id,
        name: matchedEmployee.name,
        email: matchedEmployee.email,
        initials: normalizedInitials
      };

      console.log('[EmployeeUtils] Employee found:', {
        id: result.id,
        name: result.name,
        email: result.email,
        initials: result.initials
      });

      return result;
    } catch (error) {
      console.error('[EmployeeUtils] Error in getEmployeeByInitials:', error);
      throw error;
    }
  }

  /**
   * 従業員がカレンダー操作に必要なデータを持っているか検証
   * @param employeeId 従業員ID
   * @returns 検証結果（true: 有効, false: 無効）
   */
  async validateEmployeeForCalendar(employeeId: string): Promise<boolean> {
    console.log('[EmployeeUtils] Validating employee for calendar operations:', employeeId);

    try {
      const { data: employee, error } = await this.table('employees')
        .select('id, name, email, is_active')
        .eq('id', employeeId)
        .single();

      if (error) {
        console.error('[EmployeeUtils] Error fetching employee for validation:', error);
        return false;
      }

      if (!employee) {
        console.error('[EmployeeUtils] Employee not found:', employeeId);
        return false;
      }

      // アクティブチェック
      if (!employee.is_active) {
        console.error('[EmployeeUtils] Employee is not active:', {
          id: employeeId,
          name: employee.name
        });
        return false;
      }

      // メールアドレスチェック
      if (!employee.email || employee.email.trim().length === 0) {
        console.error('[EmployeeUtils] Employee missing email address:', {
          id: employeeId,
          name: employee.name
        });
        return false;
      }

      console.log('[EmployeeUtils] Employee validation passed:', {
        id: employeeId,
        name: employee.name,
        email: employee.email
      });

      return true;
    } catch (error) {
      console.error('[EmployeeUtils] Error in validateEmployeeForCalendar:', error);
      return false;
    }
  }

  /**
   * アクティブな従業員の中で重複するイニシャルを検出
   * @returns 重複しているイニシャルのリスト
   */
  async detectDuplicateInitials(): Promise<Array<{ initials: string; employees: Array<{ id: string; name: string; email: string }> }>> {
    console.log('[EmployeeUtils] Checking for duplicate initials among active employees');

    try {
      const { data: employees, error } = await this.table('employees')
        .select('id, name, email')
        .eq('is_active', true);

      if (error) {
        console.error('[EmployeeUtils] Error fetching employees:', error);
        return [];
      }

      if (!employees || employees.length === 0) {
        console.log('[EmployeeUtils] No active employees found');
        return [];
      }

      // イニシャルごとにグループ化
      const initialsMap = new Map<string, Array<{ id: string; name: string; email: string }>>();

      for (const employee of employees) {
        const initials = this.extractInitials(employee.name);
        if (!initialsMap.has(initials)) {
          initialsMap.set(initials, []);
        }
        initialsMap.get(initials)!.push({
          id: employee.id,
          name: employee.name,
          email: employee.email
        });
      }

      // 重複を検出
      const duplicates: Array<{ initials: string; employees: Array<{ id: string; name: string; email: string }> }> = [];

      for (const [initials, employeeList] of initialsMap.entries()) {
        if (employeeList.length > 1) {
          duplicates.push({
            initials,
            employees: employeeList
          });
        }
      }

      if (duplicates.length > 0) {
        console.warn('[EmployeeUtils] DUPLICATE INITIALS DETECTED:');
        duplicates.forEach(dup => {
          console.warn(`  Initials "${dup.initials}" matches:`, dup.employees.map(e => e.name).join(', '));
        });
      } else {
        console.log('[EmployeeUtils] No duplicate initials found');
      }

      return duplicates;
    } catch (error) {
      console.error('[EmployeeUtils] Error in detectDuplicateInitials:', error);
      return [];
    }
  }
}
