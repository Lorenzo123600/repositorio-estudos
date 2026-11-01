import {DatabaseSync,backup} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=process.env.DATABASE_PATH||resolve(root,'var/enem.sqlite');
const destination=process.argv[2]||resolve(root,'backups',`enem-${new Date().toISOString().replace(/[:.]/g,'-')}.sqlite`);
mkdirSync(dirname(destination),{recursive:true});
const db=new DatabaseSync(source,{readOnly:true});
try{await backup(db,destination);console.log('Backup consistente salvo em:',destination);}finally{db.close();}
