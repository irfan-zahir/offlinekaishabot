import * as discord from 'discord.js'
import * as cjson from 'cjson'
import firebase_admin from 'firebase-admin'

const config = cjson.load('./package.json');
const service_account = cjson.load('./service-account.json');

const token = config.BOT_TOKEN
const prefix = config.PREFIX

const bot = new discord.Client()
bot.login(token).then(()=>{
    console.log(`${bot.user.username} is now online`);
})

firebase_admin.initializeApp({
    credential: firebase_admin.credential.cert(service_account)
})


bot.on('message', message=>{
    if(!message.mentions.has(bot.user.id)){
        if(!message.content.startsWith(prefix))return;
        
        const commandBody = message.content.slice(1); 
        const args = commandBody.split(' '); 
        const command = args.shift().toLowerCase();
        console.log(command)
    }
})