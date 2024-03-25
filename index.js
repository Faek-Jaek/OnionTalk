// Load the AWS SDK for Node.js
const AWS = require("aws-sdk");
// Set the region
AWS.config.update({ region: "us-east-1" });
// Create the DynamoDB service object
var ddb = new AWS.DynamoDB({ apiVersion: "2012-08-10" });
const express = require('express');
const app = express();
const https = require('https');
const fs = require('fs');
const { v4: uuidV4 } = require('uuid');
const bip39 = require('bip39');
const crypto = require('crypto');
const { createHash } = require('crypto');
const { error } = require("console");
const currentDate = new Date();
const elliptic = require('elliptic')
var challengeTable;
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
function storePublicKey(pubKey){
    var params = {
        TableName: "onionTalk_user_data_table",
        Item: {
          publicKey: { S: String(pubKey) },
          timeOfCreation: { S: String(currentDate.getTime()) },
        },
      };
    // Call DynamoDB to add the item to the table
    ddb.putItem(params, function (err, data) {
        if (err) {
            console.log("Error", err);
        } else {
            console.log("Success", data);
        }
  });
}
function isPublicKeyStored(pubKey){
    return new Promise((resolve, reject) => {
        const params = {
            TableName: "onionTalk_user_data_table",
            KeyConditionExpression: "publicKey = :pk",
            ExpressionAttributeValues: {
                ":pk": { S: pubKey }
            }
        };

        ddb.query(params, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data.Items.length > 0);
            }
        });
    });
}
function storeAuthTok(authTok, publicKey){
    var params = {
        TableName: "onionTalk_authentication_tokens",
        Item: {
            authTok: {N: Number(authTok)},
            publicKey: { S: String(publicKey) },
            expTime: { N: Number(currentDate.getTime()+3600000) },
        },
      };
    // Call DynamoDB to add the item to the table
    ddb.putItem(params, function (err, data) {
        if (err) {
            console.log("Error", err);
        } else {
            console.log("Success", data);
        }
  });
}
function checkAuthTok(authTok){
    return new Promise((resolve, reject) => {
        const params = {
            TableName: "onionTalk_authentication_tokens",
            KeyConditionExpression: "authTok = :pk",
            ExpressionAttributeValues: {
                ":pk": { N: Number(authTok) }
            }
        };

        ddb.query(params, (err, data) => {
            if (err) {
                reject(err);
                return false;
            } else {
                resolve(data.Items.length > 0);
                return true;
            }
        });
    });
}
// Function to check if the public key is valid (you can implement your own logic here)
function isPublicKeyValid(publicKey) {
    // check is in onionTalk_user_data_table
    return isPublicKeyStored(publicKey).then(exists => {
        // make sure the `exists` promise is properly returned
        if (exists){
            console.log(`Public Key: ${publicKey} exists, and is stored.`)
            return publicKey && typeof publicKey === 'string' && publicKey.length == 32;
        }
        else {
            // the exists promise was not returned and thus an error has occured.
            throw error;
        }
    }).catch(err => {
        //Logs the error then returns false as to not lock up any prior code.
        console.error('Error checking public key is stored: ', err);
        return false;
    })
    
}

// Function to generate a new Authentication Token. Stores in DynamoDB, Sets removal timer, returns the authentication token.
function newAuthToken(publicKey){
    
    // Create random string to use as Authentication Token using uuidV4 obj created earlier
    const authTok = uuidV4();
    
    // Store new token in DB
    storeAuthTok(authTok, publicKey);

    //return token
    return authTok;
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
app.post('/auth/storeKey', (req, res) => {
        const publicKey = req.body;
        storePublicKey(publicKey).then(
            res.status(200)
        ).catch(error => {
            console.error("Error storing public-key:", error);
            res.status(500).json({ error: 'Failed to store public-key' });
        });
});
app.post('/auth/getChallenge', (req, res) => {
    try {
        // Extract the public key from the request query
        const publicKey = req.body;
        
        // Check if the public key is valid
        if (isPublicKeyValid(publicKey)){
            // Generate a random challenge string using UUID
            const challengeString = uuidV4();
            console.log(`Challenge String: ${challengeString}`);      
            // Generate a new Elliptic Curve to encrypt challenge
            const ec = new elliptic.ec('secp256k1');
            // Encrypt the message using the recipient's public key
            const encryptedChallenge = ec.keyFromPublic(publicKey).encrypt(challengeString);
            // Add the publicKey and string to the table
            challengeTable[publicKey] = challengeString;
            // Send back the encrypted challenge string and public key in the response
            res.json(encryptedChallenge);
        }
        else {
            // If the public key is not valid, send an error response
            res.status(400).json({ error: 'Invalid public key' });
        }
    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.post('/auth/checkChallenge', (req, res) => {
    try {
        const publicKey = req.body.publicKey;
        const clientChallenge = req.body.challenge;
        if (challengeTable[publicKey] === clientChallenge){
            const authTok = newAuthToken(publicKey);
            res.setHeader("authTok", authTok);
            res.status(200);
        }
        else{
            // If the public key is not valid, send an error response
            res.status(400).json({ error: 'Challenges do not match!' });
            throw new Error("Challenges do not match!");
        }
    } catch(error){
        console.error(`Error checking challenge: ${error}`);
    }
});
app.get('/auth/checkAuthTok', (req, res) => {
    try{
        const authTok = req.cookies.authTok;
        checkAuthTok(authTok).then(response => {
            if(response){
                res.status(200)
            }
            else {
                res.status(400).json({ error: 'Auth token check failed!'});
            }
        })
    } catch(error){
        console.error(`Error checking authentication token: ${error}`);
    }
})
app.get('/room/:room', (req, res) => {
    
    // Serve auth page on root URL
    res.sendFile(__dirname + '/src/html/room.html');
});
app.get('/src/modules/*', (req, res) => {
    //~~~~~~~~ Modules ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~    
        const moduleName = req.url.substring(13, req.url.length);
        res.sendFile(__dirname + `/src/modules/${moduleName}`);
})
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
    else if (req.url === '/src/js/bundle.js' ) { // Add this block to handle requests for 'bundle.js'
        res.sendFile(__dirname + '/src/js/bundle.js');
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
        else if (req.url === '/src/pictures/png/copyIcon.png') { // Add this block to handle requests for '*.png'
            res.sendFile(__dirname + '/src/pictures/png/copyIcon.png');
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
