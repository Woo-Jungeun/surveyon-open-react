import React from 'react';
import ConditionBuilderPopup from './ConditionBuilderPopup';

const AdditionalAnalysisFilterPopup = (props) => {
    return <ConditionBuilderPopup {...props} hideSidebar={true} theme="blue" saveMode="callback" initialLogic={props.initialLogic} initialInfo={props.initialInfo} />;
};

export default AdditionalAnalysisFilterPopup;
