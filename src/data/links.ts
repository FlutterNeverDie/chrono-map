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

/** 라이선스 원문 - 출처 표기에서 라이선스 이름에 건다(위키백과 글 CC BY-SA 4.0, 국경 데이터 CC BY 4.0) */
export const CC_BY_SA_4 = "https://creativecommons.org/licenses/by-sa/4.0/";
export const CC_BY_4 = "https://creativecommons.org/licenses/by/4.0/";
