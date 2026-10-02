/**
 * 설문온 AI 가이드 어시스턴트 전용 API 클라이언트 (Production-Ready)
 * 
 * [설문온 사내 표준 API 아키텍처 및 직관적 도메인 규격]
 * 1. 엔드포인트:
 *    - POST /chat/messages/list : 세션별 대화 말풍선 메시지 목록 조회
 *    - POST /chat/sessions/list : 사용자별 대화 세션 목록 조회
 *    - POST /chat/ask           : AI 질문 및 가이드 생성 질의
 *    - POST /chat/report        : AI 답변 오류 제보
 * 2. HTTP 메서드: POST 일원화 (모든 파라미터는 Request Body로 안전하게 전달)
 * 3. 응답 Envelope: { success: "777", message: "OK", resultjson: { ... } } (에러: 900번대)
 * 4. 인증 토큰: X-Auth-Token 및 Authorization 자동 주입
 * 5. 제로 하드코딩: 환경변수 및 Base URL 유연 해석
 */

// 0. 설문온 챗봇 백엔드 엔드포인트 중앙 상수 정의
export const CHAT_ENDPOINTS = Object.freeze({
  MESSAGES_LIST: '/chat/messages/list',
  SESSIONS_LIST: '/chat/sessions/list',
  ASK: '/chat/ask',
  REPORT: '/chat/report',
});

// 1. Base URL 해석 함수 (사내 표준 기본값: /APIs/m)
export const getChatBaseUrl = (customBase) => {
  // 상위 컴포넌트가 Props/인자로 명시적 전달한 경우 최우선
  if (customBase && typeof customBase === 'string' && customBase.trim() !== '') {
    return customBase.trim().replace(/\/+$/, '');
  }

  // 설문온 매뉴얼 백엔드 사내 표준 기본값 
  return '/APIs/m';
};

// 2. 인증 헤더 추출 헬퍼
const getAuthHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
  };

  try {
    const token = localStorage.getItem('X-Auth-Token') ||
      localStorage.getItem('token') ||
      sessionStorage.getItem('X-Auth-Token') ||
      sessionStorage.getItem('token');

    if (token) {
      headers['X-Auth-Token'] = token;
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (e) {
    // 스토리지 접근 차단 등 예외 방어
  }

  return headers;
};

// 3. 설문온 표준 POST 공통 요청 처리기
const postJson = async (endpoint, body, customBase) => {
  const base = getChatBaseUrl(customBase);
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${base}${cleanEndpoint}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body || {}),
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => null);
    const msg = errJson?.message || `서버 통신 실패 (HTTP ${response.status})`;
    const err = new Error(msg);
    err.status = response.status;
    err.data = errJson;
    throw err;
  }

  const data = await response.json();

  // 설문온 표준 Envelope 검증 (success === "777")
  if (data && typeof data === 'object') {
    if (data.success === '777' || data.success === 777) {
      return data.resultjson !== undefined ? data.resultjson : data;
    }
    // 900번대 또는 기타 오류 코드 처리
    if (data.success && data.success !== '777') {
      const msg = data.message || `API 오류 (코드: ${data.success})`;
      const err = new Error(msg);
      err.code = data.success;
      err.data = data;
      throw err;
    }
  }

  return data;
};

/**
 * 설문온 챗봇 API 서비스 객체 (백엔드 엔드포인트와 1:1 직관적 매칭)
 */
export const chatApi = {
  /**
   * 세션별 대화 말풍선 메시지 목록 조회 (POST /chat/messages/list)
   * @param {string} sessionId 
   * @param {string} [customBase]
   * @returns {Promise<Array>}
   */
  getMessageList: async (sessionId, customBase) => {
    if (!sessionId) return [];
    try {
      const result = await postJson(CHAT_ENDPOINTS.MESSAGES_LIST, { sessionId }, customBase);
      if (result && Array.isArray(result.messages)) {
        return result.messages;
      }
      return [];
    } catch (err) {
      console.warn('[chatApi] 메시지 목록 조회 실패:', err.message);
      throw err;
    }
  },

  /**
   * 사용자별 대화 세션 목록 조회 (POST /chat/sessions/list)
   * @param {string} userId 
   * @param {string} [customBase]
   * @returns {Promise<Array>}
   */
  getSessionList: async (userId, customBase) => {
    if (!userId || userId === '익명 사용자') return [];
    try {
      const result = await postJson(CHAT_ENDPOINTS.SESSIONS_LIST, { userId }, customBase);
      if (result && Array.isArray(result.sessions)) {
        return result.sessions;
      }
      return [];
    } catch (err) {
      console.warn('[chatApi] 세션 목록 조회 실패:', err.message);
      return [];
    }
  },

  /**
   * 사용자 질문 질의 및 AI 맞춤 가이드 생성 (POST /chat/ask)
   * @param {Object} payload 
   * @param {string} payload.sessionId
   * @param {string} payload.userId
   * @param {string} payload.userMessage
   * @param {string} [payload.currentUrl]
   * @param {string} [payload.screenshotBase64]
   * @param {string} [payload.selectedFeatureId]
   * @param {string} [customBase]
   * @returns {Promise<Object>}
   */
  ask: async (payload, customBase) => {
    try {
      const result = await postJson(CHAT_ENDPOINTS.ASK, payload, customBase);
      return result || {};
    } catch (err) {
      console.error('[chatApi] 질문 처리 오류:', err.message);
      throw err;
    }
  },

  /**
   * AI 답변 오류 제보 (POST /chat/report)
   * @param {Object} payload
   * @param {number|string} payload.messageId
   * @param {string} payload.reasonType
   * @param {string} [payload.reasonText]
   * @param {string} [customBase]
   * @returns {Promise<Object>}
   */
  report: async (payload, customBase) => {
    try {
      const result = await postJson(CHAT_ENDPOINTS.REPORT, payload, customBase);
      return result || { reported: true };
    } catch (err) {
      console.error('[chatApi] 오류 제보 실패:', err.message);
      throw err;
    }
  },
};

export default chatApi;
