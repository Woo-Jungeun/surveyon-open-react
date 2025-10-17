import React, { Fragment, useState, useContext , useEffect, useMemo } from "react";
import { Button } from "@progress/kendo-react-buttons";
import { GridColumn as Column } from "@progress/kendo-react-grid";
import { modalContext } from "@/components/common/Modal.jsx";
import KendoGrid from "@/components/kendo/KendoGrid.jsx";
import { ProPermissionApi } from "@/components/app/proPermission/ProPermissionApi";
import { useSelector } from "react-redux";
import ExcelColumnMenu from '@/components/common/grid/ExcelColumnMenu';
import { process } from "@progress/kendo-data-query";
/**
 *  사용자 설정 > 그리드
 *
 * @author jewoo
 * @since 2025-10-02<br />
 */
const ProPermissionGrid = ({ data, setData }) => {
const auth = useSelector((store) => store.auth);
  const modal = useContext(modalContext);
  const DATA_ITEM_KEY = "no";

  const { proPermissionData } = ProPermissionApi();

  // 정렬/필터 상태 관리
  const [sort, setSort] = useState([]);
  const [filter, setFilter] = useState(null);

  // 컬럼 정의
  const [columns, setColumns] = useState(() =>
    [
      { field: "no", title: "no", show: true, editable: false, width: "100px", allowHide: false },
      { field: "projectpof", title: "사용자이름", show: true, editable: false, allowHide: false },
      { field: "projectnum", title: "사용자권한", show: true, editable: false, allowHide: false },
      { field: "projectname", title: "사용자Id", show: true, editable: false, allowHide: false },
      { field: "register_userid", title: "고객비번", show: true, editable: false, allowHide: false },
      { field: "defaultUse", title: "사용자등록날짜", show: true, editable: false, allowHide: false },
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
      onFilterChange={(e) => setFilter(e)}
    />
  );

  // 삭제 버튼
  const handleDelete = async (no, api_id, api_gubun) => {
    try {
      // 회사 공용키면 서버에서 막히므로 바로 안내
      if (api_gubun === "회사") {
        modal.showErrorAlert("알림", "회사 공용키는 삭제할 수 없습니다.");
        return;
      }

      // 삭제 확인 모달
      modal.showConfirm("알림", "선택한 API KEY를 삭제하시겠습니까?", {
        btns: [
          {
            title: "삭제",
            click: async () => {
              try {
                const payload = {
                  params: {
                    gb: "api_del",
                    user: auth?.user?.userId || "",
                    api_id,
                  },
                };
                const res = await proPermissionData.mutateAsync(payload);

                if (res?.success === "777") {
                  modal.showAlert("알림", "사용자가 삭제되었습니다.");
                  await fetchData(); //그리드 재조회 
                } else if (res?.success === "771") {
                  modal.showErrorAlert("알림", "이미 삭제되었거나 존재하지 않습니다.");
                } else if (res?.success === "772") {
                  modal.showErrorAlert("알림", "삭제 권한이 없습니다.");
                } else {
                  modal.showErrorAlert("알림", res?.message || "삭제 중 오류가 발생했습니다.");
                }
              } catch (err) {
                modal.showErrorAlert("오류", "삭제 요청 중 네트워크 오류가 발생했습니다.");
              }
            },
          },
          { title: "취소" },
        ],
      });
    } catch (err) {
      modal.showErrorAlert("오류", "삭제 처리 중 문제가 발생했습니다.");
    }
  };

  return (
    <Fragment>
      <div className="cmn_gird_wrap">
        <div id="grid" className="cmn_grid">
          <KendoGrid
            parentProps={{
              height: "400px",
              data: processedData.data,
              total: processedData.total,
              dataItemKey: DATA_ITEM_KEY,
              sortable: { mode: "multiple", allowUnsort: true },
              filterable: true,
              sortChange: ({ sort }) => setSort(sort ?? []),
              filterChange: ({ filter }) => setFilter(filter ?? undefined),
              initialSort: sort,
              initialFilter: filter,
            }}
          >
            {columns.filter((c) => c.show !== false).map((c) => {
                if (c.field === "delete") {
                  // 유형이 "회사"일 경우 삭제 버튼 숨김
                  return (
                    <Column
                      key={c.field}
                      field="delete"
                      title={c.title}
                      width={c.width}
                      columnMenu={undefined}
                      cell={(props) => {
                        const isCompany = props.dataItem.api_gubun === "회사";
                        return (
                          <td style={{ textAlign: "center" }}>
                            {!isCompany && (
                              <Button
                                className="btnM"
                                themeColor="primary"
                                onClick={() =>
                                  handleDelete(props.dataItem.no, props.dataItem.api_id, props.dataItem.api_gubun)
                                }
                              >
                                삭제
                              </Button>
                            )}
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