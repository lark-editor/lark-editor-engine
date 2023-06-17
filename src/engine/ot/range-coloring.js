import { getClientRect , getSubRanges , shrinkRange} from '../utils/range'
import { removeUnit , escape } from '../utils/string'
import getNodeModel from '../models/node'
import TinyCanvas from '../helper/tiny-canvas'
import tinycolor2 from 'tinycolor2'
import tooltip from '../embed-toolbar/tooltip'
import { fromPath } from './utils'

const LEFT_SPACE = 2

class RangeColoring {
    constructor(engine,node){
        this.engine = engine
        this.editArea = engine.editArea
        this.lang = engine.lang
        this.card = engine.card
        this.parentNode = node.parentNode
        this.hideCursorInfoTimeoutIdMap = {}
    }

    destroy(){
        const { parentNode }  = this
        parentNode.children(".lake-user-background").remove()
        parentNode.children(".lake-user-cursor").remove()
        parentNode.children(".lake-card-mask").remove()
    }

    getRelativeRect(node,range){
        const clientReact = getClientRect(range)
        const react = node[0].getBoundingClientRect()
        return {
            x: clientReact.left - react.left,
            y: clientReact.top - react.top,
            width: clientReact.right - clientReact.left,
            height: clientReact.bottom - clientReact.top
        }
    }

    cacheRange(range){
        return {
            startOffset: range.startOffset,
            endOffset: range.endOffset,
            startContainer: range.startContainer,
            endContainer: range.endContainer,
            commonAncestorContainer: range.commonAncestorContainer
        }
    }

    isRangeWrap(range){
        const cloneRange = range.cloneRange()
        cloneRange.collapse(true)
        const clientReact = getClientRect(cloneRange)
        const cloneRange1 = range.cloneRange()
        cloneRange1.collapse(false)
        const clientReact1 = getClientRect(cloneRange1)
        return clientReact.bottom !== clientReact1.bottom
    }

    drawOneByOne(node,canvas,range,color){
        const cacheRange = this.cacheRange(range)
        let startOffset = cacheRange.startOffset
        while (startOffset < cacheRange.endOffset) {
            range.setStart(cacheRange.commonAncestorContainer, startOffset)
            range.setEnd(cacheRange.commonAncestorContainer, startOffset + 1)
            const rect = this.getRelativeRect(node, range)
            canvas.clearRect(rect)
            canvas.draw("Rect", Object.assign({}, rect, {}, color))
            startOffset++
        }
        range.setStart(cacheRange.startContainer, cacheRange.startOffset)
        range.setEnd(cacheRange.endContainer, cacheRange.endOffset)
    }

    drawBackground(range , options){
        const parentNode = this.parentNode
        const { uuid , color } = options
        const tinyColor = tinycolor2(color)
        tinyColor.setAlpha(.3)
        let targetCanvas
        const rgb = tinyColor.toRgbString()
        let backgroundChild = parentNode.children('.lake-user-background[data-uuid="'.concat(uuid, '"]'))
        if(backgroundChild.length > 0){
            backgroundChild.attr("data-color",color)
            targetCanvas = backgroundChild[0].__targetCanvas
            targetCanvas.clear()
        }else{
            backgroundChild = getNodeModel('<div class="lake-user-background" data-uuid="'.concat(uuid, '" data-color="').concat(color, '" />'))
            backgroundChild.css({
                position: "absolute",
                top: 0,
                left: 0,
                "pointer-events": "none"
            })
            parentNode.append(backgroundChild)
            targetCanvas = new TinyCanvas({
                container:backgroundChild[0]
            })

            backgroundChild[0].__targetCanvas = targetCanvas
        }
        backgroundChild[0].__targetRange = range
        const parentWidth = parentNode.width()
        const parentHeight = parentNode.height()
        targetCanvas.resize(parentWidth,parentHeight)

        const subRanges = getSubRanges(range)
        const fill = {
            fill: rgb
        }
        subRanges.forEach(subRange => {
            if(this.isRangeWrap(subRange)){
                this.drawOneByOne(backgroundChild, targetCanvas, subRange, fill)
            }else{
                const rect = this.getRelativeRect(backgroundChild, subRange)
                targetCanvas.clearRect(rect)
                targetCanvas.draw("Rect", Object.assign({}, rect, {}, fill))
            }
        })
        return subRanges
    }

