//app_ui.js

/** Copyright (c) 2019 Mesibo
 * https://mesibo.com
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the terms and condition mentioned
 * on https://mesibo.com as well as following conditions are met:
 *
 * Redistributions of source code must retain the above copyright notice, this
 * list of conditions, the following disclaimer and links to documentation and
 * source code repository.
 *
 * Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 *
 * Neither the name of Mesibo nor the names of its contributors may be used to
 * endorse or promote products derived from this software without specific prior
 * written permission.
 *
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 *
 * Documentation
 * https://mesibo.com/documentation/
 *
 * Source Code Repository
 * https://github.com/mesibo/samples/js-beta
 *
 *
 */

let getById = (id, parent) => parent ? parent.getElementById(id) : getById(id, document);
let getByClass = (className, parent) => parent ? parent.getElementsByClassName(className) : getByClass(className, document);

//The number of messages loaded into the message area in one read call
const MESIBO_MAX_MESSAGES_READ = 15;


//DOM property of various UI elements that includes the side-panel(chat-list), message-area and header(details),etc
const DOM = {
	chatListArea: getById("chat-list-area")
	, messageArea: getById("message-area")
	, inputArea: getById("input-area")
	, chatList: getById("chat-list")
	, messages: getById("messages")
	, chatListItem: getByClass("chat-list-item")
	, messageAreaName: getById("name", this.messageArea)
	, messageAreaPic: getById("pic", this.messageArea)
	, messageAreaNavbar: getById("navbar", this.messageArea)
	, messageAreaDetails: getById("details", this.messageAreaNavbar)
	, messageAreaOverlay: getByClass("overlay", this.messageArea)[0]
	, messageInput: getById("input")
	, profileSettings: getById("profile-settings")
	, profilePic: getById("profile-pic")
	, profilePicInput: getById("profile-pic-input")
	, availableUsers: getById("available-users-list")
	, inputName: getById("input-name")
	, username: getById("username")
	, displayPic: getById("display-pic")
	, fileUpload: getById("file-upload")
	, fileInput: getById("file-input")
	, fileCaption: getById("file-caption")
, };

let mClassList = (element) => {
	return {
		add: (className) => {
			element.classList.add(className);
			return mClassList(element);
		}
		, remove: (className) => {
			element.classList.remove(className);
			return mClassList(element);
		}
		, contains: (className, callback) => {
			if (element.classList.contains(className))
				callback(mClassList(element));
		}
	};
};

// 'areaSwapped' is used to keep track of the swapping
// of the main area between chatListArea and messageArea
// in mobile-view
let areaSwapped = false;

// 'chat' is used to store the current chat
// which is being opened in the message area
let chat = null;


// This will be used to store the date of the last message
// in the message area
let lastDate = "";
let oldestDate = "";
let oldestTime = "";


//Load available contacts accessible via side panel
let loadAvailableUserList = () => {
	DOM.availableUsers.innerHTML = "";
	let contactList = MesiboDemoApp.getStorage().getContacts();

	contactList
		.forEach((elem, index) => {
			DOM.availableUsers.innerHTML += `
		<div class="chat-list-item d-flex flex-row w-100 p-2 border-bottom " onclick="hideProfileSettings();generateMessageArea(this, ${index})">
			<img src="${elem.pic}" alt="Profile Photo" class="img-fluid rounded-circle mr-2" style="height:50px;">
			<div class="w-50">
				<div class="name">${elem.name}</div>
				<div class="small last-message">${elem.status}</div>
			</div>
		</div>
		`;
		});
};

// Get the matching status tick icon
let getStatusClass = (status) => {
	var statusTick = "";
	switch (status) {

		case MESIBO_MSGSTATUS_SENT:
			statusTick = "far fa-check-circle";
			break;

		case MESIBO_MSGSTATUS_DELIVERED:
			statusTick = "fas fa-check-circle";
			break;


		case MESIBO_MSGSTATUS_READ:
			statusTick = "fas fa-check-circle";
			break;

		default:
			statusTick = "far fa-clock";
	}

	return statusTick;
};

