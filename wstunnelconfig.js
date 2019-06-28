module.exports = {
    wsServer : {
        port        : parseInt(process.env.PORT)        || 5001,
        output      : process.env.OUTPUT == 'TRUE'      || false,
        outputLevel : parseInt(process.env.OUTPUTLEVEL) || 3,
        wspath      : process.env.WSPATH                || '/'
    },
    Proxifier : {
        reconnectWindow :parseInt(process.env.RECONNECT_WINDOW) || 5000,
        reconnectEnabled:process.env.RECONNECT_ENABLE == 'TRUE' || true
    },
    Prefab :  [
        {
            'dial'  : 'localhost.ssh',
            'bound' : 'tcp://localhost:22'
        },
        {
            'dial'  : 'localhost.socks_proxy',
            'bound' : 'tcp://localhost:10800'
        }
    ]
};