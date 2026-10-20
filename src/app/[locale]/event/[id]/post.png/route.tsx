import { notFound } from "next/navigation";
import { renderPost } from "@/components/og/renderPost";
import { eventPostCard, threadPostsEn } from "@/features/pages/og";

/** 스레드 "오늘의 세계사" 글 이미지(4:5) - 영어 글이 있는 사건만(/en/event/<id>/post.png). scripts/threads/today.ts가 이 주소를 올린다 */
export const dynamic = "force-static";
export function generateStaticParams() {
  return [...threadPostsEn().keys()].map((id) => ({ locale: "en", id }));
}
export const dynamicParams = false;

export async function GET(
  _: Request,
  { params }: RouteContext<"/[locale]/event/[id]/post.png">,
) {
  const { locale, id } = await params;
  const card = locale === "en" ? eventPostCard(id) : null;
  if (!card) notFound();
  return renderPost(card);
}
