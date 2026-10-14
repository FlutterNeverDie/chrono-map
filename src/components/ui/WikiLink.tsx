import { ExternalIcon } from "./icons";

/**
 * 위키백과 원문 링크 겸 출처 표기: "위키백과 · CC BY-SA 4.0 ↗" 글자 링크(카드 오른쪽 끝).
 * 위키백과 로고·W 아이콘은 위키미디어 재단 상표라 쓰지 않는다 - 출처를 밝히는 이름 글자만.
 * 라이선스(CC BY-SA 4.0)가 카드마다 보이게 한다(모바일은 지도 아래 출처 표기가 없다).
 */
export function WikiLink({
  href,
  label,
  source,
}: {
  href: string;
  /** 링크의 접근성 이름·툴팁(예: "위키백과에서 계속 읽기") */
  label: string;
  /** 보이는 출처 문구(예: "위키백과 · CC BY-SA 4.0") */
  source: string;
}) {
  return (
    <span className="ms-auto inline-flex min-w-0 shrink-0">
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        aria-label={`${label} (${source})`}
        title={label}
        // 카드 전체가 눌리는 목록이 많아 카드 선택으로 번지지 않게
        onClick={(e) => e.stopPropagation()}
        className="flex h-10 items-center gap-1 rounded-md px-2 text-sm whitespace-nowrap text-muted underline-offset-2 transition-colors hover:bg-chip hover:text-foreground hover:underline"
      >
        {source}
        <ExternalIcon className="size-4 shrink-0" />
      </a>
    </span>
  );
}
