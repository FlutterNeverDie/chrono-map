// 원본(Cliopatria) 국경의 도형·연도 오류 바로잡기 — 본 지도(scripts/build-borders.mjs)와
// 전쟁 지도(scripts/campaigns/borders.ts)가 같이 쓴다. 고칠 것은 아래 POLITY_FIXES 한 곳에만 적는다.
//
// 이름(원본 Name)은 여기서 바꾸면 화면 이름표 열쇠(n)와 전쟁 지도 진영(content/campaigns/<id>/sides.txt)도 바뀐다.
// 이름만 틀린 것은 content/polity-names/에서 고친다(n은 그대로).
import mapshaper from "mapshaper";
import { geoArea, geoCentroid, geoContains } from "d3-geo";

// ── 아라비아 남·동부 영국 보호령 (원본은 영국 도형에 아덴·오만·휴전국가·카타르·바레인·쿠웨이트를 넣어 둠) ──
// 경계 꼭짓점은 원본 1954년 도형(아덴 보호령·무스카트 오만·휴전국가가 따로 그려진 마지막 해)에서 가져왔고,
// 바다 쪽은 넉넉히 둘러 해안선 조각이 남지 않게 했다. 1956~1968년 원본은 이 셋을 한 조각으로 합쳐 둔다.
/** 아덴(식민지+보호령, 오늘날 남예멘): 오만 도파르와의 경계(원본 1954년 꼭짓점)에서 서쪽. 남쪽 12°N·서쪽 43.3°E는 영국령 소말릴란드·에리트레아를 피한 선 */
const ADEN = [
  [
    [43.3, 12],
    [56, 12],
    [56, 14],
    [53.6, 16.3],
    [53.22, 16.68],
    [52.83, 17.39],
    [52.83, 17.45],
    [52.5, 17.96],
    [52.51, 18.16],
    [52.13, 18.93],
    [51.5, 20],
    [43.3, 20],
    [43.3, 12],
  ],
];
/** 휴전국가(오늘날 아랍에미리트)와 오만의 경계(원본 1954년 꼭짓점, 남서 → 북). 동해안 일부·북쪽 끝은 바다 쪽 점 */
const TRUCIAL_BORDER = [
  [54.92, 22.53],
  [55.3, 22.66],
  [55.35, 23.3],
  [55.61, 23.69],
  [55.56, 23.94],
  [56.02, 24.07],
  [55.82, 24.39],
  [55.85, 24.71],
  [55.86, 24.78],
  [55.95, 24.97],
  [56.1, 24.91],
  [56.08, 24.78],
  [56.23, 24.78],
  [56.4, 24.97],
  [56.41, 25.04],
  [56.6, 25.1],
  [56.6, 25.6],
  [56.39, 25.62],
  [56.28, 26],
  [56.07, 26.07],
  [55.9, 26.3],
];
/** 휴전국가: 위 경계 + 서쪽(카타르 남쪽 끝 24.45°N 아래까지 51.6°E) — 무산담(오만)은 밖 */
const TRUCIAL = [
  [
    [51.6, 22],
    ...TRUCIAL_BORDER,
    [51.75, 26.3],
    [51.75, 24.45],
    [51.6, 24.45],
    [51.6, 22],
  ],
];
/** 무스카트 오만: 아라비아 동부에서 휴전국가를 뺀 곳(아덴은 먼저 떼어 낸다). 서쪽 끝 51.75°E는 카타르 동쪽 */
const OMAN = [
  [
    [51.75, 15],
    [61, 15],
    [61, 27],
    [55.9, 27],
    ...[...TRUCIAL_BORDER].reverse(),
    [51.75, 22],
    [51.75, 15],
  ],
];
/** 1955년까지 아덴은 따로 떨어진 조각이라 통째로(소코트라·쿠리아무리아 포함). 원본 연도마다 오만 경계가 조금씩 달라 자르면 부스러기가 남는다 */
const ADEN_BOX = [43.3, 12, 55, 19.5];
/** 1920~1955년 원본 영국 도형에 들어 있는 무스카트 일대(오만의 수도) */
const MUSCAT = [58, 22.8, 59.6, 23.9];
const QATAR_BAHRAIN = [50, 24, 51.5, 27];
const KUWAIT = [46.5, 28.5, 48.6, 30.2];
const BERLIN = [13, 52, 14, 53];
const SURINAME = [-59, 1, -53, 7];
/** 영국 본국과 그 위에 겹친 제국 층 — 아라비아 보호령 고치기는 둘 다 같게. 제국 층이 먼저(1880년대엔 본국 도형에 아덴 시내만 있다) */
const UK_LAYERS = ["(British Empire)", "United Kingdom"];

