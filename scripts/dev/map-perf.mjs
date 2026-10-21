// 지도 손짓 성능(휴대폰 크기 390×844, CPU 4배 느림 - 아이폰 근사). 같은 화면에서 끌기·핀치·비틀기·기울이기의 프레임 간격을 잰다.
//   npm run dev 를 띄운 뒤
//   node --experimental-websocket scripts/dev/map-perf.mjs [--query svg] [--url http://localhost:3000] [--cpu 4] [--home] [--path maps/epidemics]
// --path: 다른 지도(주제·전쟁 지도 - svg 판은 공용 useMapViewport의 svg에 손짓). 첫 화면 그대로 잰다(--home처럼)
// 손짓 코드는 map-gestures.js(WebKit에서도 같은 코드로 잰다)
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i < 0 ? d : process.argv[i + 1];
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const gestures = await readFile(join(dirname(fileURLToPath(import.meta.url)), "map-gestures.js"), "utf8");

const port = 9700 + Math.floor(Math.random() * 200);
const proc = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), `map-perf-${Date.now()}`)}`, "about:blank"], { stdio: "ignore" });
let ws;
for (let i = 0; i < 160 && !ws; i++) {
  try {
    const page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page");
    if (page) ws = new WebSocket(page.webSocketDebuggerUrl);
  } catch {}
  if (!ws) await sleep(250);
}
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (pending.has(d.id)) {
    pending.get(d.id)(d.result);
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
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
await send("Emulation.setTouchEmulationEnabled", { enabled: true });
await send("Emulation.setTimezoneOverride", { timezoneId: "Asia/Seoul" });
await send("Page.addScriptToEvaluateOnNewDocument", { source: `try{localStorage.setItem("gaugeHint","1");localStorage.setItem("viewHint","1")}catch(e){}` });
const query = arg("query", "");
const path = arg("path", "");
await send("Page.navigate", { url: `${arg("url", "http://localhost:3000")}/${path}${query ? `?${query}` : ""}` });
// --home: 첫 화면 그대로(운영 빌드처럼 화면 맞추기 통로가 없을 때, 처음 확대할 때 자세한 해안선으로 바뀌는 것까지 잰다)
if (process.argv.includes("--home") || path) await sleep(8000);
else {
  for (let i = 0; i < 120 && !(await ev("!!window.__mapView")); i++) await sleep(250);
  await ev(`(async()=>{const v=window.__mapView;v.apply({lon:20,lat:46,zoom:2.5,tilt:0,heading:0,year:1914});
  while(!v.ready())await new Promise(r=>setTimeout(r,50))})()`);
}
// 지도 그림 굽기(SVG 지도) 끝날 시간
await sleep(2500);
await send("Emulation.setCPUThrottlingRate", { rate: Number(arg("cpu", "4")) });
await ev(gestures);
const result = await ev("window.__measureGestures()");
console.log(`Chrome 휴대폰 CPU ${arg("cpu", "4")}배 느림 /${path}${query ? ` (?${query})` : ""}`);
console.log("손짓\t프레임\t중간\t90%\t최대\t50ms 넘음");
for (const r of result) console.log(`${r.name}\t${r.frames}\t${r.p50}ms\t${r.p90}ms\t${r.max}ms\t${r.over50}`);
proc.kill();
process.exit(0);
