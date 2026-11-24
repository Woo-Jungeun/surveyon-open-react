import { createStore } from "redux";
import persistedReducer from "@/common/redux/reducer/RootReducers";

const store =
    globalThis.__SURVEYON_REDUX_STORE__ ??
    (globalThis.__SURVEYON_REDUX_STORE__ = createStore(persistedReducer));

export default store;
