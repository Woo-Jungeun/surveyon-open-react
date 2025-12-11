import { useMemo, useState } from "react";

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
   * 테이블: 각 행
   * - 본문은 기본 2줄로 줄임(클램프)
   * - 우측 아이콘 클릭 시 전체 보기/접기
   * - "선택" 버튼 제공 (부모에 {type, time, text} 전달)
   */
  const LogTable = ({ rows, type }) => {
    const [openKeys, setOpenKeys] = useState(() => new Set());

    const toggle = (key) => {
      setOpenKeys(prev => {
        const next = new Set(prev);
        next.has(key) ? next.delete(key) : next.add(key);
        return next;
      });
    };

    //선택 버튼 클릭 시 핸들러(분석정보 프롬픈트 textarea에 적용)
    const onPick = (time, text) => {
      if (typeof onSelectPrompt === "function") {
        onSelectPrompt({ type, time, text: String(text) });
      }
    };

    if (rows.length === 0) return <p style={{ color: "#69706d" }}>표시할 데이터가 없습니다.</p>;

    const tableStyle = { width: "100%", borderCollapse: "collapse" };
    const thStyle = { width: 220, padding: "8px 10px", textAlign: "left", verticalAlign: "top", borderBottom: "1px solid #d3d7d5", background: "#f7f7f7", fontWeight: 500 };
    const tdStyle = { padding: "8px 10px", verticalAlign: "top", borderBottom: "1px solid #d3d7d5" };

    return (
      <table style={tableStyle}>
        <colgroup>
          <col style={{ width: 220 }} />
          <col />
          <col style={{ width: 96 }} />
        </colgroup>
        <tbody>
          {rows.map(([time, text], idx) => {
            const key = `${type}-${time}-${idx}`;
            const opened = openKeys.has(key);
            return (
              <tr key={key}>
                <th style={thStyle}>{time}</th>
                <td style={tdStyle}>
                  <div className={`prompt-text ${opened ? "expanded" : "clamp-2"}`}>
                    {String(text)}
                  </div>
                </td>
                <td style={{ ...tdStyle, width: 96 }}>
                  <div className="rowActions">
                    <button
                      type="button"
                      className={`toggleBtn ${opened ? "on" : ""}`}
                      aria-label={opened ? "접기" : "펼치기"}
                      onClick={() => toggle(key)}
                    />
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
          })}
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
          <LogTable rows={rowsEx} type="ex" />

          <div className="decoLineS" />

          {/* 응답 프롬프트 */}
          <SectionTitle label="응답 프롬프트" count={rowsRes.length} />
          <LogTable rows={rowsRes} type="res" />
        </div>
      </div>
    </article>
  );
};

export default OptionSettingPopup;