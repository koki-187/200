import { Resend } from 'resend';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export class EmailService {
  private resend: Resend;
  private fromEmail: string;

  constructor(apiKey: string, fromEmail: string = 'noreply@example.com') {
    this.resend = new Resend(apiKey);
    this.fromEmail = fromEmail;
  }

  async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: options.from || this.fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html
      });

      if (error) {
        console.error('Email send error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, messageId: data?.id };
    } catch (error) {
      console.error('Email service error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // 期限通知メール
  async sendDeadlineNotification(
    to: string, 
    dealTitle: string, 
    deadline: string,
    hoursRemaining: number
  ): Promise<{ success: boolean; error?: string }> {
    const urgencyClass = hoursRemaining < 24 ? 'urgent' : 'warning';
    const urgencyText = hoursRemaining < 24 ? '緊急' : '注意';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Noto Sans JP', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #0A1A2F; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
          .urgent { background: #FEE2E2; border-left: 4px solid #DC2626; padding: 15px; margin: 20px 0; }
          .warning { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; }
          .button { display: inline-block; background: #C9A86A; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ 期限通知</h1>
          </div>
          <div class="content">
            <div class="${urgencyClass}">
              <strong>【${urgencyText}】案件の一次回答期限が近づいています</strong>
            </div>
            
            <h2>案件情報</h2>
            <p><strong>案件名:</strong> ${dealTitle}</p>
            <p><strong>回答期限:</strong> ${new Date(deadline).toLocaleString('ja-JP')}</p>
            <p><strong>残り時間:</strong> 約${hoursRemaining}時間</p>
            
            <p>営業日48時間以内の一次回答が必要です。早急にご対応ください。</p>
            
            <a href="https://your-domain.pages.dev" class="button">案件を確認する</a>
          </div>
          <div class="footer">
            <p>200棟アパート用地仕入れプロジェクト</p>
            <p>このメールは自動送信されています。返信の必要はありません。</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to,
      subject: `【${urgencyText}】案件の期限通知: ${dealTitle}`,
      html
    });
  }

  // 新規メッセージ通知
  async sendNewMessageNotification(
    to: string,
    dealTitle: string,
    senderName: string,
    messagePreview: string
  ): Promise<{ success: boolean; error?: string }> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Noto Sans JP', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #0A1A2F; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
          .message-box { background: white; padding: 20px; border-left: 4px solid #C9A86A; margin: 20px 0; }
          .button { display: inline-block; background: #C9A86A; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💬 新着メッセージ</h1>
          </div>
          <div class="content">
            <h2>案件: ${dealTitle}</h2>
            <p><strong>${senderName}</strong> さんからメッセージが届きました。</p>
            
            <div class="message-box">
              <p>${messagePreview.substring(0, 200)}${messagePreview.length > 200 ? '...' : ''}</p>
            </div>
            
            <a href="https://your-domain.pages.dev" class="button">メッセージを確認する</a>
          </div>
          <div class="footer">
            <p>200棟アパート用地仕入れプロジェクト</p>
            <p>このメールは自動送信されています。返信の必要はありません。</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to,
      subject: `【新着メッセージ】${dealTitle} - ${senderName}`,
      html
    });
  }

  // 新規案件通知（エージェント向け）
  async sendNewDealNotification(
    to: string,
    dealTitle: string,
    dealDetails: {
      location?: string;
      station?: string;
      deadline?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Noto Sans JP', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #0A1A2F; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
          .info-box { background: white; padding: 20px; margin: 20px 0; border: 1px solid #ddd; }
          .button { display: inline-block; background: #C9A86A; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏢 新規案件登録</h1>
          </div>
          <div class="content">
            <p>新しい案件が登録されました。</p>
            
            <div class="info-box">
              <h2>${dealTitle}</h2>
              ${dealDetails.location ? `<p><strong>所在地:</strong> ${dealDetails.location}</p>` : ''}
              ${dealDetails.station ? `<p><strong>最寄駅:</strong> ${dealDetails.station}</p>` : ''}
              ${dealDetails.deadline ? `<p><strong>回答期限:</strong> ${new Date(dealDetails.deadline).toLocaleString('ja-JP')}</p>` : ''}
            </div>
            
            <p>詳細をご確認の上、調査・回答をお願いいたします。</p>
            
            <a href="https://your-domain.pages.dev" class="button">案件を確認する</a>
          </div>
          <div class="footer">
            <p>200棟アパート用地仕入れプロジェクト</p>
            <p>このメールは自動送信されています。返信の必要はありません。</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to,
      subject: `【新規案件】${dealTitle}`,
      html
    });
  }

  // 新規案件通知（管理者向け）
  async sendAdminNewDealNotification(
    to: string,
    dealTitle: string,
    dealDetails: {
      location?: string;
      station?: string;
      deadline?: string;
      sellerName?: string;
      sellerEmail?: string;
      buyerId?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Noto Sans JP', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #DC2626; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
          .info-box { background: white; padding: 20px; margin: 20px 0; border: 1px solid #ddd; }
          .highlight { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; }
          .button { display: inline-block; background: #DC2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 管理者通知：新規案件登録</h1>
          </div>
          <div class="content">
            <div class="highlight">
              <strong>ユーザーが新しい案件を登録しました。</strong>
            </div>
            
            <div class="info-box">
              <h2>${dealTitle}</h2>
              ${dealDetails.location ? `<p><strong>所在地:</strong> ${dealDetails.location}</p>` : ''}
              ${dealDetails.station ? `<p><strong>最寄駅:</strong> ${dealDetails.station}</p>` : ''}
              ${dealDetails.deadline ? `<p><strong>回答期限:</strong> ${new Date(dealDetails.deadline).toLocaleString('ja-JP')}</p>` : ''}
              ${dealDetails.sellerName ? `<p><strong>エージェント:</strong> ${dealDetails.sellerName}</p>` : ''}
              ${dealDetails.sellerEmail ? `<p><strong>エージェントメール:</strong> ${dealDetails.sellerEmail}</p>` : ''}
            </div>
            
            <p>案件の詳細を確認し、必要に応じて対応をお願いいたします。</p>
            
            <a href="https://47bfb6df.real-estate-200units-v2.pages.dev" class="button">案件を確認する</a>
          </div>
          <div class="footer">
            <p>200棟アパート用地仕入れプロジェクト - 管理者通知</p>
            <p>このメールは自動送信されています。</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to,
      subject: `【管理者通知】新規案件登録: ${dealTitle}`,
      html
    });
  }
}

// Cloudflare Workers環境用のヘルパー関数
export function createEmailService(resendApiKey: string, fromEmail?: string): EmailService {
  return new EmailService(resendApiKey, fromEmail);
}
