import { useMemo } from "react";

/**
 * 그리드 > 테스트 그리드 > 정보 영역 > 프롬프트 지침 > [기존] 버튼 팝업  
 *
 * @author jewoo
 * @since 2024-08-19<br />
 */
const PreviousPromptPopup = (parentProps) => {
    const { popupShow, previousPromptResValue, previousPromptExValue } = parentProps;
    const modalOnOff = popupShow ? "on" : "off";
  
    const handleCancelButton = () => {
      parentProps.setPopupShow(false);
    };
  
    // 공통: "시간: 내용" 객체 or JSON문자열 → [ [time, text], ... ] 로 변환 + 시간 오름차순 정렬
    const parseToRows = (src) => {
      if (src == null) return [];
      let obj = src;
      if (typeof obj === "string") {
        try { obj = JSON.parse(obj); } catch { return []; }
      }
      if (typeof obj !== "object") return [];
      return Object.entries(obj)
        .filter(([k, v]) => k && v != null)
        .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
    };
  
    const rowsRes = useMemo(() => parseToRows(previousPromptResValue), [previousPromptResValue]);
    const rowsEx  = useMemo(() => parseToRows(previousPromptExValue),  [previousPromptExValue]);
    
    // 섹션헤더
    const SectionTitle = ({ label, count }) => (
        <div className="secTitle">
          <span className="bar" />
          <span className="text">{label}</span>
          {typeof count === "number" && <span className="meta">{count}건</span>}
        </div>
      );

    // 간단한 테이블 컴포넌트
    const LogTable = ({ title, rows }) => {
      const tableStyle = { width: "100%", borderCollapse: "collapse" };
      const thStyle = { width: 220, padding: "8px 10px", textAlign: "left", verticalAlign: "top", borderBottom: "1px solid #d3d7d5", background: "#f7f7f7", fontWeight: 500 };
      const tdStyle = { padding: "8px 10px", verticalAlign: "top", borderBottom: "1px solid #d3d7d5" };
      const preStyle = { whiteSpace: "pre-wrap", margin: 0 };
  
      if (rows.length === 0) return <p style={{ color: "#69706d" }}>표시할 데이터가 없습니다.</p>;

      return (
        <table style={tableStyle}>
          <colgroup>
            <col style={{ width: 220 }} />
            <col />
          </colgroup>
          <tbody>
            {rows.map(([time, text], idx) => (
              <tr key={`${time}-${idx}`}>
                <th style={thStyle}>{time}</th>
                <td style={tdStyle}>
                  <div className="prompt-text" style={preStyle}>
                    {String(text)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    };
  
    return (
        <article className={`modal ${modalOnOff}`}>
          <div className="cmn_popup" style={{ width: "1000px", maxHeight: 720, overflow: "hidden" }}>
            <div className="popTit">
              <h3>기존 프롬프트 지침 내용</h3>
              <a className="btnClose" onClick={handleCancelButton}><span className="hidden">close</span></a>
            </div>
    
            <div className="popCont" style={{ maxHeight: 600, overflowY: "auto" }}>
              {/* 1) 응답 프롬프트 */}
              <SectionTitle label="응답 프롬프트" count={rowsRes.length} />
              <LogTable rows={rowsRes} />
    
              <div className="decoLineS" />
    
              {/* 2) 보기 프롬프트 */}
              <SectionTitle label="보기 프롬프트" count={rowsEx.length} />
              <LogTable rows={rowsEx} />
            </div>
          </div>
        </article>
      );
    };
  
  export default PreviousPromptPopup;