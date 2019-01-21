 ;(function(factory) {
    if (typeof define === 'function' && (define.cmd || define.amd)) {
        define(factory)
    } else if (typeof exports === 'object' && typeof module === 'object') {
        module.exports = factory()
    } else {
        window.XHRProxy = factory()
    }
 })(function () {

    function initial (proxyConfig = {}) {

        window._backup_xhr = window._backup_xhr || window.XMLHttpRequest
        window._proxy_xhr_list = []

        window.XMLHttpRequest = function () {

            let xhr = this.xhr = new window._backup_xhr          
            this.xhr._pid = window._proxy_xhr_list.length + 1
            window._proxy_xhr_list.push(this.xhr)

            for (prop in proxyConfig) {
                if (proxyConfig[prop] && proxyConfig[prop].hasOwnProperty('default')) {
                    try {
                        this.xhr[prop] = proxyConfig[prop].default
                    } catch (e) {}
                }
            }
            
            let handler = {
                set: function (target, propName, newValue) {
                    let type = Object.prototype.toString.call(proxyConfig[propName])    
                    if (type === '[object Function]') { // 回调方法
                        xhr[propName] = function () {
                            proxyConfig[propName].apply(xhr) !== false && newValue.apply(xhr, target)
                        }
                    } else { 
                        if (proxyConfig.hasOwnProperty(propName) && Object.prototype.toString.call(proxyConfig[propName]) === '[object Object]' && proxyConfig[propName].hasOwnProperty('setter')) {
                            try { xhr[propName] = proxyConfig[propName]['setter'].call(xhr, newValue) }
                            catch (e) {}
                        } else {
                            xhr[propName] = newValue
                        }
                    }
                    return true
                },
                get: function (target, propName, pxy) {
                    let type = Object.prototype.toString.call(xhr[propName])
                    if (type === '[object Function]') { // 直接调用的方法 xhr.function
                        return function () {
                            let args = [].slice.apply(arguments)
                            if (!proxyConfig[propName]) return xhr[propName].apply(xhr, args)
                            let result = proxyConfig[propName].apply(xhr, args)
                            return result === false ? result : xhr[propName].apply(xhr, args)
                        }
                    } else { // other， 回调方法or属性
                        let haveGetter =  (proxyConfig[propName] || {}).hasOwnProperty('getter') // 判断是否有getter钩子
                        return haveGetter ? proxyConfig[propName]['getter'].call(xhr, xhr[propName]) : xhr[propName]
                    }
                }
            }

            return new Proxy(this, handler)
        }
    }

    function uninstall () {
        if (window._backup_xhr) {
            window.XMLHttpRequest = window._backup_xhr
            window._backup_xhr = undefined
        }
    }

    function abortAllRequest () {
        if (!window._proxy_xhr_list || window._proxy_xhr_list.length === 0) return
        window._proxy_xhr_list.forEach((xhr) => {
            xhr.abort()
        })
    }

    let XHRProxy =  {
        initial: initial,
        unistall: uninstall,
        setXHRProxy: initial,
        abortAllRequest: abortAllRequest
    }

    return XHRProxy
 })