/**
 * 빌드 후 정리(npm run build 뒤 자동 실행): out/의 RSC 페이로드(*.txt)를 지운다.
 * 이 사이트는 next/link·router를 쓰지 않고 모든 이동이 <a>(전체 새로고침)라 브라우저가 이 파일을 받지 않는다.
 * 빌드 결과의 약 1/3(수백 MB)이라 배포 용량 제한(Vercel 정적 파일 1GB)을 넘지 않게 지운다.
 * next/link를 쓰기 시작하면 이 스크립트를 없앨 것.
 */
import { readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

// 사이트 루트의 진짜 텍스트 파일은 남긴다
const KEEP = new Set(["robots.txt", "ads.txt"]);
let count = 0;
let bytes = 0;
function walk(dir) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, name.name);
    if (name.isDirectory()) walk(path);
    else if (
      name.name.endsWith(".txt") &&
      !(dir === "out" && KEEP.has(name.name))
    ) {
      bytes += statSync(path).size;
      rmSync(path);
      count++;
    }
  }
}
walk("out");
console.log(`RSC 페이로드 ${count}개 삭제 (${(bytes / 1048576).toFixed(0)}MB)`);
