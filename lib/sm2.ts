export type Rating = 1 | 2 | 3 | 4; 

export interface SM2State {
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  due_date: Date;
}

export function calculateNextReview(
  state: SM2State,
  rating: Rating,
  now = new Date()
): SM2State {
  let { ease_factor, interval_days, repetitions } = state;

  if (rating === 1) {
    ease_factor = Math.max(1.3, ease_factor - 0.2);
    repetitions = 0;
    interval_days = 1;
  } else if (rating === 2) {
    ease_factor = Math.max(1.3, ease_factor - 0.15);
    interval_days = repetitions === 0
      ? 1
      : Math.max(interval_days + 1, Math.round(interval_days * 1.2));
    repetitions += 1;
  } else if (rating === 3) {
    if (repetitions === 0) interval_days = 1;
    else if (repetitions === 1) interval_days = 6;
    else interval_days = Math.max(interval_days + 1, Math.round(interval_days * ease_factor));
    repetitions += 1;
  } else {
    ease_factor = Math.max(1.3, ease_factor + 0.15);
    if (repetitions === 0) interval_days = 4;
    else if (repetitions === 1) interval_days = 10;
    else interval_days = Math.max(interval_days + 1, Math.round(interval_days * ease_factor * 1.3));
    repetitions += 1;
  }

  const due_date = new Date(now);
  due_date.setDate(due_date.getDate() + interval_days);

  return { ease_factor, interval_days, repetitions, due_date };
}

export function formatReviewInterval(days: number): string {
  if (days < 30) return `${days}d`;
  if (days < 365) {
    const months = Math.max(1, Math.round(days / 30));
    return `${months}mo`;
  }
  const years = Math.max(1, Math.round(days / 365));
  return `${years}y`;
}

export function getRatingPreview(state: SM2State, rating: Rating): string {
  return formatReviewInterval(calculateNextReview(state, rating).interval_days);
}
