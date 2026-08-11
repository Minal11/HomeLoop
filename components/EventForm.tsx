"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import { DEMO_TODAY } from "@/data/events";
import { getFamilyPeople } from "@/lib/family-people";
import {
  EVENT_CATEGORIES,
  type EventCategory,
  type FamilyEvent,
  type NewFamilyEventInput,
} from "@/types/event";
import type { FamilyPerson } from "@/types/person";

export type EventFormValues = {
  title: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  appliesToAll: boolean;
  personIds: string[];
  category: EventCategory | "";
  location: string;
  notes: string;
};

export type EventFormErrors = Partial<
  Record<
    "title" | "startDate" | "startTime" | "endDate" | "endTime" | "people" | "category",
    string
  >
>;

type EventFormProps = {
  initialValues?: EventFormValues;
  /** Used to remap legacy person ids (e.g. legacy:event:0) onto real family_people rows. */
  initialPeople?: Array<{ id: string; displayName: string }>;
  onSubmit: (event: NewFamilyEventInput) => void | Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
};

function isPersonUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function remapPersonIdsToFamilyPeople(
  personIds: string[],
  familyPeople: FamilyPerson[],
  initialPeople: Array<{ id: string; displayName: string }>,
): string[] {
  const validIds = new Set(familyPeople.map((person) => person.id));
  const idByName = new Map(
    familyPeople.map((person) => [
      person.displayName.trim().toLowerCase(),
      person.id,
    ]),
  );
  const nameByInitialId = new Map(
    initialPeople.map((person) => [person.id, person.displayName]),
  );

  const resolved: string[] = [];
  const seen = new Set<string>();

  for (const id of personIds) {
    let target: string | undefined;
    if (validIds.has(id)) {
      target = id;
    } else {
      const name = nameByInitialId.get(id);
      if (name) {
        target = idByName.get(name.trim().toLowerCase());
      }
    }

    if (target && !seen.has(target)) {
      seen.add(target);
      resolved.push(target);
    }
  }

  return resolved;
}

const INITIAL_VALUES: EventFormValues = {
  title: "",
  startDate: DEMO_TODAY,
  startTime: "",
  endDate: "",
  endTime: "",
  appliesToAll: false,
  personIds: [],
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
    appliesToAll: event.appliesToAll,
    personIds: event.people.map((person) => person.id),
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

  if (!values.appliesToAll && values.personIds.length === 0) {
    errors.people = "Please choose who’s involved.";
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
    appliesToAll: values.appliesToAll,
    personIds: values.appliesToAll
      ? []
      : values.personIds.filter(isPersonUuid),
    category: values.category as EventCategory,
    location: values.location.trim() || undefined,
    notes: values.notes.trim() || undefined,
  };
}

export default function EventForm({
  initialValues,
  initialPeople = [],
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
  const [people, setPeople] = useState<FamilyPerson[]>([]);
  const [peopleLoadError, setPeopleLoadError] = useState<string | null>(null);
  const initialPeopleRef = useRef(initialPeople);

  useEffect(() => {
    let cancelled = false;
    const peopleForRemap = initialPeopleRef.current;

    void getFamilyPeople()
      .then((rows) => {
        if (cancelled) {
          return;
        }
        setPeople(rows);
        setValues((current) => {
          if (current.appliesToAll || current.personIds.length === 0) {
            return current;
          }
          const remapped = remapPersonIdsToFamilyPeople(
            current.personIds,
            rows,
            peopleForRemap,
          );
          if (
            remapped.length === current.personIds.length &&
            remapped.every((id, index) => id === current.personIds[index])
          ) {
            return current;
          }
          return { ...current, personIds: remapped };
        });
      })
      .catch((error: unknown) => {
        console.error(error);
        if (!cancelled) {
          setPeopleLoadError("Unable to load family members.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

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

  function togglePerson(personId: string) {
    setValues((current) => {
      const nextIds = current.personIds.includes(personId)
        ? current.personIds.filter((id) => id !== personId)
        : [...current.personIds, personId];
      const next = {
        ...current,
        appliesToAll: false,
        personIds: nextIds,
      };
      if (touchedSubmit) {
        setErrors(validateEventForm(next));
      }
      return next;
    });
  }

  function selectWholeFamily() {
    setValues((current) => {
      const next = {
        ...current,
        appliesToAll: true,
        personIds: [],
      };
      if (touchedSubmit) {
        setErrors(validateEventForm(next));
      }
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouchedSubmit(true);
    const nextErrors = validateEventForm(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit(toNewFamilyEventInput(values));
    } catch (error) {
      console.error(error);
      setSubmitError(
        error instanceof Error ? error.message : "Unable to save event.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className="flex flex-1 flex-col gap-5 pb-28"
      onSubmit={(event) => void handleSubmit(event)}
      noValidate
    >
      <Field id={`${formId}-title`} label="Title" error={errors.title} required>
        <input
          id={`${formId}-title`}
          name="title"
          type="text"
          autoComplete="off"
          placeholder="What’s happening?"
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

      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold text-foreground">
          Who&apos;s involved?
          <span className="text-accent" aria-hidden="true">
            {" "}
            *
          </span>
        </p>
        {peopleLoadError ? (
          <p role="alert" className="text-sm font-semibold text-accent">
            {peopleLoadError}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={selectWholeFamily}
            aria-pressed={values.appliesToAll}
            className={[
              "rounded-full border px-4 py-2.5 text-sm font-bold transition",
              values.appliesToAll
                ? "border-accent bg-accent text-white"
                : "border-surface-border bg-white/85 text-foreground hover:border-accent/40",
            ].join(" ")}
          >
            Whole family
          </button>
          {people.map((person) => {
            const selected =
              !values.appliesToAll && values.personIds.includes(person.id);
            return (
              <button
                key={person.id}
                type="button"
                onClick={() => togglePerson(person.id)}
                aria-pressed={selected}
                className={[
                  "rounded-full border px-4 py-2.5 text-sm font-bold transition",
                  selected
                    ? "border-accent bg-accent text-white"
                    : "border-surface-border bg-white/85 text-foreground hover:border-accent/40",
                ].join(" ")}
              >
                {person.displayName}
              </button>
            );
          })}
        </div>
        {people.length === 0 && !peopleLoadError ? (
          <p className="text-sm text-muted">
            Add people on the Family screen first.
          </p>
        ) : null}
        {errors.people ? (
          <p role="alert" className="text-sm font-semibold text-accent">
            {errors.people}
          </p>
        ) : null}
      </div>

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

      <Field id={`${formId}-location`} label="Location" error={undefined}>
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

      <Field id={`${formId}-notes`} label="Notes" error={undefined}>
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
