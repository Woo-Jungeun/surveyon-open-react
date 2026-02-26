const fs = require('fs');
const content = fs.readFileSync('src/services/dataStatus/app/menuBar/MenuBar.jsx', 'utf8');

const modified = content
    .replace(/\/data_status/g, '/data_management')
    .replace(/theme="blue"/g, 'theme="green"')
    .replace(/"데이터 현황"/g, '"데이터 관리"');

fs.mkdirSync('src/services/dataManagement/app/menuBar', { recursive: true });
fs.writeFileSync('src/services/dataManagement/app/menuBar/MenuBar.jsx', modified);
console.log("MenuBar copied!");
