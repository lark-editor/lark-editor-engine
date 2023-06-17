import filesize from 'filesize'
import mime from '../constants/mime'
import exts from '../constants/exts'
import { windows } from './ua'

// 获取文件的大小限制
const isSizeLimit = (type, size) => {
    const rules = {
        file: 1024 * 1024 * 500,
        video: 1024 * 1024 * 200,
        image: 1024 * 1024 * 10,
        previewOffice:1024 * 1024 * 100,
        previewMacOffice:1024 * 1024 * 200,
        previewPdf:1024 * 1024 * 100,
    }
    return rules[type] > size
} 

// 获取上传的进度
const getUploadPercent = progress => {
    if (!progress) return 0
    let percent = parseInt(progress.percent, 10)
  
    if (percent === 100) {
        percent = 99
    }
    return percent
} 

// 获取文件的大小
const getFileSize = (size,base) => {
    base = base || windows ? 2 : 10
    if (size < 1048576) {
        return filesize(size, {
            base,
            exponent: 1,
            round: 0
        })
    }

    return filesize(size, {
        base,
        exponent: 2,
        round: 1
    })
} 

// 获取文件扩展名
const getFileExtname = file => {
    if (typeof file === 'string') {
        return file.split('.').pop()
    }
    let ext = mime[file.type] && mime[file.type][0]
    if (!ext) {
        ext = file.name.split('.').pop()
    }
    return ext
} 

// 判断是不是图片文件
const isImage = file => {
    const ext = getFileExtname(file)
    return exts.IMAGE_EXT.indexOf(ext) >= 0
} 

// 判断是不是文件
const isFile = file => {
    const ext = getFileExtname(file)
    return exts.FILE_EXT.indexOf(ext) >= 0
} 

const isTextFile = file => {
    const ext = getFileExtname(file)
    return exts.TEXT_FILE_EXT.indexOf(ext) >= 0
}

// 判断是不是视频文件
const isVideo = file => {
    const ext = getFileExtname(file)
    return exts.VIDEO_EXT.indexOf(ext) >= 0
} 

// 判断是不是 Office 文件
const isOffice = file => {
    const ext = getFileExtname(file)
    return exts.OFFICE_EXT.indexOf(ext) >= 0
} 

const isMacOffice = file => {
    const ext = getFileExtname(file)
    return exts.MAC_OFFICE_EXT.indexOf(ext) >= 0
}

const isPdf = file => {
    const ext = getFileExtname(file)
    return ["pdf"].indexOf(ext) >= 0
}

// 插入上传中卡片
const insertCard = (engine, name, value) => {
    if (name.indexOf(':') >= 0) {
        name = name.split(':')[1]
    }

    if (name !== 'image') {
        value.src = ''
    }

    value.status = 'uploading'
    value.percent = getUploadPercent(value.progress)
    engine.history.stop()
    const cardRoot = engine.change.insertCard(name, value)
    engine.history.start()
    return cardRoot
} 

function updateImageCallback(engine, cardRoot, value, updateHistory) {
    engine.history.stop()
    engine.change.updateCard(cardRoot, value)
    engine.history.start()
    if(updateHistory){
        engine.history.update(true)
    }else{
        engine.history.save()
    }
}

const updateImage = (engine, cardRoot, value, updateHistory, i) => {
    const image = new Image()
    image.src = value.src
    image.onload = () => {
        updateImageCallback(engine, cardRoot, value, updateHistory)
    }
    image.onerror = () => {
        if(i <=3 ){
            setTimeout(() => {
                i++
                updateImage(engine, cardRoot, value, updateHistory, i)
            }, 500 * i)
        }else{
            updateImageCallback(engine, cardRoot, value, updateHistory)
        }
    }
}

// 更新进度条
const updateCardProgress = (cardRoot, value) => {
    value.status = 'uploading'
    const percent = getUploadPercent(value.progress)
    cardRoot.find('[data-role=percent]').html("".concat(percent, "%"))
} 

// 更新卡片，变成已完成
const updateCard = (engine, cardRoot, value, updateHistory) => {
    const name = cardRoot.attr('data-lake-card')
    // 上传成功
    if (value.status === 'done') {
        const newValue = engine.card.getValue(cardRoot)
        newValue.status = 'done';
        newValue.src = value.src;
        newValue.message = value.message;
        newValue.size = newValue.size || 0;

        if (name === 'image') {
            updateImage(engine, cardRoot, newValue,updateHistory,0)
        } else {
            updateImageCallback(engine, cardRoot, newValue,updateHistory)
        }
        return
    } 
    // 上传失败
    if (value.status === 'error') {
        const _newValue = engine.card.getValue(cardRoot)
        _newValue.status = 'error'
        _newValue.src = ''
        _newValue.message = value.message
        _newValue.size = _newValue.size || 0
        engine.history.stop()
        engine.change.updateCard(cardRoot, _newValue)
        engine.history.start()

        if (updateHistory) {
            engine.history.update(true)
        } else {
            engine.history.save()
        }
    }
}

export {
    isSizeLimit,
    getUploadPercent,
    getFileSize,
    getFileExtname,
    isImage,
    isFile,
    isTextFile,
    isVideo,
    isOffice,
    insertCard,
    updateCardProgress,
    updateCard,
    isMacOffice,
    isPdf
}