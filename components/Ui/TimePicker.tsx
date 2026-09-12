"use client";
import React, { useMemo } from "react";

/** 24-hour "HH:MM", or "" when nothing has been picked yet — the same shape
 *  a native <input type="time"> produced, so callers (openingHours composing
 *  into one free-text string) don't change. */
export type TimeValue = string;

interface TimePickerProps {
  value: TimeValue;
  onChange: (value: TimeValue) => void;
  className?: string;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = ["00", "15", "30", "45"];

function to24Hour(hour12: number, minute: string, period: "AM" | "PM"): string {
  let hours = hour12 % 12;
  if (period === "PM") hours += 12;
  return `${String(hours).padStart(2, "0")}:${minute}`;
}

function parse(value: string): {
  hour12: number | null;
  minute: string | null;
  period: "AM" | "PM";
} {
  if (!value) return { hour12: null, minute: null, period: "AM" };
  const [hoursStr, minute] = value.split(":");
  let hours = parseInt(hoursStr, 10);
  const period: "AM" | "PM" = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return { hour12: hours, minute: minute ?? "00", period };
}

/** Explicit hour + minute + AM/PM selects. Replaces a native
 *  <input type="time">, whose AM/PM segment is drawn by the browser/OS
 *  locale — many locales (most Windows/Chrome setups included) render it as
 *  a plain 24-hour field with no AM/PM control at all, which isn't fixable
 *  via HTML attributes. This always shows one. Picking any single control
 *  fills in sensible defaults for the other two, so one tap already produces
 *  a complete, valid time. */
function TimePicker({ value, onChange, className }: TimePickerProps) {
  const { hour12, minute, period } = useMemo(() => parse(value), [value]);
  const minuteOptions =
    minute && !MINUTES.includes(minute) ? [minute, ...MINUTES] : MINUTES;

  const selectClass =
    "h-[28px] border-b-[1px] border-gray-9 text-[15px] font-normal text-black-1 focus:outline-none bg-transparent cursor-pointer";

  const handleHourChange = (h: number) => onChange(to24Hour(h, minute ?? "00", period));
  const handleMinuteChange = (m: string) => onChange(to24Hour(hour12 ?? 9, m, period));
  const handlePeriodChange = (p: "AM" | "PM") =>
    onChange(to24Hour(hour12 ?? 9, minute ?? "00", p));

  return (
    <div className={`flex items-center gap-1 ${className ?? ""}`}>
      <select
        value={hour12 ?? ""}
        onChange={(e) => handleHourChange(parseInt(e.target.value, 10))}
        className={selectClass}
        aria-label="Hour"
      >
        <option value="" disabled>
          --
        </option>
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span className="text-[15px] text-black-1">:</span>
      <select
        value={minute ?? ""}
        onChange={(e) => handleMinuteChange(e.target.value)}
        className={selectClass}
        aria-label="Minute"
      >
        <option value="" disabled>
          --
        </option>
        {minuteOptions.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <div className="ml-1 flex shrink-0 overflow-hidden rounded-[6px] border border-gray-9">
        {(["AM", "PM"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => handlePeriodChange(p)}
            className={`h-[26px] cursor-pointer px-2 text-[12px] font-medium ${
              value && period === p ? "bg-green-1 text-white" : "bg-white text-gray-8"
            }`}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

export default TimePicker;
