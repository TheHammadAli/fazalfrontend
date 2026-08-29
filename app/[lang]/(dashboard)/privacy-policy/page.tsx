import type { Metadata } from "next";
import { LegalDocument } from "@/components/Legal/LegalDocument";

export const metadata: Metadata = {
  title: "Privacy Policy | Fazl App",
  description:
    "How Fazl App collects, uses, shares and retains your personal data, and how to exercise your rights over it.",
};

function PrivacyPolicyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      src="/api/legal/privacy-policy"
      filename="fazl-app-privacy-policy.pdf"
    />
  );
}

export default PrivacyPolicyPage;
