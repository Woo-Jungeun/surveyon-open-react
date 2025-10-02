import React, { Fragment, useState, useCallback, useEffect } from "react";
import { Button } from "@progress/kendo-react-buttons";
import { GridColumn as Column } from "@progress/kendo-react-grid";
import GridData from "@/components/common/grid/GridData.jsx";
import KendoGrid from "@/components/kendo/KendoGrid.jsx";
import { MainListApi } from "@/components/app/mainList/MainListApi.js";
import { useSelector } from "react-redux";
import ExcelColumnMenu from '@/components/common/grid/ExcelColumnMenu';
/**
 *  API KEY 등록 > 그리드
 *
 * @author jewoo
 * @since 2025-10-02<br />
 */
const ProKeyGrid = ({ data, setData }) => {
    const auth = useSelector((store) => store.auth);
    const DATA_ITEM_KEY = "no";
    const SELECTED_FIELD = "selected";
    const MENU_TITLE = "apiKey 목록";

    // 정렬/필터를 controlled로
    const [sort, setSort] = useState([]);
    const [filter, setFilter] = useState(null);

    const { mainListData } = MainListApi();
    const [columns, setColumns] = useState(() =>
        [
            { field: "no", title: "no", show: true, editable: false, width: "100px", allowHide: false },
            { field: "projectpof", title: "API유형", show: true, editable: false, allowHide: false },
            { field: "projectnum", title: "API명", show: true, editable: false, allowHide: false },
            { field: "projectname", title: "API키", show: true, editable: false, allowHide: false },
            { field: "register_userid", title: "등록날짜", show: true, editable: false, allowHide: false },
            { field: "defaultUse", title: "기본 사용설정", show: true, editable: false, allowHide: false },
            { field: "delete", title: "삭제", show: true, editable: true, allowHide: false }
        ]);

    // 공통 메뉴 팩토리: 컬럼 메뉴에 columns & setColumns 전달
    const columnMenu = (menuProps) => (
        <ExcelColumnMenu
            {...menuProps}
            columns={columns}
            onColumnsChange={(updated) => {
                const map = new Map(updated.map(c => [c.field, c]));
                const next = columns.map(c => {
                    const u = map.get(c.field);
                    return u ? { ...c, ...u } : c
                });
                setColumns(next);
            }}
            filter={filter}
            onFilterChange={(e) => {
                setFilter(e);
            }}

        />
    );

    // 기본 사용설정 토글 핸들러
    const handleToggleDefault = (no) => {
        setData((prev) =>
            prev.map((row) => ({
                ...row,
                defaultUse: row.no === no ? !row.defaultUse : false,
            }))
        );
    };

    // 삭제 핸들러
    const handleDelete = (no) => {
        setData((prev) => prev.filter((r) => r.no !== no));
    };

  // grid rendering
  const GridRenderer = (props) => {
    const { dataState, dataItemKey, selectedState, setSelectedState, selectedField, idGetter } = props;

    return (
      <Fragment>
        <div className="cmn_gird_wrap">
          <div id="grid_01" className="cmn_grid">
            <KendoGrid
              parentProps={{
                height: "400px",
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
                initialSort: sort,
                initialFilter: filter,
              }}
            >
              {columns.filter((c) => c.show !== false).map((c) => {
                if (c.field === "defaultUse") {
                  return (
                    <Column
                      key={c.field}
                      field="defaultUse"
                      title={c.title}
                      width={c.width}
                      columnMenu={undefined}
                      cell={(props) => (
                        <td style={{ textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={props.dataItem.defaultUse || false}
                            onChange={() => handleToggleDefault(props.dataItem.no)}
                          />
                        </td>
                      )}
                    />
                  );
                }
                if (c.field === "delete") {
                  return (
                    <Column
                      key={c.field}
                      field="delete"
                      title={c.title}
                      width={c.width}
                      columnMenu={undefined}
                      cell={(props) => (
                        <td style={{ textAlign: "center" }}>
                          <Button
                            className="btnM"
                            themeColor="primary"
                            onClick={() => handleDelete(props.dataItem.no)}
                          >
                            삭제
                          </Button>
                        </td>
                      )}
                    />
                  );
                }
                // 기본 텍스트 컬럼
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
      </Fragment>
    );
  };

  return (
    <GridData
      dataItemKey={DATA_ITEM_KEY}
      rowNumber={"no"}
      rowNumberOrder="asc"
      selectedField={SELECTED_FIELD}
      menuTitle={MENU_TITLE}
      searchMutation={mainListData}
      initialParams={{
        user: auth?.user?.userId || "",
      }}
      renderItem={(props) => <GridRenderer {...props} />}
    />
  );
};

export default ProKeyGrid;