import { CORE_PLUGINS } from '../constants/plugin'

class Plugin {
    constructor(){
        this.data = {}
    }

    add(pluginName, plugin) {
        this.data[pluginName] = {}
        Object.keys(plugin).forEach(methodName => {
            this.data[pluginName][methodName] = plugin[methodName]
        })
    }

    execute() {
        const args = Array.prototype.slice.call(arguments)
        const engine = args.shift()
        const methodName = args.shift()
      
        Object.keys(this.data).forEach(pluginName => {
            if (CORE_PLUGINS.indexOf(pluginName) < 0 && engine.options.plugins && engine.options.plugins.indexOf(pluginName) < 0) {
                return
            }
    
            if (engine.options[pluginName] === false) {
                return
            }
    
            if (this.data[pluginName][methodName]) {
                this.data[pluginName][methodName].apply(engine, args)
            }
        })
    }
}
export default Plugin