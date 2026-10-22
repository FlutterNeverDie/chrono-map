"use client";

import { MAX_TILT, useUi } from "@/store/ui";
import { useI18n } from "@/i18n/I18nProvider";
import { TiltSlider } from "@/components/ui/TiltSlider";

/**
 * 본 지도 설정 메뉴의 "지도 기울기"(공용 TiltSlider를 store/ui에 이음). 0°(위에서 내려다보기) ~ 55°.
 * 지도에서 직접 바꿀 수도 있다 - 두 손가락을 같이 위아래로 쓸기, 마우스 오른쪽 단추·Ctrl(⌘)·Shift를 누르고 위아래로 끌기
 */
export function TiltSetting() {
  const { messages } = useI18n();
  const tilt = useUi((s) => s.tilt);
  const setTilt = useUi((s) => s.setTilt);
  return (
    <TiltSlider
      label={messages.ui.mapTilt}
      value={tilt}
      max={MAX_TILT}
      onChange={setTilt}
      hint={{
        touch: messages.ui.viewHintTouch,
        mouse: messages.ui.viewHintMouse,
      }}
    />
  );
}
