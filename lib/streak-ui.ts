export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 75, 100, 200, 365] as const;

export interface StreakVisual {
  fg: string;
  bg: string;
  border: string;
  glow: string;
  scale: number;
  label: string;
  title: string;
  nextMilestone: number | null;
}

export function getStreakVisual(streak: number, practicedToday = true): StreakVisual {
  const tier = practicedToday ? warmTier(streak) : warmTier(Math.max(0, streak - 1));
  if (!practicedToday) {
    return {
      ...tier,
      fg: "color-mix(in srgb, var(--faint) 62%, #f97316)",
      bg: "color-mix(in srgb, var(--faint) 10%, transparent)",
      border: "color-mix(in srgb, var(--faint) 35%, var(--border))",
      glow: "rgba(120,120,120,.16)",
      scale: Math.max(1, tier.scale - 0.03),
      label: "not practised today",
      title: "Streak on hold",
    };
  }
  return tier;
}

export function previousStreakMilestone(streak: number): number {
  let previous = 0;
  for (const milestone of STREAK_MILESTONES) {
    if (streak < milestone) break;
    previous = milestone;
  }
  return previous;
}

function nextMilestone(streak: number): number | null {
  return STREAK_MILESTONES.find((milestone) => streak < milestone) ?? null;
}

function warmTier(streak: number): StreakVisual {
  if (streak >= 365) {
    return {
      fg: "#ff2d55",
      bg: "rgba(255,45,85,.16)",
      border: "rgba(255,45,85,.62)",
      glow: "rgba(255,45,85,.38)",
      scale: 1.18,
      label: "365+ days",
      title: "Immortal",
      nextMilestone: null,
    };
  }
  if (streak >= 200) {
    return {
      fg: "#c026d3",
      bg: "rgba(192,38,211,.16)",
      border: "rgba(192,38,211,.6)",
      glow: "rgba(192,38,211,.34)",
      scale: 1.15,
      label: "200+ days",
      title: "Legendary",
      nextMilestone: 365,
    };
  }
  if (streak >= 100) {
    return {
      fg: "#db2777",
      bg: "rgba(219,39,119,.15)",
      border: "rgba(219,39,119,.58)",
      glow: "rgba(219,39,119,.32)",
      scale: 1.12,
      label: "100+ days",
      title: "White hot",
      nextMilestone: 200,
    };
  }
  if (streak >= 75) {
    return {
      fg: "#dc2626",
      bg: "rgba(220,38,38,.14)",
      border: "rgba(220,38,38,.56)",
      glow: "rgba(220,38,38,.3)",
      scale: 1.1,
      label: "75+ days",
      title: "Red hot",
      nextMilestone: 100,
    };
  }
  if (streak >= 50) {
    return {
      fg: "#ea580c",
      bg: "rgba(234,88,12,.14)",
      border: "rgba(234,88,12,.54)",
      glow: "rgba(234,88,12,.3)",
      scale: 1.08,
      label: "50+ days",
      title: "Breakthrough",
      nextMilestone: 75,
    };
  }
  if (streak >= 30) {
    return {
      fg: "#c2410c",
      bg: "rgba(249,115,22,.2)",
      border: "rgba(194,65,12,.62)",
      glow: "rgba(249,115,22,.34)",
      scale: 1.06,
      label: "30+ days",
      title: "Relentless",
      nextMilestone: 50,
    };
  }
  if (streak >= 14) {
    return {
      fg: "#b45309",
      bg: "rgba(245,158,11,.22)",
      border: "rgba(180,83,9,.62)",
      glow: "rgba(245,158,11,.32)",
      scale: 1.04,
      label: "14+ days",
      title: "Keeping the fire",
      nextMilestone: 30,
    };
  }
  if (streak >= 7) {
    return {
      fg: "#a16207",
      bg: "rgba(251,191,36,.24)",
      border: "rgba(161,98,7,.6)",
      glow: "rgba(251,191,36,.34)",
      scale: 1.03,
      label: "7+ days",
      title: "One week",
      nextMilestone: 14,
    };
  }
  if (streak >= 3) {
    return {
      fg: "#92400e",
      bg: "rgba(250,204,21,.26)",
      border: "rgba(146,64,14,.58)",
      glow: "rgba(250,204,21,.34)",
      scale: 1.02,
      label: "3+ days",
      title: "Finding rhythm",
      nextMilestone: 7,
    };
  }
  return {
    fg: "#b45309",
    bg: "rgba(245,158,11,.2)",
    border: "rgba(180,83,9,.52)",
    glow: "rgba(245,158,11,.28)",
    scale: 1,
    label: "running",
    title: "New streak",
    nextMilestone: 3,
  };
}
