import { useEffect, useRef, useState, useCallback } from "react";

/**
 * (jQuery SignalR 2.x) - 수동 프록시
 * @param {string} hubUrl 서버 URL
 * @param {string} hubName 서버 허브 이름
 */
export default function useWorkerLogSignalR({ hubUrl, hubName }) {
  const connectionRef = useRef(null);
  const hubRef = useRef(null);
  const currentJobRef = useRef(null);
  const [logText, setLogText] = useState("");
  const [connected, setConnected] = useState(false);

  const appendLog = useCallback((t) => setLogText((p) => p + t), []);
  const clearLog = useCallback(() => setLogText(""), []);

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
      if (jobKey !== currentJobRef.current) return;
      appendLog((isError ? "[ERR] " : "") + line + "\n");
    });

    hub.on("onCompleted", (jobKey, hasError, exitCode) => {
      if (jobKey !== currentJobRef.current) return;
      appendLog(`\n== Completed (${hasError ? "Error" : "OK"}) code=${exitCode ?? ""} ==\n`);
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
    };
  }, [hubUrl, hubName, appendLog]);

  // job 조인
  const joinJob = useCallback(async (job) => {
    currentJobRef.current = job;
    const $ = window.jQuery;
    const conn = connectionRef.current;
    const hub = hubRef.current;

    if (!($ && conn && hub)) {
      appendLog("[ERR] SignalR 초기화 안됨\n");
      return false;
    }
    if (conn.state !== $.signalR.connectionState.connected) {
      try { await conn.start(); setConnected(true); }
      catch { appendLog("[ERR] SignalR 연결 실패\n"); return false; }
    }
    try { await hub.invoke("join", job); } catch { }
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
