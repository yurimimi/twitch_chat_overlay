const tmi = require("tmi.js");

CHANNEL_NAME = document.querySelector('meta[name="channel_name"]').content;
MESSAGE_COUNT_LIMIT = 20;

function TwitchIrcClient(channelName) {
  // Init IRC client and join the channel
  this.client = new tmi.Client({
    channels: [channelName],
  });
  this.client.connect();

  // IRC events
  this.client.on("connected", () => {
    createSystemMessage("Connected to channel: " + channelName);
  });
  this.client.on("disconnected", () => {
    createSystemMessage("Disconnected from channel: " + channelName);
  });
  this.client.on("message", (channel, tags, message, self) => {
    createChatterMessage(tags, message);
  });
  // Handles so I can access it from the browser console
  this.connect = this.client.connect.bind(this.client);
  this.disconnect = this.client.disconnect.bind(this.client);
}

function createChatterMessage(tags, message) {
  chatterName = tags["display-name"];
  chatterColor = tags["color"];
  chatterMessage = message;

  window.chat.addChatterMessage(chatterMessage, chatterName, chatterColor);
  // DEBUG
  console.log(`${chatterName}: ${chatterMessage}`);
}

function createSystemMessage(message) {
  window.chat.addSystemMessage(message);
  // DEBUG
  console.log(message);
}

class Message extends HTMLParagraphElement {
  message = "";

  constructor(message) {
    super();

    this.message = message;
  }

  connectedCallback() {
    // Apply CSS
    this.setAttribute("class", "chat-message");

    const messageText = document.createTextNode(this.message);
    this.appendChild(messageText);

    // Making it more interesting
    setTimeout(() => {
      this.style.opacity = "1";
    }, 1);
  }

  disconnectedCallback() {
    //console.log("Custom element removed from page.");
  }

  adoptedCallback() {
    //console.log("Custom element moved to new page.");
  }

  attributeChangedCallback(name, oldValue, newValue) {
    //console.log(`Attribute ${name} has changed.`);
  }

  addMessage(message) {
    //usernameEl = createUsernameElement(username, usernameColor);
    //messageEl = document.createElement("p");
    //messageEl.appendChild(usernameEl);
  }
}

class ChatterMessage extends Message {
  static observedAttributes = ["chatterUserNameColor"];

  constructor(message, username, usernameColor) {
    super(message);

    this.username = username;
    this.usernameColor = usernameColor;
  }

  connectedCallback() {
    this.addUsername(this.username, this.usernameColor);
    this.appendChild(document.createTextNode(": "));
    super.connectedCallback();
  }

  addUsername(name, color) {
    const span = document.createElement("span");
    span.style.color = color;
    name = document.createTextNode(name);
    span.appendChild(name);

    this.appendChild(span);
  }
}

class SystemMessage extends Message {
  constructor(message) {
    super(message);
  }

  connectedCallback() {
    super.connectedCallback();

    this.setAttribute("class", this.getAttribute("class") + " sys-message");
  }
}

class Chat extends HTMLElement {
  messageCountLimit = 0;
  static observedAttributes = ["messageCountLimit"];

  constructor(messageCountLimit = 20) {
    super();

    this.messageCountLimit = messageCountLimit;
  }

  connectedCallback() {
    // Get `main` element
    //const main = document.getElementsByTagName("main")[0];
    /** We need this to re-inverse the message addition order
     *  Messages are added at the bottom with the scroll position
     *  staying at the bottom as well.
     */
    this.appendChild(document.createElement("div"));
    this.innerDiv = this.firstElementChild;
    /** Message count limit property
     * Set messages limit. After reaching the max count of messages,
     * it'll start deleting oldest messages keeping the count
     * of messages within the limit.
     */
    this.setAttribute("messageCountLimit", MESSAGE_COUNT_LIMIT);
  }

  // This method creates a new message and shows it in the chat.
  addChatterMessage(messageText, chatterName, chatterColor) {
    const chatMessage = new ChatterMessage(
      messageText,
      chatterName,
      chatterColor,
    );
    this.#addMessage(chatMessage);
  }

  addSystemMessage(message) {
    const chatMessage = new SystemMessage(message);
    this.#addMessage(chatMessage);
  }

  #addMessage(messageEl) {
    // Add the message
    this.innerDiv.appendChild(messageEl);
    // Check messages count limit
    if (
      this.messageCountLimit != 0 &&
      this.innerDiv.children.length > this.messageCountLimit
    ) {
      this.innerDiv.removeChild(this.innerDiv.firstElementChild);
    }
  }

  disconnectedCallback() {
    console.log("Custom element removed from page.");
  }

  adoptedCallback() {
    console.log("Custom element moved to new page.");
  }

  attributeChangedCallback(name, oldValue, newValue) {
    console.log(`Attribute ${name} has changed.`);
  }
}

customElements.define("chatter-message", ChatterMessage, { extends: "p" });
customElements.define("system-message", SystemMessage, { extends: "p" });
customElements.define("chat-window", Chat, { extends: "main" });

// So I can reach it from the browser console
window.ircClient = new TwitchIrcClient(CHANNEL_NAME);
//window.chat = setupMain();
//window.chat = document.createElement("chat");
window.chat = new Chat();
document.body.appendChild(window.chat);
