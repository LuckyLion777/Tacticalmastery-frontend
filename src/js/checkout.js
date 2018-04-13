/**
 * Created by flynn on 12/07/17.
 */

(function(window, document, API, TMvalidator){

    /* Valid names should correspond with a valid `input` or `select` inside of the mainForm element. They will be ignored if they do not exist. */

    // list of acceptable formElements (to prevent forced uploads of data to server)
    var validFormNames = ['fullName', 'emailAddress', 'phoneNumber', 'postalCode', 'postalCode', 'city', 'state', 'address1', 'cardNumber', 'month', 'year'],
        mainForm = document.getElementsByClassName('main container')[0], // the main form element
        mainSubmit = mainForm.getElementsByClassName('checkout-submit btn')[0], // main submit button
        ccPretty = mainForm.getElementsByClassName('cc-pretty')[0], // display for prettified container
        ccPaymentIcons = mainForm.getElementsByClassName('payment-icons')[0], // container for credit card icons icons
        bodyClass = document.body.classList,// shorthand reference to access body classlist
        errorDisplay = document.getElementById('error-display'), // element for displaying important back-end errors on the page
        $f = {}; // storage object for form elements used for validation

    // made private to help reduce re-declaration of variables
    (function($f){
        // temp function that adds formElements based on the name provided (used while iterating through validFormNames
        var addFormElement = function(name){
            var fE = mainForm.querySelector('[name="' + name + '"]'), // the form element (if it exists)
                mE = mainForm.querySelector('[data-form-validate-name="' + name + '"]'); // the message element (if it exists)

            $f[name] = (fE) ? fE : undefined;
            $f[name + 'Msg'] = (mE) ? mE : undefined;
        }

        var i = validFormNames.length; // create iterator
        while (i--){
            addFormElement(validFormNames[i]); // attempt to add form elements
        }

        // add any additional elements
        $f.ccExpiryMsg = mainForm.querySelector('div[data-form-validate-name="ccExpiry"]'); // add expiry message
    })($f);

    var zipCheckCount = 0,  // integer toggle to check how many times postal code is checked in the system. Only allows 4 times
        lastZipRequest = null, // variable containing last valid zip code entered. Helps prevent redundant requests.
        fetchingZipCode = false; // boolean toogle that is true when zip data is being fetched from the front-end

    // function that takes ouputs a spaced string from the input
    function prettifyCC(cardType, cardNumber){
        if (typeof cardType === "string"){

            var outString = cardNumber, // variable for outputting the function's output
                i, j; // iterators used for indexing strings

            switch (cardType){
                case 'visa':
                case 'discover':
                case 'mastercard':
                    // if it's any of the forementioned then start processing (4-4-4-4)

                    if(outString.length > 0) {
                        outString = cardNumber.split(''); // convert string into array

                        // checks string at each 4th interval and adds a space if it exists
                        for (i = 1; i < 4; i++) {
                            j = (i * 4) - 1;
                            if (outString.length > j) {
                                outString[j] = outString[j] + ' ';
                            } else break; // exit loop
                        }

                        outString = outString.join(''); // join the string back together
                    }
                    break;
                case 'amex':
                    var spaces = [3, 9]; // locations of spaces in the formatted number (4 and 10)

                    if(outString.length > 0) {
                        outString = cardNumber.split(''); // convert string into array

                        for (i = 0; i < spaces.length; i++) {
                            j = spaces[i];
                            if (typeof outString[j] === "string") {
                                outString[j] = outString[j] + ' ';
                            }
                        }

                        outString = outString.join(''); // join the string back together
                    }
                    break;
            }
            return outString;
        } else return '{ERROR}'
    }

    // updates the display for the credit card
    function updateCCDisplay(){
        // get string of the card type
        var vCardType = TMvalidator.creditCardType($f.cardNumber.value);

        // filter out bad characters (non numeric) from cc.value;
        $f.cardNumber.value = $f.cardNumber.value.replace(/\D/g, '');

        // set the card type icon highlighting
        ccPaymentIcons.dataset.cardType = vCardType;

        // prettify credit card number disaply
        ccPretty.innerHTML = prettifyCC(vCardType, $f.cardNumber.value);
    }

    // this event should fire everytime the user finishes pressing a key or when the page is clicked
    function validateCheckout(){

        /* separate verifiable items for batch logic

        * combining this logic into a simple (one && two && three) wont be feasable
        * because two and three wont evaluate unless one is also true. This is why
        * all of the verifications must be evaluated prior to comparison */

        var vName, vEmail, vPhone, vCity, vCard;

        var _RS = {verify: 'required', msgFailed: ''}; // shorthand so it takes up less memory

        vName = TMvalidator.validateField($f.fullName, [
            _RS,
            {verify: 'full-name-display'},
            {verify: 'length', min: 1, max: 50}
        ], $f.fullNameMsg);

        vEmail = TMvalidator.validateField($f.emailAddress, [
            _RS,
            {verify: 'email'} // ToDo: add domain verification? Seems slightly overkill
        ], $f.emailAddressMsg);

        vPhone = TMvalidator.validateField($f.phoneNumber, [
            _RS,
            {verify: 'phone'}
        ], $f.phoneNumberMsg);

        vPostal = TMvalidator.validateField($f.postalCode, [
            _RS,
            {verify: 'us-zip'}
        ], $f.postalCodeMsg);

        // if postal code is invalid and does not match last known cached value
        if (vPostal && lastZipRequest !== $f.postalCode.value.trim() && zipCheckCount < 4){
            // the postal code is valid, check server get new autofill request. Only checks 4 times, then stops

            fetchingZipCode = true; // set check flag to prevent form submits

            API.post({
                endpoint: '/checkout/zipcode',
                data: {
                    zip: $f.postalCode.value
                },
                onSuccess: function(zipData){
                    if (typeof zipData.city === "string") {
                        // it's a valid response, start autofilling values

                        // set values of input boxes based on return values
                        $f.city.value = zipData.city;
                        $f.state.value = zipData.state;

                        fetchingZipCode = false; // set flag early to prevent accidental recursion
                        validateCheckout(); // re-validate the inputs
                    }
                },
                onFailure: function(){
                    // it's an empty response so do nothing
                }
            });

            // cache value of sent value for future comparison, to prevent future rechecks
            lastZipRequest = $f.postalCode.value.trim();

            zipCheckCount++; // increment counter
        }

        // process city name
        vCity = TMvalidator.validateField($f.city, [
            _RS,
            {verify: 'name', msgFailure: 'Please enter a valid city name.', msgSuccess: ''},
            {verify: 'length', min: 1, max: 30}
        ], $f.cityMsg);

        // process state value
        vState = TMvalidator.validateField($f.state, [
            {verify: 'select'}
        ]); // it's a select so no msg is required (though it is possible)

        // process address
        vAddress = TMvalidator.validateField($f.address1, [
            _RS,
            {verify: 'length', min: 1, max: 100},
        ], $f.address1Msg);

        // filter and update display for credit card number
        updateCCDisplay();

        // process card number (all using luhn algorithm(
        vCard = TMvalidator.validateField($f.cardNumber,[
            _RS,
            {verify: 'card'},
            {verify: 'card-type'}
        ], $f.cardNumberMsg);

        // process expiry date
        vExpiry = TMvalidator.validateField([$f.month, $f.year],
            {verify: 'cc-expiry'},
            $f.ccExpiryMsg);

        /* if the ajax request is running, fail the validation (since data is superimposed, and must
         * go through additional validation) */
        if (fetchingZipCode) return false;

        if (vName && vEmail && vPhone && vCity && vState && vAddress){
            // everything checks out...
           if (vCard && vExpiry){
               // ToDO: show the CSC input
               return true;
           } else return false;
        } else {
            return false;
        }
    }

    // add global event binds to keyup and click events
    window.addEventListener('keyup', validateCheckout);
    window.addEventListener('click', validateCheckout);

    // setup event handler for key presses for the credit card entry
    $f.cardNumber.addEventListener('keypress', updateCCDisplay);

    // setup event hander for entering an exiting focus for the credit card entry
    $f.cardNumber.addEventListener('focus', function(){
        $f.cardNumber.parentNode.classList.add('focused');
    });

    $f.cardNumber.addEventListener('blur', function(){
        $f.cardNumber.parentNode.classList.remove('focused');
    });

    // add checkout form submit handler -> sends manual form submission via javascript
    mainSubmit.addEventListener('click', function(){
        if (validateCheckout()) {

            // get sendable form data (via verified object container -> via keys)

            // We're going to generate the objects by iterating through the list of pre-approved keys.

            var checkoutData = {}, // object containing the data to be uploaded
                i = validFormNames.length,
                formElem; // iterative node

            // iterate through secured form elements to create object that thw server is expecting.
            while (i--){
                formElem = $f[validFormNames[i]];
                // if it's an object then set the property (key) of the JSON object to be sent
                typeof formElem === "object" && (checkoutData[formElem.name] = formElem.value);
            }

            // get the product ID of the currently checked product
            var checkedProduct = mainForm.querySelector('input[type="radio"][name="productId"]:checked');

            // set the product ID based on that elements value
            checkoutData.productId = checkedProduct.value;

            // set the product quantity based on the dataset value of the matched checkedProduct
            checkoutData.productQty = checkedProduct.dataset.quantity;

            API.post({
                endpoint: '/checkout',
                loadingBodyClass: true, // add loading class to the body
                errorBodyClass: true, // add error class to body when error occurs
                data: checkoutData,
                onSuccess: function(apiResponse){
                    // the order went thru successfully -> redirect if possible
                    if (typeof apiResponse.redirect === "string"){
                        // redirect to forementioned page (supposed to be the first promo item)
                        window.location.href = apiResponse.redirect;
                    } else {
                        // something went wrong
                        console.error('CHECKOUT: redirect response empty!');
                    }
                },
                errorElement: errorDisplay, // set error display element
                onFailure: function (e, apiResponse){
                    // there was an error and it needs to be displayed accordingly
                    console.log(apiResponse);
                }
            });
        }
    });

    /*mainForm.onsubmit = function(event){
        event.preventDefault(); // prevent redirects/default action
        if (validateCheckout()) {
            var formSumbit = new XMLHttpRequest();
            formSumbit.onreadystatechange = function () {

                if (formSumbit.readyState == 4 && formSumbit.status == 200) {
                    // there was a valid response, so parse the data
                    bodyClass.remove('loading');

                    if (formSumbit.responseText) {
                        // it's not empty, so do something
                        var resObj = JSON.parse(formSumbit.responseText); // it's an object response
                        // parse the data

                        if (resObj.error){
                            // there is an error and it needs to be displayed
                            bodyClass.add('error');
                            errorDisplay.innerHTML = resObj.error || '';
                        } else {
                            // hide the error box if it's already open
                            bodyClass.remove('error');

                            if (typeof resObj.redirect === "string"){
                                // a redirect is possible -> so redirect
                            }
                        }

                    } else {
                        bodyClass.add('error');
                        errorDisplay.innerHTML = 'Something went wrong';
                        // it's an empty response, so do nothing
                    }
                }
            };

            // We're going to generate the objects by iterating through the list of pre-approved keys.

            var uploadObj = {}, // object containing the data to be uploaded
                i = validFormNames.length,
                formElem; // iterative node

            // iterate through secured form elements to create object that thw server is expecting.
            while (i--){
                formElem = $f[validFormNames[i]];
                // if it's an object then set the property (key) of the JSON object to be sent
                typeof formElem === "object" && (uploadObj[formElem.name] = formElem.value);
            }

            // get the product ID of the currently checked product
            var checkedProduct = mainForm.querySelector('input[type="radio"][name="productId"]:checked');

            // set the product ID based on that elements value
            uploadObj.productId = checkedProduct.value;

            // set the product quantity based on the dataset value of the matched checkedProduct
            uploadObj.productQty = checkedProduct.dataset.quantity;

            // create POST request
            bodyClass.add('loading');
            formSumbit.open('POST', '/checkout', true);
            formSumbit.setRequestHeader('Content-Type', 'application/json');
            formSumbit.send(JSON.stringify(uploadObj)); // send the data
        }
        return false; // prevent default action
    };*/

    // autofill values (only works ONCE per session)

    API.get({
        endpoint: '/checkout/autofill',
        onSuccess: function(fillData){
            if (typeof fillData.name === "string"){
                // it's a valid response, start autofilling values

                $f.fullName.value = fillData.name || '';
                $f.emailAddress.value = fillData.email || '';
                $f.phoneNumber.value = fillData.phone || '';

                validateCheckout(); // process values
            }
        },
        onFailure: function(){
            // nothing valulable was returned so do nothing
        }
    });
})(window, document, API, TMvalidator);