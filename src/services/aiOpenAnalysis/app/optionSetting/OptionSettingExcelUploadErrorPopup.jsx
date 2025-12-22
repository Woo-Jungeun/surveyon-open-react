import React, { useMemo } from "react";

/**
 * 분석 > 엑셀 업로드 오류 결과 팝업
 *
 * @author jewoo
 * @since 2025-10-24
 */
const OptionSettingExcelUploadErrorPopup = ({ popupShow, onClose, errorList = [] }) => {
  const modalOnOff = popupShow ? "on" : "off";

  /** 구분별 데이터 분리 */
  const { answerErrors, viewErrors } = useMemo(() => {
    const answer = [];
    const view = [];
    (errorList || []).forEach((item) => {
      const gb = (item?.error_gb || "").trim();
      if (gb === "응답자") answer.push(item);
      else if (gb === "보기") view.push(item);
    });
    return { answerErrors: answer, viewErrors: view };
  }, [errorList]);

  /** 공통 테이블 렌더러 */
  const ErrorTable = ({ rows }) => {
    if (!rows?.length)
      return <p style={{ padding: 12, color: "#888" }}>표시할 오류 데이터가 없습니다.</p>;

    return (
      <div style={{ overflowY: "auto", overflowX: "auto", maxHeight: "400px", borderRadius: 6 }}>
        <table
          className="k-grid k-table"
          style={{
            width: "100%",
            minWidth: "950px", // 최소 너비 확보
            borderCollapse: "collapse",
            borderSpacing: 0,
            tableLayout: "fixed",
            border: "1px solid #d3d7d5",
            boxSizing: "border-box",
          }}
        >
          <colgroup>
            <col style={{ width: "150px" }} />
            <col style={{ width: "100px" }} />
            <col style={{ width: "200px" }} />
            <col style={{ width: "200px" }} />
            <col style={{ width: "100px" }} />
            <col style={{ width: "200px" }} />
          </colgroup>

          <thead>
            <tr
              style={{
                background: "#f9fafb",
                borderBottom: "1px solid #d3d7d5",
              }}
            >
              <th style={{ width: "150px", textAlign: "center", padding: "8px" }}>key</th>
              <th style={{ width: "100px", textAlign: "center", padding: "8px" }}>복수</th>
              <th style={{ width: "200px", textAlign: "center", padding: "8px" }}>응답내용</th>
              <th style={{ width: "200px", textAlign: "center", padding: "8px" }}>소분류코드</th>
              <th style={{ width: "100px", textAlign: "center", padding: "8px" }}>소분류</th>
              <th style={{ width: "200px", textAlign: "center", padding: "8px" }}>에러내용</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r, idx) => (
              <tr key={`${r.fixed_key || r.key || "row"}-${idx}`}>
                <td style={{ width: "150px", textAlign: "center", padding: "8px", wordBreak: "break-all", verticalAlign: "middle" }}>{r.fixed_key || r.key || "-"}</td>
                <td style={{ width: "100px", textAlign: "center", padding: "8px", wordBreak: "break-all", verticalAlign: "middle" }}>{r.cid || "-"}</td>
                <td
                  style={{
                    width: "200px",
                    padding: "8px",
                    wordBreak: "break-all",
                    whiteSpace: "normal",
                    verticalAlign: "middle"
                  }}
                  title={r.answer_origin || "-"}
                >
                  {r.answer_origin || "-"}
                </td>
                <td style={{ width: "200px", padding: "8px", wordBreak: "break-all", verticalAlign: "middle" }}>{r.lv3 || "-"}</td>
                <td style={{ width: "100px", textAlign: "center", padding: "8px", wordBreak: "break-all", verticalAlign: "middle" }}>{r.lv123code || "-"}</td>
                <td style={{ width: "200px", padding: "8px", color: "#c63d3d", fontWeight: 500, wordBreak: "break-all", verticalAlign: "middle" }}>
                  {r.error_msg || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  /** 섹션 헤더 */
  const SectionTitle = ({ label, count }) => (
    <div className="secTitle">
      <span className="bar" />
      <span className="text">{label}</span>
      {typeof count === "number" && <span className="meta">{count}건</span>}
    </div>
  );

  /** 렌더링 */
  return (
    <article className={`modal ${modalOnOff}`}>
      <div className="cmn_popup">
        <div className="popTit">
          <h3> 엑셀 업로드 오류 코딩 결과 </h3>
          <a className="btnClose" onClick={() => onClose(false)}><span className="hidden">close</span></a>
        </div>

        <div className="popCont" style={{ maxHeight: 720, overflowY: "auto" }}>
          {/* 안내 문구 */}
          <p
            style={{
              padding: "14px 18px",
              marginBottom: 20,
              color: "#444",
              background: "#f8f9fa",
              borderRadius: 6,
              border: "1px solid #e3e5e4",
            }}
          >
            현재 오류사항이 모두 적용되어야 정상적으로 업로드가 완료됩니다.
          </p>

          {/* 보기 오류 목록 */}
          {viewErrors.length > 0 && (
            <>
              <SectionTitle label="보기 오류 목록" count={viewErrors.length} />
              <ErrorTable rows={viewErrors} />
            </>
          )}

          {/* 응답자 오류 목록 */}
          {answerErrors.length > 0 && (
            <>
              <SectionTitle label="응답자 오류 목록" count={answerErrors.length} />
              <ErrorTable rows={answerErrors} />
            </>
          )}
          {/* 데이터 없음 */}
          {viewErrors.length === 0 && answerErrors.length === 0 && (
            <p style={{ padding: 20, color: "#69706d", textAlign: "center" }}>
              표시할 오류 데이터가 없습니다.
            </p>
          )}
        </div>
      </div>
    </article>
  );
};

export default OptionSettingExcelUploadErrorPopup;
