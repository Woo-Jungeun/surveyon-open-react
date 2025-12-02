import { createContext, Fragment, useLayoutEffect, useRef, useState, useEffect } from "react";
import { Window } from "@progress/kendo-react-dialogs";
import { Button } from "@progress/kendo-react-buttons";
import { useLocation } from "react-router-dom";

//context 생성
//context를 생성해야지만 전역으로 사용할 수 있음
export const modalContext = createContext(null);

/**
 *  Modal Provider 컴포넌트
 *
 *  @author jewoo
 *   @since 2024-05-14<br />
 **/
function ModalProvider(props) {
    //state 정의
    const [modal, setModal] = useState({
        type: "alert",
        title: "알림",
        content: "",
        btnList: null,
        show: false,
        isBtnHide: false,
        confirmCallback: null,
        options: null,
        width: 400,
        code: "",
        visibleOn: null,             // string | RegExp | (path)=>boolean | null
        autoCloseOnRouteChange: true,// 라우트 바뀌면 자동 닫기
        zIndex: undefined            // 필요시 z-index 제어
    });
    const { pathname } = useLocation();

    const matchPath = (rule) => {
        if (!rule) return true;                 // 제한 없음 → 어디서든 표시
        if (typeof rule === "string") return pathname === rule;
        if (rule instanceof RegExp) return rule.test(pathname);
        if (typeof rule === "function") return !!rule(pathname);
        return true;
    };

    // 라우트가 바뀌면: (1) 해당 라우트가 아니면 렌더 차단, (2) autoClose면 상태도 닫기
    useEffect(() => {
        if (modal.show && modal.autoCloseOnRouteChange && !matchPath(modal.visibleOn)) {
            setModal((m) => ({ ...m, show: false }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);
    /**
     *  Alert를 화면에 표출한다.
     *
     *  @author jewoo
     *   @since 2024-05-04<br />
     **/
    const showAlert = (title, content, options, callback) => {
        setModal(prevState => ({
            ...prevState,
            type: "alert",
            title: title,
            content: content,
            show: true,
            confirmCallback: (callback != null && callback instanceof Function) ? callback : null,
            isBtnHide: options && options.isBtnHide ? options.isBtnHide : false,
            width: 400,
            visibleOn: options?.visibleOn ?? null,
            autoCloseOnRouteChange: options?.autoCloseOnRouteChange ?? true,
            zIndex: options?.zIndex ?? undefined
        }));
    }

    /**
     *  API error status msg에 따른 오류 팝업
     *
     *  @author jewoo
     *   @since 2024-05-04<br />
     **/
    const showErrorAlert = (status, msg, options) => {
        if (status === "777")
            return;

        setModal(prevState => ({
            ...prevState,
            type: "error",
            title: "오류",
            content: msg,
            show: true,
            confirmCallback: null,
            isBtnHide: false,
            width: 400,
            code: status,
            visibleOn: options?.visibleOn ?? null,
            autoCloseOnRouteChange: options?.autoCloseOnRouteChange ?? true,
            zIndex: options?.zIndex ?? undefined
        }));
    }

    /**
     *  요청 확인 팝업 (요청 전 처리)
     *
     *  @author jewoo
     *   @since 2024-05-04<br />
     **/
    const showReqConfirm = (reqNm, type, callback, options) => {
        let typeNm = '';
        switch (type) {
            case 'I':
                typeNm = '등록';
                break;
            case 'U':
                typeNm = '수정';
                break;
            case 'D':
                typeNm = '삭제';
                break;
            default:
                typeNm = type;
                break;
        }

        setModal(prevState => ({
            ...prevState,
            type: "confirm",
            title: "알림",
            content: reqNm + "을(를) " + typeNm + "하시겠습니까?",
            btnList: [
                {
                    title: "취소",
                    background: "#75849a",
                    click: () => {
                    }
                },
                {
                    title: typeNm,
                    click: () => {
                        if (typeof callback === 'function')
                            callback();
                    }
                }
            ],
            show: true,
            isBtnHide: false,
            confirmCallback: null,
            width: 400,
            visibleOn: options?.visibleOn ?? null,
            autoCloseOnRouteChange: options?.autoCloseOnRouteChange ?? true,
            zIndex: options?.zIndex ?? undefined
        }));
    }

    /**
     *  요청 결과 팝업 (요청 후 처리)
     *
     *  @author jewoo
     *   @since 2024-05-04<br />
     **/
    const showReqResult = (reqNm, type, success, options) => {
        let typeNm = '';
        switch (type) {
            case 'I':
                typeNm = '등록';
                break;
            case 'U':
                typeNm = '수정';
                break;
            case 'D':
                typeNm = '삭제';
                break;
            default:
                typeNm = type;
                break;
        }

        if (success)
            setModal(prevState => ({
                ...prevState,
                type: "alert",
                title: "알림",
                content: reqNm + "이(가) 정상적으로 " + typeNm + "되었습니다.",
                show: true,
                confirmCallback: null,
                isBtnHide: false,
                width: 400,
                visibleOn: options?.visibleOn ?? null,
                autoCloseOnRouteChange: options?.autoCloseOnRouteChange ?? true,
                zIndex: options?.zIndex ?? undefined
            }));
        else
            setModal(prevState => ({
                ...prevState,
                type: "alert",
                title: "알림",
                content: reqNm + " " + typeNm + "에 실패하였습니다.",
                show: true,
                confirmCallback: null,
                isBtnHide: false,
                width: 400,
                visibleOn: options?.visibleOn ?? null,
                autoCloseOnRouteChange: options?.autoCloseOnRouteChange ?? true,
                zIndex: options?.zIndex ?? undefined
            }));
    }

    /**
     *  Confirm창을 화면에 표출한다.
     *
     *  @author jewoo
     *   @since 2024-05-04<br />
     **/
    const showConfirm = (title, content, options = {}, btnOptions = {}) => {
        setModal(prevState => ({
            ...prevState,
            type: "confirm",
            title: title,
            content: content,
            btnList: btnOptions.btns ?? options.btns ?? null,
            show: true,
            isBtnHide: btnOptions.isBtnHide ?? options.isBtnHide ?? false,
            confirmCallback: null,
            width: 400,
            visibleOn: options.visibleOn ?? btnOptions.visibleOn ?? null,
            autoCloseOnRouteChange: options.autoCloseOnRouteChange ?? btnOptions.autoCloseOnRouteChange ?? true,
            zIndex: options.zIndex ?? btnOptions.zIndex ?? undefined
        }));
    }


    /**
     * 팝업 오픈
     * */
    const showContents = (content, option = {}) => {
        setModal(prevState => ({
            ...prevState,
            type: "contents",
            content: content,
            show: true,
            width: isNaN(option && option.width) ? 400 : option.width,
            visibleOn: option?.visibleOn ?? null,
            autoCloseOnRouteChange: option?.autoCloseOnRouteChange ?? true,
            zIndex: option?.zIndex ?? undefined
        }));
    }

    /**
     *  modal 창을 close 한다
     *
     *  @author jewoo
     *   @since 2024-05-04<br />
     **/
    const close = () => {
        setModal(prevState => ({
            ...prevState,
            show: false
        }));
    };

    /**
     *  confirm
     *
     *  @author jewoo
     *   @since 2024-05-04<br />
     **/
    const confirm = (event) => {
        if (modal.confirmCallback != null && modal.type === "alert") {
            modal.confirmCallback.call(undefined, event);
        }
        close(event);
    };

    /**
     *  modal을 clear 한다.
     *
     *  @author jewoo
     *   @since 2024-05-04<br />
     **/
    const clear = () => {
        close(null);
    }

    // 테마 클래스 결정 (경로 기반)
    const getThemeClass = (path) => {
        if (path === "/" || path === "/login") return "purple-theme";
        if (path.startsWith("/survey_creation")) return "survey-create-theme";
        if (path.startsWith("/data_dashboard")) return "data-dashboard-theme";
        if (path.startsWith("/data_management")) return "data-management-theme";
        if (path.startsWith("/respondent_management")) return "respondent-theme";
        return "orange-theme"; // 기본값 (오렌지) - /ai_open_analysis 포함
    };

    const themeClass = getThemeClass(pathname);

    return (
        <modalContext.Provider value={{
            close, showAlert, showConfirm
            , showErrorAlert, showReqResult, showReqConfirm
            , showContents, clear
        }} {...props}>
            {props.children}
            <Modal
                type={modal.type}
                show={modal.show}
                title={modal.title}
                content={modal.content}
                btns={modal.btnList}
                isBtnHide={modal.isBtnHide}
                width={modal.width}
                onConfirm={confirm}
                onClose={close}
                code={modal.code}
                allowRender={matchPath(modal.visibleOn)}
                zIndex={modal.zIndex}
                themeClass={themeClass}
            />
        </modalContext.Provider>
    );
}

/**
 *  Modal 컴포넌트
 *
 *  @author jewoo
 *   @since 2024-05-04<br />
 **/
function Modal(props) {
    //window popup ref
    const windowRef = useRef();
    if (!props.allowRender) return null; // 라우트가 안 맞으면 표시 자체를 안 함
    return (
        <div className={props.themeClass ? `${props.themeClass}-modal` : ""}>
            {
                props.show ?
                    props.type !== "contents" ?
                        // 1. type이 alert/error 인지 confirm인지 판별
                        // 2. alert/error 일 경우, 확인버튼을 만들고 callback을 생성한다.
                        // 3. confirm 일 경우, btn 파라미터가 있는지 판별하고
                        //    있을 경우, btns의 갯수만큼 버튼 생성
                        //    없을 경우, 확인/취소 버튼을 default로 생성
                        <article className={`modal on ${props.themeClass || ""}`}
                            style={props.zIndex != null ? { zIndex: props.zIndex } : undefined}
                        >
                            <div className={"cmn_popup"} style={{ width: "480px" }}>

                                {/*팝업 top*/}
                                <div className="popTit">
                                    <h3 className={props.type !== "error" ? "iconNoti" : "iconErr"}>{props.title}</h3>
                                    <a className="btnClose" onClick={props.onClose}>
                                        <span className="hidden">close</span></a>
                                </div>

                                {/*팝업 내용*/}
                                <div className="popCont">
                                    {props.type !== "error" ? null : <p className="popSubTit">{props.code}</p>}
                                    <p className="popTxt">
                                        {props?.content !== undefined
                                            ? props?.content?.split("\n")?.map((item, idx) => {
                                                return (<Fragment key={idx}>{item}<br /></Fragment>)
                                            })
                                            : <Fragment key={"error"}> 요청한 서비스에 문제가 발생했습니다.<br /> 잠시 후에 다시 시도해 주세요.<br /></Fragment>
                                        }
                                    </p>
                                </div>

                                {/*팝업 버튼*/}
                                <div className="popBtnS">
                                    <div className="btnWrap type04">
                                        {props.type === "alert" || props.type === "error"
                                            ? <Button className={"btnM " + (props.type !== "error" ? "" : "btnType01")}
                                                themeColor={"primary"}
                                                onClick={(event) => {
                                                    event.preventDefault();
                                                    event.stopPropagation();
                                                    props.onConfirm(event);
                                                }}>확인</Button>
                                            : (props.btns != null
                                                ? <Fragment>
                                                    {
                                                        props.btns.map((item, idx) => {
                                                            return <Button key={idx}
                                                                className={"btnM " + (idx != props.btns.length - 1 ? "btnTxt type01" : "")}
                                                                themeColor={idx != props.btns.length - 1 ? null : "primary"}
                                                                onClick={(event) => {
                                                                    if ((item.click !== null || item.click !== undefined) && item.click instanceof Function) {
                                                                        event.preventDefault();
                                                                        event.stopPropagation();
                                                                        item.click.call(undefined, event);
                                                                    }
                                                                    props.onClose(event);
                                                                }}>{item.title}</Button>
                                                        })
                                                    }
                                                </Fragment>
                                                : <Fragment>
                                                    <Button className={"btnM btnTxt type01"}
                                                        onClick={(event) => {
                                                            event.preventDefault();
                                                            event.stopPropagation();
                                                            props.onClose(event);
                                                        }}>취소</Button>
                                                    <Button className={"btnM"} themeColor={"primary"}
                                                        onClick={(event) => {
                                                            event.preventDefault();
                                                            event.stopPropagation();
                                                            props.onConfirm(event);
                                                        }}>확인</Button>
                                                </Fragment>
                                            )
                                        }

                                    </div>
                                </div>
                            </div>
                        </article>
                        // contents 타입 (확인 필요함)
                        : <Window
                            ref={windowRef}
                            className={"contents-window"}
                            initialWidth={props.width}
                            minHeight={200}
                            width={props.width}
                            modal={true}
                            resizable={false}
                            draggable={false}
                            doubleClickStageChange={false}
                            onClose={props.onClose}
                            style={props.zIndex != null ? { zIndex: props.zIndex } : undefined}
                        >
                            {
                                props.content
                            }
                        </Window> : null
            }
        </div>
    );
}

export default ModalProvider;
