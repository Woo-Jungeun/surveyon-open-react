import { useMutation } from "react-query";
import api from "@/common/queries/Api.js";
import { useContext } from "react";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";

export function MapManagementPageApi() {

    const loadingSpinner = useContext(loadingSpinnerContext);

    /** 맵 관리 조회 */
    const getMapVariables = useMutation(
        async (data) => await api.post(data, "/read", "API_BASE_URL_DATAMANAGEMENT"),
        {
            onMutate: (vars) => {
                // loadingSpinner.show();
            }
        }
    );

    /** H-SRT 이관 */
    const srtTransfer = useMutation(
        async (data) => await api.file(data, "/map/variables/bake-parquet", "API_BASE_URL_DATAMANAGEMENT"),
        {
            onMutate: () => loadingSpinner.show(),
            onSettled: () => loadingSpinner.hide(),
        }
    );

    /** 맵 관리 신규 행 생성 */
    const createMapVariables = useMutation(
        async (data) => await api.post(data, "/map/variables/create", "API_BASE_URL_DATAMANAGEMENT"),
        {
            onMutate: () => loadingSpinner.show(),
            onSettled: () => loadingSpinner.hide(),
        }
    );

    /** 맵 관리 저장 (수정/삭제) */
    const updateMapVariables = useMutation(
        async (data) => await api.post(data, "/map/variables/update", "API_BASE_URL_DATAMANAGEMENT"),
        {
            onMutate: () => loadingSpinner.show(),
            onSettled: () => loadingSpinner.hide(),
        }
    );

    /** 보기 레이블 저장 (수정/삭제) */
    const updateMapLabels = useMutation(
        async (data) => await api.post(data, "/map/labels/update", "API_BASE_URL_DATAMANAGEMENT"),
        {
            onMutate: () => loadingSpinner.show(),
            onSettled: () => loadingSpinner.hide(),
        }
    );

    /** 보기 레이블 신규 생성 */
    const createMapLabels = useMutation(
        async (data) => await api.post(data, "/map/labels/create", "API_BASE_URL_DATAMANAGEMENT"),
        {
            onMutate: () => loadingSpinner.show(),
            onSettled: () => loadingSpinner.hide(),
        }
    );

    /** 데이터 추출 (SPS/CRD) */
    const exportData = useMutation(
        async (data) => await api.file(data, "/export", "API_BASE_URL_DATAMANAGEMENT"),
        {
            onMutate: () => loadingSpinner.show(),
            onSettled: () => loadingSpinner.hide(),
        }
    );

    return {
        getMapVariables,
        srtTransfer,
        createMapVariables,
        updateMapVariables,
        updateMapLabels,
        createMapLabels,
        exportData
    };
}
