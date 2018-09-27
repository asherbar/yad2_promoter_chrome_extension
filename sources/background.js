
$(function() {
    // Run once, then every interval
    updateBadge();
    var fiveMinutesInterval = 5 * 60 * 1000;
    setInterval(updateBadge, fiveMinutesInterval);
});
