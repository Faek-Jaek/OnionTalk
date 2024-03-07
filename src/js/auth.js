const crypto = require('crypto');
function loadCreatePanel(){
    // hide old panel
    let oldPanel = document.getElementById('mainContainer');
    oldPanel.style.display = 'none';
    
    // Show createPanel
    let createPanel = document.getElementById('createPanel');
    createPanel.style.display = 'flex';
    
    //change nav function and text
    let nav = document.querySelector('header');
    nav.setAttribute('onclick','loadLoginPanel()') ;
    nav.firstElementChild.innerHTML = 'Back To Login';
}
function loadLoginPanel(){
    // hide createPanel
    let createPanel = document.getElementById('createPanel');
    createPanel.style.display = 'none';
    
    // hide old panel
    let oldPanel = document.getElementById('mainContainer');
    oldPanel.style.display = 'flex';

    //change nav function and text
    let nav = document.querySelector('header');
    nav.setAttribute('onclick','loadCreatePanel()') ;
    nav.firstElementChild.innerHTML = 'Create Account';
}
async function getAuthKeyPair() {
    try {
        const response = await fetch('https://talkonion.com/auth/getKeys');
        if (!response.ok) {
            throw new Error('Failed to fetch keys');
        }
        const keys = await response.json();
        return keys;
    } catch (error) {
        console.error('Error getting keys:', error);
        return null;
    }
}

// Example usage

function createKeys(){
    getAuthKeyPair().then(keys => {
        if (keys) {
            console.log("Mnemonic Phrase:", keys.mnemonic);
            console.log("Public Key:", keys.publicKey);
            console.log("Private Key:", keys.privateKey);

            const pubKeyH2 = document.querySelector('div#keySection').firstElementChild.querySelector('h2.key');
            const privKeyH2 = document.querySelector('div#keySection').lastElementChild.querySelector('h2.key');
            const seedPhraseH4 = document.querySelector('div#seedPhrase').lastElementChild;

            pubKeyH2.innerText = keys.publicKey;
            privKeyH2.innerText = keys.privateKey;
            seedPhraseH4.innerText = keys.mnemonic;
        }
    }); 
    // Hide "Create Key Pairs" Button
    document.querySelector('button#createKeyPairButton').style.display = 'none';
}
function copyTextButton(event){
    const button = event.target;
    const container = button.closest('div.keyDiv');
    const h2Element = container.querySelector('h2.key');
    const textToCopy = h2Element.innerText;

    const textarea = document.createElement('textarea');
    textarea.value = textToCopy;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);

    button.textContent = 'Copied!';
}
async function getChallenge(event) {
    try {
        const button = event.target;
        const pubInput = button.parentElement.querySelector('input#pubKeyInp')
        const privInput = button.parentElement.querySelector('input#privKeyInp')
        const publicKey = pubInput.value;

        // Fetch the challenge from the server, including the public key as a query parameter
        const response = await fetch(`https://talkonion.com/auth/checkKey?publicKey=${publicKey}`);
        if (!response.ok) {
            throw new Error('Failed to fetch challenge');
        }

        // Extract the challenge and public key from the response
        const { encryptedChallenge } = await response.json();
        
        // Decrypt the challenge using the Web Crypto API
        const privateKey = await window.crypto.subtle.importKey(
            'pkcs8',
            privInput.value,
            {
                name: 'RSA-OAEP',
                hash: {name: 'SHA-256'},
            },
            false,
            ['decrypt']
        );
        const clearText = await window.crypto.subtle.decrypt(
            {
                name: 'RSA-OAEP'
            },
            privateKey,
            Buffer.from(encryptedChallenge, 'base64')
        );

        // Convert the decrypted data to a string
        const challengeString = new TextDecoder().decode(clearText);

        // Check if the publicKey received matches the publicKey sent
        if (publicKey !== responsePublicKey) {
            throw new Error('Received publicKey does not match');
        }
        
        console.log('Challenge String:', challengeString);
    } catch (error) {
        console.error('Error getting challenge:', error);
    }
}
