import type { Locale } from "@/lib/types";
import { getMessages } from "@/i18n";
import { pageAlternates } from "@/i18n/alternates";
import { REPO_URL } from "@/data/links";
import { ExternalIcon } from "@/components/ui/icons";

export type TextPageKind = "about" | "privacy" | "contact" | "guide";

/** 연락용 이메일(연락처 페이지에 공개). 배포 환경변수 NEXT_PUBLIC_CONTACT_EMAIL로 바꿀 수 있다 */
const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "oasa741@gmail.com";

function content(locale: Locale, kind: TextPageKind) {
  const p = getMessages(locale).pages;
  if (kind === "about")
    return { title: p.aboutTitle, body: p.aboutBody, links: [] };
  if (kind === "guide")
    return { title: p.guideTitle, body: p.guideBody, links: [] };
  if (kind === "privacy")
    return {
      title: p.privacyTitle,
      body: p.privacyBody,
      // AdSense 정책: 맞춤 광고 끄기와 Google의 파트너 사이트 정보 사용 안내 링크
      links: [
        { label: p.privacyAdsSettings, href: "https://myadcenter.google.com" },
        {
          label: p.privacyPartnerSites,
          href: "https://policies.google.com/technologies/partner-sites",
        },
        { label: "www.aboutads.info", href: "https://www.aboutads.info" },
      ],
    };
  return {
    title: p.contactTitle,
    body: p.contactBody,
    links: [
      { label: p.contactIssue, href: `${REPO_URL}/issues` },
      ...(CONTACT_EMAIL
        ? [
            {
              label: `${p.contactEmail}: ${CONTACT_EMAIL}`,
              href: `mailto:${CONTACT_EMAIL}`,
            },
          ]
        : []),
    ],
  };
}

/**
 * 소개·개인정보처리방침·연락처·사용 설명서: 사전의 문단을 그대로 보여주고, 필요한 바깥 링크를 붙인다.
 * "## "로 시작하는 문단은 소제목(사용 설명서)
 */
export function TextPage({
  locale,
  kind,
}: {
  locale: Locale;
  kind: TextPageKind;
}) {
  const { title, body, links } = content(locale, kind);
  return (
    <article>
      <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
      <div className="mt-8 space-y-5 text-lg leading-relaxed">
        {body.map((text) =>
          text.startsWith("## ") ? (
            <h2 key={text} className="pt-4 text-xl font-bold">
              {text.slice(3)}
            </h2>
          ) : (
            <p key={text}>{text}</p>
          ),
        )}
      </div>
      {links.length > 0 && (
        <ul className="mt-8 space-y-2">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                target={l.href.startsWith("mailto:") ? undefined : "_blank"}
                rel="noreferrer"
                className="inline-flex min-h-11 items-center gap-1.5 text-base font-medium underline"
              >
                {l.label}
                {!l.href.startsWith("mailto:") && (
                  <ExternalIcon className="size-4" />
                )}
              </a>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export function textPageMetadata(locale: Locale, kind: TextPageKind) {
  const m = getMessages(locale);
  const { title, body } = content(locale, kind);
  return {
    // "About History Map World — History Map World"처럼 사이트 이름이 두 번 나오지 않게
    title: title.includes(m.siteName) ? title : `${title} — ${m.siteName}`,
    description: body[0],
    alternates: pageAlternates(locale, kind),
  };
}
