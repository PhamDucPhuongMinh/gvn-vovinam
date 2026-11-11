import type { ReactNode } from "react";

export default function FieldLabel({
  children,
  required = true,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <span className="field-label-text">
      {children}
      {required && (
        <span className="required-mark" aria-hidden="true">
          {" "}
          *
        </span>
      )}
    </span>
  );
}
