import{c as t,a as L,d as j,r as s,f as w}from"./index-BBxjmWmB.js";/**
 * @license lucide-react v0.525.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x=[["path",{d:"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8",key:"5wwlr5"}],["path",{d:"M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",key:"1d0kgt"}]],P=t("house",x);/**
 * @license lucide-react v0.525.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const H=[["path",{d:"M12 2v4",key:"3427ic"}],["path",{d:"m16.2 7.8 2.9-2.9",key:"r700ao"}],["path",{d:"M18 12h4",key:"wj9ykh"}],["path",{d:"m16.2 16.2 2.9 2.9",key:"1bxg5t"}],["path",{d:"M12 18v4",key:"jadmvz"}],["path",{d:"m4.9 19.1 2.9-2.9",key:"bwix9q"}],["path",{d:"M2 12h4",key:"j09sii"}],["path",{d:"m4.9 4.9 2.9 2.9",key:"giyufr"}]],z=t("loader",H);/**
 * @license lucide-react v0.525.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const I=[["polygon",{points:"6 3 20 12 6 21 6 3",key:"1oa8hb"}]],A=t("play",I),C=()=>{const{gameId:n,gameName:e,playerId:a,players:o,gamePhase:r,gameState:m,gameEngine:i,gameOptions:c,createGame:d,joinGame:p,leaveGame:y,notifyLeave:h,setMyUsername:k,setGameOptions:l,performAction:g,startGame:u,returnToLobby:v,resetSession:M}=L(),{isHost:f,peerConnectionStates:G}=j(),S=s.useMemo(()=>w(e||void 0),[e]),_=s.useMemo(()=>o.find(b=>b.id===a),[o,a]);return{gameId:n,gameName:e,gameInfo:S,playerId:a,players:o,gamePhase:r,gameState:m,gameEngine:i,gameOptions:c,isHost:f,peerConnectionStates:G,localPlayer:_,createGame:d,joinGame:p,leaveGame:y,notifyLeave:h,setMyUsername:k,setGameOptions:l,performAction:g,startGame:u,returnToLobby:v,resetSession:M}};export{P as H,z as L,A as P,C as u};
