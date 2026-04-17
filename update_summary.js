const fs = require('fs');
const path = require('path');

const srcFile = path.resolve('src/services/dataStatus/app/hsrt/dpRequest/steps/DpRequestBannerStep.jsx');
const destFile = path.resolve('src/services/dataStatus/app/hsrt/dpRequest/steps/DpRequestSummaryStep.jsx');

let code = fs.readFileSync(srcFile, 'utf8');

// 1. Rename Component and Contexts
code = code.replace(/DpRequestBannerStep/g, 'DpRequestSummaryStep');
code = code.replace(/BannerActionFooter/g, 'SummaryActionFooter');
code = code.replace(/onCreateBanner/g, 'onCreateSummary');

// 2. Rename states and variables
code = code.replace(/selectedBanner/g, 'selectedSummary');
code = code.replace(/setSelectedBanner/g, 'setSelectedSummary');
code = code.replace(/banners/g, 'summaries');
code = code.replace(/setBanners/g, 'setSummaries');
code = code.replace(/bannerSearch/g, 'summarySearch');
code = code.replace(/setBannerSearch/g, 'setSummarySearch');
code = code.replace(/isBannerSidebarOpen/g, 'isSummarySidebarOpen');
code = code.replace(/setIsBannerSidebarOpen/g, 'setIsSummarySidebarOpen');
code = code.replace(/deletedBannerIds/g, 'deletedSummaryIds');
code = code.replace(/setDeletedBannerIds/g, 'setDeletedSummaryIds');
code = code.replace(/originalBannerIds/g, 'originalSummaryIds');
code = code.replace(/setOriginalBannerIds/g, 'setOriginalSummaryIds');
code = code.replace(/dp-banner/g, 'dp-summary');
code = code.replace(/handleSaveBanner/g, 'handleSaveSummary');
code = code.replace(/fetchBannerData/g, 'fetchSummaryData');
code = code.replace(/handleCreateBanner/g, 'handleCreateSummary');
code = code.replace(/handleDeleteBanner/g, 'handleDeleteSummary');
code = code.replace(/updateBannerInfo/g, 'updateSummaryInfo');
code = code.replace(/filteredBanners/g, 'filteredSummaries');

// 3. Korean wording changes
code = code.replace(/배너/g, '요약표');
code = code.replace(/Banner/g, 'Summary');
code = code.replace(/banner/g, 'summary');


// 4. Fix API imports and add mock
code = code.replace(
    /const \{ getBannerDetail, getBaseVariableList, generateBanner, saveBannerDetail \} = DpRequestPageApi\(\);/,
    `const { getBaseVariableList } = DpRequestPageApi();

    // Mock APIs for Summary
    const getSummaryDetail = {
        mutateAsync: async () => ({ success: '777', resultjson: { base_variables: [], recoded_variables: [] } })
    };
    const generateSummary = {
        mutateAsync: async () => ({ success: '777' })
    };
    const saveSummaryDetail = {
        mutateAsync: async () => ({ success: '777' })
    };`
);

fs.writeFileSync(destFile, code);
