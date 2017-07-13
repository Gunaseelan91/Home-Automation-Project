/**
 * @File-name : NetworkManager.js
 * @author : Gunaseelan.T
 * @File-Description : This file is generally about network management.
 **/

    /* Required */
    var config = require('config.json')('/opt/sp_automation_device/configuration.json'),
        logger = require("/opt/sp_automation_device/logger.js").getLogger(),
        childProcess = require('child_process'),
        exec = childProcess.exec,
        dns = config.dns_ip,    // Network check ping ip
        inProgress = false,     // Child process monitor flag
        fs = require('fs');
        
    /* Function to connect to the network */
        var NetworkManager = {     
            /* NetworkManager checkInternet  */ 
            checkInternet : function(callback){
                //logger.info("Network checkInternet accessed");         
                if(!inProgress){                   
                        inProgress = true;                           
                        /* PING DNS 8.8.8.8 */
                        exec('ping -c 3 -w 3 "'+dns+'"', function(err, result, code){
                            if(err){
                                logger.error("NetworkManager checkInternet PING failed");
                                inProgress = true;
                                callback(false);
                            }else{
                                logger.info("NetworkManager checkInternet PING success");
                                inProgress = false;
                                callback(true);
                            }
                        });
                }
            },
            
            /* NetworkManager reConnect  */ 
            reConnect : function(){                
                    /* Checks for the avaliable of 3G Dongle */
                    if(fs.existsSync(config.modem_path)){                          
                        /* Network dongle child process execution */
                        exec('/opt/sakis3g/sakis3g --sudo "connect"', function(err, result, code){
                                if(err){
                                    logger.error("Network Dongle reConnect error : "+err);
                                }else{
                                    logger.info("Network Dongle connection result : "+result);
                                }
                                inProgress = false;
                        });
                    }else{
                        inProgress = false;
                        logger.info("Network dongle not detected else check LAN cable");
                    }
            },
        }
    
    // Exporting module
    module.exports = NetworkManager;
    

