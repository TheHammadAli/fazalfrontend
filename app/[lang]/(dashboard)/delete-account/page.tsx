import type { Metadata } from "next";
import Link from "next/link";
import { Bullets, LegalPage, Section, Steps } from "@/components/Legal/LegalPage";

export const metadata: Metadata = {
  title: "Delete your account | Fazl App",
  description:
    "How to request deletion of your Fazl App account, what data is removed, and what is kept.",
};

const SUPPORT_EMAIL = "support@fazlapp.com";

function DeleteAccountPage() {
  return (
    <LegalPage title="Delete your Fazl App account" updated="29 August 2026">
      <Section heading="About this page">
        <p>
          This page explains how to request deletion of your <b>Fazl App</b>{" "}
          account and the data attached to it. It applies to the Fazl App mobile
          app and to fazlapp.com, which share the same account.
        </p>
      </Section>

      <Section heading="Close your account from the app">
        <Steps
          items={[
            "Open Fazl App and sign in to the account you want to delete.",
            "Go to the Profile tab.",
            "Open Settings.",
            "Choose Delete account.",
            "Confirm when you are asked to.",
          ]}
        />
        <p>
          Your account is closed straight away and you are signed out. You can no
          longer sign in, and your listings, shops and services stop being shown
          to other users.
        </p>
      </Section>

      <Section heading="Request erasure of your data">
        <p>
          Closing the account stops it being used. To have the personal data held
          against it erased as well, email{" "}
          <a className="text-green-1 underline" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>{" "}
          from the address registered on the account, with the subject{" "}
          <b>Delete my account and data</b>. Include the phone number on the
          account so we can identify it.
        </p>
        <p>
          Use the same address if you cannot sign in and need the account closed
          on your behalf. We verify that the request comes from the account holder
          before acting on it, and complete it within 30 days.
        </p>
      </Section>

      <Section heading="What is erased">
        <Bullets
          items={[
            "Your name, email address and phone number.",
            "Your profile photo.",
            "Your saved location.",
            "Your product listings, shops and services, and the images and videos attached to them.",
            "Your reviews and feed posts.",
            "Your device notification token, so the device stops receiving push notifications.",
          ]}
        />
      </Section>

      <Section heading="What is kept">
        <Bullets
          items={[
            <>
              <b>Messages you sent to other users</b> stay visible to the person
              who received them, in the same way a sent email stays in the
              recipient&apos;s inbox.
            </>,
            <>
              <b>Records of completed orders and bookings</b> are kept where
              accounting, tax or fraud-prevention law requires it. They are
              reduced to what the law requires and are not used for anything else.
            </>,
            <>
              <b>Backup copies</b> may still hold the data for a short period
              after deletion, until they are overwritten in the normal backup
              cycle.
            </>,
          ]}
        />
        <p>
          Retention periods are set out in our{" "}
          <Link className="text-green-1 underline" href="/en/privacy-policy">
            Privacy Policy
          </Link>
          .
        </p>
      </Section>

      <Section heading="Removing data without closing your account">
        <p>
          You do not have to delete your account to remove what you have
          published. You can delete any individual listing, shop or service from
          the app, and update your name, phone number, photo and location from
          Profile → Edit Profile.
        </p>
      </Section>

      <Section heading="Questions">
        <p>
          For anything about deletion or your data, contact{" "}
          <a className="text-green-1 underline" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </Section>
    </LegalPage>
  );
}

export default DeleteAccountPage;
