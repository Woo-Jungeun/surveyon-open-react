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
import img1_1 from '@/assets/images/manual/1_1.png';
import img1_2 from '@/assets/images/manual/1_2.png';
import img2 from '@/assets/images/manual/2.png';
import img2_1 from '@/assets/images/manual/2_1.png';
import img3 from '@/assets/images/manual/3.png';
import img4 from '@/assets/images/manual/4.png';
import img4_1 from '@/assets/images/manual/4_1.png';
import img4_2 from '@/assets/images/manual/4_2.png';
import img5 from '@/assets/images/manual/5.png';
import img6 from '@/assets/images/manual/6.png';
import img7 from '@/assets/images/manual/7.png';
import img7_1 from '@/assets/images/manual/7_1.png';
import img7_2 from '@/assets/images/manual/7_2.png';
import img8 from '@/assets/images/manual/8.png';

export const manualData = [
    {
        id: "intro",
        title: "0. 메인페이지",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
        content: `
            <h2>0. 메인페이지</h2>
            <p>설문온 전체 소개, 홍보, 기능별 업데이트 공지</p>
            <p>기대 효과: 설문온 기능 홍보 및 기능 업데이트 실시간 공지 파악 가능</p>
        `
    },
    {
        id: "survey",
        title: "1. 설문 관리",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M9 14h6"></path><path d="M9 10h6"></path><path d="M9 18h6"></path></svg>`,
        content: `
            <h2>1. 설문 관리</h2>
            <p>설문제작 UI, 표준안없이 자동 변환, 라이브러리 유형화 제작 구현</p>
        `
    },
    {
        id: "dataadmin",
        title: "2. 데이터 현황",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`,
        content: `
            <h2>2. 데이터 현황</h2>
            <p>문항별 결과에 대한 AI 분석 보고, 표, 시각화 및 요약 제공</p>
            
        `
    },
    {
        id: "usage",
        title: "3. 데이터 관리",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s 9-1.34 9-3V5"></path></svg>`,
        content: `
            <h2>3. 데이터 관리</h2>
            <p>데이터 맵 관리, 출력 및 수정<br>AI 데이터 생성 [테스트] – 자동 응답 및 기본 로직 체크</p>
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
                        <li><strong>정교한 카테고리 분류:</strong> 정성 분류 (프롬프트 명령 정의를 통해 카테고리 분류 가능)</li>
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
                                <button class="btn-detail" data-detail="detail_process_1">상세 보기</button>
                                
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
                                 <button class="btn-detail" data-detail="detail_process_2">상세 보기</button>
                            </div>
                        </div>
                    </div>

                    <div class="process-step">
                        <div class="step-number">03</div>
                        <div class="step-content">
                            <span class="step-title">문항목록 분석할 문항 확인</span>
                            <div class="step-desc">
                                분석/제외/문항통합/수정(Lock) 옵션을 선택하여 분석할 문항을 확정합니다.
                            </div>
                            <div class="step-meta">
                                <strong>담당자:</strong> <span class="badge badge-green">연구부서</span> <span class="badge badge-gray">오픈팀</span>
                                <button class="btn-detail" data-detail="detail_process_4">상세 보기</button>
                            </div>
                        </div>
                    </div>

                    <div class="process-step">
                        <div class="step-number">04</div>
                        <div class="step-content">
                            <span class="step-title">문항별 분석 시작</span>
                            <div class="step-desc">
                                분석할 담당자를 공유하고 분석을 시작합니다.
                            </div>
                            <div class="step-meta">
                                <strong>담당자:</strong> <span class="badge badge-green">연구부서</span> <span class="badge badge-gray">오픈팀</span>
                                <button class="btn-detail" data-detail="detail_process_5">상세 보기</button>
                            </div>
                        </div>
                    </div>
                    <div class="process-step">
                        <div class="step-number">05</div>
                        <div class="step-content">
                            <span class="step-title">분석 데이터 관리</span>
                            <div class="step-desc">
                                자동 분석된 결과 데이터 및 편집 가능한 페이지 영역입니다.
                            </div>
                            <div class="step-meta">
                                <strong>담당자:</strong> <span class="badge badge-green">연구부서</span> <span class="badge badge-gray">오픈팀</span>
                                <button class="btn-detail" data-detail="detail_process_6">상세 보기</button>
                            </div>
                        </div>
                    </div>
                    <div class="process-step">
                        <div class="step-number">06</div>
                        <div class="step-content">
                            <span class="step-title">문항별 분석 완료 및 데이터 전달</span>
                            <div class="step-desc">
                               분석 완료 후 솔루션본부 담당자에게 공지하며, 진행 사이트에서 문항별 현황을 제시합니다.
                            </div>
                            <div class="step-meta">
                                <strong>담당자:</strong> <span class="badge badge-blue">솔루션본부</span> <span class="badge badge-green">연구부서</span> <span class="badge badge-gray">오픈팀</span>
                                
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        `,
        detail_1: `
            <h3>옵션 설정 상세 가이드</h3>
            <div class="guide-section">
                <p>옵션 설정은 AI 분석의 정확도를 결정하는 중요한 단계입니다. 각 항목별 상세 설명은 다음과 같습니다.</p>
                
                <div class="note-purple">
                    <h4>1. 프롬프트 지침 (Prompt Instructions)</h4>
                    <p>AI에게 구체적인 분류 기준을 제시합니다. 예시를 포함하면 정확도가 향상됩니다.</p>
                    <pre style="background:#f1f5f9; padding:10px; border-radius:4px; font-size:0.9em;">예시: "긍정적인 반응은 'Positive', 부정적인 반응은 'Negative'로 분류해줘. 중립적이거나 모호한 답변은 'Neutral'로 분류해."</pre>
                </div>

                <div class="note-blue">
                    <h4>2. 모델 선택 (Model Selection)</h4>
                    <ul>
                        <li><strong>GPT-4o:</strong> 가장 높은 성능과 추론 능력을 제공합니다. 복잡한 분류에 적합합니다.</li>
                        <li><strong>GPT-4.1:</strong> 속도와 성능의 균형이 잡힌 모델입니다. 일반적인 대량 데이터 처리에 효율적입니다.</li>
                    </ul>
                </div>

                <div class="note-gray">
                    <h4>3. 창의성 조절 (Temperature)</h4>
                    <p>0.0~1.0 사이의 값을 설정합니다.</p>
                    <ul>
                        <li><strong>0.0 (권장):</strong> 가장 일관된 결과를 반환합니다. 정해진 카테고리 분류에 적합합니다.</li>
                        <li><strong>0.5 이상:</strong> 다양한 표현을 허용하지만, 분류의 일관성이 떨어질 수 있습니다.</li>
                    </ul>
                </div>
            </div>
        `,
        detail_process_1: `
            <h3>프로젝트 등록 상세 가이드</h3>
            <div class="guide-section">
                <p>프로젝트 등록은 분석의 시작점입니다. 각 등록 유형별 상세 절차는 다음과 같습니다.</p>
                <img src="${img1}" class="guide-image" alt="프로젝트 등록 화면">
                     
                <div class="note-yellow">
                    <h4>1. 조사 등록 (솔루션본부)</h4>
                    <p>큐마조사 시스템(웹조사)와 연동하여 프로젝트를 생성합니다.</p>
                    
                
                    <ul>
                        <li><strong>대상:</strong> 큐마 시스템에 등록된 조사 - "담당자" 지정된 대상만 등록 허용</li>
                        <li><strong>방법:</strong> '조사DB' 버튼 클릭 > 해당프로젝트 선택 > 등록 자동</li>
                        <li><strong>특징:</strong> 큐마조사의 문항 및 보기 데이터가 자동으로 연동됩니다.</li>
                        <img src="${img1_1}" class="guide-image" alt="프로젝트 등록 화면">
                    </ul>
                    
                </div>

                <div class="note-green">
                    <h4>2. 신규 등록 (연구부서)</h4>
                    <p>큐마에 없는 새로운 조사를 등록할 때 사용합니다.</p>
                    <ul>
                        <li><strong>대상:</strong> 엑셀 파일 기반의 조사 데이터</li>
                        <li><strong>방법:</strong> '신규등록' 버튼 클릭 > POF (없을경우 2025-00-0000 맞춰) 입력 / 조사명 입력 > '등록하기' 버튼 클릭</li>
                        <li><strong>참고:</strong> 문항과 데이터는 "문항목록" > "문항추가"에서 엑셀로 직접 업로드해야 합니다.</li>
                        <img src="${img1_2}" class="guide-image" alt="프로젝트 등록 화면" width="50%">
                    </ul>
                </div>
            </div>
        `,
        detail_process_2: `
            <h3>프로젝트 분석 대상 등록 상세 가이드</h3>
            <div class="guide-section">
                <p>프로젝트별 분석 대상을 등록하는 페이지 입니다. </p>
                <img src="${img3}" class="guide-image" alt="권한 관리 화면">
                     
                <div class="note-yellow">
                      <ul>
                        <li><strong>조사등록:</strong> 솔루션본부 담당자 → 메인 연구원 등록 → 메인 연구원 → 다른 한국리서치 직원 등록</li>
                        <li><strong>신규등록:</strong> 메인 연구원 → 다른 한국리서치 직원 등록</li>
                    </ul>
                </div>
            </div>
        `,
        // detail_process_3: `
        //     <h3>OPENAI API KEY 등록 상세 가이드</h3>
        //     <div class="guide-section">
        //         <p>API KEY는 OPENAI에서 발급받은 키를 입력합니다. (자동분석 시 유료 API가 실행됩니다.)</p>


        //         <div class="note-yellow">
        //               <ul>
        //                 <li><strong>유형선택:</strong> 개인키(개인법인카드등록된키),부서공용키(부서에서 관리하고 있는 키),회사공용키(경영지원에서 관리하고 있는 키)  </li>
        //                 <img src="${img2}" class="guide-image" alt="API KEY 등록 화면"  >
        //             </ul>
        //         </div>
        //         <div class="note-green">
        //               <ul>
        //                 <li><strong>API KEY 목록 > 기본사용설정(필수):</strong>키 등록 후  "기본사용설정" 에 해당되는 키를 필수 선택해야 APIKEY가 설정됩니다. </li>
        //                 <img src="${img2_1}" class="guide-image" alt="API KEY 등록 화면" width="100%">
        //             </ul>
        //         </div>
        //     </div>
        // `,
        detail_process_3: `
            <h3>문항목록 > 문항 등록, 문항옵션 상세 가이드</h3>
            <div class="guide-section">
                <p>문항목록에서 "조사등록"에서 자동 등록된 문항 제시 및 "신규등록"에서 "문항추가" 엑셀로 직접 업로드한 문항 목록 페이지 </p>
                <img src="${img4}" class="guide-image" alt="문항등록 화면">
                 <h3>문항등록</h3>        
                <div class="note-yellow">
                      <ul>
                        <li><strong>DB:</strong> 조사DB 데이터 자동 등록 (문자열 응답 문항 모두 자동 등록)  <br>- 데이터맵기준으로 (진행/완료) 추가된 응답자 데이터, (추가문항) 자동 등록
                        <br>1. 등록된 맵 기준의 오픈 문항 확인하기
                        <br>2. 등록하기 버튼 클릭</li>
                        <img src="${img4_1}" class="guide-image" alt="문항 등록 화면">
                        
                        <li><strong>Excel:</strong> "문항추가" 엑셀로 직접 업로드한 문항 목록 페이지 
                        <br>1. 엑셀파일 작성 가이드 포맷으로 구성된 응답자 데이터 엑셀저장
                        <br>2. 엑셀파일 업로드
                        <br>3. 아이디컬럼 확인 (파일 첫번째열을 자동가져옴 = 응답자 유니크한 id )
                        <br>4. 문항선택하기 버튼 클릭 > 분석할 문항 멀티 선택
                        <br>5. 등록하기 버튼 클릭
                        </li>
                        <img src="${img4_2}" class="guide-image" alt="신규등록 화면">
                        
                    </ul>
                </div>
                <h3>문항 목록 상세 옵션 가이드</h3>
                <div class="note-green">
                    <ul>
                                <li><strong>분석:</strong> 분석 할 문항만 체크</li>
                                <li><strong>제외:</strong> 분류 안 할 문항 체크</li>
                                <li><strong>분석보기:</strong> 각 문항별 카테고리 자동분류 페이지 이동</li>
                                <li><strong>문항통합저장:</strong> 한번에 분류할 문항 정의 후 기준으로 일괄 분류</li>
                                <li><strong>수정허용/불가:</strong> 분석 완료 후 수정 불가 설정</li>
                                <img src="${img5}" class="guide-image" alt="분석 보기 화면">
                     </ul>
                </div>
            </div>
        `,
        detail_process_4: `
            <h3>문항별 분석 시작 상세 가이드</h3>
            <div class="guide-section">
                <p>문항 질문 + 응답자 데이터 기준으로 보기 분석, 응답자 분석을 수행하는 페이지 입니다.</p>
                     
                <div class="note-yellow">
                      <ul>
                        <li><strong>1. 문항:</strong> 자동 카테고리 분류 기준시 “문항”문구를 지침으로 정의함</li>
                        <li><strong>2. 프롬프트지침:</strong> 정교한 프롬프트 지침에 따른 분류 정의</li>
                        <li><strong>3. 기존:</strong> 최근 5개 이전 “분석” 프롬프트정의 선택</li>
                        <li><strong>4. 결과언어 선택:</strong> 결과 데이터 언어 선택</li>
                        <li><strong>5. 모델선택:</strong> GPT-4o, GPT-4.1</li>
                        <li><strong>6. 창의성 조절:</strong>분석때 마다 새로운 카테고리 정의의 정도를 조절하는 값 (0에 가까울수록 동일한 분류)</li>
                        <li><strong>7. 소분류 개수:</strong> 소분류 개수 범위 지정 (예) 0~50</li>
                        <li><strong>8. 중분류 개수:</strong> 중분류 개수 범위 지정 (예) 5~10</li>
                        <li><strong>9. 대분류 개수:</strong> 대분류 개수 범위 지정 (예) 1~5</li>
                        <img src="${img6}" class="guide-image" alt="문항별 분석 화면">
                
                    </ul>
                </div>
                <div class="note-green">
                    <ul>
                        <li><strong>분석 / 번역:</strong> 옵션 > 결과 언어 선택  기준으로 번역됨</li>
                        <li><strong>분석 / 보기:</strong> 문항+응답데이터+프롬프트 정의를 기준으로 "보기 데이터" 자동 카테고리 분석 / 코드화</li>
                        <li><strong>분석 / 응답자 분석(NEW):</strong> 문항+보기데이터+프롬프트 정의를 기준으로 "응답 데이터" 자동 카테고리 분석 / 코드화</li>
                        <li><strong>분석 / 응답자 빈셀 & 기타:</strong> 응답자 분석 후 응답데이터 기준으로 빈셀과 기타를 다시 재분류 (필수 2회 자동 구동)</li>
                        <img src="${img7}" class="guide-image" alt="문항별 분석 화면" width="50%">
                    </ul>
                </div>  
            </div>
        `,
        detail_process_5: `
            <div class="guide-section">
                <h3>분석데이터/엑셀</h3>    
                <div class="note-yellow">
                      <ul>
                      <li><strong>분석 / 응답 데이터:</strong> 보기데이터 기준으로 “응답자 분석” 결과 (중복제거)</li>
                        <li><strong>분석 / 보기 데이터:</strong> “보기 분석” 결과</li>
                        <li><strong>분석 / Rawdata:</strong> PID별 응답자 데이터 기준 분석 결과</li>
                        <li><strong>분석 / 1단계 :</strong> 1단계:소분류, 2단계:중분류, 3단계:대분류 > 변경 후 저장버튼 필수 </li>
                        <li><strong>엑셀 다운로드:</strong> 1번째 시트(응답데이터 중복제거), 2번째 시트(보기데이터), 3번째 시트(응답자별세로멀티), 4번째 시트(응답자별 가로 멀티sav포맷 & 멀티콤마머지)</li>
                        <li><strong>엑셀 업로드:</strong> 다운로드 엑셀 파일 기준으로 1,2번째 시트를 수정 > 업로드 > 일괄 업데이트 적용됨 </li>
                        <li><strong>보기불러오기:</strong> 하단 참고</li>
                        <img src="${img7_1}" class="guide-image" alt="데이터 관리 화면" width="100%">  
                        </ul>
                </div>  
                <h3>보기 불러오기</h3>
                <div class="note-yellow">
                <p>다른 조사의 보기항목을 등록하여 새로운 데이터에 자동분류합니다.</p>
                      <ul>
                        <li><strong>엑셀보기 추가시:</strong> 오른쪽 "보기엑셀샘플" -> 보기엑셀업로드 -> 보기저장</li>
                        <li><strong>기존분석 보기 추가시:</strong> 왼쪽 기존 분석된 프로젝트/문항선택 -> 오른쪽 보기 확인 -> 보기저장</li>
                        <img src="${img8}" class="guide-image" alt="데이터 관리 화면" width="100%">
                    </ul>
                </div>
                <h3>응답자 데이터 수정 방법</h3>
                <div class="note-green">
                      <ul>
                        <li><strong>1. 소분류 코드 수정:</strong> 수정하고자 하는 데이터행 선택 (마우스로 여러개 선택 가능)</li>
                        <li><strong>2. 보기데이터 보기 버튼:</strong> show/hide로 보기데이터를 같이 확인가능</li>
                        <li><strong>3. 보기데이터 보기 탭 고정 버튼:</strong> show 고정으로 항상 맨위에 제시되도록 고정</li>
                        <li><strong>4. 클릭한 보기데이터로 수정:</strong> (1)에서 선택한 데이터 기준으로 보기코드를 클릭하면 일괄 코드가 수정</li>
                        <li><strong>5. 응답데이터 페이징:</strong> 페이지당 500개의 응답데이터를 제시 및 수정 가능</li>
                        <img src="${img7_2}" class="guide-image" alt="데이터 관리 화면" width="100%">
                    </ul>
                </div>
            </div>
        `,
        detail_process_6: `
            <h3>프로젝트 분석 대상 등록 상세 가이드</h3>
            <div class="guide-section">
                <p>프로젝트별 분석 대상을 등록하는 페이지 입니다. </p>
                <img src="${img3}" class="guide-image" alt="권한 관리 화면">
                     
                <div class="note-yellow">
                      <ul>
                        <li><strong>조사등록:</strong> 솔루션본부 담당자 → 메인 연구원 등록 → 메인 연구원 → 다른 한국리서치 직원 등록</li>
                        <li><strong>신규등록:</strong> 메인 연구원 → 다른 한국리서치 직원 등록</li>
                    </ul>
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
    }
    // ,
    // {
    //     id: "style_guide",
    //     title: "6. 스타일 가이드",
    //     icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5"></circle><circle cx="17.5" cy="10.5" r=".5"></circle><circle cx="8.5" cy="7.5" r=".5"></circle><circle cx="6.5" cy="12.5" r=".5"></circle><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.01 17.461 2 12 2z"></path></svg>`,
    //     content: `
    //         <h2>스타일 가이드</h2>
    //         <p>매뉴얼 작성 시 사용할 수 있는 다양한 스타일 예시입니다.</p>

    //         <h3>1. 강조 박스 (Note) 스타일</h3>
    //         <p>상황에 맞는 색상을 선택하여 사용하세요. <code>class="note-색상명"</code></p>

    //         <div class="note-orange">기본/주의 (Orange): class="note-orange" (또는 note)</div>
    //         <div class="note-blue">정보/알림 (Blue): class="note-blue"</div>
    //         <div class="note-green">성공/완료 (Green): class="note-green"</div>
    //         <div class="note-red">경고/오류 (Red): class="note-red"</div>
    //         <div class="note-purple">팁/제안 (Purple): class="note-purple"</div>
    //         <div class="note-gray">참고/기타 (Gray): class="note-gray"</div>
    //         <div class="note-teal">Teal: class="note-teal"</div>
    //         <div class="note-indigo">Indigo: class="note-indigo"</div>
    //         <div class="note-pink">Pink: class="note-pink"</div>
    //         <div class="note-yellow">Yellow: class="note-yellow"</div>

    //         <h3>2. 이미지 스타일</h3>

    //         <h4>Style 1: 심플 보더 (class="img-style-simple")</h4>
    //         <img src="https://via.placeholder.com/600x200" class="img-style-simple" alt="예시 이미지">

    //         <h4>Style 2: 그림자 효과 (class="img-style-shadow")</h4>
    //         <img src="https://via.placeholder.com/600x200" class="img-style-shadow" alt="예시 이미지">

    //         <h4>Style 3: 캡션 포함 (class="img-style-caption")</h4>
    //         <div class="img-style-caption">
    //             <img src="https://via.placeholder.com/600x200" alt="예시 이미지">
    //             <div class="img-caption-text">이미지 하단에 설명을 입력할 수 있습니다.</div>
    //         </div>
    //     `
    // }
];
