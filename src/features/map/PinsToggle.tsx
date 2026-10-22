"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { HideToggle } from "@/components/ui/HideToggle";
import { PinIcon } from "@/components/ui/icons";

/** 본 지도 설정 "사건 핀 숨기기"(`<html data-pins="off">` - 핀·+N·고른 사건 말풍선을 그리지 않는다, 영상 캡처도 이 속성) */
export function PinsToggle() {
  const { messages } = useI18n();
  return <HideToggle flag="pins" label={messages.ui.hidePins} Icon={PinIcon} />;
}
