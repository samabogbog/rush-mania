export type CastSnapshot={skillId:string;remaining:number;total:number;targetId:number|null};
/** Cast cooldown starts at acceptance, not impact. A vanished cast with no new
 * action pulse was interrupted; do not manufacture a release for it. */
export function castVisualTransition(previous:CastSnapshot|null,current:CastSnapshot|null,previousAction:number,action:number,dt:number):'start'|'hold'|'release'|'cancel'|'none'{
 if(current)return !previous||previous.skillId!==current.skillId?'start':'hold';
 if(!previous)return 'none';
 return action>previousAction+.04||previous.remaining<=dt+.025&&action>0?'release':'cancel';
}
