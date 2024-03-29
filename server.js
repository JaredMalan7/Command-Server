const net = require('net')
const fs = require('fs')

const clients = []
let clientIdCounter = 0
let clientMsg = ''

const server = net.createServer((socket) => {
    const clientId = ++clientIdCounter
    clients.push({ id: clientId, socket, username: `Client${clientId}` })

    // Log connection message to chat.log file
    fs.appendFileSync('chat.log', `Client${clientId} connected\n`)

    // Send welcome message to the newly connected client
    socket.write(`Welcome to the chat, ${clients[clientId - 1].username}!\n`)

    // Send notification to all other clients about the new user
    broadcast(`${clients[clientId - 1].username} has joined the chat.\n`, clientId)

    // Log the connection message to chat.log
    fs.appendFileSync('chat.log', `${clients[clientId - 1].username} has joined the chat.\n`)

    // Handles data received from the client
    socket.on('data', (chunk) => {
        clientMsg = chunk.toString().trim()

        if (clientMsg.startsWith('/w')) {
            handleWhisperCommand(clientMsg, clientId)
        } else if (clientMsg.startsWith('/username')) {
            handleUsernameCommand(clientMsg, clientId)
        } else if (clientMsg.startsWith('/kick')) {
            handleKickCommand(clientMsg, clientId)
        } else if (clientMsg.startsWith('/clientlist')) {
            handleClientListCommand(clientId)
        } else {
            broadcast(`${clients[clientId - 1].username}: ${clientMsg}\n`, clientId)
            fs.appendFileSync('chat.log', `${clients[clientId - 1].username}: ${clientMsg}\n`)
        }
    })

    // Handles client disconnection
    socket.on('end', () => {
        // Remove the client from the list of connected clients
        const index = clients.findIndex((client) => client.id === clientId)
        if (index !== -1) {
            const disconnectedClient = clients.splice(index, 1)[0]
            // Send notification to all other clients about the user's disconnection
            broadcast(`${disconnectedClient.username} has left the chat.\n`, clientId)
            // Log the disconnection message to chat.log
            fs.appendFileSync('chat.log', `${disconnectedClient.username} has left the chat.\n`)
        }
    })

}).listen(3000, () => {
    console.log(`Server listening on port ${server.address().port}`)
})

// Function to broadcast messages to all clients
function broadcast(message, senderId, isWhisper = false) {
    const senderClient = clients.find((client) => client.id === senderId)

    clients.forEach((client) => {
        if (client.id !== senderId) {
            if (!isWhisper) {
                client.socket.write(`${message}\n`)
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
    const receiver = clients.find((client) => client.username === receiverUsername)

    if (!receiver || senderId === receiver.id) {
        // error message for invalid username or attempting to whisper themselves
        const errorMessage = 'Invalid username or attempting to whisper themselves.\n'
        clients.find((client) => client.id === senderId).socket.write(errorMessage)
        fs.appendFileSync('chat.log', errorMessage)
        return
    }

    const whisperMessage = args.slice(2).join(' ')
    // send private message containing the whisper sender's name and the whispered message
    receiver.socket.write(`Whisper from ${clients[senderId - 1].username}: ${whisperMessage}\n`)
    // log result to the server.log file
    fs.appendFileSync('chat.log', `Whisper sent from ${clients[senderId - 1].username} to ${receiver.username}: ${whisperMessage}\n`)
    // Only to the sender and the recipient, indicating it's a whisper
    broadcast(`Whisper from ${clients[senderId - 1].username} to ${receiver.username}: ${whisperMessage}\n`, senderId, true)
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

    if (clients.some((client) => client.id !== senderId && client.username === newUsername)) {
        const errorMessage = 'Username already in use. Please choose a different one.\n'
        clients.find((client) => client.id === senderId).socket.write(errorMessage)
        fs.appendFileSync('chat.log', errorMessage)
        return
    }

    const clientToUpdate = clients.find((client) => client.id === senderId)
    const currentUsername = clientToUpdate.username

    if (currentUsername === newUsername) {
        const errorMessage = 'New username must be different from the current one.\n'
        clients.find((client) => client.id === senderId).socket.write(errorMessage)
        fs.appendFileSync('chat.log', errorMessage)
        return
    }

    clientToUpdate.username = newUsername
    clientToUpdate.socket.write(`Username updated to: ${newUsername}\n`)

    // Broadcast the username change to all clients
    broadcast(`${currentUsername} changed their username to: ${newUsername}\n`, senderId)

    // Log the username change to chat.log
    fs.appendFileSync('chat.log', `${currentUsername} changed their username to: ${newUsername}\n`)
}

//variable to sotre the adming password
const adminPassword = 'supersecretpw'

// Function to handle kick command
function handleKickCommand(command, senderId) {
    const args = command.split(' ')

    if (args.length !== 3 || args[2] !== adminPassword) {
        // error message for incorrect number of inputs or incorrect admin password
        const errorMessage = 'Invalid kick command. Usage: /kick <username> <adminPassword>\n'
        clients.find((client) => client.id === senderId).socket.write(errorMessage)
        fs.appendFileSync('chat.log', errorMessage)
        return
    }

    const targetUsername = args[1]
    const targetClient = clients.find((client) => client.username === targetUsername)

    if (!targetClient || senderId === targetClient.id) {
        // error message for invalid username or attempting to kick themselves
        const errorMessage = 'Invalid username or attempting to kick themselves.\n'
        clients.find((client) => client.id === senderId).socket.write(errorMessage)
        fs.appendFileSync('chat.log', errorMessage)
        return
    }

    // Send private message to the kicked user
    targetClient.socket.write(`You have been kicked from the chat by ${clients[senderId - 1].username}.\n`)

    // Broadcast message to all clients about the kicked user
    broadcast(`${targetClient.username} has been kicked from the chat.\n`, senderId)

    // Log the kick message to chat.log
    fs.appendFileSync('chat.log', `${targetClient.username} has been kicked from the chat by ${clients[senderId - 1].username}.\n`)

    // Remove the kicked user from the list of connected clients
    const index = clients.findIndex((client) => client.id === targetClient.id)
    if (index !== -1) {
        clients.splice(index, 1)
    }
}

//function to handle clientlist command
function handleClientListCommand(senderId) {
    const clientNames = clients.map(client => client.username).join(', ')
    clients.find(client => client.id === senderId).socket.write(`Connected clients: ${clientNames}\n`)
}
