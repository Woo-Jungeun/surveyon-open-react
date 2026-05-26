import React, { useCallback, useState, useContext, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { ColorPicker } from '@progress/kendo-react-inputs';
import { X, GripVertical, Plus, Trash2, Save, Copy, Check, Info, ChevronDown, ChevronUp } from 'lucide-react';
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

const STUB_TYPE_OPTIONS = ["base", "scale", "option", "open(숫자)", "open(문자)", "rank", "mean", "std", "median", "mode", "min", "max", "var", "sum", "rse", "factor"];

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

const ConditionHeaderCell = (props) => {
    const handleOpenHelp = (e) => {
        e.stopPropagation();
        const helpWin = window.open('', '_blank', 'width=800,height=700,scrollbars=yes,resizable=yes');
        if (helpWin) {
            helpWin.document.write(`
                <!DOCTYPE html>
                <html lang="ko">
                <head>
                    <meta charset="UTF-8">
                    <title>연산자 도움말</title>
                    <style>
                        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
                        * { box-sizing: border-box; }
                        body {
                            font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif;
                            margin: 0;
                            padding: 0;
                            background-color: #ffffff;
                            color: #1e293b;
                        }
                        .header {
                            display: flex;
                            align-items: center;
                            padding: 10px 16px;
                            border-bottom: 1px solid #e2e8f0;
                            background-color: #ffffff;
                            position: sticky;
                            top: 0;
                            z-index: 10;
                        }
                        .header-title-container {
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        }
                        .header-icon {
                            width: 20px;
                            height: 20px;
                            background-color: #0f172a;
                            color: #ffffff;
                            border-radius: 50%;
                            display: inline-flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 12px;
                            font-weight: 700;
                        }
                        .header-title {
                            font-size: 15px;
                            font-weight: 700;
                            color: #0f172a;
                        }

                        .content {
                            padding: 12px 16px;
                            display: flex;
                            flex-direction: column;
                            gap: 10px;
                        }
                        .section-container {
                            border-radius: 6px;
                            padding: 8px 12px;
                            border: 1px solid #e2e8f0;
                        }
                        .section-compare {
                            border-color: #dbeafe;
                            background-color: #eff6ff;
                        }
                        .section-include {
                            border-color: #f3e8ff;
                            background-color: #faf5ff;
                        }
                        .section-logic {
                            border-color: #dcfce7;
                            background-color: #f0fdf4;
                        }
                        .section-range {
                            border-color: #fef3c7;
                            background-color: #fffbeb;
                        }
                        .section-group {
                            border-color: #fee2e2;
                            background-color: #fef2f2;
                        }
                        .section-rank {
                            border-color: #e0f2fe;
                            background-color: #f0f9ff;
                        }

                        .section-header {
                            display: flex;
                            align-items: center;
                            gap: 6px;
                            margin-bottom: 6px;
                        }
                        .section-badge {
                            display: inline-block;
                            padding: 1px 6px;
                            border-radius: 4px;
                            font-size: 11px;
                            font-weight: 700;
                        }
                        .badge-compare { background-color: #dbeafe; color: #2563eb; border: 1px solid #bfdbfe; }
                        .badge-include { background-color: #f3e8ff; color: #7c3aed; border: 1px solid #e9d5ff; }
                        .badge-logic { background-color: #dcfce7; color: #16a34a; border: 1px solid #bbf7d0; }
                        .badge-range { background-color: #fef3c7; color: #d97706; border: 1px solid #fde68a; }
                        .badge-group { background-color: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; }
                        .badge-rank { background-color: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd; }

                        .section-desc {
                            font-size: 11px;
                            color: #64748b;
                            font-weight: 500;
                        }

                        .grid-3 {
                            display: grid;
                            grid-template-columns: repeat(3, 1fr);
                            gap: 8px;
                        }
                        .grid-2 {
                            display: grid;
                            grid-template-columns: repeat(2, 1fr);
                            gap: 8px;
                        }

                        .box {
                            background-color: #ffffff;
                            border: 1px solid #e2e8f0;
                            border-radius: 6px;
                            padding: 6px 10px;
                            display: flex;
                            align-items: center;
                        }
                        .section-compare .box { border-color: #bfdbfe; }
                        .section-include .box { border-color: #e9d5ff; }
                        .section-logic .box { border-color: #bbf7d0; }
                        .section-range .box { border-color: #fde68a; }
                        .section-group .box { border-color: #fca5a5; }
                        .section-rank .box { border-color: #bae6fd; }

                        .box-vertical {
                            flex-direction: column;
                            align-items: flex-start;
                            gap: 3px;
                        }

                        .box-top-row {
                            display: flex;
                            align-items: center;
                            width: 100%;
                        }

                        .operator {
                            font-family: monospace;
                            font-size: 13px;
                            font-weight: 700;
                            padding-right: 8px;
                            margin-right: 8px;
                            border-right: 1px solid #e2e8f0;
                            min-width: 36px;
                            text-align: center;
                            display: inline-block;
                        }
                        .section-compare .operator { color: #2563eb; min-width: 26px; }
                        .section-include .operator { color: #7c3aed; }
                        .section-logic .operator { color: #16a34a; }
                        .section-range .operator { color: #d97706; }
                        .section-group .operator { color: #dc2626; min-width: 20px; }
                        .section-rank .operator { color: #0284c7; min-width: auto; border-right: none; padding-right: 0; margin-right: 0; }

                        .operator-desc {
                            font-size: 12px;
                            color: #334155;
                            font-weight: 500;
                        }

                        .example {
                            font-family: monospace;
                            font-size: 11px;
                            color: #64748b;
                            width: 100%;
                            border-top: 1px dashed #f1f5f9;
                            padding-top: 2px;
                            margin-top: 1px;
                            word-break: break-all;
                        }


                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="header-title-container">
                            <div class="header-icon">?</div>
                            <div class="header-title">연산자 도움말</div>
                        </div>

                    </div>

                    <div class="content">
                        <!-- 비교 -->
                        <div class="section-container section-compare">
                            <div class="section-header">
                                <span class="section-badge badge-compare">비교</span>
                                <span class="section-desc">값 크기·일치 비교</span>
                            </div>
                            <div class="grid-3">
                                <div class="box">
                                    <span class="operator">==</span>
                                    <span class="operator-desc">같음</span>
                                </div>
                                <div class="box">
                                    <span class="operator">!=</span>
                                    <span class="operator-desc">같지 않음</span>
                                </div>
                                <div class="box">
                                    <span class="operator">&gt;</span>
                                    <span class="operator-desc">초과</span>
                                </div>
                                <div class="box">
                                    <span class="operator">&gt;=</span>
                                    <span class="operator-desc">이상</span>
                                </div>
                                <div class="box">
                                    <span class="operator">&lt;</span>
                                    <span class="operator-desc">미만</span>
                                </div>
                                <div class="box">
                                    <span class="operator">&lt;=</span>
                                    <span class="operator-desc">이하</span>
                                </div>
                            </div>
                        </div>

                        <!-- 포함 -->
                        <div class="section-container section-include">
                            <div class="section-header">
                                <span class="section-badge badge-include">포함</span>
                                <span class="section-desc">리스트 안 값의 포함 여부</span>
                            </div>
                            <div class="grid-2">
                                <div class="box box-vertical">
                                    <div class="box-top-row">
                                        <span class="operator">in</span>
                                        <span class="operator-desc">포함</span>
                                    </div>
                                    <div class="example">region in [11,21,31]</div>
                                </div>
                                <div class="box box-vertical">
                                    <div class="box-top-row">
                                        <span class="operator">not in</span>
                                        <span class="operator-desc">미포함</span>
                                    </div>
                                    <div class="example">sq3 not in [98,99]</div>
                                </div>
                            </div>
                        </div>

                        <!-- 논리 -->
                        <div class="section-container section-logic">
                            <div class="section-header">
                                <span class="section-badge badge-logic">논리</span>
                                <span class="section-desc">여러 조건 연결</span>
                            </div>
                            <div class="grid-2">
                                <div class="box box-vertical">
                                    <div class="box-top-row">
                                        <span class="operator">and</span>
                                        <span class="operator-desc">그리고 (모두 만족)</span>
                                    </div>
                                    <div class="example">age &gt;= 20 and age &lt; 40</div>
                                </div>
                                <div class="box box-vertical">
                                    <div class="box-top-row">
                                        <span class="operator">or</span>
                                        <span class="operator-desc">또는 (하나 이상 만족)</span>
                                    </div>
                                    <div class="example">gender == 1 or gender == 2</div>
                                </div>
                            </div>
                        </div>

                        <!-- 범위 함수 -->
                        <div class="section-container section-range">
                            <div class="section-header">
                                <span class="section-badge badge-range">범위 함수</span>
                                <span class="section-desc">다중응답 범위에 사용</span>
                            </div>
                            <div class="grid-3">
                                <div class="box box-vertical">
                                    <div class="box-top-row">
                                        <span class="operator">any</span>
                                        <span class="operator-desc">하나라도 만족</span>
                                    </div>
                                    <div class="example">any(q10:q20) in [1]</div>
                                </div>
                                <div class="box box-vertical">
                                    <div class="box-top-row">
                                        <span class="operator">all</span>
                                        <span class="operator-desc">전부 만족</span>
                                    </div>
                                    <div class="example">all(q10:q20) in [1]</div>
                                </div>
                                <div class="box box-vertical">
                                    <div class="box-top-row">
                                        <span class="operator">none</span>
                                        <span class="operator-desc">모두 불만족</span>
                                    </div>
                                    <div class="example">none(q10:q20) in [1]</div>
                                </div>
                            </div>
                        </div>

                        <!-- 그룹핑 -->
                        <div class="section-container section-group">
                            <div class="section-header">
                                <span class="section-badge badge-group">그룹핑</span>
                                <span class="section-desc">조건 우선순위 지정</span>
                            </div>
                            <div class="grid-2">
                                <div class="box box-vertical">
                                    <div class="box-top-row">
                                        <span class="operator">(</span>
                                        <span class="operator-desc">그룹 시작</span>
                                    </div>
                                    <div class="example">(a == 1 or b == 1) and c == 1</div>
                                </div>
                                <div class="box box-vertical">
                                    <div class="box-top-row">
                                        <span class="operator">)</span>
                                        <span class="operator-desc">그룹 종료</span>
                                    </div>
                                    <div class="example">(a == 1 or b == 1) and c == 1</div>
                                </div>
                            </div>
                        </div>

                        <!-- 순위 -->
                        <div class="section-container section-rank">
                            <div class="section-header">
                                <span class="section-badge badge-rank">순위</span>
                                <span class="section-desc">순위 문항의 특정 순위 코드 포함</span>
                            </div>
                            <div class="grid-2">
                                <div class="box box-vertical">
                                    <div class="box-top-row">
                                        <span class="operator" style="border-right: 1px solid #e2e8f0; padding-right: 12px; margin-right: 12px;">[순위지정] in [코드]</span>
                                        <span class="operator-desc">지정 순위에 포함된 코드</span>
                                    </div>
                                    <div class="example">Q1 [1:2] in [코드]</div>
                                </div>
                                <div class="box box-vertical">
                                    <div class="box-top-row">
                                        <span class="operator" style="border-right: 1px solid #e2e8f0; padding-right: 12px; margin-right: 12px;">형식 설명</span>
                                        <span class="operator-desc">[순위지정] = 1:2 / [코드] = 응답 코드값</span>
                                    </div>
                                    <div class="example" style="border-top: none; padding-top: 0; margin-top: 0; color: transparent; user-select: none;">-</div>
                                </div>
                            </div>
                        </div>
                    </div>


                </body>
                </html>
            `);
            helpWin.document.close();
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <span>{props.title}</span>
            <div
                onClick={handleOpenHelp}
                style={{ cursor: 'pointer', display: 'flex' }}
                title="도움말 새창으로 열기"
            >
                <Info size={14} color="#94a3b8" />
            </div>
        </div>
    );
};

// --- 커스텀 헤더 셀 (형식 아이콘 및 표 가이드) ---
const TypeHeaderCell = (props) => {
    const handleOpenHelp = (e) => {
        e.stopPropagation();
        const helpWin = window.open('', '_blank', 'width=1150,height=950,scrollbars=yes,resizable=yes');
        if (helpWin) {
            helpWin.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>형식 설명 도움말</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; padding: 24px; color: #334155; line-height: 1.6; background-color: #f8fafc; }
                        .container { max-width: 1100px; margin: 0 auto; background: #fff; padding: 24px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
                        h1 { font-size: 20px; font-weight: 700; color: #1e293b; margin-top: 0; margin-bottom: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; display: flex; align-items: center; gap: 8px; }
                        .badge { width: 24px; height: 24px; border-radius: 50%; background: #eff6ff; color: #3b82f6; border: 1px solid #bfdbfe; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; margin-right: 8px; }
                        table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; margin-top: 12px; font-size: 13px; }
                        th, td { padding: 10px 12px; border: 1px solid #e2e8f0; text-align: left; }
                        th { background: #f1f5f9; font-weight: 600; color: #475569; }
                        tr:nth-child(even) { background-color: #f8fafc; }
                        .type-name { font-weight: 600; color: #2563eb; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1><span class="badge">i</span>형식 도움말 및 가이드</h1>
                        <table>
                            <thead>
                                <tr>
                                    <th>구분</th>
                                    <th>항목</th>
                                    <th>설명</th>
                                    <th>활용 지침</th>
                                    <th>조건/예시</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td rowspan="2" style="color: #475569; font-weight: 500;">표시 row</td>
                                    <td class="type-name">base</td>
                                    <td>계산 기준 표본 수</td>
                                    <td>가능하면 항상 첫 row. 해석 시 기준 모수</td>
                                    <td>SQ1 is not null</td>
                                </tr>
                                <tr>
                                    <td class="type-name">option</td>
                                    <td>응답 보기/구간/Top/Mid/Bot/rank 결과 row</td>
                                    <td>single, multi, scale 보기, rank 등 모두 option</td>
                                    <td>단일: Q1 == 1<br>복수·multi·rank: Q1 in [1], AQ5[1:2] in [1]</td>
                                </tr>
                                <tr>
                                    <td rowspan="2" style="color: #475569; font-weight: 500;">동적 표시 row</td>
                                    <td class="type-name">open(숫자)</td>
                                    <td>숫자형 open 문항의 실제 값을 펼치는 row</td>
                                    <td>교차분석 시 distinct 숫자값을 동적으로 표시</td>
                                    <td>조건 또는 대상변수: SQ2</td>
                                </tr>
                                <tr>
                                    <td class="type-name">open(문자)</td>
                                    <td>문자형 open 문항의 실제 값을 펼치는 row</td>
                                    <td>응답 문자열을 distinct 값으로 표시. 정렬/제한 필요</td>
                                    <td>조건 또는 대상변수: BRAND_NAME</td>
                                </tr>
                                <tr>
                                    <td rowspan="10" style="color: #475569; font-weight: 500;">통계 row</td>
                                    <td class="type-name">mean</td>
                                    <td>평균</td>
                                    <td>scale/open(숫자)에서 기본 통계로 사용</td>
                                    <td>대상변수는 보통 원본 변수 ID</td>
                                </tr>
                                <tr>
                                    <td class="type-name">mean (100)</td>
                                    <td>평균 100</td>
                                    <td>100점 만점 환산 평균 (설문 응답값을 100점 만점으로 스케일링하여 평균 계산)</td>
                                    <td>대상변수: Q2</td>
                                </tr>
                                <tr>
                                    <td class="type-name">std</td>
                                    <td>표준편차</td>
                                    <td>평균 아래 보조 통계로 사용</td>
                                    <td>대상변수: SQ2</td>
                                </tr>
                                <tr>
                                    <td class="type-name">median</td>
                                    <td>중앙값</td>
                                    <td>평균이 왜곡될 수 있는 분포에서 보조 지표</td>
                                    <td>대상변수: SQ2</td>
                                </tr>
                                <tr>
                                    <td class="type-name">mode</td>
                                    <td>최빈값</td>
                                    <td>가장 많이 선택/응답된 값 확인</td>
                                    <td>대상변수: SQ2</td>
                                </tr>
                                <tr>
                                    <td class="type-name">min</td>
                                    <td>최소값</td>
                                    <td>응답 범위 하한 확인</td>
                                    <td>대상변수: SQ2</td>
                                </tr>
                                <tr>
                                    <td class="type-name">max</td>
                                    <td>최대값</td>
                                    <td>응답 범위 상한 확인</td>
                                    <td>대상변수: SQ2</td>
                                </tr>
                                <tr>
                                    <td class="type-name">var</td>
                                    <td>분산</td>
                                    <td>특수 검증/분석용. 일반 화면에서는 필요할 때만 노출</td>
                                    <td>variance는 저장 시 var로 정규화</td>
                                </tr>
                                <tr>
                                    <td class="type-name">sum</td>
                                    <td>합계</td>
                                    <td>점수 총합/누적값 계산 시 사용</td>
                                    <td>대상변수: SQ2</td>
                                </tr>
                                <tr>
                                    <td class="type-name">rse</td>
                                    <td>상대표준오차</td>
                                    <td>신뢰성 검토용. 표본이 작은 경우 참고</td>
                                    <td>대상변수: SQ2</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </body>
                </html>
            `);
            helpWin.document.close();
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <span>{props.title}</span>
            <div
                onClick={handleOpenHelp}
                style={{ cursor: 'pointer', display: 'flex' }}
                title="도움말 새창으로 열기"
            >
                <Info size={14} color="#94a3b8" />
            </div>
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
    <title>표 상세설정 도움말</title>
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

        <!-- 형식 상세 안내 추가 -->
        <div class="header" style="margin-top: 24px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
            <h1>형식 상세 정보</h1>
        </div>
        <div class="content">
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; font-size: 13px; text-align: left;">
                <thead>
                    <tr style="background: #f1f5f9; border-bottom: 1px solid #e2e8f0;">
                        <th style="padding: 8px 12px; border-right: 1px solid #e2e8f0; font-weight: 600; color: #475569;">구분</th>
                        <th style="padding: 8px 12px; border-right: 1px solid #e2e8f0; font-weight: 600; color: #475569;">항목</th>
                        <th style="padding: 8px 12px; border-right: 1px solid #e2e8f0; font-weight: 600; color: #475569;">설명</th>
                        <th style="padding: 8px 12px; border-right: 1px solid #e2e8f0; font-weight: 600; color: #475569;">활용 지침</th>
                        <th style="padding: 8px 12px; font-weight: 600; color: #475569;">조건/예시</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td rowspan="2" style="padding: 8px 12px; border-right: 1px solid #e2e8f0; vertical-align: top; color: #475569;">표시 row</td>
                        <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0; font-weight: 600; color: #2563eb;">base</td>
                        <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0;">계산 기준 표본 수</td>
                        <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0;">가능하면 항상 첫 row. 해석 시 기준 모수</td>
                        <td style="padding: 8px 12px; font-family: monospace;">SQ1 is not null</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0; font-weight: 600; color: #2563eb;">option</td>
                        <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0;">응답 보기/구간/Top/Mid/Bot/rank 결과 row</td>
                        <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0;">single, multi, scale 보기, rank 등 모두 option</td>
                        <td style="padding: 8px 12px; font-family: monospace;">단일: Q1 == 1<br />복수·multi·rank: Q1 in [1], AQ5[1:2] in [1]</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td rowspan="2" style="padding: 8px 12px; border-right: 1px solid #e2e8f0; vertical-align: top; color: #475569;">동적 표시 row</td>
                        <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0; font-weight: 600; color: #2563eb;">open(숫자)</td>
                        <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0;">숫자형 open 문항의 실제 값을 펼치는 row</td>
                        <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0;">교차분석 시 distinct 숫자값을 동적으로 표시</td>
                        <td style="padding: 8px 12px;">조건 또는 대상변수: SQ2</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0; font-weight: 600; color: #2563eb;">open(문자)</td>
                        <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0;">문자형 open 문항의 실제 값을 펼치는 row</td>
                        <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0;">응답 문자열을 distinct 값으로 표시. 정렬/제한 필요</td>
                        <td style="padding: 8px 12px;">조건 또는 대상변수: BRAND_NAME</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td rowspan="10" style="padding: 8px 12px; border-right: 1px solid #e2e8f0; vertical-align: top; color: #475569;">통계 row</td>
                        <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0; font-weight: 600; color: #2563eb;">mean</td>
                        <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0;">평균</td>
                        <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0;">scale/open(숫자)에서 기본 통계로 사용</td>
                        <td style="padding: 8px 12px;">대상변수는 보통 원본 변수 ID</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0; font-weight: 600; color: #2563eb;">mean (100)</td>
                        <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0;">평균 100</td>
                        <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0;"></td>
                        <td style="padding: 8px 12px;"></td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0; font-weight: 600; color: #2563eb;">std</td>
                        <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0;">표준편차</td>
                        <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0;">평균 아래 보조 통계로 사용</td>
                        <td style="padding: 8px 12px;">대상변수: SQ2</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0; font-weight: 600; color: #2563eb;">median</td>
                        <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0;">중앙값</td>
                        <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0;">평균이 왜곡될 수 있는 분포에서 보조 지표</td>
                        <td style="padding: 8px 12px;">대상변수: SQ2</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0; font-weight: 600; color: #2563eb;">mode</td>
                        <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0;">최빈값</td>
                        <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0;">가장 많이 선택/응답된 값 확인</td>
                        <td style="padding: 8px 12px;">대상변수: SQ2</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0; font-weight: 600; color: #2563eb;">min</td>
                        <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0;">최소값</td>
                        <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0;">응답 범위 하한 확인</td>
                        <td style="padding: 8px 12px;">대상변수: SQ2</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0; font-weight: 600; color: #2563eb;">max</td>
                        <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0;">최대값</td>
                        <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0;">응답 범위 상한 확인</td>
                        <td style="padding: 8px 12px;">대상변수: SQ2</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0; font-weight: 600; color: #2563eb;">var</td>
                        <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0;">분산</td>
                        <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0;">특수 검증/분석용. 일반 화면에서는 필요할 때만 노출</td>
                        <td style="padding: 8px 12px;">variance는 저장 시 var로 정규화</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0; font-weight: 600; color: #2563eb;">sum</td>
                        <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0;">합계</td>
                        <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0;">점수 총합/누적값 계산 시 사용</td>
                        <td style="padding: 8px 12px;">대상변수: SQ2</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0; font-weight: 600; color: #2563eb;">rse</td>
                        <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0;">상대표준오차</td>
                        <td style="padding: 8px 12px; border-right: 1px solid #e2e8f0;">신뢰성 검토용. 표본이 작은 경우 참고</td>
                        <td style="padding: 8px 12px;">대상변수: SQ2</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- 조건 작성 가이드 추가 -->
        <div class="header" style="margin-top: 24px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
            <h1>스터브 조건 도움말</h1>
        </div>
        <div class="content">
            <div style="display: flex; flex-direction: column; gap: 10px;">

                <!-- 비교 -->
                <div style="border-radius: 6px; padding: 8px 12px; border: 1px solid #dbeafe; background-color: #eff6ff;">
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                        <span style="display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 11px; font-weight: 700; background-color: #dbeafe; color: #2563eb; border: 1px solid #bfdbfe;">비교</span>
                        <span style="font-size: 11px; color: #64748b; font-weight: 500;">값 크기·일치 비교</span>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                        <div style="background-color: #ffffff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 6px 10px; display: flex; align-items: center;">
                            <span style="font-family: monospace; font-size: 13px; font-weight: 700; color: #2563eb; padding-right: 8px; margin-right: 8px; border-right: 1px solid #e2e8f0; min-width: 26px; text-align: center;">\u003d\u003d</span>
                            <span style="font-size: 12px; color: #334155; font-weight: 500;">같음</span>
                        </div>
                        <div style="background-color: #ffffff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 6px 10px; display: flex; align-items: center;">
                            <span style="font-family: monospace; font-size: 13px; font-weight: 700; color: #2563eb; padding-right: 8px; margin-right: 8px; border-right: 1px solid #e2e8f0; min-width: 26px; text-align: center;">!=</span>
                            <span style="font-size: 12px; color: #334155; font-weight: 500;">같지 않음</span>
                        </div>
                        <div style="background-color: #ffffff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 6px 10px; display: flex; align-items: center;">
                            <span style="font-family: monospace; font-size: 13px; font-weight: 700; color: #2563eb; padding-right: 8px; margin-right: 8px; border-right: 1px solid #e2e8f0; min-width: 26px; text-align: center;">&gt;</span>
                            <span style="font-size: 12px; color: #334155; font-weight: 500;">초과</span>
                        </div>
                        <div style="background-color: #ffffff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 6px 10px; display: flex; align-items: center;">
                            <span style="font-family: monospace; font-size: 13px; font-weight: 700; color: #2563eb; padding-right: 8px; margin-right: 8px; border-right: 1px solid #e2e8f0; min-width: 26px; text-align: center;">&gt;\u003d</span>
                            <span style="font-size: 12px; color: #334155; font-weight: 500;">이상</span>
                        </div>
                        <div style="background-color: #ffffff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 6px 10px; display: flex; align-items: center;">
                            <span style="font-family: monospace; font-size: 13px; font-weight: 700; color: #2563eb; padding-right: 8px; margin-right: 8px; border-right: 1px solid #e2e8f0; min-width: 26px; text-align: center;">&lt;</span>
                            <span style="font-size: 12px; color: #334155; font-weight: 500;">미만</span>
                        </div>
                        <div style="background-color: #ffffff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 6px 10px; display: flex; align-items: center;">
                            <span style="font-family: monospace; font-size: 13px; font-weight: 700; color: #2563eb; padding-right: 8px; margin-right: 8px; border-right: 1px solid #e2e8f0; min-width: 26px; text-align: center;">&lt;\u003d</span>
                            <span style="font-size: 12px; color: #334155; font-weight: 500;">이하</span>
                        </div>
                    </div>
                </div>

                <!-- 포함 -->
                <div style="border-radius: 6px; padding: 8px 12px; border: 1px solid #f3e8ff; background-color: #faf5ff;">
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                        <span style="display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 11px; font-weight: 700; background-color: #f3e8ff; color: #7c3aed; border: 1px solid #e9d5ff;">포함</span>
                        <span style="font-size: 11px; color: #64748b; font-weight: 500;">리스트 안 값의 포함 여부</span>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                        <div style="background-color: #ffffff; border: 1px solid #e9d5ff; border-radius: 6px; padding: 6px 10px; display: flex; flex-direction: column; align-items: flex-start; gap: 3px;">
                            <div style="display: flex; align-items: center; width: 100%;">
                                <span style="font-family: monospace; font-size: 13px; font-weight: 700; color: #7c3aed; padding-right: 8px; margin-right: 8px; border-right: 1px solid #e2e8f0; min-width: 36px; text-align: center;">in</span>
                                <span style="font-size: 12px; color: #334155; font-weight: 500;">포함</span>
                            </div>
                            <div style="font-family: monospace; font-size: 11px; color: #64748b; width: 100%; border-top: 1px dashed #f1f5f9; padding-top: 2px; margin-top: 1px;">region in [11,21,31]</div>
                        </div>
                        <div style="background-color: #ffffff; border: 1px solid #e9d5ff; border-radius: 6px; padding: 6px 10px; display: flex; flex-direction: column; align-items: flex-start; gap: 3px;">
                            <div style="display: flex; align-items: center; width: 100%;">
                                <span style="font-family: monospace; font-size: 13px; font-weight: 700; color: #7c3aed; padding-right: 8px; margin-right: 8px; border-right: 1px solid #e2e8f0; min-width: 36px; text-align: center;">not in</span>
                                <span style="font-size: 12px; color: #334155; font-weight: 500;">미포함</span>
                            </div>
                            <div style="font-family: monospace; font-size: 11px; color: #64748b; width: 100%; border-top: 1px dashed #f1f5f9; padding-top: 2px; margin-top: 1px;">sq3 not in [98,99]</div>
                        </div>
                    </div>
                </div>

                <!-- 논리 -->
                <div style="border-radius: 6px; padding: 8px 12px; border: 1px solid #dcfce7; background-color: #f0fdf4;">
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                        <span style="display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 11px; font-weight: 700; background-color: #dcfce7; color: #16a34a; border: 1px solid #bbf7d0;">논리</span>
                        <span style="font-size: 11px; color: #64748b; font-weight: 500;">여러 조건 연결</span>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                        <div style="background-color: #ffffff; border: 1px solid #bbf7d0; border-radius: 6px; padding: 6px 10px; display: flex; flex-direction: column; align-items: flex-start; gap: 3px;">
                            <div style="display: flex; align-items: center; width: 100%;">
                                <span style="font-family: monospace; font-size: 13px; font-weight: 700; color: #16a34a; padding-right: 8px; margin-right: 8px; border-right: 1px solid #e2e8f0; min-width: 36px; text-align: center;">and</span>
                                <span style="font-size: 12px; color: #334155; font-weight: 500;">그리고 (모두 만족)</span>
                            </div>
                            <div style="font-family: monospace; font-size: 11px; color: #64748b; width: 100%; border-top: 1px dashed #f1f5f9; padding-top: 2px; margin-top: 1px;">age &gt;= 20 and age &lt; 40</div>
                        </div>
                        <div style="background-color: #ffffff; border: 1px solid #bbf7d0; border-radius: 6px; padding: 6px 10px; display: flex; flex-direction: column; align-items: flex-start; gap: 3px;">
                            <div style="display: flex; align-items: center; width: 100%;">
                                <span style="font-family: monospace; font-size: 13px; font-weight: 700; color: #16a34a; padding-right: 8px; margin-right: 8px; border-right: 1px solid #e2e8f0; min-width: 36px; text-align: center;">or</span>
                                <span style="font-size: 12px; color: #334155; font-weight: 500;">또는 (하나 이상 만족)</span>
                            </div>
                            <div style="font-family: monospace; font-size: 11px; color: #64748b; width: 100%; border-top: 1px dashed #f1f5f9; padding-top: 2px; margin-top: 1px;">gender == 1 or gender == 2</div>
                        </div>
                    </div>
                </div>

                <!-- 범위 함수 -->
                <div style="border-radius: 6px; padding: 8px 12px; border: 1px solid #fef3c7; background-color: #fffbeb;">
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                        <span style="display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 11px; font-weight: 700; background-color: #fef3c7; color: #d97706; border: 1px solid #fde68a;">범위 함수</span>
                        <span style="font-size: 11px; color: #64748b; font-weight: 500;">다중응답 범위에 사용</span>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                        <div style="background-color: #ffffff; border: 1px solid #fde68a; border-radius: 6px; padding: 6px 10px; display: flex; flex-direction: column; align-items: flex-start; gap: 3px;">
                            <div style="display: flex; align-items: center; width: 100%;">
                                <span style="font-family: monospace; font-size: 13px; font-weight: 700; color: #d97706; padding-right: 8px; margin-right: 8px; border-right: 1px solid #e2e8f0; min-width: 36px; text-align: center;">any</span>
                                <span style="font-size: 12px; color: #334155; font-weight: 500;">하나라도 만족</span>
                            </div>
                            <div style="font-family: monospace; font-size: 11px; color: #64748b; width: 100%; border-top: 1px dashed #f1f5f9; padding-top: 2px; margin-top: 1px;">any(q10:q20) in [1]</div>
                        </div>
                        <div style="background-color: #ffffff; border: 1px solid #fde68a; border-radius: 6px; padding: 6px 10px; display: flex; flex-direction: column; align-items: flex-start; gap: 3px;">
                            <div style="display: flex; align-items: center; width: 100%;">
                                <span style="font-family: monospace; font-size: 13px; font-weight: 700; color: #d97706; padding-right: 8px; margin-right: 8px; border-right: 1px solid #e2e8f0; min-width: 36px; text-align: center;">all</span>
                                <span style="font-size: 12px; color: #334155; font-weight: 500;">전부 만족</span>
                            </div>
                            <div style="font-family: monospace; font-size: 11px; color: #64748b; width: 100%; border-top: 1px dashed #f1f5f9; padding-top: 2px; margin-top: 1px;">all(q10:q20) in [1]</div>
                        </div>
                        <div style="background-color: #ffffff; border: 1px solid #fde68a; border-radius: 6px; padding: 6px 10px; display: flex; flex-direction: column; align-items: flex-start; gap: 3px;">
                            <div style="display: flex; align-items: center; width: 100%;">
                                <span style="font-family: monospace; font-size: 13px; font-weight: 700; color: #d97706; padding-right: 8px; margin-right: 8px; border-right: 1px solid #e2e8f0; min-width: 36px; text-align: center;">none</span>
                                <span style="font-size: 12px; color: #334155; font-weight: 500;">모두 불만족</span>
                            </div>
                            <div style="font-family: monospace; font-size: 11px; color: #64748b; width: 100%; border-top: 1px dashed #f1f5f9; padding-top: 2px; margin-top: 1px;">none(q10:q20) in [1]</div>
                        </div>
                    </div>
                </div>

                <!-- 그룹핑 -->
                <div style="border-radius: 6px; padding: 8px 12px; border: 1px solid #fee2e2; background-color: #fef2f2;">
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                        <span style="display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 11px; font-weight: 700; background-color: #fee2e2; color: #dc2626; border: 1px solid #fca5a5;">그룹핑</span>
                        <span style="font-size: 11px; color: #64748b; font-weight: 500;">조건 우선순위 지정</span>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                        <div style="background-color: #ffffff; border: 1px solid #fca5a5; border-radius: 6px; padding: 6px 10px; display: flex; flex-direction: column; align-items: flex-start; gap: 3px;">
                            <div style="display: flex; align-items: center; width: 100%;">
                                <span style="font-family: monospace; font-size: 13px; font-weight: 700; color: #dc2626; padding-right: 8px; margin-right: 8px; border-right: 1px solid #e2e8f0; min-width: 20px; text-align: center;">(</span>
                                <span style="font-size: 12px; color: #334155; font-weight: 500;">그룹 시작</span>
                            </div>
                            <div style="font-family: monospace; font-size: 11px; color: #64748b; width: 100%; border-top: 1px dashed #f1f5f9; padding-top: 2px; margin-top: 1px;">(a == 1 or b == 1) and c == 1</div>
                        </div>
                        <div style="background-color: #ffffff; border: 1px solid #fca5a5; border-radius: 6px; padding: 6px 10px; display: flex; flex-direction: column; align-items: flex-start; gap: 3px;">
                            <div style="display: flex; align-items: center; width: 100%;">
                                <span style="font-family: monospace; font-size: 13px; font-weight: 700; color: #dc2626; padding-right: 8px; margin-right: 8px; border-right: 1px solid #e2e8f0; min-width: 20px; text-align: center;">)</span>
                                <span style="font-size: 12px; color: #334155; font-weight: 500;">그룹 종료</span>
                            </div>
                            <div style="font-family: monospace; font-size: 11px; color: #64748b; width: 100%; border-top: 1px dashed #f1f5f9; padding-top: 2px; margin-top: 1px;">(a == 1 or b == 1) and c == 1</div>
                        </div>
                    </div>
                </div>

                <!-- 순위 -->
                <div style="border-radius: 6px; padding: 8px 12px; border: 1px solid #e0f2fe; background-color: #f0f9ff;">
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                        <span style="display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 11px; font-weight: 700; background-color: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd;">순위</span>
                        <span style="font-size: 11px; color: #64748b; font-weight: 500;">순위 문항의 특정 순위 코드 포함</span>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                        <div style="background-color: #ffffff; border: 1px solid #bae6fd; border-radius: 6px; padding: 6px 10px; display: flex; flex-direction: column; align-items: flex-start; gap: 3px;">
                            <div style="display: flex; align-items: center; width: 100%;">
                                <span style="font-family: monospace; font-size: 13px; font-weight: 700; color: #0284c7; padding-right: 12px; margin-right: 12px; border-right: 1px solid #e2e8f0;">[순위지정] in [코드]</span>
                                <span style="font-size: 12px; color: #334155; font-weight: 500;">지정 순위에 포함된 코드</span>
                            </div>
                            <div style="font-family: monospace; font-size: 11px; color: #64748b; width: 100%; border-top: 1px dashed #f1f5f9; padding-top: 2px; margin-top: 1px;">Q1 [1:2] in [코드]</div>
                        </div>
                        <div style="background-color: #ffffff; border: 1px solid #bae6fd; border-radius: 6px; padding: 6px 10px; display: flex; flex-direction: column; align-items: flex-start; gap: 3px;">
                            <div style="display: flex; align-items: center; width: 100%;">
                                <span style="font-family: monospace; font-size: 13px; font-weight: 700; color: #0284c7; padding-right: 12px; margin-right: 12px; border-right: 1px solid #e2e8f0;">형식 설명</span>
                                <span style="font-size: 12px; color: #334155; font-weight: 500;">[순위지정] = 1:2 / [코드] = 응답 코드값</span>
                            </div>
                            <div style="font-family: monospace; font-size: 11px; color: transparent; width: 100%; border-top: 1px dashed #f1f5f9; padding-top: 2px; margin-top: 1px;">-</div>
                        </div>
                    </div>
                </div>

            </div>
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
    const [isRankOutputsOpen, setIsRankOutputsOpen] = useState(true);

    const sortOptions = [
        { text: '설문지순', value: 'none' },
        { text: '내림차순', value: 'n_desc' }
    ];


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
    const [rankOutputs, setRankOutputs] = useState(() => rowData?.rank_outputs ? [...rowData.rank_outputs] : []);
    const [isDetailSetting, setIsDetailSetting] = useState(false);
    const [sortMode, setSortMode] = useState(() => rowData?.sort_mode || 'none');

    useEffect(() => {
        if (show) {
            setIsDetailSetting(false);
        }
        // 컴포넌트가 언마운트되지 않고 props만 바뀔 경우를 대비한 동기화
        if (show && rowData) {
            setCategories(getInitialCategories(rowData));
            setRankOutputs(rowData.rank_outputs ? [...rowData.rank_outputs] : []);
            setSortMode(rowData.sort_mode || 'none');
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
            onApply(categories, rankOutputs, sortMode);
        }
        onClose(); // 처리 후 모달 닫기
    };

    if (!show) return null;

    return (
        <div className="advanced-filter-overlay-cbp theme-blue">
            <div className="advanced-filter-content-cbp" onClick={(e) => e.stopPropagation()} style={{ width: '1100px', height: '820px', maxHeight: '90vh' }}>

                {/* 헤더 영역 */}
                <div className="filter-popup-header-cbp">
                    <div className="header-title-cbp" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ margin: 0 }}>표 상세설정</h3>
                        <div
                            title="표 상세설정 도움말"
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
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569', minWidth: '30px', flexShrink: 0 }}>변수</span>
                            <input type="text" value={rowData?.recoded_var_id || ''} disabled style={{ flex: 1, height: '32px', padding: '0 10px', border: '1px solid #e2e8f0', borderRadius: '4px', background: '#f8fafc', color: '#64748b', fontSize: '13px' }} />
                        </div>
                        <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569', minWidth: '30px', flexShrink: 0 }}>라벨</span>
                            <input type="text" value={rowData?.var_label || ''} disabled style={{ flex: 1, height: '32px', padding: '0 10px', border: '1px solid #e2e8f0', borderRadius: '4px', background: '#f8fafc', color: '#64748b', fontSize: '13px' }} />
                        </div>
                        <div style={{ flex: 1.2, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569', minWidth: '30px', flexShrink: 0 }}>배너</span>
                            <input type="text" value={Array.isArray(rowData?.x_info) ? rowData.x_info.join(', ') : (rowData?.x_info || '')} disabled style={{ flex: 1, height: '32px', padding: '0 10px', border: '1px solid #e2e8f0', borderRadius: '4px', background: '#f8fafc', color: '#64748b', fontSize: '13px' }} />
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569', minWidth: '30px', flexShrink: 0 }}>정렬</span>
                            <DropDownList
                                data={sortOptions}
                                textField="text"
                                dataItemKey="value"
                                value={sortOptions.find(o => o.value === sortMode) || sortOptions[0]}
                                onChange={(e) => setSortMode(e.value.value)}
                                className="k-dropdown-solid dp-sort-dropdown"
                                popupSettings={{ className: "dp-sort-dropdown-popup" }}
                                style={{ flex: 1, width: '100%', fontSize: '13px', height: '32px' }}
                            />
                        </div>
                    </div>

                    {rowData?.var_type === 'rank' && (
                        <div style={{ flex: 'none', background: '#f4f6f8', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '16px', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: isRankOutputsOpen ? '16px' : '0' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }} onClick={() => setIsRankOutputsOpen(!isRankOutputsOpen)} title={isRankOutputsOpen ? "토글 닫기" : "토글 열기"}>
                                    <div
                                        style={{
                                            marginTop: '2px',
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '50%',
                                            background: isRankOutputsOpen ? '#e0f2fe' : '#e2e8f0',
                                            color: isRankOutputsOpen ? '#0284c7' : '#64748b',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s',
                                            flexShrink: 0,
                                            boxShadow: isRankOutputsOpen ? '0 0 0 2px #bae6fd' : 'none'
                                        }}
                                    >
                                        {isRankOutputsOpen ? <ChevronUp size={16} strokeWidth={3} /> : <ChevronDown size={16} strokeWidth={3} />}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#1e293b' }}>출력 스터브</div>
                                        {isRankOutputsOpen && (
                                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>원본 스터브 설정은 공유하고 순위 범위만 다르게 저장합니다. 추가된 출력 스터브는 데이터 분석 시 자동으로 개별 생성됩니다.</div>
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <div style={{ border: '1px solid #bae6fd', background: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                                        출력 {rankOutputs.length}개
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsRankOutputsOpen(true);
                                            setRankOutputs(prev => {
                                                const maxRank = prev.reduce((max, out) => Math.max(max, out.end_rank || 1), 0);
                                                return [
                                                    ...prev,
                                                    { start_rank: maxRank + 1, end_rank: maxRank + 1, rank_output: String(maxRank + 1) }
                                                ];
                                            });
                                        }}
                                        style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: '#334155' }}
                                    >
                                        <Plus size={14} /> 출력 추가
                                    </button>
                                </div>
                            </div>

                            {isRankOutputsOpen && (
                                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                                    {/* Table Header */}
                                    <div style={{ display: 'flex', fontSize: '12px', color: '#64748b', background: '#f8fafc', padding: '6px 16px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>
                                        <div style={{ flex: '0 0 220px', paddingRight: '16px' }}>순위 범위</div>
                                        <div style={{ flex: 1, paddingRight: '16px' }}>자동 생성 제목</div>
                                        <div style={{ flex: '0 0 200px', paddingRight: '16px' }}>배너</div>
                                        <div style={{ flex: '0 0 90px' }}>표시 여부</div>
                                        <div style={{ flex: '0 0 30px' }}></div>
                                    </div>

                                    {/* Table Body */}
                                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                        {rankOutputs.length === 0 ? (
                                            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', padding: '30px' }}>설정된 출력 스터브가 없습니다.</div>
                                        ) : (
                                            rankOutputs.map((out, idx) => {
                                                const rankOptions = Array.from({ length: 4 }, (_, i) => i + 1);
                                                const sRank = out.start_rank || 1;
                                                const eRank = out.end_rank || 1;
                                                const rankTitleStr = sRank === eRank ? `${sRank}순위` : `${sRank}~${eRank}순위`;
                                                let rankIdStr = `${sRank}`;
                                                if (sRank !== eRank) {
                                                    const start = Math.min(sRank, eRank);
                                                    const end = Math.max(sRank, eRank);
                                                    rankIdStr = Array.from({ length: end - start + 1 }, (_, i) => start + i).join('+');
                                                }

                                                return (
                                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', padding: '6px 16px', borderBottom: idx === rankOutputs.length - 1 ? 'none' : '1px solid #e2e8f0' }}>

                                                        {/* Column 1: 순위 범위 */}
                                                        <div style={{ flex: '0 0 220px', paddingRight: '16px' }}>
                                                            <div style={{ height: '26px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                                                <DropDownList
                                                                    data={rankOptions.map(r => ({ text: `${r}순위`, value: r }))}
                                                                    textField="text"
                                                                    dataItemKey="value"
                                                                    value={{ text: `${sRank}순위`, value: sRank }}
                                                                    onChange={e => setRankOutputs(prev => prev.map((item, i) => i === idx ? { ...item, start_rank: e.value.value } : item))}
                                                                    className="dp-mini-dropdown k-dropdown-solid"
                                                                    style={{ width: '85px', fontSize: '13px', fontWeight: '600' }}
                                                                />
                                                                <span style={{ color: '#94a3b8', fontSize: '12px' }}>~</span>
                                                                <DropDownList
                                                                    data={rankOptions.map(r => ({ text: `${r}순위`, value: r }))}
                                                                    textField="text"
                                                                    dataItemKey="value"
                                                                    value={{ text: `${eRank}순위`, value: eRank }}
                                                                    onChange={e => setRankOutputs(prev => prev.map((item, i) => i === idx ? { ...item, end_rank: e.value.value } : item))}
                                                                    className="dp-mini-dropdown k-dropdown-solid"
                                                                    style={{ width: '85px', fontSize: '13px', fontWeight: '600' }}
                                                                />
                                                            </div>
                                                            <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.4' }}>
                                                                {rankIdStr}순위 · 조건식은 백엔드가 자동 생성합니다.
                                                            </div>
                                                        </div>

                                                        {/* Column 2: 자동 생성 제목 */}
                                                        <div style={{ flex: 1, paddingRight: '16px' }}>
                                                            <div style={{ height: '26px', display: 'flex', alignItems: 'center', fontSize: '13px', fontWeight: '600', color: '#1e293b', marginBottom: '2px' }}>
                                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                    {rowData?.var_label || ''} ({rankTitleStr})
                                                                </span>
                                                            </div>
                                                            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                                                                {rowData?.recoded_var_id}_({rankIdStr})
                                                            </div>
                                                        </div>

                                                        {/* Column 3: 배너 */}
                                                        <div style={{ flex: '0 0 200px', paddingRight: '16px', height: '26px', display: 'flex', alignItems: 'center' }}>
                                                            <input
                                                                type="text"
                                                                value={out.banner || ''}
                                                                placeholder={Array.isArray(rowData?.x_info) ? rowData.x_info.join(', ') : (rowData?.x_info || '배너 입력')}
                                                                onChange={e => setRankOutputs(prev => prev.map((item, i) => i === idx ? { ...item, banner: e.target.value } : item))}
                                                                style={{ width: '100%', height: '26px', padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', color: '#475569', boxSizing: 'border-box', outline: 'none' }}
                                                            />
                                                        </div>

                                                        {/* Column 4: 표시 여부 */}
                                                        <div style={{ flex: '0 0 90px', display: 'flex', alignItems: 'center', height: '26px' }}>
                                                            <DropDownList
                                                                data={[{ text: '표시', value: false }, { text: '숨김', value: true }]}
                                                                textField="text"
                                                                dataItemKey="value"
                                                                value={{ text: out.hide ? '숨김' : '표시', value: !!out.hide }}
                                                                onChange={e => setRankOutputs(prev => prev.map((item, i) => i === idx ? { ...item, hide: e.value.value } : item))}
                                                                className="dp-mini-dropdown k-dropdown-solid"
                                                                style={{ width: '80px', fontSize: '13px', fontWeight: '600' }}
                                                            />
                                                        </div>

                                                        {/* Column 5: 삭제 버튼 */}
                                                        <div style={{ flex: '0 0 30px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', height: '26px' }}>
                                                            <button
                                                                onClick={() => setRankOutputs(prev => prev.filter((_, i) => i !== idx))}
                                                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px', borderRadius: '4px', transition: 'all 0.2s' }}
                                                                onMouseOver={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fee2e2'; }}
                                                                onMouseOut={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent'; }}
                                                            >
                                                                <Trash2 size={16} strokeWidth={2.0} />
                                                            </button>
                                                        </div>

                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 하단 그리드 영역 */}
                    <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                        {/* 그리드 옵션 헤더 */}
                        <div style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: isDetailSetting ? '#eff6ff' : '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.3s' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '3px', height: '14px', background: isDetailSetting ? '#3b82f6' : '#94a3b8', borderRadius: '2px' }}></div>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: isDetailSetting ? '#1e3a8a' : '#475569' }}>
                                    그리드 편집
                                </span>
                            </div>
                            <div
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                                    padding: '4px 12px', background: isDetailSetting ? '#dbeafe' : '#fff',
                                    border: `1px solid ${isDetailSetting ? '#bfdbfe' : '#cbd5e1'}`,
                                    borderRadius: '20px', transition: 'all 0.2s',
                                    boxShadow: isDetailSetting ? '0 1px 2px rgba(59,130,246,0.1)' : 'none'
                                }}
                                onClick={() => setIsDetailSetting(!isDetailSetting)}
                                onMouseOver={e => { if (!isDetailSetting) e.currentTarget.style.background = '#f8fafc'; }}
                                onMouseOut={e => { if (!isDetailSetting) e.currentTarget.style.background = '#fff'; }}
                            >
                                <span style={{ fontSize: '12px', fontWeight: 700, color: isDetailSetting ? '#1d4ed8' : '#64748b' }}>상세 컬럼 표시</span>
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
                                {isDetailSetting && <Column field="label3" title="대분류" width="150px" cell={(p) => <TextEditCell dataItem={p.dataItem} field="label3" onUpdate={(item, f, v) => handleCategoryCellUpdate(p.dataIndex, f, v)} />} />}
                                {isDetailSetting && <Column field="label2" title="중분류" width="150px" cell={(p) => <TextEditCell dataItem={p.dataItem} field="label2" onUpdate={(item, f, v) => handleCategoryCellUpdate(p.dataIndex, f, v)} />} />}
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
