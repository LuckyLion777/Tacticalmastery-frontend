/**
 * Created by flynn on 12/07/17.
 */

/* FRONT PAGE SPECIFIC CODE GOES HERE */

(function(window, document, API, TMvalidator){
    // remove body preload body class
    document.body.classList.remove('preload');

    /* SUBSCRIPTION MODAL SPECIFIC CODE */

    // cache important form elements for the subscription modal
    var subModal = document.getElementById('offer'),
        subSubmitButton = subModal.getElementsByClassName('lead-submit')[0],
        subName = subModal.querySelector('input[name="contactModalName"]'),
        subNameMsg = subModal.querySelector('div[data-form-validate-name="contactModalName"]'),
        subEmail = subModal.querySelector('input[name="contactModalEmail"]'),
        subEmailMsg = subModal.querySelector('div[data-form-validate-name="contactModalEmail"]'),
        subPhone = subModal.querySelector('input[name="contactModalPhone"]'),
        subPhoneMsg = subModal.querySelector('div[data-form-validate-name="contactModalPhone"]');

    // the event handler for binding keystrokes to trigger subscription form validation
    function validateSubscription(){

        // validate specific form elements when keyup fires
        // if all of the below are fully validated then the code blocde will execute

        /* separate verifiable items for batch logic

         * combining this logic into a simple (one && two && three) wont be feasable
         * because two and three wont evaluate unless one is also true. This is why
         * all of the verifications must be evaluated prior to comparison */

        var vName, vMail, vPhone;

        var _RS = {verify: 'required', msgFailed: ''}; // shorthand so it takes up less memory

        vName = TMvalidator.validateField(subName, [
            _RS,
            {verify: 'full-name-display'},
            {verify: 'length', min: 1, max: 50}
        ], subNameMsg);

        vMail = TMvalidator.validateField(subEmail, [
            _RS,
            {verify: 'email'}
        ], subEmailMsg);

        vPhone = TMvalidator.validateField(subPhone, [
            _RS,
            {verify: 'phone'}
        ], subPhoneMsg);

        if (vName && vMail && vPhone){
            // if all of the above are validated then the form will be submittable
            return true;
        } else {
            return false;
        }
    };

    // add event listeners
    subModal.addEventListener('click', validateSubscription);
    window.addEventListener('keydown', validateSubscription);
    window.addEventListener('keyup', validateSubscription);

    // setup click event handler for subscription modal
    subSubmitButton.addEventListener('click', function(e){
        if (validateSubscription()){
            // the modal has been properly filled -> so send the API request

            API.post({
                endpoint: '/',
                fadeAnimate: true,
                data: {
                    'contactModalName': subName.value,
                    'contactModalEmail': subEmail.value,
                    'contactModalPhone': subPhone.value
                },
                onSuccess: function(apiResponse){
                    // if (apiResponse.onSuccess === true){
                    window.location.href = '/checkout'; //redirect to checkout
                },
                onFailure: function(){
                    // something went wrong on the server... ToDO: add error response
                }
            })

        } else {
            // do nothing- or throw error
        }
    });

    if (window.location.hash === '#' + subModal.id){
        window._openModal(subModal); // open the modal if the hash is set to
    }
})(window, document, API, TMvalidator);