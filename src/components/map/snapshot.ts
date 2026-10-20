/**
 * 지도 svg를 그림 한 장(canvas)으로 굽는다 - 휴대폰에서 확대·끌기 동안 svg 대신 늘리고 옮길 그림.
 * 아이폰(WebKit)은 svg를 CSS transform으로 늘려도 국경 수백 개를 계속 처리해 핀치·끌기가 밀렸다. 그림(canvas)은 그래픽 칩이 늘리기만 한다.
 * 그림에는 페이지 CSS가 없으므로 CSS 변수(`var(--map-land)` 등)는 지금 테마 값으로 바꿔 넣는다.
 */
export async function rasterizeSvg(
  svg: SVGSVGElement,
  /** 그릴 범위(지도 좌표) */
  box: { x: number; y: number; w: number; h: number },
  /** 그림 크기(CSS px)와 해상도 배율 */
  size: { w: number; h: number; scale: number },
  /** 복제본 손질(복사본 더 붙이기, 숨긴 것 빼기 등) */
  prepare?: (clone: SVGSVGElement) => void,
  /** 다시 쓸 canvas - 아이폰은 canvas 메모리 한도가 있어 새로 만들기보다 하나를 계속 쓴다 */
  reuse?: HTMLCanvasElement,
  /** 그리기 직전에 true면 그만둔다(그리기는 화면을 잠깐 멈추므로 확대·끌기 중에는 하지 않음) */
  abort?: () => boolean,
): Promise<HTMLCanvasElement | null> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("viewBox", `${box.x} ${box.y} ${box.w} ${box.h}`);
  clone.setAttribute("width", String(size.w));
  clone.setAttribute("height", String(size.h));
  clone.removeAttribute("style");
  clone.removeAttribute("class");
  prepare?.(clone);
  // 그림에 필요 없는 것(툴팁 글자, data-* 속성)은 빼서 글자로 바꾸는 양을 줄인다
  clone.querySelectorAll("title").forEach((n) => n.remove());
  for (const el of clone.querySelectorAll("*"))
    for (const name of el.getAttributeNames())
      if (name.startsWith("data-")) el.removeAttribute(name);
  // svg 자신의 값(--px 등)까지 보이게 svg 기준으로 읽는다(테마 변수는 상속돼 함께 보임)
  const root = getComputedStyle(svg);
  const text = new XMLSerializer()
    .serializeToString(clone)
    .replace(
      /var\((--[\w-]+)\)/g,
      (_, name: string) => root.getPropertyValue(name).trim() || "none",
    )
    // calc(0.35 + 0.3)·calc(0.6 * 0.12) 같은 숫자 계산은 미리 (그림 안 svg에서 안 먹을 수 있어서)
    .replace(
      /calc\(([\d.]+) ([+*]) ([\d.]+)\)/g,
      (_, a: string, op: string, b: string) =>
        String(op === "+" ? Number(a) + Number(b) : Number(a) * Number(b)),
    );
  const url = URL.createObjectURL(new Blob([text], { type: "image/svg+xml" }));
  try {
    // decode()는 Safari가 svg 그림에서 실패할 때가 있어 load를 기다린다
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    if (abort?.()) return null;
    const canvas = reuse ?? document.createElement("canvas");
    canvas.width = Math.round(size.w * size.scale);
    canvas.height = Math.round(size.h * size.scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
