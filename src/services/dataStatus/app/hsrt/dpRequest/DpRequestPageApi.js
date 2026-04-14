import { useMutation } from "react-query";
import api from "@/common/queries/Api.js";
import { useContext } from "react";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";

export function DpRequestPageApi() {

    const loadingSpinner = useContext(loadingSpinnerContext);

    /** DP 의뢰서 - 배너 및 기본 정보 가져오기 */
    const getBannerDetail = useMutation(
        async (data) => await api.post(data, "/dp-request/banner/detail", "API_BASE_URL_DATASTATUS")
    );

    /** 자동 배너 구성 마법사 - 기본 변수 목록 */
    const getBaseVariableList = useMutation(
        async (data) => await api.post(data, "/variables/base/list", "API_BASE_URL_DATASTATUS")
    );

    /** DP 의뢰서 - 테이블 설정 초기 맥락 조회 */
    const getTableRenderContext = useMutation(
        async (data) => await api.post(data, "/dp-request/table/render-context", "API_BASE_URL_DATASTATUS")
    );

    /** DP 의뢰서 - 테이블 설정 저장 */
    const saveTableSettings = useMutation(
        async (data) => await api.post(data, "/dp-request/table/save", "API_BASE_URL_DATASTATUS")
    );

    /** DP 의뢰서 - 전체 컨텍스트(단계별 상태/카운트) 조회 */
    const getDpContext = useMutation(
        async (data) => await api.post(data, "/dp-request/context", "API_BASE_URL_DATASTATUS")
    );

    /** 자동 배너 구성 - 배너 생성 API */
    const generateBanner = useMutation(
        async (data) => await api.post(data, "/dp-request/banner/generate", "API_BASE_URL_DATASTATUS"),
        {
            onMutate: (vars) => {
                loadingSpinner.show();
            },
            onSettled: () => {
                loadingSpinner.hide();
            }
        }
    );

    return {
        getBannerDetail,
        getBaseVariableList,
        getTableRenderContext,
        saveTableSettings,
        getDpContext,
        generateBanner,
    };
}
