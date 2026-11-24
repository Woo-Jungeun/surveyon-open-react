import store from "@/common/redux/store/Store";
import { persistStore } from "redux-persist";

export const persistor =
    globalThis.__SURVEYON_REDUX_PERSISTOR__ ??
    (globalThis.__SURVEYON_REDUX_PERSISTOR__ = persistStore(store));
