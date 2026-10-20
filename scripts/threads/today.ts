/**
 * 오늘의 세계사 - 스레드(Threads) 자동 게시.
 *
 *   npm run threads                       오늘 올릴 글 3개 미리 보기(올리지 않음)
 *   npm run threads -- --days 7           오늘부터 7일 치 미리 보기
 *   npm run threads -- --date 2026-08-15  그날 글 미리 보기
 *   npm run threads -- --lang en          영어 글
 *   npm run threads -- --post             지금 차례(--slot 0·1·2, 없으면 UTC 시각으로)의 글을 올림(THREADS_ACCESS_TOKEN 필요, 없으면 건너뜀). 최근 글에 같은 사건이 있으면 건너뜀
 *   npm run threads -- --post --replace   최근 글의 같은 사건 글을 지우고 다시 올림
 *   npm run threads -- --refresh          장기 토큰(60일) 연장 - 새 토큰을 터미널에만 출력. GitHub Secret을 그 값으로 바꾼다
 *
 * 하루 3개(UTC 13·17·23시 = 미국 동부 오전 9시·오후 1시·저녁 7시). 날짜는 영어 글은 미국 동부, 한국어 글은 한국 시간 기준.
 * 고르는 법:
 *   1) 위키백과 첫 문단에 "August 15, 1945"처럼 사건 연도와 월·일이 붙어 있으면 그날을 기념일로 본다 → 그날 날짜("On this day, October 19, 1813").
 *      영어 문단을 먼저 보고(양력), 한국어 문단은 1896년 뒤 사건만(그 전은 음력 날짜가 섞임).
 *   2) 남은 자리는 기념일이 없는 사건을 정해진 순서(고정 시드로 섞음)로 돌린다 - 상태 파일 없이도 한 바퀴 돌 때까지 겹치지 않음.
 *   둘 다 큰 사건만(featured: 중국·유럽·북미·일본의 중요한 사건, 근현대 한국·인도, 어디든 중요도 5).
 * 본문(직접 쓴 글이 있는 사건, content/threads/posts.<언어>.txt): 첫머리(놀라운 사실) / 날짜·사건 이름 / 끝 질문(답글 유도) + 세로 이미지(/en/event/<id>/post.png - 그 해 국경 지도 + 큰 한 줄).
 *   본문에는 링크를 넣지 않는다(링크 글은 덜 보여 준다) - 지도 링크는 답글 끝에. 위키백과 문장은 본문에 싣지 않는다.
 *   글이 없는 사건(한국어 등)은 예전 형식: 날짜 / 사건 이름 / 질문 한 줄 / 답글 안내 + 지도 링크 + 공유 카드(/event/<id>/og.png).
 * 답글: 위키백과 요약 + 출처·CC BY-SA 4.0(위키백과 글을 옮기는 곳에는 반드시 출처를 쓴다) + 지도 링크(?event=<id>로 그 사건을 고른 채 열림).
 * content.json이 먼저 있어야 한다(npm run content).
 */
import { existsSync, readFileSync } from "node:fs";
import { parseThreadPosts, type ThreadPost } from "../../src/lib/threadPosts";
import type { Content, HistoryEvent, Locale } from "../../src/lib/types";
import { clipText, eventSummary, eventTitle } from "../../src/lib/localize";
import { formatWhen, formatYear } from "../../src/lib/year";
import { root } from "../lib/content";

const SITE = "https://historymapworld.com";
const API = "https://graph.threads.net/v1.0";
/** 스레드 글 최대 길이 */
const MAX_TEXT = 500;

type Lang = Extract<Locale, "ko" | "en">;

const TEXT: Record<
  Lang,
  {
    /** 기념일: 그날 날짜("On October 19, 1813" - "N년 전"보다 바로 와닿는다) */
    onDay: (date: Date, year: string) => string;
    /** 기념일이 아닌 사건: 그때로 가 보자는 머리줄(사이트의 "연도를 움직여 보는" 느낌) */
    inYear: (when: string) => string;
    /** 직접 쓴 한 줄이 없는 사건의 질문 */
    ask: string;
    /** 링크 바로 위 줄(답글 안내) - 예전 형식 */
    more: string;
    /** 답글 끝 지도 링크 앞 글자 */
    mapLink: string;
    /** 기념일 줄("On this day, October 21, 1600: Battle of Sekigahara") */
    onDayTitle: (date: Date, year: string, title: string) => string;
    source: (title: string, trimmed: boolean) => string;
    topic: string;
  }
