import CODE_EXT from './code'
import IMAGE_EXT from './image'
import MAC_OFFICE_EXT from './mac-office'
import OFFICE_EXT from './ms-office'
import FILE_EXT from './file'

const VIDEO_EXT = ['mp4']

const TEXT_FILE_EXT = ["txt","md"].concat(CODE_EXT)

const join = exts => {
    return exts.map(function (ext) {
        return ".".concat(ext)
    }).join(', ')
}

export default {
  FILE_EXT: FILE_EXT,
  FILE_EXT_STR: join(FILE_EXT),
  IMAGE_EXT: IMAGE_EXT,
  IMAGE_EXT_STR: join(IMAGE_EXT),
  VIDEO_EXT: VIDEO_EXT,
  VIDEO_EXT_STR: join(VIDEO_EXT),
  OFFICE_EXT: OFFICE_EXT,
  OFFICE_EXT_STR: join(OFFICE_EXT),
  MAC_OFFICE_EXT: MAC_OFFICE_EXT,
  MAC_OFFICE_STR: join(MAC_OFFICE_EXT),
  TEXT_FILE_EXT: TEXT_FILE_EXT
}

