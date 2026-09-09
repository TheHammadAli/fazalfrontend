"use client";

import React, { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useDebounce } from "use-debounce";
import { Plus } from "lucide-react";
import { useClickOutside } from "@/custom-hooks/useClickOutside";
import { useGetLocationsQuery } from "@/store/services/authService";
import chevDown from "@/assets/icons/chev-down-icon.svg";
import locationIcon from "@/assets/icons/location-icon.svg";

export type LocationCoordinates = { lat: number; lng: number } | null;

export type LocationOption = {
  /** What goes in the field — "Gulberg", not "Gulberg, Lahore, Pakistan". */
  name: string;
  /** The fuller line shown under it, for telling two same-named places apart. */
  subtitle?: string;
  coordinates?: LocationCoordinates;
};

type ApiPrediction = {
  description?: string;
  place_id?: string;
  mainText?: string;
  coordinates?: LocationCoordinates;
};

type LocationSelectProps = {
  label: string;
  value: string;
  onSelect: (option: LocationOption) => void;
  error?: string;
  disabled?: boolean;
  /** Shown in the closed field and as the empty-search hint. */
  placeholder?: string;
  /** Offered the moment the field opens, before anything is typed. */
  initialOptions?: LocationOption[];
  /** Google place type filter, e.g. "(cities)". */
  types?: string;
  /** Rank results near this point first — the chosen city, for an area search. */
  near?: LocationCoordinates;
  /** Skip the per-result coordinate lookup when only the name is stored. */
  withCoordinates?: boolean;
  /** Drop results outside this city. `near` only reorders them. */
  city?: string;
  /** Message for when the field is disabled, e.g. "Choose a city first". */
  disabledHint?: string;
  /** Shown before anything is typed and there is no shortlist to offer. */
  emptyHint?: string;
  /**
   * Let the typed text be used as-is when nothing matches.
   *
   * Google has no areas for a small town — around Taxila it labels everything
   * Rawalpindi, Islamabad or Wah, so a city-scoped search returns nothing.
   * Without this the field cannot be filled at all there, and the form cannot
   * be submitted.
   */
  allowCustom?: boolean;
};

/**
 * A searchable location field backed by Google Places (Pakistan only).
 *
 * Google needs something typed before it will suggest anything, so
 * `initialOptions` fills the gap: opening the field shows a useful shortlist
 * straight away, and typing searches everywhere else.
 */
function LocationSelect({
  label,
  value,
  onSelect,
  error,
  disabled,
  placeholder,
  initialOptions = [],
  types,
  near,
  withCoordinates = true,
  city,
  disabledHint,
  emptyHint,
  allowCustom = false,
}: LocationSelectProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 400);

  useClickOutside(containerRef, () => setIsOpen(false));

  const trimmed = debouncedSearch.trim();
  const { data, isLoading, isFetching } = useGetLocationsQuery(
    {
      q: trimmed,
      ...(types ? { types } : {}),
      ...(near ? { lat: String(near.lat), lng: String(near.lng) } : {}),
      ...(withCoordinates ? {} : { withCoordinates: "false" }),
      ...(city ? { city } : {}),
    },
    // Two characters, so a single letter does not fire a request per keystroke.
    { skip: trimmed.length < 2 },
  );

  const loading = trimmed.length >= 2 && (isLoading || isFetching);

  const results: LocationOption[] = useMemo(() => {
    if (trimmed.length < 2) {
      const term = search.trim().toLowerCase();
      if (!term) return initialOptions;
      return initialOptions.filter((o) => o.name.toLowerCase().includes(term));
    }
    // Responses come wrapped as { success, message, data, ... }, so the
    // predictions are one level in. Reading the envelope as an array crashed
    // the page on the first keystroke. Falling back to a bare array keeps it
    // working if the endpoint is ever unwrapped.
    const envelope = data as { data?: ApiPrediction[] } | ApiPrediction[] | undefined;
    const predictions = Array.isArray(envelope)
      ? envelope
      : Array.isArray(envelope?.data)
        ? envelope.data
        : [];
    return predictions.map((p) => ({
      name: p.mainText ?? p.description ?? "",
      subtitle: p.description,
      coordinates: p.coordinates ?? null,
    }));
  }, [trimmed, search, data, initialOptions]);

  // Only once the search has settled, so the option does not flicker in while
  // results for what was typed are still on the way.
  const canUseTyped =
    allowCustom &&
    trimmed.length >= 2 &&
    !loading &&
    !results.some((option) => option.name.toLowerCase() === trimmed.toLowerCase());

  function choose(option: LocationOption) {
    onSelect(option);
    setSearch("");
    setIsOpen(false);
  }

  return (
    <div className="space-y-1 mt-5 w-full">
      <p className={`text-[14px] font-normal ${error ? "text-red-1" : "text-gray-8"}`}>
        {label}
      </p>

      <div ref={containerRef} className="relative w-full">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((open) => !open)}
          className={`flex h-[28px] w-full items-center justify-between border-b-[1px] text-left ${error ? "border-red-1" : "border-gray-9"
            } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
        >
          <span
            className={`truncate text-[15px] font-normal ${value ? "text-black-1" : "text-gray-8"
              }`}
          >
            {value || (disabled ? disabledHint : placeholder) || ""}
          </span>
          <Image src={chevDown} alt="" className="h-[16px] w-[12px] shrink-0" />
        </button>

        {/* One solid panel: the search box and the gap under it used to be
            transparent, so the next field down showed straight through the
            open dropdown. */}
        {isOpen && !disabled && (
          <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-md">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={placeholder}
              className="w-full border-b border-gray-200 bg-white px-4 py-2 text-sm font-light outline-none"
            />

            <div className="max-h-[260px] overflow-y-auto bg-white">
              {loading && (
                <div className="space-y-1 p-1">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-9 animate-pulse rounded bg-gray-100" />
                  ))}
                </div>
              )}

              {!loading && results.length === 0 && !canUseTyped && (
                <p className="px-4 py-3 text-[14px] font-light text-gray-8">
                  {trimmed.length < 2
                    ? (emptyHint ?? placeholder)
                    : "No matches found"}
                </p>
              )}

              {!loading && canUseTyped && (
                <button
                  type="button"
                  onClick={() => choose({ name: search.trim(), coordinates: null })}
                  className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-left hover:bg-gray-100"
                >
                  <Plus className="h-4 w-4 shrink-0 text-green-1" />
                  <span className="min-w-0 truncate text-[14px] text-black-1">
                    Use &ldquo;{search.trim()}&rdquo;
                  </span>
                </button>
              )}

              {!loading &&
                results.map((option, index) => (
                  <button
                    key={`${option.name}-${index}`}
                    type="button"
                    onClick={() => choose(option)}
                    className="flex w-full cursor-pointer items-start gap-2 px-4 py-2 text-left hover:bg-gray-100"
                  >
                    <Image
                      src={locationIcon}
                      alt=""
                      className="mt-1 h-[14px] w-[11px] shrink-0"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] text-black-1">
                        {option.name}
                      </span>
                      {option.subtitle && option.subtitle !== option.name && (
                        <span className="block truncate text-[12px] text-gray-8">
                          {option.subtitle}
                        </span>
                      )}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-[14px] font-normal text-red-1">{error}</p>}
    </div>
  );
}

export default LocationSelect;
