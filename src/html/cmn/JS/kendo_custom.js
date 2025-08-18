$("select").kendoDropDownList();

//kendoDropdownList
$("input[type='text'], input[type='password']").kendoMaskedTextBox();

//kendoDatePicker
$("#datepicker,.cal input[type='text']").kendoDatePicker({    
    //culture: "ko-KR",	// 달력 표시 언어

    // defines the start view
    start: "year",

    // defines when the calendar should return date
    depth: "date",

    // display month and year in the input

    format: "yyyy-MM-dd",

    // specifies that DateInput is used for masking the input element
    dateInput: true,
    value: new Date(),
    
});

$(".year input[type='text']").kendoDatePicker({
    // defines the start view
    start: "year",

    // defines when the calendar should return date
    depth: "year",

    // display month and year in the input

    format: "yyyy",

    // specifies that DateInput is used for masking the input element
    dateInput: true,

});

$("button").kendoButton({
    themeColor: "primary"
});
$("section>ul>li>button, p.schResult>a, button.ib").kendoButton({
    themeColor: "info"
});
$("button.iv").kendoButton({
    themeColor: "inverse"
});

$(".files").kendoUpload();

$(document).ready(function() {
    $("#editor").kendoEditor();
});

$("#upload01").on('change',function(){
    var fileName = $("#upload01").val();
    $(".file-name").val(fileName);
});

$(".datetimepicker").kendoDateTimePicker({
    culture: "ko-KR",
    value: new Date(),
    dateInput: true,
    format : "yyyy-MM-dd  hh:mm tt",
    interval : 60,
    //componentType:"modern"
});

$("#radiogroup").kendoRadioGroup({
    items: ["사용", "미사용"],
    layout: "horizontal",
    labelPosition: "after",
    value: "visible"
}).data("kendoRadioGroup");

$("textarea").kendoTextArea();

//$(document).ready(createChart);
// $(document).bind("kendo:skinChange", createChart);
// $("input[type='checkbox']").kendoCheckBox();


