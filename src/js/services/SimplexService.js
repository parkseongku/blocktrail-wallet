angular.module('blocktrail.wallet').factory(
    'simplexService',
    function(CONFIG, $log, $q, walletsManagerService, launchService) {
        var clientId;

        var userCanTransact = function() {
        };

        var buyPrices = function(qty, fiat) {

            var activeWallet = walletsManagerService.getActiveWallet();
            var sdk = activeWallet.getSdkWallet().sdk;

            if (!fiat) {// TODO: handle this better - in settings after refactor
                fiat = 'USD'
            }

            return sdk.simplexBuyPrices(qty, fiat)
                .then(function(response) {
                    // console.log('buyPrices ' + JSON.stringify(response));
                    response.total = response.fiat_money.total_amount;
                    response.fees = response.fiat_money.total_amount - response.fiat_money.base_amount;

                    return response;
                });
        };

        var issuePaymentRequest = function (simplexData) {
            var activeWallet = walletsManagerService.getActiveWallet();
            var sdk = activeWallet.getSdkWallet().sdk;

            console.log(simplexData);

            var postData = {
                qty: simplexData.digital_money.amount,
                fiat: simplexData.fiat_money.currency,
                address: "18XQmTws49pjUDjEBYs48kBJ3WHZw3w3AF",
                quote_id: simplexData.quote_id,
                platform: 'mobile'
            };

            //TODO save address in settings

            return sdk.simplexPaymentRequest(postData)
        };

        var initRedirect = function (simplexData) {
            var activeWallet = walletsManagerService.getActiveWallet();
            var sdk = activeWallet.getSdkWallet().sdk;

            console.log(simplexData);

            return launchService.getAccountInfo().then(function (accountInfo) {
                return activeWallet.getNewAddress().then(function (address) {
                    var data = {
                        address: address,
                        qty: simplexData.digital_money.amount,
                        fiat: simplexData.fiat_money.amount,
                        quote_id: simplexData.quote_id,
                        platform: 'mobile',
                        fiat_type: simplexData.fiat_money.currency,
                        api_key: accountInfo.api_key
                    };

                    var queryString = Object.keys(data)
                        .map(function (k) {
                            return encodeURIComponent(k) + '=' + encodeURIComponent(data[k])
                        })
                        .join('&');

                    // return sdk.simplexRedirect(data)
                    window.open('http://' + CONFIG.API_HOST + '/v1/tBTC/mywallet/simplex/payment/forward?' + queryString, '_system')
                });
            });
        };

        var buy = function(paymentRequest) {
            // Post them to blocktrail forward addr

        };

        var setClientId = function(_clientId) {
            clientId = _clientId;
        };

        return {
            setClientId: setClientId,
            buyPrices: buyPrices,
            issuePaymentRequest: issuePaymentRequest,
            initRedirect: initRedirect,
            userCanTransact: userCanTransact,
        };
    }
);
