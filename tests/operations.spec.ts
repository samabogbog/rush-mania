import {test,expect} from '@playwright/test';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {D1RealmStore} from '../server/store';
import {transact} from '../server/realm';
import {operations} from '../server/operations';
test('maintenance blocks player writes; restore retains a recovery snapshot and tuning applies without touching code',async()=>{
 const sql=new DatabaseSync(':memory:');sql.exec(readFileSync('drizzle/0000_lethal_lady_bullseye.sql','utf8'));
 const DB:any={prepare(query:string){return{bind(...v:any[]){return{async first(){return sql.prepare(query).get(...v)||null},async run(){return {meta:{changes:Number(sql.prepare(query).run(...v).changes)}}}}}}}};
 const store=new D1RealmStore(DB),id={id:'hero',name:'Hero'};let snap=await transact(store,id,{connect:true},1000);const saved=await operations(DB,{},true) as any;
 snap=await transact(store,id,{commands:[{id:snap.player.session.id+':1',type:'buy',args:['Red potion']}]},1100);expect(snap.player.actor.save.gold).toBe(105);
 await expect(operations(DB,{action:'restore',backupId:saved.backupId},true)).rejects.toThrow('maintenance');
 await operations(DB,{action:'maintenance',enabled:true},true);await expect(transact(store,id,{},1200)).rejects.toThrow('maintenance');
 const restored=await operations(DB,{action:'restore',backupId:saved.backupId},true) as any;expect(restored.recoveryBackup).toBeTruthy();expect((await store.read())!.realm.players.hero.actor.save.gold).toBe(120);
 await operations(DB,{action:'balance',kind:'Dewdrop',values:{atk:25,hp:90,xp:45,gold:10}},true);
 await expect(operations(DB,{action:'balance',kind:'Dewdrop',values:{atk:-100}},true)).rejects.toThrow('Invalid');
 await operations(DB,{action:'maintenance',enabled:false},true);snap=await transact(store,id,{connect:true},1300);expect(snap.balance?.Dewdrop.atk).toBe(25);expect(snap.player.actor.save.gold).toBe(120);
 const report=await operations(DB,{},false) as any;expect(report.backups).toHaveLength(2);expect(report.ledger.at(-1).action).toBe('balance:Dewdrop');sql.close();
});
