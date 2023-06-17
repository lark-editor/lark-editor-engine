import getNodeModel from '../models/node'
import { escape } from '../utils/string'

const template = options => {
  return '\n  <div data-lake-element="embed-tooltip" class="lake-tooltip lake-tooltip-placement-'.concat(options.placement, ' lake-embed-tooltip" style="transform-origin: 50% 45px 0px;">\n    <div class="lake-tooltip-content">\n      <div class="lake-tooltip-arrow"></div>\n      <div class="lake-tooltip-inner" data-role="tooltip"></div>\n    </div>\n  </div>\n  ')
}
  
export default {
    show:function(node, title, options){
      options = options || {
        placement:"top"
      }
      this.hide()
      const root = getNodeModel(template(options)) 
      // 设置提示文字
      title = escape(title)
      root.find('[data-role=tooltip]').html(title)
      // 计算定位
      const container = getNodeModel(document.body)
      container.append(root)
      const rootWidth = root[0].clientWidth
      const rootHeight = root[0].clientHeight
      const nodeWidth = node[0].clientWidth
      const offset = node.offset()
      const left = Math.round(window.pageXOffset + offset.left + nodeWidth / 2 - rootWidth / 2)
      const top = Math.round(window.pageYOffset + offset.top - rootHeight - 2)
      root.css({
        left: left + 'px',
        top: top + 'px'
      });
      root.addClass('lake-embed-tooltip-active')
    },
    hide:function(){
      getNodeModel('div[data-lake-element=embed-tooltip]').remove()
    }
}