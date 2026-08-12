"use client";

import { getAppleMapsUrl, getGoogleMapsUrl, type MapLocationInput } from "@/utils/maps";

type MapOpenDialogProps = {
  open: boolean;
  location: MapLocationInput;
  onClose: () => void;
};

export default function MapOpenDialog({
  open,
  location,
  onClose,
}: MapOpenDialogProps) {
  if (!open) {
    return null;
  }

  const googleUrl = getGoogleMapsUrl(location);
  const appleUrl = getAppleMapsUrl(location);
  const label =
    location.name?.trim() ||
    location.address?.trim() ||
    location.query?.trim() ||
    "Selected location";

  return (
    <div
      className="safe-bottom fixed inset-0 z-40 flex items-end justify-center bg-foreground/35 px-5 pt-10 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="open-location-title"
        className="w-full max-w-md rounded-3xl border border-surface-border bg-[#fffaf4] p-5 shadow-[0_18px_40px_rgba(58,36,18,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id="open-location-title"
          className="font-display text-2xl font-medium text-foreground"
        >
          Open location in
        </h2>
        <p className="mt-2 text-sm text-muted">{label}</p>

        <div className="mt-6 flex flex-col gap-3">
          <a
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center rounded-2xl bg-accent px-5 py-3.5 text-base font-bold text-white transition hover:bg-accent-deep"
            onClick={onClose}
          >
            Google Maps
          </a>
          <a
            href={appleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center rounded-2xl border border-surface-border bg-white/80 px-5 py-3.5 text-base font-bold text-foreground transition hover:bg-white"
            onClick={onClose}
          >
            Apple Maps
          </a>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl border border-transparent px-5 py-3.5 text-base font-bold text-muted transition hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
