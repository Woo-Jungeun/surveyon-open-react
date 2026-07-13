import { useState, useContext } from 'react';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { Sparkles, Bot, FileDown, Database, CheckCircle2 } from 'lucide-react';
import DataHeader from '@/services/dataStatus/components/DataHeader';
import { modalContext } from "@/components/common/Modal.jsx";
import KendoGridV3, { GridColumn as Column } from "@/components/kendo/KendoGridV3";

const MOCK_RESPONDENT_DATA = [
    { id: "RESP_001", gender: "남성", age: "24", region: "서울", family: "소가족", pattern: "모바일 위주 응답" },
    { id: "RESP_002", gender: "여성", age: "31", region: "경기", family: "대가족", pattern: "신중한 응답 (지연 시간)" },
    { id: "RESP_003", gender: "여성", age: "28", region: "부산", family: "소가족", pattern: "빠른 직선형 응답" },
    { id: "RESP_004", gender: "남성", age: "45", region: "대구", family: "대가족", pattern: "이탈 가능성 낮음" },
    { id: "RESP_005", gender: "여성", age: "22", region: "인천", family: "소가족", pattern: "주요 문항 성실 응답" },
    { id: "RESP_006", gender: "남성", age: "35", region: "광주", family: "소가족", pattern: "부정 응답 필터 통과" },
    { id: "RESP_007", gender: "여성", age: "50", region: "대전", family: "대가족", pattern: "높은 일관성" },
    { id: "RESP_008", gender: "남성", age: "29", region: "울산", family: "소가족", pattern: "디바이스 복합 사용" },
    { id: "RESP_009", gender: "여성", age: "38", region: "세종", family: "소가족", pattern: "정답 확인 문항 검증 완료" },
    { id: "RESP_010", gender: "남성", age: "42", region: "강원", family: "대가족", pattern: "실 응답자 패턴 합성" },
];

