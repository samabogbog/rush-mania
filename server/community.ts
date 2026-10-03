import {refineLevel} from '../src/game/refinement';
import {GameError} from './realm';
import {Simulation,type Item} from '../src/simulation';
import {BAG_CAPACITY,normalizeSecondary} from '../src/game/equipment';
import {species} from '../src/game/content';
import type {Player,Realm} from './protocol';
export type Party={id:string;leader:string;members:string[];invites:string[];lootCursor:number};
export type Trade={id:string;players:[string,string];accepted:boolean;offers:Record<string,{item:string;count:number;gold:number}>;confirmed:string[];at:number};
export type Listing={id:string;seller:string;item:Item;price:number;at:number};
export type Community={parties:Party[];friends:Record<string,string[]>;requests:Record<string,string[]>;trades:Trade[];listings:Listing[]};
export const community=(realm:Realm):Community=>realm.community??={parties:[],friends:{},requests:{},trades:[],listings:[]};
export const partyOf=(r:Realm,id:string)=>community(r).parties.find(p=>p.members.includes(id));
const reject=(text:string):never=>{throw new GameError(text)};
const qty=(v:unknown,min=1,max=99999)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const notice=(p:Player,text:string)=>{p.events.push({id:++p.serial,text,type:'system'});p.events=p.events.slice(-40)};
function available(player:Player,key:string,count:number) {
 const item=player.actor.save.items.find(i=>(i.id||i.name)===key&&i.count>=count);
 if(!item||Object.values(player.actor.save.equipped).includes(item.id||'')||item.gearId&&count!==1)reject('Item unavailable or equipped');return item!;
}
function receive(player:Player,item:Item) {
 const items=player.actor.save.items,stack=!item.gearId&&items.find(i=>i.name===item.name);
 if(stack)stack.count+=item.count;else {if(items.filter(i=>i.count>0).length>=BAG_CAPACITY)reject('Recipient bag is full');items.push({...structuredClone(item),secondary:normalizeSecondary(item.secondary),...(item.gearId?{refine:refineLevel(item.refine)}:{})});}
}
function remove(player:Player,item:Item,count:number){item.count-=count;player.actor.save.items=player.actor.save.items.filter(i=>i.count>0)}
function ledger(r:Realm,id:string,player:string,action:string,at:number,goldDelta:number){r.ledger.push({id,player,action,at,goldDelta})}
function applyCommunityCommand(r:Realm,p:Player,type:string,args:unknown[],now:number,id:string):boolean {
 if(!['partyCreate','partyInvite','partyAccept','partyLeave','friendRequest','friendAccept','friendRemove','tradeInvite','tradeAccept','tradeOffer','tradeConfirm','tradeCancel','marketList','marketBuy','marketCancel'].includes(type))return false;
 const c=community(r),[a,b,d]=args,target=typeof a==='string'?r.players[a]:undefined;
 if(type==='partyCreate'){if(partyOf(r,p.id))reject('Already in a party');c.parties.push({id:crypto.randomUUID(),leader:p.id,members:[p.id],invites:[],lootCursor:0});}
 if(type==='partyInvite') {const party=partyOf(r,p.id);if(!party||party.leader!==p.id||!target||target.id===p.id||partyOf(r,target.id))reject('Choose a player without a party');if(party!.members.length>=4||party!.invites.length>=8)reject('Party or invitations are full');if(!party!.invites.includes(target!.id))party!.invites.push(target!.id);notice(target!,p.name+' invited you to a party');}
 if(type==='partyAccept'){const party=c.parties.find(t=>t.id===a&&t.invites.includes(p.id));if(!party||partyOf(r,p.id)||party.members.length>=4)reject('Invitation unavailable');party!.members.push(p.id);for(const other of c.parties)other.invites=other.invites.filter(i=>i!==p.id);}
 if(type==='partyLeave'){const party=partyOf(r,p.id);if(party){party.members=party.members.filter(i=>i!==p.id);if(party.leader===p.id)party.leader=party.members[0];if(!party.members.length)c.parties=c.parties.filter(t=>t!==party);if(party.members.length<2){for(const id of party.members){const member=r.players[id];if(member.room?.startsWith('dungeon:')){member.room='town';member.actor.save.zone='town';member.actor.x=0;member.actor.z=-9;member.actor.target=null;member.actor.auto=false;member.actor.cast=null;member.actor.destination=null;member.actor.route=[];notice(member,'Dungeon closed: your party needs at least two members');}}}if(p.room?.startsWith('dungeon:')){p.room='town';p.actor.save.zone='town';p.actor.x=0;p.actor.z=-9;p.actor.target=null;p.actor.auto=false;}}}
 if(type==='friendRequest'){if(!target||target.id===p.id)reject('Choose another player');const list=c.requests[target!.id]??=[];if(list.length>=16)reject('Friend requests are full');if(!list.includes(p.id)&&!(c.friends[p.id]||[]).includes(target!.id))list.push(p.id);notice(target!,p.name+' sent a friend request');}
 if(type==='friendAccept'){if(!target||!c.requests[p.id]?.includes(target.id))reject('Friend request unavailable');if((c.friends[p.id]||[]).length>=40||(c.friends[target!.id]||[]).length>=40)reject('Friend list is full');(c.friends[p.id]??=[]).push(target!.id);(c.friends[target!.id]??=[]).push(p.id);c.requests[p.id]=c.requests[p.id].filter(i=>i!==target!.id);}
 if(type==='friendRemove'){if(typeof a!=='string')reject('Invalid friend');c.friends[p.id]=(c.friends[p.id]||[]).filter(i=>i!==a);c.friends[a as string]=(c.friends[a as string]||[]).filter(i=>i!==p.id);}
 if(type==='tradeInvite'){if(!target||target.id===p.id||target.room!==p.room||now-target.lastSeen>10000||Math.hypot(target.actor.x-p.actor.x,target.actor.z-p.actor.z)>4)reject('Trade partner must be nearby');if(c.trades.some(t=>t.players.includes(p.id)||t.players.includes(target!.id)))reject('A trade is already open');c.trades.push({id:crypto.randomUUID(),players:[p.id,target!.id],accepted:false,offers:{},confirmed:[],at:now});notice(target!,p.name+' requested a trade');}
 if(type.startsWith('trade')&&type!=='tradeInvite') {
  const trade=c.trades.find(t=>t.id===a&&t.players.includes(p.id));if(!trade||now-trade.at>120000)reject('Trade expired');
  if(type==='tradeCancel'){c.trades=c.trades.filter(t=>t!==trade);return true;}
  if(type==='tradeAccept'){if(trade!.players[1]!==p.id)reject('Only the invited player can accept');trade!.accepted=true;}
  if(type==='tradeOffer'){if(!trade!.accepted||!b||typeof b!=='object')reject('Invalid offer');const offer=b as {item:string;count:number;gold:number};if(typeof offer.item!=='string'||!qty(offer.count,0)||!qty(offer.gold,0)||offer.gold>p.actor.save.gold)reject('Invalid offer');if(offer.count)available(p,offer.item,offer.count);trade!.offers[p.id]={item:offer.item,count:offer.count,gold:offer.gold};trade!.confirmed=[];trade!.at=now;}
  if(type==='tradeConfirm') {
   if(!trade!.accepted||trade!.players.some(i=>!trade!.offers[i]))reject('Both players must set an offer');
   if(!trade!.confirmed.includes(p.id))trade!.confirmed.push(p.id);
   if(trade!.confirmed.length===2){const [left,right]=trade!.players.map(i=>r.players[i]);if(left.room!==right.room||Math.hypot(left.actor.x-right.actor.x,left.actor.z-right.actor.z)>4||trade!.players.some(i=>now-r.players[i].lastSeen>10000))reject('Trade partner left');
    const offers=trade!.players.map(i=>trade!.offers[i]);for(let i=0;i<2;i++){const player=[left,right][i],offer=offers[i];if(offer.gold>player.actor.save.gold)reject('Gold changed');if(offer.count)available(player,offer.item,offer.count);}
    const items=offers.map((offer,i)=>offer.count?{...available([left,right][i],offer.item,offer.count),count:offer.count}:null);
    for(let i=0;i<2;i++){const player=[left,right][i],other=[right,left][i],offer=offers[i];if(offer.count)remove(player,available(player,offer.item,offer.count),offer.count);player.actor.save.gold-=offer.gold;other.actor.save.gold+=offer.gold;ledger(r,id+':'+i,player.id,'trade:'+trade!.id,now,offers[1-i].gold-offer.gold);}
    items.forEach((item,i)=>{if(item)receive([right,left][i],item)});c.trades=c.trades.filter(t=>t!==trade);notice(left,'Trade completed');notice(right,'Trade completed');
   }
  }
 }
 if(type==='marketList'){if(typeof a!=='string'||!qty(b)||!qty(d,1,1000000)||c.listings.length>=100||c.listings.filter(l=>l.seller===p.id).length>=20)reject('Invalid listing or market full');const item=available(p,a as string,b as number);const escrow={...item,count:b as number};remove(p,item,b as number);c.listings.push({id:crypto.randomUUID(),seller:p.id,item:escrow,price:d as number,at:now});}
 if(type==='marketBuy'||type==='marketCancel') {const listing=c.listings.find(l=>l.id===a);if(!listing)reject('Listing already sold or removed');const seller=r.players[listing!.seller];if(type==='marketCancel'){if(seller.id!==p.id)reject('Only the seller can cancel');receive(p,listing!.item);}else{if(seller.id===p.id||p.actor.save.gold<listing!.price)reject('Not enough gold or your own listing');receive(p,listing!.item);p.actor.save.gold-=listing!.price;const proceeds=Math.floor(listing!.price*.9);seller.actor.save.gold+=proceeds;ledger(r,id,p.id,'market:buy:'+listing!.id,now,-listing!.price);ledger(r,id+':seller',seller.id,'market:sell:'+listing!.id,now,proceeds);notice(seller,'Market sale: '+listing!.item.name+' · +'+proceeds+' z (10% fee)');}c.listings=c.listings.filter(l=>l!==listing);}
 c.trades=c.trades.filter(t=>now-t.at<120000);return true;
}
export function communitySnapshot(r:Realm,p:Player,now:number) {
 const c=community(r),party=partyOf(r,p.id),person=(id:string)=>({id,name:r.players[id]?.name||'Adventurer',online:now-(r.players[id]?.lastSeen||0)<10000,level:r.players[id]?.actor.save.level||1});
 return {party:party?{...party,members:party.members.map(person)}:null,invitations:c.parties.filter(t=>t.invites.includes(p.id)).map(t=>({id:t.id,leader:person(t.leader)})),friends:(c.friends[p.id]||[]).map(person),requests:(c.requests[p.id]||[]).map(person),trade:(()=>{const trade=c.trades.find(t=>t.players.includes(p.id)&&now-t.at<120000);return trade?{...trade,offeredItems:Object.fromEntries(trade.players.map(id=>{const offer=trade.offers[id];return [id,offer?.count?r.players[id].actor.save.items.find(i=>(i.id||i.name)===offer.item)||null:null]}))}:null;})(),listings:c.listings.map(l=>({...l,sellerName:r.players[l.seller]?.name||'Adventurer'})),self:p.id};
}
export function shareKill(r:Realm,p:Player,monster:Simulation['monsters'][number],actors:{p:Player;sim:Simulation}[],now:number) {
 const party=partyOf(r,p.id);if(!party)return false;
 const members=actors.filter(a=>party.members.includes(a.p.id)&&a.p.room===p.room&&a.sim.save.hp>0&&Math.hypot(a.sim.x-monster.x,a.sim.z-monster.z)<30);
 if(!members.length)return false;const spec=actors.find(a=>a.p.id===p.id)!.sim.monsterSpec(monster.kind),xp=Math.max(1,Math.floor(spec.xp/members.length)),gold=Math.floor(spec.gold/members.length);
 for(const {p:member,sim} of members){const rewardGold=Math.round(gold*(1+(sim.gearBonuses.goldBonus||0)/100)),rewardXp=Math.round(xp*(1+(sim.gearBonuses.expBonus||0)/100));sim.addExperience(rewardXp);sim.save.gold+=rewardGold;sim.save.kills++;sim.progressQuest('kills');if(spec.boss)sim.progressQuest('boss');sim.markTutorial('attack');sim.onEvent('Party reward · +'+rewardXp+' EXP · +'+rewardGold+' z','reward');ledger(r,crypto.randomUUID(),member.id,'party-kill:'+monster.kind,now,rewardGold);}
 const recipient=members[(party.lootCursor++)%members.length];if(!recipient.sim.addItem(spec.drop,spec.icon))recipient.sim.loot.push({x:monster.x,z:monster.z,name:spec.drop,icon:spec.icon});recipient.sim.onEvent('Party loot: '+spec.drop,'reward');const stone=actors.find(m=>m.p.id===p.id)!.sim.rollStoneLoot(monster);if(stone){const owner=members[(party.lootCursor++)%members.length],drop=stone;if(!owner.sim.addItem(drop.name,drop.icon))owner.sim.loot.push({x:monster.x,z:monster.z,name:drop.name,icon:drop.icon});}const gearDrop=actors.find(m=>m.p.id===p.id)!.sim.rollEquipmentLoot(monster);if(gearDrop){const owner=members[(party.lootCursor++)%members.length];if(!owner.sim.addEquipmentItem(gearDrop))owner.sim.loot.push({x:monster.x,z:monster.z,name:gearDrop.name,icon:gearDrop.icon,item:gearDrop});owner.sim.onEvent('Party equipment: '+gearDrop.name,'reward');}return true;
}

export function communityCommand(r:Realm,p:Player,type:string,args:unknown[],now:number,id:string) {
 if(!['partyCreate','partyInvite','partyAccept','partyLeave','friendRequest','friendAccept','friendRemove','tradeInvite','tradeAccept','tradeOffer','tradeConfirm','tradeCancel','marketList','marketBuy','marketCancel'].includes(type))return false;
 const before=structuredClone(r);
 try{return applyCommunityCommand(r,p,type,args,now,id)}catch(error){
  if(!(error instanceof GameError)||error.status!==400)throw error;
  for(const [key,player] of Object.entries(before.players))Object.assign(r.players[key],player);
  r.community=before.community;r.ledger=before.ledger;
  notice(p,error.message);return true;
 }
}
