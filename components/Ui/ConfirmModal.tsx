"use client";

import React from "react";
import { BeatLoader } from "react-spinners";
import Modal from "./Modals/Modal";
import { useDictionary } from "@/dictionaries/DictionaryProvider";

type Props = {
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
    title: string;
    message: string;
    /** Defaults to the shared "Confirm" placeholder. */
    confirmLabel?: string;
    /** Disables the confirm button and shows a spinner while the action runs. */
    loading?: boolean;
    /** Red confirm button for irreversible actions; green otherwise. */
    destructive?: boolean;
    onConfirm: () => void;
};

/**
 * The two-button confirmation dialog used before an action the user cannot
 * undo by simply clicking again. Markup matches the delete-product dialog in
 * ProductDetail so every confirmation in the app reads the same.
 */
function ConfirmModal({
    open,
    setOpen,
    title,
    message,
    confirmLabel,
    loading = false,
    destructive = false,
    onConfirm,
}: Props) {
    const { placeholders } = useDictionary();
    const modalRef = React.useRef<HTMLDivElement>(null);

    return (
        <Modal editModalRef={modalRef} open={open} setOpen={setOpen} centered={true}>
            <div className="bg-white rounded-[12px] w-[92vw] max-w-[390px] p-5 shadow-xl hide-scrollbar">
                <h2 className="text-[16px] font-semibold text-black-1">{title}</h2>
                <p className="text-[14px] text-gray-8 mt-2">{message}</p>
                <div className="mt-5 flex gap-3">
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="h-[40px] flex-1 cursor-pointer rounded-[8px] border border-green-1 text-green-1 text-[14px] font-medium"
                    >
                        {placeholders.cancel}
                    </button>
                    <button
                        type="button"
                        disabled={loading}
                        onClick={onConfirm}
                        className={`h-[40px] cursor-pointer flex-1 rounded-[8px] text-white text-[14px] font-medium disabled:opacity-60 ${destructive
                            ? "border border-[#E92440] bg-[#E92440]"
                            : "border border-green-1 bg-green-1"
                            }`}
                    >
                        {loading ? (
                            <BeatLoader color="white" size={8} />
                        ) : (
                            (confirmLabel ?? placeholders.confirm)
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

export default ConfirmModal;
