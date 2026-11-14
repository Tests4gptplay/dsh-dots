"""Chromium layout checks of production Client with controlled RPCs (not a native-host capture)."""
import json, os, re, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
root=Path(__file__).resolve().parents[2]
out=Path(os.environ.get('DSH_UI_OUTPUT',str(root/'ui-evidence')));out.mkdir(parents=True,exist_ok=True)
bundle=out/'settings-harness.js'
subprocess.run([os.environ.get('NODE_BINARY','node'),'--input-type=module','-e',
    "import {build} from 'esbuild'; await build({entryPoints:['tests/browser/settings-layout.mjs'],outfile:"+json.dumps(str(bundle))+",bundle:true,platform:'browser',format:'iife',define:{'process.env.NODE_ENV':'\"production\"'}})"],cwd=root,check=True)
compiled=(root/'lib/client.js').read_text()
css=json.loads(re.search(r'const __DOTS_CLIENT_CSS__ = (.+);\n',compiled).group(1))
theme='''body{margin:0;background:#f5f6f8;color:#252a34;font-family:system-ui,"Noto Sans CJK SC",sans-serif;} :root{--dsw-alias-label-primary:#20242d;--dsw-alias-label-secondary:#67707f;--dsw-alias-label-tertiary:#7d8694;--dsw-alias-settings-card-fill:#fff;--dsw-alias-settings-card-stroke:#e0e3e9;--dsw-alias-border-l3:#d5d9e2;--dsw-alias-bg-layer-2:#fff;--dsw-alias-interactive-bg-hover:#f4f5f8;--dsw-alias-brand-primary-new-colorprimary-new-color:#4d6bfe;}body[data-ds-dark-theme]{background:#151619;color:#e8e9ee;--dsw-alias-label-primary:#e8e9ee;--dsw-alias-label-secondary:#a5aab6;--dsw-alias-label-tertiary:#858c9a;--dsw-alias-settings-card-fill:#202125;--dsw-alias-settings-card-stroke:#34363d;--dsw-alias-border-l3:#41444e;--dsw-alias-bg-layer-2:#202125;--dsw-alias-interactive-bg-hover:#2b2d34;--dsw-alias-brand-primary-new-colorprimary-new-color:#93a6ff;}'''
report=[]
with sync_playwright() as p:
    launch={'headless':True}
    if os.environ.get('DSH_CHROMIUM_PATH'):launch['executable_path']=os.environ['DSH_CHROMIUM_PATH']
    browser=p.chromium.launch(**launch)
    for dark in [False,True]:
      for language in ['zh','en']:
       for width in [320,360,530,760]:
        page=browser.new_page(viewport={'width':width+40,'height':1050},device_scale_factor=1)
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content('<html><head><meta charset="utf-8"></head><body'+(' data-ds-dark-theme="true"' if dark else '')+'><div id="app"></div><input id="outside-control" type="checkbox"></body></html>')
        page.add_style_tag(content=theme+f'#app{{width:{width}px;max-width:100%;margin:20px auto}}'+css)
        page.add_script_tag(content=bundle.read_text());page.add_script_tag(content=compiled)
        page.evaluate('(lang)=>window.mountDotsSettings(lang)',language)
        notify=page.get_by_test_id('dots-notify-settings');expect(notify).to_be_visible()
        for label in page.locator('.dotsMcpSwitch').all():
          metrics=label.evaluate('''el=>{const c=el.querySelector('input'),t=el.querySelector('span'),a=c.getBoundingClientRect(),b=t.getBoundingClientRect();return {width:a.width,height:a.height,gap:b.x-a.right,y:Math.abs(a.y+a.height/2-b.y-b.height/2),label:t.innerText}}''')
          assert metrics['width']==16 and metrics['height']==16,metrics
          assert 7<=metrics['gap']<=12 and metrics['y']<=1,metrics
        toggle=notify.get_by_role('switch')
        expect(toggle).not_to_be_checked()
        toggle.locator('..').locator('span').click();expect(toggle).to_be_checked()
        toggle.locator('..').locator('span').click();expect(toggle).not_to_be_checked()
        event=notify.locator('.dotsChoices label').first
        event.locator('span').click();expect(event.locator('input')).to_be_checked()
        save=notify.get_by_role('button',name=re.compile('保存通知范围|Save notification scope'))
        save.click()
        assert page.evaluate('window.dotsUiFixture.notify.types[0]')=='dsh.session.turn-ended'
        event.locator('input').focus();page.keyboard.press('Space');expect(event.locator('input')).not_to_be_checked()
        notify.locator('textarea').fill('session-one\nsession-two')
        save.click()
        assert page.evaluate('window.dotsUiFixture.notify.sessions')==['session-one','session-two']
        metrics=page.evaluate('''()=>({overflows:[...document.querySelectorAll('.dotsSettingsCard,input,textarea,button')].filter(el=>{const r=el.getBoundingClientRect();return r.width&& (r.right>innerWidth+.5||r.left<-.5)}).map(el=>el.outerHTML.slice(0,100)),font:getComputedStyle(document.querySelector('.dotsSettings')).fontSize,outsideWidth:document.querySelector('#outside-control').getBoundingClientRect().width})''')
        assert not metrics['overflows'],metrics
        assert metrics['font']=='13px',metrics
        assert metrics['outsideWidth']!=16,'Settings styles leaked to unrelated host controls'
        tunnel=page.get_by_test_id('dots-tunnel-settings')
        directory=tunnel.locator('#dots-tunnel-directory')
        picker=tunnel.get_by_role('button',name=re.compile('选择目录|Choose directory'))
        if width>=530:
          a,b=directory.bounding_box(),picker.bounding_box()
          assert abs(a['y']+a['height']/2-b['y']-b['height']/2)<1,(a,b)
        assert not errors,errors
        name=('dark' if dark else 'light')+'-'+language+'-'+str(width)
        if language=='zh' and width==530:
          notify.screenshot(path=str(out/f'notify-{name}.png'))
          tunnel.screenshot(path=str(out/f'tunnel-{name}.png'))
        if width==320:notify.screenshot(path=str(out/f'notify-{name}.png'))
        page.locator('details').evaluate_all('(nodes)=>nodes.forEach(el=>el.open=true)')
        assert page.evaluate("document.querySelector('.dotsSettings').scrollWidth<=document.querySelector('.dotsSettings').clientWidth+1")
        report.append({'theme':'dark' if dark else 'light','language':language,'contentWidth':width,'checkboxes':4,'alignment':'passed','textClick':'passed','keyboard':'passed','overflow':'none','pageErrors':errors})
        page.close()
    browser.close()
(out/'layout-report.json').write_text(json.dumps({'kind':'production React UI with controlled RPC fixture','cases':report},ensure_ascii=False,indent=2))
print(f'PASS: {len(report)} Chromium layout cases; checkbox alignment, text/keyboard toggle, widths and dark/light themes.')
