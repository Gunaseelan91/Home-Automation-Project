  /**
   * @File-name : WebApi.js
   * @author : Gunaseelan.T
   * @File-Description : This file is generally about Pi to Cloud HTTP communication.
   **/
  
  /* Required */
    var config = require('config.json')('/opt/sp_automation_device/configuration.json'),
        logger = require("/opt/sp_automation_device/logger.js").getLogger(),     
        key = require('/opt/sp_automation_device/data.json'),
        macAddress = require('getmac'),
        request = require('request'),
        rest = require('restler');
    
  /* Global variables */
  var log_server = config.log_server,       // WebApi LOG POST url
      POST_URI = config.webapi_url,         // WebApi DATA POST url
      operation_state,                      // operation state variable
      operation_temp,                       // operation data temporary variable
      switch_data,                          // switch data variable
      switch_temp,                          // switch data temporary variable                             
      coil_data,                            // Coil data variable
      coil_temp,                            // Coil data temporary variable
      flag;                                 // WebApi POST status flag
      
    var multiport_valve_status_temp;         // multiport_valve_status local variable
    var high_sensor_status_temp;             // high_sensor_status local variable
    var low_sensor_status_temp;              // low_sensor_status local variable
    var mode_state_temp;                     // mode_state local variable
      
  /* Comparing arrays to validate change in states*/
    function compareArray(){
        if((coil_data.length == coil_temp.length) && (switch_data.length == switch_temp.length)){
            for(var i = 0; i < coil_data.length; i++){
                if(coil_data[i] != coil_temp[i]){
                    return false;
                }
            }
            for(var i = 0; i < switch_data.length; i++){
                if(switch_data[i] != switch_temp[i]){
                    return false;
                }
            }          
            if(operation_state != operation_temp){
                  return false;
            }
            return true;
        }
    }

  /* WebApi function*/
    var WebApi = {
        /* WebApi sendData function*/
        sendData: function(mac, cdata, sdata, state, plc_state){
            
            var data;  // WebApi data
            
        /* WebApi POST Header*/
            var header = {
                'Content-Type': 'application/json',
            };
        logger.info('Web API send data:');
		// logger.info(mac);
		// logger.info(cdata);
		// logger.info(sdata);
		// logger.info(state);
		// logger.info(mode);
		// logger.info(plc_state);

            if(plc_state){
                operation_state = state;
                logger.info("state :",operation_state);
                switch_data = sdata;
                logger.info("switch :",switch_data);
                coil_data = cdata;
                logger.info("coil :",coil_data);
		
                var multiport_valve_status;         // multiport_valve_status local variable
                var high_sensor_status;             // high_sensor_status local variable
                var low_sensor_status;              // low_sensor_status local variable
                var mode_state;                     // mode_state local variable
                
                /* Auto/manual status */
                    // if(mode == 1){
                    //     mode_state = true;
                    // }else if(mode == 0){
                    //     mode_state = false;
                    // }
                    mode_state = cdata[key.auto_manual.read_address];
                    logger.info("Auto Manual: "+ mode_state);
                    
                /* Low level sensor status */
                    if(switch_data[0] == 1){
                        low_sensor_status = true;
                    }else{
                        low_sensor_status = false;
                    }
                    logger.info(low_sensor_status);
                
                /* High level sensor status */
                    if(switch_data[1] == 1){
                        high_sensor_status = true;
                    }else{
                        high_sensor_status = false;
                    }
                     logger.info(high_sensor_status);
                
                /* Multiport valve status */
                    if((operation_state == "Service") || (operation_state == "Backwash/Rinsing")){
                            multiport_valve_status = true;
                    }else{
                            multiport_valve_status = false;
                    }
                    logger.info(multiport_valve_status);
                    
			logger.info(key.compressor.name);
			logger.info(coil_data[key.valve_3.read_address]);


                    data = JSON.stringify({
                        'mac': mac,
                        'operation': operation_state,
                        "coils": [{
                            "name": key.compressor.name,
                            "status": coil_data[key.compressor.read_address],
                            "on_message": key.compressor.on_message,
                            "off_message": key.compressor.off_message
                        }, {
                            "name": key.water_pump_1.name,
                            "status": coil_data[key.water_pump_1.read_address],
                            "on_message": key.water_pump_1.on_message,
                            "off_message": key.water_pump_1.off_message,
                            "valves": [{
                                "name": key.valve_1.name,
                                "status": coil_data[key.valve_1.read_address],
                                "on_message": key.valve_1.on_message,
                                "off_message": key.valve_1.off_message
                            }, {
                                "name": key.valve_2.name,
                                "status": coil_data[key.valve_2.read_address],
                                "on_message": key.valve_2.on_message,
                                "off_message": key.valve_2.off_message
                            }]
                        }, {
                            "name": key.water_pump_2.name,
                            "status": coil_data[key.water_pump_2.read_address],
                            "on_message": key.water_pump_2.on_message,
                            "off_message": key.water_pump_2.off_message,
                            "valves": [{
                                "name": key.valve_3.name,
                                "status": coil_data[key.valve_3.read_address],
                                "on_message": key.valve_3.on_message,
                                "off_message": key.valve_3.off_message
                            }, {
                                "name": key.valve_4.name,
                                "status": coil_data[key.valve_4.read_address],
                                "on_message": key.valve_4.on_message,
                                "off_message": key.valve_4.off_message
                            }]
                        }, {
                            "name": key.multiport_valve.name,
                            "status": multiport_valve_status,
                            "on_message": key.multiport_valve.on_message,
                            "off_message": key.multiport_valve.off_message
                        }, {
                            "name": key.low_level_sensor.name,
                            "status": low_sensor_status,
                            "on_message": key.low_level_sensor.on_message,
                            "off_message": key.low_level_sensor.off_message
                        },{
                            "name": key.high_level_sensor.name,
                            "status": high_sensor_status,
                            "on_message": key.high_level_sensor.on_message,
                            "off_message": key.high_level_sensor.off_message
                        },{
                            "name": key.ozonator.name,
                            "status": coil_data[key.ozonator.read_address],
                            "on_message": key.ozonator.on_message,
                            "off_message": key.ozonator.off_message
                        },{
                            "name": key.water_pump_3.name,
                            "status": coil_data[key.water_pump_3.read_address],
                            "on_message": key.water_pump_3.on_message,
                            "off_message": key.water_pump_3.off_message,
                            "valves": [{
                                "name": key.valve_4.name,
                                "status": coil_data[key.valve_4.read_address],
                                "on_message": key.valve_4.on_message,
                                "off_message": key.valve_4.off_message
                            }]
                        }, {
                            "name": key.counter_current.name,
                            "status": coil_data[key.counter_current.read_address],
                            "on_message": key.counter_current.on_message,
                            "off_message": key.counter_current.off_message
                        }, {
                            "name": key.jacuzzi.name,
                            "status": coil_data[key.jacuzzi.read_address],
                            "on_message": key.jacuzzi.on_message,
                            "off_message": key.jacuzzi.off_message
                        }],
                        "settings": [{
                            "name": 'mode',
                            "status": mode_state,
                            "plc_state": plc_state
                          }]
                    });

                    logger.info(data);
                
                    var options = {
                        url: POST_URI,
                        method: 'POST',
                        headers: header,
                        body: data
                    };
                    
                    if((coil_temp != null) && (switch_temp != null) && (operation_temp != null)){
                        if(!compareArray()){
                            postData(options);          // POST function access
                        }
                    }else{
                        postData(options);              // POST function access
                    }                    
                    operation_temp = operation_state;   // Assigning operation_state to temporary variable       
                    switch_temp = switch_data;          // Assigning switch_data to temporary variable
                    coil_temp = coil_data;              // Assigning coil_data to temporary variable
                    multiport_valve_status_temp = multiport_valve_status;
                    high_sensor_status_temp = high_sensor_status;             
                    low_sensor_status_temp = low_sensor_status;
                    mode_state_temp = mode_state;                     
            }else{
             
                logger.error("PLC disconnected"); 
                data = JSON.stringify({
                    'mac': mac,
                    'operation': operation_temp,
                    "coils": [{
                        "name": key.compressor.name,
                        "status": coil_temp[key.compressor.read_address],
                        "on_message": key.compressor.on_message,
                        "off_message": key.compressor.off_message
                    }, {
                        "name": key.water_pump_1.name,
                        "status": coil_temp[key.water_pump_1.read_address],
                        "on_message": key.water_pump_1.on_message,
                        "off_message": key.water_pump_1.off_message,
                        "valves": [{
                            "name": key.valve_1.name,
                            "status": coil_temp[key.valve_1.read_address],
                            "on_message": key.valve_1.on_message,
                            "off_message": key.valve_1.off_message
                        }, {
                            "name": key.valve_2.name,
                            "status": coil_temp[key.valve_2.read_address],
                            "on_message": key.valve_2.on_message,
                            "off_message": key.valve_2.off_message
                        }]
                    }, {
                        "name": key.water_pump_2.name,
                        "status": coil_temp[key.water_pump_2.read_address],
                        "on_message": key.water_pump_2.on_message,
                        "off_message": key.water_pump_2.off_message,
                        "valves": [{
                            "name": key.valve_3.name,
                            "status": coil_temp[key.valve_3.read_address],
                            "on_message": key.valve_3.on_message,
                            "off_message": key.valve_3.off_message
                        }, {
                            "name": key.valve_4.name,
                            "status": coil_temp[key.valve_4.read_address],
                            "on_message": key.valve_4.on_message,
                            "off_message": key.valve_4.off_message
                        }]
                    }, {
                        "name": key.multiport_valve.name,
                        "status": multiport_valve_status_temp,
                        "on_message": key.multiport_valve.on_message,
                        "off_message": key.multiport_valve.off_message
                    }, {
                        "name": key.low_level_sensor.name,
                        "status": low_sensor_status_temp,
                        "on_message": key.low_level_sensor.on_message,
                        "off_message": key.low_level_sensor.off_message
                    },{
                        "name": key.high_level_sensor.name,
                        "status": high_sensor_status_temp,
                        "on_message": key.high_level_sensor.on_message,
                        "off_message": key.high_level_sensor.off_message
                    },{
                        "name": key.ozonator.name,
                        "status": coil_temp[key.ozonator.read_address],
                        "on_message": key.ozonator.on_message,
                        "off_message": key.ozonator.off_message
                    },{
                        "name": key.water_pump_3.name,
                        "status": coil_temp[key.water_pump_3.read_address],
                        "on_message": key.water_pump_3.on_message,
                        "off_message": key.water_pump_3.off_message,
                        "valves": [{
                            "name": key.valve_5.name,
                            "status": coil_temp[key.valve_5.read_address],
                            "on_message": key.valve_5.on_message,
                            "off_message": key.valve_5.off_message
                        }]
                    }, {
                        "name": key.counter_current.name,
                        "status": coil_temp[key.counter_current.read_address],
                        "on_message": key.counter_current.on_message,
                        "off_message": key.counter_current.off_message
                    }, {
                        "name": key.jacuzzi.name,
                        "status": coil_temp[key.jacuzzi.read_address],
                        "on_message": key.jacuzzi.on_message,
                        "off_message": key.jacuzzi.off_message
                    }],
                    "settings": [{
                        "name": "mode",
                        "status": mode_state_temp,
                        "plc_state": plc_state
                      }]
                });               
                logger.info(data);
                
                var options = {
                    url: POST_URI,
                    method: 'POST',
                    headers: header,
                    body: data
                };                       
                postData(options); 
            }            
        },
        
        // WebApi restPost function
        restPost: function(filePath, fileSizeInBytes, callback){
            // Get device MAC address 
            macAddress.getMac(function(err, macAddress){
                if(err){
                    logger.error("WebApi Mac error : ",err);
                    callback(err);
                }else{
                    // REST POST module //
                    rest.post(log_server,{
                    multipart: true,
                        data: {
                            'mac': macAddress,
                            'log_file': rest.file(filePath, null, fileSizeInBytes, 'utf8', 'application/text')
                                                // path, filename, fileSize, encoding, contentType
                        }
                    }).on('complete', function(data){
                        logger.info("WebApi REST Complete : ",data);
                        callback();
                    }).on('error', function(err){ 
                        logger.error("WebApi REST error : ",err);
                        callback(err);
                    });
                }
            });
        },
    }

  /* Posting data to cloud */
    function postData(data){
        /* try/catch exception handling */
        try{        
              /* WebApi POST module */
                request(data, function(error, response, body){
                    if(!error && response.statusCode == 200){
                        logger.info("WebApi POST complete");
                        logger.info("POST response body : ",body);
                    }else if(error){
                        logger.error("WebApi POST error : ",error);
                    }
                });
        }catch(error){
                logger.error("WebApi POST exception : ",error);
        }     
    }

  // Exporting module
  module.exports = WebApi;
