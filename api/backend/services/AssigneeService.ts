import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface AssigneeInfo {
  valuationAssignee?: string;
  phoneAssignee?: string;
  firstCallInitials?: string;
  firstCallPerson?: string;
  visitAssignee?: string;
  visitAcquiredBy?: string;
}

/**
 * Service for managing assignee (担当者管理) information
 * Handles valuation assignee, phone assignee, first call tracking, and visit assignee
 */
export class AssigneeService {
  /**
   * Update valuation assignee
   * 
   * @param sellerId - Seller ID
   * @param assigneeId - Employee ID to assign
   * @returns Updated assignee information
   */
  async updateValuationAssignee(
    sellerId: string,
    assigneeId: string
  ): Promise<AssigneeInfo> {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .update({ valuation_assignee: assigneeId })
        .eq('id', sellerId)
        .select(
          `valuation_assignee, phone_assignee, first_call_initials, 
           first_call_person, visit_assignee, visit_acquired_by`
        )
        .single();

      if (error) {
        console.error('Error updating valuation assignee:', error);
        throw new Error(`Failed to update valuation assignee: ${error.message}`);
      }

      return this.mapToAssigneeInfo(data);
    } catch (error) {
      console.error('Update valuation assignee error:', error);
      throw error;
    }
  }

  /**
   * Update phone assignee (optional)
   * 
   * @param sellerId - Seller ID
   * @param assigneeId - Employee ID to assign (optional)
   * @returns Updated assignee information
   */
  async updatePhoneAssignee(
    sellerId: string,
    assigneeId?: string
  ): Promise<AssigneeInfo> {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .update({ phone_assignee: assigneeId || null })
        .eq('id', sellerId)
        .select(
          `valuation_assignee, phone_assignee, first_call_initials, 
           first_call_person, visit_assignee, visit_acquired_by`
        )
        .single();

      if (error) {
        console.error('Error updating phone assignee:', error);
        throw new Error(`Failed to update phone assignee: ${error.message}`);
      }

      return this.mapToAssigneeInfo(data);
    } catch (error) {
      console.error('Update phone assignee error:', error);
      throw error;
    }
  }

  /**
   * Record first call information
   * 
   * @param sellerId - Seller ID
   * @param initials - Caller initials
   * @param person - Person who answered
   * @returns Updated assignee information
   */
  async recordFirstCall(
    sellerId: string,
    initials: string,
    person?: string
  ): Promise<AssigneeInfo> {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .update({
          first_call_initials: initials,
          first_call_person: person,
        })
        .eq('id', sellerId)
        .select(
          `valuation_assignee, phone_assignee, first_call_initials, 
           first_call_person, visit_assignee, visit_acquired_by`
        )
        .single();

      if (error) {
        console.error('Error recording first call:', error);
        throw new Error(`Failed to record first call: ${error.message}`);
      }

      return this.mapToAssigneeInfo(data);
    } catch (error) {
      console.error('Record first call error:', error);
      throw error;
    }
  }

  /**
   * Update visit assignee
   * 
   * @param sellerId - Seller ID
   * @param assigneeId - Employee ID to assign
   * @returns Updated assignee information
   */
  async updateVisitAssignee(
    sellerId: string,
    assigneeId: string
  ): Promise<AssigneeInfo> {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .update({ visit_assignee: assigneeId })
        .eq('id', sellerId)
        .select(
          `valuation_assignee, phone_assignee, first_call_initials, 
           first_call_person, visit_assignee, visit_acquired_by`
        )
        .single();

      if (error) {
        console.error('Error updating visit assignee:', error);
        throw new Error(`Failed to update visit assignee: ${error.message}`);
      }

      return this.mapToAssigneeInfo(data);
    } catch (error) {
      console.error('Update visit assignee error:', error);
      throw error;
    }
  }

  /**
   * Record visit acquired by (automatically set when visit is scheduled)
   * 
   * @param sellerId - Seller ID
   * @param acquiredBy - Employee ID who acquired the visit
   * @returns Updated assignee information
   */
  async recordVisitAcquiredBy(
    sellerId: string,
    acquiredBy: string
  ): Promise<AssigneeInfo> {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .update({ visit_acquired_by: acquiredBy })
        .eq('id', sellerId)
        .select(
          `valuation_assignee, phone_assignee, first_call_initials, 
           first_call_person, visit_assignee, visit_acquired_by`
        )
        .single();

      if (error) {
        console.error('Error recording visit acquired by:', error);
        throw new Error(`Failed to record visit acquired by: ${error.message}`);
      }

      return this.mapToAssigneeInfo(data);
    } catch (error) {
      console.error('Record visit acquired by error:', error);
      throw error;
    }
  }

  /**
   * Get assignee information for a seller
   * 
   * @param sellerId - Seller ID
   * @returns Assignee information or null if not found
   */
  async getAssigneeInfo(sellerId: string): Promise<AssigneeInfo | null> {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .select(
          `valuation_assignee, phone_assignee, first_call_initials, 
           first_call_person, visit_assignee, visit_acquired_by`
        )
        .eq('id', sellerId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Error getting assignee info:', error);
        throw new Error(`Failed to get assignee info: ${error.message}`);
      }

      return this.mapToAssigneeInfo(data);
    } catch (error) {
      console.error('Get assignee info error:', error);
      throw error;
    }
  }

  /**
   * Calculate visit acquisition ratio for an employee
   * Based on visits acquired vs total visits assigned
   * 
   * @param employeeId - Employee ID
   * @param startDate - Start date for calculation
   * @param endDate - End date for calculation
   * @returns Visit acquisition ratio as percentage
   */
  async calculateVisitAcquisitionRatio(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    try {
      // Get total sellers assigned to this employee
      const { data: totalAssigned, error: totalError } = await supabase
        .from('sellers')
        .select('id')
        .eq('valuation_assignee', employeeId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (totalError) {
        throw new Error(`Failed to get total assigned: ${totalError.message}`);
      }

      // Get visits acquired by this employee
      const { data: visitsAcquired, error: acquiredError } = await supabase
        .from('sellers')
        .select('id')
        .eq('visit_acquired_by', employeeId)
        .gte('visit_acquisition_date', startDate.toISOString())
        .lte('visit_acquisition_date', endDate.toISOString());

      if (acquiredError) {
        throw new Error(`Failed to get visits acquired: ${acquiredError.message}`);
      }

      const total = totalAssigned?.length || 0;
      const acquired = visitsAcquired?.length || 0;

      return total > 0 ? Math.round((acquired / total) * 100) : 0;
    } catch (error) {
      console.error('Calculate visit acquisition ratio error:', error);
      throw error;
    }
  }

  /**
   * Calculate visit ratio for an employee (monthly)
   * Based on successful visits vs total scheduled visits
   * 
   * @param employeeId - Employee ID
   * @param year - Year
   * @param month - Month (1-12)
   * @returns Visit ratio as percentage
   */
  async calculateMonthlyVisitRatio(
    employeeId: string,
    year: number,
    month: number
  ): Promise<number> {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

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
      console.error('Calculate monthly visit ratio error:', error);
      throw error;
    }
  }

  /**
   * Get employee workload statistics
   * 
   * @param employeeId - Employee ID
   * @returns Workload statistics
   */
  async getEmployeeWorkload(employeeId: string): Promise<{
    totalAssigned: number;
    activeFollowUps: number;
    scheduledVisits: number;
    completedVisits: number;
  }> {
    try {
      // Total assigned sellers
      const { data: assigned, error: assignedError } = await supabase
        .from('sellers')
        .select('id')
        .eq('valuation_assignee', employeeId);

      if (assignedError) {
        throw new Error(`Failed to get assigned sellers: ${assignedError.message}`);
      }

      // Active follow-ups (next call date in future, not unreachable)
      const { data: followUps, error: followUpsError } = await supabase
        .from('sellers')
        .select('id')
        .eq('valuation_assignee', employeeId)
        .not('next_call_date', 'is', null)
        .eq('unreachable', false);

      if (followUpsError) {
        throw new Error(`Failed to get follow-ups: ${followUpsError.message}`);
      }

      // Scheduled visits (future visits)
      const today = new Date().toISOString().split('T')[0];
      const { data: scheduled, error: scheduledError } = await supabase
        .from('sellers')
        .select('id')
        .eq('visit_assignee', employeeId)
        .gte('visit_date', today);

      if (scheduledError) {
        throw new Error(`Failed to get scheduled visits: ${scheduledError.message}`);
      }

      // Completed visits (past visits with post-visit valuation)
      const { data: completed, error: completedError } = await supabase
        .from('sellers')
        .select('id')
        .eq('visit_assignee', employeeId)
        .lt('visit_date', today)
        .not('post_visit_valuation_amount_1', 'is', null);

      if (completedError) {
        throw new Error(`Failed to get completed visits: ${completedError.message}`);
      }

      return {
        totalAssigned: assigned?.length || 0,
        activeFollowUps: followUps?.length || 0,
        scheduledVisits: scheduled?.length || 0,
        completedVisits: completed?.length || 0,
      };
    } catch (error) {
      console.error('Get employee workload error:', error);
      throw error;
    }
  }

  /**
   * Get available employees for assignment
   * 
   * @returns List of available employees
   */
  async getAvailableEmployees(): Promise<Array<{ id: string; name: string; initials: string }>> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, initials')
        .eq('active', true)
        .order('name');

      if (error) {
        console.error('Error getting available employees:', error);
        // Return empty array if employees table doesn't exist yet
        if (error.code === '42P01') {
          return [];
        }
        throw new Error(`Failed to get available employees: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Get available employees error:', error);
      return [];
    }
  }

  /**
   * Bulk assign valuation assignee
   * 
   * @param sellerIds - Array of seller IDs
   * @param assigneeId - Employee ID to assign
   * @returns Number of sellers updated
   */
  async bulkAssignValuationAssignee(
    sellerIds: string[],
    assigneeId: string
  ): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .update({ valuation_assignee: assigneeId })
        .in('id', sellerIds)
        .select('id');

      if (error) {
        console.error('Error bulk assigning:', error);
        throw new Error(`Failed to bulk assign: ${error.message}`);
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Bulk assign error:', error);
      throw error;
    }
  }

  /**
   * Map database record to AssigneeInfo type
   */
  private mapToAssigneeInfo(data: any): AssigneeInfo {
    return {
      valuationAssignee: data.valuation_assignee,
      phoneAssignee: data.phone_assignee,
      firstCallInitials: data.first_call_initials,
      firstCallPerson: data.first_call_person,
      visitAssignee: data.visit_assignee,
      visitAcquiredBy: data.visit_acquired_by,
    };
  }
}

// Export singleton instance
export const assigneeService = new AssigneeService();
