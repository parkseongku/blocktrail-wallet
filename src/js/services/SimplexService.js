angular.module('blocktrail.wallet').factory(
    'simplexService',
    function(CONFIG, $log, $q, walletsManagerService, launchService) {
        var clientId;

        var userCanTransact = function() {
        };

        var generateUUID = function() {
            function s4() {
                return Math.floor((1 + Math.random()) * 0x10000)
                    .toString(16)
                    .substring(1);
            }
            return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
                s4() + '-' + s4() + s4() + s4();
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

            var postData = {
                qty: simplexData.digital_money.amount,
                fiat: simplexData.fiat_money.currency,
                address: simplexData.address,
                quote_id: simplexData.quote_id,
                payment_id: simplexData.payment_id,
                platform: 'mobile'
            };

            return sdk.simplexPaymentRequest(postData)
        };

        var initRedirect = function (simplexData) {
            var activeWallet = walletsManagerService.getActiveWallet();
            var sdk = activeWallet.getSdkWallet().sdk;

            console.log(simplexData);

            return launchService.getAccountInfo().then(function (accountInfo) {
                var data = {
                    address: simplexData.address,
                    identifier: simplexData.identifier,
                    qty: simplexData.digital_money.amount,
                    fiat: simplexData.fiat_money.total_amount,
                    fiat_type: simplexData.fiat_money.currency,
                    quote_id: simplexData.quote_id,
                    payment_id: simplexData.payment_id,
                    api_key: accountInfo.api_key,
                    platform: 'mobile'
                };

                var queryString = Object.keys(data)
                    .map(function (k) {
                        return encodeURIComponent(k) + '=' + encodeURIComponent(data[k])
                    })
                    .join('&');

                // TODO: This can be network agnostic, as BUY BTC is only for BTC anyways
                window.open('http://' + CONFIG.API_HOST + '/v1/BTC/mywallet/simplex/payment/forward?' + queryString, '_system')
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
            generateUUID: generateUUID,
            userCanTransact: userCanTransact,
        };
    }
);
