import type { Scene } from "./sceneData";

/**
 * 인물 얼굴 메달용 그림(장면 units[].face·markers kind "face"): RMW `public/chars/<id>/<표정>/`의 겹 SVG(600×720 - 몸·머리·눈·입)를
 * 한 장으로 합쳐 머리 둘레 정사각형으로 자른 PNG(data URL). 장면을 불러올 때 다 만들어 두고(load가 기다림) 그릴 때는 그대로 쓴다 -
 * 화면 층 svg를 그림으로 구울 때 바깥 주소는 읽히지 않아 data URL이어야 한다. 파일은 RMW 캡처가 /__chars/로 가로채 준다
 */
const LAYERS = ["body", "head", "eyes0", "mouth0"];
const SIZE = 256;

/** 메달 하나의 열쇠(캐릭터/표정) */
export const faceKey = (char: string, mood = "front") => `${char}/${mood}`;

function loadSvg(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error(`얼굴 그림을 못 받음: ${url}`));
    img.src = url;
  });
}

/** 겹을 합쳐 머리(head 겹의 그려진 범위) 둘레 정사각형으로 자른다 */
async function portrait(char: string, mood: string): Promise<string> {
  const base = `/__chars/${char}/${mood}/`;
  const imgs = await Promise.all(LAYERS.map((l) => loadSvg(`${base}${l}.svg`)));
  const W = 600;
  const H = 720;
  const full = document.createElement("canvas");
  full.width = W;
  full.height = H;
  const g = full.getContext("2d", { willReadFrequently: true })!;
  // 머리 범위: head 겹만 먼저 그려 투명하지 않은 곳을 잰다
  g.drawImage(imgs[1], 0, 0, W, H);
  const px = g.getImageData(0, 0, W, H).data;
  let [x0, y0, x1, y1] = [W, H, 0, 0];
  for (let y = 0; y < H; y += 2)
    for (let x = 0; x < W; x += 2)
      if (px[(y * W + x) * 4 + 3] > 40) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
  if (x1 <= x0) [x0, y0, x1, y1] = [150, 60, 450, 420];
  g.clearRect(0, 0, W, H);
  for (const img of imgs) g.drawImage(img, 0, 0, W, H);
  // 머리 전체(투구·모자 끝까지)가 둥근 메달 안에 들고 어깨가 아래로 조금 보이게
  const side = Math.max(x1 - x0, y1 - y0) * 1.38;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2 + side * 0.05;
  const out = document.createElement("canvas");
  out.width = SIZE;
  out.height = SIZE;
  out
    .getContext("2d")!
    .drawImage(
      full,
      cx - side / 2,
      cy - side / 2,
      side,
      side,
      0,
      0,
      SIZE,
      SIZE,
    );
  return out.toDataURL("image/png");
}

/** 장면에 나오는 얼굴을 모두 만든다(열쇠 → data URL) */
export async function prepareFaces(
  scene: Scene,
): Promise<Record<string, string>> {
  const want = new Map<string, [string, string]>();
  for (const u of scene.units ?? []) {
    if (!u.face) continue;
    const f = typeof u.face === "string" ? { char: u.face } : u.face;
    want.set(faceKey(f.char, f.mood), [f.char, f.mood ?? "front"]);
  }
  for (const m of scene.markers ?? [])
    if (m.kind === "face" && m.char)
      want.set(faceKey(m.char, m.mood), [m.char, m.mood ?? "front"]);
  const out: Record<string, string> = {};
  await Promise.all(
    [...want].map(async ([key, [char, mood]]) => {
      out[key] = await portrait(char, mood);
    }),
  );
  return out;
}
