"use client";

import { useDictionary } from "@/dictionaries/DictionaryProvider";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import crossIcon from "@/assets/icons/cross-icon.svg";
import plusIcon from "@/assets/icons/green-plus-icon.svg";
import ParameterValueChip from "./ParameterValueChip";
import DoodleButton from "@/components/Ui/DoodleButton";

export type parameterTypes = {
  name: string;
  /** Selected values */
  variants: string[];
  /** Backend/category options for list select/deselect. On a dependent
   *  parameter (see `dependsOnIndex`) this is only ever what the parent's
   *  CURRENT selection resolves to — recomputed by `cascadeParameterDependents`
   *  whenever the parent's value changes, never edited directly here. */
  options?: string[];
  /** Single custom value added via Other in the list modal. */
  otherValue?: string;
  /** True for user-added "Add more" params (tags UI). False/undefined for mapped category params. */
  isCustom?: boolean;
  /** Index, within this SAME `parameters` array, of the parameter whose
   *  chosen value narrows this one's `options`. Set only on a category-mapped
   *  parameter that the category defines as dependent — never on a
   *  user-added ("Add more") one. Immutable metadata: carried through
   *  unchanged by every helper below, never derived from user input. */
  dependsOnIndex?: number;
  /** This parameter's own value keys, parallel to `options`/`values` — used
   *  by whichever LATER parameter depends on this one to look up its bucket
   *  in that parameter's `valuesByParent`. */
  valueKeys?: string[];
  /** Present only when `dependsOnIndex` is set: parent value key -> this
   *  parameter's options under that parent value. */
  valuesByParent?: Record<string, string[]>;
};

/** Fields set once at seed/hydrate time from the category definition, never
 *  touched by anything the seller does inside this modal — carried through
 *  unconditionally everywhere a parameter is copied or rebuilt below. */
function dependencyFields(p: Pick<parameterTypes, "dependsOnIndex" | "valueKeys" | "valuesByParent">) {
  return {
    ...(p.dependsOnIndex !== undefined ? { dependsOnIndex: p.dependsOnIndex } : {}),
    ...(p.valueKeys ? { valueKeys: p.valueKeys } : {}),
    ...(p.valuesByParent ? { valuesByParent: p.valuesByParent } : {}),
  };
}

type ParametersModalProps = {
  open: boolean;
  parameters: parameterTypes[];
  setParameters: React.Dispatch<React.SetStateAction<parameterTypes[]>>;
  setOpen: (open: boolean) => void;
  /** When set, modal edits only this parameter. `null` = add custom parameter(s). */
  editIndex?: number | null;
  /** Used to advance to the next incomplete parameter after confirm. */
  setEditIndex?: (index: number | null) => void;
};

const emptyParameter = (): parameterTypes => ({
  name: "",
  variants: [],
  isCustom: true,
});

function normalizeDraft(items: parameterTypes[]): parameterTypes[] {
  if (items.length === 0) return [emptyParameter()];
  return items.map((p) => {
    const options = p.options ? [...p.options] : undefined;
    const otherValue = p.otherValue?.trim() || undefined;
    // Drop otherValue if it was incorrectly set to a category option
    const validOther =
      otherValue && options && !options.includes(otherValue)
        ? otherValue
        : otherValue && !options?.length
          ? otherValue
          : undefined;

    return {
      name: p.name,
      variants: [...p.variants],
      ...(options ? { options } : {}),
      ...(validOther ? { otherValue: validOther } : {}),
      ...(p.isCustom ? { isCustom: true } : { isCustom: false }),
      ...dependencyFields(p),
    };
  });
}

function findNextIncompleteParameterIndex(
  params: parameterTypes[],
  currentIndex: number,
): number | null {
  const len = params.length;
  if (len <= 1) return null;

  for (let offset = 1; offset < len; offset++) {
    const index = (currentIndex + offset) % len;
    if ((params[index]?.variants?.length ?? 0) === 0) {
      return index;
    }
  }

  return null;
}

