
import * as discord from 'discord.js'
import cjson from 'cjson'
import firebase_admin from 'firebase-admin'

const config = cjson.load('./package.json');
const service_account = cjson.load('./service-account.json');

const token = process.env.BOT_TOKEN
const prefix = config.PREFIX

const bot = new discord.Client()
bot.login('Nzk1MjM0OTg4OTI4NTMyNDkx.X_GaTA.czYCMJuBuySAyL5-y_KBgeifoEI').then(()=>{
    console.log(`${bot.user.username} is now online`);
})

firebase_admin.initializeApp({
    credential: firebase_admin.credential.cert(service_account)
});

const workingHours = 4*60
const msWH = 30000
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

        // if(command === "clockin") clockIn(message)
        // // if(command === "break") breakstart(message)
        // // if(command === "breakin") breakin(message)
        // if(command === "clockout") clockout(message)
        // if(command === "report") todayReport(message)
        if(command === "in") {
            const user = message.author.username
            reminder.push({
                user: user,
                callback: new timer(() => {
                    endOfWork(message)
                }, msWH),
            })
            startTimer(message)
        }
        if(command === "break") breaks(message)
        if(command === "return") breakend(message)
    }
})

function endOfWork(message){
    const user = message.author.username
    const index = reminder.findIndex(o => o.user === user)
    reminder.splice(index, 1)
    message.channel.send(`Otsukare ${user}! Habis dah kerja harini`)
}

function startTimer(message){
    const user = message.author.username
    message.channel.send(`${user} is expected to reminded in 45secs`)
    let obj = reminder.find(o=> o.user === user)
    obj.callback
}

function breaks(message){
    const user = message.author.username
    let obj = reminder.find(o=> o.user === user)
    obj.callback.pause()
    const remained = obj.callback.getTimeLeft()
    const time = timeLeft(remained)
    message.channel.send(`Have a good break! Make sure to !return ye, ada lagi ${time} ni hehe`)
}

function breakend(message){
    const user = message.author.username
    let obj = reminder.find(o=> o.user === user)
    const remained = obj.callback.getTimeLeft()
    const time = timeLeft(remained)
    message.channel.send(`Okairinasai! Another ${time} to go!`)
}

function timeLeft (time){
    //time is in ms
    const hrs = parseInt((time / (60 * 60 * 1000)) % 24)
    const mins = parseInt((time / (1000 * 60)) % 60)
    return `${hrs} hrs and ${mins} minutes`
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

function timer(callback, delay) {
    var id, started, remaining = delay, running

    this.start = function() {
        running = true
        started = new Date()
        id = setTimeout(callback, remaining)
    }

    this.pause = function() {
        running = false
        clearTimeout(id)
        remaining -= new Date() - started
    }

    this.getTimeLeft = function() {
        if (running) {
            this.pause()
            this.start()
        }

        return remaining
    }

    this.getStateRunning = function() {
        return running
    }

    this.start()
}