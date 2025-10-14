import { useMemo, useState } from "react";

/**
 * 문항 등록 > 문항선택 팝업 
 *
 * @author jewoo
 * @since 2025-10-14<br />
 */
const ProRegisterPopup = (parentProps) => {
  const { popupShow, previousPromptResValue, previousPromptExValue, onSelectPrompt } = parentProps;
  const modalOnOff = popupShow ? "on" : "off";

  const handleCancelButton = () => parentProps.setPopupShow(false);

  return (
    <article className={`modal ${modalOnOff}`}>
      <div className="cmn_popup" style={{ width: "1000px", maxHeight: 720, overflow: "hidden" }}>
        <div className="popTit">
          <h3>문항 선택 팝업</h3>
          <a className="btnClose" onClick={handleCancelButton}><span className="hidden">close</span></a>
        </div>

       
      </div>
    </article>
  );
};

export default ProRegisterPopup;