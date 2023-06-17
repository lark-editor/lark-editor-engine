import Engine from  "./models/engine"
import Checkbox from './card/checkbox'
import Hr from './card/hr'
import paste from './plugins/paste'
import drop from './plugins/drop'
import undo from './plugins/undo'
import selectall from './plugins/selectall'
import paintformat from './plugins/paintformat'
import removeformat from './plugins/removeformat'
import heading from './plugins/heading'
import bold from './plugins/bold'
import italic from './plugins/italic'
import underline from './plugins/underline'
import strikethrough from './plugins/strikethrough'
import code from './plugins/code'
import mark from './plugins/mark'
import sup from './plugins/sup'
import sub from './plugins/sub'
import fontsize from './plugins/fontsize'
import fontcolor from './plugins/fontcolor'
import backcolor from './plugins/backcolor'
import alignment from './plugins/alignment'
import list from './plugins/list'
import indent from './plugins/indent'
import quote from './plugins/quote'
import hr from './plugins/hr'
import tasklist from './plugins/tasklist'
import link from './plugins/link'
import markdown from './plugins/markdown'
import alert from './plugins/alert'

import exts from './constants/exts'
import * as ua from './utils/ua'
import $ from './models/node'
import * as StringUtils from './utils/string'
import * as NodeUtils from './utils/node'
import * as RangeUtils from './utils/range'
import * as ClipboardUtils from './utils/clipboard'
import * as ImageUtils from './utils/image'
import * as UploadUtils from './utils/upload'
import * as ChangeUtils from './changes/utils'
import * as OTUtils from './ot/utils'
import TinyCanvas from './helper/tiny-canvas'
import Schema from './parser/schema'
import ExportParser from './parser/export'
import HTMLParser from './parser/html'
import TextParser from './parser/text'
import MarkdownParser from './parser/markdown'
import isHotkey from './utils/is-hotkey'
import * as changes from './changes'
import EmbedToolbar from './embed-toolbar'
import ContentView from './models/content-view'

Engine.card.add('checkbox',Checkbox)
Engine.card.add('hr',Hr)
Engine.plugin.add('paste', paste)
Engine.plugin.add('drop', drop)
Engine.plugin.add('undo',undo)
Engine.plugin.add('selectall', selectall)
Engine.plugin.add('paintformat', paintformat)
Engine.plugin.add('removeformat', removeformat)
Engine.plugin.add('heading',heading)
Engine.plugin.add('bold', bold)
Engine.plugin.add('italic',italic)
Engine.plugin.add('underline',underline)
Engine.plugin.add('strikethrough',strikethrough)
Engine.plugin.add('code', code)
Engine.plugin.add('mark', mark)
Engine.plugin.add('sup', sup)
Engine.plugin.add('sub', sub)
Engine.plugin.add('fontsize',fontsize)
Engine.plugin.add('fontcolor', fontcolor)
Engine.plugin.add('backcolor', backcolor)
Engine.plugin.add('alignment', alignment)
Engine.plugin.add('list', list)
Engine.plugin.add('indent', indent)
Engine.plugin.add('quote', quote)
Engine.plugin.add('hr', hr)
Engine.plugin.add('tasklist', tasklist)
Engine.plugin.add('link', link)
Engine.plugin.add('markdown',markdown)
Engine.plugin.add('alert', alert)
Engine.EXTS = exts
Engine.ua = ua
Engine.$ = $
Engine.StringUtils = StringUtils
Engine.NodeUtils =NodeUtils
Engine.RangeUtils = RangeUtils
Engine.ClipboardUtils = ClipboardUtils
Engine.ImageUtils = ImageUtils
Engine.UploadUtils = UploadUtils
Engine.ChangeUtils = ChangeUtils
Engine.OTUtils = OTUtils
Engine.TinyCanvas = TinyCanvas
Engine.OTUtils = OTUtils
Engine.Schema = Schema
Engine.HTMLParser = HTMLParser
Engine.ExportParser = ExportParser
Engine.TextParser = TextParser
Engine.MarkdownParser = MarkdownParser
Engine.isHotkey = isHotkey
Engine.changes = changes
Engine.EmbedToolbar = EmbedToolbar
Engine.ContentView = ContentView
Engine.registerClipboardExportParser = parser => {
    ClipboardUtils.exportParser = parser
}

export default Engine