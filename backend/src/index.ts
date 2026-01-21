import dotenv from 'dotenv';
import path from 'path';

// 最初に環境変数を読み込む
const envPath = path.resolve(__dirname, '../.env');
console.log('📁 Loading .env from:', envPath);
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('❌ Error loading .env file:', result.error);
} else {
  console.log('✅ .env file loaded successfully');
  console.log('🔑 All environment variables starting with GMAIL:');
  Object.keys(process.env)
    .filter(key => key.startsWith('GMAIL'))
    .forEach(key => {
      console.log(`  ${key}:`, process.env[key] ? `"${process.env[key]?.substring(0, 20)}..."` : 'Missing');
    });
  console.log('🔑 All environment variables starting with GOOGLE_CALENDAR:');
  Object.keys(process.env)
    .filter(key => key.startsWith('GOOGLE_CALENDAR'))
    .forEach(key => {
      console.log(`  ${key}:`, process.env[key] ? `"${process.env[key]?.substring(0, 20)}..."` : 'Missing');
    });
}

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import supabase from './config/supabase';
import redisClient, { connectRedis } from './config/redis';
import authRoutes from './routes/auth';
import authSupabaseRoutes from './routes/auth.supabase';
import sellerRoutes from './routes/sellers';
import sellersManagementRoutes from './routes/sellersManagement';
import propertyRoutes from './routes/properties';
import valuationRoutes from './routes/valuations';
import emailRoutes from './routes/emails';
import activityLogRoutes from './routes/activityLogs';
import followUpRoutes from './routes/followUps';
import appointmentRoutes from './routes/appointments';
import summarizeRoutes from './routes/summarize';
import googleCalendarRoutes from './routes/googleCalendar';
import employeeRoutes from './routes/employees';
import chatNotificationRoutes from './routes/chatNotifications';
import webhookRoutes from './routes/webhooks';
import integrationRoutes from './routes/integration';
import syncRoutes from './routes/sync';
import validationRoutes from './routes/validation';
import cacheRoutes from './routes/cache';
import driveRoutes from './routes/drive';
import workTaskRoutes from './routes/workTasks';
import propertyListingRoutes from './routes/propertyListings';
import buyerRoutes from './routes/buyers';
import viewingResultRoutes from './routes/viewingResults';
import callRoutes from './routes/calls';
import sellerRecoveryRoutes from './routes/sellerRecovery';
import inquiryResponseRoutes from './routes/inquiryResponse';
import emailTemplateRoutes from './routes/emailTemplates';
import gmailRoutes from './routes/gmail';
import inquiryHistoryRoutes from './routes/inquiryHistories';
import auditLogRoutes from './routes/auditLogs';
import publicPropertiesRoutes from './routes/publicProperties';
import publicInquiriesRoutes from './routes/publicInquiries';
import propertyListingSyncRoutes from './routes/propertyListingSync';
import geocodeRoutes from './routes/geocode';
import urlRedirectRoutes from './routes/urlRedirect';
import { activityLogger } from './middleware/activityLogger';

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize connections
const initializeConnections = async () => {
  try {
    // Test Supabase connection
    const { data, error } = await supabase.from('employees').select('count').limit(1);
    if (error) throw error;
    console.log('✅ Supabase connection verified');
  } catch (error) {
    console.error('⚠️ Supabase connection test failed, but continuing:', error);
    // Don't exit, allow the server to start
  }

  // Connect to Redis (non-blocking, will fallback to memory store if unavailable)
  try {
    await connectRedis();
    console.log('✅ Session store initialized');
  } catch (error) {
    console.warn('⚠️ Redis connection failed, using in-memory session store');
  }
};

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'http://localhost:5174', 
    'http://localhost:5175',
    'http://localhost:3000',  // バックエンド自身も追加
    'https://property-site-frontend-kappa.vercel.app',  // 本番環境フロントエンド
    'https://baikyaku-property-site3.vercel.app'  // 本番環境バックエンド
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' })); // 画像付きメール対応のため制限を増やす
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(activityLogger);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
// 認証ルート（ローカルと本番の両方に対応）
app.use('/auth', authSupabaseRoutes);
app.use('/api/auth', authSupabaseRoutes);  // 本番環境用
app.use('/api/sellers', sellerRoutes);
app.use('/api/sellers', sellersManagementRoutes);
app.use('/properties', propertyRoutes);
app.use('/api/sellers', valuationRoutes);
app.use('/api/sellers', emailRoutes);
app.use('/api/emails', emailRoutes);  // 画像添付機能用の追加ルート
app.use('/api/sellers', followUpRoutes);
app.use('/appointments', appointmentRoutes);
app.use('/activity-logs', activityLogRoutes);
app.use('/summarize', summarizeRoutes);
app.use('/api/auth/google/calendar', googleCalendarRoutes);
app.use('/employees', employeeRoutes);
app.use('/chat-notifications', chatNotificationRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/integration', integrationRoutes);
app.use('/api/sync', syncRoutes);
app.use('/cache', cacheRoutes);
app.use('/api/drive', driveRoutes);
app.use('/api/work-tasks', workTaskRoutes);
app.use('/api/property-listings', propertyListingRoutes);
app.use('/api/buyers', buyerRoutes);
app.use('/api', viewingResultRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/validation', validationRoutes);
app.use('/api/sellers', sellerRecoveryRoutes);
app.use('/api/inquiry-response', inquiryResponseRoutes);
app.use('/api/email-templates', emailTemplateRoutes);
app.use('/api/gmail', gmailRoutes);
app.use('/api/public/inquiries', publicInquiriesRoutes); // 公開物件問い合わせAPI（認証不要）
app.use('/api/public', publicPropertiesRoutes); // 公開物件サイト用API（認証不要なので先に登録）
app.use('/api/geocode', geocodeRoutes); // ジオコーディング座標保存API（認証不要）
app.use('/api/url-redirect', urlRedirectRoutes); // 短縮URLリダイレクト解決API（認証不要）
app.use('/api', inquiryHistoryRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/property-listing-sync', propertyListingSyncRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      retryable: false,
    },
  });
});

