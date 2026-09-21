import { useMutation } from "react-query";
import api from "@/common/queries/Api.js";
import { useContext } from "react";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";

/**
 * 문항 등록 > Core API 서비스 
 *
 * @author jewoo
 * @since 2026-09-18
 */
export function ProRegisterApi() {
    const loadingSpinner = useContext(loadingSpinnerContext);

    // [1] DB 문항 및 신규 완료자 PID 대기 목록 고속 조회 (POST /pro_register/db_select)
    const fetchRegisterDbList = useMutation(
        async (data) => {
            const params = data?.params || data || {};
            const payload = {
                projectnum: params.projectnum || sessionStorage.getItem("projectnum") || "",
                server: params.server || sessionStorage.getItem("servername") || "rps",
                user: params.user || ""
            };
            return await api.post(payload, "/pro_register/db_select", "API_BASE_URL_OPENAI");
        }
    );

    // [2] DB 오픈데이터 및 신규 완료자 PID 일괄 등록/병합 (POST /pro_register/db_enter)
    const enterRegisterDb = useMutation(
        async (payload) => await api.post(payload, "/pro_register/db_enter", "API_BASE_URL_OPENAI"),
        {
            onMutate: () => {
                loadingSpinner?.show?.({
                    content: "신규 완료자 PID 및 오픈데이터를 일괄 등록 중입니다...",
                });
            },
            onSettled: () => {
                loadingSpinner?.hide?.();
            }
        }
    );

    // [3] 엑셀 업로드용 표준 템플릿 파일 다운로드 (POST /pro_register/excel_sample)
    const getExcelSample = useMutation(
        async (payload) => await api.file(payload || {}, "/pro_register/excel_sample", "API_BASE_URL_OPENAI")
    );

    // [4] 엑셀 파일 업로드 및 컬럼/문항 파싱 (FILE /pro_register/excel_parse)
    const parseExcelRegister = useMutation(
        async (formData) => await api.form(formData, "/pro_register/excel_parse", {}, "API_BASE_URL_OPENAI")
    );

    // [5] 파싱된 엑셀 오픈데이터 최종 등록 (POST /pro_register/excel_enter)
    const enterExcelRegister = useMutation(
        async (payload) => await api.post(payload, "/pro_register/excel_enter", "API_BASE_URL_OPENAI"),
        {
            onMutate: () => {
                loadingSpinner?.show?.({
                    content: "엑셀 오픈데이터를 저장 중입니다...",
                });
            },
            onSettled: () => {
                loadingSpinner?.hide?.();
            }
        }
    );

    return {
        fetchRegisterDbList,
        enterRegisterDb,
        getExcelSample,
        parseExcelRegister,
        enterExcelRegister,

        // 하위 호환용 래퍼 레퍼런스
        proRegisterMutation: enterRegisterDb,
        sampleDownloadData: getExcelSample
    };
}
