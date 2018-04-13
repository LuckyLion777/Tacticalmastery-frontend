/**
 * Created by flynn on 20/07/17.
 */

// This file contains the API keys/everything that is needed for the requests to be made, such as keys

module.exports = {
    CLIENT_ID: '4xSp2YARx6fISTQfRQ0XP4RcehT1PO3P',
    CLIENT_SECRET: 'g73DC8hskXvuA6rtgO9KaY4WpvUpW5iex8MDpxx1bSh__qVL0iTBuinEoCW7EdpC',
    AUTH_URL: 'https://starlightgroup.auth0.com/oauth/token',
    API_URL: 'https://api.tacticalmastery.com',
    PROMOTIONAL: ['battery', 'headlamp'].concat(['END']), // array containing ordered string of valid promotional urls
    LOG_KEY: '3d96b04f-dcc6-4947-bde0-d4dee8c6aea1', // auth for le_node
    FRONT_CSS_SHA: "%INJECT_PRELOAD_CSS_SHA%" // entry point for
}