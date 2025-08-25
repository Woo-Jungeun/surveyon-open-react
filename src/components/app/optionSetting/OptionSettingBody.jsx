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
  const [lvCode, setLvCode] = useState(LVCODE_OPTION[0]);

  // Tab1에서 최초 조회한 lvcode를 받아 드롭다운 값 세팅
  const handleInitLvCode = useCallback((fetched) => {
    const v = String(fetched ?? "").trim();
    if (!["1", "2", "3"].includes(v)) return;
    setLvCode(prev => (prev?.value === v ? prev : (LVCODE_OPTION.find(o => o.value === v) || prev)));
  }, []);

  // 탭별 더티 상태 관리
  const [unsaved, setUnsaved] = useState({ "1": false, "2": false, "3": false });
  const markUnsaved = useCallback((tab, v) => {
    setUnsaved(prev => (prev[tab] === v ? prev : { ...prev, [tab]: v }));
  }, []);

  // 공용 모달로 확인창
  const confirmNavigate = useCallback((message) => {
    return new Promise((resolve) => {
      modal.showConfirm(
        "알림",
        message,
        {
          btns: [
            { title: "취소", click: () => resolve(false) },
            { title: "이동", click: () => resolve(true) },
          ],
        }
      );
    });
  }, [modal]);

  const trySwitchTab = useCallback(async (next) => {
    if (next === tabDivision) return;
    if (unsaved[tabDivision]) {
      const ok = await confirmNavigate("저장하지 않은 변경 사항이 있습니다.\n이동하시겠습니까?");
      if (!ok) return; // 취소 → 현 탭 유지
    }
    setTabDivision(next);
  }, [tabDivision, unsaved, confirmNavigate]);

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
              value={lvCode}
              onChange={(e) => setLvCode(e.value)}   // e.value는 선택된 객체
            />
          </div>

          {tabDivision === "1" ? (
            <OptionSettingTab1
              ref={tab1Ref}
              lvCode={lvCode.value}
              onInitLvCode={handleInitLvCode}
              onUnsavedChange={(v) => markUnsaved("1", v)}
              onSaved={() => markUnsaved("1", false)}
            />
          ) : tabDivision === "2" ? (
            <OptionSettingTab2
              ref={tab2Ref}
              lvCode={lvCode.value}
              onUnsavedChange={(v) => markUnsaved("2", v)}
              onSaved={() => markUnsaved("2", false)}
            />
          ) : <OptionSettingTab3 lvCode={lvCode.value} />}
        </div>
      </article>
    </Fragment>
  );
};

export default OptionSettingBody;