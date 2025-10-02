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
  const [options, setOptions] = useState([]);
  const auth = useSelector((store) => store.auth);
  
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
          if (!lv3 || seen.has(lv3)) return acc;
          seen.add(lv3);
          acc.push({
            codeId: lv3,
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
  

  return (
    <div className="lv3-panel-wrap">
      {/* 패널 */}
      <aside className={`lv3-side-panel ${open ? "open" : ""}`}>
        <div className="lv3-panel-header">
          <h3>소분류 선택</h3>
        </div>
        <div className="lv3-panel-body">
          {options.map(opt => (
            <div key={opt.lv123code} className="lv3-option">
              <button
                onClick={() => {
                  console.log("👉 Panel onApply 실행", { targets, opt });
                  onApply(targets, opt); // 이미 Set이니까 그대로 넘기기
                }}
              >
                {opt.codeName}
              </button>
            </div>
          ))}
          {options.length === 0 && <p>소분류가 없습니다.</p>}
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
