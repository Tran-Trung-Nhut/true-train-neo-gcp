"use client";

import { mono } from "./ui";

const LEVEL_VARS = ["var(--grid0)", "var(--grid1)", "var(--grid2)", "var(--grid3)"];
const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const MONTHS = ["Th1", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "Th8", "Th9", "Th10", "Th11", "Th12"];

function level(count: number): number {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  return 3;
}

type Cell = { date: Date; count: number } | null;

/**
 * GitHub-style activity calendar built from REAL data.
 * `counts`: reviews per day; the last element is today (from reviewLogs).
 * Each cell maps to a real calendar day, so 28/30/31-day months line up.
 */
export default function Heatmap({ counts, cell = 13 }: { counts: number[]; cell?: number }) {
  const len = counts.length;

  if (len === 0 || counts.every((c) => c === 0)) {
    return (
      <div style={{ ...mono(12.5), color: "var(--faint)", padding: "8px 0" }}>
        No activity yet - start reviewing to fill this calendar.
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // index i maps to today minus (len-1-i) days
  const days = counts.map((count, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (len - 1 - i));
    return { date: d, count };
  });

  // Pad the front so the first column starts on the right weekday (Sun = 0).
  const firstDow = days[0].date.getDay();
  const cells: Cell[] = [...Array(firstDow).fill(null), ...days];

  // Group into columns (one column = one week, 7 cells).
  const weeks: Cell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  // Month labels: show the name on the first column of each month.
  let lastMonth = -1;
  const monthLabels = weeks.map((week) => {
    const firstReal = week.find((c) => c !== null);
    if (!firstReal) return "";
    const m = firstReal.date.getMonth();
    if (m !== lastMonth) {
      lastMonth = m;
      return MONTHS[m];
    }
    return "";
  });

  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

  return (
    <div>
      <div className="heatmap-scroll">
        <div style={{ width: "fit-content" }}>
          <div style={{ display: "flex", gap: 3, marginLeft: 26, marginBottom: 4 }}>
            {monthLabels.map((label, wi) => (
              <div key={wi} style={{ width: cell, ...mono(10), color: "var(--faint)", minWidth: cell }}>
                {label}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 3 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 3, width: 23, flexShrink: 0 }}>
              {WEEKDAYS.map((wd, di) => (
                <div
                  key={di}
                  style={{
                    height: cell,
                    lineHeight: `${cell}px`,
                    ...mono(9.5),
                    color: "var(--faint)",
                    visibility: di % 2 === 1 ? "visible" : "hidden",
                  }}
                >
                  {wd}
                </div>
              ))}
            </div>

            {weeks.map((week, wi) => (
              <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {Array.from({ length: 7 }).map((_, di) => {
                  const c = week[di] ?? null;
                  if (!c) {
                    return <div key={di} style={{ width: cell, height: cell }} />;
                  }
                  return (
                    <div
                      key={di}
                      title={`${fmt(c.date)} · ${c.count > 0 ? `${c.count} reviews` : "no reviews"}`}
                      style={{
                        width: cell,
                        height: cell,
                        borderRadius: 3,
                        background: LEVEL_VARS[level(c.count)],
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginTop: 12,
          ...mono(10.5),
          color: "var(--faint)",
        }}
      >
        less
        {LEVEL_VARS.map((g, i) => (
          <span key={i} style={{ width: 11, height: 11, borderRadius: 3, background: g }} />
        ))}
        more
        <span style={{ marginLeft: "auto" }}>hover a cell to see its date</span>
      </div>
    </div>
  );
}
