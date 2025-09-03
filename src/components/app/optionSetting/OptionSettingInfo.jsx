import React, { Fragment, useState, useEffect, useContext } from "react";
import { Button } from "@progress/kendo-react-buttons";
import CustomDropDownList from "@/components/kendo/CustomDropDownList.jsx";
import PreviousPromptPopup from "@/components/app/optionSetting/OptionSettingPopup";    // 기존 프롬프트 내용 팝업
import { Input } from "@progress/kendo-react-inputs";
import { TextArea, Slider, NumericTextBox } from "@progress/kendo-react-inputs";
import { OptionSettingApi } from "@/components/app/optionSetting/OptionSettingApi.js";
import "@/components/app/optionSetting/OptionSetting.css";
import { modalContext } from "@/components/common/Modal.jsx";

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

const OptionSettingInfo = ({ isOpen, onToggle, showEmptyEtcBtn, onNavigateTab }) => {
    const modal = useContext(modalContext);
    const [data, setData] = useState({}); //데이터 
    const { optionEditData, optionSaveData, optionAnalysisData } = OptionSettingApi();

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
        //분석 정보 데이터 조회
        optionEditData.mutateAsync({
            params: {
                key: "",
                user: "syhong",
                projectnum: "q250089uk",
                qnum: "A2-2",
                gb: "info",
            }
        }).then((res) => {
            const d = res?.resultjson?.[0] || {};
            setData({ ...d, temperature: parseTemp(d?.temperature) });

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

    const [saving, setSaving] = useState(false); //저장 API가 진행 중인지 표시하는 플래그

    /*창의성 조절*/
    const TEMP_MIN = 0;
    const TEMP_MAX = 1;
    const TEMP_STEP = 0.1;
    const TEMP_DEFAULT = 0.2;

    // temperature 입력(문자열/숫자)을 0~1 범위로 클램프하고 소수점 1자리로 반올림해 숫자로 반환
    const parseTemp = (v, def = TEMP_DEFAULT) => {
        const n = typeof v === "number" ? v : parseFloat(v);
        if (!Number.isFinite(n)) return def;
        // 0~1 범위로 클램프 + 소수 1자리 고정
        const clamped = Math.max(TEMP_MIN, Math.min(TEMP_MAX, n));
        return Math.round(clamped * 10) / 10;
    };

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
        let next = e?.value ?? e?.target?.value ?? "";

        // temperature라면 숫자로 변환 후 소수점 한 자리 고정
        if (col === "temperature") next = parseTemp(next);

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

    useEffect(() => {
        setData(prev => {
            const v = prev?.temperature;
            return (v === undefined || v === null || v === "")
                ? { ...prev, temperature: TEMP_DEFAULT }
                : prev;
        });
    }, []);

    // payload 생성
    const buildInfoPayload = () => {
        const projectnum = String(data?.projectnum || "q250089uk");
        const qnum = String(data?.qnum || "A2-2");
        const info = {
            apikeyid: String(data?.apikeyid || ""),
            apikey: String(data?.apikey || ""),
            data_type: "DB",
            projectnum,
            result_lang: String(data?.result_lang || "Korean"),
            select_rows: "",
            model_select: String(data?.model_select || ""),
            open_item_lv1: String(data?.open_item_lv1 ?? ""),
            open_item_lv2: String(data?.open_item_lv2 ?? ""),
            open_item_lv3: String(data?.open_item_lv3 ?? ""),
            prompt_string: String(data?.prompt_string || ""),
            keyword_string: String(data?.keyword_string || ""),
            select_column_id: "pid",
            select_column_title: qnum,
            temperature: parseTemp(data?.temperature),
            prompt_string_ex_backup: data?.prompt_string_ex_backup ?? {},
            prompt_string_res_backup: data?.prompt_string_res_backup ?? {},
        };

        return {
            key: "",
            user: "syhong",
            projectnum,
            qnum,
            gb: "info",
            data: [info],
        };
    };

    // 버튼 별 api payload 생성 
    const buildAnalysisPayload = (type) => {
        const projectnum = String(data?.projectnum || "q250089uk");
        const base = {
            key: "",
            token: "",
            user: "syhong",
            projectnum,
            qid: data?.qid,
            action: "start",      // todo: start, status, clear
        };

        switch (type) {
            case "translateResponse":      // 번역
                return { ...base, translateResponse: "Y" };

            case "classified":             // 보기분석
                return { ...base, classified: "Y", opencodeCategory: "Y" };

            case "response":               // 응답자분석(NEW)
                return { ...base, response: "Y", opencodeResponse: "Y" };

            case "recallResponse":         // 응답자 기타&빈셀
                return { ...base, recallResponse: "Y" };

            default:
                return base;
        }
    };

    // 공통 버튼 실행
    const runInfoSave = async (type) => {
        if (saving) return false;
        setSaving(true);
        try {
            // 1) 옵션 정보 저장
            const payload = buildInfoPayload();
            const saveRes = await optionSaveData.mutateAsync(payload);
            if (saveRes?.success !== "777") {
                modal.showErrorAlert("에러", "오류가 발생했습니다."); //오류 팝업 표출
                return false;
            }
            console.log(`[INFO][${type}] saved (777)`, saveRes);

            // 2) 저장 성공 시 → 분석 API 호출
            const analysisPayload = buildAnalysisPayload(type);
            const analysisRes = await optionAnalysisData.mutateAsync(analysisPayload);
            console.log(`analysisRes`, analysisRes);
            if (analysisRes?.success === "777") {
                // 버튼 type에 따른 재조회, 탭 이동
                if (type === "classified") {
                    onNavigateTab?.("2");   // 보기 데이터 탭으로
                } else {
                    onNavigateTab?.("1");   // 응답 데이터 탭으로
                }
                return true;
            } else {
                modal.showErrorAlert("에러", "오류가 발생했습니다."); //오류 팝업 표출
                return false;
            }

        } catch (e) {
            console.log(e)
            modal.showErrorAlert("에러", "오류가 발생했습니다."); //오류 팝업 표출
            return false;
        } finally {
            setSaving(false);
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
                        <div className="cmn_pop_ipt">
                            <span className="iptTit">창의성 조절</span>

                            <div className="tempCtrl" style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                                <Slider
                                    min={TEMP_MIN}
                                    max={TEMP_MAX}
                                    step={TEMP_STEP}
                                    buttons={false}                 // 좌우 +/− 버튼 숨김 (원하면 true)
                                    value={parseTemp(data?.temperature)}
                                    onChange={(e) => onChangeInputEvent(e, "temperature")}   // e.value 사용
                                    style={{ flex: 1 }}
                                />
                                <span className="tempValue">
                                    {parseTemp(data?.temperature).toFixed(1)}
                                </span>
                            </div>
                        </div>
                    </Section>

                    {/* 분류개수 설정 */}
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
                        <Button className="btnTxt" disabled={saving}
                            onClick={() => runInfoSave("translateResponse")}>
                            번역
                        </Button>

                        <Button themeColor="primary" disabled={saving}
                            onClick={() => runInfoSave("classified")}>
                            보기분석
                        </Button>

                        <Button themeColor="primary" disabled={saving}
                            onClick={() => runInfoSave("response")}>
                            응답자분석(NEW)
                        </Button>

                        {showEmptyEtcBtn && (
                            <Button className="btnTxt" disabled={saving}
                                onClick={() => runInfoSave("recallResponse")}>
                                응답자 빈셀&기타
                            </Button>
                        )}
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