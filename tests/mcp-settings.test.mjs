import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { JSDOM } from 'jsdom'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'

async function fixture(t, language='zh') {
 const dom=new JSDOM('<html><head></head><body><div id="app"></div></body></html>',{url:'http://localhost',runScripts:'outside-only'})
 const saved = new Map()
 for(const [key,value] of Object.entries({window:dom.window,document:dom.window.document,navigator:dom.window.navigator,IS_REACT_ACT_ENVIRONMENT:true})) {
  saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,writable:true,configurable:true})
 }
 let client;dom.window.__ModuleLoader__={load({factory}){client=factory(name=>{if(name==='react')return React;throw new Error(name)})}}
 dom.window.eval(await readFile(new URL('../lib/client.js',import.meta.url),'utf8'))
 let state={enabled:false,running:false,port:0,publicOrigin:'',tools:[{name:'dsh_status',description:'Read native status'}]}, fail=false
 let hold=false, release, checkSignal
 const calls=[];const rpc=async(name,value,signal)=>{calls.push({name,value});if(name==='check' && hold){checkSignal=signal;const snapshot={...state};return new Promise(resolve=>{release=()=>resolve(snapshot)})}if(fail)throw new Error('Native test error');if(name==='configure')state={...state,...value,running:value.enabled??state.enabled,localUrl:value.enabled?'http://127.0.0.1:1234/mcp/test-key':''};return state}
 const root=createRoot(dom.window.document.getElementById('app'));const translate=key=>(language==='zh'?client.zh:client.en)[key]??key
 const mount=async()=>{await act(async()=>root.render(React.createElement(client.DotsMcpSettings,{t:translate,mcpRpc:rpc})))}
 await mount()
 t.after(async()=>{await act(async()=>root.unmount());dom.window.close();for(const [k,v] of saved){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k]}})
 return {dom,calls,client,root,rpc,translate,mount,holdCheck(){hold=true},releaseCheck(){release()},checkSignal:()=>checkSignal,setFailure(){fail=true},text:()=>dom.window.document.body.textContent,click:async node=>act(async()=>node.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})))}
}
test('rendered Settings default off, toggle on/off and preserve native guide links',async t=>{
 const f=await fixture(t),d=f.dom.window.document
 const toggle=d.querySelector('[role=switch]');assert.equal(toggle.checked,false);assert.equal(toggle.disabled,false)
 assert.match(f.text(),/官方 MCP 注册指南/)
 const links=[...d.querySelectorAll('a')];assert.equal(links.length,4);assert.ok(links.every(a=>new URL(a.href).hostname.endsWith('openai.com')))
 await f.click(toggle);assert.deepEqual(JSON.parse(JSON.stringify(f.calls.at(-1))),{name:'configure',value:{enabled:true}});assert.equal(toggle.checked,true)
 assert.equal(d.querySelector('input[aria-label="本机 MCP 地址"]').type,'password')
 await f.click(toggle);assert.equal(toggle.checked,false);assert.equal(f.calls.at(-1).value.enabled,false)
})
test('rendered English settings contain complete registration flow and show concrete errors',async t=>{
 const f=await fixture(t,'en');assert.match(f.text(),/Add custom MCP server/);assert.match(f.text(),/Secure MCP Tunnel/)
 f.setFailure();await f.click(f.dom.window.document.querySelector('[role=switch]'))
 assert.match(f.text(),/Native test error/)
 assert.equal(f.dom.window.document.querySelector('[role=switch]').disabled,false)
})

test('a pending UI connection check leaves the switch available and cannot restore stale state',async t=>{
 const f=await fixture(t,'en'),d=f.dom.window.document
 const toggle=d.querySelector('[role=switch]');await f.click(toggle)
 f.holdCheck();await f.click([...d.querySelectorAll('button')].find(b=>b.textContent==='Check local connection'))
 assert.equal(toggle.disabled,false)
 await f.click(toggle);assert.equal(toggle.checked,false);assert.equal(f.checkSignal().aborted,true)
 await act(async()=>f.releaseCheck())
 assert.equal(toggle.checked,false);assert.match(f.text(),/Off/)
})
test('connection key rotation is the explicit action, without another confirmation gate',async t=>{
 const f=await fixture(t,'en'),d=f.dom.window.document
 await f.click(d.querySelector('[role=switch]'))
 f.dom.window.confirm=()=>{throw new Error('Unexpected confirmation gate')}
 await f.click([...d.querySelectorAll('button')].find(b=>b.textContent==='Rotate connection key'))
 assert.equal(f.calls.at(-1).name,'rotate')
})
