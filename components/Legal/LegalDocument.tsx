import React from "react";

/**
 * Renders one of the official legal PDFs (privacy policy, terms) inline.
 *
 * The authoritative documents live at assets/content/*.pdf and are served by the
 * /api/legal routes. These pages exist so the documents have a normal web
 * address to link to — from the Play Store listing and from inside the app —
 * rather than restating the text, which would create a second version that can
 * drift out of step with the legal one.
 */
export function LegalDocument({
  title,
  src,
  filename,
}: {
  title: string;
  src: string;
  filename: string;
}) {
  return (
    <main className="mx-auto flex w-full max-w-[900px] flex-col px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] font-semibold text-[#001907] sm:text-[26px]">
          {title}
        </h1>
        <a
          href={src}
          download={filename}
          className="rounded-[8px] border border-green-1 px-4 py-2 text-[14px] font-medium text-green-1 hover:bg-green-1 hover:text-white"
        >
          Download PDF
        </a>
      </div>

      {/* The viewer is hidden from assistive tech and small screens, where an
          embedded PDF is unusable; the link below is the accessible path. */}
      <object
        data={src}
        type="application/pdf"
        aria-label={title}
        className="mt-6 hidden h-[80vh] w-full rounded-[12px] border border-gray-9 sm:block"
      >
        <p className="p-4 text-[15px] text-[#4B514F]">
          Your browser cannot display PDFs inline.{" "}
          <a className="text-green-1 underline" href={src}>
            Open {title}
          </a>
          .
        </p>
      </object>

      <p className="mt-6 text-[15px] leading-[1.7] text-[#4B514F] sm:hidden">
        <a className="text-green-1 underline" href={src}>
          Open {title} (PDF)
        </a>
      </p>
    </main>
  );
}
