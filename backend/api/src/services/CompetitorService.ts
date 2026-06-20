import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface CompetitorInfo {
  competitorNameAndReason?: string;
  competitorName?: string;
  exclusiveOtherDecisionFactor?: string;
  otherDecisionCountermeasure?: string;
  contractYearMonth?: Date;
  exclusiveOtherDecisionMeeting?: string;
}

/**
 * Service for managing competitor and other decision (競合・他決) information
 * Handles competitor tracking, other decision factors, and countermeasures
 */
export class CompetitorService {
  /**
   * Record competitor information
   * 
   * @param sellerId - Seller ID
   * @param competitorData - Competitor information
   * @returns Updated competitor information
   */
  async recordCompetitor(
    sellerId: string,
    competitorData: CompetitorInfo
  ): Promise<CompetitorInfo> {
    try {
      const updateData: any = {};

      if (competitorData.competitorNameAndReason !== undefined) {
        updateData.competitor_name_and_reason = competitorData.competitorNameAndReason;
      }
      if (competitorData.competitorName !== undefined) {
        updateData.competitor_name = competitorData.competitorName;
      }
      if (competitorData.exclusiveOtherDecisionFactor !== undefined) {
        updateData.exclusive_other_decision_factor = competitorData.exclusiveOtherDecisionFactor;
      }
      if (competitorData.otherDecisionCountermeasure !== undefined) {
        updateData.other_decision_countermeasure = competitorData.otherDecisionCountermeasure;
      }
      if (competitorData.contractYearMonth !== undefined) {
        updateData.contract_year_month = competitorData.contractYearMonth;
      }
      if (competitorData.exclusiveOtherDecisionMeeting !== undefined) {
        updateData.exclusive_other_decision_meeting = competitorData.exclusiveOtherDecisionMeeting;
      }

      const { data, error } = await supabase
        .from('sellers')
        .update(updateData)
        .eq('id', sellerId)
        .select(
          `competitor_name_and_reason, competitor_name, exclusive_other_decision_factor,
           other_decision_countermeasure, contract_year_month, exclusive_other_decision_meeting`
        )
        .single();

      if (error) {
        console.error('Error recording competitor:', error);
        throw new Error(`Failed to record competitor: ${error.message}`);
      }

      return this.mapToCompetitorInfo(data);
    } catch (error) {
      console.error('Record competitor error:', error);
      throw error;
    }
  }

