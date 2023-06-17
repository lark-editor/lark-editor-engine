import blueimpMd5 from 'blueimp-md5'
import { LAKE_ELEMENT,ANCHOR,FOCUS,CURSOR } from '../constants/bookmark'
import { CARD_TYPE_KEY,READY_CARD_KEY,CARD_VALUE_KEY } from '../constants/card'

export const escapeRegExp = e => {
    return e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export const md5 = value => {
    return blueimpMd5(value)
}

export const randomId = () => {
    let str = "" 
    const t = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    for (let n = 0; n < 5; n++) {
        str += t.charAt(Math.floor(Math.random() * t.length))
    }
    return str
}

export const toMap = (value, delimiter) => {
    delimiter = delimiter === undefined ? ',' : delimiter
    const map = {}
    const arr = Array.isArray(value) ? value : value.split(delimiter)
    let match
    Object.keys(arr).forEach(key => {
        const val = arr[key]
    
        if (match = /^(\d+)\.\.(\d+)$/.exec(val)) {
            for (let i = parseInt(match[1], 10); i <= parseInt(match[2], 10); i++) {
                map[i.toString()] = true
            }
        } else {
            map[val] = true
        }
    })
    return map
}

export const toCamel = value => {
    const array = value.split('-')
    return array.map((value, index) => {
        return index > 0 ? value.charAt(0).toUpperCase() + value.substr(1) : value;
    }).join('')
}

export const toHex = rgb => {
    const hex = d => {
        const s = parseInt(d, 10).toString(16).toUpperCase()
        return s.length > 1 ? s : '0' + s
    }

    const reg = /rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/gi
    return rgb.replace(reg, ($0, $1, $2, $3) => {
        return '#' + hex($1) + hex($2) + hex($3)
    })
}

export const escape = value => {
    if (typeof value !== 'string') {
        return value
    }

    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export const unescape = value => {
    if (typeof value !== 'string') {
        return value
    }
  
    return value.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
}

export const escapeDots = value => {
    if (typeof value !== 'string') {
        return value
    }
    return value.replace(/\./g, "&dot;")
}

export const unescapeDots = value => {
    if (typeof value !== 'string') {
        return value
    }
    return value.replace(/&dot;/g, ".")
}

const protocols = ['http:', 'https:', 'data:', 'dingtalk:', 'ftp:']
export const validUrl = url => {
    if (typeof url !== 'string') {
        return false
    }
  
    url = url.toLowerCase() // https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs
  
    if (url.startsWith('data:text/html')) {
        return false
    }

    if(!(!!url.match(/^\S*$/))){
        return false
    }

    if (!!protocols.some(protocol => {
        return url.startsWith(protocol)
    })) {
        return true
    }
  
    if (url.startsWith('./') || url.startsWith('/')) {
        return true
    }
  
    if (url.indexOf(':') < 0) {
        return true
    }
    return false
}

export const sanitizeUrl = url => {
    return validUrl(url) ? url : ''
}

export const addUnit = (value, unit) => {
    unit = unit || 'px'
    return value && /^-?\d+(?:\.\d+)?$/.test(value) ? value + unit : value
}

export const removeUnit = value => {
    let match
    return value && (match = /^(-?\d+)/.exec(value)) ? parseInt(match[1], 10) : 0
}

export const getAttrMap = value => {
    let map = {}
    const reg = /\s+(?:([\w\-:]+)|(?:([\w\-:]+)=([^\s"'<>]+))|(?:([\w\-:"]+)="([^"]*)")|(?:([\w\-:"]+)='([^']*)'))(?=(?:\s|\/|>)+)/g
    let match
  
    while (match = reg.exec(value)) {
        const key = (match[1] || match[2] || match[4] || match[6]).toLowerCase()
        const val = (match[2] ? match[3] : match[4] ? match[5] : match[7]) || ''
        map[key] = val
    }
  
    return map
}

export const getCssMap = value => {
    value = value.replace(/&quot;/g, '"')
    let map = {}
    const reg = /\s*([\w\-]+)\s*:([^;]*)(;|$)/g
    let match
  
    while (match = reg.exec(value)) {
        const key = match[1].toLowerCase().trim()
        const val = toHex(match[2]).trim()
        map[key] = val
    }
  
    return map
}

export const removeBookmarkTags = value => {
    return value.replace(/<anchor\s*\/>/gi, '').replace(/<focus\s*\/>/gi, '').replace(/<cursor\s*\/>/gi, '')
}

export const transformCustomTags = value => {
    return value.replace(/<anchor\s*\/>/gi, "<span ".concat(LAKE_ELEMENT, "=\"").concat(ANCHOR, "\"></span>")).replace(/<focus\s*\/>/gi, "<span ".concat(LAKE_ELEMENT, "=\"").concat(FOCUS, "\"></span>")).replace(/<cursor\s*\/>/ig, "<span ".concat(LAKE_ELEMENT, "=\"").concat(CURSOR, "\"></span>")).replace(/(<card\s+[^>]+>).*?<\/card>/gi, (whole, tag) => {
        const attrs = getAttrMap(tag)
        const { type , name , value } = attrs
        const isInline = attrs.type === 'inline'
        const tagName = isInline ? 'span' : 'div'
        const list = ["<".concat(tagName)]
        list.push(" ".concat(CARD_TYPE_KEY, "=\"").concat(type, "\""))
        list.push(" ".concat(READY_CARD_KEY, "=\"").concat(name, "\""))
    
        if (value !== undefined) {
            list.push(" ".concat(CARD_VALUE_KEY, "=\"").concat(value, "\""))
        }
    
        list.push("></".concat(tagName, ">"))
        return list.join('')
    })
}

export const getAnchorUrl = (pageUrl, anchorId) => {
    const url = pageUrl.replace(/#.*$/, '').replace(/\/edit$/, '')
    return "".concat(url, "#").concat(anchorId)
}

export const isCurrentPageUrl = (href,url) => {
    if (url.startsWith("#")) return true
    const newHref = href.replace(/#.*$/, "").replace(/\/edit$/, "")
    if(!!url.startsWith(newHref)){
        url = url.substr(newHref.length)
        return "" === url || url.startsWith("#")
    }
    return false
}

export const encodeCardValue = value => {
    try {
        value = encodeURIComponent(JSON.stringify(value));
    } catch (e) {
        value = ''
    }
  
    return "data:".concat(value)
}

export const decodeCardValue = value => {
    try {
        // 新数据统一加 data: 前缀
        if (value.startsWith('data:')) {
            value = value.substr(5)
            value = JSON.parse(decodeURIComponent(value))
        } else {
            // 兼容老数据
            value = JSON.parse(value)
        }
    } catch (e) {
        value = {}
    }
  
    return value
}