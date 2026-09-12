"use client";
import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import chevDown from "@/assets/icons/chev-down-icon.svg";
import { useClickOutside } from "@/custom-hooks/useClickOutside";

/** 24-hour "HH:MM", or "" when nothing has been picked yet — the same shape
 *  a native <input type="time"> produced, so callers (openingHours composing
 *  into one free-text string) don't change. */
export type TimeValue = string;

interface TimePickerProps {
  value: TimeValue;
  onChange: (value: TimeValue) => void;
  placeholder?: string;
  className?: string;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** "09:00" -> "9:00 AM". */
function formatTimeLabel(time24: string): string {
  const [hoursStr, minutes] = time24.split(":");
  let hours = parseInt(hoursStr, 10);
  const suffix = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${suffix}`;
}

// Every half hour, midnight through 11:30 PM — one flat list to pick from,
// same dropdown pattern already used for city/subcategory in this form.
const TIME_OPTIONS: { value: string; label: string }[] = Array.from(
  { length: 48 },
  (_, i) => {
    const value = `${pad(Math.floor(i / 2))}:${i % 2 === 0 ? "00" : "30"}`;
    return { value, label: formatTimeLabel(value) };
  },
);

/** A dropdown time selector (list of half-hour slots), replacing a native
 *  <input type="time"> — its AM/PM segment is drawn by the browser/OS
 *  locale and on many setups (most Windows/Chrome locales included) never
 *  shows at all, which isn't fixable via HTML attributes. Every option here
 *  is rendered by us, so AM/PM is always visible. */
function TimePicker({ value, onChange, placeholder, className }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setIsOpen(false));

  const label = useMemo(() => (value ? formatTimeLabel(value) : ""), [value]);

  return (
    <div ref={ref} className={`relative w-full ${className ?? ""}`}>
      <div
        className="flex w-full cursor-pointer items-center justify-between border-b border-gray-9 pb-1"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span
          className={`text-[15px] font-normal ${label ? "text-black-1" : "text-gray-8"}`}
        >
          {label || placeholder || "Select time"}
        </span>
        <Image
          src={chevDown}
          alt="chev-down"
          className={`h-[16px] w-[12px] transition-transform ${isOpen ? "rotate-180" : ""}`}
          height={100}
          width={100}
        />
      </div>
      {isOpen ? (
        <div className="absolute z-20 mt-1 max-h-[220px] w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-md">
          {TIME_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`block w-full cursor-pointer px-4 py-2 text-left text-[15px] font-light hover:bg-gray-100 ${
                option.value === value ? "text-green-1" : "text-gray-8"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default TimePicker;
