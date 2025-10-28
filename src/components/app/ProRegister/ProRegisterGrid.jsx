import React, { Fragment, useState, useCallback, useEffect } from "react";
import { Button } from "@progress/kendo-react-buttons";
import { GridColumn as Column } from "@progress/kendo-react-grid";
import GridData from "@/components/common/grid/GridData.jsx";
import KendoGrid from "@/components/kendo/KendoGrid.jsx";
import { MainListApi } from "@/components/app/mainList/MainListApi.js";
import { useSelector } from "react-redux";
import ExcelColumnMenu from '@/components/common/grid/ExcelColumnMenu';
import { ProRegisterApi } from "@/components/app/proRegister/ProRegisterApi.js";
/**
 *  문항등록 > DB > 그리드
 *
 * @author jewoo
 * @since 2025-10-15<br />
 */
const ProRegisterGrid = ({ onDataLength }) => {
  const auth = useSelector((store) => store.auth);
  const DATA_ITEM_KEY = "no";
  const SELECTED_FIELD = "selected";
  const { proRegisterMutation } = ProRegisterApi();
  const projectnum = sessionStorage.getItem("projectnum");
  const projectname = sessionStorage.getItem("projectname");

  // 정렬/필터를 controlled로
  const [sort, setSort] = useState([]);
  const [filter, setFilter] = useState(null);
  const [columns, setColumns] = useState(() =>
    [
      { field: "no", title: "no", show: true, editable: false, width: "150px", allowHide: false },
      { field: "qnum", title: "qnum", show: true, editable: false, width: "300px", allowHide: false },
      { field: "question", title: "question", show: true, editable: false, allowHide: false },
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
      onFilterChange={(e) => setFilter(e ?? null)}
      onSortChange={(e) => setSort(e ?? [])} // sortArr는 배열 형태
    />
  );

  // grid rendering
  const GridRenderer = (props) => {
    const { dataState, dataItemKey, selectedState, setSelectedState, selectedField, idGetter } = props;

    // // 데이터 length 보내기
    useEffect(() => {
      onDataLength?.(dataState?.data?.length || 0);
    }, [dataState?.data]);

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
      searchMutation={proRegisterMutation}
      initialParams={{ /*초기파라미터 설정*/
        gb: "db_select",
        user: auth?.user?.userId || "",
        projectnum
      }}
      renderItem={(props) => <GridRenderer {...props} />}
    />
  );
};

export default ProRegisterGrid;