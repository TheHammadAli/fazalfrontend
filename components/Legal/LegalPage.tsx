import React from "react";

/**
 * Shared shell for the legal pages (privacy policy, account deletion).
 *
 * These are read by Google Play reviewers as well as users, and are linked from
 * the Play Store listing, so they render as plain readable documents rather than
 * app screens — no data fetching, nothing that depends on being signed in.
 */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-[820px] px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-[24px] font-semibold text-[#001907] sm:text-[28px]">
        {title}
      </h1>
      <p className="mt-2 text-[13px] text-[#727272]">Last updated: {updated}</p>

      <div className="mt-8 space-y-8">{children}</div>
    </main>
  );
}

export function Section({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-[18px] font-medium text-[#001907]">{heading}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-[1.7] text-[#4B514F]">
        {children}
      </div>
    </section>
  );
}

export function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="ml-5 list-disc space-y-2">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

export function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="ml-5 list-decimal space-y-2">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ol>
  );
}
