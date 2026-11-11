import { MongoClient } from 'mongodb';
const uri=process.env.MONGODB_URI;
if(!uri)throw new Error('Chưa cấu hình MONGODB_URI; chưa thay đổi dữ liệu.');
const client=new MongoClient(uri,{serverSelectionTimeoutMS:10000});
const fields=['students','bills','entries','classes','coaches','exams','leads','posts','media','audit'];
try{
 await client.connect();
 const db=client.db(process.env.MONGODB_DB||'vovinam');
 const collection=db.collection('club_state');
 const current=await collection.findOne({_id:'club'});
 if(!current)throw new Error('Không tìm thấy dữ liệu CLB; chưa thay đổi dữ liệu.');
 console.log(JSON.stringify({database:db.databaseName,counts:Object.fromEntries(fields.map(key=>[key,Array.isArray(current[key])?current[key].length:0])),hasSettings:!!current.settings}));
 if(process.argv.includes('--execute')){
  const replacement={_id:'club',revision:(current.revision||0)+1,settings:current.settings,...Object.fromEntries(fields.map(key=>[key,[]]))};
  const result=await collection.replaceOne({_id:'club',revision:current.revision},replacement);
  if(result.modifiedCount!==1)throw new Error('Dữ liệu vừa được cập nhật ở nơi khác. Chưa reset; hãy chạy lại.');
  const after=await collection.findOne({_id:'club'});
  if(!after||fields.some(key=>!Array.isArray(after[key])||after[key].length!==0))throw new Error('Không thể xác nhận dữ liệu đã trống.');
  console.log(JSON.stringify({reset:true,counts:Object.fromEntries(fields.map(key=>[key,after[key].length])),settingsPreserved:JSON.stringify(current.settings)===JSON.stringify(after.settings)}));
 }
}catch(error){console.error(error?.code ? `Database operation failed (${error.code}).` : error?.message?.includes('mongodb') ? 'Không thể kết nối MongoDB; kiểm tra cấu hình và mạng.' : error.message);process.exitCode=1;}finally{await client.close();}
