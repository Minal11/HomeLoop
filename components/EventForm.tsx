"use client";

import {
  useId,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import { DEMO_TODAY } from "@/data/events";
import {
  EVENT_CATEGORIES,
  FAMILY_MEMBERS,
  type EventCategory,
  type FamilyEvent,
  type FamilyMember,
  type NewFamilyEventInput,
} from "@/types/event";

export type EventFormValues = {
  title: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  assignedTo: FamilyMember | "";
  category: EventCategory | "";
  location: string;
  notes: string;
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
  startDate: DEMO_TODAY,
  startTime: "",
  endDate: "",
  endTime: "",
  assignedTo: "",
  category: "",
  location: "",
  notes: "",
};

export function familyEventToFormValues(event: FamilyEvent): EventFormValues {
  return {
    title: event.title,
    startDate: event.startDate,
    startTime: event.startTime ?? "",
    endDate: event.endDate ?? "",
    endTime: event.endTime ?? "",
    assignedTo: event.assignedTo,
    category: event.category,
    location: event.location ?? "",
    notes: event.notes ?? "",
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

  return errors;
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
    assignedTo: values.assignedTo as FamilyMember,
    category: values.category as EventCategory,
    location: values.location.trim() || undefined,
    notes: values.notes.trim() || undefined,
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
    initialValues ?? INITIAL_VALUES,
  );
  const [errors, setErrors] = useState<EventFormErrors>({});
  const [touchedSubmit, setTouchedSubmit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
            updateField("assignedTo", event.target.value as FamilyMember | "")
          }
          className={inputClassName(Boolean(errors.assignedTo))}
        >
          <option value="">Select a family member</option>
          {FAMILY_MEMBERS.map((member) => (
            <option key={member} value={member}>
              {member}
            </option>
          ))}
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
          onChange={(event) =>
            updateField("category", event.target.value as EventCategory | "")
          }
          className={inputClassName(Boolean(errors.category))}
        >
          <option value="">Select a category</option>
          {EVENT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </Field>

      <Field id={`${formId}-location`} label="Location" error={errors.location}>
        <input
          id={`${formId}-location`}
          name="location"
          type="text"
          autoComplete="off"
          placeholder="Where is it happening?"
          value={values.location}
          onChange={(event) => updateField("location", event.target.value)}
          className={inputClassName(false)}
        />
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

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center px-5 pb-5 pt-8">
        <div className="pointer-events-auto flex w-full max-w-md flex-col gap-3 sm:max-w-lg">
          <button
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="w-full rounded-2xl bg-accent px-5 py-3.5 text-base font-bold text-white shadow-[0_14px_28px_rgba(184,51,74,0.32)] transition duration-200 hover:bg-accent-deep active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Saving…" : submitLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="w-full rounded-2xl border border-surface-border bg-white/80 px-5 py-3.5 text-base font-bold text-foreground transition duration-200 hover:bg-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
          >
            Cancel
          </button>
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
