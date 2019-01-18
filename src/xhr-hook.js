;(function(factory) {
    if (typeof define === 'function' && (define.amd || define.cmd)) {
        define(factory)
    } else if (typeof exports === 'object' && typeof module === 'object') {
        module.exports = factory()
    } else {
        window.XhrHook = factory()
    }
})(function () {

    function setXHRProxy(globalHook) {
        window._xhr = window._xhr || window.XMLHttpRequest
        window.XMLHttpRequest = function () {
            this._whoAmI = '@xhr_proxy'
            this.xhr = new window._xhr
            for (let attrName in this.xhr) {
                let type = Object.prototype.toString.call(this.xhr[attrName])
                if (type === '[object Function]') {
                    proxyFunc.call(this, attrName)
                } else {
                    proxyProps.call(this, attrName)
                }
            }
        }

        function proxyFunc (attrName) {
            this[attrName] = function () { 
                let args = [].slice.call(arguments)

                if (globalHook[attrName] && globalHook[attrName].apply(this, args) === false) {
                    return
                }
                return this.xhr[attrName].apply(this.xhr, args)
            }
        }

        function proxyProps (attrName) {
            
            let rootScope = this
            let trueXhrScope = this.xhr

            Object.defineProperty(this, attrName, {
                get: function () {
                    let value = rootScope.hasOwnProperty('_' + attrName) ? rootScope['_' + attrName] : trueXhrScope[attrName]
                    let getterResult = globalHook[attrName] || {}
                    try {
                        getterResult = getterResult['getter'].call(rootScope, value)
                    } catch (e) {
                        getterResult = value
                    }
                    return getterResult
                },
                set: function (newValue) {
                    if (attrName === 'onload') {
                        console.log('bp')
                    }
                    let type = Object.prototype.toString.call(globalHook[attrName])
                    if (type === '[object Function]') {
                        let args = [].slice.call(arguments)
                        trueXhrScope[attrName] = function () {
                            globalHook[attrName].apply(rootScope) !== false && newValue.apply(rootScope)
                        }
                    } else {
                        let haveSetter = (globalHook[attrName] || {})["setter"]
                        newValue = haveSetter && globalHook[attrName].setter.call(rootScope, newValue) || newValue
                        try {
                            trueXhrScope[attrName] = newValue
                        } catch (e) {
                            rootScope["_" + attrName] = newValue
                        }
                    }
                }
            })
            if (globalHook[attrName] && Object.prototype.toString.call(globalHook[attrName]) === '[object Object]') {
                    let value = globalHook[attrName]['getter']
                    try {
                        this.xhr[attrName] = value
                    } catch (e) {
                        this['_' + attrName] = value
                    }
            }
        }
    }

    function removeXHRProxy() {
        if (window.XMLHttpRequest) window.XMLHttpRequest = window._xhr
        window._xhr = undefined
    }

    let XhrHook = {
        setXHRProxy: setXHRProxy,
        removeXHRProxy: removeXHRProxy
    }
    return XhrHook
})