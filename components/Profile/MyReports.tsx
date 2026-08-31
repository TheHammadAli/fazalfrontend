"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import chevronIcon from "@/assets/icons/chevron.svg";
import crossIcon from "@/assets/icons/cross-icon.svg";
import { BeatLoader } from "react-spinners";
import toast from "react-hot-toast";
import Modal from "@/components/Ui/Modals/Modal";
import ReportModal, { type ReportReason } from "@/components/Ui/ReportModal";
import DoodleButton from "@/components/Ui/DoodleButton";
import {
  useGetMyReportsQuery,
  useUpdateReportMutation,
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

  const [updateReport, { isLoading: isUpdating }] = useUpdateReportMutation();
  const [deleteReport, { isLoading: isDeleting }] = useDeleteReportMutation();

  const [editingReport, setEditingReport] = useState<ApiReport | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const editModalRef = useRef<HTMLDivElement>(null);

  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const deleteModalRef = useRef<HTMLDivElement>(null);

  function openEditModal(report: ApiReport) {
    setEditingReport(report);
    setIsEditModalOpen(true);
  }

  async function handleUpdateReport(payload: { reason: ReportReason; details: string }) {
    if (!editingReport) return;
    try {
      await updateReport({ id: editingReport._id, ...payload }).unwrap();
      toast.success(placeholders.report_updated_success);
      setIsEditModalOpen(false);
      setEditingReport(null);
    } catch (err) {
      const errorData = err as { data?: { message?: string } };
      toast.error(errorData?.data?.message ?? error_messages.something_went_wrong);
    }
  }

  function openDeleteModal(reportId: string) {
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
                <div key={report._id} className="rounded-[10px] border border-gray-9 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[12px] text-gray-11">{report.reportCode}</p>
                      <p className="mt-0.5 text-[14px] font-medium text-black-1">
                        {ph(ENTITY_TYPE_LABEL_KEYS[report.entityType] as PlaceholderKey)}
                      </p>
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

                  <div className="mt-2 flex items-center gap-2">
                    <span className="rounded-full border border-gray-2 bg-white px-2.5 py-0.5 text-[12px] text-black-1">
                      {report.reason}
                    </span>
                  </div>

                  <p className="mt-2 text-[14px] text-black-1">{report.details}</p>
                  <p className="mt-1 text-[12px] text-gray-11">{formatDate(report.createdAt)}</p>

                  {report.adminResponse && (
                    <div className="mt-3 rounded-[8px] bg-[#F6F8FA] p-2.5">
                      <p className="text-[12px] font-medium text-gray-8">{ph("response_from_support")}</p>
                      <p className="mt-1 text-[13px] text-black-1">{report.adminResponse}</p>
                    </div>
                  )}

                  {report.status === "open" && (
                    <div className="mt-3 flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => openEditModal(report)}
                        className="cursor-pointer text-[13px] font-medium text-green-1 hover:underline"
                      >
                        {ph("edit")}
                      </button>
                      <button
                        type="button"
                        onClick={() => openDeleteModal(report._id)}
                        className="cursor-pointer text-[13px] font-medium text-red-1 hover:underline"
                      >
                        {ph("delete")}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal editModalRef={editModalRef} open={isEditModalOpen} setOpen={setIsEditModalOpen} centered>
        {editingReport && (
          <ReportModal
            setOpen={setIsEditModalOpen}
            onSubmit={handleUpdateReport}
            loading={isUpdating}
            initialValues={{ reason: editingReport.reason, details: editingReport.details }}
          />
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
