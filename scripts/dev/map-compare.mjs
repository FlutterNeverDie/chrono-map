// 지도 그리기 교체(SVG → WebGL) 전후 비교 사진. 같은 화면·연도·테마·언어를 정확히 맞춰 찍는다(개발 서버의 window.__mapView).
// 의존성 없이 설치된 Chrome을 직접 조종한다(DevTools 프로토콜). Node 20은 --experimental-websocket 필요.
//
//   npm run dev 를 띄운 뒤
//   node --experimental-websocket scripts/dev/map-compare.mjs shoot <폴더> [--query gl] [--url http://localhost:3000] [--only 이름,이름]
//     → <폴더>/<경우>.png
//   node scripts/dev/map-compare.mjs page <전 폴더> <후 폴더> [결과.html]
//     → 나란히 놓고 브라우저에서 차이(다른 화소 %·차이 그림)를 계산해 보여 주는 HTML(로컬 파일, 올리지 않음)
import { spawn } from "node:child_process";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { basename, join, relative, resolve, dirname } from "node:path";
import { tmpdir } from "node:os";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const VIEWPORTS = {
  desk: { width: 1440, height: 900, dpr: 1, mobile: false },
  phone: { width: 390, height: 844, dpr: 2, mobile: true },
};
const YEARS = [-500, 800, 1223, 1600, 1914, 1945, 2020];
/** 비교할 경우들: 이름 → 언어·테마·화면(경도·위도·배율·기울기·방향)·연도 */
function cases() {
  const out = [];
  const world = { lon: 60, lat: 35, zoom: 1, tilt: 0, heading: 0 };
  for (const vp of Object.keys(VIEWPORTS)) {
    for (const year of YEARS)
      out.push({ name: `${vp}-${year}`, vp, year, view: world });
    out.push({ name: `${vp}-zoom4-1600`, vp, year: 1600, view: { lon: 10, lat: 48, zoom: 4, tilt: 0, heading: 0 } });
    out.push({ name: `${vp}-zoom10-1914`, vp, year: 1914, view: { lon: 20, lat: 44, zoom: 10, tilt: 0, heading: 0 } });
    out.push({ name: `${vp}-tilt-1223`, vp, year: 1223, view: { lon: 37, lat: 47, zoom: 3, tilt: 45, heading: 30 } });
    out.push({ name: `${vp}-dark-1914`, vp, year: 1914, theme: "dark", view: world });
    out.push({ name: `${vp}-dark-2020`, vp, year: 2020, theme: "dark", view: { lon: 120, lat: 30, zoom: 2.5, tilt: 0, heading: 0 } });
    out.push({ name: `${vp}-en-1914`, vp, year: 1914, locale: "en", view: { lon: 0, lat: 40, zoom: 2, tilt: 0, heading: 0 } });
    out.push({ name: `${vp}-ar-1945`, vp, year: 1945, locale: "ar", view: { lon: 40, lat: 28, zoom: 2.5, tilt: 0, heading: 0 } });
  }
  return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i < 0 ? d : process.argv[i + 1];
};

async function chrome() {
  const port = 9600 + Math.floor(Math.random() * 300);
  const proc = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, "--hide-scrollbars", `--user-data-dir=${join(tmpdir(), `map-compare-${Date.now()}`)}`, "about:blank"], { stdio: "ignore" });
  let ws;
  for (let i = 0; i < 160 && !ws; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const page = list.find((t) => t.type === "page");
      if (page) ws = new WebSocket(page.webSocketDebuggerUrl);
    } catch {}
    if (!ws) await sleep(250);
  }
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const pending = new Map();
  const errors = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.method === "Runtime.exceptionThrown") errors.push(d.params.exceptionDetails.exception?.description?.slice(0, 200));
    if (pending.has(d.id)) {
      pending.get(d.id)(d.result ?? { error: d.error });
      pending.delete(d.id);
    }
  };
  const send = (method, params = {}) =>
    new Promise((r) => {
      const i = ++id;
      pending.set(i, r);
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  const ev = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }))?.result?.value;
  await send("Page.enable");
  await send("Runtime.enable");
  return { send, ev, errors, close: () => proc.kill() };
}

