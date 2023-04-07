// const http = require('http')
// const url = require('url')
import { readFileSync, existsSync } from 'fs'
import mime from 'mime-types'
import fs from 'fs/promises'
import { type ServerResponse } from 'http'

// https://stackoverflow.com/questions/13364243/websocketserver-node-js-how-to-differentiate-clients
// require('console-stamp')(console, '[HH:MM:ss.l]')

class StaticServer {
  logLevel = require('../../config/wstunnel').wsServer.outputLevel

  root: string
  index: string[]
  constructor ({ root = '/', index = ['index.html', 'default.html', 'fallback.html'] }) {
    this.root = root
    this.index = index
  }

  async request (request: Request, response: ServerResponse) {
    let file = this.root + request.url
    if (file[file.length - 1] === '/') {
      file = file.substring(0, file.length - 1) // remove last '/'
    }
    try {
      const content = await fs.readFile(file, { encoding: 'utf-8' })
      const ct = mime.lookup(file)
      if (ct) {
        this.response_success(request, response, ct, content, 200, file)
      } else {
        response.end('unknown MIME Type.')
      }
    } catch (error) {
      const result = this.index.some(filename => {
        const path = file + '/' + filename
        if (existsSync(path)) {
          // -----redirect /A to /A/  to fix relative html file path problem (/a ... b/c -> /a/c) to (/a/ ... b/c -> a/b/c)
          if (request.url[request.url.length - 1] !== '/') {
            this.location(request, response, request.url + '/', 301)
            response.end()
            return true
          }
          // -----redirect end.
          const ct = mime.lookup(path)
          const data = readFileSync(path, 'utf-8')
          if (ct) {
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

  response_404 (request: Request, response: ServerResponse) {
    response.writeHead(404, {
      'content-type': 'text/html;charset="utf-8"'
    })
    response.write('<h1>404错误</h1><p>你要找的页面不存在</p>')
    response.end()
    if (this.logLevel <= 2) {
      console.log('[mini-staticServer-server] [404] '.concat(request.url))
    }
  }

  response_success (request: Request, response: ServerResponse, mime: string, data, httpcode = 200, file: string | undefined = undefined) {
    response.writeHead(httpcode, {
      'content-type': mime
    })
    response.write(data)
    response.end()
  }

  location (request: Request, response: ServerResponse, location: string, httpcode = 301) {
    if (this.logLevel <= 1) {
      console.log('[mini-staticServer-server] ['.concat(httpcode.toString()).concat('] ').concat(request.url).concat(' -> ').concat(location))
    }
    response.writeHead(httpcode, {
      Location: location
    })
    response.end()
  }

  access_log (request: Request) {

  }
}

export default StaticServer
