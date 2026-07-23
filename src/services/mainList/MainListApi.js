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
                // gb가 "list"일 때 로딩바의 show/hide를 1:1로 매칭시켜 전역 카운터 꼬임 현상을 방지합니다.
                loadingSpinner.show();
                let hasHiddenSpinner = false;

                const safeHideSpinner = () => {
                    if (!hasHiddenSpinner) {
                        hasHiddenSpinner = true;
                        loadingSpinner.hide();
                    }
                };

                try {
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

                    // 2. 즉시 첫 번째 progress 상태를 한 번 조회하여 동기화 진행 상태 확인
                    const firstProgressRes = await api.post({
                        gb: "list_progress",
                        jobid: jobId,
                        user: user
                    }, "/project", "API_BASE_URL_OPENAI");

                    if (firstProgressRes?.success !== "777") {
                        throw new Error(firstProgressRes?.Message || "동기화 상태 조회에 실패했습니다.");
                    }

                    const resultjson = firstProgressRes.resultjson || {};
                    const status = resultjson.status;

                    // 이미 완료된 상태라면 원래 로딩바만 닫고 바로 조회 결과 표출 (프로그래스바 노출 안 함)
                    if (status === "completed") {
                        safeHideSpinner();
                        let projects = resultjson.resultjson ?? [];
                        return {
                            success: "777",
                            resultjson: projects
                        };
                    }

                    // 3. Poll job progress (나머지 폴링 수행)
                    return new Promise((resolve, reject) => {
                        let pollCount = 1;
                        let showProgressBar = false; // 프로그래스바 노출 여부 플래그

                        const interval = setInterval(async () => {
                            try {
                                pollCount++;

                                const progressRes = await api.post({
                                    gb: "list_progress",
                                    jobid: jobId,
                                    user: user
                                }, "/project", "API_BASE_URL_OPENAI");

                                if (progressRes?.success !== "777") {
                                    clearInterval(interval);
                                    if (window.__onProjectSyncProgress) {
                                        window.__onProjectSyncProgress(null);
                                    }
                                    safeHideSpinner();
                                    reject(new Error(progressRes?.Message || "동기화 진행 중 오류가 발생했습니다."));
                                    return;
                                }

                                const resJson = progressRes.resultjson || {};
                                const curStatus = resJson.status;
                                const curPercent = typeof resJson.percent === "number" ? resJson.percent : 0;
                                const curMessage = resJson.message || "";

                                if (curStatus === "completed") {
                                    clearInterval(interval);
                                    if (window.__onProjectSyncProgress) {
                                        window.__onProjectSyncProgress(null); // 프로그래스바 제거
                                    }
                                    safeHideSpinner();
                                    let projects = resJson.resultjson ?? [];
                                    resolve({
                                        success: "777",
                                        resultjson: projects
                                    });
                                    return;
                                } else if (curStatus === "failed") {
                                    clearInterval(interval);
                                    if (window.__onProjectSyncProgress) {
                                        window.__onProjectSyncProgress(null);
                                    }
                                    safeHideSpinner();
                                    reject(new Error(curMessage || "동기화 처리에 실패했습니다."));
                                    return;
                                }

                                // 1초(폴링 2회차 시작 시점) 경과 시 원래 로딩바를 숨기고 프로그래스바 전환
                                if (!showProgressBar && pollCount >= 2) {
                                    showProgressBar = true;
                                    safeHideSpinner(); // 원래 로딩바 숨김
                                }

                                if (showProgressBar) {
                                    if (window.__onProjectSyncProgress) {
                                        window.__onProjectSyncProgress({
                                            percent: curPercent,
                                            message: curMessage,
                                            status: curStatus
                                        });
                                    }
                                }

                                if (pollCount > 180) { // 3분 타임아웃
                                    clearInterval(interval);
                                    safeHideSpinner();
                                    reject(new Error("동기화 작업 시간이 초과되었습니다."));
                                }
                            } catch (e) {
                                clearInterval(interval);
                                if (window.__onProjectSyncProgress) {
                                    window.__onProjectSyncProgress(null);
                                }
                                safeHideSpinner();
                                reject(e);
                            }
                        }, 1000);
                    });

                } catch (err) {
                    safeHideSpinner();
                    throw err;
                }
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