/**
 * 원본 이름 기준. 연도는 소수 가능(1962.5 = 1962년 7월): 전쟁 지도는 월 단위라 독립·병합 시점을 달까지 맞춘다.
 *
 * - rename: [from, until) 기간의 도형을 다른 나라로 본다(도형은 그대로, 원본 이름·위키 문서만 바꿈). 연 단위.
 *   경계 연도를 걸치는 원본 도형은 둘로 나눈다.
 * - split: [from, until) 기간 스냅샷에서 name 나라의 일부를 떼어 낸다.
 *   box([서, 남, 동, 북])는 중심이 상자 안인 조각(섬·떨어진 땅)을 통째로, clip(다각형 링 배열, 구멍 가능)은 도형을 실제로 잘라 낸다.
 *   into 나라가 그 스냅샷에 없으면 떼어 낸 땅으로 만들고(wikipedia: 원본에 없는 새 이름의 영어 위키백과 문서), 있으면 버린다
 *   (merge면 그 나라에 붙인다 - 원본에서 그 나라 도형에 구멍이 나 있는 경우).
 *   위에서부터 차례로 적용한다(아덴을 먼저 떼어야 오만 자르기에 섞이지 않는다).
 * - labelAt: 이름표 위치 고정(그 점이 도형 안일 때만) - 본토 대신 해외 영토에 이름이 붙던 것
 * - noLabel: 그 해부터 이름표를 달지 않는 겹친 층(나라가 아니거나, 본국과 이름표 자리를 다투는 것)
 */
