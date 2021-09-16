// const http = require('http')
// const url = require('url')
const fsall = require('fs')
const fs = fsall.promises
const fileExists = fsall.existsSync
const mime = require('mime-types')

// https://stackoverflow.com/questions/13364243/websocketserver-node-js-how-to-differentiate-clients
require('console-stamp')(console, '[HH:MM:ss.l]')

function staticServer ({ root = '/', index = ['index.html', 'default.html', 'fallback.html'] }) {
  this.root = root
  this.index = index
}

const logLevel = require('../../config/wstunnel').wsServer.outputLevel

staticServer.prototype.request = async function (request, response) {
  let file = this.root + request.url
  if (file[file.length - 1] === '/') {
    file = file.substring(0, file.length - 1) // remove last '/'
  }
  try {
    const content = await fs.readFile(file, { encoding: 'utf-8' })
    const ct = mime.lookup(file)
    if (!ct === false) {
      this.response_success(request, response, ct, content, 200, file)
    } else {
      response.end('unknown MIME Type.')
    }
  } catch (error) {
    const result = this.index.some(filename => {
      const path = file + '/' + filename
      if (fileExists(path)) {
        // -----redirect /A to /A/  to fix relative html file path problem (/a ... b/c -> /a/c) to (/a/ ... b/c -> a/b/c)
        if (request.url[request.url.length - 1] !== '/') {
        //   response.writeHeader(301, {
        //     Location: request.url + '/'
        //   })
          this.location(request, response, request.url + '/', 301)
          response.end()
          return true
        }
        // -----redirect end.
        const ct = mime.lookup(path)
        const data = fsall.readFileSync(path, 'utf-8')
        if (!ct === false) {
          this.response_success(request, response, ct, data, 200, path)
        }
        return true
      } else {
        return false
      }
    })

    if (!result) {
      this.response_404(request, response)
    }
  }
}

staticServer.prototype.response_404 = function (request, response) {
  response.writeHeader(404, {
    'content-type': 'text/html;charset="utf-8"'
  })
  response.write('<h1>404错误</h1><p>你要找的页面不存在</p>')
  response.end()
  if (logLevel <= 2) {
    console.log('[mini-staticServer-server] [404] '.concat(request.url))
  }
}

staticServer.prototype.response_success = function (request, response, mime, data, httpcode = 200, file = undefined) {
  const method = response.writeHeader || response.writeHead
  method.call(response, httpcode, {
    'content-type': mime
  })
  response.write(data)
  response.end()
  let substr
  if (logLevel <= 1) {
    if (file !== undefined) {
      substr = ' -> '.concat(file)
    } else {
      substr = ''
    }
    // console.log('[mini-staticServer-server] ['.concat(httpcode).concat('] ').concat(request.url).concat(substr))
  }
}

staticServer.prototype.location = function (request, response, location, httpcode = 301) {
  if (logLevel <= 1) {
    console.log('[mini-staticServer-server] ['.concat(httpcode).concat('] ').concat(request.url).concat(' -> ').concat(location))
  }
  response.writeHeader(httpcode, {
    Location: location
  })
  response.end()
}

staticServer.prototype.access_log = function (request) {

}

module.exports = staticServer
