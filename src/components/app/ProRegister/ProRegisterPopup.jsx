import { useMemo, memo, useState, Fragment, useEffect, useCallback, useContext, cloneElement, useRef } from "react";
import ExcelColumnMenu from '@/components/common/grid/ExcelColumnMenu';
import GridData from "@/components/common/grid/GridData.jsx";
import KendoGrid from "@/components/kendo/KendoGrid.jsx";
import { GridColumn as Column } from "@progress/kendo-react-grid";
import { Button } from "@progress/kendo-react-buttons";
import { modalContext } from "@/components/common/Modal";

/**
 * 문항 등록 > 문항선택 팝업
 *
 * @author jewoo
 * @since 2025-10-14<br />
 */
const ProRegisterPopup = (parentProps) => {
  const { popupShow, setPopupShow, popupData, setPopupData, selectData, setSelectData } = parentProps;
  const modalOnOff = popupShow ? "on" : "off";

  // selection 필드명
  const SELECTED_FIELD = "selected";
  const MENU_TITLE = "문항 목록";
  const modal = useContext(modalContext);

  // 정렬/필터(Controlled)
  const [sort, setSort] = useState([]);
  const [filter, setFilter] = useState(null);

  // 현재 편집 중인 행만 별도 상태로 추적 (데이터 안에 inEdit를 심지 않음)
  const [editingKey, setEditingKey] = useState(null);

  // 고유 키 생성 함수 (복합키)
  const makeRowKey = useCallback(
    (r) => [r?.question ?? "", r?.column ?? ""].map((v) => encodeURIComponent(String(v))).join("__"),
    []
  );

  // 팝업 데이터에 __rowKey 주입 (최초/변경 시)
  useEffect(() => {
    setPopupData((prev) =>
      (prev || []).map((r) => ({
        ...r,
        __rowKey: r.__rowKey || makeRowKey(r),
      }))
    );
  }, [makeRowKey, setPopupData]);

  const [columns, setColumns] = useState(() => [
    { field: "question", title: "문항내용(질문)", show: true, allowHide: false },
    { field: "column", title: "컬럼명", show: true, allowHide: false },
  ]);

  // 선택 상태(__rowKey: boolean)
  const [selectedState, setSelectedState] = useState({});

  // 공통 메뉴 팩토리: 컬럼 메뉴에 columns & setColumns 전달
  const columnMenu = useCallback(
    (menuProps) => (
      <ExcelColumnMenu
        {...menuProps}
        columns={columns}
        onColumnsChange={(updated) => {
          const map = new Map(updated.map((c) => [c.field, c]));
          const next = columns.map((c) => {
            const u = map.get(c.field);
            return u ? { ...c, ...u } : c;
          });
          setColumns(next);
        }}
        filter={filter}
        onFilterChange={(e) => setFilter(e)}
      />
    ),
    [columns, filter]
  );

  const handleCancelButton = () => setPopupShow(false); // 팝업 닫기

  // 선택 완료 버튼
  const handleSelectConfirm = () => {
    const selectedRows = (popupData || []).filter((r) => selectedState[r.__rowKey]);
    if (selectedRows.length === 0) {
      modal.showErrorAlert("알림", "선택된 문항이 없습니다.");
      return;
    }

    // 값 검증
    const trimmedRows = selectedRows.map((r) => ({
      question: (r.question ?? "").trim(),
      column: (r.column ?? "").trim(),
    }));

    if (trimmedRows.some((r) => !r.question)) {
      modal.showErrorAlert("알림", "문항내용(질문)에 빈값이 있습니다.");
      return;
    }

    const columnNames = trimmedRows.map((r) => r.column);
    const duplicates = columnNames.filter((item, idx) => columnNames.indexOf(item) !== idx);
    if (duplicates.length > 0) {
      modal.showErrorAlert("알림", `중복된 컬럼명이 있습니다: ${duplicates.join(", ")}`);
      return;
    }

    setSelectData(selectedRows);
    setPopupShow(false);
  };

  // 선택 복원은 "오픈 시 한 번" 또는 selectData가 바뀔 때만 실행 (popupData에 의존 X)
  const initSelectionRef = useRef(false);
  useEffect(() => {
    if (!popupShow) {
      initSelectionRef.current = false;
      return;
    }
    // 이미 초기화했고 selectData 변화도 없으면 스킵
    if (initSelectionRef.current && !selectData?.length) return;

    const selectedColumns = new Set((selectData || []).map((s) => s.column));
    setSelectedState((prev) => {
      const next = { ...prev };
      (popupData || []).forEach((r) => {
        const key = r.__rowKey ?? makeRowKey(r);
        next[key] = selectedColumns.has(r.column);
      });
      return next;
    });
    initSelectionRef.current = true;
    // 의도적으로 popupData 미포함: 타이핑으로 데이터가 바뀌어도 선택 초기화하지 않음
  }, [popupShow, selectData, makeRowKey]); 

  // 입력 변경 (데이터만 수정, 편집 상태는 editingKey로만 제어)
  const handleItemChange = useCallback(
    (e) => {
      const { field, value, dataItem } = e;
      setPopupData((prev) => {
        const idx = prev.findIndex((i) => i.__rowKey === dataItem.__rowKey);
        if (idx === -1) return prev;
        const current = prev[idx];
        if (current[field] === value) return prev; // 동일 값이면 skip
        const next = [...prev];
        next[idx] = { ...current, [field]: value };
        return next;
      });
    },
    [setPopupData]
  );

  useEffect(() => {
    if (!popupShow) { initSelectionRef.current = false; return; }
    const selectedColumns = new Set((selectData || []).map(s => s.column));
    setSelectedState(prev => {
      const next = { ...prev };
      (popupData || []).forEach(r => {
        const key = r.__rowKey ?? makeRowKey(r);
        const sel = selectedColumns.has(r.column);
        next[key] = sel;
      });
      return next;
    });
    initSelectionRef.current = true;
  }, [popupShow, selectData, makeRowKey]);

  // 질문 셀 전용 컴포넌트 (IME 안전)
  const QuestionCell = memo((props) => {
    const { dataItem, field } = props;
    const inEdit = field === "question" && dataItem.__rowKey === editingKey;
    const inputRef = useRef(null);
    const composingRef = useRef(false);
    const [local, setLocal] = useState(dataItem[field] ?? "");

    // 편집행 바뀌거나 원본 값이 바뀌면 로컬 초기화
    useEffect(() => {
      if (inEdit) setLocal(dataItem[field] ?? "");
    }, [inEdit, dataItem, field]);

    useEffect(() => {
      if (inEdit) {
        inputRef.current?.focus({ preventScroll: true });
      }
    }, [inEdit]);

    const commit = useCallback(
      (next) => {
        if (composingRef.current) return; // 조합중 커밋 금지
        handleItemChange({
          ...props,
          field,
          value: next,
          dataItem,
        });
      },
      [props, field, dataItem]
    );

    if (!inEdit) return <td>{dataItem[field]}</td>;
    return (
      <td onMouseDown={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="k-input k-input-solid"
          value={local}
          onCompositionStart={() => { composingRef.current = true; }}
          onCompositionEnd={(e) => {
            composingRef.current = false;
            const next = e.currentTarget.value;
            setLocal(next);
            commit(next);
          }}
          onChange={(e) => {
            const next = e.target.value ?? "";
            setLocal(next);
            if (!composingRef.current) {
              commit(next); // 영문 등 일반 입력은 즉시 커밋
            }
          }}
          onBlur={(e) => {
            commit(e.currentTarget.value ?? ""); // 포커스 아웃 시 커밋
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commit(e.currentTarget.value ?? "");
              setEditingKey(null);
            }
            if (e.key === "Escape") {
              setEditingKey(null);
            }
          }}
        />
      </td>
    );
  });

  // 컬럼 셀: '중복' 배지
  const ColumnCell = memo((props) => {
    const { dataItem, field } = props;
    return (
      <td>
        {dataItem[field]}
        {dataItem.isDuplicate && (
          <span style={{ color: "#ef4444", marginLeft: 8 }}>중복</span>
        )}
      </td>
    );
  });

  // grid rendering
  const GridRenderer = memo((props) => {
    const { idGetter } = props;

    // 중복 표시 + 선택 상태 주입
    const popupGridData = useMemo(() => {
      const colCounts = (popupData || []).reduce((acc, cur) => {
        acc[cur.column] = (acc[cur.column] || 0) + 1;
        return acc;
      }, {});
      return (popupData || []).map((row) => {
        const selected = !!selectedState[row.__rowKey];
        const isDuplicate = colCounts[row.column] > 1;
        return { ...row, [SELECTED_FIELD]: selected, isDuplicate };
      });
    }, [popupData, selectedState]);

    return (
      <Fragment>
        <div id="grid_01">
          <KendoGrid
            parentProps={{
              height: "640px", // 권장: 고정 높이로 스크롤 안정화
              data: popupGridData,
              dataItemKey: "__rowKey",
              selectedState,
              setSelectedState,
              selectedField: SELECTED_FIELD,
              idGetter,
              sortable: { mode: "multiple", allowUnsort: true },
              filterable: true,
              sortChange: ({ sort }) => setSort(sort ?? []),
              filterChange: ({ filter }) => setFilter(filter ?? undefined),
              initialSort: sort,
              initialFilter: filter,
              multiSelect: true,
              linkRowClickToSelection: false,
              editable: "incell",
              onItemChange: handleItemChange,

              // checkbox 클릭일 때만 선택 변경 (행 클릭 시 선택 X)
              onSelectionChange: (e) => {
                const input = e?.syntheticEvent?.target;
                if (!input || input.type !== "checkbox") return;

                const { dataItem } = e;
                if (dataItem.isDuplicate) return; // 중복행 선택 불가

                const key = dataItem.__rowKey;
                setSelectedState((prev) => {
                  const prevVal = !!prev[key];
                  const nextVal = !prevVal;
                  if (prevVal === nextVal) return prev;
                  return { ...prev, [key]: nextVal };
                });
              },

              // 헤더 전체 선택: 중복행은 제외
              onHeaderSelectionChange: (e) => {
                const checked = e?.syntheticEvent?.target?.checked;
                setSelectedState((prev) => {
                  const next = { ...prev };
                  popupGridData.forEach((r) => {
                    if (r.isDuplicate) next[r.__rowKey] = false;
                    else next[r.__rowKey] = !!checked;
                  });
                  return next;
                });
              },

              // 행 클릭은 편집만 수행 (선택과 분리)
              onRowClick: (e) => {
                e.preventDefault?.();
                e.syntheticEvent?.stopPropagation?.();
                const { dataItem } = e;
                setEditingKey(dataItem.__rowKey);
              },

              // 중복행: 회색 처리 + 완전 클릭 차단 (체크박스 포함)
              rowRender: (row, rowProps) => {
                const item = rowProps.dataItem;
                if (!item?.isDuplicate) return row;
                const rowStyle = {
                  backgroundColor: "#f5f5f5",
                  color: "#999",
                  pointerEvents: "none",
                };
                return cloneElement(row, { style: rowStyle });
              },
            }}
          >
            {columns
              .filter((c) => c.show !== false)
              .map((c) => (
                <Column
                  key={c.field}
                  field={c.field}
                  title={c.title}
                  columnMenu={columnMenu}
                  editable={c.field === "question"}
                  // question만 커스텀 셀(포커스 안정) / column은 '중복' 배지
                  cell={
                    c.field === "question"
                      ? QuestionCell
                      : c.field === "column"
                        ? ColumnCell
                        : undefined
                  }
                />
              ))}
          </KendoGrid>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", padding: "18px 12px" }}>
          <Button themeColor="primary" onClick={handleSelectConfirm}>
            선택 완료
          </Button>
        </div>
      </Fragment>
    );
  });

  return (
    <article className={`modal ${modalOnOff}`}>
      <div className="cmn_popup">
        <div className="popTit">
          <h3>문항 선택 팝업</h3>
          <a className="btnClose" onClick={handleCancelButton}>
            <span className="hidden">close</span>
          </a>
        </div>
        <GridData
          // GridData 쪽 키도 __rowKey로 통일 (스크롤/선택 상태 보존에 유리)
          dataItemKey="__rowKey"
          selectedField={SELECTED_FIELD}
          menuTitle={MENU_TITLE}
          renderItem={(props) => <GridRenderer {...props} />}
        />
      </div>
    </article>
  );
};

export default ProRegisterPopup;
