class Event{
    constructor(engine){
        this.engine = engine
        this.listeners = {}
    }

    on(eventType, listener, rewrite) {
        if (!this.listeners[eventType] || rewrite) {
            this.listeners[eventType] = []
        }
  
        this.listeners[eventType].push(listener)
    }

    off(eventType, listener) {
        const listeners = this.listeners[eventType]
  
        if (!listeners) {
            return
        }
  
        for (let i = 0; i < listeners.length; i++) {
            if (listeners[i] === listener) {
                listeners.splice(i, 1)
                break
            }
        }
    }

    trigger() {
        const args = Array.prototype.slice.call(arguments)
        const eventType = args.shift()
        const listeners = this.listeners[eventType]
  
        if (!listeners) {
            return
        }
  
        let result;
  
        for (var i = 0; i < listeners.length; i++) {
            result = listeners[i].apply(this.engine, args);
  
            if (result === false) {
                    break
            }
        }
  
        return result
    }
}

export default Event