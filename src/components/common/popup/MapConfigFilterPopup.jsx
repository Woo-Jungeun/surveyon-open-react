import React from 'react';
import ConditionBuilderPopup from './ConditionBuilderPopup';
import './MapConfigFilterPopup.css';

const MapConfigFilterPopup = (props) => {
    return <ConditionBuilderPopup {...props} hideSidebar={true} theme="green" saveMode="callback" initialLogic={props.initialLogic} initialInfo={props.initialInfo} />;
};

export default MapConfigFilterPopup;
