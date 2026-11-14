"""Real DSH Web UI and installed production Client; no simulated app or screenshots."""
import os,json,re,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
out=Path(os.environ['DSH_TEST_OUTPUT']);out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    launch={'headless': True}
    if os.environ.get('DSH_CHROMIUM_PATH'):
        launch['executable_path']=os.environ['DSH_CHROMIUM_PATH']
    browser=p.chromium.launch(**launch)
    page=browser.new_page(viewport={'width':1440,'height':1050},locale='en-US')
    errors=[]
    page.on('pageerror',lambda error: errors.append(str(error)))
    try:
        page.goto(os.environ['DSH_TEST_URL'],wait_until='domcontentloaded')
        # A fresh real DSH profile presents onboarding before the application.
        page.get_by_role('button',name=re.compile(r'^(Continue|继续)$')).click(timeout=45000)
        page.get_by_role('button',name=re.compile(r'^(Add API Key|添加 API Key)$')).click()
        page.get_by_role('button',name=re.compile(r'^(Configure later|稍后配置)$')).click()
        page.get_by_role('button',name=re.compile(r'^(Account menu|账号菜单)$')).click()
        page.get_by_role('menuitem',name=re.compile(r'^(Settings|设置)')).click()
        page.get_by_role('button',name='Dots',exact=True).click()
        panel=page.get_by_test_id('dots-mcp-settings');expect(panel).to_be_visible()
        switch=panel.get_by_role('switch',name=re.compile(r'^(Enable MCP Server|启用 MCP Server)$'));expect(switch).not_to_be_checked();expect(switch).to_be_enabled()
        page.screenshot(path=str(out/'native-settings-off.png'),full_page=True)
        # The controlled switch follows the completed native RPC, not an optimistic DOM flip.
        switch.click();expect(switch).to_be_checked()
        expect(panel.get_by_test_id('dots-mcp-state')).to_have_text(re.compile(r'Running|运行'))
        panel.get_by_role('button',name=re.compile(r'Check local connection|检查本地连接')).click()
        expect(panel).to_contain_text(re.compile(r'Local MCP tool discovery passed|本地 MCP 工具发现已通过'))
        assert panel.locator('input[type=password]').count()>=1
        links=panel.locator('a').evaluate_all('(nodes)=>nodes.map(n=>n.href)')
        assert any('secure-mcp-tunnels' in link for link in links)
        assert any('organization/tunnels' in link for link in links)
        assert any('openai/tunnel-client/releases' in link for link in links)
        tunnel=page.get_by_test_id('dots-tunnel-settings');expect(tunnel).to_be_visible()
        expect(tunnel.get_by_role('button',name=re.compile(r'Download and install official client|下载并安装官方客户端'))).to_be_enabled()
        assert tunnel.locator('input[type=password]').count()==1
        page.screenshot(path=str(out/'native-settings-on.png'),full_page=True)
        notify=page.get_by_test_id('dots-notify-settings')
        expect(notify).to_be_visible()
        measured=panel.locator('.dotsMcpSwitch').evaluate_all("""nodes=>nodes.map(el=>{const i=el.querySelector('input'),t=el.querySelector('span'),a=i.getBoundingClientRect(),b=t.getBoundingClientRect();return {width:a.width,height:a.height,gap:b.x-a.right,vertical:Math.abs(a.y+a.height/2-b.y-b.height/2)}})""")
        assert len(measured)==4,measured
        assert all(x['width']==16 and x['height']==16 and 7<=x['gap']<=12 and x['vertical']<=1 for x in measured),measured
        assert page.locator('.dotsSettings').evaluate('(el)=>getComputedStyle(el).fontSize')=='13px'
        notify.screenshot(path=str(out/'native-notification-layout.png'))
        notify_switch=notify.get_by_role('switch')
        expect(notify_switch).not_to_be_checked()
        notify_switch.locator('..').locator('span').click();expect(notify_switch).to_be_checked()
        notify_switch.locator('..').locator('span').click();expect(notify_switch).not_to_be_checked()
        for width in [900,1280]:
            page.set_viewport_size({'width':width,'height':1050})
            assert panel.evaluate('(el)=>el.scrollWidth<=el.clientWidth+1'),'Native settings horizontal overflow'
            assert notify.locator('.dotsMcpSwitch input').evaluate_all('(nodes)=>nodes.every(n=>n.getBoundingClientRect().width===16)')
        page.set_viewport_size({'width':1440,'height':1050})
        (out/'native-layout-metrics.json').write_text(json.dumps({'checkboxes':measured,'fontSize':13,'viewportWidths':[900,1280],'horizontalOverflow':False},indent=2))

        page.get_by_test_id('dots-connection-guide').locator('summary').click()
        page.screenshot(path=str(out/'native-connection-guide.png'),full_page=True)
        # Delay only the diagnostic request to exercise the real UI cancellation path.
        held=[]
        def hold_check(route):
            held.append(route)
        page.route('**/api/dsh-dot-mcp-mcp/check',hold_check)
        with page.expect_request('**/api/dsh-dot-mcp-mcp/check'):
            panel.get_by_role('button',name=re.compile(r'Check local connection|检查本地连接')).click()
        expect(switch).to_be_enabled()
        page.screenshot(path=str(out/'native-check-pending.png'),full_page=True)
        switch.click();expect(switch).not_to_be_checked()
        expect(switch).to_be_enabled()
        for route in held:
            route.abort()
        page.unroute('**/api/dsh-dot-mcp-mcp/check',hold_check)
        expect(panel.get_by_test_id('dots-mcp-state')).to_have_text(re.compile(r'^Off$|已关闭'))
        page.reload(wait_until='domcontentloaded')
        # Native model onboarding is deliberately deferred, so it reappears on reload.
        page.get_by_role('button',name=re.compile(r'^(Add API Key|添加 API Key)$')).click()
        page.get_by_role('button',name=re.compile(r'^(Configure later|稍后配置)$')).click()
        page.get_by_role('button',name=re.compile(r'^(Account menu|账号菜单)$')).click()
        page.get_by_role('menuitem',name=re.compile(r'^(Settings|设置)')).click()
        page.get_by_role('button',name='Dots',exact=True).click()
        expect(page.get_by_test_id('dots-mcp-settings').get_by_role('switch',name=re.compile(r'^(Enable MCP Server|启用 MCP Server)$'))).not_to_be_checked()
        (out/'browser-report.json').write_text(json.dumps({'result':'passed','engine':'Chromium','checks':['same Dots settings entry','default off','enable','real local MCP check','masked connection URL','official registration and tunnel links','disable during delayed diagnostic','reload retains choice','native checkbox label alignment','native text click toggles','900px and 1280px viewport widths'],'pageErrors':errors},ensure_ascii=False,indent=2))
    except Exception:
        (out/'browser-traceback.txt').write_text(traceback.format_exc())
        page.screenshot(path=str(out/'native-browser-failure.png'),full_page=True)
        (out/'browser-failure.txt').write_text(page.locator('body').inner_text())
        (out/'browser-errors.json').write_text(json.dumps(errors,indent=2))
        raise
    finally:
        browser.close()
