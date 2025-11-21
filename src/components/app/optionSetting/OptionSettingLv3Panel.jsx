import React, { useState, useMemo, useDeferredValue, memo } from "react";

// 리스트 아이템 컴포넌트 (렌더링 최적화를 위해 분리)
const OptionItem = memo(({ opt, targets, onApply }) => {
  return (
    <div
      className="lv3-panel-item"
      onClick={() => onApply(targets, opt)}
    >
      <span>{opt.codeName}</span>
      <span className="code">{opt.codeId}</span>
    </div>
  );
});

/**
 * 분석 > 응답 데이터 > 패널 영역
 * @author jewoo
 * @since 2025-09-30<br />
 */

const OptionSettingLv3Panel = memo(({ open, onClose, targets, options = [], onApply }) => {
  const [searchTerm, setSearchTerm] = useState("");   // 검색어 상태 관리
  const deferredSearchTerm = useDeferredValue(searchTerm);   // 입력 반응성은 유지하되, 필터링 연산은 한 박자 늦게 처리 (렉 제거 핵심)

  // 필터링 및 정렬 로직 최적화 (useMemo)
  const filteredOptions = useMemo(() => {
    // 데이터 방어 코드
    if (!options) return [];
    let result = options;
    // 검색 필터링
    if (deferredSearchTerm) {
      const lowerTerm = deferredSearchTerm.toLowerCase();
      result = result.filter(opt =>
        opt.codeName && opt.codeName.toLowerCase().includes(lowerTerm)
      );
    }

    // 정렬 로직 (숫자형 오름차순 정렬)
    const sortedResult = [...result].sort((a, b) => Number(a.codeId) - Number(b.codeId));
     // 정렬 로직 (문자형 오름차순 정렬)
    // const sortedResult = [...result].sort((a, b) => {
    //   const idA = String(a.codeId || ""); // 문자열로 변환
    //   const idB = String(b.codeId || "");
    //   return idA.localeCompare(idB);
    // });
    return sortedResult;
  }, [options, deferredSearchTerm]); // options나 검색어가 변할 때만 재계산

  return (
    <div className="lv3-panel-wrap">
      {/* 패널 */}
      <aside className={`lv3-side-panel ${open ? "open" : ""}`}>
        <div className="lv3-panel-header">
          <h3>소분류 선택</h3>
          <input
            type="text"
            placeholder="소분류를 검색하세요."
            className="lv3-search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="lv3-panel-body">
          {/* 아이템 컴포넌트 렌더링 */}
          {filteredOptions.map(opt => (
            <OptionItem
              key={`${opt.lv123code}_${opt.codeName}`}
              opt={opt}
              targets={targets}
              onApply={onApply}
            />
          ))}
          {filteredOptions.length === 0 && (
            <p className="lv3-empty">검색 결과가 없습니다.</p>
          )}
        </div>
      </aside>

      {/* 토글 버튼 */}
      <div
        className="lv3-panel-toggle"
        onClick={() => onClose(!open)}
      >
        {open ? ">>" : "<<"}
      </div>
    </div>
  );
});

export default OptionSettingLv3Panel;