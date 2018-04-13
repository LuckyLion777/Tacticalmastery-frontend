/**
 * Created by flynn on 21/07/17.
 */

(function(document, window){
    var bodyClass = document.body.classList, // reference to the body classlist
        receipt = document.getElementsByClassName('receipt')[0], // the main receipt element,
        receiptItems = receipt.getElementsByClassName('items')[0],
        receiptPayment = receipt.getElementsByClassName('payment')[0],
        orderId = receipt.querySelector('[data-fill="orderId"]'),
        subTotal = receiptPayment.querySelector('[data-fill="sub"]'),
        shippingTotal = receiptPayment.querySelector('[data-fill="shipping"]'),
        taxTotal = receiptPayment.querySelector('[data-fill="tax"]'),
        grandTotal =  receiptPayment.querySelector('[data-fill="all"]'),
        currencySymbol; // currencySymbol, gets set after AJAX response is received

    // the strings that extractQuantityFromName looks for before attempting an extraction (used for getting quantities of bundles)
    var quantityExtractNames = ['Flashlight'];

    // this function will attempt to extract the quantity of the bundled products if it matches
    function extractQuantityFromName(namestring){
        var i = quantityExtractNames.length; // iterator used to check if namestring contains a quantityExtractNames string

        while (i--){
            if (namestring.indexOf(quantityExtractNames) > -1){
                // it was found, attempt an extraction
                var rawExtraction = namestring.match(/\-\s\d\s\(/)[0]; // matches '- {number} ('

                if (rawExtraction){
                    return rawExtraction.split(' ')[1]; // returns character after second space
                } else {
                    return ''
                }
            }
        }
        return ''
    }

    function addItem(itemData){
        var item = document.createElement('div'), // create empty element for appending item
            splitProductName = itemData.name.split(' - '), // split the product name into two categories (assumes that the quantity is set)
            productName = splitProductName[0], // get the product name from the string
            // extract the bundle quantity (if it exists) and the string contains flashlight
            bundleQuantity = extractQuantityFromName(itemData.name);

        item.innerHTML = '<div>' +
            // if the bundleQuantity was extracted: use it instead of itemDate.qty
            ((bundleQuantity) ? bundleQuantity : itemData.qty) +
            '</div><div>(' + itemData.productId  + ') ' + productName + '</div><div>' + currencySymbol + itemData.price + '</div>';

        receiptItems.appendChild(item); // add item to the receiptItems
    }

    // create post request to front-end server
    API.post({
        endpoint: '/checkout/receipt',
        loadingBodyClass: true, // add body class while loading data
        data: {data: null}, // nothing to submit, since the server already knows what the orderId is if page is active
        onSuccess: function(apiResponse){
            // parse the returned product data

            // set the currency symbol
            currencySymbol = apiResponse.currency;

            // set receipt static elements
            orderId.innerHTML = apiResponse.orderId;
            subTotal.innerHTML = currencySymbol + apiResponse.total.sub;
            shippingTotal.innerHTML = currencySymbol + apiResponse.total.shipping;
            taxTotal.innerHTML = currencySymbol + apiResponse.total.tax;
            grandTotal.innerHTML = currencySymbol + apiResponse.total.all;

            if (typeof apiResponse.items === "object"){

                var i = apiResponse.items.length;

                while (i--){
                    // iterate backwards since the server send the list in reverse
                    addItem(apiResponse.items[i]);
                }

                // it's an array, so process the HTML elements for the receipt
            }
            bodyClass.add('loaded'); // display the newly rendered items
        },
        onFailure: function(){
            // do nothing
            console.error('No receipt data was received.');
        }
    });

})(document, window);