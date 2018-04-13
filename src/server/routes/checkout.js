/**
 * Created by flynn on 20/07/17.
 */
var express = require('express');
var path = require('path');
var request = require('request');
var zipcodes = require('zipcodes');

var config = require('../config'); // import configuration
var API = require('../api.js'); // import back-end API interface

var logger = require('../logger'); // import logging apartatus

var router = express.Router();
var rootDir = path.join(__dirname, '../public'); // get absolute path to root

const DEBUG = false; // the flag used for enabling use of the DEBUG creditcard number
const DEBUG_CREDIT_NUMBER = '0000000000000000';

// this function acts as a gate prventing POST and GET to pages after a successful order
function resetHandler(req, res, next){
    if (req.session.reset || !req.session.authorization){
        if (req.url === '/promo'){
            // it's a promotional POST request
            res.json({redirect: '/'}); // tell the PROMO page to redirect to the checkout (and then to '/')
        } else {
            res.redirect('/'); // redirect to the home page
        }
    } else {
        // ToDo: implement extra logic to prevent the use from accessing checkout after submitting initial order
        next(); // call next route
    }
}

// function that will prevent the user from going backwards to the /checkout or a previous /checkout/promo
function preventBackwardsCheckout(req, res, next){

    if (req.session.upsell){
        // console.log(`session.upsell: "${ req.session.upsell }"`)

        if (req.url === '/'){
            // it's the checkout page -> redirect ot the last session cached upsell page
            res.redirect(`/checkout/promo/${ req.session.upsell }`); // redirect to the last known promo page
        } else {
            // it's probably a promo page -> procces indexes and compare

            var PROMOTIONAL = config.PROMOTIONAL; // get refrence to promotional object
            var promoIndex = PROMOTIONAL.indexOf(req.params.id); // get the index of the promotional page based on id
            var cachedIndex = PROMOTIONAL.indexOf(req.session.upsell); // get the index of the session cached upsell page

            if (cachedIndex > promoIndex){
                // then either the request page does not exist or it's index is below the current pages
                res.redirect(`/checkout/promo/${ req.session.upsell }`); // redirect to the last known promo page
            } else {
                // the promo requested exists and it's further up than the current promo -> proceed
                next();
            }
        }
    } else {
        next(); // there is nothing to do, proceed to next stream/request
    }
}

// html handling for the checkout page (only show to users once they subscribe)
router.get('/', resetHandler, preventBackwardsCheckout, (req, res) =>{
    if (req.session.authorization) {
        // the user has access send them the page
        res.sendFile(path.join(rootDir, 'checkout/index.html'));
    } else {
        res.redirect('/');
    }
});

router.post('/', resetHandler, preventBackwardsCheckout, (req, res) =>{
    var session = req.session;

    var reqBody = req.body; // create refererence to object

    if (typeof reqBody === "object") {
        // it's a valid submission - process API call to order

        // destroy unneeded session variables (assume they aren't already destroyed);
        delete session.firstName;
        delete session.lastName;
        delete session.emailAddress;
        delete session.phoneNumber;

        // create reference to fullName object
        var fullName = reqBody.fullName;

        console.log(reqBody);

        // initialize API request layer
        API.request('POST', {
            auth: session.authorization,
            endpoint: '/order',
            body: {
                'address1': reqBody.address1,
                'address2': null,
                'cardMonth': reqBody.month,
                'cardNumber': (DEBUG) ? DEBUG_CREDIT_NUMBER : reqBody.cardNumber,
                'cardYear': reqBody.year,
                'city': reqBody.city,
                'emailAddress': reqBody.emailAddress,
                'firstName': fullName.substr(0, fullName.indexOf(' ')),
                'lastName': fullName.substr(fullName.indexOf(' ') + 1).trim(), // source -> (https://stackoverflow.com/a/10272822)
                'orderId': session.orderId, //ToDO: wait for orderId fix
                'phoneNumber': reqBody.phoneNumber,
                'postalCode': reqBody.postalCode,
                'productId': reqBody.productId,
                'productQty': reqBody.quantity,
                'state': reqBody.state
            },
            onSuccess: () => {
                session.upsell = config.PROMOTIONAL[0]; // set upsell flag
                res.json({
                    redirect: '/checkout/promo/' + config.PROMOTIONAL[0] // send url string of first promo item
                });
            },
            onError: (resBody) => {
                console.log(typeof resBody);
                res.send(resBody); // flag internal server error to client
                // dev fix only -> send url of first promo
                /*res.status(200); // dev fix only
                res.json({
                    redirect: '/checkout/promo/' + config.PROMOTIONAL[0] // send url string of first promo item
                });*/
            }
        });
    }
});