    getNodeRect(node , rect){
        node = getNodeModel(node)
        if(node.isCard() && "checkbox" === node.attr("data-lake-card") && node.next()){
            node = node.next()
        }

        if(node.isElement()){
            rect = node[0].getBoundingClientRect()
        }

        if(node.isText()){
            const range = document.createRange()
            range.selectNodeContents(node[0])
            rect = getClientRect(range)
        }
        return rect
    }

    getCursorRect(range){
        const parentNode = this.parentNode
        const parentRect = parentNode[0].getBoundingClientRect()
        if(range.startContainer){
            const cloneRange = range
            shrinkRange(cloneRange)
            let rect = getClientRect(cloneRange)
            const startNode = getNodeModel(cloneRange.startContainer)
            if(startNode.isElement() && rect.height === 0){
                let childNode = startNode[0].childNodes[cloneRange.startOffset]
                if(childNode){
                    rect = this.getNodeRect(childNode, rect)
                }else{
                    childNode = startNode.first()
                    if(childNode){
                        rect = this.getNodeRect(childNode, rect)
                    }
                }
            }

            const top = rect.top - parentRect.top
            const left = rect.left - parentRect.left - LEFT_SPACE
            const height = rect.height
            return {
                top:top + "px",
                left:left + "px",
                height:height > 0 ? height + "px" : -1
            }
        }

        const cloneRange = range
        const unit = removeUnit(cloneRange.css("outline-width"))
        const rect = cloneRange[0].getBoundingClientRect()
        let top = rect.top - parentRect.top - 1
        let left = rect.left - parentRect.left
        if(unit){
            top -= unit + 1
            left -= 2
        }
        return {
            left: left + "px",
            top: top + "px",
            height: 0
        }
    }

    setCursorRect(node,rect){
        if (-1 !== rect.height) {
            if (0 === rect.height)
            {
                node.css(rect)
                node.addClass("lake-user-cursor-card")
                return
            }
            node.css(rect)
            node.removeClass("lake-user-cursor-card")
        } else
            node.remove()
    }

    showCursorInfo(node,info){
        const { uuid , color } = info
        if(this.hideCursorInfoTimeoutIdMap[uuid]){
            window.clearTimeout(this.hideCursorInfoTimeoutIdMap[uuid])
        }

        const trigger = node.find(".lake-user-cursor-trigger")
        const bgColor = node.css("background-color")
        node.attr("data-old-background-color", bgColor)
        trigger.addClass("lake-user-cursor-trigger-active")
        node.css("background-color", color)
        trigger.css("background-color", color)
    }

    hideCursorInfo(node){
        const trigger = node.find(".lake-user-cursor-trigger")
        const bgColor = node.attr("data-old-background-color")
        trigger.removeClass("lake-user-cursor-trigger-active")
        node.css("background-color", bgColor)
        trigger.css("background-color", bgColor)
    }

    drawCursor(range , info){
        const parentNode = this.parentNode
        const { uuid , name , color } = info

        const cursorRect = this.getCursorRect(range)
        let childCursor = parentNode.children('.lake-user-cursor[data-uuid="'.concat(uuid, '"]'))
        if(childCursor.length > 0){
            this.setCursorRect(childCursor,cursorRect)
        }else{
            const userCursor = '\n      <div class="lake-user-cursor" data-uuid="'.concat(uuid, '">\n        <div class="lake-user-cursor-trigger">').concat(escape(name), "</div>\n      </div>\n      ")
            childCursor = getNodeModel(userCursor)
            const trigger = childCursor.find(".lake-user-cursor-trigger")
            this.setCursorRect(childCursor, cursorRect)
            childCursor.on("mouseenter", () => {
                return this.showCursorInfo(childCursor, info)
            })
            let transitionState = true
            childCursor.on("transitionstart", () => {
                transitionState = false
            })

            childCursor.on("transitionend", () => {
                transitionState = true
            })

            childCursor.on("mouseleave", () => {
                if(transitionState){
                    this.hideCursorInfo(childCursor)
                }
            })
            childCursor.css("background-color", color)
            trigger.css("background-color", color)
            this.parentNode.append(childCursor)
        }
        if(childCursor[0]){
            childCursor[0].__target = range
            this.showCursorInfo(childCursor, info)
            if(this.hideCursorInfoTimeoutIdMap[uuid]){
                window.clearTimeout(this.hideCursorInfoTimeoutIdMap[uuid])
            }
            this.hideCursorInfoTimeoutIdMap[uuid] = window.setTimeout(() => {
                this.hideCursorInfo(childCursor)
            }, 2000)
            return childCursor
        }
    }

