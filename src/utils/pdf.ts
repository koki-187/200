// PDF生成ユーティリティ
// 注意: jsPDFはCloudflare Workers環境では直接使用できないため、
// フロントエンド（ブラウザ）側でPDF生成を行う方式を採用します。
// このファイルはPDF生成に必要なデータ構造とロジックを提供します。

export interface DealReportData {
  deal: {
    id: string;
    title: string;
    status: string;
    location?: string;
    station?: string;
    walk_minutes?: number;
    land_area?: string;
    desired_price?: string;
    response_deadline?: string;
    created_at: string;
  };
  buyer?: {
    name: string;
    email: string;
  };
  seller?: {
    name: string;
    email: string;
  };
  messages: Array<{
    sender_name: string;
    sender_role: string;
    content: string;
    created_at: string;
  }>;
  files: Array<{
    filename: string;
    file_type: string;
    file_size: number;
    uploaded_at: string;
  }>;
  proposal?: {
    summary: string;
    strengths: string[];
    concerns: string[];
    recommendations: string[];
    generated_at: string;
  };
}

export interface PDFGenerationOptions {
  title?: string;
  includeMessages?: boolean;
  includeFiles?: boolean;
  includeProposal?: boolean;
  includeTimeline?: boolean;
}

// PDF生成用のデータを整形する関数
export function prepareDealReportData(
  deal: any,
  buyer: any,
  seller: any,
  messages: any[],
  files: any[],
  proposal: any
): DealReportData {
  return {
    deal: {
      id: deal.id,
      title: deal.title,
      status: deal.status,
      location: deal.location,
      station: deal.station,
      walk_minutes: deal.walk_minutes,
      land_area: deal.land_area,
      desired_price: deal.desired_price,
      response_deadline: deal.response_deadline,
      created_at: deal.created_at
    },
    buyer: buyer ? {
      name: buyer.name,
      email: buyer.email
    } : undefined,
    seller: seller ? {
      name: seller.name,
      email: seller.email
    } : undefined,
    messages: messages.map(msg => ({
      sender_name: msg.sender_name || 'Unknown',
      sender_role: msg.sender_role || 'USER',
      content: msg.content,
      created_at: msg.created_at
    })),
    files: files.map(file => ({
      filename: file.filename,
      file_type: file.file_type,
      file_size: file.file_size,
      uploaded_at: file.uploaded_at
    })),
    proposal: proposal ? {
      summary: proposal.summary,
      strengths: proposal.strengths ? JSON.parse(proposal.strengths) : [],
      concerns: proposal.concerns ? JSON.parse(proposal.concerns) : [],
      recommendations: proposal.recommendations ? JSON.parse(proposal.recommendations) : [],
      generated_at: proposal.generated_at
    } : undefined
  };
}

// ステータス名を日本語に変換
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'NEW': '新規',
    'IN_REVIEW': '調査中',
    'REPLIED': '一次回答済',
    'CLOSED': 'クロージング'
  };
  return labels[status] || status;
}

// 日付フォーマット
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ファイルサイズを人間が読める形式に変換
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
