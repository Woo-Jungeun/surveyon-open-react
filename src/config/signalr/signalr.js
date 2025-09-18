import { urlJoin } from "@/common/utils/urlJoin";

const {
  VITE_API_BASE_URL = "",   // prod: https://son.hrc.kr / dev: ""
  VITE_DEFAULT_PATH = "/o", // 공통 prefix
  VITE_SIGNALR_PATH = "signalr",
} = import.meta.env;

// dev/dev-local → "/o/signalr"  (Vite 프록시가 son 또는 localhost로 전달)
// prod         → "https://son.hrc.kr/o/signalr"
export const HUB_URL = VITE_API_BASE_URL
  ? urlJoin(VITE_API_BASE_URL, VITE_DEFAULT_PATH, VITE_SIGNALR_PATH)
  : urlJoin(VITE_DEFAULT_PATH, VITE_SIGNALR_PATH);

// 허브 이름(서버에서 정한 이름으로 맞추기)
export const HUB_NAME = "workerlog";
