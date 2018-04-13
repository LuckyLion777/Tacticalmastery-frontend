/**
 * Created by flynn on 14/07/17.
 */

/* TACTICALMASTERY FORM VALIDATOR - small validation wrapper for verifying input before allowing form submissions */

var TMvalidator = (function(){

    // object containing default messages for successful options
    var defaultSuccessMessages = {
        'name': 'Nice to meet you!',
        'name-display': 'Nice to meet you, %a!',
        'full-name': 'Nice to meet you!',
        'full-name-display': 'Nice to meet you, %a!',
        'required': '',
        'email': '',
        'us-zip': '',
        'phone' : '',
        'length' : '',
        'card': '',
        'card-type': '',
        'select': '',
        'cc-expiry': ''
    }

    // object containing default messages for successful options
    var defaultFailureMessages = {
        'name': 'Please enter a valid name.',
        'name-display': 'Please enter a valid name.',
        'full-name': 'Please enter a valid name containing at least 1 space.',
        'full-name-display': 'Please enter a valid name containing at least 1 space.',
        'required': '', // 'This field is required',
        'email': 'Please enter a valid email address.',
        'us-zip': 'Please enter a valid US zip code.',
        'phone' : 'Please enter a valid phone number.',
        'length' : 'Must be between %a and %b characters long.',
        'card': 'Please enter a valid credit card number.',
        'card-type': 'Please enter an accepted credit card (Visa, Mastercard, AMEX, or Discover)',
        'select': 'Please select a valid option.',
        'cc-expiry': 'This is not a valid expiry date.'
    }

    // variable containing regex for accepted cards
    var acceptedCards = {
        'visa': /^4/,
        'visa-electron': /^(4026|417500|4508|4844|491(3|7))/,
        'mastercard': /^5[1-5]/,
        'amex': /^3[47]/,
        'discover': /^(6011|622(12[6-9]|1[3-9][0-9]|[2-8][0-9]{2}|9[0-1][0-9]|92[0-5]|64[4-9])|65)/
    }

    // function to get formGroupFromElement if it exists (searches three layers)
    function _getFormGroupFromElement(elem){

        var i = 4,// the number of layers that are searched (should be relatively short, since this happens each click)
            elemNode = elem;

        while (elemNode){
            // auto exit loop if elem is undefined
            if (elemNode.classList.contains('form-group')) return elemNode;

            elemNode = elemNode.parentNode; // iterate to next layer

            if (--i <= 0) return null; // there isn't a modalId that was triggered.
        }
        return null; // the while loop hit the top parent of the DOM tree
    }

    /* functions for verifying values */
    function _validate_required(value){
        return value.length > 0;
    }

    function _validate_name(value){
        // this is a custom property made for TacticalMastery -> checks if name is valid
        return /^[a-zA-Z ]+$/.test(value);
    }

    function _validate_name_with_display(value){
        // this is a custom property made for TacticalMastery -> checks if name is valid
        var firstname = value.split(' ')[0];

        // capitalize the first name to make it look better
        return [_validate_name(value), firstname.charAt(0).toUpperCase() + firstname.slice(1)];
    }

    function _validate_full_name(value){
        // makes sure that there is at least one space in the name (a through X, dots ans slashes)
        return /^[a-zA-Z\.\'\-]{2,50}(?: [a-zA-Z\.\'\-]{2,50})+$/.test(value);
    }

    function _validate_full_name_with_display(value){
        var firstname = value.split(' ')[0];

        // capitalize the first name to make it look better
        return [_validate_full_name(value), firstname.charAt(0).toUpperCase() + firstname.slice(1)];
    }

    function _validate_email(value){
        // TacticalMastery -> does a full regex check if email is valid
        var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(value);
    }

    function _validate_phone(value){
        // TacticalMastery -> does a full regex check if a phone number is valid (multi format)
        // var re = /^(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;
        var re = /^(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*\)|([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\s*(?:[.-]\s*)?)?([2-9]1[02-9]|[2-9][02-9]1|[2-9][02-9]{2})\s*(?:[.-]\s*)?([0-9]{4})(?:\s*(?:#|x\.?|ext\.?|extension)\s*(\d+))?$/gm;
        return re.test(value)
    }

    function _validate_us_zip(value){
        // tests for us zip codes
        return /(^\d{5}$)|(^\d{5}-\d{4}$)/.test(value)
    }

    function _validate_length(value, min, max){
        // check to see if length is inside bounds
        return [(value.length >= min && value.length <= max), min, max];
    }

    function _validate_select(value){
        // check if select is validated (if value has a length greater than 0)
        return (value.length > 0);
    }

    // source -> (https://gist.github.com/DiegoSalazar/4075533) -> implements the Luhn algorithm
    // takes the form field value and returns true on valid number
    function _validate_cc(value) {
        // accept only digits, dashes or spaces
        if (/[^0-9-\s]+/.test(value)) return false;

        // The Luhn Algorithm. It's so pretty.
        var nCheck = 0, nDigit = 0, bEven = false;
        value = value.replace(/\D/g, "");

        for (var n = value.length - 1; n >= 0; n--) {
            var cDigit = value.charAt(n),
                nDigit = parseInt(cDigit, 10);

            if (bEven) {
                if ((nDigit *= 2) > 9) nDigit -= 9;
            }

            nCheck += nDigit;
            bEven = !bEven;
        }

        return (nCheck % 10) == 0;
    }

    function _validate_cc_type(value){
        // checks card type to see if it is valid (returns either string of name or null)
        // matches first characters from credit card number and returns the type as string

        // regex object for searching
        for(var key in acceptedCards) {
            if(acceptedCards[key].test(value)) {
                return key; // return the key value from the list if it matches
            }
        }
        return ''; // return nothing since there is no card type found
    }

   /* function _validate_cc(value){
        // checks if valid credit card number (source: https://stackoverflow.com/a/9315696)
        var re = /^(?:4[0-9]{12}(?:[0-9]{3})?|[25][1-7][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11})$/g;
        return re.test(value);
    }*/

    /* this function takes two argument, the raw Month and Year from the select elements.
    *  This is done to help prevent a user from entering an expired card, by comparing the month and year simultaneously */
    function _validate_cc_expiry(values){
        if (typeof values === "object" && typeof values.length === "number"){
            // it's an array, so it's valid -> check if the length ov both values is 4 ( XX + XX )

            if ((values[0] + values[1]).length === 4){
                // neither of the values are unset, so it's potentially legitimate
                // start comparing current date with date generated by both values

                // values[0] := month  values[1] := year

                var ccYear = 20 + values[1], // current year as string (assumes year is second value)
                    ccMonth = values[0], // current month as string (assumes month is first value)
                    ccDate = new Date(ccYear, ccMonth), // generate date object from forementioned values
                    currentDate = new Date(); // get date

                if (ccDate.getTime() > currentDate.getTime()){
                    // the expiry date of the credit card is greater than the current time
                    return true;
                } else {
                    // it's expired, treat it as invalid
                    return false;
                }
            } else {
                return false; // it's not valid, so just throw the generalized error to the user
            }

        } else {
            console.warn('invalid cc date data -> invalidated')
            return false; // it's not valid since something is wrong; return error code
        }
    }

    // small function that wraps output in a span element
    function _outputResult(result, verifyObject){

        if (typeof result === "object" && typeof result.length === "number"){
            // it should be an array, so do the output replacements based on string placements (%a, %b);

            var outString; // string that will eventually be replaced

            if (result[0]){
                // it passed
                outString = ((typeof verifyObject.msgSuccess === "string") ? verifyObject.msgSuccess : defaultSuccessMessages[verifyObject.verify]);
            } else {
                // it failed
                outString = ((typeof verifyObject.msgFailure === "string") ? verifyObject.msgFailure : defaultFailureMessages[verifyObject.verify]);
            }

            // return the string with the replacements done
            return '<span>' + outString.replace(/%a/, result[1]).replace(/%b/, result[2]) + '</span>';
        } else {
            // it's a standard i/o string function -> output based on boolean values
            if (result){
                return '<span>' + ((typeof verifyObject.msgSuccess === "string") ? verifyObject.msgSuccess : defaultSuccessMessages[verifyObject.verify]) + '</span>';
            } else {
                return '<span>' + ((typeof verifyObject.msgFailure === "string") ? verifyObject.msgFailure : defaultFailureMessages[verifyObject.verify]) + '</span>';
            }
        }
    }


    /* instead of doing something crazy complex, simply validate the specific parts of the page */

    /*
    * The below function has three parameters, the last being optional
    *    field - the HTMLElement of the field being verified
    *    verifyTypes - an array (or single object) containing the type(s) of data to be verified
    * {
    *   verify: 'name';
    *   msgSuccess: 'This will show on success'
    *   msgFailure: 'This message will show on failure'
    * }
    * */

    return {
        validateField: function(field, verifyArray, messageBox){
            // check the first argument to asee that it's at least a valid object
            if (typeof field === "object"){

                // wrap verifyTypes into an array if it's only a object
                verifyArray = (typeof verifyArray === "object" && typeof verifyArray.length !== "number") ? [verifyArray] : verifyArray;

                var i = 0, // main iterator for loop
                    messageString = '', // iterative string containing the outputs of each test
                    errorCount = 0, // counter used to determine whether the form input should be flagged as errored
                    verifyNode, // the iterator node for each verifyType
                    validated; // the value of the input validation

                for (i; i < verifyArray.length; i++){
                    verifyNode = verifyArray[i];
                    validated = true; // set flag to true (assumed it failed so counter will function if there's an invalid verify)

                    if (typeof verifyNode === "object"){
                        // it's a legitimate object - continue verifying

                        switch (verifyNode.verify){
                            case 'required':
                                validated = _validate_required(field.value);
                                break;
                            case "length":
                                validated = _validate_length(field.value, verifyNode.min, verifyNode.max);
                                (validated[0] === false) && errorCount++; // manual increment, since it will be skipped because it returns an array
                                break;
                            case 'full-name':
                                validated = _validate_full_name(field.value);
                                break;
                            case 'full-name-display':
                                validated= _validate_full_name_with_display(field.value);
                                (validated[0] === false) && errorCount++;
                                break;
                            case "name":
                                validated = _validate_name(field.value);
                                break;
                            case "name-display":
                                validated = _validate_name_with_display(field.value);
                                (validated[0] === false) && errorCount++;
                                break;
                            case "phone":
                                validated = _validate_phone(field.value);
                                break;
                            case "email":
                                validated = _validate_email(field.value);
                                break;
                            case "us-zip":
                                validated = _validate_us_zip(field.value);
                                break;
                            case "card":
                                validated = _validate_cc(field.value);
                                break;
                            case "card-type":
                                validated = _validate_cc_type(field.value).length > 0;
                                break;
                            case 'select':
                                validated = _validate_select(field.value);
                                break;
                            case 'cc-expiry':
                                // pass array to validation since its comparing both month and date at the same time
                                validated = _validate_cc_expiry([field[0].value, field[1].value]);
                                break;
                        }
                        messageString += _outputResult(validated, verifyNode);
                        (validated === false) && errorCount++; // increment errorCount if invalidated
                    } else {
                        console.warn('"' + typeof verifyNode + '" is an invalid verification object, ignoring');
                    }
                }

                // if the messagebox exists, the push the messages to it to display to the user
                if (typeof messageBox === "object"){
                    messageBox.innerHTML = messageString;
                }

                // check if there is a form-group containing the field (iterates through parent nodes)

                // the output field used (checks if the field argument is an array, and if it is: it sets it to the first element
                var outField = (typeof field === "object" && typeof field.length === "number") ? field[0] : field,
                    formGroupElement = _getFormGroupFromElement(outField);

                if (!formGroupElement){
                    // there isn't a form group, so just set it to style the input box
                    formGroupElement = outField;
                }

                if (errorCount > 0){
                    // there were errors so add class to form input
                    formGroupElement.classList.remove('validation-success');
                    formGroupElement.classList.add('validation-failure');
                    return false; // return signifying that there was is an error with the validation
                } else {
                    // there were no errors so add class to form input
                    formGroupElement.classList.add('validation-success');
                    formGroupElement.classList.remove('validation-failure');
                    return true; // return signifying that the form is valid
                }


            } else {
                console.warn('"' + typeof field + '" is an invalid HTMLElement or group, ignoring');
            }
        }, creditCardType: _validate_cc_type
    };

})(window, document);