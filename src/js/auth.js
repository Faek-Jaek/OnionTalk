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
async function storeKey(publicKey) {
    try {
        const keyResponse = await fetch(`https://talkonion.com/auth/storeKey`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ publicKey: String(publicKey) })
        });
        if (!keyResponse.ok) {
            throw new Error('KeyResponse not OK');
        }
        return keyResponse; // Return the keyResponse
    } catch (error) {
        console.error('Error storing public-key:', error);
    }
}

async function createKeys() {
    try {
        // Generate a 32-byte BIP39 mnemonic phrase
        const mnemonic = bip39.generateMnemonic(256); // 32 bytes = 256 bits

        // Derive seed from mnemonic
        const seedBuffer = bip39.mnemonicToSeedSync(mnemonic);

        // Use the seed as the private key
        const privateKey = await eccrypto.generatePrivate(seedBuffer);

        // Get the corresponding public key
        const publicKey = eccrypto.getPublic(privateKey);

        // Construct the keys object
        const keys = {
            mnemonic: mnemonic,
            publicKey: publicKey.toString('hex'),
            privateKey: privateKey.toString('hex')
        };

        // Log keys
        console.log('Keys created:', keys);

        // Store the public key
        await storeKey(keys.publicKey);

        // Display the mnemonic phrase and keys
        console.log("Mnemonic Phrase:", keys.mnemonic);
        console.log("Public Key:", keys.publicKey);
        console.log("Private Key:", keys.privateKey);

        const pubKeyH2 = document.querySelector('div#keySection').firstElementChild.querySelector('h2.key');
        const privKeyH2 = document.querySelector('div#keySection').lastElementChild.querySelector('h2.key');
        const seedPhraseH4 = document.querySelector('div#seedPhrase').lastElementChild;

        pubKeyH2.innerText = keys.publicKey;
        privKeyH2.innerText = keys.privateKey;
        seedPhraseH4.innerText = keys.mnemonic;

        // Hide "Create Key Pairs" Button
        document.querySelector('button#createKeyPairButton').style.display = 'none';

        // Return keys for further use if needed
        return keys;
        } catch (error) {
            console.error('Error generating key-pair: ', error);
            // Throw error for the caller to handle
            throw error;
        }
}


function copyTextButton(event){
    const button = event.target; // get button element that was clicked
    const container = button.closest('div.keyDiv'); // button container
    const h2Element = container.querySelector('h2.key'); // select neighboring h2 (representing a key)
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


async function getChallenge(publicKey) {
    try {
        // Fetch the challenge hash from the server, including the public key as a query parameter
        return fetch(`https://talkonion.com/auth/getChallenge`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 'publicKey': String(publicKey) })
        }).then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch challenge hash');
            }
            return response.json();
        }).catch(error => {
            console.error('Error getting challenge:', error);
        });
    } catch (error) {
        console.error('Error:', error);
    }
}
function decryptChallenge(privateKey, encryptedChallenge){
    try{
        console.log(`Encrypted Challenge: ${encryptedChallenge}`);

        // Use the private key to decrypt the encrypted challenge
        const decryptedChallenge = eccrypto.decrypt(privateKey, buffer.Buffer.from(encryptedChallenge, 'hex')).toString();

        // Now 'decryptedChallenge' contains the decrypted challenge string
        console.log(`Decrypted Challenge: ${decryptedChallenge}`);

        return decryptedChallenge;
    } catch(error) {
        console.error('Error:', error);
    }
}
async function checkChallenge(publicKey, decryptedChallenge){
    const checkResponse = await fetch('https://talkonion.com/auth/checkChallenge', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ publicKey: JSON.stringify(publicKey),
                    challenge: JSON.stringify(decryptedChallenge)})
        });
        if (!checkResponse.ok) {
            throw new Error('Failed to check decrypted challenge');
        }
        const { challengeValid } = await checkResponse.json();
        return challengeValid;
}
async function authClient() {
    try {
        let publicKey;
        let privateKey;

        const pubInput = document.getElementById('pubKeyInp');
        publicKey = pubInput.value;
        const privInput = document.getElementById('privKeyInp');
        privateKey= privInput.value;

        
        const challengeResponse = await getChallenge(publicKey);
        const decryptedChallenge = await decryptChallenge(privateKey, challengeResponse.encryptedChallenge);
        const challengeValid = await checkChallenge(publicKey, decryptedChallenge);

        if (challengeValid) {
            console.log('Challenge is valid!');
            // Proceed with further actions if needed
        } else {
            console.log('Challenge failed!');
            // Handle invalid challenge
        }
    } catch (error) {
        console.error(`Error: ${error}`);
    }
}
document.querySelector(`button#createKeyPairButton`).addEventListener("click", createKeys);