$(document).ready(function(){

    // navi
    $('.nav > li').click(function(){
        $(this).toggleClass('on');
        $('.topWrap, .navBg').toggleClass('on');
    });

    // tabmenu
    $(function(){
        $('.tabcontent_1 > div, .tabcontent_2 > div').hide();
        $('.tabnav_1 a').click(function () {
            $('.tabcontent_1 > div').hide().filter(this.hash).fadeIn();
            $('.tabnav_1 a').removeClass('on');
            $(this).addClass('on');
            return false;
        }).filter(':eq(0)').click();
        $('.tabnav_2 a').click(function () {
            $('.tabcontent_2 > div').hide().filter(this.hash).fadeIn();
            $('.tabnav_2 a').removeClass('on');
            $(this).addClass('on');
            return false;
        }).filter(':eq(0)').click();
    });

    $('.subContWarp .subContTit .iconOpen').click(function(){
        $(this).toggleClass('on');
        $(this).parents('.subContWarp').toggleClass('on');
    })

    $('.leftMenuWrap .btnLeftMeun').click(function(){
        $(this).parents('.leftMenuWrap').toggleClass('on');
        $('.leftMenuWrap .btnLeftMeun > span').html('목록보기');
        $('.leftMenuWrap.on .btnLeftMeun > span').html('목록접기');
    })

    $('.rightMenuWrap .btnRightMeun').click(function(){
        $(this).parents('.rightMenuWrap').toggleClass('on');
    })

    $('.mapBtnWrap .openBtnWrap .iconOpen02').click(function(){
        $(this).toggleClass('on');
        $(this).parents('.mapBtnWrap').toggleClass('on');
    });

    $('.popOpen').click(function(){
        $('.popOpenOn').toggleClass('on');
       
    });

    $('.modal .btnClose').click(function(){
        $(this).parents('.modal').toggleClass('on');
    });

    // $('.bookmarkList.depth01 > li').click(function(){
    //     $(this).toggleClass('on')
    // });

    $('.iconToggle').click(function() {
        $(this).toggleClass('on');    
        $(this).siblings('ul').toggle();

         //$('.mainInfo .dep_01 .dep_02').not($(this).siblings('.mainInfo .dep_01 .dep_02')).hide();
    });

    // infoBoxWrap
    $('.iptBtn').click(function(){
        $(this).toggleClass('on');
        $(this).siblings('.infoBoxWrap').toggle();

    })

    //mapinfoPop
    $('.mapinfoPop .iconCloseBK').click(function(){
        $(this).parents('.mapinfoPop').toggleClass('on');
    })

});


    