const AiDataPage = () => {
    const modal = useContext(modalContext);

    const [respondentCount, setRespondentCount] = useState(100);
    const [modelKey, setModelKey] = useState('llm-gpt-oss-120b');
    const [promptText, setPromptText] = useState('');
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [progressPercentage, setProgressPercentage] = useState(0);
    const [progressMessage, setProgressMessage] = useState('');
    const [isGenerated, setIsGenerated] = useState(false);
    const [displayData, setDisplayData] = useState([]);

    // 시뮬레이션된 AI 데이터 생성 프로세스
    const handleStartGenerate = () => {
        setIsGenerating(true);
        setIsGenerated(false);
        setProgressPercentage(0);
        setProgressMessage("QMaster 설문 구조 및 문항 제약조건 분석 중...");

        const steps = [
            { pct: 15, msg: "인구통계학적 가상 세그먼트 비율 분배 중..." },
            { pct: 45, msg: "LLM 기반 개별 응답자 시뮬레이션 및 데이터 합성 중..." },
            { pct: 75, msg: "설문 로직 정합성 및 무결성 검증 수행 중..." },
            { pct: 95, msg: "최종 데이터 적합성 스크리닝 진행 중..." },
            { pct: 100, msg: "AI 데이터 생성 완료!" }
        ];

        let currentStepIdx = 0;
        const interval = setInterval(() => {
            setProgressPercentage(prev => {
                const nextPct = prev + 5;
                
                // 해당 퍼센티지에 도달했을 때 메시지 업데이트
                if (currentStepIdx < steps.length && nextPct >= steps[currentStepIdx].pct) {
                    setProgressMessage(steps[currentStepIdx].msg);
                    currentStepIdx++;
                }

                if (nextPct >= 100) {
                    clearInterval(interval);
                    setTimeout(() => {
                        setIsGenerating(false);
                        setIsGenerated(true);
                        setDisplayData(MOCK_RESPONDENT_DATA);
                        modal.showAlert("알림", `성공적으로 ${respondentCount}건의 가상 응답 데이터를 생성 완료했습니다.`);
                    }, 500);
                    return 100;
                }
                return nextPct;
            });
        }, 150);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f1f5f9', overflow: 'hidden' }}>
            <DataHeader title="AI 데이터 생성" />

            <div style={{ flex: 1, display: 'flex', gap: '16px', padding: '16px', boxSizing: 'border-box', minHeight: 0 }}>
                {/* 좌측: 설정 패널 */}
                <div className="st-panel" style={{ width: '380px', padding: '20px', gap: '20px', boxSizing: 'border-box', shrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                        <SlidersIcon size={18} color="#16a34a" />
                        <span style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>생성 옵션 설정</span>
                    </div>

                    {/* 생성할 응답자 수 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>생성할 가상 응답자 수</label>
                        <DropDownList
                            data={[
                                { text: "100 건", value: 100 },
                                { text: "300 건", value: 300 },
                                { text: "500 건", value: 500 },
                                { text: "1,000 건", value: 1000 }
                            ]}
                            textField="text"
                            dataItemKey="value"
                            value={
                                { text: `${respondentCount.toLocaleString()} 건`, value: respondentCount }
                            }
                            onChange={(e) => setRespondentCount(e.value.value)}
                            style={{ height: '36px', fontSize: '13px', borderRadius: '4px' }}
                        />
                    </div>

                    {/* 분석 LLM 모델 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>분석 LLM 모델</label>
                        <DropDownList
                            data={[
                                { text: "GTP-OSS-120B (내부로컬)", value: "llm-gpt-oss-120b" },
                                { text: "GEMMA-4-31B-IT (내부로컬)", value: "llm-gemma-4-31b-it" }
                            ]}
                            textField="text"
                            dataItemKey="value"
                            value={
                                modelKey === 'llm-gpt-oss-120b'
                                    ? { text: "GTP-OSS-120B (내부로컬)", value: "llm-gpt-oss-120b" }
                                    : { text: "GEMMA-4-31B-IT (내부로컬)", value: "llm-gemma-4-31b-it" }
                            }
                            onChange={(e) => setModelKey(e.value.value)}
                            style={{ height: '36px', fontSize: '13px', borderRadius: '4px' }}
                        />
                    </div>

                    {/* 응답자 프로필 가이드 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>응답자 프로필 가이드 (Prompt)</label>
                        <textarea
                            value={promptText}
                            onChange={(e) => setPromptText(e.target.value)}
                            placeholder="예: 20~30대 비율을 60%로 하고, 남녀 비율은 5:5로 맞춰서 성실하게 응답하는 가상 데이터를 구성해줘."
                            className="ai-prompt-textarea"
                            style={{
                                width: '100%', flex: 1, padding: '12px', border: '1px solid #cbd5e1',
                                borderRadius: '4px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', resize: 'none',
                                lineHeight: '1.5', color: '#1e293b', boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* 실행 버튼 */}
                    <button
                        onClick={handleStartGenerate}
                        disabled={isGenerating}
                        style={{
                            width: '100%', height: '42px', border: 'none', borderRadius: '8px',
                            background: '#16a34a', color: '#ffffff', fontSize: '14px', fontWeight: 700,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: '8px', transition: 'background 0.15s, transform 0.1s', boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)',
                            opacity: isGenerating ? 0.7 : 1
                        }}
                        onMouseOver={(e) => { if (!isGenerating) e.currentTarget.style.background = '#15803d'; }}
                        onMouseOut={(e) => { if (!isGenerating) e.currentTarget.style.background = '#16a34a'; }}
                    >
                        <Sparkles size={16} />
                        <span>AI 데이터 생성 시작</span>
                    </button>
                </div>

                {/* 우측: 결과 및 미리보기 */}
                <div className="st-panel" style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', minHeight: 0, boxSizing: 'border-box' }}>
                    
                    {/* 데이터 생성 대기 상태 */}
                    {!isGenerating && !isGenerated && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', gap: '16px' }}>
                            <Bot size={64} strokeWidth={1.2} color="#cbd5e1" />
                            <span style={{ fontSize: '16px', fontWeight: 600 }}>설정된 옵션을 기반으로 AI 가상 응답 데이터를 생성할 수 있습니다.</span>
                            <span style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', lineHeight: 1.5 }}>
                                QMaster 로직 검증 및 응답 시뮬레이션을 통해<br />
                                논리적 모순이 없는 완벽한 가상 테스트 데이터를 즉시 추출합니다.
                            </span>
                        </div>
                    )}

                    {/* 데이터 생성 진행 중 상태 */}
                    {isGenerating && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>
                            <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {/* 바깥 테두리 애니메이션 */}
                                <div style={{
                                    position: 'absolute', width: '100%', height: '100%',
                                    borderRadius: '50%', border: '4px solid #f1f5f9', borderTopColor: '#16a34a',
                                    animation: 'spin 1.2s linear infinite'
                                }} />
                                <Bot size={40} color="#16a34a" />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>가상 응답 데이터 합성 중... ({progressPercentage}%)</span>
                                <span style={{ fontSize: '13px', color: '#64748b' }}>{progressMessage}</span>
                            </div>
                            {/* 게이지 바 */}
                            <div style={{ width: '320px', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${progressPercentage}%`, height: '100%', background: '#16a34a', transition: 'width 0.15s ease' }} />
                            </div>
                        </div>
                    )}

                    {/* 데이터 생성 완료 상태 */}
                    {isGenerated && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                            {/* 상단 완료 요약 */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <CheckCircle2 size={20} color="#16a34a" />
                                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>
                                        가상 응답 데이터 생성 결과 (샘플 10건 표시)
                                    </span>
                                </div>
                                
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => modal.showAlert('알림', '가상 데이터 CSV 파일 다운로드가 준비되었습니다.')}
                                        style={{
                                            height: '32px', padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: '6px',
                                            background: '#ffffff', color: '#475569', fontSize: '13px', fontWeight: 600,
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s'
                                        }}
                                        onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                                        onMouseOut={(e) => { e.currentTarget.style.background = '#ffffff'; }}
                                    >
                                        <FileDown size={14} />
                                        <span>CSV 다운로드</span>
                                    </button>
                                    <button
                                        onClick={() => modal.showAlert('알림', 'QMaster DB에 가상 응답 데이터 주입이 성공적으로 대기 중입니다.')}
                                        style={{
                                            height: '32px', padding: '0 12px', border: '1px solid #dcfce7', borderRadius: '6px',
                                            background: '#f0fdf4', color: '#16a34a', fontSize: '13px', fontWeight: 600,
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s'
                                        }}
                                        onMouseOver={(e) => { e.currentTarget.style.background = '#dcfce7'; }}
                                        onMouseOut={(e) => { e.currentTarget.style.background = '#f0fdf4'; }}
                                    >
                                        <Database size={14} />
                                        <span>QMaster DB 즉시 주입</span>
                                    </button>
                                </div>
                            </div>

                            {/* 데이터 그리드 미리보기 */}
                            <div style={{ flex: 1, minHeight: 0 }}>
                                <KendoGridV3 data={displayData}>
                                    <Column field="id" title="응답자 ID" width="100px" />
                                    <Column field="gender" title="성별 (Gender)" width="120px" />
                                    <Column field="age" title="연령 (Age)" width="100px" />
                                    <Column field="region" title="지역 (Region)" width="120px" />
                                    <Column field="family" title="가족 형태" width="120px" />
                                    <Column field="pattern" title="주요 응답 패턴" />
                                </KendoGridV3>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Spin CSS 및 플레이스홀더 스타일 */}
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .ai-prompt-textarea::placeholder {
                    color: #94a3b8 !important;
                    opacity: 0.65 !important;
                }
            `}</style>
        </div>
    );
};

// 미니 Sliders 아이콘 컴포넌트 선언 (Lucide Sliders 매핑 보완)
const SlidersIcon = ({ size = 16, color = "currentColor" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="21" x2="4" y2="14"></line>
        <line x1="4" y1="10" x2="4" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12" y2="3"></line>
        <line x1="20" y1="21" x2="20" y2="16"></line>
        <line x1="20" y1="12" x2="20" y2="3"></line>
        <line x1="2" y1="14" x2="6" y2="14"></line>
        <line x1="10" y1="8" x2="14" y2="8"></line>
        <line x1="18" y1="16" x2="22" y2="16"></line>
    </svg>
);

export default AiDataPage;
