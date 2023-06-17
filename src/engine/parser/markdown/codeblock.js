// 缩写替换
const INPUT_MODE_ALIAS = {
    text: 'plain',
    sh: 'bash',
    ts: 'typescript',
    js: 'javascript',
    py: 'python',
    puml: 'plantuml',
    vb: 'basic'
}
export default md => {
    md.renderer.rules.fence = (tokens, idx) => {
        const token = tokens[idx]
        const info = token.info ? md.utils.unescapeAll(token.info).trim() : ''
        let langName = '' 
        // mermaid
        if (info === 'mermaid') {
            return "<div class=\"mermaid\" data-source=\"".concat(encodeURIComponent(token.content), "\"></div>\n")
        } 
        // flow chart
        if (info === 'flow') {
            return "<div class=\"flowchart\" data-source=\"".concat(encodeURIComponent(token.content), "\"></div>\n")
        } 
        // Graphviz
        if (info === 'graphviz') {
            return "<div class=\"graphviz\" data-source=\"".concat(encodeURIComponent(token.content), "\"></div>\n")
        } 
        // plantuml
        if (info === 'plantuml') {
            return "<p><img src=\"https://g.yuque.com/g?".concat(encodeURIComponent(token.content), "\"></p>")
        }
    
        if (info) {
            langName = info.split(/\s+/g)[0]
            langName.replace(/=$|=\d+$|=\+$|!$|=!$/, '')
        }
    
        langName = INPUT_MODE_ALIAS[langName] || langName
        return "<pre data-syntax=\"".concat(langName, "\"><code>").concat(token.content, "</code></pre>")
    }
}