/** 저장소 주소 — 오류 제보(F-17)는 백엔드 없이 GitHub 이슈로 받는다 */
export const REPO_URL = "https://github.com/FlutterNeverDie/chrono-map";

/** 제목·본문이 미리 채워진 새 이슈 주소. path는 문제가 있는 페이지 경로("/event/imjin-war") */
export function reportIssueUrl(subject: string, path: string): string {
  const q = new URLSearchParams({
    title: `[오류 제보] ${subject}`,
    body: `페이지: ${path}\n\n틀린 내용:\n\n바른 내용(출처가 있으면 함께):\n`,
    labels: "content",
  });
  return `${REPO_URL}/issues/new?${q}`;
}
