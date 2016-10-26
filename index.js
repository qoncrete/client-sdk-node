'use strict'

const HTTPRequester = require('unirest')

const SCHEME = 'https'
const LOGGER_ENDPOINT = `${SCHEME}://log.qoncrete.com`
const TIME = { SECOND: 1000 }

const noop = () => {}
const isUUID = id => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)

class QoncreteClient {
    constructor({ sourceID, apiToken, autoBatch = true }) {
        ({ sourceID, apiToken } = validateQoncreteClient({ sourceID, apiToken }))
        this.autoBatch = autoBatch
        this.sendLogdEndpoint = `${LOGGER_ENDPOINT}/${sourceID}?token=${apiToken}`
        this.keepAliveAgent = {
            keepAlive: true,
            keepAliveMsec: 5000,
            maxSockets: Infinity,
            maxFreeSocket: 512
        }
        if (this.autoBatch === true)
            this._initAutoBatching()
    }

    _initAutoBatching() {
        this.logPool = []
        this.logScheduler = setInterval(() => {
            if (!this.logPool.length)
                return
            console.log('send items via interval...')
        }, 2 * TIME.SECOND)
    }

    send(data, { timeoutAfter = 15 * TIME.SECOND, retryOnTimeout = 0 } = {}, callback = noop) {
        const p = new Promise((resolve, reject) => {
            HTTPRequester.post(this.sendLogdEndpoint).
                headers({ 'Content-Type': 'application/json' }).
                timeout(timeoutAfter).
                pool(this.keepAliveAgent).
                send(data).
                end((response) => {
                    if (response.status === 204)
                        return resolve(null)
                    if (response.error && !response.body) {
                        console.log(response.error)
                        if (!~['ESOCKETTIMEDOUT', 'ETIMEDOUT'].indexOf(response.error.code))
                            return reject(new QoncreteError(ErrorCode.NETWORK_ERROR.name, response.error.message))
                        if (retryOnTimeout > 0)
                            return this.send(data, { timeoutAfter, retryOnTimeout: retryOnTimeout - 1 }, callback)
                        return reject(new QoncreteError(ErrorCode.TIMEDOUT.name, 'The request took too long time.'))
                    }
                    reject(new QoncreteError(
                            (response.clientError) ? ErrorCode.CLIENT_ERROR.name : ErrorCode.SERVER_ERROR.name,
                            response.body
                        )
                    )
                }
            )
        })

        if (typeof callback !== 'function')
            return p
        return p.
            then((...args) => callback(null, ...args)).
            catch((err) => callback(err))
    }

    destroy() {
        if (this.autoBatch)
            clearInterval(this.logScheduler)
    }
}

class Log {
    constructor(data, opts, callback) {
        this.data = data
        this.opts = opts
        this.callback = callback
    }
}

function validateQoncreteClient({ sourceID, apiToken })
{
    if (!(sourceID && apiToken))
        throw new QoncreteError(ErrorCode.CLIENT_ERROR.name, '`sourceID` and `apiToken` must be specified.')

    sourceID = sourceID.toLowerCase()
    apiToken = apiToken.toLowerCase()
    if (!(isUUID(sourceID) && isUUID(apiToken)))
        throw new QoncreteError(ErrorCode.CLIENT_ERROR.name, '`sourceID` and `apiToken` must be valid UUIDs.')

    return { sourceID, apiToken }
}

class ErrorCode {
    constructor(name) {
        this.name = name
    }

    toString() {
        return `ErrorCode.${this.name}`
    }
}
ErrorCode.INVALID_BODY = new ErrorCode('INVALID_BODY')
ErrorCode.TIMEDOUT = new ErrorCode('TIMEDOUT')
ErrorCode.CLIENT_ERROR = new ErrorCode('CLIENT_ERROR')
ErrorCode.SERVER_ERROR = new ErrorCode('SERVER_ERROR')
ErrorCode.NETWORK_ERROR = new ErrorCode('NETWORK_ERROR')

class QoncreteError extends Error {
    constructor(code, message) {
        super(message)
        this.name = this.constructor.name
        this.message = message
        this.stack = null
        this.code = code
    }
}

module.exports.QoncreteClient = QoncreteClient
