module.exports = class wsConnectionContainer {
    constructor() {
        this.container = {};
        // this.append = this.append.bind(this);
        // this.get = this.get.bind(this);
        // this.isset = this.isset.bind(this);
        // this.destroy = this.destroy.bind(this);
        // this.getChains = this.getChains.bind(this);
    }
    append(tunnel) {
        this.container[tunnel.id] = tunnel;
    }
    get(id) {
        return this.container[id];
    }
    isset(id) {
        return this.container[id] !== undefined;
    }
    destroy(id) {
        setTimeout(function() {
            delete this.container[id];
        }.bind(this), 2000);
        return true;
    }
    getChains() {
        let rtn = {};
        for (let key in this.container) {
            rtn[key] = this.container[key].chain;
        }
        return rtn;
    }
}