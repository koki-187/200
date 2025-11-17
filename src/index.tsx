import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers';
import { Bindings } from './types';

// ルートのインポート
import auth from './routes/auth';
import deals from './routes/deals';
import messages from './routes/messages';
import files from './routes/files';
import proposals from './routes/proposals';
import settings from './routes/settings';
import notifications from './routes/notifications';
import ocr from './routes/ocr';
import email from './routes/email';
import pdf from './routes/pdf';

const app = new Hono<{ Bindings: Bindings }>();

// セキュリティヘッダー設定（全リクエストに適用）
app.use('*', async (c, next) => {
  await next();
  
  // Content Security Policy
  c.header('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.tailwindcss.com cdn.jsdelivr.net; " +
    "style-src 'self' 'unsafe-inline' cdn.jsdelivr.net fonts.googleapis.com; " +
    "font-src 'self' cdn.jsdelivr.net fonts.gstatic.com; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self';"
  );
  
  // クリックジャッキング対策
  c.header('X-Frame-Options', 'DENY');
  
  // MIMEタイプスニッフィング対策
  c.header('X-Content-Type-Options', 'nosniff');
  
  // HTTPS強制（本番環境）
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
  // リファラーポリシー
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // XSS対策
  c.header('X-XSS-Protection', '1; mode=block');
  
  // 権限ポリシー
  c.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
});

// CORS設定
app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// APIルートのマウント
app.route('/api/auth', auth);
app.route('/api/deals', deals);
app.route('/api/messages', messages);
app.route('/api/files', files);
app.route('/api/proposals', proposals);
app.route('/api/settings', settings);
app.route('/api/notifications', notifications);
app.route('/api/ocr', ocr);
app.route('/api/email', email);
app.route('/api/pdf', pdf);

// ヘルスチェック
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 静的ファイルの配信
app.use('/static/*', serveStatic({ root: './public' }));

// 静的ファイルの配信
app.use('/static/*', serveStatic({ root: './public' }));
app.use('/assets/*', serveStatic({ root: './dist' }));

// Cloudflare Workers export with Cron support
export default {
  async fetch(request: Request, env: Bindings, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },

  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    // Cronトリガーで定期実行される処理
    console.log('Cron triggered at:', new Date(event.scheduledTime).toISOString());

    try {
      // メール通知が有効な場合のみ実行
      if (!env.RESEND_API_KEY) {
        console.log('RESEND_API_KEY not configured, skipping email notifications');
        return;
      }

      const { Database } = await import('./db/queries');
      const { createEmailService } = await import('./utils/email');

      const db = new Database(env.DB);
      const emailService = createEmailService(env.RESEND_API_KEY);

      // 24時間以内に期限が来る案件を取得
      const deals = await db.getDealsNearDeadline(24);
      console.log(`Found ${deals.length} deals near deadline`);

      let sentCount = 0;
      for (const deal of deals) {
        try {
          const seller = await db.getUserById(deal.seller_id);
          if (seller?.email) {
            const deadline = new Date(deal.response_deadline);
            const now = new Date();
            const hoursRemaining = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60));

            if (hoursRemaining > 0 && hoursRemaining <= 24) {
              const result = await emailService.sendDeadlineNotification(
                seller.email,
                deal.title,
                deal.response_deadline,
                hoursRemaining
              );

              if (result.success) {
                console.log(`Deadline notification sent to ${seller.email} for deal: ${deal.title}`);
                sentCount++;
              } else {
                console.error(`Failed to send notification to ${seller.email}:`, result.error);
              }
            }
          }
        } catch (error) {
          console.error(`Error processing deal ${deal.id}:`, error);
        }
      }

      console.log(`Cron job completed. Sent ${sentCount} notifications.`);
    } catch (error) {
      console.error('Cron job error:', error);
    }
  }
};
