"use client";

import {
  useEffect,
  useId,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import LocationAutocomplete, {
  type LocationAutocompleteValue,
} from "@/components/LocationAutocomplete";
import { HeartButton } from "@/components/HeartButton";
import { ensureFamilyCategories } from "@/lib/categories";
import {
  EVENT_CATEGORIES,
  FAMILY_MEMBERS,
  type FamilyEvent,
  type NewFamilyEventInput,
} from "@/types/event";
import type { RecurrenceFrequency, WeekdayIndex } from "@/types/recurrence";
import { REMINDER_OPTIONS } from "@/types/reminder";
import { getLocalDateIso } from "@/utils/events";
import { getEventLocationLabel } from "@/utils/maps";
import {
  normalizeRecurrenceRule,
  weekdayIndexFromDateOnly,
} from "@/utils/recurrence";

type RepeatPreset = "none" | "daily" | "weekly" | "monthly" | "yearly" | "custom";
type CustomUnit = "day" | "week" | "month" | "year";

export type EventFormValues = {
  title: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  assignedTo: string;
  category: string;
  location: string;
  locationName: string;
  locationAddress: string;
  locationLat: number | null;
  locationLng: number | null;
  locationPlaceId: string;
  notes: string;
  /** Empty string = No reminder */
  reminderOffsetMinutes: string;
  repeatPreset: RepeatPreset;
  customInterval: string;
  customUnit: CustomUnit;
  customWeekdays: WeekdayIndex[];
  endsMode: "never" | "on";
  recurrenceEndDate: string;
};

export type EventFormErrors = Partial<
  Record<keyof EventFormValues, string>
>;

type EventFormProps = {
  initialValues?: EventFormValues;
  onSubmit: (event: NewFamilyEventInput) => void | Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
};

const INITIAL_VALUES: EventFormValues = {
  title: "",
  startDate: "",
  startTime: "",
  endDate: "",
  endTime: "",
  assignedTo: "",
  category: "",
  location: "",
  locationName: "",
  locationAddress: "",
  locationLat: null,
  locationLng: null,
  locationPlaceId: "",
  notes: "",
  reminderOffsetMinutes: "",
  repeatPreset: "none",
  customInterval: "1",
  customUnit: "week",
  customWeekdays: [],
  endsMode: "never",
  recurrenceEndDate: "",
};

const WEEKDAY_OPTIONS: { value: WeekdayIndex; label: string }[] = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

function recurrenceToFormFields(event: FamilyEvent): Pick<
  EventFormValues,
  | "repeatPreset"
  | "customInterval"
  | "customUnit"
  | "customWeekdays"
  | "endsMode"
  | "recurrenceEndDate"
> {
  const rule = normalizeRecurrenceRule(event.recurrence ?? null);
  if (!rule) {
    return {
      repeatPreset: "none",
      customInterval: "1",
      customUnit: "week",
      customWeekdays: [],
      endsMode: "never",
      recurrenceEndDate: "",
    };
  }

  const isSimple =
    rule.interval === 1 &&
    (rule.frequency !== "weekly" ||
      !rule.weekdays ||
      rule.weekdays.length <= 1);

  if (isSimple) {
    return {
      repeatPreset: rule.frequency,
      customInterval: "1",
      customUnit:
        rule.frequency === "daily"
          ? "day"
          : rule.frequency === "weekly"
            ? "week"
            : rule.frequency === "monthly"
              ? "month"
              : "year",
      customWeekdays: rule.weekdays ?? [],
      endsMode: rule.endDate ? "on" : "never",
      recurrenceEndDate: rule.endDate ?? "",
    };
  }

  return {
    repeatPreset: "custom",
    customInterval: String(rule.interval),
    customUnit:
      rule.frequency === "daily"
        ? "day"
        : rule.frequency === "weekly"
          ? "week"
          : rule.frequency === "monthly"
            ? "month"
            : "year",
    customWeekdays: rule.weekdays ?? [],
    endsMode: rule.endDate ? "on" : "never",
    recurrenceEndDate: rule.endDate ?? "",
  };
}

function createDefaultFormValues(): EventFormValues {
  return {
    ...INITIAL_VALUES,
    startDate: getLocalDateIso(),
  };
}

export function familyEventToFormValues(event: FamilyEvent): EventFormValues {
  return {
    title: event.title,
    startDate: event.startDate,
    startTime: event.startTime ?? "",
    endDate: event.endDate ?? "",
    endTime: event.endTime ?? "",
    assignedTo: event.assignedTo,
    category: event.category,
    location: getEventLocationLabel(event),
    locationName: event.locationName ?? "",
    locationAddress: event.locationAddress ?? "",
    locationLat: event.locationLat ?? null,
    locationLng: event.locationLng ?? null,
    locationPlaceId: event.locationPlaceId ?? "",
    notes: event.notes ?? "",
    reminderOffsetMinutes:
      event.reminderOffsetMinutes == null
        ? ""
        : String(event.reminderOffsetMinutes),
    ...recurrenceToFormFields(event),
  };
}

export function validateEventForm(values: EventFormValues): EventFormErrors {
  const errors: EventFormErrors = {};
  const title = values.title.trim();

  if (!title) {
    errors.title = "Please enter an event title.";
  }

  if (!values.startDate) {
    errors.startDate = "Please choose a start date.";
  }

  if (!values.assignedTo) {
    errors.assignedTo = "Please choose who this is for.";
  }

  if (!values.category) {
    errors.category = "Please choose a category.";
  }

  if (
    values.startDate &&
    values.endDate &&
    values.endDate < values.startDate
  ) {
    errors.endDate = "End date can’t be earlier than the start date.";
  }

  const effectiveEndDate = values.endDate || values.startDate;
  if (
    values.startDate &&
    effectiveEndDate === values.startDate &&
    values.startTime &&
    values.endTime &&
    values.endTime < values.startTime
  ) {
    errors.endTime = "End time can’t be earlier than the start time.";
  }

  if (values.repeatPreset !== "none") {
    if (values.repeatPreset === "custom") {
      const interval = Number(values.customInterval);
      if (!Number.isInteger(interval) || interval < 1) {
        errors.customInterval = "Enter a whole number of 1 or more.";
      }
      if (values.customUnit === "week" && values.customWeekdays.length === 0) {
        errors.customWeekdays = "Choose at least one weekday.";
      }
    }

    if (values.endsMode === "on") {
      if (!values.recurrenceEndDate) {
        errors.recurrenceEndDate = "Choose when the repeats should end.";
      } else if (
        values.startDate &&
        values.recurrenceEndDate < values.startDate
      ) {
        errors.recurrenceEndDate = "End date can’t be before the start date.";
      }
    }
  }

  return errors;
}

function buildRecurrenceFromForm(values: EventFormValues) {
  if (values.repeatPreset === "none") {
    return null;
  }

  const endDate =
    values.endsMode === "on" && values.recurrenceEndDate
      ? values.recurrenceEndDate
      : null;

  if (values.repeatPreset !== "custom") {
    const frequency = values.repeatPreset as RecurrenceFrequency;
    return normalizeRecurrenceRule({
      frequency,
      interval: 1,
      weekdays:
        frequency === "weekly" && values.startDate
          ? [weekdayIndexFromDateOnly(values.startDate)]
          : undefined,
      endDate,
    });
  }

  const unitToFrequency: Record<CustomUnit, RecurrenceFrequency> = {
    day: "daily",
    week: "weekly",
    month: "monthly",
    year: "yearly",
  };

  const frequency = unitToFrequency[values.customUnit];
  return normalizeRecurrenceRule({
    frequency,
    interval: Number(values.customInterval) || 1,
    weekdays: frequency === "weekly" ? values.customWeekdays : undefined,
    endDate,
  });
}

export function toNewFamilyEventInput(
  values: EventFormValues,
): NewFamilyEventInput {
  const endDate =
    values.endDate && values.endDate !== values.startDate
      ? values.endDate
      : undefined;

  return {
    title: values.title.trim(),
    startDate: values.startDate,
    startTime: values.startTime || undefined,
    endDate,
    endTime: values.endTime || undefined,
    assignedTo: values.assignedTo,
    category: values.category,
    location: values.location.trim() || undefined,
    locationName: values.locationName.trim() || undefined,
    locationAddress: values.locationAddress.trim() || undefined,
    locationLat: values.locationLat ?? undefined,
    locationLng: values.locationLng ?? undefined,
    locationPlaceId: values.locationPlaceId.trim() || undefined,
    notes: values.notes.trim() || undefined,
    reminderOffsetMinutes:
      values.reminderOffsetMinutes === ""
        ? null
        : Number(values.reminderOffsetMinutes),
    recurrence: buildRecurrenceFromForm(values),
  };
}

export default function EventForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = "Save Event",
}: EventFormProps) {
  const formId = useId();
  const [values, setValues] = useState<EventFormValues>(
    initialValues ?? createDefaultFormValues(),
  );
  const [errors, setErrors] = useState<EventFormErrors>({});
  const [touchedSubmit, setTouchedSubmit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([
    ...EVENT_CATEGORIES,
  ]);

  useEffect(() => {
    let cancelled = false;
    void ensureFamilyCategories()
      .then((rows) => {
        if (cancelled || rows.length === 0) {
          return;
        }
        const names = rows.map((row) => row.name);
        setCategoryOptions(() => {
          const selected = values.category;
          if (selected && !names.includes(selected)) {
            return [...names, selected];
          }
          return names;
        });
      })
      .catch((error: unknown) => {
        console.error(error);
      });
    return () => {
      cancelled = true;
    };
    // Only load once on mount; keep selected category even if missing from list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const locationValue: LocationAutocompleteValue = {
    text: values.location,
    details: {
      name: values.locationName || undefined,
      address: values.locationAddress || undefined,
      lat: values.locationLat ?? undefined,
      lng: values.locationLng ?? undefined,
      placeId: values.locationPlaceId || undefined,
    },
  };

  function updateField<K extends keyof EventFormValues>(
    field: K,
    value: EventFormValues[K],
  ) {
    setValues((current) => {
      const next = { ...current, [field]: value };
      if (touchedSubmit) {
        setErrors(validateEventForm(next));
      }
      return next;
    });
  }

  function updateLocation(next: LocationAutocompleteValue) {
    setValues((current) => {
      const updated: EventFormValues = {
        ...current,
        location: next.text,
        locationName: next.details.name ?? "",
        locationAddress: next.details.address ?? "",
        locationLat:
          typeof next.details.lat === "number" ? next.details.lat : null,
        locationLng:
          typeof next.details.lng === "number" ? next.details.lng : null,
        locationPlaceId: next.details.placeId ?? "",
      };
      if (touchedSubmit) {
        setErrors(validateEventForm(updated));
      }
      return updated;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setTouchedSubmit(true);
    setSubmitError(null);

    const nextErrors = validateEventForm(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      const firstErrorField = Object.keys(nextErrors)[0];
      const fieldElement = document.getElementById(
        `${formId}-${firstErrorField}`,
      );
      fieldElement?.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(toNewFamilyEventInput(values));
    } catch (error) {
      console.error(error);
      setSubmitError(
        "We couldn’t save this event. Please try again in a moment.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-1 flex-col gap-5 pb-28"
    >
      <Field
        id={`${formId}-title`}
        label="Event Title"
        error={errors.title}
        required
      >
        <input
          id={`${formId}-title`}
          name="title"
          type="text"
          autoComplete="off"
          placeholder="Ziva Vaccination"
          value={values.title}
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? `${formId}-title-error` : undefined}
          onChange={(event) => updateField("title", event.target.value)}
          className={inputClassName(Boolean(errors.title))}
        />
      </Field>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field
          id={`${formId}-startDate`}
          label="Start Date"
          error={errors.startDate}
          required
        >
          <input
            id={`${formId}-startDate`}
            name="startDate"
            type="date"
            value={values.startDate}
            aria-invalid={Boolean(errors.startDate)}
            aria-describedby={
              errors.startDate ? `${formId}-startDate-error` : undefined
            }
            onChange={(event) => updateField("startDate", event.target.value)}
            className={inputClassName(Boolean(errors.startDate))}
          />
        </Field>

        <Field id={`${formId}-startTime`} label="Start Time" error={errors.startTime}>
          <input
            id={`${formId}-startTime`}
            name="startTime"
            type="time"
            value={values.startTime}
            aria-invalid={Boolean(errors.startTime)}
            onChange={(event) => updateField("startTime", event.target.value)}
            className={inputClassName(Boolean(errors.startTime))}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field id={`${formId}-endDate`} label="End Date" error={errors.endDate}>
          <input
            id={`${formId}-endDate`}
            name="endDate"
            type="date"
            value={values.endDate}
            aria-invalid={Boolean(errors.endDate)}
            aria-describedby={
              errors.endDate ? `${formId}-endDate-error` : undefined
            }
            onChange={(event) => updateField("endDate", event.target.value)}
            className={inputClassName(Boolean(errors.endDate))}
          />
        </Field>

        <Field id={`${formId}-endTime`} label="End Time" error={errors.endTime}>
          <input
            id={`${formId}-endTime`}
            name="endTime"
            type="time"
            value={values.endTime}
            aria-invalid={Boolean(errors.endTime)}
            aria-describedby={
              errors.endTime ? `${formId}-endTime-error` : undefined
            }
            onChange={(event) => updateField("endTime", event.target.value)}
            className={inputClassName(Boolean(errors.endTime))}
          />
        </Field>
      </div>

      <Field
        id={`${formId}-assignedTo`}
        label="Assigned To"
        error={errors.assignedTo}
        required
      >
        <select
          id={`${formId}-assignedTo`}
          name="assignedTo"
          value={values.assignedTo}
          aria-invalid={Boolean(errors.assignedTo)}
          aria-describedby={
            errors.assignedTo ? `${formId}-assignedTo-error` : undefined
          }
          onChange={(event) =>
            updateField("assignedTo", event.target.value)
          }
          className={inputClassName(Boolean(errors.assignedTo))}
        >
          <option value="">Select a family member</option>
          {FAMILY_MEMBERS.map((member) => (
            <option key={member} value={member}>
              {member}
            </option>
          ))}
          {values.assignedTo &&
          !(FAMILY_MEMBERS as readonly string[]).includes(values.assignedTo) ? (
            <option value={values.assignedTo}>{values.assignedTo}</option>
          ) : null}
        </select>
      </Field>

      <Field
        id={`${formId}-category`}
        label="Category"
        error={errors.category}
        required
      >
        <select
          id={`${formId}-category`}
          name="category"
          value={values.category}
          aria-invalid={Boolean(errors.category)}
          aria-describedby={
            errors.category ? `${formId}-category-error` : undefined
          }
          onChange={(event) => updateField("category", event.target.value)}
          className={inputClassName(Boolean(errors.category))}
        >
          <option value="">Select a category</option>
          {categoryOptions.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </Field>

      <Field id={`${formId}-location`} label="Location" error={errors.location}>
        <LocationAutocomplete
          id={`${formId}-location`}
          value={locationValue}
          onChange={updateLocation}
          className={inputClassName(false)}
          disabled={isSubmitting}
        />
        {values.locationAddress ? (
          <p className="text-xs text-muted">{values.locationAddress}</p>
        ) : (
          <p className="text-xs text-muted">
            Search for a place, or type a custom spot like Home.
          </p>
        )}
      </Field>

      <Field
        id={`${formId}-repeat`}
        label="Repeat"
        error={errors.repeatPreset}
      >
        <select
          id={`${formId}-repeat`}
          name="repeat"
          value={values.repeatPreset}
          onChange={(event) => {
            const next = event.target.value as RepeatPreset;
            setValues((current) => {
              const updated: EventFormValues = {
                ...current,
                repeatPreset: next,
                customWeekdays:
                  next === "custom" &&
                  current.customUnit === "week" &&
                  current.customWeekdays.length === 0 &&
                  current.startDate
                    ? [weekdayIndexFromDateOnly(current.startDate)]
                    : current.customWeekdays,
              };
              if (touchedSubmit) {
                setErrors(validateEventForm(updated));
              }
              return updated;
            });
          }}
          className={inputClassName(false)}
        >
          <option value="none">Does not repeat</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
          <option value="custom">Custom</option>
        </select>
      </Field>

      {values.repeatPreset === "custom" ? (
        <div className="space-y-4 rounded-3xl border border-surface-border bg-white/55 p-4">
          <div className="grid grid-cols-[1fr_1.2fr] gap-3">
            <Field
              id={`${formId}-customInterval`}
              label="Repeat every"
              error={errors.customInterval}
              required
            >
              <input
                id={`${formId}-customInterval`}
                type="number"
                min={1}
                step={1}
                value={values.customInterval}
                onChange={(event) =>
                  updateField("customInterval", event.target.value)
                }
                className={inputClassName(Boolean(errors.customInterval))}
              />
            </Field>
            <Field id={`${formId}-customUnit`} label="Unit" required>
              <select
                id={`${formId}-customUnit`}
                value={values.customUnit}
                onChange={(event) =>
                  updateField("customUnit", event.target.value as CustomUnit)
                }
                className={inputClassName(false)}
              >
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
                <option value="year">Year</option>
              </select>
            </Field>
          </div>

          {values.customUnit === "week" ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-bold text-foreground">Repeat on</p>
              <div className="flex flex-wrap gap-2">
                {WEEKDAY_OPTIONS.map((day) => {
                  const selected = values.customWeekdays.includes(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        setValues((current) => {
                          const set = new Set(current.customWeekdays);
                          if (set.has(day.value)) {
                            set.delete(day.value);
                          } else {
                            set.add(day.value);
                          }
                          const updated = {
                            ...current,
                            customWeekdays: Array.from(set).sort(
                              (a, b) => a - b,
                            ) as WeekdayIndex[],
                          };
                          if (touchedSubmit) {
                            setErrors(validateEventForm(updated));
                          }
                          return updated;
                        });
                      }}
                      className={[
                        "rounded-full px-3 py-2 text-sm font-bold transition",
                        selected
                          ? "bg-accent text-white"
                          : "border border-surface-border bg-white/80 text-foreground",
                      ].join(" ")}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
              {errors.customWeekdays ? (
                <p role="alert" className="text-sm font-semibold text-accent">
                  {errors.customWeekdays}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {values.repeatPreset !== "none" ? (
        <div className="space-y-3">
          <Field id={`${formId}-endsMode`} label="Ends">
            <select
              id={`${formId}-endsMode`}
              value={values.endsMode}
              onChange={(event) =>
                updateField(
                  "endsMode",
                  event.target.value as EventFormValues["endsMode"],
                )
              }
              className={inputClassName(false)}
            >
              <option value="never">Never</option>
              <option value="on">On Date</option>
            </select>
          </Field>
          {values.endsMode === "on" ? (
            <Field
              id={`${formId}-recurrenceEndDate`}
              label="End date"
              error={errors.recurrenceEndDate}
              required
            >
              <input
                id={`${formId}-recurrenceEndDate`}
                type="date"
                value={values.recurrenceEndDate}
                onChange={(event) =>
                  updateField("recurrenceEndDate", event.target.value)
                }
                className={inputClassName(Boolean(errors.recurrenceEndDate))}
              />
            </Field>
          ) : null}
        </div>
      ) : null}

      <Field
        id={`${formId}-reminder`}
        label="Reminder"
        error={errors.reminderOffsetMinutes}
      >
        <select
          id={`${formId}-reminder`}
          name="reminder"
          value={values.reminderOffsetMinutes}
          onChange={(event) =>
            updateField("reminderOffsetMinutes", event.target.value)
          }
          className={inputClassName(false)}
        >
          {REMINDER_OPTIONS.map((option) => (
            <option
              key={option.label}
              value={option.value == null ? "" : String(option.value)}
            >
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted">
          All-day events (no start time) use 9:00 AM family local time.
        </p>
      </Field>

      <Field id={`${formId}-notes`} label="Notes" error={errors.notes}>
        <textarea
          id={`${formId}-notes`}
          name="notes"
          rows={4}
          placeholder="Anything the family should know?"
          value={values.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          className={`${inputClassName(false)} min-h-28 resize-y`}
        />
      </Field>

      {submitError ? (
        <p
          role="alert"
          className="rounded-2xl border border-accent/30 bg-accent-soft/40 px-4 py-3 text-sm font-semibold text-accent"
        >
          {submitError}
        </p>
      ) : null}

      <div className="pointer-events-none safe-bottom fixed inset-x-0 bottom-0 z-20 flex justify-center px-5 pt-8">
        <div className="pointer-events-auto flex w-full max-w-md flex-col gap-3 sm:max-w-lg">
          <HeartButton
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? "Saving…" : submitLabel}
          </HeartButton>
          <HeartButton
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isSubmitting}
            className="w-full"
          >
            Cancel
          </HeartButton>
        </div>
      </div>
    </form>
  );
}

function inputClassName(hasError: boolean): string {
  return [
    "w-full rounded-2xl border bg-white/85 px-4 py-3.5 text-base text-foreground outline-none transition",
    "placeholder:text-muted/70",
    "focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:border-accent/50",
    hasError
      ? "border-accent/60 ring-1 ring-accent/25"
      : "border-surface-border",
  ].join(" ");
}

function Field({
  id,
  label,
  error,
  required,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-bold text-foreground">
        {label}
        {required ? (
          <span className="text-accent" aria-hidden="true">
            {" "}
            *
          </span>
        ) : (
          <span className="ml-1 font-semibold text-muted">(optional)</span>
        )}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm font-semibold text-accent">
          {error}
        </p>
      ) : null}
    </div>
  );
}
