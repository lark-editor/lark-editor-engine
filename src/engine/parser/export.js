import getNodeModel from '../models/node'
import { walkTree } from '../utils/node'
import HTMLParser from './html'

const style = {
    "font-size": "14px",
    color: "#262626",
    "line-height": "24px",
    "letter-spacing": ".05em",
    "outline-style": "none",
    "overflow-wrap": "break-word"
}

class Export {
    constructor(options){
        this.options = Object.assign({
            callback: () => {},
            cards: null
        }, options)
        this.initCardParses()
    }

    before(){}

    after(){}

    getDefaultCardParsers(){
        return {
            hr: card => {
                const hr = card.find("hr")
                hr.css({
                    "background-color": "#e8e8e8",
                    border: "1px solid transparent",
                    margin: "18px 0"
                })
                card.empty()
                card.append(hr)
            },
            checkbox: card => {
                const checkbox = getNodeModel("<span>".concat("checked" === card.find("input").attr("checked") ? "\u2705" : "\ud83d\udd32", "<span/>"))
                checkbox.css({
                    margin: "3px 0.5ex",
                    "vertical-align": "middle",
                    width: "16px",
                    height: "16px",
                    color: "color: rgba(0, 0, 0, 0.65)"
                })
                card.empty()
                card.append(checkbox)
            }
        }
    }

    initCardParses(){
        this.cardParsers = this.getDefaultCardParsers()
        if(this.options.cards){
            this.cardParsers = Object.assign({}, this.cardParsers, {}, this.options.cards)
        }         
    }

    transAttrsToStyle(card){
        card.find("h1,h2,h3,h4,h5,h6").css({
            padding: "7px 0",
            margin: "0",
            "font-weight": "700"
        }).each(node => {
            if("H1" === node.tagName){
                node.style["font-size"] = "28px"
                node.style["line-height"] = "36px"
            }else if("H2" === node.tagName){
                node.style["font-size"] = "24px"
                node.style["line-height"] = "32px"
            }else if("H3" === node.tagName){
                node.style["font-size"] = "20px"
                node.style["line-height"] = "28px"
            }else if("H4" === node.tagName){
                node.style["font-size"] = "16px"
                node.style["line-height"] = "24px"
            }else if("H5" === node.tagName){
                node.style["font-size"] = "14px"
                node.style["line-height"] = "24px"
            }else if("H6" === node.tagName){
                node.style["font-size"] = "14px"
                node.style["line-height"] = "24px"
                node.style["font-weight"] = "400"
            }
        })

        card.find(".lake-fontsize-9").css({
            "font-size": "12px",
            "line-height": "24px"
        }).attr("data-mce-style", "font-size: 9px")

        card.find(".lake-fontsize-10").css({
            "font-size": "13px",
            "line-height": "24px"
        }).attr("data-mce-style", "font-size: 10px")

        card.find(".lake-fontsize-11").css({
            "font-size": "14px",
            "line-height": "24px"
        }).attr("data-mce-style", "font-size: 11px")

        card.find(".lake-fontsize-12").css({
            "font-size": "16px",
            "line-height": "24px"
        }).attr("data-mce-style", "font-size: 12px")

        card.find(".lake-fontsize-14").css({
            "font-size": "19px",
            "line-height": "27px"
        }).attr("data-mce-style", "font-size: 14px")

        card.find(".lake-fontsize-16").css({
            "font-size": "22px",
            "line-height": "30px"
        }).attr("data-mce-style", "font-size: 16px")

        card.find(".lake-fontsize-18").css({
            "font-size": "24px",
            "line-height": "32px"
        }).attr("data-mce-style", "font-size: 18px")

        card.find(".lake-fontsize-22").css({
            "font-size": "29px",
            "line-height": "37px"
        }).attr("data-mce-style", "font-size: 22px")

        card.find(".lake-fontsize-24").css({
            "font-size": "32px",
            "line-height": "40px"
        }).attr("data-mce-style", "font-size: 24px")

        card.find(".lake-fontsize-30").css({
            "font-size": "40px",
            "line-height": "48px"
        }).attr("data-mce-style", "font-size: 30px")

        card.find(".lake-fontsize-36").css({
            "font-size": "48px",
            "line-height": "56px"
        }).attr("data-mce-style", "font-size: 36px")

        card.find("p").css("margin", "0")

        card.find(".lake-list-task").css({
            "list-style": "none"
        })

        card.find("#article-title").css({
            "font-size": "36px",
            "line-height": "1.389",
            "font-weight": "700",
            color: "#262626"
        })

        card.find("blockquote").each(blockquote => {
            blockquote = getNodeModel(blockquote)
            blockquote.css({
                "margin-top": "5px",
                "margin-bottom": "5px",
                "padding-left": "1em",
                "margin-left": "0px",
                "border-left": "3px solid #eee",
                opacity: "0.6"
            })

            if(blockquote.hasClass("lake-alert")){
                blockquote.css({
                    margin: 0,
                    padding: "10px",
                    "border-radius": "3px",
                    color: "#262626",
                    opacity: 1
                })
                if(blockquote.hasClass("lake-alert-info")){
                    blockquote.css({
                        border: "1px solid #abd2da",
                        "background-color": "#e8f7ff"
                    })
                }else if(blockquote.hasClass("lake-alert-warning")){
                    blockquote.css({
                        border: "1px solid #e0d1b1",
                        "background-color": "#fffbe6"
                    })
                }else if(blockquote.hasClass("lake-alert-danger")){
                    blockquote.css({
                        border: "1px solid #deb8be",
                        "background-color": "#fff3f3"
                    })
                }else if(blockquote.hasClass("lake-alert-success")){
                    blockquote.css({
                        border: "1px solid #c2d2b5",
                        "background-color": "#edf9e8"
                    })
                }else if(blockquote.hasClass("lake-alert-tips")){
                    blockquote.css({
                        border: "1px solid #c3c3c3",
                        "background-color": "#fff6b6"
                    })
                }
            }
        })
    }

