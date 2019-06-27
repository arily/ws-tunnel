module.exports = {
    wsServer : {
        port        : process.env.PORT          || 5001,
        output      : process.env.OUTPUT        || true,
        outputLevel : process.env.OUTPUTLEVEL   || 3
    },
    Proxifier : {
        reconnectWindow :process.env.RECONNECT_WINDOW || 5000,
        reconnectEnabled:process.env.RECONNECT_ENABLE || true
    }
};