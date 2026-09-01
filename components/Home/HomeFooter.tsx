"use client";

import type { ReactNode } from "react";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import FazalLogo from "@/assets/icons/fazal-logo.svg";
import FacebookIcon from "@/assets/icons/facebook.svg";
// TODO: replace with a real Threads glyph — no Threads asset exists in assets/icons/ yet.
import ThreadsIcon from "@/assets/icons/mail.svg";
import LinkedInIcon from "@/assets/icons/linked-in.svg";
import XIcon from "@/assets/icons/xicon.svg";
import PhoneIconFooter from "@/assets/icons/phone-icon-footer.svg";
import GmailIconFooter from "@/assets/icons/gmail-icon-footer.svg";
import WhatsAppIcon from "@/assets/icons/whatsapp-icon.svg";
import {
    PRIVACY_POLICY_URL,
    TERMS_AND_CONDITIONS_URL,
    getSupportWhatsAppUrl,
} from "@/assets/content/constants";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import { useCategoriesQuery } from "@/custom-hooks/useCategoriesQuery";
import { useGetSocialLinksQuery } from "@/store/services/settingsService";
import { getFeedCategoryLabel } from "@/utils/getFeedCategoryLabel";

type CategoryItem = {
    _id: string;
    name?: string | { en?: string; ur?: string };
};

type FooterLink = {
    label: string;
    href: string;
    external?: boolean;
    showWhatsAppIcon?: boolean;
};

type SocialLink = {
    label: string;
    href: string;
    icon: StaticImageData;
};

type ApiSocialLinks = {
    facebookUrl?: string | null;
    twitterUrl?: string | null;
    threadsUrl?: string | null;
    linkedinUrl?: string | null;
};

const SOCIAL_ICON_META: { key: keyof ApiSocialLinks; label: string; icon: StaticImageData }[] = [
    { key: "facebookUrl", label: "Facebook", icon: FacebookIcon },
    { key: "threadsUrl", label: "Threads", icon: ThreadsIcon },
    { key: "linkedinUrl", label: "LinkedIn", icon: LinkedInIcon },
    { key: "twitterUrl", label: "X", icon: XIcon },
];

const FOOTER_LINK_CLASS =
    "break-words text-[13px] font-light text-gray-8 transition-colors hover:text-green-1 sm:text-[14px]";

function FooterColumn({
    title,
    children,
    className = "",
}: {
    title: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={`min-w-0 ${className}`}>
            <h3 className="text-[15px] font-semibold leading-snug text-[#030303] sm:text-[16px]">
                {title}
            </h3>
            <div className="mt-3 sm:mt-4">{children}</div>
        </div>
    );
}

function mapCategoriesToLinks(
    categories: CategoryItem[] | undefined,
    tab: "products" | "services",
    lang: string,
): FooterLink[] {
    return (categories ?? []).slice(0, 4).map((category) => ({
        label: getFeedCategoryLabel(category.name, lang),
        href: `/home/search-list?tab=${tab}&categoryId=${category._id}`,
    }));
}

