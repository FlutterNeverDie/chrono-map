// 지도 손짓 성능 재기 - 페이지 안에서 돈다(Chrome·WebKit 같은 코드). map-perf.mjs가 넣고 window.__measureGestures()를 부른다.
// 손가락을 흉내 낸 pointer 이벤트를 프레임마다 보내고, 그동안 + 손을 뗀 뒤 0.6초(다시 그리기)의 프레임 간격을 잰다.
(() => {
  // 흉내 낸 pointer는 브라우저가 잡을 수 없어(setPointerCapture가 오류) 재는 동안만 비운다
  Element.prototype.setPointerCapture = function () {};
  Element.prototype.releasePointerCapture = function () {};
  const frame = () => new Promise((r) => requestAnimationFrame(r));
  const fire = (el, type, id, x, y) =>
    el.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: id,
        pointerType: "touch",
        isPrimary: id === 1,
        clientX: x,
        clientY: y,
        button: 0,
        buttons: type === "pointerup" ? 0 : 1,
      }),
    );
  async function run(name, el, points) {
    // points(k: 0~1) → [[x,y], …] 손가락마다
    const times = [];
    let go = true;
    (async () => {
      while (go) times.push(await frame());
    })();
    const start = points(0);
    start.forEach(([x, y], i) => fire(el, "pointerdown", i + 1, x, y));
    const N = 60;
    for (let s = 1; s <= N; s++) {
      await frame();
      points(s / N).forEach(([x, y], i) => fire(el, "pointermove", i + 1, x, y));
    }
    const end = points(1);
    end.forEach(([x, y], i) => fire(el, "pointerup", i + 1, x, y));
    await new Promise((r) => setTimeout(r, 600));
    go = false;
    const d = times.slice(1).map((t, i) => t - times[i]).sort((a, b) => a - b);
    const q = (p) => Math.round(d[Math.min(d.length - 1, Math.floor(d.length * p))]);
    return { name, frames: d.length, p50: q(0.5), p90: q(0.9), max: Math.round(d[d.length - 1] ?? 0), over50: d.filter((x) => x > 50).length };
  }
  window.__measureGestures = async () => {
    const el = (document.querySelector("[data-map-frame]") ?? document.querySelector("svg.touch-none"));
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height * 0.45;
    const out = [];
    await new Promise((res) => setTimeout(res, 300));
    out.push(await run("끌기", el, (k) => [[cx + 120 - k * 240, cy + 40 - k * 80]]));
    out.push(await run("핀치(확대)", el, (k) => [[cx - 30 - k * 90, cy], [cx + 30 + k * 90, cy]]));
    out.push(await run("핀치(축소)", el, (k) => [[cx - 120 + k * 90, cy], [cx + 120 - k * 90, cy]]));
    out.push(await run("비틀기(회전)", el, (k) => {
      const a = (k * 60 * Math.PI) / 180;
      return [[cx - 90 * Math.cos(a), cy - 90 * Math.sin(a)], [cx + 90 * Math.cos(a), cy + 90 * Math.sin(a)]];
    }));
    out.push(await run("두 손가락 기울이기", el, (k) => [[cx - 80, cy + 60 - k * 140], [cx + 80, cy + 60 - k * 140]]));
    out.push(await run("끌기(돌리고 기울인 뒤)", el, (k) => [[cx - 100 + k * 200, cy - k * 60]]));
    return out;
  };
})();
