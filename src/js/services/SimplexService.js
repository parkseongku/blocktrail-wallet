angular.module('blocktrail.wallet').factory(
    'simplexService',
    function(CONFIG, $log, $q, walletsManagerService, $cordovaDialogs, $translate,
             $http, $timeout, $ionicLoading, settingsService, launchService, $rootScope, trackingService) {
        var clientId;
        var returnuri = "btccomwallet://glideraCallback/oauth2";
        var GLIDERA_URL = CONFIG.GLIDERA_URL;
        var GLIDERA_HOST = GLIDERA_URL.replace(/https?:\/\//, '');

        // var GLIDERA_ERRORS = {
        //     INVALID_ACCESS_TOKEN: 2001,
        //     ACCESS_TOKEN_REVOKED: 2002
        // };

        var encodeOpenURI = function(uri) {
            return uri.replace('#', '%23');
        };

        // var createRequest = function(options, accessToken, twoFactor) {
        //     options = options || {};
        //     var headers = {};
        //     if (accessToken) {
        //         headers['Authorization'] = 'Bearer ' + accessToken;
        //     }
        //     if (twoFactor) {
        //         headers['X-2FA-CODE'] = twoFactor;
        //     }
        //
        //     options = _.defaults({}, (options || {}), {
        //         https: true,
        //         host: GLIDERA_HOST,
        //         endpoint: '/api/v1',
        //         params: {
        //             platform: 'web'
        //         },
        //         headers: _.defaults({}, (options.headers || {}), headers),
        //         contentMd5: false
        //     });
        //
        //     return new blocktrailSDK.Request(options);
        // };
        var handleOauthCallback = function(glideraCallback) {
            if (!glideraCallback) {
                return $q.reject(new Error("no glideraCallback"));
            }

            return $q.when(glideraCallback)
                .then(function(glideraCallback) {
                    var qs = parseQuery(glideraCallback);

                    $log.debug('qs? ', JSON.stringify(qs, null, 4));

                    if (!qs.code) {
                        throw new Error(qs.error_message.replace("+", " "));
                    }

                    var activeWallet = walletsManagerService.getActiveWallet();
                    var sdk = activeWallet.getSdkWallet().sdk;

                    return sdk.glideraOauth(qs.code, returnuri)
                        .then(function(result) {
                            $log.debug('oauthtoken', JSON.stringify(result, null, 4));
                            trackingService.trackEvent(trackingService.EVENTS.BUYBTC.GLIDERA_SETUP_DONE);

                            var accessToken = result.access_token;
                            var glideraAccessToken = {
                                scope: result.scope
                            };

                            return settingsService.$isLoaded().then(function() {
                                return $cordovaDialogs.prompt(
                                    $translate.instant('MSG_BUYBTC_PIN_TO_ENCRYPT').sentenceCase(),
                                    $translate.instant('MSG_ENTER_PIN').sentenceCase(),
                                    [$translate.instant('OK'), $translate.instant('CANCEL').sentenceCase()],
                                    "",
                                    true,   //isPassword
                                    "tel"   //input type (uses html5 style)
                                );
                            })
                                .then(function(dialogResult) {
                                    if (dialogResult.buttonIndex == 2) {
                                        return $q.reject('CANCELLED');
                                    }
                                    //decrypt password with the provided PIN
                                    $ionicLoading.show({
                                        template: "<div>{{ 'WORKING' | translate }}...</div><ion-spinner></ion-spinner>",
                                        hideOnStateChange: true
                                    });

                                    return activeWallet.unlock(dialogResult.input1).then(function(wallet) {
                                        var secretBuf = wallet.secret;
                                        if (wallet.walletVersion === 'v2') {
                                            secretBuf = new blocktrailSDK.Buffer(secretBuf, 'hex');
                                        }
                                        var accessTokenBuf = new blocktrailSDK.Buffer(accessToken, 'utf8');
                                        glideraAccessToken.encryptedAccessToken = blocktrailSDK.Encryption.encrypt(
                                            accessTokenBuf, secretBuf, blocktrailSDK.KeyDerivation.subkeyIterations
                                        ).toString('base64');
                                    })
                                })
                                .then(function() {
                                    setDecryptedAccessToken(accessToken);
                                    settingsService.glideraAccessToken = glideraAccessToken;

                                    return settingsService.$store().then(function() {
                                        $log.debug('SAVED');
                                        return settingsService.$syncSettingsUp();
                                    })
                                        .then(function() {
                                            updateAllTransactions();
                                        })
                                        ;
                                })
                                .then(function() {
                                    $ionicLoading.hide();
                                }, function(err) {
                                    $ionicLoading.hide();
                                    throw err;
                                });
                        });
                })
                .then(function(result) { return result }, function(err) { $log.log(err); throw err; })
                ;
        };

        var userCanTransact = function() {
        };

        var buyPrices = function(qty, fiat) {

            var activeWallet = walletsManagerService.getActiveWallet();
            var sdk = activeWallet.getSdkWallet().sdk;

            if (!fiat) {// TODO: handle this better - in settings
                fiat = 'USD'
            }

            return sdk.simplexBuyPrices(qty, fiat)
                .then(function(response) {
                    console.log('buyPrices ' + JSON.stringify(response));
                    response.total = response.fiat_money.total_amount;
                    response.fees = response.fiat_money.total_amount - response.fiat_money.base_amount;

                    return response;
                });
        };

        var issuePaymentRequest = function (simplexData) {
            var activeWallet = walletsManagerService.getActiveWallet();
            var sdk = activeWallet.getSdkWallet().sdk;

            activeWallet.getNewAddress().then(function (address) {
                var postData = {
                    qty: simplexData.digital_money.amount,
                    fiat: simplexData.fiat_money.currency,
                    address: address,
                    quote_id: simplexData.quote_id,
                    platform: 'mobile'
                };

                return sdk.simplexPaymentRequest(postData)
            });

        };

        var buy = function(qty, priceUuid) {
            var activeWallet = walletsManagerService.getActiveWallet();

            return userCanTransact().then(function(userCanTransact) {
                if (!userCanTransact) {
                    throw new Error("User can't transact!");
                }

                return accessToken().then(function(accessToken) {
                    return activeWallet.getNewAddress().then(function (address) {
                        return twoFactor().then(function (twoFactor) {
                            var r = createRequest(null, accessToken, twoFactor);
                            $log.debug('buy', JSON.stringify({
                                destinationAddress: address,
                                qty: qty,
                                priceUuid: priceUuid,
                                useCurrentPrice: false
                            }, null, 4));
                            return r.request('POST', '/buy', {}, {
                                destinationAddress: address,
                                qty: qty,
                                priceUuid: priceUuid,
                                useCurrentPrice: false
                            })
                                .then(function (result) {
                                    $log.debug('buy', JSON.stringify(result, null, 4));

                                    var gTx = {
                                        address: address,
                                        time: Math.floor((new Date()).getTime() / 1000),
                                        transactionUuid: result.transactionUuid,
                                        transactionHash: result.transactionHash || null,
                                        status: result.status,
                                        qty: result.qty,
                                        price: result.price,
                                        total: result.total,
                                        currency: result.currency,
                                        estimatedDeliveryDate: Math.floor(Date.parse(result.estimatedDeliveryDate) / 1000),
                                        walletIdentifier: activeWallet.getReadOnlyWalletData().identifier
                                    };

                                    console.log(gTx);

                                    settingsService.glideraTransactions.push(gTx);

                                    return settingsService.$store().then(function () {
                                        console.log('d1');
                                        return settingsService.$syncSettingsUp().then(function () {
                                            console.log('d2');
                                            updatePendingTransactions();
                                            console.log('d3');

                                            return result;
                                        });
                                    });
                                });
                        });
                    });
                });
            });
        };

        var setClientId = function(_clientId) {
            clientId = _clientId;
        };

        return {
            setClientId: setClientId,
            issuePaymentRequest: issuePaymentRequest,
            handleOauthCallback: handleOauthCallback,
            userCanTransact: userCanTransact,
            buyPrices: buyPrices,
            buy: buy
        };
    }
);
