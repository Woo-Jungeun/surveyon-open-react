import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useSelector } from 'react-redux';
import { X, Check, Download, Plus, Trash2, AlertCircle, Sliders, ChevronDown, Loader2, RotateCcw } from 'lucide-react';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { MapManagementPageApi } from './MapManagementPageApi';
import { modalContext } from "@/components/common/Modal.jsx";
import moment from 'moment';
import * as signalR from "@microsoft/signalr";
import { AES256 } from "@/common/utils/AES256";
import './CustomDownloadModal.css';

// 문법 데이터 전역 캐시
let syntaxGlobalCache = null;

function normalizeSyntax(res) {
    const rj = res?.resultjson || {};
    const groups = (rj.groups || []).map(g => ({ title: g.group || '', rows: g.items || [] }));
    if (rj.legacy?.length) {
        groups.push({ title: '옛 글자 — 읽기는 되지만 새로 쓰지 마세요', rows: rj.legacy.map(r => ({ ...r, legacy: true })) });
    }
    return groups.filter(g => g.rows.length > 0);
}

// 문항 형식별 연산자 (정의서: 형식별 연산자 표)
// id 로 식을 만듦: in / notin = 목록, notnull / null = 응답 여부, 그 외 = 비교 연산자
const OP_NOTNULL = { id: 'notnull', text: '응답함' };
const OP_NULL = { id: 'null', text: '미응답' };
const OPS_CHOICE = [{ id: 'in', text: '다음 중 하나' }, { id: 'notin', text: '다음 아님' }, OP_NOTNULL, OP_NULL];
const OPS_MULTI = [{ id: 'in', text: '하나라도 골랐다' }, { id: 'notin', text: '고르지 않았다' }, OP_NOTNULL, OP_NULL];
const OPS_AI = [{ id: 'in', text: '받았다' }, { id: 'notin', text: '안 받았다' }, OP_NOTNULL, OP_NULL];
const CMP_OPS = ['==', '!=', '>=', '<=', '>', '<'];
const OPS_NUM = [...CMP_OPS.map(s => ({ id: s, text: s })), OP_NOTNULL, OP_NULL];
const OPS_TEXT = [OP_NOTNULL, OP_NULL];
const MULTI_TYPES = ['multi', 'rank', 'minrank', 'maxrank', 'custom'];

const splitVals = (s) => String(s || '').split(/[\s,]+/).map(x => x.trim()).filter(Boolean);
const isOrConn = (c) => c === 'OR' || c === '또는';
const newItemId = () => Date.now() + Math.random();
const newRow = () => ({
    id: newItemId(),
    connector: 'AND',
    varId: '',
    varLabel: '',
    operator: 'in',
    options: [],
    valueText: '',
    extraText: '',
    aiFallback: false
});
const newGroup = () => ({ kind: 'group', id: newItemId(), connector: 'AND', children: [newRow()] });

// 행 / 괄호 묶음(한 단계) 공통 갱신 · 삭제
const mapItems = (items, id, fn) => (items || []).map(it => {
    if (it.id === id) return fn(it);
    if (it.kind === 'group') return { ...it, children: mapItems(it.children, id, fn) };
    return it;
});
const removeItem = (items, id) => (items || [])
    .filter(it => it.id !== id)
    .map(it => (it.kind === 'group' ? { ...it, children: removeItem(it.children, id) } : it))
    .filter(it => it.kind !== 'group' || it.children.length > 0);

// 응답 정보 필드: 서버 보기 중 '전체'에 해당하는 것은 화면의 [전체] 칩으로 대신
const isAllOption = (o) => o == null || o.value === '' || o.value == null
    || String(o.value).toLowerCase() === 'all' || String(o.name || '').trim() === '전체';
const emptyFieldValue = (f) => (f.kind === 'period' ? { from: '', to: '' } : f.kind === 'many' ? [] : '');

// PID 확인 결과 목록 (앞 200개) 이름
const PID_LIST_LABELS = {
    matchedPids: '맞음',
    notMatchedPids: '조건에 안 맞음',
    otherStatePids: '다른 컨택상황',
    notFoundPids: '이 설문에 없음'
};

const SUB_FORMAT_OPTIONS = [
    { id: 'crd', token: 'crd', label: '.crd' },
    { id: 'sps', token: 'sps', label: '.sps' },
    { id: 'sps_open', token: 'sps-open', label: '.sps + 오픈' },
    { id: 'open_excel', token: 'open-excel', label: '오픈만 (Excel)' }
];

