import React, { useState, useEffect, useContext, createContext, useCallback, useMemo, forwardRef, useImperativeHandle, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Trash2, Search, ChevronLeft, ChevronRight, Wand2, Plus, Info } from 'lucide-react';
import { DpRequestPageApi } from '../dpRequest/DpRequestPageApi';
import KendoGridV2, { GridColumn as Column } from "@/components/kendo/KendoGridV2";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import { modalContext } from "@/components/common/Modal.jsx";
import useUpdateHistory from '@/hooks/useUpdateHistory';
import DataHeader from "@/services/dataStatus/components/DataHeader";
import CartesianGeneratorModal from "./CartesianGeneratorModal";
import BulkEditConditionsModal from "./BulkEditConditionsModal";
import { Button } from "@/components/ui/button";
import { DropDownList } from '@progress/kendo-react-dropdowns';
import Toast from "@/components/common/Toast";

const AddQuestionContext = createContext(null);

const PasteableEditCell = (props) => {
    const { dataItem, field, onChange } = props;
    const { currentInfo, updateBannerInfo } = useContext(AddQuestionContext);
    const value = dataItem[field] ?? '';

    if (!dataItem.inEdit) {
        return (
            <td style={{ ...props.style, padding: '0 12px' }} className={props.className}>
                {value}
            </td>
        );
    }

    const handlePaste = (e) => {
        e.preventDefault();
        const clipboardData = e.clipboardData.getData('Text');
        const lines = clipboardData.split(/\r?\n/).map(l => l.trim());
        if (lines.length > 0 && currentInfo && updateBannerInfo) {
            const startIdx = currentInfo.findIndex(item => item === dataItem);
            if (startIdx !== -1) {
                const updated = currentInfo.map((item, idx) => {
                    if (idx >= startIdx) {
                        const offset = idx - startIdx;
                        const lineVal = lines[offset];
                        if (lineVal !== undefined) {
                            return {
                                ...item,
                                [field]: lineVal
                            };
                        }
                    }
                    return item;
                });
                updateBannerInfo(updated);
            }
        }
    };

    return (
        <td style={{ ...props.style, padding: 0 }} className="k-grid-edit-cell">
            <input
                type="text"
                value={value}
                onChange={(e) => {
                    if (onChange) {
                        onChange({
                            dataItem,
                            field,
                            syntheticEvent: e.nativeEvent,
                            value: e.target.value
                        });
                    }
                }}
                onPaste={handlePaste}
                style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    outline: 'none',
                    padding: '0 12px',
                    boxSizing: 'border-box',
                    backgroundColor: 'transparent'
                }}
            />
        </td>
    );
};


// --- 커스텀 헤더 셀 (조건 도움말) ---
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

const getUniqueNextId = (baseId, existingBanners) => {
    let candidate = baseId.toUpperCase();
    const existingIds = new Set(existingBanners.map(b => b.id.toUpperCase()));

    if (!existingIds.has(candidate)) {
        return candidate;
    }

    const match = candidate.match(/^([A-Z_]+)(\d+)$/);
    if (!match) {
        let counter = 1;
        while (existingIds.has(`${candidate}_${counter}`)) {
            counter++;
        }
        return `${candidate}_${counter}`;
    }

    const prefix = match[1];
    const numStr = match[2];
    const paddingLength = numStr.length;
    let currentNum = parseInt(numStr, 10);

    while (true) {
        currentNum++;
        const paddedNum = String(currentNum).padStart(paddingLength, '0');
        const nextCandidate = prefix + paddedNum;
        if (!existingIds.has(nextCandidate)) {
            return nextCandidate;
        }
    }
};

