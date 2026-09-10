"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Crosshair, MapPin } from "lucide-react";
import { BeatLoader } from "react-spinners";
import { useDebounce } from "use-debounce";
import Modal from "@/components/Ui/Modals/Modal";
import {
  useGetLocationsQuery,
  useGetMapsKeyQuery,
  useLazyReverseGeocodeQuery,
} from "@/store/services/authService";

/** Roughly the centre of Pakistan, for a map opened with nothing chosen yet. */
const FALLBACK_CENTRE = { lat: 30.3753, lng: 69.3451 };
const FALLBACK_ZOOM = 5;
const PICKED_ZOOM = 16;

export type PickedLocation = {
  description: string;
  coordinates: { lat: number; lng: number };
};

type LocationPickerModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (picked: PickedLocation) => void;
  /** Where to open the map, when the field already holds something. */
  initial?: PickedLocation | null;
  labels?: {
    title?: string;
    search?: string;
    useCurrent?: string;
    confirm?: string;
    cancel?: string;
  };
};

/**
 * Loads the Google Maps script once per page and resolves when it is ready.
 *
 * Kept as a module-level promise rather than component state: two pickers on
 * one page would otherwise each add a script tag, and Google warns about — and
 * partially breaks on — being included twice.
 */
let mapsLoader: Promise<void> | null = null;

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as any).google?.maps) return Promise.resolve();
  if (mapsLoader) return mapsLoader;

  mapsLoader = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker&language=en&region=PK`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // Let a later attempt retry rather than caching the failure forever.
      mapsLoader = null;
      reject(new Error("Google Maps failed to load"));
    };
    document.head.appendChild(script);
  });

  return mapsLoader;
}

function LocationPickerModal({
  open,
  onClose,
  onConfirm,
  initial,
  labels,
}: LocationPickerModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const mapNodeRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const [mapError, setMapError] = useState("");
  const [isMapReady, setIsMapReady] = useState(false);
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(
    initial?.coordinates ?? null,
  );
  const [addressLabel, setAddressLabel] = useState(initial?.description ?? "");
  const [isLocating, setIsLocating] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 400);

  const [runReverseGeocode, { isFetching: isResolving }] =
    useLazyReverseGeocodeQuery();

  const trimmedSearch = debouncedSearch.trim();
  const { data: searchData, isFetching: isSearching } = useGetLocationsQuery(
    { q: trimmedSearch },
    { skip: !open || trimmedSearch.length < 2 },
  );

  const suggestions =
    (
      searchData as
        | { data?: { description?: string; coordinates?: { lat: number; lng: number } | null }[] }
        | undefined
    )?.data ?? [];

  // The map is drawn by the browser, so a key has to reach it. The web app is
  // deployed apart from the API and cannot read its environment, so the key
  // comes from the backend, which already holds it. A NEXT_PUBLIC_ key wins
  // when one is set, so a restricted browser-only key can take over later
  // without touching this.
  const { data: mapsKeyData } = useGetMapsKeyQuery(undefined, { skip: !open });
  const servedKey = (mapsKeyData as { data?: { key?: string } } | undefined)?.data?.key ?? "";
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || servedKey;

  /** Moves the pin and asks the backend what is there. */
  const placePin = useCallback(
    async (next: { lat: number; lng: number }, knownLabel?: string) => {
      setPoint(next);
      if (markerRef.current) markerRef.current.setPosition(next);
      if (mapRef.current) {
        mapRef.current.panTo(next);
        if ((mapRef.current.getZoom() ?? 0) < PICKED_ZOOM - 4) {
          mapRef.current.setZoom(PICKED_ZOOM);
        }
      }

      if (knownLabel) {
        setAddressLabel(knownLabel);
        return;
      }

      try {
        const res = await runReverseGeocode({
          lat: String(next.lat),
          lng: String(next.lng),
        }).unwrap();
        const description = (res as { data?: { description?: string } })?.data?.description;
        setAddressLabel(description ?? `${next.lat.toFixed(5)}, ${next.lng.toFixed(5)}`);
      } catch {
        // The pin is still valid without a name for it.
        setAddressLabel(`${next.lat.toFixed(5)}, ${next.lng.toFixed(5)}`);
      }
    },
    [runReverseGeocode],
  );

  // Build the map once the modal is actually open, so a page with the form on
  // it does not pay for the script until the picker is used.
  useEffect(() => {
    if (!open) return;
    // Still waiting on the served key — not an error yet.
    if (!apiKey) return;

    let cancelled = false;
    setMapError("");

    loadGoogleMaps(apiKey)
      .then(() => {
        if (cancelled || !mapNodeRef.current) return;
        const google = (window as any).google;

        const centre = point ?? FALLBACK_CENTRE;
        const map = new google.maps.Map(mapNodeRef.current, {
          center: centre,
          zoom: point ? PICKED_ZOOM : FALLBACK_ZOOM,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        const marker = new google.maps.Marker({
          position: centre,
          map,
          draggable: true,
        });

        map.addListener("click", (e: any) => {
          if (!e.latLng) return;
          void placePin({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        });
        marker.addListener("dragend", (e: any) => {
          if (!e.latLng) return;
          void placePin({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        });

        mapRef.current = map;
        markerRef.current = marker;
        setIsMapReady(true);
      })
      .catch(() => {
        if (!cancelled) setMapError("Map failed to load. Check the API key and try again.");
      });

    return () => {
      cancelled = true;
      mapRef.current = null;
      markerRef.current = null;
      setIsMapReady(false);
    };
    // `point` is deliberately read once, as the opening centre — re-running on
    // every pin move would rebuild the map under the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, apiKey, placePin]);

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setMapError("This browser cannot share a location.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        void placePin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setIsLocating(false);
        setMapError("Could not get your location. Allow location access and try again.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function handleSetOpen(value: React.SetStateAction<boolean>) {
    const nextOpen = typeof value === "function" ? value(open) : value;
    if (!nextOpen) onClose();
  }

  return (
    <Modal editModalRef={modalRef} open={open} setOpen={handleSetOpen} centered>
      <div className="hide-scrollbar max-h-[90vh] w-[92vw] max-w-[640px] overflow-y-auto rounded-[12px] bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <h2 className="flex items-center gap-2 text-[18px] font-semibold text-[#001907]">
            <MapPin className="h-5 w-5 text-green-1" strokeWidth={2} />
            {labels?.title ?? "Choose location"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center"
          >
            <XMarkIcon className="h-5 w-5 text-[#001907]" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mt-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={labels?.search ?? "Search a place..."}
            className="w-full rounded-[8px] border border-gray-9 bg-white px-3 py-2 text-[14px] outline-none focus:border-green-1"
          />
          {trimmedSearch.length >= 2 && (
            <div className="absolute z-10 mt-1 max-h-[200px] w-full overflow-y-auto rounded-[8px] border border-gray-200 bg-white shadow-md">
              {isSearching && (
                <div className="space-y-1 p-1">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-8 animate-pulse rounded bg-gray-100" />
                  ))}
                </div>
              )}
              {!isSearching && suggestions.length === 0 && (
                <p className="px-3 py-2 text-[13px] text-gray-8">No places found</p>
              )}
              {!isSearching &&
                suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setSearch("");
                      if (s.coordinates) {
                        void placePin(s.coordinates, s.description);
                      }
                    }}
                    className="block w-full cursor-pointer px-3 py-2 text-left text-[13px] text-black-1 hover:bg-gray-100"
                  >
                    {s.description}
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Map */}
        <div className="mt-3 overflow-hidden rounded-[10px] border border-gray-9">
          {mapError ? (
            <div className="flex h-[300px] items-center justify-center px-6 text-center text-[14px] text-[#E92440]">
              {mapError}
            </div>
          ) : (
            <div className="relative">
              <div ref={mapNodeRef} className="h-[300px] w-full" />
              {!isMapReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <BeatLoader color="#3C9197" size={10} />
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={isLocating || !!mapError}
          className="mt-3 inline-flex cursor-pointer items-center gap-2 text-[14px] font-medium text-green-1 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Crosshair className="h-4 w-4" />
          {isLocating ? "Locating..." : (labels?.useCurrent ?? "Use my current location")}
        </button>

        <p className="mt-3 min-h-[38px] rounded-[8px] bg-[#EEF2F3] px-3 py-2 text-[13px] text-gray-8">
          {isResolving
            ? "Reading the address..."
            : addressLabel || "Tap the map, drag the pin, or search above."}
        </p>

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-[40px] flex-1 cursor-pointer rounded-[8px] border border-green-1 text-[14px] font-medium text-green-1"
          >
            {labels?.cancel ?? "Cancel"}
          </button>
          <button
            type="button"
            disabled={!point}
            onClick={() => {
              if (!point) return;
              onConfirm({
                description:
                  addressLabel || `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`,
                coordinates: point,
              });
              onClose();
            }}
            className="h-[40px] flex-1 cursor-pointer rounded-[8px] border border-green-1 bg-green-1 text-[14px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {labels?.confirm ?? "Confirm location"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default LocationPickerModal;
