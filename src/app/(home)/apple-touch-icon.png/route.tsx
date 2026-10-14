import { ImageResponse } from "next/og";
import { logoDataUri } from "@/lib/logo";

/** 홈 화면 아이콘(iOS 180×180 PNG, 빌드 때 /apple-touch-icon.png 파일로 만들어짐). 그림은 lib/logo(모서리 없는 사각) */
export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logoDataUri(false)} width={180} height={180} alt="" />,
    { width: 180, height: 180 },
  );
}
