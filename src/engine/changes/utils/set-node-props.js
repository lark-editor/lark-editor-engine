import getNodeModel from '../../models/node'
export default (node, props) => {
    node = getNodeModel(node)
    const attrs = props || {}
    const styles = attrs.style || {}

    Object.keys(attrs).forEach(key => {
        const val = attrs[key]
        if (key !== 'style') {
            node.attr(key, val)
        }
    })

    Object.keys(styles).forEach(key => {
        let val = styles[key]
        if (/^0(px|em)?$/.test(val)) {
            val = ''
        }

        node.css(key, val)
    })
    
    return node
}