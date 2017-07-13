/**
 * @File-name : index.js
 * @author : Gunaseelan.T
 * @File-Description : index.js
 **/

    /* Required */
    var config = require('config.json')('/opt/sp_automation_device/configuration.json'),
        NetworkManager = require("/opt/sp_automation_device/NetworkManager.js"),
        logger = require("/opt/sp_automation_device/logger.js").getLogger(),
        Controller = require("/opt/sp_automation_device/PlcController.js"),
        RemoteExec = require("/opt/sp_automation_device/remoteExec.js"),
        crashLog = require("/opt/sp_automation_device/crashLog.js"),
        memwatch = require('memwatch-next'),
        macAddress = require('getmac'),
        SocketClient = require('ws'),
        fs = require('fs');
          
    /* Global variables */    
    var reconnectInterval = config.socket.timeout,  // Socket reconnect time interval
        WEBSOCKET_URI = config.socket.host,         // Socket host URI
        Timeout = config.plc.timeout,               // Data read timeout
        filePath = config.crash_log,                // Crash file path
        connectionState = false,                    // Timer connection state
        crash_report = true,                        // Crash report flag     
        socket_id = null,                           // Timer flag
        ping_interval,                              // Index module timout interval
        ws_count = 0,                               // Socket connecting state count
        mac,                                        // Device mac global variable
        ws;                                         // Websocket object
        
    logger.info("Index.js Service Initated..........!"); 
     
    /* index begin function */  
        function indexBegin(){   
            /* lookup for internet connection */           
            NetworkManager.checkInternet(function(result){        
                /* Checks for the Network state and WebSocket state */
                if(!result){
                    // Network Process
                    logger.error("Network not avaliable");
                    NetworkManager.reConnect();     // NetWork Dongle reConnect function access
                    
                    // Socket process
                    logger.info("Socket state : "+ws.readyState);
                    socket_reInitiate();    // Socket reConnect function access
                    
                }else{
                    // Network Process
                    logger.info("Network avaliable");
                    Controller.getData();   // PlcController getData function access
                    
                    // Crash report process
                    if(crash_report){           // CrashLog Initial check during boot
                        logger.info("Index.js crashLog Initated..........");
                        crashLog.execute();     // CrashLog function access
                        crash_report = false;
                    }else{
                        // Socket process
                        logger.info("Socket state : "+ws.readyState);
                        if(((ws.readyState==2)||(ws.readyState==3)) || ((ws.readyState==1)&&(socket_id==null))){
                            logger.info("Network avaliable, Socket reconnect accessed");
                            logger.info("Socket ID : "+socket_id);
                            socket_reInitiate();    // Socket reConnect function access
                        }else if(ws.readyState == 0){
                            ws_count++;
                            logger.info("Socket INDEX connecting state count : "+ws_count);
                            if(ws_count > 3){
                                logger.info("Socket INDEX connecting state timeout");
                                ws_count = 0;
                                socket_reInitiate();      
                            }
                        }
                    }
                }	
            });  
            setTimeout(indexBegin, Timeout);    // indexBegin setTimeout
        }
    /* indexBegin function call */
        indexBegin();
    
    /* Websocket Client */
        var socket_connect = function(){
            //logger.info("Socket connection initiated");    
            ws = new SocketClient(WEBSOCKET_URI, { ca : fs.readFileSync('/home/pi/viswa.pem')});       // Socket communication begin
            
            /* Websocket Client open event */
            ws.on('open', function(){
                logger.info("Websocket Client open");
               /* Get device MAC address */
                    macAddress.getMac(function(err, macAddress){
                        if(err){
                             logger.error("Socket registration MAC error : "+err);
                        }else {
                            if(ws.readyState == 1){
                                 logger.info("Socket registration initated, Socket state : "+ws.readyState);
                                 ws.send(JSON.stringify({"event":"register","mac":macAddress}));
                                 mac = macAddress;
                            }else{
                                logger.error("Socket Registration error, Socket state : "+ws.readyState);
                                if(ws.readyState != 0){
                                    clearTimer();       // clear timer logic
                                    ws.terminate();     // WebSocket terminate function
                                    //socket_connect(); // WebSocket invoke function
                                }
                            }
                        }
                    });       
            });
        
            /* Websocket Client message event */
            ws.on('message', function(message){
                try{
                    logger.info("Websocket Client received : "+message);
                        var json = JSON.parse(message);        
                        // checks for event and mac address  
                        if(json.mac == mac){ 
                                if(json.event == "control"){ 
                                    logger.info("Controller Data: ");
                                    logger.info(json);
                                    var data = json.data;
                                        if (data) {
                                                Controller.putData(data.name, data.status);     // PlcController putData function access
                                        }            
                                }else if(json.event == "TerminalInit"){
                                    RemoteExec.createTerminalSession(json);      // RemoteExec function access
                                    
                                } 
                        }else{
                               if(json.accepted == true){
                                    logger.info("Device registered..........");
                                    ws_count = 0;
                                    if(json.interval){
                                        ping_interval = json.interval;
                                        connectionState = true;
                                        clearTimer();
                                        startTimer((ping_interval+config.additional_time)*1000);
                                    }else{
                                        logger.error("PING interval undefined");
                                    }
                                }else{
                                    logger.error("Not a valid device (or) Unregistered device");
                                }
                        }
                }catch(err){
                    logger.error("Socket PARSE exception : "+err);
                }
            });
            
            /* Websocket Ping event */
            ws.on('ping', function(data){
                logger.info("Websocket ping data : "+data);
                //logger.info("PING timer interval in MilliSec : ",((ping_interval+config.additional_time)*1000));
                connectionState = true;
                clearTimer();
                startTimer((ping_interval+config.additional_time)*1000);
            });
            
            /* Websocket Client error event */
            ws.on('error', function(){
                logger.error("Websocket Client error");
                //socket_reInitiate();
		setTimeout(socket_connect(), 1000); 
            });
            
            /* Websocket Client close event */
            ws.on('close', function(){
                logger.info("Websocket Client close");
                socket_reInitiate();       
            });    
        }
    /* socket_connect function call */
        socket_connect();
              
    /* Websocket Timer Start function */
        function startTimer(interval){
            logger.info("Start Timer logic accessed");
            try{
                socket_id = setInterval(function(){
                    // checks the socket connection state
                    //logger.info("Start Timer state : "+connectionState);
                    if(connectionState){
                        logger.info("Start Timer Logic Invoked");
                        connectionState = false;
                    }else{
                        //logger.info("Start Timer Clear Logic Invoked");
                        socket_reInitiate();
                    }
                },interval);
            }catch(ex){
                logger.error("Start Timer exception : "+ex);
            }
        }
        
    /* Websocket Timer Clear function */ 
        function clearTimer(){           
            if(socket_id != null){
                logger.info("Clear Timer logic accessed");
                clearInterval(socket_id);
                socket_id = null;
            }else{
                logger.info("Clear Timer Logic ID NULL");
            }
        }
    
    /* socket_reInitiate function */ 
        function socket_reInitiate(){
            logger.info("Socket_reInitiate function accessed");
            clearTimer();
            ws.terminate();
            socket_connect();
        }
        
    /* crashWrite function */ 
        function crashWrite(data){
            logger.info("Index crashWrite function accessed");
            fs.writeFile(filePath, data, function(err){
                if(err){
                    logger.error("Index crashWrite file error : "+err);
                }else{
                    logger.error("Index crash report captured");
                    process.exit();    
                }
            });
        }
        
    /* To capture uncaughtExceptions */
        process.on('uncaughtException', function(err){            
            crashWrite("--------Index UncaughtException detected--------- : "+err);
        });
    
    /* To capture SIGINT */
        process.on("SIGINT", function(){
            crashWrite("--------Index SIGINT error---------");
        });
    
    /* To capture SIGBUS error */
        process.on("SIGBUS", function(){
            crashWrite("--------Index SIGBUS error---------");
        });
    
    /* To capture SIGSEGV error */
        process.on("SIGSEGV", function(){
            crashWrite("--------Index SIGSEGV error---------");
        });
    
    /* To capture SIGSEGV error */
        process.on("exit", function(){
            logger.error("------Index.js application exit------ : ");
        });
    
    /* Memory leak detection */
        memwatch.on('leak', function(info){
            //logger.error("---------Index MEMORY LEAK DETECTED---------- : "+info);
            crashWrite("--------Index MEMORY LEAK DETECTED---------: "+info);
        });
    
    /* Heap Usage detection */
        memwatch.on('stats', function(stats){
            logger.info("HEAP Memory Usage : "+stats);
        });
        
