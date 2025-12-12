import { useMutation } from "react-query";
import api from "@/common/queries/Api.js";
import { useContext } from "react";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";

/**
 *  분석 > API
 *
 * @author jewoo
 * @since 2025-08-08<br />
 */
export function OptionSettingApi() {

    const loadingSpinner = useContext(loadingSpinnerContext);

    // 데이터 조회 API
    const optionEditData = useMutation(
        async (data) => await api.post(data.params, "/option_edit_api.aspx"),
        {
            onMutate: (variables) => {
                if (variables?.params?.gb !== "info" && variables?.params?.gb !== "del_qnum") loadingSpinner.show();
            },
            onSettled: (variables) => {
                if (variables?.params?.gb !== "info" && variables?.params?.gb !== "del_qnum") loadingSpinner.hide();
            }
        }
    );

    // 데이터 저장 API
    const optionSaveData = useMutation(
        (data) => api.post(data, "/option_save_api.aspx"),
        {
            onMutate: (variables) => {
                if (variables?.gb !== "info" && variables?.gb !== "lb") loadingSpinner.show();
            },
            onSettled: (data, error, variables) => {
                if (variables?.gb !== "info" && variables?.gb !== "lb") loadingSpinner.hide();
            }
        }
    );

    // // 분석 시작(start) - x-www-form-urlencoded
    const optionAnalysisStart = useMutation(
        async (data) => {
            //loadingSpinner.show();
            return await api.urlencoded("/option_analysis_api.aspx", data);
        },
        {
            //onSettled: () => loadingSpinner.hide()
        }
    );

    // 상태(status) - GET ?action=status&job=...
    const optionAnalysisStatus = useMutation(
        async (params) => await api.getWithParams("/option_analysis_api.aspx", params)
    );

    // 초기화(clear) - GET ?action=clear&job=...
    const optionAnalysisClear = useMutation(
        async (params) => await api.getWithParams("/option_analysis_api.aspx", params)
    );

    // 분석 상태값 api
    const optionStatus = useMutation(
        async (params) => {
            return await api.post(params, "/option_status_api.aspx");
        }
    );

    // 보기 불러오기 api -projectlist
    const projectListData = useMutation(
        async (data) => await api.post(data.params, "/pro_exload_api.aspx"),
        {
            onMutate: (vars) => {
                //loadingSpinner.show(); 
            },
            onSettled: () => {
                //loadingSpinner.hide(); 
            }
        }
    );

    // 보기 불러오기 api -excellist
    const excelListData = useMutation(
        async (data) => await api.post(data, "/pro_exload_api.aspx"),
        {
            onMutate: (vars) => {
                //loadingSpinner.show(); 
            },
            onSettled: () => {
                //loadingSpinner.hide(); 
            }
        }
    );

    // 샘플 다운로드 
    const sampleDownloadData = useMutation(
        async (data) => await api.file(data, "/pro_exload_api.aspx"),
        {
            onMutate: (vars) => {
                //loadingSpinner.show(); 
            },
            onSettled: () => {
                //loadingSpinner.hide(); 
            }
        }
    );
    // 엑셀 파일 다운로드
    const excelDownloadData = useMutation(
        async (data) => await api.file(data, "/option_edit_api.aspx"),
        {
            onMutate: (vars) => {
                //loadingSpinner.show(); 
            },
            onSettled: () => {
                //loadingSpinner.hide(); 
            }
        }
    );


    return {
        optionEditData,
        optionSaveData,
        optionAnalysisStart,
        optionAnalysisStatus,
        optionAnalysisClear,
        optionStatus,
        projectListData,
        excelListData,
        sampleDownloadData,
        excelDownloadData
    };
}
