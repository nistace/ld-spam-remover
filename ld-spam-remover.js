// ==UserScript==
// @name     LD Spam Remover
// @version  1
// @grant    GM_addStyle
// @description none
// @match        https://ldjam.com/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=ldjam.com
// ==/UserScript==

// This is a script that tries and hides spam from the ldjam.com main page.
// Use it by copy pasting the content of this file using a GreaseMonkey script.

const analyzed = [];
const users = {};
let info;
let displayInfoTimer;
let countSpamsRemovedLately = 0;


const handlePostDataReceived = function (name, data) {
    if (data === undefined) {
        users[name].postCount = 0;
        return;
    }
    users[name].postCount = data.feed.length;
}

const handleGameDataReceived = function (name, data) {
    if (data === undefined) {
        users[name].gameCount = 0;
        return;
    }

    users[name].gameCount = data.feed.length;
    if (users[name].gameCount === 0) {
        users[name].postCount = -1;
        const httpRequest = new XMLHttpRequest();
        httpRequest.open("GET", `https://api.ldjam.com/vx/node/feed/${users[name].userId}/author/post?limit=1000`, true);
        httpRequest.onload = () => {
            handlePostDataReceived(name, JSON.parse(httpRequest.response));
        }
        httpRequest.send();
    }
}


const handleUserDataReceived = function (name, data) {
    if (data === undefined) {
        users[name].gameCount = 0;
        return;
    }
    users[name].userId = data.node_id;
    const httpRequest = new XMLHttpRequest();
    httpRequest.open("GET", `https://api.ldjam.com/vx/node/feed/${users[name].userId}/authors/item/game?limit=1000`, true);
    httpRequest.onload = () => {
        handleGameDataReceived(name, JSON.parse(httpRequest.response));
    }
    httpRequest.send();
}


const loadUserData = function (name) {
    if (users[name] !== undefined) return;
    users[name] = {name: name, gameCount: -1};
    const httpRequest = new XMLHttpRequest();
    httpRequest.open("GET", `https://api.ldjam.com/vx/node2/walk/1/users/${name}/games?node=&parent=&superparent=&author=`, true);
    httpRequest.onload = () => {
        handleUserDataReceived(name, JSON.parse(httpRequest.response));
    }
    httpRequest.send();
}

let blacklistUsers = [
    'deden-benoma',
    'heri',
    'jack-leo',
    'boardbandinternetprovider',
    'kidav52410',
    'laura5',
    'tandiv20154'
];

blacklistUsers = blacklistUsers.concat(JSON.parse(localStorage.getItem("blacklistUsers")));

// -1 = unknown
//  0 = spam
//  1 = not spam
const getSpamStatus = function (index, body, name) {
    loadUserData(name);
    if (blacklistUsers.includes(name)) return 0;
    if (users[name].gameCount > 0) return 1;
    // No game published
    if (users[name].gameCount === 0) {
        // More than 2 posts by this user
        if (users[name].postCount > 2) return 0;

        let links = (body.textContent.match(/https?:\/\//g) || []).length;
        let refs = body.getElementsByTagName("a")
        links += refs.length;

        for (let lnk of refs) {
            if ("href" in lnk && lnk.href.includes("casino")) return 0;
        }

        // More than 1 link in the post
        if (links > 1) return 0;
    }

    return -1;
}

const clean = function () {
    if (displayInfoTimer > 0) {
        displayInfoTimer--;
        if (displayInfoTimer === 0) {
            info.style.display = "none";
            countSpamsRemovedLately = 0;
        }
    }

    if (document.getElementsByClassName("page-home-home").length <= 0) return;

    let elements = document.getElementsByClassName("page-home-home")[0].getElementsByClassName("content-base content-common content-simple");
    let countRemoved = 0;
    for (let i = 0; i < elements.length; ++i) {
        if (elements[i].classList.contains("ldspam-cleaned")) continue;
        let bodies = elements[i].getElementsByClassName("content-common-body -markup -block-if-not-minimized markup");
        let by = elements[i].getElementsByClassName("content-common-body -by");
        if (bodies.length <= 0 || by.length <= 0) continue;
        let nameTag = by[0].getElementsByClassName("-at-name");
        if (nameTag.length <= 0) continue;
        const name = nameTag[0].textContent.replace("@", "");
        const spamStatus = getSpamStatus(i, bodies[0], name);
        const displayValue = spamStatus === 0 ? "none" : "";
        if (elements[i].style.display !== displayValue) {
            elements[i].style.display = displayValue;
            if (spamStatus === 0) {
                console.log(`LD Spam Remover: ${name}'s post is probably spam and has been hidden.`);
                countRemoved++;
            }

        }

        if (document.getElementById(`${name + i}`) == null) {
            var zNode = document.createElement('div');
            zNode.innerHTML = `<button id=${name + i} type="button" class="spam-button">`
                            + 'Report Spam</button>'
                            ;
            zNode.setAttribute('id', `container-${name + i}`);
            elements[i].append(zNode);

            // Activate the newly added button.
            if (document.getElementById(`${name + i}`) != null) {
                document.getElementById(`${name + i}`).addEventListener (
                    "click", ButtonClickAction, false
                );
            }

            function ButtonClickAction (zEvent) {
                var zNode = document.createElement('p');
                zNode.innerHTML = 'Spam Reported!';
                document.getElementById(`container-${name + i}`).appendChild(zNode);
                blacklistUsers.push(name);
                localStorage.setItem("blacklistUsers", JSON.stringify(blacklistUsers));
            }
        }
    }

    if (countRemoved > 0) {
        countSpamsRemovedLately += countRemoved;
        info.style.display = "";
        info.textContent = `LD Spam Remover: ${countSpamsRemovedLately} spams removed`;
        displayInfoTimer = 5;
    }

}

if (window.location.hostname === "ldjam.com") {
    info = document.createElement("div");
    info.style.zIndex = "999999";
    info.style.position = "fixed";
    info.style.top = "10px";
    info.style.left = "10px";
    info.style.border = "black 2px solid";
    info.style.boxShadow = "1px 1px 2px rgba(0,0,0,.5)";
    info.style.padding = "12px";
    info.style.background = "#FED";
    info.style.display = "none";
    document.body.appendChild(info);
    setInterval(clean, 1000);
}

//--- Style our newly added elements using CSS.
GM_addStyle ( `
    .spam-button {
        position: relative;
        width: auto;
        padding-left: 1rem;
        padding-right: 1rem;
        background: #b9c4d0;
        display: flex;
        line-height: 2.5rem;
        height: 2.5rem;
        min-width: 1.25rem;
        color: white;
        font-size: 1em;
        font-weight: bold;
        height: 45px;
        border: 1px solid white;
        cursor: pointer;
    }
` );
