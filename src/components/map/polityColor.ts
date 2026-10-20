// 서버(OG·스레드 이미지)에서도 쓰려고 "use client"인 borders.ts에서 뺐다
const PALETTE = [
  "#e76f51",
  "#f4a261",
  "#e9c46a",
  "#8ab17d",
  "#2a9d8f",
  "#5e9fd1",
  "#8d7bd1",
  "#d17bb4",
  "#c9886b",
  "#7fa7a0",
];
/** 나라마다 고정된 색 */
export function polityColor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}
