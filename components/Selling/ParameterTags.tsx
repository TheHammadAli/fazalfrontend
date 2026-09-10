"use client";

import Image from "next/image";
import chevron from "@/assets/icons/chev-down-icon.svg";
import plusIcon from "@/assets/icons/green-plus-icon.svg";
import { isParameterLocked, type parameterTypes } from "./ParametersModal";

type ParameterTagsProps = {
  label: string;
  parameters: parameterTypes[];
  /** Called with the parameter index, or `null` for the add button. */
  onClick: (parameterIndex: number | null) => void;
  /** "Choose {name} first" — {name} is replaced with the parent's name. */
  lockedHint?: string;
};

export function removeParameterVariant(
  parameters: parameterTypes[],
  paramIndex: number,
  variantIndex: number,
): parameterTypes[] {
  return parameters
    .map((parameter, index) => {
      if (index !== paramIndex) return parameter;
      return {
        ...parameter,
        variants: parameter.variants.filter((_, i) => i !== variantIndex),
      };
    })
    .filter((parameter) => parameter.variants.length > 0);
}

function ParameterTags({ label, parameters, onClick, lockedHint }: ParameterTagsProps) {
  const listedParameters = parameters
    .map((parameter, index) => ({ parameter, index }))
    .filter(
      ({ parameter }) =>
        parameter.name.trim() !== "" || parameter.variants.length > 0,
    );

  if (listedParameters.length === 0) {
    return (
      <div className="border-b border-gray-9">
        <button
          type="button"
          onClick={() => onClick(null)}
          className="my-4 ml-[15px] flex w-max cursor-pointer items-center gap-2"
        >
          <Image src={plusIcon} alt="" />
          <span className="text-green-1 font-normal text-[15px]">{label}</span>
        </button>
      </div>
    );
  }

  return (
    <>
      {listedParameters.map(({ parameter, index }) => {
        // A dependent parameter (e.g. Model, waiting on Make) has nothing to
        // pick until its parent has a value — same idea as "choose a city
        // first" on the area field.
        const locked = isParameterLocked(parameter);
        const parent = locked ? parameters[parameter.dependsOnIndex!] : undefined;
        const hint = locked
          ? (lockedHint ?? "Choose {name} first").replace(
              "{name}",
              parent?.name || label,
            )
          : undefined;

        return (
          <button
            key={`${parameter.name}-${index}`}
            type="button"
            disabled={locked}
            onClick={() => onClick(index)}
            className={`flex w-full h-[50px] items-center justify-between border-b border-gray-9 bg-white px-4 text-left ${
              locked ? "cursor-not-allowed" : "cursor-pointer"
            }`}
          >
            <h3
              className={`text-[15px] font-medium shrink-0 ${locked ? "text-gray-8" : "text-black-1"}`}
            >
              {parameter.name}
            </h3>
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={`truncate text-[15px] font-normal ${locked ? "italic text-gray-9" : "text-gray-8"}`}
              >
                {locked ? hint : parameter.variants.join(", ")}
              </span>
              {locked ? null : (
                <Image
                  src={chevron}
                  alt=""
                  className="-rotate-90 rtl:rotate-90 w-4 shrink-0"
                />
              )}
            </div>
          </button>
        );
      })}

      <div className="border-b border-gray-9">
        <button
          type="button"
          onClick={() => onClick(null)}
          className="my-4 ml-[15px] flex w-max cursor-pointer items-center gap-2"
        >
          <Image src={plusIcon} alt="" />
          <span className="text-green-1 font-normal text-[15px]">{label}</span>
        </button>
      </div>
    </>
  );
}

export default ParameterTags;
