import { DEFAULT_LOCALE } from "@/i18n/locales";
import { renderOg } from "@/components/og/render";
import { homeCard } from "@/features/pages/og";

/** 공유 미리보기 이미지(빌드 때 /og.png 파일로 만들어짐) */
export const dynamic = "force-static";

export function GET() {
  return renderOg(homeCard(DEFAULT_LOCALE));
}
