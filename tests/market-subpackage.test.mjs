import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync, readdirSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'

const root=new URL('../',import.meta.url)
const sub=new URL('../packages/dsh-dot-mcp/',import.meta.url)
const rootPkg=JSON.parse(readFileSync(new URL('package.json',root),'utf8'))
const nestedPkg=JSON.parse(readFileSync(new URL('package.json',sub),'utf8'))

test('market subpackage installs the same Dot MCP production runtime and identity',()=>{
  const expected={...rootPkg}
  delete expected.scripts
  delete expected.devDependencies
  assert.deepEqual(nestedPkg, expected)
  const files=rootPkg.files.flatMap(file=>
    file==='locale/*.json'
      ? readdirSync(new URL('locale/',root)).filter(x=>x.endsWith('.json')).map(x=>'locale/'+x)
      : [file]
  )
  assert.equal(new Set(files).size,files.length)
  for(const file of files){
    const normalized = url => readFileSync(url,'utf8').replace(/\r\n/g,'\n')
    assert.equal(normalized(new URL(file,sub)),normalized(new URL(file,root)),file)
  }
  const command=process.platform==='win32'?'npm.cmd':'npm'
  const run=spawnSync(command,['pack','--dry-run','--ignore-scripts','--json'],{
    cwd:fileURLToPath(sub),encoding:'utf8',shell:process.platform==='win32'
  })
  assert.equal(run.status,0,run.stderr)
  const pack=JSON.parse(run.stdout)[0]
  assert.equal(pack.name,rootPkg.name)
  assert.equal(pack.version,rootPkg.version)
  assert.deepEqual(pack.files.map(f=>f.path).sort(),[...files,'package.json'].sort())
})
