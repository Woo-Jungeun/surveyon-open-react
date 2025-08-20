import React, { Fragment, useState, useContext, useEffect } from "react";
import { Button } from "@progress/kendo-react-buttons";
import CustomDropDownList from "@/components/kendo/CustomDropDownList.jsx";
import PreviousPromptPopup from "@/components/app/grid/PreviousPromptPopup";    // 기존 프롬프트 내용 팝업
import { Input } from "@progress/kendo-react-inputs";
import { TextArea } from "@progress/kendo-react-inputs";
import { GridTestApi } from "@/components/app/grid/GridTestApi.js";

/**
 * 그리드 > 테스트 그리드 > 정보 영역
 *
 * @author jewoo
 * @since 2024-08-19<br />
 */

/*섹션 영역 */
const Section = ({ id, title, first, open, onToggle, headerAddon, children }) => (
    <div className={`leftInfo ${open ? "on" : ""}`}>
        <div className={`infoTitRow ${first ? "brdTopN" : ""}`}>
            {/* 제목: 자체 케럿 제거(no-caret) */}
            <button
                type="button"
                className="infoTit no-caret"
                aria-expanded={open}
                aria-controls={id}
                onClick={onToggle}
            >
                {title}
            </button>

            {/* 제목 오른쪽(케럿 왼쪽)에 넣을 추가 버튼 영역 */}
            {headerAddon ? <div className="infoTitAddon">{headerAddon}</div> : null}

            {/* 맨 오른쪽 토글 아이콘*/}
            <button
                type="button"
                className={`infoCaret ${open ? "on" : ""}`}
                aria-label={open ? "접기" : "펼치기"}
                onClick={onToggle}
            />
        </div>

        {open && (
            <div id={id} className="infoList">
                {children}
            </div>
        )}
    </div>
);

