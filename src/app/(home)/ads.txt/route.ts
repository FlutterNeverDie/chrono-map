import { adsTxtLine } from "@/features/ads";

/** /ads.txt — AdSense 판매자 인증. 게시자 ID(NEXT_PUBLIC_ADSENSE_CLIENT)가 있을 때만 내용이 채워진다 */
export const dynamic = "force-static";

export function GET() {
  const line = adsTxtLine();
  return new Response(
    line ? `${line}\n` : "# AdSense 게시자 ID를 지정하면 채워집니다\n",
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
}