// If the status value is read type, color it blue. Default color of status icon is gray
let getStatusColor = (status) => {
	var statusColor = "";
	switch (status) {
		case MESIBO_MSGSTATUS_READ:
			statusColor = "blue";
			break;

		default:
			statusColor = "grey";
	}

	return statusColor;
};

/**
 * This function is used to sort the side panel div blocks
 * With every message this order of divs gets sorted
 * The latest message will come on top 
 **/

function updateUserListOrder() {
	var side_panel = $("#chat-list");
	var divs = side_panel.children().detach().get(); //Get all DOM elements as an array and compare the time of last message

	divs.sort(function(a, b) {

		var a_id = a.id.split('_');
		a_id = a_id[a_id.length - 1];

		var b_id = b.id.split('_');
		b_id = b_id[b_id.length - 1];

		var a_phone = MesiboDemoApp.getStorage().getContactPropertyMatching('number', 'id', a_id); //Get phone number with matching message-id
		var b_phone = MesiboDemoApp.getStorage().getContactPropertyMatching('number', 'id', b_id);
		var a_time = MesiboDemoApp.getStorage().getLatestMessageTime(a_phone);
		var b_time = MesiboDemoApp.getStorage().getLatestMessageTime(b_phone);
		var cmp = b_time.localeCompare(a_time); //Try TS compare instead of costly string compare 

		return cmp;
	});

	//Append sorted divs
	side_panel.append(divs);
}

/**
 * This function(private) updates the status tick of the last message in side panel
 * If it is a sent message, the status is updated accordingly for each panel element
 * If it is a received message, the status tick is hidden
 **/
function _updateLastStatusTick(msg, uid) {
	let statusClass = getStatusClass(msg.params.status);
	let statusColor = getStatusColor(msg.params.status);

	const lst = getById('chat_list_user_last_message_status_' + uid);
	lst.className = statusClass;
	lst.style.color = statusColor;

	if (MesiboDemoApp.getSelfUser().id === msg.sender) {
		lst.style.display = 'inline'; // Display for sent message
	} else
		lst.style.display = 'none'; //Hide the status tick 

}

/**
 * This function is called to add items to the side panel(chat-list)
 * The appropriate HTML is generated for sent and received messages
 * Initially, this function will be called through the readSummary API
 **/
let updateChatList = (msg) => {

	//Reading from storage/database, these messages will be read to generate message area. Not for readSummary.
	if (MESIBO_ORIGIN_DBMESSAGE == msg.params.origin) {
		return 0;
	}

	p = msg.params;

	let statusClass = getStatusClass(p.status);
	let statusColor = getStatusColor(p.status);

	const uid = MesiboDemoApp.getStorage().getContactPropertyMatching('id', 'number', p.peer);

	const chat_list_user = getById('chat_list_user_' + uid);
	if (chat_list_user) {
		//Update existing chat list DOM
		// If it is a received message then hide the status tick
		_updateLastStatusTick(msg, uid);
		getById('chat_list_user_last_message_' + uid).innerHTML = msg.body;
		getById('chat_list_user_last_message_time_' + uid).innerHTML = mDate(msg.time).chatListFormat();
	} else { //Append DOM element to chat list
		DOM.chatList.insertAdjacentHTML("afterbegin", `
	<div id='chat_list_user_${uid}' class="chat-list-item d-flex flex-row w-100 p-2 border-bottom">
		<img id='chat_list_user_pic_${uid}' src="${MesiboDemoApp.getStorage().getContactPropertyMatching('pic','number', p.peer)}" alt="Profile Photo" class="img-fluid rounded-circle mr-2" style="height:50px;">
		<div class="w-50">
			<div id='chat_list_user_name_${uid}' class="name">${MesiboDemoApp.getStorage().getContactPropertyMatching('name', 'number', p.peer)}</div>
			<div class="small last-message">
			${msg.sender === MesiboDemoApp.getSelfUser().id ? "<i id=chat_list_user_last_message_status_"+ uid +" class=\"" + statusClass + "\" style=\"color:"+ statusColor + "\" ></i>" : ""}${msg.filetype == 1  ? "<i class= 'fas fa-image' >Image </i>": '<i id=chat_list_user_last_message_'+ uid +'>'+ msg.body + '</i></div>'}
		</div>
		<div class="flex-grow-1 text-right">
			<div id='chat_list_user_last_message_time_${uid}'class="small time">${mDate(msg.time).chatListFormat()}</div>
			</div>
	</div>
	`);
		getById("chat_list_user_" + uid).onclick = function() {
			generateMessageArea(this, uid); //Bind on-click event to generate message-area for that user
		};

	}

	updateUserListOrder();

};