function sanitizeParameters(items: parameterTypes[]): parameterTypes[] {
  return items
    .map((p) => ({
      name: p.name.trim(),
      variants: p.variants.map((v) => v.trim()).filter(Boolean),
      ...(p.isCustom ? { isCustom: true as const } : { isCustom: false as const }),
      ...(!p.isCustom && p.options
        ? {
          options: p.options.map((v) => v.trim()).filter(Boolean),
        }
        : {}),
      ...(!p.isCustom && p.otherValue?.trim()
        ? { otherValue: p.otherValue.trim() }
        : {}),
      ...dependencyFields(p),
    }))
    .filter((p) => p.name !== "");
}

/**
 * After the parameter at `changedIndex` gets a new value, recomputes every
 * parameter that (directly) depends on it: a fresh option list, and its own
 * selected value cleared only when that value is no longer among the new
 * options — re-confirming the same parent value must not disturb an
 * already-chosen child.
 *
 * A single left-to-right sweep, not a queue: `dependsOnIndex` can only point
 * at an earlier index (enforced when the category was saved), so by the time
 * this reaches parameter i, everything it could depend on has already been
 * resolved earlier in this same pass — which is what makes a 3+ level chain
 * (Variant depending on Model depending on Make) propagate correctly from one
 * call.
 */
export function cascadeParameterDependents(
  parameters: parameterTypes[],
  changedIndex: number,
): parameterTypes[] {
  const next = [...parameters];

  for (let i = changedIndex + 1; i < next.length; i++) {
    const entry = next[i];
    if (entry.dependsOnIndex === undefined) continue;

    const parent = next[entry.dependsOnIndex];
    const parentValue = parent?.variants[0];
    const parentOptionIndex = parentValue ? (parent.options ?? []).indexOf(parentValue) : -1;
    const parentKey = parentOptionIndex >= 0 ? parent?.valueKeys?.[parentOptionIndex] : undefined;
    const newOptions = parentKey ? entry.valuesByParent?.[parentKey] ?? [] : [];

    const previousOptions = entry.options ?? [];
    const unchanged =
      newOptions.length === previousOptions.length &&
      newOptions.every((value, index) => value === previousOptions[index]);
    if (unchanged) continue;

    const stillValid = entry.variants.every((value) => newOptions.includes(value));
    next[i] = {
      ...entry,
      options: newOptions,
      ...(stillValid ? {} : { variants: [], otherValue: undefined }),
    };
  }

  return next;
}

/**
 * A parameter with nothing selected normally blocks submit — but not a
 * dependent parameter whose parent IS chosen and which simply has no options
 * configured for that parent value. There's nothing for the seller to fill
 * in there; that's a gap in the category's own data, not an incomplete form.
 */
export function isParameterSatisfied(parameter: parameterTypes): boolean {
  if (parameter.variants.length > 0) return true;
  return parameter.dependsOnIndex !== undefined && (parameter.options?.length ?? 0) === 0;
}

/** A dependent parameter is locked until its parent has a value — nothing to
 *  pick yet, so the row shouldn't open the modal at all. */
export function isParameterLocked(parameter: parameterTypes): boolean {
  return (
    parameter.dependsOnIndex !== undefined &&
    parameter.variants.length === 0 &&
    (parameter.options?.length ?? 0) === 0
  );
}

export function hasDuplicateParameterNames(items: parameterTypes[]): boolean {
  const names = items
    .map((p) => p.name.trim().toLowerCase())
    .filter(Boolean);
  return new Set(names).size !== names.length;
}

/** Strip client-only fields before sending to the API. */
export function toApiParameters(items: parameterTypes[]) {
  return items.map(({ name, variants }) => ({ name, variants }));
}

