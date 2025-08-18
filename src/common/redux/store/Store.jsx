import { createStore } from "redux";
import persistedReducer from "@/common/redux/reducer/RootReducers";

export default createStore(persistedReducer);
