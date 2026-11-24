import * as signalR from "@microsoft/signalr";
import { apiAxios } from "@/config/axios/Axios.jsx";
import store from "@/common/redux/store/Store";
import { AES256 } from "@/common/utils/AES256";

export const INTERNAL_KEY = "cGZeWyxlli5N4FRSwMAsbbRoNzJEhFkocore";

function getCookie(name) {
  if (typeof document === "undefined") return "";
  const safe = name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1");
  const match = document.cookie.match(new RegExp(`(?:^|; )${safe}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

export function getAnalysisApiBase() {
  const isTestHost =
    typeof window !== "undefined" &&
    (window.location.hostname.includes("stest") ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");
  const fallbackHost = isTestHost ? "https://stest.hrc.kr" : "https://s.hrc.kr";
  const rawBase =
    (typeof window !== "undefined" && window.API_CONFIG?.API_BASE_URL_OPENAI) ||
    `${fallbackHost}/APIs/o`;

  if (import.meta.env.DEV && rawBase.startsWith("http")) {
    try {
      return new URL(rawBase).pathname.replace(/\/+$/, "");
    } catch {
      return "/APIs/o";
    }
  }
  return String(rawBase).replace(/\/+$/, "");
}

export const API_BASE = getAnalysisApiBase();

function resolveCurrentUserId(explicitUser) {
  if (explicitUser && String(explicitUser).trim()) {
    return String(explicitUser).trim();
  }
  const state = store?.getState?.();
  return (
    state?.auth?.user?.userId ||
    (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("userId") : "") ||
    ""
  );
}

function getAuthToken() {
  return getCookie("X-Auth-Token") || "";
}

function getBearerToken() {
  return getCookie("TOKEN") || getAuthToken() || "";
}

function buildAuthHeaders(extra = {}, explicitUser = "") {
  const xAuthToken = getAuthToken();
  const bearer = getBearerToken();
  const userId = resolveCurrentUserId(explicitUser);

  const headers = {
    "X-Internal-Key": INTERNAL_KEY,
    ...(xAuthToken ? { "X-Auth-Token": xAuthToken } : {}),
    ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
    ...(userId
      ? {
        "X-User-Id": userId,
        hrc: AES256.Crypto.encryptAES256(String(userId)),
      }
      : {}),
    ...extra,
  };
  return headers;
}

export async function apiRequest(endpoint, payload = {}, options = {}) {
  const base = getAnalysisApiBase();
  const path = String(endpoint || "").startsWith("/") ? endpoint : `/${endpoint}`;
  const resolvedPayload =
    payload && typeof payload === "object" && "user" in payload
      ? { ...payload, user: resolveCurrentUserId(payload.user) }
      : payload;
  const response = await apiAxios.post(`${base}${path}`, resolvedPayload, {
    headers: buildAuthHeaders(options.headers, resolvedPayload?.user),
    signal: options.signal,
  });
  return response?.data ?? {};
}

// 1. 문항 설정 및 API 키/모델/언어 목록 조회 [POST /analysis/info] (레거시 gb=info)
export async function getAnalysisInfo(projectnum, qnum, user, signal) {
  return await apiRequest(
    "/analysis/info",
    { projectnum, qnum, user: resolveCurrentUserId(user) },
    { signal }
  );
}

// 2. 응답 데이터 조회 [POST /analysis/responses] (레거시 gb=in, 서버에서 NewOldCheck 자동 수행)
export async function getAnalysisResponses(projectnum, qnum, signal) {
  return await apiRequest("/analysis/responses", { projectnum, qnum }, { signal });
}

// 3. 보기(코드북) 데이터 조회 [POST /analysis/codes] (레거시 gb=lb)
export async function getAnalysisCodes(projectnum, qnum, signal) {
  return await apiRequest("/analysis/codes", { projectnum, qnum }, { signal });
}

// 4. PID별 원시(Raw) 응답 데이터 조회 [POST /analysis/rawdata] (레거시 gb=list)
export async function getAnalysisRawdata(projectnum, qnum, signal) {
  return await apiRequest("/analysis/rawdata", { projectnum, qnum }, { signal });
}

// 5. 분석 진행 상태 조회 [POST /analysis/status] (레거시 option_status_api)
export async function getAnalysisStatus(projectnum, qnum, qid, signal) {
  return await apiRequest("/analysis/status", { projectnum, qnum, qid }, { signal });
}

// 6. 팝업 확인 플래그 조회 및 해제 [POST /analysis/popup_check] (레거시 gb=popupcheck)
export async function checkAnalysisPopup(projectnum, qnum, qid, checkyn = "0", signal) {
  return await apiRequest("/analysis/popup_check", { projectnum, qnum, qid, checkyn }, { signal });
}

// 7. 문항 설정 저장 [POST /analysis/save/info]
export async function saveAnalysisInfo(projectnum, qnum, data, user, signal, ev) {
  const infoData = Array.isArray(data) ? data[0] || {} : data || {};
  return await apiRequest(
    "/analysis/save/info",
    {
      projectnum,
      qnum,
      user: resolveCurrentUserId(user),
      data: infoData,
      ...(ev ? { ev: String(ev) } : {}),
    },
    { signal }
  );
}

// 8. 보기 목록 저장 [POST /analysis/save/codes]
export async function saveAnalysisCodes(projectnum, qnum, data, user, lvcode, signal) {
  return await apiRequest(
    "/analysis/save/codes",
    { projectnum, qnum, user, data, lvcode },
    { signal }
  );
}

// 9. 응답 목록 및 중복코드 제거 저장 [POST /analysis/save/responses]
export async function saveAnalysisResponses(
  projectnum,
  qnum,
  duplicate_answer,
  data,
  user,
  lvcode,
  signal
) {
  return await apiRequest(
    "/analysis/save/responses",
    { projectnum, qnum, user, duplicate_answer, data, lvcode },
    { signal }
  );
}

// 10. 저장 전 DB 반영 비교 [POST /analysis/save/compare]
export async function compareAnalysisResponses(projectnum, qnum, data, user, signal) {
  return await apiRequest("/analysis/save/compare", { projectnum, qnum, user, data }, { signal });
}

// 11. AI 파이썬 워커(worker_0427.exe) 실행 [POST /analysis/worker/start]
export async function startAnalysisWorker(projectnum, qnum, action, user, options = {}, signal) {
  const payload = { projectnum, qnum, user, action, ...options };
  return await apiRequest("/analysis/worker/start", payload, { signal });
}

// 12. SignalR WorkerHub 실시간 스트리밍 연결 생성 [/APIs/o/hubs/worker]
export function createWorkerHubConnection() {
  const base = getAnalysisApiBase();
  return new signalR.HubConnectionBuilder()
    .withUrl(`${base}/hubs/worker`, {
      accessTokenFactory: () => getBearerToken() || getAuthToken(),
      transport:
        signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000])
    .configureLogging(signalR.LogLevel.Warning)
    .build();
}

// 13. 워커 상태/로그 보조 폴링 [GET /analysis/worker/status]
export async function getAnalysisWorkerStatus(job, offset = 0, signal) {
  const base = getAnalysisApiBase();
  const url = `${base}/analysis/worker/status?job=${encodeURIComponent(job)}&offset=${offset}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: buildAuthHeaders(),
      signal,
    });
    return await res.json();
  } catch (err) {
    if (err?.name === "AbortError") return { ok: false, error: "aborted" };
    return { ok: false, error: err?.message || "status error" };
  }
}

