"use client";
import { useId, useState, useRef } from "react";
import DatePicker from "react-datepicker";
import { parse, isValid, format } from "date-fns";
import { vi } from "date-fns/locale/vi";
import { parseCalendarValue, formatCalendarValue } from "@/lib/dates";
type Props = {
  name?: string;
  label?: string;
  mode?: "date" | "month";
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  required?: boolean;
};
export default function DateInput({
  name,
  label,
  mode = "date",
  value,
  defaultValue = "",
  onChange,
  required = false,
}: Props) {
  const generated = useId();
  const picker = useRef<DatePicker>(null);
  const [internal, setInternal] = useState(defaultValue);
  const current = value === undefined ? internal : value;
  return (
    <span className="date-input">
      <input type="hidden" name={name} value={current} />
      <DatePicker
        ref={picker}
        id={generated}
        ariaLabelClose="Đóng lịch"
        selected={parseCalendarValue(current)}
        onChange={(date: Date | null) => {
          const field = picker.current?.input;
          if (field instanceof HTMLInputElement) field.setCustomValidity("");
          const next = formatCalendarValue(date, mode);
          setInternal(next);
          onChange?.(next);
        }}
        onChangeRaw={(event) => {
          const target = event?.target;
          if (!(target instanceof HTMLInputElement)) return;
          const raw = target.value;
          const pattern = mode === "month" ? "MM/yyyy" : "dd/MM/yyyy";
          const parsed = parse(raw, pattern, new Date());
          target.setCustomValidity(
            !raw || (isValid(parsed) && format(parsed, pattern) === raw)
              ? ""
              : `Nhập ${mode === "month" ? "tháng/năm theo MM/yyyy" : "ngày theo dd/MM/yyyy"}.`,
          );
        }}
        locale={vi}
        dateFormat={mode === "month" ? "MM/yyyy" : "dd/MM/yyyy"}
        showMonthYearPicker={mode === "month"}
        placeholderText={mode === "month" ? "Tháng/năm" : "Ngày/tháng/năm"}
        required={required}
        strictParsing
        showYearDropdown={mode === "date"}
        dropdownMode="select"
        yearDropdownItemNumber={100}
        scrollableYearDropdown
        previousMonthAriaLabel="Tháng trước"
        nextMonthAriaLabel="Tháng sau"
        previousYearAriaLabel="Năm trước"
        nextYearAriaLabel="Năm sau"
        calendarStartDay={1}
        popperClassName="club-calendar"
        popperProps={{ strategy: "fixed" }}
        onKeyDown={(e) => {
          if (e.key === "Escape") e.stopPropagation();
        }}
        customInput={
          <input aria-label={label || name || "Chọn ngày"} autoComplete="off" />
        }
      />
    </span>
  );
}
// Shared range component for future report filters; uses the same locale and storage format.
export function DateRangeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: [string, string];
  onChange: (value: [string, string]) => void;
}) {
  return (
    <span className="date-input">
      <DatePicker
        selectsRange
        startDate={parseCalendarValue(value[0])}
        endDate={parseCalendarValue(value[1])}
        onChange={([start, end]) =>
          onChange([formatCalendarValue(start), formatCalendarValue(end)])
        }
        locale={vi}
        dateFormat="dd/MM/yyyy"
        placeholderText="Từ ngày – đến ngày"
        calendarStartDay={1}
        popperClassName="club-calendar"
        popperProps={{ strategy: "fixed" }}
        customInput={<input aria-label={label} autoComplete="off" />}
      />
    </span>
  );
}