function getDuplicateParameterNameIndexes(items: parameterTypes[]): Set<number> {
  const seen = new Map<string, number>();
  const duplicates = new Set<number>();

  items.forEach((parameter, index) => {
    const name = parameter.name.trim().toLowerCase();
    if (!name) return;

    const existingIndex = seen.get(name);
    if (existingIndex !== undefined) {
      duplicates.add(existingIndex);
      duplicates.add(index);
    } else {
      seen.set(name, index);
    }
  });

  return duplicates;
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M13.5 4.5L6.5 11.5L2.5 7.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function isCustomParameter(parameter: parameterTypes | null | undefined) {
  if (!parameter) return true;
  if (parameter.isCustom === true) return true;
  if (parameter.isCustom === false) return false;
  // API/legacy params without options → tags (custom); with options → list (mapped)
  return !(parameter.options && parameter.options.length > 0);
}

function ParametersModal({
  open,
  parameters,
  setParameters,
  setOpen,
  editIndex = null,
  setEditIndex,
}: ParametersModalProps) {
  const { placeholders, error_messages } = useDictionary();
  const isSingleEdit = editIndex !== null && editIndex !== undefined;
  const isAddMore = !isSingleEdit;

  const [draft, setDraft] = useState<parameterTypes[]>(() =>
    normalizeDraft(
      isSingleEdit && parameters[editIndex]
        ? [parameters[editIndex]]
        : [emptyParameter()],
    ),
  );
  const [newVariantByParam, setNewVariantByParam] = useState<
    Record<number, string>
  >({});
  const [editingVariantByParam, setEditingVariantByParam] = useState<
    Record<number, number | null>
  >({});
  const [showOtherInputByParam, setShowOtherInputByParam] = useState<
    Record<number, boolean>
  >({});
  const [searchByParam, setSearchByParam] = useState<Record<number, string>>(
    {},
  );

  const wasOpenRef = useRef(false);
  const lastEditIndexRef = useRef<number | null | undefined>(editIndex);

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      lastEditIndexRef.current = editIndex;
      return;
    }

    const justOpened = !wasOpenRef.current;
    const editChanged = lastEditIndexRef.current !== editIndex;
    wasOpenRef.current = true;
    lastEditIndexRef.current = editIndex;

    if (!justOpened && !editChanged) return;

    if (isSingleEdit && parameters[editIndex!]) {
      setDraft(normalizeDraft([parameters[editIndex!]]));
    } else {
      setDraft([emptyParameter()]);
    }
    setNewVariantByParam({});
    setEditingVariantByParam({});
    setShowOtherInputByParam(
      isAddMore ||
        (isSingleEdit && isCustomParameter(parameters[editIndex!]))
        ? { 0: true }
        : {},
    );
    setSearchByParam({});
  }, [open, editIndex, isSingleEdit, isAddMore, parameters]);

  const parameter = draft[0];
  const isCustomUpdate =
    isSingleEdit && isCustomParameter(parameters[editIndex!]);
  const isCustomMode = isAddMore || isCustomUpdate;
  // Mapped category params only: list select/deselect
  const isListMode = isSingleEdit && !isCustomMode;

  const advanceOrClose = (updatedParameters: parameterTypes[]) => {
    if (editIndex === null || editIndex === undefined || !setEditIndex) {
      setOpen(false);
      return;
    }

    const nextIndex = findNextIncompleteParameterIndex(
      updatedParameters,
      editIndex,
    );
    if (nextIndex !== null) {
      setEditIndex(nextIndex);
      return;
    }

    setOpen(false);
  };

  const handleAddParameterBlock = () => {
    if (!isAddMore) return;
    setDraft((prev) => {
      const nextIndex = prev.length;
      setNewVariantByParam((v) => ({ ...v, [nextIndex]: "" }));
      setEditingVariantByParam((v) => ({ ...v, [nextIndex]: null }));
      return [...prev, emptyParameter()];
    });
  };

  const handleRemoveParameterBlock = (paramIndex: number) => {
    if (!isAddMore) return;
    setDraft((prev) => {
      if (prev.length <= 1) return [emptyParameter()];
      return prev.filter((_, i) => i !== paramIndex);
    });
    const reindex = <T,>(prev: Record<number, T>) => {
      const next: Record<number, T> = {};
      Object.entries(prev).forEach(([key, value]) => {
        const index = Number(key);
        if (index < paramIndex) next[index] = value;
        else if (index > paramIndex) next[index - 1] = value;
      });
      return next;
    };
    setNewVariantByParam(reindex);
    setEditingVariantByParam(reindex);
  };

  const handleParameterNameChange = (paramIndex: number, name: string) => {
    setDraft((prev) => {
      const next = [...prev];
      next[paramIndex] = { ...next[paramIndex], name };
      return next;
    });
  };

  const handleToggleVariant = (value: string) => {
    setDraft((prev) => {
      const next = [...prev];
      const existing = next[0].variants;
      const isSelected = existing.includes(value);

      // Listed category params: single select (tap again to clear)
      if (isListMode) {
        next[0] = {
          ...next[0],
          variants: isSelected ? [] : [value],
        };
        return next;
      }

      next[0] = {
        ...next[0],
        variants: isSelected
          ? existing.filter((v) => v !== value)
          : [...existing, value],
      };
      return next;
    });
  };

  const handleShowOtherInput = () => {
    setShowOtherInputByParam((prev) => ({ ...prev, 0: true }));
    setEditingVariantByParam((prev) => ({ ...prev, 0: null }));
    // Always start blank — don't prefill the currently selected value
    setNewVariantByParam((prev) => ({ ...prev, 0: "" }));
  };

  const handleRemoveVariant = (paramIndex: number, variantIndex: number) => {
    setDraft((prev) => {
      const next = [...prev];
      next[paramIndex] = {
        ...next[paramIndex],
        variants: next[paramIndex].variants.filter((_, i) => i !== variantIndex),
      };
      return next;
    });
    if (editingVariantByParam[paramIndex] === variantIndex) {
      setNewVariantByParam((prev) => ({ ...prev, [paramIndex]: "" }));
      setEditingVariantByParam((prev) => ({ ...prev, [paramIndex]: null }));
    } else if (
      editingVariantByParam[paramIndex] !== undefined &&
      editingVariantByParam[paramIndex] !== null &&
      editingVariantByParam[paramIndex]! > variantIndex
    ) {
      setEditingVariantByParam((prev) => ({
        ...prev,
        [paramIndex]: (prev[paramIndex] ?? 0) - 1,
      }));
    }
  };

  const handleEditVariant = (
    paramIndex: number,
    variantIndex: number,
    value: string,
  ) => {
    setNewVariantByParam((prev) => ({ ...prev, [paramIndex]: value }));
    setEditingVariantByParam((prev) => ({ ...prev, [paramIndex]: variantIndex }));
  };

  const handleAddVariant = (paramIndex: number) => {
    const value = newVariantByParam[paramIndex]?.trim();
    if (!value) return;

    const editingIndex = editingVariantByParam[paramIndex];

    setDraft((prev) => {
      const next = [...prev];
      const existing = next[paramIndex].variants;
      const options = next[paramIndex].options
        ? [...next[paramIndex].options!]
        : undefined;

      if (editingIndex !== undefined && editingIndex !== null) {
        if (existing.some((v, i) => i !== editingIndex && v === value)) {
          return next;
        }
        const updatedVariants = [...existing];
        updatedVariants[editingIndex] = value;
        next[paramIndex] = {
          ...next[paramIndex],
          variants: isListMode || isCustomMode ? [value] : updatedVariants,
          ...(isListMode
            ? options?.includes(value)
              ? {}
              : { otherValue: value }
            : options && !options.includes(value)
              ? { options: [...options, value] }
              : {}),
        };
      } else if (isListMode) {
        // Other: only one additional value (replace if already set)
        const categoryOptions = options ?? [];
        next[paramIndex] = {
          ...next[paramIndex],
          variants: [value],
          ...(categoryOptions.includes(value)
            ? {}
            : { otherValue: value }),
        };
      } else {
        // Custom add/edit: only one value per parameter
        next[paramIndex] = {
          ...next[paramIndex],
          variants: [value],
        };
      }

      return next;
    });

    setNewVariantByParam((prev) => ({ ...prev, [paramIndex]: "" }));
    setEditingVariantByParam((prev) => ({ ...prev, [paramIndex]: null }));
    if (isListMode) {
      setShowOtherInputByParam((prev) => ({ ...prev, [paramIndex]: false }));
    }
  };

  const applyPendingVariants = (items: parameterTypes[]): parameterTypes[] =>
    items.map((item, paramIndex) => {
      const value = newVariantByParam[paramIndex]?.trim();
      if (!value) return item;

      const editingIndex = editingVariantByParam[paramIndex];
      const existing = item.variants;
      const categoryOptions = item.options ?? [];

      if (editingIndex !== undefined && editingIndex !== null) {
        if (existing.some((v, i) => i !== editingIndex && v === value)) {
          return item;
        }
        if (isListMode) {
          return {
            ...item,
            variants: [value],
            ...(categoryOptions.includes(value) ? {} : { otherValue: value }),
          };
        }
        // Custom add/edit: only one value
        return { ...item, variants: [value] };
      }

      if (isListMode) {
        return {
          ...item,
          variants: [value],
          ...(categoryOptions.includes(value) ? {} : { otherValue: value }),
        };
      }
      // Custom add/edit: only one value
      return { ...item, variants: [value] };
    });

  const handleConfirm = () => {
    const pending = applyPendingVariants(draft);

    if (isCustomUpdate) {
      const cleanedList = sanitizeParameters([pending[0]]);
      if (cleanedList.length === 0) {
        setOpen(false);
        return;
      }
      const updated = parameters.map((parameter, i) =>
        i === editIndex
          ? {
            ...cleanedList[0],
            variants: cleanedList[0].variants.slice(0, 1),
            isCustom: true as const,
          }
          : parameter,
      );
      setParameters(updated);
      advanceOrClose(updated);
      return;
    }

    if (isListMode) {
      const cleanedList = sanitizeParameters([pending[0]]);
      if (cleanedList.length === 0) {
        setOpen(false);
        return;
      }
      const cleaned = cleanedList[0];
      const editing = parameters[editIndex!];
      const updated = parameters.map((parameter, i) =>
        i === editIndex
          ? {
            ...cleaned,
            variants: cleaned.variants.slice(0, 1),
            isCustom: false as const,
            options: cleaned.options ?? editing?.options,
            ...(cleaned.otherValue
              ? { otherValue: cleaned.otherValue }
              : editing?.otherValue
                ? { otherValue: editing.otherValue }
                : {}),
            // `cleaned` went through sanitizeParameters, which already carries
            // these through — re-asserted from `editing` here too, since this
            // entry's own dependency metadata never changes by being edited
            // and must survive even if a future edit to sanitize/normalize
            // ever narrows what it keeps.
            ...dependencyFields(editing ?? {}),
          }
          : parameter,
      );
      // Cascades forward: a parameter further down the list may depend on the
      // one just confirmed (directly, or transitively through another
      // dependent parameter in between).
      const cascaded = cascadeParameterDependents(updated, editIndex!);
      setParameters(cascaded);
      advanceOrClose(cascaded);
      return;
    }

    // Add more: append all valid custom parameters
    const cleanedList = sanitizeParameters(pending)
      .filter((p) => p.variants.length > 0)
      .map((p) => ({
        ...p,
        variants: p.variants.slice(0, 1),
        isCustom: true as const,
      }));
    if (cleanedList.length === 0) {
      setOpen(false);
      return;
    }
    setParameters((prev) => [...prev, ...cleanedList]);
    setOpen(false);
  };

  const pendingDraft = applyPendingVariants(draft);

  const draftDuplicateIndexes = useMemo(() => {
    const indexes = getDuplicateParameterNameIndexes(pendingDraft);
    pendingDraft.forEach((item, index) => {
      const name = item.name.trim().toLowerCase();
      if (!name) return;
      const clashesWithExisting = parameters.some((p, i) => {
        if (isCustomUpdate && i === editIndex) return false;
        return p.name.trim().toLowerCase() === name;
      });
      if (clashesWithExisting) indexes.add(index);
    });
    return indexes;
  }, [pendingDraft, parameters, isCustomUpdate, editIndex]);

  const canConfirmCustomAdd =
    pendingDraft.some(
      (p, i) =>
        p.name.trim() !== "" &&
        p.variants.length > 0 &&
        !draftDuplicateIndexes.has(i),
    ) &&
    pendingDraft.every((p, i) => {
      if (p.name.trim() === "" || p.variants.length === 0) return true;
      return !draftDuplicateIndexes.has(i);
    });

  const canConfirmCustomUpdate =
    pendingDraft[0]?.name.trim() !== "" &&
    pendingDraft[0]?.variants.length > 0 &&
    !draftDuplicateIndexes.has(0);

  const canConfirmList =
    pendingDraft[0]?.name.trim() !== "" &&
    pendingDraft[0]?.variants.length > 0;

  const canConfirm = isCustomUpdate
    ? canConfirmCustomUpdate
    : isListMode
      ? canConfirmList
      : canConfirmCustomAdd;

  const pool = useMemo(() => {
    const options = parameter?.options ?? [];
    const other = parameter?.otherValue?.trim();
    const extras = [
      ...(other && !options.includes(other) ? [other] : []),
      ...(parameter?.variants ?? []).filter(
        (v) => !options.includes(v) && v !== other,
      ),
    ];
    // Category options (or Other) can repeat the same label — keep one entry
    return Array.from(new Set([...options, ...extras].map((v) => v.trim()).filter(Boolean)));
  }, [parameter?.options, parameter?.otherValue, parameter?.variants]);

  const search = (searchByParam[0] ?? "").trim().toLowerCase();
  const filteredPool = search
    ? pool.filter((variant) => variant.toLowerCase().includes(search))
    : pool;
  const selected = new Set(parameter?.variants ?? []);

  const title = isListMode
    ? parameter?.name?.trim() || placeholders.detail_name
    : placeholders.add_detail;

  const renderCustomParameterFields = (paramIndex: number) => {
    const item = draft[paramIndex];
    const isDuplicate = draftDuplicateIndexes.has(paramIndex);

    return (
      <div
        key={paramIndex}
        className={`space-y-4 ${isAddMore && draft.length > 1
          ? "rounded-[8px] border border-gray-9 p-3"
          : ""
          }`}
      >
        {isAddMore && draft.length > 1 ? (
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-black-1">
              {placeholders.parameter} {paramIndex + 1}
            </p>
            <button
              type="button"
              onClick={() => handleRemoveParameterBlock(paramIndex)}
              className="cursor-pointer text-[13px] font-normal text-red-1"
            >
              {placeholders.delete}
            </button>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <p className="text-[14px] font-normal text-gray-8">
            {placeholders.name}
          </p>
          <input
            type="text"
            value={item?.name ?? ""}
            placeholder={placeholders.name}
            onChange={(e) =>
              handleParameterNameChange(paramIndex, e.target.value)
            }
            className={`h-[36px] w-full rounded-[6px] border bg-white px-3 text-[14px] text-black-1 focus:outline-none ${isDuplicate
              ? "border-red-1 focus:border-red-1"
              : "border-gray-9 focus:border-green-1"
              }`}
          />
          {isDuplicate ? (
            <p className="mt-1 text-[12px] font-normal text-red-1">
              {error_messages.detail_name_duplicate}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <p className="text-[14px] font-normal text-gray-8">
            {placeholders.add_more}
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newVariantByParam[paramIndex] ?? ""}
              placeholder={placeholders.add_information}
              disabled={
                (item?.variants?.length ?? 0) > 0 &&
                editingVariantByParam[paramIndex] == null
              }
              onChange={(e) => {
                setNewVariantByParam((prev) => ({
                  ...prev,
                  [paramIndex]: e.target.value,
                }));
                if (!e.target.value.trim()) {
                  setEditingVariantByParam((prev) => ({
                    ...prev,
                    [paramIndex]: null,
                  }));
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddVariant(paramIndex);
                }
              }}
              className="min-w-0 flex-1 border-b border-gray-9 bg-transparent px-1 py-1.5 text-[14px] text-black-1 placeholder:text-gray-8 focus:border-green-1 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
            />
            <button
              type="button"
              onClick={() => handleAddVariant(paramIndex)}
              disabled={
                !newVariantByParam[paramIndex]?.trim() ||
                ((item?.variants?.length ?? 0) > 0 &&
                  editingVariantByParam[paramIndex] == null)
              }
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-green-1 text-[24px] font-bold leading-none text-white disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={placeholders.add_value}
            >
              +
            </button>
          </div>
        </div>

        {(item?.variants?.length ?? 0) > 0 ? (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {(item?.variants ?? []).map((variant, variantIndex) => (
              <ParameterValueChip
                key={`${paramIndex}-${variantIndex}-${variant}`}
                label={variant}
                isEditing={editingVariantByParam[paramIndex] === variantIndex}
                onClick={() =>
                  handleEditVariant(paramIndex, variantIndex, variant)
                }
                onRemove={() => handleRemoveVariant(paramIndex, variantIndex)}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  // Custom add + custom update
  if (isCustomMode) {
    return (
      <div className="flex  max-h-[80vh] w-[min(400px,92vw)] flex-col overflow-hidden rounded-[10px]  shadow-lg">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-9 px-4 py-3">
          <h2 className="text-[15px] font-medium text-black-1">
            {isCustomUpdate
              ? (placeholders.edit_detail ?? "Edit Detail")
              : placeholders.add_detail}
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="cursor-pointer p-1"
            aria-label={placeholders.cancel}
          >
            <Image src={crossIcon} className="h-3 w-3" alt="" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 hide-scrollbar">
          {draft.map((_, paramIndex) => renderCustomParameterFields(paramIndex))}

          {isAddMore ? (
            <button
              type="button"
              onClick={handleAddParameterBlock}
              className="flex h-[36px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-[6px] border border-dashed border-green-1/60 text-[13px] font-normal text-green-1 hover:bg-green-4/50"
            >
              <Image src={plusIcon} className="h-3.5 w-3.5" alt="" />
              {placeholders.add_more}
            </button>
          ) : null}
        </div>

        <div className="shrink-0 px-4 py-4">
          <DoodleButton
            type="button"
            disabled={!canConfirm}
            onClick={handleConfirm}
            className="flex h-[48px] w-full cursor-pointer items-center justify-center rounded-[10px] bg-green-1 text-[16px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {placeholders.confirm}
          </DoodleButton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[80vh] md:h-auto md:max-h-[80vh] w-[min(400px,92vw)] flex-col overflow-hidden rounded-[10px] bg-white shadow-lg">
      <div className="relative flex shrink-0 items-center justify-between border-b border-gray-9 px-4 py-3 pt-5">
        <button
          type="button"
          onClick={handleShowOtherInput}
          className="inline-flex cursor-pointer items-center gap-1 text-[14px] font-normal text-green-1"
        >
          <Image src={plusIcon} className="h-3 w-3" alt="" />
          {placeholders.other ?? "Other"}
        </button>
        <h2 className="absolute left-1/2 max-w-[55%] -translate-x-1/2 truncate text-center text-[16px] font-medium text-black-1">
          {title}
        </h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="cursor-pointer p-1"
          aria-label={placeholders.cancel}
        >
          <Image src={crossIcon} className="h-3 w-3" alt="" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto hide-scrollbar">
        <div>
          <div className="border-b border-gray-9 px-4 py-3">
            <input
              type="text"
              value={searchByParam[0] ?? ""}
              placeholder={placeholders.search}
              onChange={(e) => {
                setSearchByParam((prev) => ({
                  ...prev,
                  0: e.target.value,
                }));
              }}
              className="h-[36px] w-full rounded-[8px] border border-gray-9 bg-white px-3 text-[14px] text-black-1 placeholder:text-gray-8 focus:border-green-1 focus:outline-none"
            />
          </div>

          {showOtherInputByParam[0] ? (
            <div className="flex items-center gap-2 border-b border-gray-9 px-4 py-3">
              <input
                type="text"
                autoFocus
                value={newVariantByParam[0] ?? ""}
                placeholder={placeholders.add_information}
                onChange={(e) => {
                  setNewVariantByParam((prev) => ({
                    ...prev,
                    0: e.target.value,
                  }));
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddVariant(0);
                  }
                }}
                className="min-w-0 flex-1 bg-transparent px-1 py-1 text-[14px] text-black-1 placeholder:text-gray-8 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleAddVariant(0)}
                disabled={!newVariantByParam[0]?.trim()}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-green-1 text-[24px] font-bold leading-none text-white disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={placeholders.add_value}
              >
                +
              </button>
            </div>
          ) : null}

          {filteredPool.map((variant, index) => {
            const isSelected = selected.has(variant);
            return (
              <button
                key={`${variant}-${index}`}
                type="button"
                onClick={() => handleToggleVariant(variant)}
                className="flex w-full cursor-pointer items-center justify-between border-b border-gray-9 px-4 py-4 text-left last:border-b-0"
              >
                <span className="text-[15px] font-normal text-black-1">
                  {variant}
                </span>
                {isSelected ? (
                  <CheckIcon className="h-4 w-4 shrink-0 text-green-1" />
                ) : (
                  <span className="h-4 w-4 shrink-0" aria-hidden />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="shrink-0 px-4 py-4">
        <DoodleButton
          type="button"
          disabled={!canConfirm}
          onClick={handleConfirm}
          className="flex h-[48px] w-full cursor-pointer items-center justify-center rounded-[10px] bg-green-1 text-[16px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {placeholders.confirm}
        </DoodleButton>
      </div>
    </div>
  );
}

export default ParametersModal;
