class Command { 
    constructor(change){
        this.change = change
        this.doc = this.change.doc
        this.data = {}
    }

    add(name, callback) {
        this.data[name] = callback
    }

    queryEnabled(name) {
        return this.data[name]
    }
}

['queryState', 'execute'].forEach(method => {
    Command.prototype[method] = function () {
        const args = Array.prototype.slice.call(arguments)
        const name = args[0]
    
        if (name && this.data[name] && this.data[name][method]) {
            args.shift()
            // 执行命令
            return this.data[name][method].apply(this, args)
        }
    }
})

export default Command