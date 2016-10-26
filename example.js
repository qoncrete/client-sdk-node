const qsdk = require('./index')

// Create a new client.
const client = new qsdk.QoncreteClient({
    sourceID: 'SOURCE_ID',
    apiToken: 'API_TOKEN'
})

// Send a log with promises and extra options.
// In this case, if the request timeout after 15s, it will retry one more time.
client.send({ user: 'name', action: 'purchase', price: 99.99 }, { timeoutAfter: 15000, retryOnTimeout: 1 }).
    then(() => {
        console.log('SUCCESS')
    }).
    catch((ex) => {
        console.log('ERROR:', ex)
    })

// Fire & Forget
client.send({ user: 'name', action: 'purchase', price: 99.99 })

// Default options & callback style.
client.send({ user: 'name', action: 'purchase', price: 99.99 }, {}, error => console.log(error || 'SUCCESS'))

// Disable auto batching
// Create a new client without auto batching.
const noBatchClient = new qsdk.QoncreteClient({
    sourceID: 'SOURCE_ID',
    apiToken: 'API_TOKEN',
    autoBatch: false
})

// send normally.
noBatchClient.send({ user: 'name', action: 'purchase', price: 99.99 }, {}, error => console.log(error || 'SUCCESS'))
