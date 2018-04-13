/**
 * Created by flynn on 23/07/17.
 */

/* API wrapper for making calls to the front-end server
**
*
*   method: {string} -> MUST MATCH a value inside of `validMethods`
*
*   Below are the valid `options` parameters:
*
    *   endpoint: {string} contianing the requested endpoint. MUST MATCH a value inside of `verifiedEndpoints`
    *
    *   data: {object} to be sent to the API server
    *
    *   onSuccess: {function} to be called when the request returns with no errors
    *       will return the JSON object that the sever responded with
    *
    *   onSuccess: {function} to be called when the request returns with errors
    *      will return the apiRequest object (XMLHttpRequest) that was resulted as the server
    *      if the server API also threw an error, the second callback param will be the JSON object that the API sent back
    *
    *   fadeAnimate: {boolean} enables or disables the large fade out animation (false by default)
    *
    *   loadingBodyClass: {boolean} forced className `loading` to be added to the body when loading (normally
    *       disabled when animations are disabled. Is false by default (unless animation is enabled)
    *       IS OVERRIDDEN TO `true` IF ANIMATIONS ARE PRESENT!
    *
    *   errorElement: {HTMLElement} the element that the errors will be output to (user viewable)
    *
    *   errorBodyClass: {string} || {boolean} the class name added to (or removed) from the Body classlist when an error
    *       occors. If the option is a boolean, the className will be 'error', if false it will not add an class at all
    *
*
*
* */