export const POLITY_FIXES = {
  rename: [
    // 1801 연합법 이후는 연합왕국. 원본은 2024년까지 "Great Britain"
    {
      name: "Kingdom of Great Britain",
      from: 1801,
      to: "United Kingdom",
      wikipedia: "United Kingdom",
    },
    // 원본의 1947~1955년 "Qatar Protectorate" 도형은 실제로는 무스카트 오만(카타르는 반도 쪽 다른 곳)
    {
      name: "Qatar Protectorate",
      to: "Sultanate of Muscat and Oman",
      wikipedia: "Muscat and Oman",
    },
    // 말리 연방은 1960년에 해체. 원본은 오늘날 말리까지 같은 이름
    {
      name: "Mali Federation",
      from: 1961,
      to: "Republic of Mali",
      wikipedia: "Mali",
    },
    // 네덜란드령 안틸레스는 1954년에 생김. 그 전 섬들은 퀴라소와 그 속령(수리남은 아래 split에서 따로)
    {
      name: "Netherlands Antilles",
      until: 1954,
      to: "Curaçao and Dependencies",
      wikipedia: "Curaçao and Dependencies",
    },
    // 원본은 유방의 한(漢, 기원전 206~203)을 전국시대 한(韓) 문서에 이어 둠 → 이어지는 한나라와 같은 나라로
    {
      name: "Han",
      from: -206,
      until: -202,
      to: "Han Dynasty",
      wikipedia: "Han dynasty",
    },
  ],
  split: [
    // 원본은 1961~2023년 프랑스 도형에 알제리를 넣어 둠(독립 1962-07). 1962년 스냅샷엔 알제리 도형이 없어 떼어 낸 조각으로 만든다
    // (전쟁 지도 알제리 전쟁은 1962-03에 끝나므로 1962년 스냅샷도 프랑스령 알제리)
    {
      name: "French Fifth Republic",
      from: 1962.5,
      box: [-10, 18, 13, 38],
      into: "People's Democratic Republic of Algeria",
    },
    {
      name: "French Fifth Republic",
      from: 1977.5,
      box: [41, 10, 44, 13],
      into: "Republic of Djibouti",
    }, // 독립 1977-06
    // 아덴(1880~1967, 독립 1967-11 → 남예멘. 원본 남예멘은 1969년부터). 1956~1968년 원본은 오만·휴전국가와 한 조각이라 실제로 자른다
    ...UK_LAYERS.flatMap((name) => [
      {
        name,
        from: 1880,
        until: 1956,
        box: ADEN_BOX,
        into: "Aden Protectorate",
        wikipedia: "Aden Protectorate",
      },
      {
        name,
        from: 1956,
        until: 1967.9,
        clip: ADEN,
        into: "Aden Protectorate",
        wikipedia: "Aden Protectorate",
      },
      {
        name,
        from: 1967.9,
        until: 1969,
        clip: ADEN,
        into: "People's Democratic Republic of Yemen",
      },
      { name, from: 1969, clip: ADEN }, // 그 뒤 원본 영국에 남은 부스러기
    ]),
    // 1920~1955년 원본 영국 도형의 무스카트 일대는 오만에 붙인다
    ...UK_LAYERS.map((name) => ({
      name,
      until: 1956,
      box: MUSCAT,
      into: "Sultanate of Muscat and Oman",
      merge: true,
    })),
    // 무스카트 오만은 영국령이 아님(1956~1972년 원본이 영국 도형에 합쳐 둠). 1970년 7월부터 오만 술탄국
    ...UK_LAYERS.map((name) => ({
      name,
      from: 1956,
      until: 1970.6,
      clip: OMAN,
      into: "Sultanate of Muscat and Oman",
    })),
    ...UK_LAYERS.map((name) => ({
      name,
      from: 1970.6,
      clip: OMAN,
      into: "Sultanate of Oman",
    })),
    // 휴전국가는 1971-12까지 영국 보호령, 그 뒤 아랍에미리트. 카타르·바레인은 1971년 독립
    ...UK_LAYERS.map((name) => ({
      name,
      from: 1971.9,
      clip: TRUCIAL,
      into: "United Arab Emirates",
    })),
    ...UK_LAYERS.map((name) => ({ name, from: 1971.7, box: QATAR_BAHRAIN })),
    // 쿠웨이트 독립 1961-06 (원본은 1968년까지 영국 도형에 남김, State of Kuwait는 따로 있음)
    ...UK_LAYERS.map((name) => ({
      name,
      from: 1961.5,
      box: KUWAIT,
      into: "State of Kuwait",
    })),
    // 키프로스(독립 1960-08)·몰타(1964-09)도 원본은 1968년까지 영국 도형에 남김
    ...UK_LAYERS.flatMap((name) => [
      {
        name,
        from: 1960.6,
        box: [32, 34.4, 34.7, 35.8],
        into: "Republic of Cyprus",
      },
      { name, from: 1964.7, box: [14.1, 35.7, 14.7, 36.1], into: "Malta" },
    ]),
    // 수리남: 1820~1975년 원본은 네덜란드령 안틸레스(섬들)와 한 나라로 둠 → 네덜란드령 수리남, 독립(1975-11) 뒤 수리남 공화국
    ...["Curaçao and Dependencies", "Netherlands Antilles"].flatMap((name) => [
      {
        name,
        until: 1975.9,
        box: SURINAME,
        into: "Dutch Suriname",
        wikipedia: "Surinam (Dutch colony)",
      },
      {
        name,
        from: 1975.9,
        box: SURINAME,
        into: "Republic of Suriname",
      },
    ]),
    // 카빈다(앙골라, 1975-11)가 포르투갈 도형에 2023년까지 남아 있던 것
    {
      name: "Estado Novo",
      from: 1975.9,
      box: [11, -7, 14, -4],
      into: "People's Republic of Angola",
    },
    // 서베를린 점령 구역은 1990년까지
    { name: "United Kingdom", from: 1990.8, box: BERLIN },
    { name: "French Fifth Republic", from: 1990.8, box: BERLIN },
  ],
  labelAt: {
    "United Kingdom": [-1.6, 53.1], // 1956~2022년 이름표가 아라비아(아덴·오만)에 붙던 것
    "French Fifth Republic": [2.4, 46.7], // 1958~1960년 사하라, 1962~2022년 알제리에 붙던 것
    "Estado Novo": [-8.2, 39.5], // 포르투갈 본토 대신 모잠비크에 붙던 것
    // 떼어 낸 아덴은 이름이 길어 가운데에 두면 북예멘 이름표를 밀어낸다 → 동쪽(하드라마우트)으로. 북예멘·오만 이름표와 같이 보이는 자리(이름표 시뮬레이션으로 고름)
    "Aden Protectorate": [50, 15.4],
  },
  noLabel: {
    // 2000년 이후 영국 위에 겹친 층. 영국보다 넓어서 영국 이름표 자리를 차지했다
    "(Commonwealth of Nations)": -Infinity,
    // 탈식민 이후(남은 해외 영토뿐)에는 영국 이름표와 겹치기만 한다
    "(British Empire)": 1969,
  },
};

const active = (fix, t) =>
  t >= (fix.from ?? -Infinity) && t < (fix.until ?? Infinity);

/**
 * rename을 원본 도형 목록에 적용(제자리 수정). labels는 도형과 같은 순서의 이름표 위치 목록 - 나눈 도형만큼 같이 늘린다.
 * Name·FromYear·ToYear·Wikipedia 속성을 쓴다.
 */