let addDateToMessageArea = (date) => {

	document.getElementById("msglist").innerHTML += `
	  <div class="date_header">
            <p id=>${date}</p>
      </div>
      `;

	lastDate = date;
};

let prependDateToMessageArea = (date) => {
	document.getElementById("msglist").insertAdjacentHTML("afterbegin", `
	  <div class="date_header">
            <p id=>${date}</p>
      </div>
      `);

	oldestDate = date;
};


let updateStatusTick = (peer, mid, status) => {

	const statusTick = getById('status_tick_' + mid);

	if (!statusTick) return -1;
	updateDOMstatus(statusTick, status);

};


let updateDOMstatus = (statusTick, status) => {

	statusTick.className = getStatusClass(status);
	if (MESIBO_MSGSTATUS_READ == status)
		statusTick.style.color = "blue";

};

/**
 * This function is called to add message div element to the message area.
 * The child div elements will contain message body,status tick, etc
 * Note, that this will 'append' the element to the message list ie; To the tail end
 * This is done for adding messages arriving in real-time
 **/

let appendMessageToMessageArea = (msg) => {
	let msgDate = mDate(msg.time).messageListFormat();
	if ((!lastDate) || (lastDate != msgDate) && ('Today' != msgDate)) {
		addDateToMessageArea(msgDate);
	}


	if (msg.sender === 0) {
		let statusClass = getStatusClass(msg.status);
		let statusColor = getStatusColor(msg.status);
		let sendStatus = `<i id="status_tick_${msg.id}" class= "${statusClass}" style = "color:${statusColor}" ></i>`;

		document.getElementById("msglist").innerHTML += `
		    <div class="outgoing_msg">
		          <div class="sent_msg">
		          <div style="max-width: 200px;overflow-wrap: break-word;">
		                <p>${msg.body}</p>
		          </div>      
		                  <div class="d-flex flex-row">
		                    <div id= ${msg.id} class="time ml-auto small text-right flex-shrink-0 align-self-end text-muted" style="float:right">
		                     ${mDate(msg.time).getTime()}
		                       ${(msg.sender === 0) ? sendStatus : ""}
		                    </div>
		                  </div>
		          </div>
			</div>`;
	} else {
		document.getElementById("msglist").innerHTML += `
			 <div class="incoming_msg">
			      <div class="received_msg">
			            <div class="received_withd_msg">
			              <div style="max-width: 200px;overflow-wrap: break-word;">
			              <p>${msg.body}</p>                
			              </div>
			              <div id= ${msg.id} class="time ml-auto small text-left flex-shrink-0 align-self-end text-muted" style="float:left ; padding-bottom: 3px; width: 75px">
			              ${mDate(msg.time).getTime()}
			              </div>
			            </div>
			      </div>
			</div> 
			`;
	}

	updateScroll();
};

/**
 * This function is called to add message div element to the message area.
 * The child div elements will contain message body,status tick, etc
 * Note, that this will 'prepend' the element to the message list ie; To the head/top before other messages
 * This is done for adding messages when reading from database/storage through read API
 * The order of reading messages will be in reverse order so this will prepend messages 
 **/
