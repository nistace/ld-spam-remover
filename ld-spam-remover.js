// ==UserScript==
// @name     LD Spam Remover
// @version  1
// @grant    none
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
const marked_as_spam = {};
const SPAMDETECT_PHRASE_a = "SPAMREPORT"
const SPAMDETECT_PHRASE_b = "SPAM REPORT"

const handleCommentDataReceived = function (name, thread_id, data) {
    if (data === undefined)
    {
      	marked_as_spam[thread_id] = 0;
        return 1;
    }
  
    for (const comment of data.comment) 
    {     
      	if(comment.body.includes(SPAMDETECT_PHRASE_a) || comment.body.includes(SPAMDETECT_PHRASE_b))
        {
          	// SPAMREPORT FOUND
		//
          	marked_as_spam[thread_id] = 1;
        	return 0; 
        }
    }
  	
    marked_as_spam[thread_id] = 0;
    return 1;
}

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


const get_spam_report = function (index, thread_id) 
{
  	const httpRequest = new XMLHttpRequest();
    httpRequest.open("GET", `https://api.ldjam.com/vx/comment/getbynode/${thread_id}?limit=10`, true);
    httpRequest.onload = () => {
        handleCommentDataReceived(name, thread_id, JSON.parse(httpRequest.response)); // Becomes 0 (spam), when one of the comments contains the text: "SPAM REPORT"
    }
    httpRequest.send();  
}

// -1 = unknown
//  0 = spam
//  1 = not spam
const getSpamStatus = function (index, body, name, title) {
    loadUserData(name);
  
    let comments_title = title[0].getElementsByTagName("a")[0].getAttribute("title");
    let thread_id = comments_title.replace(/.* \[\$/i, "");      
    thread_id = thread_id.replace(/\]$/i, "");
  
    let return_status = -1;
  
    if(typeof marked_as_spam[thread_id] !== 'undefined')
    {
      	if(marked_as_spam[thread_id])
        {
             return 0;
        }
    }

    // No game published
    if (users[name].gameCount === 0) {
        // More than 2 posts by this user
        if (users[name].postCount > 2)
        {
            return_status = 0;
        }

        let links = (body.textContent.match(/https?:\/\//g) || []).length;
        let refs = body.getElementsByTagName("a")
        links += refs.length;

        for (let lnk of refs) {
            if ("href" in lnk && lnk.href.includes("casino"))
            {
                return_status = 0;
            }
        }

        // More than 1 link in the post
        if (links > 1)
        {
            return_status = 0;
        }
    }
  	
    if(return_status != 0)
    {
      	// Check if LD user reported this as spam.
      	//
  	return_status = get_spam_report(index, thread_id); // When one of the comments contains the text: "SPAM REPORT"
    }
  
    return return_status;
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
      	let title = elements[i].getElementsByClassName("content-common-body -title");
        if (bodies.length <= 0 || by.length <= 0) continue;
        let nameTag = by[0].getElementsByClassName("-at-name");
        if (nameTag.length <= 0) continue;
        const name = nameTag[0].textContent.replace("@", "");
        const spamStatus = getSpamStatus(i, bodies[0], name, title);
        const displayValue = spamStatus === 0 ? "none" : "";
        if (elements[i].style.display !== displayValue) {
            elements[i].style.display = displayValue;
            if (spamStatus === 0) {
                console.log(`LD Spam Remover: ${name}'s post is probably spam and has been hidden.`);
                countRemoved++;
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