const CustomDownloadModal = ({
    isOpen,
    onClose,
    onCloseAll,
    variables = [],
    customFilterInfo = null,
    onApplyCustomFilter,
    onClearCustomFilter
}) => {
    const auth = useSelector((store) => store.auth);
    const modal = useContext(modalContext);

    const handleCloseAll = () => {
        if (onCloseAll) {
            onCloseAll();
        } else if (onClose) {
            onClose();
        }
    };

    const {
        exportStates,
        exportCustomFields,
        exportCustomEstimate,
        exportCustomCheck,
        exportCustomTicket,
        resetExportSupplyTool,
        exportSupplyToolStatus,
        getCheckLogicSyntax
    } = MapManagementPageApi();

    const initialPn = sessionStorage.getItem('merge_pn') || sessionStorage.getItem('projectnum') || '';
    const initialProjectName = sessionStorage.getItem('projectname') || '';
    const userId = auth?.user?.userId || sessionStorage.getItem('userId') || '';

    // 프로젝트 식별자 State
    const [modalPn, setModalPn] = useState(initialPn);
    const [modalProjectName, setModalProjectName] = useState(initialProjectName);
    const [isSavProject, setIsSavProject] = useState(false);

    // --- 조건 State ---
    // 1. 컨택상황
    const [contactStates, setContactStates] = useState([]);
    const [statesLoading, setStatesLoading] = useState(false);
    const [selectedStates, setSelectedStates] = useState([]);
    // [조건 비우기] 때 되돌릴 기본 선택 (서버 defaultCodes → 없으면 '완료')
    const [defaultStateCodes, setDefaultStateCodes] = useState([]);
    // 서버가 내려준 상태 중 '완료'의 코드 (없으면 null)
    const completeStateCode = useMemo(() => {
        const found = contactStates.find(s => String(s.name || '').trim() === '완료');
        return found ? found.code : null;
    }, [contactStates]);

    // 2. 설문 문항 조건 행들 & 식
    const [conditionRows, setConditionRows] = useState([]);
    const [isFormulaDirect, setIsFormulaDirect] = useState(false);
    const [formulaText, setFormulaText] = useState('');
    const [syntaxErrorMsg, setSyntaxErrorMsg] = useState('');

    // 문법 도움말 (/check-logic/syntax) 관련 상태
    const [helpOpen, setHelpOpen] = useState(false);
    const [syntaxData, setSyntaxData] = useState(syntaxGlobalCache);
    const [loadingSyntax, setLoadingSyntax] = useState(false);

    const handleToggleHelp = async () => {
        const next = !helpOpen;
        setHelpOpen(next);
        if (next && !syntaxData) {
            if (syntaxGlobalCache) {
                setSyntaxData(syntaxGlobalCache);
                return;
            }
            setLoadingSyntax(true);
            try {
                if (getCheckLogicSyntax) {
                    const res = await getCheckLogicSyntax();
                    const norm = normalizeSyntax(res);
                    if (norm && norm.length > 0) {
                        syntaxGlobalCache = norm;
                        setSyntaxData(norm);
                        setLoadingSyntax(false);
                        return;
                    }
                }
            } catch (err) {
                console.warn("load check-logic syntax error:", err);
            }
            // API 미응답 시 풍부한 폴백 문법표
            const fallback = [
                {
                    title: '비교 연산',
                    rows: [
                        { token: '==', meaning: '같다', example: 'q1 == 1' },
                        { token: '!=', meaning: '다르다', example: 'q1 != 2' },
                        { token: '>, <', meaning: '보다 크다, 작다', example: 'q2 > 20' },
                        { token: '>=, <=', meaning: '이상, 이하', example: 'q2 >= 20' }
                    ]
                },
                {
                    title: '포함 및 다중 선택',
                    rows: [
                        { token: 'in [1, 2, 3]', meaning: '다음 중 하나라도 골랐다', example: 'q10 in [1, 2, 3]' },
                        { token: 'not in [1, 2]', meaning: '목록에 포함되지 않는다', example: 'q10 not in [4, 5]' }
                    ]
                },
                {
                    title: '논리 연결',
                    rows: [
                        { token: 'and', meaning: '그리고 (모두 만족)', example: 'q1 == 1 and q2 >= 30' },
                        { token: 'or', meaning: '또는 (하나라도 만족)', example: 'q10 == 1 or q10 == 2' },
                        { token: 'not', meaning: '아니다 (부정)', example: 'not (q1 == 2)' }
                    ]
                }
            ];
            syntaxGlobalCache = fallback;
            setSyntaxData(fallback);
            setLoadingSyntax(false);
        }
    };

    // 3. 응답 정보 — /export/custom/fields 의 fields[] 로 화면을 그림 (key, name, kind, request[], options[], hint)
    const [infoFields, setInfoFields] = useState([]);
    const [fieldValues, setFieldValues] = useState({});

    // 4. 응답자 PID
    const [pidText, setPidText] = useState('');
    const [pidListOpen, setPidListOpen] = useState(false);

    // --- 우측 결과 State ---
    // statusMode: 'init' | 'changed' | 'checking' | 'ready' | 'empty' | 'syntax_error' | 'error'
    const [statusMode, setStatusMode] = useState('init');
    const [checkResult, setCheckResult] = useState(null);
    const [checkErrorMsg, setCheckErrorMsg] = useState('');
    const [checkProgress, setCheckProgress] = useState('');       // 확인 중 진행 문구 (SignalR ReceiveProgress)

    // 형식 선택
    const [isSavSelected, setIsSavSelected] = useState(true);
    const [selectedSubFormats, setSelectedSubFormats] = useState([]);
    const [fileStem, setFileStem] = useState('');

    // 다운로드 실행 중
    const [downloading, setDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(''); // 받는 중 진행 문구 (SignalR ReceiveProgress)
    const [checkingTool, setCheckingTool] = useState(false);
    const [countdown, setCountdown] = useState(10);
    const countdownTimerRef = useRef(null);
    const toolPollTimerRef = useRef(null);

    // [맞는 응답 수 보기] (수동)
    const checkReqRef = useRef(0);          // 늦게 도착한 이전 요청 결과 무시용
    const lastCheckedKeyRef = useRef(null); // 마지막으로 확인한 조건 — 바뀌면 결과를 지우고 [받기] 잠금

    // 실제 API로 컨택상황 및 응답 정보 필드(/export/custom/fields) 불러오기
    useEffect(() => {
        if (isOpen && initialPn) {
            setStatesLoading(true);
            exportStates.mutateAsync({ pn: initialPn, user: userId }).then(res => {
                if (String(res?.success) === '777') {
                    const states = res.resultjson?.states || [];
                    setContactStates(states);
                    // 기본 선택: 서버 defaultCodes(완료) → 없으면 이름이 '완료'인 상태 (처음 열 때만)
                    const serverDefaults = Array.isArray(res.resultjson?.defaultCodes)
                        ? res.resultjson.defaultCodes.filter(c => states.some(s => String(s.code) === String(c)))
                            .map(c => states.find(s => String(s.code) === String(c)).code)
                        : [];
                    const done = states.find(s => String(s.name || '').trim() === '완료');
                    const defaults = serverDefaults.length > 0 ? serverDefaults : (done ? [done.code] : []);
                    setDefaultStateCodes(defaults);
                    setSelectedStates(prev => {
                        const valid = prev.filter(c => states.some(s => s.code === c));
                        if (valid.length > 0) return valid;
                        return defaults;
                    });
                }
            }).catch((err) => {
                console.warn('exportStates error:', err);
            }).finally(() => setStatesLoading(false));

            if (exportCustomFields) {
                exportCustomFields.mutateAsync({ pn: initialPn, user: userId }).then(res => {
                    if (String(res?.success) === '777' && res.resultjson) {
                        if (res.resultjson.available === false) {
                            // SAV 설문 등: 응답 정보 칸 전체 숨김
                            setIsSavProject(true);
                            setInfoFields([]);
                            return;
                        }
                        const fields = Array.isArray(res.resultjson.fields)
                            ? res.resultjson.fields.filter(f => f && f.key && ['period', 'one', 'many'].includes(f.kind))
                            : [];
                        setInfoFields(fields);
                        setFieldValues(prev => {
                            const next = {};
                            fields.forEach(f => { next[f.key] = prev[f.key] ?? emptyFieldValue(f); });
                            return next;
                        });
                    }
                }).catch((err) => {
                    console.warn('exportCustomFields error:', err);
                });
            }
        }
    }, [isOpen, initialPn, userId]);

    // 응답 정보 필드 값 변경 ('전체' = 빈 값 → 서버로 보내지 않음)
    const setFieldValue = (key, value) => {
        setFieldValues(prev => ({ ...prev, [key]: value }));
    };

    // 컨택상황 토글
    const handleToggleState = (code) => {
        setSelectedStates(prev =>
            prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
        );
    };

    // 문항 정보 (형식별 연산자 · 보기 · AI 코드)
    const findVar = (varId) => (varId ? variables.find(v => v && (v.name === varId || v.sysName === varId)) : null);

    const getVarMeta = (varId) => {
        const v = findVar(varId);
        const type = String(v?.type || '').toLowerCase();
        const toOptions = (labels, isAi) => (labels || [])
            .filter(l => l && l.code !== undefined && l.code !== null && String(l.code).trim() !== '')
            .map(l => ({ code: l.code, label: l.label, selected: true, ...(isAi ? { isAi: true } : {}) }));
        const baseOptions = toOptions(v?.labels, false);
        const aiOn = !!v?.isAiOpened && !v?.excludeOpenMerge;
        const openRule = String(v?.etcOpen || '').trim();

        // AI 전체 오픈 (isAiOpened 켬 · noOpenMerge 끔 · openRule 비어 있음) → 문항 라벨로 받았다 / 안 받았다
        if (aiOn && !openRule) return { ops: OPS_AI, options: baseOptions, aiFallback: false };
        if (type.includes('문자')) return { ops: OPS_TEXT, options: [], aiFallback: false };
        if (type.includes('숫자')) return { ops: OPS_NUM, options: [], aiFallback: false };

        let ops;
        if (MULTI_TYPES.includes(type)) ops = OPS_MULTI;
        else if (type === 'single' || type === 'scale') ops = OPS_CHOICE;
        else ops = baseOptions.length > 0 ? OPS_CHOICE : OPS_NUM; // dummy 등: 보기 있으면 단일처럼, 없으면 숫자처럼
        if (ops === OPS_NUM) return { ops, options: [], aiFallback: false };

        // 기타 → AI 코드 (openRule 예: "6,q50_op6") — 맵에 그 오픈 필드가 있으면 라벨을 점선 칩으로 덧붙임
        let options = baseOptions;
        let aiFallback = false;
        if (aiOn && openRule) {
            const openName = openRule.split(',').map(s => s.trim()).find(s => s && !/^\d+$/.test(s));
            const openVar = openName ? findVar(openName) : null;
            const aiOptions = openVar ? toOptions(openVar.labels, true) : [];
            if (aiOptions.length > 0) {
                const seen = new Set(baseOptions.map(o => String(o.code)));
                options = [...baseOptions, ...aiOptions.filter(o => !seen.has(String(o.code)))];
            } else {
                aiFallback = true; // 맵에 없으면 AI 코드를 직접 입력
            }
        }
        return { ops, options, aiFallback };
    };

    // 행 1개 → 식 (미완성 행: 문항 미선택 / 값 없음 은 빈 문자열)
    const rowExpr = (r) => {
        const varId = String(r.varId || '').trim();
        if (!varId) return '';
        const op = r.operator || 'in';
        if (op === 'null') return `${varId} is null`;
        if (op === 'notnull') return `${varId} is not null`;
        if (CMP_OPS.includes(op)) {
            const v = splitVals(r.valueText)[0];
            return v ? `${varId} ${op} ${v}` : '';
        }
        const hasOptions = (r.options || []).length > 0;
        const picked = hasOptions
            ? r.options.filter(o => o.selected).map(o => String(o.code))
            : splitVals(r.valueText);
        const extra = r.aiFallback && hasOptions ? splitVals(r.extraText) : [];
        const vals = [...new Set([...picked, ...extra])];
        if (vals.length === 0) return '';
        return `${varId} ${op === 'notin' ? 'not in' : 'in'} [${vals.join(', ')}]`;
    };

    // 조건식 동기화 — 행과 괄호 묶음(한 단계)을 순서대로 이어 붙임
    const buildFormulaFromRows = (items) => {
        let out = '';
        (items || []).forEach(it => {
            let expr;
            if (it.kind === 'group') {
                const inner = buildFormulaFromRows(it.children);
                expr = inner ? `(${inner})` : '';
            } else {
                expr = rowExpr(it);
            }
            if (!expr) return;
            out += (out ? (isOrConn(it.connector) ? ' or ' : ' and ') : '') + expr;
        });
        return out;
    };

    const syncFormulaFromRows = (rows) => {
        setFormulaText(buildFormulaFromRows(rows));
    };

    const commitRows = (rows) => {
        setConditionRows(rows);
        syncFormulaFromRows(rows);
    };

    // 직접 편집 → 조건 블록 복귀
    // 직접 고친 식은 블록으로 변환되지 않으므로, 블록 기준 식과 다르면 확인 후 블록 기준으로 되돌림
    const handleBackToBlocks = () => {
        const blockFormula = buildFormulaFromRows(conditionRows);
        if (formulaText.trim() === blockFormula.trim()) {
            setIsFormulaDirect(false);
            return;
        }
        modal.showConfirm(
            "알림",
            "직접 고친 식은 조건 블록으로 변환되지 않습니다.\n블록 형태로 돌아가면 직접 고친 내용은 사라집니다.\n계속하시겠습니까?",
            {
                btns: [
                    { title: "취소", click: () => { } },
                    {
                        title: "확인",
                        click: () => {
                            setFormulaText(blockFormula);
                            setIsFormulaDirect(false);
                        }
                    }
                ]
            }
        );
    };

    // 조건 행 추가 (빈 행: 사용자가 문항을 직접 선택) — groupId 가 있으면 그 괄호 안에 추가
    const handleAddConditionRow = (groupId) => {
        const nextRows = groupId
            ? mapItems(conditionRows, groupId, g => ({ ...g, children: [...(g.children || []), newRow()] }))
            : [...conditionRows, newRow()];
        commitRows(nextRows);
    };

    // [+ 괄호로 묶기] — 빈 행 1개가 든 괄호 묶음 추가 (한 단계)
    const handleAddGroup = () => {
        commitRows([...conditionRows, newGroup()]);
    };

    // 조건 행 / 괄호 묶음 삭제 (괄호 안 마지막 행을 지우면 묶음도 사라짐)
    const handleRemoveConditionRow = (id) => {
        commitRows(removeItem(conditionRows, id));
    };

    // 보기 토글
    const handleToggleOption = (rowId, code) => {
        commitRows(mapItems(conditionRows, rowId, r => ({
            ...r,
            options: (r.options || []).map(o => (o.code === code ? { ...o, selected: !o.selected } : o))
        })));
    };

    // 모든 보기 선택/해제
    const handleToggleAllOptions = (rowId, selectAll) => {
        commitRows(mapItems(conditionRows, rowId, r => ({
            ...r,
            options: (r.options || []).map(o => ({ ...o, selected: selectAll }))
        })));
    };

    const varDropdownOptions = useMemo(() => {
        if (!variables || variables.length === 0) return [];
        return variables
            .filter(v => v && (v.name || v.sysName))
            .map(v => ({
                text: v.label ? `(${v.name || v.sysName}) ${v.label}` : `(${v.name || v.sysName})`,
                value: v.name || v.sysName
            }));
    }, [variables]);

    // 조건 행 / 묶음 업데이트 (연결자, 연산자, 값)
    const handleUpdateRow = (rowId, field, value) => {
        commitRows(mapItems(conditionRows, rowId, r => ({ ...r, [field]: value })));
    };

    // 조건 행 문항 변경 — 형식에 맞는 첫 연산자 · 보기(+AI 코드)로 다시 채움
    const handleUpdateRowVar = (rowId, varId, varLabel) => {
        const meta = varId ? getVarMeta(varId) : null;
        commitRows(mapItems(conditionRows, rowId, r => ({
            ...r,
            varId: varId || '',
            varLabel: varId ? (varLabel || varId) : '',
            operator: meta ? meta.ops[0].id : 'in',
            // 보기 라벨이 없는 문항은 값을 직접 입력 (가짜 보기 생성 금지)
            options: meta ? meta.options : [],
            valueText: '',
            extraText: '',
            aiFallback: !!meta?.aiFallback
        })));
    };

    const parsedPidList = useMemo(() => {
        if (!pidText.trim()) return [];
        return pidText
            .split(/[\r\n, \t]+/)
            .map(s => s.trim())
            .filter(Boolean);
    }, [pidText]);

    // 서버로 보낼 조건 객체 (check / estimate / 다운로드 공통)
    const buildConditions = () => {
        const conditions = {
            answerStateCode: selectedStates.join(',')
        };
        if (formulaText.trim()) conditions.expr = formulaText.trim();
        if (parsedPidList.length > 0) conditions.pids = parsedPidList;
        // 응답 정보: fields[].request[] 이름으로 보냄 ('전체' 는 보내지 않음)
        if (!isSavProject) {
            infoFields.forEach(f => {
                const val = fieldValues[f.key];
                const req = Array.isArray(f.request) && f.request.length > 0 ? f.request : null;
                if (f.kind === 'period') {
                    const fromKey = req?.[0] || 'completedFrom';
                    const toKey = req?.[1] || 'completedTo';
                    if (val?.from) conditions[fromKey] = val.from;
                    if (val?.to) conditions[toKey] = val.to;
                } else if (f.kind === 'many') {
                    if (Array.isArray(val) && val.length > 0) conditions[req?.[0] || f.key] = val;
                } else if (val !== '' && val !== null && val !== undefined) {
                    conditions[req?.[0] || f.key] = val;
                }
            });
        }
        return conditions;
    };

    // 선택한 형식 토큰 (gb)
    const buildGbTokens = () => {
        const tokens = [];
        if (isSavSelected) tokens.push('sav');
        selectedSubFormats.forEach(f => tokens.push(f));
        return tokens;
    };

    // 추출 방식 예상 (POST /export/custom/estimate) — 형식을 고르거나 바꿀 때
    // track: "server" | "tool", reason: 버튼 아래 그대로 표시
    const [estimate, setEstimate] = useState(null);
    const estimateReqRef = useRef(0);
    const formatKey = JSON.stringify([isSavSelected, selectedSubFormats]);
    useEffect(() => {
        const reqId = ++estimateReqRef.current;
        if (!isOpen || statusMode !== 'ready' || !checkResult) {
            setEstimate(null);
            return;
        }
        const tokens = buildGbTokens();
        if (tokens.length === 0) {
            setEstimate(null);
            return;
        }
        exportCustomEstimate.mutateAsync({
            pn: modalPn,
            user: userId,
            matchId: checkResult.matchId,
            conditions: buildConditions(),
            gb: tokens.join(',')
        }).then(res => {
            if (reqId !== estimateReqRef.current) return;
            const d = String(res?.success) === '777' ? res.resultjson : null;
            setEstimate(d && d.track ? { track: d.track, reason: d.reason || '' } : null);
        }).catch(err => {
            if (reqId !== estimateReqRef.current) return;
            console.warn('exportCustomEstimate error:', err);
            setEstimate(null);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, statusMode, checkResult, formatKey]);

    // PC 도구 트랙 여부: estimate 결과 우선, 없으면 check 의 isToolRequired
    const isToolMode = estimate ? estimate.track === 'tool' : !!checkResult?.isToolRequired;

    // PC 도구 확인 타이머 정리
    const stopToolWatch = () => {
        if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
        }
        if (toolPollTimerRef.current) {
            clearInterval(toolPollTimerRef.current);
            toolPollTimerRef.current = null;
        }
    };
    useEffect(() => () => stopToolWatch(), []);

    // 도구가 감지되지 않을 때 설치 안내 (지금 다운로드 팝업과 같은 안내)
    const showToolInstallGuide = (downloadUrl) => {
        modal.showConfirm(
            "PC 내보내기 도구 설치 안내",
            "PC 내보내기 도구가 감지되지 않았습니다.\n\n" +
            "1. [도구 다운로드] 버튼을 눌러 SurveyonExportTool.exe를 내려받아 주세요.\n" +
            "2. 내려받은 파일(SurveyonExportTool.exe)을 더블클릭 후 [예]를 눌러 설치를 완료해 주세요.\n" +
            "3. 설치 완료 후 [내 PC에서 받기] 버튼을 다시 눌러주시면 작업이 시작됩니다.\n\n" +
            "(※ 이미 설치하셨다면 브라우저 확장 프로그램의 프로토콜 차단 여부를 확인해 주세요.)",
            {
                btns: [
                    { title: "닫기", click: () => { } },
                    {
                        title: "도구 다운로드",
                        click: () => {
                            const link = document.createElement('a');
                            link.href = downloadUrl;
                            link.setAttribute('download', 'SurveyonExportTool.exe');
                            document.body.appendChild(link);
                            link.click();
                            link.parentNode.removeChild(link);
                        }
                    }
                ]
            }
        );
    };

    // PC 내보내기 도구 구동 함수
    const launchCustomPcTool = async (gbTokens, currentConditions) => {
        const host = window.API_CONFIG?.API_BASE_URL_DATAMANAGEMENT || window.API_CONFIG?.API_BASE_URL || window.location.origin;
        try {
            stopToolWatch();
            setCheckingTool(true);
            setCountdown(10);

            // ① 커스텀 티켓 발급 (POST /export/custom/ticket)
            const ticketRes = await exportCustomTicket.mutateAsync({
                pn: modalPn,
                user: userId,
                matchId: checkResult?.matchId,
                conditions: currentConditions
            });

            if (String(ticketRes?.success) !== '777' || !ticketRes?.resultjson?.ticket) {
                setCheckingTool(false);
                const errMsg = ticketRes?.resultjson?.errorcontent || ticketRes?.message || "도구 티켓 발급에 실패했습니다.";
                modal.showAlert("알림", errMsg);
                return;
            }

            const ticket = ticketRes.resultjson.ticket;

            // ② 지난 결과 지우기 (POST /export/supply/tool/reset)
            try {
                await resetExportSupplyTool.mutateAsync({ pn: modalPn, user: userId });
            } catch (e) {
                console.warn("resetExportSupplyTool warning:", e);
            }

            // ③ 프로토콜 조립 및 실행 (surveyonexport://run?central=...&pn=...&gb=...&state=...&ticket=...) — 로그인 토큰은 넣지 않음
            const p = new URLSearchParams();
            p.set('central', host);
            p.set('pn', modalPn);
            p.set('gb', gbTokens.join(','));
            p.set('state', selectedStates.join(','));
            p.set('ticket', ticket);

            window.location.href = `surveyonexport://run?${p.toString()}`;

            // ④ PC 도구 구동 확인 (POST /export/supply/tool/status)
            let remain = 10;
            let finished = false;
            let lastDownloadUrl = '';
            const finish = () => {
                finished = true;
                stopToolWatch();
                setCheckingTool(false);
            };

            const isToolRunning = (res) => {
                if (!res) return false;
                const rj = res.resultjson || {};
                const checkVal = (v) => v === true || v === 'true' || v === 1 || v === '1';
                if (checkVal(rj.started) || checkVal(rj.alive) || checkVal(rj.running) || checkVal(rj.isStarted)) return true;
                if (checkVal(res.started) || checkVal(res.alive) || checkVal(res.running) || checkVal(res.isStarted)) return true;
                const st = String(rj.status || res.status || '').toLowerCase();
                if (['started', 'running', 'working', 'progress', 'processing'].includes(st)) return true;
                return false;
            };

            const statusPayload = { pn: modalPn, user: userId, ticket };

            countdownTimerRef.current = setInterval(async () => {
                remain -= 1;
                setCountdown(Math.max(0, remain));
                if (remain <= 0 && !finished) {
                    // 시간 만료 직전 최신 상태 1회 추가 확인 (경합 방지)
                    try {
                        const finalRes = await exportSupplyToolStatus.mutateAsync(statusPayload);
                        if (finished) return;
                        if (isToolRunning(finalRes)) {
                            finish();
                            modal.showAlert("알림", "PC 내보내기 도구 창에서 작업이 진행됩니다.");
                            handleCloseAll();
                            return;
                        }
                    } catch (e) { }

                    if (!finished) {
                        finish();
                        showToolInstallGuide(lastDownloadUrl || `${host.replace(/\/+$/, '')}/export/supply/tool/download`);
                    }
                }
            }, 1000);

            toolPollTimerRef.current = setInterval(async () => {
                try {
                    const statusRes = await exportSupplyToolStatus.mutateAsync(statusPayload);
                    if (finished) return;
                    const rj = statusRes?.resultjson || {};
                    if (rj.downloadUrl || statusRes?.downloadUrl) lastDownloadUrl = rj.downloadUrl || statusRes.downloadUrl;
                    if (isToolRunning(statusRes)) {
                        finish();
                        modal.showAlert("알림", "PC 내보내기 도구 창에서 작업이 진행됩니다.");
                        handleCloseAll();
                    }
                } catch (e) {
                    console.warn("exportSupplyToolStatus error:", e);
                }
            }, 1500);

        } catch (err) {
            stopToolWatch();
            setCheckingTool(false);
            modal.showAlert("오류", "PC 도구 실행 요청 중 문제가 발생했습니다: " + (err.message || err));
        }
    };

    // 진행률 수신 (SignalR /hubs/task-progress · ReceiveProgress) — 연결 실패 시 진행 문구만 생략
    const connectProgress = async (onProgress) => {
        let conn = null;
        try {
            const host = window.API_CONFIG?.API_BASE_URL_DATAMANAGEMENT || window.API_CONFIG?.API_BASE_URL || window.location.origin;
            let hubUrl = host.replace(/\/+$/, '') + "/hubs/task-progress";
            if (!hubUrl.startsWith('http')) {
                hubUrl = window.location.origin + hubUrl;
            }
            conn = new signalR.HubConnectionBuilder()
                .withUrl(hubUrl)
                .withAutomaticReconnect()
                .configureLogging(signalR.LogLevel.None)
                .build();
            conn.on("ReceiveProgress", (data) => {
                if (!data) return;
                const msg = typeof data === 'string' ? data : (data.message || data.statusText || '');
                const pct = typeof data === 'object' && data.percent !== undefined && data.percent !== null ? data.percent : null;
                onProgress?.(msg, pct);
            });
            await conn.start();
            const c = conn;
            return { connectionId: c.connectionId || null, stop: () => { c.stop().catch(() => { }); } };
        } catch (e) {
            console.warn("SignalR task-progress 연결 실패 (진행률 수신 생략):", e);
            if (conn) conn.stop().catch(() => { });
            return { connectionId: null, stop: () => { } };
        }
    };

    // 지금 조건 (바뀌면 결과를 지우고 [받기] 잠금)
    const conditionKey = JSON.stringify([modalPn, selectedStates, formulaText, parsedPidList, fieldValues]);

    // [맞는 응답 수 보기] 실행
    const handleExecuteCheck = async () => {
        if (!modalPn || statusMode === 'checking') return;
        if (selectedStates.length === 0) {
            modal.showAlert("알림", "컨택상황을 1개 이상 선택해 주세요.");
            return;
        }

        const reqId = ++checkReqRef.current;
        lastCheckedKeyRef.current = conditionKey;
        setStatusMode('checking');
        setCheckResult(null);
        setSyntaxErrorMsg('');
        setCheckErrorMsg('');
        setCheckProgress('');
        setPidListOpen(false);

        const conditions = buildConditions();
        const progress = await connectProgress((msg, pct) => {
            if (reqId !== checkReqRef.current || !msg) return;
            setCheckProgress(pct !== null ? `${msg} (${pct}%)` : msg);
        });
        if (reqId !== checkReqRef.current) {
            progress.stop();
            return;
        }

        try {
            const res = await exportCustomCheck.mutateAsync({
                pn: modalPn,
                user: userId,
                conditions,
                connectionId: progress.connectionId
            });
            if (reqId !== checkReqRef.current) return; // 조건이 바뀌었거나 더 최신 조회가 있음

            if (String(res?.success) === '777' && res.resultjson) {
                const r = res.resultjson;
                // 실제 응답 필드: matched / scanned / checkedAt / byState / pid / notices / unreadable
                const matchedCount = Number(r.matched ?? r.matchedCount ?? 0) || 0;
                const totalChecked = Number(r.scanned ?? r.totalChecked ?? 0) || 0;
                const checkTime = r.checkedAt && moment(r.checkedAt).isValid()
                    ? moment(r.checkedAt).format('HH:mm')
                    : moment().format('HH:mm');
                const stateCountText = Array.isArray(r.byState)
                    ? r.byState
                        .filter(s => Number(s.count) > 0)
                        .map(s => `${s.name || `코드 ${s.code}`} ${Number(s.count).toLocaleString()}`)
                        .join(' · ')
                    : (r.stateCountText || '');
                const notices = Array.isArray(r.notices) ? r.notices.filter(Boolean) : [];
                const unreadable = Number(r.unreadable || 0);
                const baseResult = {
                    count: matchedCount,
                    checkTime,
                    totalChecked,
                    matchId: r.matchId,
                    stateCountText,
                    notices,
                    unreadable,
                    isToolRequired: !!r.isToolRequired,
                    fieldCount: r.fieldCount || 0,
                    pidStats: r.pid ?? r.pidStats ?? null
                };

                if (matchedCount === 0) {
                    setStatusMode('empty');
                    setCheckResult({ ...baseResult, isToolRequired: false, fileStem: r.fileStem || '' });
                } else {
                    setStatusMode('ready');
                    const defaultFileStem = r.fileStem || '';
                    setFileStem(defaultFileStem);
                    setCheckResult({ ...baseResult, fileStem: defaultFileStem });

                    // 다운로드 팝업과 실시간 동기화
                    if (onApplyCustomFilter) {
                        onApplyCustomFilter({
                            isApplied: true,
                            expr: formulaText.trim() || undefined,
                            matchedCount: matchedCount,
                            totalChecked: totalChecked,
                            matchId: r.matchId,
                            fileStem: defaultFileStem,
                            conditions: {
                                selectedStates,
                                formulaText,
                                fieldValues,
                                parsedPidList
                            }
                        });
                    }
                }
            } else if (String(res?.success) === '909') {
                // 맞는 응답 없음 — errorcontent 를 결과 자리에 그대로 (pid 있으면 같이)
                setStatusMode('empty');
                setCheckResult({
                    count: 0,
                    emptyMsg: res.resultjson?.errorcontent || res.message || '',
                    pidStats: res.resultjson?.pid ?? null,
                    notices: []
                });
            } else if (String(res?.success) === '904') {
                // 입력 오류 (서버 약속 코드 904)
                setStatusMode('syntax_error');
                setCheckResult(null);
                setSyntaxErrorMsg(res.resultjson?.errorcontent || res.message || '조건식 문법이 맞지 않습니다.');
            } else {
                // 조회 실패: 가짜 숫자를 보여주지 않고 오류 상태로 전환
                setStatusMode('error');
                setCheckResult(null);
                setCheckErrorMsg(res?.resultjson?.errorcontent || res?.message || '');
            }
        } catch (err) {
            if (reqId !== checkReqRef.current) return;
            console.warn('exportCustomCheck error:', err);
            // 서버가 904/909를 HTTP 오류 상태와 함께 본문으로 내려주는 경우
            let body = err?.response?.data;
            if (typeof body === 'string') {
                try { body = JSON.parse(body); } catch { /* 평문 */ }
            }
            setCheckResult(null);
            if (body && String(body.success) === '904') {
                setStatusMode('syntax_error');
                setSyntaxErrorMsg(body.resultjson?.errorcontent || body.errorcontent || body.message || '조건식 문법이 맞지 않습니다.');
                return;
            }
            if (body && String(body.success) === '909') {
                setStatusMode('empty');
                setCheckResult({
                    count: 0,
                    emptyMsg: body.resultjson?.errorcontent || body.errorcontent || body.message || '',
                    pidStats: body.resultjson?.pid ?? null,
                    notices: []
                });
                return;
            }
            setStatusMode('error');
            setCheckErrorMsg(
                (body && typeof body === 'object' && (body.resultjson?.errorcontent || body.errorcontent || body.message))
                || (typeof body === 'string' ? body : '')
                || err?.message || ''
            );
        } finally {
            progress.stop();
        }
    };

    // 확인한 뒤 조건을 바꾸면: 결과를 지우고 [받기] 잠금 → "조건을 바꿨습니다"
    useEffect(() => {
        if (!isOpen || lastCheckedKeyRef.current === null) return;
        if (conditionKey === lastCheckedKeyRef.current) return;
        checkReqRef.current++;              // 진행 중인 확인 결과는 버림
        lastCheckedKeyRef.current = null;
        setStatusMode('changed');
        setCheckResult(null);
        setSyntaxErrorMsg('');
        setCheckErrorMsg('');
        setCheckProgress('');
        setPidListOpen(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, conditionKey]);

    // [조건 비우기] — 모든 조건을 처음 상태로
    const handleClearConditions = () => {
        checkReqRef.current++;
        lastCheckedKeyRef.current = null;
        setSelectedStates(defaultStateCodes);
        setConditionRows([]);
        setFormulaText('');
        setIsFormulaDirect(false);
        setSyntaxErrorMsg('');
        setFieldValues(() => {
            const next = {};
            infoFields.forEach(f => { next[f.key] = emptyFieldValue(f); });
            return next;
        });
        setPidText('');
        setPidListOpen(false);
        setStatusMode('init');
        setCheckResult(null);
        setCheckErrorMsg('');
        setCheckProgress('');
        setFileStem('');
    };

    // [받기] 버튼 실행
    const handleDownload = async () => {
        if (downloading) return;

        const tokens = buildGbTokens();

        if (tokens.length === 0) {
            modal.showAlert("알림", "다운로드할 형식을 최소 1개 이상 선택해 주세요.");
            return;
        }

        const conditions = buildConditions();

        // PC 도구 구동 조건 (estimate track === 'tool' / check isToolRequired / 다운로드 응답 track === 'tool')
        if (isToolMode) {
            await launchCustomPcTool(tokens, conditions);
            return;
        }

        // 서버 직접 생성
        setDownloading(true);
        setDownloadProgress('');
        const progress = await connectProgress((msg, pct) => {
            if (msg) setDownloadProgress(pct !== null ? `${msg} (${pct}%)` : msg);
        });
        try {
            const host = window.API_CONFIG?.API_BASE_URL_DATAMANAGEMENT || window.API_CONFIG?.API_BASE_URL || window.location.origin;
            const url = `${host.replace(/\/+$/, '')}/export/custom`;

            const authHeaders = {};
            const matchToken = document.cookie.match(/(?:^|; )TOKEN=([^;]*)/);
            const token = auth?.token || (matchToken ? decodeURIComponent(matchToken[1]) : null);
            if (token) authHeaders['Authorization'] = `Bearer ${token}`;
            if (userId) {
                authHeaders['X-User-Id'] = userId;
                try { authHeaders['hrc'] = AES256.Crypto.encryptAES256(String(userId)); } catch (e) { }
            }
            const matchAuthToken = document.cookie.match(/(?:^|; )X-Auth-Token=([^;]*)/);
            if (matchAuthToken) authHeaders['X-Auth-Token'] = decodeURIComponent(matchAuthToken[1]);

            const bodyData = {
                pn: modalPn,
                user: userId,
                matchId: checkResult?.matchId,
                gb: tokens.join(','),
                conditions,
                connectionId: progress.connectionId
            };

            const r = await fetch(url, {
                method: 'POST',
                headers: { ...authHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyData)
            });

            const contentType = r.headers.get('content-type') || '';
            if (!r.ok && !contentType.includes('json')) {
                throw new Error(`HTTP ${r.status}`);
            }
            if (!contentType.includes('json')) {
                const blob = await r.blob();
                const cd = r.headers.get('content-disposition') || '';
                const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
                const downloadFilename = m ? decodeURIComponent(m[1]) : (fileStem ? (/\.zip$/i.test(fileStem) ? fileStem : `${fileStem}.zip`) : 'download.zip');

                const matchedCount = r.headers.get('X-Custom-Matched');
                const refound = r.headers.get('X-Custom-Refound');

                const downloadUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = downloadFilename;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(downloadUrl);

                modal.showAlert("알림", "커스텀 다운로드가 완료되었습니다.");
                handleCloseAll();
                return;
            }

            const j = await r.json();
            // 900번이면서 track === 'tool'인 경우 PC 도구 실행
            if (String(j?.success) === '900' && j?.resultjson?.track === 'tool') {
                await launchCustomPcTool(tokens, conditions);
                return;
            }

            const ok = String(j?.success) === '777';
            const msg = j?.resultjson?.errorcontent || j?.errorcontent || j?.message;
            modal.showAlert(ok ? "알림" : "오류", msg || (ok ? "요청을 처리했습니다." : "다운로드에 실패했습니다."));
        } catch (err) {
            console.warn('custom download error:', err);
            modal.showAlert("오류", "다운로드에 실패했습니다." + (err?.message ? ` (${err.message})` : ''));
        } finally {
            progress.stop();
            setDownloading(false);
            setDownloadProgress('');
        }
    };

    // AND / OR 토글 (행 · 괄호 묶음 공통)
    const renderConnector = (item) => {
        const isOr = isOrConn(item.connector);
        return (
            <div className="cd-connector-toggle-group" role="group" aria-label="연결 연산자">
                <button
                    type="button"
                    className={`cd-connector-toggle-btn ${!isOr ? 'active' : ''}`}
                    onClick={() => handleUpdateRow(item.id, 'connector', 'AND')}
                >
                    AND
                </button>
                <button
                    type="button"
                    className={`cd-connector-toggle-btn ${isOr ? 'active' : ''}`}
                    onClick={() => handleUpdateRow(item.id, 'connector', 'OR')}
                >
                    OR
                </button>
            </div>
        );
    };

    // 조건 행 1개 (최상위 · 괄호 안 공통)
    const renderCondRow = (row, idx) => {
        const meta = row.varId ? getVarMeta(row.varId) : null;
        const ops = meta ? meta.ops : OPS_CHOICE;
        const opItem = ops.find(o => o.id === row.operator) || ops[0];
        const opId = opItem.id;
        const isNullOp = opId === 'null' || opId === 'notnull';
        const isCmpOp = CMP_OPS.includes(opId);
        const selectedVarItem = row.varId
            ? (varDropdownOptions.find(item => item.value === row.varId) || { text: row.varLabel || row.varId, value: row.varId })
            : null;
        const options = row.options || [];
        const hasOptions = options.length > 0;
        const allSelected = hasOptions && options.every(o => o.selected);
        const hasAi = options.some(o => o.isAi);

        let valueArea = null;
        if (!row.varId) {
            valueArea = (
                <div className="cd-filter-options-area is-hint">
                    <span className="cd-options-title">
                        {varDropdownOptions.length > 0
                            ? '조건을 걸 문항을 선택하세요.'
                            : '불러온 문항이 없습니다. [식 직접 쓰기]를 이용하세요.'}
                    </span>
                </div>
            );
        } else if (isNullOp) {
            valueArea = null; // 응답함 / 미응답: 값 없음
        } else if (isCmpOp) {
            valueArea = (
                <div className="cd-filter-options-area">
                    <input
                        type="text"
                        className="cd-filter-value-input"
                        value={row.valueText || ''}
                        onChange={(e) => handleUpdateRow(row.id, 'valueText', e.target.value)}
                        placeholder="비교할 값 (예: 20)"
                    />
                </div>
            );
        } else if (!hasOptions) {
            valueArea = (
                <div className="cd-filter-options-area">
                    <div className="cd-options-top-bar">
                        <span className="cd-options-title">
                            {row.aiFallback ? '코드 직접 입력 (AI 코드 포함)' : '코드 직접 입력 (보기 라벨이 없는 문항)'}
                        </span>
                    </div>
                    <input
                        type="text"
                        className="cd-filter-value-input"
                        value={row.valueText || ''}
                        onChange={(e) => handleUpdateRow(row.id, 'valueText', e.target.value)}
                        placeholder="코드 입력 (예: 1, 2, 3)"
                    />
                </div>
            );
        } else {
            valueArea = (
                <div className="cd-filter-options-area">
                    <div className="cd-options-top-bar">
                        <span className="cd-options-title">
                            응답 보기 선택 ({options.filter(o => o.selected).length}/{options.length})
                            {hasAi && <span className="cd-ai-legend"> · 점선은 AI 코드</span>}
                        </span>
                        {options.length > 2 && (
                            <div className="cd-options-quick-actions">
                                <button
                                    type="button"
                                    className="cd-micro-link"
                                    onClick={() => handleToggleAllOptions(row.id, !allSelected)}
                                >
                                    {allSelected ? '선택 해제' : '모두 선택'}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="cd-option-chips-grid">
                        {options.map(opt => (
                            <button
                                key={`${opt.isAi ? 'ai' : 'q'}-${opt.code}`}
                                type="button"
                                className={`cd-option-chip ${opt.selected ? 'active' : ''} ${opt.isAi ? 'ai-dotted' : ''}`}
                                onClick={() => handleToggleOption(row.id, opt.code)}
                                style={{ fontSize: '11px' }}
                                title={opt.isAi ? 'AI 코드' : undefined}
                            >
                                <span className="cd-option-code" style={{ fontSize: '11px' }}>{opt.code}</span>
                                <span className="cd-option-label" style={{ fontSize: '11px' }}>{opt.label}</span>
                            </button>
                        ))}
                    </div>

                    {row.aiFallback && (
                        <input
                            type="text"
                            className="cd-filter-value-input cd-ai-code-input"
                            value={row.extraText || ''}
                            onChange={(e) => handleUpdateRow(row.id, 'extraText', e.target.value)}
                            placeholder="AI 코드 직접 입력 (예: 101, 102) — 맵에 오픈 필드가 없습니다"
                        />
                    )}
                </div>
            );
        }

        return (
            <div key={row.id} className="cd-filter-card">
                {/* 상단 툴바: 연결자(idx>0), 변수선택, 연산자, 삭제버튼 */}
                <div className="cd-filter-card-header">
                    {idx > 0 && renderConnector(row)}

                    <div className="cd-var-select-wrap">
                        <DropDownList
                            className="cd-kendo-dropdown"
                            style={{ width: '100%', height: '30px' }}
                            data={varDropdownOptions}
                            textField="text"
                            dataItemKey="value"
                            defaultItem={{ text: varDropdownOptions.length > 0 ? '문항 선택' : '문항 목록이 없습니다', value: '' }}
                            disabled={varDropdownOptions.length === 0}
                            value={selectedVarItem}
                            onChange={(e) => {
                                const selected = e.value;
                                const val = selected?.value ?? '';
                                const txt = selected?.text || val;
                                handleUpdateRowVar(row.id, val, txt);
                            }}
                            popupSettings={{ className: 'cd-custom-download-popup' }}
                        />
                    </div>

                    <div
                        className={`cd-op-select-wrap ${!row.varId ? 'is-locked' : ''}`}
                        title={!row.varId ? '문항을 먼저 선택하면 형식에 맞는 연산자를 고를 수 있습니다' : undefined}
                    >
                        <DropDownList
                            className="cd-kendo-dropdown"
                            style={{ width: '140px', height: '30px' }}
                            data={ops}
                            textField="text"
                            dataItemKey="id"
                            value={opItem}
                            disabled={!row.varId}
                            onChange={(e) => handleUpdateRow(row.id, 'operator', e.value?.id || ops[0].id)}
                            popupSettings={{ className: 'cd-custom-download-popup' }}
                        />
                    </div>

                    <button
                        type="button"
                        className="cd-btn-delete-card"
                        onClick={() => handleRemoveConditionRow(row.id)}
                        title="이 조건 삭제"
                    >
                        <Trash2 size={15} />
                    </button>
                </div>

                {/* 하단 보기 선택 / 값 입력 영역 */}
                {valueArea}
            </div>
        );
    };

    const isChecking = statusMode === 'checking';
    const canCheck = !!modalPn && selectedStates.length > 0 && !isChecking && !downloading && !checkingTool;

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="cd-modal-overlay">
            {/* 메인 모달 컨테이너 */}
            <div className="cd-modal-container">
                {/* 1. 표준 헤더 */}
                <div className="variable-modal-header" style={{
                    padding: '18px 26px',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#ffffff',
                    flexShrink: 0
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{
                                width: '4px',
                                height: '18px',
                                backgroundColor: '#16a34a',
                                borderRadius: '4px',
                                marginRight: '8px'
                            }}></div>
                            <h3 className="variable-modal-title" style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                                커스텀 다운로드
                            </h3>
                        </div>
                        <p className="download-modal-desc" style={{ fontSize: '12.5px', color: '#64748b', margin: 0, paddingLeft: '12px' }}>
                            {[modalPn, modalProjectName].filter(Boolean).join(' · ')}{(modalPn || modalProjectName) ? ' · ' : ''}조건에 맞는 응답만 골라 원하는 형식으로 다운로드합니다.
                        </p>
                    </div>
                    <button onClick={onClose} className="variable-modal-close" style={{ alignSelf: 'flex-start' }} title="닫기">
                        <X size={20} />
                    </button>
                </div>

                {/* 2. 바디 (좌/우 2분할) */}
                <div className="cd-modal-body">
                    {/* ◀ 좌측 조건 패널 */}
                    <div className="cd-panel-left custom-scrollbar">
                        {/* 1) 컨택상황 */}
                        <div className="cd-card">
                            <div className="cd-card-header">
                                <div className="cd-card-title-group">
                                    <span className="cd-card-title">컨택상황</span>
                                    <span className="cd-card-badge">필수</span>
                                </div>
                                <div className="cd-header-actions">
                                    <button
                                        type="button"
                                        className="cd-text-action-btn"
                                        disabled={completeStateCode === null}
                                        onClick={() => {
                                            if (completeStateCode === null) return;
                                            setSelectedStates([completeStateCode]);
                                        }}
                                    >
                                        완료만
                                    </button>
                                    <span className="cd-divider">·</span>
                                    <button
                                        type="button"
                                        className="cd-text-action-btn"
                                        disabled={contactStates.length === 0}
                                        onClick={() => setSelectedStates(contactStates.map(s => s.code))}
                                    >
                                        모두 선택
                                    </button>
                                </div>
                            </div>

                            {contactStates.length === 0 && (
                                <div className="cd-result-inline-msg">
                                    {statesLoading ? (
                                        <>
                                            <span className="cd-spinner-mini"></span>
                                            <span>컨택상황을 불러오는 중…</span>
                                        </>
                                    ) : (
                                        <>
                                            <AlertCircle size={15} />
                                            <span>컨택상황 목록을 불러오지 못했습니다.</span>
                                        </>
                                    )}
                                </div>
                            )}

                            <div className="cd-contact-chips-grid">
                                {contactStates.map(state => {
                                    const isChecked = selectedStates.includes(state.code);
                                    return (
                                        <button
                                            key={state.code}
                                            type="button"
                                            className={`cd-contact-chip ${isChecked ? 'active' : ''}`}
                                            onClick={() => handleToggleState(state.code)}
                                        >
                                            <div className="cd-contact-chip-check">
                                                {isChecked && <Check size={12} strokeWidth={3} />}
                                            </div>
                                            <span className="cd-contact-chip-name">{state.name || `코드 ${state.code}`}</span>
                                            <span className="cd-contact-chip-count">{state.count?.toLocaleString() || 0}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 2) 설문 문항 조건 (조건 빌더) */}
                        <div className="cd-card cd-condition-builder-card">
                            <div className="cd-card-header">
                                <div className="cd-card-title-group">
                                    <span className="cd-card-title">설문 문항 조건</span>
                                    <span className="cd-card-title-sub">비우면 전체 응답 대상</span>
                                </div>
                                <div className="cd-header-actions">
                                    <button
                                        type="button"
                                        className={`cd-logic-help-toggle-btn ${helpOpen ? 'active' : ''}`}
                                        onClick={handleToggleHelp}
                                    >
                                        <span>문법 도움말</span>
                                        <ChevronDown size={13} style={{ transform: helpOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                                    </button>
                                </div>
                            </div>

                            {/* 로직체크 /check-logic/syntax 연동 문법 도움말 표 */}
                            {helpOpen && (
                                <div className="cd-logic-help-wrap">
                                    {loadingSyntax ? (
                                        <div className="cd-logic-help-loading">
                                            <Loader2 size={13} className="cd-spin" />
                                            <span>문법 도움말을 불러오는 중입니다...</span>
                                        </div>
                                    ) : syntaxData && syntaxData.length > 0 ? (
                                        <div className="cd-logic-help-scroll">
                                            <table className="cd-logic-help-tbl">
                                                {syntaxData.map((g, gi) => (
                                                    <tbody key={gi}>
                                                        {g.title && (
                                                            <tr className="grp">
                                                                <td colSpan={3}>{g.title}</td>
                                                            </tr>
                                                        )}
                                                        {g.rows.map((r, ri) => (
                                                            <tr key={ri} className={r.legacy ? 'legacy' : ''} title={r.note || undefined}>
                                                                <td className="op">{r.token}</td>
                                                                <td className="meaning">
                                                                    {r.meaning}
                                                                    {r.legacy && r.instead && (
                                                                        <span className="instead"> → 대신 <code>{r.instead}</code></span>
                                                                    )}
                                                                </td>
                                                                <td className="ex"><code>{r.example}</code></td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                ))}
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="cd-logic-help-loading">
                                            <span>문법 도움말 정보를 불러오지 못했습니다.</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 조건 빌더 카드 목록 (행 + 괄호 묶음 한 단계) */}
                            {!isFormulaDirect && conditionRows.length > 0 && (
                                <div className="cd-filter-cards-container">
                                    {conditionRows.map((item, idx) => (item.kind === 'group' ? (
                                        <div key={item.id} className="cd-cond-group">
                                            <div className="cd-cond-group-header">
                                                {idx > 0 && renderConnector(item)}
                                                <span className="cd-cond-group-badge">( )</span>
                                                <span className="cd-cond-group-title">
                                                    괄호 묶음
                                                    <span className="cd-cond-group-sub">안의 조건을 먼저 묶어서 계산합니다</span>
                                                </span>
                                                <button
                                                    type="button"
                                                    className="cd-btn-delete-card"
                                                    onClick={() => handleRemoveConditionRow(item.id)}
                                                    title="이 괄호 묶음 삭제"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                            <div className="cd-cond-group-body">
                                                {(item.children || []).map((child, ci) => renderCondRow(child, ci))}
                                                <button
                                                    type="button"
                                                    className="cd-btn-add-in-group"
                                                    onClick={() => handleAddConditionRow(item.id)}
                                                >
                                                    <Plus size={13} />
                                                    <span>괄호 안에 조건 추가</span>
                                                </button>
                                            </div>
                                        </div>
                                    ) : renderCondRow(item, idx)))}
                                </div>
                            )}

                            {/* 조건 추가 액션 바 */}
                            {!isFormulaDirect && (
                                <div className="cd-filter-add-bar">
                                    <button
                                        type="button"
                                        className="cd-btn-add-condition"
                                        onClick={() => handleAddConditionRow()}
                                    >
                                        <Plus size={16} />
                                        <span>조건 추가</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="cd-btn-add-condition cd-btn-add-group"
                                        onClick={handleAddGroup}
                                    >
                                        <Plus size={16} />
                                        <span>괄호로 묶기</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="cd-btn-text-mode"
                                        onClick={() => setIsFormulaDirect(true)}
                                    >
                                        <span>{formulaText.trim() ? '식 직접 고치기' : '식 직접 쓰기'}</span>
                                    </button>
                                </div>
                            )}

                            {/* 모던 조건식 프리뷰 카드 (보기 전용, 편집은 위 버튼 하나로 통일) */}
                            {!isFormulaDirect && formulaText && (
                                <div className={`cd-formula-preview-card ${statusMode === 'syntax_error' ? 'has-error' : ''}`}>
                                    <div className="cd-formula-content">
                                        <div className="cd-formula-pill">수식</div>
                                        <code className="cd-formula-code">{formulaText}</code>
                                    </div>
                                </div>
                            )}

                            {/* 식 오류 메시지 박스 */}
                            {statusMode === 'syntax_error' && syntaxErrorMsg && (
                                <div className="cd-error-alert-box">
                                    <AlertCircle size={16} />
                                    <span>{syntaxErrorMsg}</span>
                                </div>
                            )}

                            {/* 식 직접 쓰기/고치기 모드 */}
                            {isFormulaDirect && (
                                <div className="cd-formula-direct-editor">
                                    <div className="cd-editor-header">
                                        <span className="cd-editor-label">조건식 직접 편집</span>
                                        <button
                                            type="button"
                                            className="cd-text-action-btn"
                                            onClick={handleBackToBlocks}
                                        >
                                            조건 블록 형태로 보기
                                        </button>
                                    </div>
                                    <textarea
                                        className={`cd-formula-textarea ${statusMode === 'syntax_error' ? 'has-error' : ''}`}
                                        value={formulaText}
                                        onChange={(e) => setFormulaText(e.target.value)}
                                        placeholder="식 직접 쓰기 예: q10 == 3 and q5 in [3, 4]"
                                    />
                                    <span className="cd-editor-tip">
                                        변수명과 연산자(==, in, and, or)를 사용하여 복잡한 중첩 조건을 직접 기술할 수 있습니다.
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* 3) 응답 정보 — /export/custom/fields 의 fields[] 로 그림 (available === false 면 숨김) */}
                        {!isSavProject && infoFields.length > 0 && (
                            <div className="cd-card">
                                <div className="cd-card-header">
                                    <div className="cd-card-title-group">
                                        <span className="cd-card-title">응답 정보</span>
                                        <span className="cd-card-title-sub">비우면 전체 응답 대상</span>
                                    </div>
                                </div>

                                <div className="cd-form-grid">
                                    {infoFields.map(f => {
                                        const val = fieldValues[f.key] ?? emptyFieldValue(f);
                                        const opts = (f.options || []).filter(o => !isAllOption(o));
                                        let control;
                                        if (f.kind === 'period') {
                                            const from = val?.from || '';
                                            const to = val?.to || '';
                                            control = (
                                                <div className="cd-date-range-wrap">
                                                    <button
                                                        type="button"
                                                        className={`cd-period-pill ${!from && !to ? 'active' : ''}`}
                                                        onClick={() => setFieldValue(f.key, { from: '', to: '' })}
                                                    >
                                                        전체
                                                    </button>
                                                    <input
                                                        type="date"
                                                        className="cd-input-date"
                                                        value={from}
                                                        max={to || undefined}
                                                        aria-label={`${f.name || f.key} 시작`}
                                                        onChange={(e) => setFieldValue(f.key, { from: e.target.value, to })}
                                                    />
                                                    <span className="cd-range-tilde">~</span>
                                                    <input
                                                        type="date"
                                                        className="cd-input-date"
                                                        value={to}
                                                        min={from || undefined}
                                                        aria-label={`${f.name || f.key} 끝`}
                                                        onChange={(e) => setFieldValue(f.key, { from, to: e.target.value })}
                                                    />
                                                </div>
                                            );
                                        } else if (f.kind === 'many') {
                                            // 여러 개 고르기
                                            const arr = Array.isArray(val) ? val : [];
                                            control = (
                                                <div className="cd-segment-group" title="여러 개 고를 수 있습니다">
                                                    <button
                                                        type="button"
                                                        className={`cd-segment-btn ${arr.length === 0 ? 'active' : ''}`}
                                                        onClick={() => setFieldValue(f.key, [])}
                                                    >
                                                        전체
                                                    </button>
                                                    {opts.map(o => {
                                                        const on = arr.includes(o.value);
                                                        return (
                                                            <button
                                                                key={String(o.value)}
                                                                type="button"
                                                                aria-pressed={on}
                                                                className={`cd-segment-btn ${on ? 'active' : ''}`}
                                                                onClick={() => setFieldValue(f.key, on ? arr.filter(x => x !== o.value) : [...arr, o.value])}
                                                            >
                                                                {o.name ?? String(o.value)}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        } else {
                                            // 하나 고르기
                                            control = (
                                                <div className="cd-segment-group">
                                                    <button
                                                        type="button"
                                                        className={`cd-segment-btn ${val === '' ? 'active' : ''}`}
                                                        onClick={() => setFieldValue(f.key, '')}
                                                    >
                                                        전체
                                                    </button>
                                                    {opts.map(o => (
                                                        <button
                                                            key={String(o.value)}
                                                            type="button"
                                                            className={`cd-segment-btn ${val === o.value ? 'active' : ''}`}
                                                            onClick={() => setFieldValue(f.key, o.value)}
                                                        >
                                                            {o.name ?? String(o.value)}
                                                        </button>
                                                    ))}
                                                </div>
                                            );
                                        }
                                        return (
                                            <div key={f.key} className="cd-form-row cd-info-field-row">
                                                <span className="cd-form-label">{f.name || f.key}</span>
                                                <div className="cd-info-field-control">
                                                    {control}
                                                    {f.hint && <span className="cd-info-field-hint">{f.hint}</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 4) 응답자 PID (비우면 전체) */}
                        <div className="cd-card">
                            <div className="cd-card-header">
                                <div className="cd-card-title-group">
                                    <span className="cd-card-title">응답자 PID</span>
                                    <span className="cd-card-title-sub">비우면 전체 응답 대상</span>
                                </div>
                                {pidText && (
                                    <button
                                        type="button"
                                        className="cd-text-action-btn"
                                        onClick={() => setPidText('')}
                                    >
                                        지우기
                                    </button>
                                )}
                            </div>

                            <textarea
                                className="cd-pid-textarea"
                                value={pidText}
                                onChange={(e) => setPidText(e.target.value)}
                                placeholder="엑셀 PID 열을 복사하여 그대로 붙여넣으세요 (줄바꿈 또는 쉼표로 구분)"
                            />

                            {parsedPidList.length > 0 && statusMode !== 'ready' && (
                                <div className="cd-pid-count-info">
                                    <span>입력된 PID: <strong>{parsedPidList.length.toLocaleString()}</strong>개</span>
                                </div>
                            )}

                            {(statusMode === 'ready' || statusMode === 'empty') && checkResult?.pidStats && (() => {
                                const p = checkResult.pidStats;
                                const n = (v) => Number(v || 0).toLocaleString();
                                // 서버가 내려준 PID 목록 (각 앞 200개)
                                const lists = Object.keys(p)
                                    .filter(k => /Pids$/.test(k) && Array.isArray(p[k]) && p[k].length > 0)
                                    .map(k => ({
                                        key: k,
                                        label: PID_LIST_LABELS[k] || k,
                                        items: p[k],
                                        total: Number(p[k.replace(/Pids$/, '')] ?? p[k].length) || p[k].length
                                    }));
                                return (
                                    <div className="cd-pid-stats-box">
                                        <div className="cd-pid-stats-title-row">
                                            <div className="cd-pid-stats-title">PID 확인 결과</div>
                                            {lists.length > 0 && (
                                                <button
                                                    type="button"
                                                    className="cd-text-action-btn"
                                                    onClick={() => setPidListOpen(v => !v)}
                                                >
                                                    {pidListOpen ? '접기' : '보기'}
                                                </button>
                                            )}
                                        </div>
                                        <div className="cd-pid-stats-content">
                                            붙인 {n(p.given ?? p.total)}개 — 맞음 <strong>{n(p.matched)}</strong> · 조건에 안 맞음 {n(p.notMatched ?? p.mismatched)} · 다른 컨택상황 {n(p.otherState)} · <span className="cd-text-danger">이 설문에 없음 {n(p.notFound)}</span>
                                        </div>
                                        {pidListOpen && lists.length > 0 && (
                                            <div className="cd-pid-list-wrap">
                                                {lists.map(l => (
                                                    <div key={l.key} className="cd-pid-list-group">
                                                        <div className="cd-pid-list-title">
                                                            {l.label} {n(l.total)}개{l.total > l.items.length ? ` · 앞 ${n(l.items.length)}개만 표시` : ''}
                                                        </div>
                                                        <div className="cd-pid-list-items">{l.items.join(', ')}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    {/* ▶ 우측 결과 및 다운로드 실행 패널 */}
                    <div className="cd-panel-right custom-scrollbar">
                        {/* 1. 맞는 응답 수 확인 카드 (가장 중요한 액션) */}
                        <div className="cd-right-card cd-result-card">
                            <div className="cd-result-header">
                                <span className="cd-right-title">추출 대상 응답 수</span>
                                <button
                                    type="button"
                                    className="cd-text-action-btn cd-clear-btn"
                                    disabled={isChecking || downloading || checkingTool}
                                    onClick={handleClearConditions}
                                    title="모든 조건을 처음 상태로 되돌립니다"
                                >
                                    <RotateCcw size={12} />
                                    <span>조건 비우기</span>
                                </button>
                            </div>

                            {/* 상태: 처음 */}
                            {statusMode === 'init' && (
                                modalPn ? (
                                    <div className="cd-result-inline-msg">
                                        <span>조건을 넣고 [맞는 응답 수 보기]를 눌러 주세요.</span>
                                    </div>
                                ) : (
                                    <div className="cd-result-inline-msg error">
                                        <AlertCircle size={15} />
                                        <span>프로젝트 정보를 찾을 수 없습니다.</span>
                                    </div>
                                )
                            )}

                            {/* 상태: 확인한 뒤 조건을 바꿈 → [받기] 잠금 */}
                            {statusMode === 'changed' && (
                                <div className="cd-result-inline-msg warn">
                                    <AlertCircle size={15} />
                                    <span>조건을 바꿨습니다 — 맞는 응답 수를 다시 봐 주세요.</span>
                                </div>
                            )}

                            {/* 상태: 확인 중 (진행 문구: SignalR ReceiveProgress) */}
                            {isChecking && (
                                <div className="cd-result-inline-msg">
                                    <span className="cd-spinner-mini"></span>
                                    <span>
                                        응답을 확인하는 중…
                                        {checkProgress && <span className="cd-result-progress-text">{checkProgress}</span>}
                                    </span>
                                </div>
                            )}

                            {/* 상태: 확인 완료 */}
                            {statusMode === 'ready' && checkResult && (
                                <div className="cd-result-state-ready">
                                    <div className="cd-result-summary-row">
                                        <div className="cd-matched-number-hero">
                                            <span className="cd-num">{checkResult.count.toLocaleString()}</span>
                                            <span className="cd-unit">건</span>
                                        </div>
                                        <div className="cd-result-summary-meta">
                                            {(checkResult.totalChecked || checkResult.stateCountText) && (
                                                <span>
                                                    {[
                                                        checkResult.totalChecked ? `전체 ${checkResult.totalChecked.toLocaleString()}건 중` : '',
                                                        checkResult.stateCountText || ''
                                                    ].filter(Boolean).join(' · ')}
                                                </span>
                                            )}
                                            <span className="cd-result-summary-time">{checkResult.checkTime} 기준</span>
                                        </div>
                                    </div>
                                    {checkResult.unreadable > 0 && (
                                        <div className="cd-result-notice warn">읽지 못한 응답 {checkResult.unreadable.toLocaleString()}건은 제외되었습니다.</div>
                                    )}
                                    {(checkResult.notices || []).map((n, i) => (
                                        <div key={i} className="cd-result-notice">※ {n}</div>
                                    ))}
                                </div>
                            )}

                            {/* 상태: 맞는 응답 없음 */}
                            {statusMode === 'empty' && (
                                <div className="cd-result-state-empty">
                                    <div className="cd-matched-number-hero cd-text-muted">
                                        <span className="cd-num">0</span>
                                        <span className="cd-unit">건</span>
                                    </div>
                                    <div className="cd-empty-alert-box">
                                        {checkResult?.emptyMsg || '조건에 맞는 응답이 없습니다. 조건을 다시 확인해 주세요.'}
                                    </div>
                                </div>
                            )}

                            {/* 상태: 입력 오류 (904) */}
                            {statusMode === 'syntax_error' && (
                                <div className="cd-result-state-error">
                                    <div className="cd-error-badge">입력 오류</div>
                                    <p className="cd-error-desc">조건을 고친 뒤 [맞는 응답 수 보기]를 다시 눌러 주세요.</p>
                                </div>
                            )}

                            {/* 상태: 조회 실패 (서버 오류/통신 실패) */}
                            {statusMode === 'error' && (
                                <div className="cd-result-inline-msg error">
                                    <AlertCircle size={15} />
                                    <span>
                                        응답 수를 가져오지 못했습니다.
                                        {checkErrorMsg && <span className="cd-result-error-detail">{checkErrorMsg}</span>}
                                    </span>
                                </div>
                            )}

                            {/* [맞는 응답 수 보기] — 수동 확인 */}
                            <button
                                type="button"
                                className="cd-btn-primary-check"
                                disabled={!canCheck}
                                onClick={handleExecuteCheck}
                            >
                                {isChecking ? <Loader2 size={15} className="cd-spin-white" /> : <Sliders size={15} />}
                                <span>{isChecking ? '확인하는 중…' : '맞는 응답 수 보기'}</span>
                            </button>
                            {modalPn && !statesLoading && contactStates.length > 0 && selectedStates.length === 0 && (
                                <div className="cd-check-hint">컨택상황을 1개 이상 선택하세요.</div>
                            )}
                        </div>

                        {/* 2. 다운로드 형식 선택 카드 */}
                        <div className="cd-right-card cd-format-card">
                            <span className="cd-right-title">다운로드 파일 형식</span>

                            {/* SPSS 데이터 (.sav) 주 형식 카드 */}
                            <div
                                className={`cd-format-primary-card ${isSavSelected ? 'selected' : ''}`}
                                onClick={() => setIsSavSelected(!isSavSelected)}
                            >
                                <div className="cd-format-primary-left">
                                    <div className="cd-format-primary-title">SPSS 데이터 (.sav)</div>
                                    <div className="cd-format-primary-sub">기본 통계 분석용 원본 데이터셋</div>
                                </div>
                                <div className="cd-format-check-circle">
                                    {isSavSelected && <Check size={14} strokeWidth={3} />}
                                </div>
                            </div>

                            {/* 보조 서브 포맷 2x2 그리드 */}
                            {(
                                <div className="cd-subformats-grid">
                                    {SUB_FORMAT_OPTIONS.map(fmt => {
                                        const isChecked = selectedSubFormats.includes(fmt.token);
                                        return (
                                            <div
                                                key={fmt.id}
                                                className={`cd-subformat-tile ${isChecked ? 'active' : ''}`}
                                                onClick={() => {
                                                    setSelectedSubFormats(prev =>
                                                        prev.includes(fmt.token)
                                                            ? prev.filter(t => t !== fmt.token)
                                                            : [...prev, fmt.token]
                                                    );
                                                }}
                                            >
                                                <div className="cd-subformat-checkbox">
                                                    {isChecked && <Check size={11} strokeWidth={3} />}
                                                </div>
                                                <span className="cd-subformat-label">{fmt.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* 파일 이름 = 서버 fileStem + .zip (화면에서 만들거나 고치지 않음) */}
                            {statusMode === 'ready' && fileStem && (
                                <div className="cd-filename-setting-wrap">
                                    <span className="cd-filename-label">파일 이름</span>
                                    <span className="cd-filename-text">
                                        {/\.zip$/i.test(fileStem) ? fileStem : `${fileStem}.zip`}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* 3. 받기 버튼: 형식 선택 바로 아래 (항상 노출, 상태별 문구) */}
                        {(() => {
                            const noFormat = !isSavSelected && selectedSubFormats.length === 0;
                            const canDownload = statusMode === 'ready' && !!checkResult && !noFormat && !downloading && !checkingTool;
                            let label;
                            if (downloading) label = downloadProgress || '다운로드 생성 중…';
                            else if (checkingTool) label = `PC 도구 확인 중 (${countdown}초)…`;
                            else if (statusMode === 'checking') label = '응답을 확인하는 중…';
                            else if (statusMode === 'init' || statusMode === 'changed') label = '맞는 응답 수를 먼저 확인하세요';
                            else if (statusMode === 'syntax_error') label = '조건을 고쳐 주세요';
                            else if (statusMode === 'empty') label = '받을 응답이 없습니다';
                            else if (statusMode === 'error') label = '응답 수를 확인할 수 없습니다';
                            else if (noFormat) label = '형식을 1개 이상 선택하세요';
                            else if (statusMode === 'ready' && checkResult) {
                                label = isToolMode
                                    ? `내 PC에서 받기 · ${checkResult.count.toLocaleString()}건`
                                    : `받기 · ${checkResult.count.toLocaleString()}건`;
                            } else label = '받기';

                            return (
                                <div className="cd-right-action">
                                    <button
                                        type="button"
                                        disabled={!canDownload}
                                        onClick={handleDownload}
                                        className={`cd-right-download-btn ${canDownload ? 'ready' : ''} ${isToolMode ? 'pc-tool' : ''}`}
                                    >
                                        {(downloading || checkingTool || statusMode === 'checking')
                                            ? <Loader2 size={16} className="cd-spin-white" />
                                            : <Download size={16} />}
                                        <span>{label}</span>
                                    </button>
                                    {/* estimate reason 문장 그대로 */}
                                    {statusMode === 'ready' && estimate?.reason && (
                                        <p className="cd-right-action-reason">{estimate.reason}</p>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                </div>

                {/* 3. 표준 모달 푸터 (닫기만) */}
                <div className="variable-modal-footer" style={{
                    padding: '12px 26px',
                    borderTop: '1px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    flexShrink: 0
                }}>
                    <button
                        type="button"
                        className="upload-cancel-btn"
                        onClick={onClose}
                        style={{
                            height: '36px',
                            padding: '0 18px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#ffffff',
                            color: '#475569',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                        }}
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default CustomDownloadModal;
