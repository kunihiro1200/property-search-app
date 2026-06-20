/**
 * FiscalYearUtils
 * 
 * 会社の年度（10月～9月）に基づいた日付計算を行うユーティリティクラス
 */

export interface FiscalYearPeriod {
  startDate: Date;
  endDate: Date;
  fiscalYear: number; // 年度を表す年（例：2024年度 = 2024）
}

export interface FiscalYearMonthRange {
  startMonth: Date; // 年度開始月（10月1日）
  endMonth: Date;   // 指定月の末日
  monthsElapsed: number; // 経過月数
}

export class FiscalYearUtils {
  /**
   * 会社の年度開始月（10月 = 9、0-indexed）
   */
  static readonly FISCAL_YEAR_START_MONTH = 9; // October (0-indexed)

  /**
   * 指定日が属する年度の期間を取得
   * @param date 基準日
   * @returns 年度の開始日と終了日
   */
  static getFiscalYearPeriod(date: Date): FiscalYearPeriod {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      throw new Error('Invalid date provided');
    }

    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed

    // 10月～12月の場合は現在年が年度、1月～9月の場合は前年が年度
    const fiscalYear = month >= this.FISCAL_YEAR_START_MONTH ? year : year - 1;

    // 年度開始日: 10月1日
    const startDate = new Date(fiscalYear, this.FISCAL_YEAR_START_MONTH, 1);
    
    // 年度終了日: 翌年9月30日
    const endDate = new Date(fiscalYear + 1, this.FISCAL_YEAR_START_MONTH - 1, 30, 23, 59, 59, 999);

    return {
      startDate,
      endDate,
      fiscalYear,
    };
  }

  /**
   * 指定月までの年度内経過月数を取得
   * @param year 年
   * @param month 月（1-12）
   * @returns 年度開始月から指定月までの範囲と経過月数
   */
  static getFiscalYearMonthRange(year: number, month: number): FiscalYearMonthRange {
    if (month < 1 || month > 12) {
      throw new Error('Month must be between 1 and 12');
    }

    // 指定月の日付を作成
    const targetDate = new Date(year, month - 1, 1);
    
    // 年度期間を取得
    const fiscalPeriod = this.getFiscalYearPeriod(targetDate);
    
    // 年度開始月（10月1日）
    const startMonth = fiscalPeriod.startDate;
    
    // 指定月の末日
    const endMonth = new Date(year, month, 0, 23, 59, 59, 999);
    
    // 経過月数を計算
    const monthsElapsed = this.getMonthsElapsedInFiscalYear(year, month);

    return {
      startMonth,
      endMonth,
      monthsElapsed,
    };
  }

  /**
   * 前年度の同期間を取得
   * @param year 現在の年
   * @param month 現在の月（1-12）
   * @returns 前年度の同期間の開始日と終了日
   */
  static getPreviousFiscalYearRange(year: number, month: number): {
    startDate: Date;
    endDate: Date;
  } {
    if (month < 1 || month > 12) {
      throw new Error('Month must be between 1 and 12');
    }

    // 現在の年度期間を取得
    const currentDate = new Date(year, month - 1, 1);
    const currentFiscalPeriod = this.getFiscalYearPeriod(currentDate);
    
    // 前年度の開始日（1年前の10月1日）
    const previousStartDate = new Date(
      currentFiscalPeriod.startDate.getFullYear() - 1,
      this.FISCAL_YEAR_START_MONTH,
      1
    );
    
    // 前年度の同じ月の末日
    const previousEndDate = new Date(year - 1, month, 0, 23, 59, 59, 999);

    return {
      startDate: previousStartDate,
      endDate: previousEndDate,
    };
  }

  /**
   * 指定月が年度の何ヶ月目かを計算
   * @param year 年
   * @param month 月（1-12）
   * @returns 年度開始からの経過月数（1-12）
   */
  static getMonthsElapsedInFiscalYear(year: number, month: number): number {
    if (month < 1 || month > 12) {
      throw new Error('Month must be between 1 and 12');
    }

    const targetDate = new Date(year, month - 1, 1);
    const fiscalPeriod = this.getFiscalYearPeriod(targetDate);
    
    // 年度開始月からの経過月数を計算
    const startYear = fiscalPeriod.startDate.getFullYear();
    const startMonth = fiscalPeriod.startDate.getMonth(); // 0-indexed
    
    const targetMonth = month - 1; // 0-indexed
    
    let monthsElapsed: number;
    
    if (year === startYear) {
      // 同じ年の場合（10月、11月、12月）
      monthsElapsed = targetMonth - startMonth + 1;
    } else {
      // 翌年の場合（1月～9月）
      monthsElapsed = (12 - startMonth) + targetMonth + 1;
    }

    return monthsElapsed;
  }
}
