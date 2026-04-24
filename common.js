
const firebaseConfig={
  apiKey:"YOUR_API_KEY",
  databaseURL:"YOUR_DB_URL"
};
firebase.initializeApp(firebaseConfig);
const db=firebase.database();

function uid(){return 'id-'+Date.now()+'-'+Math.random().toString(16).slice(2);}

function calcTotal(studentId, entries, recoveries){
 let total=0;
 Object.values(entries||{}).forEach(e=>{
  if(e.studentId===studentId && e.status==='confirmed'){
    total+=Number(e.points||0);
  }
 });
 Object.values(recoveries||{}).forEach(r=>{
  if(r.studentId===studentId){
    total-=Number(r.points||0);
  }
 });
 return Math.max(total,0);
}
