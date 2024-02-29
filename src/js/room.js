const socket = io(); // Leave the io() with no arguments, since its calling from the same place the page came from we dont have to have a specific source
const ROOM_ID = window.location.pathname.substr(6);
const connectedUserCont = document.getElementsByClassName('connectedUserCell')[0]
console.log('Room ID:', ROOM_ID);

const myPeer = new Peer();
let myID; //test public key for now
let peers = [];
let activeCalls = {};

myPeer.on('open', id => {
    myID = id;
    socket.emit('join-room', ROOM_ID, id);
});

function addSelfStream(stream) {
    const myCont = connectedUserCont.querySelector('#connectedClientContainer')
    const myVideo = document.createElement('video');
    myCont.insertBefore(myVideo, myCont.firstElementChild)
    myVideo.muted = true;
    myVideo.srcObject = stream;
    myVideo.addEventListener('loadedmetadata', () => {
        myVideo.play();
    });
    myCont.querySelector('h2').textContent = myID;
}
function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play();
    });
}

function removeUserCont(userId) {
    const contain = document.getElementById(String(userId));
    contain.remove()
}
function newUserCont(userId) {
    const userCont = document.createElement('div')
        userCont.setAttribute('id', String(userId))
        userCont.setAttribute('class', 'connectedUserContainer')
        const video = document.createElement('video')
        userCont.insertBefore(video, userCont.firstElementChild)
        const nameCont = document.createElement('div')
            nameCont.setAttribute('class', 'connectedUserNameContainer')
            userCont.appendChild(nameCont)
            const h2 = document.createElement('h2')
            h2.textContent = userId;
            nameCont.appendChild(h2)
            const hr = document.createElement('hr')
            nameCont.appendChild(hr)
    connectedUserCont.appendChild(userCont)
    return userCont;
}
function connectToNewUser(userId, stream, cont) {
    const call = myPeer.call(userId, stream);
    const video = cont.querySelector('video');
    call.on('stream', userVideoStream => {
        addVideoStream(video, userVideoStream);
    });
    call.on('close', () => {
        handlePeerDisconnection(userId)
    });
    activeCalls[userId] = call;
}
// Function to check the status of active connections periodically
function checkActiveConnections() {
    Object.keys(activeCalls).forEach(userId => {
        const call = activeCalls[userId];
        if (call.open === false) {
            // The connection is closed, handle disconnection
            handlePeerDisconnection(userId);
        } else {
            // The connection is still active, you can perform additional checks if needed
        }
    });
}

// Interval to trigger the check periodically (every 10 seconds for example)
setInterval(checkActiveConnections, 5000);

// Function to handle disconnection of a peer
function handlePeerDisconnection(userId) {
    // Handle disconnection logic here
    console.log(`Peer ${userId} has disconnected.`);
    // Check if the peer's call exists in the activeCalls object
    if (activeCalls[userId]) {
        // delte the call
        delete activeCalls[userId];
    }
    // Additional cleanup or notification logic if needed
    if(document.getElementById(String(userId))){
        document.getElementById(String(userId)).remove()
    }
}
socket.on('user-disconnected', userId => {
    handlePeerDisconnection(userId);
    peers.splice(peers.indexOf(userId), 1);
});

navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(setTimeout(() => {   
    //Wait 1 second to allow peerObJ to get id.
    }, 2500)).then(stream => {
    addSelfStream(stream);
        socket.on('user-connected', userId => {
            setTimeout(() => {
                peers.push(userId);
                // Adding a delay to avoid race condition
                const newCont = newUserCont(userId)
                connectToNewUser(userId, stream, newCont);
            }, 2500);
        });
        myPeer.on('call', call => {
            call.answer(stream);
            call.on('stream', userVideoStream => {
                let video;
                activeCalls[call.peer] = call;
                if (document.getElementById(call.peer)){
                    video = document.getElementById(call.peer).querySelector('video');
                    addVideoStream(video, userVideoStream);
                }
                else{
                    let contain = newUserCont(call.peer);
                    video = contain.querySelector('video');
                    addVideoStream(video, userVideoStream);
                }
        });
    });
});


