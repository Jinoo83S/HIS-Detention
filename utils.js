
function uuid(){
  return crypto.randomUUID();
}

function safe(v){
  return String(v ?? '');
}
