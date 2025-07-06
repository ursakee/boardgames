import{u as d,a as n,f as m,r as u,j as t}from"./index-DOC7akpt.js";import{c as r}from"./createLucideIcon-CVDLQriA.js";/**
 * @license lucide-react v0.525.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M8 12h8",key:"1wcyev"}],["path",{d:"M12 8v8",key:"napkw2"}]],x=r("circle-plus",f);/**
 * @license lucide-react v0.525.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 16v-4",key:"1dtifu"}],["path",{d:"M12 8h.01",key:"e9boi3"}]],p=r("info",y),w=()=>{const c=d(),i=n(e=>e.createGame),s=n(e=>e.disconnectionMessage),o=n(e=>e.clearDisconnectionMessage),a=m("tic-tac-toe");if(u.useEffect(()=>{if(s){const e=setTimeout(()=>{a&&c(`/game/${a.id}`,{replace:!0}),o()},3e3);return()=>clearTimeout(e)}},[s,o,c,a]),!a)return null;const l=async()=>{const e=await i(a.id);e&&c(`/game/${a.id}/${e}`,{replace:!0})};return t.jsxs("div",{className:"w-full max-w-md p-8 space-y-6 bg-slate-800 rounded-2xl shadow-2xl shadow-slate-950/50 border border-slate-700",children:[s&&t.jsxs("div",{className:"p-4 mb-4 text-center text-yellow-200 bg-yellow-900/50 border-yellow-700 rounded-lg flex items-center justify-center gap-3",children:[t.jsx(p,{size:24})," ",t.jsx("p",{className:"font-semibold",children:s})]}),t.jsx("h2",{className:"text-3xl font-bold text-center text-white capitalize",children:a.displayName}),t.jsx("p",{className:"text-center text-slate-400",children:"Ready to play? Create a new game room and share the link with your friends."}),t.jsxs("button",{onClick:l,className:"w-full flex items-center justify-center gap-2 px-4 py-3 text-lg font-semibold text-white bg-cyan-600 rounded-md hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-75 transition-all transform hover:scale-105",children:[t.jsx(x,{size:24})," Create New Game"]})]})};export{w as default};
