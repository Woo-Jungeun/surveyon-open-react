import React, { useState, useEffect, useContext, useRef, useMemo, useCallback } from 'react';
import DataHeader from '@/services/dataStatus/components/DataHeader';
import MapManagementPageModal from './MapManagementPageModal';
import KendoGrid from '../../../../components/kendo/KendoGrid';
import { GridColumn as Column } from "@progress/kendo-react-grid";
import ExcelColumnMenu from '../../../../components/common/grid/ExcelColumnMenu';
import { DropDownList } from "@progress/kendo-react-dropdowns";
import '../../../../assets/css/grid_vertical_borders.css';
import './MapManagementPage.css';
import { MapManagementPageApi } from './MapManagementPageApi';
import { modalContext } from "@/components/common/Modal.jsx";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import { useSelector } from 'react-redux';
import { Plus, Trash2 } from 'lucide-react';

// 그리드 셀 컴포넌트에서 상태를 공유하기 위한 Context (unmount 루프 방지 목적)
const MapManagementContext = React.createContext(null);

// ─────────────────────────────────────────────
// 자릿수 자동 계산 (순수 함수 - 컴포넌트 외부에 정의)
// 규칙 1: 총자릿수 = 보기자릿수 × 보기갯수
// 규칙 2: 다음 행의 시작자릿수 = 현재 행의 시작자릿수 + 현재 행의 총자릿수
// ─────────────────────────────────────────────
const NUMERIC_FIELDS = ['valLen', 'valCnt', 'startPos', 'totalLen'];

const recalcVariables = (vars) => {
    let nextStart = null;
    return vars.map((v, index) => {
        const valLen = Number(v.valLen) || 0;
        const valCnt = Number(v.valCnt) || 0;

        // 총자릿수 = 보기자릿수 × 보기갯수
        const totalLen = valLen * valCnt;

        // 시작자릿수: 첫 행은 기존 값 유지, 이후 행은 이전 행 기준 자동 계산
        const startPos = (index === 0 || nextStart === null)
            ? (Number(v.startPos) || 1)
            : nextStart;

        nextStart = startPos + totalLen;

        // 값이 바뀐 행만 새 객체 반환 (불필요한 리렌더 최소화)
        if (v.totalLen === totalLen && v.startPos === startPos) return v;
        return { ...v, totalLen, startPos };
    });
};

// ─────────────────────────────────────────────
// 셀 컴포넌트 (MapManagementPage 외부에 선언하여 리렌더 시 재생성 방지)
// ─────────────────────────────────────────────

/** 텍스트 입력 셀 - 편집 중이면 textarea, 아니면 읽기 전용 div */
const InputCell = (props) => {
    const { setVariables, editingRowId } = useContext(MapManagementContext);
    const textareaRef = useRef(null);
    const { dataItem, field, style, className } = props;

    // textarea 높이를 내용에 맞게 자동 조정
    const adjustHeight = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
        }
    };

    useEffect(() => {
        adjustHeight();
    }, [dataItem[field], editingRowId]);

    // blur 시점에 변경값 반영 (onChange가 아닌 blur로 처리해 렌더 최소화)
    const handleBlur = (e) => {
        const newValue = e.target.value;
        // 숫자 필드는 Number 변환, 그 외는 문자열 그대로
        const parsedValue = NUMERIC_FIELDS.includes(field) ? (Number(newValue) || 0) : newValue;

        if (dataItem[field] != parsedValue) { // != 로 타입 유연 비교 ("5" vs 5)
            setVariables(prev => {
                const updated = prev.map(v =>
                    v.id === dataItem.id ? { ...v, [field]: parsedValue } : v
                );
                // 자릿수 관련 필드 변경 시 전체 연쇄 재계산
                return NUMERIC_FIELDS.includes(field) ? recalcVariables(updated) : updated;
            });
        }
    };

    const isEditing = dataItem.id === editingRowId || dataItem.isNew;

    if (!isEditing) {
        return (
            <td style={{ ...style, verticalAlign: 'middle' }} className={className}>
                <div className="variable-text-readonly" style={{ background: 'transparent', border: 'none', pointerEvents: 'none' }}>
                    {dataItem[field]}
                </div>
            </td>
        );
    }

    return (
        <td style={{ ...style, verticalAlign: 'middle' }} className={className}>
            <textarea
                ref={textareaRef}
                defaultValue={dataItem[field]}
                className="variable-input"
                rows={1}
                onInput={adjustHeight}
                onBlur={handleBlur}
                autoFocus
            />
        </td>
    );
};

