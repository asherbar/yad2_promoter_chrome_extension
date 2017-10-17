// login to yad2 POST the following:/ > ~/Downloads/wrong_pass.html -v
// curl 'https://my.yad2.co.il/newOrder/index.php?action=connect' --data 'UserName={{EMAIL}}&password={{PASSWORD}}'
// login is successfull if the status is 301 ("Moved Permanently"), and unsuccessful if status is 200

// To promote POST the following:
// https://my.yad2.co.il/newOrder/index.php?action=updateBounceListing&CatID={{CATEGORY}}&SubCatID={{SUBCATEGORY}}&OrderID={{ORDER_ID}}

var urls = {
    login: "https://my.yad2.co.il/newOrder/index.php?action=connect",
    personalArea: "https://my.yad2.co.il/newOrder/index.php?action=personalAreaIndex",
    promoteOrder: "https://my.yad2.co.il/newOrder/index.php?action=updateBounceListing&"
}

var ids = {
    popupStatus: "#status"
}

function loginSuccess(jqXHR, textStatus, errorThrown) {

}

function loginFailure(data, textStatus, jqXHR) {

}

function onErrorPersonalArea(jqXHR, textStatus, errorThrown) {
    console.info("Error while getting personal area. Switching to login form...")
}

function getUrlParam(url, param){
	var results = new RegExp('[\?&]' + param + '=([^&#]*)').exec(url);
	return results[1] || 0;
}

function createPromoteSuccessFunction(orderNum) {
    return function(data) {
        console.info("Successfully promoted order:", orderNum);        
    };
}

// Gets a URL of the structure https://my.yad2.co.il/newOrder/index.php?action=personalAreaFeed&CatID=3&SubCatID=0
function promoteOrdersFromSubCategory(subCategoryUrl) {
    var catId = getUrlParam(subCategoryUrl, "CatID");
    var subCatId = getUrlParam(subCategoryUrl, "SubCatID");
    console.info("Bouncing orders in category", catId, "Subcategory", subCatId);
    $.ajax(subCategoryUrl, {
        method: "GET",
        dataType: "html",
        success: function(data, textStatus, jqXHR) {
            var ordersTable = $("#feed", data);
            $("tr", ordersTable).each(function(index, element){
                var orderNum = $(element).attr("data-orderid");
                if (typeof orderNum !== typeof undefined && orderNum !== false) {
                    var queryParams = {CatID: catId, SubCatID: subCatId, OrderID: orderNum};
                    var targetUrl = urls.promoteOrder + $.param(queryParams);
                    $.ajax(targetUrl, {
                        method: "POST",
                        data: queryParams,
                        crossDomain: false,
                        success: createPromoteSuccessFunction(orderNum),
                        error: console.error("Error while bouncing order:", orderNum)
                    });
                }
            });
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.error("Unable to get orders from", subCategoryUrl, "Error:", errorThrown);
        }
    });
}

function onSuccessfulPersonalArea(data, textStatus, jqXHR) {
    console.info("Successfully got personal area.")
    // Select all div's with class "content-wrapper active"
    $("div[class='content-wrapper active']", data).each(function(index, element) {
        promoteOrdersFromSubCategory($(element).parent().attr("href"));
    });
}

function login(userName, password) {
    $.ajax(urls.login, {
        method: "POST",
        data: {UserName: userName, password: password},
        crossDomain: true,
        statusCode: {
            // 200 is actually returned on wrong credentials
            200: loginFailure,
            // 301 (redirection) is actually returned on correct credentials
            301: loginSuccess
        }
     });
}

function promoteAllAds() {
    console.info("Trying to promote all ads...")
    $.ajax(urls.personalArea, {
        method: "GET",
        success: onSuccessfulPersonalArea,
        error: onErrorPersonalArea
    });
}

$(function() {
    promoteAllAds();
});

