import type { Locale } from "@/lib/types";
import { getMessages } from "@/i18n";

/** 소개·개인정보처리방침: 사전의 문단을 그대로 보여준다 */
export function TextPage({
  locale,
  kind,
}: {
  locale: Locale;
  kind: "about" | "privacy";
}) {
  const p = getMessages(locale).pages;
  const [title, body] =
    kind === "about"
      ? [p.aboutTitle, p.aboutBody]
      : [p.privacyTitle, p.privacyBody];
  return (
    <article>
      <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
      <div className="mt-8 space-y-5 text-lg leading-relaxed">
        {body.map((text) => (
          <p key={text}>{text}</p>
        ))}
      </div>
    </article>
  );
}

export function textPageMetadata(locale: Locale, kind: "about" | "privacy") {
  const m = getMessages(locale);
  return {
    title: `${kind === "about" ? m.pages.aboutTitle : m.pages.privacyTitle} — ${m.siteName}`,
    description:
      kind === "about" ? m.pages.aboutBody[0] : m.pages.privacyBody[0],
  };
}
