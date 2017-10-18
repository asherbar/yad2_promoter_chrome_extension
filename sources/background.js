
$(function() {
    // Run once, then every interval
    updateBadge();
    var oneHourInterval = 60 * 60 * 1000;
    setInterval(updateBadge, oneHourInterval);
});
