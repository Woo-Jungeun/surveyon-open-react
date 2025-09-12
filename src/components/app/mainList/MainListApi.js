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
        async (data) => await api.post(data.params, "/main_list_api.aspx"),
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
        mainListData
    };
}
