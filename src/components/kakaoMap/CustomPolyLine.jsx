import { Polyline } from "react-kakao-maps-sdk";

/**
 * strokeStyle: 라인 style
 * strokeWe: 라인 두께
 * */
const CustomPolyLine = ({busStopMarkerList, strokeStyle="solid", strokeWe=4}) => {
    // let objectLength = Object.values(busStopMarkerList).flatMap(({ busStop, color }) => color !== "#ffffffff" ? busStop.map(item => ({ ...item, color })) : [])

    let tObj = Object.values(busStopMarkerList)
    if(tObj.length > 0){
        return tObj.map(({ busStop, color}, idx)=>{
                if(color !== "#ffffffff" && busStop?.length > 0){
                    if(busStop[0].vertexes){
                        return busStop?.map((item, index) => {
                            const path = item?.vertexes?.map(({ ycoordinate, xcoordinate }) => {
                                if(ycoordinate && xcoordinate){
                                    return(
                                        {
                                            lat: ycoordinate,
                                            lng: xcoordinate,
                                        }
                                    )
                                }
                            }) || []

                            return (
                                <Polyline
                                    key={`cpl${index}`}
                                    path={path}
                                    strokeWeight={strokeWe || 4}
                                    strokeColor={color}
                                    strokeOpacity={1}
                                    strokeStyle={strokeStyle}
                                />
                            )
                        })
                    }else{
                        return busStop?.map((item , index) => {
                            const path = busStop?.map(({ ycoordinate, xcoordinate }) => {
                                if(ycoordinate && xcoordinate){
                                    return(
                                        {
                                            lat: ycoordinate,
                                            lng: xcoordinate,
                                        }
                                    )
                                }
                            })

                            return (
                                <Polyline
                                    key={`cpll${index}`}
                                    path={path}
                                    strokeWeight={strokeWe || 4}
                                    strokeColor={color}
                                    strokeOpacity={1}
                                    strokeStyle={strokeStyle}
                                />
                            )
                        })
                    }
                }
        })
    }
    // if (objectLength.length > 0) {
    //     return objectLength.map(({ vertexes, color, strokeWeight }, index) => {
    //         const path = vertexes.map(({ ycoordinate, xcoordinate }) => ({
    //             lat: ycoordinate,
    //             lng: xcoordinate,
    //         }));
    //         return (
    //             <Polyline
    //                 key={index}
    //                 path={path}
    //                 strokeWeight={strokeWeight || 4}
    //                 strokeColor={color}
    //                 strokeOpacity={1}
    //                 strokeStyle={"solid"}
    //             />
    //         );
    //     });
    // }
}


export default CustomPolyLine;