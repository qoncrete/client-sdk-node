const Qsdk = require('./index')

// Create a new client.

const client = new Qsdk.QoncreteClient({
    sourceID: 'SOURCE_ID', // MANDATORY: The source ID. (Once logged-in, can be found at https://qoncrete.com/account/#!/source)
    apiToken: 'API_TOKEN',// MANDATORY: The api token. (Once logged-in, can be found at https://qoncrete.com/account/#!/token)
    errorLogger: console.error,  // A function called on error. Default: () => {}
    secureTransport: false, // Send log over SSL. Default: false
    cacheDNS: true, // Active userland dns cache. Default: true"
    timeoutAfter: 15000, // Abort the query on timeout. Default: 15s
    retryOnTimeout: 1, // Number of times to resend the log on timeout. Default: 1 (on timeout, it will retry one more time)
    autoBatch: true, // Try to send log by batch instead of sending them one by one. Default: true
    batchSize: 1000, // Only matters if autoBatch is True. Number of logs to send in a batch. Default: 1000, Max: 1000
    autoSendAfter: 2000, // Only matters if autoBatch is True. Time after the logs will be sent if the batch is not full. Default: 2s
    concurrency: 200 // Number of simultaneous queries that can be made, can be set lower or higher depending your server configuration. Default: 200
})

client.send({ user: 'toto', action: 'purchase', price: 99.99 })
