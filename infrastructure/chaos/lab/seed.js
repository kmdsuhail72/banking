// Runs only during initial creation of a disposable, empty MongoDB data directory.
const lab=db.getSiblingDB('banking_chaos');
lab.createCollection('users');lab.createCollection('transactions');
lab.users.createIndex({email:1},{unique:true});
lab.users.insertOne({_id:ObjectId('000000000000000000000001'),name:'Synthetic User',email:'synthetic@example.invalid',password:'LOGIN_DISABLED',balance:50000});
lab.createUser({user:'chaos-reader',pwd:process.env.MONGO_READ_PASSWORD,roles:[{role:'read',db:'banking_chaos'}]});
