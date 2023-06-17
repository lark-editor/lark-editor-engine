const style = ["font-size", "font-family", "color", "background-color", "vertical-align", "white-space", "text-decoration-line"]
const markMap = {}
style.forEach(m => {
    markMap[m] = true
})
const inlineStyle = style.concat(["box-sizing", "outline", "text-decoration"])
const blockStyle = style.concat(["height", "line-height", "margin", "margin-top", "margin-bottom", "margin-left", "margin-right", "padding", "padding-top", "padding-bottom", "padding-left", "padding-right", "box-sizing", "overflow", "text-indent"])
const rootStyle = blockStyle.concat(["position", "border", "border-width", "border-style", "border-color", "border-radius", "border-top", "border-bottom", "border-left", "border-right", "background", "opacity"])
const listStyle = blockStyle.concat(["list-style"])

export default {
    br:[],
    hr: ["background-color", "border"],
    img: ["width", "height"],
    ol: listStyle,
    ul: listStyle,
    li: listStyle,
    table: blockStyle.concat(["width", "table-layout", "border-collapse", "border-spacing", "border"]),
    td: blockStyle.concat(["min-width", "border"]),
    div: rootStyle,
    blockquote: rootStyle,
    mark: style,
    markMap: markMap,
    inline: inlineStyle,
    block: blockStyle
}