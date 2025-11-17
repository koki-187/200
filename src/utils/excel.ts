/**
 * Excelエクスポートユーティリティ
 * xlsxライブラリを使用したクライアントサイドExcelエクスポート
 */

export interface DealExportData {
  title: string;
  status: string;
  location?: string;
  land_area?: string;
  zoning?: string;
  station?: string;
  walk_minutes?: number;
  desired_price?: string;
  created_at: string;
  response_deadline?: string;
}

/**
 * 案件データをExcelにエクスポート
 * @param deals - エクスポートする案件データ
 * @param filename - ファイル名（デフォルト: '案件一覧.xlsx'）
 */
export async function exportDealsToExcel(
  deals: DealExportData[],
  filename: string = '案件一覧.xlsx'
): Promise<void> {
  // 動的インポート（クライアント側のみ）
  const XLSX = await import('xlsx');

  // データを整形
  const formattedData = deals.map(deal => ({
    '案件名': deal.title,
    'ステータス': translateStatus(deal.status),
    '所在地': deal.location || '',
    '面積': deal.land_area || '',
    '用途地域': deal.zoning || '',
    '最寄駅': deal.station || '',
    '徒歩（分）': deal.walk_minutes !== undefined ? deal.walk_minutes : '',
    '希望価格': deal.desired_price || '',
    '作成日': formatDate(deal.created_at),
    '回答期限': deal.response_deadline ? formatDate(deal.response_deadline) : ''
  }));

  // ワークシート作成
  const worksheet = XLSX.utils.json_to_sheet(formattedData);

  // カラム幅設定
  const columnWidths = [
    { wch: 40 }, // 案件名
    { wch: 12 }, // ステータス
    { wch: 30 }, // 所在地
    { wch: 15 }, // 面積
    { wch: 20 }, // 用途地域
    { wch: 15 }, // 最寄駅
    { wch: 10 }, // 徒歩
    { wch: 15 }, // 希望価格
    { wch: 12 }, // 作成日
    { wch: 12 }  // 回答期限
  ];
  worksheet['!cols'] = columnWidths;

  // ワークブック作成
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '案件一覧');

  // ファイル出力
  XLSX.writeFile(workbook, filename);
}

/**
 * ステータスを日本語に変換
 */
function translateStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'NEW': '新規',
    'IN_REVIEW': '調査中',
    'REPLIED': '一次回答済',
    'CLOSED': 'クロージング'
  };
  return statusMap[status] || status;
}

/**
 * 日付をフォーマット（YYYY-MM-DD）
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return dateString;
  }
}

/**
 * フィルター済み案件をExcelにエクスポート
 */
export async function exportFilteredDeals(
  deals: DealExportData[],
  filters: {
    status?: string;
    deadlineStatus?: string;
    searchTerm?: string;
  }
): Promise<void> {
  // フィルター情報をファイル名に含める
  const statusPart = filters.status ? `_${translateStatus(filters.status)}` : '';
  const searchPart = filters.searchTerm ? `_検索結果` : '';
  const filename = `案件一覧${statusPart}${searchPart}_${formatDate(new Date().toISOString())}.xlsx`;

  await exportDealsToExcel(deals, filename);
}
