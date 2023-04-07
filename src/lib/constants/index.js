const EVENT_LOOKUP_TABLE = {
  websocket: {
    tcp: {
      srcOnMessageEvent: 'message',
      dstOnMessageEvent: 'data',
      srcSendMethod: 'send',
      dstSendMethod: 'write',
      srcClose: 'close',
      dstClose: 'end',
      dstOnConnection: 'connect'
    }
  }
}
module.exports = {
  getEventNames (from, to) {
    return EVENT_LOOKUP_TABLE[from]?.[to] ?? {}
  }
}
