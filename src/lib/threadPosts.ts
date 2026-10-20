/** 스레드 글 한 개(content/threads/posts.<언어>.txt 한 줄) */
export type ThreadPost = {
  /** 이미지 큰 글씨 */
  head: string;
  /** 이미지 작은 글씨 */
  sub: string;
  /** 본문 첫머리 */
  hook: string;
  /** 끝 질문(답글 유도) */
  question: string;
};

/** "사건id | 큰 글씨 | 작은 글씨 | 첫머리 | 질문" 줄들 → 사건id별 글. #으로 시작하는 줄은 설명 */
export function parseThreadPosts(text: string): Map<string, ThreadPost> {
  const posts = new Map<string, ThreadPost>();
  for (const line of text.split("\n")) {
    if (!line.trim() || line.startsWith("#")) continue;
    const [id, head, sub, hook, question] = line
      .split(" | ")
      .map((s) => s.trim());
    if (!question)
      throw new Error(`스레드 글 칸이 5개가 아님: ${line.slice(0, 60)}`);
    posts.set(id, { head, sub, hook, question });
  }
  return posts;
}
