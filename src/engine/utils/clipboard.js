import copyToClipboard from 'copy-to-clipboard'
import getNodeModel from '../models/node'
import { fetchAllChildren } from '../utils/node'
import ExportParser from '../parser/export'
import { getClosestBlock } from '../changes/utils/block'
import { safari } from './ua'

const defaultParser = {
    exportParser:new ExportParser()
}

const copyText = text => {
    return copyToClipboard(text);
}

const copyNode = (node,event) => {
    const selection = window.getSelection()
    let range
  
    if (selection.rangeCount > 0) {
        range = selection.getRangeAt(0)
    } else {
        range = document.createRange()
    }
  
    const prevRange = range.cloneRange();
    const block = getNodeModel('<div>&#8203;</div>')
    block.css({
        position: 'fixed',
        top: 0,
        clip: 'rect(0, 0, 0, 0)'
    })
    getNodeModel(document.body).append(block)
    block.append(getNodeModel(node).clone(true))
    if(event){
        fetchAllChildren(block).forEach(child => {
            child = getNodeModel(child) 
            event.trigger("copy:each", child)
        })
    }
    block.append('@&#8203;')
    range.selectNodeContents(block[0])
    selection.removeAllRanges()
    selection.addRange(range)
    let success = false
  
    try {
        success = document.execCommand('copy')
        if (!success) {
            throw 'copy command was unsuccessful'
        }
    } catch (err) {
        console.log('unable to copy using execCommand: ', err)
    } finally {
        block.remove()
        selection.removeAllRanges()
        selection.addRange(prevRange)
    }
    return success
}
  
const getClipboardData = event => {
    const transfer = event.dataTransfer || event.clipboardData
    let html = transfer.getData('text/html')
    let text = transfer.getData('text')
    let files = [] 
    // Edge 兼容性处理
    try {
        if (transfer.items && transfer.items.length > 0) {
            files = Array.from(transfer.items).map(item => {
                let file = item.kind === 'file' ? item.getAsFile() : null
                if(file !== null){
                    if(file.type && file.type.indexOf("image/png") > -1 && !file.lastModified){
                        file = new File([file],"image.png",{
                            type: file.type
                        })
                    }
                    file.ext = text.split(".").pop()
                }
                return file
            }).filter(exists => {
                return exists
            })
        } else if (transfer.files && transfer.files.length > 0) {
            files = Array.from(transfer.files)
        }
    } catch (err) {
        console.log(err)
        if (transfer.files && transfer.files.length > 0) {
            files = Array.from(transfer.files)
        }
    }

    // 从 Mac OS Finder 复制文件
    if (html === '' && /^.+\.\w+$/.test(text) && files.length > 0) {
      text = '' // 在图片上，点击右键复制
    } else if (text === '' && /^(<meta.+?>)?<img.+?>$/.test(html) && files.length > 0) {
      html = '' // 从 Excel、Numbers 复制
    } else if (html || text) {
      files = []
    }
    return {
      html,
      text,
      files
    }
}

function setNodes(nodes) {
    if (0 === nodes.length)
        return {}
    for (var t = nodes.length - 1; t > 0; t--) {
        const node = nodes[t]
        node.appendChild(nodes[t - 1])
    }
    return {
        inner: nodes[0],
        outter: nodes[nodes.length - 1]
    }
}

const writeClipboard = (event, parser, callback) => {
    if(parser === undefined){
        parser = defaultParser.exportParser
    }

    if(parser !== null){
        const range = window.getSelection().getRangeAt(0)
        const cardRoot = getNodeModel(range.commonAncestorContainer)
        const nodes = cardRoot.name === "#text" ? [document.createElement("span")] : []
        const cards = cardRoot.closest("[data-lake-card]",node => {
            if (getNodeModel(node).isRoot())
                return null
            if (node.nodeType === Node.ELEMENT_NODE) {
                const display = window.getComputedStyle(node).getPropertyValue("display")
                if(display === "inline"){
                    nodes.push(node.cloneNode())
                }
            }
            return node.parentNode
        })
        const hasChildEngine = cardRoot.find(".lake-engine-view").length > 0 || cardRoot.find(".lake-engine").length > 0
        const hasPrentEngine = cardRoot.closest(".lake-engine-view").length > 0 || cardRoot.closest(".lake-engine").length > 0
        if (!(cards.length > 0 || !hasChildEngine && !hasPrentEngine)){
            if(hasPrentEngine && !cardRoot.isRoot()){
                const block = getClosestBlock(cardRoot)
                if(["h1", "h2", "h3", "h4", "h5", "h6"].indexOf(block.name) > -1){
                    nodes.push(block[0].cloneNode())
                }
            }
            event.preventDefault()
            if(range.collapsed){
                event.clipboardData.setData("text/html", "")
                event.clipboardData.setData("text", "")
            }else{
                const contents = range.cloneContents()
                const { inner , outter } = setNodes(nodes)
                const { html , text } = parser.parse(contents , inner , outter)
                if(callback){
                    callback()
                }
                event.clipboardData.setData("text/html", html)
                event.clipboardData.setData("text", text)
            }
        }
    }
}

const customClipboard = () => {
    getNodeModel(document).on("copy", event => {
        writeClipboard(event)
    })
}

const onCut = () => {
    const range = window.getSelection().getRangeAt(0)
    const cardRoot = getNodeModel(range.commonAncestorContainer)
    range.deleteContents()
    const listElements = -1 !== ["ul", "ol"].indexOf(cardRoot.name) ? cardRoot : cardRoot.find("ul,ol")
    for (let i = 0; i < listElements.length; i++) {
        const list = getNodeModel(listElements[i])
        const childs = list.find("li")
        childs.each(child => {
            if("" === child.innerText || safari && "\n" === child.innerText){
                child.parentNode.removeChild(child)
            }
        })
        if(list.children().length === 0){
            list.remove()
        }
    }
}

customClipboard()
const exportParser = defaultParser.parser
export {
    copyText,
    copyNode,
    getClipboardData,
    writeClipboard,
    customClipboard,
    onCut,
    exportParser
}