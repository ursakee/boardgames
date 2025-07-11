import{c as o,a as b,d as L,r as j}from"./index-nxPM7NCu.js";/**
 * @license lucide-react v0.525.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const w=[["path",{d:"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8",key:"5wwlr5"}],["path",{d:"M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",key:"1d0kgt"}]],N=o("house",w);/**
 * @license lucide-react v0.525.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x=[["path",{d:"M12 2v4",key:"3427ic"}],["path",{d:"m16.2 7.8 2.9-2.9",key:"r700ao"}],["path",{d:"M18 12h4",key:"wj9ykh"}],["path",{d:"m16.2 16.2 2.9 2.9",key:"1bxg5t"}],["path",{d:"M12 18v4",key:"jadmvz"}],["path",{d:"m4.9 19.1 2.9-2.9",key:"bwix9q"}],["path",{d:"M2 12h4",key:"j09sii"}],["path",{d:"m4.9 4.9 2.9 2.9",key:"giyufr"}]],P=o("loader",x);/**
 * @license lucide-react v0.525.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const H=[["polygon",{points:"6 3 20 12 6 21 6 3",key:"1oa8hb"}]],A=o("play",H),z=()=>{const{gameId:t,gameName:s,gameInfo:n,playerId:e,players:a,gamePhase:r,gameState:c,gameOptions:i,createGame:m,joinGame:d,leaveGame:p,notifyLeave:y,setMyUsername:h,setGameOptions:l,performAction:k,startGame:g,playAgain:u,returnToLobby:v,resetSession:M}=b(),{isHost:G,peerConnectionStates:f}=L(),S=j.useMemo(()=>a.find(_=>_.id===e),[a,e]);return{gameId:t,gameName:s,gameInfo:n,playerId:e,players:a,gamePhase:r,gameState:c,gameOptions:i,isHost:G,peerConnectionStates:f,localPlayer:S,createGame:m,joinGame:d,leaveGame:p,notifyLeave:y,setMyUsername:h,setGameOptions:l,performAction:k,startGame:g,playAgain:u,returnToLobby:v,resetSession:M}};export{N as H,P as L,A as P,z as u};
