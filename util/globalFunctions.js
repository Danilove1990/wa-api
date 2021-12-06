exports.globalSend = async function (Client, target, msg) {
    try {
        const client = Client;
        await client.sendMessage(target, msg)
    } catch (error) {
        console.log(error)
    }
}

exports.sendLog = async function (msg) {
    try {
   const { MessageMedia } = require('whatsapp-web.js');
   const media = MessageMedia.fromFilePath('./chats/log.xlsx');
   const chat = await msg.getChat();
   chat.sendMessage(media);
     console.log('log enviado global');
   } catch (error) {
     console.log('Err: '+error)
   }
  };

