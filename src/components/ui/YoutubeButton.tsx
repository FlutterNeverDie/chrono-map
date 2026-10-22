import { YoutubeIcon } from "./icons";

/** 지도 위 둥근 유튜브 버튼(나침반과 같은 크기·모양, 새 탭). 주소·문구는 쓰는 곳이 넘긴다 */
export function YoutubeButton({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      title={label}
      className="pointer-events-auto flex size-12 items-center justify-center rounded-full border border-line bg-background/92 shadow-sm transition-colors hover:bg-chip"
    >
      <YoutubeIcon className="size-7" />
    </a>
  );
}
