
var urls = {
    personalArea: "https://my.yad2.co.il/newOrder/index.php?action=personalAreaIndex"
}

function onErrorPersonalArea(jqXHR, textStatus, errorThrown) {
    console.error("Error while getting personal area. Error:", errorThrown);
    var opaqueRed = [255, 0, 0, 255];
    chrome.browserAction.setBadgeBackgroundColor({color: opaqueRed});
    chrome.browserAction.setBadgeText({text: "!"});
}

function onSuccessfulPersonalArea(data, textStatus, jqXHR) {
    console.info("Successfully got personal area.")
    // Select all div's with class "content-wrapper active"
    var numberOfUpdatableAds = 0;
    $("div[class='content-wrapper active']", data).each(function(index, element) {
        var subCategoryUrl = $(element).parent().attr("href");
        $.ajax(subCategoryUrl, {
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
                                    numberOfUpdatableAds += 1;
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
    });
    chrome.browserAction.setBadgeText({text: numberOfUpdatableAds.toString()});
}

function getBounceEligibleAds() {
    console.info("Getting all ads...")
    $.ajax(urls.personalArea, {
        method: "GET",
        success: onSuccessfulPersonalArea,
        error: onErrorPersonalArea
    });
}

$(function() {
    var fiveMinInterval = 5 * 60 * 1000;
    setInterval(getBounceEligibleAds, fiveMinInterval);
});