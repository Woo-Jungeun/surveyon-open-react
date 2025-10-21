import React, { Fragment, useState, useMemo, useEffect, useContext } from "react";
import { Button } from "@progress/kendo-react-buttons";
import { GridColumn as Column } from "@progress/kendo-react-grid";
import { process } from "@progress/kendo-data-query";
import KendoGrid from "@/components/kendo/KendoGrid.jsx";
import { useSelector } from "react-redux";
import ExcelColumnMenu from "@/components/common/grid/ExcelColumnMenu";
import { ProKeyApi } from "@/components/app/proKey/ProKeyApi";
import { modalContext } from "@/components/common/Modal";

/**
 *  API KEY 등록 > 그리드
 *
 * @author jewoo
 * @since 2025-10-02<br />
 */
const ProKeyGrid = ({ data = [], setData, fetchData }) => {
  const auth = useSelector((store) => store.auth);
  const modal = useContext(modalContext);
  const { proKeyData } = ProKeyApi();
  const DATA_ITEM_KEY = "no";

  // 정렬/필터 상태 관리
  const [sort, setSort] = useState([]);
  const [filter, setFilter] = useState(null);

  // 현재 기본 선택된 API ID
  const [selectedApiId, setSelectedApiId] = useState(null);

  // 서버 데이터 로딩 후, 첫 행 기준으로 기본값 지정
  useEffect(() => {
    if (data.length > 0 && data[0].useyn_id) {
      const defaultRow = data.find((row) => row.api_id?.toString() === data[0].useyn_id?.toString());
      if (defaultRow) setSelectedApiId(defaultRow.api_id);
    }
  }, [data]);

  // 컬럼 정의
  const [columns, setColumns] = useState([
    { field: "no", title: "No", show: true, editable: false, width: "80px", allowHide: false },
    { field: "api_gubun", title: "API유형", show: true, editable: false, allowHide: false },
    { field: "api_id", title: "api_id", show: false, editable: false, allowHide: false },
    { field: "api_name", title: "API명", show: true, editable: false, allowHide: false },
    { field: "api_key", title: "API키", show: true, editable: false, allowHide: false },
    { field: "register_date", title: "등록날짜", show: true, editable: false, allowHide: false },
    { field: "default_use", title: "기본 사용설정", show: true, editable: false, width: "160px", allowHide: false },
    { field: "delete", title: "삭제", show: true, editable: true, allowHide: false },
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

  /** 라디오 버튼 클릭 시 API 호출 */
  const updateDefaultApiKey = async (api_id) => {
    try {
      const payload = {
        params: {
          gb: "api_useyn_update",
          user: auth?.user?.userId || "",
          api_id,
        }
      };

      const res = await proKeyData.mutateAsync(payload);

      if (res?.success === "777") {
        // modal.showConfirm("알림", "기본 사용 API KEY가 변경되었습니다.", {
        //   btns: [{ title: "확인" }],
        // });
      } else {
        modal.showErrorAlert("오류", res?.message || "변경에 실패했습니다.");
      }
    } catch (err) {
      modal.showErrorAlert("알림", "네트워크 오류로 변경에 실패했습니다.");
    }
  };

  // 기본 사용설정 라디오 선택
  const handleSelectDefault = (api_id) => {
    setSelectedApiId(api_id);
    setData((prev) =>
      prev.map((row) => ({
        ...row,
        useyn_id: row.api_id === api_id ? "Y" : "N",
      }))
    );

    updateDefaultApiKey(api_id); // API 호출
  };

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
          { title: "취소" },
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
                const res = await proKeyData.mutateAsync(payload);

                if (res?.success === "777") {
                  modal.showAlert("알림", "API KEY가 삭제되었습니다.");
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
        ],
      });
    } catch (err) {
      modal.showErrorAlert("오류", "삭제 처리 중 문제가 발생했습니다.");
    }
  };

  return (
    <Fragment>
      <div className="cmn_gird_wrap">
        <div id="grid_apiKey" className="cmn_grid">
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
            {columns
              .filter((c) => c.show !== false)
              .map((c) => {
                if (c.field === "default_use") {
                  // 기본 사용설정 라디오 버튼 
                  return (
                    <Column
                      key={c.field}
                      field="useyn_id"
                      title={c.title}
                      width={c.width}
                      columnMenu={undefined}
                      cell={(props) => {
                        const { api_id } = props.dataItem;
                        const checked = selectedApiId === api_id;

                        return (
                          <td style={{ textAlign: "center" }}>
                            <input
                              type="radio"
                              name="defaultApiKey"
                              checked={checked}
                              onChange={() => handleSelectDefault(api_id)}
                              style={{
                                cursor: "pointer",
                                verticalAlign: "middle",
                              }}
                            />
                          </td>
                        );
                      }}
                    />
                  );
                }

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

export default ProKeyGrid;
