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
  const [columns, setColumns] = useState(() => [
    { field: "no", title: "no", show: true, editable: false, width: "60px", allowHide: false },
    { field: "qnum", title: "문항코드", show: true, editable: false, width: "130px", allowHide: false },
    { field: "question", title: "등록된 맵의 오픈문항", show: true, editable: false, allowHide: false },
    { field: "registered_pid_count", title: "기등록 PID", show: true, editable: false, width: "110px", allowHide: false },
    { field: "target_completed_pid_count", title: "대상DB PID", show: true, editable: false, width: "110px", allowHide: false },
    { field: "new_pid_count", title: "신규 대기", show: true, editable: false, width: "130px", allowHide: false },
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

    const processedData = process(dataState?.data || [], { filter });
    const filteredCount = processedData.total;

    return (
      <div className="cmn_gird_wrap" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <style>{`
          #grid_01 .k-grid-content {
            max-height: 293px !important;
          }
        `}</style>
        <div style={{ flex: "0 0 auto" }}>
          <GridDataCount total={filteredCount} />
        </div>
        <div id="grid_01" className="cmn_grid singlehead" style={{ flex: 1, minHeight: 0 }}>
          <KendoGrid
            parentProps={{
              style: { height: "100%" },
              data: dataState?.data,
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
            }}
          >
            {columns.filter((c) => c.show !== false).map((c) => {
              if (c.field === "registered_pid_count" || c.field === "target_completed_pid_count") {
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
                          {val != null ? `${Number(val).toLocaleString()}명` : '-'}
                        </td>
                      );
                    }}
                  />
                );
              }
              if (c.field === "new_pid_count") {
                return (
                  <Column
                    key={c.field}
                    field={c.field}
                    title={c.title}
                    width={c.width}
                    columnMenu={columnMenu}
                    cell={(cellProps) => {
                      const cnt = Number(cellProps.dataItem.new_pid_count ?? 0);
                      return (
                        <td style={{ textAlign: 'center' }}>
                          {cnt > 0 ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              backgroundColor: '#fff7ed',
                              border: '1px solid #fdba74',
                              color: '#ea580c',
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '12px'
                            }}>
                              +{cnt.toLocaleString()}명 대기
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '11px' }}>-</span>
                          )}
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
