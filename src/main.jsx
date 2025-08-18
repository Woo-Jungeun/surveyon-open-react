import {Fragment} from "react";
import ReactDOM from "react-dom/client";
import App from "@/App.jsx";
import { BrowserRouter } from "react-router-dom";
// import '@progress/kendo-theme-default/dist/all.css'

/* 기본 contextAPI 컴포넌트 */
import ModalProvider from "@/components/common/Modal";
import LoadingProvider from "@/components/common/LoadingSpinner";
import WindowPopupProvider from "@/components/common/WindowPopup";

/* redux */
import { Provider } from "react-redux";
import store from "@/common/redux/store/Store";
import { PersistGate } from "redux-persist/integration/react";
import { persistor } from "@/common/redux/store/StorePersist";

/* kendo react 한글 컴포넌트 관련 */
import { IntlProvider, loadMessages, LocalizationProvider } from "@progress/kendo-react-intl";
import likelySubtags from 'cldr-core/supplemental/likelySubtags.json';
import currencyData from 'cldr-core/supplemental/currencyData.json';
import weekData from 'cldr-core/supplemental/weekData.json';
import bgNumbers from 'cldr-numbers-full/main/ko/numbers.json';
import bgLocalCurrency from 'cldr-numbers-full/main/ko/currencies.json';
import bgCaGregorian from 'cldr-dates-full/main/ko/ca-gregorian.json';
import bgDateFields from 'cldr-dates-full/main/ko/dateFields.json';
import deNumbers from 'cldr-numbers-full/main/de/numbers.json';
import deLocalCurrency from 'cldr-numbers-full/main/de/currencies.json';
import deCaGregorian from 'cldr-dates-full/main/de/ca-gregorian.json';
import deDateFields from 'cldr-dates-full/main/de/dateFields.json';
import { load } from "@progress/kendo-react-intl";
import language from "@/config/kendo/language.json"
load(likelySubtags, currencyData, weekData, bgLocalCurrency, bgNumbers, bgCaGregorian, bgDateFields, deLocalCurrency, deNumbers, deCaGregorian, deDateFields);

import {QueryClient, QueryClientProvider} from "react-query";
const queryClient = new QueryClient();

loadMessages(language, "ko")
ReactDOM.createRoot(document.getElementById("root")).render(
    <Fragment>
        <Provider store={store}>
            <PersistGate persistor={persistor}>
                <LocalizationProvider language={'ko'} >
                    <IntlProvider locale={'ko-KR'}>
                        <LoadingProvider>
                            <QueryClientProvider client={queryClient}>
                                <ModalProvider>
                                    <WindowPopupProvider>
                                        <BrowserRouter>
                                            <App/>
                                        </BrowserRouter>
                                    </WindowPopupProvider>
                                </ModalProvider>
                            </QueryClientProvider>
                        </LoadingProvider>
                    </IntlProvider>
                </LocalizationProvider>
            </PersistGate>
        </Provider>
    </Fragment>
);
