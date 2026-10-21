/**
 * 사건 사진 받기: npm run photos [-- --only id,id] [--limit N] [--force]
 *
 * 사건의 영어 위키백과 문서 → Wikidata 대표 이미지(P18), 없으면 그 문서의 자유 라이선스 대표 이미지.
 * 위키미디어 공용의 라이선스가 퍼블릭 도메인·CC0·CC BY·CC BY-SA인 것만 쓴다(그 밖은 건너뜀).
 * 빌드 전에 한 번 받아 WebP로 줄여 public/photos에 두고(방문자는 위키미디어에 직접 접속하지 않는다):
 *   <id>-s.webp  400×400 목록 카드·지도 핀(가운데 맞춰 자르기, 세로 사진은 위쪽)
 *   <id>-w.webp  640×360 고른 카드 16:9(세로·정사각 사진은 통째로 + 양옆은 같은 사진을 흐리게)
 *   <id>-l.webp  긴 변 960 전체 화면(확대 보기)
 * 지도·국기·위치도처럼 사건 사진이 아닌 파일(이름으로 판단)은 문서 대표 이미지로 바꾸고, 그것도 그러면 쓰지 않는다.
 * 작가·라이선스·원본 링크는 content/photos.json에 캐시(git에 올림). 사진이 없거나 못 쓰면 null(다시 묻지 않음, --force면 다시).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { readEvents, root } from "./lib/content";
import { getJson, resolveQids, sleep, USER_AGENT } from "./lib/wikipediaApi";

export type PhotoMeta = {
  /** 위키미디어 공용 파일 이름 */
  file: string;
  author: string;
  license: string;
  licenseUrl?: string;
  /** 원본 파일 페이지 */
  source: string;
  /** 전체 화면 사진(-l) 크기 - 상세 페이지가 자리를 먼저 잡는다 */
  width: number;
  height: number;
};

const CACHE = root("content/photos.json");
const OUT = root("public/photos");

/** 쓸 수 있는 라이선스: 퍼블릭 도메인·CC0·CC BY·CC BY-SA(버전 무관) */
const FREE =
  /^(public domain|pd\b|pd-|cc0|cc[ -]by(-sa)?[ -]\d|cc[ -]by(-sa)?$)/i;

/** 사건 사진이 아닌 것: 지도·국기·문장·위치도·도표(파일 이름), svg 그림 */
const NOT_PHOTO =
  /(\bmaps?\b|karte|carte|mapa|\bflag|coat of arms|emblem|locator|location|\.svg$)/i;

const stripHtml = (s: string) =>
  s
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    // 공용 작가 칸은 같은 이름을 두 번 담기도 한다("Unknown authorUnknown author")
    .replace(/^(.+?)\s?\1$/, "$1");

type Ext = Record<string, { value: string } | undefined>;
type Info = {
  thumburl: string;
  url: string;
  width: number;
  height: number;
  mime: string;
  extmetadata?: Ext;
};

/** Wikidata 항목들 → P18 파일 이름 */
async function p18(qids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (let i = 0; i < qids.length; i += 50) {
    type E = {
      claims?: { P18?: { mainsnak: { datavalue?: { value: string } } }[] };
    };
    const res = await getJson<{ entities: Record<string, E> }>(
      "https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims&ids=" +
        qids.slice(i, i + 50).join("|"),
    );
    for (const [q, e] of Object.entries(res?.entities ?? {})) {
      const f = e.claims?.P18?.[0]?.mainsnak.datavalue?.value;
      if (f) out.set(q, f);
    }
    await sleep(200);
  }
  return out;
}

/** 영어 문서들 → 자유 라이선스 대표 이미지 파일 이름(pageimages) */
async function pageImages(titles: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (let i = 0; i < titles.length; i += 50) {
    type R = {
      query?: {
        redirects?: { from: string; to: string }[];
        pages?: Record<string, { title: string; pageimage?: string }>;
      };
    };
    const res = await getJson<R>(
      "https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageimages&piprop=name&pilicense=free&titles=" +
        encodeURIComponent(titles.slice(i, i + 50).join("|")),
    );
    const back = new Map(
      (res?.query?.redirects ?? []).map((r) => [r.to, r.from]),
    );
    for (const p of Object.values(res?.query?.pages ?? {}))
      if (p.pageimage) out.set(back.get(p.title) ?? p.title, p.pageimage);
    await sleep(200);
  }
  return out;
}

/** 공용 파일들 → 크기·축소판 주소·라이선스 */
async function infos(files: string[]): Promise<Map<string, Info>> {
  const out = new Map<string, Info>();
  for (let i = 0; i < files.length; i += 40) {
    type R = {
      query?: {
        normalized?: { from: string; to: string }[];
        pages?: Record<string, { title: string; imageinfo?: Info[] }>;
      };
    };
    const res = await getJson<R>(
      "https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=1280&titles=" +
        encodeURIComponent(
          files
            .slice(i, i + 40)
            .map((f) => `File:${f}`)
            .join("|"),
        ),
    );
    const back = new Map(
      (res?.query?.normalized ?? []).map((n) => [n.to, n.from]),
    );
    for (const p of Object.values(res?.query?.pages ?? {})) {
      const ii = p.imageinfo?.[0];
      const name = (back.get(p.title) ?? p.title).replace(/^File:/, "");
      if (ii) out.set(name, ii);
    }
    await sleep(200);
  }
  return out;
}

