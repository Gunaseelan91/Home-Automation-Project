/**
 * @File-name : scheduler.js
 * @author : Gunaseelan.T
 * @File-Description : scheduler.js
 **/

    /* Required */
    var config = require('config.json')('/opt/sp_automation_device/configuration.json'),
        logger = require("/opt/sp_automation_device/logger.js").getLogger(),     
        dateFormat = require('dateformat'),
        macAddress = require('getmac'),
        rest = require('restler'),       
        fs = require('fs'),
        now = new Date(),        
        log_server = config.log_server,
        formatDate = config.schedule.date_format;
        

    /* Scheduler logic function call */
        function scheduler_logics(){                         
            /* Get device MAC address */
            macAddress.getMac(function(err, macAddress){
                if(err){
                    logger.error("Scheduler Mac error : "+err);
                }else{                         
                    var logFile = config.data_log;
                    var dateSuffix = dateFormat(now,formatDate);
                    var filePath = logFile+"-"+dateSuffix;
                    logger.info("Scheduler accessing log file......"+filePath);
                    
                    /* Checks for the existence of the specific */
                    if(fs.existsSync(filePath)){                                
                        var stats = fs.statSync(filePath);
                        var fileSizeInBytes = stats["size"];
                        logger.info("log data size in bytes : "+fileSizeInBytes);
                        /* Checks wether the log file is empty or not */                              
                        if(fileSizeInBytes > 0){
                            logger.info("Scheduler log file has valid datas");
                            /* POST logs to log_server */
                                rest.post(log_server,{
                                    multipart: true,
                                        data: {
                                            'mac': macAddress,
                                            'log_file': rest.file(filePath, null, fileSizeInBytes, 'utf8', 'application/text')
                                                                // path, filename, fileSize, encoding, contentType
                                        }
                                }).on('complete', function(data){
                                    logger.info("Scheduler REST Complete : "+data);
                                    //process.exit();
                                }).on('error', function(err){ 
                                    logger.error("Scheduler REST error : "+err);
                                    setTimeout(scheduler_logics, 5000);
                                });
                        }else{
                            logger.error("Scheduler log file empty");
                        }
                    }else{                         
                        logger.error("Scheduler file does not exists");
                    }               		 	
                }
            });
        }
        
    scheduler_logics();
