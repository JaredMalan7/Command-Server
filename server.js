const net = require('net')
const fs = require('fs')

const clients = []
let clientIdCounter = 0

const server = net.createServer((socket) => {
    const clientId = ++clientIdCounter
    clients.push({ id: clientId, socket })

    // Log connection message to chat.log file
    fs.appendFileSync('chat.log', `Client${clientId} connected\n`)

    // Send welcome message to the newly connected client
    socket.write(`Welcome to the chat, Client${clientId}!\n`)

    // Send notification to all other clients about the new user
    broadcast(`Client${clientId} has joined the chat.\n`, clientId)

    // Log the connection message to chat.log
    fs.appendFileSync('chat.log', `Client${clientId} has joined the chat.\n`)

    // Handles data received from the client
    socket.on('data', (chunk) => {
        let clientMsg = chunk.toString().trim()

        // Rebroadcast the client's message to all clients (excluding the sender)
        broadcast(`Client${clientId}: ${clientMsg}\n`, clientId)

        // Log the message to chat.log
        fs.appendFileSync('chat.log', `Client${clientId}: ${clientMsg}\n`)
    })

    // Handles client disconnection
    socket.on('end', () => {
        // Remove the client from the list of connected clients
        const index = clients.findIndex((client) => client.id === clientId)
        if (index !== -1) {
            clients.splice(index, 1)
        }

        // Send notification to all other clients about the user's disconnection
        broadcast(`Client${clientId} has left the chat.\n`, clientId)

        // Log the disconnection message to chat.log
        fs.appendFileSync('chat.log', `Client${clientId} has left the chat.\n`)
    })

}).listen(3000, () => {
    console.log(`Server listening on port ${server.address().port}`)
})

// Function to broadcast messages to all clients
function broadcast(message, senderId) {
    clients.forEach((client) => {
        if (client.id !== senderId) {
            client.socket.write(message)
        }
    })
}
