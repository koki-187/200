/**
 * 案件フィルタリングユーティリティ
 */

export interface DealFilters {
  status?: string;
  deadlineStatus?: string;
  searchTerm?: string;
  priceMin?: number;
  priceMax?: number;
  areaMin?: number;
  areaMax?: number;
  location?: string;
  station?: string;
}

export interface Deal {
  id: string;
  title: string;
  status: string;
  location?: string;
  land_area?: string;
  desired_price?: string;
  station?: string;
  walk_minutes?: number;
  response_deadline?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 案件をフィルタリング
 */
export function filterDeals(deals: Deal[], filters: DealFilters): Deal[] {
  return deals.filter(deal => {
    // ステータスフィルター
    if (filters.status && deal.status !== filters.status) {
      return false;
    }

    // 期限ステータスフィルター
    if (filters.deadlineStatus) {
      const deadlineStatus = getDeadlineStatus(deal.response_deadline);
      if (deadlineStatus !== filters.deadlineStatus) {
        return false;
      }
    }

    // 検索語フィルター
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      const searchableFields = [
        deal.title,
        deal.location,
        deal.station
      ].filter(Boolean).join(' ').toLowerCase();

      if (!searchableFields.includes(searchLower)) {
        return false;
      }
    }

    // 価格範囲フィルター
    if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
      const price = extractNumber(deal.desired_price);
      if (price !== null) {
        if (filters.priceMin !== undefined && price < filters.priceMin) {
          return false;
        }
        if (filters.priceMax !== undefined && price > filters.priceMax) {
          return false;
        }
      } else if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
        // 価格情報がない場合は除外
        return false;
      }
    }

    // 面積範囲フィルター
    if (filters.areaMin !== undefined || filters.areaMax !== undefined) {
      const area = extractNumber(deal.land_area);
      if (area !== null) {
        if (filters.areaMin !== undefined && area < filters.areaMin) {
          return false;
        }
        if (filters.areaMax !== undefined && area > filters.areaMax) {
          return false;
        }
      } else if (filters.areaMin !== undefined || filters.areaMax !== undefined) {
        // 面積情報がない場合は除外
        return false;
      }
    }

    // エリアフィルター（部分一致）
    if (filters.location) {
      if (!deal.location || !deal.location.includes(filters.location)) {
        return false;
      }
    }

    // 駅フィルター（部分一致）
    if (filters.station) {
      if (!deal.station || !deal.station.includes(filters.station)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * 案件をソート
 */
export function sortDeals(
  deals: Deal[],
  sortBy: 'updated_at' | 'created_at' | 'deadline' | 'title',
  order: 'asc' | 'desc' = 'desc'
): Deal[] {
  const sorted = [...deals].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'title':
        comparison = a.title.localeCompare(b.title, 'ja');
        break;
      case 'created_at':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case 'updated_at':
        comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        break;
      case 'deadline':
        const aDeadline = a.response_deadline ? new Date(a.response_deadline).getTime() : 0;
        const bDeadline = b.response_deadline ? new Date(b.response_deadline).getTime() : 0;
        comparison = aDeadline - bDeadline;
        break;
    }

    return order === 'asc' ? comparison : -comparison;
  });

  return sorted;
}

/**
 * 期限ステータスを取得
 */
function getDeadlineStatus(deadline?: string): string {
  if (!deadline) return 'NONE';

  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffHours = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (diffHours < 0) return 'OVERDUE';
  if (diffHours < 24) return 'WARNING';
  return 'IN_TIME';
}

/**
 * 文字列から数値を抽出（価格、面積等）
 */
function extractNumber(str?: string): number | null {
  if (!str) return null;

  // 数字とカンマ、ピリオドのみ抽出
  const numbers = str.replace(/[^0-9.,]/g, '');
  const parsed = parseFloat(numbers.replace(/,/g, ''));

  return isNaN(parsed) ? null : parsed;
}

/**
 * 表示モード
 */
export type ViewMode = 'grid' | 'list';

/**
 * 表示モードをLocalStorageに保存
 */
export function saveViewMode(mode: ViewMode): void {
  try {
    localStorage.setItem('dealViewMode', mode);
  } catch (error) {
    console.error('Failed to save view mode:', error);
  }
}

/**
 * 表示モードをLocalStorageから取得
 */
export function getViewMode(): ViewMode {
  try {
    const saved = localStorage.getItem('dealViewMode');
    return (saved === 'list' || saved === 'grid') ? saved : 'grid';
  } catch (error) {
    return 'grid';
  }
}

/**
 * フィルター状態をLocalStorageに保存
 */
export function saveFilters(filters: DealFilters): void {
  try {
    localStorage.setItem('dealFilters', JSON.stringify(filters));
  } catch (error) {
    console.error('Failed to save filters:', error);
  }
}

/**
 * フィルター状態をLocalStorageから取得
 */
export function getFilters(): DealFilters {
  try {
    const saved = localStorage.getItem('dealFilters');
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    return {};
  }
}
