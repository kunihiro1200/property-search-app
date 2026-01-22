import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface VisitInfo {
  visitAcquisitionDate?: Date;
  visitDate?: Date;
  visitTime?: string;
  visitDayOfWeek?: string;
  visitAssignee?: string;
  visitAcquiredBy?: string;
  visitNotes?: string;
  visitRatio?: number;
}

/**
 * Service for managing visit valuation (訪問査定) information
 * Handles visit scheduling, assignment, and tracking
 */
export class VisitService {
  /**
   * Schedule a visit valuation
   * 
   * @param sellerId - Seller ID
   * @param visitData - Visit information
   * @returns Updated visit information
   */
  async scheduleVisit(sellerId: string, visitData: VisitInfo): Promise<VisitInfo> {
    try {
      const updateData: any = {};

      if (visitData.visitAcquisitionDate !== undefined) {
        updateData.visit_acquisition_date = visitData.visitAcquisitionDate;
      }
      if (visitData.visitDate !== undefined) {
        updateData.visit_date = visitData.visitDate;
        // Auto-calculate day of week
        if (visitData.visitDate) {
          updateData.visit_day_of_week = this.getDayOfWeek(visitData.visitDate);
        }
      }
      if (visitData.visitTime !== undefined) {
        updateData.visit_time = visitData.visitTime;
      }
      if (visitData.visitDayOfWeek !== undefined) {
        updateData.visit_day_of_week = visitData.visitDayOfWeek;
      }
      if (visitData.visitAssignee !== undefined) {
        updateData.visit_assignee = visitData.visitAssignee;
      }
      if (visitData.visitAcquiredBy !== undefined) {
        updateData.visit_acquired_by = visitData.visitAcquiredBy;
      }
      if (visitData.visitNotes !== undefined) {
        updateData.visit_notes = visitData.visitNotes;
      }
      if (visitData.visitRatio !== undefined) {
        updateData.visit_ratio = visitData.visitRatio;
      }

      // Auto-set visit acquisition date if not provided
      if (!visitData.visitAcquisitionDate && visitData.visitDate) {
        updateData.visit_acquisition_date = new Date();
      }

      const { data, error } = await supabase
        .from('sellers')
        .update(updateData)
        .eq('id', sellerId)
        .select(
          `visit_acquisition_date, visit_date, visit_time, visit_day_of_week,
           visit_assignee, visit_acquired_by, visit_notes, visit_ratio`
        )
        .single();

      if (error) {
        console.error('Error scheduling visit:', error);
        throw new Error(`Failed to schedule visit: ${error.message}`);
      }

      return this.mapToVisitInfo(data);
    } catch (error) {
      console.error('Schedule visit error:', error);
      throw error;
    }
  }

