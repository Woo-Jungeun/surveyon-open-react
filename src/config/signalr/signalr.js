import { urlJoin } from "@/common/utils/urlJoin";

const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL !== undefined ? import.meta.env.VITE_API_BASE_URL : ((typeof window !== 'undefined' && window.API_CONFIG?.API_BASE_URL) || "");
const VITE_DEFAULT_PATH = import.meta.env.VITE_DEFAULT_PATH !== undefined ? import.meta.env.VITE_DEFAULT_PATH : ((typeof window !== 'undefined' && window.API_CONFIG?.DEFAULT_PATH) || "/o");
const VITE_SIGNALR_PATH = import.meta.env.VITE_SIGNALR_PATH !== undefined ? import.meta.env.VITE_SIGNALR_PATH : ((typeof window !== 'undefined' && window.API_CONFIG?.SIGNALR_PATH) || "signalr");

// dev/dev-local → "/o/signalr"  (Vite 프록시가 son 또는 localhost로 전달)
// prod         → "https://son.hrc.kr/o/signalr"
export const HUB_URL = VITE_API_BASE_URL
  ? urlJoin(VITE_API_BASE_URL, VITE_DEFAULT_PATH, VITE_SIGNALR_PATH)
  : urlJoin(VITE_DEFAULT_PATH, VITE_SIGNALR_PATH);

// 허브 이름(서버에서 정한 이름으로 맞추기)
export const HUB_NAME = "workerlog";
