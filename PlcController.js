/**
 * @File-name : PlcController.js
 * @author : Gunaseelan.T
 * @File-Description : This file is generally about PLC to Pi data communication.
 **/

    /* Required */
    var config = require('config.json')('/opt/sp_automation_device/configuration.json'),
        logger = require("/opt/sp_automation_device/logger.js").getLogger(),
        WebApi = require("/opt/sp_automation_device/WebApi.js"),
        dataJson = require('/opt/sp_automation_device/data.json'),
        childProcess = require('child_process'),
        BitArray = require('node-bitarray'),
        jsModbus = require('jsmodbus'),
        macAddress = require('getmac'),       
        async = require('async'),       
        exec = childProcess.exec;
    
    /* Global variables */
    var startRegister = config.register.start_address,      // Register start address
        stopRegister = config.register.end_address,         // Register stop address
        startCoil = config.coil.start_address,          // Coil 1 start address
        stopCoil = config.coil.end_address,             // Coil 1 stop address
        reconnectInterval = config.socket.timeout,          // Socket reconnect timeout
        PLC_HOST = config.plc.host,                         // Socket HOST url
        PLC_PORT = config.plc.port,                         // Socket HOST port
        modbus_client;                                      // Modbus object
        
        /*  NOTE:            
            Auto/Manual JSON format
            {"mac":"b8:27:eb:49:ba:34","event":"control","name":"mode","status":"1"} ---> for auto mode
            {"mac":"b8:27:eb:49:ba:34","event":"control","name":"mode","status":"1"} ---> for manual mode
        */
    
    /* create a modbus TCP client */
        var tcp_connect = function(){    
            logger.info("MODBUS TCP invoked....");
            
            /* Modbus_client Client Begin */
            modbus_client = jsModbus.createTCPClient(PLC_PORT, PLC_HOST, function(err){
                if(err){
                    logger.error("MODBUS TCP invoke error : "+err);
                    setTimeout(tcp_connect, reconnectInterval);
                }
            });
            
            /* Modbus_client Client close event */
            modbus_client.on('close', function(){
                logger.info("Modbus_client Client close");
                //modbus_client.reconnect();
            });
        }
    /* tcp_connect function call */
        tcp_connect(); 
    
    /* PLC Controller function */
        var Controller = {    
            /* function to get datas from PLC */
            getData: function(){       
                logger.info("PlcController getData accessed");        
            
                var coil_data;
                var switch_data;
                var resp_data;
                var service_state;
                var auto_mode;
                
                /* Modbus Ping Module */
                 modbusPing(function(result){                
                    logger.info("modbus_tcp state : "+result);                
                    if(result){                   
                        /* Modbus read coil */
                        modbus_client.readCoils(startCoil, stopCoil, function(resp, err){
                            if(err){
                                logger.error("modbus_tcp coil read error : "+err);
                            }else{
                                //logger.info(resp.coils);
                                coil_data = resp.coils;                        
                                /* Modbus read Input Register */
                                logger.info("Registery address response : ",startRegister, stopRegister)
                                modbus_client.readInputRegister(startRegister, stopRegister, function(resp, err){
                                    if(err){
                                        logger.error("modbus_tcp Input Register 2 read error : "+err);
                                    }else{
                                        console.log("Registery output : " , resp);
                                        var dec_Data = resp.register;
                                        var resp_data = [];
                                        for(var index=0; index < stopRegister; index++){
                                            console.log("Registery " + index + ": " , BitArray.fromNumber(dec_Data[index]).toJSON());
                                            resp_data[index] = BitArray.fromNumber(dec_Data[index]).toJSON();
                                        }

                                    // To check Auto/Manual mode status
                                        // if(resp_data[dataJson.auto_manual.word_position][dataJson.auto_manual.read_address]){
                                        //     auto_mode = 1;
                                        // }else{
                                        //     auto_mode = 0;
                                        // }

                                    var service_state = null;

                                    var switch_data = [resp_data[dataJson.low_level_sensor.word_position][dataJson.low_level_sensor.read_address] || 0,
                                                resp_data[dataJson.high_level_sensor.word_position][dataJson.high_level_sensor.read_address] || 0];
                                    
                                    // To check wether device is in "Service" mode or "Backwash/Rinsing" mode
                                        if(resp_data[dataJson.service.word_position][dataJson.service.read_address] == 1){
                                            service_state = "Service";
                                        }else if(resp_data[dataJson.backwash_rinsing.word_position][dataJson.backwash_rinsing.read_address] == 1){
                                            service_state = "Backwash/Rinsing";
                                        }else{
                                            service_state = "UnKnown";
                                        }
                                    
                                    // DataPost function access
                                        dataPost(coil_data, switch_data, service_state, result);
                                    }
                                });                                                             
                            }
                        });
                    }else{
                        logger.info("PLCcontroller PLC OFF accessed");
                        // DataPost function access
                        dataPost(coil_data, switch_data, service_state, auto_mode, result);  
                    }
                });  
            },
            
            /* function to feed data to PLC */
            putData: function(key, data){
                logger.info("PlcController putData acccessed");                      
                var value = dataJson[key].write_address[data.toString()];  

                logger.info("PlcController putData Key:"+key+" Address:"  + value);                
    
                /* Queue function to push data */
                queue.push({values:value}, function(err){
                    if(err){
                        logger.error("PlcController Process execution error : "+err);
                    }else{
                        logger.info("PlcController Process execution Completed");
                    }            
                });
            },
        }
    
    /* Queue function setup */
        var queue = async.queue(function(task, callback){        
             logger.info("PlcController Queue function accessed");
             logger.info("PlcController Queue Length : "+queue.length());
         
                 /* Modbus Ping Module */      
                 modbusPing(function(result){                
                     logger.info("modbus_tcp state : "+result);                
                     if(result){
                         logger.info("Modbus write accessed");
                         /* Modbus write register */
                         modbus_client.writeSingleRegister(0, task.values, function(resp, err){                   
                             if(err){
                                 logger.error("Modbus write error : "+err);
                                callback(new Error("Modbus write error : "+err));
                             }else if(resp){
                                logger.info("Modbus write response : "+resp);

                                //Time out for set puls like input to PLC and mack all the inputs to 0
                                //This will work like a push button input for PLC.
                                setTimeout(function(){
                                    modbus_client.writeSingleRegister(0, 0, function(resp, err){
                                        Controller.getData(function(){
                                            callback(); 
                                        });                    
                                        Controller.getData();
                                        callback(); 
                                    });
                                }, 30);                  
                             }  


                         });
                     }else{
                        Controller.getData();
                        callback(new Error("ModBus TCP Communication error"));
                     }
                 });            
             logger.info("PlcController Queue function exit");  
         },2);
    
    /* Queue function to drain */
        queue.drain = function(){
            if(queue.length() == 0){
                    logger.info("PlcController Queue Length : "+queue.length());
                    logger.info("PlcController All Process execution Completed");
            }
        }
    
    /* PING TCP MODBUS IP */    
        function modbusPing(callback){
            exec('ping -c 1 "'+PLC_HOST+'"', function(err, result, code){
                if(err){
                    logger.error("MODBUS Communication ERROR");
                    callback(false);
                }else{
                    //logger.info("MODBUS Communication success");
                    callback(true);
                }
            });
        }
        
    /* dataPost function */    
        function dataPost(coil_data, register_data, switch_data, service_state, auto_mode, result){
            /* Get Mac Address */
                macAddress.getMac(function(err, macAddress){
                    if(err){
                        logger.error("PLCcontroller MAC error : "+err);
                    }else{
                        logger.info("PLCcontroller dataPost accessed");
                        logger.info(macAddress);
                        logger.info(coil_data);
                        logger.info(register_data);
                        logger.info(switch_data);
                        logger.info(service_state);
                        logger.info(auto_mode);
                        logger.info(result);
                        try{
                            WebApi.sendData(macAddress, coil_data, register_data, switch_data, service_state, auto_mode, result);                                      
                        }catch(e){
                            logger.error("Error on sending data.", e.message);
                            logger.error(e.stack);
                        }
                    }
                });   
        }
    
    // Exporting module
    module.exports = Controller;

