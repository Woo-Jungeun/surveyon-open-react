import { useMemo, useState, useRef, useEffect } from "react";

/**
 * 분석 > 정보 영역 > 프롬프트 지침 > [기존] 버튼 팝업  
 *
 * @author jewoo
 * @since 2025-08-19<br />
 */
const OptionSettingPopup = (parentProps) => {
  const { popupShow, previousPromptResValue, previousPromptExValue, onSelectPrompt } = parentProps;
  const modalOnOff = popupShow ? "on" : "off";

  const handleCancelButton = () => parentProps.setPopupShow(false);

  // "시간: 내용" 형태(or JSON 문자열) → [ [time, text], ... ] 오름차순
  const parseToRows = (src) => {
    if (src == null) return [];
    let obj = src;
    if (typeof obj === "string") {
      try { obj = JSON.parse(obj); } catch { return []; }
    }
    if (typeof obj !== "object") return [];
    return Object.entries(obj)
      .filter(([k, v]) => k && v != null)
      // .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()); //오름차순
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());   //내림차순
  };

  const rowsRes = useMemo(() => parseToRows(previousPromptResValue), [previousPromptResValue]);
  const rowsEx = useMemo(() => parseToRows(previousPromptExValue), [previousPromptExValue]);

  // 섹션헤더
  const SectionTitle = ({ label, count }) => (
    <div className="secTitle">
      <span className="bar" />
      <span className="text">{label}</span>
      {typeof count === "number" && <span className="meta">{count}건</span>}
    </div>
  );

  /**
   * 테이블 행 컴포넌트 (Overflow 체크를 위해 분리)
   */
  const LogRow = ({ time, text, type, onPick, popupShow }) => {
    const [opened, setOpened] = useState(false);
    const [showToggle, setShowToggle] = useState(false);
    const textRef = useRef(null);

    // 텍스트가 2줄을 넘는지 체크 (popupShow가 true가 될 때도 체크해야 함)
    useEffect(() => {
      if (!popupShow) return; // 팝업이 닫혀있으면 계산 불필요

      // 약간의 지연을 주어 렌더링이 완료된 후 계산하도록 함 (안전장치)
      const timer = setTimeout(() => {
        const el = textRef.current;
        if (el) {
          if (el.scrollHeight > el.clientHeight) {
            setShowToggle(true);
          } else {
            setShowToggle(false);
          }
        }
      }, 50);

      return () => clearTimeout(timer);
    }, [text, popupShow]);

    const thStyle = { width: 220, padding: "8px 10px", textAlign: "left", verticalAlign: "top", borderBottom: "1px solid #d3d7d5", background: "#f7f7f7", fontWeight: 500 };
    const tdStyle = { padding: "8px 10px", verticalAlign: "top", borderBottom: "1px solid #d3d7d5" };

    return (
      <tr>
        <th style={thStyle}>{time}</th>
        <td style={tdStyle}>
          <div
            ref={textRef}
            className={`prompt-text ${opened ? "expanded" : "clamp-2"}`}
            title={!opened && showToggle ? text : undefined}
            style={{ wordBreak: "break-all" }}
          >
            {String(text)}
          </div>
        </td>
        <td style={{ ...tdStyle, width: 96 }}>
          <div className="rowActions">
            {showToggle && (
              <button
                type="button"
                className={`toggleBtn ${opened ? "on" : ""}`}
                aria-label={opened ? "접기" : "펼치기"}
                onClick={() => setOpened(!opened)}
              />
            )}
            <button
              type="button"
              className="k-button k-button-solid-primary btnMini"
              onClick={() => onPick(time, text)}
            >
              선택
            </button>
          </div>
        </td>
      </tr>
    );
  };

  /**
   * 테이블: 각 행
   * - 본문은 기본 2줄로 줄임(클램프)
   * - 우측 아이콘 클릭 시 전체 보기/접기
   * - "선택" 버튼 제공 (부모에 {type, time, text} 전달)
   */
  const LogTable = ({ rows, type, popupShow }) => {
    //선택 버튼 클릭 시 핸들러(분석정보 프롬픈트 textarea에 적용)
    const onPick = (time, text) => {
      if (typeof onSelectPrompt === "function") {
        onSelectPrompt({ type, time, text: String(text) });
      }
    };

    if (rows.length === 0) return <p style={{ color: "#69706d" }}>표시할 데이터가 없습니다.</p>;

    const tableStyle = { width: "100%", borderCollapse: "collapse" };

    return (
      <table style={tableStyle}>
        <colgroup>
          <col style={{ width: 220 }} />
          <col />
          <col style={{ width: 96 }} />
        </colgroup>
        <tbody>
          {rows.map(([time, text], idx) => (
            <LogRow
              key={`${type}-${time}-${idx}`}
              time={time}
              text={text}
              type={type}
              onPick={onPick}
              popupShow={popupShow}
            />
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
          {/* 보기 프롬프트 */}
          <SectionTitle label="보기 프롬프트" count={rowsEx.length} />
          <LogTable rows={rowsEx} type="ex" popupShow={popupShow} />

          <div className="decoLineS" />

          {/* 응답 프롬프트 */}
          <SectionTitle label="응답 프롬프트" count={rowsRes.length} />
          <LogTable rows={rowsRes} type="res" popupShow={popupShow} />
        </div>
      </div>
    </article>
  );
};

export default OptionSettingPopup;