/* below is where additional items can be added. Takes JSON data from promotional pages.
* the JSON POST request is in the following format:
* {productID: {string}, quantity: {string}}
*
* */

router.post('/promo', resetHandler, (req, res) => {
    var session = req.session;

    var reqBody = req.body;

    if (typeof reqBody === "object") {
        // the data send is valid, attempt to send to back-end API

        var pageId = reqBody.pageId; // reference to the calling page ID (i.e. 'battery')
        var pageIndex = config.PROMOTIONAL.indexOf(pageId); // get index of current PROMO page from the config.
        var nextPage = config.PROMOTIONAL[pageIndex + 1]; // the string name of the next string to fetch.

        console.log({
            currentPage: pageId,
            currentPageId: pageIndex,
            nextPage: config.PROMOTIONAL[pageIndex + 1]
        });

        // console.log(reqBody);

        // begin sending request to back-end API

        if (reqBody.evade){
            // the user want's to skip, tell the client to redirect to next page
            res.json({
                redirect: (nextPage === 'END') ? '/checkout/receipt/' : '/checkout/promo/' + nextPage
                // the above will redirect to the next promotional item if it is not 'END
                // if it is 'END' if will redirect to the receipt page
            })
        } else if (typeof reqBody.productId === "string" && typeof reqBody.quantity === "number"){
            // it's a valid upsell, proccess
            API.request('PUT', {
                auth: session.authorization,
                endpoint: '/order',
                body: {
                    'orderId': session.orderId,
                    'productId': reqBody.productId,
                    'productQuantity': reqBody.quantity
                },
                onSuccess: () => {
                    console.log(`upsell item #${ reqBody.productId } added to order`);
                    console.log(`nextPage: ${ nextPage }`)
                    res.json({
                        redirect: (nextPage === 'END') ? '/checkout/receipt/' : '/checkout/promo/' + nextPage
                        // the above will redirect to the next promotional item if it is not 'END
                        // if it is 'END' if will redirect to the receipt page
                    })
                },
                onError: () => {
                    // res.status(500);
                    // for dev purposed only
                    console.log(`nextPage: ${ nextPage }`)

                    res.json({
                        redirect: (nextPage === 'END') ? '/checkout/receipt/' : '/checkout/promo/' + nextPage
                        // the above will redirect to the next promotional item if it is not 'END
                        // if it is 'END' if will redirect to the receipt page
                    })
                }
            });
        } else {
            console.log('PROMO: Invalid object properties passed');
            console.log(reqBody);
            res.sendStatus(500); // it's not valid data
        }
    } else {
        console.log('PROMO: Invalid data passed');
        // invalid data was passed
        res.sendStatus(500);
    }
});

// get handler for promotional items (takes id as url argument)
router.get('/promo/:id', resetHandler, preventBackwardsCheckout, (req, res) =>{
    var reqId = req.params.id; // create reference to page Id

    console.log(reqId);

    if (typeof reqId === "string" && config.PROMOTIONAL.indexOf(reqId) !== -1) {
        // the string is valid and is found in the PROMOTIONAL items config
        // helps prevent manual entry of paths
        req.session.upsell = reqId;

        // it's a valid string, check to see if file exists and attempt to send it (filter out any relative paths)
        res.sendFile(path.join(rootDir, `promo/${ reqId }.html`), {}, (err)=>{
            if (err){
                // something went wrong
                res.sendStatus(err.statusCode)
                logger.error(`FILE: Unable to fetch the validated promotional page "${ reqId }"`);
            }
        });
    } else {
        // the id is not valid
        console.log('Invalid promotional item requested');
        res.sendStatus(404);
    }
});

// api-layer for autofilling values after subscription (only available to authenticated users)
router.get('/autofill', (req, res) => {
    var session = req.session;

    if (session.authorization && !session.autofilled){
        // the user has permission because they possess the cookies for the data

        session.autofilled = true; // just to be safe, trigger a flag to only allow this data to be fetched ONCE per session

        // send JSON data as a response
        res.json({
            name: session.lead.firstName + ' ' + session.lead.lastName,
            email: session.lead.emailAddress,
            phone: session.lead.phoneNumber
        });
    } else {
        res.json({undefined}); // send dummy content
    }
});

