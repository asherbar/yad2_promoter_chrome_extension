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

function loginSuccess(jqXHR, textStatus, errorThrown) {
    console.info("Login success");
    promoteAllAds();
}

function loginFailure(data, textStatus, jqXHR) {
    console.info("Login failure");
}

function onErrorPersonalAreaForPromotingAds(jqXHR, textStatus, errorThrown) {
    console.info("Error while getting personal area. Switching to login form...");
}

function getUrlParam(url, param) {
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
    console.info("Promoting orders in category", catId, "Subcategory", subCatId);
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
                        error: function() {
                            console.error("Error while promoting order:", orderNum);
                        } 
                    });
                }
            });
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.error("Unable to get orders from", subCategoryUrl, "Error:", errorThrown);
        }
    });
}

function onSuccessfulPersonalAreaForPromotingAds(data, textStatus, jqXHR) {
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
        success: onSuccessfulPersonalAreaForPromotingAds,
        error: onErrorPersonalAreaForPromotingAds
    });
}

function onErrorPersonalAreaForPromotableAds(jqXHR, textStatus, errorThrown) {
    console.error("Error while getting personal area. Error:", errorThrown);
    var opaqueRed = [255, 0, 0, 255];
    chrome.browserAction.setBadgeBackgroundColor({color: opaqueRed});
    chrome.browserAction.setBadgeText({text: "!"});
}

function onSuccessfulPersonalAreaForPromotableAds(data, textStatus, jqXHR) {
    console.info("Successfully got personal area.")
    // Select all div's with class "content-wrapper active"
    var numberOfPromotableAds = 0;
    var ajaxCalls = [];
    $("div[class='content-wrapper active']", data).each(function(index, element) {
        var subCategoryUrl = $(element).parent().attr("href");
        var ajaxCall = $.ajax(subCategoryUrl, {
            method: "GET",
            dataType: "html",
            success: function(data, textStatus, jqXHR) {
                var ordersTable = $("#feed", data);
                $("tr", ordersTable).each(function(index, element) {
                    if ($(element).hasClass("item")) {
                        var tableRowLength = ('td', element).length;
                        if (tableRowLength < 7) {
                            console.error("Expected at least 7 columns in row. Instead have:", tableRowLength);
                        }
                        else {
                            var itemDate = $("td:nth-child(7)", element).text();
                            var itemTime = $("td:nth-child(6)", element).text();
                            var dateParts = itemDate.split('/');
                            var timeParts = itemTime.split(':');
                            if (dateParts.length !== 3) {
                                console.error("Error while trying to parse date:", itemDate);
                            }
                            else if (timeParts.length !== 2) {
                                console.error("Error while trying to parse time:", itemTime);
                            }
                            else {
                                var itemDateObj = new Date(dateParts[2], dateParts[1]-1, dateParts[0], timeParts[0], timeParts[1]);
                                var itemMoment = moment.tz(itemDateObj, "Asia/Jerusalem");
                                var currentDateObj = new Date();
                                var currentMoment = moment();
                                var duration = moment.duration(currentMoment.diff(itemMoment));
                                if (duration.asHours() >= 4) {
                                    numberOfPromotableAds += 1;
                                }
                            }
                        }
                    }
                });
            },
            error: function(jqXHR, textStatus, errorThrown) {
                console.error("Unable to get orders from", subCategoryUrl, "Error:", errorThrown);
            }
        });
        ajaxCalls.push(ajaxCall);
    });

    $.when.apply($, ajaxCalls).then(function () {
        console.info("Done checking all ads. Found", numberOfPromotableAds, "of ads to promote");
        var badgeText = "\u2713";
        if (numberOfPromotableAds > 0) {
            badgeText = numberOfPromotableAds.toString();
        }
        chrome.browserAction.setBadgeText({text: badgeText});
    });
}

function updateBadge() {
    console.info("Getting all ads...")
    $.ajax(urls.personalArea, {
        method: "GET",
        success: onSuccessfulPersonalAreaForPromotableAds,
        error: onErrorPersonalAreaForPromotableAds
    });
}