const startServer = async () => {
  await initializeConnections();
  
  // Vercel環境では app.listen() を呼ばない
  if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      
      // 強化版自動同期を非同期で実行（サーバー起動をブロックしない）
      // デフォルトで有効、明示的にfalseの場合のみ無効
      setTimeout(async () => {
        try {
          const { getEnhancedPeriodicSyncManager, isAutoSyncEnabled } = await import('./services/EnhancedAutoSyncService');
          
          if (!isAutoSyncEnabled()) {
            console.log('📊 Auto-sync is disabled (AUTO_SYNC_ENABLED=false)');
            return;
          }
          
          const periodicSyncManager = getEnhancedPeriodicSyncManager();
          await periodicSyncManager.start();
          console.log(`📊 Enhanced periodic auto-sync enabled (interval: ${periodicSyncManager.getIntervalMinutes()} minutes)`);
          console.log('   Using full comparison mode - all missing sellers will be detected');
        } catch (error: any) {
          console.error('⚠️ Enhanced auto-sync failed (non-blocking):', error.message);
          console.log('   Will retry in 1 minute...');
        }
      }, 5000); // 5秒後に実行

      // 録音ファイルクリーンアップワーカーを起動
      setTimeout(async () => {
        try {
          const { getRecordingCleanupWorker } = await import('./jobs/recordingCleanup');
          const cleanupWorker = getRecordingCleanupWorker();
          cleanupWorker.start();
          const config = cleanupWorker.getConfig();
          console.log(`🧹 Recording cleanup worker started (schedule: ${config.schedule}, retention: ${config.retentionDays} days)`);
        } catch (error: any) {
          console.error('⚠️ Recording cleanup worker failed to start (non-blocking):', error.message);
        }
      }, 10000); // 10秒後に実行

      // 問い合わせ同期ジョブを無効化（APIエンドポイントから直接転記するため）
      // setTimeout(async () => {
      //   try {
      //     const { getInquirySyncJob } = await import('./jobs/inquirySyncJob');
      //     const inquirySyncJob = getInquirySyncJob();
      //     await inquirySyncJob.start(5); // 5分ごとに実行
      //     console.log('📋 Inquiry sync job started (interval: 5 minutes)');
      //   } catch (error: any) {
      //     console.error('⚠️ Inquiry sync job failed to start (non-blocking):', error.message);
      //   }
      // }, 15000); // 15秒後に実行
      console.log('📋 Inquiry sync job disabled (direct sync from API endpoint)');
    });
  } else {
    console.log('🚀 Running in Vercel serverless environment');
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'production'}`);
  }
};

// Vercel環境では初期化のみ実行
if (process.env.VERCEL === '1') {
  initializeConnections().catch((error) => {
    console.error('Failed to initialize connections:', error);
  });
} else {
  startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

export default app;
