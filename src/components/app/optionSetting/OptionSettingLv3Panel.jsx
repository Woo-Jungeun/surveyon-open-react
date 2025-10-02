import React, { useEffect, useState } from "react";
import { OptionSettingApi } from "@/components/app/optionSetting/OptionSettingApi.js";
import { useSelector } from "react-redux";
const OptionSettingLv3Panel = ({
  open,
  onClose,
  projectnum,
  qnum,
  targets,
  currentCodeIds,
  onOptionsLoaded,
  onApply
}) => {
  const { optionEditData } = OptionSettingApi();
  const auth = useSelector((store) => store.auth);

  const [options, setOptions] = useState([]);
  const [searchTerm, setSearchTerm] = useState(""); // 검색어 상태

  useEffect(() => {
    if (!open && options.length > 0) return; // 이미 불러온 값 있으면 skip

    async function fetchOptions() {
      try {
        const res = await optionEditData.mutateAsync({
          params: {
            user: auth?.user?.userId || "",
            projectnum,
            qnum,
            gb: "lb",
          }
        });
        const seen = new Set();
        const list = (res?.resultjson ?? []).reduce((acc, r) => {
          const lv3 = (r?.lv3 ?? "").trim();
          const lv123code  = (r?.lv123code  ?? "").trim();
          if (!lv3 || seen.has(lv3)) return acc;
          seen.add(lv3);
          acc.push({
            codeId: lv123code,
            codeName: lv3,
            lv1: r?.lv1 ?? "",
            lv2: r?.lv2 ?? "",
            lv1code: r?.lv1code ?? "",
            lv2code: r?.lv2code ?? "",
            lv123code: r?.lv123code ?? "",
          });
          return acc;
        }, []);
        setOptions(list);
        onOptionsLoaded?.(list);
      } catch (err) {
        console.error("lv3 fetch error", err);
      }
    }

    fetchOptions();
  }, [open, projectnum, qnum, currentCodeIds]);

  // 검색 필터링
  const filteredOptions = options.filter(opt =>
    opt.codeName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="lv3-panel-wrap">
      {/* 패널 */}
      <aside className={`lv3-side-panel ${open ? "open" : ""}`}>
        <div className="lv3-panel-header">
          <h3>소분류 선택</h3>
          <input
            type="text"
            placeholder="소분류 검색..."
            className="lv3-search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="lv3-panel-body">
          {filteredOptions.map(opt => (
            <div
              key={opt.lv123code}
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
