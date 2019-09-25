module.exports = {
    patch : [
        {port:1079,addr:'0.0.0.0',dest:'prefab://localhost.socks_proxy',remote:'wss://ri.mk/ws-tunnel'},
        {port:1078,addr:'0.0.0.0',dest:'prefab://localhost.socks_proxy',remote:'wss://qz.yuyuko.com:10035/ws-tunnel'},
        {port:1081,addr:'0.0.0.0',dest:'prefab://localhost.socks_proxy',remote:'wss://h.ct2l.tk'},
        {port:1082,addr:'0.0.0.0',dest:'udp://localhost:5004',remote:'ws://localhost:5001'},
    ],
};