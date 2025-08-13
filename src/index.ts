import { Hono } from "hono";
import { poweredBy } from "hono/powered-by";
import { prettyJSON } from "hono/pretty-json";
import { cache } from "hono/cache";
import { trimTrailingSlash } from "hono/trailing-slash";
import * as cheerio from "cheerio";

const app = new Hono();

app.use("*", poweredBy(), prettyJSON(), trimTrailingSlash());

const CACHE_MAX_AGE = 300; // 5 minutes

app.get(
  '/',
  cache({
    cacheName: 'kurs',
    cacheControl: `max-age=${CACHE_MAX_AGE}`,
  }),
  async (c) => {
    const data = await scrapeData('https://fiskal.kemenkeu.go.id/informasi-publik/kurs-pajak');
    return c.json(data);
  }
);

app.get(
  '/:date',
  cache((c) => ({
    cacheName: `kurs-date-${c.req.param("date")}`,
    cacheControl: `max-age=${CACHE_MAX_AGE}`,
  })),
  async (c) => {
    const date = c.req.param("date");
    const data = await scrapeData(`https://fiskal.kemenkeu.go.id/informasi-publik/kurs-pajak?date=${date}`);
    return c.json(data);
  }
);

type TableRow = {
  title?: string;
  currency?: string;
  value?: number;
};

async function scrapeData(url: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const html = await response.text();
    const $ = cheerio.load(html);
    const title = $('em').text();

    const datas: TableRow[] = $('.table-responsive > table tbody tr').map((_, row) => {
      const tds = $(row).find('td');
      return {
        title: tds.eq(1).find('span').first().text().trim(),
        currency: tds.eq(1).find('span').last().text().trim(),
        value: Number.parseFloat(
          tds.eq(2).text().trim().replace(/\./g, '').replace(',', '.')
        ),
      };
    }).get();

    return { title, datas };
  } catch (error) {
    console.error('Error scraping data:', error);
    return { error: 'Failed to scrape data' };
  }
}

export default app;
