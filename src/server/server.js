/**
 * Created by flynn on 18/07/17.
 */

var https = require('https');
var cypto = require('crypto');
var express = require('express');
var cookieSession = require('cookie-session');
var bodyParser = require('body-parser');
var request = require('request');
var path = require('path');
var compression = require('compression');
var helmet = require('helmet');

var config = require('./config'); // import configuration
var API = require('./api'); // import API request handler
var logger = require('./logger'); // import le_node logger

var checkout = require('./routes/checkout'); // import checkout router

// create main app instance
var app = express();

/* security middleware settings */

app.disable('x-powered-by'); // hide server type from browser
app.use(helmet.frameguard({ action: 'deny' })); // prevent frame-based click attacks

// generate new random new nonce every request to '/'
/*
app.use('/', function (req, res, next) {
    res.locals.nonce = cypto.randomBytes(16).toString('hex');
    next();
});
*/


app.use(helmet.contentSecurityPolicy({
    directives: {
        defaultSrc: ["'self'", 'blob:', 'www.google-analytics.com', 'fonts.gstatic.com', 'embedwistia-a.akamaihd.net', '*.wistia.com'], //only allow scripts from these locations
        scriptSrc: ["'self'", 'www.google-analytics.com', '*.wistia.com', "'sha256-7F+ArVTRKfFNaTXVdQGIAmynDBEFSSDBdk5Y6DgKgg0='", "'sha256-RrMcQnExWXSRV4FEMca5u3F5w7dLuNepPLqnxjokhlw='"], // "'sha256-WOdyjnwZ/0oDk0vgIwIWnzGFp8u4u8JjDeHTyY7qOsc='"],
        styleSrc: ["'self'", 'fonts.googleapis.com', 'fonts.gstatic.com', /%INJECT_PRELOAD_CSS_SHA%/], // only add the css sha if it exists
        imgSrc: ["'self'", 'www.google-analytics.com'] //, 'fast.wistia.com'],
    }
}));

/* middleware */

app.use(compression()); // use compressor
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

// link static assets starting at current directory (for CSS, JS, ect);
// The above line of code brings the assets folder down to the app root, so that users don't have global file access
app.use(express.static(path.join(__dirname, '/public/assets')));

const sixtyDaysInSeconds = 5184000;

// https only

app.use(helmet.hsts({
    maxAge: sixtyDaysInSeconds
}));

// https://helmetjs.github.io/docs/hpkp/
app.use(helmet.hpkp({
    maxAge: 86400, // 1 day
    sha256s: [
// generated on 23 march 2017 - works ok for https://www.tacticalmastery.com/
// TODO Change this on 19JUL17
        'URugOC1mFdnhyb05zsPO8jqB4Yz7vsjsuWduMaxbtr0=',
// New keys for AWS
        '/rOi04SYuzMshhGZ6+khY73JJ57yRhJ15yc0/bq4hhY=',
        'JSMzqOOrtyOT1kmau6zKhgT676hGgczD5VMdRMyJZFA=',
        '++MBgDH5WGvL9Bcn5Be30cRcL0f5O+NyoXuWtQdX1aI=',
// New keys for Incapsula
        'JyZlwKH8UbjEN7xB1YjFBVxQfZpedhLS2Bdk0WCmRmA=',
        '+VZJxHgrOOiVyUxgMRbfoo+GIWrMKd4aellBBHtBcKg=',
        'K87oWBWM9UZfyddvDfoxL+8lpNyoUB2ptGtn0fv6G2Q=',
    ],
}));

// https redirect
app.use((req, res, next) => { // redirect from http to https
    console.log(req.hostname);
    if (req.hostname !== 'localhost') {
        // it's not on localhost so redirect to https
        const hostname = req.hostname || 'tacticalmastery.com';
        if (req.headers['x-forwarded-proto'] !== 'https') {
            res.redirect(`https://${hostname}${ req.url }`); // redirect to https
        } else {
            next(); // it's already https so proceed to next steam/request
        }
    } else {
        next(); // it's on localhost so ignore insecure connection
    }
});

// begin implmentation of cookie middleware
app.use(cookieSession({
    name: 'session',
    keys: [config.CLIENT_SECRET],
    // Cookie Options
    maxAge: 45 * 60 * 1000 // 30 minutes
}));