> = {
  ko: {
    onDay: (d, y) => `${y} ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일, 오늘`,
    inYear: (w) => `${w}의 세계`,
    ask: "그해 세계는 어땠을까?",
    more: "이야기는 답글에 ↓\n지도로 보기 →",
    mapLink: "지도로 보기 →",
    onDayTitle: (d, y, t) => `${y} ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일, 오늘: ${t}`,
    source: (t, trimmed) => `출처: 위키백과 「${t}」 (CC BY-SA 4.0${trimmed ? ", 괄호 속 표기를 줄임" : ""})`,
    topic: "세계사",
  },
  en: {
    onDay: (d, y) => `On this day, ${d.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" })}, ${y}`,
    inYear: (w) => `Back to ${w}`,
    ask: "What was the rest of the world doing that year?",
    more: "Story in the replies ↓\nSee it on the map →",
    mapLink: "See it on the map →",
    onDayTitle: (d, y, t) =>
      `On this day, ${d.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" })}, ${y}: ${t}`,
    source: (t, trimmed) => `Source: Wikipedia "${t}" (CC BY-SA 4.0${trimmed ? ", asides trimmed" : ""})`,
    topic: "History",
  },
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** 위키백과 첫 문단에서 사건 연도와 붙은 월·일("MM-DD"). 없으면 null */
export function anniversaryOf(e: HistoryEvent): string | null {
  if (e.start < 1 || e.precision !== "year") return null;
  const y = e.start;
  const en = e.wiki.en?.extract ?? "";
  const m = MONTHS.join("|");
  const a = en.match(new RegExp(`\\b(${m}) (\\d{1,2}),? ${y}\\b`));
  if (a) return mmdd(MONTHS.indexOf(a[1]) + 1, +a[2]);
  const b = en.match(new RegExp(`\\b(\\d{1,2}) (${m}),? ${y}\\b`));
  if (b) return mmdd(MONTHS.indexOf(b[2]) + 1, +b[1]);
  // 한국어 위키백과는 1896년(양력 채택) 전 한국·동아시아 사건을 음력으로 적는 일이 많아 그 뒤 사건만 쓴다
  if (y < 1896) return null;
  const ko = e.wiki.ko?.extract.match(new RegExp(`${y}년 (\\d{1,2})월 (\\d{1,2})일`));
  if (ko) return mmdd(+ko[1], +ko[2]);
  return null;
}

const mmdd = (m: number, d: number) =>
  m >= 1 && m <= 12 && d >= 1 && d <= 31 ? `${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` : null;

/** 고정 시드 섞기(mulberry32) - 날마다 같은 결과 */
function shuffled<T>(items: T[], seed = 20261019): T[] {
  const out = [...items];
  let s = seed;
  const rand = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** 하루에 올리는 글 수(워크플로 cron과 맞춘다) */
const SLOTS = 3;

/** 그 언어 독자 기준 오늘 "YYYY-MM-DD" - 영어는 미국 동부(글이 미국 낮에 올라감), 한국어는 한국 */
function todayFor(lang: Lang): string {
  const timeZone = lang === "en" ? "America/New_York" : "Asia/Seoul";
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

/** 지금 차례: UTC 13시 → 0, 17시 → 1, 23시 → 2 (예약 실행이 몇십 분 늦어도 같은 차례) */
function slotNow(): number {
  const h = new Date().getUTCHours();
  return h < 15 ? 0 : h < 20 ? 1 : 2;
}

export type Pick = { event: HistoryEvent; anniversary: boolean };

/**
 * 올릴 사건: 영어권 독자가 알고, 의견(댓글)이 붙기 쉬운 큰 사건 위주.
 *   - 어디든 중요도 5
 *   - 중국·유럽·북미·일본(인구·영향력이 큰 곳): 중요도 4 이상, 1800년 뒤 전쟁·정치는 3 이상(아편전쟁·제국주의·세계대전 …)
 *   - 한국·인도: 1800년 뒤 중요도 4 이상(일제 강점·한국전쟁·인도 분할 …)
 * 낯선 고대·지역 사건은 뺀다(사이트에는 그대로 있음).
 */
const BIG_REGIONS = new Set(["china", "europe", "north-america", "japan"]);
const featured = (e: HistoryEvent) =>
  e.importance === 5 ||
  (BIG_REGIONS.has(e.region) &&
    (e.importance >= 4 || (e.importance === 3 && e.start >= 1800 && (e.category === "war" || e.category === "politics")))) ||
  ((e.region === "korea" || e.region === "india") && e.importance >= 4 && e.start >= 1800);

/** 그날 올릴 글 SLOTS개: 그날이 기념일인 사건(중요한 순) → 남은 자리는 돌림 */
export function picksFor(date: string, events: HistoryEvent[], lang: Lang): Pick[] {
  const day = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
  const usable = events.filter((e) => featured(e) && eventSummary(e, lang).text.length >= 40);
  const today = usable
    .filter((e) => anniversaryOf(e) === date.slice(5))
    .sort((a, b) => b.importance - a.importance || a.start - b.start)
    .slice(0, SLOTS)
    .map((event) => ({ event, anniversary: true }));
  const pool = shuffled(usable.filter((e) => !anniversaryOf(e)).sort((a, b) => a.id.localeCompare(b.id)));
  const rest = Array.from({ length: SLOTS - today.length }, (_, j) => ({
    event: pool[(day * SLOTS + j) % pool.length],
    anniversary: false,
  }));
  return [...today, ...rest];
}

/** 직접 쓴 글(content/threads/posts.<언어>.txt). 위키백과 문장이 아니라 본문에 출처 없이 쓴다 */
function readPosts(lang: Lang): Map<string, ThreadPost> {
  const file = root(`content/threads/posts.${lang}.txt`);
  return existsSync(file) ? parseThreadPosts(readFileSync(file, "utf8")) : new Map();
}

/**
 * 위키백과 첫 문단의 괄호 속 원어·한자·발음 표기("(關ヶ原の戦い, Sekigahara no tatakai)", "(Korean: …)")를 뺀다 - 글이 짧은 SNS에서 읽기 어렵다.
 * 연도처럼 그 언어 글자·숫자만 있는 괄호("(1949-1989년)")는 남긴다. 고쳤으므로 출처 줄에 줄였다고 밝힌다(CC BY-SA 조건).
 */
export function trimAsides(text: string, lang: Lang): string {
  const foreign = lang === "ko" ? /[^\p{Script=Hangul}\d\s.,~-]/u : /[^\p{Script=Latin}\d\s.,~-]|:/u;
  return text
    .replace(/\s*\(([^()]*)\)/g, (all, inner: string) => (foreign.test(inner) || !inner.trim() ? "" : all))
    .replace(/\s+([,.])/g, "$1")
    .replace(/\s{2,}/g, " ");
}

/**
 * 직접 쓴 글이 있으면: 첫머리 / 날짜·사건 이름 / 끝 질문 + 세로 이미지(post.png). 본문에 링크 없음.
 * 없으면(예전 형식): 날짜(또는 그 해) / 사건 이름 / 질문 한 줄 + 답글 안내·지도 링크(맨 끝) + 공유 카드(og.png).
 * 답글: 위키백과 요약 + 출처(CC BY-SA) + (새 형식이면) 지도 링크. 본문을 눌러 답글까지 읽게 한다.
 * fallbackImage: post.png가 아직 배포되지 않았을 때 올릴 공유 카드.
 */
export function compose(
  { event: e, anniversary }: Pick,
  date: string,
  lang: Lang,
  posts: Map<string, ThreadPost>,
) {
  const t = TEXT[lang];
  const title = eventTitle(e, lang);
  const summary = eventSummary(e, lang);
  const path = `${lang === "ko" ? "" : `/${lang}`}/event/${e.id}`;
  const year = formatYear(e.start, lang);
  const day = new Date(`${date}T00:00:00Z`);
  // 링크는 상세 페이지가 아니라 지도(그 사건을 고른 채로 열림 - features/events의 useEventUrl)
  const map = `${SITE}${lang === "ko" ? "/" : `/${lang}`}?event=${e.id}`;
  const post = posts.get(e.id);
  const text = post
    ? `${post.hook}\n\n${anniversary ? t.onDayTitle(day, year, title) : `${title}, ${formatWhen(e, lang)}`}\n\n${post.question}`
    : // 제목에 연도가 이미 있으면("1956년 헝가리 혁명") 그대로, 기념일 아닌 날은 머리줄에 때가 있다
      `${anniversary ? t.onDay(day, year) : t.inYear(formatWhen(e, lang))}\n\n${title}\n${t.ask}\n\n${t.more} ${map}`;
  if (text.length > MAX_TEXT) throw new Error(`글이 ${text.length}자 - ${MAX_TEXT}자를 넘음 (${e.id})`);

  const source = summary.page ? trimAsides(summary.text, lang) : summary.text;
  const credit = summary.page
    ? `\n\n${t.source(summary.page.title, source !== summary.text.replace(/\s+/g, " ").trim())}`
    : "";
  // 답글은 두세 문장만(길면 안 읽는다). 더 읽고 싶으면 지도·상세 페이지로
  const reply = `${clipText(source, 300)}${credit}${post ? `\n\n${t.mapLink} ${map}` : ""}`;
  if (reply.length > MAX_TEXT) throw new Error(`답글이 ${reply.length}자 - ${MAX_TEXT}자를 넘음 (${e.id})`);
  return {
    id: e.id,
    title,
    text,
    reply,
    image: `${SITE}${path}/${post ? "post" : "og"}.png`,
    fallbackImage: `${SITE}${path}/og.png`,
    topic: t.topic,
  };
}

async function call(path: string, params: Record<string, string>, method: "GET" | "POST" | "DELETE" = "POST") {
  const body = new URLSearchParams({ ...params, access_token: process.env.THREADS_ACCESS_TOKEN! });
  const res = await fetch(
    method === "POST" ? `${API}/${path}` : `${API}/${path}?${body}`,
    method === "POST" ? { method, body } : { method },
  );
  const json = (await res.json()) as Record<string, string> & { error?: { message: string } };
  if (!res.ok || json.error) throw new Error(`스레드 API ${path}: ${json.error?.message ?? res.status}`);
  return json;
}

/** 글 하나 만들기 → 처리 끝날 때까지 기다림 → 게시. 게시된 글 id */
async function publishOne(params: Record<string, string>) {
  const { id } = await call("me/threads", params);
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const { status, error_message } = await call(id, { fields: "status,error_message" }, "GET");
    if (status === "FINISHED") break;
    if (status === "ERROR" || status === "EXPIRED") throw new Error(`스레드 글 처리 실패: ${status} ${error_message ?? ""}`);
  }
  return (await call("me/threads_publish", { creation_id: id })).id;
}

/** 본문(사진) 게시 → 그 아래 답글(이야기 + 출처 + 지도 링크). 본문 주소를 돌려준다 */
async function publish({ text, reply, image: wanted, fallbackImage, topic }: ReturnType<typeof compose>) {
  // 스레드는 이미지를 직접 받아 가므로 사이트에 실제로 있는지 먼저 본다(배포 전 새 사건 등).
  // 글 이미지(post.png)가 아직 배포 전이면 공유 카드로 대신한다
  let image = wanted;
  if (!(await fetch(image, { method: "HEAD" })).ok) {
    console.log(`글 이미지가 없어 공유 카드로: ${image}`);
    image = fallbackImage;
    const head = await fetch(image, { method: "HEAD" });
    if (!head.ok) throw new Error(`공유 이미지가 없음 ${head.status}: ${image}`);
  }
  const id = await publishOne({ media_type: "IMAGE", image_url: image, text, topic_tag: topic });
  const { permalink } = await call(id, { fields: "permalink" }, "GET");
  try {
    await publishOne({ media_type: "TEXT", text: reply, reply_to_id: id });
  } catch (err) {
    // 본문은 이미 올라갔으니 답글 실패로 작업 전체를 실패시키지 않는다(Actions 로그에만 남김)
    console.error(`답글 실패: ${err instanceof Error ? err.message : err}`);
  }
  return permalink;
}

async function main() {
  const args = process.argv.slice(2);
  const arg = (name: string) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const lang = (arg("--lang") ?? "ko") as Lang;
  if (!(lang in TEXT)) throw new Error(`--lang은 ${Object.keys(TEXT).join(", ")} 중 하나`);
  const start = arg("--date") ?? todayFor(lang);
  const posts = readPosts(lang);
  const days = Number(arg("--days") ?? 1);
  const { events } = JSON.parse(
    readFileSync(root("src/data/generated/content.json"), "utf8"),
  ) as Content;

  if (args.includes("--refresh")) {
    if (!process.env.THREADS_ACCESS_TOKEN) throw new Error("THREADS_ACCESS_TOKEN이 없음");
    const res = await fetch(
      `https://graph.threads.net/refresh_access_token?${new URLSearchParams({ grant_type: "th_refresh_token", access_token: process.env.THREADS_ACCESS_TOKEN })}`,
    );
    const json = (await res.json()) as { access_token?: string; expires_in?: number; error?: { message: string } };
    if (!json.access_token) throw new Error(`토큰 연장 실패: ${json.error?.message ?? res.status}`);
    console.log(`새 토큰(${Math.round((json.expires_in ?? 0) / 86_400)}일 유효):\n${json.access_token}`);
    return;
  }

  if (args.includes("--post")) {
    if (!process.env.THREADS_ACCESS_TOKEN) {
      console.log("THREADS_ACCESS_TOKEN이 없어 올리지 않음");
      return;
    }
    const slot = Number(arg("--slot") ?? slotNow());
    const post = compose(picksFor(start, events, lang)[slot], start, lang, posts);
    // 같은 날 손으로 한 번 더 돌렸거나 예약 실행이 겹쳐도 같은 사건을 두 번 올리지 않는다
    // 링크 형식이 바뀌어도 알아보게 사건 id로 찾는다(상세 /event/<id> 또는 지도 ?event=<id>)
    const mine = new RegExp(`(?:/event/|[?&]event=)${post.id}(?![\\w-])`);
    const recent = (await call("me/threads", { fields: "id,text", limit: "10" }, "GET")) as unknown as {
      data: { id: string; text?: string }[];
    };
    // 새 형식은 본문에 링크가 없어 사건 이름으로도 찾는다
    const same = recent.data.filter((t) => t.text && (mine.test(t.text) || t.text.includes(post.title)));
    if (same.length && !args.includes("--replace")) {
      console.log(`최근 글에 이미 있음 - 건너뜀: ${post.id}`);
      return;
    }
    // --replace: 같은 사건 글을 지우고 다시 올린다(형식을 바꾼 뒤 다시 올릴 때). 답글은 본문과 함께 지워진다
    for (const t of same) {
      await call(t.id, {}, "DELETE");
      console.log(`지움: ${t.id}`);
    }
    console.log(`${post.text}\n\n[답글]\n${post.reply}`);
    console.log(`\n게시됨: ${await publish(post)}`);
    return;
  }

  for (let i = 0; i < days; i++) {
    const date = new Date(Date.parse(`${start}T00:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10);
    picksFor(date, events, lang).forEach((pick, slot) => {
      const post = compose(pick, date, lang, posts);
      console.log(`──── ${date} #${slot} ${pick.anniversary ? "(기념일)" : "(돌림)"} · ${post.text.length}자 · ${post.image}`);
      console.log(`${post.text}\n\n  [답글 ${post.reply.length}자]\n  ${post.reply.replace(/\n/g, "\n  ")}\n`);
    });
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
