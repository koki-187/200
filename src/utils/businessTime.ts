import { addDays, isWeekend, parseISO, format } from 'date-fns';

/**
 * 営業日（土日祝日除く）を計算
 */
export function calculateReplyDeadline(
  startDate: Date,
  businessDays: number,
  holidays: string[] = []
): Date {
  let currentDate = new Date(startDate);
  let addedDays = 0;

  while (addedDays < businessDays) {
    currentDate = addDays(currentDate, 1);
    
    // 土日をスキップ
    if (isWeekend(currentDate)) {
      continue;
    }
    
    // 祝日をスキップ
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    if (holidays.includes(dateStr)) {
      continue;
    }
    
    addedDays++;
  }

  return currentDate;
}

/**
 * 期限ステータスを取得
 */
export function getDeadlineStatus(
  deadline: string | Date,
  now: Date = new Date()
): 'IN_TIME' | 'WARNING' | 'OVERDUE' {
  const deadlineDate = typeof deadline === 'string' ? parseISO(deadline) : deadline;
  const diffMs = deadlineDate.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 0) {
    return 'OVERDUE';
  } else if (diffHours < 24) {
    return 'WARNING';
  } else {
    return 'IN_TIME';
  }
}

/**
 * 営業日48時間（2営業日）の期限を計算
 */
export function calculate48HourDeadline(
  startDate: Date = new Date(),
  holidays: string[] = []
): Date {
  return calculateReplyDeadline(startDate, 2, holidays);
}
