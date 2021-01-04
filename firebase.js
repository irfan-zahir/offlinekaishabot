import firebase_admin from 'firebase-admin'

export default class FirebaseService {
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
        check.docs.forEach(rec=>{
            if(rec.get('outtime') === ''){
                return rec.id
            }
        })
        return null
    }

    async clockin (indata) {
        const startnew = this.find_empty_out()

        if(startnew == null){
            this.firestore.collection('workingdata').doc(indata.id).set({
                'date': indata.date,
                'intime': indata.time,
                'outtime': '',
                'breaksstart': [],
                'breaksend': []
            })
            .catch(error=>console.log(`clockin error: ${error}`))
            return true
        }else{
            return false
        }
    }

    async clockout (outdata) {
        const out = this.find_empty_out()
        if(out){
            this.firestore.collection('workingdata').doc(out).update({
                'outtime': outdata.time
            })
        }
    }
}