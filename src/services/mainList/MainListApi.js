import { useMutation } from "react-query";
import api from "@/common/queries/Api.js";
import { useContext } from "react";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";

/**
 *  프로젝트 목록 > API
 *
 * @author jewoo
 * @since 2025-09-12<br />
 */
export function MainListApi() {

    const loadingSpinner = useContext(loadingSpinnerContext);

    // 데이터 조회 API
    const mainListData = useMutation(
        async (data) => {
            const params = data?.params || {};
            const user = params.user || "";

            if (params.gb === "list") {
                // 1. Start sync job
                const startRes = await api.post({
                    gb: "list_start",
                    user: user
                }, "/project", "API_BASE_URL_OPENAI");

                if (startRes?.success !== "777") {
                    throw new Error(startRes?.Message || "동기화 시작에 실패했습니다.");
                }

                const jobId = startRes.resultjson?.jobId;
                if (!jobId) {
                    throw new Error("Job ID가 생성되지 않았습니다.");
                }

                // 2. Poll job progress
                return new Promise((resolve, reject) => {
                    let pollCount = 0;
                    const interval = setInterval(async () => {
                        try {
                            pollCount++;

                            // 실제 리얼 연동 모드
                            const progressRes = await api.post({
                                gb: "list_progress",
                                jobid: jobId,
                                user: user
                            }, "/project", "API_BASE_URL_OPENAI");

                            if (progressRes?.success !== "777") {
                                clearInterval(interval);
                                if (window.__onProjectSyncProgress) {
                                    window.__onProjectSyncProgress({ percent: 0, message: "", status: "failed" });
                                }
                                reject(new Error(progressRes?.Message || "동기화 진행 중 오류가 발생했습니다."));
                                return;
                            }

                            const resultjson = progressRes.resultjson || {};
                            const status = resultjson.status;
                            const percent = typeof resultjson.percent === "number" ? resultjson.percent : 0;
                            const message = resultjson.message || "";

                            if (window.__onProjectSyncProgress) {
                                window.__onProjectSyncProgress({ percent, message, status });
                            }

                            if (status === "completed") {
                                clearInterval(interval);
                                let projects = resultjson.resultjson ?? [];
                                resolve({
                                    success: "777",
                                    resultjson: projects
                                });
                            } else if (status === "failed") {
                                clearInterval(interval);
                                reject(new Error(message || "동기화 처리에 실패했습니다."));
                            } else if (pollCount > 180) { // 3분 타임아웃
                                clearInterval(interval);
                                reject(new Error("동기화 작업 시간이 초과되었습니다."));
                            }
                        } catch (e) {
                            clearInterval(interval);
                            if (window.__onProjectSyncProgress) {
                                window.__onProjectSyncProgress({ percent: 0, message: "", status: "failed" });
                            }
                            reject(e);
                        }
                    }, 1000);
                });
            } else {
                return await api.post(params, "/project", "API_BASE_URL_OPENAI");
            }
        },
        {
            onMutate: (vars) => {
                if (vars?.params?.gb !== "list") {
                    loadingSpinner.show();
                }
            },
            onSettled: (data, error, vars) => {
                if (vars?.params?.gb !== "list") {
                    loadingSpinner.hide();
                }
            }
        }
    );

    return {
        mainListData
    };
}
