/**
 * Created by flynn on 20/07/17.
 */

(function(window, document){
    var promotionalItem = document.getElementsByClassName('promotional-item')[0],
        upsellWarranty = promotionalItem.getElementsByClassName('warranty-yes')[0],
        upsellNoWarranty = promotionalItem.getElementsByClassName('warranty-no')[0],
        upsellEvade = promotionalItem.getElementsByClassName('warranty-ignore')[0];

    // function that fires when either warranty upsell button is pressed
    function upsellClickEvent(event){
        var targetData = event.target.dataset;

        var upsellData = (typeof targetData.productid === "string")
            ? { productId: targetData.productid, quantity: 1 } // data to be sent if the button has a valid product id
            : { evade: true }; // data to be sent if the button clicked has no product id

        upsellData.pageId = window.location.href
            .split('/').pop(); // get the page ID and add it to the object

        API.post({
            endpoint: '/checkout/promo',
            fadeAnimate: true,
            data: upsellData,
            onSuccess: function(apiResponse){
                if (typeof apiResponse.redirect === "string"){
                    // a redirect is possible -> so redirect

                    window.location.href = apiResponse.redirect;
                }
            },
            onFailure: function(){
                // something went wrong
                console.error('PROMO: invalid response from server');
            }
        })

    }

    // add event listeners to click
    upsellWarranty.addEventListener('click', upsellClickEvent);
    upsellNoWarranty.addEventListener('click', upsellClickEvent);
    upsellEvade.addEventListener('click', upsellClickEvent);

})(window, document, API);