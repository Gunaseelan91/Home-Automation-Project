/**
 * @File-name : crashLog.js
 * @author : Gunaseelan.T
 * @File-Description : This file is generally about crash report logging.
 **/

    /* Required */
    var config = require('config.json')('/opt/sp_automation_device/configuration.json'),
        logger = require("/opt/sp_automation_device/logger.js").getLogger(),    
        WebApi = require("/opt/sp_automation_device/WebApi.js"),
        childProcess = require('child_process'),
        exec = childProcess.exec,
        fs = require('fs');
  
    /* crashLog execution */
    try{    
        var crashLog = {
                /* crashLog execute function */
                execute : function(){
                        logger.info("crashLog execution accessed");                                                     
                        var filePath = config.crash_log;
                        logger.info("crashLog Accessing log file......"+filePath);                      
                        /* Checks for the existence of the specific */
                        if(fs.existsSync(filePath)){                                
                                var stats = fs.statSync(filePath);
                                var fileSizeInBytes = stats["size"];
                                logger.info("crashLog data size in bytes : "+fileSizeInBytes);
                                /* Checks wether the log file is empty or not */                              
                                if(fileSizeInBytes > 0){
                                        logger.info("crashLog file has valid datas");
                                        /* POST logs to log_server */
                                        WebApi.restPost(filePath, fileSizeInBytes, function(error){
                                                if(error){
                                                        logger.error("crashLog WebApi rest POST error : "+error);
                                                        crashLog.execute();
                                                }else{
                                                       logger.info("crashLog REST Success");
                                                        exec('cat /dev/null > "'+filePath+'"', function(err, result, code){
                                                                if(err){
                                                                    logger.error("crashLog empty file error : "+err);
                                                                }else{
                                                                    logger.info("crashLog file empty");
                                                                }
                                                        }); 
                                                }
                                        });
                                }else{
                                  logger.info("crashLog file already empty");
                                }
                        }else{                         
                                logger.error("crashLog file access error");
                                //crashLog.execute();
                        }               		 	
                },
        }
    }catch(ex){
        logger.error("crashLog exception : "+ex);
    }
        
        // Exporting module
        module.exports = crashLog;
