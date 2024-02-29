const express = require('express');
const app = express();
const https = require('https');
const fs = require('fs');
const { v4: uuidV4 } = require('uuid');
const bip39 = require('bip39');
const { createHash } = require('crypto');
const { generateKeyPair } = require('crypto');

// Setting Vars
const host = '127.0.0.1';
const port = 443;

const privateKey = fs.readFileSync('/etc/letsencrypt/live/talkonion.com/privkey.pem'); // Path to your private key file
const certificate = fs.readFileSync('/etc/letsencrypt/live/talkonion.com/fullchain.pem'); // Path to your full chain file

const server = https.createServer({
    key: privateKey,
    cert: certificate
}, app);
const io = require('socket.io')(server);
app.use(express.static('src'));
app.use(express.static('node_modules/socket.io-client/'));
app.use('/socket.io', function(req, res, next) {
    res.setHeader('Content-Type', 'application/javascript');
    next();
});

async function generateAuthKeyPair() {
    // Generate mnemonic phrase
    const mnemonic = bip39.generateMnemonic();

    // Derive binary seed from mnemonic (seed phrase)
    const seed = await bip39.mnemonicToSeed(mnemonic);

    // Derive keys from the seed
    const hash = createHash('sha256', 'Option: {outputLength: 128}').update(seed).digest('hex');
    const publicKey = hash.slice(0, 32); // Assuming 128 characters seed, half for public key, half for private key
    const privateKey = hash.slice(32);
    console.log(`New User Created: ${publicKey}`);
    // Return the generated mnemonic phrase, public key, and private key
    return {
        mnemonic: mnemonic,
        publicKey: publicKey,
        privateKey: privateKey
    };
}
io.on('connection', socket => {
    console.log(`Socket ${socket.id} connected`); //logs each socket connection
  
    // Log all events
    if (socket._events) {
      Object.keys(socket._events).forEach(eventName => {
        socket.on(eventName, () => {
          console.log(`Event: ${eventName}, Socket ID: ${socket.id}`);
        });
      });
    }
    console.log('Connected to socket: ', socket.id)
    socket.on('join-room', (roomId, userId) => {
      console.log('User: ', userId, ' Connected to roomId: ', roomId);
      socket.join(roomId);
      socket.to(roomId).emit('user-connected', userId);
  
      socket.on('disconnect', () => {
        socket.to(roomId).emit('user-disconnected', userId);
      });
    });
})
app.get('/uuidV4', (req, res) => {
    res.redirect(`/${uuidV4()}`);
});
/* app.get('/', (req, res) => {
    // Serve auth page on root URL
    res.sendFile(__dirname + '/src/html/main.html');
}); */
app.get('/auth/getKeys', (req, res) => {
    generateAuthKeyPair().then(({ mnemonic, publicKey, privateKey }) => {
        res.json({ mnemonic, publicKey, privateKey });
    }).catch(error => {
        console.error("Error generating keys:", error);
        res.status(500).json({ error: 'Failed to generate keys' });
    });
});
app.get('/room/:room', (req, res) => {
    
    // Serve auth page on root URL
    res.sendFile(__dirname + '/src/html/room.html');
});
app.get('/src/*', (req, res) => {
// ~~~~~~~~ SRC Files ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    //~~~~~~~~ HTML Files ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    if (req.url === '/src/html/main.html') { // Add this block to handle requests for 'main.html'
        res.sendFile(__dirname + '/src/html/main.html');
    }
    else if (req.url === '/src/html/auth.html' ) { // Add this block to handle requests for 'auth.html'
        res.sendFile(__dirname + '/src/html/auth.html');
    }
    else if (req.url === '/src/html/room.html' ) { // Add this block to handle requests for 'room.html'
        res.sendFile(__dirname + '/src/html/room.html');
    }
    //~~~~~~~~ CSS Files ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    else if (req.url === '/src/css/main.css' ) { // Add this block to handle requests for 'main.css'
        res.sendFile(__dirname + '/src/css/main.css');
    }
    else if (req.url === '/src/css/auth.css' ) { // Add this block to handle requests for 'auth.css'
        res.sendFile(__dirname + '/src/css/auth.css');
    }
    else if (req.url === '/src/css/room.css' ) { // Add this block to handle requests for 'room.css'
        res.sendFile(__dirname + '/src/css/room.css');
    }
    //~~~~~~~~ JS Files ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    else if (req.url === '/src/js/main.js' ) { // Add this block to handle requests for 'main.html'
        res.sendFile(__dirname + '/src/js/main.js');
    }
    else if (req.url === '/src/js/auth.js' ) { // Add this block to handle requests for 'auth.html'
        res.sendFile(__dirname + '/src/js/auth.js');
    }
    else if (req.url === '/src/js/room.js' ) { // Add this block to handle requests for 'room.html'
        res.sendFile(__dirname + '/src/js/room.js');
    }
    //~~~~~~~~ Pictures ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        //~~~~~~~~ png Files ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        else if (req.url === '/src/pictures/png/connect.png') { // Add this block to handle requests for '*.png'
            res.sendFile(__dirname + '/src/pictures/png/connect.png');
        }
        else if (req.url === '/src/pictures/png/connectedClientPicture.png') { // Add this block to handle requests for '*.png'
            res.sendFile(__dirname + '/src/pictures/png/connectedClientPicture.png');
        }
        else if (req.url === '/src/pictures/png/cornerSelector.png') { // Add this block to handle requests for '*.png'
            res.sendFile(__dirname + '/src/pictures/png/cornerSelector.png');
        }
        else if (req.url === '/src/pictures/png/disconnect.png') { // Add this block to handle requests for '*.png'
            res.sendFile(__dirname + '/src/pictures/png/disconnect.png');
        }
        else if (req.url === '/src/pictures/png/friendIcon50x50.png') { // Add this block to handle requests for '*.png'
            res.sendFile(__dirname + '/src/pictures/png/friendIcon50x50.png');
        }
        else if (req.url === '/src/pictures/png/textChannelSelector.png') { // Add this block to handle requests for '*.png'
            res.sendFile(__dirname + '/src/pictures/png/textChannelSelector.png');
        }
        else if (req.url === '/src/pictures/png/userSettingsButton.png') { // Add this block to handle requests for '*.png'
            res.sendFile(__dirname + '/src/pictures/png/userSettingsButton.png');
        }
    // ~~~~~~~~ Final CatchAll - Outputs requested URL to the console ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    else {
      // If the request URL and method do not match any of the specified conditions, return a default response
      res.writeHead(200);
      res.end("Default Server Response");
      console.log("Requested URL: "+req.url)
      console.log("IP of Request: "+req.ip)
    }
});
// Define a custom middleware function to log after response is sent - Final Catchall
const logAfterResponse = (req, res, next) => {
    const oldEnd = res.end;

    res.end = function (...args) {
        // Log whatever you need here
        console.log(`Requested URL: ${req.url}; From: ${req.ip}`);
        res.writeHead(200);
        // Call the original end function
        oldEnd.apply(res, args);
    };

    next();
};

// Apply the custom middleware globally
app.use(logAfterResponse);


server.listen(port, ["0.0.0.0", "::"], () => {
  console.log(`Server is running on https://${host}:${port}`);
});
