import { useContext, useEffect, useRef, useState } from "react";
import { setSelectedState as applySelectedState } from "@progress/kendo-react-grid";
import message from "@/components/common/message.js";
import { modalContext } from "@/components/common/Modal";
import { getter } from "@progress/kendo-react-common";

/**
 * GridData 그리드 데이터 보관 (surveyon 경량 버전)
 * * --------------------------------------------------
 * searchMutation만 남기고 나머지 API 관련 기능 제거
 * filter, sort, page, summary, excel 등 제거
 * 복합키 및 선택 상태 유지 로직은 그대로 유지
 * 초기 1회 API 호출만 수행
 * --------------------------------------------------
 *
 * @author jewoo
 * @since 2025-10
 */
const GridData = ({
    dataItemKey,

    onRowClick,

    selectedField,
    searchMutation,

    multiSelect = false,
    rowNumber,
    rowNumberOrder = "asc",

    renderItem,
    initialParams   // 초기 조회용 파라미터 
}) => {

    const [data, setData] = useState({ totalSize: 0, data: [] }); //전체 데이터
    const initDataState = {
        totalSize: data.totalSize,
        data: data.data.map((dataItem) => ({ ...dataItem, [selectedField]: false }))
    };
    const [dataState, setDataState] = useState(initDataState); //전체데이터 + selected상태
    const [selectedState, setSelectedState] = useState({}); //selected상태 //{5: true}

    const modal = useContext(modalContext);

    const [searchParams, setSearchParams] = useState({}); //  마지막 조회 파라미터 저장
    const inFlightRef = useRef(false);  //중복 호출 잠금
    const didInitialFetchRef = useRef(false);  // 초기 1회 호출 가드
    const selectedData = multiSelect
        ? dataState.data.filter((item) => item.selected)
        : dataState.data.find((item) => item.selected);

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

    const handleSearch = async (arg) => {
        const params = arg?.params ?? initialParams ?? {};   // 기본 파라미터는 initialParams
        const skipSpinner = arg?.skipSpinner ?? false;

        if (inFlightRef.current || !searchMutation) return;
        inFlightRef.current = true;

        try {
            const res = await searchMutation.mutateAsync({ params: { ...params, skipSpinner } });
            const raw = res?.resultjson ?? [];

            // 복합키 + 행번호
            const keyed = raw.map((item, idx) => {
                const next = { ...item };
                if (isCompositeKey) {
                    next[COMPOSITE_KEY_FIELD] = dataItemKey.map(f =>
                        encodeURIComponent(String(item[f]))
                    ).join("__");
                }
                if (rowNumber && typeof rowNumber === "string") {
                    next[rowNumber] =
                        rowNumberOrder === "desc" ? raw.length - idx : idx + 1;
                }
                return next;
            });

            setData({ totalSize: keyed.length, data: keyed });
        } catch (err) {
            modal.showAlert("알림", message.searchFail);
        } finally {
            inFlightRef.current = false;
        }
    };

    return renderItem({
        data,
        setData,
        dataItemKey: finalDataItemKey,
        selectedData,
        selectedField,
        selectedState,
        setSelectedState,
        dataState,
        setDataState,
        idGetter,
        onRowClick,
        handleSearch,
    });
};

export default GridData;
