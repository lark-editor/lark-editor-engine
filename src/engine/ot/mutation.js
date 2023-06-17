import getNodeModel from '../models/node'

const config = {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
    attributeOldValue: true,
    characterDataOldValue: true
}

class Mutation {
    constructor(node , callback){
        this.callback = callback
        this.node = getNodeModel(node)
        this.isStopped = true
        this.observer = new MutationObserver(list => {
            list.forEach(e => {
                return this.callback(e)
            })
        }
        )
    }

    start(){
        if(this.isStopped){
            this.observer.observe(this.node[0], config)
            this.isStopped = false
        }
    }

    stop(){
        if(!this.isStopped){
            this.observer.disconnect()
            this.isStopped = true
        }
    }
}
export default Mutation