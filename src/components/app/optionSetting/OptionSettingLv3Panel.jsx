import React, { useState } from "react";
const OptionSettingLv3Panel = ({
  open,
  onClose,
  targets,
  options = [],                // 부모에서 내려주는 lv3Options
  onApply
}) => {

  // -----검색 필터링-----//
  const [searchTerm, setSearchTerm] = useState(""); // 검색어 상태
  const filteredOptions = (options || []).filter(opt =>
    opt.codeName.toLowerCase().includes(searchTerm.toLowerCase())
  );
  // -----검색 필터링-----//
  
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
          {filteredOptions.map(opt => (
            <div
              key={opt.lv123code+"_"+opt.codeName}
              className="lv3-panel-item"
              onClick={() => onApply(targets, opt)}
            >
              <span>{opt.codeName}</span>
              <span className="code">{opt.codeId}</span>
            </div>
          ))}
          {filteredOptions.length === 0 && <p className="lv3-empty">검색 결과가 없습니다.</p>}
        </div>
      </aside>

      {/* 토글 버튼 */}
      <div
        className="lv3-panel-toggle"
        onClick={() => onClose(!open)}
        style={{ right: open ? "280px" : "0" }}
      >
        {open ? ">>" : "<<"}
      </div>
    </div>
  );
};

export default OptionSettingLv3Panel;
