export default {
    initialize:function() {
        const insertCardAble = dropRange =>{
            // 找不到目标位置
            // TODO: 临时解决，如果 drop Range 在卡片里则不触发
            return !dropRange || this.card.closest(dropRange.commonAncestorContainer)
        }
    
        this.domEvent.onDrop(data => {
            const { e , dropRange , cardRoot , files } = data
            // 放下卡片
            if (cardRoot) {
                e.preventDefault()
                // 找不到目标位置
                if (insertCardAble(dropRange)) {
                    return
                }
        
                const component = this.card.getComponent(cardRoot)
                // 移动卡片之前，先保存历史记录
                this.history.save()
                // 停止生成历史记录
                this.history.stop()
        
                this.change.removeCard(cardRoot)
        
                this.change.select(dropRange)
        
                this.change.insertCard(component.name, component.value) 
                // 保存历史记录
        
                this.history.save()
        
                return
            } // 放下文件
    
    
            if (files.length > 0) {
                e.preventDefault()
        
                if (insertCardAble(dropRange)) {
                    return
                }
        
                this.change.select(dropRange);
        
                this.event.trigger('drop:files', files)
            }
        })
    }
}