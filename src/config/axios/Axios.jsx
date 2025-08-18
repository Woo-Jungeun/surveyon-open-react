import axios from "axios";
import { persistor } from "@/common/redux/store/StorePersist.jsx";

//axios.defaults.baseURL = API_URL;
axios.defaults.withCredentials = true;
axios.defaults.headers['Content-Type'] = 'application/json;charset=utf-8';
axios.defaults.headers['Access-Control-Allow-Origin'] = '*';
axios.defaults.timeout = 1000000000;

const baseURL = import.meta.env.VITE_API_BASE_URL;
export const apiAxios = axios.create({
     baseURL,
});

apiAxios.interceptors.request.use(function (config) {
    //운송사 id
    return config;
}, function (error) {
    return Promise.reject(error);
});

function setCookie(cookieName, cookieValue, cookieExpire, cookiePath, cookieDomain, cookieSecure){
    let cookieText=escape(cookieName)+'='+escape(cookieValue);
    cookieText+=(cookieExpire ? '; EXPIRES='+cookieExpire.toGMTString() : '');
    cookieText+=(cookiePath ? '; PATH='+cookiePath : '');
    cookieText+=(cookieDomain ? '; DOMAIN='+cookieDomain : '');
    cookieText+=(cookieSecure ? '; SECURE' : '');
    document.cookie=cookieText;
}

function getCookie(cookieName){
    let cookieValue=null;
    if(document.cookie){
        const array=document.cookie.split((escape(cookieName)+'='));
        if(array.length >= 2){
            const arraySub=array[1].split(';');
            cookieValue=unescape(arraySub[0]);
        }
    }
    return cookieValue;
}

function deleteCookie(cookieName){
    var temp=getCookie(cookieName);
    if(temp){
        setCookie(cookieName,temp,(new Date(1)));
    }
}

apiAxios.interceptors.response.use(function (response) {
    const {status, data, headers, config} = response;
    if (data.status === "NS_ER_AT_03") {
        if (!config.headers.get('Authorization')) { /* refreshToken 없으면 request header에 refreshToken 셋팅 후 api 재요청*/
            config.headers.set('Authorization', "Bearer " + atob(getCookie("GS_RFT")))//refreshToken 셋팅
            return apiAxios.request(config);   // api 재조회
        } else {        /* refreshToken 있으면 로그인화면으로 이동 */
            persistor.purge();
            deleteCookie("GS_RFT")
        }
    }

    if (data.status === "NS_ER_AT_01") {
        // 권한 없을 시 로그아웃(NS_ER_AT_01: token없음, NS_ER_AT_02: 중복 로그인)
        deleteCookie("GS_RFT")
        persistor.purge();
    }else if(data.status === "NS_ER_AT_02"){
        persistor.purge();
        deleteCookie("GS_RFT")
        return {data: {status: "NS_ER_AT_02", message: "중복 로그인이 감지되었습니다."}};
    }
    if (data.status === "NS_ER_CT_01") {
        // url Not Found 화면 이동(NS_ER_CT_01: url 찾을 수 없음)
        window.location.href = '/pageNotFound/PageNotFound'
    }
    return response;

}, function (error) {
    try {
        const {status, data, headers, config} = error.response;
        if (data.status === "NS_ER_AT_01") {
            // 권한 없을 시 로그아웃(NS_ER_AT_01: token없음, NS_ER_AT_02: 중복 로그인)
            deleteCookie("GS_RFT")
            persistor.purge();
        }else if(data.status === "NS_ER_AT_02"){
            persistor.purge();
            deleteCookie("GS_RFT")
            return {data: {status: "NS_ER_AT_02", message: "중복 로그인이 감지되었습니다."}};
        }

        return {data: {status: "NS_ER_SV_01", message: "요청한 서비스에 문제가 발생했습니다. 잠시 후에 다시 시도해 주세요."}};

    } catch (e) {
        deleteCookie("GS_RFT")
        persistor.purge();
        return {data: {status: "NS_ER_SV_01", message: "요청한 서비스에 문제가 발생했습니다. 잠시 후에 다시 시도해 주세요."}};
    }
});
