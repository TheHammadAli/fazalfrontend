import type { Metadata } from "next";
import { LegalDocument } from "@/components/Legal/LegalDocument";

export const metadata: Metadata = {
  title: "Terms & Conditions | Fazl App",
  description:
    "The terms that govern your use of Fazl App, including buying, selling, listing services and messaging other users.",
};

function TermsConditionsPage() {
  return (
    <LegalDocument
      title="Terms & Conditions"
      src="/api/legal/terms-and-conditions"
      filename="fazl-app-terms-and-conditions.pdf"
    />
  );
}

export default TermsConditionsPage;
