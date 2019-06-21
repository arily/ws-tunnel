# ws-tunnel

*Only TCP section are currently working.
```
npm install
(npm install pm2 -g) optional
node wstunnel.js you rock.
```
Server requires almost no configure.

```
var s = new wsServer(config for normal ws server,path);

 myroute = [ //an example: use prefab://myname instead of tcp://localhsot:22 to increase safety
            {'dial' : 'myname', 
             'bound' : 'tcp://localhost:22' 
            }
        ];
```

LocalTCPListener -- prototype proxy client

```
var patch = [// forward tcp://localhost:5000 to tcp://remote:5004 via ws://localhost:5001
    {port:5000,dest:'tcp://remote:5004',remote:'ws://localhost:5001'},
];
```
although it called LocalTCPListener, it supportst both normal proxy and reverse proxy.
reverse proxy are extremely unstable to use and only capable delivering only one connection.