async function shoot(dir) {
  const base = arg("url", "http://localhost:3000");
  const query = arg("query", "");
  const only = arg("only")?.split(",");
  await mkdir(dir, { recursive: true });
  const c = await chrome();
  const list = cases().filter((x) => !only || only.includes(x.name));
  for (const cs of list) {
    const vp = VIEWPORTS[cs.vp];
    await c.send("Emulation.setDeviceMetricsOverride", { width: vp.width, height: vp.height, deviceScaleFactor: vp.dpr, mobile: vp.mobile });
    await c.send("Emulation.setTouchEmulationEnabled", { enabled: vp.mobile });
    // 시간대는 고정(첫 시점 고르기가 기기 시간대를 따라서)
    await c.send("Emulation.setTimezoneOverride", { timezoneId: "Asia/Seoul" });
    const theme = cs.theme ?? "light";
    const { identifier } = await c.send("Page.addScriptToEvaluateOnNewDocument", {
      source: `try{localStorage.setItem("theme",${JSON.stringify(theme)});localStorage.setItem("gaugeHint","1");localStorage.setItem("viewHint","1")}catch(e){}`,
    });
    const url = `${base}${cs.locale ? `/${cs.locale}` : ""}/${query ? `?${query}` : ""}`;
    await c.send("Page.navigate", { url });
    // 지도 조작 통로가 열릴 때까지
    for (let i = 0; i < 120 && !(await c.ev("!!window.__mapView")); i++) await sleep(250);
    const ok = await c.ev(`(async()=>{const v=window.__mapView;v.apply(${JSON.stringify({ ...cs.view, year: cs.year })});
      const t0=performance.now();while(!v.ready()){if(performance.now()-t0>20000)return false;await new Promise(r=>setTimeout(r,50))}
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return true})()`);
    // 글꼴·지도 그림(굽기) 자리 잡을 시간
    await sleep(1200);
    const shot = await c.send("Page.captureScreenshot", { format: "png" });
    await writeFile(join(dir, `${cs.name}.png`), Buffer.from(shot.data, "base64"));
    await c.send("Page.removeScriptToEvaluateOnNewDocument", { identifier });
    console.log(`${ok ? "찍음" : "다 그리지 못함(20초)"} ${cs.name}`);
  }
  if (c.errors.length) console.log("페이지 오류:\n" + [...new Set(c.errors)].join("\n"));
  c.close();
}

async function page(a, b, out) {
  const names = (await readdir(a)).filter((f) => f.endsWith(".png")).sort();
  const file = resolve(out ?? join(dirname(resolve(b)), "compare.html"));
  const rel = (d, n) => relative(dirname(file), join(resolve(d), n));
  const rows = names
    .map(
      (n) => `<section><h2>${basename(n, ".png")} <span class="diff" data-n="${n}"></span></h2>
<div class="row"><figure><img src="${rel(a, n)}"><figcaption>전 (${basename(resolve(a))})</figcaption></figure>
<figure><img src="${rel(b, n)}" onerror="this.closest('figure').classList.add('none')"><figcaption>후 (${basename(resolve(b))})</figcaption></figure>
<figure><canvas></canvas><figcaption>차이(빨강 = 다른 화소)</figcaption></figure></div></section>`,
    )
    .join("\n");
  const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>지도 전후 비교</title>
<style>
:root{--bg:#f6f1e4;--fg:#2b2418;--line:#d8cfba}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#14161a;--fg:#e8e2d4;--line:#333}}
:root[data-theme=dark]{--bg:#14161a;--fg:#e8e2d4;--line:#333}
body{margin:0;padding:16px;background:var(--bg);color:var(--fg);font:15px system-ui}
h1{font-size:20px}h2{font-size:15px;margin:24px 0 8px}
.row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
figure{margin:0}img,canvas{width:100%;border:1px solid var(--line);display:block}
figcaption{font-size:13px;opacity:.7;margin-top:4px}.none img{display:none}.none::before{content:"후 사진 없음";display:block;padding:40px;border:1px dashed var(--line)}
.diff{font-weight:600}.bad{color:#c2410c}
</style>
<h1>지도 전후 비교</h1><p>같은 화면·연도·테마·언어. 차이는 화소마다 RGB 차이가 24를 넘는 곳.</p>
${rows}
<script>
document.querySelectorAll("section").forEach(async (sec)=>{
  const [a,b]=sec.querySelectorAll("img");const cv=sec.querySelector("canvas");const tag=sec.querySelector(".diff");
  const load=(img)=>img.complete&&img.naturalWidth?Promise.resolve():new Promise((r,j)=>{img.onload=r;img.onerror=j});
  try{await load(a);await load(b)}catch{tag.textContent="(후 없음)";return}
  const w=a.naturalWidth,h=a.naturalHeight;cv.width=w;cv.height=h;const g=cv.getContext("2d");
  const px=(img)=>{g.drawImage(img,0,0,w,h);return g.getImageData(0,0,w,h).data};
  const A=px(a),B=px(b);const out=g.createImageData(w,h);let n=0;
  for(let i=0;i<A.length;i+=4){const d=Math.max(Math.abs(A[i]-B[i]),Math.abs(A[i+1]-B[i+1]),Math.abs(A[i+2]-B[i+2]));
    const gray=(A[i]+A[i+1]+A[i+2])/3*0.35+160;
    if(d>24){n++;out.data[i]=230;out.data[i+1]=40;out.data[i+2]=30}else{out.data[i]=out.data[i+1]=out.data[i+2]=gray}out.data[i+3]=255}
  g.putImageData(out,0,0);const pct=n/(w*h)*100;tag.textContent="다른 화소 "+pct.toFixed(2)+"%";if(pct>1)tag.classList.add("bad");
});
</script></html>`;
  await writeFile(file, html);
  console.log(file);
}

const [cmd, ...rest] = process.argv.slice(2).filter((x, i, all) => !x.startsWith("--") && !(all[i - 1] ?? "").startsWith("--"));
if (cmd === "shoot") await shoot(rest[0]);
else if (cmd === "page") await page(rest[0], rest[1], rest[2]);
else console.log("사용: shoot <폴더> [--query gl] | page <전> <후> [결과.html]");
process.exit(0);
