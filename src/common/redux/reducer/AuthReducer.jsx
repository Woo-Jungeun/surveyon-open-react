import { LOGIN, LOGOUT } from "@/common/redux/action/AuthAction";
import { PURGE } from "redux-persist";

const initialize = {
    isLogin : false,
    user : null
};

export const auth = (state = initialize, action) => {
    switch(action.type) {
        case LOGIN:
            return {
                isLogin : true,
                user : {...action.payload}
            };
        case LOGOUT:
            return {
                isLogin : false,
                user : null
            };
        case PURGE:
            return initialize;
        default:
            return state;
    }
};