export function applyRenames(features, labels) {
  for (const fix of POLITY_FIXES.rename) {
    const from = fix.from ?? -Infinity;
    const until = fix.until ?? Infinity;
    const n = features.length;
    for (let i = 0; i < n; i++) {
      const p = features[i].properties;
      if (p.Name !== fix.name || p.ToYear < from || p.FromYear >= until)
        continue;
      const renamed = { ...p, Name: fix.to, Wikipedia: fix.wikipedia };
      // 기간 앞·뒤로 남는 부분은 원래 이름 그대로 새 도형으로
      const parts = [];
      if (p.FromYear < from) parts.push({ ...p, ToYear: Math.ceil(from) - 1 });
      if (p.ToYear >= until) parts.push({ ...p, FromYear: Math.ceil(until) });
      features[i] = {
        ...features[i],
        properties: {
          ...renamed,
          FromYear: Math.max(p.FromYear, Math.ceil(from)),
          ToYear: Math.min(p.ToYear, Math.ceil(until) - 1),
        },
      };
      for (const properties of parts) {
        features.push({ ...features[i], properties });
        labels.push(labels[i]);
      }
    }
  }
}

/** 고치기로 새로 생기는 나라 이름 → 영어 위키백과 문서 (이름 받기에 쓴다) */
export const extraPolities = () =>
  new Map(
    POLITY_FIXES.split
      .filter((f) => f.into && f.wikipedia)
      .map((f) => [f.into, f.wikipedia]),
  );

/**
 * d3-geo는 구면 기준이라 외곽 링이 시계 방향이어야 한다.
 * 방향이 반대면 "그 나라를 뺀 지구 전체"로 칠해지므로, 넓이가 반구(2π)보다 큰 링은 뒤집는다.
 * 아주 작은 조각(약 40km² 미만)은 좌표 압축 때 찌그러져 방향이 뒤집힐 수 있어 뺀다
 * (실제 사례: 725~800년 Brythonic Kingdoms의 작은 섬이 뒤집혀 지도 전체가 칠해짐)
 */
export function rewind(geometry) {
  const fixPolygon = (rings) =>
    rings.map((ring, i) => {
      const area = geoArea({ type: "Polygon", coordinates: [ring] });
      const inverted = area > 2 * Math.PI;
      // 외곽(i=0)은 작은 쪽, 구멍(i>0)은 큰 쪽이어야 한다
      return (i === 0) === inverted ? [...ring].reverse() : ring;
    });
  const MIN_AREA = 1e-6; // 스테라디안
  const big = (rings) =>
    geoArea({ type: "Polygon", coordinates: [rings[0]] }) >= MIN_AREA;
  if (geometry.type === "Polygon") {
    const rings = fixPolygon(geometry.coordinates);
    return big(rings) ? { ...geometry, coordinates: rings } : null;
  }
  if (geometry.type === "MultiPolygon") {
    const polygons = geometry.coordinates.map(fixPolygon).filter(big);
    return polygons.length ? { ...geometry, coordinates: polygons } : null;
  }
  return null;
}

export const roundPoint = (c) => [
  Math.round(c[0] * 10) / 10,
  Math.round(c[1] * 10) / 10,
];

/** 조각들의 대표 위치: 가장 큰 조각의 중심(그 조각 밖이면 첫 꼭짓점) */
function labelPoint(polygons) {
  const largest = polygons
    .map((coordinates) => ({ type: "Polygon", coordinates }))
    .sort((a, b) => geoArea(b) - geoArea(a))[0];
  const c = geoCentroid(largest);
  return roundPoint(geoContains(largest, c) ? c : largest.coordinates[0][0]);
}

const polygonsOf = (g) =>
  g.type === "Polygon" ? [g.coordinates] : g.coordinates;

/**
 * 도형을 다각형 안·밖으로 나눈다(mapshaper -clip / -erase). 다각형의 경위도 범위에 걸치는 조각만 mapshaper에 넘기고
 * 나머지 조각은 손대지 않는다. 같은 도형이 여러 해에 반복되니 결과를 기억한다.
 */
