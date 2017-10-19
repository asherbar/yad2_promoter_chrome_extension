
// To promote POST the following:
// https://my.yad2.co.il/newOrder/index.php?action=updateBounceListing&CatID={{CATEGORY}}&SubCatID={{SUBCATEGORY}}&OrderID={{ORDER_ID}}

var urls = {
    personalArea: "https://my.yad2.co.il/newOrder/index.php?action=personalAreaIndex",
    promoteOrder: "https://my.yad2.co.il/newOrder/index.php?action=updateBounceListing&",
    login: "https://my.yad2.co.il/login.php"
}

var states = {
    error: "ERROR",
    upToDate: "UP_TO_DATE",
    outOfDate: "OUT_OF_DATE"
}

function onErrorPersonalArea(jqXHR, textStatus, errorThrown) {
    console.error("Error while getting personal area. Error:", errorThrown, "Switching to login request...");
    updateAppearance(states.error);
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
    var numberOfPersonalInformationClasses = $("div[class='personalInformation']", data).length;
    if (numberOfPersonalInformationClasses > 0) {
        console.info("Successfully got personal area.");
        // Select all div's with class "content-wrapper active"
        $("div[class='content-wrapper active']", data).each(function(index, element) {
            promoteOrdersFromSubCategory($(element).parent().attr("href"));
        });
    }
    else {
        console.info("It seems login is required");
        onErrorPersonalArea({errorThrown: "Login Required"});
    }
}

function promoteAllAds() {
    console.info("Trying to promote all ads...")
    return $.ajax(urls.personalArea, {
        method: "GET",
        success: onSuccessfulPersonalAreaForPromotingAds,
        error: onErrorPersonalArea
    });
}

function onSuccessfulPersonalAreaForPromotableAds(data, textStatus, jqXHR) {
    var numberOfPersonalInformationClasses = $("div[class='personalInformation']", data).length;
    if (numberOfPersonalInformationClasses === 0) {
        console.info("It seems login is required");
        onErrorPersonalArea({errorThrown: "Login Required"});
        return;
    }
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
        if (numberOfPromotableAds > 0) {
            updateAppearance(states.outOfDate, numberOfPromotableAds);
        }
        else {
            updateAppearance(states.upToDate);
        }
    });
}

function updateAppearance(state, numberOfPromotableAds) {
    var badgeText;
    var tooltipText;
    var badgeBackgroundColor;
    var lightGreen = [50, 205, 50, 205];
    var opaqueRed = [255, 0, 0, 255];
    switch (state) {
        case states.error:
            $("#status").hide();
            $("#loginMessage").show();
            badgeBackgroundColor = opaqueRed;
            badgeText = "!";
            tooltipText = "Click to login";
            break;
        case states.outOfDate:
            if (typeof numberOfPromotableAds === "undefined") {
                console.error("Expected to get numberOfPromotableAds. Recalling function with", states.error);
                updateAppearance(states.error);
                return;
            }
            badgeBackgroundColor = lightGreen;
            badgeText = numberOfPromotableAds.toString();
            tooltipText = "Click to promote " + numberOfPromotableAds + (numberOfPromotableAds === 1 ? " ad" : " ads");
            break;
        case states.upToDate:
            $("#status").text("Done!");
            badgeBackgroundColor = lightGreen;
            badgeText = "\u2713";
            tooltipText = "All ads are up to date";
            break;
        default:
            console.error("Recived unexpected state:", state, "Recalling function with", states.error);
            updateAppearance(state.error);
            return;
    }
    chrome.browserAction.setBadgeBackgroundColor({color: badgeBackgroundColor});
    chrome.browserAction.setBadgeText({text: badgeText});
    chrome.browserAction.setTitle({title: tooltipText});
}

function updateBadge() {
    console.info("Getting all ads...");
    $.ajax(urls.personalArea, {
        method: "GET",
        success: onSuccessfulPersonalAreaForPromotableAds,
        error: onErrorPersonalArea
    });
}
