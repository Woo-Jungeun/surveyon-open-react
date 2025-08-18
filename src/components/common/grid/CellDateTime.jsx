const CellDateTime = (props) => {
    const {cellProps} = props;
    try{
        const { dataItem, field } = cellProps; 
        if(dataItem?.[field]){
            const [date, time] = dataItem[field].split(' ');
            return (<td>{date}<br/>{time}</td>)
        }
        return (<td></td>);
    }catch(e){
        return (<td></td>);
    }
}
export default CellDateTime;