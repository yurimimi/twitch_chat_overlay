const tmi = require("tmi.js");

const CHANNEL_NAME = document.querySelector(
  'meta[name="channel_name"]',
).content;
const MESSAGE_COUNT_LIMIT = 20;
const tag_regex = new RegExp("({{.*?}})");

function TwitchIrcClient(channelName) {
  // Init IRC client and join the channel
  this.client = new tmi.Client({
    channels: [channelName],
  });
  this.client.connect();

  // IRC events
  this.client.on("connected", () => {
    window.chat.addSystemMessage("Connected to channel: " + channelName);
  });
  this.client.on("disconnected", () => {
    window.chat.addSystemMessage("Disconnected from channel: " + channelName);
  });
  this.client.on("message", (channel, tags, message, self) => {
    window.chat.addChatterMessage(tags, message);
  });

  // Handles so I can access it from the browser console
  this.connect = this.client.connect.bind(this.client);
  this.disconnect = this.client.disconnect.bind(this.client);
}

class Message extends HTMLParagraphElement {
  emotes = undefined;
  message = "";

  constructor(message, emotes = undefined) {
    super();

    this.emotes = emotes;
    this.message = message;
  }

  connectedCallback() {
    // Apply CSS
    this.setAttribute("class", "chat-message");

    if (this.emotes) {
      this.processEmotes(this.message, this.emotes, this);
    } else {
      this.appendChild(document.createTextNode(this.message));
    }

    // Entrance animation
    setTimeout(() => {
      this.style.opacity = "1";
    }, 1);
  }

  processEmotes(message, emotes, rootEl) {
    // DEBUG
    console.log(this.emotes);

    const stringReplacements = [];

    // Iterate of emotes to access ids and positions
    Object.entries(emotes).forEach(([id, positions]) => {
      // Use only the first position to find out the emote key word
      const position = positions[0];
      const [start, end] = position.split("-");
      const stringToReplace = message.substring(
        parseInt(start, 10),
        parseInt(end, 10) + 1,
      );

      stringReplacements.push({
        stringToReplace: stringToReplace,
        replacement: `{{ ${id} }}`,
      });
    });

    // Generate template
    const template = stringReplacements.reduce(
      (t, { stringToReplace, replacement }) => {
        // DEBUG
        console.log("Message is:", message);
        console.log("`t` is:", t);

        return t.split(stringToReplace).join(replacement);
      },
      message,
    );
    // DEBUG
    console.log("Template:", template);

    const tokens = template.split(tag_regex);
    console.log(tokens);
    tokens.forEach((token_string) => {
      let token_start = token_string.slice(0, 2);
      if (token_start == "{{") {
        const emoteId = token_string.slice(2, -2).trim();
        rootEl.appendChild(new Emote(emoteId));
      } else {
        rootEl.appendChild(document.createTextNode(token_string));
      }
    });
  }
}

class ChatterMessage extends Message {
  username = undefined;
  usernameColor = undefined;

  constructor(message, emotes, username, usernameColor) {
    super(message, emotes);

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

class Emote extends HTMLImageElement {
  emoteId = undefined;

  constructor(emoteId) {
    super();

    this.emoteId = emoteId;
  }

  connectedCallback() {
    // Set the source image of emote
    this.setAttribute(
      "src",
      `https://static-cdn.jtvnw.net/emoticons/v1/${this.emoteId}/1.0`,
    );
    // Making it of line height
    this.setAttribute("height", "19");
    // Drag it down to the bottom of the text line so it doesn't
    // stretch the message window upwards.
    this.style.verticalAlign = "bottom";
  }
}

class Chat extends HTMLElement {
  messageCountLimit = 0;
  static observedAttributes = ["messageCountLimit"];

  constructor(messageCountLimit = 20) {
    super();

    /**
     * Message count limit property.
     * Set messages limit. After reaching the max count of messages,
     * it'll start deleting oldest messages keeping the count
     * of messages within the limit.
     */
    this.messageCountLimit = messageCountLimit;
  }

  connectedCallback() {
    /**
     * We need this to re-inverse the message addition order.
     * Messages are added at the bottom with the scroll position
     * staying at the bottom as well.
     */
    this.appendChild(document.createElement("div"));
    this.innerDiv = this.firstElementChild;

    //this.setAttribute("messageCountLimit", MESSAGE_COUNT_LIMIT);
  }

  // This method creates a new message and shows it in the chat.
  addChatterMessage(tags, message) {
    const chatMessageEl = new ChatterMessage(
      message,
      tags["emotes"],
      tags["display-name"],
      tags["color"],
    );
    this.#addMessage(chatMessageEl);

    // DEBUG
    console.log(`${tags["display-name"]}: ${message}`);
  }

  addSystemMessage(message) {
    const chatMessage = new SystemMessage(message);
    this.#addMessage(chatMessage);

    // DEBUG
    console.log(message);
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
}

customElements.define("chatter-message", ChatterMessage, { extends: "p" });
customElements.define("system-message", SystemMessage, { extends: "p" });
customElements.define("chat-emote", Emote, { extends: "img" });
customElements.define("chat-window", Chat, { extends: "main" });

// So I can reach it from the browser console
window.ircClient = new TwitchIrcClient(CHANNEL_NAME);
// Instantiate the chat window and append it to the body
window.chat = new Chat();
document.body.appendChild(window.chat);
