import { useContext, useEffect, useRef, useState } from "react";
import { setSelectedState as applySelectedState } from "@progress/kendo-react-grid";
import message from "@/components/common/message.js";
import useDidMountEffect from "@/hooks/useDidMountEffect.jsx";
import { modalContext } from "@/components/common/Modal";
import { getter, isArray } from "@progress/kendo-react-common";
import moment from "moment";

/**
 * 그리드 데이터 보관
 *
 * @author dhwon
 * @since 2024-06-18<br />
 *
 * multiSelect 기본 false
 * @param rowNumber String rowNumber 이름대로 행에 숫자를 붙여줌. ex) rowNumber="test"면 test인 행이 생기고 1,2,3,4 .. 의 값을 갖고있음.
 * @param isPage paging을 할지 안할지 설정.
 */
const PopupGridData = ({
    dataItemKey,
    selectedField,
    // menuTitle,
    // searchMutation,
    // insertMutation,
    // updateMutation,
    // deleteMutation,
    // summaryMutation,
    // excelMutation,
    // type, //엑셀 파일 명
    multiSelect = false,
    rowNumber,
    isPage = true,
    renderItem,
    originData
}) => {
    const _export = useRef(null);
    const [totalData, setTotalData] = useState([]); //전체 데이터
    const [data, setData] = useState({ totalSize: 0, data: [] }); //전체 데이터
    const [sort, setSort] = useState([]);
    const [defaultFilter, setDefaultFilter] = useState([]);
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

    const selectedData = multiSelect
        ? dataState.data.filter((item) => item.selected === true)
        : dataState.data.find((item) => item.selected === true);

    const idGetter = getter(dataItemKey);


    useEffect(() => {
        setDataState(initDataState);
    }, [data]);

    useEffect(() => {
        const totalSize = totalData?.length ?? 0;
        const data = (totalData ?? []).map((item, idx) => ({ ...item, [rowNumber]: idx })).slice(0,10);
        setData({ totalSize, data });
    }, [totalData]);

    useEffect(()=>{
        setTotalData(originData??[]);
    },[originData]);

    useEffect(()=>{
        setPage({skip:0, take:10});
    },[sort]);

    useEffect(() => {
        const newData = applySelectedState({
            data: dataState.data,
            selectedField: selectedField,
            dataItemKey: dataItemKey,
            selectedState: selectedState
        });

        setDataState((prev) => ({ ...prev, data: newData }));
    }, [selectedState]);

    const handleSummarySearch = () => {
        // if (summaryMutation) {
        //     summaryMutation.mutateAsync(summaryParam).then((res) => {
        //         setSummaryData(res);
        //     });
        // }
    };

    const excelExport = () => {
        // if (_export.current !== null) {
        //     _export.current.save();
        // }
    };

    const getFetchDataParam = (param) => {
        const _page = param.page ?? page;
        const _filter = param.filter ?? filter;
        const _sorter = param.sorter ?? sort;
        const _noOffsetFilter = param.noOffsetFilter ?? noOffsetFilter;
        let data = null;
        if (isPage) {
            data = { ..._page, filter: _filter, sorter: _sorter, noOffsetFilter: _noOffsetFilter };
        } else {
            data = { filter: _filter, sorter: _sorter, noOffsetFilter: _noOffsetFilter };
        }
        return data;
    };

    const fetchData = async (payload) => {
        // if (searchMutation) {
        //     const res = await searchMutation.mutateAsync(payload);
        //     if (res.status != "NS_OK") {
        //         throw new Error();
        //     }
        //     const totalSize = res?.totalSize ?? 0;
        //     const data = (res?.items ?? []).map((item, idx) => ({ ...item, [rowNumber]: idx }));
        //     setData({ totalSize, data });
        // }
    };
    /**
     * filter의 현재 상태로 조회
     */
    const handleSearch = (param) => {
        // const _noOffsetFilter = param?.noOffsetFilter
        // const _filter = param?.filter
        // if (searchMutation) {
        //     let newNoOffsetFilter = noOffsetFilter;
        //     let newFilter = filter;
        //     if (_noOffsetFilter) {
        //         newNoOffsetFilter = _noOffsetFilter;
        //     }
        //     if (_filter) {
        //         newFilter = _filter;
        //     }
        //     const newApplyFilter = [...newFilter];
        //     //조회버튼 클릭시 첫 page로 가는게 맞다고 생각해서.
        //     const newPage = {
        //         skip: 0,
        //         take: 10
        //     };
        //     //조회 버튼 클릭시 sort초기화가 맞다고 생각해서.
        //     const newSort = [];
        //     fetchData(getFetchDataParam({noOffsetFilter: newNoOffsetFilter, filter: newApplyFilter, sorter: newSort, page: newPage}))
        //         .then(() => {
        //             if(_noOffsetFilter) {
        //                 setNoOffsetFilter(_noOffsetFilter);
        //             }
        //             if(_filter) {
        //                 setFilter(_filter);
        //             }
        //             setApplyFilter(newApplyFilter);
        //             setSort(newSort);
        //             setPage(newPage);
        //         }).catch(e => modal.showAlert("알림", message.searchFail))
        // }
    };

    function compare(a, b, sort) {
        for(let i = 0; i < sort.length; i++){
            let key = sort[i]?.field;
            let isAsc = sort[i]?.dir === "asc";

            if (a[key] < b[key]) {
                if(isAsc) return -1;
                else return 1;
            }
            if (a[key] > b[key]) {
                if(isAsc) return 1;
                else return -1;
            }
        }
        return 0;
    }

    const sortChange = (event) => {
        const newSort = event.sort.map((item) => {
            return { ...item, direction: item.dir };
        });

        const {field, dir} = event?.sort[0]??{};
        if(totalData[0][field] !== undefined && totalData[0][field] !== null){
            const tmp = totalData.sort((a, b) => compare(a, b, event.sort));
            (tmp);
            setTotalData([...tmp]); 
        }else{
            setTotalData([...originData]);
        }
        setSort(newSort);
    };

    const pageChange = (event) => {
        const take = event.page.take;
        const skip = event.page.skip;
        const newPage = { ...event.page, take };
        const data = (totalData ?? []).map((item, idx) => ({ ...item, [rowNumber]: idx })).slice(skip, skip+take);

        setData((prev)=>({...prev, data:data}));
        setPage(newPage);
    };

    const defaultSortChange = (sort) => {
        // setSort(
        //     sort.map((item) => {
        //         return { ...item, direction: item.dir };
        //     })
        // );
    };

    const defaultFilterChange = ({ field, operator, value }) => {
        // setDefaultFilter((prev) => {
        //     const copy = [...prev];
        //     const newFilter = [];

        //     const idx = prev.findIndex((filter) => filter.field == field);
        //     if (idx == -1) {
        //         newFilter.push({
        //             field: field,
        //             operator: operator,
        //             value: value
        //         });
        //     } else {
        //         copy[idx] = {
        //             field: field,
        //             operator: operator,
        //             value: value
        //         };
        //     }
        //     return [...copy, ...newFilter];
        // });
        // //defaultFilter의 변화는 항상 filter에 반영된다.
        // filterChange({ field, operator, value });
    };

    const filterReducer = (prev, items) => {
        // const copy = [...prev];
        // const newFilter = [];
        // items.forEach(item => {
        //     const { field, operator, value } = item;
        //     const idx = prev.findIndex((filter) => filter.field == field);
        //     if (idx == -1) {
        //         newFilter.push({
        //             field: field,
        //             operator: operator,
        //             value: value
        //         });
        //     } else {
        //         copy[idx] = {
        //             field: field,
        //             operator: operator,
        //             value: value
        //         };
        //     }

        // })
        // return [...copy, ...newFilter];
    }

    const filterChange = (item) => {
        // setFilter(prev => filterReducer(prev, [item]));
    };

    const noOffsetFilterChange = ({ field, operator, value }) => {
        // let result,
        //     prev = noOffsetFilter;
        // const copy = [...prev];
        // const newFilter = [];

        // const idx = prev.findIndex((filter) => filter.field == field);
        // if (idx == -1) {
        //     newFilter.push({
        //         field: field,
        //         operator: operator,
        //         value: value
        //     });
        // } else {
        //     copy[idx] = {
        //         field: field,
        //         operator: operator,
        //         value: value
        //     };
        // }
        // result = [...copy, ...newFilter];
        // setNoOffsetFilter(result);
    };

    const clearFilter = (field) => {
        // const idx = filter.findIndex((item) => item.field == field);
        // const newFilter = [...filter];
        // if (idx != -1) {
        //     newFilter.splice(idx, 1);
        //     setFilter(newFilter);
        // }
    };

    const clearNoOffsetFilter = (field) => {
        // const idx = noOffsetFilter.findIndex((item) => item.field == field);
        // const newFilter = [...noOffsetFilter];
        // if (idx != -1) {
        //     newFilter.splice(idx, 1);
        //     setNoOffsetFilter(newFilter);
        // }
    };

    /**
     * 필수값 확인하는 함수
     *
     * @author jisu
     * @since 2024.05.07
     */
    // const validate = (data) => {
    //     let isValid = true;
    //     required.forEach((item) => (isValid = data[item] != null));
    //     return isValid;
    // };

    const handleInsert = () => {
        // if (mode == "R") {
        //     setPopupShow(true);
        //     setMode("I");
        // } else {
        //     if (confirm(message.checkCancel)) {
        //         handleCancelButton();
        //     }
        // }
    };

    const handleDelete = () => {
        // setMode("D");
        // if ((!isArray(selectedData) && selectedData) || (isArray(selectedData) && selectedData?.length > 0)) {
        //     modal.showReqConfirm(menuTitle, "D", async () => {
        //         const res = deleteMutation && (await deleteMutation.mutateAsync(selectedData));
        //         if (res?.status == "NS_OK") {
        //             modal.showAlert("알림", res.message); // 성공 팝업 표출
        //             handleCancelButton();
        //             handleSearch();
        //             if (summaryMutation) {
        //                 handleSummarySearch();
        //             }
        //         } else {
        //             modal.showErrorAlert(res?.status, res?.message); //오류 팝업 표출
        //         }
        //     });
        // } else {
        //     modal.showAlert("알림", message.deleteBtn); // 삭제할 행을 선택해 주세요.
        // }
        // setMode("R");
    };

    const handleUpdate = () => {
        // setMode("U");
    };

    const handleSave = (data) => {
        // const payload = data ?? popupValue;
        // if (mode == "I") {
        //     modal.showReqConfirm(menuTitle, mode, async () => {
        //         const res = insertMutation && (await insertMutation.mutateAsync(payload));
        //         if (res?.status == "NS_OK") {
        //             modal.showAlert("알림", res.message); // 성공 팝업 표출
        //             handleCancelButton();
        //             handleSearch();
        //             if (summaryMutation) {
        //                 handleSummarySearch();
        //             }
        //         } else {
        //             modal.showErrorAlert(res?.status, res?.message); //오류 팝업 표출
        //         }
        //     });
        // } else if (mode == "U") {
        //     modal.showReqConfirm(menuTitle, mode, async () => {
        //         const res = updateMutation && (await updateMutation.mutateAsync(payload));
        //         if (res?.status == "NS_OK") {
        //             modal.showAlert("알림", res.message); // 성공 팝업 표출
        //             handleCancelButton();
        //             handleSearch();
        //             if (summaryMutation) {
        //                 handleSummarySearch();
        //             }
        //         } else {
        //             modal.showErrorAlert(res?.status, res?.message); //오류 팝업 표출
        //         }
        //     });
        // }
    };

    const handleCancelButton = () => {
        // setPopupShow(false);
        // setPopupValue({});
        // setMode("R");
    };

    /**
     * 2024-06-04 BokyeongKang 마지막 적용된 필터를 기준으로 엑셀 다운로드가 실행되어야하기때문에 API조회 후 applyFilter에 적용
     * */
    const [applyFilter, setApplyFilter] = useState([...defaultFilter]);
    const excelDownload = async () => {
        // if (data.totalSize !== 0) {
        //     /*마지막 조회 필터링 그대로 + 페이징 제외*/
        //     const payload = { filter: [...applyFilter], sorter: sort };
        //     if (excelMutation) {
        //         excelMutation.mutateAsync(payload).then((res) => {
        //             const url = window.URL.createObjectURL(
        //                 new Blob([res.data], { type: res.headers ? res.headers["content-type"] : "application/octet-stream" })
        //             );
        //             const link = document.createElement("a");
        //             link.href = url;

        //             // 다운로드될 파일 이름 설정
        //             const fileName = type + "_" + moment().format("YYYYMMDDHHmmss") + ".xlsx";

        //             link.setAttribute("download", fileName);

        //             // 링크를 문서에 추가
        //             document.body.appendChild(link);

        //             // 링크 클릭하여 다운로드 시작
        //             link.click();
        //         });
        //     } else {
        //         throw new Error("excelMutation prop is not set");
        //     }
        // } else {
        //     modal.showAlert("알림", message.excelBtn); //내려받을 데이터가 존재하지 않습니다.
        // }
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
        setNoOffsetFilter,
        noOffsetFilterChange,
        clearNoOffsetFilter,
        setSummaryParam,
        summaryParam,
        applyFilter,
        sort,
        sortChange,
        defaultSortChange,
        page,
        pageChange,
        selectedState,
        setSelectedState,
        dataItemKey,
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
        isPage
    });
};

export default PopupGridData;

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