let prependMessageToMessageArea = (msg) => {

	if (msg.sender === 0) {
		let statusClass = getStatusClass(msg.status);
		let statusColor = getStatusColor(msg.status);
		let sendStatus = `<i id="status_tick_${msg.id}" class= "${statusClass}" style = "color:${statusColor}" ></i>`;

		document.getElementById("msglist").insertAdjacentHTML("afterbegin", `
		    <div class="outgoing_msg">
		          <div class="sent_msg">
		          <div style="max-width: 200px;overflow-wrap: break-word;">
		                <p>${msg.body}</p>
		                </div>
		                  <div class="d-flex flex-row">
		                    <div id= ${msg.id} class="time ml-auto small text-right flex-shrink-0 align-self-end text-muted" style="float:right">
		                     ${mDate(msg.time).getTime()}
		                       ${(msg.sender === 0) ? sendStatus : ""}
		                    </div>
		                  </div>
		          </div>
			</div>
		`);
	} else {

		// var peer_profile_pic = MesiboDemoApp.getStorage().getPhotoFromPhone(MESIBO_USER_DESTINATION);
		document.getElementById("msglist").insertAdjacentHTML("afterbegin", `
			<div class="incoming_msg">
			      <div class="received_msg">
			            <div class="received_withd_msg">
			              <div style="max-width: 200px;overflow-wrap: break-word;">
			              <p>${msg.body}</p>                
			              </div>
			              <div id= ${msg.id} class="time ml-auto small text-left flex-shrink-0 align-self-end text-muted" style="float:left padding-bottom: 3px">
			              ${mDate(msg.time).getTime()}
			              </div>
			            </div>
			      </div>
			</div>`);
	}

	let msgDate = mDate(msg.time).messageListFormat();

	if ((oldestDate != msgDate) && (oldestTime == msg.time)) {
		prependDateToMessageArea(msgDate);
	}

	updateScroll();
};


let initChatObject = (chatIndex) => {
	const cl = MesiboDemoApp.getStorage().getContacts();
	c = {};
	c.name = cl[chatIndex]['name'];
	c.isGroup = false; //
	c.contact = cl[chatIndex];

	return c;
}

let updateScroll = (height) => {
	var objDiv = document.getElementById("scrollMessage");
	objDiv.scrollTop = objDiv.scrollHeight;
}

/** At the start, load a certain number of messages from history 
 * Update accordingly while scrolling to top
 **/
let initMessageArea = () => {
	var peer = MesiboDemoApp.getStorage().getContactPropertyMatching('number', 'name', DOM.messageAreaName.innerHTML);
	var count = MESIBO_MAX_MESSAGES_READ;

	MesiboDemoApp.getStorage().initRead(peer);
	DOM.messages.innerHTML = "";
	var t = ""
	//Initialize global date parameters
	oldestDate = MesiboDemoApp.getStorage().getLatestMessageTime(peer);
	lastDate = oldestDate ? mDate(oldestDate).getDate() : "";
	oldestTime = MesiboDemoApp.getStorage().getOldestMessageTime(peer);

	MesiboDemoApp.readMessages(peer, count); //Should read last N messages
	MesiboDemoApp.sendReadReceipt(peer); // Send read receipt for last message in active view
	updateScroll(DOM.messages.scrollHeight); //Pull scroll to bottom
}

let generateMessageArea = (elem, chatIndex) => {

	var chat = initChatObject(chatIndex);
	lastDate = "";


	mClassList(DOM.inputArea).contains("d-none", (elem) => elem.remove("d-none").add("d-flex"));
	mClassList(DOM.messageAreaOverlay).add("d-none");

	[...DOM.chatListItem].forEach((elem) => mClassList(elem).remove("active"));

	mClassList(elem).contains("unread", () => {
		MesiboDemoApp.getStorage().changeStatusById({
			isGroup: chat.isGroup
			, id: chat.isGroup ? chat.group.id : chat.contact.id
		});
		mClassList(elem).remove("unread");
		mClassList(elem.querySelector("#unread-count")).add("d-none");
	});

	if (575 >= window.innerWidth) {
		mClassList(DOM.chatListArea).remove("d-flex").add("d-none");
		mClassList(DOM.messageArea).remove("d-none").add("d-flex");
		areaSwapped = true;
	} else {
		mClassList(elem).add("active");
	}

	DOM.messageAreaName.innerHTML = chat.name;
	DOM.messageAreaPic.src = chat.isGroup ? chat.group.pic : chat.contact.pic;

	initMessageArea();

};



