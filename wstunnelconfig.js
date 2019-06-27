module.exports = {
    wsServer : {
        port        : parseInt(process.env.PORT)        || 5001,
        output      : process.env.OUTPUT == 'TRUE'      || true,
        outputLevel : parseInt(process.env.OUTPUTLEVEL) || 3
    },
    Proxifier : {
        reconnectWindow :parseInt(process.env.RECONNECT_WINDOW) || 5000,
        reconnectEnabled:process.env.RECONNECT_ENABLE == 'TRUE' || true
    }
};
