import { DEFAULT_LOCALE } from "@/i18n/locales";
import { warsMetadata } from "@/features/campaign/meta";
import { TopicScreen } from "../../TopicScreen";
import { warsTopic } from "../../warsTopic";

export const metadata = warsMetadata(DEFAULT_LOCALE);

/** 전쟁 지도 첫 화면: 모든 전쟁을 지도 위에서 고른다 */
export default function Page() {
  return (
    <TopicScreen locale={DEFAULT_LOCALE} topic={warsTopic()} section="wars" />
  );
}
