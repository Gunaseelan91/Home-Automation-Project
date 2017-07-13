/**
 * @File-name : logger.js
 * @author : Gunaseelan.T
 * @File-Description : logger.js
 **/

    /* Required */
    var config = require('config.json')('/opt/sp_automation_device/configuration.json'),
        winston = require('winston');
    
    /* logger module */
    var logger = new winston.Logger({
        transports: [
            new winston.transports.Console({
                handleExceptions : true,
                timestamp : true,
                level : 'debug'
            }),
            new winston.transports.File({
                filename : config.data_log,
                handleExceptions : true,
                timestamp : true,
                level : 'debug',
                json : false
            }),
        ],
        exitOnError : false
    });
    
    // Exporting module  
    exports.getLogger = function(){
      return logger;
    } ;