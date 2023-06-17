import { cloneDeep , debounce } from 'lodash'
import { EventEmitter2 } from 'eventemitter2'
import SelectionData from './selection-data'
import RangeColoring from './range-coloring'
import Mutation from './mutation'
import Creator from './creator'
import Applier from './applier'
import { randomString , reduceOperations } from './utils'
import PathNode from './path-node';
import { fromDOM } from './jsonml';

const colors = ["#597EF7", "#73D13D", "#FF4D4F", "#9254DE", "#36CFC9", "#FFA940", "#F759AB", "#40A9FF"]

class OT extends EventEmitter2{
    constructor(engine){
        super()
        const { editArea , parentNode } = engine
        this.engine = engine
        this.editArea = editArea
        this.members = []
        this.currentMember = {}
        this.selectionData = new SelectionData(engine)
        this.rangeColoring = new RangeColoring(engine,{
            parentNode
        })
        this.clientId = randomString()
    }

    handleMutation(e) {
        const { doc , clientId } = this
        const operations = this.creator.getOperations(e)
        if( 0 !== operations.length){
            doc.submitOp(operations, {
                source: clientId
            })
        }
    }

    destroy(){
        if(this.doc){
            this.doc.destroy()
        }
        this.stopMutation()
        this.rangeColoring.destroy()
        this.mutation = null
    }

    startMutation(){
        if(this.mutation){
            this.mutation.start()
        }
    }

    stopMutation(){
        if(this.mutation){
            this.mutation.stop()
        }
    }

    init(doc){
        const { engine , editArea } = this
        if (this.doc)
            throw Error("Not allowed to execute multiple times")
        this.doc = doc
        this.mutation = new Mutation(editArea,this.handleMutation)
        this.creator = new Creator(engine,{
            doc
        })
        this.applier = new Applier(engine)
        this.syncData()
        this.waitingOps = []
        const debounceFun = debounce(() => {
            const operations = reduceOperations(this.waitingOps)
            if (operations.length > 0) {
                this.waitingOps = []
                this.applyAll(operations)
                const allData = this.selectionData.getAll()
                this.doRangeColoring(allData)
                this.stopMutation()
                this.history.save()
                this.startMutation()
            }
        }, 50)

        doc.on("op", (op, clientId) => {
            if(this.clientId !== clientId){
                this.waitingOps = this.waitingOps.concat(op)
                debounceFun()
            }
        })

        this.creator.on("change", () => {
            const { range } = this.selectionData.updateAll(this.currentMember, this.members)
            this.rangeColoring.updateBackgroundAlpha(range)
            this.rangeColoring.updatePosition()
        })

        engine.on("select", () => {
            window.setTimeout(() => {
                const { range } = this.selectionData.updateAll(this.currentMember, this.members)
                this.rangeColoring.updateBackgroundAlpha(range)
            }, 10)
        })

        this.startMutation()
        const { data } = this.selectionData.updateAll(this.currentMember, this.members)
        this.doRangeColoring(data, true)
        this.emit("load")
    }

    setMemberIdToUuid(member){
        member.__uuid = member.uuid
        member.uuid = String(member.id).toLowerCase()
    }

    setMemberUuidToId(member){
        member.uuid = member.__uuid
        delete member.__uuid
    }

    setMemberColor(member){
        const iid = member.iid || 1
        const index = (iid - 1) % colors.length
        member.color = colors[index]
    }

    getMembers(){
        const members = cloneDeep(this.members)
        members.forEach(member => {
            this.setMemberUuidToId(member)
        })
        return members
    }

    setMembers(members){
        members = cloneDeep(members)
        members.forEach(member => {
            this.setMemberIdToUuid(member)
            this.setMemberColor(member)
        })
        this.members = members
    }

    addMember(member){
        member = cloneDeep(member)
        this.setMemberIdToUuid(member)
        this.setMemberColor(member)
        if(!this.members.find(m => m.uuid === member.uuid)){
            this.members.push(member)
        }
    }

    removeMember(member){
        member = cloneDeep(member)
        this.setMemberIdToUuid(member)
        this.members = this.members.filter(m => {
            return m.uuid !== member.uuid
        })
        this.selectionData.remove(member.uuid)
        const data = this.selectionData.getAll()
        this.doRangeColoring(data)
    }

    setCurrentMember(member){
        member = cloneDeep(member)
        this.setMemberIdToUuid(member)
        this.setMemberColor(member)
        member = this.members.find(m => m.uuid === member.uuid)
        this.currentMember = member
    }

    syncData(){
        const { engine , editArea , doc } = this
        if (Array.isArray(doc.data) && doc.data.length > 0){
            engine.history.stop()
            engine.setJsonValue(doc.data)
            engine.history.start()
            engine.history.save(true, false)
            PathNode.create(editArea[0], null, true)
            return
        }
        engine.setDefaultValue(engine.options.defaultValue)
        PathNode.create(editArea[0], null, true)
        const jsonml = fromDOM(editArea[0])
        if(doc.data){
            doc.submitOp([{
                p: [],
                oi: jsonml
            }], {
                source: this.clientId
            })
        }else{
            doc.create(jsonml, "json0", {
                source: this.clientId
            })
        }
    }

    applyAll(operations){
        this.stopMutation()
        operations.forEach(operation => {
            this.applier.applyOperation(operation)
        })
        this.startMutation()
    }

    doRangeColoring(data , t){
        const { members , currentMember } = this
        data = data.filter(item => item.uuid !== currentMember.uuid)
        this.rangeColoring.render(data, members, t)
        this.rangeColoring.updatePosition()
    }
}

export default OT