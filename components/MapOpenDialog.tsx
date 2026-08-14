"use client";

import { HeartButton } from "@/components/HeartButton";
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
          <HeartButton
            type="button"
            className="w-full"
            onClick={() => {
              window.open(googleUrl, "_blank", "noopener,noreferrer");
              onClose();
            }}
          >
            Google Maps
          </HeartButton>
          <HeartButton
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => {
              window.open(appleUrl, "_blank", "noopener,noreferrer");
              onClose();
            }}
          >
            Apple Maps
          </HeartButton>
          <HeartButton
            type="button"
            variant="ghost"
            onClick={onClose}
            className="w-full"
          >
            Cancel
          </HeartButton>
        </div>
      </div>
    </div>
  );
}
