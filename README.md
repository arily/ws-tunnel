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

 myroute = [ 
            {'dial' : 'myname', 
             'bound' : 'tcp://localhost:22' 
            }
        ];
```
⬆️an example: use prefab://myname instead of tcp://localhsot:22 to increase safety

LocalTCPListener -- prototype proxy client
forward tcp://localhost:5000 to tcp://remote:5004 via ws://localhost:5001

```
var patch = [
    {port:5000,dest:'tcp://remote:5004',remote:'ws://localhost:5001'},
];
```
