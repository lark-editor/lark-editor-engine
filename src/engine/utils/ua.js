const ua = navigator.userAgent // Mozilla/5.0 (Windows NT 10.0 Win64 x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.140 Safari/537.36 Edge/17.17134

const edge = /edge/i.test(ua) // Mozilla/5.0 (Macintosh Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36

const chrome = !edge && /chrome/i.test(ua) // Mozilla/5.0 (Macintosh Intel Mac OS X 10.13 rv:62.0) Gecko/20100101 Firefox/62.0

const firefox = /firefox/i.test(ua) // Mozilla/5.0 (Macintosh Intel Mac OS X 10_13_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/11.1 Safari/605.1.15

const safari = !edge && !chrome && /safari/i.test(ua) // Mozilla/5.0 (iPhone CPU iPhone OS 12_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/16B92 AliApp(DingTalk/4.5.18) com.laiwang.DingTalk/10640366 Channel/201200 language/zh-Hans-CN

const dingtalk = /dingtalk/i.test(ua) // mobile device

const mobile = /mobile/i.test(ua) // iOS

const ios = /os [\.\_\d]+ like mac os/i.test(ua) // Android

const android = /android/i.test(ua) // Mac OS X

const macos = !ios && /mac os x/i.test(ua) // Windows

const windows = /windows\s*(?:nt)?\s*[\.\_\d]+/i.test(ua)

export {
    edge,
    chrome,
    firefox,
    safari,
    dingtalk,
    mobile,
    ios,
    android,
    macos,
    windows
}