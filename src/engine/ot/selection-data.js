import { toPath } from './utils'

class SelectionData {
    constructor(engine){
        this.engine = engine
        this.editArea = engine.editArea
    }

    getAll(){
        const editArea = this.editArea
        const attributes = editArea[0].attributes
        const data = []
        for(let i = 0; i < attributes.length; i++){
            const item = attributes.item[i]
            const { nodeName , nodeValue } = item
            if (/^data-selection-/.test(nodeName) && nodeValue) {
                const value = JSON.parse(decodeURIComponent(nodeValue))
                if(value){
                    data.push(value)
                }
            }
        }
        return data
    }

    setAll(members){
        const editArea = this.editArea
        const data = {}
        members.forEach(item => {
            if (item) {
                const name = "data-selection-".concat(item.uuid);
                data[name] = true
                const value = editArea.attr(name)
                const value_str = encodeURIComponent(JSON.stringify(item))
                if(value !== value_str){
                    editArea.attr(name, value_str)
                }
            }
        })
        const attributes = editArea[0].attributes
        for (let i = 0; i < attributes.length; i++) {
            const item = attributes.item(i)
            const { nodeName } = item
            if(/^data-selection-/.test(nodeName) && !data[nodeName]){
                editArea.removeAttr(nodeName)
            }
        }
    }

    remove(name){
        const editArea = this.editArea
        editArea.removeAttr("data-selection-".concat(name))
    }

    updateAll(currentMember, members){
        const { card , change } = this.engine
        const range = change.getSelectionRange().cloneRange()
        const activeCard = change.activeCard
        if(activeCard && activeCard.closest("body").length > 0){
            const center = card.getCenter(activeCard)
            range.selectNodeContents(center[0])
        }

        const path = toPath(range)
        const pathString = JSON.stringify(path)
        let data = this.getAll()
        let h = false
        let f = false
        data = data.map(item => {
            if(item){
                if(item.uuid === currentMember.uuid){
                    h = true
                    if(pathString === JSON.stringify(item.path)){
                        return item
                    }else{
                        f = true
                        item.path = path
                        item.active = true
                        return item
                    }
                }else{
                    if(members.find(e => { return e.uuid === item.uuid })){
                        item.active = false
                        return item
                    }else{
                        f = true
                        return null
                    }
                }
            }else{
                f = true
                return null
            }
        })

        data = data.filter(item => {
            return item
        })

        if(!h){
            f = true
            data.push({
                path,
                uuid: currentMember.uuid,
                active: true
            })
        }
        if(f){
            this.setAll(data)
        }
        return {
            data,
            range
        }
    }
}
export default SelectionData