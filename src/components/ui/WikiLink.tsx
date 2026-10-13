import { WikipediaIcon } from "./icons";

/**
 * 위키백과 원문 링크(카드 오른쪽 끝의 W 아이콘만).
 * 출처·라이선스(CC BY-SA 4.0)는 아이콘의 이름·툴팁에 넣고, 화면 전체 출처 표기(지도 왼쪽 아래, 소개 페이지)가 함께 맡는다.
 */
export function WikiLink({
  href,
  label,
  source,
}: {
  href: string;
  /** 링크의 접근성 이름(예: "위키백과에서 계속 읽기") */
  label: string;
  /** 출처 문구(예: "위키백과 · CC BY-SA 4.0") — 아이콘 이름·툴팁에 붙는다 */
  source: string;
}) {
  return (
    <span className="ms-auto inline-flex shrink-0">
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        aria-label={`${label} (${source})`}
        title={`${label} · ${source}`}
        // 카드 전체가 눌리는 목록이 많아 카드 선택으로 번지지 않게
        onClick={(e) => e.stopPropagation()}
        className="flex size-10 items-center justify-center rounded-md border border-line text-foreground transition-colors hover:bg-chip"
      >
        <WikipediaIcon className="size-[22px]" />
      </a>
    </span>
  );
}
