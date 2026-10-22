"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { YearStepSetting } from "@/components/ui/YearStepSetting";
import { useTopicState } from "./store";

/** 주제 지도 설정 메뉴의 "연도 단위"(본 지도와 같은 공용 컴포넌트·저장값). ◀ ▶가 이 단위로 움직인다(TopicGauge) */
export function TopicStepSetting() {
  const { messages } = useI18n();
  const step = useTopicState((s) => s.step);
  const setStep = useTopicState((s) => s.setStep);
  return (
    <YearStepSetting
      label={messages.ui.yearStep}
      value={step}
      onChange={setStep}
    />
  );
}
