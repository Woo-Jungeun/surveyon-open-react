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
        async (data) => {
            // loadingSpinner.show();
            return await api.get(data, "/o/option_edit_api.aspx");
        },
        {
            onSuccess: (res, data) => {
            },
            onSettled: (data, error, variables, context) => {
                //do...
                // loadingSpinner.hide();
            }
        }
    );

    // 데이터 저장 API
    const optionSaveData = useMutation(
        async (data) => {
            loadingSpinner.show();
            return await api.post(data, "/o/option_save_api.aspx");
        },
        {
            onSuccess: (res, data) => {
            },
            onSettled: (data, error, variables, context) => {
                //do...
                loadingSpinner.hide();
            }
        }
    );

    // 분석 시작(start) - x-www-form-urlencoded
    const optionAnalysisStart = useMutation(
        async (data) => {
            loadingSpinner.show();
            return await api.urlencoded("/o/option_analysis_api.aspx", data);
        },
        {
            onSettled: () => loadingSpinner.hide()
        }
    );

    // 상태(status) - GET ?action=status&job=...
    const optionAnalysisStatus = useMutation(
        async (params) => await api.getWithParams("/o/option_analysis_api.aspx", params)
    );

    // 초기화(clear) - GET ?action=clear&job=...
    const optionAnalysisClear = useMutation(
        async (params) => await api.getWithParams("/o/option_analysis_api.aspx", params)
    );

    return {
        optionEditData,
        optionSaveData,
        optionAnalysisStart,
        optionAnalysisStatus,
        optionAnalysisClear,
    };
}