(function(window, document){

    // array containing valid endpoints. Any other endpoint requested will be rejected
    var verifiedEndpoints = ['/', '/checkout/', '/checkout/zipcode/', '/checkout/autofill/','/checkout/promo/', '/checkout/receipt/'],
        validMethods = ['POST', 'PUT', 'GET']; // verified http methods allowed for requests

    var bodyClass = document.body.classList; // reference to body classlist

    // endpoint, JSONdata, onSuccess, onFailure
    function _API_request(method, options) {

        if (typeof options !== "object" || options === {}){
            // there are no options or the param is invalid
            console.error('API: invalid options parameter.');
            return false; // kill it with fire!!! -> flag the reponse
        }

        // setup default values
        method = (typeof method === "string") ? method.trim().toUpperCase() : '_METHOD_UNDEFINED_';

        options.endpoint = (typeof options.endpoint === "string") ? options.endpoint.trim() : '_ENDPOINT_UNDEFINED_';

        options.data = (typeof options.data === "object") ? options.data : {};

        options.onSuccess = (typeof options.onSuccess === "function") ? options.onSuccess : function(){};
        options.onFailure = (typeof options.onFailure === "function") ? options.onFailure : function(){};

        options.fadeAnimate = (typeof options.fadeAnimate === "boolean") ? options.fadeAnimate : false;

        options.loadingBodyClass = (typeof options.loadingBodyClass === "boolean")
            ? (options.fadeAnimate || options.loadingBodyClass) // is overridden if animations are enabled
            : (options.fadeAnimate || false); // also gets overridden if animations are enabled

        // add optional HTML display element if the input object is also an HTML element
        options.errorElement = (options.errorElement instanceof HTMLElement) ? options.errorElement : null;

        switch (typeof options.errorBodyClass){
            case "boolean":
                // the input option is boolean - add class on error if true
                options.errorBodyClass = (options.errorBodyClass == true) ? 'error' : '';
                break;
            case "string":
                options.errorBodyClass = (options.errorBodyClass) ? options.errorBodyClass : ''
                break;
            default:
                // default option if neither boolean or string
                options.errorBodyClass = '';
        }


        if (validMethods.indexOf(method) > -1) {
            // the method is valid, so begin checking the requested endpoint

            if (verifiedEndpoints.indexOf(options.endpoint) > -1 || verifiedEndpoints.indexOf(options.endpoint + '/') > -1) {
                // the endpoint is verified -> begin checking the data

                if (typeof options.data === "object" && options.data !== {}) {
                    // the data being passed is valid so prepare a request

                    var apiRequest = new XMLHttpRequest();
                    apiRequest.onreadystatechange = function () {

                        if (apiRequest.readyState == 4){
                            // the request is complete -> now check the status

                            if (options.fadeAnimate) {
                                // remove loading styles from body
                                bodyClass.remove('loading-fade');
                                setTimeout(function(){ bodyClass.remove('loading') }, 800);
                            }

                            if (options.loadingBodyClass){
                                // force add the loading class if animations are disabled and the flag is set
                                bodyClass.remove('loading');
                            }

                            if (apiRequest.status == 200) {
                                // the request was received without errors -> but needs to be verified

                                var parsedResponse; // create placeholder refrence to the JSON data to be parsed

                                try {
                                    parsedResponse = JSON.parse(apiRequest.responseText);
                                } catch (e) {
                                    console.error('API: JSON parse of response from endpoint "' + options.endpoint + '" failed.');
                                }

                                if (parsedResponse && typeof parsedResponse === "object") {
                                    // it's a valid object

                                    // extract apiResponseError from response
                                    var apiErrorResponse = (typeof parsedResponse.error === "string") ? parsedResponse.error : '';

                                    if (apiErrorResponse){
                                        // if the above setter evaluates as true then there is an error

                                        if (options.errorBodyClass){
                                            // the errorBody class needs to be added
                                            bodyClass.add(options.errorBodyClass);
                                        }

                                        if (options.errorElement){
                                            // there is an error reporting element and it needs to be set
                                            options.errorElement.innerHTML =apiErrorResponse;
                                        }
                                    }

                                    if (apiErrorResponse) {
                                        // there was an API error, return the result
                                        console.error('API: request to endpoint "' + options.endpoint + '" returned with error.');
                                        options.onFailure(apiRequest, parsedResponse);
                                    } else {
                                        // it worked, return output

                                        if (options.errorBodyClass){
                                            // the errorBody class needs to be removed
                                            bodyClass.remove(options.errorBodyClass);
                                        }

                                        if (options.errorElement){
                                            // there is an error reporting element and it needs to be cleared
                                            options.errorElement.innerHTML = '';
                                        }

                                        options.onSuccess(parsedResponse);
                                        return; // exit function
                                    }

                                } else {
                                    console.error('API: invalid response from endpoint "' + options.endpoint + '".');
                                    options.onFailure(apiRequest);
                                }

                            } else {
                                // the request is a failure -> output error and do callback

                                if (apiErrorResponse){
                                    // if the above setter evaluates as true then there is an error

                                    if (options.errorBodyClass){
                                        // the errorBody class needs to be added
                                        bodyClass.add(options.errorBodyClass);
                                    }

                                    if (options.errorElement){
                                        // there is an error reporting element and it needs to be set
                                        options.errorElement.innerHTML = 'An ' + options.method + ' error occurred at endpoint [state: ' + apiRequest.readyState + '](code: ' + apiRequest.status + ')';
                                    }
                                }

                                console.error('API: request to endpoint "' + options.endpoint + '" returned with status [' + apiRequest.readyState + '](' + apiRequest.status + ')');
                                options.onFailure(apiRequest); // do failure callback
                            }

                        }
                    };
                    // attempt to send the request
                    try {
                        apiRequest.open(method, options.endpoint, true);
                        if (method === "GET"){
                            apiRequest.send(); // send nothing
                        } else {
                            apiRequest.setRequestHeader('Content-Type', 'application/json');
                            apiRequest.send(JSON.stringify(options.data));
                        }
                    } catch (e){
                        // something went wrong
                        console.log('API: critical request error!');
                        console.log(e);
                        return false; // prevent further execution
                    }

                    if (options.loadingBodyClass){
                        // force add the loading class if animations are disabled and the flag is set
                        bodyClass.add('loading');
                    }

                    if (options.fadeAnimate) {
                        // add loading styles to body
                        setTimeout(function(){ bodyClass.add('loading-fade') }, 100); // add fade
                    }

                    return true; // it it got to here then the request was submitted successfully.

                } else {
                    console.warn('API: passed data is not a valid object. Ignoring request.')
                }
            } else {
                // the endpoint is not valid, ignore call
                console.error('API: "' + options.endpoint + '" is not a verified endpoint.');
            }
        } else {
            console.error('API: invalid method "' + options.method + '".');
        }
        return false; // if the API call gets here then it failed. Return boolean that states it failed.
    }

    // export the module
    window.API = {
        request: _API_request,
        post: function(options) {return _API_request('POST', options)},
        put: function(options) {return _API_request('PUT', options)},
        get: function(options) {return _API_request('GET', options)}
    };

})(window, document);