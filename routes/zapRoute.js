// imports
const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const qrcode = require('qrcode');
const fs = require('fs');
const axios = require('axios').default;
const moment = require('moment');
const global = require('../util/globalFunctions.js')
const { Client } = require('whatsapp-web.js');
//
// variaveis
const botPort = 3000;
const botName = 'teste3';


var qrcode_code = '';
var botAPI = 'https://chatbot.sf.prefeitura.sp.gov.br/api/v1/bots/' + botName + '/converse/'
//
// puppeteer

// const SESSION_FILE_PATH = "./session.json";
// let sessionCfg;
// if (fs.existsSync(SESSION_FILE_PATH)) {
//   sessionCfg = require('.' + SESSION_FILE_PATH);
// }

const client = new Client({ puppeteer: { headless: true, args: ['--no-sandbox'] } });


client.initialize();

client.on('qr', (qr) => {
  // NOTE: This event will not be fired if a session is specified.
  console.log('QR RECEIVED', qr);
  qrcode_code = qr;
  try {
    axios.post('http://localhost:8000/test', qr).then(response => {
      console.log('retorno', response.config.data);
    });
  } catch (error) {
    console.log(error);
  }
});

// client.on('authenticated', (session) => {
//   console.log('AUTHENTICATED', session);
//   sessionCfg = session;
//   fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
//     if (err) {
//       console.error(err);
//     }
//   });
// });

client.on('auth_failure', msg => {
  // Fired if session restore was unsuccessfull
  console.error('AUTHENTICATION FAILURE', msg);
});

client.on('ready', () => {
  console.log('READY');
});

client.on('change_battery', (batteryInfo) => {
  // Battery percentage for attached device has changed
  const { battery, plugged } = batteryInfo;
  console.log(`Battery: ${battery}% - Charging? ${plugged}`);
});

client.on('change_state', state => {
  console.log('CHANGE STATE', state);
});

client.on('disconnected', (reason) => {
  console.log('Client was logged out', reason);
});

//externo
client.on('message', async msg => {
  console.log('MESSAGE RECEIVED');
  const getChat = await msg.getChat();


  // Envia status da bateria
  if (msg.body === '!bateria') {
    let batteryInfo = await client.info.getBatteryStatus();
    const { battery, plugged } = batteryInfo;
    console.log(`Battery: ${battery}% - Charging? ${plugged}`);
    msg.reply(`Battery: ${battery}% - Charging? ${plugged}`);


  }

  else if (msg.body.startsWith('/teste')) {

    console.log('MESSAGE: ', msg.body);

    let contact = await msg.getContact()
    console.log(`Nome: ${contact.pushname}`);
    msg.reply(`Como posso ajudar ${contact.pushname} ?`);
  }
  // Envia arquivo Excel
  else if (msg.body.startsWith('/log')) {
    await global.sendLog(msg);
  }
  // Envia o que recebeu
  else if (msg.body.startsWith('/resend')) {
    msg.reply(`Você escreveu: ${msg.body} `);
  }
  //ENVIA PERGUNTA AO CHATBOT VIA API
  else if (msg.body.startsWith('/p ') && !msg.broadcast) {
    try {
      let requestLink = botAPI + msg.from;
      msg.body = msg.body.slice(3)

      await sendoToBot(msg, requestLink);
    } catch (error) {
      console.log(error);
    }
   // msg.reply(`/p recebido`);
   console.log(`/p recebido`);

  }


  //FUNÇÃO DE ENCAMINHAR RESPOSTAS
  else if (msg.body.startsWith('/r ') && !msg.broadcast) {
    if (msg.hasQuotedMsg === true) {

      const quotedMsgs = await msg.getQuotedMessage().then(async resp => {
        console.log('resp+ ' + JSON.stringify(resp))
        console.log('msg' + JSON.stringify(msg))
        try {
          client.sendMessage(resp.author, resp.body)
          await msg.forward(resp.author)
          await gravaExcel(msg, resp);
        } catch (error) {
          console.log('tentando encaminhar msg: ' + error);
        }

      });
    } else {
      msg.reply('Ops, vc esqueceu de marcar a pergunta.');
      console.log('noQuote');

    }

  }
 //  Mensagem apenas fora do grupo

  else if (!getChat.isGroup && msg.body.startsWith('/') == false) {
    console.log('conversa Particular')
    try {
      let requestLink = botAPI + msg.from;
      await sendoToBot(msg, requestLink);
    } catch (error) {
      console.log(error);
    }
  }
});

