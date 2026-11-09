/** Real shipped DSH profile + packed plugin. Set DSH_NATIVE_ROOT to an isolated npm installation of @deepseek-ai/dsh. */
import assert from 'node:assert/strict'
import { mkdtemp,mkdir,readFile,writeFile,symlink,rm,copyFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join,resolve } from 'node:path'
import { spawn,execFileSync } from 'node:child_process'
import { Client,StreamableHTTPClientTransport } from '@modelcontextprotocol/client'
const repository=process.cwd(), runtime=resolve(process.env.DSH_NATIVE_ROOT??'native-dsh')
const output=resolve(process.env.DSH_TEST_OUTPUT??'native-evidence');await mkdir(output,{recursive:true})
const work=await mkdtemp(join(tmpdir(),'dots-native-')),home=join(work,'home'),workspace=join(work,'workspace')
await mkdir(workspace,{recursive:true})
const binary=join(runtime,'node_modules/@deepseek-ai/dsh/lib/bin.js'),env={...process.env,DSH_HOME:home}
const report={environment:{platform:process.platform,node:process.version,dsh:JSON.parse(await readFile(join(runtime,'node_modules/@deepseek-ai/dsh/package.json'),'utf8')).version,plugin:'2.0.0'},checks:[]}
const pass=(name,details={})=>{report.checks.push({name,passed:true,...details});console.log('PASS:',name)}
let host,client,rawLog='',base,cookie
function start(){
 rawLog='';host=spawn(process.execPath,[binary,'--profile','dots-acceptance','--host','127.0.0.1','--port','0','--no-open'],{cwd:workspace,env,stdio:['ignore','pipe','pipe']})
 return new Promise((ok,fail)=>{
  const timer=setTimeout(()=>fail(new Error('Native profile did not publish its URL within the test startup budget')),60000)
  const data=chunk=>{rawLog+=chunk.toString();const match=rawLog.match(/dsh web: (http:\/\/127\.0\.0\.1:\d+\/\?token=\S+)/);if(match){clearTimeout(timer);ok(match[1])}}
  host.stdout.on('data',data);host.stderr.on('data',data);host.once('error',fail);host.once('exit',code=>{clearTimeout(timer);fail(new Error('Native profile exited: '+code+' '+rawLog.replace(/token=\S+/g,'token=[redacted]')))})
 })
}
async function stop(){if(!host||host.exitCode!==null)return;const exited=new Promise(r=>host.once('exit',r));host.kill('SIGTERM');await exited}
async function login(url){base=new URL(url).origin;const r=await fetch(url,{redirect:'manual'});cookie=r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');const page=await fetch(new URL(r.headers.get('location')??'/',base),{headers:{cookie}});assert.equal(page.status,200)}
async function rpc(endpoint,payload={}){const method='dsh-dots-mcp/'+endpoint;const response=await fetch(base+'/api/'+method,{method:'POST',headers:{'content-type':'application/json',cookie,origin:base},body:JSON.stringify({type:'client-request',method,rpcId:crypto.randomUUID(),payload})});const data=await response.json();assert.equal(data.result?.ok,true,JSON.stringify(data));return data.result.value}
async function open(url){const c=new Client({name:'packed-plugin-native-validation',version:'2.0.0'});await c.connect(new StreamableHTTPClientTransport(new URL(url)));return c}
async function call(name,args={}){const r=await client.callTool({name,arguments:args});assert.notEqual(r.isError,true,JSON.stringify(r));return r.structuredContent}
try{
 execFileSync(process.execPath,[binary,'--profile','dots-acceptance','--from-default-profile','web','--dump-config'],{cwd:workspace,env,stdio:'ignore'})
 const profile=join(home,'profiles/dots-acceptance'),manifest=JSON.parse(await readFile(join(profile,'package.json'),'utf8'))
 manifest.dependencies['dsh-dots']='file:'+join(runtime,'node_modules/dsh-dots');manifest.dsh.profile.bundles.push('dsh-dots')
 await writeFile(join(profile,'package.json'),JSON.stringify(manifest,null,2));await symlink(join(runtime,'node_modules'),join(profile,'node_modules'),'junction')
 const url=await start();await login(url)
 let state=await rpc('status');assert.equal(state.enabled,false);assert.equal(state.running,false);pass('Packed plugin starts with MCP off')
 state=await rpc('configure',{enabled:true});assert.equal(state.running,true);const firstUrl=state.localUrl
 client=await open(firstUrl);const list=await client.listTools();assert.equal(list.tools.length,16);pass('Official MCP client discovers 16 tools')
 const native=await call('dsh_status');assert.ok(native.nativeApiCount>0);pass('Native API registry discovered',{apiCount:native.nativeApiCount,namespaces:native.namespaces.length})
 const created=await call('dsh_session_create',{cwd:workspace}),id=created.sessionId;assert.ok(id);pass('Native Session created')
 const sessions=await call('dsh_sessions');assert.ok(JSON.stringify(sessions).includes(id));pass('Native Session listed')
 const description=await call('dsh_api_describe',{namespace:'session',method:'list'});const wire=Object.keys(description.inputSchema.properties)[0]
 const generic=await call('dsh_api_call',{namespace:'session',method:'list',args:{[wire]:{}}});assert.ok(JSON.stringify(generic).includes(id));pass('Reflected API schema and generic invocation')
 const snapshot=await call('dsh_api_snapshot',{namespace:'workspace',method:'follow',args:{}});assert.equal(snapshot.value.type,'baseline');pass('Native stream snapshot and subscription cleanup')
 const tools=await call('dsh_tools',{sessionId:id});assert.ok(tools.tools.some(t=>t.name==='write'));pass('Native session tool catalog',{nativeTools:tools.tools.length})
 await call('dsh_tool_call',{sessionId:id,name:'write',arguments:{file_path:'native-file.txt',content:'PACKED_NATIVE_DSH_MCP_OK\n'}})
 assert.equal(await readFile(join(workspace,'native-file.txt'),'utf8'),'PACKED_NATIVE_DSH_MCP_OK\n');pass('Native file write verified on disk')
 const read=await call('dsh_tool_call',{sessionId:id,name:'read',arguments:{file_path:'native-file.txt'}});assert.ok(JSON.stringify(read).includes('PACKED_NATIVE_DSH_MCP_OK'));pass('Native file read returns actual contents')
 await copyFile(join(repository,'assets/dots-market-icon.png'),join(workspace,'native-image.png'))
 const image=await client.callTool({name:'dsh_tool_call',arguments:{sessionId:id,name:'read_image',arguments:{file_path:'native-image.png'}}})
 assert.notEqual(image.isError,true,JSON.stringify(image));assert.ok(image.content.some(c=>c.type==='image'));pass('Native image becomes MCP image content')
 assert.equal((await rpc('check')).lastCheck.ok,true);pass('Settings local discovery check')
 const missing=await client.callTool({name:'dsh_session_state',arguments:{sessionId:'does-not-exist'}});assert.equal(missing.isError,true);pass('Native errors retain MCP error semantics')
 const cancelled=await call('dsh_session_cancel',{sessionId:id});assert.equal(cancelled.accepted,true);pass('Native cancel command')
 await client.close();client=undefined;await rpc('configure',{enabled:false});await assert.rejects(fetch(firstUrl));pass('Off switch releases listening endpoint')
 state=await rpc('configure',{enabled:true});assert.equal(state.localUrl,firstUrl);client=await open(state.localUrl)
 assert.ok(JSON.stringify(await call('dsh_sessions')).includes(id));pass('Reenable preserves connection URL and DSH session')
 await client.close();client=undefined;await rpc('configure',{enabled:false});await stop()
 const resumedUrl=await start();await login(resumedUrl);state=await rpc('status');assert.equal(state.enabled,false);assert.equal(state.running,false);pass('Off preference survives real host restart')
 if(process.env.DSH_BROWSER_TEST==='1'){
  const r=spawn('python',['tests/native/browser.py'],{cwd:repository,env:{...env,DSH_TEST_URL:resumedUrl,DSH_TEST_OUTPUT:output},stdio:'inherit'})
  const code=await new Promise(ok=>r.once('exit',ok));assert.equal(code,0,'Native browser acceptance');pass('Native Chromium Settings acceptance')
 }
 report.status='passed'
}catch(error){report.status='failed';report.failure=error.stack;throw error}
finally{
 await client?.close();await stop();await writeFile(join(output,'native-report.json'),JSON.stringify(report,null,2)+'\n')
 await writeFile(join(output,'host.log'),rawLog.replace(/token=\S+/g,'token=[redacted]'))
 await rm(work,{recursive:true,force:true})
}
