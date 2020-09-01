const fs = require("fs"); 
const moment = require("moment");
const qrcode = require("qrcode-terminal"); 
const { Client, MessageMedia } = require("whatsapp-web.js"); 
const mqtt = require("mqtt"); 
const listen = mqtt.connect("mqtt://test.mosquitto.org"); 
const fetch = require("node-fetch"); 
const delay = require("delay"); 
let urlen = require("urlencode"); 
const puppeteer = require("puppeteer"); 
const cheerio = require("cheerio");
const SESSION_FILE_PATH = "./session.json";
// file is included here
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
  sessionCfg = require(SESSION_FILE_PATH);
}
client = new Client({	  
    
	     puppeteer: {
        executablePath: '/usr/bin/chromium',
        headless: true,
		args: [
      "--log-level=3", // fatal only
   
      "--no-default-browser-check",
      "--disable-infobars",
      "--disable-web-security",
      "--disable-site-isolation-trials",
      "--no-experiments",
      "--ignore-gpu-blacklist",
      "--ignore-certificate-errors",
      "--ignore-certificate-errors-spki-list",
    
      "--disable-extensions",
      "--disable-default-apps",
      "--enable-features=NetworkService",
      "--disable-setuid-sandbox",
      "--no-sandbox",
    
      "--no-first-run",
      "--no-zygote"
    ]
		
    },	      
    session: sessionCfg
});
// You can use an existing session and avoid scanning a QR code by adding a "session" object to the client options.

client.initialize();

// ======================= Begin initialize WAbot

client.on("qr", qr => {
  // NOTE: This event will not be fired if a session is specified.
  qrcode.generate(qr, {
    small: true
  });
  console.log(`[ ${moment().format("HH:mm:ss")} ] Please Scan QR with app!`);
});

client.on("authenticated", session => {
  console.log(`[ ${moment().format("HH:mm:ss")} ] Authenticated Success!`);
  // console.log(session);
  sessionCfg = session;
  fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function(err) {
    if (err) {
      console.error(err);
    }
  });
});
client.on('message', async (msg) => {
    if(msg === '!join') {
        const chat = await msg.getChat();
        
        let text = "sini oy ";
        let mentions = [];

        for(let participant of chat.participants) {
            const contact = await client.getContactById(participant.id._serialized);
            
            mentions.push(contact);
            text += `@${participant.id.user} `;
        }

        chat.sendMessage(text, { mentions });
    }
});
client.on("auth_failure", msg => {
  // Fired if session restore was unsuccessfull
  console.log(
    `[ ${moment().format("HH:mm:ss")} ] AUTHENTICATION FAILURE \n ${msg}`
  );
  fs.unlink("./session.json", function(err) {
    if (err) return console.log(err);
    console.log(
      `[ ${moment().format("HH:mm:ss")} ] Session Deleted, Please Restart!`
    );
    process.exit(1);
  });
});

client.on("ready", () => {
  console.log(`[ ${moment().format("HH:mm:ss")} ] Whatsapp bot ready!`);
});

// ======================= Begin initialize mqtt broker

listen.on("connect", () => {
  listen.subscribe("corona", function(err) {
    if (!err) {
      console.log(`[ ${moment().format("HH:mm:ss")} ] Mqtt topic subscribed!`);
    }
  });
});

// ======================= WaBot Listen on Event

client.on("message_create", msg => {
  // Fired on all message creations, including your own
  if (msg.fromMe) {
    // do stuff here
  }
});

client.on("message_revoke_everyone", async (after, before) => {
  // Fired whenever a message is deleted by anyone (including you)
  // console.log(after); // message after it was deleted.
  if (before) {
    console.log(before.body); // message before it was deleted.
  }
});

client.on("message_revoke_me", async msg => {
  // Fired whenever a message is only deleted in your own view.
  // console.log(msg.body); // message before it was deleted.
});

client.on("message_ack", (msg, ack) => {
  /*
        == ACK VALUES ==
        ACK_ERROR: -1
        ACK_PENDING: 0
        ACK_SERVER: 1
        ACK_DEVICE: 2
        ACK_READ: 3
        ACK_PLAYED: 4
    */

  if (ack == 3) {
    // The message was read
  }
});

client.on("group_join", notification => {
  // User has joined or been added to the group.
  console.log("join", notification);
  notification.reply("User joined.");
});

client.on("group_leave", notification => {
  // User has left or been kicked from the group.
  console.log("leave", notification);
  notification.reply("User left.");
});

client.on("group_update", notification => {
  // Group picture, subject or description has been updated.
  console.log("update", notification);
});

client.on("disconnected", reason => {
  console.log("Client was logged out", reason);
});

// ======================= WaBot Listen on message

const startServer = async () => {
    create('Imperial', serverOption)
        .then(client => {
            console.log('[DEV] Skydxz')
            console.log('[SERVER] Server Started!')
            // Force it to keep the current session
            client.onStateChanged(state => {
                console.log('[Client State]', state)
                if (state === 'CONFLICT') client.forceRefocus()
            })
            // listening on message
            client.onMessage((message) => {
                msgHandler(client, message)
            })
        })
}

