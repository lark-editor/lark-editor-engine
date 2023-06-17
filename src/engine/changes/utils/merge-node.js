import getNodeModel from '../../models/node'

export default function(node, otherNode){
  const is_remove = !(arguments.length > 2 && void 0 !== arguments[2]) || arguments[2]
  node = getNodeModel(node)
  otherNode = getNodeModel(otherNode)

  if (otherNode.isText()) {
    node.append(otherNode)
    return
  }

  let mergedNode = otherNode
  const node_is_list = ['ul', 'ol'].includes(node.name)
  const other_is_list = ["ul", "ol"].includes(otherNode.name)
  // p 与列表合并时需要做特殊处理
  if (node_is_list && !other_is_list) {
    const liBlocks = node.find('li')
    if (liBlocks.length === 0) {
      return
    }
    node = getNodeModel(liBlocks[liBlocks.length - 1])
  } 
  if (!node_is_list && other_is_list) {
    const liBlocks = otherNode.find('li')
    if (liBlocks.length > 0) {
      otherNode = getNodeModel(liBlocks[0])
    }
    if(liBlocks[1]){
      mergedNode = getNodeModel(liBlocks[0])
    }
  }

  if(node.last() && node.last().name === 'br'){
    node.last().remove()
  }

  let child = otherNode.first()

  while (child) {
    const next = child.next()
    if(node.isTitle()){
      child.removeFontSize()
    }
    node.append(child)
    child = next
  }
  if(is_remove)
    mergedNode.remove()
}