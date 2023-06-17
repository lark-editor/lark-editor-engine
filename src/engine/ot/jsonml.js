import { unescapeDots , unescape, toHex} from '../utils/string'
import { isTransientElement , isTransientAttribute } from './utils'

export const toDOM = function(options){
    const fragment =  document.createDocumentFragment()
    let elementName = null;
    let i = 0;
    let element;
    if(typeof options[0] === "string"){
        elementName = options[0]
        i = 1
    }
    for(;i < options.length;i++){
        if(Array.isArray(options[i])){
            fragment.appendChild(toDOM(options[i]))
        }else if("[object Object]" === Object.prototype.toString.call(options[i])){
            if(elementName){
                element = document.createElement(elementName)
                for(let attr in options[i]){
                    element.setAttribute(unescapeDots(attr),unescape(options[i][attr]))
                }
            }
        }else if("number" === typeof options[i] || "string" === typeof options[i]){
            const textNode = document.createTextNode(options[i])
            fragment.appendChild(textNode)
        }
    }
    if(!element && elementName){
        element = document.createElement(elementName)
    }
    if(element){
        element.appendChild(fragment)
        return element
    }else{
        return fragment.childNodes
    }
}

function fromChildDom(node, values) {
    const { childNodes } = node
    if(0 !== childNodes.length){
        for (let i = 0; i < childNodes.length; i++) {
            const obj = fromDOM(childNodes[i])
            if(obj){
                values.push(obj)
            }
        }
    }
}

export const fromDOM = function(node) {
    let values;
    if(!isTransientElement(node)){
        if(node.nodeType === Node.ELEMENT_NODE){
            values = [node.nodeName.toLowerCase()]
            const { attributes } = node
            const data = {}
            for(let i = 0; attributes && i < attributes.length;i++){
                const { name ,  specified , value }  = attributes[i]
                if(specified && !isTransientAttribute(node,name)){
                    if(name === "style"){
                        data.style = toHex(node.style.cssText || value)
                    }else if("string" === typeof value){
                        data[name] = value
                    }
                }
            }
            values.push(data)
            fromChildDom(node, values)
            return values
        }
        return node.nodeType === Node.TEXT_NODE ? String(node.nodeValue) : undefined
    }
}