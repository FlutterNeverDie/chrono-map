"use client";

import { useState } from "react";
import clsx from "clsx";
import { useI18n } from "@/i18n/I18nProvider";
import { ChevronDownIcon, MailIcon } from "@/components/ui/icons";
import { CONTACT_EMAIL, MAIL_TAG } from "./site";

/**
 * 설정 메뉴의 "개발자에게 문의". 누르면 그 자리에서 펼쳐진다.
 * mailto만 두면 메일 앱이 없는 PC·앱 안 브라우저에서 주소가 글자 그대로 뜨거나 아무 일도 없어서
 * 주소(복사) + Gmail 웹 쓰기 + 메일 앱을 함께 둔다. 제목 앞머리는 언어와 상관없이 MAIL_TAG.
 */
export function ContactMenu() {
  const { messages } = useI18n();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const subject = `${MAIL_TAG} ${messages.ui.contactSubject}`;
  const q = (s: string) => encodeURIComponent(s);
  const row =
    "flex h-11 items-center rounded-md px-3 text-[15px] text-foreground hover:bg-chip";

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex h-12 w-full items-center gap-3 rounded-md px-3 text-start text-base whitespace-nowrap text-foreground hover:bg-chip"
      >
        <MailIcon className="size-[22px] shrink-0 text-muted" />
        {messages.ui.contactDev}
        <ChevronDownIcon
          className={clsx(
            "ms-auto size-4 shrink-0 text-muted transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="ms-9 mb-1 flex flex-col">
          {/* 주소는 고를 수 있게(길게 눌러 복사) */}
          <p className="px-3 py-1 text-[15px] font-medium select-all">
            {CONTACT_EMAIL}
          </p>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(CONTACT_EMAIL);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {}
            }}
            className={clsx(row, "text-start")}
          >
            <span aria-live="polite">
              {copied ? messages.ui.emailCopied : messages.ui.copyEmail}
            </span>
          </button>
          <a
            href={`https://mail.google.com/mail/?view=cm&to=${q(CONTACT_EMAIL)}&su=${q(subject)}`}
            target="_blank"
            rel="noreferrer"
            className={row}
          >
            {messages.ui.writeGmail}
          </a>
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=${q(subject)}`}
            className={row}
          >
            {messages.ui.writeMailApp}
          </a>
        </div>
      )}
    </div>
  );
}
