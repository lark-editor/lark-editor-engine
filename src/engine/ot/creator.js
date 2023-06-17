import { EventEmitter2 } from 'eventemitter2'
import getNodeModel from '../models/node'
import PathNode from './path-node'
import DiffMatchPatch from 'diff-match-patch'
import { isTransientAttribute } from './utils'
import { escapeDots , escape , decodeCardValue } from '../utils/string'
import { JSONML } from '../constants/ot'
import { fromDOM } from './jsonml'

function M(e, t, n) {
    if (n || (n = t,
    t = e.data),
    n.length > 0 && "string" === typeof n[n.length - 1])
        return null;
    if (!t)
        return null;
    var a = n
      , i = [...a]
      , r = i[0]
      , o = i.slice(1);
    return r && t[r] ? M(e, t[r], o) : t
}

function getArray(data,len){
    if(Array.isArray(data))
        return data
    const array = []
    for(const value of data){
        array.push(value)
        if(len && array.length === len)
            break
    }
    return array
}

class Creator extends EventEmitter2{

    constructor(engine , n){
        super()
        this.engine = engine
        this.doc = n.doc
        this.dmp = new DiffMatchPatch()
    }

    patchesToOps(e, t, n) {
        
        var i = []
          , o = this.dmp.patch_make(t, n);
        Object.keys(o).forEach(function(t) {
            var n = o[t]
            , a = n.start1;
            n.diffs.forEach(function(t) {
                var n = getArray(t, 2)
                , o = n[0]
                , s = n[1];
                o !== DiffMatchPatch.DIFF_DELETE ? o !== DiffMatchPatch.DIFF_INSERT ? o !== DiffMatchPatch.DIFF_EQUAL || (a += s.length) : i.push({
                    si: s,
                    p: [].concat([...e], [a])
                }) : i.push({
                    sd: s,
                    p: [].concat([...e], [a])
                })
            })
        })
        return i
    }

    attributeMutation(e, t) {
        const { engine , doc } = this
        const { target , attributeName } = e
        if (isTransientAttribute(target, attributeName))
            return [];
        var u = escapeDots(attributeName)
          , h = t.toPath()
          , p = [].concat(...h, [JSONML.ATTRIBUTE_INDEX, u])
          , g = escape(target.getAttribute(attributeName))
          , m = M(doc, [].concat(...h, [JSONML.ATTRIBUTE_INDEX]));
        if (!m)
            return [];
        var v = m[u];
        if (v === g)
            return [];
        if (null != v && null !== g && "data-card-value" === u) {
            var b = getNodeModel(target)
              , k = engine.card.getComponent(b);
            if (k && k.isEqualValue && k.isEqualValue(decodeCardValue(v), decodeCardValue(g)))
                return []
        }
        if(!/^data-selection-/.test(u)){
            this.emit("change")
        }
        return null == v ? [{
            oi: g,
            p: p
        }] : null == g ? [{
            od: v,
            p: p
        }] : [{
            od: v,
            oi: g,
            p: p
        }]
    }

    characterDataMutation(e, t) {
        const { doc } = this
        var path = t.toPath()
          , o = M(doc, path)
          , s = "string" === typeof o && o || ""
          , data = e.target.data
          , c = this.patchesToOps(path, s, data);
        if(c.length > 0){
            this.emit("change")
        }
        return c
    }

    childListMutation(e, t) {
        let { doc } = this
        let r = [];
        Array.from(e.addedNodes).forEach(node => {
            const { target } = e
            doc = PathNode.getPathNode(node, target)
            if ((!doc || t.id !== doc.parent.id) && (doc = PathNode.create(node, t),
            doc)) {
                var o = node.previousSibling
                  , s = PathNode.getPathNode(o, target)
                while (o && !s){
                    o = o.previousSibling
                    s = PathNode.getPathNode(o, target)
                }
                if (o) {
                    var l = t.children.indexOf(s);
                    t.children.splice(l + 1, 0, doc)
                } else{
                    node.nextSibling ? t.children.unshift(doc) : t.children.push(doc)
                }
                
                var c = PathNode.getPathNode(node, target).toPath()
                  , h = {
                    li: fromDOM(node),
                    p: c
                };
                r.push(h)
            }
        })
        Array.from(e.removedNodes).forEach(function(t) {
            var n = PathNode.getPathNode(t, e.target);
            if (n) {
                var a = n.toPath();
                n.remove();
                var o = M(doc, a);
                if (o) {
                    var s = {
                        ld: o,
                        p: a
                    };
                    r.push(s)
                }
            }
        })
        this.emit("change")
        return r
    }

    getOperations(e) {
        var t = []
          , n = PathNode.getPathNode(e.target);
        if(n){
            if("attributes" === e.type){
                t = this.attributeMutation(e, n)
            }
            if("characterData" === e.type){
                t = this.characterDataMutation(e, n)
            }
            if("childList" === e.type){
                t = this.childListMutation(e, n)
            }
        }
        return t
    }
}
export default Creator