const GridTestInfo = ({ isOpen, onToggle }) => {
    const [data, setData] = useState({}); //데이터 
    const { getGridData } = GridTestApi();

    useEffect(() => {
        //분석 정보 데이터
        getGridData.mutateAsync({
            params: {
                user: "jewoo",
                projectnum: "q250116_1R",
                qnum: "FM1",
                gb: "info",
            }
        }).then((res) => {
            const d = res?.resultjson?.[0] || {};
            setData(d);

            setPreviousPromptExValue(d?.prompt_text_ex_backup || "");    //보기 프롬프트 로그
            setPreviousPromptResValue(d?.prompt_text_res_backup || "");  //응답 프롬프트 로그

            // 드롭다운 초기값 동기화
            setApiKey(d?.listapikey?.[0]?.keycontent ?? "");
            setLang(d?.result_lang ?? "");
            setModel(d?.selapi_model ?? "");
        });
    }, []);

    console.log("data", data);

    /* 토글 on/off */
    const [openPrompt, setOpenPrompt] = useState(false);
    const [openOption, setOpenOption] = useState(false);
    const [openCounts, setOpenCounts] = useState(false);

    /*----TODO api 연결 데이터 수정 필요!!!!-----*/
    const API_KEY_OPTIONS = [
        { label: "회사공용키(경영지원)", value: "mgmt-shared" }, // value는 내부코드, label은 화면/서버 기준
        { label: "테스트 키", value: "test" },
    ];

    const LANG_OPTIONS = [
        { label: "Korean", value: "ko" },   // <-- label을 Korean/English 로
        { label: "English", value: "en" },
    ];

    const MODEL_OPTIONS = [
        { label: "GPT-4o", value: "gpt-4o" },   // 서버 기본값 "GPT-4o"와 label 일치
        { label: "o3-mini", value: "o3-mini" },
    ];
    /*----TODO api 연결 데이터 수정 필요!!!!-----*/

    const [apiKey, setApiKey] = useState("");
    const [lang, setLang] = useState("");
    const [model, setModel] = useState("");

    // 기존 버튼 팝업 show 
    const [previousPromptShow, setPreviousPromptShow] = useState(false);        // 기존 프롬프트 팝업 popupShow
    const [previousPromptExValue, setPreviousPromptExValue] = useState("");     // 기존 보기 프롬프트 로그 데이터
    const [previousPromptResValue, setPreviousPromptResValue] = useState("");   // 기존 응답 프롬프트 로그 데이터

    // 팝업에서 '선택' 눌렀을 때: textarea에 적용하고 팝업 닫기
    const handleSelectPrompt = ({ type, time, text }) => {
        setData(prev => ({
            ...prev,
            prompt_text: String(text || "")
        }));
        setPreviousPromptShow(false);
    };

    // onChangeInputEvent 핸들러
    const onChangeInputEvent = (e, col) => {
        console.log("onChangeInputEvent", e, col)
        const next = e?.value ?? e?.target?.value ?? "";
        setData(prev => ({
            ...prev,
            [col]: next,
        }));
    }

    // onChangeDropdown 핸들러
    const onChangeDropdown = (field) => (e) => {
        //TODO apikey 바뀔때 listapikey값들 다 바껴야 함 
        const item = e?.value;
        const selectedLabel = item?.label ?? "";

        if (field === "apiKey") setApiKey(selectedLabel);
        if (field === "result_lang") setLang(selectedLabel);
        if (field === "selapi_model") setModel(selectedLabel);

        setData((prev) => {
            if (field === "apiKey") {
                return {
                    ...prev,
                    listapikey: [
                        { ...(prev?.listapikey?.[0] || {}), keycontent: selectedLabel },
                    ],
                };
            }
            if (field === "result_lang") {
                return { ...prev, result_lang: selectedLabel };
            }
            if (field === "selapi_model") {
                return { ...prev, selapi_model: selectedLabel };
            }
            return prev;
        });
    };

    return (
        <Fragment>
            {/* << / >> 아주 작은 버튼 */}
            <div className="collapseBar">
                {isOpen && <div className="collapseTitle">{data?.projectname || "-"}</div>}
                <Button
                    type="button"
                    className="btnCollapse"
                    onClick={onToggle}
                    aria-expanded={isOpen}
                    title={isOpen ? "왼쪽 패널 접기" : "왼쪽 패널 펼치기"}
                >
                    {isOpen ? "<<" : ">>"}
                </Button>
            </div>

            {/* 접혔을 땐 내용 숨김 */}
            {isOpen && (
                <div className="left-body">
                    <div className="mgB12">
                        {/* 문항 요약 */}
                        <div className="cmn_pop_ipt">
                            <span className="iptTit">
                                {(data?.qnum ? `${data?.qnum} ` : "")}문항
                            </span>
                            <Input
                                className="k-input k-input-solid"
                                value={data?.question_fin || ""}
                                onChange={(e) => onChangeInputEvent(e, "question_fin")}
                            />
                        </div>
                    </div>
                    {/* 프롬프트 지침 (기존 버튼 포함) */}
                    <Section
                        id="sec-prompt"
                        title="프롬프트 지침"
                        first
                        open={openPrompt}
                        onToggle={() => setOpenPrompt(v => !v)}
                        headerAddon={<Button className="btnMini" onClick={(e) => { setPreviousPromptShow(true) }}>기존</Button>}
                    >
                        <div className="promptArea">
                            <TextArea
                                className="promptBox"
                                rows={5}
                                placeholder="프롬프트 지침을 입력하세요."
                                value={data?.prompt_text || ""}
                                onChange={(e) => onChangeInputEvent(e, "prompt_text")}
                            />
                        </div>
                    </Section>

                    {/* 옵션 */}
                    <Section
                        id="sec-option"
                        title="옵션"
                        open={openOption}
                        onToggle={() => setOpenOption(v => !v)}
                    >
                        <div className="cmn_pop_ipt">
                            <span className="iptTit">apikey</span>
                            <CustomDropDownList
                                data={API_KEY_OPTIONS}
                                textField="label"
                                dataItemKey="label"
                                defaultValue={apiKey}
                                onChange={onChangeDropdown("apiKey")}
                            />
                        </div>
                        <div className="cmn_pop_ipt">
                            <span className="iptTit">결과언어</span>
                            <CustomDropDownList
                                data={LANG_OPTIONS}
                                textField="label"
                                dataItemKey="label"
                                defaultValue={lang}
                                onChange={onChangeDropdown("result_lang")}
                            />
                        </div>
                        <div className="cmn_pop_ipt">
                            <span className="iptTit">모델선택</span>
                            <CustomDropDownList
                                data={MODEL_OPTIONS}
                                textField="label"
                                dataItemKey="label"
                                defaultValue={model}
                                onChange={onChangeDropdown("selapi_model")}
                            />
                        </div>
                    </Section>

                    {/* 분류개수 설정 (+ 작은 안내문) */}
                    <Section
                        id="sec-counts"
                        title={
                            <>
                                분류 개수 설정
                                <span className="titNote">(대/중분류를 “0” 설정시 분석안함)</span>
                            </>
                        }
                        open={openCounts}
                        onToggle={() => setOpenCounts(v => !v)}
                    >
                        <div className="cmn_pop_ipt">
                            <span className="iptTit">소분류 개수</span>
                            <Input
                                className="k-input k-input-solid"
                                // defaultValue={100} 
                                value={data?.txtopen_item_lv3 || ""}
                                onChange={(e) => onChangeInputEvent(e, "txtopen_item_lv3")}
                            />
                        </div>
                        <div className="cmn_pop_ipt">
                            <span className="iptTit">중분류 개수</span>
                            <Input
                                className="k-input k-input-solid"
                                value={data?.txtopen_item_lv2 || ""}
                                onChange={(e) => onChangeInputEvent(e, "txtopen_item_lv2")}
                            />
                        </div>
                        <div className="cmn_pop_ipt">
                            <span className="iptTit">대분류 개수</span>
                            <Input
                                className="k-input k-input-solid"
                                value={data?.txtopen_item_lv1 || ""}
                                onChange={(e) => onChangeInputEvent(e, "txtopen_item_lv1")}
                            />
                        </div>
                    </Section>

                    {/* 버튼 3개 */}
                    <div className="btnWrap type01 btnRowFit">
                        <Button className="btnTxt">번역</Button>
                        <Button themeColor="primary">보기분석</Button>
                        <Button themeColor="primary">응답자분석(NEW)</Button>
                        {/* <Button className="btnTxt">응답자 빈셀&기타</Button> */}
                    </div>
                    {/* 분석결과 */}
                    <div className="mgT16">
                        <div className="resultBox" aria-label="분석결과창" />
                        <div className="flexE mgT10">
                            <Button className="btnTxt type02">문항삭제</Button>
                        </div>
                    </div>
                </div>
            )}
            {/* 기존 프롬프트 내용 팝업 */}
            {previousPromptShow &&
                <PreviousPromptPopup
                    popupShow={previousPromptShow}
                    setPopupShow={setPreviousPromptShow}
                    previousPromptExValue={previousPromptExValue}           //보기 프롬프트 로그
                    setPreviousPromptExValue={setPreviousPromptExValue}
                    previousPromptResValue={previousPromptResValue}         //응답 프롬프트 로그
                    setPreviousPromptResValue={setPreviousPromptResValue}
                    onSelectPrompt={handleSelectPrompt}
                />
            }
        </Fragment>
    );
};

export default GridTestInfo;