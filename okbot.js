
import * as discord from 'discord.js'
import cjson from 'cjson'
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
});

const workingHours = 4
const reminder = []

bot.on('message', message=>{
    if(!message.mentions.has(bot.user.id)){
        if(!message.content.startsWith(prefix))return;
        
        const commandBody = message.content.slice(1); 
        const args = commandBody.split(' '); 
        const command = args.shift().toLowerCase();
        //clockin
        //expected clockout
        //today report
        if(command === "clockin") clockIn(message.author.username)
        if(command === "timer") {
            const user = message.author.username
            reminder.push({
                user: user,
                callback: setTimeout(() => {
                    message.channel.send(`beep boop ${message.author.username}`)
                }, 10000),
            })
            startTimer(message)
        }

    }
})

function startTimer(message){
    message.channel.send(`${message.author.username} is expected to reminded in 10secs`)
    let obj = reminder.find(o=> o.user === message.author.username)
    obj.callback
}

function clockIn(user){

    const date = new Date()
    const currhrs = date.getHours() < 10 ? `0${date.getHours()}` : date.getHours()
    const currmins = date.getMinutes() < 10 ? `0${date.getMinutes()}` : date.getMinutes()

    const current = {
        day: date.getDay(),
        month: date.getMonth()+1,
        year: date.getFullYear(),
        hours: currhrs,
        minutes: currmins
    }

    let expected = {
        day: date.getDay(),
        month: date.getMonth()+1,
        year: date.getFullYear(),
        hours: date.getHours() + 4,
        minutes: date.getMinutes(),
    }

    const currdate = `${current.day}/${current.month}/${current.year}`
    const id = `${user}${current.day}${current.month}${current.year}`
    const clockInTime = `${current.hours}:${current.minutes}`
    
    if(expected.hours > 24){
        expected.hours = expected.hours - 24
        expected.day = expected.day + 1
    }

    const expectedOut = `${expected.hours < 10 ? `0${expected.hours}` 
    : expected.hours}:${expected.minutes < 10 ? `0${expected.minutes}` 
    : expected.minutes}`

    firebase_admin.firestore().collection('workingdata').doc(id).set({
        'user': user,
        'clockin': clockInTime,
        'expected': expectedOut,
        'date': currdate,
        'clockout': '',
        'ot': ''
    })

    return `${user} started work at ${clockInTime} and is expected to clockout at ${expectedOut}`
}