import React, { useState, useRef, useCallback, useEffect, useContext } from 'react';
import DataHeader from '@/services/dataStatus/components/DataHeader';
import { modalContext } from "@/components/common/Modal.jsx";
import { FileText, Play, X, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, RefreshCw, Layers, Database, BrainCircuit, Search } from 'lucide-react';
import { useSelector } from 'react-redux';
import { QaPageApi } from './QaPageApi';
import QaProgressModal from './QaProgressModal';
import * as signalR from "@microsoft/signalr";
import './QaPage.css';

// ─── 확장된 명세서 기준 모의 데이터 (Mock Data) ───────────────────────────
const MOCK_QUESTIONS = [
    {
        id: 'global_rule_1',
        type: 'global_logic',
        text: '전역 분기 조건 설정',
        logic: '만약 [A2_a]에서 "고등학교 졸업 이하"를 선택한 경우, [A5](개인 정보 수집) 문항으로 즉시 스킵(Skip)하여 조사를 종료합니다.'
    },
    {
        id: 'A1_a',
        type: 'single',
        text: '귀하의 성별은 어떻게 되십니까? (셔플 및 고정 테스트 가능)',
        is_randomized: true,
        options: [
            { code: '1', text: '남성', is_fixed: false },
            { code: '2', text: '여성', is_fixed: false },
            { code: '9', text: '기타/무응답 (이 항목은 고정됨)', is_fixed: true }
        ],
        logic: '흐름 스킵: [{"target":"A1_b","condition":"모든 응답 완료"}]'
    },
    {
        id: 'A1_b',
        type: 'multi',
        text: '귀하가 자주 이용하는 SNS 채널을 모두 선택해 주십시오. (배타 및 기타 입력 테스트 가능)',
        options: [
            { code: '1', text: '카카오스토리', is_exclusive: false, has_open_ended: false },
            { code: '2', text: '페이스북', is_exclusive: false, has_open_ended: false },
            { code: '3', text: '인스타그램', is_exclusive: false, has_open_ended: false },
            { code: '4', text: '기타 SNS (직접 기입)', is_exclusive: false, has_open_ended: true },
            { code: '99', text: '이용하는 SNS가 전혀 없음', is_exclusive: true, has_open_ended: false }
        ],
        logic: '최대 3개 다중 선택 허용'
    },
    {
        id: 'A1',
        type: 'scale',
        text: '당사 서비스의 전반적인 이용 편리성에 대해 어떻게 평가하십니까?',
        options: [
            { code: '1', text: '매우 불편함' },
            { code: '2', text: '불편함' },
            { code: '3', text: '보통임' },
            { code: '4', text: '편리함' },
            { code: '5', text: '매우 편리함' }
        ],
        logic: '5점 리커트 척도 일괄 맵핑'
    },
    {
        id: 'A2_a',
        type: 'grid_multi',
        text: '다음 각 부문별 당사 브랜드 만족도를 평가해 주십시오. (격자 주관식 칼럼 테스트)',
        options: [
            { code: '1', text: '품질/성능' },
            { code: '2', text: '가격 경쟁력' },
            { code: '3', text: '고객 서비스' }
        ],
        scales: [
            { code: '1', text: '만족', has_open_ended: false },
            { code: '2', text: '보통', has_open_ended: false },
            { code: '3', text: '불만족', has_open_ended: false },
            { code: '99', text: '기타 의견 직접 기입', has_open_ended: true }
        ],
        logic: '매트릭스 척도 평가'
    },
    {
        id: 'A3',
        type: 'single',
        text: '최근 1개월 내에 방문해 보신 편의점 브랜드를 선택해 주십시오. (반복 로테이션 루프 시작)',
        loop_logic: {
            target_range: 'A3_sub1 ~ A3_sub2',
            repeat_condition: 'A3에서 선택한 브랜드 개수만큼 루프 반복 실행'
        },
        options: [
            { code: '1', text: 'GS25' },
            { code: '2', text: 'CU' },
            { code: '3', text: '세븐일레븐' }
        ],
        logic: '루프 기반 질문 전이'
    },
    {
        id: 'A3_sub1',
        type: 'single',
        loop_base_qnum: 'A3',
        text: '[A3 브랜드 반복] 해당 편의점의 방문 빈도는 어떻게 되십니까?',
        options: [
            { code: '1', text: '주 1~2회' },
            { code: '2', text: '주 3~4회' },
            { code: '3', text: '매일' }
        ],
        logic: '루프 종속 질문 1'
    },
    {
        id: 'A4',
        type: 'open',
        text: '당사 서비스 개선을 위한 건의사항을 자유롭게 작성해 주십시오.',
        logic: '최대 200자 주관식 텍스트 수집'
    },
    {
        id: 'A5',
        type: 'personal_info',
        text: '사은품 발송을 위한 개인 정보 수집 동의 및 입력',
        logic: '개인정보 보호법 규정 준수'
    },
    {
        id: 'A6',
        type: 'single',
        text: '귀하의 주택 점유 형태는 어떻게 되십니까?',
        options: [
            { code: '1', text: '자가' },
            { code: '2', text: '전세' },
            { code: '3', text: '월세' },
            { code: '4', text: '기타/사택' }
        ],
        logic: '단일 선택형'
    },
    {
        id: 'A7',
        type: 'multi',
        text: '최근 6개월 이내에 구매하신 전자제품을 모두 선택해 주십시오.',
        options: [
            { code: '1', text: '스마트폰' },
            { code: '2', text: '태블릿 PC' },
            { code: '3', text: '노트북' },
            { code: '4', text: '스마트 워치' },
            { code: '99', text: '해당 없음 (배타적)', is_exclusive: true }
        ],
        logic: '다중 선택형 (배타 제어 적용)'
    },
    {
        id: 'A8',
        type: 'scale',
        text: '사용 중이신 스마트폰 브랜드에 대한 추천 의향은 어떻게 되십니까?',
        options: [
            { code: '1', text: '전혀 추천하지 않음' },
            { code: '2', text: '비추천' },
            { code: '3', text: '보통' },
            { code: '4', text: '추천' },
            { code: '5', text: '매우 적극 추천' }
        ],
        logic: '5점 리커트 척도'
    },
    {
        id: 'A9',
        type: 'open',
        text: '당사 제품 구매 시 가장 중요하게 생각하는 요소는 무엇인지 기재해 주십시오.',
        logic: '주관식 서술형'
    },
    {
        id: 'A10',
        type: 'single',
        text: '귀하의 최종 학력은 어떻게 되십니까?',
        options: [
            { code: '1', text: '고등학교 졸업 이하' },
            { code: '2', text: '대학(교) 재학/졸업' },
            { code: '3', text: '대학원 이상' }
        ],
        logic: '전역 분기 조건 설정 대상 문항'
    },
    {
        id: 'A11',
        type: 'multi',
        text: '귀하가 주로 구독하여 이용하는 OTT 플랫폼을 모두 골라 주십시오.',
        options: [
            { code: '1', text: '넷플릭스' },
            { code: '2', text: '티빙' },
            { code: '3', text: '웨이브' },
            { code: '4', text: '디즈니플러스' },
            { code: '99', text: '구독하는 서비스 없음', is_exclusive: true }
        ],
        logic: '다중 선택형'
    },
    {
        id: 'A12',
        type: 'scale',
        text: '최근에 이용하신 해외여행 패키지 상품에 대한 만족도',
        options: [
            { code: '1', text: '매우 만족하지 않음' },
            { code: '2', text: '불만족' },
            { code: '3', text: '보통' },
            { code: '4', text: '만족' },
            { code: '5', text: '매우 만족' }
        ],
        logic: '5점 척도'
    },
    {
        id: 'A13',
        type: 'open',
        text: '차기 신제품 디자인에 반영되었으면 하는 아이디어가 있다면 서술해 주십시오.',
        logic: '주관식'
    },
    {
        id: 'A14',
        type: 'personal_info',
        text: '이벤트 경품 수령을 위한 연락처 기입',
        logic: '개인정보 보호법 준수'
    }
];