async function msgHandler (client, message) {
    try {
        const { type, id, from, t, sender, isGroupMsg, chat, caption, isMedia, mimetype, quotedMsg } = message
        let { body } = message
        const { pushname } = sender
        const { formattedTitle } = chat
        const prefix = '#'
        body = (type == 'chat' && body.startsWith(prefix)) ? body : (type == 'image' && caption.startsWith(prefix)) ? caption : ''
        const command = body.slice(prefix.length).trim().split(/ +/).shift().toLowerCase()
        const args = body.slice(prefix.length).trim().split(/ +/).slice(1)
        const isCmd = body.startsWith(prefix)
        const time = moment(t * 1000).format('DD/MM HH:mm:ss')
        if (!isCmd && !isGroupMsg) return console.log('[RECV]', color(time, 'yellow'), 'Message from', color(pushname))
        if (!isCmd && isGroupMsg) return console.log('[RECV]', color(time, 'yellow'), 'Message from', color(pushname), 'in', color(formattedTitle))
        if (isCmd && !isGroupMsg) console.log(color('[EXEC]'), color(time, 'yellow'), color(`${command} (${args.length})`), 'from', color(pushname))
        if (isCmd && isGroupMsg) console.log(color('[EXEC]'), color(time, 'yellow'), color(`${command} (${args.length})`), 'from', color(pushname), 'in', color(formattedTitle))

        // Checking function speed
        // const timestamp = moment()
        // const latensi = moment.duration(moment() - timestamp).asSeconds()
        const isUrl = new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/gi)
        const uaOverride = 'WhatsApp/2.2029.4 Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36'

        switch (command) {
        case 'menu':
        case 'help': {
            const text = `👋️ Hi, ${pushname}! \n\nPrefix = #\n\nUsable Commands!✨\n\n*STICKER*\nCMD: #sticker\nDescription: Converts image into sticker, kirim gambar dengan caption #sticker atau balas gambar yang sudah dikirim dengan #sticker\n\nCMD: #sticker <url gambar>\nDescription: Converts image url into sticker\n\nHope you have a great day!✨`
            client.sendText(from, text)
            break
        }
        case 'sticker':
        case 'stiker':
            if (isMedia) {
                const mediaData = await decryptMedia(message, uaOverride)
                const imageBase64 = `data:${mimetype};base64,${mediaData.toString('base64')}`
                await client.sendImageAsSticker(from, imageBase64)
            } else if (quotedMsg && quotedMsg.type == 'image') {
                const mediaData = await decryptMedia(quotedMsg)
                const imageBase64 = `data:${quotedMsg.mimetype};base64,${mediaData.toString('base64')}`
                await client.sendImageAsSticker(from, imageBase64)
            } else if (args.length == 1) {
                const url = args[0]
                if (url.match(isUrl)) {
                    await client.sendStickerfromUrl(from, url)
                        .then((r) => {
                            if (!r) client.sendText(from, 'Maaf, link yang kamu kirim tidak memuat gambar.')
                        })
                        .catch((err) => console.log('Caught exception: ', err))
                } else {
                    client.reply(from, 'Maaf, link yang kamu kirim tidak valid.', id)
                }
            } else {
                client.reply(from, 'Tidak ada gambar! Untuk membuka daftar perintah kirim #menu', id)
            }
            break
        case 'tiktok': {
            if (args.length !== 1) return client.reply(from, 'Maaf, link yang kamu kirim tidak valid', id)
            const url = args[0]
            if (!url.match(isUrl) && !url.includes('tiktok.com')) return client.reply(from, 'Maaf, link yang kamu kirim tidak valid', id)
            await client.sendText(from, '*Scraping Metadata...*')
            await tiktok(url)
                .then((videoMeta) => {
                    const filename = videoMeta.authorMeta.name + '.mp4'
                    const caps = `*Metadata:*\nUsername: ${videoMeta.authorMeta.name} \nMusic: ${videoMeta.musicMeta.musicName} \nView: ${videoMeta.playCount.toLocaleString()} \nLike: ${videoMeta.diggCount.toLocaleString()} \nComment: ${videoMeta.commentCount.toLocaleString()} \nShare: ${videoMeta.shareCount.toLocaleString()} \nCaption: ${videoMeta.text.trim() ? videoMeta.text : '-'} \n\nDonasi: kamu dapat membantuku beli dimsum dengan menyawer melalui https://saweria.co/donate/yogasakti atau mentrakteer melalui https://trakteer.id/red-emperor \nTerimakasih.`
                    client.sendFileFromUrl(from, videoMeta.url, filename, videoMeta.NoWaterMark ? caps : `⚠ Video tanpa watermark tidak tersedia. \n\n${caps}`, '', { headers: { 'User-Agent': 'okhttp/4.5.0' } })
                        .catch(err => console.log('Caught exception: ', err))
                }).catch(() => {
                    client.reply(from, 'Gagal mengambil metadata, link yang kamu kirim tidak valid', id)
                })
        }
            break
        case 'ig':
        case 'instagram': {
            if (args.length !== 1) return client.reply(from, 'Maaf, link yang kamu kirim tidak valid', id)
            const url = args[0]
            if (!url.match(isUrl) && !url.includes('instagram.com')) return client.reply(from, 'Maaf, link yang kamu kirim tidak valid', id)
            await client.sendText(from, '*Scraping Metadata...*')
            instagram(url)
                .then(async (videoMeta) => {
                    const content = []
                    for (let i = 0; i < videoMeta.length; i++) {
                        await urlShortener(videoMeta[i].video)
                            .then((result) => {
                                console.log('Shortlink: ' + result)
                                content.push(`${i + 1}. ${result}`)
                            }).catch((err) => {
                                client.sendText(from, 'Error, ' + err)
                            })
                    }
                    client.sendText(from, `Link Download:\n${content.join('\n')} \n\nDonasi: kamu dapat membantuku beli dimsum dengan menyawer melalui https://saweria.co/donate/Skydxz \nTerimakasih.`)
                }).catch((err) => {
                    if (err == 'Not a video') return client.reply(from, 'Error, tidak ada video di link yang kamu kirim', id)
                    client.reply(from, 'Error, user private atau link salah', id)
                })
        }
            break
        case 'twt':
        case 'twitter': {
            if (args.length !== 1) return client.reply(from, 'Maaf, link yang kamu kirim tidak valid', id)
            const url = args[0]
            if (!url.match(isUrl) & !url.includes('twitter.com') || url.includes('t.co')) return client.reply(from, 'Maaf, url yang kamu kirim tidak valid', id)
            await client.sendText(from, '*Scraping Metadata...*')
            twitter(url)
                .then(async (videoMeta) => {
                    try {
                        if (videoMeta.type == 'video') {
                            const content = videoMeta.variants.filter(x => x.content_type !== 'application/x-mpegURL').sort((a, b) => b.bitrate - a.bitrate)
                            const result = await urlShortener(content[0].url)
                            console.log('Shortlink: ' + result)
                            client.sendFileFromUrl(from, content[0].url, 'TwitterVideo.mp4', `Link Download: ${result} \n\nDonasi: kamu dapat membantuku beli dimsum dengan menyawer melalui https://saweria.co/donate/yogasakti atau mentrakteer melalui https://trakteer.id/red-emperor \nTerimakasih.`)
                        } else if (videoMeta.type == 'photo') {
                            for (let i = 0; i < videoMeta.variants.length; i++) {
                                await client.sendFileFromUrl(from, videoMeta.variants[i], videoMeta.variants[i].split('/media/')[1], '')
                            }
                        }
                    } catch (err) {
                        client.sendText(from, 'Error, ' + err)
                    }
                }).catch(() => {
                    client.sendText(from, 'Maaf, link tidak valid atau tidak ada video di link yang kamu kirim')
                })
        }
            break
        case 'fb':
        case 'facebook': {
            if (args.length !== 1) return client.reply(from, 'Maaf, link yang kamu kirim tidak valid', id)
            const url = args[0]
            if (!url.match(isUrl) && !url.includes('facebook.com')) return client.reply(from, 'Maaf, url yang kamu kirim tidak valid', id)
            await client.sendText(from, '*Scraping Metadata...*')
            facebook(url)
                .then(async (videoMeta) => {
                    try {
                        const title = videoMeta.response.title
                        const thumbnail = videoMeta.response.thumbnail
                        const links = videoMeta.response.links
                        const shorts = []
                        for (let i = 0; i < links.length; i++) {
                            const shortener = await urlShortener(links[i].url)
                            console.log('Shortlink: ' + shortener)
                            links[i].short = shortener
                            shorts.push(links[i])
                        }
                        const link = shorts.map((x) => `${x.resolution} Quality: ${x.short}`)
                        const caption = `Text: ${title} \nLink Download: \n${link.join('\n')} \n\nDonasi: kamu dapat membantuku beli dimsum dengan menyawer melalui https://saweria.co/donate/yogasakti atau mentrakteer melalui https://trakteer.id/red-emperor \nTerimakasih.`
                        client.sendFileFromUrl(from, thumbnail, 'videos.jpg', caption)
                    } catch (err) {
                        client.reply(from, 'Error, ' + err, id)
                    }
                })
                .catch((err) => {
                    client.reply(from, `Error, url tidak valid atau tidak memuat video \n\n${err}`, id)
                })
        }
            break
        case 'mim':
        case 'memes':
        case 'meme': {
            const { title, url } = await fetchMeme()
            await client.sendFileFromUrl(from, `${url}`, 'meme.jpg', `${title}`)
            break
        }
        default:
            console.log(color('[ERROR]', 'red'), color(time, 'yellow'), 'Unregistered Command from', color(pushname))
            break
        }
    } catch (err) {
        console.log(color('[ERROR]', 'red'), err)
    }
}

startServer()
