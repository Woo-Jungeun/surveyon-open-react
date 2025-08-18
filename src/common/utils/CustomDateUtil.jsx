import dayjs from "dayjs";

/**
 * @funcName : setKendoDatePickerValue
 * @description : kendo datepicker 값을 세팅한다.
 * @param date : date 값 (string or date object)
 * @return :
 * @exception :
 * @date : 2021-05-27 오전 9:37
 * @author : chauki
 * @see
 * @history :
 **/
export const setKendoDatePickerValue = (date) => {
    return date !== undefined && date !== null
        ? (date instanceof Date) ? date : new Date(date)
        : null;
};

/**
 * @funcName : getStringDayWeek
 * @description : 요일 값(0:일,1:월,2:화,3:수,4:목,5:금,6:토)에 해당하는 문자열을 리턴한다.
 * @param day : 요일값
 * @date : 2022-02-09 오후 2:07
 * @author : Yudy
 * @version : 1.0.0
 * @see
 * @history :
 **/
export const getStringDayWeek = (day) => {
    switch (day) {
        case 0:
            return "일";
        case 1:
            return "월";
        case 2:
            return "화";
        case 3:
            return "수";
        case 4:
            return "목";
        case 5:
            return "금";
        case 6:
            return "토";
        default:
            return "";

    }
};

/**
 * @funcName : changeDate
 * @description : 년월일 형태로 리턴
 * @param dateTime : date()_
 * @date : 2022-01-25 오전 10:13
 * @author : khlee
 * @version : 1.0.0
 * @see
 * @history :
 **/
export const changeDate = (dateTime) => {
    const moment = require('moment');

    const publish_date = moment(dateTime).format('YYYY년 MM월 DD일')
    return publish_date
};

/**
 * @funcName : convrtToDay
 * @description : yyyyMMdd 형태로 변환
 * @date : 2024-02-07 오후 15:13
 * @author : yj
 * @version : 1.0.0
 * @see
 * @history :
 * @param string
 **/
export const convrtToDay = (string = new Date(), {parse="-", time=false, timeparse=":"}) => {

    let year = string.getFullYear();
    let month = ('0' + (string.getMonth() + 1)).slice(-2);
    let day = ('0' + string.getDate()).slice(-2);
    let hours = ('0' + string.getHours()).slice(-2);
    let minutes = ('0' + string.getMinutes()).slice(-2);
    let seconds = ('0' + string.getSeconds()).slice(-2);

    if(time){
        return year + parse + month + parse + day + hours + timeparse + minutes + timeparse + seconds;
    } else {
        return year + parse + month + parse + day;
    }
};