"""Update the existing real DSH browser acceptance for current Settings markup."""
from pathlib import Path
r=Path(__file__).resolve().parents[1]
p=r/'tests/native/browser.py';s=p.read_text()
s=s.replace("switch=panel.get_by_role('switch');expect(switch).not_to_be_checked();expect(switch).to_be_enabled()", "switch=panel.get_by_role('switch',name=re.compile(r'^(Enable MCP Server|启用 MCP Server)$'));expect(switch).not_to_be_checked();expect(switch).to_be_enabled()")
s=s.replace("panel.get_by_role('heading',name=re.compile(r'Connect your ChatGPT Dot|连接到 ChatGPT Dot')).scroll_into_view_if_needed()", "panel.locator('summary').filter(has_text=re.compile(r'Connect your ChatGPT Dot|连接到 ChatGPT Dot')).click()")
s=s.replace("expect(page.get_by_test_id('dots-mcp-settings').get_by_role('switch')).not_to_be_checked()", "expect(page.get_by_test_id('dots-mcp-settings').get_by_role('switch',name=re.compile(r'^(Enable MCP Server|启用 MCP Server)$'))).not_to_be_checked()")
anchor="        page.screenshot(path=str(out/'native-settings-on.png'),full_page=True)"
addition='''
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
'''
assert s.count(anchor)==1;s=s.replace(anchor,anchor+addition)
s=s.replace("'reload retains choice'],'pageErrors'", "'reload retains choice','native checkbox label alignment','native text click toggles','900px and 1280px viewport widths'],'pageErrors'")
p.write_text(s)
