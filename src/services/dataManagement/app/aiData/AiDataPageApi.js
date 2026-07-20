import { useMutation } from "react-query";
import api from "@/common/queries/Api.js";

export function AiDataPageApi() {
    /** AI 데이터 생성 실시간 작업 조회 */
    const viewQaJobs = useMutation(
        async (data) => await api.post(data, "/qa/jobs/view", "API_BASE_URL_DATAMANAGEMENT")
    );

    return {
        viewQaJobs
    };
}
