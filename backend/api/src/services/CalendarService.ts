import { google } from 'googleapis';
import { BaseRepository } from '../repositories/BaseRepository';
import { Appointment, SellerStatus } from '../types';

export interface AppointmentRequest {
  sellerId: string;
  employeeId: string;
  startTime: Date;
  endTime: Date;
  location: string;
  notes?: string;
}

export interface CalendarEvent {
  id: string;
  htmlLink: string;
  summary: string;
  location: string;
  start: { dateTime: string };
  end: { dateTime: string };
}

export class CalendarService extends BaseRepository {
  private calendar: any;

  constructor() {
    super();
    this.initializeCalendar();
  }

  /**
   * Google Calendar APIを初期化
   */
  private initializeCalendar() {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    this.calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  }

  /**
   * 訪問査定予約を作成
   */
  async createAppointment(
    request: AppointmentRequest,
    sellerName: string,
    sellerPhone: string,
    propertyAddress: string
  ): Promise<Appointment> {
    try {
      // カレンダーイベントを作成
      const event = await this.createCalendarEvent(
        request,
        sellerName,
        sellerPhone,
        propertyAddress
      );

      // データベースに予約を保存
      const { data: appointment, error: appointmentError } = await this.table('appointments')
        .insert({
          seller_id: request.sellerId,
          employee_id: request.employeeId,
          start_time: request.startTime.toISOString(),
          end_time: request.endTime.toISOString(),
          location: request.location,
          calendar_event_id: event.id,
          notes: request.notes,
        })
        .select()
        .single();

      if (appointmentError || !appointment) {
        throw new Error('Failed to create appointment');
      }

      // 売主のステータスを更新
      const { error: statusError } = await this.table('sellers')
        .update({ status: SellerStatus.APPOINTMENT_SCHEDULED })
        .eq('id', request.sellerId);

      if (statusError) {
        throw new Error('Failed to update seller status');
      }

      return appointment;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 予約をキャンセル
   */
  async cancelAppointment(appointmentId: string): Promise<void> {
    try {
      // 予約情報を取得
      const { data: appointment, error: fetchError } = await this.table('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();

      if (fetchError || !appointment) {
        throw new Error('Appointment not found');
      }

      // カレンダーイベントを削除
      if (appointment.calendar_event_id) {
        await this.deleteCalendarEvent(appointment.calendar_event_id);
      }

      // データベースから予約を削除
      const { error: deleteError } = await this.table('appointments')
        .delete()
        .eq('id', appointmentId);

      if (deleteError) {
        throw new Error('Failed to delete appointment');
      }
    } catch (error) {
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
      const { data: appointment, error: fetchError } = await this.table('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();

      if (fetchError || !appointment) {
        throw new Error('Appointment not found');
      }

      // カレンダーイベントを更新
      if (appointment.calendar_event_id) {
        await this.updateCalendarEvent(appointment.calendar_event_id, updates);
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
        throw new Error('Failed to update appointment');
      }

      return updated;
    } catch (error) {
      throw error;
    }
  }

  /**
   * カレンダーイベントを作成
   */
  private async createCalendarEvent(
    request: AppointmentRequest,
    sellerName: string,
    sellerPhone: string,
    propertyAddress: string
  ): Promise<CalendarEvent> {
    const event = {
      summary: `訪問査定: ${sellerName}様`,
      location: request.location,
      description: `
売主: ${sellerName}
電話: ${sellerPhone}
物件住所: ${propertyAddress}
${request.notes ? `\n備考: ${request.notes}` : ''}
      `.trim(),
      start: {
        dateTime: request.startTime.toISOString(),
        timeZone: 'Asia/Tokyo',
      },
      end: {
        dateTime: request.endTime.toISOString(),
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

    const response = await this.calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    return response.data;
  }

  /**
   * カレンダーイベントを削除
   */
  private async deleteCalendarEvent(eventId: string): Promise<void> {
    await this.calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    });
  }

  /**
   * カレンダーイベントを更新
   */
  private async updateCalendarEvent(
    eventId: string,
    updates: Partial<AppointmentRequest>
  ): Promise<void> {
    // 既存のイベントを取得
    const event = await this.calendar.events.get({
      calendarId: 'primary',
      eventId: eventId,
    });

    // 更新内容を適用
    const updatedEvent = { ...event.data };

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
    if (updates.location) {
      updatedEvent.location = updates.location;
    }

    // イベントを更新
    await this.calendar.events.update({
      calendarId: 'primary',
      eventId: eventId,
      requestBody: updatedEvent,
    });
  }

  /**
   * calendar_event_idで予約を検索
   * @param eventId カレンダーイベントID
   * @returns 予約情報（存在しない場合はnull）
   */
  async findAppointmentByCalendarEventId(eventId: string): Promise<Appointment | null> {
    try {
      const { data, error } = await this.table<Appointment>('appointments')
        .select('*')
        .eq('calendar_event_id', eventId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // レコードが見つからない場合
          return null;
        }
        throw new Error(`Failed to find appointment: ${error.message}`);
      }

      return data;
    } catch (error: any) {
      console.error('Error finding appointment by calendar event ID:', error);
      throw error;
    }
  }

  /**
   * calendar_event_idで予約を削除（Google Calendar同期用）
   * @param eventId カレンダーイベントID
   * @param source 削除のソース（'user' | 'calendar_sync'）
   */
  async deleteAppointmentByCalendarEventId(
    eventId: string,
    source: 'user' | 'calendar_sync' = 'calendar_sync'
  ): Promise<void> {
    try {
      console.log(`🗑️ Deleting appointment for calendar event: ${eventId}`);

      // 予約を検索
      const appointment = await this.findAppointmentByCalendarEventId(eventId);

      if (!appointment) {
        console.log(`   ℹ️ No appointment found for event ${eventId} - skipping`);
        return;
      }

      console.log(`   Found appointment: ${appointment.id}`);

      // 予約を削除
      const { error: deleteError } = await this.table('appointments')
        .delete()
        .eq('id', appointment.id);

      if (deleteError) {
        throw new Error(`Failed to delete appointment: ${deleteError.message}`);
      }

      // アクティビティログを作成
      const { error: logError } = await this.table('activity_logs').insert({
        seller_id: appointment.sellerId,
        employee_id: appointment.employeeId,
        action: 'appointment_deleted',
        details: {
          appointment_id: appointment.id,
          calendar_event_id: eventId,
          source: source === 'calendar_sync' ? 'Google Calendar Sync' : 'User',
          deleted_at: new Date().toISOString(),
        },
      });

      if (logError) {
        console.error(`   ⚠️ Failed to create activity log: ${logError.message}`);
        // ログ作成失敗は致命的エラーとしない
      }

      console.log(`✅ Appointment deleted successfully`);
      console.log(`   Source: ${source === 'calendar_sync' ? 'Google Calendar Sync' : 'User'}`);
    } catch (error: any) {
      console.error('Error deleting appointment by calendar event ID:', error);
      throw error;
    }
  }
}
