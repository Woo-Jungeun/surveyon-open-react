import React, { useState, useEffect, useContext } from "react";
import { useSelector } from "react-redux";
import { modalContext } from "@/components/common/Modal.jsx";
import { GridColumn as Column } from "@progress/kendo-react-grid";
import { Button } from "@progress/kendo-react-buttons";
import KendoGrid from "@/components/kendo/KendoGrid.jsx";
import { ProListApi } from "./ProListApi.js";
import { process } from "@progress/kendo-data-query";

/**
 * 문항 목록 > 필터문항설정 팝업 
 *
 * @author jewoo
 * @since 2025-09-16<br />
 */
const ProListPopup = (parentProps) => {
  const { popupShow, setPopupShow, popupMode, popupRow, firstQnum } = parentProps;
  const modalOnOff = popupShow ? "on" : "off";

  const auth = useSelector((store) => store.auth);
  const projectnum = sessionStorage.getItem("projectnum");
  const { editMutation } = ProListApi();
  const modal = useContext(modalContext);

  const [gridData, setGridData] = useState([]);
  const [selectedState, setSelectedState] = useState({});
  const [filter, setFilter] = useState(null);
  const [sort, setSort] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (popupShow) {
      fetchData();
    }
  }, [popupShow]);

  const fetchData = async () => {
    try {
      const qnumVal = popupMode === "single"
        ? (popupRow?.merge_qnum || "")
        : (firstQnum || "");

      const res = await editMutation.mutateAsync({
        user: auth?.user?.userId || "",
        projectnum,
        gb: "filter_select_qnum",
        qnum: qnumVal,
      });
      if (res?.success === "777" && res?.resultjson) {
        setGridData(res.resultjson);
        const newSelectedState = {};
        res.resultjson.forEach(item => {
          if (String(item.qnum_db).toLowerCase() === "true") {
            newSelectedState[item.qnum_id] = true;
          }
        });
        setSelectedState(newSelectedState);
      } else {
        setGridData([]);
        setSelectedState({});
      }
    } catch (e) {
      console.error(e);
      setGridData([]);
      setSelectedState({});
    }
  };

  const filteredGridData = React.useMemo(() => {
    if (!searchTerm.trim()) return gridData;
    const lower = searchTerm.toLowerCase();
    return gridData.filter(item => item.qnum_question?.toLowerCase().includes(lower));
  }, [gridData, searchTerm]);

  const processedData = process(filteredGridData, { filter, sort });

  const selectedItems = gridData.filter(item => selectedState[item.qnum_id]);

  const handleCancelButton = () => {
    setPopupShow(false);
  };

  const handleRemoveItem = (id) => {
    setSelectedState(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleSelectedStateChange = (newState) => {
    const keys = Object.keys(newState);
    const checkedCount = keys.filter(k => newState[k]).length;
    if (checkedCount > 3) {
      modal.showAlert("알림", "문항은 최대 3개까지만 선택할 수 있습니다.");
      const allowedState = {};
      let count = 0;
      // 먼저 기존 선택 유지
      keys.forEach(k => {
        if (newState[k] && selectedState[k]) {
          allowedState[k] = true;
          count++;
        }
      });
      // 추가되는 아이템을 제한 안에서만 허용
      keys.forEach(k => {
        if (newState[k] && !selectedState[k]) {
          if (count < 3) {
            allowedState[k] = true;
            count++;
          }
        }
      });
      setSelectedState(allowedState);
      return;
    }
    setSelectedState(newState);
  };

  const handleComplete = async () => {
    // if (selectedItems.length === 0) {
    //   modal.showErrorAlert("알림", "선택된 문항이 없습니다.");
    //   return;
    // }

    const gb = popupMode === "single" ? "filter_update_single" : "filter_update_all";

    const payload = {
      user: auth?.user?.userId || "",
      projectnum,
      gb: gb,
      ...(popupMode === "single" && { qnum: popupRow?.merge_qnum || "" }),
      data: selectedItems.map(item => ({
        qnum_id: item.qnum_id,
        qnum_question: item.qnum_question,
        qnum_variable: item.qnum_variable,
        qnum_type: item.qnum_type
      }))
    };

    try {
      const res = await editMutation.mutateAsync(payload);
      if (res?.success === "777") {
        modal.showConfirm("알림", "필터 선택이 완료되었습니다.", {
          btns: [
            {
              title: "확인",
              click: () => {
                setPopupShow(false);
              }
            }
          ]
        });
      } else {
        modal.showErrorAlert("에러", res?.message || "저장에 실패했습니다.");
      }
    } catch (error) {
      console.error(error);
      modal.showErrorAlert("에러", "처리 중 오류가 발생했습니다.");
    }
  };

  return (
    <article className={`modal ${modalOnOff}`}>
      <div className="cmn_popup" style={{ width: "800px", height: "700px", maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div className="popTit">
          <h3>필터문항 설정</h3>
          <a className="btnClose" onClick={handleCancelButton}><span className="hidden">close</span></a>
        </div>

        <div className="popCont" style={{ flex: 1, padding: "20px", display: "flex", flexDirection: "column", gap: "12px", overflow: "hidden" }}>
          {/* Warning Message for All-Setting */}
          {popupMode === "all" && (
            <div>
              <span style={{ fontSize: "16px" }}>⚠️</span>
              <span style={{ fontSize: "14px", color: "#dc2626", fontWeight: "500", letterSpacing: "-0.5px" }}>
                "전체필터" 설정 시 "모든 문항"에 일괄 필터 적용됩니다.
              </span>
            </div>
          )}


          {/* Search Input Area */}
          <div style={{ position: "relative", marginBottom: "4px" }}>
            <input
              type="text"
              placeholder="문항을 검색하세요."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%", padding: "0 16px 0 44px", height: "44px", boxSizing: "border-box",
                fontSize: "14px", border: "1px solid #e2e8f0", borderRadius: "8px",
                backgroundColor: "#f8fafc", color: "#334155", outline: "none",
                transition: "all 0.2s ease-in-out",
                boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#fdba74";
                e.target.style.backgroundColor = "#fff";
                e.target.style.boxShadow = "0 0 0 3px #fff7ed";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e2e8f0";
                e.target.style.backgroundColor = "#f8fafc";
                e.target.style.boxShadow = "0 1px 2px 0 rgba(0, 0, 0, 0.05)";
              }}
            />
            <svg style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>

          {/* Kendo Grid */}
          <div style={{ flex: 1, minHeight: 0, border: "1px solid #e2e8f0" }}>
            <KendoGrid
              parentProps={{
                data: processedData.data,
                total: processedData.total,
                dataItemKey: "qnum_id",
                idGetter: (item) => item.qnum_id,
                multiSelect: true,
                selectedField: "selected",
                selectedState: selectedState,
                setSelectedState: handleSelectedStateChange,
                filter: filter,
                filterChange: (e) => setFilter(e.filter ?? null),
                sort: sort,
                sortChange: (e) => setSort(e.sort ?? []),
                filterable: true,
                sortable: true,
                selectionColumnWidth: "60px",
                height: "100%",
                linkRowClickToSelection: false,
              }}
            >
              <Column field="qnum_question" title="문항" width="auto" />
              <Column field="qnum_type" title="타입" width="180px" />
            </KendoGrid>
          </div>

          {/* Footer Area: Selected Items & Action Button */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "4px", borderTop: "1px solid #e2e8f0", paddingTop: "12px" }}>
            {/* Selected Items Area */}
            <div style={{ display: "flex", alignItems: "center", minHeight: "36px" }}>
              <span style={{ fontSize: "14px", fontWeight: "600", color: "#333", marginRight: "12px", whiteSpace: "nowrap" }}>
                선택된 문항 ({selectedItems.length}/3)
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", flex: 1 }}>
                {selectedItems.length === 0 ? (
                  <span style={{ color: "#9ca3af", fontSize: "13px" }}>선택된 문항이 없습니다.</span>
                ) : (
                  selectedItems.map(item => (
                    <div key={item.qnum_id} style={{ display: "flex", alignItems: "center", backgroundColor: "#fff7ed", color: "#ea580c", padding: "4px 10px", borderRadius: "16px", fontSize: "13px", border: "1px solid #fdba74" }}>
                      <span style={{ wordBreak: "break-all" }}>{item.qnum_question}</span>
                      <button onClick={() => handleRemoveItem(item.qnum_id)} style={{ marginLeft: "4px", background: "none", border: "none", cursor: "pointer", color: "#ea580c", padding: 0, display: "flex", outline: "none" }}>
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button className="btnM" themeColor="primary" onClick={handleComplete} style={{ backgroundColor: "#F97316", borderColor: "#F97316", color: "#fff", minWidth: "100px", height: "36px", fontSize: "14px", fontWeight: "600", flexShrink: 0 }}>
                선택 완료
              </Button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

export default ProListPopup;