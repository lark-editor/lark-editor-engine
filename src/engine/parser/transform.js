// 转换标签、属性、样式
export default (rules, name, attrs, styles, isCardNode) => {
    if (name === 'div') {
        name = 'p'
    }
    
    if (!rules) {
        return name
    }
    
    if (name === 'card' || isCardNode) {
        return name
    }

    for (let i = 0; i < rules.length; i++) {
        const rule = rules[i]
        const from = rule[0]
        const to = rule[1]

        if (typeof from === 'string' && name === from) {
            return to
        }

        if (typeof from === 'object') {
            const fromName = Object.keys(from)[0]

            if (name !== fromName) {
                continue
            }

            const attrRule = from[fromName]
            const attrKeys = Object.keys(attrs)

            for (let _i = 0; _i < attrKeys.length; _i++) {
                const key = attrKeys[_i]

                if (!attrRule[key]) {
                    continue
                }

                if (typeof attrRule[key] === 'string' && attrRule[key] === attrs[key]) {
                    delete attrs[key]
                    return to
                }

                if (Array.isArray(attrRule[key]) && attrRule[key].indexOf(attrs[key]) >= 0) {
                    delete attrs[key]
                    return to
                }
            }

            const styleRule = attrRule.style || {}
            const styleKeys = Object.keys(styles)

            for (let _i2 = 0; _i2 < styleKeys.length; _i2++) {
                const _key = styleKeys[_i2]

                if (!styleRule[_key]) {
                    continue
                }

                if (typeof styleRule[_key] === 'string' && styleRule[_key] === styles[_key]) {
                    delete styles[_key]
                    return to
                }

                if (Array.isArray(styleRule[_key]) && styleRule[_key].indexOf(styles[_key]) >= 0) {
                    delete styles[_key]
                    return to
                }
            }
        }
    }
    return name
}