module.exports = class wsConnectionContainer {
  constructor () {
    this.container = {}
  }

  append (tunnel) {
    this.container[tunnel.id] = tunnel
  }

  get (id) {
    return this.container[id]
  }

  isset (id) {
    return this.container[id] !== undefined
  }

  destroy (id) {
    setTimeout(function () {
      delete this.container[id]
    }.bind(this), 2000)
    return true
  }

  getChains () {
    const rtn = {}
    for (const key in this.container) {
      rtn[key] = this.container[key].chain
    }
    return rtn
  }
}