const AddQuestionPage = forwardRef(({ onUnsavedChange }, ref) => {
    const auth = useSelector((store) => store.auth);
    const { getBaseVariableList, getComputedVariableList, getNextBaseVariableId, saveBaseVariableMerge, recomputeComputedVariables, deleteBaseVariable } = DpRequestPageApi();
    const loadingSpinner = useContext(loadingSpinnerContext);
    const modal = useContext(modalContext);
    const history = useUpdateHistory('dp-banner');
    const isHistoryAction = useRef(false);

    useImperativeHandle(ref, () => ({ save: async () => await handleSaveBanner() }));

    const [isCartesianModalOpen, setIsCartesianModalOpen] = useState(false);
    const [banners, setBanners] = useState([]);
    const [selectedBanner, setSelectedBanner] = useState('');
    const [baseVariables, setBaseVariables] = useState([]);
    const [isBannerSidebarOpen, setIsBannerSidebarOpen] = useState(true);
    const [bannerSearch, setBannerSearch] = useState('');
    const [currentLabel, setCurrentLabel] = useState('');
    const [currentId, setCurrentId] = useState('');
    const [currentXInfo, setCurrentXInfo] = useState('');
    const listContainerRef = useRef(null);

    // ★ 핵심 최적화: 현재 선택된 문항의 info를 banners 배열에서 분리
    // → 셀 편집 시 banners 전체를 map()하지 않아도 됨 (성능 핵심)
    const [currentInfo, setCurrentInfo] = useState([]);
    const currentInfoRef = useRef([]);

    const [toast, setToast] = useState({ show: false, message: '' });
    const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);

    const handleCopyGrid = async () => {
        try {
            if (!currentInfo || currentInfo.length === 0) {
                setToast({ show: true, message: '복사할 데이터가 없습니다.' });
                return;
            }
            const headers = ['할당될 값', '보기 라벨', '조건'].join('\t');
            const rows = currentInfo.map(item => {
                const val2 = String(item.label2 ?? '').trim();
                const val = String(item.label ?? '').trim();
                const logic = String(item.logic ?? '').trim();
                return `${val2}\t${val}\t${logic}`;
            }).join('\n');

            const text = `${headers}\n${rows}`;
            await navigator.clipboard.writeText(text);
            setToast({ show: true, message: '복사 완료 (Ctrl+V)' });
        } catch (err) {
            console.error('Failed to copy grid:', err);
            setToast({ show: true, message: '복사 실패' });
        }
    };

    // 선택된 배너 ID 및 입력 상태 ref (callback closure에서 최신값 참조 - 동기 업데이트로 race condition 방지)
    const selectedBannerRef = useRef('');
    const currentLabelRef = useRef('');
    const currentIdRef = useRef('');
    const currentXInfoRef = useRef('');

    // ★ 배너 전환 시 현재 info를 banners에 저장 후 새 배너 로드
    const selectBanner = useCallback((banner) => {
        const prevId = selectedBannerRef.current;
        if (prevId) {
            const capturedInfo = currentInfoRef.current;
            const capturedLabel = currentLabelRef.current;
            const capturedXInfo = currentXInfoRef.current;
            const capturedId = currentIdRef.current;

            setBanners(prev => {
                const b = prev.find(x => x.id === prevId);
                if (!b) return prev;
                const isSame = b.label === capturedLabel &&
                    (b.type || 'single') === capturedXInfo &&
                    b.info === capturedInfo &&
                    (b.tempId || b.id) === capturedId;

                return prev.map(x =>
                    x.id === prevId
                        ? {
                            ...x,
                            label: capturedLabel,
                            type: capturedXInfo,
                            tempId: capturedId,
                            info: capturedInfo,
                            isDirty: isSame ? x.isDirty : true
                        }
                        : x
                );
            });
        }
        // ref를 즉시 업데이트 (useEffect 비동기 대기 없이) → 빠른 연속 클릭 시 race condition 방지
        selectedBannerRef.current = banner.id;
        setSelectedBanner(banner.id);

        const nextId = banner.id.startsWith('NEW_') ? '' : banner.id;
        setCurrentId(nextId);
        currentIdRef.current = nextId;

        setCurrentLabel(banner.label);
        currentLabelRef.current = banner.label;

        setCurrentXInfo(banner.type || 'single');
        currentXInfoRef.current = banner.type || 'single';

        setCurrentInfo(banner.info || []);
        currentInfoRef.current = banner.info || [];
    }, []);

    // Undo/Redo
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!(e.ctrlKey || e.metaKey)) return;
            let data = null;
            if (e.key.toLowerCase() === 'z' && !e.shiftKey) data = history.undo();
            else if ((e.key.toLowerCase() === 'z' && e.shiftKey) || e.key.toLowerCase() === 'y') data = history.redo();
            if (data) {
                isHistoryAction.current = true;
                setBanners([...data]);
                const targetId = selectedBannerRef.current;
                const target = data.find(b => b.id === targetId) || data[0];
                if (target) {
                    selectedBannerRef.current = target.id;
                    setSelectedBanner(target.id);

                    const nextId = target.tempId || target.id;
                    setCurrentId(nextId);
                    currentIdRef.current = nextId;

                    setCurrentLabel(target.label);
                    currentLabelRef.current = target.label;

                    setCurrentXInfo(target.type || 'single');
                    currentXInfoRef.current = target.type || 'single';

                    setCurrentInfo(target.info || []);
                    currentInfoRef.current = target.info || [];
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [history]);

    // 입력 상태를 banners에 자동 동기화 (Undo/Redo 트래킹 용도)
    useEffect(() => {
        if (!selectedBannerRef.current) return;
        const timer = setTimeout(() => {
            setBanners(prev => {
                const b = prev.find(x => x.id === selectedBannerRef.current);
                if (!b) return prev;
                const isSame = b.label === currentLabel &&
                    (b.type || 'single') === currentXInfo &&
                    b.info === currentInfoRef.current &&
                    (b.tempId || b.id) === currentId;
                if (isSame) return prev;

                return prev.map(x =>
                    x.id === selectedBannerRef.current
                        ? { ...x, label: currentLabel, type: currentXInfo, tempId: currentId, info: currentInfoRef.current, isDirty: true }
                        : x
                );
            });
            if (onUnsavedChange) onUnsavedChange(true);
        }, 500);
        return () => clearTimeout(timer);
    }, [currentId, currentLabel, currentXInfo, currentInfo, onUnsavedChange]);

    // 히스토리 커밋 (디바운스 500ms - 매 키입력마다 실행 방지)
    useEffect(() => {
        if (isHistoryAction.current) { isHistoryAction.current = false; return; }
        if (banners.length === 0) return;
        const timer = setTimeout(() => history.commit(banners), 500);
        return () => clearTimeout(timer);
    }, [banners, history]);

    const handleDeleteBanner = (e, bannerId) => {
        e.stopPropagation();
        if (bannerId.startsWith('NEW_')) {
            const nextBanners = banners.filter(b => b.id !== bannerId);
            setBanners(nextBanners);
            if (selectedBanner === bannerId) {
                if (nextBanners.length > 0) { selectBanner(nextBanners[0]); scrollToTop(); }
                else { setSelectedBanner(''); setCurrentId(''); setCurrentLabel(''); setCurrentXInfo(''); setCurrentInfo([]); currentInfoRef.current = []; }
            }
            return;
        }
        modal.showConfirm('알림', <span style={{ wordBreak: 'break-all' }}>문항({bannerId})을 삭제하시겠습니까?</span>, {
            btns: [
                { title: "취소", click: () => { } },
                {
                    title: "삭제",
                    click: async () => {
                        const pageId = sessionStorage.getItem('pageId');
                        const user = auth?.user?.userId;
                        if (!pageId || !user) return;
                        try {
                            const result = await deleteBaseVariable.mutateAsync({ pageid: pageId, user, variables: [bannerId] });
                            if (result?.success === "777") {
                                modal.showAlert('알림', '삭제되었습니다.');
                                await fetchVariablesData(selectedBanner === bannerId ? 'delete' : 'normal');
                            } else if (result?.message?.includes("사용 중이라 삭제할 수 없습니다")) {
                                modal.showErrorAlert("에러", "문항이 다른 설정에서 사용 중이라 삭제할 수 없습니다.");
                            } else {
                                modal.showAlert('오류', result?.Message || result?.message || '삭제 중 문제가 발생했습니다.');
                            }
                        } catch { modal.showAlert('오류', '삭제 요청에 실패했습니다.'); }
                    }
                }
            ]
        });
    };

    const handleAddNew = async () => {
        const pageId = sessionStorage.getItem('pageId');
        const user = auth?.user?.userId;
        if (!pageId || !user) return;
        try {
            loadingSpinner.show();
            const res = await getNextBaseVariableId.mutateAsync({ pageid: pageId, user });
            if (res?.success === '777' && res.resultjson?.next_id) {
                const tempId = getUniqueNextId(res.resultjson.next_id, banners);
                const newBanner = { id: tempId, label: '', type: 'single', recoded_type: 'computed', info: [{ label2: '', label: '', inEdit: true }], isDirty: true };
                // 현재 active banner의 변경 사항을 임시로 캡처
                const prevId = selectedBannerRef.current;
                if (prevId) {
                    const capturedInfo = currentInfoRef.current;
                    const capturedLabel = currentLabelRef.current;
                    const capturedXInfo = currentXInfoRef.current;
                    const capturedId = currentIdRef.current;
                    setBanners(prev => {
                        const b = prev.find(x => x.id === prevId);
                        const isSame = b && b.label === capturedLabel &&
                            (b.type || 'single') === capturedXInfo &&
                            b.info === capturedInfo &&
                            (b.tempId || b.id) === capturedId;
                        const updated = prev.map(x =>
                            x.id === prevId
                                ? {
                                    ...x,
                                    label: capturedLabel,
                                    type: capturedXInfo,
                                    tempId: capturedId,
                                    info: capturedInfo,
                                    isDirty: isSame ? x.isDirty : true
                                }
                                : x
                        );
                        return [...updated, newBanner];
                    });
                } else {
                    setBanners(prev => [...prev, newBanner]);
                }
                setTimeout(scrollToBottom, 100);
                setSelectedBanner(tempId);
                selectedBannerRef.current = tempId;

                setCurrentId(tempId);
                currentIdRef.current = tempId;

                setCurrentLabel('');
                currentLabelRef.current = '';

                setCurrentXInfo('single');
                currentXInfoRef.current = 'single';

                setCurrentInfo([{ label2: '', label: '', inEdit: true }]);
                currentInfoRef.current = [{ label2: '', label: '', inEdit: true }];
            } else {
                modal.showAlert('오류', '신규 문항 ID를 받아오지 못했습니다.');
            }
        } catch (err) { console.error(err); }
        finally { loadingSpinner.hide(); }
    };

    const fetchVariablesData = async (mode = 'normal', targetIdToSelect = null) => {
        const pageId = sessionStorage.getItem('pageId');
        const user = auth?.user?.userId;
        if (!pageId || pageId === "null" || pageId === "undefined" || !user) return;
        try {
            loadingSpinner.show();

            // 1. Fetch base variables for candidates (Cartesian modal, duplicate check)
            const baseRes = await getBaseVariableList.mutateAsync({ pageid: pageId, user });
            let baseVars = [];
            if (baseRes?.success === '777' && baseRes.resultjson) {
                const dataObj = baseRes.resultjson;
                baseVars = Object.entries(dataObj)
                    .filter(([key]) => key !== 'count' && key !== 'first')
                    .map(([key, v]) => ({
                        id: v.id || key,
                        label: v.label || v.name || key,
                        type: v.type,
                        subId: v.id || key,
                        info: Array.isArray(v.info) ? v.info.map(item => ({
                            ...item,
                            label2: item.value ?? item.label2 ?? '',
                            label: item.label || '',
                            logic: item.logic || '',
                            inEdit: false
                        })) : []
                    }));
                setBaseVariables(baseVars);
            }

            // 2. Fetch computed variables for the left sidebar list
            const compRes = await getComputedVariableList.mutateAsync({ pageid: pageId, user });
            if (compRes?.success === '777' && compRes.resultjson) {
                const compDataObj = compRes.resultjson;
                const compVars = Object.entries(compDataObj)
                    .filter(([key]) => key !== 'count' && key !== 'first')
                    .map(([key, v]) => ({
                        id: v.id || key,
                        label: v.label || v.name || key,
                        type: v.type,
                        subId: v.id || key,
                        recoded_type: v.recoded_type || 'computed',
                        info: Array.isArray(v.info) ? v.info.map(item => ({
                            ...item,
                            label2: item.value ?? item.label2 ?? '',
                            label: item.label || '',
                            logic: item.logic || '',
                            inEdit: false
                        })) : []
                    }));

                setBanners(compVars);
                history.reset(compVars);

                if (compVars.length > 0) {
                    let target = mode === 'fresh' ? compVars[compVars.length - 1] : compVars[0];
                    if (targetIdToSelect) {
                        const found = compVars.find(f => f.id === targetIdToSelect);
                        if (found) target = found;
                    }
                    if (mode === 'fresh' || mode === 'delete' || targetIdToSelect || !selectedBannerRef.current) {
                        setSelectedBanner(target.id);
                        selectedBannerRef.current = target.id;

                        setCurrentLabel(target.label);
                        currentLabelRef.current = target.label;

                        setCurrentId(target.id);
                        currentIdRef.current = target.id;

                        setCurrentXInfo(target.type || 'single');
                        currentXInfoRef.current = target.type || 'single';

                        setCurrentInfo(target.info || []);
                        currentInfoRef.current = target.info || [];
                    }
                    if (mode === 'delete') scrollToTop();
                } else {
                    setSelectedBanner(''); selectedBannerRef.current = '';
                    setCurrentLabel(''); currentLabelRef.current = '';
                    setCurrentId(''); currentIdRef.current = '';
                    setCurrentXInfo('single'); currentXInfoRef.current = 'single';
                    setCurrentInfo([]); currentInfoRef.current = [];
                }
            } else {
                setBanners([]); history.reset([]);
                setSelectedBanner(''); selectedBannerRef.current = '';
                setCurrentLabel(''); currentLabelRef.current = '';
                setCurrentId(''); currentIdRef.current = '';
                setCurrentXInfo('single'); currentXInfoRef.current = 'single';
                setCurrentInfo([]); currentInfoRef.current = [];
            }
        } catch (error) { console.error(error); }
        finally { loadingSpinner.hide(); }
    };

    // ★ 핵심: banners를 건드리지 않고 currentInfo만 업데이트
    const updateBannerInfo = useCallback((newInfo) => {
        setCurrentInfo(newInfo);
        currentInfoRef.current = newInfo;
        if (onUnsavedChange) onUnsavedChange(true);
    }, [onUnsavedChange]);

    // 목록 하단으로 스크롤 이동
    const scrollToBottom = useCallback(() => {
        if (listContainerRef.current) {
            listContainerRef.current.scrollTo({ top: listContainerRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, []);

    // 목록 상단으로 스크롤 이동
    const scrollToTop = useCallback(() => {
        if (listContainerRef.current) {
            listContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, []);

    const handleRowClick = useCallback((e) => {
        setCurrentInfo(prev => prev.map(it => ({ ...it, inEdit: it === e.dataItem })));
        currentInfoRef.current = currentInfoRef.current.map(it => ({ ...it, inEdit: it === e.dataItem }));
    }, []);

    const filteredBanners = useMemo(() => {
        const search = bannerSearch.toLowerCase();
        return banners.filter(b =>
            (b.label || '').toLowerCase().includes(search) || (b.id || '').toLowerCase().includes(search)
        );
    }, [banners, bannerSearch]);

    useEffect(() => {
        fetchVariablesData();
        const handlePageUpdate = () => fetchVariablesData('normal');
        window.addEventListener("pageSelected", handlePageUpdate);
        return () => window.removeEventListener("pageSelected", handlePageUpdate);
    }, [auth?.user?.userId]);



    const handleSaveBanner = async () => {
        const pageId = sessionStorage.getItem('pageId');
        const user = auth?.user?.userId;
        if (!pageId || !user) return;

        // 1. 현재 에디터 상태를 banners 복사본에 강제 동기화
        const activeId = selectedBannerRef.current;
        let latestBanners = [...banners];
        if (activeId) {
            const activeBannerIdx = latestBanners.findIndex(b => b.id === activeId);
            const activeBannerData = {
                id: currentId.trim(),
                label: currentLabel.trim(),
                type: currentXInfo,
                recoded_type: 'computed',
                info: currentInfoRef.current,
                isDirty: true
            };
            if (activeBannerIdx > -1) {
                latestBanners[activeBannerIdx] = activeBannerData;
            } else {
                latestBanners.push(activeBannerData);
            }
        }

        // 2. 저장 대상 수집 (isDirty === true)
        const dirtyBanners = latestBanners.filter(b => b.isDirty);
        if (dirtyBanners.length === 0) {
            return modal.showAlert('알림', '저장할 변경 사항이 없습니다.');
        }

        // 3. 일괄 유효성 검사
        for (const b of dirtyBanners) {
            if (!b.id?.trim()) {
                return modal.showAlert('알림', '문항 ID를 입력해주세요.');
            }
            if (!b.label?.trim()) {
                return modal.showAlert('알림', `[${b.id}] 문항 라벨을 입력해주세요.`);
            }
            if (!b.type?.trim()) {
                return modal.showAlert('알림', `[${b.id}] 문항 유형을 선택해주세요.`);
            }

            const validRules = (b.info || []).filter(r =>
                String(r.label2 ?? '').trim() !== '' || String(r.label || '').trim() !== ''
            );
            if (validRules.length === 0) {
                return modal.showAlert('알림', `[${b.id}] 최소 1개의 보기를 작성해야 합니다.`);
            }

            const hasEmptyLabel2 = validRules.some(r => String(r.label2 ?? '').trim() === '');
            if (hasEmptyLabel2) {
                return modal.showAlert('알림', `[${b.id}] "할당될 값"은 필수입니다.`);
            }

            const hasNonNumericLabel2 = validRules.some(r => {
                const val = String(r.label2 ?? '').trim();
                return val !== '' && isNaN(Number(val));
            });
            if (hasNonNumericLabel2) {
                return modal.showAlert('알림', `[${b.id}] "할당될 값"은 숫자만 입력 가능합니다.`);
            }
        }

        // 4. 전송용 payloadVariables 객체 구성
        const payloadVariables = {};
        for (const b of dirtyBanners) {
            const nextId = b.id.trim().toUpperCase();
            const validRules = (b.info || []).filter(r =>
                String(r.label2 ?? '').trim() !== '' || String(r.label || '').trim() !== ''
            );
            payloadVariables[nextId] = {
                id: nextId,
                label: b.label.trim(),
                type: b.type,
                recoded_type: 'computed',
                info: validRules.map((r, idx) => {
                    const parsedVal = parseFloat(r.label2);
                    const itemData = {
                        index: idx + 1,
                        value: isNaN(parsedVal) ? String(r.label2 ?? '') : parsedVal,
                        label: String(r.label || '')
                    };
                    if (r.logic) itemData.logic = String(r.logic);
                    return itemData;
                })
            };
        }

        try {
            loadingSpinner.show();
            const result = await saveBaseVariableMerge.mutateAsync({ pageid: pageId, user, variables: payloadVariables });
            if (result?.success === '777') {
                // 재계산 API 호출
                await recomputeComputedVariables.mutateAsync({ pageid: pageId, user });

                modal.showAlert('알림', '문항이 저장되었습니다.');
                if (onUnsavedChange) onUnsavedChange(false);

                // 현재 활성화된 ID를 유지하여 리스트 재조회
                const currentActiveId = currentId.trim().toUpperCase();
                await fetchVariablesData('select', currentActiveId);
                setTimeout(scrollToBottom, 100);
                return true;
            } else {
                modal.showAlert('오류', result?.Message || '저장 중 문제가 발생했습니다.');
            }
        } catch (error) {
            console.error(error);
            modal.showAlert('오류', '저장 요청에 실패했습니다.');
        } finally {
            loadingSpinner.hide();
        }
        return false;
    };

    const handleCloseEdit = useCallback(() => {
        setCurrentInfo(prev => prev.map(it => ({ ...it, inEdit: false })));
        currentInfoRef.current = currentInfoRef.current.map(it => ({ ...it, inEdit: false }));
    }, []);

    return (
        <>
            <style>{`.dp-add-question-dropdown .k-input-value-text { font-weight: 400 !important; }`}</style>
            <DataHeader title="문항추가" onSave={handleSaveBanner}>
                <Button
                    onClick={() => setIsCartesianModalOpen(true)}
                    className="dp-btn"
                    style={{ color: '#2563eb', border: '1px solid #2563eb', background: '#ffffff', height: '32px', padding: '0 16px', display: 'flex', alignItems: 'center', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                    <Wand2 size={14} style={{ marginRight: '6px' }} /> 변수 조합기 (자동생성)
                </Button>
            </DataHeader>
            <div className="dp-request-container" style={{ flex: 1, minHeight: 0, padding: '16px', gap: '12px' }} onClick={handleCloseEdit}>
                <div className="dp-main-layout" onClick={(e) => e.stopPropagation()} style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
                    {/* 사이드바 */}
                    <div className={`dp-sidebar-container ${!isBannerSidebarOpen ? 'collapsed' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
                        {!isBannerSidebarOpen && (
                            <div className="dp-sidebar-collapsed-bar" onClick={() => setIsBannerSidebarOpen(true)}>
                                <div className="dp-collapsed-header"><ChevronRight size={16} /></div>
                            </div>
                        )}
                        <div className="dp-sidebar custom-scrollbar" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                            <div className="dp-sidebar-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '8px' }}>
                                <span>추가된 문항 목록 ({filteredBanners.length})</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <button onClick={handleAddNew} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', height: '24px', padding: '0 8px', borderRadius: '4px', border: '1px solid #2563eb', color: '#2563eb', background: '#eff6ff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                                        <Plus size={12} /> 추가
                                    </button>
                                    <button className="dp-sidebar-toggle-btn-compact" onClick={() => setIsBannerSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center' }}>
                                        <ChevronLeft size={16} />
                                    </button>
                                </div>
                            </div>
                            <div className="dp-sidebar-header" style={{ display: 'flex', alignItems: 'center', padding: '12px', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
                                <div className="dp-search-input-wrapper" style={{ flex: 1, width: '100%' }}>
                                    <Search size={14} className="dp-search-input-icon" />
                                    <input type="text" placeholder="문항명 또는 ID 검색" value={bannerSearch} onChange={(e) => setBannerSearch(e.target.value)} className="dp-search-input" />
                                </div>
                            </div>
                            <div ref={listContainerRef} className="dp-banner-list" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                                {filteredBanners.map(banner => (
                                    <div key={banner.id}
                                        className={`dp-banner-item ${selectedBanner === banner.id ? 'active' : ''}`}
                                        onClick={() => selectBanner(banner)}
                                        style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', minHeight: '40px', borderRadius: '8px' }}
                                        title={`${banner.label || ''}${banner.id && !banner.id.startsWith('NEW_') ? ` (${banner.id})` : ''}`}
                                    >
                                        <div className="dp-banner-item-info" style={{ flex: 1, paddingRight: '8px' }}>
                                            <span className="dp-banner-label" style={{ display: 'block', marginBottom: '1px', lineHeight: 1.3, fontSize: '12px', wordBreak: 'break-all' }}>
                                                {banner.id.startsWith('NEW_') ? (banner.label || '(새 문항 작성 중)') : banner.label}
                                            </span>
                                            <span className="dp-banner-sub" style={{ display: 'block', fontSize: '11px', opacity: 0.6, wordBreak: 'break-all', lineHeight: 1.3 }}>
                                                {banner.id.startsWith('NEW_') ? '저장 대기' : banner.id}
                                                {banner.isDirty && <span style={{ color: '#DC2626', fontSize: '11px', marginLeft: '4px' }}>(수정됨)</span>}
                                            </span>
                                        </div>
                                        <button className="dp-banner-delete" onClick={(e) => handleDeleteBanner(e, banner.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 콘텐츠 영역 */}
                    <div className="dp-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <div className="dp-content-header" style={{ height: '48px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                            <div className="dp-content-label-edit" style={{ display: 'flex', alignItems: 'center', gap: '24px', flex: 1, minWidth: 0 }}>
                                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>문항 ID</span>
                                    <input
                                        type="text"
                                        value={currentId}
                                        readOnly
                                        className="dp-input"
                                        style={{ flex: 1, minWidth: 0, height: '32px', padding: '0 12px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#f8fafc', color: '#64748b', cursor: 'not-allowed' }}
                                    />
                                </div>
                                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>문항 라벨</span>
                                    <input
                                        type="text"
                                        value={currentLabel}
                                        onChange={(e) => {
                                            setCurrentLabel(e.target.value);
                                            currentLabelRef.current = e.target.value;
                                        }}
                                        className="dp-input"
                                        style={{ flex: 1, minWidth: 0, height: '32px', padding: '0 12px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                                    />
                                </div>
                                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>문항 유형</span>
                                    <DropDownList
                                        data={["single", "scale", "multi", "rank", "open(문자)", "open(숫자)"]}
                                        value={currentXInfo || ''}
                                        className="dp-add-question-dropdown"
                                        onChange={(e) => {
                                            setCurrentXInfo(e.value);
                                            currentXInfoRef.current = e.value;
                                        }}
                                        style={{ flex: 1, minWidth: 0, height: '32px', fontSize: '13px', fontWeight: 400, borderRadius: '6px' }}
                                    />
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 0 16px', flexShrink: 0 }}>
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500, userSelect: 'none' }}>
                                💡 입력창 중 하나를 선택해 엑셀 열을 붙여넣기(Ctrl+V)하면 아래로 자동 채워집니다.
                            </span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => setIsBulkEditModalOpen(true)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        height: '28px',
                                        padding: '0 12px',
                                        borderRadius: '6px',
                                        border: '1px solid #cbd5e1',
                                        color: '#475569',
                                        background: '#FFFFFF',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s',
                                        boxSizing: 'border-box'
                                    }}
                                    onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8'; }}
                                    onMouseOut={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                >
                                    조건 일괄 편집
                                </button>
                                <button
                                    onClick={handleCopyGrid}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        height: '28px',
                                        padding: '0 12px',
                                        borderRadius: '6px',
                                        border: '1px solid #cbd5e1',
                                        color: '#475569',
                                        background: '#FFFFFF',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s',
                                        boxSizing: 'border-box'
                                    }}
                                    onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8'; }}
                                    onMouseOut={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                >
                                    그리드 복사
                                </button>
                            </div>
                        </div>
                        <div className="dp-table-container" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                            <AddQuestionContext.Provider value={{ currentInfo, updateBannerInfo }}>
                                <KendoGridV2
                                    data={currentInfo}
                                    reorderable showNo deletable addable showNoRecordsAddBtn={false} editField="inEdit"
                                    onDataChange={updateBannerInfo}
                                    onRowClick={handleRowClick}
                                    newRowTemplate={{ label2: '', label: '', logic: '' }}
                                >
                                    <Column field="label2" title="할당될 값" width="120px" cell={PasteableEditCell} />
                                    <Column field="label" title="보기 라벨" width="300px" cell={PasteableEditCell} />
                                    <Column field="logic" title="조건" headerCell={ConditionHeaderCell} cell={PasteableEditCell} />
                                </KendoGridV2>
                            </AddQuestionContext.Provider>
                        </div>
                    </div>
                </div>
            </div>

            <CartesianGeneratorModal
                show={isCartesianModalOpen}
                onClose={() => setIsCartesianModalOpen(false)}
                variables={baseVariables}
                onApply={async (rules) => {
                    const mappedRules = rules.map(rule => ({ label2: rule.label2, label: rule.label, logic: rule.logic, inEdit: false }));
                    const pageId = sessionStorage.getItem('pageId');
                    const user = auth?.user?.userId;

                    // 현재 선택/작성 중인 문항 ID가 없다면 자동으로 신규 ID를 서버에서 받아와 문항 개설
                    if (!currentId && pageId && user) {
                        try {
                            loadingSpinner.show();
                            const res = await getNextBaseVariableId.mutateAsync({ pageid: pageId, user });
                            if (res?.success === '777' && res.resultjson?.next_id) {
                                const tempId = getUniqueNextId(res.resultjson.next_id, banners);
                                const newBanner = { id: tempId, label: '', type: 'single', recoded_type: 'computed', info: mappedRules, isDirty: true };

                                // 현재 active banner의 변경 사항을 임시로 캡처
                                const prevId = selectedBannerRef.current;
                                if (prevId) {
                                    const capturedInfo = currentInfoRef.current;
                                    const capturedLabel = currentLabelRef.current;
                                    const capturedXInfo = currentXInfoRef.current;
                                    const capturedId = currentIdRef.current;
                                    setBanners(prev => {
                                        const b = prev.find(x => x.id === prevId);
                                        const isSame = b && b.label === capturedLabel &&
                                            (b.type || 'single') === capturedXInfo &&
                                            b.info === capturedInfo &&
                                            (b.tempId || b.id) === capturedId;
                                        const updated = prev.map(x =>
                                            x.id === prevId
                                                ? {
                                                    ...x,
                                                    label: capturedLabel,
                                                    type: capturedXInfo,
                                                    tempId: capturedId,
                                                    info: capturedInfo,
                                                    isDirty: isSame ? x.isDirty : true
                                                }
                                                : x
                                        );
                                        return [...updated, newBanner];
                                    });
                                } else {
                                    setBanners(prev => [...prev, newBanner]);
                                }

                                setTimeout(scrollToBottom, 100);
                                setSelectedBanner(tempId);
                                selectedBannerRef.current = tempId;

                                setCurrentId(tempId);
                                currentIdRef.current = tempId;

                                setCurrentLabel('');
                                currentLabelRef.current = '';

                                setCurrentXInfo('single');
                                currentXInfoRef.current = 'single';

                                setCurrentInfo(mappedRules);
                                currentInfoRef.current = mappedRules;
                            } else {
                                modal.showAlert('오류', '신규 문항 ID를 받아오지 못했습니다.');
                            }
                        } catch (err) {
                            console.error(err);
                            modal.showAlert('오류', '신규 문항 ID 발급 중 문제가 발생했습니다.');
                        } finally {
                            loadingSpinner.hide();
                        }
                    } else {
                        // 기존 문항이 선택되어 있다면 조합된 보기 덮어쓰기/추가
                        setCurrentInfo(prev => {
                            const newInfo = (prev.length === 1 && !prev[0].label2 && !prev[0].label && !prev[0].logic)
                                ? mappedRules : [...prev, ...mappedRules];
                            currentInfoRef.current = newInfo;
                            return newInfo;
                        });
                    }
                    if (onUnsavedChange) onUnsavedChange(true);
                }}
            />
            <BulkEditConditionsModal
                show={isBulkEditModalOpen}
                currentInfo={currentInfo}
                onClose={() => setIsBulkEditModalOpen(false)}
                onApply={(mapping) => {
                    const updated = currentInfo.map(item => {
                        const itemLabel = String(item.label ?? '').trim();
                        if (mapping[itemLabel] !== undefined) {
                            return {
                                ...item,
                                logic: mapping[itemLabel]
                            };
                        }
                        return item;
                    });
                    updateBannerInfo(updated);
                }}
            />
            <Toast
                show={toast.show}
                message={toast.message}
                onClose={() => setToast({ ...toast, show: false })}
            />
        </>
    );
});

export default AddQuestionPage;
