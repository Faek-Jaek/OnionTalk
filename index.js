const https = require('https');
const fs = require('fs'); // Add this line to import the 'fs' module
const express = require('express');
const path = require('path');

// Setting Vars
const host = '127.0.0.1';
const port = '443';
const app = express();
app.use('/d3', express.static(path.join(__dirname, 'node_modules', 'd3')));



const requestListener = function (req, res) {
// ~~~~~~~~ SRC Files ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    //~~~~~~~~ HTML Files ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    if (req.url === '/src/html/main.html' || req.url === '/') { // Add this block to handle requests for 'main.html'
        fs.readFile('src/html/main.html', (err, data) => { // Read the contents of 'main.html'
            if (err) throw err;
            res.writeHead(200, { 'Content-Type': 'text/html' }); // Set the response header to indicate the file type
            res.end(data); // Send the contents of 'main.html' to the client
    });
    }else if (req.url === '/src/html/auth.html' ) { // Add this block to handle requests for 'auth.html'
        fs.readFile('src/html/auth.html', (err, data) => { // Read the contents of 'auth.html'
            if (err) throw err;
            res.writeHead(200, { 'Content-Type': 'text/html' }); // Set the response header to indicate the file type
            res.end(data); // Send the contents of 'auth.html' to the client
    });
    //~~~~~~~~ CSS Files ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    }else if (req.url === '/src/css/main.css' ) { // Add this block to handle requests for 'main.css'
        fs.readFile('src/css/main.css', (err, data) => { // Read the contents of 'main.css'
            if (err) throw err;
            res.writeHead(200, { 'Content-Type': 'text/css' }); // Set the response header to indicate the file type
            res.end(data); // Send the contents of 'main.css' to the client
    });
    }else if (req.url === '/src/css/aut.css' ) { // Add this block to handle requests for 'auth.css'
        fs.readFile('src/css/auth.css', (err, data) => { // Read the contents of 'auth.css'
            if (err) throw err;
            res.writeHead(200, { 'Content-Type': 'text/css' }); // Set the response header to indicate the file type
            res.end(data); // Send the contents of 'auth.css' to the client
    });
    //~~~~~~~~ JS Files ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    }else if (req.url === '/src/html/main.js' ) { // Add this block to handle requests for 'main.html'
        fs.readFile('src/html/main.js', (err, data) => { // Read the contents of 'main.html'
            if (err) throw err;
            res.writeHead(200, { 'Content-Type': 'text/javascript' }); // Set the response header to indicate the file type
            res.end(data); // Send the contents of 'main.html' to the client
    });
    }else if (req.url === '/src/html/auth.js' ) { // Add this block to handle requests for 'main.html'
        fs.readFile('src/html/auth.js', (err, data) => { // Read the contents of 'main.html'
            if (err) throw err;
            res.writeHead(200, { 'Content-Type': 'text/javascript' }); // Set the response header to indicate the file type
            res.end(data); // Send the contents of 'main.html' to the client
    });
    //~~~~~~~~ Pictures ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        //~~~~~~~~ png Files ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        }else if (req.url === '/src/pictures/connect.png') { // Add this block to handle requests for '*.png'
            fs.readFile('src/pictures/connect.png', (err, data) => { // Read the contents of '*.png'
                if (err) throw err;
                res.writeHead(200, { 'Content-Type': 'image/png' }); // Set the response header to indicate the file type
                res.end(data); // Send the contents of '*.png' to the client
        });
        }else if (req.url === '/src/pictures/connectedClientPicture.png') { // Add this block to handle requests for '*.png'
            fs.readFile('src/pictures/connectedClientPicture.png', (err, data) => { // Read the contents of '*.png'
                if (err) throw err;
                res.writeHead(200, { 'Content-Type': 'image/png' }); // Set the response header to indicate the file type
                res.end(data); // Send the contents of '*.png' to the client
        });
        }else if (req.url === '/src/pictures/cornerSelector.png') { // Add this block to handle requests for '*.png'
            fs.readFile('src/pictures/cornerSelector.png', (err, data) => { // Read the contents of '*.png'
                if (err) throw err;
                res.writeHead(200, { 'Content-Type': 'image/png' }); // Set the response header to indicate the file type
                res.end(data); // Send the contents of '*.png' to the client
        });
        }else if (req.url === '/src/pictures/disconnect.png') { // Add this block to handle requests for '*.png'
            fs.readFile('src/pictures/disconnect.png', (err, data) => { // Read the contents of '*.png'
                if (err) throw err;
                res.writeHead(200, { 'Content-Type': 'image/png' }); // Set the response header to indicate the file type
                res.end(data); // Send the contents of '*.png' to the client
        });
        }else if (req.url === '/src/pictures/friendIcon50x50.png') { // Add this block to handle requests for '*.png'
            fs.readFile('src/pictures/friendIcon50x50.png', (err, data) => { // Read the contents of '*.png'
                if (err) throw err;
                res.writeHead(200, { 'Content-Type': 'image/png' }); // Set the response header to indicate the file type
                res.end(data); // Send the contents of '*.png' to the client
        });
        }else if (req.url === '/src/pictures/textChannelSelector.png') { // Add this block to handle requests for '*.png'
            fs.readFile('src/pictures/textChannelSelector.png', (err, data) => { // Read the contents of '*.png'
                if (err) throw err;
                res.writeHead(200, { 'Content-Type': 'image/png' }); // Set the response header to indicate the file type
                res.end(data); // Send the contents of '*.png' to the client
        });
        }else if (req.url === '/src/pictures/userSettingsButton.png') { // Add this block to handle requests for '*.png'
            fs.readFile('src/pictures/userSettingsButton.png', (err, data) => { // Read the contents of '*.png'
                if (err) throw err;
                res.writeHead(200, { 'Content-Type': 'image/png' }); // Set the response header to indicate the file type
                res.end(data); // Send the contents of '*.png' to the client
        });
    // ~~~~~~~~ Final CatchAll - Outputs requested URL to the console ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    } else {
      // If the request URL and method do not match any of the specified conditions, return a default response
      res.writeHead(200);
      res.end("Default Server Response");
      console.log(req.url)
    }
  };
const privateKey = fs.readFileSync('keys/private.key');
const certificate = fs.readFileSync('keys/certificate.pem');
const intermediate = fs.readFileSync('keys/intermediate.pem');
const root = fs.readFileSync('keys/root.pem');

const credentials = {
  key: privateKey,
  cert: certificate,
  ca: [intermediate, root] // Concatenate intermediate and root certificates
};
const server = https.createServer(credentials, requestListener);

server.listen(port, () => {
  console.log(`Server is running on https://localhost:${port}`);
});
