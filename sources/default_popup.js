
$(function() {
    var loadingWheel = $("#loadingWheel");
    loadingWheel.hide();
    $("#status").show();
    $("#loginMessage").hide();
    $(document).on({
        ajaxStart: function() { 
            loadingWheel.show();
        },
        ajaxStop: function() { 
            loadingWheel.hide();
        }    
    });
});

$(function() {
    var jqXHR = promoteAllAds();
    jqXHR.done(updateBadge);
});