// 14. 워커 프로세스 강제 중지 [POST /analysis/worker/stop]
export async function stopAnalysisWorker(jobId, projectnum, qnum, user, signal) {
  return await apiRequest(
    "/analysis/worker/stop",
    { jobId, projectnum, qnum, user, action: jobId },
    { signal }
  );
}

// 15. Aspose.Cells 통합 엑셀 다운로드 (HR_Sample3.xlsx 기반 5개 시트) [GET /analysis/export/excel]
export async function downloadAnalysisExcel(projectnum, qnum, user, projectname = "") {
  const base = getAnalysisApiBase();
  const url = `${base}/analysis/export/excel?projectnum=${encodeURIComponent(
    projectnum
  )}&qnum=${encodeURIComponent(qnum)}&user=${encodeURIComponent(user || "")}`;
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: buildAuthHeaders(),
  });
  if (!res.ok) throw new Error(`엑셀 다운로드 실패 (상태코드: ${res.status})`);

  const blob = await res.blob();
  if (blob.type?.includes("application/json")) {
    throw new Error("엑셀 다운로드 요청이 거부되었습니다.");
  }

  const disposition = res.headers.get("content-disposition");
  const safeProjName = String(projectname || "")
    .trim()
    .replace(/[/\\:*?"<>|]/g, "_");
  const safeQnum = String(qnum || "").replace(/[/\\:*?"<>|]/g, "_");
  let filename = safeProjName
    ? `hrcopen_${safeProjName}_(${projectnum})_${safeQnum}.xlsx`
    : `hrcopen_(${projectnum})_${safeQnum}.xlsx`;

  if (disposition && disposition.includes("filename")) {
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;\n]+)/i);
    const asciiMatch = disposition.match(/filename\s*=\s*((['"]).*?\2|[^;\n]*)/i);
    const rawName = utf8Match?.[1] || asciiMatch?.[1];
    if (rawName) {
      try {
        filename = decodeURIComponent(rawName.trim().replace(/^['"]|['"]$/g, ""));
      } catch {
        filename = rawName.trim().replace(/^['"]|['"]$/g, "");
      }
    }
  }

  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
  return { ok: true, filename };
}

// 16. 통합 엑셀 업로드 (레거시 HR_Sample3.xlsx 응답자 + 보기항목 일괄 검증·반영) [POST /analysis/import/excel]
export async function uploadAnalysisExcel(file, projectnum, qnum) {
  const base = getAnalysisApiBase();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("projectnum", projectnum);
  formData.append("qnum", qnum);

  const res = await fetch(`${base}/analysis/import/excel`, {
    method: "POST",
    credentials: "include",
    headers: buildAuthHeaders(),
    body: formData,
  });
  if (!res.ok) throw new Error(`엑셀 업로드 실패 (상태코드: ${res.status})`);
  return await res.json();
}

// 16-1. 엑셀 보기 업로드 미리보기 파싱 [POST /analysis/import/excel-preview]
export async function previewExcelCodes(file, projectnum, qnum) {
  const base = getAnalysisApiBase();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("projectnum", projectnum);
  formData.append("qnum", qnum);

  const res = await fetch(`${base}/analysis/import/excel-preview`, {
    method: "POST",
    credentials: "include",
    headers: buildAuthHeaders(),
    body: formData,
  });
  if (!res.ok) throw new Error(`엑셀 업로드 실패 (상태코드: ${res.status})`);
  return await res.json();
}

// 17. 타 프로젝트/문항 검색 [GET /analysis/import/projects]
export async function searchImportProjects(search = "") {
  const base = getAnalysisApiBase();
  const url = `${base}/analysis/import/projects?search=${encodeURIComponent(search)}`;
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: buildAuthHeaders(),
  });
  return await res.json();
}

// 18. 타 문항 보기 목록 조회 [GET /analysis/import/codes]
export async function getImportCodes(targetPn, targetQnum) {
  const base = getAnalysisApiBase();
  const url = `${base}/analysis/import/codes?target_projectnum=${encodeURIComponent(
    targetPn
  )}&target_qnum=${encodeURIComponent(targetQnum)}`;
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: buildAuthHeaders(),
  });
  return await res.json();
}

// 19. 선택한 보기 목록 현재 문항에 반영 [POST /analysis/import/apply]
export async function applyImportCodes(projectnum, qnum, selectedCodes, user) {
  return await apiRequest("/analysis/import/apply", {
    projectnum,
    qnum,
    user,
    data: selectedCodes,
  });
}

// 보조: 문항 삭제 [POST /pro_list/qnum_delete] (레거시 gb=del_qnum 대체)
export async function deleteAnalysisQuestion(projectnum, qnum, qid, user) {
  const ids = qid ? [Number(qid) || qid] : [];
  return await apiRequest("/pro_list/qnum_delete", {
    projectnum,
    qnum,
    ids,
    user,
  });
}

// 보조: 프로젝트 내 문항 전환용 목록 조회 [POST /pro_list/select]
export async function getAnalysisQuestionList(projectnum, user, servername = "", signal) {
  return await apiRequest(
    "/pro_list/select",
    { projectnum, user, servername, search_text: "" },
    { signal }
  );
}

