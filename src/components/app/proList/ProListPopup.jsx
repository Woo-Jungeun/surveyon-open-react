import { useMemo, useState } from "react";

/**
 * 문항 목록 > 필터문항설정 팝업 
 *
 * @author jewoo
 * @since 2025-09-16<br />
 */
const ProListPopup = (parentProps) => {
  const { popupShow, previousPromptResValue, previousPromptExValue, onSelectPrompt } = parentProps;
  const modalOnOff = popupShow ? "on" : "off";

  const handleCancelButton = () => parentProps.setPopupShow(false);

  return (
    <article className={`modal ${modalOnOff}`}>
      <div className="cmn_popup" style={{ width: "1000px", maxHeight: 720, overflow: "hidden" }}>
        <div className="popTit">
          <h3>필터 문항 설정 팝업</h3>
          <a className="btnClose" onClick={handleCancelButton}><span className="hidden">close</span></a>
        </div>

        <div className="popCont" style={{ maxHeight: 600, overflowY: "auto" }}>
      
        </div>
      </div>
    </article>
  );
};

export default ProListPopup;