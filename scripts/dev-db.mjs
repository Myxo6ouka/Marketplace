import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';
import fs from 'node:fs';
import 'dotenv/config';

const dir = './pgdata';
const first = !fs.existsSync(dir);
const name = process.env.DB_NAME || 'marketplace';
const user = process.env.DB_USER || 'postgres';
const password = process.env.DB_PASSWORD || 'postgres';
const port = Number(process.env,DB_PORT || 5432);

const server = new EmbeddedPostgres({
    databaseDir: dir, user, password, port, persistent:true,
});

if(first) await server.initialise();
await server.start();

if(first){
    await server.createDatabase(name);
    const client = new pg.Client({host:'localhost', port, user, password, database:name});
    await client.connect;
    for(const file of ['database/schema.sql', 'database/seed.sql']){
        if(fs.existsSync(file)){
            await client.query(fs.readFileSync(file, 'utf8'));
            console.log('Загружен', file);
        }
    }
    await client.end();
}
console.log('PostgreSQL запущен на портку ${port}. Остановить: Ctrl+C');
const stop = async () => {await server.stop(); process.exit(0);};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
