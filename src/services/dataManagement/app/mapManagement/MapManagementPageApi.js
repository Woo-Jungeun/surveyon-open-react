import { useMutation } from "react-query";
import api from "@/common/queries/Api.js";
import { useContext } from "react";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import axios from "axios";

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
        async (args) => {
            try {
                if (args && args.data && args.config) {
                    return await api.file(args.data, "/export", "API_BASE_URL_DATAMANAGEMENT", args.config);
                }
                return await api.file(args, "/export", "API_BASE_URL_DATAMANAGEMENT");
            } catch (err) {
                if (axios.isCancel(err) || err?.name === 'CanceledError' || err?.name === 'AbortError' || err?.code === 'ERR_CANCELED') {
                    return null;
                }
                throw err;
            }
        }
    );

    /** SPS 파일 업로드 */
    const uploadSpss = useMutation(
        async (data) => await api.post(data, "/upload", "API_BASE_URL_DATAMANAGEMENT"),
        {
            onMutate: () => loadingSpinner.show(),
            onSettled: () => loadingSpinner.hide(),
        }
    );

    /** 데이터 불러오기 (SAV) */
    const updateDataFromSav = useMutation(
        async (data) => await api.post(data, "/data/update-from-sav", "API_BASE_URL_DATAMANAGEMENT"),
        {
            onMutate: () => loadingSpinner.show(),
            onSettled: () => loadingSpinner.hide(),
        }
    );

    /** Re-Label 자동 생성 */
    const generateRelabels = useMutation(
        async (data) => await api.post(data, "/generate-relabels", "API_BASE_URL_DATAMANAGEMENT"),
        {
            onMutate: () => loadingSpinner.show(),
            onSettled: () => loadingSpinner.hide(),
        }
    );

    /** 데이터 맵 새로고침 (저장 후 싱크용) */
    const syncMap = useMutation(
        async (data) => await api.post(data, "/data/sync", "API_BASE_URL_DATAMANAGEMENT"),
        {
            onMutate: () => loadingSpinner.show(),
            onSettled: () => loadingSpinner.hide(),
        }
    );

    /** 맵 새로고침 (큐마스터 연동) */
    const updateMap = useMutation(
        async (data) => await api.post(data, "/update-map", "API_BASE_URL_DATAMANAGEMENT"),
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
        exportData,
        uploadSpss,
        updateDataFromSav,
        generateRelabels,
        syncMap,
        updateMap
    };
}
