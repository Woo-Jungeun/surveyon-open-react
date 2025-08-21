import React, { Fragment, useState, useEffect } from "react";
import { Button } from "@progress/kendo-react-buttons";
import CustomDropDownList from "@/components/kendo/CustomDropDownList.jsx";
import PreviousPromptPopup from "@/components/app/optionSetting/OptionSettingPopup";    // 기존 프롬프트 내용 팝업
import { Input } from "@progress/kendo-react-inputs";
import { TextArea } from "@progress/kendo-react-inputs";
import { OptionSettingApi } from "@/components/app/optionSetting/OptionSettingApi.js";

/**
 * 분석 > 정보 영역
 *
 * @author jewoo
 * @since 2025-08-19<br />
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

const OptionSettingInfo = ({ isOpen, onToggle }) => {
    const [data, setData] = useState({}); //데이터 
    const { getGridData } = OptionSettingApi();

    // 배열 -> 옵션으로 변환
    const toOptions = (arr) =>
        (Array.isArray(arr) ? arr : []).map(x => ({
            keyid: x.keyid,
            value: x.keyvalue, // 드롭다운의 키값
            text: x.keytext,  // 표시 텍스트
            keyselected: x.keyselected ?? "", // 토큰 그대로 보관
        }));

    // keyselected 토큰으로 선택 항목 찾기 (value -> id -> text 순 매칭)
    const pickSelected = (opts) => {
        if (!opts.length) return null;
        const token = String(opts[0].keyselected ?? ""); // 모든 항목에 같은 토큰이 들어오는 구조
        if (!token) return null;
        return (
            opts.find(o => String(o.value) === token) ||
            opts.find(o => String(o.keyid) === token) ||
            opts.find(o => String(o.text) === token) ||
            null
        );
    };

    useEffect(() => {
        //분석 정보 데이터
        getGridData.mutateAsync({
            params: {
                key:"",
                user: "syhong",
                projectnum: "q250089uk",
                qnum: "A2-2",
                gb: "info",
            }
        }).then((res) => {
            const d = res?.resultjson?.[0] || {};
            setData(d);

            setPreviousPromptExValue(d?.prompt_string_ex_backup || "");    //보기 프롬프트 로그
            setPreviousPromptResValue(d?.prompt_string_res_backup || "");  //응답 프롬프트 로그

            // --- apikey ---
            const apiOpts = toOptions(d?.apikey);
            setApiKeyOptions(apiOpts);
            const apiInit = pickSelected(apiOpts) || apiOpts[0];
            if (apiInit) {
                setApiKeyValue(apiInit.value); // DropDownList에 넘길 키값
                setData(prev => ({
                    ...prev,
                    apikeyid: apiInit.value, // keyvalue
                    apikey: apiInit.keyid, // keyid
                }));
            }

            // --- result_lang ---
            const langOpts = toOptions(d?.result_lang);
            setResultLangOptions(langOpts);
            const langInit = pickSelected(langOpts) || langOpts[0];
            if (langInit) {
                setResultLangValue(langInit.value);
                setData(prev => ({ ...prev, result_lang: langInit.value }));
            }

            // --- model_select ---
            const modelOpts = toOptions(d?.model_select);
            setModelOptions(modelOpts);
            const modelInit = pickSelected(modelOpts) || modelOpts[0];
            if (modelInit) {
                setModelValue(modelInit.value);
                setData(prev => ({ ...prev, model_select: modelInit.value }));
            }
        });
    }, []);

    /* 토글 on/off */
    const [openPrompt, setOpenPrompt] = useState(false);
    const [openOption, setOpenOption] = useState(false);
    const [openCounts, setOpenCounts] = useState(false);

    //  API 키 드롭다운용 옵션/선택값
    const [apiKeyOptions, setApiKeyOptions] = useState([]);
    const [apiKeyValue, setApiKeyValue] = useState("");   // 드롭다운에 바인딩할 'value'는 keyvalue (문자열)

    //  결과언어
    const [resultLangOptions, setResultLangOptions] = useState([]);
    const [resultLangValue, setResultLangValue] = useState("");

    //  모델선택
    const [modelOptions, setModelOptions] = useState([]);
    const [modelValue, setModelValue] = useState("");

    // 기존 버튼 팝업 show 
    const [previousPromptShow, setPreviousPromptShow] = useState(false);        // 기존 프롬프트 팝업 popupShow
    const [previousPromptExValue, setPreviousPromptExValue] = useState("");     // 기존 보기 프롬프트 로그 데이터
    const [previousPromptResValue, setPreviousPromptResValue] = useState("");   // 기존 응답 프롬프트 로그 데이터

    // 팝업에서 '선택' 눌렀을 때: textarea에 적용하고 팝업 닫기
    const handleSelectPrompt = ({ text }) => {
        setOpenPrompt(true);        // 프롬프트 섹션이 닫혀 있어도 자동으로 열기

        setData(prev => ({
            ...prev,
            prompt_string: String(text || "")
        }));
        setPreviousPromptShow(false);
    };

    // onChangeInputEvent 핸들러
    const onChangeInputEvent = (e, col) => {
        const next = e?.value ?? e?.target?.value ?? "";
        setData(prev => ({
            ...prev,
            [col]: next,
        }));
    }

    // 공통 드롭다운 onChange 핸들러
    const handleDropdownChange = (key) => (e) => {
        const item = e?.value; // 선택 객체
        if (!item) return;
    
        switch (key) {
        case "apikey":
            setApiKeyValue(String(item.value));
            setData((prev) => ({
            ...prev,
            apikeyid: item.value,  // keyvalue
            apikey: item.keyid,    // keyid
            }));
            break;
    
        case "result_lang":
            setResultLangValue(String(item.value));
            setData((prev) => ({
            ...prev,
            result_lang: item.value,
            }));
            break;
    
        case "model_select":
            setModelValue(String(item.value));
            setData((prev) => ({
            ...prev,
            model_select: item.value,
            }));
            break;
    
        default:
            break;
        }
    };

    return (
        <Fragment>
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
                                {(data?.qnum_text ? `${data?.qnum_text} ` : "")}문항
                            </span>
                            <Input
                                className="k-input k-input-solid"
                                value={data?.keyword_string || ""}
                                onChange={(e) => onChangeInputEvent(e, "keyword_string")}
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
                                value={data?.prompt_string || ""}
                                onChange={(e) => onChangeInputEvent(e, "prompt_string")}
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
                                data={apiKeyOptions}
                                textField="text"        // 화면 표시: keytext
                                dataItemKey="value"     // 고유키: keyvalue
                                defaultValue={apiKeyValue}     // 현재 선택값: keyvalue
                                onChange={handleDropdownChange("apikey")}
                            />
                        </div>
                        <div className="cmn_pop_ipt">
                            <span className="iptTit">결과언어</span>
                            <CustomDropDownList
                                data={resultLangOptions}
                                textField="text"
                                dataItemKey="value"
                                defaultValue={resultLangValue}
                                onChange={handleDropdownChange("result_lang")}
                            />
                        </div>
                        <div className="cmn_pop_ipt">
                            <span className="iptTit">모델선택</span>
                            <CustomDropDownList
                                data={modelOptions}
                                textField="text"
                                dataItemKey="value"
                                defaultValue={modelValue}
                                onChange={handleDropdownChange("model_select")}
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
                                value={data?.open_item_lv1 || ""}
                                onChange={(e) => onChangeInputEvent(e, "open_item_lv1")}
                            />
                        </div>
                        <div className="cmn_pop_ipt">
                            <span className="iptTit">중분류 개수</span>
                            <Input
                                className="k-input k-input-solid"
                                value={data?.open_item_lv2 || ""}
                                onChange={(e) => onChangeInputEvent(e, "open_item_lv2")}
                            />
                        </div>
                        <div className="cmn_pop_ipt">
                            <span className="iptTit">대분류 개수</span>
                            <Input
                                className="k-input k-input-solid"
                                value={data?.open_item_lv3 || ""}
                                onChange={(e) => onChangeInputEvent(e, "open_item_lv3")}
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

export default OptionSettingInfo;