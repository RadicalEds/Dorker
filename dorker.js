#!/usr/bin/env node
const yargs = require('yargs');
const {hideBin} = require('yargs/helpers');

const {setTimeout} = require("node:timers/promises");
const puppeteer = require('puppeteer');

let browser;

async function search_duckduckgo(query) {
	let url = 'https://duckduckgo.com/?q=' + encodeURIComponent(query) + '&ia=images&iax=images';

	if(!browser) browser = await puppeteer.launch({headless: false});

	const page = await browser.newPage();
	await page.setViewport({width: 1880, height: 878});

	await page.goto(url, {
		waitUntil: 'domcontentloaded'
	});

	const scrollPageToBottom = async () => {
		await page.evaluate(() => {
			window.scrollTo(0, document.body.scrollHeight);
		});
		await setTimeout(Math.random() * (4000 - 1200) + 1200);
	};

	let previousHeight = 0;
	while (true) {
		await scrollPageToBottom();
		const newHeight = await page.evaluate(() => document.body.scrollHeight);
		if (newHeight === previousHeight) {
			break;
		}
		previousHeight = newHeight;
	}

	const entries = await page.$$('figcaption > a');
	const host_list = [];

	for (let i = 0; i < entries.length; i++) {
		const entry = entries[i];
		const href = await ( await entry.getProperty('href')).jsonValue();
		const element = await entry.$('div.UV_wbcGQNaQE445Rox7V > p');
		const hostname = await (await element.getProperty('innerText')).jsonValue();

		const host_object = host_list.find(o => o.hostname === hostname)
		if (host_object) {
			if (!host_object.links.includes(href)) {
				host_object.links.push(href);
			}
		} else {
			host_list.push({
				hostname: hostname,
				links: [ href ]
			})
		}
	}

	await browser.close();
	return host_list;
}

(async () => {
	const argv = yargs()
		.scriptName("dorker")
		.usage('$0 <cmd> [args]')
		.option('json', {
			type: 'boolean',
			default: false,
			describe: 'output as json',
		})
		.command('duckduckgo <query>', 'search duckduckgo', (yargs) => {
			yargs.positional('query', {
				type: 'string',
			})
		})
		.demandCommand(1, 1, '')
		.strict()
		.help('h')
		.parse(hideBin(process.argv));

	const host_list = [];

	switch(argv._[0]) {
		case "duckduckgo":
			results = await search_duckduckgo(argv.query);
			host_list.push(...results)
			break;
	}

	if (argv.json) {
		console.log(JSON.stringify(host_list));
	} else {
		host_list.map(h => {
			h.links.forEach(l => console.log(`${h.hostname}	${l}`))
		})
	}
})();
