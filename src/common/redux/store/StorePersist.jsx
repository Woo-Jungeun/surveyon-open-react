import store from "@/common/redux/store/Store";
import { persistStore } from "redux-persist";

export const persistor = persistStore(store);
