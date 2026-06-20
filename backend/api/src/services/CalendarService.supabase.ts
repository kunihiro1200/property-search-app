import { google } from 'googleapis';
import { BaseRepository } from '../repositories/BaseRepository';
import { Appointment, SellerStatus } from '../types';
import { GoogleAuthService } from './GoogleAuthService';

export interface AppointmentRequest {
  sellerId: string;
  employeeId: string;
  startTime: Date;
  endTime: Date;
  location: string;
  assignedTo?: string; // 営担イニシャル
  assignedEmployeeId?: string; // 営担の社員ID
  notes?: string;
  createdByName?: string; // 予約作成者の名前
}

export interface CalendarEventData {
  summary: string;
  location: string;
  description: string;
  startTime: Date;
  endTime: Date;
}

export class CalendarService extends BaseRepository {
  private googleAuthService: GoogleAuthService;

  constructor() {
    super();
    this.googleAuthService = new GoogleAuthService();
  }

  /**
   * Google Calendarイベントを作成
   * @param employeeEmail スタッフのメールアドレス
   * @param eventData イベントデータ
   * @returns カレンダーイベントID
   */
  async createGoogleCalendarEvent(
    employeeEmail: string,
    eventData: CalendarEventData
  ): Promise<string> {
    try {
      // 会社アカウントの認証済みクライアントを取得
      const auth = await this.googleAuthService.getAuthenticatedClient();
      const calendar = google.calendar({ version: 'v3', auth });

      // イベントを作成
      const event = {
        summary: eventData.summary,
        location: eventData.location,
        description: eventData.description,
        start: {
          dateTime: eventData.startTime.toISOString(),
          timeZone: 'Asia/Tokyo',
        },
        end: {
          dateTime: eventData.endTime.toISOString(),
          timeZone: 'Asia/Tokyo',
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1日前
            { method: 'popup', minutes: 30 }, // 30分前
          ],
        },
      };

      // スタッフのメールアドレスをcalendarIdとして使用
      console.log('[CalendarService] Creating Google Calendar event');
      console.log('[CalendarService] Target calendar (email):', employeeEmail);
      console.log('[CalendarService] Event details:', {
        summary: event.summary,
        location: event.location,
        start: event.start.dateTime,
        end: event.end.dateTime,
      });
      
      const response = await calendar.events.insert({
        calendarId: employeeEmail,
        requestBody: event,
      });

      console.log('[CalendarService] Google Calendar event created successfully');
      console.log('[CalendarService] Event ID:', response.data.id);
      console.log('[CalendarService] Confirmed calendar ID:', employeeEmail);
      return response.data.id!;
    } catch (error: any) {
      console.error('Create Google Calendar event error:', error);
      
      // 認証エラーの場合は特別なエラーを投げる
      if (error.message === 'GOOGLE_AUTH_REQUIRED') {
        throw error;
      }
      
      throw new Error(`Failed to create calendar event: ${error.message}`);
    }
  }

  /**
   * Google Calendarイベントを更新
   * @param employeeEmail スタッフのメールアドレス
   * @param eventId カレンダーイベントID
   * @param updates 更新データ
   */
  async updateGoogleCalendarEvent(
    employeeEmail: string,
    eventId: string,
    updates: Partial<CalendarEventData>
  ): Promise<void> {
    try {
      // 会社アカウントの認証済みクライアントを取得
      const auth = await this.googleAuthService.getAuthenticatedClient();
      const calendar = google.calendar({ version: 'v3', auth });

      // 既存のイベントを取得
      const existingEvent = await calendar.events.get({
        calendarId: employeeEmail,
        eventId: eventId,
      });

      // 更新内容を適用
      const updatedEvent: any = { ...existingEvent.data };

      if (updates.summary) updatedEvent.summary = updates.summary;
      if (updates.location) updatedEvent.location = updates.location;
      if (updates.description) updatedEvent.description = updates.description;
      if (updates.startTime) {
        updatedEvent.start = {
          dateTime: updates.startTime.toISOString(),
          timeZone: 'Asia/Tokyo',
        };
      }
      if (updates.endTime) {
        updatedEvent.end = {
          dateTime: updates.endTime.toISOString(),
          timeZone: 'Asia/Tokyo',
        };
      }

      // イベントを更新
      await calendar.events.update({
        calendarId: employeeEmail,
        eventId: eventId,
        requestBody: updatedEvent,
      });

      console.log('✅ Google Calendar event updated:', eventId);
    } catch (error: any) {
      console.error('Update Google Calendar event error:', error);
      
      // 認証エラーの場合は特別なエラーを投げる
      if (error.message === 'GOOGLE_AUTH_REQUIRED') {
        throw error;
      }
      
      throw new Error(`Failed to update calendar event: ${error.message}`);
    }
  }

  /**
   * Google Calendarイベントを削除
   * @param employeeEmail スタッフのメールアドレス
   * @param eventId カレンダーイベントID
   */
  async deleteGoogleCalendarEvent(employeeEmail: string, eventId: string): Promise<void> {
    try {
      // 会社アカウントの認証済みクライアントを取得
      const auth = await this.googleAuthService.getAuthenticatedClient();
      const calendar = google.calendar({ version: 'v3', auth });

      // イベントを削除
      await calendar.events.delete({
        calendarId: employeeEmail,
        eventId: eventId,
      });

      console.log('✅ Google Calendar event deleted:', eventId);
    } catch (error: any) {
      // 404エラー（イベントが既に削除されている）は無視
      if (error.code === 404 || error.message?.includes('Not Found')) {
        console.log('ℹ️  Calendar event already deleted:', eventId);
        return;
      }

      console.error('Delete Google Calendar event error:', error);
      
      // 認証エラーの場合は特別なエラーを投げる
      if (error.message === 'GOOGLE_AUTH_REQUIRED') {
        throw error;
      }
      
      throw new Error(`Failed to delete calendar event: ${error.message}`);
    }
  }

  /**
   * イベント説明文を生成
   * @param sellerName 売主名
   * @param sellerPhone 売主電話番号
   * @param propertyAddress 物件住所
   * @param notes 備考
   * @returns イベント説明文
   */
  private formatEventDescription(
    sellerName: string,
    sellerPhone: string,
    propertyAddress: string,
    notes?: string
  ): string {
    let description = `売主: ${sellerName}\n`;
    description += `電話: ${sellerPhone}\n`;
    description += `物件住所: ${propertyAddress}`;
    
    if (notes) {
      description += `\n\n備考: ${notes}`;
    }
    
    return description;
  }

  /**
   * 訪問査定予約を作成
   * @param request 予約リクエスト
   * @param assignedEmployeeId 営担の社員ID（カレンダーイベントを作成する対象）
   * @param sellerName 売主名
   * @param sellerPhone 売主電話番号
   * @param propertyAddress 物件住所
   */
  async createAppointment(
    request: AppointmentRequest,
    assignedEmployeeId: string,
    sellerName: string,
    sellerPhone: string,
    propertyAddress: string
  ): Promise<Appointment> {
    console.log('[CalendarService] Creating appointment for assigned employee:', assignedEmployeeId);
    console.log('[CalendarService] Request details:', {
      sellerId: request.sellerId,
      creatorEmployeeId: request.employeeId,
      assignedEmployeeId: assignedEmployeeId,
      startTime: request.startTime.toISOString(),
      endTime: request.endTime.toISOString(),
    });

    let calendarEventId: string | null = null;

    try {
      // 営担のGoogle Calendarにイベントを作成
      try {
        const isConnected = await this.googleAuthService.isConnected();
        
        if (isConnected) {
          console.log('[CalendarService] Retrieving employee email for calendar operations');
          
          // 営担のメールアドレスを取得
          const { data: employee, error: employeeError } = await this.table('employees')
            .select('id, name, email')
            .eq('id', assignedEmployeeId)
            .single();

          if (employeeError) {
            console.error('[CalendarService] Error fetching employee:', employeeError);
            throw new Error(`Employee lookup failed: ${employeeError.message}`);
          }

          if (!employee) {
            console.error('[CalendarService] Employee not found:', assignedEmployeeId);
            throw new Error(`Employee not found: ${assignedEmployeeId}`);
          }

          if (!employee.email) {
            console.error('[CalendarService] Employee missing email:', {
              id: employee.id,
              name: employee.name,
            });
            throw new Error(`営担（${employee.name}）のメールアドレスが設定されていません`);
          }

          console.log('[CalendarService] Retrieved employee email:', {
            employeeId: employee.id,
            employeeName: employee.name,
            employeeEmail: employee.email,
          });

          const eventData: CalendarEventData = {
            summary: `訪問査定: ${sellerName}様`,
            location: request.location,
            description: this.formatEventDescription(
              sellerName,
              sellerPhone,
              propertyAddress,
              request.notes
            ),
            startTime: request.startTime,
            endTime: request.endTime,
          };

          console.log('[CalendarService] Creating calendar event in calendar:', employee.email);
          
          calendarEventId = await this.createGoogleCalendarEvent(
            employee.email,
            eventData
          );
          
          console.log('[CalendarService] Calendar event created successfully:', {
            eventId: calendarEventId,
            calendarId: employee.email,
            assignedEmployeeId: assignedEmployeeId,
            assignedEmployeeName: employee.name,
          });
        } else {
          console.log('[CalendarService] Company account has not connected Google Calendar');
          throw new Error('GOOGLE_AUTH_REQUIRED');
        }
      } catch (calendarError: any) {
        console.error('[CalendarService] Failed to create calendar event:', calendarError.message);
        // 認証エラーの場合は予約作成を中止
        if (calendarError.message === 'GOOGLE_AUTH_REQUIRED') {
          throw calendarError;
        }
        // その他のカレンダーエラーは無視して続行
      }

      // データベースに予約を保存
      const { data: appointment, error: appointmentError } = await this.table(
        'appointments'
      )
        .insert({
          seller_id: request.sellerId,
          employee_id: request.employeeId,
          start_time: request.startTime.toISOString(),
          end_time: request.endTime.toISOString(),
          location: request.location,
          calendar_event_id: calendarEventId,
          assigned_to: request.assignedTo,
          assigned_employee_id: assignedEmployeeId,
          notes: request.notes,
          created_by_name: request.createdByName,
        })
        .select()
        .single();

      if (appointmentError || !appointment) {
        throw new Error(`Failed to create appointment: ${appointmentError?.message}`);
      }

      // 売主のステータスを更新
      const { error: statusError } = await this.table('sellers')
        .update({ status: SellerStatus.APPOINTMENT_SCHEDULED })
        .eq('id', request.sellerId);

      if (statusError) {
        console.error('Failed to update seller status:', statusError);
      }

      return appointment;
    } catch (error) {
      console.error('Create appointment error:', error);
      throw error;
    }
  }

  /**
   * 予約をキャンセル
   */
  async cancelAppointment(appointmentId: string): Promise<void> {
    try {
      // 予約情報を取得
      const { data: appointment, error: fetchError } = await this.table(
        'appointments'
      )
        .select('*')
        .eq('id', appointmentId)
        .single();

      if (fetchError || !appointment) {
        throw new Error('Appointment not found');
      }

      // Google Calendarイベントを削除（エラーが発生しても続行）
      if (appointment.calendar_event_id && appointment.assigned_employee_id) {
        try {
          console.log('[CalendarService] Deleting calendar event for assigned employee:', appointment.assigned_employee_id);
          
          // 営担のメールアドレスを取得
          const { data: employee } = await this.table('employees')
            .select('id, name, email')
            .eq('id', appointment.assigned_employee_id)
            .single();

          if (employee && employee.email) {
            console.log('[CalendarService] Deleting from calendar:', {
              employeeId: employee.id,
              employeeName: employee.name,
              employeeEmail: employee.email,
              eventId: appointment.calendar_event_id,
            });
            
            await this.deleteGoogleCalendarEvent(
              employee.email,
              appointment.calendar_event_id
            );
          } else {
            console.warn('[CalendarService] Employee or email not found for calendar deletion');
          }
        } catch (calendarError: any) {
          console.error('[CalendarService] Failed to delete calendar event:', calendarError.message);
          // カレンダーエラーは無視して続行
        }
      }

      // データベースから予約を削除
      const { error: deleteError } = await this.table('appointments')
        .delete()
        .eq('id', appointmentId);

      if (deleteError) {
        throw new Error(`Failed to delete appointment: ${deleteError.message}`);
      }

      console.log('✅ Appointment cancelled:', appointmentId);
    } catch (error) {
      console.error('Cancel appointment error:', error);
      throw error;
    }
  }

  /**
   * 予約を更新
   */
  async updateAppointment(
    appointmentId: string,
    updates: Partial<AppointmentRequest>
  ): Promise<Appointment> {
    try {
      // 既存の予約を取得
      const { data: appointment, error: fetchError } = await this.table(
        'appointments'
      )
        .select('*')
        .eq('id', appointmentId)
        .single();

      if (fetchError || !appointment) {
        throw new Error('Appointment not found');
      }

      // Google Calendarイベントを更新（エラーが発生しても続行）
      if (appointment.calendar_event_id && appointment.assigned_employee_id) {
        try {
          console.log('[CalendarService] Updating calendar event for assigned employee:', appointment.assigned_employee_id);
          
          // 営担のメールアドレスを取得
          const { data: employee } = await this.table('employees')
            .select('id, name, email')
            .eq('id', appointment.assigned_employee_id)
            .single();

          if (employee && employee.email) {
            console.log('[CalendarService] Updating calendar:', {
              employeeId: employee.id,
              employeeName: employee.name,
              employeeEmail: employee.email,
              eventId: appointment.calendar_event_id,
            });
            
            const eventUpdates: Partial<CalendarEventData> = {};
            
            if (updates.startTime) eventUpdates.startTime = updates.startTime;
            if (updates.endTime) eventUpdates.endTime = updates.endTime;
            if (updates.location) eventUpdates.location = updates.location;
            
            // 備考が更新された場合は説明文を再生成
            if (updates.notes !== undefined) {
              // 売主情報を取得
              const { data: seller } = await this.table('sellers')
                .select('name, phone_number')
                .eq('id', appointment.seller_id)
                .single();
              
              const { data: property } = await this.table('properties')
                .select('address')
                .eq('seller_id', appointment.seller_id)
                .single();
              
              if (seller && property) {
                eventUpdates.description = this.formatEventDescription(
                  seller.name,
                  seller.phone_number,
                  property.address,
                  updates.notes
                );
              }
            }

            await this.updateGoogleCalendarEvent(
              employee.email,
              appointment.calendar_event_id,
              eventUpdates
            );
            
            console.log('[CalendarService] Calendar event updated successfully');
          } else {
            console.warn('[CalendarService] Employee or email not found for calendar update');
          }
        } catch (calendarError: any) {
          console.error('[CalendarService] Failed to update calendar event:', calendarError.message);
          // カレンダーエラーは無視して続行
        }
      }

      // データベースを更新
      const updateData: any = {};
      if (updates.startTime) updateData.start_time = updates.startTime.toISOString();
      if (updates.endTime) updateData.end_time = updates.endTime.toISOString();
      if (updates.location) updateData.location = updates.location;
      if (updates.notes !== undefined) updateData.notes = updates.notes;

      const { data: updated, error: updateError } = await this.table('appointments')
        .update(updateData)
        .eq('id', appointmentId)
        .select()
        .single();

      if (updateError || !updated) {
        throw new Error(`Failed to update appointment: ${updateError?.message}`);
      }

      console.log('✅ Appointment updated:', appointmentId);
      return updated;
    } catch (error) {
      console.error('Update appointment error:', error);
      throw error;
    }
  }

  /**
   * 社員の予約一覧を取得
   */
  async getEmployeeAppointments(
    employeeId: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<Appointment[]> {
    let query = this.table('appointments')
      .select('*')
      .eq('employee_id', employeeId);

    if (dateFrom) {
      query = query.gte('start_time', dateFrom.toISOString());
    }
    if (dateTo) {
      query = query.lte('start_time', dateTo.toISOString());
    }

    const { data: appointments, error } = await query.order('start_time', { ascending: true });

    if (error) {
      throw new Error(`Failed to get appointments: ${error.message}`);
    }

    return appointments || [];
  }
}
