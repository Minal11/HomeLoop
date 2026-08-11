"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

import Heart from "@/components/Heart";
import SignOutButton from "@/components/SignOutButton";
import {
  getCurrentFamily,
  getCurrentUserFamilyRole,
  getFamilyMembers,
  regenerateInviteCode,
} from "@/lib/families";
import {
  createFamilyPerson,
  deleteFamilyPerson,
  getFamilyPeople,
  updateFamilyPerson,
} from "@/lib/family-people";
import type { Family, FamilyMemberRow, FamilyRole } from "@/types/family";
import type { FamilyPerson, PersonRelationship } from "@/types/person";
import { PERSON_RELATIONSHIPS } from "@/types/person";

type LoadState = "loading" | "ready" | "error" | "no-family";

type PersonFormState = {
  displayName: string;
  relationship: PersonRelationship | "";
  birthDate: string;
};

const EMPTY_PERSON_FORM: PersonFormState = {
  displayName: "",
  relationship: "",
  birthDate: "",
};

export default function FamilyPage() {
  const [family, setFamily] = useState<Family | null>(null);
  const [accountMembers, setAccountMembers] = useState<FamilyMemberRow[]>([]);
  const [people, setPeople] = useState<FamilyPerson[]>([]);
  const [role, setRole] = useState<FamilyRole | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [regenError, setRegenError] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const [showAddPerson, setShowAddPerson] = useState(false);
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [personForm, setPersonForm] = useState<PersonFormState>(EMPTY_PERSON_FORM);
  const [personError, setPersonError] = useState<string | null>(null);
  const [isSavingPerson, setIsSavingPerson] = useState(false);
  const [removingPersonId, setRemovingPersonId] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  async function reloadFamilyData(currentFamilyId: string) {
    const [memberRows, membershipRole, peopleRows] = await Promise.all([
      getFamilyMembers(currentFamilyId),
      getCurrentUserFamilyRole(currentFamilyId),
      getFamilyPeople(currentFamilyId),
    ]);
    setAccountMembers(memberRows);
    setRole(membershipRole);
    setPeople(peopleRows);
  }

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const current = await getCurrentFamily();
        if (cancelled) {
          return;
        }
        if (!current) {
          setFamily(null);
          setAccountMembers([]);
          setPeople([]);
          setRole(null);
          setLoadState("no-family");
          return;
        }

        await reloadFamilyData(current.id);
        if (cancelled) {
          return;
        }

        setFamily(current);
        setLoadState("ready");
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setLoadState("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCopy() {
    if (!family) {
      return;
    }

    try {
      await navigator.clipboard.writeText(family.inviteCode);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch (error) {
      console.error(error);
      setCopyState("failed");
      window.setTimeout(() => setCopyState("idle"), 2000);
    }
  }

  async function handleRegenerate() {
    if (!family || isRegenerating) {
      return;
    }

    setIsRegenerating(true);
    setRegenError(null);

    try {
      const nextCode = await regenerateInviteCode(family.id);
      setFamily({ ...family, inviteCode: nextCode });
    } catch (error) {
      console.error(error);
      setRegenError(
        error instanceof Error ? error.message : "Unable to regenerate code.",
      );
    } finally {
      setIsRegenerating(false);
    }
  }

  function openAddPerson() {
    setEditingPersonId(null);
    setPersonForm(EMPTY_PERSON_FORM);
    setPersonError(null);
    setShowAddPerson(true);
  }

  function openEditPerson(person: FamilyPerson) {
    setShowAddPerson(false);
    setEditingPersonId(person.id);
    setPersonForm({
      displayName: person.displayName,
      relationship: person.relationship ?? "",
      birthDate: person.birthDate ?? "",
    });
    setPersonError(null);
  }

  async function handleSavePerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!family || isSavingPerson) {
      return;
    }

    setIsSavingPerson(true);
    setPersonError(null);

    try {
      const payload = {
        displayName: personForm.displayName,
        relationship: (personForm.relationship || null) as PersonRelationship | null,
        birthDate: personForm.birthDate || null,
      };

      if (editingPersonId) {
        await updateFamilyPerson(editingPersonId, payload);
      } else {
        await createFamilyPerson(payload);
      }

      await reloadFamilyData(family.id);
      setShowAddPerson(false);
      setEditingPersonId(null);
      setPersonForm(EMPTY_PERSON_FORM);
    } catch (error) {
      console.error(error);
      setPersonError(
        error instanceof Error ? error.message : "Unable to save family member.",
      );
    } finally {
      setIsSavingPerson(false);
    }
  }

  async function handleRemovePerson(personId: string) {
    if (!family || isRemoving) {
      return;
    }

    setIsRemoving(true);
    setPersonError(null);

    try {
      await deleteFamilyPerson(personId);
      await reloadFamilyData(family.id);
      setRemovingPersonId(null);
      if (editingPersonId === personId) {
        setEditingPersonId(null);
        setPersonForm(EMPTY_PERSON_FORM);
      }
    } catch (error) {
      console.error(error);
      setPersonError(
        error instanceof Error ? error.message : "Unable to remove family member.",
      );
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-10 pt-6 sm:max-w-lg sm:pt-10">
      <header className="animate-fade-up flex items-start justify-between gap-4">
        <div>
          <Link
            href="/"
            className="text-sm font-bold text-muted transition hover:text-foreground"
          >
            ← HomeLoop
          </Link>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Family
            <Heart
              size={16}
              className="ml-2 inline-block translate-y-[-0.1em] opacity-80"
            />
          </h1>
        </div>
        <SignOutButton />
      </header>

      {loadState === "loading" ? (
        <p className="mt-8 text-sm font-semibold text-muted">Loading family…</p>
      ) : null}

      {loadState === "error" ? (
        <div className="mt-8 rounded-3xl border border-surface-border bg-surface p-5 text-center shadow-[var(--shadow)]">
          <p className="font-display text-xl font-medium text-foreground">
            Couldn&apos;t load family details.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
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
          <Link
            href="/"
            className="block w-full rounded-2xl bg-accent px-5 py-3.5 text-center text-base font-bold text-white hover:bg-accent-deep"
          >
            Create or Join
          </Link>
        </div>
      ) : null}

      {loadState === "ready" && family ? (
        <div className="mt-8 space-y-6">
          <section className="rounded-3xl border border-surface-border bg-surface p-5 shadow-[var(--shadow)]">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
              Family name
            </p>
            <h2 className="mt-1 font-display text-2xl font-medium text-foreground">
              {family.name}
            </h2>
          </section>

          <section className="rounded-3xl border border-surface-border bg-surface p-5 shadow-[var(--shadow)]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
                Family Members
              </p>
              <button
                type="button"
                onClick={openAddPerson}
                className="text-sm font-bold text-accent transition hover:text-accent-deep"
              >
                + Add Family Member
              </button>
            </div>
            <p className="mt-2 text-sm text-muted">
              People you schedule for — children don&apos;t need a HomeLoop login.
            </p>

            <ul className="mt-4 space-y-3">
              {people.map((person) => (
                <li
                  key={person.id}
                  className="rounded-2xl bg-white/70 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-foreground">
                        {person.displayName}
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-muted">
                        {[
                          person.relationship,
                          person.linkedUserId ? "HomeLoop account" : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Family member"}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => openEditPerson(person)}
                        className="text-xs font-bold text-accent hover:text-accent-deep"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setRemovingPersonId(person.id)}
                        className="text-xs font-bold text-muted hover:text-accent"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  {removingPersonId === person.id ? (
                    <div className="mt-3 rounded-2xl border border-accent/25 bg-accent-soft/30 p-3">
                      <p className="text-sm font-semibold text-foreground">
                        Remove {person.displayName}? Event assignments for them
                        are cleared, but events stay.
                      </p>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          disabled={isRemoving}
                          onClick={() => void handleRemovePerson(person.id)}
                          className="rounded-xl bg-accent px-3 py-2 text-xs font-bold text-white disabled:opacity-70"
                        >
                          {isRemoving ? "Removing…" : "Confirm"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setRemovingPersonId(null)}
                          className="rounded-xl border border-surface-border bg-white px-3 py-2 text-xs font-bold text-foreground"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                </li>
              ))}
              {people.length === 0 ? (
                <li className="rounded-2xl bg-white/70 px-4 py-3 text-sm text-muted">
                  No family members yet. Add Minal, Ankush, Ziva, and others.
                </li>
              ) : null}
            </ul>

            {showAddPerson || editingPersonId ? (
              <form
                className="mt-4 space-y-3 rounded-2xl border border-surface-border bg-white/80 p-4"
                onSubmit={(event) => void handleSavePerson(event)}
              >
                <p className="text-sm font-bold text-foreground">
                  {editingPersonId ? "Edit family member" : "Add family member"}
                </p>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted" htmlFor="person-name">
                    Name
                  </label>
                  <input
                    id="person-name"
                    required
                    value={personForm.displayName}
                    onChange={(event) =>
                      setPersonForm((current) => ({
                        ...current,
                        displayName: event.target.value,
                      }))
                    }
                    className="rounded-2xl border border-surface-border bg-white px-3 py-3 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
                    placeholder="Ziva"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted" htmlFor="person-relationship">
                    Relationship (optional)
                  </label>
                  <select
                    id="person-relationship"
                    value={personForm.relationship}
                    onChange={(event) =>
                      setPersonForm((current) => ({
                        ...current,
                        relationship: event.target.value as PersonRelationship | "",
                      }))
                    }
                    className="rounded-2xl border border-surface-border bg-white px-3 py-3 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
                  >
                    <option value="">Select</option>
                    {PERSON_RELATIONSHIPS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted" htmlFor="person-birth">
                    Birth date (optional)
                  </label>
                  <input
                    id="person-birth"
                    type="date"
                    value={personForm.birthDate}
                    onChange={(event) =>
                      setPersonForm((current) => ({
                        ...current,
                        birthDate: event.target.value,
                      }))
                    }
                    className="rounded-2xl border border-surface-border bg-white px-3 py-3 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
                  />
                </div>
                {personError ? (
                  <p role="alert" className="text-sm font-semibold text-accent">
                    {personError}
                  </p>
                ) : null}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isSavingPerson}
                    className="rounded-2xl bg-accent px-4 py-3 text-sm font-bold text-white disabled:opacity-70"
                  >
                    {isSavingPerson
                      ? "Saving…"
                      : editingPersonId
                        ? "Save changes"
                        : "Add Family Member"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddPerson(false);
                      setEditingPersonId(null);
                      setPersonForm(EMPTY_PERSON_FORM);
                      setPersonError(null);
                    }}
                    className="rounded-2xl border border-surface-border bg-white px-4 py-3 text-sm font-bold text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : null}
          </section>

          <section className="rounded-3xl border border-surface-border bg-surface p-5 shadow-[var(--shadow)]">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
              HomeLoop accounts
            </p>
            <ul className="mt-3 space-y-3">
              {accountMembers.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-white/70 px-4 py-3"
                >
                  <span className="font-bold text-foreground">
                    {member.displayName}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-[0.1em] text-muted">
                    {member.role}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-3xl border border-surface-border bg-surface p-5 shadow-[var(--shadow)]">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
              Invite family member
            </p>
            <p className="mt-2 text-sm text-muted">
              Share this code so another adult can join with their own HomeLoop
              account.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <code className="flex-1 rounded-2xl border border-surface-border bg-white/85 px-4 py-3 text-center text-lg font-bold tracking-[0.18em] text-foreground">
                {family.inviteCode}
              </code>
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="rounded-2xl border border-surface-border bg-white/80 px-4 py-3 text-sm font-bold text-foreground transition hover:bg-white"
              >
                {copyState === "copied"
                  ? "Copied"
                  : copyState === "failed"
                    ? "Failed"
                    : "Copy"}
              </button>
            </div>
            {role === "owner" ? (
              <button
                type="button"
                disabled={isRegenerating}
                onClick={() => void handleRegenerate()}
                className="mt-3 text-sm font-bold text-accent transition hover:text-accent-deep disabled:opacity-70"
              >
                {isRegenerating ? "Regenerating…" : "Regenerate invite code"}
              </button>
            ) : null}
            {regenError ? (
              <p role="alert" className="mt-2 text-sm font-semibold text-accent">
                {regenError}
              </p>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
