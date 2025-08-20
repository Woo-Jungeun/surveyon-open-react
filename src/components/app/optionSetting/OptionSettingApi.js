import { useMutation } from "react-query";
import api from "@/common/queries/Api.js";
import {useContext} from "react";
import {loadingSpinnerContext} from "@/components/common/LoadingSpinner.jsx";

/**
 *  분석 > API
 *
 * @author jewoo
 * @since 2025-08-08<br />
 */
export function OptionSettingApi() {

    const loadingSpinner = useContext(loadingSpinnerContext);

    //데이터 가져오기 
    const getGridData = useMutation(
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

    //데이터 저장  
    const saveGridData = useMutation(
        async (data) => {
            // loadingSpinner.show();
            return await api.get(data, "/o/option_save_api.aspx");
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

    return {
        getGridData,
        saveGridData
    };
}
