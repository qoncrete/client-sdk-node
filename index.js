'use strict'

const HTTPRequester = require('unirest')

const TIME = { SECOND: 1000 }

const noop = () => {}
const isUUID = id => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)

const async = require('async')

class QoncreteClient {
    constructor({
        sourceID, apiToken, errorLogger = noop,
        secureTransport = false, cacheDNS = true,
        timeoutAfter = 15 * TIME.SECOND, retryOnTimeout = 1,
        autoBatch = true, batchSize = 1000,
        autoSendAfter = 2 * TIME.SECOND, concurrency = 200
    }) {
        ({ sourceID, apiToken } = validateQoncreteClient({ sourceID, apiToken }))
        this.timeoutAfter = timeoutAfter
        this.retryOnTimeout = retryOnTimeout
        this.errorLogger = errorLogger
        this.sendLogEndpoint = `http${secureTransport ? 's' : ''}://log.qoncrete.com/${sourceID}?token=${apiToken}`
        this.sendBatchLogEndpoint = `http${secureTransport ? 's' : ''}://log.qoncrete.com/${sourceID}/batch?token=${apiToken}`
        this.keepAliveAgent = {
            keepAlive: true,
            keepAliveMsec: 5000,
            maxSockets: Infinity,
            maxFreeSocket: 512
        }
        require('dnscache')({ enable: !!cacheDNS, ttl: 300, cachesize: 1000 })
        if (batchSize <= 0 || batchSize > 1000)
            throw new QoncreteError(ErrorCode.CLIENT_ERROR.name, 'batchSize must be included between 1 and 1000')
        this.batchSize = batchSize
        this.autoBatch = !!autoBatch
        this.autoSendAfter = autoSendAfter
        this.logPool = []
        if (this.autoBatch)
            this._initAutoSendBatch()
        this.queue = async.queue((task, cbk) => this._sendNow(task, cbk), concurrency)
    }

    _initAutoSendBatch() {
        if (this.autoSendIntervalID)
            clearInterval(this.autoSendIntervalID)
        this.autoSendIntervalID = setInterval(() => {
            if (this.logPool.length) {
                this.queue.push({ batch: this.logPool.splice(0, this.batchSize), retryOnTimeout: this.retryOnTimeout }, (err) => {
                    if (err)
                        this.errorLogger(err)
                })
                this._initAutoSendBatch()
            }
        }, this.autoSendAfter)
    }

    send(data) {

        if (typeof data === 'string') {
            try {
                data = JSON.parse(data)
            } catch (ex) {
                return this.errorLogger(new QoncreteError(ErrorCode.CLIENT_ERROR, ex))
            }
        }
        this.logPool = this.logPool.concat(data)
        if (!this.autoBatch || this.logPool.length >= this.batchSize)
        {
            this.queue.push({ batch: this.logPool.splice(0, this.batchSize), retryOnTimeout: this.retryOnTimeout }, (err) => {
                if (err)
                    this.errorLogger(err)
            })
            this._initAutoSendBatch()
        }
    }

    _sendNow({ batch, retryOnTimeout }, cbk) {
        if (!batch.length)
            return setImmediate(cbk)
        let endpoint = this.sendBatchLogEndpoint
        let data = batch

        if (batch.length === 1) {
            endpoint = this.sendLogEndpoint
            data = batch[0]
        }

        HTTPRequester.post(endpoint).
            headers({ 'Content-Type': 'application/json' }).
            timeout(this.timeoutAfter).
            pool(this.keepAliveAgent).
            send(data).
            end((response) => {
                if (response.status === 204)
                    return cbk()
                if (response.error && !response.body) {
                    if (!~['ESOCKETTIMEDOUT', 'ETIMEDOUT'].indexOf(response.error.code)) {
                        return cbk(this.errorLogger(new QoncreteError(ErrorCode.NETWORK_ERROR.name, response.error.message)))
                    }
                    if (retryOnTimeout > 0)
                        return this._sendNow({ batch, retryOnTimeout: retryOnTimeout - 1 }, cbk)
                    return cbk(this.errorLogger(new QoncreteError(ErrorCode.TIMEDOUT.name, 'The request took too long time.')))
                }

                cbk(this.errorLogger(new QoncreteError(
                        (response.clientError) ? ErrorCode.CLIENT_ERROR.name : ErrorCode.SERVER_ERROR.name,
                        response.body)
                    )
                )
            })
    }

    destroy() {
        if (this.autoBatch)
            clearInterval(this.logScheduler)
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
