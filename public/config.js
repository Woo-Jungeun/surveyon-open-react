(function () {
    // 접속한 브라우저의 도메인(IP 등 호스트네임) 확인
    var hostname = window.location.hostname;
    var isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    // 현재 위치가 테스트 서버(stest 포함)이거나 로컬 테스트 환경(localhost/127)인지 판별
    var isTestServer = hostname.includes('stest') || isLocal;

    if (isLocal) {
        // === [로컬 개발 환경 자동 적용 - Vite Proxy 경유 (Module Federation 원격 빌드 모듈 CORS 방지)] ===
        window.API_CONFIG = {
            EX_API_BASE_URL: "/o",
            API_BASE_URL_OPENAI: "/APIs/o",
            API_BASE_URL_PROJECT: "/APIs/p",
            API_BASE_URL_BOARD: "/APIs/n",
            API_BASE_URL_DATASTATUS: "/APIs/s",
            API_BASE_URL_DATAMANAGEMENT: "/APIs/d",
            API_BASE_URL_THEME: "/APIs/t",
            SIGNALR_PATH: "signalr",
        };
    } else if (isTestServer) {
        // === [테스트 서버 자동 적용] ===
        window.API_CONFIG = {
            EX_API_BASE_URL: "https://stest.hrc.kr/APIx",
            API_BASE_URL_OPENAI: "https://stest.hrc.kr/APIs/o",
            API_BASE_URL_PROJECT: "https://stest.hrc.kr/APIs/p",
            API_BASE_URL_BOARD: "https://stest.hrc.kr/APIs/n",
            API_BASE_URL_DATASTATUS: "https://stest.hrc.kr/APIs/s",
            API_BASE_URL_DATAMANAGEMENT: "https://stest.hrc.kr/APIs/d",
            API_BASE_URL_THEME: "https://stest.hrc.kr/APIs/t",
            SIGNALR_PATH: "signalr",
            // DEFAULT_PATH: "/o"
        };
    } else {
        // === [운영 서버 자동 적용] (그 외 도메인 접속 시) ===
        window.API_CONFIG = {
            EX_API_BASE_URL: "https://son.hrc.kr/o",
            API_BASE_URL_OPENAI: "https://s.hrc.kr/APIs/o",
            API_BASE_URL_PROJECT: "https://s.hrc.kr/APIs/p",
            API_BASE_URL_BOARD: "https://s.hrc.kr/APIs/n",
            API_BASE_URL_DATASTATUS: "https://s.hrc.kr/APIs/s",
            API_BASE_URL_DATAMANAGEMENT: "https://s.hrc.kr/APIs/d",
            API_BASE_URL_THEME: "https://s.hrc.kr/APIs/t",
            SIGNALR_PATH: "signalr",
            // DEFAULT_PATH: "/o"
        };
    }
})();