//interno
client.on('message_create', async msg => {

  // AQUI DANILO
  if (msg.fromMe && msg.body === "/log") {
    console.log(msg)
    try {
      const { MessageMedia } = require('whatsapp-web.js');
      const media = MessageMedia.fromFilePath('./chats/log.xlsx');
      const chat = await msg.getChat();
      chat.sendMessage(media);
      console.log('log enviado');
    } catch (error) {
      console.log('Err: ' + error)
    }


  }
});
//
// funções

async function gravaExcel(msg, resp) {
  const pathExcel = './chats/log.xlsx';
  const workbook = new ExcelJS.Workbook();
  const today = moment().format('DD-MM-YYYY hh:mm')

  if (fs.existsSync(pathExcel)) {
    /**
     * Si existe el archivo de conversacion lo actualizamos
     */
    const workbook = new ExcelJS.Workbook();
    workbook.xlsx.readFile(pathExcel)
      .then(() => {
        const worksheet = workbook.getWorksheet(1);
        const lastRow = worksheet.lastRow;
        var getRowInsert = worksheet.getRow(++(lastRow.number));

        getRowInsert.getCell('A').value = resp.body.slice(3);
        getRowInsert.getCell('B').value = msg.body.slice(3);
        getRowInsert.getCell('C').value = resp.author;
        getRowInsert.getCell('D').value = today;



        getRowInsert.commit();
        workbook.xlsx.writeFile(pathExcel);
      });
    console.log("LOG ATUALIZADO");

  } else {
    /**
     * NO existe el archivo de conversacion lo creamos
     */
    const worksheet = workbook.addWorksheet('Chats');
    worksheet.columns = [
      { header: 'pergunta', key: 'pergnt' },
      { header: 'resposta', key: 'resp' },
      { header: 'numero', key: 'num' },
      { header: 'horario', key: 'horario' }
    ];
    worksheet.addRow([resp.body, msg.body.slice(3), resp.author, today]);
    workbook.xlsx.writeFile(pathExcel)
      .then(() => {

        console.log("LOG CRIADO COM SUCESSO");
      })
      .catch((err) => {
        console.log("err", err);
      });
  }
}

async function sendoToBot(msg, requestLink) {
  let respostaBot = ''
  const mensagem = msg.body
  if (msg.isForwarded === false) {

    try {
      const headers = { 'Content-Type': 'application/json' }
      const requestBody = {
        "type": "text",
        "text": mensagem
      }
      //console.log('axios body = ' + requestBody + 'axios user = ' + msg.from + ' HEADERS: ' + headers + ' link: ' + requestLink)
      await axios.post(requestLink, requestBody, headers)
        .then(response => {
          //console.log(response.data.responses);

          respostaBot = response.data.responses[0].text;

          let testeRespostas = response.data.responses
          for (const [key, value] of Object.entries(testeRespostas)) {

            // console.log(testeRespostas[key].type);

            switch (testeRespostas[key].type) {
               case 'single-choice':
                // code block
               
                let choiceConstructor = ''
                let choices = testeRespostas[key].choices
                for (let choice of choices){
                  choiceConstructor =  choiceConstructor+choice.value+' - '+choice.title+'\n';
                

                }
                //console.log(choiceConstructor)
                msg.reply(
                  `*${testeRespostas[key].text}*\n\n${choiceConstructor}`
                  );
              

                break;
              case 'text':
                // code block
                msg.reply(testeRespostas[key].text)
                break;

              case 'image':
                // code block

                try {
                  const { MessageMedia } = require('whatsapp-web.js');
                  const media = MessageMedia.fromUrl('http://localhost:3000'+testeRespostas[key].image).then( image =>{
                    msg.reply(image);
                }
                  );
                  
                } catch (error) {
                  console.log('Err: ' + error)
                }
                break;
            }





          }



        });
    } catch (error) {
      console.log('SEND TO BOT ERROR: ',error)
    } finally {
    }
  } else {
    console.log('p/ encaminhado - IGNORED')
    return
  }


}

//  
//API envia codigo QR para tela
router.get('/', (req, res, next) => {
  qrcode.toDataURL(qrcode_code, (err, src) => {
    res.render("scan", {
      qr_code: src
    });
  });
});
// exporta rota
module.exports = router;
