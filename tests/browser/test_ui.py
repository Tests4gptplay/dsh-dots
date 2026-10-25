"""Real Chromium rendering of the *production* client behind a clearly labeled fake DSH/Dot test host."""
import os
from pathlib import Path
import unittest
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
SCREENSHOTS = ROOT / 'docs' / 'screenshots'


class BrowserCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        SCREENSHOTS.mkdir(parents=True, exist_ok=True)
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(
            executable_path=os.environ.get('CHROMIUM', '/usr/bin/chromium'),
            headless=True, args=['--no-sandbox', '--disable-gpu']
        )
        cls.page = cls.browser.new_page(viewport={'width': 1190, 'height': 820}, device_scale_factor=1)
        cls.errors = []
        cls.page.on('pageerror', lambda err: cls.errors.append(str(err)))
        # No network access is needed. This container blocks even localhost HTTP
        # from Chromium; use a bundled, in-memory page with exactly the same
        # production lib/client.js. The native DSH runtime is NOT simulated here.
        markup = (ROOT / 'tests/browser/case.html').read_text()
        host = (ROOT / 'tests/browser/case.mjs').read_text()
        react = (ROOT / 'tests/cases/runtime.mjs').read_text().replace('export function', 'function')
        fake = (ROOT / 'tests/cases/mock-dots-backend.mjs').read_text().replace('export function', 'function')
        bundle = (ROOT / 'lib/client.js').read_text()
        host = host.replace("import { createTestReact } from '../cases/runtime.mjs'", '')
        host = host.replace("import { createMockDotBackend } from '../cases/mock-dots-backend.mjs'", '')
        start = host.index('await new Promise((resolve, reject) => {')
        stop = host.index('const ctx = {', start)
        host = host[:start] + bundle + '\n' + host[stop:]
        html = markup.replace('<script type="module" src="./case.mjs"></script>',
            '<script>\n' + react + '\n' + fake + '\n' + host + '\n</script>')
        cls.page.set_content(html)
        cls.page.get_by_test_id('mock-badge').wait_for()


    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()

    def test_a_input_and_simulated_reply(self):
        p = self.page
        p.locator('input[aria-label="输入一条测试消息…"]').fill('测试前台到后台的消息')
        p.get_by_role('button', name='发送').click()
        p.get_by_text('【模拟 Dot 回复】已收到：测试前台到后台的消息').wait_for()
        self.assertTrue(p.get_by_text('模拟 Dot · 仅供测试').is_visible())
        self.assertEqual(p.evaluate('window.__dshDotsCase.getCallCount()'), 1)
        p.screenshot(path=str(SCREENSHOTS / 'mock-dot-light.png'))

    def test_b_error_recovery(self):
        p = self.page
        p.locator('input[aria-label="输入一条测试消息…"]').fill('触发模拟失败')
        p.get_by_role('button', name='发送').click()
        p.get_by_text('模拟后端返回的测试错误').wait_for()
        p.locator('input[aria-label="输入一条测试消息…"]').fill('错误之后可以继续')
        p.get_by_role('button', name='发送').click()
        p.get_by_text('【模拟 Dot 回复】已收到：错误之后可以继续').wait_for()
        self.assertEqual(p.evaluate('window.__dshDotsCase.getCallCount()'), 3)

    def test_c_dark_theme_and_icon(self):
        p = self.page
        p.locator('#theme-toggle').click()
        self.assertEqual(p.locator('body').get_attribute('class'), 'dark')
        circle = p.locator('#sidebar-icon circle')
        self.assertEqual(circle.get_attribute('stroke'), 'currentColor')
        self.assertEqual(circle.get_attribute('r'), '32')
        p.screenshot(path=str(SCREENSHOTS / 'mock-dot-dark.png'))
        self.assertEqual(self.errors, [], '\n'.join(self.errors))


if __name__ == '__main__':
    unittest.main()
