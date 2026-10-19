import { CC_BY_SA_4 } from "@/data/links";

/**
 * 지도 목록 맨 아래 출처 한 줄: "설명: 위키백과 · CC BY-SA 4.0 / 원문 링크는 각 카드의 자세히에".
 * 카드에는 링크 없는 출처 글자만 두고(링크였을 때 "자세히" 옆이라 잘못 눌림), 라이선스 링크는 목록에 한 번, 문서별 원문 링크는 상세 페이지 출처 줄에 둔다
 * (CC BY-SA 4.0은 매체에 맞는 합리적인 방식의 표기, 표기 정보가 있는 페이지로의 연결을 인정한다).
 * 위키백과 글이 하나도 없는 목록이면 그리지 않는다(호출하는 쪽에서 show).
 */
export function WikiCredit({
  show,
  from,
  wikipedia,
  wikipediaHome,
  note,
}: {
  show: boolean;
  /** "설명" */
  from: string;
  /** "위키백과" */
  wikipedia: string;
  /** 그 언어 위키백과 첫 화면 */
  wikipediaHome: string;
  /** 원문 링크가 어디 있는지 */
  note: string;
}) {
  if (!show) return null;
  return (
    <p className="mt-4 border-t border-line px-1 pt-3 pb-1 text-[13px] leading-relaxed text-muted lg:text-sm">
      {from}:{" "}
      <a href={wikipediaHome} rel="noreferrer" className="underline">
        {wikipedia}
      </a>{" "}
      ·{" "}
      <a
        href={CC_BY_SA_4}
        target="_blank"
        rel="license noreferrer"
        className="underline"
      >
        CC BY-SA 4.0
      </a>
      <br />
      {note}
    </p>
  );
}