async function download(url: string): Promise<Buffer> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if (res.status !== 429 || attempt >= 5)
      throw new Error(`받기 실패 ${res.status}: ${url}`);
    await sleep(5000 * attempt);
  }
}

/** 세 크기 WebP로 */
async function write(
  id: string,
  buf: Buffer,
): Promise<{ width: number; height: number }> {
  const img = sharp(buf, { animated: false }).rotate();
  const { width = 1, height = 1 } = await img.metadata();
  const tall = height > width * 1.15;
  await img
    .clone()
    .resize(400, 400, { fit: "cover", position: tall ? "top" : "attention" })
    .webp({ quality: 72 })
    .toFile(`${OUT}/${id}-s.webp`);
  if (width / height >= 1.5) {
    await img
      .clone()
      .resize(640, 360, { fit: "cover", position: "attention" })
      .webp({ quality: 72 })
      .toFile(`${OUT}/${id}-w.webp`);
  } else {
    // 세로·정사각 사진: 통째로 보이게 넣고 양옆은 같은 사진을 크게 흐려 채운다
    const bg = await img
      .clone()
      .resize(640, 360, { fit: "cover" })
      .blur(16)
      .modulate({ brightness: 0.85 })
      .toBuffer();
    const fg = await img.clone().resize(640, 360, { fit: "inside" }).toBuffer();
    await sharp(bg)
      .composite([{ input: fg, gravity: "center" }])
      .webp({ quality: 72 })
      .toFile(`${OUT}/${id}-w.webp`);
  }
  const l = await img
    .clone()
    .resize(960, 960, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 64 })
    .toFile(`${OUT}/${id}-l.webp`);
  return { width: l.width, height: l.height };
}

async function main() {
  const argv = process.argv.slice(2);
  const arg = (k: string) => {
    const i = argv.indexOf(`--${k}`);
    return i < 0 ? undefined : argv[i + 1];
  };
  const force = argv.includes("--force");
  const only = arg("only")?.split(",");
  const limit = Number(arg("limit") ?? Infinity);
  const cache: Record<string, PhotoMeta | null> = existsSync(CACHE)
    ? JSON.parse(readFileSync(CACHE, "utf8"))
    : {};
  mkdirSync(OUT, { recursive: true });

  const { events } = readEvents();
  const todo = events
    .filter((e) => e.wikipedia && (!only || only.includes(e.id)))
    .filter((e) => force || !(e.id in cache))
    .slice(0, limit);
  console.log(`사진 찾기: 사건 ${todo.length}건`);
  const titles = [...new Set(todo.map((e) => e.wikipedia!))];
  const qids = await resolveQids(titles);
  const fromWikidata = await p18([
    ...new Set([...qids.values()].filter((q): q is string => !!q)),
  ]);
  const fromPage = await pageImages(
    titles.filter(
      (t) =>
        !fromWikidata.has(qids.get(t) ?? "") ||
        NOT_PHOTO.test(fromWikidata.get(qids.get(t)!)!),
    ),
  );
  const fileOf = (title: string) =>
    [fromWikidata.get(qids.get(title) ?? ""), fromPage.get(title)].find(
      (f) => f && !NOT_PHOTO.test(f),
    );
  const files = [
    ...new Set(titles.map(fileOf).filter((f): f is string => !!f)),
  ];
  const info = await infos(files);

  let ok = 0;
  const skipped: string[] = [];
  for (const e of todo) {
    const file = fileOf(e.wikipedia!);
    const ii = file ? info.get(file) : undefined;
    const meta = ii?.extmetadata ?? {};
    const license = stripHtml(meta.LicenseShortName?.value ?? "");
    if (!file || !ii) {
      cache[e.id] = null;
      continue;
    }
    if (!FREE.test(license)) {
      skipped.push(`${e.id}: ${license || "라이선스 모름"} (${file})`);
      cache[e.id] = null;
      continue;
    }
    let size: { width: number; height: number };
    try {
      size = await write(e.id, await download(ii.thumburl || ii.url));
    } catch (err) {
      skipped.push(`${e.id}: ${(err as Error).message}`);
      continue;
    }
    cache[e.id] = {
      file,
      author:
        stripHtml(meta.Artist?.value ?? "") ||
        stripHtml(meta.Credit?.value ?? "") ||
        "Wikimedia Commons",
      license,
      licenseUrl: meta.LicenseUrl?.value,
      source: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, "_"))}`,
      ...size,
    };
    ok++;
    writeFileSync(CACHE, JSON.stringify(cache, null, 1));
    await sleep(150);
  }
  writeFileSync(CACHE, JSON.stringify(cache, null, 1));
  console.log(`사진 ${ok}건 받음 → public/photos, content/photos.json`);
  for (const s of skipped) console.log(`  건너뜀 ${s}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
