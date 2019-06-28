module.exports = class wsConnectionContainer{
    constructor(){
        this.container = {};
        this.append = this.append.bind(this);
        this.get = this.get.bind(this);
        this.isset = this.isset.bind(this);
        this.destroy = this.destroy.bind(this);
        this.getChains = this.getChains.bind(this);
    }
    append(Tunnel){
        this.container[Tunnel.id] = Tunnel;
    }
    get(id){
        return this.container[id];
    }
    isset(id){
        return this.container[id] !== undefined;
    }
    destroy(id){
        delete this.container[id] ;
    }
    getChains(){
        let rtn = {};
        for (var key in this.container) {
            rtn[key] = this.container[key].chain;
        }
        return rtn;
    }
}