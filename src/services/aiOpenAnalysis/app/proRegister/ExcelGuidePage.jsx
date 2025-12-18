import { getExcelGuideHTML } from './ExcelGuideHTML';
import { useEffect } from 'react';

const ExcelGuidePage = () => {
    useEffect(() => {
        document.title = "엑셀 작성 가이드";
        document.body.innerHTML = getExcelGuideHTML();
    }, []);

    return null;
};

export default ExcelGuidePage;
