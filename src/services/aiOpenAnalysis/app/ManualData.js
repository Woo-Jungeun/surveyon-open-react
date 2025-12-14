/**
 * 통합 웹 매뉴얼 데이터
 * 
 * 이 파일에서 매뉴얼의 메뉴와 상세 내용을 관리합니다.
 * id: 고유 식별자 (숫자 또는 문자열)
 * title: 메뉴명
 * content: 상세 가이드 내용 (HTML 태그 사용 가능)
 * icon: SVG 아이콘 경로 또는 SVG 코드
 */


import img1 from '@/assets/images/manual/1.png';
import img2 from '@/assets/images/manual/2.png';
import img3 from '@/assets/images/manual/3.png';
import img4 from '@/assets/images/manual/4.png';
import img5 from '@/assets/images/manual/5.png';
import img6 from '@/assets/images/manual/6.png';
import img7 from '@/assets/images/manual/7.png';
import img7_2 from '@/assets/images/manual/7_2.png';
import img7_3 from '@/assets/images/manual/7_3.png';
import img8 from '@/assets/images/manual/8.png';

export const manualData = [
    {
        id: "intro",
        title: "0. 메인페이지",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
        content: `
            <h2>0. 메인페이지</h2>
            <p>설문온 전체 소개, 홍보, 기능별 업데이트 공지</p>
            <p>기대효과 : 설문온 기능 홍보, 기능 업데이트 실시간 공지 파악가능</p>
        `
    },
    {
        id: "survey",
        title: "1. 설문 관리",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M9 14h6"></path><path d="M9 10h6"></path><path d="M9 18h6"></path></svg>`,
        content: `
            <h2>1. 설문 관리</h2>
            <p>설문제작 UI, 표준안없이 자동변환,라이브러리 유형화 제작 구현</p>
        `
    },
    {
        id: "dataadmin",
        title: "2. 데이터 현황",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`,
        content: `
            <h2>2. 데이터 현황</h2>
            <p>문항별 결과 AI분석 보고 가능 표, 시각화, 요약</p>
            
        `
    },
    {
        id: "usage",
        title: "3. 데이터 관리",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s 9-1.34 9-3V5"></path></svg>`,
        content: `
            <h2>3. 데이터 관리</h2>
            <p>데이터 맵관리, 출력, 수정 <br>AI데이터 생성[테스트] – 자동 응답 및 기본 로직 체크</p>
        `
    },
    {
        id: "ai_analysis",
        title: "4. AI 오픈 분석",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8" y2="16"></line><line x1="16" y1="16" x2="16" y2="16"></line></svg>`,
        content: `
            <h2>4. AI 오픈 분석</h2>
            <div class="guide-section">
                <h3>4.1 개요</h3>
                <p>AI 오픈 분석 기능은 수집된 데이터를 인공지능 알고리즘을 통해 분석하고 자동 분류와 자동 코딩을 하는 핵심 모듈입니다.</p>
            </div>
            
            <div class="guide-section">
                <h3>4.2 주요 기능</h3>
                <div class="note-orange">
                    <ul>
                        <li><strong>자동 카테고리 분류 및 코드화:</strong> 조사DB Data 연동, 엑셀 Data 등록 기준 자동 카테고리 분류 및 코드화</li>
                        <li><strong>정교한 카테고리 분류:</strong> 정성분류 (프롬프트 명령 정의로 카테고리 분류 가능)</li>
                        <li><strong>다국어 자동 번역 지원:</strong> 여러 다국어 오픈을 한번에 하나의 언어로 자동분류</li>
                        <li><strong>트래킹오픈:</strong> 기존 카테고리 분류 기준으로 새로운 데이터 자동 분류</li>
                    </ul>
                </div>
            </div>

            <div class="guide-section">
                <h3>4.3 작업자 업무프로세스</h3>
                <div class="process-flow">
                    <div class="process-step">
                        <div class="step-number">01</div>
                        <div class="step-content">
                            <span class="step-title">프로젝트 등록</span>
                            <div class="step-desc">
                                조사DB(솔루션본부) 또는 신규등록(연구부서)을 통해 프로젝트를 생성합니다.
                            </div>
                            <div class="step-meta">
                                <strong>담당자:</strong> <span class="badge badge-blue">솔루션본부</span> <span class="badge badge-green">연구부서</span>
                            </div>
                        </div>
                    </div>

                    <div class="process-step">
                        <div class="step-number">02</div>
                        <div class="step-content">
                            <span class="step-title">프로젝트별 분석 대상 등록</span>
                            <div class="step-desc">
                                프로젝트 목록 및 권한 관리 메뉴에서 분석 대상을 설정합니다.
                            </div>
                            <div class="step-meta">
                                <strong>담당자:</strong> <span class="badge badge-blue">솔루션본부</span> <span class="badge badge-green">연구부서</span>
                            </div>
                        </div>
                    </div>

                    <div class="process-step">
                        <div class="step-number">03</div>
                        <div class="step-content">
                            <span class="step-title">OPEN AI API KEY 등록</span>
                            <div class="step-desc">
                                API 설정 메뉴에서 Key를 등록합니다.
                            </div>
                            <div class="step-meta">
                                <strong>담당자:</strong> <span class="badge badge-green">연구부서</span>
                            </div>
                        </div>
                    </div>

                    <div class="process-step">
                        <div class="step-number">04</div>
                        <div class="step-content">
                            <span class="step-title">문항목록 분석할 문항 확인</span>
                            <div class="step-desc">
                                분석/제외/문항통합/수정(Lock) 옵션을 선택하여 분석할 문항을 확정합니다.
                            </div>
                            <div class="step-meta">
                                <strong>담당자:</strong> <span class="badge badge-green">연구부서</span> <span class="badge badge-gray">조사지원팀</span>
                            </div>
                        </div>
                    </div>

                    <div class="process-step">
                        <div class="step-number">05</div>
                        <div class="step-content">
                            <span class="step-title">문항별 분석 시작</span>
                            <div class="step-desc">
                                분석할 담당자를 공유하고 분석을 시작합니다.
                            </div>
                            <div class="step-meta">
                                <strong>담당자:</strong> <span class="badge badge-green">연구부서</span> <span class="badge badge-gray">조사지원팀</span>
                            </div>
                        </div>
                    </div>

                    <div class="process-step">
                        <div class="step-number">06</div>
                        <div class="step-content">
                            <span class="step-title">문항별 분석 완료 및 데이터 전달</span>
                            <div class="step-desc">
                                분석 완료 후 솔루션본부 담당자에게 공지하고 진행 사이트 현황을 제시합니다.
                            </div>
                            <div class="step-meta">
                                <strong>담당자:</strong> <span class="badge badge-blue">솔루션본부</span> <span class="badge badge-green">연구부서</span> <span class="badge badge-gray">조사지원팀</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="guide-section">
                <h3>4.4 화면별 가이드</h3>

                <!-- Guide Card 1 -->
                <div class="guide-card">
                    <div class="guide-header">
                        <div class="guide-title">1. 프로젝트 등록</div>
                    </div>
                    <div class="guide-body">
                        <img src="${img1}" class="guide-image" alt="프로젝트 등록 화면">
                        <div class="guide-info">
                            <div class="note-yellow"><strong>조사등록:</strong> 솔루션본부 담당자가 등록 (큐마조사와 연동)</div>
                            <div class="note-green"><strong>신규등록:</strong> 연구부서 담당자가 등록</div>
                        </div>
                    </div>
                </div>

                <!-- Guide Card 2 -->
                <div class="guide-card">
                    <div class="guide-header">
                        <div class="guide-title">2. API 설정</div>
                    </div>
                    <div class="guide-body">
                        <img src="${img2}" class="guide-image" alt="API 설정 화면">
                        <div class="guide-info">
                            <p>Open AI API KEY를 등록합니다. (자동분석 시 유료 API가 실행됩니다)</p>
                        </div>
                    </div>
                </div>

                <!-- Guide Card 3 -->
                <div class="guide-card">
                    <div class="guide-header">
                        <div class="guide-title">3. 권한 관리 (프로젝트별)</div>
                    </div>
                    <div class="guide-body">
                        <img src="${img3}" class="guide-image" alt="권한 관리 화면">
                        <div class="guide-info">
                            <div class="note-yellow"><strong>조사등록:</strong> 솔루션본부 담당자 → 메인 연구원 등록 → 메인 연구원 → 다른 한국리서치 직원 등록</div>
                            <div class="note-green"><strong>신규등록:</strong> 담당 연구원 → 다른 한국리서치 직원 등록</div>
                        </div>
                    </div>
                </div>

                <!-- Guide Card 4 -->
                <div class="guide-card">
                    <div class="guide-header">
                        <div class="guide-title">4. 문항목록 / 문항등록</div>
                    </div>
                    <div class="guide-body">
                        <img src="${img4}" class="guide-image" alt="문항 등록 화면">
                        <div class="guide-info">
                            <div class="note-yellow"><strong>조사등록:</strong> 조사DB데이터 자동 등록 (문자열 응답 모두)</div>
                            <div class="note-green"><strong>신규등록:</strong> 담당 연구원 - 엑셀파일로 문항선택 후 등록</div>
                        </div>
                    </div>
                </div>

                <!-- Guide Card 5 -->
                <div class="guide-card">
                    <div class="guide-header">
                        <div class="guide-title">5. 문항 목록 / 분석보기</div>
                    </div>
                    <div class="guide-body">
                        <div class="guide-info">
                            <ul>
                                <li><strong>분석:</strong> 분석 할 문항만 체크</li>
                                <li><strong>제외:</strong> 분류 안 할 문항 체크</li>
                                <li><strong>분석보기:</strong> 각 문항별 카테고리 자동분류 페이지 이동</li>
                                <li><strong>문항통합저장:</strong> 한번에 분류 할 문항 정의 후 기준으로 일괄 분류</li>
                                <li><strong>수정허용/불가:</strong> 분석 완료 후 수정 불가 설정</li>
                            </ul>
                        </div>
                        <img src="${img5}" class="guide-image" alt="분석 보기 화면">
                    </div>
                </div>

                <!-- Guide Card 6 -->
                <div class="guide-card">
                    <div class="guide-header">
                        <div class="guide-title">6. 분석 / 옵션설정</div>
                    </div>
                    <div class="guide-body">
                        <div class="guide-info">
                            <ul>
                                <li><strong>문항:</strong> 자동 카테고리 분류 기준시 “문항”문구를 지침으로 정의함</li>
                                <li><strong>프롬프트지침:</strong> 정교한 프롬프트 지침에 따른 분류 정의</li>
                                <li><strong>기존:</strong> 최근 5개 이전 “분석” 프롬프트 정의 선택</li>
                                <li><strong>결과언어 선택:</strong> 결과 데이터 언어 선택</li>
                                <li><strong>모델선택:</strong> GPT-4o, GPT-4.1</li>
                                <li><strong>창의성 조절:</strong> 0에 가까울 수록 동일한 분류</li>
                            </ul>
                        </div>
                        <img src="${img6}" class="guide-image" alt="옵션 설정 화면">
                    </div>
                </div>

                <!-- Guide Card 7 -->
                <div class="guide-card">
                    <div class="guide-header">
                        <div class="guide-title">7. 분석 / 번역 및 보기</div>
                    </div>
                    <div class="guide-body">
                        <div class="guide-info">
                            <ul>
                                <li><strong>분석 / 번역:</strong> 옵션 / 결과 언어 선택 기준으로 번역됨</li>
                                <li><strong>분석 / 보기:</strong> 문항과 응답데이터, 프롬프트 정의를 기준으로 보기 데이터 자동 카테고리 분석 / 코드화</li>
                                <li><strong>분석 / 응답자 분석(NEW):</strong> 문항과 보기데이터, 프롬프트 정의를 기준으로 응답 데이터 자동 카테고리 분석 / 코드화</li>
                                <li><strong>분석 / 응답자 빈셀 & 기타:</strong> 응답자 분석 후 빈셀과 기타를 다시 재분류 (필수 2회 자동 구동)</li>
                            </ul>
                        </div>
                        <img src="${img7}" class="guide-image" alt="분석 화면" width="300px">
                    </div>
                </div>

                <!-- Guide Card 8 -->
                <div class="guide-card">
                    <div class="guide-header">
                        <div class="guide-title">8. 분석 데이터 관리</div>
                    </div>
                    <div class="guide-body">
                        <div class="guide-info">
                            <ul>
                                <li><strong>분석 / 응답 데이터:</strong> 보기데이터 기준으로 “응답자분석” 결과 (중복제거)</li>
                                <li><strong>분석 / 보기 데이터:</strong> “보기분석” 결과</li>
                                <li><strong>분석 / Rawdata:</strong> PID별 응답자 데이터 기준 분석 결과</li>
                                <li><strong>엑셀 다운로드/업로드:</strong> 데이터 수정 및 일괄 업데이트</li>
                            </ul>
                        </div>
                        <img src="${img7_3}" class="guide-image" alt="응답 데이터 화면" width="100%">
                        <div style="margin-top: 10px;"></div>
                        <img src="${img7_2}" class="guide-image" alt="보기 데이터 화면" width="100%">
                    </div>
                </div>

                <!-- Guide Card 9 -->
                <div class="guide-card">
                    <div class="guide-header">
                        <div class="guide-title">9. 보기 불러오기</div>
                    </div>
                    <div class="guide-body">
                        <div class="guide-info">
                            <p>다른 조사의 보기항목을 등록하여 새로운 데이터에 자동분류합니다.</p>
                            <ul>
                                <li><strong>엑셀보기 추가시:</strong> 오른쪽 "보기엑셀샘플" → 보기엑셀업로드 → 보기저장</li>
                                <li><strong>기존분석 보기 추가시:</strong> 왼쪽 기존 분석된 프로젝트/문항선택 → 오른쪽 보기 확인 → 보기저장</li>
                            </ul>
                        </div>
                        <img src="${img8}" class="guide-image" alt="보기 불러오기 화면" width="100%">
                    </div>
                </div>

            </div>
        `
    },
    {
        id: "usageadmin",
        title: "5. 응답자 관리",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
        content: `
            <h2>5. 응답자 관리</h2>
            <p>상태 관리 및 AI 성실도 분류 및 관리</p>
        `
    },
    /*
    {
        id: "style_guide",
        title: "6. 스타일 가이드",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5"></circle><circle cx="17.5" cy="10.5" r=".5"></circle><circle cx="8.5" cy="7.5" r=".5"></circle><circle cx="6.5" cy="12.5" r=".5"></circle><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.01 17.461 2 12 2z"></path></svg>`,
        content: `
            <h2>스타일 가이드</h2>
            <p>매뉴얼 작성 시 사용할 수 있는 다양한 스타일 예시입니다.</p>
            
            <h3>1. 강조 박스 (Note) 스타일</h3>
            <p>상황에 맞는 색상을 선택하여 사용하세요. <code>class="note-색상명"</code></p>
            
            <div class="note-orange">기본/주의 (Orange): class="note-orange" (또는 note)</div>
            <div class="note-blue">정보/알림 (Blue): class="note-blue"</div>
            <div class="note-green">성공/완료 (Green): class="note-green"</div>
            <div class="note-red">경고/오류 (Red): class="note-red"</div>
            <div class="note-purple">팁/제안 (Purple): class="note-purple"</div>
            <div class="note-gray">참고/기타 (Gray): class="note-gray"</div>
            <div class="note-teal">Teal: class="note-teal"</div>
            <div class="note-indigo">Indigo: class="note-indigo"</div>
            <div class="note-pink">Pink: class="note-pink"</div>
            <div class="note-yellow">Yellow: class="note-yellow"</div>

            <h3>2. 이미지 스타일</h3>
            
            <h4>Style 1: 심플 보더 (class="img-style-simple")</h4>
            <img src="https://via.placeholder.com/600x200" class="img-style-simple" alt="예시 이미지">
            
            <h4>Style 2: 그림자 효과 (class="img-style-shadow")</h4>
            <img src="https://via.placeholder.com/600x200" class="img-style-shadow" alt="예시 이미지">
            
            <h4>Style 3: 캡션 포함 (class="img-style-caption")</h4>
            <div class="img-style-caption">
                <img src="https://via.placeholder.com/600x200" alt="예시 이미지">
                <div class="img-caption-text">이미지 하단에 설명을 입력할 수 있습니다.</div>
            </div>
        `
    }
    */
];
