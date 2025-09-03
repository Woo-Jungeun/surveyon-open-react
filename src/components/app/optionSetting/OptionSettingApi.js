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

    // 번역/보기/응답자New/추가 버튼 이벤트 API
    const optionAnalysisData = useMutation(
        async (data) => {
            loadingSpinner.show();
            return await api.post(data, "/o/option_analysis_api.aspx");
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

    return {
        optionEditData,
        optionSaveData,
        optionAnalysisData
    };
}
