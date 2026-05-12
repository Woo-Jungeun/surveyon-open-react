import React, { useCallback, useState, useContext, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { ColorPicker } from '@progress/kendo-react-inputs';
import { X, GripVertical, Plus, Trash2, Save, Copy, Check, Info } from 'lucide-react';
import { Popup } from '@progress/kendo-react-popup';
import '@/components/common/popup/ConditionBuilderPopup.css';
import KendoGridV2 from '@/components/kendo/KendoGridV2';
import { GridColumn as Column } from '@progress/kendo-react-grid';
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import { modalContext } from "@/components/common/Modal.jsx";
import { DpRequestPageApi } from '../DpRequestPageApi';

let nextId = 0;
function getUniqueId() {
    return `combo-item-${nextId++}`;
}

const STUB_TYPE_OPTIONS = ["base", "scale", "option", "open(숫자)", "open(문자)", "rank", "mean", "std", "median", "mode", "min", "max", "var", "sum", "rse"];

// single, multi 등 내부 타입을 표시용 타입으로 변환
const normalizeDisplayType = (type) => {
    if (!type) return 'base';
    if (type === 'single' || type === 'multi') return 'option';
    return type;
};

const LineStylePicker = ({ value, onChange, color }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [popupWidth, setPopupWidth] = useState('80px');
    const anchorRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (isOpen && anchorRef.current && !anchorRef.current.contains(e.target)) {
                if (!e.target.closest('.dp-line-picker-popup')) {
                    setIsOpen(false);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const options = ['solid', 'dashed', 'dotted', 'double', 'none'];
    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <div
                ref={anchorRef}
                onClick={(e) => {
                    e.stopPropagation();
                    if (!isOpen && anchorRef.current) {
                        setPopupWidth(`${anchorRef.current.offsetWidth}px`);
                    }
                    setIsOpen(!isOpen);
                }}
                style={{ width: '100%', height: '28px', padding: '0 8px', border: '1px solid #CBD5E1', borderRadius: '4px', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}
                title="선 종류"
            >
                {value === 'none' || !value ? (
                    <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>없음</span>
                ) : (
                    <div style={{ width: '100%', borderTopStyle: value, borderTopWidth: value === 'double' ? '3px' : '2px', borderTopColor: color || '#475569' }} />
                )}
            </div>
            <Popup
                anchor={anchorRef.current}
                show={isOpen}
                animate={false}
                style={{ zIndex: 100000 }}
                popupClass="dp-line-picker-popup"
            >
                <div style={{ background: '#fff', border: '1px solid #CBD5E1', borderRadius: '4px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', width: popupWidth, padding: '4px 0', marginTop: '2px', boxSizing: 'border-box' }}>
                    {options.map(opt => (
                        <div
                            key={opt}
                            onClick={(e) => { e.stopPropagation(); onChange(opt); setIsOpen(false); }}
                            style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: value === opt ? '#F1F5F9' : '#fff' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'}
                            onMouseLeave={(e) => e.currentTarget.style.background = value === opt ? '#F1F5F9' : '#fff'}
                        >
                            {opt === 'none' ? (
                                <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>없음</span>
                            ) : (
                                <div style={{ width: '100%', borderTopStyle: opt, borderTopWidth: opt === 'double' ? '3px' : '2px', borderTopColor: color || '#475569' }} />
                            )}
                        </div>
                    ))}
                </div>
            </Popup>
        </div>
    );
};

// --- 커스텀 헤더 셀 (조건 아이콘) ---
const ConditionHeaderCell = (props) => {
    const anchorRef = useRef(null);
    const [show, setShow] = useState(false);

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <span>{props.title}</span>
            <div
                ref={anchorRef}
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
                style={{ cursor: 'pointer', display: 'flex' }}
                onClick={(e) => e.stopPropagation()}
            >
                <Info size={14} color="#94a3b8" />
            </div>

            <Popup
                anchor={anchorRef.current}
                show={show}
                animate={false}
                popupClass="condition-tooltip-popup"
                style={{ zIndex: 100000 }} // Grid header 위에 잘 보이도록 z-index 높임
            >
                <div style={{
                    padding: '12px 16px',
                    background: '#ffffff',
                    width: 'max-content',
                    minWidth: '160px',
                    lineHeight: '1.6',
                    color: '#334155',
                    textAlign: 'left' // 헤더 중앙정렬 영향을 받지 않도록 분리
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <div style={{
                            width: '18px', height: '18px', borderRadius: '50%',
                            background: '#e2e8f0', color: '#64748b',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '11px', fontWeight: 'bold'
                        }}>i</div>
                        <span style={{ color: '#2563eb', fontWeight: '800', fontSize: '13px' }}>조건</span>
                    </div>
                    <div style={{ fontSize: '13px', letterSpacing: '-0.3px', marginLeft: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div><span style={{ fontWeight: 600 }}>• 동등 대조:</span> <span>GENDER == 1, REGION == 'A'</span></div>
                        <div><span style={{ fontWeight: 600 }}>• 비교 대조:</span> <span>AGE &gt;= 20, AGE &lt; 30</span></div>
                        <div><span style={{ fontWeight: 600 }}>• IN 연산:</span> <span>AGE_GROUP in [2, 3, 4]</span></div>
                        <div><span style={{ fontWeight: 600 }}>• 다중 조건:</span> <span>(SQ1 == 1 or SQ1 == 2) and SQ2 == 1</span></div>
                        <div><span style={{ fontWeight: 600 }}>• 순위 조건:</span> <span>Q1[1:2] in [코드] </span></div>
                    </div>
                </div>
            </Popup>
        </div>
    );
};

// --- 커스텀 헤더 셀 (형식 아이콘 및 표 가이드) ---
const TypeHeaderCell = (props) => {
    const anchorRef = useRef(null);
    const [show, setShow] = useState(false);

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <span>{props.title}</span>
            <div
                ref={anchorRef}
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
                style={{ cursor: 'pointer', display: 'flex' }}
                onClick={(e) => e.stopPropagation()}
            >
                <Info size={14} color="#94a3b8" />
            </div>

            <Popup
                anchor={anchorRef.current}
                show={show}
                animate={false}
                popupClass="type-tooltip-popup"
                style={{ zIndex: 100000 }} // Grid header 위에 잘 보이도록 z-index 높임
            >
                <div style={{
                    padding: '6px 10px',
                    background: '#ffffff',
                    width: '940px',
                    lineHeight: '1.15',
                    color: '#334155',
                    textAlign: 'left',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                        <div style={{
                            width: '18px', height: '18px', borderRadius: '50%',
                            background: '#e2e8f0', color: '#64748b',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '11px', fontWeight: 'bold'
                        }}>i</div>
                        <span style={{ color: '#2563eb', fontWeight: '800', fontSize: '13px' }}>형식</span>
                    </div>
                    <div style={{ fontSize: '8px', letterSpacing: '-0.4px', marginLeft: '2px', fontWeight: 400 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0' }}>
                            <thead>
                                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                                    <th style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0', textAlign: 'left', fontWeight: 400, color: '#475569' }}>구분</th>
                                    <th style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0', textAlign: 'left', fontWeight: 400, color: '#475569' }}>항목</th>
                                    <th style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0', textAlign: 'left', fontWeight: 400, color: '#475569' }}>설명</th>
                                    <th style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0', textAlign: 'left', fontWeight: 400, color: '#475569' }}>활용 지침</th>
                                    <th style={{ padding: '1px 3px', textAlign: 'left', fontWeight: 400, color: '#475569' }}>조건/예시</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td rowSpan="2" style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0', verticalAlign: 'top', color: '#475569' }}>표시 row</td>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>base</td>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>계산 기준 표본 수</td>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>가능하면 항상 첫 row. 해석 시 기준 모수</td>
                                    <td style={{ padding: '1px 3px' }}><code>SQ1 is not null</code></td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>option</td>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>응답 보기/구간/Top/Mid/Bot/rank 결과 row</td>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>single, multi, scale 보기, rank 등 모두 option</td>
                                    <td style={{ padding: '1px 3px' }}>단일: Q1==1 / 복수: Q1 in [1]</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td rowSpan="2" style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0', verticalAlign: 'top', color: '#475569' }}>동적 표시 row</td>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>open(숫자)</td>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>숫자형 open 문항의 실제 값을 펼치는 row</td>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>교차분석 시 distinct 숫자값을 동적으로 표시</td>
                                    <td style={{ padding: '1px 3px' }}>logic / target_var: SQ2</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>open(문자)</td>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>문자형 open 문항의 실제 값을 펼치는 row</td>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>응답 문자열을 distinct 값으로 표시. 정렬/제한 필요</td>
                                    <td style={{ padding: '1px 3px' }}>logic / target_var: BRAND</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td rowSpan="10" style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0', verticalAlign: 'top', color: '#475569' }}>통계 row</td>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>mean</td>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>평균</td>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>scale/open(숫자)에서 기본 통계로 사용</td>
                                    <td style={{ padding: '1px 3px' }}>target_var는 보통 원본 변수 ID</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>mean (100)</td>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>평균 100</td>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}></td>
                                    <td style={{ padding: '1px 3px' }}></td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>std</td>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>표준편차</td>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>평균 아래 보조 통계로 사용</td>
                                    <td style={{ padding: '1px 3px' }}>target_var: SQ2</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>median</td>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>중앙값</td>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>평균이 왜곡될 수 있는 분포에서 보조 지표</td>
                                    <td style={{ padding: '1px 3px' }}>target_var: SQ2</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>mode</td>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>최빈값</td>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>가장 많이 선택/응답된 값 확인</td>
                                    <td style={{ padding: '1px 3px' }}>target_var: SQ2</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>min</td>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>최소값</td>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>응답 범위 하한 확인</td>
                                    <td style={{ padding: '1px 3px' }}>target_var: SQ2</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>max</td>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>최대값</td>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>응답 범위 상한 확인</td>
                                    <td style={{ padding: '1px 3px' }}>target_var: SQ2</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>var</td>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>분산</td>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>특수 검증/분석용. 일반 화면에서는 필요할 때만 노출</td>
                                    <td style={{ padding: '1px 3px' }}>variance는 저장 시 var로 정규화</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>sum</td>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>합계</td>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>점수 총합/누적값 계산 시 사용</td>
                                    <td style={{ padding: '1px 3px' }}>target_var: SQ2</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>rse</td>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>상대표준오차</td>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>신뢰성 검토용. 표본이 작은 경우 참고</td>
                                    <td style={{ padding: '1px 3px' }}>target_var: SQ2</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td rowSpan="3" style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0', verticalAlign: 'top', color: '#475569' }}>내부 row</td>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>base_end</td>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>base/option block 종료 표시용 내부 row</td>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>기본 화면에서는 숨김. 계산 block 경계용</td>
                                    <td style={{ padding: '1px 3px' }}>기존 base end는 base_end로 정규화</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>score_map</td>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>보기 값 → 통계 점수 매핑</td>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>평균/std/median 등을 이 값 기준으로 계산</td>
                                    <td style={{ padding: '1px 3px' }}>예: 1점=0, 5점=100</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>stat_source</td>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>통계 계산 원천값 지정</td>
                                    <td style={{ padding: '1px 3px', borderRight: '1px solid #e2e8f0' }}>직접 수치형 변수 값을 통계에 쓸 때 사용</td>
                                    <td style={{ padding: '1px 3px' }}>고급 계산 row</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </Popup>
        </div>
    );
};

// --- 로컬 상태 기반 텍스트 편집 셀 (성능 최적화용) ---
const TextEditCell = React.memo(({ dataItem, field, onUpdate, align = 'left', placeholder = '' }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [localVal, setLocalVal] = useState(String(dataItem[field] ?? ''));

    useEffect(() => {
        if (!isEditing) setLocalVal(String(dataItem[field] ?? ''));
    }, [dataItem.id, dataItem[field], isEditing]);

    const commit = () => {
        setIsEditing(false);
        if (localVal !== String(dataItem[field] ?? '')) onUpdate(dataItem, field, localVal);
    };

    if (isEditing) {
        return (
            <td style={{ padding: '1px 4px', verticalAlign: 'middle' }}>
                <input
                    autoFocus
                    placeholder={placeholder}
                    value={localVal}
                    onChange={e => setLocalVal(e.target.value)}
                    onBlur={commit}
                    onKeyDown={e => {
                        if (e.key === 'Enter') e.target.blur();
                        if (e.key === 'Escape') { setLocalVal(String(dataItem[field] ?? '')); setIsEditing(false); }
                    }}
                    style={{ width: '100%', height: '22px', fontSize: '13px', border: '1px solid #3b82f6', outline: 'none', padding: '0 4px', borderRadius: '2px', textAlign: align }}
                />
            </td>
        );
    }

    return (
        <td
            onClick={() => setIsEditing(true)}
            style={{ padding: '1px 4px', verticalAlign: 'middle', cursor: 'text', textAlign: align }}
        >
            {localVal || (placeholder ? <span style={{ fontSize: '11px', opacity: 0.7 }}>{placeholder}</span> : '-')}
        </td>
    );
});

// --- 배경색 전용 셀 (Native Color Picker의 부드러운 드래그를 위해 컴포넌트 분리) ---
const ColorEditCell = React.memo(({ p, onUpdate }) => {
    const [localColor, setLocalColor] = useState(p.dataItem.color || '');

    // 외부에서 데이터 변경 시 로컬 상태 동기화
    useEffect(() => {
        setLocalColor(p.dataItem.color || '');
    }, [p.dataItem.color]);

    // 로컬 상태만 즉시 업데이트 (드래그 지연 방지)
    const handleChange = (e) => {
        setLocalColor(e.target.value.toUpperCase());
    };

    // 150ms 디바운스를 적용하여 그리드 전체 리렌더링 최소화
    useEffect(() => {
        const timer = setTimeout(() => {
            if (localColor !== (p.dataItem.color || '')) {
                onUpdate(p.dataIndex, 'color', localColor);
            }
        }, 150);
        return () => clearTimeout(timer);
    }, [localColor, p.dataItem.color, p.dataIndex, onUpdate]);

    return (
        <td style={{ padding: '4px', textAlign: 'center', verticalAlign: 'middle' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '2px', border: '1px solid #CBD5E1', borderRadius: '4px', background: '#fff', position: 'relative', overflow: 'hidden' }} title="색상">
                    {!localColor && (
                        <div style={{ position: 'absolute', top: 2, left: 2, right: 2, bottom: 2, background: 'linear-gradient(to top right, transparent calc(50% - 1px), #ef4444 calc(50%), transparent calc(50% + 1px))', pointerEvents: 'none', borderRadius: '2px' }} />
                    )}
                    <input
                        type="color"
                        value={(localColor || '#FFFFFF').slice(0, 7)}
                        onChange={handleChange}
                        style={{ width: '20px', height: '20px', padding: 0, border: 'none', cursor: 'pointer', opacity: localColor ? 1 : 0 }}
                    />
                </div>
                {localColor && (
                    <div
                        onClick={() => { setLocalColor(''); onUpdate(p.dataIndex, 'color', ''); }}
                        style={{ cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="색상 초기화"
                    >
                        <X size={14} color="#ef4444" />
                    </div>
                )}
            </div>
        </td>
    );
});

const openTemplateGuide = () => {
    const newWin = window.open('', '_blank', 'width=1100,height=850,scrollbars=yes,resizable=yes,top=100,left=100');
    if (!newWin) return;

    newWin.document.write(`
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>유형별 추천 탬플릿</title>
    <style>
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        body {
            font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Helvetica Neue', 'Segoe UI', sans-serif;
            background-color: #f8fafc;
            color: #334155;
            margin: 0;
            padding: 12px;
            line-height: 1.35;
        }
        .container {
            max-width: 1000px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            overflow: hidden;
            border: 1px solid #e2e8f0;
        }
        .header {
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
            padding: 10px 16px;
            color: white;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .header svg {
            width: 20px;
            height: 20px;
        }
        .header h1 {
            margin: 0;
            font-size: 15px;
            font-weight: 700;
            letter-spacing: -0.5px;
        }
        .content {
            padding: 12px;
        }
        table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            border-radius: 4px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
        }
        th, td {
            padding: 6px 10px;
            text-align: left;
            vertical-align: top;
            border-bottom: 1px solid #e2e8f0;
            border-right: 1px solid #e2e8f0;
            font-size: 12px;
        }
        th:last-child, td:last-child { border-right: none; }
        tbody tr:last-child td { border-bottom: none; }
        th {
            background: #f1f5f9;
            font-weight: 700;
            color: #475569;
            font-size: 11.5px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        tbody tr:hover { background-color: #f8fafc; }
        .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.5px;
        }
        .badge-single { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
        .badge-scale { background: #f3e8ff; color: #6b21a8; border: 1px solid #e9d5ff; }
        .badge-multi { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
        .badge-rank { background: #ffedd5; color: #9a3412; border: 1px solid #fed7aa; }
        .badge-open { background: #e0e7ff; color: #3730a3; border: 1px solid #c7d2fe; }
        
        .type-desc { font-weight: 700; color: #0f172a; font-size: 13px; }
        ul { margin: 0; padding-left: 16px; }
        li { margin-bottom: 2px; color: #475569; }
        li:last-child { margin-bottom: 0; }
        .warning-box {
            background: #fef2f2;
            border-left: 3px solid #ef4444;
            padding: 6px 10px;
            border-radius: 0 4px 4px 0;
            margin-top: 4px;
            font-size: 11.5px;
            color: #991b1b;
            line-height: 1.3;
        }
        .warning-box.yellow { background: #fffbeb; border-color: #f59e0b; color: #b45309; }
        .warning-box strong { display: block; margin-bottom: 2px; font-size: 12px; }
        .rec-item { display: flex; align-items: flex-start; gap: 6px; margin-bottom: 3px; }
        .rec-item:last-child { margin-bottom: 0; }
        .rec-item-num {
            background: #e2e8f0; color: #475569; font-size: 10px; font-weight: 800;
            min-width: 16px; height: 16px; display: flex; align-items: center; justify-content: center;
            border-radius: 3px; margin-top: 0px;
        }
        .rec-item-text { color: #1e293b; font-weight: 500; }
        .rec-item-sub { color: #64748b; font-size: 11px; margin-top: 0px; }
        code { background: #f1f5f9; padding: 1px 4px; border-radius: 3px; font-family: monospace; font-size: 11px; color: #0f172a; font-weight: 600; border: 1px solid #e2e8f0; }
        .stat-item { position: relative; padding-left: 10px; margin-bottom: 3px; color: #475569; font-size: 12px; }
        .stat-item:last-child { margin-bottom: 0; }
        .stat-item::before { content: ''; position: absolute; left: 0; top: 6px; width: 3px; height: 3px; border-radius: 50%; background: #cbd5e1; }
        .stat-item.highlight { color: #0f172a; font-weight: 600; }
        .stat-item.highlight::before { background: #3b82f6; }
        .muted { color: #94a3b8; font-style: italic; font-weight: 500; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
            <h1>유형별 추천 탬플릿</h1>
        </div>
        <div class="content">
            <table>
                <thead>
                    <tr>
                        <th style="width: 10%;">유형</th>
                        <th style="width: 16%;">의미</th>
                        <th style="width: 24%;">사용 대상</th>
                        <th style="width: 26%;">추천 row 구성</th>
                        <th style="width: 24%;">통계 row 권장</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><span class="badge badge-single">single</span></td>
                        <td class="type-desc">명목형 단일</td>
                        <td>
                            <ul>
                                <li>성별, 지역, 직업</li>
                                <li>인지 여부</li>
                                <li>구매 여부</li>
                            </ul>
                        </td>
                        <td>
                            <div class="rec-item"><div class="rec-item-num">1</div><div class="rec-item-text">Base</div></div>
                            <div class="rec-item"><div class="rec-item-num">2</div><div class="rec-item-text">보기 전체</div></div>
                            <div class="rec-item"><div class="rec-item-num">3</div><div><div class="rec-item-text">기타 / 모름 / 무응답</div><div class="rec-item-sub">※ 필요 시 하단 배치</div></div></div>
                        </td>
                        <td class="muted">사용하지 않음</td>
                    </tr>
                    <tr>
                        <td><span class="badge badge-scale">scale</span></td>
                        <td class="type-desc">만족도/선호도<br/>5점 척도</td>
                        <td></td>
                        <td>
                            <div class="rec-item"><div class="rec-item-num">1</div><div class="rec-item-text">Base</div></div>
                            <div class="rec-item"><div class="rec-item-num">2</div><div class="rec-item-text">5점 보기 전체</div></div>
                            <div class="rec-item"><div class="rec-item-num">3</div><div class="rec-item-text">Top2</div></div>
                            <div class="rec-item"><div class="rec-item-num">4</div><div class="rec-item-text">Mid</div></div>
                            <div class="rec-item"><div class="rec-item-num">5</div><div class="rec-item-text">Bot2</div></div>
                            <div class="rec-item"><div class="rec-item-num">6</div><div class="rec-item-text">평균</div></div>
                            <div class="rec-item"><div class="rec-item-num">7</div><div class="rec-item-text">표준편차</div></div>
                        </td>
                        <td>
                            <div class="stat-item highlight">mean 권장</div>
                            <div class="stat-item">std 선택</div>
                            <div class="stat-item">median은 필요 시 선택</div>
                            <div class="warning-box">
                                MIN / MAX / var는 일반 보고서에서는 비권장합니다.
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td><span class="badge badge-scale">scale</span></td>
                        <td class="type-desc">만족도/선호도<br/>7점/10점 척도</td>
                        <td>
                            <div class="warning-box yellow" style="margin-top:0;">
                                <strong style="color: #92400e;">💡 구성 팁</strong>
                                보기 전체를 모두 노출하면 표가 너무 길어질 수 있습니다.<br/><br/>
                                보고서 목적이라면 <b>Top / Mid / Bot + 평균</b> 중심 구성이 훨씬 읽기 쉽습니다.
                            </div>
                        </td>
                        <td>
                            <div class="rec-item"><div class="rec-item-num">1</div><div class="rec-item-text">Base</div></div>
                            <div class="rec-item"><div class="rec-item-num">2</div><div class="rec-item-text">보기 전체 또는 요약 중심</div></div>
                            <div class="rec-item"><div class="rec-item-num">3</div><div class="rec-item-text">Top3</div></div>
                            <div class="rec-item"><div class="rec-item-num">4</div><div class="rec-item-text">Mid</div></div>
                            <div class="rec-item"><div class="rec-item-num">5</div><div class="rec-item-text">Bot3</div></div>
                            <div class="rec-item"><div class="rec-item-num">6</div><div class="rec-item-text">평균</div></div>
                            <div class="rec-item"><div class="rec-item-num">7</div><div class="rec-item-text">표준편차</div></div>
                        </td>
                        <td></td>
                    </tr>
                    <tr>
                        <td><span class="badge badge-multi">multi</span></td>
                        <td class="type-desc">복수 응답</td>
                        <td>
                            <div class="warning-box yellow" style="margin-top:0;">
                                <strong style="color: #92400e;">⚠️ 주의</strong>
                                합계가 100%를 초과할 가능성이 있으므로, 표 제목이나 주석에 명확히 표기해야 합니다.
                            </div>
                        </td>
                        <td>
                            <div class="rec-item"><div class="rec-item-num">1</div><div class="rec-item-text">Base</div></div>
                            <div class="rec-item"><div class="rec-item-num">2</div><div class="rec-item-text">보기별 선택률</div></div>
                            <div class="rec-item"><div class="rec-item-num">3</div><div class="rec-item-text">기타</div></div>
                            <div class="rec-item"><div class="rec-item-num">4</div><div class="rec-item-text">선택 없음</div></div>
                        </td>
                        <td class="muted">사용하지 않음</td>
                    </tr>
                    <tr>
                        <td><span class="badge badge-rank">rank</span></td>
                        <td class="type-desc">순위</td>
                        <td>
                            <ul>
                                <li>순위 누적 기준별로 스터브를 분리합니다.</li>
                                <li style="margin-top: 6px;">자동 생성 변수명은 <code>문항_stub_(1)</code>, <code>문항_stub_(1+2)</code>처럼 일관되게 둡니다.</li>
                            </ul>
                        </td>
                        <td>
                            <div class="rec-item"><div class="rec-item-num">1</div><div class="rec-item-text">Base</div></div>
                            <div class="rec-item"><div class="rec-item-num">2</div><div class="rec-item-text">1순위 기준 보기 row</div></div>
                            <div class="rec-item"><div class="rec-item-num">3</div><div class="rec-item-text">1+2순위 기준 보기 row</div></div>
                            <div class="rec-item"><div class="rec-item-num">4</div><div class="rec-item-text">1+2+3순위 기준 보기 row</div></div>
                        </td>
                        <td></td>
                    </tr>
                    <tr>
                        <td><span class="badge badge-open">open(숫자)</span></td>
                        <td class="type-desc">숫자 개방형</td>
                        <td></td>
                        <td>
                            <div class="rec-item"><div class="rec-item-num">1</div><div class="rec-item-text">Base</div></div>
                            <div class="rec-item"><div class="rec-item-num">2</div><div class="rec-item-text">평균</div></div>
                            <div class="rec-item"><div class="rec-item-num">3</div><div class="rec-item-text">중앙값</div></div>
                            <div class="rec-item"><div class="rec-item-num">4</div><div class="rec-item-text">표준편차</div></div>
                            <div class="rec-item"><div class="rec-item-num">5</div><div class="rec-item-text">최솟값</div></div>
                            <div class="rec-item"><div class="rec-item-num">6</div><div class="rec-item-text">최댓값</div></div>
                        </td>
                        <td>
                            <div class="stat-item highlight">mean 권장</div>
                            <div class="stat-item highlight">median 권장</div>
                            <div class="stat-item highlight">std 권장</div>
                            <div class="stat-item highlight">min / max 검수용 권장</div>
                            <div class="stat-item">var는 선택</div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>
    `);
    newWin.document.close();
};

const DpRequestStubSettingModal = ({ show, onClose, variables = [], rowData, onApply }) => {
    const auth = useSelector(state => state.auth);
    const loadingSpinner = useContext(loadingSpinnerContext);
    const modal = useContext(modalContext);
    const { saveRecodedSet } = DpRequestPageApi();

    const getInitialCategories = (rData) => {
        if (!rData || !rData.info || rData.info.length === 0) return [];
        const isFormatted = rData.info.some(opt => opt.type !== undefined || opt.logic !== undefined || opt.condition !== undefined);
        if (isFormatted) {
            return rData.info.map(opt => ({
                ...opt,
                id: opt.id || getUniqueId(),
                logic: opt.logic !== undefined ? opt.logic : opt.condition,
                value: opt.value !== undefined ? opt.value : opt.val,
                target_var: opt.target_var !== undefined ? opt.target_var : opt.targetVar,
            }));
        } else {
            return rData.info.map((opt, i) => {
                const val = opt.val !== undefined ? opt.val : (opt.value !== undefined ? opt.value : (opt.row_id !== undefined ? opt.row_id : i + 1));
                return {
                    ...opt,
                    id: getUniqueId(),
                    label: opt.label ? (String(opt.label).startsWith('_') ? opt.label : `_${opt.label}`) : `_${val}`,
                    type: 'single',
                    logic: `${rData.recoded_var_id || rData.source_var_id} in [${val}]`,
                    target_var: '',
                    value: val
                };
            });
        }
    };

    const [categories, setCategories] = useState(() => getInitialCategories(rowData));
    const [isDetailSetting, setIsDetailSetting] = useState(false);

    useEffect(() => {
        if (show) {
            setIsDetailSetting(false);
        }
        // 컴포넌트가 언마운트되지 않고 props만 바뀔 경우를 대비한 동기화
        if (show && rowData) {
            setCategories(getInitialCategories(rowData));
        }
    }, [show, rowData]);

    const handleCategoryCellUpdate = useCallback((dataIndex, field, value) => {
        setCategories(prev => {
            const next = [...prev];
            next[dataIndex] = { ...next[dataIndex], [field]: value };
            return next;
        });
    }, []);

    const renderColorCell = useCallback((p) => {
        return <ColorEditCell p={p} onUpdate={handleCategoryCellUpdate} />;
    }, [handleCategoryCellUpdate]);

    // 적용 이벤트
    const handleGenerate = () => {
        if (onApply) {
            onApply(categories);
        }
        onClose(); // 처리 후 모달 닫기
    };

    if (!show) return null;

    return (
        <div className="advanced-filter-overlay-cbp theme-blue">
            <div className="advanced-filter-content-cbp" onClick={(e) => e.stopPropagation()} style={{ width: '1100px', height: '700px' }}>

                {/* 헤더 영역 */}
                <div className="filter-popup-header-cbp">
                    <div className="header-title-cbp" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ margin: 0 }}>표 상세설정</h3>
                        <div
                            title="유형별 추천 탬플릿"
                            onClick={openTemplateGuide}
                            style={{
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: '24px', height: '24px', borderRadius: '50%', background: '#eff6ff', border: '1px solid #bfdbfe'
                            }}
                        >
                            <Info size={14} color="#3b82f6" />
                        </div>
                    </div>
                    <div className="header-actions-cbp">
                        <button onClick={onClose} className="close-btn-cbp"><X size={20} /></button>
                    </div>
                </div>

                {/* 컨텐츠 영역 */}
                <div className="filter-popup-container-cbp" style={{ display: 'flex', flexDirection: 'column', padding: '16px', gap: '16px', background: '#f0f7ff', boxSizing: 'border-box', overflowY: 'auto' }}>

                    {/* 상단 폼 영역 */}
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569', minWidth: '60px' }}>변수</span>
                            <input type="text" value={rowData?.recoded_var_id || ''} disabled style={{ flex: 1, height: '32px', padding: '0 10px', border: '1px solid #e2e8f0', borderRadius: '4px', background: '#f8fafc', color: '#64748b', fontSize: '13px' }} />
                        </div>
                        <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569', minWidth: '30px' }}>라벨</span>
                            <input type="text" value={rowData?.var_label || ''} disabled style={{ flex: 1, height: '32px', padding: '0 10px', border: '1px solid #e2e8f0', borderRadius: '4px', background: '#f8fafc', color: '#64748b', fontSize: '13px' }} />
                        </div>
                        <div style={{ flex: 1.5, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>배너</span>
                            <input type="text" value={Array.isArray(rowData?.x_info) ? rowData.x_info.join(', ') : (rowData?.x_info || '')} disabled style={{ flex: 1, height: '32px', padding: '0 10px', border: '1px solid #e2e8f0', borderRadius: '4px', background: '#f8fafc', color: '#64748b', fontSize: '13px' }} />
                        </div>
                    </div>

                    {/* 하단 그리드 영역 */}
                    <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                        {/* 그리드 옵션 헤더 */}
                        <div style={{ padding: '10px 16px', borderBottom: '1px solid #e2e8f0', background: '#fafafa', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setIsDetailSetting(!isDetailSetting)}>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>상세 설정</span>
                                <div style={{ width: '32px', height: '18px', borderRadius: '10px', background: isDetailSetting ? '#3b82f6' : '#cbd5e1', position: 'relative', transition: 'background 0.2s', display: 'flex', alignItems: 'center', padding: '2px' }}>
                                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#fff', position: 'absolute', left: isDetailSetting ? 'calc(100% - 16px)' : '2px', transition: 'left 0.2s' }} />
                                </div>
                            </div>
                        </div>

                        {/* 테이블 영역 */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                            <KendoGridV2
                                data={categories}
                                onDataChange={setCategories}
                                onRowClick={(e) => {
                                    // Row 클릭 시 inEdit 처리 제거 (셀 단위 TextEditCell로 로컬 상태 편집)
                                }}
                                reorderable={true}
                                addable={true}
                                copyable={true}
                                deletable={true}
                                deletePos="start"
                                showNo
                                newRowTemplate={{ id: getUniqueId(), label: '', type: 'base', logic: '', target_var: '', value: '' }}
                                style={{ flex: 1, height: '100%', width: '100%' }}
                                scrollable="scrollable"
                            >
                                {isDetailSetting && <Column field="label2" title="대분류" width="150px" cell={(p) => <TextEditCell dataItem={p.dataItem} field="label2" onUpdate={(item, f, v) => handleCategoryCellUpdate(p.dataIndex, f, v)} />} />}
                                {isDetailSetting && <Column field="label3" title="중분류" width="150px" cell={(p) => <TextEditCell dataItem={p.dataItem} field="label3" onUpdate={(item, f, v) => handleCategoryCellUpdate(p.dataIndex, f, v)} />} />}
                                <Column field="label" title="소분류" width="150px" cell={(p) => <TextEditCell dataItem={p.dataItem} field="label" onUpdate={(item, f, v) => handleCategoryCellUpdate(p.dataIndex, f, v)} />} />
                                <Column
                                    field="type"
                                    title="형식"
                                    width="150px"
                                    headerCell={TypeHeaderCell}
                                    headerClassName="k-text-center"
                                    cell={(p) => (
                                        <td style={{ padding: '4px' }}>
                                            <DropDownList
                                                className="k-dropdown-solid dp-mini-dropdown"
                                                popupSettings={{ className: "dp-mini-dropdown-popup" }}
                                                data={STUB_TYPE_OPTIONS}
                                                value={normalizeDisplayType(p.dataItem.type)}
                                                onChange={(e) => handleCategoryCellUpdate(p.dataIndex, 'type', e.value)}
                                                style={{ width: '100%', height: '28px', fontSize: '13px', background: '#fff' }}
                                            />
                                        </td>
                                    )}
                                />
                                <Column field="logic" title="조건" width="250px" headerCell={ConditionHeaderCell} headerClassName="k-text-center" cell={(p) => <TextEditCell dataItem={p.dataItem} field="logic" onUpdate={(item, f, v) => handleCategoryCellUpdate(p.dataIndex, f, v)} />} />
                                <Column field="target_var" title="대상 변수" width="150px" cell={(p) => {
                                    const STAT_TYPES_FOR_TARGET = ['mean', 'std', 'median', 'mode', 'min', 'max', 'var'];
                                    if (!STAT_TYPES_FOR_TARGET.includes(p.dataItem.type)) {
                                        return <td style={{ padding: '1px 4px', verticalAlign: 'middle', backgroundColor: '#eaedf1', color: '#94a3b8', textAlign: 'center', userSelect: 'none' }}>-</td>;
                                    }
                                    return <TextEditCell dataItem={p.dataItem} field="target_var" onUpdate={(item, f, v) => handleCategoryCellUpdate(p.dataIndex, f, v)} />;
                                }} />
                                <Column field="value" title="값" width="100px" headerClassName="k-text-center" className="k-text-center" cell={(p) => <TextEditCell dataItem={p.dataItem} field="value" align="center" onUpdate={(item, f, v) => handleCategoryCellUpdate(p.dataIndex, f, v)} />} />

                                {isDetailSetting && <Column field="prefix" title="앞문자" width="120px" cell={(p) => <TextEditCell dataItem={p.dataItem} field="prefix" onUpdate={(item, f, v) => handleCategoryCellUpdate(p.dataIndex, f, v)} />} />}
                                {isDetailSetting && <Column field="postfix" title="뒷문자" width="120px" cell={(p) => <TextEditCell dataItem={p.dataItem} field="postfix" onUpdate={(item, f, v) => handleCategoryCellUpdate(p.dataIndex, f, v)} />} />}
                                {isDetailSetting && <Column field="round" title="소수점" width="100px" headerClassName="k-text-center" cell={(p) => <TextEditCell dataItem={p.dataItem} field="round" align="center" onUpdate={(item, f, v) => handleCategoryCellUpdate(p.dataIndex, f, v)} />} />}
                                {isDetailSetting && <Column field="hide" title="숨기기" width="100px" headerClassName="k-text-center" cell={(p) => (
                                    <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '4px' }}>
                                        <div
                                            onClick={() => handleCategoryCellUpdate(p.dataIndex, 'hide', !p.dataItem.hide)}
                                            style={{
                                                width: '16px', height: '16px', border: '1px solid #94a3b8', borderRadius: '4px',
                                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                cursor: 'pointer', background: p.dataItem.hide ? '#2563eb' : '#fff', margin: '0 auto'
                                            }}
                                        >
                                            {p.dataItem.hide && <Check size={12} color="#fff" strokeWidth={3} />}
                                        </div>
                                    </td>
                                )} />}
                                {isDetailSetting && <Column field="line" title="구분선" width="100px" cell={(p) => (
                                    <td style={{ padding: '4px', overflow: 'visible' }}>
                                        <LineStylePicker
                                            value={!p.dataItem.line ? "none" : p.dataItem.line}
                                            onChange={(val) => handleCategoryCellUpdate(p.dataIndex, 'line', val === "none" ? "" : val)}
                                        />
                                    </td>
                                )} />}
                                {isDetailSetting && <Column field="color" title="배경색" width="100px" cell={renderColorCell} />}
                            </KendoGridV2>
                        </div>
                    </div>
                </div>

                {/* 풋터 영역 */}
                <div className="filter-popup-footer-cbp">
                    <div className="footer-right-cbp">
                        <button className="btn-cancel-cbp" onClick={onClose}>취소</button>
                        <button className="btn-apply-cbp" onClick={handleGenerate} disabled={categories.length === 0} style={{ opacity: categories.length === 0 ? 0.5 : 1 }}>저장</button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default DpRequestStubSettingModal;
