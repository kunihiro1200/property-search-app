/**
 * ExclusionDateCalculator
 * 
 * Calculates exclusion dates for sellers based on inquiry date and site.
 * Each site has specific rules for when a seller should be excluded from follow-up.
 */

export class ExclusionDateCalculator {
  /**
   * Calculate exclusion date based on inquiry date and site
   * 
   * Site-specific rules:
   * - Y: inquiry date within 6 days, add 5 days
   * - ウ: inquiry date within 7 days, add 7 days
   * - L: inquiry date within 5 days, add 5 days
   * - す: inquiry date within 8 days, add 9 days
   * - a: inquiry date within 8 days, add 8 days
   * 
   * @param inquiryDate - The inquiry date (Date object or ISO string)
   * @param site - The site identifier (Y, ウ, L, す, a)
   * @returns The calculated exclusion date or null if conditions not met
   */
  static calculateExclusionDate(
    inquiryDate: Date | string | null | undefined,
    site: string | null | undefined
  ): Date | null {
    // Handle null or undefined inputs
    if (!inquiryDate || !site) {
      return null;
    }

    // Parse inquiry date
    const inquiry = new Date(inquiryDate);
    
    // Validate date parsing
    if (isNaN(inquiry.getTime())) {
      return null;
    }

    // Get today's date normalized to midnight UTC
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    // Normalize inquiry date to midnight UTC
    inquiry.setUTCHours(0, 0, 0, 0);

    // Check if inquiry date is in the future
    if (inquiry > today) {
      return null;
    }

    // Calculate days difference
    const daysDiff = Math.floor(
      (today.getTime() - inquiry.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Site-specific rules: maxDays = days before today, addDays = days to add
    const rules: Record<string, { maxDays: number; addDays: number }> = {
      'Y': { maxDays: 6, addDays: 5 },
      'ウ': { maxDays: 7, addDays: 7 },
      'L': { maxDays: 5, addDays: 5 },
      'す': { maxDays: 8, addDays: 9 },
      'a': { maxDays: 8, addDays: 8 },
    };

    // Get rule for the site
    const rule = rules[site];
    if (!rule) {
      return null;
    }

    // Check if inquiry date is within the allowed range
    if (daysDiff <= rule.maxDays) {
      const exclusionDate = new Date(inquiry);
      exclusionDate.setUTCDate(exclusionDate.getUTCDate() + rule.addDays);
      return exclusionDate;
    }

    // Out of range - return null
    return null;
  }
}
