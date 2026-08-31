"use client";

import React, { useState } from "react";
import Image from "next/image";
import crossIcon from "@/assets/icons/cross-icon.svg";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import { BeatLoader } from "react-spinners";
import DoodleButton from "@/components/Ui/DoodleButton";

export const REPORT_REASONS = ["Spam", "Adult Content", "Fraud", "Duplicate", "Other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
const DETAILS_MAX_LENGTH = 1000;

export type ReportModalProps = {
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  /** Called when the user taps Submit; close the modal yourself on success. */
  onSubmit?: (payload: { reason: ReportReason; details: string }) => void | Promise<void>;
  loading?: boolean;
  /** When present, the modal starts pre-filled and reads as an edit rather than a new report. */
  initialValues?: { reason: ReportReason; details: string };
};

function ReportModal({ setOpen, onSubmit, loading, initialValues }: ReportModalProps) {
  const { placeholders } = useDictionary();
  type PlaceholderKey = keyof typeof placeholders;
  const ph = (key: PlaceholderKey) => placeholders[key];

  const [reason, setReason] = useState<ReportReason | "">(initialValues?.reason ?? "");
  const [details, setDetails] = useState(initialValues?.details ?? "");
  const isEdit = Boolean(initialValues);

  const handleClose = () => {
    setOpen(false);
  };

  const handleSubmit = async () => {
    if (!reason || details.trim().length < 3) return;
    try {
      await onSubmit?.({ reason, details: details.trim() });
    } catch {
      // Caller handles errors (e.g. toast); keep modal open
    }
  };

  return (
    <div className="hide-scrollbar w-screen max-w-[496px] overflow-hidden rounded-[18px] bg-white shadow-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-[#E3EDF3] px-5 pb-4 pt-5 sm:px-6">
        <h2 className="text-[18px] font-semibold text-[#0F172A]">
          {isEdit ? ph("edit_report") : ph("report_content")}
        </h2>
        <button
          type="button"
          className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#64748B] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A]"
          onClick={handleClose}
          aria-label={ph("cancel")}
        >
          <Image src={crossIcon} alt="" className="h-3 w-3" />
        </button>
      </div>

      <div className="space-y-5 px-5 py-5 sm:px-6">
        <div>
          <p className="mb-2.5 text-[14px] font-medium text-[#0F172A]">{ph("report_reason_label")}</p>
          <div className="flex flex-wrap gap-2">
            {REPORT_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className={`h-[34px] px-3 rounded-full border text-[14px] font-normal whitespace-nowrap cursor-pointer ${
                  reason === r ? "border-green-1 bg-green-4 text-black-1" : "border-gray-2 bg-white text-black-1"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="report-details" className="text-[14px] font-medium text-[#0F172A]">
              {ph("report_details_label")}
            </label>
            <span className="text-[12px] text-[#94A3B8]">
              {details.length}/{DETAILS_MAX_LENGTH}
            </span>
          </div>
          <textarea
            id="report-details"
            rows={4}
            value={details}
            maxLength={DETAILS_MAX_LENGTH}
            onChange={(e) => setDetails(e.target.value)}
            placeholder={ph("report_details_placeholder")}
            className="min-h-[120px] w-full resize-none rounded-[12px] border border-[#E3EDF3] p-3 text-[14px] text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-green-1"
          />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-[#E3EDF3] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
        <button
          type="button"
          disabled={loading}
          onClick={handleClose}
          className="h-[46px] cursor-pointer rounded-[8px] border border-green-1 text-[15px] font-medium text-green-1 transition-colors hover:bg-green-1/10 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-[110px]"
        >
          {ph("cancel")}
        </button>
        <DoodleButton
          type="button"
          disabled={!reason || details.trim().length < 3 || loading}
          onClick={() => void handleSubmit()}
          className="h-[46px] cursor-pointer rounded-[8px] border border-green-1 bg-green-1 text-[15px] font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[110px]"
        >
          {loading ? <BeatLoader color="white" size={8} /> : ph("submit")}
        </DoodleButton>
      </div>
    </div>
  );
}

export default ReportModal;
