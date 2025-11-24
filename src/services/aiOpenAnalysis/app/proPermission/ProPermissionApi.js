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
                 loadingSpinner.show();
             },
             onSettled: (data, error, vars) => {
                 loadingSpinner.hide();
             },
           }
         );

    return {
        proPermissionData,
    };
}
