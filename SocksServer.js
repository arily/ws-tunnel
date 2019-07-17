//https://github.com/mscdex/socksv5
var socks = require('socksv5');

var srv = socks.createServer(function(info, accept, deny) {
  accept();
});
srv.listen(10800, 'localhost', function() {
  console.log('SOCKS server listening on port 10800');
});

srv.useAuth(socks.auth.UserPassword(function(user, password, cb) {
  cb(user === 'nodejs' && password === 'rules!');
}));