"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { MegaphoneIcon } from "@heroicons/react/24/solid";
import Modal from "@/components/Ui/Modals/Modal";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import { getYouTubeEmbedUrl } from "@/utils/getYouTubeEmbedUrl";
import { useTrackAnnouncementViewMutation } from "@/store/services/notificationService";

type AnnouncementModalProps = {
  open: boolean;
  onClose: () => void;
  announcementId?: string;
  title?: string;
  message?: string;
  image?: string;
  video?: string;
  ctaLabel?: string;
  ctaDestination?: string;
};

function AnnouncementModal({
  open,
  onClose,
  announcementId,
  title,
  message,
  image,
  video,
  ctaLabel,
  ctaDestination,
}: AnnouncementModalProps) {
  const { placeholders } = useDictionary();
  type PlaceholderKey = keyof typeof placeholders;
  const ph = (key: PlaceholderKey) => placeholders[key];
  const modalRef = useRef<HTMLDivElement>(null);
  const [trackView] = useTrackAnnouncementViewMutation();
  const trackedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !announcementId) return;
    if (trackedIdRef.current === announcementId) return;
    trackedIdRef.current = announcementId;
    trackView(announcementId).catch(() => {
      // Best-effort — a failed view record shouldn't disrupt reading the announcement.
    });
  }, [open, announcementId, trackView]);

  const videoEmbedUrl = !video ? getYouTubeEmbedUrl(ctaDestination) : null;
  const isExternalLink = Boolean(ctaDestination) && !videoEmbedUrl;

  return (
    <Modal editModalRef={modalRef} open={open} setOpen={onClose} centered>
      <div className="hide-scrollbar flex max-h-[90vh] w-[92vw] max-w-[480px] flex-col overflow-y-auto rounded-[16px] bg-white">
        <div className="px-5 pt-5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-orange-500">
            <MegaphoneIcon className="h-3.5 w-3.5" />
            {ph("important_message_from_admin")}
          </span>
        </div>
        <div className="flex items-start justify-between gap-4 px-5 pt-3">
          <h2 className="text-[18px] font-semibold leading-snug text-black-1">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={ph("cancel")}
            className="shrink-0 cursor-pointer rounded-full p-1 hover:bg-gray-9"
          >
            <XMarkIcon className="h-5 w-5 text-black-1" />
          </button>
        </div>

        {image ? (
          <div className="relative mt-4 h-[200px] w-full shrink-0 bg-gray-5">
            <Image
              src={image}
              alt=""
              fill
              unoptimized
              className="object-cover"
            />
          </div>
        ) : null}

        <div className="px-5 py-4">
          {message ? (
            <p className="whitespace-pre-line text-[14px] leading-relaxed text-gray-8">
              {message}
            </p>
          ) : null}

          {video ? (
            <div className="mt-4 aspect-video w-full overflow-hidden rounded-[10px] bg-black">
              <video src={video} controls className="h-full w-full" />
            </div>
          ) : videoEmbedUrl ? (
            <div className="mt-4 aspect-video w-full overflow-hidden rounded-[10px] bg-black">
              <iframe
                src={videoEmbedUrl}
                title={title ?? "video"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          ) : null}

          {isExternalLink ? (
            <a
              href={ctaDestination}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 block w-full cursor-pointer rounded-[8px] bg-green-1 py-2.5 text-center text-[14px] font-medium text-white"
            >
              {ctaLabel || ctaDestination}
            </a>
          ) : null}
        </div>

        <div className="border-t border-gray-9 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full cursor-pointer rounded-[8px] border border-gray-9 py-2.5 text-[14px] font-medium text-black-1"
          >
            {ph("cancel")}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default AnnouncementModal;
