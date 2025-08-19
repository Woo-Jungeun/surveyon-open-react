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
    const { getSampleData } = GridTestApi();

    useEffect(() => {
        //버스번호 comboData
        getSampleData.mutateAsync({
            params: {
                user: "jewoo",
                projectnum: "q250116_1R",
                qnum: "FM1",
                gb: "info",
            }
        }).then((res) => {
            //   console.log("res:::::", res);
            setData(res?.resultjson?.[0] || {});
            setPreviousPromptExValue(res?.resultjson?.[0]?.prompt_text_ex_backup || ""); //보기 프롬프트 로그
            setPreviousPromptResValue(res?.resultjson?.[0]?.prompt_text_res_backup || "");  //응답 프롬프트 로그
        });
    }, []);

   console.log("data", data);

    /* 토글 on/off */
    const [openPrompt, setOpenPrompt] = useState(false);
    const [openOption, setOpenOption] = useState(false);
    const [openCounts, setOpenCounts] = useState(false);

    // 프롬프트 지침 텍스트
    const [promptText, setPromptText] = useState("");

    /*todo api 연결 데이터 수정 필요!!!!*/
    const API_KEY_OPTIONS = [
        { label: "회사공용키(경영지원)", value: "mgmt-shared" },
        { label: "테스트 키", value: "test" },
    ];

    const LANG_OPTIONS = [
        { label: "한국어 (Korean)", value: "ko" },
        { label: "English", value: "en" },
    ];
    const MODEL_OPTIONS = [
        { label: "GPT-4o", value: "gpt-4o" },
        { label: "o3-mini", value: "o3-mini" },
    ];

    const [apiKey, setApiKey] = useState("mgmt-shared");
    const [lang, setLang] = useState("ko");
    const [model, setModel] = useState("gpt-4o");

    //기존 버튼 팝업 show 
    const [previousPromptShow, setPreviousPromptShow] = useState(false);      // 기존 프롬프트 팝업 popupShow
    const [previousPromptExValue, setPreviousPromptExValue] = useState("");            // 기존 보기 프롬프트 로그 데이터
    const [previousPromptResValue, setPreviousPromptResValue] = useState("");            // 기존 응답 프롬프트 로그 데이터

    // onChange 핸들러
    const onChangeEvent = (e, col) => {
        //todo
       // console.log(e, col)
    }

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
                        {/* 프로젝트/조사명 */}
                        {/* <div className="txtTitL">{data?.projectname || "-"}</div> */}

                        {/* 문항 요약 */}
                        <div className="cmn_pop_ipt">
                            <span className="iptTit">
                                {(data?.qnum ? `${data?.qnum} ` : "")}문항
                            </span>
                            <Input
                                className="k-input k-input-solid"
                                value={data?.question_fin || ""}
                                onChange={(e) => onChangeEvent(e, "question_fin")}
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
                                value={promptText}
                                onChange={(e) => setPromptText(e.target.value)}
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
                                required={false}
                                data={API_KEY_OPTIONS}
                                textField="label"
                                dataItemKey="value"
                                defaultValue={apiKey}
                                onChange={(e) => setApiKey(e.value.value)}
                            />
                        </div>
                        <div className="cmn_pop_ipt">
                            <span className="iptTit">결과언어</span>
                            <CustomDropDownList
                                data={LANG_OPTIONS}
                                textField="label"
                                dataItemKey="value"
                                defaultValue={lang}
                                onChange={(e) => setLang(e.value.value)}
                            />
                        </div>
                        <div className="cmn_pop_ipt">
                            <span className="iptTit">모델선택</span>
                            <CustomDropDownList
                                data={MODEL_OPTIONS}
                                textField="label"
                                dataItemKey="value"
                                defaultValue={model}
                                onChange={(e) => setModel(e.value.value)}
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
                                onChange={(e) => onChangeEvent(e, "txtopen_item_lv3")}
                            />
                        </div>
                        <div className="cmn_pop_ipt">
                            <span className="iptTit">중분류 개수</span>
                            <Input
                                className="k-input k-input-solid"
                                value={data?.txtopen_item_lv2 || ""}
                                onChange={(e) => onChangeEvent(e, "txtopen_item_lv2")}
                            />
                        </div>
                        <div className="cmn_pop_ipt">
                            <span className="iptTit">대분류 개수</span>
                            <Input
                                className="k-input k-input-solid"
                                value={data?.txtopen_item_lv1 || ""}
                                onChange={(e) => onChangeEvent(e, "txtopen_item_lv1")}
                            />
                        </div>
                    </Section>

                    {/* 버튼 3개 */}
                    <div className="btnWrap type01 btnRowFit">
                        <Button className="btnTxt">번역</Button>
                        <Button themeColor="primary">보기분석</Button>
                        <Button themeColor="primary">응답자분석(NEW)</Button>
                    </div>
                    {/* 분석결과 */}
                    <div className="mgT16">
                        <div className="resultBox" aria-label="분석결과창" />
                        <div className="flexE mgT10">
                            <Button className="btnTxt type02">운영삭제</Button>
                        </div>
                    </div>
                </div>
            )}
            {/* 기존 프롬프트 내용 팝업 */}
            {previousPromptShow &&
                <PreviousPromptPopup
                    popupShow={previousPromptShow}
                    setPopupShow={setPreviousPromptShow}
                    previousPromptExValue={previousPromptExValue}   //보기 프롬프트 로그
                    setPreviousPromptExValue={setPreviousPromptExValue}   //보기 프롬프트 로그
                    previousPromptResValue={previousPromptResValue} //응답 프롬프트 로그
                    setPreviousPromptResValue={setPreviousPromptResValue}   //보기 프롬프트 로그
                />
            }
        </Fragment>
    );
};

export default GridTestInfo;