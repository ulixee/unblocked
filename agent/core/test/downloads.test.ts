import { BrowserUtils, TestLogger } from '@ulixee/unblocked-agent-testing';
import { Browser, BrowserContext, Page } from '../index';
import { TestServer } from './server';
import * as Fs from 'fs';
import { setContent } from './_pageTestUtils';

describe('Downloads', () => {
  let server: TestServer;
  let httpsServer: TestServer;
  let page: Page;
  let browser: Browser;
  let context: BrowserContext;
  const logger = TestLogger.forTest(module);
  const needsClosing = [];

  beforeAll(async () => {
    server = await TestServer.create(0);
    httpsServer = await TestServer.createHTTPS(0);
    browser = new Browser(BrowserUtils.browserEngineOptions);
    await browser.launch();
    context = await browser.newContext({ logger });
    context.on('page', event => {
      needsClosing.push(event.page);
    });
  });

  afterEach(async () => {
    await page.close();
    for (const close of needsClosing) {
      await close.close();
    }
  });

  beforeEach(async () => {
    TestLogger.testNumber += 1;
    page = await context.newPage();
    server.reset();
    httpsServer.reset();
    server.reset();
    server.setRoute('/download', (req, res) => {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', 'attachment');
      res.end(`Hello world`);
    });
    server.setRoute('/downloadWithFilename', (req, res) => {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', 'attachment; filename=file.txt');
      res.end(`Hello world`);
    });
    server.setRoute('/downloadWithDelay', (req, res) => {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', 'attachment; filename=file.txt');
      // Chromium requires a large enough payload to trigger the download event soon enough
      res.write('a'.repeat(4096));
      res.write('foo');
      res.uncork();
    });
  });

  afterAll(async () => {
    await server.stop();
    await httpsServer.stop();
    await context.close();
    await browser.close();
  });

  it('should report download when navigation turns into download', async () => {
    const [{ download }, , navigationResponse] = await Promise.all([
      page.waitOn('download-started'),
      page.waitOn('download-finished'),
      page.navigate(server.url('download')).catch(e => e),
    ]);
    expect(download.url).toBe(server.url('download'));
    const path = download.path;
    expect(Fs.existsSync(path)).toBeTruthy();
    expect(Fs.readFileSync(path).toString()).toBe('Hello world');

    expect(navigationResponse.loaderType).toBe('download');
    expect(navigationResponse.loaderId).toBeTruthy();
    expect(navigationResponse instanceof Error).not.toBeTruthy();
  });

  it('should report proper download url when download is from download attribute', async () => {
    await page.goto(server.emptyPage);
    await setContent(
      page,
      `<a href="${server.baseUrl}/chromium-linux.zip" download="foo.zip">download</a>`,
    );
    const [{ download }] = await Promise.all([page.waitOn('download-started'), page.click('a')]);
    expect(download.url).toBe(`${server.baseUrl}/chromium-linux.zip`);
    await page.close();
  });

  it('should report non-navigation downloads', async () => {
    server.setRoute('/download', (req, res) => {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.end(`Hello world`);
    });

    await page.goto(server.emptyPage);
    await setContent(page, `<a download="file.txt" href="${server.baseUrl}/download">download</a>`);
    const [{ download }] = await Promise.all([
      page.waitOn('download-started'),
      page.waitOn('download-finished'),
      page.click('a'),
    ]);
    expect(download.suggestedFilename).toBe(`file.txt`);
    const path = download.path;
    expect(Fs.existsSync(path)).toBeTruthy();
    expect(Fs.readFileSync(path).toString()).toBe('Hello world');
    await page.close();
  });

  it(`should report download for Blobs`, async () => {
    const download = Promise.all([
      page.waitOn('download-started'),
      page.waitOn('download-finished'),
    ]);
    await page.goto(`${server.baseUrl}/download-blob.html`);
    await page.click('a');
    const path = (await download)[0].download.path;
    expect(Fs.readFileSync(path).toString()).toBe('Hello world');
    await page.close();
  });

  it('should report alt-click downloads', async () => {
    server.setRoute('/download', (req, res) => {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.end(`Hello world`);
    });

    await page.goto(server.emptyPage);
    await setContent(page, `<a href="${server.baseUrl}/download">download</a>`);
    await page.keyboard.down('Alt');
    const [{ download }] = await Promise.all([
      page.waitOn('download-started'),
      page.waitOn('download-finished'),
      page.click('a'),
    ]);
    await page.keyboard.up('Alt');
    const path = download.path;
    expect(Fs.existsSync(path)).toBeTruthy();
    expect(Fs.readFileSync(path).toString()).toBe('Hello world');
    await page.close();
  });

  it('should report new window downloads', async () => {
    await setContent(page, `<a target=_blank href="${server.baseUrl}/download">download</a>`);
    const [{ download }] = await Promise.all([
      page.waitOn('download-started'),
      page.waitOn('download-finished'),
      page.click('a'),
    ]);
    const path = download.path;
    expect(Fs.existsSync(path)).toBeTruthy();
    await page.close();
  });

  it('should delete downloads on context destruction', async () => {
    const newContext = await browser.newContext({ logger });
    needsClosing.push(newContext);
    const newPage = await newContext.newPage();
    needsClosing.push(newPage);

    await setContent(newPage, `<a href="${server.baseUrl}/download">download</a>`);
    const [{ download: download1 }] = await Promise.all([
      newPage.waitOn('download-started'),
      newPage.waitOn('download-finished'),
      newPage.click('a'),
    ]);

    const [{ download: download2 }] = await Promise.all([
      newPage.waitOn('download-started'),
      newPage.waitOn('download-finished'),
      newPage.interact([{ mouseButton: 'left', command: 'click' }]),
    ]);

    const path1 = download1.path;
    const path2 = download2.path;
    expect(Fs.existsSync(path1)).toBeTruthy();
    expect(Fs.existsSync(path2)).toBeTruthy();

    await newContext.close();
    expect(Fs.existsSync(path1)).toBeFalsy();
    expect(Fs.existsSync(path2)).toBeFalsy();
  });

  it.only('should close the context without awaiting the download', async () => {
    server.setRoute('/downloadStall', (req, res) => {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', 'attachment; filename=file.txt');
      res.writeHead(200);
      res.flushHeaders();
      res.write(`Hello world`);
    });
    const newContext = await browser.newContext({ logger });
    needsClosing.push(newContext);
    const newPage = await newContext.newPage();
    needsClosing.push(newPage);

    await newPage.goto(server.emptyPage);
    await setContent(
      newPage,
      `<a href="${server.baseUrl}/downloadStall" download="file.txt">click me</a>`,
    );
    const [{ download }] = await Promise.all([
      newPage.waitOn('download-started'),
      newPage.click('a'),
    ]);
    console.log('got download started');

    await newContext.close();
    await new Promise(setImmediate);
    expect(Fs.existsSync(download.path)).toBeFalsy();
  });
});
