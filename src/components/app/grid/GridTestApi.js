import { useMutation } from "react-query";
import api from "@/common/queries/Api.js";
import {useContext} from "react";
import {loadingSpinnerContext} from "@/components/common/LoadingSpinner.jsx";

/**
 * 메뉴 API
 *
 * @author jewoo
 * @since 2024-04-23<br />
 */
export function GridTestApi() {

    const loadingSpinner = useContext(loadingSpinnerContext);

    const getSampleData = useMutation(
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

    const insertMenuLogMutation = useMutation(
        async (data) => {
            return await api.post(data, "/v1/user-menu/create");
        },
        {
            onSuccess: (res, data) => {
                // console.log("getComboUserMutation", res, data);
            },
            onSettled: (data, error, variables, context) => {
                //do...

            }
        }
    );


    return {
        getSampleData,
        insertMenuLogMutation
    };
}
