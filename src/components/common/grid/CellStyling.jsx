const CellStyling = (props) => {
    const {cellProps, style} = props;
    try{
        const { dataItem, field } = cellProps;
        if(dataItem?.[field]){
            return (<td style={style}>{dataItem[field]}</td>)
        }
        return (<td></td>);
    }catch(e){
        return (<td></td>);
    }
}
export default CellStyling;