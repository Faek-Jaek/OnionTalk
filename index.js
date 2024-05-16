// Load the AWS SDK for Node.js
const AWS = require("aws-sdk");
// Set the region
AWS.config.update({ region: "us-east-1" });
// Create the DynamoDB service object
var ddb = new AWS.DynamoDB({ apiVersion: "2012-08-10" });


const https = require('https');
const fs = require('fs');
const { v4: uuidV4 } = require('uuid');
const bip39 = require('bip39');
const crypto = require('crypto');
const { error } = require("console");
const currentDate = new Date();
const elliptic = require('elliptic');
var eccrypto = require('eccrypto');
var challengeTable = {}; 



// SET UP THE SERVER VAR's & Server Obj
const privateKey = fs.readFileSync('/etc/ssl/acme/talkonion.com_ecc/talkonion.com.key');
const certificate = fs.readFileSync('/etc/ssl/acme/talkonion.com_ecc/talkonion.com.cer');
const intermediate = fs.readFileSync('/etc/ssl/acme/talkonion.com_ecc/ca.cer');
const root = fs.readFileSync('/etc/ssl/acme/talkonion.com_ecc/fullchain.cer');

const credentials = {
  key: privateKey,
  cert: certificate,
  ca: [intermediate, root] // Concatenate intermediate and root certificates
};
// Initializing port and setting up express to be used withing our server
const port = 443;
const express = require('express');
const app = express();
app.use(express.json());

const server = https.createServer(credentials, app);
server.listen(port, () => {
  console.log(`Server is running on https://localhost:${port}`);
});
const io = require('socket.io')(server);

app.use(express.static('src'));
app.use(express.static('node_modules/socket.io-client/'));
app.use('/socket.io', function(req, res, next) {
    res.setHeader('Content-Type', 'application/javascript');
    next();
});
async function storePublicKey(pubKey) {
    try {
        const params = {
            TableName: "onionTalk_user_data_table",
            Item: {
                publicKey: { S: String(pubKey) },
                timeOfCreation: { S: String(currentDate.getTime()) },
            },
        };

        // Call DynamoDB to add the item to the table
        const data = await ddb.putItem(params).promise();
        console.log("Success", data);
        return data; // Return the data if needed
    } catch (error) {
        console.error("Error storing public-key:", error);
        throw error; // Throw the error for the caller to handle
    }
}

function isPublicKeyStored(pubKey){
    return new Promise((resolve, reject) => {
        const params = {
            TableName: "onionTalk_user_data_table",
            KeyConditionExpression: "publicKey = :pk",
            ExpressionAttributeValues: {
                ":pk": { S: String(pubKey) }
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
            authTok: {S: String(authTok)},
            publicKey: { S: String(publicKey) },
            expTime: { N: String(currentDate.getTime()+3600000) },
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
            return publicKey && typeof publicKey === 'string' && publicKey.length == 64;
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
    const authTok = uuidV4().replace(/-/g,"");
    
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
app.post('/auth/storeKey', async (req, res) => {
    try {
        const publicKey = req.body.publicKey;
        await storePublicKey(publicKey);
        res.status(200).send('Public key stored successfully'); // Sending response after successful storage
    } catch (error) {
        console.error("Error storing public-key:", error);
        res.status(500).json({ error: 'Failed to store public-key' });
    }
});
app.post('/auth/getChallenge', async (req, res) => {
    try {
        // Extract the public key from the request body
        const publicKey = req.body.publicKey;

        // Check if the public key is in the expected format and length
        if (typeof publicKey === 'string' && publicKey.length === 130) {
            // Generate a random challenge string using UUID
            const challengeString = uuidV4();
            console.log(`Challenge String: ${challengeString}`);

            // Encrypt the message using the recipient's public key
            const encryptedChallenge = await eccrypto.encrypt(Buffer.from(publicKey, 'hex'), Buffer.from(challengeString));

            // Send back the encrypted challenge string and public key in the response
            res.json({ encryptedChallenge: encryptedChallenge.toString('hex'), publicKey: publicKey });
        } else {
            // If the public key is not in the expected format or length, send an error response
            res.status(400).json({ error: 'Invalid public key format or length' });
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
        console.log(`Associated Public Key: ${publicKey}`);
        console.log(`Expected Challenge String: ${challengeTable[publicKey]}`);
        console.log(`Received Challenge String: ${clientChallenge}`);
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
    else if (req.url === '/src/js/bundle-auth.js' ) { // Add this block to handle requests for 'bundle-auth.js'
        res.sendFile(__dirname + '/src/js/bundle-auth.js');
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
// Define the directory where challenge files are located
const challengeDirectory = 'keys/acmeKeys/.well-known/acme-challenge/';

// Define the route handler
app.get('/.well-known/acme-challenge/:filename', (req, res) => {
    // Extract the filename from the URL
    const filename = req.params.filename;
    
    // Construct the full path to the file
    const filePath = path.join(__dirname, challengeDirectory, filename);

    // Read the file from disk and send it in the response
    fs.readFile(filePath, (err, data) => {
        if (err) {
            // If the file doesn't exist or there's an error reading it, send a 404 response
            res.status(404).send('File not found');
            return;
        }
        // Set the Content-Type header to text/plain
        res.set('Content-Type', 'text/plain');
        // Send the file in the response
        res.send(data);
    });
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

