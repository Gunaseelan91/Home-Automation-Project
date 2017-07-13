/**
 * @File-name : RemoteExec.js
 * @author : Gunaseelan.T
 * @File-Description : This file is generally about remote execution.
 **/

/* Required */
var config = require('config.json')('/opt/sp_automation_device/configuration.json'),
    logger = require("/opt/sp_automation_device/logger.js").getLogger(),
    childProcess = require('child_process'),
    async = require('async'),
    TerminalClient = require('ws'),
    fs = require('fs'),
    pty = require('pty.js');

function TerminalSession(session_id, ws, controller) {
    this.session_id = session_id;
    this.socket = ws;
    this.controller = controller;
    this.initTerminal();
}

TerminalSession.prototype = {

    initTerminal: function() {
        this.term = pty.fork('/bin/bash', [], {
            name: 'xterm-color',
            cols: 80,
            rows: 30,
            cwd: process.env.HOME,
            env: process.env
        });
        this.attachEvents();
    },

    sendData: function(data){
        //console.log('Closed verification:', this.socket.closed, this.socket);
        try{
            if(!this.socket.closed){
                this.socket.send(JSON.stringify(data));
            }
        }
        catch(ex){
            console.log(ex, ex.message);
            this.close();
        }
    },

    attachEvents: function() {
        var term = this;
        this.term.on('data', function(data) {
            console.log('After Execution: ' + data);
            if(data != '\x04'){
                if (term.cmd_data != null) {
                    term.cmd_data.output = data;
                    term.cmd_data.event = 'OutPut';
                    term.sendData(term.cmd_data);
                } else if (data != null) {
                    term.sendData({
                        event: 'Init',
                        output: data,
                        session_id: term.session_id,
                        cmd: null,
                        cmd_script: null
                    });
                }
            }
        });
    },

    executeCommand: function(json) {
        this.cmd_data = json;
        this.term.write(json.cmd_script);
        if(json.cmd_script == 'exit'){
            this.controller.removeSession(json.session_id);
        }
    },

    close: function() {
        this.term.kill();
    }
}

/* Function to connect to the network */
var RemoteExec = {

    is_connected: false,
    max_terminal_count: 2,
    open_terminal_count: 0,
    sessions: {},
    ws: null,

    connect: function(conn_data, callback) {
        logger.info("Remote terminal connect accessed with session id : ");
        var socket_url = config.socket.terminal_host + conn_data.server_id + '/' + conn_data.mac + '/';
        logger.info("Remote terminal session url : ", socket_url);
        if (this.ws == null) {
            this.ws = socket_connect(socket_url, callback);
        } else {
            callback(this.ws);
        }
    },

    sendData: function(data){
        try{
            if(!this.ws.closed){
                this.ws.send(JSON.stringify(data));
            }
        }
        catch(ex){
            this.closeAll();
        }
    },

    createTerminalSession: function(conn_data) {
        var term = this;
        var session_keys = Object.keys(this.sessions);
        var session_id = conn_data.session_id;
        if (session_keys.length < this.max_terminal_count) {
            this.connect(conn_data, function(ws) {
                if(ws != null){
                    term.sessions[session_id] = new TerminalSession(session_id, ws, term);
                }
            })
        } else {
            this.sendData({
                event: 'MaxTerminalReached',
                output: null,
                session_id: session_id,
                cmd: null,
                cmd_script: null
            });
        }
    },

    closeAll: function() {
        for (var key in this.sessions) {
            var session = this.sessions[key];
            delete this.sessions[key];
            session.close();
        }
        this.ws = null;
        this.sessions = {};
    },

    removeSession: function(session_id){
        console.log('Close client sessions for session:' % session_id)
        var session = this.sessions[session_id];
        if(session){
            delete this.sessions[session_id];
            session.close();
        }
        console.log(this.sessions)
    },

    exec: function(json){
        this.sessions[json.session_id].executeCommand(json);
    }
}

/* Websocket Client */
var socket_connect = function(session_url, callback) {
    logger.info("Socket Terminal connection initiated");
    ws = new TerminalClient(session_url, {
        ca: fs.readFileSync('/home/pi/viswa.pem')
    }); // Socket communication begin

    /* Websocket Client open event */
    ws.on('open', function() {
        logger.info("Websocket Terminal Client open");
        //exec_process(ws);     
        callback(ws);
    });

    /* Websocket Client message event */
    ws.on('message', function(message) {
        try {
            logger.info("Websocket Terminal Client received : " + message);
            var json = JSON.parse(message);
            //logger.info('Terminal process id : ',terminal.pid);
            logger.info("received terminal command", json.cmd_script);
            //ws.terminal.stdin.write(json.cmd_script+"\n");
           if(json.code >= 500){
                RemoteExec.removeSession(json.session_id);
            } 
            else if (json.code != 400.1 && json.code != 401 && json.cmd_script) {
                RemoteExec.exec(json);
            }
        } catch (err) {
            logger.error("Websocket Terminal Client Socket message PARSE exception : " + err);
        }
    });

    /* Websocket Client error event */
    ws.on('error', function() {
        logger.error("Websocket Terminal Client error");
        RemoteExec.closeAll();
    });

    /* Websocket Client close event */
    ws.on('close', function() {
        logger.info("Websocket Terminal Client close");
        //ws.terminal.kill();  
        RemoteExec.closeAll();
        ws.closed = true;

    });
    return ws;
}

/* Terminal Execute function */
function exec_process(ws) {
    var cmd_data = null;

    var term = pty.fork('/bin/bash', [], {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
        cwd: process.env.HOME,
        env: process.env
    });


    term.on('data', function(data) {
        console.log('After Execution: ' + data);
        if (cmd_data != null) {
            cmd_data.output = data;
            ws.send(JSON.stringify(cmd_data));
        } else if (data != null) {
            ws.send(JSON.stringify({
                event: 'init',
                terminalKey: data
            }));
        }
    });

    ws.terminal = term;

    //   ws.terminal.on('close', function (code) {
    //        logger.info('Child process exited with exit code '+code);
    //      if(ws.readyState == 1){
    //          ws.close();
    //          }
    //   });

    //   ws.terminal.on('exit', function (exitCode) {
    //        logger.info("Child exited with code: " + exitCode);
    // if(ws.readyState == 1){
    //  ws.close();
    // }    
    //   });

    //   ws.terminal.on('end', function(){
    //        logger.info('End of command.');
    //   });

    ws.terminal.executeCommand = function(json) {
        //var data_chunk = '';

        cmd_data = json;
        if (cmd_data.code != 400.1 && cmd_data.code != 401) {
            term.write(json.cmd_script);
        }
    }
}

// Exporting module
module.exports = RemoteExec;
