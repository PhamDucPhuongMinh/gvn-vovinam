"use client";
import { useState } from "react";
import type { ClubState } from "@/lib/types";
import { financialChartData } from "@/lib/financial-chart";
import { money, monthLabel } from "@/lib/utils";

export default function FinancialChart({
  state,
  period,
}: {
  state: ClubState;
  period: string;
}) {
  const { points, maximum, minimum, span, empty } = financialChartData(
    state,
    period,
  );
  const [selected, setSelected] = useState(5);
  const width = 620,
    left = 62,
    right = 12,
    top = 18,
    height = 166;
  const slot = (width - left - right) / points.length;
  const y = (value: number) => top + ((maximum - value) / span) * height;
  const baseline = y(0);
  const active = points[selected];
  const compact = new Intl.NumberFormat("vi-VN", {
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const ticks = empty
    ? [0]
    : Array.from(
        new Set(
          [maximum, maximum / 2, 0, minimum].filter(
            (value) => value >= minimum && value <= maximum,
          ),
        ),
      );
  return (
    <div className="financial-chart">
      <div className="chart-legend">
        <span>
          <i />
          Doanh thu
        </span>
        <span>
          <i />
          Chi phí
        </span>
        <span className="profit-legend">
          <i />
          Lợi nhuận
        </span>
      </div>
      {empty ? (
        <div className="chart-empty" role="status">
          Chưa có giao dịch trong 6 tháng đến {monthLabel(period)}.
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${width} 222`}
          className="financial-chart-svg"
          role="group"
          aria-label="Biểu đồ doanh thu, chi phí và lợi nhuận sáu tháng. Chọn một tháng để xem số tiền."
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={left}
                x2={width - right}
                y1={y(tick)}
                y2={y(tick)}
                stroke={tick === 0 ? "#95a9bf" : "#e6edf5"}
                strokeDasharray={tick === 0 ? undefined : "3 4"}
              />
              <text
                x={left - 10}
                y={y(tick) + 4}
                textAnchor="end"
                fill="#63758a"
                fontSize={10}
              >
                {compact.format(tick)}
              </text>
            </g>
          ))}
          {points.map((point, index) => {
            const x = left + slot * index;
            const label = `Tháng ${monthLabel(point.period)}: doanh thu ${money(point.revenue)}, chi phí ${money(point.cost)}, lợi nhuận ${money(point.profit)}`;
            return (
              <g
                key={point.period}
                role="button"
                tabIndex={0}
                aria-label={label}
                aria-pressed={selected === index}
                onMouseEnter={() => setSelected(index)}
                onFocus={() => setSelected(index)}
                onClick={() => setSelected(index)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelected(index);
                  } else if (
                    event.key === "ArrowLeft" ||
                    event.key === "ArrowRight"
                  ) {
                    event.preventDefault();
                    const next = Math.max(
                      0,
                      Math.min(
                        points.length - 1,
                        index + (event.key === "ArrowRight" ? 1 : -1),
                      ),
                    );
                    event.currentTarget.parentElement
                      ?.querySelectorAll<SVGGElement>('[role="button"]')
                      [next]?.focus();
                  }
                }}
              >
                <title>{label}</title>
                <rect
                  x={x + 4}
                  y={top - 7}
                  width={slot - 8}
                  height={height + 15}
                  rx={6}
                  fill={selected === index ? "#edf4fc" : "transparent"}
                />
                {[point.revenue, point.cost, point.profit].map(
                  (value, series) => (
                    <rect
                      key={series}
                      x={x + slot / 2 - 30 + series * 21}
                      y={Math.min(y(value), baseline)}
                      width={16}
                      height={
                        value === 0
                          ? 0
                          : Math.max(1, Math.abs(y(value) - baseline))
                      }
                      rx={3}
                      fill={
                        series === 0
                          ? "#0063cd"
                          : series === 1
                            ? "#d49721"
                            : value < 0
                              ? "#bd4056"
                              : "#17815d"
                      }
                      pointerEvents="none"
                    />
                  ),
                )}
                <text
                  x={x + slot / 2}
                  y={top + height + 26}
                  textAnchor="middle"
                  fill={selected === index ? "#0063cd" : "#63758a"}
                  fontSize={10}
                >
                  {monthLabel(point.period)}
                </text>
              </g>
            );
          })}
        </svg>
      )}
      {!empty && (
        <div className="chart-selection" role="status">
          <b>Tháng {monthLabel(active.period)}</b>
          <span>
            Doanh thu: <strong>{money(active.revenue)}</strong>
          </span>
          <span>
            Chi phí: <strong>{money(active.cost)}</strong>
          </span>
          <span>
            Lợi nhuận:{" "}
            <strong className={active.profit < 0 ? "negative" : ""}>
              {money(active.profit)}
            </strong>
          </span>
        </div>
      )}
      <p className="chart-foot">
        Dữ liệu bán hàng cũ chỉ có lợi nhuận, nên doanh thu và chi phí lịch sử
        chưa đầy đủ. Lợi nhuận âm hiển thị dưới mốc 0.
      </p>
    </div>
  );
}
