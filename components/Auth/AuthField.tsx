import React from "react";

type AuthFieldProps = {
  label: string;
  error?: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  rightElement?: React.ReactNode;
  className?: string;
  inputProps?: Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "type" | "placeholder" | "className"
  >;
};

/**
 * Outlined, notched-label field — the web equivalent of the native app's
 * `outlined` FormField/PasswordField variant: a full border box with the
 * label sitting on top of it, "cutting" the border line via a background
 * that matches the page (white). Border/label color respond to focus and
 * error via `focus-within`/`group-focus-within` rather than JS state, so no
 * separate isFocused wiring is needed per field.
 */
function AuthField({
  label,
  error,
  type = "text",
  value,
  onChange,
  placeholder,
  rightElement,
  className = "",
  inputProps,
}: AuthFieldProps) {
  return (
    <div className={`group relative ${className}`}>
      <label
        className={`absolute -top-2 left-3 z-10 bg-white px-1.5 text-[12px] transition-colors ${
          error ? "text-red-1" : "text-gray-8 group-focus-within:text-green-1"
        }`}
      >
        {label}
      </label>
      <div
        className={`flex items-center gap-2 rounded-[14px] border px-4 py-3.5 transition-colors ${
          error
            ? "border-red-1"
            : "border-gray-9 group-focus-within:border-green-1"
        }`}
      >
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="h-[24px] w-full text-[14px] text-black-1 placeholder:text-gray-6 focus:outline-none"
          {...inputProps}
        />
        {rightElement}
      </div>
      {error && <p className="mt-1 text-[13px] text-red-1">{error}</p>}
    </div>
  );
}

export default AuthField;