function HomeFooter() {
    const router = useRouter();
    const { placeholders, info_messages, currentLanguage } = useDictionary();
    const { data: productCategories } = useCategoriesQuery({ type: "product" });
    const { data: serviceCategories } = useCategoriesQuery({ type: "service" });
    const { data: socialLinksData } = useGetSocialLinksQuery(undefined);

    const socialLinks: SocialLink[] = useMemo(() => {
        const links = (socialLinksData as { data?: ApiSocialLinks } | undefined)?.data;
        return SOCIAL_ICON_META.map((meta) => ({
            label: meta.label,
            icon: meta.icon,
            href: links?.[meta.key] ?? "",
        }));
    }, [socialLinksData]);

    const popularProductCategories = useMemo(
        () =>
            mapCategoriesToLinks(
                productCategories?.data as CategoryItem[] | undefined,
                "products",
                currentLanguage,
            ),
        [productCategories?.data, currentLanguage],
    );

    const popularServiceCategories = useMemo(
        () =>
            mapCategoriesToLinks(
                serviceCategories?.data as CategoryItem[] | undefined,
                "services",
                currentLanguage,
            ),
        [serviceCategories?.data, currentLanguage],
    );

    const whatsappUrl = getSupportWhatsAppUrl();

    const companyLinks: FooterLink[] = [
        { label: placeholders.about, href: "/about" },

        {
            label: placeholders.privacy_policy,
            href: PRIVACY_POLICY_URL,
            external: true,
        },
        {
            label: placeholders.terms_condition,
            href: TERMS_AND_CONDITIONS_URL,
            external: true,
        },
    ];

    return (
        <footer className="mt-4 overflow-hidden rounded-t-[24px] bg-[#EEF2F3] px-4 py-8 sm:mt-6 sm:px-5 sm:py-10">
            <div className="flex min-w-0 flex-col gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-10 xl:gap-16">
                <div className="max-w-[320px] shrink-0">
                    <Image
                        src={FazalLogo}
                        alt={placeholders.market}
                        className="h-[38px] w-auto"
                    />
                    <p className="mt-3 max-w-[244px] text-[14px] font-light leading-tight text-gray-8">
                        {info_messages.footer_tagline}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-2.5 sm:mt-8">
                        {socialLinks.map(({ label, href, icon }) => (
                            <a
                                key={label}
                                href={href || undefined}
                                target={href ? "_blank" : undefined}
                                rel={href ? "noopener noreferrer" : undefined}
                                aria-label={label}
                                aria-disabled={!href}
                                className={`inline-flex shrink-0 transition-opacity ${href ? "hover:opacity-90" : "cursor-default opacity-40"}`}
                            >
                                <Image
                                    src={icon}
                                    alt={label}
                                    className="h-9 w-9 sm:h-10 sm:w-10"
                                />
                            </a>
                        ))}
                    </div>
                </div>

                <div className="grid min-w-0 w-full grid-cols-2 gap-x-6 gap-y-8 sm:gap-x-10 sm:gap-y-10 lg:grid-cols-3 xl:grid-cols-4 lg:gap-6">
                    <FooterColumn title={info_messages.popular_product_categories}>
                        <ul className="space-y-1">
                            {popularProductCategories.map((item) => (
                                <li key={item.href}>
                                    <button
                                        type="button"
                                        onClick={() => router.push(item.href)}
                                        className={`cursor-pointer text-left ${FOOTER_LINK_CLASS}`}
                                    >
                                        {item.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </FooterColumn>

                    <FooterColumn title={info_messages.popular_service_categories}>
                        <ul className="space-y-1">
                            {popularServiceCategories.map((item) => (
                                <li key={item.href}>
                                    <button
                                        type="button"
                                        onClick={() => router.push(item.href)}
                                        className={`cursor-pointer text-left ${FOOTER_LINK_CLASS}`}
                                    >
                                        {item.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </FooterColumn>

                    <FooterColumn title={placeholders.company}>
                        <ul className="space-y-1">
                            {companyLinks.map((item) => (
                                <li key={item.label}>
                                    {item.external ? (
                                        <a
                                            href={item.href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`inline-flex items-center gap-2 ${FOOTER_LINK_CLASS}`}
                                        >
                                            {item.showWhatsAppIcon && (
                                                <Image
                                                    src={WhatsAppIcon}
                                                    alt=""
                                                    className="h-4 w-4 shrink-0"
                                                />
                                            )}
                                            <span>{item.label}</span>
                                        </a>
                                    ) : (
                                        <Link
                                            href={item.href}
                                            className={FOOTER_LINK_CLASS}
                                        >
                                            {item.label}
                                        </Link>
                                    )}
                                </li>
                            ))}
                        </ul>
                        <p className={`mt-3 inline-flex items-center gap-1 ${FOOTER_LINK_CLASS}`}>
                            <span aria-hidden className="text-[16px]">©</span>
                            <span>2026 Fazl App</span>
                        </p>
                    </FooterColumn>

                    <FooterColumn title={info_messages.contact_info}>
                        <ul className="space-y-1">
                            <li>
                                <a
                                    href={whatsappUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`inline-flex max-w-full items-center gap-2 ${FOOTER_LINK_CLASS}`}
                                >
                                    <Image
                                        src={WhatsAppIcon}
                                        alt=""
                                        className="h-4 w-4 shrink-0"
                                    />
                                    <span className="min-w-0 break-all">
                                        {placeholders.contact_us}
                                    </span>
                                </a>
                            </li>
                            {/* <li>
                                <a
                                    href={`tel:${info_messages.footer_phone.replace(/\s/g, "")}`}
                                    className={`inline-flex max-w-full items-center gap-2 ${FOOTER_LINK_CLASS}`}
                                >
                                    <Image
                                        src={PhoneIconFooter}
                                        alt=""
                                        className="h-[13px] w-3 shrink-0"
                                    />
                                    <span className="min-w-0 break-all">
                                        {info_messages.footer_phone}
                                    </span>
                                </a>
                            </li> */}
                            <li>
                                <a
                                    href={`mailto:${info_messages.footer_email}`}
                                    className={`inline-flex max-w-full items-center gap-2 ${FOOTER_LINK_CLASS}`}
                                >
                                    <Image
                                        src={GmailIconFooter}
                                        alt=""
                                        className="h-[9px] w-[13px] shrink-0"
                                    />
                                    <span className="min-w-0 ">
                                        {info_messages.footer_email}
                                    </span>
                                </a>
                            </li>
                        </ul>
                    </FooterColumn>
                </div>
            </div>
        </footer>
    );
}

export default HomeFooter;
