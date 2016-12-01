# Qoncrete NodeJS Client SDK

Client SDK to be used in NodeJS V6.8.0+.

## Installation
Using npm:
```bash
npm install qoncrete-sdk-node
```
Using yarn
```bash
yarn add qoncrete-sdk-node
```

## Usage
```javascript
// 1) Require sdk
const Qsdk = require('qoncrete-sdk-node')
// 2) Create a new client.
const client = new Qsdk.QoncreteClient({
    sourceID: 'SOURCE_ID',
    apiToken: 'API_TOKEN',
})
// 3) send a log
client.send({ user: 'toto', action: 'purchase', price: 99.99 })
```

## Client Options
```javascript
const client = new Qsdk.QoncreteClient({
    sourceID: 'SOURCE_ID', // MANDATORY: The source ID. (Once logged-in, can be found at https://qoncrete.com/account/#!/source)
    apiToken: 'API_TOKEN',// MANDATORY: The api token. (Once logged-in, can be found at https://qoncrete.com/account/#!/token)
    errorLogger: (err) => {},  // A function called on error. Default: (err) => {}
    secureTransport: false, // Send log over SSL. Default: false
    cacheDNS: true, // Active userland dns cache. Default: true"
    timeoutAfter: 15000, // Abort the query on timeout. Default: 15s
    retryOnTimeout: 1, // Number of times to resend the log on timeout. Default: 1 (on timeout, it will retry one more time)
    autoBatch: true, // Try to send log by batch instead of sending them one by one. Default: true
    batchSize: 1000, // Only matters if autoBatch is True. Number of logs to send in a batch. Default: 1000, Max: 1000
    autoSendAfter: 2000, // Only matters if autoBatch is True. Time after the logs will be sent if the batch is not full. Default: 2s
    concurrency: 200 // Number of simultaneous queries that can be made, can be set lower or higher depending your server configuration. Default: 200
})
```


### Example 1: Send each line of a log file.
> Example with a log file that contains one json object per line. on the form:

```json
// test.log
{ "user": "toto", "action": "purchase", "price": 99.99 }
{ "user": "titi", "action": "purchase", "price": 42.00 }
{ "user": "tata", "action": "purchase", "price": 84.21 }
// ...
```

```javascript
const Qsdk = require('qoncrete-sdk-node')
const readline = require('readline')
const fs = require('fs')

const client = new Qsdk.QoncreteClient({
    sourceID: 'SOURCE_ID',
    apiToken: 'API_TOKEN',
    errorLogger: console.error
})
const rl = readline.createInterface({
    input: fs.createReadStream('test.log')
})

rl.on('line', (line) => { client.send(line) })
rl.on('close', () => console.log('Done reading log file.'))
```

This is the Node client for [qoncrete's custom analytics platform](https://www.qoncrete.com).
