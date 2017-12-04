(function() {
    "use strict";

    angular.module("blocktrail.wallet")
        .controller("BuyBTCChooseRegionCtrl", BuyBTCChooseRegionCtrl);

    function BuyBTCChooseRegionCtrl($scope) {
        $scope.usSelected = false;

        $scope.selectUS = function() {
            $scope.usSelected = true;
        };

        $scope.buyBTC = function () {

            // redirectWithData('POST', "https://buy.btc.com", {
            //     version: 2,
            //     payment_flow_type: "one_step_digital_currency_purchase", // wallet?
            //     // we either store this (redis) or generate on the fly, think it is not mandatory
            //     //            "quote_id" => $data["quote_id"],
            //     //            "payment_id" => (new Random())->token(32),
            //     user_id: "4234343",
            //     email: "testemaildev@btc.com",
            //     destination_wallet: {
            //         address: "1F1tAaz5x1HUXrCNLbtMDqcw6o5GNn4xqX", // < -- TODO get wallet from user
            //         currency: "XBT",
            //     },
            //     // With a price_quote, this would be unnecessary?
            //     fiat_total_amount: {
            //         amount: 2,
            //         currency: "USD", // EUR ?
            //     },
            //     digital_total_amount: {
            //         amount: 2,
            //         currency: "",
            //     },
            // }, '_system');

            var w = window.open('https://buy.btc.com/foward-me-plx?asjdaskda=asd=as=da=sd=as=dasd', '_system');
        };
    }
})();
