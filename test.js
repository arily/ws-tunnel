var match = require('url-match-patterns').default;
const path = '/test';
const pathname = '/test/tcp://baidu.com:12345';
if (match('http://dummy/' + path.concat('/*'),'http://dummy/' + pathname)){
    console.log('matched',pathname);
}
