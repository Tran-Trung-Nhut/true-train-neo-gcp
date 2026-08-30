"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CSSProperties } from "react";
import { mono } from "./ui";

const ELLIPSIS = "ellipsis";
const NEIGHBOR_COUNT = 1;

type PageItem = number | typeof ELLIPSIS;

function range(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function getPageItems(currentPage: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) return range(1, totalPages);

  const left = Math.max(2, currentPage - NEIGHBOR_COUNT);
  const right = Math.min(totalPages - 1, currentPage + NEIGHBOR_COUNT);
  const items: PageItem[] = [1];

  if (left > 2) items.push(ELLIPSIS);
  items.push(...range(left, right));
  if (right < totalPages - 1) items.push(ELLIPSIS);
  items.push(totalPages);

  return items;
}

function pageButtonStyle(active = false, disabled = false): CSSProperties {
  return {
    display: "grid",
    placeItems: "center",
    minWidth: 32,
    height: 32,
    padding: "0 10px",
    borderRadius: 8,
    border: active ? "1px solid var(--accent)" : "1px solid var(--border)",
    background: active
      ? "color-mix(in srgb, var(--accent) 12%, var(--panel))"
      : "var(--panel)",
    color: active ? "var(--accent)" : "var(--muted)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    ...mono(12, 700),
  };
}

interface PaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  itemLabel?: string;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  itemLabel = "items",
  onPageChange,
}: PaginationProps) {
  if (totalItems === 0) return null;

  const safePage = Math.min(Math.max(page, 1), totalPages);
  const from = (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, totalItems);
  const canPrev = safePage > 1;
  const canNext = safePage < totalPages;

  return (
    <div
      className="deck-pagination"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "13px 20px",
        borderTop: "1px solid var(--border)",
        background: "var(--panelHi)",
      }}
    >
      <div style={{ ...mono(12), color: "var(--faint)" }}>
        showing{" "}
        <span style={{ color: "var(--text)", fontWeight: 700 }}>
          {from}-{to}
        </span>{" "}
        / {totalItems} {itemLabel}
      </div>

      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            aria-label="Previous page"
            disabled={!canPrev}
            onClick={() => canPrev && onPageChange(safePage - 1)}
            style={pageButtonStyle(false, !canPrev)}
          >
            <ChevronLeft size={14} />
          </button>

          {getPageItems(safePage, totalPages).map((item, index) =>
            item === ELLIPSIS ? (
              <span
                key={`${item}-${index}`}
                style={{ ...mono(12), color: "var(--faint)", padding: "0 4px" }}
              >
                ...
              </span>
            ) : (
              <button
                key={item}
                type="button"
                aria-current={safePage === item ? "page" : undefined}
                onClick={() => onPageChange(item)}
                style={pageButtonStyle(safePage === item)}
              >
                {item}
              </button>
            )
          )}

          <button
            type="button"
            aria-label="Trang sau"
            disabled={!canNext}
            onClick={() => canNext && onPageChange(safePage + 1)}
            style={pageButtonStyle(false, !canNext)}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
