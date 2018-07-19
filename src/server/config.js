/**
 * Created by flynn on 20/07/17.
 */

// This file contains the API keys/everything that is needed for the requests to be made, such as keys

module.exports = {
    CLIENT_ID: '********************',
    CLIENT_SECRET: '*********************8',
    AUTH_URL: 'https://starlightgroup.auth0.com/oauth/token',
    API_URL: 'https://api.tacticalmastery.com',
    PROMOTIONAL: ['battery', 'headlamp'].concat(['END']), // array containing ordered string of valid promotional urls
    LOG_KEY: '*****************', // auth for le_node
    FRONT_CSS_SHA: "%INJECT_PRELOAD_CSS_SHA%" // entry point for
}
