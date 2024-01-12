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

        // Check if it's a whisper
        if (clientMsg.startsWith('/w')) {
            handleWhisperCommand(clientMsg, clientId)
        } else if (clientMsg.startsWith('/username')) {
            handleUsernameCommand(clientMsg, clientId)
        } else {
            // Rebroadcast the client's message to all clients (excluding the sender)
            broadcast(`Client${clientId}: ${clientMsg}\n`, clientId)
            // Log the message to chat.log
            fs.appendFileSync('chat.log', `Client${clientId}: ${clientMsg}\n`)
        }
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
function broadcast(message, senderId, isWhisper = false) {
    const senderClient = clients.find((client) => client.id === senderId)
    const senderUsername = senderClient.username || `Client${senderId}`

    clients.forEach((client) => {
        if (client.id !== senderId) {
            if (!isWhisper) {
                const displayUsername = (client.id === senderId) ? senderUsername : senderClient.username || `Client${senderId}`
                const updatedMessage = message.replace(`Client${senderId}`, displayUsername)
                client.socket.write(`${updatedMessage}\n`)
            }
        }
    })
}



// Function to handle whisper command
function handleWhisperCommand(command, senderId) {
    const args = command.split(' ')

    if (args.length < 3) {
        // error message for incorrect number of inputs
        const errorMessage = 'Invalid whisper command. Usage: /w <username> <message>\n'
        clients.find((client) => client.id === senderId).socket.write(errorMessage)
        fs.appendFileSync('chat.log', errorMessage)
        return
    }

    const receiverUsername = args[1]
    const receiver = clients.find((client) => `Client${client.id}` === receiverUsername)

    if (!receiver || senderId === receiver.id) {
        // error message for invalid username or attempting to whisper themselves
        const errorMessage = 'Invalid username or attempting to whisper themselves.\n'
        clients.find((client) => client.id === senderId).socket.write(errorMessage)
        fs.appendFileSync('chat.log', errorMessage)
        return
    }

    const whisperMessage = args.slice(2).join(' ')
    // send private message containing the whisper sender's name and the whispered message
    receiver.socket.write(`Whisper from client${senderId}: ${whisperMessage}\n`)
    // log result to the server.log file
    fs.appendFileSync('chat.log', `Whisper sent from client${senderId} to Client${receiver.id}: ${whisperMessage}\n`)
    // Only to the sender and the recipient, indicating it's a whisper
    broadcast(`Whisper from client${senderId} to Client${receiver.id}: ${whisperMessage}\n`, senderId, true)
}


// Function to handle username command
function handleUsernameCommand(command, senderId) {
    const args = command.split(' ')

    if (args.length !== 2) {
        // error message for incorrect number of inputs
        const errorMessage = 'Invalid username command. Usage: /username <new_username>\n'
        clients.find((client) => client.id === senderId).socket.write(errorMessage)
        fs.appendFileSync('chat.log', errorMessage)
        return
    }

    const newUsername = args[1]

    // Check if the new username is already in use
    if (clients.some((client) => client.id !== senderId && client.username === newUsername)) {
        const errorMessage = 'Username already in use. Please choose a different one.\n'
        clients.find((client) => client.id === senderId).socket.write(errorMessage)
        fs.appendFileSync('chat.log', errorMessage)
        return
    }

    // Check if the new username is the same as the old username
    const clientToUpdate = clients.find((client) => client.id === senderId)
    const currentUsername = clientToUpdate.username || `Client${senderId}`
    if (currentUsername === newUsername) {
        const errorMessage = 'New username must be different from the current one.\n'
        clients.find((client) => client.id === senderId).socket.write(errorMessage)
        fs.appendFileSync('chat.log', errorMessage)
        return
    }

    // Update the username in the clients array
    clientToUpdate.username = newUsername

    // Notify the user about the successful update
    clientToUpdate.socket.write(`Username updated to: ${newUsername}\n`)

    // Broadcast the username change to all clients
    broadcast(`Client${senderId} changed their username to: ${newUsername}\n`, senderId)

    // Log the username change to chat.log
    fs.appendFileSync('chat.log', `${currentUsername} changed their username to: ${newUsername}\n`)
}

