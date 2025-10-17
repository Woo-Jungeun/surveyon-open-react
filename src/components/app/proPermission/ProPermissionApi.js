import { useMutation } from "react-query";
import api from "@/common/queries/Api.js";
import { useContext } from "react";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";

/**
 * 사용자 설정 > API
 *
 * @author jewoo
 * @since 2025-10-17<br />
 */
export function ProPermissionApi() {

    const loadingSpinner = useContext(loadingSpinnerContext);

  const proPermissionData = useMutation(
         async (data) => await api.post(data?.params, "/pro_permission_api.aspx"),
         {
             onMutate: (vars) => {
               // gb 값이 api_useyn_update일 경우 로딩바 표시하지 않음
               const gbValue = vars?.params?.gb;
               if (gbValue !== "api_useyn_update") {
                 loadingSpinner.show();
               }
             },
             onSettled: (data, error, vars) => {
               // gb값이 api_useyn_update가 아닐 때만 닫기
               const gbValue = vars?.params?.gb;
               if (gbValue !== "api_useyn_update") {
                 loadingSpinner.hide();
               }
             },
           }
         );

    return {
        proPermissionData,
    };
}