/** 보기(카테고리) 셀 - 편집 중이면 '변경' 버튼 표시 */
const CategoryCell = (props) => {
    const { SetEditingCategoryPopupOpen, editingRowId } = useContext(MapManagementContext);
    const isEditing = props.dataItem.id === editingRowId || props.dataItem.isNew;

    return (
        <td style={{ ...props.style, verticalAlign: 'middle' }} className={props.className}>
            <div className="category-cell-container">
                <div
                    className="category-cell-content"
                    style={{
                        border: !isEditing ? 'none' : undefined,
                        background: !isEditing ? 'transparent' : undefined,
                        pointerEvents: !isEditing ? 'none' : undefined
                    }}
                >
                    {props.dataItem.category}
                </div>
                {isEditing && (
                    <button
                        onClick={() => SetEditingCategoryPopupOpen(props.dataItem)}
                        className="category-edit-btn"
                    >
                        변경
                    </button>
                )}
            </div>
        </td>
    );
};

/** 변수 유형 셀 - 편집 중이면 드롭다운, 아니면 읽기 전용 */
const TypeCell = (props) => {
    const { setVariables, editingRowId } = useContext(MapManagementContext);
    const { dataItem, style, className } = props;

    const handleChange = (e) => {
        const newType = e.target.value;
        setVariables(prev => prev.map(v => v.id === dataItem.id ? { ...v, type: newType } : v));
    };

    const typeOptions = ["Single", "Multi", "multi", "Dummy", "OPEN", "Open", "CUSTOM", "string", "numeric"];
    const isEditing = dataItem.id === editingRowId || dataItem.isNew;

    if (!isEditing) {
        return (
            <td style={{ ...style, verticalAlign: 'middle' }} className={className}>
                <div className="variable-text-readonly" style={{ background: 'transparent', border: 'none', pointerEvents: 'none' }}>
                    {dataItem.type}
                </div>
            </td>
        );
    }

    return (
        <td style={{ ...style, verticalAlign: 'middle' }} className={className}>
            <DropDownList
                data={typeOptions}
                value={dataItem.type}
                onChange={handleChange}
                style={{ width: '100%' }}
            />
        </td>
    );
};

/** 체크박스 셀 - 상세 설정 ON이거나 편집 행이면 활성화 */
const CheckboxCell = (props) => {
    const { setVariables, editingRowId, isDetailed } = useContext(MapManagementContext);
    const { dataItem, field, style, className } = props;

    const handleChange = (e) => {
        const isChecked = e.target.checked;
        setVariables(prev => prev.map(v => v.id === dataItem.id ? { ...v, [field]: isChecked } : v));
    };

    // 상세 설정 ON이거나, 해당 행이 편집 중이거나, 신규 행이면 클릭 가능
    const isEditing = isDetailed || dataItem.id === editingRowId || dataItem.isNew;
    const isChecked = !!(dataItem[field]);

    return (
        <td style={{ ...style, textAlign: 'center', verticalAlign: 'middle' }} className={className}>
            <label className={`dm-checkbox-label ${isEditing ? '' : 'dm-checkbox-disabled'}`}>
                <input
                    type="checkbox"
                    className="dm-checkbox-input"
                    checked={isChecked}
                    onChange={handleChange}
                    disabled={!isEditing}
                />
                <span className="dm-checkbox-box" />
            </label>
        </td>
    );
};

/** 멀티라인 컬럼 헤더 (줄바꿈 지원) */
const multilineHeader = (props) => (
    <span style={{ display: 'block', textAlign: 'center', whiteSpace: 'pre-line', lineHeight: '1.2', width: '100%' }}>
        {props.title}
    </span>
);

/** 읽기 전용 셀 - 박스 없이 텍스트만 표시 */
const ReadOnlyCell = (props) => (
    <td style={{ ...props.style, verticalAlign: 'middle', textAlign: 'center' }} className={props.className}>
        <span style={{ userSelect: 'none', color: 'inherit' }}>{props.dataItem[props.field]}</span>
    </td>
);

