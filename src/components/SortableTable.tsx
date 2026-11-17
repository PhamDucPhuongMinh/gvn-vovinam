"use client";
import {
  Children,
  cloneElement,
  isValidElement,
  useState,
  type ReactElement,
  type ReactNode,
  type TableHTMLAttributes,
} from "react";
import { cellText, compareCells } from "@/lib/table-sort";
type Element = ReactElement<{
  children?: ReactNode;
  "data-sort-value"?: string | number;
  "data-sortable"?: boolean;
  "aria-sort"?: "ascending" | "descending" | "none";
}>;
const elements = (node: ReactNode) =>
  Children.toArray(node).filter(isValidElement) as Element[];
export default function SortableTable({
  children,
  ...props
}: TableHTMLAttributes<HTMLTableElement>) {
  const [sort, setSort] = useState<{
    column: number;
    direction: 1 | -1;
  } | null>(null);
  const sections = elements(children);
  const body = sections.find((section) => section.type === "tbody");
  const rows = elements(body?.props.children);
  const value = (row: Element, column: number) => {
    const cell = elements(row.props.children)[column];
    return cell?.props["data-sort-value"] ?? cellText(cell?.props.children);
  };
  const sorted = sort
    ? rows
        .map((row, index) => ({ row, index }))
        .sort(
          (a, b) =>
            compareCells(value(a.row, sort.column), value(b.row, sort.column)) *
              sort.direction || a.index - b.index,
        )
        .map(({ row }) => row)
    : rows;
  return (
    <table {...props}>
      {sections.map((section) => {
        if (section.type === "tbody") return cloneElement(section, {}, sorted);
        if (section.type !== "thead") return section;
        return cloneElement(
          section,
          {},
          elements(section.props.children).map((row) =>
            cloneElement(
              row,
              {},
              elements(row.props.children).map((cell, column) => {
                const title = cellText(cell.props.children);
                if (
                  ["Thao tác", "Nhập học"].includes(title) ||
                  cell.props["data-sortable"] === false
                )
                  return cell;
                const direction =
                  sort?.column === column ? sort.direction : null;
                return cloneElement(
                  cell,
                  {
                    "aria-sort":
                      direction === 1
                        ? "ascending"
                        : direction === -1
                          ? "descending"
                          : "none",
                  },
                  <button
                    type="button"
                    className="table-sort"
                    onClick={() =>
                      setSort({ column, direction: direction === 1 ? -1 : 1 })
                    }
                    aria-label={`Sắp xếp ${title} ${direction === 1 ? "giảm dần" : "tăng dần"}`}
                  >
                    {cell.props.children}
                    <span aria-hidden="true">
                      {direction === 1 ? " ↑" : direction === -1 ? " ↓" : " ↕"}
                    </span>
                  </button>,
                );
              }),
            ),
          ),
        );
      })}
    </table>
  );
}
