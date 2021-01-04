export default class Timer {
    constructor(hoursleft){
        this.workinghours = hoursleft
    }

    sendReminder() {
        console.log('beep booop')
    }
    
    startTimer(){
        window.setTimeout(this.sendReminder, this.workinghours*1000)
    }
}