const cutCache = new Map();
async function cut(geometry, clip) {
  const key = JSON.stringify([clip, geometry]);
  if (cutCache.has(key)) return cutCache.get(key);
  const xs = clip[0].map((c) => c[0]);
  const ys = clip[0].map((c) => c[1]);
  const [w, e, s, n] = [
    Math.min(...xs),
    Math.max(...xs),
    Math.min(...ys),
    Math.max(...ys),
  ];
  const near = (rings) =>
    rings[0].some(([x, y]) => x >= w && x <= e && y >= s && y <= n);
  const polygons = polygonsOf(geometry);
  const candidates = polygons.filter(near);
  const untouched = polygons.filter((rings) => !near(rings));
  // mapshaper가 입력 객체를 소비하므로 실행마다 새로 만든다
  const inputs = () => ({
    "in.json": { type: "MultiPolygon", coordinates: candidates },
    "cut.json": { type: "Polygon", coordinates: clip },
  });
  const run = async (op) => {
    if (!candidates.length) return [];
    const out = await mapshaper.applyCommands(
      `-i in.json -${op} cut.json -o out.json format=geojson`,
      inputs(),
    );
    const parsed = JSON.parse(String(out["out.json"]));
    const geoms =
      parsed.geometries ?? parsed.features?.map((f) => f.geometry) ?? [];
    const polys = geoms.filter(Boolean).flatMap(polygonsOf);
    return polys.length
      ? (rewind({ type: "MultiPolygon", coordinates: polys })?.coordinates ??
          [])
      : [];
  };
  const result = {
    inside: await run("clip"),
    outside: [...untouched, ...(await run("erase"))],
  };
  cutCache.set(key, result);
  return result;
}

/**
 * 한 스냅샷의 도형 목록(properties: n 이름, a 넓이 km², l 이름표 위치, w Wikidata)에 split·labelAt을 적용(제자리 수정).
 * t: 그 스냅샷이 화면에 보이는 마지막 시점(소수 연도). 본 지도 연도 y는 y + 0.99, 전쟁 지도는 그 스냅샷이 쓰이는 마지막 달.
 * wikidataOf: 새로 만드는 나라의 Wikidata ID(본 지도 색 열쇠, 선택)
 */
export async function applySnapshotFixes(
  features,
  t,
  wikidataOf = () => undefined,
) {
  for (const fix of POLITY_FIXES.split) {
    if (!active(fix, t)) continue;
    for (const f of [...features]) {
      if (f.properties.n !== fix.name) continue;
      const total = geoArea(f.geometry);
      let out, keep;
      if (fix.box) {
        const [w, s, e, n] = fix.box;
        const inBox = (rings) => {
          const xs = rings[0].map((c) => c[0]);
          const ys = rings[0].map((c) => c[1]);
          const x = (Math.min(...xs) + Math.max(...xs)) / 2;
          const y = (Math.min(...ys) + Math.max(...ys)) / 2;
          return x >= w && x <= e && y >= s && y <= n;
        };
        const polygons = polygonsOf(f.geometry);
        out = polygons.filter(inBox);
        keep = polygons.filter((rings) => !inBox(rings));
      } else {
        ({ inside: out, outside: keep } = await cut(f.geometry, fix.clip));
      }
      if (!out.length) continue;
      const areaOf = (ps) =>
        Math.round(
          (f.properties.a *
            geoArea({ type: "MultiPolygon", coordinates: ps })) /
            total,
        );
      const target = features.find((o) => o.properties.n === fix.into);
      if (fix.merge && target) {
        // 겹친 층(영국·대영제국)에서 같은 조각이 두 번 오면 한 번만 붙인다
        const fresh = out.filter(
          (rings) =>
            !geoContains(
              target.geometry,
              geoCentroid({ type: "Polygon", coordinates: rings }),
            ),
        );
        target.properties.a += areaOf(fresh);
        target.geometry = {
          type: "MultiPolygon",
          coordinates: [...polygonsOf(target.geometry), ...fresh],
        };
      } else if (fix.into && !target) {
        features.push({
          type: "Feature",
          geometry: { type: "MultiPolygon", coordinates: out },
          properties: {
            n: fix.into,
            w: wikidataOf(fix.into) || undefined,
            a: areaOf(out),
            l: labelPoint(out),
          },
        });
      }
      if (!keep.length) {
        features.splice(features.indexOf(f), 1);
        continue;
      }
      const geometry = { type: "MultiPolygon", coordinates: keep };
      const l = f.properties.l;
      f.properties = {
        ...f.properties,
        a: areaOf(keep),
        l: l && !geoContains(geometry, l) ? labelPoint(keep) : l,
      };
      f.geometry = geometry;
    }
  }
  for (const f of features) {
    const at = POLITY_FIXES.labelAt[f.properties.n];
    if (at && geoContains(f.geometry, at)) f.properties.l = at;
  }
}

/** 이 해(스냅샷 연도)에 이름표를 빼는 층인가 */
export const labelHidden = (name, year) =>
  year >= (POLITY_FIXES.noLabel[name] ?? Infinity);
