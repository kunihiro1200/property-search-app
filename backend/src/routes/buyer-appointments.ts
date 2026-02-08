import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { CalendarService } from '../services/CalendarService.supabase';
import { EmployeeUtils } from '../utils/employeeUtils';
import { authenticate } from '../middleware/auth';

const router = Router();
const calendarService = new CalendarService();
const employeeUtils = new EmployeeUtils();

// 全てのルートに認証を適用
router.use(authenticate);

/**
 * 買主内覧予約を作成
 */
router.post(
  '/',
  [
    body('buyerNumber').isString().withMessage('Invalid buyer number'),
    body('startTime').isISO8601().withMessage('Invalid start time'),
    body('endTime').isISO8601().withMessage('Invalid end time'),
    body('assignedTo').isString().withMessage('Assigned employee is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      console.log('[BuyerAppointments] POST /buyer-appointments - Request received');
      console.log('[BuyerAppointments] Request details:', {
        buyerNumber: req.body.buyerNumber,
        assignedTo: req.body.assignedTo,
        creatorEmployeeId: req.employee!.id,
        creatorEmployeeName: req.employee!.name,
        timestamp: new Date().toISOString(),
      });

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error('[BuyerAppointments] Validation failed:', errors.array());
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: errors.array(),
            retryable: false,
          },
        });
      }

      const { buyerNumber, startTime, endTime, assignedTo, buyerName, buyerPhone, buyerEmail, viewingMobile, propertyAddress, propertyGoogleMapUrl, inquiryHearing, creatorName } = req.body;

      // 後続担当イニシャルから従業員情報を取得
      console.log('[BuyerAppointments] Looking up assigned employee by initials:', assignedTo);
      
      let assignedEmployee;
      try {
        assignedEmployee = await employeeUtils.getEmployeeByInitials(assignedTo);
      } catch (error: any) {
        // 重複イニシャルエラーをキャッチ
        if (error.message && error.message.includes('複数の社員に一致します')) {
          console.error('[BuyerAppointments] Ambiguous initials detected:', error.message);
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
        console.error('[BuyerAppointments] Assigned employee not found:', assignedTo);
        return res.status(404).json({
          error: {
            code: 'ASSIGNED_EMPLOYEE_NOT_FOUND',
            message: `後続担当（${assignedTo}）が見つかりません`,
            retryable: false,
          },
        });
      }

      console.log('[BuyerAppointments] Assigned employee resolved:', {
        initials: assignedTo,
        employeeId: assignedEmployee.id,
        employeeName: assignedEmployee.name,
        employeeEmail: assignedEmployee.email,
      });

      // 後続担当がメールアドレスを持っているか検証
      console.log('[BuyerAppointments] Validating assigned employee email');
      if (!assignedEmployee.email) {
        console.error('[BuyerAppointments] Assigned employee email missing:', {
          employeeId: assignedEmployee.id,
          employeeName: assignedEmployee.name,
        });
        return res.status(400).json({
          error: {
            code: 'EMPLOYEE_EMAIL_MISSING',
            message: `後続担当（${assignedEmployee.name}）のメールアドレスが設定されていません`,
            retryable: false,
          },
        });
      }
      console.log('[BuyerAppointments] Assigned employee email validation passed');

      // カレンダーイベントを作成
      const eventData = {
        summary: `${viewingMobile || '内覧'} ${propertyAddress || ''} ${buyerName || buyerNumber}`,
        location: propertyAddress || '',
        description: 
          `物件住所: ${propertyAddress || 'なし'}\n` +
          `GoogleMap: ${propertyGoogleMapUrl || 'なし'}\n` +
          `\n` +
          `お客様名: ${buyerName || buyerNumber}\n` +
          `電話番号: ${buyerPhone || 'なし'}\n` +
          `問合時ヒアリング: ${inquiryHearing || 'なし'}\n` +
          `内覧取得者名: ${creatorName || 'なし'}\n` +
          `\n` +
          `買主詳細ページ:\n${process.env.FRONTEND_URL || 'http://localhost:3000'}/buyers/${buyerNumber}`,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
      };

      console.log('[BuyerAppointments] Creating Google Calendar event');
      console.log('[BuyerAppointments] Event details:', {
        assignedEmployeeId: assignedEmployee.id,
        assignedEmployeeName: assignedEmployee.name,
        assignedEmployeeEmail: assignedEmployee.email,
        startTime: eventData.startTime.toISOString(),
        endTime: eventData.endTime.toISOString(),
      });

      const calendarEventId = await calendarService.createGoogleCalendarEventForEmployee(
        assignedEmployee.id,
        assignedEmployee.email,
        eventData
      );

      console.log('[BuyerAppointments] Calendar event created successfully:', {
        calendarEventId,
        assignedEmployeeId: assignedEmployee.id,
        assignedEmployeeName: assignedEmployee.name,
      });

      res.status(201).json({
        success: true,
        calendarEventId,
        assignedEmployee: {
          id: assignedEmployee.id,
          name: assignedEmployee.name,
          email: assignedEmployee.email,
        },
      });
    } catch (error: any) {
      console.error('Create buyer appointment error:', error);

      // Google Calendar認証エラー
      if (error.message === 'GOOGLE_AUTH_REQUIRED') {
        console.error('[BuyerAppointments] Google Calendar not connected');
        return res.status(400).json({
          error: {
            code: 'GOOGLE_AUTH_REQUIRED',
            message: `会社アカウント（tenant@ifoo-oita.com）がGoogleカレンダーを接続していません。管理者に連絡してください。`,
            retryable: false,
          },
        });
      }

      // メールアドレス不足エラー
      if (error.message && error.message.includes('メールアドレスが設定されていません')) {
        console.error('[BuyerAppointments] Employee email missing:', error.message);
        return res.status(400).json({
          error: {
            code: 'EMPLOYEE_EMAIL_MISSING',
            message: error.message,
            retryable: false,
          },
        });
      }

      // その他のエラー
      console.error('[BuyerAppointments] Unexpected error:', {
        message: error.message,
        stack: error.stack,
        assignedTo: req.body.assignedTo,
        buyerNumber: req.body.buyerNumber,
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

export default router;
