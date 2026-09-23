import React, { Fragment, useState, useCallback, useEffect } from "react";
import { Button } from "@progress/kendo-react-buttons";
import { GridColumn as Column } from "@progress/kendo-react-grid";
import GridData from "@/components/common/grid/GridData.jsx";
import KendoGrid from "@/components/kendo/KendoGrid.jsx";
import { useSelector } from "react-redux";
import ExcelColumnMenu from '@/components/common/grid/ExcelColumnMenu';
import { ProRegisterApi } from "./ProRegisterApi.js";
import GridDataCount from "@/components/common/grid/GridDataCount";
import { process } from "@progress/kendo-data-query";

/**
 *  문항등록 > DB > 그리드
 *
 * @author jewoo
 * @since 2026-09-18
 */
const ProRegisterGrid = ({ onDataLength }) => {
  const auth = useSelector((store) => store.auth);
  const DATA_ITEM_KEY = "no";
  const SELECTED_FIELD = "selected";
  const { fetchRegisterDbList } = ProRegisterApi();
  const projectnum = sessionStorage.getItem("projectnum");

  const [sort, setSort] = useState([]);
  const [filter, setFilter] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState("all");

  const [columns, setColumns] = useState(() => [
    { field: "no", title: "no", show: true, editable: false, width: "60px", allowHide: false },
    { field: "gb", title: "구분", show: true, editable: false, width: "115px", allowHide: false },
    { field: "qnum", title: "qnum", show: true, editable: false, width: "120px", allowHide: false },
    { field: "question", title: "등록된 웹의 오픈문항", show: true, editable: false, allowHide: false },
    { field: "registered_pid_count", title: "기존 PID", show: true, editable: false, width: "100px", allowHide: false },
    { field: "new_pid_count", title: "추가 PID", show: true, editable: false, width: "100px", allowHide: false },
    { field: "total_pid_count", title: "전체 PID", show: true, editable: false, width: "100px", allowHide: false },
  ]);

  const columnMenu = (menuProps) => (
    <ExcelColumnMenu
      {...menuProps}
      columns={columns}
      onColumnsChange={(updated) => {
        const map = new Map(updated.map(c => [c.field, c]));
        const next = columns.map(c => {
          const u = map.get(c.field);
          return u ? { ...c, ...u } : c;
        });
        setColumns(next);
      }}
      filter={filter}
      onFilterChange={(e) => setFilter(e ?? null)}
      onSortChange={(e) => setSort(e ?? [])}
    />
  );

  const GridRenderer = (props) => {
    const { dataState, dataItemKey, selectedState, setSelectedState, selectedField, idGetter } = props;

    useEffect(() => {
      onDataLength?.(dataState?.data?.length || 0);
    }, [dataState?.data]);

    const rawList = dataState?.data || [];
    const totalCnt = rawList.length;
    const pendingCnt = rawList.filter(r => r.is_registered === false || Number(r.new_pid_count ?? 0) > 0).length;
    const completedCnt = rawList.filter(r => r.is_registered === true || (Number(r.new_pid_count ?? 0) === 0 && Number(r.registered_pid_count ?? 0) > 0)).length;

    const displayData = React.useMemo(() => {
      if (activeSubTab === "pending") {
        return rawList.filter(r => r.is_registered === false || Number(r.new_pid_count ?? 0) > 0);
      }
      if (activeSubTab === "completed") {
        return rawList.filter(r => r.is_registered === true || (Number(r.new_pid_count ?? 0) === 0 && Number(r.registered_pid_count ?? 0) > 0));
      }
      return rawList;
    }, [rawList, activeSubTab]);

    return (
      <div className="cmn_gird_wrap" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <style>{`
          #grid_01 .k-grid-content {
            max-height: 293px !important;
          }
        `}</style>

        {/* 세부 필터 세그먼트 탭 */}
        <div style={{ flex: "0 0 auto", display: 'inline-flex', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: '8px', gap: '3px', marginBottom: '10px', alignSelf: 'flex-start' }}>
          <button
            type="button"
            onClick={() => setActiveSubTab("all")}
            style={{
              padding: '5px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: activeSubTab === "all" ? 600 : 500,
              backgroundColor: activeSubTab === "all" ? '#fff' : 'transparent',
              color: activeSubTab === "all" ? '#0f172a' : '#64748b',
              boxShadow: activeSubTab === "all" ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              border: activeSubTab === "all" ? '1px solid #e2e8f0' : '1px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            전체 <span style={{ marginLeft: '4px', fontWeight: activeSubTab === "all" ? 700 : 500, color: activeSubTab === "all" ? '#ea580c' : '#94a3b8' }}>({totalCnt})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("pending")}
            style={{
              padding: '5px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: activeSubTab === "pending" ? 600 : 500,
              backgroundColor: activeSubTab === "pending" ? '#fff' : 'transparent',
              color: activeSubTab === "pending" ? '#0f172a' : '#64748b',
              boxShadow: activeSubTab === "pending" ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              border: activeSubTab === "pending" ? '1px solid #e2e8f0' : '1px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            PID 추가 대기 <span style={{ marginLeft: '4px', fontWeight: activeSubTab === "pending" ? 700 : 500, color: activeSubTab === "pending" ? '#ea580c' : '#94a3b8' }}>({pendingCnt})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("completed")}
            style={{
              padding: '5px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: activeSubTab === "completed" ? 600 : 500,
              backgroundColor: activeSubTab === "completed" ? '#fff' : 'transparent',
              color: activeSubTab === "completed" ? '#0f172a' : '#64748b',
              boxShadow: activeSubTab === "completed" ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              border: activeSubTab === "completed" ? '1px solid #e2e8f0' : '1px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            등록 완료 <span style={{ marginLeft: '4px', fontWeight: activeSubTab === "completed" ? 700 : 500, color: activeSubTab === "completed" ? '#ea580c' : '#94a3b8' }}>({completedCnt})</span>
          </button>
        </div>

        <div id="grid_01" className="cmn_grid singlehead" style={{ flex: 1, minHeight: 0 }}>
          <KendoGrid
            parentProps={{
              style: { height: "100%" },
              data: displayData,
              dataItemKey,
              selectedState,
              setSelectedState,
              selectedField,
              idGetter,
              sortable: { mode: "multiple", allowUnsort: true },
              filterable: true,
              sortChange: ({ sort }) => setSort(sort ?? []),
              filterChange: ({ filter }) => setFilter(filter ?? undefined),
              sort,
              filter,
              noRecordsMessage: "조회 조건에 해당하는 오픈 문항이 없습니다."
            }}
          >
            {columns.filter((c) => c.show !== false).map((c) => {
              if (c.field === "gb") {
                return (
                  <Column
                    key={c.field}
                    field={c.field}
                    title={c.title}
                    width={c.width}
                    columnMenu={columnMenu}
                    cell={(cellProps) => {
                      const item = cellProps.dataItem;
                      const isReg = item.is_registered === true;
                      const val = item.gb || (isReg ? "등록완료" : "신규대기");
                      return (
                        <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '0 4px', textOverflow: 'clip' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            whiteSpace: 'nowrap',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            lineHeight: 1,
                            backgroundColor: isReg ? '#f0fdf4' : '#fff7ed',
                            color: isReg ? '#15803d' : '#c2410c',
                            border: isReg ? '1px solid #bbf7d0' : '1px solid #fed7aa'
                          }}>
                            {val}
                          </span>
                        </td>
                      );
                    }}
                  />
                );
              }
              if (c.field === "registered_pid_count" || c.field === "target_completed_pid_count" || c.field === "new_pid_count" || c.field === "total_pid_count") {
                return (
                  <Column
                    key={c.field}
                    field={c.field}
                    title={c.title}
                    width={c.width}
                    columnMenu={columnMenu}
                    cell={(cellProps) => {
                      const val = cellProps.dataItem[c.field];
                      return (
                        <td style={{ textAlign: 'center' }}>
                          {val != null && val !== "" ? `${Number(val).toLocaleString()}` : '0'}
                        </td>
                      );
                    }}
                  />
                );
              }
              return (
                <Column
                  key={c.field}
                  field={c.field}
                  title={c.title}
                  width={c.width}
                  editable={c.editable}
                  columnMenu={columnMenu}
                />
              );
            })}
          </KendoGrid>
        </div>
      </div>
    );
  };

  return (
    <GridData
      dataItemKey={DATA_ITEM_KEY}
      rowNumber={"no"}
      rowNumberOrder="asc"
      selectedField={SELECTED_FIELD}
      searchMutation={fetchRegisterDbList}
      initialParams={{
        projectnum: projectnum || "",
        server: sessionStorage.getItem("servername") || "rps",
        user: auth?.user?.userId || ""
      }}
      renderItem={(props) => <GridRenderer {...props} />}
    />
  );
};

export default ProRegisterGrid;
