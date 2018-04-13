/**
 * Created by flynn on 22/07/17.
 */

var config = require('./config'); // load configuration
var Logger = require('le_node'); // load constructor

// LogEntries logger
const logger = new Logger({
    token: config.LOG_KEY
});

module.exports = logger;