/*
 * Zipcode checker for checkout, takes a single JSON object containing
 * {code: 'code to be checked}
 * The cleint must be authorized for this to be accessable
 * */

router.post('/zipcode', (req, res)=>{
    if (req.session.authorization){
        console.log('ZIP: zipcode lookup authorized');

        // the user is authorized -> allow post request

        var reqBody = req.body;

        if (typeof reqBody === "object"){
            // the object should be automatically parsed by Node, so that should be a good way to check if it's valid

            if (typeof reqBody.zip === "string"){
                var zipCodeError = false; // set internal flag to see if the zipcode fetch errors out

                try {
                    var lookup = zipcodes.lookup((reqBody.zip.length === 5) ? reqBody.zip : '');
                    // only allow zip code if it's exactly 5 characters long
                } catch(e){
                    // the zipcode package probably is not installed/configured
                    zipCodeError = true;
                }


                if (!zipCodeError){
                    // it's valid and there was no error
                    res.json(lookup);
                } else {
                    logger.warn(`ZIP: Zipcodes package is not configured. Autofill will not be completed.`);
                    res.sendStatus(500);
                }

            } else {
                console.log('ZIP: parsed JSON object is invalid');
                // it's not valid
                res.sendStatus(500);
            }
        } else {
            console.log('ZIP: request format is invalid');
            res.sendStatus(500);
        }
    } else {
        console.log('ZIP: UNAUTHORIZED REQUEST');
        res.sendStatus(403);
    }
});

/* RECEIPT PROCCESSING */

router.get('/receipt', (req, res) => {
    if (req.session.authorization && req.session.orderId){
        // the user is authorized and there is an active orderId

        // IMPORTANT set flag to reset session when revisiting the site
        req.session.reset = true;

        res.sendFile(path.join(rootDir, '/checkout/receipt.html'), {}, (err)=>{
            if (err){
                // something went wrong
                res.sendStatus(err.statusCode)
                logger.crit(`FILE: Unable to fetch checkout receipt page!`);
            }
        });// send the receipt file
    } else {
        // send forbidden message
        res.redirect('/'); // redirect
    }
});

router.post('/receipt', (req, res) => {
    if (req.session.authorization && req.session.orderId){
        // the user is authorized and there is an acrive orderId

        // make get request to API /order/:id
        API.request('GET', {
            auth: req.session.authorization,
            endpoint: '/order/' + req.session.orderId,
            onSuccess: (apiBody)=>{

                var objBody = JSON.parse(apiBody);
                objBody = objBody.message;

                if (typeof objBody === "object" && typeof objBody.data === "object" && typeof objBody.data[0] === "object"){
                    // it's contains a valid response -> check for items

                    objBody = objBody.data[0];

                    console.log(objBody);

                    if (typeof objBody.items === "object" && objBody.items !== {}){
                        // it has items and it's not empty -> begin processing before sending to the user

                        var itemsObj = objBody.items;
                        var itemArray = []; // the array object used for transmitting
                        var items = {}; // the object containing the response

                        var itemKeys = Object.keys(itemsObj);
                        var itemNode; // iterator for each item inside itemsObj
                        var i = itemKeys.length;

                        while (i--){
                            // process through each item
                            itemNode = itemsObj[itemKeys[i]]; // create itemNode based on the keyed value;
                            itemArray.push(itemNode); // push item node to array
                        }
                        // send the parsed array
                        res.json({
                            total: {
                                all: objBody.totalAmount,
                                sub: objBody.price,
                                tax: objBody.salesTax,
                                shipping: objBody.baseShipping
                            },
                            date: objBody.dateCreated,
                            orderId: objBody.clientOrderId,
                            currency: objBody.currencySymbol,
                            status: objBody.orderStatus,
                            cardType: objBody.cardType,
                            cardLast4: objBody.cardLast4,
                            items: itemArray
                        });

                    } else {
                        // it's not a valid response
                        console.log('RECEIPT: invalid response -> no items');
                        res.sendStatus(500);
                    }


                } else {
                    // it's not a valid response
                    console.log('RECEIPT: invalid response -> no data to be processed');
                    res.sendStatus(500);
                }

                // filter data and send user-safe data to the client

            },
            onFailure: (apiBody)=>{
                // something went wrong
                res.sendStatus(500);
                console.log(apiBody)
            }
        })

    } else {
        // send forbidden message
        res.sendStatus(403);
    }
});

// export router;
module.exports = router;
