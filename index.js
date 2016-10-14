'use strict'

const HTTPRequester = require('unirest')

const LOGGER_ENDPOINT = 'https://log.qoncrete.com'
const TIME = { SECOND: 1000 }

const noop = () => {}
const isUUID = id => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)

let sendLogdEndpoint

class QoncreteClient {
    constructor({ sourceID, apiToken }) {
        ({ sourceID, apiToken } = validateQoncreteClient({ sourceID, apiToken }))
        sendLogdEndpoint = `${LOGGER_ENDPOINT}/${sourceID}?token=${apiToken}`
    }

    send(data, { timeoutAfter = 15 * TIME.SECOND, retryOnTimeout = 0 } = {}, callback = noop) {
        return new Promise((resolve, reject) => {
            const endPromiseAndCall = makeEndPromiseAndCall(resolve, reject, callback)

            HTTPRequester.post(sendLogdEndpoint).
                headers({ 'Content-Type': 'application/json' }).
                timeout(timeoutAfter).
                send(data).
                end((response) => {
                    if (response.status === 204)
                        return endPromiseAndCall(null)
                    if (response.error && !response.body) {
                        if (!~['ESOCKETTIMEDOUT', 'ETIMEDOUT'].indexOf(response.error.code))
                            return endPromiseAndCall(new QoncreteError(ErrorCode.NETWORK_ERROR.name, response.error.message))
                        if (retryOnTimeout > 0)
                            return resolve(this.send(data, { timeoutAfter, retryOnTimeout: retryOnTimeout - 1 }, callback))
                        return endPromiseAndCall(new QoncreteError(ErrorCode.TIMEDOUT.name, 'The request took too long time.'))
                    }
                    endPromiseAndCall(new QoncreteError(
                        (response.clientError) ? ErrorCode.CLIENT_ERROR.name : ErrorCode.SERVER_ERROR.name,
                        response.body)
                    )
                }
            )
        })
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

function makeEndPromiseAndCall(resolve, reject, callback) {
    return function(err, ...args) {
        if (err) {
            reject(err)
            callback(err)
        }
        resolve(...args)
        callback(null, ...args)
    }
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
