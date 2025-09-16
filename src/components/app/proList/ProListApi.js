import { useMutation } from "react-query";
import api from "@/common/queries/Api.js";
import { useContext } from "react";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";

/**
 *  문항 목록 > API
 *
 * @author jewoo
 * @since 2025-09-16<br />
 */
export function ProListApi() {

    const loadingSpinner = useContext(loadingSpinnerContext);

    // 데이터 조회 API
    const proListData = useMutation(
        async (data) => await api.post(data.params, "/pro_list_api.aspx"),
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
        proListData
    };
}
