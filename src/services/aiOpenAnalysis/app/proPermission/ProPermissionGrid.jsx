import React, { useState, useContext, useMemo, cloneElement } from "react";
import { Button } from "@progress/kendo-react-buttons";
import { GridColumn as Column } from "@progress/kendo-react-grid";
import { modalContext } from "@/components/common/Modal.jsx";
import KendoGrid from "@/components/kendo/KendoGrid.jsx";
import { ProPermissionApi } from "@/services/aiOpenAnalysis/app/proPermission/ProPermissionApi";
import { useSelector } from "react-redux";
import ExcelColumnMenu from '@/components/common/grid/ExcelColumnMenu';
import { process } from "@progress/kendo-data-query";
import GridDataCount from "@/components/common/grid/GridDataCount";

/**
 *  권한 관리 > 그리드
 *
 * @author jewoo
 * @since 2025-10-02<br />
 */
const ProPermissionGrid = ({ data, setData, fetchData, editingWorker, onEditWorker, onCancelEdit }) => {
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
      { field: "no", title: "no", show: true, editable: false, width: "90px", allowHide: false },
      { field: "worker_name", title: "사용자이름", show: true, editable: false, allowHide: false },
      { field: "permission_gubun", title: "사용자권한", show: true, editable: false, allowHide: false },
      { field: "worker_id", title: "사용자Id", show: true, editable: false, allowHide: false },
      { field: "worker_password", title: "고객비번", show: true, editable: false, allowHide: false },
      { field: "register_date", title: "사용자등록날짜", show: true, editable: false, allowHide: false },
      { field: "worker_expired", title: "사용자만료날짜", show: true, editable: false, allowHide: false },
      { field: "delete", title: "삭제", show: true, editable: true, allowHide: false }
    ]);

  // 데이터에 No 및 선택 상태 추가
  const numberedData = useMemo(
    () => data.map((item, idx) => ({
      ...item,
      no: idx + 1,
      selected: editingWorker ? editingWorker.id === item.id : false,
    })),
    [data, editingWorker]
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
      onSortChange={(e) => setSort(e ?? [])}
    />
  );

  const handleDelete = async (workerItem) => {
    if (!workerItem) return;
    try {
      modal.showConfirm("알림", "선택한 사용자의 권한을 삭제하시겠습니까?", {
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
                    id: workerItem.id,
                    worker_id: workerItem.worker_id
                  },
                };

                const res = await proPermissionData.mutateAsync(payload);

                if (String(res?.success) === '777') {
                  const msg = res?.output?.message || res?.resultjson?.message || (res?.message !== "정상 접속" ? res?.message : "") || "권한이 성공적으로 삭제되었습니다.";
                  modal.showAlert("알림", msg);
                  if (editingWorker?.id === workerItem.id) {
                    onCancelEdit?.();
                  }
                  await fetchData();
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

  const rowRender = (trElement, props) => {
    const isSelected = props.dataItem.selected;
    const trProps = {
      ...trElement.props,
      className: `${trElement.props.className || ""} ${isSelected ? "k-selected" : ""}`.trim(),
      style: {
        ...(trElement.props.style || {}),
        cursor: "pointer",
      },
    };
    return cloneElement(trElement, trProps, trElement.props.children);
  };

  return (
    <div className="ai-card-container" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="cmn_gird_wrap" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="meta-header-layout" style={{ marginBottom: '12px' }}>
          <div className="meta-header-left meta2">
            <div className="row2" style={{ display: 'flex', alignItems: 'center' }}>
              <GridDataCount total={processedData.total} />
            </div>
          </div>
        </div>

        <div id="grid_01" className="cmn_grid singlehead" style={{ flex: 1 }}>
          <KendoGrid
            parentProps={{
              data: processedData.data,
              total: processedData.total,
              dataItemKey: DATA_ITEM_KEY,
              rowRender: rowRender,
              sortable: { mode: "multiple", allowUnsort: true },
              filterable: false,
              sortChange: ({ sort }) => setSort(sort ?? []),
              filterChange: ({ filter }) => setFilter(filter ?? undefined),
              sort,
              filter,
              style: { height: '100%' },
              onRowClick: (e) => {
                const target = e?.syntheticEvent?.target || e?.nativeEvent?.target;
                if (target && target.closest && target.closest("button")) return;
                onEditWorker?.(e.dataItem);
              },
            }}
          >
            {columns.filter((c) => c.show !== false).map((c) => {
              if (c.field === "delete") {
                return (
                  <Column
                    key={c.field}
                    field="delete"
                    title={c.title}
                    width="100px"
                    columnMenu={undefined}
                    cell={(props) => (
                      <td style={{ textAlign: "center" }}>
                        <Button
                          className="btnM"
                          onClick={(e) => {
                            e?.syntheticEvent?.stopPropagation?.();
                            e?.nativeEvent?.stopPropagation?.();
                            handleDelete(props.dataItem);
                          }}
                          style={{
                            height: '24px',
                            fontSize: '12px',
                            padding: '0 12px',
                            borderRadius: '4px',
                            background: '#fff1f2',
                            color: '#e11d48',
                            border: '1px solid #ffe4e6',
                            fontWeight: '600'
                          }}
                        >
                          삭제
                        </Button>
                      </td>
                    )}
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
    </div>
  );
};

export default ProPermissionGrid;
