"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import type { EventLocationDetails } from "@/types/event";

export type LocationAutocompleteValue = {
  /** Free-text / display value shown in the input. */
  text: string;
  details: EventLocationDetails;
};

type Suggestion = {
  placeId: string;
  primaryText: string;
  secondaryText: string;
};

type LocationAutocompleteProps = {
  id: string;
  value: LocationAutocompleteValue;
  onChange: (value: LocationAutocompleteValue) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
};

function createSessionToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sess-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function emptyDetails(): EventLocationDetails {
  return {
    name: undefined,
    address: undefined,
    lat: undefined,
    lng: undefined,
    placeId: undefined,
  };
}

export default function LocationAutocomplete({
  id,
  value,
  onChange,
  className,
  placeholder = "Where is it happening?",
  disabled = false,
}: LocationAutocompleteProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const sessionTokenRef = useRef(createSessionToken());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const biasRef = useRef<{ latitude: number; longitude: number } | null>(null);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [placesAvailable, setPlacesAvailable] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        biasRef.current = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
      },
      () => {
        // Optional bias only — ignore denials.
      },
      { maximumAge: 300000, timeout: 5000 },
    );
  }, []);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (!rootRef.current || !target) {
        return;
      }
      if (!rootRef.current.contains(target)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  function clearStructuredDetails(text: string) {
    onChange({
      text,
      details: emptyDetails(),
    });
  }

  function scheduleSearch(query: string) {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!placesAvailable || query.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      setActiveIndex(-1);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(() => {
      void runSearch(query.trim());
    }, 280);
  }

  async function runSearch(query: string) {
    const requestId = ++requestIdRef.current;

    try {
      const response = await fetch("/api/places/autocomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          sessionToken: sessionTokenRef.current,
          latitude: biasRef.current?.latitude,
          longitude: biasRef.current?.longitude,
        }),
      });

      const payload = (await response.json()) as {
        suggestions?: Suggestion[];
        error?: string;
      };

      if (requestId !== requestIdRef.current) {
        return;
      }

      if (response.status === 503) {
        setPlacesAvailable(false);
        setSuggestions([]);
        setIsOpen(false);
        setErrorMessage(null);
        return;
      }

      if (!response.ok) {
        setSuggestions([]);
        setIsOpen(false);
        setErrorMessage(payload.error || "Unable to search locations.");
        return;
      }

      const next = payload.suggestions ?? [];
      setSuggestions(next);
      setIsOpen(next.length > 0);
      setActiveIndex(next.length > 0 ? 0 : -1);
      setErrorMessage(null);
    } catch (error) {
      console.error(error);
      if (requestId === requestIdRef.current) {
        setSuggestions([]);
        setIsOpen(false);
        setErrorMessage("Unable to search locations.");
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }

  async function selectSuggestion(suggestion: Suggestion) {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/places/details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId: suggestion.placeId,
          sessionToken: sessionTokenRef.current,
        }),
      });

      const payload = (await response.json()) as {
        place?: {
          placeId: string;
          name: string;
          address: string;
          lat: number;
          lng: number;
        };
        error?: string;
      };

      if (!response.ok || !payload.place) {
        setErrorMessage(payload.error || "Unable to use that place.");
        return;
      }

      const place = payload.place;
      onChange({
        text: place.name,
        details: {
          name: place.name,
          address: place.address,
          lat: place.lat,
          lng: place.lng,
          placeId: place.placeId,
        },
      });

      setSuggestions([]);
      setIsOpen(false);
      setActiveIndex(-1);
      sessionTokenRef.current = createSessionToken();
    } catch (error) {
      console.error(error);
      setErrorMessage("Unable to use that place.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || suggestions.length === 0) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) =>
        current < suggestions.length - 1 ? current + 1 : 0,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        current > 0 ? current - 1 : suggestions.length - 1,
      );
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      const suggestion = suggestions[activeIndex];
      if (suggestion) {
        void selectSuggestion(suggestion);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div ref={rootRef} className="relative w-full min-w-0">
      <input
        id={id}
        name="location"
        type="text"
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        placeholder={placeholder}
        value={value.text}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined
        }
        onChange={(event) => {
          const nextText = event.target.value;
          clearStructuredDetails(nextText);
          setErrorMessage(null);
          scheduleSearch(nextText);
        }}
        onFocus={() => {
          if (suggestions.length > 0) {
            setIsOpen(true);
          }
        }}
        onKeyDown={handleKeyDown}
        className={className}
      />

      {isLoading ? (
        <p className="mt-2 text-xs font-semibold text-muted" aria-live="polite">
          Searching places…
        </p>
      ) : null}

      {errorMessage ? (
        <p role="alert" className="mt-2 text-sm font-semibold text-accent">
          {errorMessage}
        </p>
      ) : null}

      {!placesAvailable ? (
        <p className="mt-2 text-xs text-muted">
          Place suggestions unavailable — you can still type a custom location.
        </p>
      ) : null}

      {isOpen && suggestions.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-2 max-h-56 w-full overflow-y-auto rounded-2xl border border-surface-border bg-[#fffaf4] py-1 shadow-[0_14px_28px_rgba(58,36,18,0.14)]"
        >
          {suggestions.map((suggestion, index) => {
            const active = index === activeIndex;
            return (
              <li key={suggestion.placeId} role="presentation">
                <button
                  id={`${listId}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={[
                    "flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left transition",
                    active ? "bg-accent-soft/50" : "hover:bg-white/80",
                  ].join(" ")}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => void selectSuggestion(suggestion)}
                >
                  <span className="text-sm font-bold text-foreground">
                    {suggestion.primaryText}
                  </span>
                  {suggestion.secondaryText ? (
                    <span className="text-xs text-muted">
                      {suggestion.secondaryText}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