let showChatList = () => {
	if (areaSwapped) {
		mClassList(DOM.chatListArea).remove("d-none").add("d-flex");
		mClassList(DOM.messageArea).remove("d-flex").add("d-none");
		areaSwapped = false;
	}
};

/** Update Profile UI if in active view **/
let MesiboUI_updateProfile = (m, data) => {

	if (MesiboDemoApp.getStorage().getContactPropertyMatching('name', 'number', m.peer) == DOM.messageAreaName) {
		const profileData = decodeString(data);
		DOM.messageAreaPic.src = MesiboDemoApp.getStorage().downloadUrl + profileData['photo'];
		DOM.messageAreaName.innerHTML = profileData['name'];
	}
};

/**
 * This is the UI callback function called from notify class when there is a new message
 * All messages to be added to UI will be through this channel
 * This function handles various message types like text, files, activity/presence information, etc
 **/

/**
 * This is the UI callback function called from notify class when there is a new message
 * All messages to be added to UI will be through this channel
 * This function handles various message types like text, files, activity/presence information, etc
 **/
let MesiboUI_onMessage = (m, data) => {

	const s = getById('status_indicator');

	//Update Activity indicators
	if (m.presence) {
		s.textContent = "";
		const p = m.presence;
		switch (p) {
			case MESIBO_ACTIVITY_ONLINE:
				s.textContent = "Online";
				break
			case MESIBO_ACTIVITY_TYPING:
				s.textContent = "Typing...";
				break;
		}
		return 0;
	}

	if (MESIBO_ORIGIN_REALTIME == m.origin)
		s.textContent = "";


	let msg = {
		id: m.id
		, time: ((m.origin == MESIBO_ORIGIN_DBMESSAGE) || (m.origin == MESIBO_ORIGIN_DBSUMMARY)) ? m.time : mDate().toString()
		, params: m
	, };

	var msg_type_sent = 'status' in m ? true : false;

	if (msg_type_sent) { //Status exists only for sent Messages
		msg.sender = 0;
		msg.recvId = MESIBO_USER_DESTINATION;
		msg.status = m.status;
		msg.body = decodeString(data);
	} else {
		msg.sender = MESIBO_USER_DESTINATION;
		msg.recvId = 0;
		msg.recvIsGroup = false;
		msg.read = false;
		msg.body = decodeString(data);
	}


	if (MESIBO_ORIGIN_DBMESSAGE == m.origin)
		prependMessageToMessageArea(msg);
	else if (MESIBO_ORIGIN_REALTIME == m.origin) {
		appendMessageToMessageArea(msg);
	}


	return 0;
};


let getMessagePosition = (pMsgId, pMsgArray) => {
	var msgIdPos = -1;
	for (var i = pMsgArray.length - 1; i >= 0; i--) {
		if (pMsgArray[i]['id'] == pMsgId)
			return i;
	}

	return -1; //Message ID not found
}

// If the message is read, update all previous messages to be considered read
let MesiboUI_updateSentReadPrevious = (pMsgId) => {
	let messages = MesiboDemoApp.getStorage().getMessages();

	var msgIdPos = getMessagePosition(pMsgId, messages);

	if (-1 == msgIdPos) {
		MesiboLog("Error: MesiboUI_updateSentReadPrevious: MsgId not found in sent Messages");
		return -1;
	}

	for (var i = msgIdPos - 1; i >= 0; i--) {
		var m_status = messages[i]['status'];

		if ((MESIBO_MSGSTATUS_DELIVERED == m_status) || (MESIBO_MSGSTATUS_READ == m_status)) {
			//Check for MESIBO_MSGSTATUS_READ because it might have already updated in storage, but UI is yet to be updated
			var rv = updateStatusTick(messages[i]['params']['peer'], messages[i]['id'], MESIBO_MSGSTATUS_READ);
			// if(rv == -1) return 0; // No further update, because corresponding UI element is not in active area 
			//Note: You can stop updating if mid matches last read message id
		}
	}

}

