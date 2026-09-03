"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import chevronIcon from "@/assets/icons/chevron.svg";
import crossIcon from "@/assets/icons/cross-icon.svg";
import { BeatLoader } from "react-spinners";
import toast from "react-hot-toast";
import Modal from "@/components/Ui/Modals/Modal";
import { type ReportReason } from "@/components/Ui/ReportModal";
import DoodleButton from "@/components/Ui/DoodleButton";
import {
  useGetMyReportsQuery,
  useDeleteReportMutation,
} from "@/store/services/reportsService";

type ApiReport = {
  _id: string;
  reportCode?: string;
  entityType: "shop" | "product" | "service";
  reason: ReportReason;
  details: string;
  status: "open" | "closed";
  contentRemoved: boolean;
  adminResponse?: string | null;
  respondedAt?: string | null;
  createdAt: string;
};

type MyReportsResponse = {
  data?: { reports?: ApiReport[] };
};

const ENTITY_TYPE_LABEL_KEYS: Record<ApiReport["entityType"], string> = {
  shop: "shop",
  product: "product",
  service: "service",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function MyReports() {
  const { placeholders, error_messages } = useDictionary();
  type PlaceholderKey = keyof typeof placeholders;
  const ph = (key: PlaceholderKey) => placeholders[key];

  const { data, isLoading, isFetching } = useGetMyReportsQuery({ page: 1, limit: 50 });
  const reports = (data as MyReportsResponse | undefined)?.data?.reports ?? [];
  const loading = isLoading || isFetching;

  const [deleteReport, { isLoading: isDeleting }] = useDeleteReportMutation();

  const [viewingReportId, setViewingReportId] = useState<string | null>(null);
  const viewModalRef = useRef<HTMLDivElement>(null);
  const viewingReport = reports.find((report) => report._id === viewingReportId) ?? null;
  const isViewModalOpen = Boolean(viewingReport);

  function handleSetViewModalOpen(value: React.SetStateAction<boolean>) {
    const nextOpen = typeof value === "function" ? value(isViewModalOpen) : value;
    if (!nextOpen) setViewingReportId(null);
  }

  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const deleteModalRef = useRef<HTMLDivElement>(null);

  function openDeleteModal(reportId: string) {
    setViewingReportId(null);
    setDeletingReportId(reportId);
    setIsDeleteModalOpen(true);
  }

  async function handleConfirmDelete() {
    if (!deletingReportId) return;
    try {
      await deleteReport(deletingReportId).unwrap();
      toast.success(placeholders.report_deleted_success);
      setIsDeleteModalOpen(false);
      setDeletingReportId(null);
    } catch (err) {
      const errorData = err as { data?: { message?: string } };
      toast.error(errorData?.data?.message ?? error_messages.something_went_wrong);
    }
  }

  return (
    <div className="h-full">
      <div className="border-b px-4 border-gray-9 flex items-center justify-center">
        <div className="h-[72px] w-[522px] flex items-center gap-2 text-[14px]">
          <span className="text-gray-11">{ph("profile")}</span>
          <Image src={chevronIcon} alt="chevron" className="ltr:rotate-180" />
          <span className="text-green-2">{ph("my_reports")}</span>
        </div>
      </div>

      <div className="flex justify-center px-4">
        <div className="w-[522px] pt-5 pb-8">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-[110px] w-full animate-pulse rounded-[8px] bg-gray-200" />
              ))}
            </div>
          ) : reports.length === 0 ? (
            <p className="py-8 text-center text-[15px] font-medium text-gray-8">
              {ph("no_reports_yet")}
            </p>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <button
                  key={report._id}
                  type="button"
                  onClick={() => setViewingReportId(report._id)}
                  className="w-full cursor-pointer rounded-[10px] border border-gray-9 p-4 text-left transition-colors hover:border-green-1"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-black-1">
                        {ph(ENTITY_TYPE_LABEL_KEYS[report.entityType] as PlaceholderKey)}
                      </p>
                      <p className="mt-0.5 truncate text-[13px] text-gray-8">{report.reason}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-[4px] px-2 py-0.5 text-[12px] font-medium ${
                        report.status === "open"
                          ? "bg-[#FDEAB8] text-[#946200]"
                          : "bg-green-4 text-green-1"
                      }`}
                    >
                      {report.status === "open" ? ph("open" as PlaceholderKey) : ph("closed" as PlaceholderKey)}
                    </span>
                  </div>
                  <p className="mt-2 text-[12px] text-gray-11">{formatDate(report.createdAt)}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        editModalRef={viewModalRef}
        open={isViewModalOpen}
        setOpen={handleSetViewModalOpen}
        centered
      >
        {viewingReport && (
          <div className="hide-scrollbar w-screen max-w-[460px] overflow-hidden rounded-[18px] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[#E3EDF3] px-5 pb-4 pt-5 sm:px-6">
              <h2 className="text-[18px] font-semibold text-[#0F172A]">{viewingReport.reportCode}</h2>
              <button
                type="button"
                onClick={() => setViewingReportId(null)}
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#64748B] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                aria-label={ph("cancel")}
              >
                <Image src={crossIcon} alt="" className="h-3 w-3" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5 sm:px-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[12px] font-medium uppercase tracking-wide text-gray-6">
                    {ph(ENTITY_TYPE_LABEL_KEYS[viewingReport.entityType] as PlaceholderKey)}
                  </p>
                  <span className="mt-1 inline-flex rounded-full border border-gray-2 bg-white px-2.5 py-0.5 text-[12px] text-black-1">
                    {viewingReport.reason}
                  </span>
                </div>
                <span
                  className={`shrink-0 rounded-[4px] px-2 py-0.5 text-[12px] font-medium ${
                    viewingReport.status === "open"
                      ? "bg-[#FDEAB8] text-[#946200]"
                      : "bg-green-4 text-green-1"
                  }`}
                >
                  {viewingReport.status === "open"
                    ? ph("open" as PlaceholderKey)
                    : ph("closed" as PlaceholderKey)}
                </span>
              </div>

              <div>
                <p className="text-[12px] font-medium uppercase tracking-wide text-gray-6">
                  {ph("report_details_label")}
                </p>
                <p className="mt-1 text-[14px] text-black-1">{viewingReport.details}</p>
              </div>

              <p className="text-[12px] text-gray-11">{formatDate(viewingReport.createdAt)}</p>

              {viewingReport.adminResponse && (
                <div className="rounded-[8px] bg-[#F6F8FA] p-2.5">
                  <p className="text-[12px] font-medium text-gray-8">{ph("response_from_support")}</p>
                  <p className="mt-1 text-[13px] text-black-1">{viewingReport.adminResponse}</p>
                </div>
              )}
            </div>

            {viewingReport.status === "open" && (
              <div className="flex border-t border-[#E3EDF3] px-5 py-4 sm:justify-end sm:px-6">
                <button
                  type="button"
                  onClick={() => openDeleteModal(viewingReport._id)}
                  className="h-[42px] cursor-pointer rounded-[8px] border border-red-1 text-[14px] font-medium text-red-1 sm:min-w-[100px]"
                >
                  {ph("delete")}
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal editModalRef={deleteModalRef} open={isDeleteModalOpen} setOpen={setIsDeleteModalOpen} centered>
        <div className="w-screen max-w-[420px] overflow-hidden rounded-[12px] bg-white">
          <div className="flex items-center justify-between border-b border-gray-9 px-4 py-4">
            <h2 className="text-[15px] font-medium text-black-1">{ph("delete")}</h2>
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="cursor-pointer text-[28px] leading-none text-[#111827]"
            >
              <Image src={crossIcon} alt="cross-icon" className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="px-4 py-4">
            <p className="text-[14px] font-normal leading-relaxed text-[#4B514F]">
              {ph("delete_report_confirm_message")}
            </p>
            <div className="mt-8 flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="h-[34px] min-w-[112px] cursor-pointer rounded-[6px] border border-green-1 text-[14px] font-normal text-green-1"
              >
                {ph("cancel")}
              </button>
              <DoodleButton
                type="button"
                disabled={isDeleting}
                onClick={() => void handleConfirmDelete()}
                className="h-[34px] min-w-[112px] cursor-pointer rounded-[6px] bg-red-1 text-[14px] font-normal text-white disabled:opacity-60"
              >
                {isDeleting ? <BeatLoader color="#fff" size={8} /> : ph("delete")}
              </DoodleButton>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default MyReports;
