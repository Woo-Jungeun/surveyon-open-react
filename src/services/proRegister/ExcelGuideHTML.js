export const getExcelGuideHTML = () => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>엑셀 작성 가이드</title>
  <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css" />
  <style>
    @import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css");

    /* 모든 요소에 폰트 강제 적용 */
    body, div, p, span, h1, h2, h3, h4, h5, h6, table, thead, tbody, tfoot, tr, th, td, ul, li, a, button, input, select, textarea {
      font-family: 'Pretendard', 'Malgun Gothic', sans-serif !important;
    }

    body {
      min-width: 900px !important;
      padding: 25px;
      background: #f5f5f5;
      margin: 0;
    }
    
    .container {
      max-width: 850px;
      margin: 0 auto;
      background: #fff;
      padding: 10px 20px !important;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
    
    h2 {
      font-size: 24px;
      font-weight: 700;
      color: #ff8024;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .section {
      margin-bottom: 32px;
    }
    
    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: #ff8024;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .rules {
      background: #fff;
      border-radius: 8px;
      padding: 20px;
      font-size: 14px;
      line-height: 1.8;
      color: #333;
      border: 1px solid #e0e0e0;
    }
    
    .rule {
      margin-bottom: 12px;
    }
    
    .rule strong {
      color: #ff8024;
      font-weight: 600;
    }
    
    .warning {
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 6px;
      padding: 12px;
      margin-top: 16px;
    }
    
    .warning strong {
      color: #856404;
      font-weight: 600;
    }
    
    .highlight {
      color: #d32f2f;
      font-weight: 700;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      background: #fff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    /* 테이블 헤더 첫 번째 줄 (th) */
    thead th {
      background: linear-gradient(135deg, #ff8024 0%, #ff6b00 100%);
      color: #fff;
      padding: 12px;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
    }
    
    thead th.guide-col {
      background: #ffe8d6;
      color: #ff6b00;
    }
    
    thead th .note {
      font-size: 11px;
      color: #ffe082;
      margin-top: 4px;
      font-weight: normal;
    }

    /* 테이블 헤더 두 번째 줄 (td) - 여기가 문제였던 부분 */
    thead tr:nth-child(2) td {
      font-family: 'Pretendard', 'Malgun Gothic', sans-serif !important;
      font-weight: 600;
      color: #333;
      padding: 10px;
      font-size: 13px;
      border-bottom: 1px solid #e0e0e0;
      background-color: #fff;
    }

    thead tr:nth-child(2) td.guide-col {
      background: #ffe8d6;
      font-size: 12px;
      color: #666;
    }
    
    /* 본문 데이터 */
    tbody tr td {
      padding: 10px;
      font-size: 13px;
      border-bottom: 1px solid #e0e0e0;
      color: #333;
    }
    
    tbody tr:nth-child(even) {
      background: #fafafa;
    }
    
    tbody tr:nth-child(odd) {
      background: #fff;
    }
    
    tbody td:last-child {
      background: #f5f5f5;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>📋 엑셀 파일 작성 가이드</h2>
    
    <div class="section">
      <div class="section-title">💡 엑셀 파일 작성 규칙</div>
      <div class="rules">
        <div class="rule">
          <strong>1행:</strong> 문항 정의 (예: 문1. 지역, 문2. 이유, 문3. 문제점)
        </div>
        <div class="rule">
          <strong>2행:</strong> 컬럼명 정의 - 공백 없음, 중복 불가 (예: q10, q20_op1, 문3)
        </div>
        <div class="rule">
          <strong>3행 이후:</strong> 실제 응답 데이터
        </div>
        <div class="warning">
          <strong>⚠️ 중요:</strong> 응답자 ID는 <span class="highlight">중복 불가</span> - ID 중복 시 새로운 ID로 추가 필요
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">📊 샘플 데이터 예시</div>
      <table>
        <thead>
          <tr>
            <th>
              응답자 ID
              <div class="note">(중복불가)</div>
            </th>
            <th>문1. 지역</th>
            <th>문2. 이유</th>
            <th>문3. 문제점</th>
            <th class="guide-col">← 문항정의(질문)</th>
          </tr>
          <tr>
            <td>id</td>
            <td>q10</td>
            <td>q20_op1</td>
            <td>문3</td>
            <td class="guide-col">← 컬럼명정의(공백,중복불가)</td>
          </tr>
        </thead>
        <tbody>
          <tr><td>1112</td><td>1</td><td>이유내용1</td><td>문제점서술1</td><td></td></tr>
          <tr><td>1113</td><td>2</td><td>이유내용2</td><td>문제점서술2</td><td></td></tr>
          <tr><td>1114</td><td>1</td><td>이유내용3</td><td>문제점서술3</td><td></td></tr>
          <tr><td>1115</td><td>2</td><td>이유내용4</td><td>문제점서술4</td><td></td></tr>
          <tr><td>1116</td><td>2</td><td>이유내용5</td><td>문제점서술5</td><td></td></tr>
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>
`;
