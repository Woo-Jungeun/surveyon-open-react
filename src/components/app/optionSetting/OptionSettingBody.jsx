import React, { Fragment, useRef, useState } from "react";
import { Button } from "@progress/kendo-react-buttons";
import OptionSettingInfo from "@/components/app/optionSetting/OptionSettingInfo";
import OptionSettingTab1 from "@/components/app/optionSetting/OptionSettingTab1";
import OptionSettingTab2 from "@/components/app/optionSetting/OptionSettingTab2";
import OptionSettingTab3 from "@/components/app/optionSetting/OptionSettingTab3";
import GridHeaderBtnPrimary from "@/components/style/button/GridHeaderBtnPrimary.jsx";

/**
 * 분석 > Body
 *
 * @author jewoo
 * @since 2025-08-14<br />
 */
const OptionSettingBody = () => {
  const TITLE_LIST = ["분석 대메뉴", "분석 메뉴", ""];
  const [tabDivision, setTabDivision] = useState("1");
  const [isLeftOpen, setIsLeftOpen] = useState(true);     // 상태를 부모가 보유
  const tab1Ref = useRef(null);
  const tab2Ref = useRef(null);

  /*버튼 이벤트 핸들러*/
  const onTab1SaveClick = () => tab1Ref.current?.saveChanges?.();;
  const onTab2AddClick = () => tab2Ref.current?.addButtonClick?.();
  const onTab2SaveClick = () => tab2Ref.current?.saveChanges?.();

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
            <Button className={tabDivision === "1" ? "btnTab on" : "btnTab"} onClick={() => setTabDivision("1")}>
              응답 데이터
            </Button>
            <Button className={tabDivision === "2" ? "btnTab on" : "btnTab"} onClick={() => setTabDivision("2")}>
              보기 데이터
            </Button>
            <Button className={tabDivision === "3" ? "btnTab on" : "btnTab"} onClick={() => setTabDivision("3")}>
              rawdata
            </Button>
          </div>

          {tabDivision === "1" ? <OptionSettingTab1 ref={tab1Ref}/> : tabDivision === "2" ? <OptionSettingTab2 ref={tab2Ref} /> : <OptionSettingTab3 />}
        </div>
      </article>
    </Fragment>
  );
};

export default OptionSettingBody;