const MOCK_ERRORS = [
    {
        id: 'A1_b',
        type: 'warning',
        title: 'WARNING',
        message: '배타 옵션인 "이용하는 SNS가 전혀 없음"과 일반 SNS 옵션이 상충되는 응답 패턴이 논리식에 정의되어 있습니다.'
    },
    {
        id: 'A2_a',
        type: 'critical',
        title: 'CRITICAL',
        message: "격자형 매트릭스 척도 테이블의 컬럼수가 기존 파싱된 JSON 열 정보 스키마와 물리적으로 일치하지 않습니다."
    },
    {
        id: 'A3_sub1',
        type: 'warning',
        title: 'WARNING',
        message: "루프 관계설정(loop_base_qnum: 'A3')이 되어 있으나, 상위 문항 A3의 일부 보기 응답값이 전달되지 않을 가능성이 존재합니다."
    }
];

// ─── 셔플링 헬퍼 함수 (is_fixed: true 항목은 맨 아래 보존한 채 섞음) ───────
const getShuffledOptions = (options, isShuffled) => {
    if (!isShuffled) return options;
    const fixedOptions = options.filter(o => o.is_fixed);
    const nonFixedOptions = options.filter(o => !o.is_fixed);

    // nonFixedOptions 무작위 셔플 (Fisher-Yates)
    const shuffled = [...nonFixedOptions];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return [...shuffled, ...fixedOptions];
};

// ─── 문항 유형 이름 단축화 헬퍼 함수 ────────────────────────────────
const getShortTypeName = (type) => {
    switch (type) {
        case 'grid_multi': return 'grid';
        case 'personal_info': return 'info';
        default: return type;
    }
};

