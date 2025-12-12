import React, { Fragment, useState, useContext, useEffect, useMemo } from "react";
import { Button } from "@progress/kendo-react-buttons";
import { GridColumn as Column } from "@progress/kendo-react-grid";
import { modalContext } from "@/components/common/Modal.jsx";
import KendoGrid from "@/components/kendo/KendoGrid.jsx";
import { ProPermissionApi } from "@/services/aiOpenAnalysis/app/proPermission/ProPermissionApi";
import { useSelector } from "react-redux";
import ExcelColumnMenu from '@/components/common/grid/ExcelColumnMenu';
import { process } from "@progress/kendo-data-query";

/**
 *  권한 관리 > 그리드
 *
 * @author jewoo
 * @since 2025-10-02<br />
 */
const ProPermissionGrid = ({ data, setData, fetchData }) => {
  const auth = useSelector((store) => store.auth);
  const modal = useContext(modalContext);
  const DATA_ITEM_KEY = "no";

  const projectnum = sessionStorage.getItem("projectnum");

  const { proPermissionData } = ProPermissionApi();

  // 정렬/필터 상태 관리
  const [sort, setSort] = useState([]);
  const [filter, setFilter] = useState(null);

  // 컬럼 정의
  const [columns, setColumns] = useState(() =>
    [
      { field: "no", title: "no", show: true, editable: false, width: "120px", allowHide: false },
      { field: "worker_name", title: "사용자이름", show: true, editable: false, allowHide: false },
      { field: "permission_gubun", title: "사용자권한", show: true, editable: false, allowHide: false },
      { field: "worker_id", title: "사용자Id", show: true, editable: false, allowHide: false },
      { field: "worker_password", title: "고객비번", show: true, editable: false, allowHide: false },
      { field: "register_date", title: "사용자등록날짜", show: true, editable: false, allowHide: false },
      { field: "worker_expired", title: "사용자만료날짜", show: true, editable: false, allowHide: false },
      { field: "delete", title: "삭제", show: true, editable: true, allowHide: false }
    ]);

  // 데이터에 No 추가
  const numberedData = useMemo(
    () => data.map((item, idx) => ({ ...item, no: idx + 1 })),
    [data]
  );

  // 필터/정렬 반영된 데이터
  const processedData = useMemo(
    () => process(numberedData, { sort, filter }),
    [numberedData, sort, filter]
  );

  // 공통 컬럼 메뉴
  const columnMenu = (menuProps) => (
    <ExcelColumnMenu
      {...menuProps}
      columns={columns}
      onColumnsChange={(updated) => {
        const map = new Map(updated.map((c) => [c.field, c]));
        setColumns(columns.map((c) => map.get(c.field) || c));
      }}
      filter={filter}
      onFilterChange={(e) => setFilter(e ?? null)}
      onSortChange={(e) => setSort(e ?? [])} // sortArr는 배열 형태
    />
  );

  const handleDelete = async (id) => {
    try {
      modal.showConfirm("알림", "선택한 사용자를 삭제하시겠습니까?", {
        btns: [
          { title: "취소" },
          {
            title: "삭제",
            click: async () => {
              try {
                const payload = {
                  params: {
                    gb: "worker_del",
                    user: auth?.user?.userId || "",
                    projectnum,
                    id
                  },
                };

                const res = await proPermissionData.mutateAsync(payload);

                if (res?.success === "777") {
                  modal.showAlert("알림", "사용자가 삭제되었습니다.");
                  await fetchData(); //그리드 재조회 
                } else {
                  modal.showErrorAlert("에러", res?.message || "삭제 중 오류가 발생했습니다.");
                }
              } catch (err) {
                modal.showErrorAlert("오류", "삭제 요청 중 네트워크 오류가 발생했습니다.");
              }
            },
          },
        ],
      });
    } catch (err) {
      modal.showErrorAlert("오류", "삭제 처리 중 문제가 발생했습니다.");
    }
  };

  return (
    <Fragment>
      <div className="cmn_gird_wrap">
        <div id="grid" className="cmn_grid singlehead">
          <KendoGrid
            parentProps={{
              height: "360px",
              data: processedData.data,
              total: processedData.total,
              dataItemKey: DATA_ITEM_KEY,
              sortable: { mode: "multiple", allowUnsort: true },
              filterable: true,
              sortChange: ({ sort }) => setSort(sort ?? []),
              filterChange: ({ filter }) => setFilter(filter ?? undefined),
              sort,
              filter,
            }}
          >
            {columns.filter((c) => c.show !== false).map((c) => {
              if (c.field === "delete") {
                return (
                  <Column
                    key={c.field}
                    field="delete"
                    title={c.title}
                    width={c.width}
                    columnMenu={undefined}
                    cell={(props) => {
                      return (
                        <td style={{ textAlign: "center" }}>
                          <Button
                            className="btnM"
                            themeColor="primary"
                            onClick={() => handleDelete(props.dataItem.id)}
                          >
                            삭제
                          </Button>
                        </td>
                      );
                    }}
                  />
                );
              }

              // 기본 컬럼
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

export default ProPermissionGrid;