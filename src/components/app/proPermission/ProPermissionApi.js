import { useMutation } from "react-query";
import api from "@/common/queries/Api.js";
import { useContext } from "react";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";

/**
 * 사용자 설정 > API
 *
 * @author jewoo
 * @since 2025-10-02<br />
 */
export function ProPermissionApi() {

    const loadingSpinner = useContext(loadingSpinnerContext);

    // 데이터 조회 API
    const proEnterData = useMutation(
        async (data) => await api.post(data.params, "/pro_enter_api.aspx"),
        {
         onMutate: (vars) => { 
            loadingSpinner.show(); 
        },
         onSettled: () => {  
            loadingSpinner.hide(); 
        }
        }
    );
    // 보기 등록 API
    const proEnterSaveData = useMutation(
        async (data) => await api.post(data, "/pro_enter_api.aspx"),
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
        proEnterData,
        proEnterSaveData
    };
}
