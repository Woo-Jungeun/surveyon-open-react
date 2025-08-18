import { combineReducers } from "redux";
import { persistReducer } from "redux-persist";
import { CookieStorage } from "redux-persist-cookie-storage";
import { auth } from "@/common/redux/reducer/AuthReducer";
import Cookies from 'cookies-js'
import storage from "redux-persist/lib/storage";

const persistConfig = {
    key: 'root@iksanbms',
    storage: new CookieStorage(Cookies/*, options */) ,
    //storage,
    whiteList : []
};

// rootReducer -> 여러 reducer를 사용하는 경우 reducer를 하나로 묶어주는 메소드
// store에 저장되는 리듀서는 오직 1개
const rootReducer = combineReducers({
    auth
});

export default persistReducer(persistConfig, rootReducer);
