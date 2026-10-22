"use client";

import { useUi } from "@/store/ui";
import { useI18n } from "@/i18n/I18nProvider";
import { Compass } from "@/components/map/Compass";
import { YoutubeButton } from "@/components/ui/YoutubeButton";
import { YOUTUBE_URL } from "@/lib/channel";

/** 휴대폰은 오른쪽 위(아래는 사건 시트·하단 바), 데스크톱은 지도 오른쪽 아래(사건 패널 왼쪽·하단 바 위) */
const PLACE =
  "absolute end-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-10 lg:top-auto lg:bottom-[calc(var(--bar-h)+0.75rem)] lg:end-[35.5rem] xl:end-[41.5rem] 2xl:end-[47.5rem]";

/**
 * 본 지도 나침반: 공용 Compass에 저장소(useUi) 방향·기울기를 잇는다. 지도를 돌리는 판·애니메이션은 WorldMap이 저장소 값을 보고 한다.
 */
export function HeadingControl() {
  const { messages } = useI18n();
  const heading = useUi((s) => s.heading);
  const tilt = useUi((s) => s.tilt);
  const resetView = useUi((s) => s.resetView);
  const setHeading = useUi((s) => s.setHeading);
  const setSpinning = useUi((s) => s.setSpinning);
  return (
    <Compass
      heading={heading}
      tilt={tilt}
      onReset={resetView}
      onTurnStart={() => setSpinning(true)}
      onTurn={setHeading}
      onTurnEnd={() => {
        // 북쪽에서 4° 안이면 북쪽에 맞춘다
        const h = useUi.getState().heading;
        const n = ((h % 360) + 360) % 360;
        if (n < 4 || n > 356) setHeading(Math.round(h / 360) * 360);
        setSpinning(false);
      }}
      place={PLACE}
      side={<YoutubeButton href={YOUTUBE_URL} label={messages.ui.youtube} />}
      text={{
        reset: messages.ui.resetView,
        hintMouse: messages.ui.viewHintMouse,
        hintTouch: messages.ui.viewHintTouch,
        close: messages.ui.close,
      }}
    />
  );
}