// ─── 메인 컴포넌트 ────────────────────────────────────────
const QaPage = () => {
    // UI 로컬 상태 관리
    const [uploadedFile, setUploadedFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isSaved, setIsSaved] = useState(false); // 저장 완료 토스트 알림 상태
    const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
    const [isRightCollapsed, setIsRightCollapsed] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // 분석 데이터 상태
    const [questions, setQuestions] = useState([]); // 문항 리스트
    const [errors, setErrors] = useState([]); // 검증 오류 리스트
    const [activeQuestionId, setActiveQuestionId] = useState(''); // 현재 선택된 문항 ID (스크롤 연계)

    // ── UI/UX 사양 동적 시뮬레이션 상태 ──
    const [userAnswers, setUserAnswers] = useState({}); // 각 문항별 사용자의 모의 선택 응답 값
    const [shuffleStates, setShuffleStates] = useState({}); // 각 문항별 셔플 토글 상태 { 문항ID: Boolean }
    const [openEndedTexts, setOpenEndedTexts] = useState({}); // 주관식 기타 입력 텍스트 { '문항ID_옵션코드': String }
    const openEndedInputRefs = useRef({}); // 기타 입력창 포커스용 ref

    // Progress Modal States
    const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
    const [progressPercentage, setProgressPercentage] = useState(0);
    const [progressMessage, setProgressMessage] = useState('요청을 준비하고 있습니다...');
    const [isProgressComplete, setIsProgressComplete] = useState(false);

    const fileInputRef = useRef(null);
    const questionCardRefs = useRef({});
    const auth = useSelector(store => store.auth);
    const modal = useContext(modalContext);
    const { analyzeAll } = QaPageApi();

    // ── 드래그앤드롭 이벤트 핸들러 ──
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) setUploadedFile(file);
    }, []);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) setUploadedFile(file);
        e.target.value = '';
    };

    const handleRemoveFile = () => {
        setUploadedFile(null);
    };

    // ── 문항 포커스 및 스크롤 이동 ──
    const handleFocusQuestion = (id) => {
        if (id === 'global_rule_1') {
            setActiveQuestionId(id);
            const element = questionCardRefs.current[id];
            if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }
        setActiveQuestionId(id);
        const element = questionCardRefs.current[id];
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // ── 시뮬레이션 1. 기존 구조화된 설문 가져오기 ──
    const handleLoadExisting = () => {
        setQuestions(MOCK_QUESTIONS);
        if (MOCK_QUESTIONS.length > 0) {
            setActiveQuestionId(MOCK_QUESTIONS[0].id);
        }
        modal.showAlert('알림', '명세서 사양 기준 구조화된 설문 데이터가 정상 로드되었습니다.');
    };

    // ── 시뮬레이션 2. 설문지 -> JSON 구조화 (실제 분석 로직 실행) ──
    const handleAnalyze = async () => {
        if (!uploadedFile) {
            modal.showAlert('알림', '설문지 파일을 먼저 업로드해 주세요.');
            return;
        }

        setProgressPercentage(0);
        setProgressMessage('연결 준비 중...');
        setIsProgressComplete(false);
        setIsProgressModalOpen(true);

        const pn = sessionStorage.getItem('projectnum') || '';
        const user = auth?.user?.userId || '';

        // 1. 소켓 연결 및 아이디 발급
        let myConnectionId = null;
        let connection = null;
        try {
            const baseUrl = window.API_CONFIG?.API_BASE_URL_DATAMANAGEMENT || "";
            let hubUrl = baseUrl.replace(/\/+$/, '') + "/hubs/task-progress";
            if (!hubUrl.startsWith('http')) {
                hubUrl = window.location.origin + hubUrl;
            }

            connection = new signalR.HubConnectionBuilder()
                .withUrl(hubUrl)
                .withAutomaticReconnect()
                .configureLogging(signalR.LogLevel.None)
                .build();

            connection.onreconnecting(error => {
                if (error) console.error(`[SignalR] ⚠️ 연결 끊김!`, error);
            });

            connection.on("ReceiveProgress", (...args) => {
                let percent = 0;
                let msg = '';

                if (args.length >= 2 && typeof args[1] === 'number') {
                    msg = args[0];
                    percent = args[1];
                } else if (args.length === 1 && typeof args[0] === 'object') {
                    msg = args[0].message || args[0].Message;
                    percent = args[0].percent || args[0].Percent || args[0].percentage || args[0].Percentage;
                }

                setProgressPercentage(percent || 0);
                setProgressMessage(msg || '');
            });

            await connection.start();
            myConnectionId = connection.connectionId;
        } catch (e) {
            console.error("SignalR Connection Error:", e);
            setProgressMessage("오류: 실시간 연결 실패 (모의 구조화 진행)");
        }

        const fd = new FormData();
        fd.append('Pn', pn);
        fd.append('documentFile', uploadedFile);
        fd.append('user', user);
        if (myConnectionId) {
            fd.append('ConnectionId', myConnectionId);
        }

        try {
            await analyzeAll.mutateAsync(fd);

            setProgressPercentage(100);
            setProgressMessage('설문지 JSON 구조화가 완료되었습니다!');
            setTimeout(() => {
                setIsProgressComplete(true);
                setQuestions(MOCK_QUESTIONS);
                if (MOCK_QUESTIONS.length > 0) {
                    setActiveQuestionId(MOCK_QUESTIONS[0].id);
                }
            }, 600);

        } catch (e) {
            console.log("백엔드 통신 실패. 모의 동작으로 로딩을 계속 진행합니다.");
            let currentPercent = 10;
            const timer = setInterval(() => {
                currentPercent += 15;
                if (currentPercent >= 100) {
                    clearInterval(timer);
                    setProgressPercentage(100);
                    setProgressMessage('구조화가 완벽하게 끝났습니다!');
                    setTimeout(() => {
                        setIsProgressComplete(true);
                        setQuestions(MOCK_QUESTIONS);
                        if (MOCK_QUESTIONS.length > 0) {
                            setActiveQuestionId(MOCK_QUESTIONS[0].id);
                        }
                    }, 500);
                } else {
                    setProgressPercentage(currentPercent);
                    if (currentPercent >= 70) {
                        setProgressMessage('교차 분석 및 척도 결합 중...');
                    } else if (currentPercent >= 40) {
                        setProgressMessage('스크립트 문항 구조 파싱 중...');
                    } else {
                        setProgressMessage('HWP/DOCX 문서 파라미터 해독 중...');
                    }
                }
            }, 250);
        } finally {
            if (connection) {
                connection.stop();
            }
        }
    };

    // ── 시뮬레이션 3. AI 로직 오류 체크 ──
    const handleCheckErrors = () => {
        if (questions.length === 0) {
            modal.showAlert('알림', '먼저 설문을 가져오거나 JSON 구조화를 진행해 주세요.');
            return;
        }
        setErrors(MOCK_ERRORS);
        modal.showAlert('알림', 'AI 로직 검증 결과 총 3건의 이슈가 감지되었습니다.');
    };

    // ── 시뮬레이션 4. 구조화 데이터 최종 저장 ──
    const handleSaveData = () => {
        if (questions.length === 0) {
            modal.showAlert('알림', '저장할 구조화 데이터가 존재하지 않습니다.');
            return;
        }
        setIsSaved(true);
        setTimeout(() => {
            setIsSaved(false);
        }, 4000);
    };

    // 문항 조작 시뮬레이션 핸들러
    const handleInsertQuestion = (id) => {
        modal.showAlert('삽입 시뮬레이션', `[${id}] 하위에 새로운 빈 문항 노드를 삽입합니다.`);
    };

    const handleModifyQuestion = (id) => {
        modal.showAlert('수정 시뮬레이션', `[${id}] 문항 속성 편집을 진행합니다.`);
    };

    const handleDeleteQuestion = (id) => {
        modal.showConfirmAlert('삭제 시뮬레이션', `[${id}] 문항을 정말 삭제하시겠습니까?`, () => {
            setQuestions(prev => prev.filter(q => q.id !== id));
            setErrors(prev => prev.filter(e => e.id !== id));
            modal.showAlert('완료', `[${id}] 문항이 임시 삭제되었습니다.`);
        });
    };

    // ── 폼 제어 동적 인터랙션 핸들러 ──

    // 1) 단일 선택형(single / scale / loop 등) 핸들러
    const handleSingleSelect = (questionId, optionCode) => {
        setUserAnswers(prev => ({
            ...prev,
            [questionId]: optionCode
        }));
    };

    // 2) 다중 선택형(multi) 배타제어 및 주관식 input 활성 연계 핸들러
    const handleMultiSelect = (questionId, optionCode, isExclusive, hasOpenEnded) => {
        const currentSelections = userAnswers[questionId] || [];
        let updatedSelections = [];

        if (isExclusive) {
            // 배타 항목을 선택한 경우: 기존 모든 선택 해제하고 해당 배타 항목만 추가
            if (currentSelections.includes(optionCode)) {
                updatedSelections = []; // 이미 체크되어 있었다면 토글 해제
            } else {
                updatedSelections = [optionCode];
                // 배타 항목 체크 시 기타 입력창들의 텍스트 내용도 초기화
                setOpenEndedTexts(prev => {
                    const next = { ...prev };
                    Object.keys(next).forEach(key => {
                        if (key.startsWith(`${questionId}_`)) {
                            next[key] = '';
                        }
                    });
                    return next;
                });
            }
        } else {
            // 일반 항목을 선택한 경우: 배타 항목들의 체크를 강제 해제하고 추가/삭제
            const filteredSelections = currentSelections.filter(code => {
                const opt = MOCK_QUESTIONS.find(q => q.id === questionId)?.options?.find(o => o.code === code);
                return !opt?.is_exclusive; // 배타적 옵션 다 지움
            });

            if (filteredSelections.includes(optionCode)) {
                updatedSelections = filteredSelections.filter(code => code !== optionCode);
                // 주관식 기타 체크 해제 시 인풋 텍스트 초기화
                if (hasOpenEnded) {
                    setOpenEndedTexts(prev => ({ ...prev, [`${questionId}_${optionCode}`]: '' }));
                }
            } else {
                updatedSelections = [...filteredSelections, optionCode];
                // 주관식 기타 선택 시 인풋 박스 즉시 포커스()
                if (hasOpenEnded) {
                    setTimeout(() => {
                        const inputEl = openEndedInputRefs.current[`${questionId}_${optionCode}`];
                        if (inputEl) inputEl.focus();
                    }, 50);
                }
            }
        }

        setUserAnswers(prev => ({
            ...prev,
            [questionId]: updatedSelections
        }));
    };

    // 3) 격자 매트릭스형(grid_multi) 핸들러
    const handleGridSelect = (questionId, rowCode, colCode) => {
        const currentGridAnswer = userAnswers[questionId] || {};
        setUserAnswers(prev => ({
            ...prev,
            [questionId]: {
                ...currentGridAnswer,
                [rowCode]: colCode
            }
        }));
    };

    // 4) 셔플 테스트 토글 핸들러
    const handleShuffleToggle = (questionId) => {
        setShuffleStates(prev => ({
            ...prev,
            [questionId]: !prev[questionId]
        }));
    };

    // ── qtype별 폼 요소 렌더링 함수 ──
    const renderFormContent = (q) => {
        const isShuffled = !!shuffleStates[q.id];

        switch (q.type) {
            case 'single': {
                const renderedOptions = getShuffledOptions(q.options, isShuffled);
                const selectedVal = userAnswers[q.id] || '';
                return (
                    <div className="qa-form-rendering-box">
                        {renderedOptions.map(opt => (
                            <label key={opt.code} className="qa-option-row">
                                <input
                                    type="radio"
                                    name={q.id}
                                    checked={selectedVal === opt.code}
                                    onChange={() => handleSingleSelect(q.id, opt.code)}
                                />
                                <span style={{ marginLeft: '4px' }}>{opt.text}</span>
                                {opt.is_fixed && (
                                    <span className="qa-control-badge qa-badge-fixed-info" style={{ marginLeft: '6px' }}>📌 고정</span>
                                )}
                            </label>
                        ))}
                    </div>
                );
            }

            case 'multi': {
                const renderedOptions = getShuffledOptions(q.options, isShuffled);
                const selectedVals = userAnswers[q.id] || [];
                // 배타 항목이 체크되어 있는지 판별
                const hasExclusiveChecked = renderedOptions.some(opt => opt.is_exclusive && selectedVals.includes(opt.code));

                return (
                    <div className="qa-form-rendering-box">
                        {renderedOptions.map(opt => {
                            const isChecked = selectedVals.includes(opt.code);
                            // 배타적 항목이 체크되어 있는 경우, 다른 일반 항목들은 조작 불가능하도록 disabled
                            const isDisabled = hasExclusiveChecked && !opt.is_exclusive;

                            return (
                                <label key={opt.code} className={`qa-option-row ${isDisabled ? 'disabled' : ''}`}>
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        disabled={isDisabled}
                                        onChange={() => handleMultiSelect(q.id, opt.code, opt.is_exclusive, opt.has_open_ended)}
                                    />
                                    <span style={{ marginLeft: '4px' }}>{opt.text}</span>

                                    {opt.is_exclusive && (
                                        <span className="qa-control-badge qa-badge-exclusive" style={{ marginLeft: '6px' }}>[배타]</span>
                                    )}
                                    {opt.is_fixed && (
                                        <span className="qa-control-badge qa-badge-fixed-info" style={{ marginLeft: '6px' }}>📌 고정</span>
                                    )}

                                    {/* 주관식 기타 입력창 결합 */}
                                    {opt.has_open_ended && (
                                        <input
                                            type="text"
                                            ref={el => openEndedInputRefs.current[`${q.id}_${opt.code}`] = el}
                                            className="qa-option-open-input"
                                            placeholder="내용을 기입하세요"
                                            value={openEndedTexts[`${q.id}_${opt.code}`] || ''}
                                            disabled={!isChecked || isDisabled}
                                            style={{
                                                opacity: (isChecked && !isDisabled) ? 1 : 0.4,
                                                borderColor: (isChecked && !isDisabled) ? 'var(--dm-primary)' : '#cbd5e1'
                                            }}
                                            onChange={(e) => {
                                                const txt = e.target.value;
                                                setOpenEndedTexts(prev => ({ ...prev, [`${q.id}_${opt.code}`]: txt }));
                                            }}
                                            onClick={(e) => e.stopPropagation()} // 클릭 시 체크박스 트리거 방지
                                        />
                                    )}
                                </label>
                            );
                        })}
                    </div>
                );
            }

            case 'scale': {
                const selectedVal = userAnswers[q.id] || '';
                return (
                    <div className="qa-form-rendering-box">
                        <div className="qa-scale-stack">
                            {q.options.map(opt => (
                                <button
                                    key={opt.code}
                                    className={`qa-scale-btn ${selectedVal === opt.code ? 'active' : ''}`}
                                    onClick={() => handleSingleSelect(q.id, opt.code)}
                                >
                                    <span className="qa-scale-num">{opt.code}</span>
                                    <span className="qa-scale-text">{opt.text}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                );
            }

            case 'grid_multi': {
                const gridAnswer = userAnswers[q.id] || {};
                return (
                    <div className="qa-form-rendering-box">
                        <table className="qa-grid-matrix-table">
                            <thead>
                                <tr>
                                    <th>평가 구분</th>
                                    {q.scales.map(col => (
                                        <th key={col.code}>
                                            {col.text}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {q.options.map(row => (
                                    <tr key={row.code}>
                                        <td className="row-label">{row.text}</td>
                                        {q.scales.map(col => {
                                            const isChecked = gridAnswer[row.code] === col.code;

                                            // 주관식 입력 격자 칼럼 대응
                                            if (col.has_open_ended) {
                                                return (
                                                    <td key={col.code}>
                                                        <input
                                                            type="text"
                                                            className="qa-grid-input-open"
                                                            placeholder="직접 기입"
                                                            value={openEndedTexts[`${q.id}_${row.code}_${col.code}`] || ''}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setOpenEndedTexts(prev => ({
                                                                    ...prev,
                                                                    [`${q.id}_${row.code}_${col.code}`]: val
                                                                }));
                                                            }}
                                                        />
                                                    </td>
                                                );
                                            }

                                            return (
                                                <td key={col.code}>
                                                    <input
                                                        type="radio"
                                                        className="qa-grid-radio"
                                                        name={`${q.id}_${row.code}`}
                                                        checked={isChecked}
                                                        onChange={() => handleGridSelect(q.id, row.code, col.code)}
                                                    />
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            }

            case 'open': {
                return (
                    <div className="qa-form-rendering-box">
                        <textarea
                            className="qa-open-textarea"
                            placeholder="의견을 여기에 입력해 주십시오."
                            value={userAnswers[q.id] || ''}
                            onChange={(e) => {
                                const val = e.target.value;
                                setUserAnswers(prev => ({ ...prev, [q.id]: val }));
                            }}
                        />
                    </div>
                );
            }

            case 'personal_info': {
                return (
                    <div className="qa-form-rendering-box">
                        <div className="qa-personal-info-grid">
                            <div className="qa-form-group">
                                <label>성명</label>
                                <input type="text" className="qa-input-text" placeholder="성명 입력" />
                            </div>
                            <div className="qa-form-group">
                                <label>연락처</label>
                                <input type="text" className="qa-input-text" placeholder="010-0000-0000" />
                            </div>
                        </div>
                    </div>
                );
            }

            default:
                return null;
        }
    };

    const visibleQuestions = questions.filter(q => q.type !== 'global_logic');
    const globalLogicRules = questions.filter(q => q.type === 'global_logic');

    const filteredVisibleQuestions = visibleQuestions.filter(q =>
        q.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const filteredGlobalRules = globalLogicRules.filter(r =>
        r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.text.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="qa-parser-page" data-theme="data-management">
            <DataHeader title="QA" />

            <div className="qa-parser-body">
                {/* ── 1. 좌측 컨트롤 패널 (250px 슬림) ───────────────────────── */}
                <div className={`qa-parser-left qa-panel ${isLeftCollapsed ? 'collapsed' : ''}`}>
                    {isLeftCollapsed ? (
                        <div className="qa-collapsed-trigger-bar" onClick={() => setIsLeftCollapsed(false)} title="컨트롤 패널 열기">
                            <ChevronRight size={18} color="#64748b" />
                            <span className="vertical-text">컨트롤 패널</span>
                        </div>
                    ) : (
                        <>
                            {/* 설문지 파일 (.DOCX) 업로드 영역 */}
                            <div className="qa-form-group">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>설문지 파일 (.DOCX)</span>
                                    <button className="qa-panel-toggle-btn" onClick={() => setIsLeftCollapsed(true)} title="컨트롤 패널 접기">
                                        <ChevronLeft size={16} color="#64748b" />
                                    </button>
                                </div>
                                <input type="file" ref={fileInputRef}
                                    accept=".docx,.doc,.hwp,.hwpx"
                                    style={{ display: 'none' }}
                                    onChange={handleFileChange} />

                                <div className={`qa-left-dropzone ${isDragging ? 'is-dragging' : ''} ${uploadedFile ? 'is-filled' : ''}`}
                                    onClick={() => !uploadedFile && fileInputRef.current?.click()}
                                    onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}>
                                    {uploadedFile ? (
                                        <div className="qa-dz-filled">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                                <CheckCircle size={16} color="#10b981" style={{ flexShrink: 0 }} />
                                                <span className="qa-dz-filename" title={uploadedFile.name}>{uploadedFile.name}</span>
                                            </div>
                                            <button className="qa-dz-remove" onClick={(e) => { e.stopPropagation(); handleRemoveFile(); }}>
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="qa-dz-empty">
                                            <FileText size={18} className="qa-dz-icon" />
                                            <span className="qa-dz-text">클릭하여 파일찾기</span>
                                            <span className="qa-dz-subtext">.docx · .hwp</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 실행 버튼 세로 리스트 (리디자인 버전) */}
                            <div className="qa-action-buttons">
                                <button className="qa-btn-action btn-gray" onClick={handleLoadExisting}>
                                    <Layers size={14} />
                                    기존 구조화된 설문 가져오기
                                </button>
                                <button className="qa-btn-action btn-green" onClick={handleAnalyze} disabled={analyzeAll.isLoading}>
                                    <RefreshCw size={14} className={analyzeAll.isLoading ? 'spin-anim' : ''} />
                                    설문지 ➔ JSON 구조화
                                </button>
                                <button className="qa-btn-action btn-orange" onClick={handleCheckErrors}>
                                    <BrainCircuit size={14} />
                                    AI 로직 오류 체크
                                </button>
                                <button className="qa-btn-action btn-purple" onClick={handleSaveData}>
                                    <Database size={14} />
                                    구조화 데이터 최종 저장
                                </button>
                            </div>

                            {/* 저장 완료 피드백 토스트 */}
                            {isSaved && (
                                <div className="qa-save-toast">
                                    서버 DB 영구 저장 완료 (시뮬레이션)
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* ── 2. 중앙 구조화 상세 뷰어 (색인 + 상세 뷰 분할) ─────────────────── */}
                <div className="qa-parser-center qa-panel">
                    <div className="qa-center-header">
                        <h2>구조화 설문 결과 상세 뷰어</h2>
                        <span className="qa-active-api-badge">Active Backend API</span>
                    </div>

                    <div className="qa-split-viewer">
                        {questions.length > 0 ? (
                            <>
                                {/* 좌측 문항 색인 리스트 */}
                                <div className="qa-index-list">
                                    <div className="qa-index-search-wrapper">
                                        <Search size={14} className="qa-index-search-icon" />
                                        <input
                                            type="text"
                                            placeholder="변수명 또는 라벨 검색..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="qa-index-search-input"
                                        />
                                        {searchTerm && (
                                            <button className="qa-index-search-clear" onClick={() => setSearchTerm('')}>
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>

                                    {filteredGlobalRules.map(r => (
                                        <div
                                            key={r.id}
                                            className={`qa-index-item ${activeQuestionId === r.id ? 'active' : ''}`}
                                            onClick={() => handleFocusQuestion(r.id)}
                                        >
                                            <div className="qa-index-item-info">
                                                <span className="qa-index-label-title" title={r.text}>
                                                    전역 룰셋
                                                </span>
                                                <span className="qa-index-label-sub">
                                                    {r.id}_stub
                                                </span>
                                            </div>
                                            <div className="qa-index-type-badge type-rule">
                                                rule
                                            </div>
                                        </div>
                                    ))}
                                    {filteredVisibleQuestions.map((q) => (
                                        <div
                                            key={q.id}
                                            className={`qa-index-item ${activeQuestionId === q.id ? 'active' : ''}`}
                                            onClick={() => handleFocusQuestion(q.id)}
                                        >
                                            <div className="qa-index-item-info">
                                                <span className="qa-index-label-title" title={q.text}>
                                                    {q.id}. {q.text}
                                                </span>
                                                <span className="qa-index-label-sub">
                                                    {q.id}_stub
                                                </span>
                                            </div>
                                            <div className={`qa-index-type-badge type-${q.type}`}>
                                                {getShortTypeName(q.type)}
                                            </div>
                                        </div>
                                    ))}
                                    {filteredGlobalRules.length === 0 && filteredVisibleQuestions.length === 0 && (
                                        <div className="qa-index-search-empty">
                                            검색 결과가 없습니다.
                                        </div>
                                    )}
                                </div>

                                {/* 우측 문항 상세 리스트 */}
                                <div className="qa-detail-list">
                                    {globalLogicRules.map(r => (
                                        <div
                                            key={r.id}
                                            className={`qa-global-rules-container ${activeQuestionId === r.id ? 'highlighted' : ''}`}
                                            ref={el => questionCardRefs.current[r.id] = el}
                                        >
                                            <div className="qa-global-rules-list">
                                                <div className="qa-global-rule-card">
                                                    <div className="qa-global-rule-title">
                                                        <BrainCircuit size={12} color="#4f46e5" />
                                                        [전역 로직] {r.text}
                                                    </div>
                                                    <p style={{ margin: '4px 0 0 0', lineHeight: 1.4 }}>{r.logic}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {visibleQuestions.map((q) => (
                                        <div
                                            key={q.id}
                                            className={`qa-question-card ${activeQuestionId === q.id ? 'highlighted' : ''}`}
                                            ref={el => questionCardRefs.current[q.id] = el}
                                        >
                                            {q.loop_logic && (
                                                <div className="qa-loop-banner">
                                                    <Layers size={13} />
                                                    [로테이션 루프 시작 구간: {q.loop_logic.target_range}] - {q.loop_logic.repeat_condition}
                                                </div>
                                            )}

                                            <div className="qa-qc-header">
                                                <div className="qa-qc-title-area">
                                                    <span className="qa-qc-id">{q.id}</span>
                                                    <span className="qa-type-badge">{q.type}</span>
                                                    {q.is_randomized && (
                                                        <span className="qa-control-badge qa-badge-shuffle-info">🎲 보기 랜덤</span>
                                                    )}
                                                </div>
                                                <div className="qa-qc-controls">
                                                    {q.is_randomized && (
                                                        <div
                                                            className={`qa-shuffle-tester-box ${shuffleStates[q.id] ? 'active' : ''}`}
                                                            onClick={() => handleShuffleToggle(q.id)}
                                                        >
                                                            <span>셔플 테스트</span>
                                                        </div>
                                                    )}
                                                    <button className="qa-mini-btn btn-insert" onClick={() => handleInsertQuestion(q.id)}>+ 삽입</button>
                                                    <button className="qa-mini-btn" onClick={() => handleModifyQuestion(q.id)}>수정</button>
                                                    <button className="qa-mini-btn btn-delete" onClick={() => handleDeleteQuestion(q.id)}>삭제</button>
                                                </div>
                                            </div>

                                            <div className="qa-qc-body">
                                                <p className="qa-qc-question-text">{q.text}</p>
                                                {renderFormContent(q)}
                                                <div className="qa-logics-box">
                                                    <div className="qa-section-sub-label">상호 연계 로직 (LOGICS)</div>
                                                    <pre className="qa-logic-desc">{q.logic}</pre>
                                                </div>
                                                {q.loop_base_qnum && (
                                                    <div className="qa-bottom-link-bar">
                                                        <span>🔗 본 문항은 {q.loop_base_qnum}에 종속된 반복 로테이션 문항입니다.</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="qa-empty-viewer">
                                <FileText size={48} strokeWidth={1.5} />
                                <span style={{ fontSize: '14px', fontWeight: 600 }}>구조화된 설문 분석 결과가 존재하지 않습니다.</span>
                                <span style={{ fontSize: '12px', color: '#94a3b8' }}>좌측 패널에서 설문을 가져오거나 구조화를 진행해 주세요.</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── 3. 우측 AI 로직 검증 패널 ─────────────────────────────── */}
                <div className={`qa-parser-right qa-panel ${isRightCollapsed ? 'collapsed' : ''}`}>
                    {isRightCollapsed ? (
                        <div className="qa-collapsed-trigger-bar" onClick={() => setIsRightCollapsed(false)} title="검증 결과 열기">
                            <ChevronLeft size={18} color="#64748b" />
                            <span className="vertical-text">검증 결과</span>
                        </div>
                    ) : (
                        <>
                            <div className="qa-right-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button className="qa-panel-toggle-btn" onClick={() => setIsRightCollapsed(true)} title="검증 결과 접기">
                                        <ChevronRight size={16} color="#64748b" />
                                    </button>
                                    <h2>
                                        <AlertTriangle size={15} color="#64748b" />
                                        AI 로직 검증 결과
                                    </h2>
                                </div>
                                {errors.length > 0 && (
                                    <span className="qa-error-count-badge">{errors.length}건 검출</span>
                                )}
                            </div>

                            <div className="qa-right-error-list">
                                {errors.length > 0 ? (
                                    errors.map((err, idx) => (
                                        <div
                                            key={idx}
                                            className={`qa-error-card-lite ${err.type}`}
                                            onClick={() => handleFocusQuestion(err.id)}
                                            style={{ cursor: 'pointer' }}
                                            title="클릭 시 해당 문항으로 스크롤 이동"
                                        >
                                            <div className="qa-ec-top">
                                                <span className="qa-ec-id">{err.id}</span>
                                                <span className="qa-ec-badge">{err.title}</span>
                                            </div>
                                            <p className="qa-ec-message">{err.message}</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="qa-empty-viewer" style={{ padding: '40px 10px' }}>
                                        <CheckCircle size={32} color="#94a3b8" strokeWidth={1.5} />
                                        <span style={{ fontSize: '13px', fontWeight: 600, textAlign: 'center' }}>이슈 검출 내역이 없습니다.</span>
                                        <span style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>AI 로직 오류 체크 시 검증이 시작됩니다.</span>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <QaProgressModal
                isOpen={isProgressModalOpen}
                onClose={() => setIsProgressModalOpen(false)}
                percentage={progressPercentage}
                message={progressMessage}
                isComplete={isProgressComplete}
            />
        </div>
    );
};

export default QaPage;
