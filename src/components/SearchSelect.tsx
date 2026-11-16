"use client";
import {
  Children,
  isValidElement,
  useId,
  useState,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import Select from "react-select";
import { matchesSelectOption } from "@/lib/select-search";

type Option = { label: string; value: string; isDisabled?: boolean };
type Props = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "onChange" | "multiple" | "size"
> & {
  onChange?: (event: {
    target: { value: string };
    currentTarget: { value: string };
  }) => unknown;
};
function text(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) =>
      isValidElement<{ children?: ReactNode }>(child)
        ? text(child.props.children)
        : String(child),
    )
    .join("");
}
function optionsFrom(children: ReactNode): Option[] {
  return Children.toArray(children).flatMap((child) => {
    if (
      !isValidElement<{
        value?: string | number;
        children?: ReactNode;
        disabled?: boolean;
      }>(child)
    )
      return [];
    if (child.type !== "option") return optionsFrom(child.props.children);
    const label = text(child.props.children);
    return [
      {
        label,
        value: String(child.props.value ?? label),
        isDisabled: child.props.disabled,
      },
    ];
  });
}
export default function SearchSelect({
  children,
  value,
  defaultValue,
  onChange,
  name,
  required,
  disabled,
  style,
  className,
  id,
  ...rest
}: Props) {
  const generated = useId();
  const options = optionsFrom(children);
  const [internal, setInternal] = useState(() =>
    String(defaultValue ?? options[0]?.value ?? ""),
  );
  const selected = String(value ?? internal);
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className={`search-select ${className || ""}`} style={style}>
      <Select<Option, false>
        instanceId={generated}
        inputId={id || generated}
        name={name}
        aria-label={rest["aria-label"]}
        aria-describedby={rest["aria-describedby"]}
        value={options.find((option) => option.value === selected) || null}
        options={options}
        required={required}
        isDisabled={disabled}
        isSearchable
        isClearable={false}
        filterOption={(option, query) => matchesSelectOption(option, query)}
        placeholder="Nhập để tìm…"
        noOptionsMessage={() => "Không tìm thấy lựa chọn"}
        menuPortalTarget={
          typeof document === "undefined" ? undefined : document.body
        }
        menuPosition="fixed"
        onMenuOpen={() => setMenuOpen(true)}
        onMenuClose={() => setMenuOpen(false)}
        menuPlacement="auto"
        classNamePrefix="search-select"
        onKeyDown={(event) => {
          if (event.key === "Escape" && menuOpen) event.stopPropagation();
        }}
        onChange={(option) => {
          if (!option) return;
          setInternal(option.value);
          const target = { value: option.value };
          onChange?.({ target, currentTarget: target });
        }}
        styles={{
          control: (base, state) => ({
            ...base,
            minHeight: 43,
            borderRadius: 8,
            borderColor: state.isFocused ? "#0063cd" : "#dce4ed",
            boxShadow: state.isFocused ? "0 0 0 2px #0063cd20" : "none",
            fontSize: 13,
            backgroundColor: state.isDisabled ? "#f2f5f8" : "white",
          }),
          input: (base) => ({ ...base, margin: 0, padding: 0 }),
          menuPortal: (base) => ({ ...base, zIndex: 10000 }),
          menu: (base) => ({ ...base, fontSize: 13, color: "#162b43" }),
          option: (base, state) => ({
            ...base,
            backgroundColor: state.isSelected
              ? "#0063cd"
              : state.isFocused
                ? "#eaf3ff"
                : "white",
            color: state.isSelected ? "white" : "#162b43",
            cursor: state.isDisabled ? "not-allowed" : "pointer",
          }),
        }}
      />
    </div>
  );
}
