import { useEffect, useRef, useState, useCallback } from "react";

/**
 * (jQuery SignalR 2.x) - 수동 프록시
 * @param {string} hubUrl 서버 URL
 * @param {string} hubName 서버 허브 이름
 */
export default function useWorkerLogSignalR({ hubUrl, hubName, onCompleted, idleMs = 1200 }) {
  const connectionRef = useRef(null);
  const hubRef = useRef(null);
  const currentJobRef = useRef(null);
  const [logText, setLogText] = useState("");
  const [connected, setConnected] = useState(false);
  const idleTimerRef = useRef(null);
  const completedRef = useRef(false); // 중복 방지(완료 1회만)

  const appendLog = useCallback((t) => setLogText((p) => p + t), []);
  const clearLog = useCallback(() => setLogText(""), []);

  const clearIdleTimer = () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  };

  const armIdleTimer = useCallback(() => {
    if (!idleMs) return;
    clearIdleTimer();
    idleTimerRef.current = setTimeout(() => {
      if (!completedRef.current && currentJobRef.current) {
        completedRef.current = true;
        try { onCompleted?.({ jobKey: currentJobRef.current, hasError: false, exitCode: 0, reason: "idle" }); } catch { }
      }
    }, idleMs);
  }, [idleMs, onCompleted]);

  // 초기화 (마운트 1회)
  useEffect(() => {
    const $ = window.jQuery;
    if (!($ && $.hubConnection && $.signalR)) {
      appendLog("[ERR] jQuery SignalR 스크립트가 로딩되지 않았습니다.\n");
      return;
    }

    // 1) 연결 생성
    const connection = $.hubConnection(hubUrl, { useDefaultPath: false });
    connection.logging = false;

    // 2) 허브 프록시 생성
    const hub = connection.createHubProxy(hubName);

    // 3) 서버 -> 클라이언트 이벤트 바인딩
    hub.on("onLine", (jobKey, line, isError) => {
      if (String(jobKey) !== String(currentJobRef.current)) return;
      appendLog((isError ? "[ERR] " : "") + line + "\n");
      if (!completedRef.current) armIdleTimer();
    });

    hub.on("onCompleted", (jobKey, hasError, exitCode) => {
      if (String(jobKey) !== String(currentJobRef.current)) return;
      appendLog(`\n== Completed (${hasError ? "Error" : "OK"}) code=${exitCode ?? ""} ==\n`);
      if (!completedRef.current) {
        completedRef.current = true;
        clearIdleTimer();
        try { onCompleted?.({ jobKey, hasError: !!hasError, exitCode, reason: "onCompleted" }); } catch { }
      }
    });

    // 4) 연결 시작
    connection
      .start({
        // 웹소켓 사용 안 함. SSE → 실패 시 LongPolling 순서로 시도
        transport: ['serverSentEvents', 'longPolling'],
      })
      .done(() => setConnected(true))
      .fail((err) => appendLog(`[ERR] SignalR 연결 실패: ${err?.message || ''}\n`));

    // 디버깅에 도움되는 로그
    connection.logging = true;
    connection.error((err) => appendLog(`[ERR] ${err?.message || err}\n`));

    // 재연결 시 현재 job 재가입
    connection.reconnected(() => {
      const job = currentJobRef.current;
      if (job) {
        try { hub.invoke("join", job); } catch { }
      }
    });

    // 끊김시 자동 재연결(간단 재시도)
    connection.disconnected(() => {
      setConnected(false);
      clearIdleTimer();
      setTimeout(() => {
        if (connection.state === $.signalR.connectionState.disconnected) {
          connection.start().done(() => setConnected(true)).fail(() => { });
        }
      }, 1500);
    });

    connectionRef.current = connection;
    hubRef.current = hub;

    return () => {
      try { connection.stop(); } catch { }
      connectionRef.current = null;
      hubRef.current = null;
      clearIdleTimer();
    };
  }, [hubUrl, hubName, appendLog]);

  // job 조인
  const joinJob = useCallback(async (job) => {
    console.log("[joinJob] 요청된 job =", job);
  console.log("[joinJob] 현재 currentJobRef =", currentJobRef.current);
    // 이전 job 세션이 남아있으면 먼저 끊고 새로 시작
    if (currentJobRef.current && currentJobRef.current !== job) {
      console.warn("[joinJob] 이전 job이 존재 → connection.stop() 호출");
      try { connectionRef.current?.stop(); } catch (err) { console.error("[joinJob] stop 실패", err); }
    }
    currentJobRef.current = job;
    completedRef.current = false; // 새 작업 시작
    clearIdleTimer();
    const $ = window.jQuery;
    const conn = connectionRef.current;
    const hub = hubRef.current;

    if (!($ && conn && hub)) {
      appendLog("[ERR] SignalR 초기화 안됨\n");
      console.error("[joinJob] 초기화 실패", { $, conn, hub });
      return false;
    }
    console.log("[joinJob] conn.state =", conn.state, "($.signalR.connectionState.connected =", $.signalR.connectionState.connected, ")");

    if (conn.state !== $.signalR.connectionState.connected) {
      console.warn("[joinJob] 연결 안되어있음 → conn.start() 재시도");
      try {
        await conn.start();
        setConnected(true);
        console.log("[joinJob] 재연결 성공");
      } catch (err) {
        appendLog("[ERR] SignalR 연결 실패\n");
        console.error("[joinJob] conn.start 실패", err);
        return false;
      }
    }
  
    try {
      console.log("[joinJob] 허브 join 호출 → job =", job);
      await hub.invoke("join", job);
      console.log("[joinJob] join 완료");
    } catch (err) {
      console.error("[joinJob] hub.invoke(join) 실패", err);
    }
  
    // 조인 직후에도 idle 타이머 무장(첫 라인이 안 오는 경우 대비)
    armIdleTimer();
    return true;
  }, [appendLog]);

  return {
    // state
    logText,
    connected,
    currentJob: () => currentJobRef.current,
    // actions
    appendLog,
    clearLog,
    joinJob,
  };
}
