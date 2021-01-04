
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

const workingHours = 4*60
const reminder = []

bot.on('message', message=>{
    //clockin restricted = 794112635519631370
    if(message.channel.id == '794112635519631370')
    if(!message.mentions.has(bot.user.id)){
        if(!message.content.startsWith(prefix))return;
        
        const commandBody = message.content.slice(1); 
        const args = commandBody.split(' '); 
        const command = args.shift().toLowerCase();
        
        const database = new FirebaseService(message.author.username)
        database.create_user({name: message.author.username, id: message.author.id})

        if(command === "clockin") clockIn(message)
        if(command === "break") breakstart(message)
        if(command === "breakin") breakin(message)
        if(command === "clockout") clockout(message)
        if(command === "report") todayReport(message)
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

async function clockIn(message){

    const user = message.author.username
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

    const currdate = `${current.day}/${current.month}/${current.year}`
    const id = `${user}${current.day}${current.month}${current.year}`
    const clockInTime = `${current.hours}:${current.minutes}`

    const database = new FirebaseService(message.author.username)
    const success = await database.clockin({date: currdate, time: clockInTime, id: id})

    if(success == true){
        message.channel.send(`${user} started work at ${clockInTime}`)
    }else{
        message.channel.send(`${user}, please clockout first`)
    }
}

async function clockout(message){
    
    const user = message.author.username
    const date = new Date()
    const currhrs = date.getHours() < 10 ? `0${date.getHours()}` : date.getHours()
    const currmins = date.getMinutes() < 10 ? `0${date.getMinutes()}` : date.getMinutes()
    const current = {
        day: date.getDay(),
        month: date.getMonth()+1,
        year: date.getFullYear(),
    }
    const id = `${user}${current.day}${current.month}${current.year}`
    const clockoutTime = `${currhrs}:${currmins}`
    
    const database = new FirebaseService(message.author.username)
    const success = await database.clockout({time: clockoutTime})
    
    if(success == true){
        message.channel.send(`${user} clock out at ${clockoutTime}`)
    }else{
        message.channel.send(`${user}, please clockin first`)
    }

}

async function todayReport(message){

    const date = new Date()
    const current = {
        day: date.getDay(),
        month: date.getMonth()+1,
        year: date.getFullYear(),
    }
    const currdate = `${current.day}/${current.month}/${current.year}`

    const database = new FirebaseService(message.author.username)
    const currDayData = await (await database.getTodayData(currdate)).docs.reverse()


    let line = []
    currDayData.forEach((doc, index) => {
        const data = doc.data()
        line.push(`${index+1})  In: ${data.intime} Out: ${data.outtime}`)
    })

    const output = line.join('\n')

    message.channel.send("**Date :\t"+ currdate+"**\n```"+output +"```")
}

class FirebaseService {
    constructor(userid){
        this.firestore = firebase_admin.firestore().collection('users').doc(userid)
    }

    async create_user (userdata) {
        const dbuser = await this.firestore.get()
        if(!dbuser.exists) 
            this.firestore.set({'name': userdata.name, 'id': userdata.id}).catch(error=>console.log(`create user ${error}`))
    }

    async find_empty_out () {
        const check = await this.firestore.collection('workingdata').get()
        let ret = null
        check.docs.forEach(rec=>{
            const read = rec.data()
            if(read.outtime == ''){
                ret = rec.id
            }
        })
        return ret
    }

    async clockin (indata) {
        const startnew = await this.find_empty_out()
        if(startnew != null){
            return false
        }
        
        this.firestore.collection('workingdata').doc().set({
            'date': indata.date,
            'intime': indata.time,
            'outtime': '',
            'breaksstart': [],
            'breaksend': [],
            'desc':''
        })
        .catch(error=>console.log(`clockin error: ${error}`))
        return true
    }

    async clockout (outdata) {
        const out = await this.find_empty_out()

        if(out!=null){
            this.firestore.collection('workingdata').doc(out).update({
                'outtime': outdata.time
            })
            return true
        }
        return false
    }
    
    async getTodayData(date){
        return await this.firestore.collection('workingdata').where('date', '==', date).get()
    }
}