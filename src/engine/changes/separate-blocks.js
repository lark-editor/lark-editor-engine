import { getRangeBlocks } from '../changes/utils'
import { createBookmark,moveToBookmark } from '../utils/range'
import { repairListblocks } from '../utils/list'
/**
 * 将选区的列表扣出来，并将切断的列表修复
 * ---
 * <ul>
 *   <li>x</li>
 *   <li><cursor>x</li>
 * </ul>
 * <ol>
 *   <li>x</li>
 *   <li>x<focus></li>
 *   <li>x</li>
 * </ol>
 * ---
 * to
 * ---
 * <ul>
 *   <li>x</li>
 * </ul>
 * <ul>
 *   <li><cursor>x</li>
 * </ul>
 * <ol>
 *   <li>x</li>
 *   <li>x<focus></li>
 * </ol>
 * <ol>
 *   <li>x</li>
 * </ol>
 * ---
 * @param {object} range range对象
 * @return {object} range对象
 */
export default range => {
    let blocks = getRangeBlocks(range)
    // 没找到目标 block
  
    if (blocks.length === 0) {
        return range
    }
    const bookmark = createBookmark(range)
    blocks = repairListblocks(blocks, range)
    const firstBlock = blocks[0]
    const lastBlock = blocks[blocks.length - 1]
    const middleList = []
    const rightList = []
    let listBeforeRange
    let listAfterRange 
    // 修复 range 起始位置切断的 list
  
    if (firstBlock.name === 'li' && firstBlock.prev()) {
      listBeforeRange = firstBlock.parent()
      let indexInRange = 0
  
      while (blocks[indexInRange] && blocks[indexInRange].name === 'li') {
        middleList.push(blocks[indexInRange])
        indexInRange += 1
      }
    }
  
    if (lastBlock.name === 'li' && lastBlock.next()) {
      listAfterRange = lastBlock.parent()
      let nextBlock = lastBlock.next()
  
      while (nextBlock && nextBlock.name === 'li') {
        rightList.push(nextBlock)
        nextBlock = nextBlock.next()
      }
    }
  
    let listAfterRangeClone
  
    if (rightList.length > 0) {
      listAfterRangeClone = listAfterRange.clone(false)
      rightList.forEach(li => {
        listAfterRangeClone.append(li[0])
      })
      listAfterRange.after(listAfterRangeClone)
    }
  
    let listBeforeRangeClone
  
    if (middleList.length > 0) {
      listBeforeRangeClone = listBeforeRange.clone(false)
      middleList.forEach(li => {
        listBeforeRangeClone.append(li[0])
      })
      listBeforeRange.after(listBeforeRangeClone)
    }
  
    if (listBeforeRange && listAfterRange && listAfterRange[0] === listBeforeRange[0] && listBeforeRange.name === 'ol') {
      const newStart = (parseInt(listBeforeRange.attr('start'), 10) || 1) + listBeforeRange.find('li').length
      listAfterRangeClone.attr('start', newStart)
    }
  
    moveToBookmark(range, bookmark)
    return range
}