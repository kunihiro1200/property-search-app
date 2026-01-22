import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { CalendarService, AppointmentRequest } from '../services/CalendarService.supabase';
import { SellerService } from '../services/SellerService.supabase';
import { EmployeeUtils } from '../utils/employeeUtils';
import { authenticate } from '../middleware/auth';

const router = Router();
const calendarService = new CalendarService();
const sellerService = new SellerService();
const employeeUtils = new EmployeeUtils();

// 全てのルートに認証を適用
router.use(authenticate);

/**
 * 訪問査定予約を作成
 */
router.post(
  '/',
  [
    body('sellerId').isUUID().withMessage('Invalid seller ID'),
    body('startTime').isISO8601().withMessage('Invalid start time'),
    body('endTime').isISO8601().withMessage('Invalid end time'),
  ],
  async (req: Request, res: Response) => {
    try {
      console.log('[Appointments] POST /appointments - Request received');
      console.log('[Appointments] Request details:', {
        sellerId: req.body.sellerId,
        assignedTo: req.body.assignedTo,
        creatorEmployeeId: req.employee!.id,
        creatorEmployeeName: req.employee!.name,
        timestamp: new Date().toISOString(),
      });

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error('[Appointments] Validation failed:', errors.array());
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: errors.array(),
            retryable: false,
          },
        });
      }

      const { sellerId, startTime, endTime, assignedTo, notes } = req.body;

      // 営担イニシャルから従業員情報を取得
      if (!assignedTo) {
        console.error('[Appointments] Missing assignedTo field');
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '営担を指定してください',
            retryable: false,
          },
        });
      }

      console.log('[Appointments] Looking up assigned employee by initials:', assignedTo);
      
      let assignedEmployee;
      try {
        assignedEmployee = await employeeUtils.getEmployeeByInitials(assignedTo);
      } catch (error: any) {
        // 重複イニシャルエラーをキャッチ
        if (error.message && error.message.includes('複数の社員に一致します')) {
          console.error('[Appointments] Ambiguous initials detected:', error.message);
          return res.status(400).json({
            error: {
              code: 'AMBIGUOUS_INITIALS',
              message: error.message,
              retryable: false,
            },
          });
        }
        throw error;
      }
      
      if (!assignedEmployee) {
        console.error('[Appointments] Assigned employee not found:', assignedTo);
        return res.status(404).json({
          error: {
            code: 'ASSIGNED_EMPLOYEE_NOT_FOUND',
            message: `営担（${assignedTo}）が見つかりません`,
            retryable: false,
          },
        });
      }

      console.log('[Appointments] Assigned employee resolved:', {
        initials: assignedTo,
        employeeId: assignedEmployee.id,
        employeeName: assignedEmployee.name,
        employeeEmail: assignedEmployee.email,
      });

      // 営担がカレンダー操作に必要なデータを持っているか検証
      console.log('[Appointments] Validating assigned employee for calendar operations');
      const isValid = await employeeUtils.validateEmployeeForCalendar(assignedEmployee.id);
      if (!isValid) {
        console.error('[Appointments] Assigned employee validation failed:', {
          employeeId: assignedEmployee.id,
          employeeName: assignedEmployee.name,
        });
        return res.status(400).json({
          error: {
            code: 'EMPLOYEE_EMAIL_MISSING',
            message: `営担（${assignedEmployee.name}）のメールアドレスが設定されていません`,
            retryable: false,
          },
        });
      }
      console.log('[Appointments] Assigned employee validation passed');

      // 売主情報を取得
      const seller = await sellerService.getSeller(sellerId);
      if (!seller) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Seller not found',
            retryable: false,
          },
        });
      }

      // 物件情報を取得
      const { data: property, error: propertyError } = await calendarService['table']('properties')
        .select('*')
        .eq('seller_id', sellerId)
        .single();

      if (propertyError || !property) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Property information not found',
            retryable: false,
          },
        });
      }

      const appointmentRequest: AppointmentRequest = {
        sellerId,
        employeeId: req.employee!.id,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location: property.address, // 物件住所を使用
        assignedTo, // 営担イニシャル
        assignedEmployeeId: assignedEmployee.id, // 営担の社員ID
        notes,
        createdByName: req.employee!.name, // ログイン中のユーザーの名前
      };

      console.log('[Appointments] Calling CalendarService.createAppointment');
      console.log('[Appointments] Appointment details:', {
        sellerId: appointmentRequest.sellerId,
        creatorEmployeeId: appointmentRequest.employeeId,
        assignedEmployeeId: assignedEmployee.id,
        assignedEmployeeName: assignedEmployee.name,
        assignedEmployeeEmail: assignedEmployee.email,
        startTime: appointmentRequest.startTime.toISOString(),
        endTime: appointmentRequest.endTime.toISOString(),
      });

      const appointment = await calendarService.createAppointment(
        appointmentRequest,
        assignedEmployee.id,
        seller.name,
        seller.phoneNumber,
        property.address
      );

      console.log('[Appointments] Appointment created successfully:', {
        appointmentId: appointment.id,
        calendarEventId: appointment.calendarEventId,
        assignedEmployeeId: assignedEmployee.id,
        assignedEmployeeName: assignedEmployee.name,
      });

      res.status(201).json(appointment);
    } catch (error: any) {
      console.error('Create appointment error:', error);

      // Google Calendar認証エラー
      if (error.message === 'GOOGLE_AUTH_REQUIRED') {
        console.error('[Appointments] Google Calendar not connected');
        return res.status(400).json({
          error: {
            code: 'GOOGLE_AUTH_REQUIRED',
            message: `営担（${req.body.assignedTo}）がGoogleカレンダーを接続していません。接続してから再度お試しください。`,
            retryable: false,
          },
        });
      }

      // メールアドレス不足エラー
      if (error.message && error.message.includes('メールアドレスが設定されていません')) {
        console.error('[Appointments] Employee email missing:', error.message);
        return res.status(400).json({
          error: {
            code: 'EMPLOYEE_EMAIL_MISSING',
            message: error.message,
            retryable: false,
          },
        });
      }

      // その他のエラー
      console.error('[Appointments] Unexpected error:', {
        message: error.message,
        stack: error.stack,
        assignedTo: req.body.assignedTo,
        sellerId: req.body.sellerId,
      });
      
      res.status(500).json({
        error: {
          code: 'CREATE_APPOINTMENT_ERROR',
          message: 'Failed to create appointment',
          details: error.message,
          retryable: true,
        },
      });
    }
  }
);