/** 행 추가 버튼 셀 */
const AddCell = (props) => {
    const { onAdd } = useContext(MapManagementContext);
    return (
        <td style={{ ...props.style, textAlign: 'center', verticalAlign: 'middle' }}>
            <button onClick={onAdd} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#16a34a' }}>
                <Plus size={18} />
            </button>
        </td>
    );
};

/** 행 삭제 버튼 셀 */
const DeleteCell = (props) => {
    const { onDelete } = useContext(MapManagementContext);
    return (
        <td style={{ ...props.style, textAlign: 'center', verticalAlign: 'middle' }}>
            <button
                onClick={() => onDelete(props.dataItem.id)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
            >
                <Trash2 size={16} />
            </button>
        </td>
    );
};

/** 필드명에 따라 적절한 셀 컴포넌트 반환 */
const getCell = (field) => {
    switch (field) {
        case 'sysName':
        case 'startPos':
        case 'totalLen': return ReadOnlyCell;
        case 'name':
        case 'label':
        case 'logic':
        case 'minQuestions':
        case 'memo':
        case 'valLen':
        case 'valCnt':
        case 'etcOpen':
        case 'spssName': return InputCell;
        case 'category': return CategoryCell;
        case 'type': return TypeCell;
        case 'multiValChange':
        case 'excludeOpenMerge':
        case 'verificationVar':
        case 'excludeOutput': return CheckboxCell;
        case 'add': return AddCell;
        case 'delete': return DeleteCell;
        default: return null;
    }
};

// ─────────────────────────────────────────────
// 수정 감지 대상 필드 목록 (컴포넌트 외부에 선언해 매 렌더 시 재생성 방지)
// ─────────────────────────────────────────────
const EDITABLE_FIELDS = [
    'label', 'logic', 'decimal', 'spssName', 'type', 'memo',
    'multiValChange', 'minQuestions', 'excludeOpenMerge',
    'verificationVar', 'excludeOutput', 'startPos', 'valLen',
    'valCnt', 'totalLen', 'etcOpen'
];

// ─────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────
const MapManagementPage = () => {
    const { getMapVariables, updateMapVariables } = MapManagementPageApi();
    const auth = useSelector((store) => store.auth);
    const modal = useContext(modalContext);
    const loadingSpinner = useContext(loadingSpinnerContext);

    // ── 상태 선언 ──
    const [variables, setVariables] = useState([]);           // 현재 그리드 데이터
    const [originalVariables, setOriginalVariables] = useState([]); // 조회 시점 원본 (변경 감지용)
    const [deletedIds, setDeletedIds] = useState([]);         // 삭제된 기존 변수 id 목록
    const [isDataLoaded, setIsDataLoaded] = useState(false);  // 초기 데이터 로드 완료 여부
    const [refreshKey, setRefreshKey] = useState(0);          // 재조회 트리거

    const [activeTab, setActiveTab] = useState('mapping');    // 'mapping' | 'category'
    const [isDetailed, setIsDetailed] = useState(false);      // 상세 설정 토글
    const [selectedVariable, setSelectedVariable] = useState(null); // 보기 레이블 탭에서 선택된 변수
    const [editingRowId, setEditingRowId] = useState(null);   // 현재 편집 중인 행 id

    const [editingCategoryPopupOpen, SetEditingCategoryPopupOpen] = useState(null); // 보기 변경 팝업
    const [sort, setSort] = useState([]);
    const [filter, setFilter] = useState(null);
    const [skip, setSkip] = useState(0);
    const [pageSize, setPageSize] = useState(100);

    // ── 변경 감지 ──
    // variables 또는 deletedIds가 바뀔 때마다 저장 버튼 활성화 여부 결정
    const hasChanges = useMemo(() => {
        if (!isDataLoaded) return false;
        if (deletedIds.length > 0) return true; // 삭제 항목이 있으면 변경됨
        // 신규 추가 항목 확인
        if (variables.some(v => v.isNew)) return true;
        // 기존 항목 필드 변경 비교
        const originalMap = new Map(originalVariables.map(v => [v.id, v]));
        return variables.some(v => {
            const orig = originalMap.get(v.id);
            if (!orig) return true;
            return EDITABLE_FIELDS.some(f => v[f] !== orig[f]);
        });
    }, [variables, originalVariables, deletedIds, isDataLoaded]);

    // ── 데이터 조회 ──
    // 컴포넌트 마운트, 사용자 인증 변경, refreshKey 변경 시 실행
    useEffect(() => {
        const fetchVariables = async () => {
            if (!auth?.user?.userId) return;

            const userId = auth.user.userId;
            const pn = sessionStorage.getItem('merge_pn') || sessionStorage.getItem('projectnum');

            if (!pn) {
                setIsDataLoaded(true);
                return;
            }

            try {
                loadingSpinner.show();
                const result = await getMapVariables.mutateAsync({ user: userId, pn });

                if (result?.variables) {
                    const transformedData = result.variables.map(item => {
                        // labels 배열을 "코드=레이블" 문자열로 변환
                        const categoryStr = (item.labels || [])
                            .map(l => `${l.code}=${l.label}`)
                            .join(', ');

                        return {
                            id: item.id,
                            sysName: item.cQuestionVariable || '',
                            name: item.cQuestionVariable || '',
                            label: item.label || '',
                            type: item.type || 'Single',
                            startPos: item.startPos || 0,
                            valLen: item.codeLen || 0,
                            valCnt: item.optCount || 0,
                            totalLen: item.totalLen || 0,
                            etcOpen: item.openRule || '',
                            logic: item.logicCheck || '',
                            spssName: item.spssName || '',
                            decimal: item.decimalPlaces || 0,
                            memo: item.memo || '',
                            multiValChange: !!item.multiChange,
                            minQuestions: item.minAnswer || 0,
                            excludeOpenMerge: !!item.noOpenMerge,
                            verificationVar: !!item.isValid,
                            excludeOutput: !!item.noOutput,
                            category: categoryStr,
                            labels: item.labels || []
                        };
                    });
                    // 시작자릿수가 모두 0이면 (최초 데이터) 자동 계산 1회 실행
                    const allZero = transformedData.every(v => v.startPos === 0);
                    const finalData = allZero ? recalcVariables(transformedData) : transformedData;

                    setVariables(finalData);
                    setOriginalVariables(JSON.parse(JSON.stringify(finalData))); // 깊은 복사로 원본 보관
                } else if (result?.success === false || result?.status === 404 || result?.status === 400 || result?.status === 500) {
                    modal.showErrorAlert("에러", result?.message || "프로젝트 매핑 정보를 조회할 수 없습니다.");
                } else {
                    // 데이터 없음 or 예상치 못한 응답 형식
                    setVariables([]);
                    setOriginalVariables([]);
                }
            } catch (error) {
                console.error("맵 변수 조회 오류:", error);
                if (error.response?.status === 404) {
                    modal.showErrorAlert("알림", "프로젝트를 찾을 수 없습니다.");
                } else if (error.response?.status === 400) {
                    modal.showErrorAlert("알림", "잘못된 요청입니다.");
                } else {
                    modal.showErrorAlert("에러", "맵 목록 조회 중 오류가 발생했습니다.");
                }
            } finally {
                setIsDataLoaded(true);
                loadingSpinner.hide();
            }
        };

        fetchVariables();
    }, [auth?.user?.userId, refreshKey]);

    // 다른 페이지 선택 이벤트 수신 시 데이터 재조회
    useEffect(() => {
        const handlePageSelected = () => setRefreshKey(prev => prev + 1);
        window.addEventListener("pageSelected", handlePageSelected);
        return () => window.removeEventListener("pageSelected", handlePageSelected);
    }, []);

    // 보기 레이블 탭 진입 시 첫 번째 변수 자동 선택
    useEffect(() => {
        if (activeTab === 'category' && variables.length > 0 && !selectedVariable) {
            setSelectedVariable(variables[0]);
        }
    }, [activeTab, variables]);

    // ── 핸들러 ──

    const pageChange = (event) => {
        setSkip(event.page.skip);
        setPageSize(event.page.take);
    };

    /** 보기(카테고리) 팝업에서 저장 시 해당 변수의 category 업데이트 */
    const handleCategorySave = (id, newCategoryStr) => {
        setVariables(variables.map(v => v.id === id ? { ...v, category: newCategoryStr } : v));
        SetEditingCategoryPopupOpen(null);
    };

    /** 컬럼 메뉴 (필터/정렬) - useCallback으로 불필요한 재생성 방지 */
    const columnMenu = useCallback((props) => (
        <ExcelColumnMenu
            {...props}
            filter={filter}
            onFilterChange={setFilter}
            onSortChange={setSort}
        />
    ), [filter]);

    /** 변수 삭제 - 신규 행은 deletedIds에 추가하지 않음 */
    const handleDeleteVariable = (id) => {
        const isNew = variables.find(v => v.id === id)?.isNew;
        if (!isNew) {
            setDeletedIds(prev => [...prev, id]);
        }
        setVariables(prev => prev.filter(v => v.id !== id));
    };

    /** 신규 변수 행 추가 - 목록 맨 위에 삽입 */
    const handleAddVariable = () => {
        setVariables(prev => {
            const newId = Date.now(); // 임시 고유 id (저장 시 서버에서 실제 id 발급)

            // 중복되지 않는 var_N 형태의 시스템 변수명 생성
            let counter = 1;
            while (prev.some(v => v.sysName === `var_${counter}`)) counter++;
            const newName = `var_${counter}`;

            return [{
                id: newId,
                sysName: newName,
                name: newName,
                label: '',
                category: '',
                logic: '',
                count: '0 / 0',
                type: '범주형',
                isNew: true
            }, ...prev];
        });
    };

    /** 행 렌더러 - 편집 중인 행과 신규 행에 CSS 클래스/스타일 추가 */
    const rowRender = (trElement, props) => {
        const { dataItem } = props;
        const isEditing = dataItem.id === editingRowId;
        const isNew = dataItem.isNew;

        const trProps = {
            ...trElement.props,
            className: `${trElement.props.className} ${isEditing ? 'editing-row' : ''} ${isNew ? 'new-row' : ''}`.trim(),
            style: {
                ...trElement.props.style,
                borderLeft: isEditing ? '3px solid var(--dm-primary)' : trElement.props.style?.borderLeft,
            }
        };
        return React.cloneElement(trElement, { ...trProps }, trElement.props.children);
    };

    /** 변경사항 저장 - 수정된 항목만 updated, 삭제된 id를 deleted에 담아 API 호출 */
    const handleSave = () => {
        // 실제 저장 실행 함수 (비동기)
        const executeSave = async () => {
            try {
                const pn = sessionStorage.getItem('merge_pn') || sessionStorage.getItem('projectnum') || '';
                const userId = auth?.user?.userId || '';

                // 원본과 비교해 변경된 항목만 추출
                const originalMap = new Map(originalVariables.map(v => [v.id, v]));
                const updated = variables
                    .filter(v => {
                        if (v.isNew) return true; // 신규 항목은 무조건 포함
                        const orig = originalMap.get(v.id);
                        if (!orig) return true;
                        return EDITABLE_FIELDS.some(f => v[f] !== orig[f]);
                    })
                    .map(v => ({
                        id: v.isNew ? 0 : v.id, // 신규 행은 0으로 전송 (서버에서 채번)
                        projectId: 0,
                        pn,
                        sQuestionVariable: v.sysName || '',
                        cQuestionVariable: v.name || v.sysName || '',
                        label: v.label || '',
                        type: v.type || '',
                        startPos: v.startPos || 0,
                        codeLen: v.valLen || 0,
                        optCount: v.valCnt || 0,
                        totalLen: v.totalLen || 0,
                        openRule: v.etcOpen || '',
                        logicCheck: v.logic || '',
                        spssName: v.spssName || '',
                        decimalPlaces: v.decimal || 0,
                        memo: v.memo || '',
                        multiChange: !!v.multiValChange,
                        minAnswer: v.minQuestions || 0,
                        noOpenMerge: !!v.excludeOpenMerge,
                        isValid: !!v.verificationVar,
                        noOutput: !!v.excludeOutput,
                        ranking: 0,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        labels: v.labels || []
                    }));

                const result = await updateMapVariables.mutateAsync({
                    pn,
                    user: userId,
                    updated,
                    deleted: deletedIds,
                });

                if (result?.success === '777' || result?.success === true) {
                    modal.showAlert("알림", "저장되었습니다.", () => {
                        setDeletedIds([]);
                        setRefreshKey(prev => prev + 1); // 저장 후 재조회
                    });
                } else {
                    modal.showErrorAlert("에러", result?.message || "저장에 실패했습니다.");
                }
            } catch (e) {
                console.error('저장 오류:', e);
                modal.showErrorAlert("에러", "저장 중 오류가 발생했습니다.");
            }
        };

        // showConfirm의 3번째 인자는 options 객체이므로 btns로 콜백 전달
        modal.showConfirm("알림", "변경사항을 저장하시겠습니까?", {
            btns: [
                { title: "취소", click: () => { } },
                { title: "확인", click: executeSave },
            ]
        });
    };

    // ── 컬럼 구성 ──
    // isDetailed 상태에 따라 컬럼 목록이 달라지므로 useMemo로 최적화
    const mappingColumns = useMemo(() => isDetailed
        ? [
            { field: 'add', title: '+', width: '50px' },
            { field: 'id', title: '#', width: '50px' },
            { field: 'sysName', title: '변수명', width: '120px' },
            { field: 'logic', title: '로직체크', width: '120px' },
            { field: 'label', title: '레이블', width: '250px' },
            { field: 'decimal', title: '소수점\n자리수', width: '100px', headerCell: multilineHeader },
            { field: 'spssName', title: 'SPSS\n변수명', width: '120px', headerCell: multilineHeader },
            { field: 'type', title: '변수 유형', width: '120px' },
            { field: 'memo', title: '메모', minWidth: 200 },
            { field: 'multiValChange', title: '멀티값\n변경', width: '100px' },
            { field: 'excludeOpenMerge', title: '오픈머지\n제외', width: '100px' },
            { field: 'verificationVar', title: '검증문항', width: '100px' },
            { field: 'excludeOutput', title: '출력제외', width: '100px' },
            { field: 'delete', title: '삭제', width: '80px' }
        ]
        : [
            { field: 'add', title: '+', width: '45px' },
            { field: 'id', title: '#', width: '50px' },
            { field: 'sysName', title: '변수명', width: '85px' },
            { field: 'startPos', title: '시작\n자리수', width: '90px', headerCell: multilineHeader },
            { field: 'valLen', title: '보기\n자리수', width: '90px', headerCell: multilineHeader },
            { field: 'valCnt', title: '보기\n갯수', width: '85px', headerCell: multilineHeader },
            { field: 'totalLen', title: '총\n자리수', width: '90px', headerCell: multilineHeader },
            { field: 'etcOpen', title: '기타\n오픈정의', width: '100px', headerCell: multilineHeader },
            { field: 'logic', title: '로직\n체크', width: '95px' },
            { field: 'label', title: '레이블', minWidth: 50 },
            { field: 'decimal', title: '소수점\n자리수', width: '90px', headerCell: multilineHeader },
            { field: 'spssName', title: 'SPSS\n변수명', width: '100px', headerCell: multilineHeader },
            { field: 'type', title: '변수\n유형', width: '95px' },
            { field: 'minQuestions', title: '문항\n최소갯수', width: '100px', headerCell: multilineHeader },
            { field: 'memo', title: '메모', minWidth: 50 },
            { field: 'delete', title: '삭제', width: '80px' }
        ], [isDetailed]);

    // ── Context 값 ──
    const contextValue = useMemo(() => ({
        variables,
        setVariables,
        editingRowId,
        setEditingRowId,
        SetEditingCategoryPopupOpen,
        isDetailed,
        onAdd: handleAddVariable,
        onDelete: handleDeleteVariable,
    }), [variables, editingRowId, isDetailed]);

    // ── 렌더 ──
    return (
        <MapManagementContext.Provider value={contextValue}>
            <div className="variable-page" data-theme="data-management">
                <DataHeader
                    title="맵 관리"
                    saveButtonLabel="변경사항 저장"
                    onSave={handleSave}
                    saveButtonDisabled={!hasChanges && activeTab === 'mapping'}
                />

                <div className="variable-page-content">
                    {/* 탭 버튼 */}
                    <div className="tab-container">
                        <button
                            className={`tab-btn ${activeTab === 'mapping' ? 'active' : ''}`}
                            onClick={() => setActiveTab('mapping')}
                        >
                            MAP 구성
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'category' ? 'active' : ''}`}
                            onClick={() => setActiveTab('category')}
                        >
                            보기 레이블
                        </button>
                    </div>

                    {activeTab === 'mapping' ? (
                        <>
                            {/* 서브헤더: 전체 건수 + 상세 설정 토글 */}
                            <div className="map-subheader">
                                <div className="map-stats">
                                    <span className="stat-item">전체 <strong>{variables.length}</strong> 건</span>
                                </div>
                                <div className="map-controls">
                                    <span className="grid-guide"><span className="guide-icon">💡</span> 셀 클릭 편집 | '+': 행 추가 | 'Trash': 삭제 | 가로/세로 스크롤 시 고정</span>
                                    <div className="toggle-wrapper">
                                        <span className="toggle-label">상세 설정</span>
                                        <label className="switch">
                                            <input type="checkbox" checked={isDetailed} onChange={() => setIsDetailed(!isDetailed)} />
                                            <span className="slider round"></span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* MAP 구성 그리드 */}
                            <div className="variable-page-card">
                                <div className="cmn_grid singlehead">
                                    <KendoGrid
                                        parentProps={{
                                            data: variables,
                                            dataItemKey: "id",
                                            sort,
                                            filter,
                                            sortChange: ({ sort }) => setSort(sort),
                                            filterChange: ({ filter }) => setFilter(filter),
                                            height: "100%",
                                            rowRender,
                                            pageable: true,
                                            total: variables.length,
                                            skip,
                                            pageSize,
                                            onPageChange: pageChange,
                                            onRowClick: (e) => setEditingRowId(e.dataItem.id)
                                        }}
                                    >
                                        {mappingColumns.map((c) => (
                                            <Column
                                                key={c.field}
                                                field={c.field}
                                                title={c.title}
                                                width={c.width}
                                                minWidth={c.minWidth}
                                                columnMenu={columnMenu}
                                                cell={getCell(c.field)}
                                                headerClassName="k-header-center variable-column-header"
                                            />
                                        ))}
                                    </KendoGrid>
                                </div>
                            </div>
                        </>
                    ) : (
                        /* 보기 레이블 탭 */
                        <div className="category-label-layout">
                            {/* 변수 목록 사이드바 */}
                            <div className="variable-sidebar">
                                <div className="sidebar-header-box">
                                    <h3>변수 목록</h3>
                                    <div className="search-box">
                                        <input type="text" placeholder="변수 검색..." />
                                    </div>
                                </div>
                                <div className="variable-list">
                                    {variables.map(v => (
                                        <div
                                            key={v.id}
                                            className={`variable-item ${selectedVariable?.id === v.id ? 'active' : ''}`}
                                            onClick={() => setSelectedVariable(v)}
                                        >
                                            <div className="v-name">{v.sysName}</div>
                                            <div className="v-label">{v.label || '레이블 없음'}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 선택된 변수의 보기 레이블 그리드 */}
                            <div className="category-detail-content">
                                <div className="detail-header">
                                    <div className="v-info-title">
                                        /{selectedVariable?.sysName} <span className="v-info-label">{selectedVariable?.label}</span>
                                    </div>
                                    <button className="add-value-btn" onClick={() => SetEditingCategoryPopupOpen(selectedVariable)}>
                                        <Plus size={14} /> 값 추가
                                    </button>
                                </div>
                                <div className="category-grid-container">
                                    <div className="cmn_grid singlehead">
                                        <KendoGrid
                                            parentProps={{
                                                data: selectedVariable?.labels?.map((l, idx) => ({
                                                    ...l,
                                                    rowNo: idx + 1
                                                })) || [],
                                                height: "100%",
                                            }}
                                        >
                                            <Column field="rowNo" title="#" width="60px" />
                                            <Column field="code" title="코드" width="100px" />
                                            <Column field="label" title="레이블" />
                                            <Column field="delete" title="삭제" width="80px" cell={(props) => (
                                                <td style={{ textAlign: 'center' }}>
                                                    <button style={{ border: 'none', background: 'transparent' }}>
                                                        <Trash2 size={16} color="#64748b" />
                                                    </button>
                                                </td>
                                            )} />
                                        </KendoGrid>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 보기(카테고리) 편집 팝업 */}
                {editingCategoryPopupOpen && (
                    <MapManagementPageModal
                        variable={editingCategoryPopupOpen}
                        onClose={() => SetEditingCategoryPopupOpen(null)}
                        onSave={handleCategorySave}
                    />
                )}
            </div>
        </MapManagementContext.Provider>
    );
};

export default MapManagementPage;
