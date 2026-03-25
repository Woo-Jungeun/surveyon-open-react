import React from 'react';

// 그리드 셀 컴포넌트에서 상태를 공유하기 위한 Context (unmount 루프 방지 목적)
export const MapManagementContext = React.createContext(null);

// 자릿수 자동 계산 (순수 함수)
export const NUMERIC_FIELDS = ['valLen', 'valCnt', 'startPos', 'totalLen'];

export const recalcVariables = (vars, updateRanking = false) => {
    let nextStart = null;
    return vars.map((v, index) => {
        const valLen = Number(v.valLen) || 0;
        const valCnt = Number(v.valCnt) || 0;
        const ranking = updateRanking ? index + 1 : v.ranking; // drag&drop 시에만 ranking 변경

        // 총자릿수 = 보기자릿수 × 보기갯수
        const totalLen = valLen * valCnt;

        // 시작자릿수: 첫 행은 기존 값 유지, 이후 행은 이전 행 기준 자동 계산
        const startPos = (index === 0 || nextStart === null)
            ? (Number(v.startPos) || 1)
            : nextStart;

        nextStart = startPos + totalLen;

        // 값이 바뀐 행만 새 객체 반환 (불필요한 리렌더 최소화)
        if (v.totalLen === totalLen && v.startPos === startPos && v.ranking === ranking) return v;
        return { ...v, totalLen, startPos, ranking };
    });
};

// 수정 감지 대상 필드 목록
export const EDITABLE_FIELDS = [
    'label', 'logic', 'decimal', 'spssName', 'type', 'memo',
    'multiValChange', 'minQuestions', 'excludeOpenMerge',
    'verificationVar', 'excludeOutput', 'startPos', 'valLen',
    'valCnt', 'totalLen', 'etcOpen', 'category', 'ranking', 'isBaked'
];