  /**
   * Get visit information for a seller
   * 
   * @param sellerId - Seller ID
   * @returns Visit information or null if not found
   */
  async getVisit(sellerId: string): Promise<VisitInfo | null> {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .select(
          `visit_acquisition_date, visit_date, visit_time, visit_day_of_week,
           visit_assignee, visit_acquired_by, visit_notes, visit_ratio`
        )
        .eq('id', sellerId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Error getting visit:', error);
        throw new Error(`Failed to get visit: ${error.message}`);
      }

      // Check if visit data exists
      if (!data.visit_date && !data.visit_acquisition_date) {
        return null;
      }

      return this.mapToVisitInfo(data);
    } catch (error) {
      console.error('Get visit error:', error);
      throw error;
    }
  }

  /**
   * Update visit information
   * 
   * @param sellerId - Seller ID
   * @param updates - Fields to update
   * @returns Updated visit information
   */
  async updateVisit(
    sellerId: string,
    updates: Partial<VisitInfo>
  ): Promise<VisitInfo> {
    try {
      const updateData: any = {};

      if (updates.visitAcquisitionDate !== undefined) {
        updateData.visit_acquisition_date = updates.visitAcquisitionDate;
      }
      if (updates.visitDate !== undefined) {
        updateData.visit_date = updates.visitDate;
        // Auto-update day of week
        if (updates.visitDate) {
          updateData.visit_day_of_week = this.getDayOfWeek(updates.visitDate);
        }
      }
      if (updates.visitTime !== undefined) {
        updateData.visit_time = updates.visitTime;
      }
      if (updates.visitDayOfWeek !== undefined) {
        updateData.visit_day_of_week = updates.visitDayOfWeek;
      }
      if (updates.visitAssignee !== undefined) {
        updateData.visit_assignee = updates.visitAssignee;
      }
      if (updates.visitAcquiredBy !== undefined) {
        updateData.visit_acquired_by = updates.visitAcquiredBy;
      }
      if (updates.visitNotes !== undefined) {
        updateData.visit_notes = updates.visitNotes;
      }
      if (updates.visitRatio !== undefined) {
        updateData.visit_ratio = updates.visitRatio;
      }

      const { data, error } = await supabase
        .from('sellers')
        .update(updateData)
        .eq('id', sellerId)
        .select(
          `visit_acquisition_date, visit_date, visit_time, visit_day_of_week,
           visit_assignee, visit_acquired_by, visit_notes, visit_ratio`
        )
        .single();

      if (error) {
        console.error('Error updating visit:', error);
        throw new Error(`Failed to update visit: ${error.message}`);
      }

      return this.mapToVisitInfo(data);
    } catch (error) {
      console.error('Update visit error:', error);
      throw error;
    }
  }

  /**
   * Calculate visit ratio (訪問率) for an employee
   * Based on successful visits vs total attempts
   * 
   * @param employeeId - Employee ID
   * @param startDate - Start date for calculation
   * @param endDate - End date for calculation
   * @returns Visit ratio as percentage
   */
  async calculateVisitRatio(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    try {
      // Get total scheduled visits
      const { data: totalVisits, error: totalError } = await supabase
        .from('sellers')
        .select('id')
        .eq('visit_assignee', employeeId)
        .gte('visit_date', startDate.toISOString())
        .lte('visit_date', endDate.toISOString());

      if (totalError) {
        throw new Error(`Failed to get total visits: ${totalError.message}`);
      }

      // Get successful visits (those with post-visit valuation)
      const { data: successfulVisits, error: successError } = await supabase
        .from('sellers')
        .select('id')
        .eq('visit_assignee', employeeId)
        .gte('visit_date', startDate.toISOString())
        .lte('visit_date', endDate.toISOString())
        .not('post_visit_valuation_amount_1', 'is', null);

      if (successError) {
        throw new Error(`Failed to get successful visits: ${successError.message}`);
      }

      const total = totalVisits?.length || 0;
      const successful = successfulVisits?.length || 0;

      return total > 0 ? Math.round((successful / total) * 100) : 0;
    } catch (error) {
      console.error('Calculate visit ratio error:', error);
      throw error;
    }
  }

  /**
   * Get day of week from date
   * 
   * @param date - Date to get day of week from
   * @returns Day of week in Japanese
   */
  getDayOfWeek(date: Date): string {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return days[date.getDay()];
  }

  /**
   * Validate visit time format (HH:MM)
   * 
   * @param time - Time string to validate
   * @returns true if valid format
   */
  validateVisitTime(time: string): boolean {
    const timePattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timePattern.test(time);
  }

  /**
   * Check visit scheduling conflicts
   * 
   * @param assigneeId - Employee ID
   * @param visitDate - Proposed visit date
   * @param visitTime - Proposed visit time
   * @returns true if there's a conflict
   */
  async checkVisitConflict(
    assigneeId: string,
    visitDate: Date,
    visitTime: string
  ): Promise<boolean> {
    try {
      const dateStr = visitDate.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('sellers')
        .select('id')
        .eq('visit_assignee', assigneeId)
        .eq('visit_date', dateStr)
        .eq('visit_time', visitTime);

      if (error) {
        console.error('Error checking visit conflict:', error);
        return false; // Assume no conflict if error
      }

      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('Check visit conflict error:', error);
      return false;
    }
  }

  /**
   * Map database record to VisitInfo type
   */
  private mapToVisitInfo(data: any): VisitInfo {
    return {
      visitAcquisitionDate: data.visit_acquisition_date
        ? new Date(data.visit_acquisition_date)
        : undefined,
      visitDate: data.visit_date ? new Date(data.visit_date) : undefined,
      visitTime: data.visit_time,
      visitDayOfWeek: data.visit_day_of_week,
      visitAssignee: data.visit_assignee,
      visitAcquiredBy: data.visit_acquired_by,
      visitNotes: data.visit_notes,
      visitRatio: data.visit_ratio,
    };
  }
}

// Export singleton instance
export const visitService = new VisitService();
