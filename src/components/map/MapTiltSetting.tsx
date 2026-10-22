"use client";

import { TiltSlider } from "@/components/ui/TiltSlider";
import { useMapTilt } from "./tiltStore";

/** 주제 지도·전쟁 지도 설정 메뉴의 "지도 기울기"(공용 TiltSlider를 tiltStore에 이음 - useGlViewport가 같은 값을 본다) */
export function MapTiltSetting({
  label,
  hint,
}: {
  label: string;
  /** 지도에서 직접 기울이는 방법(휴대폰·컴퓨터) */
  hint: { touch: string; mouse: string };
}) {
  const tilt = useMapTilt((s) => s.tilt);
  const setTilt = useMapTilt((s) => s.setTilt);
  return (
    <TiltSlider
      label={label}
      value={tilt}
      max={55}
      onChange={setTilt}
      hint={hint}
    />
  );
}
