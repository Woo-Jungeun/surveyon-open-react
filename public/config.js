(function () {
    // 접속한 브라우저의 도메인(IP 등 호스트네임) 확인
    var hostname = window.location.hostname;
    console.log(hostname)
    // 현재 위치가 테스트 서버(stest 포함)이거나 로컬 테스트 환경(localhost/127)인지 판별
    var isTestServer = hostname.includes('stest') || hostname === 'localhost' || hostname === '127.0.0.1';

    if (isTestServer) {
        // === [테스트 서버 자동 적용] ===
        window.API_CONFIG = {
            EX_API_BASE_URL: (hostname === 'localhost' || hostname === '127.0.0.1') ? "https://son.hrc.kr/o" : "https://stest.hrc.kr/APIx",
            API_BASE_URL_OPENAI: "https://stest.hrc.kr/APIs/o",
            API_BASE_URL_BOARD: "https://stest.hrc.kr/APIs/n",
            API_BASE_URL_DATASTATUS: "https://stest.hrc.kr/APIs/s",
            API_BASE_URL_DATAMANAGEMENT: "https://stest.hrc.kr/APIs/d",
            SIGNALR_PATH: "signalr",
            // DEFAULT_PATH: "/o"
        };
    } else {
        // === [운영 서버 자동 적용] (그 외 도메인 접속 시) ===
        window.API_CONFIG = {
            EX_API_BASE_URL: "https://son.hrc.kr/o",
            API_BASE_URL_OPENAI: "https://s.hrc.kr/APIs/o",
            API_BASE_URL_BOARD: "https://s.hrc.kr/APIs/n",
            API_BASE_URL_DATASTATUS: "https://s.hrc.kr/APIs/s",
            API_BASE_URL_DATAMANAGEMENT: "https://s.hrc.kr/APIs/d",
            SIGNALR_PATH: "signalr",
            // DEFAULT_PATH: "/o"
        };
    }
})();
