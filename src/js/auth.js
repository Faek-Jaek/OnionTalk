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

            const pubKeyH2 = document.querySelector('div#keySection').firstElementChild.lastElementChild;
            const privKeyH2 = document.querySelector('div#keySection').lastElementChild.lastElementChild;
            const seedPhraseH4 = document.querySelector('div#seedPhrase').lastElementChild;

            pubKeyH2.innerText = keys.publicKey;
            privKeyH2.innerText = keys.privateKey;
            seedPhraseH4.innerText = keys.mnemonic;
        }
    }); 
}