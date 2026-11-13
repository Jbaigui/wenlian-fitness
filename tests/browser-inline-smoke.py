"""DOM-level smoke test for locked-down environments that prohibit localhost navigation.

This injects ES module source as a single inline script into about:blank and stubs
localStorage; it tests UI/state/export, NOT true Service Worker or iOS Safari behavior.
Run: python3 tests/browser-inline-smoke.py
"""
from pathlib import Path
from tempfile import TemporaryDirectory
from playwright.sync_api import sync_playwright
import json

ROOT = Path(__file__).resolve().parent.parent
PLAN = (ROOT / 'plan.js').read_text().replace('export ', '')
GUIDES = (ROOT / 'exercise-guides.js').read_text().replace('export ', '')
STORAGE = (ROOT / 'storage.js').read_text().replace('export ', '')
APP_SOURCE = (ROOT / 'app.js').read_text()
APP = APP_SOURCE[APP_SOURCE.index('const APP_NAME'):]
CSS = (ROOT / 'styles.css').read_text()


def boot(page, store=None):
    store = store or {}
    page.set_content('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>')
    page.add_style_tag(content=CSS)
    stub = '''
        window.__store = ''' + json.dumps(store, ensure_ascii=False) + ''';
        Object.defineProperty(window,'localStorage',{configurable:true,value:{
          getItem(k){return window.__store[k] || null},
          setItem(k,v){window.__store[k]=v},
          removeItem(k){delete window.__store[k]}
        }});
    '''
    page.add_script_tag(content=stub + PLAN + '\n' + GUIDES + '\n' + STORAGE + '\n' + APP)
    page.locator('.hero h1').wait_for(timeout=10000)


def main():
    with TemporaryDirectory() as tmp, sync_playwright() as p:
        out = Path(tmp)
        browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        context = browser.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, is_mobile=True, has_touch=True, accept_downloads=True)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        boot(page)
        assert page.locator('.days .day').count() == 3
        assert '全身基础力量' in page.locator('main').inner_text()
        page.locator('[data-action="show-exercise"][data-id="squat"]').first.click()
        assert '一次完整动作怎么做' in page.locator('.modal').inner_text()
        page.locator('.modal [data-action="close-modal"]').first.click()
        page.locator('[data-action="start"]').click()
        assert page.locator('.exercise-large h2').inner_text() == '跑步机热身'
        page.locator('[data-action="complete-set"]').click()
        assert page.locator('.exercise-large h2').inner_text() == '跑步机热身'
        assert '1 / 1 组全部完成' in page.locator('.exercise-done').inner_text()
        page.locator('[data-action="continue-exercise"]').click()
        assert page.locator('.exercise-large h2').inner_text() == '哑铃杯式深蹲'
        page.locator('[data-field="weightKg"]').fill('4')
        page.locator('[data-field="actual"]').fill('9')
        page.locator('[data-action="complete-set"]').click()
        assert page.locator('.exercise-large h2').inner_text() == '哑铃杯式深蹲'
        page.locator('[data-action="continue-exercise"]').click()
        assert page.locator('#rest-clock').count() == 1
        first_time = page.locator('#rest-clock').inner_text()
        # wait for storage writes and simulate page refresh, sharing only persistent store
        page.wait_for_timeout(250)
        store = page.evaluate('window.__store')
        page.close()
        page = context.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        boot(page, store)
        page.locator('[data-action="nav"][data-view="workout"]').click()
        assert page.locator('.exercise-large h2').inner_text() == '高位下拉'
        assert page.locator('#rest-clock').count() == 1
        assert page.locator('#rest-clock').inner_text() <= first_time
        page.locator('[data-action="stop-rest"]').click()
        for _ in range(6):
            if page.locator('[data-action="stop-rest"]').count():
                page.locator('[data-action="stop-rest"]').click()
            assert page.locator('[data-action="complete-set"]').count() == 1
            page.locator('[data-action="complete-set"]').click()
            if page.locator('[data-action="continue-exercise"]').count():
                page.locator('[data-action="continue-exercise"]').click()
        assert page.locator('[data-action="finish"]').count() == 1
        page.locator('[data-action="finish"]').click()
        assert '已完成' in page.locator('main').inner_text()
        page.locator('.navbar [data-action="nav"][data-view="history"]').click()
        assert page.locator('.hist-card').count() == 1
        with page.expect_download() as download:
            page.locator('[data-action="export-report"]').click()
        download.value.save_as(out/'report.md')
        assert '哑铃杯式深蹲' in (out/'report.md').read_text()
        with page.expect_download() as download:
            page.locator('[data-action="export-csv"]').click()
        download.value.save_as(out/'record.csv')
        assert '高位下拉' in (out/'record.csv').read_text(encoding='utf-8-sig')
        page.locator('[data-action="nav"][data-view="settings"]').click()
        with page.expect_download() as download:
            page.locator('[data-action="export-json"]').click()
        download.value.save_as(out/'backup.json')
        backup=json.loads((out/'backup.json').read_text())
        assert backup['app'] == 'wenlian'
        assert len(backup['sessions']) == 1
        assert backup['sessions'][0]['records']['squat'][0]['actual'] == 9
        assert backup['sessions'][0]['records']['squat'][0]['weightKg'] == 4
        # Import a backup after deleting the prior record, exercise validation and restore
        page.locator('.navbar [data-action="nav"][data-view="history"]').click()
        page.locator('.hist-card').click()
        page.once('dialog', lambda d: d.accept())
        page.locator('[data-action="delete-session"]').click()
        assert page.locator('.hist-card').count() == 0
        page.locator('[data-action="nav"][data-view="settings"]').click()
        page.once('dialog', lambda d: d.accept())
        page.locator('#import-file').set_input_files(str(out/'backup.json'))
        page.wait_for_timeout(300)
        page.locator('.navbar [data-action="nav"][data-view="history"]').click()
        assert page.locator('.hist-card').count() == 1
        assert not errors, errors
        browser.close()
        print('PASS: mobile DOM UI, exercise info, set entry, timer persistence, history, JSON/CSV/MD export, deletion and backup restore')
        print('NOTE: Service Worker / real offline & iOS Safari require an HTTPS deployment for separate verification')


if __name__ == '__main__':
    main()