  /**
   * Get competitor information for a seller
   * 
   * @param sellerId - Seller ID
   * @returns Competitor information or null if not found
   */
  async getCompetitor(sellerId: string): Promise<CompetitorInfo | null> {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .select(
          `competitor_name_and_reason, competitor_name, exclusive_other_decision_factor,
           other_decision_countermeasure, contract_year_month, exclusive_other_decision_meeting`
        )
        .eq('id', sellerId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Error getting competitor:', error);
        throw new Error(`Failed to get competitor: ${error.message}`);
      }

      // Check if competitor data exists
      if (
        !data.competitor_name &&
        !data.competitor_name_and_reason &&
        !data.exclusive_other_decision_factor
      ) {
        return null;
      }

      return this.mapToCompetitorInfo(data);
    } catch (error) {
      console.error('Get competitor error:', error);
      throw error;
    }
  }

  /**
   * Update contract year/month
   * 
   * @param sellerId - Seller ID
   * @param yearMonth - Contract year/month
   * @returns Updated competitor information
   */
  async updateContractYearMonth(
    sellerId: string,
    yearMonth: Date
  ): Promise<CompetitorInfo> {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .update({ contract_year_month: yearMonth })
        .eq('id', sellerId)
        .select(
          `competitor_name_and_reason, competitor_name, exclusive_other_decision_factor,
           other_decision_countermeasure, contract_year_month, exclusive_other_decision_meeting`
        )
        .single();

      if (error) {
        console.error('Error updating contract year/month:', error);
        throw new Error(`Failed to update contract year/month: ${error.message}`);
      }

      return this.mapToCompetitorInfo(data);
    } catch (error) {
      console.error('Update contract year/month error:', error);
      throw error;
    }
  }

  /**
   * Update exclusive/other decision meeting status
   * 
   * @param sellerId - Seller ID
   * @param status - Meeting status (未, 完了)
   * @returns Updated competitor information
   */
  async updateMeetingStatus(
    sellerId: string,
    status: string
  ): Promise<CompetitorInfo> {
    try {
      // Validate meeting status
      if (!this.validateMeetingStatus(status)) {
        throw new Error(`Invalid meeting status: ${status}`);
      }

      const { data, error } = await supabase
        .from('sellers')
        .update({ exclusive_other_decision_meeting: status })
        .eq('id', sellerId)
        .select(
          `competitor_name_and_reason, competitor_name, exclusive_other_decision_factor,
           other_decision_countermeasure, contract_year_month, exclusive_other_decision_meeting`
        )
        .single();

      if (error) {
        console.error('Error updating meeting status:', error);
        throw new Error(`Failed to update meeting status: ${error.message}`);
      }

      return this.mapToCompetitorInfo(data);
    } catch (error) {
      console.error('Update meeting status error:', error);
      throw error;
    }
  }

  /**
   * Get common competitor names for autocomplete
   * 
   * @returns List of common competitor names
   */
  async getCommonCompetitors(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .select('competitor_name')
        .not('competitor_name', 'is', null)
        .not('competitor_name', 'eq', '');

      if (error) {
        console.error('Error getting common competitors:', error);
        return [];
      }

      // Count occurrences and return most common
      const competitorCounts: Record<string, number> = {};
      data?.forEach((seller) => {
        const name = seller.competitor_name?.trim();
        if (name) {
          competitorCounts[name] = (competitorCounts[name] || 0) + 1;
        }
      });

      return Object.entries(competitorCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20)
        .map(([name]) => name);
    } catch (error) {
      console.error('Get common competitors error:', error);
      return [];
    }
  }

  /**
   * Get common other decision factors
   * 
   * @returns List of common other decision factors
   */
  async getCommonOtherDecisionFactors(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .select('exclusive_other_decision_factor')
        .not('exclusive_other_decision_factor', 'is', null)
        .not('exclusive_other_decision_factor', 'eq', '');

      if (error) {
        console.error('Error getting other decision factors:', error);
        return [];
      }

      // Count occurrences and return most common
      const factorCounts: Record<string, number> = {};
      data?.forEach((seller) => {
        const factor = seller.exclusive_other_decision_factor?.trim();
        if (factor) {
          factorCounts[factor] = (factorCounts[factor] || 0) + 1;
        }
      });

      return Object.entries(factorCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 15)
        .map(([factor]) => factor);
    } catch (error) {
      console.error('Get common other decision factors error:', error);
      return [];
    }
  }

  /**
   * Analyze competitor performance
   * 
   * @param startDate - Start date for analysis
   * @param endDate - End date for analysis
   * @returns Competitor analysis results
   */
  async analyzeCompetitorPerformance(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    topCompetitors: Array<{ name: string; count: number }>;
    commonFactors: Array<{ factor: string; count: number }>;
    totalOtherDecisions: number;
  }> {
    try {
      let query = supabase
        .from('sellers')
        .select('competitor_name, exclusive_other_decision_factor, status')
        .eq('status', 'other_decision');

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to analyze competitors: ${error.message}`);
      }

      const competitorCounts: Record<string, number> = {};
      const factorCounts: Record<string, number> = {};

      data?.forEach((seller) => {
        if (seller.competitor_name) {
          const name = seller.competitor_name.trim();
          competitorCounts[name] = (competitorCounts[name] || 0) + 1;
        }
        if (seller.exclusive_other_decision_factor) {
          const factor = seller.exclusive_other_decision_factor.trim();
          factorCounts[factor] = (factorCounts[factor] || 0) + 1;
        }
      });

      const topCompetitors = Object.entries(competitorCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));

      const commonFactors = Object.entries(factorCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([factor, count]) => ({ factor, count }));

      return {
        topCompetitors,
        commonFactors,
        totalOtherDecisions: data?.length || 0,
      };
    } catch (error) {
      console.error('Analyze competitor performance error:', error);
      throw error;
    }
  }

  /**
   * Get suggested countermeasures based on competitor and factor
   * 
   * @param competitorName - Competitor name
   * @param factor - Other decision factor
   * @returns Suggested countermeasures
   */
  getSuggestedCountermeasures(competitorName?: string, factor?: string): string[] {
    const suggestions: string[] = [];

    // Competitor-specific suggestions
    if (competitorName) {
      const competitorSuggestions: Record<string, string[]> = {
        '大手不動産': [
          '地域密着の強みをアピール',
          '迅速な対応を強調',
          '手数料の柔軟性を提案',
        ],
        '地元業者': [
          '実績と信頼性をアピール',
          'マーケティング力の差別化',
          '売却保証の提案',
        ],
      };

      const matched = Object.keys(competitorSuggestions).find((key) =>
        competitorName.includes(key)
      );
      if (matched) {
        suggestions.push(...competitorSuggestions[matched]);
      }
    }

    // Factor-specific suggestions
    if (factor) {
      const factorSuggestions: Record<string, string[]> = {
        '価格': ['査定額の見直し', '手数料の調整', '売却保証の提案'],
        '対応': ['担当者変更', '連絡頻度の向上', 'VIP対応の実施'],
        '信頼': ['実績資料の提示', '口コミ・評判の共有', '保証制度の説明'],
        '条件': ['契約条件の柔軟化', '特別プランの提案', 'オプションサービス'],
      };

      const matched = Object.keys(factorSuggestions).find((key) => factor.includes(key));
      if (matched) {
        suggestions.push(...factorSuggestions[matched]);
      }
    }

    // Default suggestions if no specific match
    if (suggestions.length === 0) {
      suggestions.push(
        '顧客ニーズの再確認',
        '提案内容の見直し',
        '追加サービスの提案',
        '担当者との面談設定'
      );
    }

    return suggestions;
  }

  /**
   * Validate meeting status
   * 
   * @param status - Meeting status to validate
   * @returns true if valid
   */
  validateMeetingStatus(status: string): boolean {
    const validStatuses = ['未', '完了'];
    return validStatuses.includes(status);
  }

  /**
   * Check if competitor information is required based on seller status
   * 
   * @param status - Seller status
   * @returns true if competitor information is required
   */
  isCompetitorInfoRequired(status: string): boolean {
    const requiredStatuses = [
      'exclusive_contract_other_decision', // 専任媒介他決
      'following_up_other_decision', // 追客他決
      'follow_up_not_needed_other_decision', // 追客不要他決
      'exclusive_other_decision', // 専任他決
      'general_contract', // 一般
    ];
    return requiredStatuses.includes(status);
  }

  /**
   * Validate competitor information completeness
   * Returns validation errors if any required fields are missing
   * 
   * @param competitorData - Competitor information to validate
   * @param status - Seller status
   * @returns Array of validation error messages
   */
  validateCompetitorInfo(
    competitorData: CompetitorInfo,
    status: string
  ): string[] {
    const errors: string[] = [];

    // Only validate if competitor info is required for this status
    if (!this.isCompetitorInfoRequired(status)) {
      return errors;
    }

    // Validate competitor name (required)
    if (!competitorData.competitorName || competitorData.competitorName.trim() === '') {
      errors.push('競合名は必須項目です');
    }

    // Validate exclusive/other decision factors (required, multiple selection)
    if (
      !competitorData.exclusiveOtherDecisionFactor ||
      competitorData.exclusiveOtherDecisionFactor.trim() === ''
    ) {
      errors.push('専任・他決要因は必須項目です');
    }

    // Validate other decision countermeasure (required)
    if (
      !competitorData.otherDecisionCountermeasure ||
      competitorData.otherDecisionCountermeasure.trim() === ''
    ) {
      errors.push('他決対策は必須項目です');
    }

    // Validate contract year/month (required)
    if (!competitorData.contractYearMonth) {
      errors.push('契約年月は必須項目です');
    }

    // Validate exclusive/other decision meeting (required)
    if (
      !competitorData.exclusiveOtherDecisionMeeting ||
      competitorData.exclusiveOtherDecisionMeeting.trim() === ''
    ) {
      errors.push('専任他決打合せは必須項目です');
    } else if (!this.validateMeetingStatus(competitorData.exclusiveOtherDecisionMeeting)) {
      errors.push('専任他決打合せは「未」または「完了」を選択してください');
    }

    return errors;
  }

  /**
   * Get list of exclusive/other decision factor options (27 items)
   * 
   * @returns Array of factor options
   */
  getExclusiveOtherDecisionFactorOptions(): string[] {
    return [
      '①知り合い',
      '②価格が高い',
      '③決定権者の把握',
      '④連絡不足',
      '⑤購入物件の紹介',
      '⑥購入希望者がいる',
      '⑦以前つきあいがあった不動産',
      '⑧ヒアリング不足',
      '⑨担当者の対応が良い',
      '⑩査定書郵送',
      '⑪１番電話のスピード',
      '⑫対応スピード',
      '⑬買取保証',
      '⑭不明',
      '⑮追客電話の対応',
      '⑯説明が丁寧',
      '⑰詳細な調査',
      '⑱不誠実・やるべきことをしない',
      '⑲定期的な追客電話',
      '⑳HPの口コミ',
      '㉑売買に強い',
      '㉒仲介手数料のサービス',
      '㉓仲介手数料以外のサービス',
      '㉔妥当な査定額',
      '㉕定期的なメール配信',
      '㉖提案力',
      '㉗熱意',
    ];
  }

  /**
   * Parse exclusive/other decision factors from comma-separated string
   * 
   * @param factorsString - Comma-separated factors string
   * @returns Array of factors
   */
  parseFactors(factorsString: string): string[] {
    if (!factorsString || factorsString.trim() === '') {
      return [];
    }
    return factorsString.split(',').map((f) => f.trim()).filter((f) => f !== '');
  }

  /**
   * Format factors array to comma-separated string
   * 
   * @param factors - Array of factors
   * @returns Comma-separated string
   */
  formatFactors(factors: string[]): string {
    return factors.filter((f) => f.trim() !== '').join(', ');
  }

  /**
   * Map database record to CompetitorInfo type
   */
  private mapToCompetitorInfo(data: any): CompetitorInfo {
    return {
      competitorNameAndReason: data.competitor_name_and_reason,
      competitorName: data.competitor_name,
      exclusiveOtherDecisionFactor: data.exclusive_other_decision_factor,
      otherDecisionCountermeasure: data.other_decision_countermeasure,
      contractYearMonth: data.contract_year_month ? new Date(data.contract_year_month) : undefined,
      exclusiveOtherDecisionMeeting: data.exclusive_other_decision_meeting,
    };
  }
}

// Export singleton instance
export const competitorService = new CompetitorService();
