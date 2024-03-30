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
            body: JSON.stringify({ publicKey })
        });
        if (!keyResponse.ok) {
            throw new Error('KeyResponse not OK');
        }
    } catch (error) {
        console.error('Error storing public-key:', error);
    }
}

function createKeys(){
    try{
        // Generate a mnemonic phrase (12 words)
        const mnemonic = Bitcoin.bip39.generateMnemonic();

        // Create a seed buffer from the mnemonic
        const seed = Bitcoin.bip39.mnemonicToSeedSync(mnemonic);

        // Create an elliptic curve instance using the secp256k1 curve
        const ec = new elliptic.ec('secp256k1');

        // Derive a key pair from the seed
        const keyPair = ec.keyFromSecret(seed);

        // Get the public key in uncompressed format
        const publicKey = keyPair.getPublic('hex');

        // Get the private key
        const privateKey = keyPair.getPrivate('hex');

        // Construct the keys object
        const keys = {
            mnemonic: mnemonic,
            publicKey: publicKey,
            privateKey: privateKey
        };
        return keys;
    } catch (error) {
        console.error('Error generating key-pair: ', error);
    }
    then(keys => {
        storeKey(keys.publicKey)
    }).catch(error => {
        console.error('Error storing public-key: ', error);
    }).then(keys => {
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
    }).catch(error => {
        console.error('Error displaying key-pair: ', error);
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


async function getChallenge(publicKey) {
    try {
        // Fetch the challenge hash from the server, including the public key as a query parameter
        fetch(`https://talkonion.com/auth/getChallenge`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ publicKey })
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
        console.log('Encrypted Challenge: ', encryptedChallenge);

        // Use the private key to decrypt the encrypted challenge
        const ec = new elliptic.ec('secp256k1');
        const decryptedChallenge = ec.keyFromPrivate(privateKey).decrypt(encryptedChallenge).toString();

        // Now 'decryptedChallenge' contains the decrypted challenge string
        console.log("Decrypted Challenge:", decryptedChallenge);

        return decryptedChallenge;
    } catch(error) {
        console.error('Error:', error);
    }
}
async function checkChallenge(decryptedChallenge){
    const checkResponse = await fetch('https://talkonion.com/auth/checkChallenge', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ decryptedChallenge })
        });
        if (!checkResponse.ok) {
            throw new Error('Failed to check decrypted challenge');
        }
        const { challengeValid } = await checkResponse.json();
        return challengeValid;
}
async function authClient() {
    try {
        const pubInput = document.getElementById('pubKeyInp');
        const publicKey = pubInput.value;
        
        const challengeResponse = await getChallenge(publicKey);
        const decryptedChallenge = await decryptChallenge(privateKey, challengeResponse.encryptedChallenge);
        const challengeValid = await checkChallenge(decryptedChallenge);

        if (challengeValid) {
            console.log('Challenge is valid.');
            // Proceed with further actions if needed
        } else {
            console.log('Challenge is not valid.');
            // Handle invalid challenge
        }
    } catch (error) {
        console.error(`Error: ${error}`);
    }
}
document.getElementById("decryptAndConn").addEventListener("click", authClient);