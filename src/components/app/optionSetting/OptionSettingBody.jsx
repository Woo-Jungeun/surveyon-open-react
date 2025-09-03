import React, { Fragment, useRef, useState, useCallback, useContext, useEffect } from "react";
import { Button } from "@progress/kendo-react-buttons";
import OptionSettingInfo from "@/components/app/optionSetting/OptionSettingInfo";
import OptionSettingTab1 from "@/components/app/optionSetting/OptionSettingTab1";
import OptionSettingTab2 from "@/components/app/optionSetting/OptionSettingTab2";
import OptionSettingTab3 from "@/components/app/optionSetting/OptionSettingTab3";
import GridHeaderBtnPrimary from "@/components/style/button/GridHeaderBtnPrimary.jsx";
import { DropDownList } from "@progress/kendo-react-dropdowns";
import { modalContext } from "@/components/common/Modal.jsx";
/**
 * 분석 > Body
 *
 * @author jewoo
 * @since 2025-08-14<br />
 */
const OptionSettingBody = () => {
  const modal = useContext(modalContext);

  const TITLE_LIST = ["분석 대메뉴", "분석 메뉴", ""];
  const [tabDivision, setTabDivision] = useState("1");
  const [isLeftOpen, setIsLeftOpen] = useState(true);     // 상태를 부모가 보유
  const [analysisCount, setAnalysisCount] = useState(null); // 최초 분석값 저장

  const tab1Ref = useRef(null);
  const tab2Ref = useRef(null);

  /*버튼 이벤트 핸들러*/
  const onTab1SaveClick = () => tab1Ref.current?.saveChanges?.();;
  const onTab2AddClick = () => tab2Ref.current?.addButtonClick?.();
  const onTab2SaveClick = () => tab2Ref.current?.saveChanges?.();

  const LVCODE_OPTION = [
    { text: "1단계", value: "1" },
    { text: "2단계", value: "2" },
    { text: "3단계", value: "3" }
  ];

  const [lvCodeCommitted, setLvCodeCommitted] = useState(LVCODE_OPTION[0]);
  const [lvCodeDraft, setLvCodeDraft] = useState(LVCODE_OPTION[0]);

  // Tab1에서 최초 조회한 lvcode를 받아 드롭다운 값 세팅
  const handleInitLvCode = useCallback((fetched) => {
    const v = String(fetched ?? "").trim();
    if (!["1", "2", "3"].includes(v)) return;
    const next = LVCODE_OPTION.find(o => o.value === v);
    if (!next) return;
    setLvCodeCommitted(prev => (prev?.value === v ? prev : next));
    setLvCodeDraft(prev => (prev?.value === v ? prev : next));
  }, []);

  // 탭별 더티 상태 관리
  const [unsaved, setUnsaved] = useState({ "1": false, "2": false, "3": false });
  const markUnsaved = useCallback((tab, v) => {
    setUnsaved(prev => (prev[tab] === v ? prev : { ...prev, [tab]: v }));
  }, []);

  // 공용 모달로 확인창 (취소 | 이동 | 저장 후 이동)
  const confirmNavigate = useCallback((message, canSave = true) => {
    return new Promise((resolve) => {
      modal.showConfirm("알림", message, {
        btns: [
          { title: "취소", click: () => resolve("cancel") },
          { title: "이동", click: () => resolve("go") },
          // 저장 가능한 탭(1,2)에서만 노출
          ...(canSave ? [{ title: "저장 후 이동", click: () => resolve("saveThenGo") }] : [])
        ],
      });
    });
  }, [modal]);

  // 현재 탭 저장 실행 => 성공(true)만 이동 허용
  const saveTab = useCallback(async (tab) => {
    if (tab === "1") {
      const ret = tab1Ref.current?.saveChanges?.();
      return ret && typeof ret.then === "function" ? !!(await ret) : false;
    }
    if (tab === "2") {
      const ret = tab2Ref.current?.saveChanges?.();
      return ret && typeof ret.then === "function" ? !!(await ret) : false;
    }
    return false; // 탭3은 저장 없음
  }, []);

  const trySwitchTab = useCallback(async (next) => {
    if (next === tabDivision) return;
  
    const cur = tabDivision;
    if (unsaved[cur]) {
      const action = await confirmNavigate(
        "저장하지 않은 변경 사항이 있습니다.\n이동하시겠습니까?",
        /* canSave */ (cur === "1" || cur === "2")
      );
  
      if (action === "cancel") return;
  
      if (action === "go") {
        // 버리고 이동
        setUnsaved(prev => ({ ...prev, [cur]: false }));
        setLvCodeDraft(lvCodeCommitted); // 단계 변경도 롤백
        setTabDivision(next);
        return;
      }
  
      if (action === "saveThenGo") {
        const ok = await saveTab(cur);      // ← 저장 API 실행
        if (!ok) return;                    // 실패면 그대로 머무름
  
        // 성공: 더티 플래그 해제 + (탭2면) 드롭다운 커밋
        setUnsaved(prev => ({ ...prev, [cur]: false }));
        if (cur === "2") setLvCodeCommitted(lvCodeDraft);
  
        setTabDivision(next);
        return;
      }
    } else {
      setTabDivision(next);
    }
  }, [tabDivision, unsaved, confirmNavigate, lvCodeCommitted, lvCodeDraft, saveTab]);

  // 새로고침/창닫기 가드 (브라우저 네이티브)
  useEffect(() => {
    const handler = (e) => {
      const anyDirty = Object.values(unsaved).some(Boolean);
      if (!anyDirty) return;
      e.preventDefault();
      e.returnValue = ""; // 크롬/사파리 경고 표시 트리거
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [unsaved]);

  // 정렬, 필터, 컬럼 숨기기 상태 유지
  const [gridPrefs, setGridPrefs] = useState({
    "1": { columns: null, sort: [], filter: null }, // 탭1
    "2": { columns: null, sort: [], filter: null }, // 탭2
    "3": { columns: null, sort: [], filter: null }, // 탭3
  });

  // 공통 업데이트 헬퍼
  const updateGridPrefs = useCallback((tab, patch) => {
    setGridPrefs(prev => ({ ...prev, [tab]: { ...prev[tab], ...patch } }));
  }, []);

  return (
    <Fragment>
      <article className="subTitWrap">
        <p className="subStep">
          <span>{TITLE_LIST[0]}</span>
          <span>{TITLE_LIST[1]}</span>
          {TITLE_LIST[2] !== "" && <span>{TITLE_LIST[2]}</span>}
        </p>

        <div className="subTit">
          <h2 className="titTxt">{TITLE_LIST[2] !== "" ? TITLE_LIST[2] : TITLE_LIST[1]}</h2>

          {tabDivision === "1" && (
            <div className="btnWrap">
              <GridHeaderBtnPrimary onClick={onTab1SaveClick}>저장</GridHeaderBtnPrimary>
            </div>
          )}
          {tabDivision === "2" && (
            <div className="btnWrap">
              <GridHeaderBtnPrimary onClick={onTab2AddClick}>추가</GridHeaderBtnPrimary>
              <GridHeaderBtnPrimary onClick={onTab2SaveClick}>저장</GridHeaderBtnPrimary>
            </div>
          )}
        </div>
      </article>

      {/* 왼쪽 패널이 닫히면 부모에 left-closed 클래스 부여 */}
      <article className={`subContWrap ${isLeftOpen ? "" : "left-closed"}`}>
        <div className="subCont subContL">
          <OptionSettingInfo
            isOpen={isLeftOpen}
            onToggle={() => setIsLeftOpen(v => !v)}
            showEmptyEtcBtn={analysisCount !== 0}
          />
        </div>

        <div className="subCont subContR">
          <div className="btnBox tabMenu mgB12">
            <Button className={tabDivision === "1" ? "btnTab on" : "btnTab"} onClick={() => trySwitchTab("1")}>
              응답 데이터
            </Button>
            <Button className={tabDivision === "2" ? "btnTab on" : "btnTab"} onClick={() => trySwitchTab("2")}>
              보기 데이터
            </Button>
            <Button className={tabDivision === "3" ? "btnTab on" : "btnTab"} onClick={() => trySwitchTab("3")}>
              rawdata
            </Button>
            <DropDownList
              style={{ width: 140 }}
              data={LVCODE_OPTION}
              dataItemKey="value"
              textField="text"
              value={lvCodeDraft}
              disabled={tabDivision !== "2"}           //탭2에서 활성화
              onChange={(e) => {
                if (tabDivision === "2") {
                  setLvCodeDraft(e.value);
                  //  단계만 바꿔도 "변경사항 있음"으로 판단
                  setUnsaved(prev => ({ ...prev, [tabDivision]: true }));
                }
              }}
            />
          </div>

          {tabDivision === "1" ? (
            <OptionSettingTab1
              ref={tab1Ref}
              lvCode={lvCodeDraft.value}
              onInitLvCode={handleInitLvCode}
              onUnsavedChange={(v) => markUnsaved("1", v)}
              onSaved={() => {
                // 저장 성공 → 더티 해제
                markUnsaved("1", false);
              }}
              persistedPrefs={gridPrefs["1"]}
              onPrefsChange={(patch) => updateGridPrefs("1", patch)}
              onInitialAnalysisCount={(n) => setAnalysisCount(n)} //최초 분석값 존재 여부 확인
            />
          ) : tabDivision === "2" ? (
            <OptionSettingTab2
              ref={tab2Ref}
              lvCode={lvCodeDraft.value}
              onUnsavedChange={(v) => markUnsaved("2", v)}
              onSaved={() => {
                // 저장 성공 → 더티 해제 + 단계 커밋
                markUnsaved("2", false);
                setLvCodeCommitted(lvCodeDraft);
              }}
              persistedPrefs={gridPrefs["2"]}
              onPrefsChange={(patch) => updateGridPrefs("2", patch)}
            />
          ) : <OptionSettingTab3
            lvCode={lvCodeDraft.value}
            persistedPrefs={gridPrefs["3"]}
            onPrefsChange={(patch) => updateGridPrefs("3", patch)}
          />}
        </div>
      </article>
    </Fragment>
  );
};

export default OptionSettingBody;