let MesiboUI_onMessageStatus = (m) => {
	updateStatusTick(m.peer, m.id, m.status);
	if (MESIBO_MSGSTATUS_READ == m.status)
		MesiboUI_updateSentReadPrevious(m.id);
};

let sendMessage = (msg_params, msg_id, msg_data) => {
	//In case of resending messages or outbox
	if (msg_params) {
		if (!msg_data['body']) return -1;
		MesiboDemoApp.getInstance().sendMessage(msg_params, msg_id, msg_data);
	}

	var msgdata = document.getElementById("inputfield").value;
	if (!msgdata) return -1;

	document.getElementById("inputfield").value = "";

	const mid = MesiboDemoApp.getInstance().random();
	var p = {
		'id': mid
		, 'peer': MESIBO_USER_DESTINATION
		, 'gid': 0
		, 'channel': 0
		, 'origin': MESIBO_ORIGIN_REALTIME
		, 'flag': MESIBO_FLAG_DEFAULT
		, 'status': MESIBO_MSGSTATUS_OUTBOX
	};


	MesiboDemoApp.triggerOnMessage(p, new TextEncoder().encode(msgdata));

	p = {};
	p.peer = MESIBO_USER_DESTINATION;
	p.flag = MESIBO_FLAG_DEFAULT;

	MesiboDemoApp.getInstance().sendMessage(p, mid, msgdata);
};

// Fetch Contacts
async function fetchContacts(usrToken, ts) {
	//AJAX request to back-end service, to fetch contact details and profile details
	const response =
		await fetch(MESIBO_API_URL + '?op=getcontacts&token=' + usrToken + '&ts=' + ts);

	const contactsData = await response.json(); //extract JSON from the HTTP response
	MesiboDemoApp.storeContacts(contactsData); //Store contacts object in storage

	//Update profile UI
	DOM.username.innerHTML = MesiboDemoApp.getSelfUser().name;
	DOM.displayPic.src = MesiboDemoApp.getSelfUser().pic;
	MesiboDemoApp.readSummary();

}

//Enter to send Message
document.onkeydown = function(e) {
	e = e || window.event;
	switch (e.which || e.keyCode) {
		case 13: //(13 is ASCII code for 'ENTER')
			sendMessage();
			if (event.preventDefault) event.preventDefault();
			break;
	}

}

let showProfileSettings = () => {
	DOM.profileSettings.style.left = 0;
	// DOM.profilePic.src = user.pic;
	// DOM.inputName.value = user.name;
	loadAvailableUserList();
};

let hideProfileSettings = () => {
	DOM.profileSettings.style.left = "-110%";
	DOM.username.innerHTML = MesiboDemoApp.getSelfUser().name;
};

let showAvailableUsers = () => {
	DOM.availableUsers.style.left = 0;
};

let hideAvailableUsers = () => {
	DOM.availableUsers.style.left = "-110%";
};





let mesibo_popup_init = () => {

	//Update profile details
	getById("display_pic").setAttribute('src', MESIBO_DISPLAY_PICTURE);
	getById("display_name").innerHTML = MESIBO_DISPLAY_NAME;

	var peer = MESIBO_USER_DESTINATION;
	var count = 15;

	oldestDate = MesiboDemoApp.getStorage().getLatestMessageTime(peer);
	lastDate = oldestDate ? mDate(oldestDate).getDate() : "";
	oldestTime = MesiboDemoApp.getStorage().getOldestMessageTime(peer);

	MesiboDemoApp.getStorage().initRead(peer);

	MesiboDemoApp.readMessages(peer, count); //Should read last fifteen messages
	MesiboDemoApp.sendReadReceipt(peer);
	updateScroll(); //Pull scroll to bottom

};


//Assign scroll function to message area 
$('#msglist').scroll(function() {
	if (0 == $('#msglist').scrollTop()) {
		//Load  messages as scrolled. As you scroll further upward more messages will be loaded from history
		MesiboDemoApp.readMessages(MESIBO_USER_DESTINATION, MESIBO_MAX_MESSAGES_READ);

	}
});