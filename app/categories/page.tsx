"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import Heart from "@/components/Heart";
import HomeLoopName from "@/components/HomeLoopName";
import {
  createFamilyCategory,
  deleteFamilyCategory,
  ensureFamilyCategories,
  updateFamilyCategory,
} from "@/lib/categories";
import { getCurrentFamily } from "@/lib/families";
import {
  CATEGORY_COLOR_PRESETS,
  type FamilyCategory,
} from "@/types/category";

type LoadState = "loading" | "ready" | "error" | "no-family";

type Draft = {
  name: string;
  color: string;
};

const EMPTY_DRAFT: Draft = {
  name: "",
  color: CATEGORY_COLOR_PRESETS[0],
};

export default function ManageCategoriesPage() {
  const [categories, setCategories] = useState<FamilyCategory[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY_DRAFT);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadState("loading");
    setErrorMessage(null);

    try {
      const family = await getCurrentFamily();
      if (!family) {
        setCategories([]);
        setLoadState("no-family");
        return;
      }

      const rows = await ensureFamilyCategories();
      setCategories(rows);
      setLoadState("ready");
    } catch (error) {
      console.error(error);
      setLoadState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load categories.",
      );
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const family = await getCurrentFamily();
        if (cancelled) {
          return;
        }
        if (!family) {
          setCategories([]);
          setLoadState("no-family");
          return;
        }

        const rows = await ensureFamilyCategories();
        if (cancelled) {
          return;
        }
        setCategories(rows);
        setLoadState("ready");
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setLoadState("error");
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load categories.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const commaSeparated = useMemo(
    () => categories.map((category) => category.name).join(", "),
    [categories],
  );

  const readOnly = categories.some((row) => row.id.startsWith("default-"));

  async function handleCreate() {
    if (isCreating) {
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);

    try {
      const created = await createFamilyCategory(draft);
      setCategories((current) => [...current, created]);
      setDraft(EMPTY_DRAFT);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to create category.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  function startEdit(category: FamilyCategory) {
    setDeleteConfirmId(null);
    setEditingId(category.id);
    setEditDraft({ name: category.name, color: category.color });
    setErrorMessage(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft(EMPTY_DRAFT);
  }

  async function handleSaveEdit(categoryId: string) {
    if (busyId) {
      return;
    }

    setBusyId(categoryId);
    setErrorMessage(null);

    try {
      const updated = await updateFamilyCategory(categoryId, editDraft);
      setCategories((current) =>
        current.map((row) => (row.id === categoryId ? updated : row)),
      );
      setEditingId(null);
      setEditDraft(EMPTY_DRAFT);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to update category.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(categoryId: string) {
    if (busyId) {
      return;
    }

    setBusyId(categoryId);
    setErrorMessage(null);

    try {
      await deleteFamilyCategory(categoryId);
      setCategories((current) => current.filter((row) => row.id !== categoryId));
      setDeleteConfirmId(null);
      if (editingId === categoryId) {
        cancelEdit();
      }
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to delete category.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-10 pt-6 sm:max-w-lg sm:pt-10">
      <header className="animate-fade-up">
        <Link
          href="/"
          className="text-sm font-bold text-muted transition hover:text-foreground"
        >
          ← <HomeLoopName />
        </Link>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Categories
          <Heart
            size={16}
            className="ml-2 inline-block translate-y-[-0.1em] opacity-80"
          />
        </h1>
        <p className="mt-2 text-sm text-muted">
          Add, edit, or remove categories used when creating events.
        </p>
      </header>

      {loadState === "loading" ? (
        <p className="mt-8 text-sm font-semibold text-muted">
          Loading categories…
        </p>
      ) : null}

      {loadState === "error" ? (
        <div className="mt-8 rounded-3xl border border-surface-border bg-surface p-5 text-center shadow-[var(--shadow)]">
          <p className="font-display text-xl font-medium text-foreground">
            Couldn&apos;t load categories.
          </p>
          {errorMessage ? (
            <p className="mt-2 text-sm text-muted">{errorMessage}</p>
          ) : null}
          <button
            type="button"
            onClick={() => void load()}
            className="mt-4 rounded-2xl bg-accent px-5 py-3 text-sm font-bold text-white hover:bg-accent-deep"
          >
            Retry
          </button>
        </div>
      ) : null}

      {loadState === "no-family" ? (
        <div className="mt-8 space-y-4 rounded-3xl border border-surface-border bg-surface p-5 shadow-[var(--shadow)]">
          <p className="font-display text-xl font-medium text-foreground">
            You&apos;re not in a family yet.
          </p>
          <p className="text-sm text-muted">
            Join or create a family before managing categories.
          </p>
          <Link
            href="/family"
            className="inline-flex rounded-2xl bg-accent px-5 py-3 text-sm font-bold text-white hover:bg-accent-deep"
          >
            Go to Family
          </Link>
        </div>
      ) : null}

      {loadState === "ready" ? (
        <div className="mt-8 flex flex-1 flex-col gap-6">
          {readOnly ? (
            <p
              role="status"
              className="rounded-2xl border border-amber-700/20 bg-amber-50/80 px-4 py-3 text-sm font-semibold text-amber-950"
            >
              Categories are read-only until you run the{" "}
              <code className="font-mono text-xs">014_family_categories</code>{" "}
              migration in Supabase.
            </p>
          ) : null}

          {errorMessage ? (
            <p role="alert" className="text-sm font-semibold text-[#d6455d]">
              {errorMessage}
            </p>
          ) : null}

          <section className="space-y-3">
            <h2 className="font-display text-xl font-medium text-foreground">
              Your categories
            </h2>

            {categories.length === 0 ? (
              <p className="text-sm text-muted">No categories yet.</p>
            ) : (
              <ul className="space-y-3">
                {categories.map((category) => {
                  const isEditing = editingId === category.id;
                  const isBusy = busyId === category.id;
                  const confirmingDelete = deleteConfirmId === category.id;

                  return (
                    <li
                      key={category.id}
                      className="rounded-2xl border border-surface-border bg-surface px-4 py-3 shadow-[var(--shadow)]"
                    >
                      {isEditing ? (
                        <div className="space-y-3">
                          <CategoryEditor
                            draft={editDraft}
                            onChange={setEditDraft}
                            disabled={isBusy || readOnly}
                          />
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={isBusy || readOnly}
                              onClick={() => void handleSaveEdit(category.id)}
                              className="rounded-xl bg-accent px-4 py-2 text-sm font-bold text-white hover:bg-accent-deep disabled:opacity-60"
                            >
                              {isBusy ? "Saving…" : "Save"}
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={cancelEdit}
                              className="rounded-xl border border-surface-border bg-white px-4 py-2 text-sm font-bold text-foreground hover:bg-[#f3ebe0] disabled:opacity-60"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex items-center gap-3">
                            <span
                              aria-hidden="true"
                              className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-black/10"
                              style={{ backgroundColor: category.color }}
                            />
                            <span className="truncate text-sm font-bold text-foreground">
                              {category.name}
                            </span>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              disabled={readOnly || Boolean(busyId)}
                              onClick={() => startEdit(category)}
                              className="text-sm font-bold text-muted transition hover:text-foreground disabled:opacity-50"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={readOnly || Boolean(busyId)}
                              onClick={() => {
                                setEditingId(null);
                                setDeleteConfirmId(category.id);
                                setErrorMessage(null);
                              }}
                              className="text-sm font-bold text-[#d6455d] transition hover:opacity-80 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}

                      {confirmingDelete && !isEditing ? (
                        <div className="mt-3 space-y-2 border-t border-surface-border pt-3">
                          <p className="text-sm text-muted">
                            Delete{" "}
                            <span className="font-bold text-foreground">
                              {category.name}
                            </span>
                            ? Events using it must be reassigned first.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleDelete(category.id)}
                              className="rounded-xl bg-[#d6455d] px-4 py-2 text-sm font-bold text-white hover:bg-[#b8334a] disabled:opacity-60"
                            >
                              {isBusy ? "Deleting…" : "Confirm delete"}
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => setDeleteConfirmId(null)}
                              className="rounded-xl border border-surface-border bg-white px-4 py-2 text-sm font-bold text-foreground hover:bg-[#f3ebe0] disabled:opacity-60"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-medium text-foreground">
              Add category
            </h2>
            <div className="rounded-2xl border border-surface-border bg-surface px-4 py-4 shadow-[var(--shadow)]">
              <CategoryEditor
                draft={draft}
                onChange={setDraft}
                disabled={isCreating || readOnly}
              />
              <button
                type="button"
                disabled={isCreating || readOnly || !draft.name.trim()}
                onClick={() => void handleCreate()}
                className="mt-4 w-full rounded-2xl bg-accent px-5 py-3 text-sm font-bold text-white hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreating ? "Adding…" : "Add category"}
              </button>
            </div>
          </section>

          <p className="mt-auto pt-4 text-sm text-muted">
            <span className="font-bold text-foreground">All categories: </span>
            {commaSeparated || "None"}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function CategoryEditor({
  draft,
  onChange,
  disabled,
}: {
  draft: Draft;
  onChange: (next: Draft) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-3">
      <label className="block space-y-1.5">
        <span className="text-xs font-bold uppercase tracking-wide text-muted">
          Name
        </span>
        <input
          type="text"
          value={draft.name}
          disabled={disabled}
          maxLength={48}
          placeholder="e.g. Sports"
          onChange={(event) =>
            onChange({ ...draft, name: event.target.value })
          }
          className="w-full rounded-xl border border-surface-border bg-white px-3 py-2.5 text-sm font-semibold text-foreground outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
        />
      </label>

      <div className="space-y-1.5">
        <span className="text-xs font-bold uppercase tracking-wide text-muted">
          Color
        </span>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_COLOR_PRESETS.map((color) => {
            const selected =
              draft.color.toUpperCase() === color.toUpperCase();
            return (
              <button
                key={color}
                type="button"
                disabled={disabled}
                aria-label={`Choose color ${color}`}
                aria-pressed={selected}
                onClick={() => onChange({ ...draft, color })}
                className={[
                  "h-8 w-8 rounded-full border-2 transition",
                  selected
                    ? "border-foreground scale-110"
                    : "border-transparent hover:scale-105",
                  disabled ? "opacity-60" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{ backgroundColor: color }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
