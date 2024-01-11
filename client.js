const net = require('net')
const readline = require('readline')

const client = net.createConnection({ port: 3000 }, () => {
    //console.log a ‘connected’ message when it has successfully connected to the server
    console.log('Connected')

    //Forward input from stdin
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    })
    rl.on('line', (message) => {
        client.write(message)
    })
    client.on('end', () => {
        console.log('Disconnected from the Server')
        rl.close()
    })

})

client.on('data', (data) => {
    //console.log any messages received from the server.
    console.log('Server: ' + data.toString())
})

client.setEncoding('utf-8')