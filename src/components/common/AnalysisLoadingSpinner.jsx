import { createContext, Fragment, useState, useEffect } from "react";
import "@/assets/css/loading-spinner.css";

// 분석 전용 로딩바 
// context를 생성해야지만 전역으로 사용할 수 있음
export const loadingSpinnerContext = createContext(null);

/**
 * @className : LoadingProvider
 * @description : Loading Spinner Provider 컴포넌트
 * @date : 2021-03-09 오전 10:59
 * @author : chauki
 * @version : 1.0.0
 * @see
 * @history :
**/
let cnt = 0;
function LoadingProvider(props) {
    //state 설정
    const [spinner, setSpinner] = useState({
        loading: false,
        content: null,
        target: null,
    });



    /**
     * @funcName : show
     * @description : Loading Spinner를 show 한다.
     * @param target : target 엘리먼트(optional) - target 엘리먼트 내에 loading spinner 생성
     * @param color : loading spinner color(optional)
     * @param size : loading spinner size(optional)
     * @return :
     * @exception :
     * @date : 2021-03-09 오전 11:03
     * @author : chauki
     * @see
     * @history :
    **/
    const show = (param) => {
        cnt += 1;

        setSpinner((s) => ({
            ...s,
            loading: true,
            content: param?.content ?? s.content,
            target: param?.target ?? s.target,
        }));
    }

    /**
     * @funcName : hide
     * @description : Loading Spinner를 hide 한다.
     * @param :
     * @return :
     * @exception :
     * @date : 2021-03-09 오전 11:27
     * @author : chauki
     * @see
     * @history :
    **/
    const hide = () => {
        if (cnt <= 0) return;     // 짝 안 맞는 hide 무시 (음수 방지)
        cnt -= 1;
        if (cnt === 0) {
            setSpinner((s) => ({ ...s, loading: false, content: null }));
        }
    }


    /**
     * @funcName : clear
     * @description : loading spinner를 clear 한다.
     * @param :
     * @return :
     * @exception :
     * @date : 2021-03-11 오전 11:58
     * @author : chauki
     * @see
     * @history :
    **/
    const clear = () => {
        hide();
    }

    return (
        <loadingSpinnerContext.Provider value={{ show, hide, clear }} {...props}>
            {props.children}
            <LoadingSpinner
                loading={spinner.loading}
                content={spinner.content}
                target={spinner.target}
            />
        </loadingSpinnerContext.Provider>
    )
}

/**
 * @className : LoadingSpinner
 * @description : Loading Spinner 컴포넌트
 * @date : 2021-03-09 오전 11:27
 * @author : chauki
 * @version : 1.0.0
 * @see
 * @history :
**/
function LoadingSpinner(props) {
    const { loading, content, target } = props;

    let maskStyle;

    if (target !== null) {
        const rect = target.getBoundingClientRect();
        maskStyle = {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height
        };
    }

    return (
        <Fragment>
            {
                loading
                    ? <article className={"modal on no-dim"} style={maskStyle}>
                        <div className="loading">
                            <div className="survey-loading-spinner">
                                <div className="dot"></div>
                                <div className="dot"></div>
                                <div className="dot"></div>
                                <div className="dot"></div>
                            </div>
                            <p>분석 중입니다...</p>
                        </div>
                    </article>
                    : null
            }
        </Fragment>
    );
}
export default LoadingProvider;
