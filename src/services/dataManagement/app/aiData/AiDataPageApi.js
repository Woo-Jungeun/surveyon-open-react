import { useMutation } from "react-query";
import api from "@/common/queries/Api.js";

export function AiDataPageApi() {
    /** AI 데이터 생성 실시간 작업 조회 */
    const viewQaJobs = useMutation(
        async (data) => await api.post(data, "/qa/jobs/view", "API_BASE_URL_DATAMANAGEMENT")
    );

    /** 러너용 티켓 발급 */
    const getQaTicket = useMutation(
        async (data) => await api.post(data, "/qa/ticket", "API_BASE_URL_DATAMANAGEMENT")
    );

    /** AI 데이터 생성 E2E 실행 (비동기) */
    const runQaE2eJobs = useMutation(
        async (data) => await api.post(data, "/qa/run-e2e-pids-async", "API_BASE_URL_DATAMANAGEMENT")
    );

    /** AI 데이터 생성 작업 이력 조회 */
    const listQaJobs = useMutation(
        async (data) => await api.post(data, "/qa/jobs/list", "API_BASE_URL_DATAMANAGEMENT")
    );

    /** 테스트 데이터 정리 */
    const resetTestPids = useMutation(
        async (data) => await api.post(data, "/qa/reset-test-pid", "API_BASE_URL_DATAMANAGEMENT")
    );

    return {
        viewQaJobs,
        getQaTicket,
        runQaE2eJobs,
        listQaJobs,
        resetTestPids
    };
}
