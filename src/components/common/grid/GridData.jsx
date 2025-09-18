import { useContext, useEffect, useRef, useState } from "react";
import { setSelectedState as applySelectedState } from "@progress/kendo-react-grid";
import message from "@/components/common/message.js";
import { modalContext } from "@/components/common/Modal";
import { getter, isArray } from "@progress/kendo-react-common";
import moment from "moment";
/**
 * 그리드 데이터 보관
 *
 * @author jisu
 * @since 2024-04-22<br />
 *
 * multiSelect 기본 false
 * @param rowNumber String rowNumber 이름대로 행에 숫자를 붙여줌. ex) rowNumber="test"면 test인 행이 생기고 1,2,3,4 .. 의 값을 갖고있음.
 * @param isPage paging을 할지 안할지 설정.
 */
const GridData = ({
    dataItemKey,
    editField,
    onItemChange,
    onRowClick,
    onCellClose,
    editCell,
    selectedField,
    menuTitle,
    searchMutation,
    insertMutation,
    updateMutation,
    deleteMutation,
    summaryMutation,
    excelMutation,
    type, //엑셀 파일 명
    multiSelect = false,
    rowNumber,
    rowNumberOrder = "asc",
    isPage = true,
    renderItem,
    initialParams   // 초기 조회용 파라미터 
}) => {
    const _export = useRef(null);
    const [data, setData] = useState({ totalSize: 0, data: [] }); //전체 데이터
    const [sort, setSort] = useState([]);
    const [defaultFilter, setDefaultFilter] = useState([]);
    const [defaultNoOffsetFilter, setDefaultNoOffsetFilter] = useState([]);
    const [filter, setFilter] = useState([]);
    const [page, setPage] = useState({
        skip: 0,
        take: 10
    });
    const [noOffsetFilter, setNoOffsetFilter] = useState([]);
    const [summaryParam, setSummaryParam] = useState({});
    const initDataState = {
        totalSize: data.totalSize,
        data: data.data.map((dataItem) => ({ ...dataItem, [selectedField]: false }))
    };
    const [dataState, setDataState] = useState(initDataState); //전체데이터 + selected상태
    const [selectedState, setSelectedState] = useState({}); //selected상태 //{5: true}
    const [popupShow, setPopupShow] = useState(false);
    const [popupValue, setPopupValue] = useState({});
    const [mode, setMode] = useState("R"); //CRUD
    const [required, setRequired] = useState([]);
    const modal = useContext(modalContext);

    const [summaryData, setSummaryData] = useState({}); //summary
    const [searchParams, setSearchParams] = useState({}); //  마지막 조회 파라미터 저장
    const inFlightRef = useRef(false);  //중복 호출 잠금
    const didInitialFetchRef = useRef(false);  // 초기 1회 호출 가드
    const selectedData = multiSelect
        ? dataState.data.filter((item) => item.selected === true)
        : dataState.data.find((item) => item.selected === true);

    // 초기 1번만 자동 조회
    useEffect(() => {
        if (didInitialFetchRef.current) return;
        if (!searchMutation) return;
        didInitialFetchRef.current = true;
        handleSearch({ params: initialParams ?? searchParams });
    }, []); // 마운트 1회

    // ===== 복합키 지원 (컬럼 여러개 조합의 키값일 경우)=====
    const COMPOSITE_KEY_FIELD = "__rowKey";
    const isCompositeKey = Array.isArray(dataItemKey);
    const finalDataItemKey = isCompositeKey ? COMPOSITE_KEY_FIELD : dataItemKey;
    const buildCompositeKey = (row) =>
        isCompositeKey
            ? dataItemKey.map(f => encodeURIComponent(String(row?.[f]))).join("__")
            : undefined;

    // idGetter: 단일키면 kendo getter, 복합키면 __rowKey 반환
    const idGetter = isCompositeKey
        ? (item) => item?.[COMPOSITE_KEY_FIELD]
        : getter(dataItemKey);

    // ===== 복합키 지원 끝 =====



    useEffect(() => {
        setDataState(initDataState);
    }, [data]);

    useEffect(() => {
        const newData = applySelectedState({
            data: dataState.data,
            selectedField: selectedField,
            dataItemKey: finalDataItemKey,
            selectedState: selectedState
        });

        setDataState((prev) => ({ ...prev, data: newData }));
    }, [selectedState]);

    const handleSummarySearch = () => {
        if (summaryMutation) {
            summaryMutation.mutateAsync(summaryParam).then((res) => {
                setSummaryData(res);
            });
        }
    };

    const excelExport = () => {
        if (_export.current !== null) {
            _export.current.save();
        }
    };

    const getFetchDataParam = (param) => {
        const _page = param.page ?? page;
        const _filter = param.filter ?? filter;
        const _sorter = param.sorter ?? sort;
        const _noOffsetFilter = param.noOffsetFilter ?? noOffsetFilter;
        const _params = param.params ?? searchParams;    // 파라미터 기본값
        let data = null;
        if (isPage) {
            data = { ..._page, filter: _filter, sorter: _sorter, noOffsetFilter: _noOffsetFilter, params: _params };
        } else {
            data = { filter: _filter, sorter: _sorter, noOffsetFilter: _noOffsetFilter, params: _params };
        }
        return data;
    };

    const fetchData = async (payload) => {
        if (!searchMutation) return;
    
        const res = await searchMutation.mutateAsync(payload);
        if (res.success !== "777") {
          throw new Error();
        }
    
        const raw = res?.resultjson ?? [];
    
        // 서버가 전체 개수를 내려주는 키가 있다면 탐지
        const serverTotal =
          typeof res?.totalSize === "number"
            ? res.totalSize
            : (typeof res?.totalCount === "number"
                ? res.totalCount
                : (typeof res?.total === "number" ? res.total : undefined));
    
        // 현재 페이지 skip (서버 페이징일 때 의미)
        const pageSkip = isPage ? (payload?.skip ?? payload?.page?.skip ?? 0) : 0;
    
        const keyed = raw.map((item, idx) => {
          const next = { ...item };
    
          // 복합키 → __rowKey 주입
          if (isCompositeKey) {
            next[COMPOSITE_KEY_FIELD] = buildCompositeKey(item);
          }
    
          // 행번호 부여 (asc/desc)
          if (rowNumber && typeof rowNumber === "string") {
            if (rowNumberOrder === "desc") {
              // 전체 개수 있으면 전역 역순, 없으면 현재 페이지 내 역순
              const totalForNumbering = serverTotal ?? raw.length;
              const n = totalForNumbering - pageSkip - idx;
              next[rowNumber] = n > 0 ? n : 0;
            } else {
              // asc: 페이징 고려 (skip + idx + 1). 페이징 아니면 idx+1
              next[rowNumber] = (isPage ? pageSkip : 0) + idx + 1;
            }
          }
    
          return next;
        });
    
        const totalSize = serverTotal ?? keyed.length;
        setData({ totalSize, data: keyed });
      };
    const handleSearch = (param) => {
        const _noOffsetFilter = param?.noOffsetFilter;
        const _filter = param?.filter;
        const _params = param?.params ?? searchParams;

        if (searchMutation) {
            if (inFlightRef.current) return;    // 이미 호출 중이면 무시
            inFlightRef.current = true;

            let newNoOffsetFilter = noOffsetFilter;
            let newFilter = filter;
            if (_noOffsetFilter) {
                newNoOffsetFilter = _noOffsetFilter;
            }
            if (_filter) {
                newFilter = _filter;
            }
            const newApplyFilter = [...newFilter];
            const newNoOffsetApplyFilter = [...newNoOffsetFilter];
            //조회버튼 클릭시 첫 page로 가는게 맞다고 생각해서.
            const newPage = {
                skip: 0,
                take: 10
            };
            //조회 버튼 클릭시 sort초기화가 맞다고 생각해서.
            const newSort = [];
            fetchData(getFetchDataParam({ noOffsetFilter: newNoOffsetApplyFilter, filter: newApplyFilter, sorter: newSort, page: newPage, params: _params }))
                .then(() => {
                    if (_noOffsetFilter) {
                        setNoOffsetFilter(_noOffsetFilter);
                    }
                    if (_filter) {
                        setFilter(_filter);
                    }
                    setApplyFilter(newApplyFilter);
                    setNoOffsetApplyFilter(newNoOffsetApplyFilter);
                    setSort(newSort);
                    setPage(newPage);
                    setSearchParams(_params);
                })
                .catch((e) => modal.showAlert("알림", message.searchFail))
                .finally(() => { inFlightRef.current = false; });
        }
    };

    const sortChange = (event) => {
        const newSort = event.sort.map((item) => {
            return { ...item, direction: item.dir };
        });

        fetchData(getFetchDataParam({ filter: applyFilter, noOffsetFilter: noOffsetApplyFilter, sorter: newSort, params: searchParams }))
            .then(() => setSort(newSort))
            .catch(() => modal.showAlert("알림", message.searchFail));
    };

    const defaultSortChange = (sort) => {
        setSort(
            sort.map((item) => {
                return { ...item, direction: item.dir };
            })
        );
    };

    const defaultFilterChange = ({ field, operator, value }) => {
        setDefaultFilter((prev) => {
            const copy = [...prev];
            const newFilter = [];

            const idx = prev.findIndex((filter) => filter.field == field);
            if (idx == -1) {
                newFilter.push({
                    field: field,
                    operator: operator,
                    value: value
                });
            } else {
                copy[idx] = {
                    field: field,
                    operator: operator,
                    value: value
                };
            }
            return [...copy, ...newFilter];
        });
        //defaultFilter의 변화는 항상 filter에 반영된다.
        filterChange({ field, operator, value });
    };

    const defaultNoOffsetFilterChange = ({ field, operator, value }) => {
        setDefaultNoOffsetFilter((prev) => {
            const copy = [...prev];
            const newFilter = [];

            const idx = prev.findIndex((filter) => filter.field == field);
            if (idx == -1) {
                newFilter.push({
                    field: field,
                    operator: operator,
                    value: value
                });
            } else {
                copy[idx] = {
                    field: field,
                    operator: operator,
                    value: value
                };
            }
            return [...copy, ...newFilter];
        });
        //defaultFilter의 변화는 항상 filter에 반영된다.
        noOffsetFilterChange({ field, operator, value });
    };

    const filterReducer = (prev, items) => {
        const copy = [...prev];
        const newFilter = [];
        items.forEach((item) => {
            const { field, operator, value } = item;
            const idx = prev.findIndex((filter) => filter.field == field);
            if (idx == -1) {
                newFilter.push({
                    field: field,
                    operator: operator,
                    value: value
                });
            } else {
                copy[idx] = {
                    field: field,
                    operator: operator,
                    value: value
                };
            }
        });
        return [...copy, ...newFilter];
    };

    const noOffsetFilterReducer = (prev, items) => {
        const copy = [...prev];
        const newFilter = [];

        items.forEach((item) => {
            const { field, operator, value } = item;
            const idx = prev.findIndex((filter) => filter.field == field);
            if (idx == -1) {
                newFilter.push({
                    field: field,
                    operator: operator,
                    value: value
                });
            } else {
                copy[idx] = {
                    field: field,
                    operator: operator,
                    value: value
                };
            }
        });
        return [...copy, ...newFilter];
    };

    const filterChange = (item) => {
        setFilter((prev) => filterReducer(prev, [item]));
    };

    const noOffsetFilterChange = (item) => {
        setNoOffsetFilter((prev) => noOffsetFilterReducer(prev, [item]));
    };

    const clearFilter = (field) => {
        const idx = filter.findIndex((item) => item.field == field);
        const newFilter = [...filter];
        if (idx != -1) {
            newFilter.splice(idx, 1);
            setFilter(newFilter);
        }
    };

    const clearNoOffsetFilter = (field) => {
        const idx = noOffsetFilter.findIndex((item) => item.field == field);
        const newFilter = [...noOffsetFilter];
        if (idx != -1) {
            newFilter.splice(idx, 1);
            setNoOffsetFilter(newFilter);
        }
    };

    //페이지 변경
    const pageChange = (event) => {
        const take = event.page.take;
        const newPage = {
            ...event.page,
            take
        };

        fetchData(getFetchDataParam({ page: newPage, filter: applyFilter, noOffsetFilter: noOffsetApplyFilter, params: searchParams }))
            .then(() => setPage(newPage))
            .catch(() => modal.showAlert("알림", message.searchFail));
    };

    /**
     * 필수값 확인하는 함수
     *
     * @author jisu
     * @since 2024.05.07
     */
    const validate = (data) => {
        let isValid = true;
        required.forEach((item) => (isValid = data[item] != null));
        return isValid;
    };

    const handleInsert = () => {
        if (mode == "R") {
            setPopupShow(true);
            setMode("I");
        } else {
            if (confirm(message.checkCancel)) {
                handleCancelButton();
            }
        }
    };

    const handleDelete = () => {
        setMode("D");
        if (selectedData) {
            if ((!isArray(selectedData) && selectedData) || (isArray(selectedData) && selectedData?.length > 0)) {
                modal.showReqConfirm(menuTitle, "D", async () => {
                    const res = deleteMutation && (await deleteMutation.mutateAsync(selectedData));
                    if (res.success === "777") {
                        modal.showAlert("알림", res.message); // 성공 팝업 표출
                        handleCancelButton();
                        handleSearch();
                        if (summaryMutation) {
                            handleSummarySearch();
                        }
                    } else {
                        modal.showErrorAlert(res?.status, res?.message); //오류 팝업 표출
                    }
                });
            } else {
                modal.showAlert("알림", message.deleteBtn); // 삭제할 행을 선택해 주세요.
            }
        } else {
            modal.showAlert("알림", message.deleteBtn); // 삭제할 행을 선택해 주세요.
        }
        setMode("R");
    };

    const handleUpdate = () => {
        setMode("U");
    };

    /**
     * callback은 fetch성공 후에만 실행
     * @param data
     * @param callback
     */
    const handleSave = (data, callback, handleError) => {
        const payload = data ?? popupValue;
        if (mode == "I") {
            modal.showReqConfirm(menuTitle, mode, async () => {
                const res = insertMutation && (await insertMutation.mutateAsync(payload));
                if (res.success === "777") {
                    modal.showAlert("알림", res.message); // 성공 팝업 표출
                    handleCancelButton();
                    handleSearch();
                    if (summaryMutation) {
                        handleSummarySearch();
                    }
                    if (callback) {
                        callback();
                    }
                } else {
                    handleError ? handleError(res) : modal.showErrorAlert(res?.status, res?.message); //오류 팝업 표출
                }
            });
        } else if (mode == "U") {
            modal.showReqConfirm(menuTitle, mode, async () => {
                const res = updateMutation && (await updateMutation.mutateAsync(payload));
                if (res.success === "777") {
                    modal.showAlert("알림", res.message); // 성공 팝업 표출
                    handleCancelButton();
                    handleSearch();
                    if (summaryMutation) {
                        handleSummarySearch();
                    }
                    if (callback) {
                        callback();
                    }
                } else {
                    handleError ? handleError(res) : modal.showErrorAlert(res?.status, res?.message); //오류 팝업 표출
                }
            });
        }
    };

    const handleCancelButton = () => {
        setPopupShow(false);
        setPopupValue({});
        setMode("R");
    };

    /**
     * 2024-06-04 BokyeongKang 마지막 적용된 필터를 기준으로 엑셀 다운로드가 실행되어야하기때문에 API조회 후 applyFilter에 적용
     * */
    const [applyFilter, setApplyFilter] = useState([...defaultFilter]);
    const [noOffsetApplyFilter, setNoOffsetApplyFilter] = useState([...defaultNoOffsetFilter]);
    const excelDownload = async () => {
        if (data.totalSize !== 0) {
            /*마지막 조회 필터링 그대로 + 페이징 제외*/
            const payload = { filter: [...applyFilter], noOffsetFilter: [...noOffsetApplyFilter], sorter: sort };
            if (excelMutation) {
                excelMutation.mutateAsync(payload).then((res) => {
                    const url = window.URL.createObjectURL(
                        new Blob([res.data], { type: res.headers ? res.headers["content-type"] : "application/octet-stream" })
                    );
                    const link = document.createElement("a");
                    link.href = url;

                    // 다운로드될 파일 이름 설정
                    const fileName = type + "_" + moment().format("YYYYMMDDHHmmss") + ".xlsx";

                    link.setAttribute("download", fileName);

                    // 링크를 문서에 추가
                    document.body.appendChild(link);

                    // 링크 클릭하여 다운로드 시작
                    link.click();
                });
            } else {
                throw new Error("excelMutation prop is not set");
            }
        } else {
            modal.showAlert("알림", message.excelBtn); //내려받을 데이터가 존재하지 않습니다.
        }
    };
    /**
     * 2024-08-26 jewoo 일괄 등록 다운로드
     * 조회조건, 조회데이터 유무와 상관없기 때문에 엑셀 다운로드와 분류
     * */
    // 일괄 등록 다운로드
    const formExcelDownload = async () => {
        if (excelMutation) {
            excelMutation.mutateAsync().then((res) => {
                const url = window.URL.createObjectURL(
                    new Blob([res.data], { type: res.headers ? res.headers["content-type"] : "application/octet-stream" })
                );
                const link = document.createElement("a");
                link.href = url;

                // 다운로드될 파일 이름 설정
                const fileName = type + "_" + moment().format("YYYYMMDDHHmmss") + ".xlsx";

                link.setAttribute("download", fileName);

                // 링크를 문서에 추가
                document.body.appendChild(link);

                // 링크 클릭하여 다운로드 시작
                link.click();
            });
        } else {
            throw new Error("excelMutation prop is not set");
        }
    };

    return renderItem({
        fetchData,
        data,
        filter,
        defaultFilter,
        defaultFilterChange,
        filterChange,
        filterReducer,
        clearFilter,
        noOffsetFilter,
        defaultNoOffsetFilter,
        setNoOffsetFilter,
        noOffsetFilterChange,
        defaultNoOffsetFilterChange,
        clearNoOffsetFilter,
        setSummaryParam,
        summaryParam,
        applyFilter,
        setApplyFilter,
        noOffsetApplyFilter,
        sort,
        sortChange,
        defaultSortChange,
        page,
        pageChange,
        selectedState,
        setSelectedState,
        dataItemKey: finalDataItemKey,
        selectedField,
        renderItem,
        multiSelect,
        selectedData,
        dataState,
        setDataState,
        popupShow,
        setPopupShow,
        popupValue,
        setPopupValue,
        mode,
        setMode,
        required,
        setRequired,
        handleInsert,
        handleDelete,
        handleUpdate,
        handleCancelButton,
        handleSave,
        handleSearch,
        handleSummarySearch,
        _export,
        excelExport,
        idGetter,
        summaryData,
        excelDownload,
        formExcelDownload,
        isPage,
        editField,
        onItemChange,
        onRowClick,
        onCellClose,
        editCell
    });
};

export default GridData;

/**
 * isUse등 useYn (true, false)인 컬럼을 Y, N 스트링으로 바꾸어주는 함수
 *
 * @param data [any] 그리드의 데이터
 * @param fields [string] 바꿀 컬럼의 이름
 * @author jisu
 * @since 2024-04-23<br />
 * @since 2024-04-23<br />
 */
const isUseToString = (data, ...fields) => {
    return (
        data?.map((item) => {
            const newItem = { ...item };
            fields.forEach((field) => {
                newItem[field] = item[field] == true ? "Y" : item[field] == false ? "N" : "";
            });
            return newItem;
        }) ?? []
    );
};

export { isUseToString };
