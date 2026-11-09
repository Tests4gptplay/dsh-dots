"""Real DSH Web UI and installed production Client; no simulated app or screenshots."""
import os,json,re
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
        switch=panel.get_by_role('switch');expect(switch).not_to_be_checked();expect(switch).to_be_enabled()
        page.screenshot(path=str(out/'native-settings-off.png'),full_page=True)
        switch.check();expect(switch).to_be_checked()
        expect(panel.get_by_test_id('dots-mcp-state')).to_have_text(re.compile(r'Running|运行'))
        panel.get_by_role('button',name=re.compile(r'Check local connection|检查本地连接')).click()
        expect(panel).to_contain_text(re.compile(r'Local MCP tool discovery passed|本地 MCP 工具发现已通过'))
        assert panel.locator('input[type=password]').count()>=1
        links=panel.locator('a').evaluate_all('(nodes)=>nodes.map(n=>n.href)')
        assert len(links)==4 and all('openai.com' in link for link in links)
        page.screenshot(path=str(out/'native-settings-on.png'),full_page=True)
        switch.uncheck();expect(switch).not_to_be_checked()
        page.reload(wait_until='domcontentloaded')
        # Native model onboarding is deliberately deferred, so it reappears on reload.
        page.get_by_role('button',name=re.compile(r'^(Add API Key|添加 API Key)$')).click()
        page.get_by_role('button',name=re.compile(r'^(Configure later|稍后配置)$')).click()
        page.get_by_role('button',name=re.compile(r'^(Account menu|账号菜单)$')).click()
        page.get_by_role('menuitem',name=re.compile(r'^(Settings|设置)')).click()
        page.get_by_role('button',name='Dots',exact=True).click()
        expect(page.get_by_test_id('dots-mcp-settings').get_by_role('switch')).not_to_be_checked()
        (out/'browser-report.json').write_text(json.dumps({'result':'passed','engine':'Chromium','checks':['same Dots settings entry','default off','enable','real local MCP check','masked connection URL','four official guide links','disable','reload retains choice'],'pageErrors':errors},ensure_ascii=False,indent=2))
    except Exception:
        page.screenshot(path=str(out/'native-browser-failure.png'),full_page=True)
        (out/'browser-failure.txt').write_text(page.locator('body').inner_text())
        (out/'browser-errors.json').write_text(json.dumps(errors,indent=2))
        raise
    finally:
        browser.close()