/**
 * 予約をキャンセル
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await calendarService.cancelAppointment(id);
    res.json({ message: 'Appointment cancelled successfully' });
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({
      error: {
        code: 'CANCEL_APPOINTMENT_ERROR',
        message: 'Failed to cancel appointment',
        retryable: true,
      },
    });
  }
});

/**
 * 予約を更新
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates: Partial<AppointmentRequest> = {};

    if (req.body.startTime) {
      updates.startTime = new Date(req.body.startTime);
    }
    if (req.body.endTime) {
      updates.endTime = new Date(req.body.endTime);
    }
    if (req.body.location) {
      updates.location = req.body.location;
    }
    if (req.body.notes !== undefined) {
      updates.notes = req.body.notes;
    }

    const appointment = await calendarService.updateAppointment(id, updates);
    res.json(appointment);
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({
      error: {
        code: 'UPDATE_APPOINTMENT_ERROR',
        message: 'Failed to update appointment',
        retryable: true,
      },
    });
  }
});

/**
 * 売主の予約一覧を取得
 */
router.get('/seller/:sellerId', async (req: Request, res: Response) => {
  try {
    const { sellerId } = req.params;

    const { data: appointments, error } = await calendarService['table']('appointments')
      .select('*')
      .eq('seller_id', sellerId)
      .order('start_time', { ascending: true });

    if (error) {
      throw error;
    }

    res.json(appointments || []);
  } catch (error) {
    console.error('Get seller appointments error:', error);
    res.status(500).json({
      error: {
        code: 'GET_APPOINTMENTS_ERROR',
        message: 'Failed to get appointments',
        retryable: true,
      },
    });
  }
});

export default router;
