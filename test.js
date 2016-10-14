const qsdk = require('./index')

const client = new qsdk.QoncreteClient({
    sourceID: 'SOURCE_ID',
    apiToken: 'API_TOKEN'
})

client.send({ user: 'name', action: 'purchase', price: 99.99 }, { timeoutAfter: 3000, retryOnTimeout: 1 }).
    then(() => {
        console.log('SUCCESS')
    }).
    catch((ex) => {
        console.log('ERROR:', ex)
    })

client.send({ user: 'name', action: 'purchase', price: 99.99 })
client.send({ user: 'name', action: 'purchase', price: 99.99 }, {}, error => console.log(error || 'SUCCESS'))