    drawCardMask(node,cursor,info){
        const { lang , parentNode } = this
        const parentRect = parentNode[0].getBoundingClientRect()
        const nodeRect = node[0].getBoundingClientRect()
        let mask = parentNode.children('.lake-card-mask[data-uuid="'.concat(info.uuid, '"]'))
        if(mask.length > 0){
            mask[0].__targetNode = node[0]
            mask.css({
                left: nodeRect.left - parentRect.left + "px",
                top: nodeRect.top - parentRect.top + "px"
            })
            return
        }
        mask = getNodeModel('<div class="lake-card-mask" data-uuid="'.concat(info.uuid, '" />'))
        mask[0].__targetNode = node[0]
        mask.css({
            left: nodeRect.left - parentRect.left + "px",
            top: nodeRect.top - parentRect.top + "px",
            width: nodeRect.width + "px",
            height: nodeRect.height + "px"
        })

        mask.on("mouseenter", () => {
            this.showCursorInfo(cursor, info)
            tooltip.show(mask, lang.card.lockAlert, {
                placement: "bottomLeft"
            })
        })

        mask.on("mousemove", event => {
            const embedElement = getNodeModel("div[data-lake-element=embed-tooltip]")
            embedElement.css({
                left: (event.pageX - 16) + "px",
                top: (event.pageY + 32) + "px"
            })
        })

        mask.on("mouseleave", () => {
            this.hideCursorInfo(cursor)
            tooltip.hide()
        })

        mask.on("click", e => {
            e.preventDefault()
            e.stopPropagation()
        })

        mask.on("mousedown", e => {
            e.preventDefault()
            e.stopPropagation()
        })
    }

    setCardSelectedByOther(component , info){
        const { uuid , color } = info
        if(color){
            const tinyColor = tinycolor2(color)
            tinyColor.setAlpha(.3)
            const rgb = tinyColor.toRgbString()
            let o
            if(component.selectByOther && !component.state.selectedByOther){
                o = component.selectByOther(color, rgb)
            }
            component.state.selectedByOther = uuid
            return o
        }
        if(component.unselectByOther && component.state.selectedByOther){
            component.unselectByOther()
        }
        component.state.selectedByOther = false
    }

    setCardActivatedByOther(component , info){
        const { uuid , color } = info
        if(color){
            const tinyColor = tinycolor2(color)
            tinyColor.setAlpha(.3)
            const rgb = tinyColor.toRgbString()
            let o
            if(component.activateByOther && !component.state.activatedByOther){
                o = component.activateByOther(color, rgb)
            }
            component.state.activatedByOther = uuid
            return o
        }
        if(component.unactivateByOther && component.state.activatedByOther){
            component.unactivateByOther()
        }
        component.state.activatedByOther = false
    }

    drawRange(range , info){
        const { card , parentNode } = this
        const { uuid } = info
        const container = getNodeModel(range.commonAncestorContainer)
        const { components } = card
        let cardInfo;
        if(card.isCenter(container)){
            const cardRoot = card.closest(container)
            const component = card.getComponent(cardRoot)
            if(!component)
                return
            cardInfo = {
                cardRoot,
                component
            }
        }
        for(let i = 0;i < components.length; i++){
            const { node , component } = components[i]
            if(!cardInfo || node[0] !== cardInfo.cardRoot[0]){
                if(component.state.activatedByOther === uuid){
                    this.setCardActivatedByOther(component, false)
                }
                parentNode.children('.lake-card-mask[data-uuid="'.concat(uuid, '"]')).remove()
            }
        }
        if(cardInfo){
            const { cardRoot , component } = cardInfo
            const root = this.setCardActivatedByOther(component, info) || cardRoot
            const cursor = this.drawCursor(root,info)
            const { constructor } = component
            if(!constructor.canCollab && cursor){
                this.drawCardMask(root, cursor, info)
            }
        }else{
            for(let y = 0;y < components.length;y++){
                const { component , node } = components[y]
                const centerNode = card.getCenter(node)[0]
                if(centerNode && component){
                    if(range.isPointInRange(centerNode, 0)){
                        this.setCardSelectedByOther(component, info)
                    }else if(component.state.selectedByOther === uuid){
                        this.setCardSelectedByOther(component, false)
                    }
                }
            }
            const singleCard = card.getSingleSelectedCard(range)
            if(singleCard){
                const component = card.getComponent(singleCard)
                if(component){
                    const root = this.setCardSelectedByOther(component, info) || singleCard
                    this.drawCursor(root, info)
                }
            }else{
                shrinkRange(range)
                const ranges = this.drawBackground(range, info)
                if(!range.collapsed){
                    ranges.forEach(sub => {
                        if(!sub.collapsed){
                            range = sub
                        }
                    })
                    shrinkRange(range)
                    range.collapse(false)
                }
                this.drawCursor(range, info)
            }
        }
    }