    parseCard(root){
        root.find("[data-lake-card]").each(card => {
            card = getNodeModel(card)
            const type = card.attr("data-lake-card")
            const parser = this.cardParsers[type]
            if(parser){
                parser(card)
            }else{
                card.empty()
            }
        })
    }

    parseLink(card){
        card.find("a").each(link => {
            link.setAttribute("href", link.href)
        })
    }

    parseLists(card){
        card.find("ul,ol").each(list => {
            list = getNodeModel(list)
            const { name } = list
            const indent = parseInt(list.attr("data-lake-indent"), 10) || 0
            const styleTypes = {
                ul: ["disc", "circle", "square"],
                ol: ["decimal", "lower-alpha", "lower-roman"]
            }
            const styleType = styleTypes[name]
            list[0].removeAttribute("data-lake-indent")
            let tempList;
            for(let i = 0;i < indent;i++){
                if(i === 0){
                    tempList = list
                    list.css({
                        "list-style-type": styleType[indent % 3]
                    })
                }else{
                    const node = getNodeModel("<".concat(name, "></").concat(name, ">"))
                    tempList.before(node)
                    node.append(tempList)
                    tempList = node
                    tempList.css({
                        "list-style-type": "none"
                    })
                }
                tempList.attr("lake-indent", i)
                tempList.css({
                    margin: 0,
                    "padding-left": "23px"
                })
                if(i === indent){
                    tempList.css(style)
                }
            }
        })
    }

    standardizeDel(card){
        card.find("del").each(del => {
            const element = document.createElement("span")
            element.style["text-decoration"] = "line-through"
            del.parentNode.insertBefore(element, del)
            element.innerHTML = del.innerHTML
            del.parentNode.removeChild(del)
        })
    }

    standardizeTaskList(card){
        card.find(".lake-list-task").each(taskList => {
            taskList = getNodeModel(taskList)
            const { childNodes } = taskList[0]
            const firstNode = childNodes[0]
            if(childNodes.length === 0 || childNodes.length === 1 && firstNode.nodeType === Node.ELEMENT_NODE && "checkbox" === firstNode.getAttribute("data-lake-card")){
                taskList.remove()
            }else{
                const checkboxs = taskList.find('[data-lake-card="checkbox"]')
                if(checkboxs.length > 1){
                    for (let i = 1; i < checkboxs.length; i++) {
                        const checkbox = checkboxs[i]
                        checkbox.remove()
                    }
                }
                if(checkboxs.length === 0){
                    const checked = "true" === taskList.attr("data-lake-checked") ? "true" : "false"
                    taskList.prepend('\n        <span data-card-type="inline" data-lake-card="checkbox" contenteditable="false" data-card-value="data:'.concat(checked, '">\n          <span data-card-element="body">\n            <span data-card-element="center">\n              <span class="lake-checkbox">\n                <input type="checkbox" class="lake-checkbox-input" value="" ').concat("true" === checked ? 'checked="checked"' : "", '>\n                <span class="lake-checkbox-inner"></span>\n              </span>\n            </span>\n          </span>\n        </span>\n      '))
                }
            }
        })
    }

    filter(root){
        walkTree(root,node => {
            if(node && node.nodeType === Node.ELEMENT_NODE && "none" === node.style["user-select"] && node.parentNode){
                node.parentNode.removeChild(node)
            }
        })
    }

    parse( contents , inner , outter ){
        const { callback } = this.options
        const element = getNodeModel("<div />")
        if(inner){
            inner.appendChild(contents)
            getNodeModel(inner).css(style)
            element.append(outter)
        }else{
            element.append(contents)
        }

        this.before(element)
        this.filter(element)
        this.standardizeTaskList(element)
        this.standardizeDel(element)
        this.parseLists(element)
        this.parseCard(element)
        this.parseLink(element)
        element.find("p").css(style)
        this.transAttrsToStyle(element)
        this.after(element)

        callback(element)

        return {
            html:element.html(),
            text:new HTMLParser(element).toText()
        }
    }
}

export default Export