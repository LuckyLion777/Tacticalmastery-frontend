/**
 * Created by flynn on 21/07/17.
 */

var request = require('request');
var queryString = require('query-string');
var config = require('./config'); // get the configuration file

/*
* I created this function because I got tired of how much space the API requests were taking up
* in terms of code size. The calls were able to be reduced into the a single function that does the calls using
* the back-end API's formatting.
*
* method must be a method type allowed by the `request` package
*
* options is an object that includes the following
*
* auth: the Bearer token that must be included in the header to complete the request
* body: the data that will be sent. Should be a javascript object, but will pass the string if a raw string is sent
* endpoint: the directory of the remote API that is getting called `i.e /order /lead`
*
* onSuccess: function <- called when the request contains no errors |:| has the JSON.parsed body as the first parameter
* and the apiResponse as the second
*
*
* onError: function <- called when either the request is errored or the API returns an error  |:| has the JSON.parsed
* body as first parameter, and response as the second
*
* */

function API_request(method, options){
    // method

    var apiOptions = {
        uri: config.API_URL + options.endpoint,
        'headers': {
            'Authorization': options.auth,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        method: method,
        body: (typeof options.body !== "string") ? queryString.stringify(options.body) : options.body
    };

    request(apiOptions, (apiError, apiResponse, apiBody) =>{
        var wasError = false;

        if (!apiError && apiResponse.statusCode == 200) {

            var apiResObj = JSON.parse(apiBody);

            if (typeof apiResObj.error === "undefined"){
                // there were no errors from the back-end API
                console.log(`API: request to endpoint "${ options.endpoint }" returned with no registered errors`);
                options.onSuccess(apiBody, apiResponse)
            } else {
                console.log(`API: remote ERROR at endpoint "${ options.endpoint }" recognized`);
                console.log(`API (${ apiResObj.referrer || 'UNKNOWN' }): ${apiResObj.error}`)

                wasError = true; // something broke
            }
        } else {
            wasError = true; // something went wrong
        }

        if (wasError){
            console.log('API: error response initiated');
            options.onError(apiBody, apiResponse);
        }

        // console.log(apiBody)
    });
}

/*
* I also created function that helps with creating Bearer tokens for the application
* It has the following arguments
*
* onSuccess: passes the generated Bearer token as a string
* onFailure: passes the authReponse from the authorization server
*
* */

function API_authorize(options){

    var authOptions = {
        uri: config.AUTH_URL,
        method: 'POST',
        json: {
            'client_id': config.CLIENT_ID,
            'client_secret': config.CLIENT_SECRET,
            'grant_type': 'client_credentials',
            'audience': 'https://api.tacticalmastery.com'
        }
    };

    console.log('AUTH: sending authentication request');
    request(authOptions, (authError, authResponse, authBody) =>{
        if (!authError && authResponse.statusCode == 200) {

            console.log('AUTH: authentication response received');
            console.log(`AUTH: response is type {${ typeof authBody }}` );

            if (typeof authBody === "object" && typeof authBody.access_token === "string"){
                console.log('AUTH: token is valid string <- setting session id');

                // there is a relevant string in the response, set it to the session token
                // req.session.authorization = "Bearer " + authBody.access_token; // set the session id

                options.onSuccess('Bearer ' + authBody.access_token); // return the newly generated token
            } else {
                console.log('AUTH: token validation failed');
                options.onFailure(authBody)
            }
        }
    });
}

module.exports = {
    request: API_request,
    getBearerToken: API_authorize
}; // export the functions