    updateBackgroundPosition(){
        const { parentNode } = this
        parentNode.children(".lake-user-background").each(child => {
            const node = getNodeModel(child)
            const range = child.__targetRange
            const uuid = node.attr("data-uuid")
            const color = node.attr("data-color")
            this.drawBackground(range, {
                uuid,
                color
            })
        })
    }

    updateCursorPosition(){
        const { parentNode } = this
        parentNode.children(".lake-user-cursor").each(child => {
            const node = getNodeModel(child)
            const target = child.__target
            if (target.startContainer || 0 !== getNodeModel(target).closest("body").length) {
                const rect = this.getCursorRect(target)
                this.setCursorRect(node, rect)
            } else
                node.remove()
        })
    }

    updateCardMaskPosition(){
        const { parentNode } = this
        const parentRect = parentNode[0].getBoundingClientRect()
        parentNode.children(".lake-card-mask").each(child => {
            const node = getNodeModel(child)
            const target = child.__targetNode
            if (0 !== getNodeModel(target).closest("body").length) {
                const rect = target.getBoundingClientRect()
                node.css({
                    left: rect.left - parentRect.left + "px",
                    top: rect.top - parentRect.top + "px"
                })
            } else
                node.remove()
        })
    }

    updatePosition(){
        this.updateBackgroundPosition()
        this.updateCursorPosition()
        this.updateCardMaskPosition()
    }

    updateBackgroundAlpha(range){
        const cursorRect = this.getCursorRect(range)
        this.parentNode.children(".lake-user-cursor").each(child => {
            const node = getNodeModel(child)
            const trigger = node.find(".lake-user-cursor-trigger")
            const left = node.css("left")
            const top = node.css("top")
            const bgColor = tinycolor2(node.css("background-color"))
            if(cursorRect.left === left && cursorRect.top === top){
                bgColor.setAlpha(.3)
            }else{
                bgColor.setAlpha(1)
            }
            node.css("background-color", bgColor.toRgbString())
            trigger.css("background-color", bgColor.toRgbString())
        })
    }

    render(data,members,n){
        const { editArea , parentNode , card } =  this
        const info = {}
        data.forEach(item => {
            const { path , uuid , active } = item
            const member = members.find(m => m.uuid = uuid)
            if(member && ( n || active)){
                if(path !== 0){
                    const node = fromPath(editArea,path)
                    this.drawRange(node,member)
                }else{
                    info[uuid] = true
                }
            }
        })
        parentNode.children("[data-uuid]").each(child => {
            child = getNodeModel(child)
            const uuid = child.attr("data-uuid")
            const member = members.find(m => m.uuid === uuid)
            if (!member || info[uuid]) {
                if (child.hasClass("lake-card-mask")) {
                    const target = getNodeModel(child[0].__targetNode)
                    const component = card.getComponent(target)
                    if(component && component.state.activatedByOther === uuid){
                        this.setCardActivatedByOther(component, false)
                    }
                }
                child.remove()
            }
        })
        const { components } = card
        for(let i = 0;i < components.length; i++){
            const obj = components[i]
            const { component } = obj
            if(obj){
                const member = members.find(m => m.uuid === component.state.selectedByOther)
                if(!member || info[member.uuid]){
                    this.setCardSelectedByOther(component, false)
                }
            }
        }
    }
}
export default RangeColoring