/*
 * SESSION VARIABLES
 * req.session.authorization = access_token; {string}
 * req.session.lead = true || false {boolean}
 * req.session.firstName {string}
 * req.session.lastName {string}
 * req.session.emailAddress {string}
 * req.session.firstName {string}
 *
 * */

// create checkout router
app.use('/checkout', checkout);

// Handle redirect for old links
app.get('/tacticalsales/tm3.html', (req, res) => {
    res.redirect('/');
});

app.get('/tacticalsales', (req, res) => {
    res.redirect('/');
});

app.get('/19b44c9a7531c81719c8fc9a2c82aab6bf9adea096749e1994c46b828a0090f8.txt', (req, res) => {
    res.sendFile(path.join(__dirname, '/public/19b44c9a7531c81719c8fc9a2c82aab6bf9adea096749e1994c46b828a0090f8.txt'));
});

// html handling for the front page
app.get('/', function(req, res) {
    var session = req.session;

    // the session data needs to be reset
    if (session.reset || !session.authorization || !session.orderId){
        console.log('reset session');

        session.authorization = null; // clear the authorization token
        session.orderId = null; // clear the orderId
        session.upsell = null; // reset upsell flag
        session.autofilled = null; // clear the autofiller flag

        //ToDO: extend the lifetime of the cookie (or find a way to completely destroy and recreate the session)

        session.reset = false; // the session variables have been reset, clear the flag to prevent accidental resubmits
    }

    console.log(session);

    // send the html file
    res.sendFile(path.join(__dirname, '/public/index.html'), {}, (error) => {
        if (error){
            logger.crit('Could not resolve front page!');
        }
    });
});

// post handler for subscription box submission
app.post('/', (req, res) =>{
    // create session ID

    console.log('### LEAD FORM SUBMISSION ###');

    var session = req.session; // create reference to session

    console.log(req.body)

    if (typeof req.body === "object"){
        var fullName = req.body.contactModalName;

        session.lead = {}; // clear/initialize the contact info

        session.lead.firstName = fullName.substr(0, fullName.indexOf(' '));
        session.lead.lastName = fullName.substr(fullName.indexOf(' ') + 1).trim(); // source -> (https://stackoverflow.com/a/10272822)

        // persistent email and phone data (store to autofill the forms on the checkout)
        session.lead.emailAddress = req.body.contactModalEmail;
        session.lead.phoneNumber = req.body.contactModalPhone;

        if (!session.authorization){
            // a new session ID has not been made yet (so it's safe to proceed)
            // start API call for authentication token
            // persistent name data (store to autofill the forms on the checkout)


            // fetch bearer token before accessing API
            API.getBearerToken({
                onSuccess: (BearerToken) =>{
                    session.authorization = BearerToken; // set the session's bearer token

                    // submit the first lead with the newly generated token
                    API.request('POST', {
                        auth: session.authorization,
                        endpoint: '/lead',
                        body: {
                            'firstName': session.lead.firstName,
                            'lastName': session.lead.lastName,
                            'emailAddress': session.lead.emailAddress,
                            'phoneNumber': session.lead.phoneNumber
                        },
                        onSuccess: (apiBody) =>{
                            // push the orderId to the session

                            var responseObj = JSON.parse(apiBody);

                            session.orderId = responseObj.orderId;
                            res.json({success: true}); // send valid response
                        },
                        onError: (apiError) =>{
                            console.log('API: lead push failed');
                            console.log(apiError)
                            res.sendStatus(500);
                        }
                    });
                },
                onFailure: ()=> {
                    res.sendStatus(500); // something went wrong
                }
            });
        } else {

            console.log(session);

            API.request('POST', {
                auth: session.authorization,
                endpoint: '/lead',
                body: {
                    'firstName': session.lead.firstName,
                    'lastName': session.lead.lastName,
                    'emailAddress': session.lead.emailAddress,
                    'phoneNumber': session.lead.phoneNumber
                },
                onSuccess: (apiBody) => {
                    var responseObj = JSON.parse(apiBody);
                    session.orderId = responseObj.orderId;  // push the orderId to the session

                    res.json({success: true}); // send valid response
                },
                onError: (apiError) => {
                    console.log('API: lead push failed');
                    console.log(apiError);
                    res.sendStatus(500);
                }
            });
            // uid already exists -> redirect perhaps
        }
    } else {
        // it's an invalid response -> do something
    }
});

app.listen(8081); // start express server

