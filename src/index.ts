import { Hono } from "hono";
import { poweredBy } from "hono/powered-by";
import { prettyJSON } from "hono/pretty-json";
import { cache } from "hono/cache";
import { trimTrailingSlash } from "hono/trailing-slash";
import * as cheerio from "cheerio";

const app = new Hono();

app.use("*", poweredBy(), prettyJSON(), trimTrailingSlash());

app.get('/', async (c) => {
  const data = await scrapeData('https://fiskal.kemenkeu.go.id/informasi-publik/kurs-pajak');
  return c.json(data);
})

app.get('/:date', async (c) => {
  const date = c.req.param("date");
  const data = await scrapeData(`https://fiskal.kemenkeu.go.id/informasi-publik/kurs-pajak?date=${date}`);
  return c.json(data);
})

type TableRow = {
  title?: string;
  currency?: string;
  value?: number;
};

async function scrapeData(url: string) {
  try {
      const response = await fetch(url);
      const html = await response.text();
      const $ = cheerio.load(html);
      const title = $('em').text();

      const datas: TableRow[] = [];
      $('.table-responsive > table tbody tr').each((i, row) => {
          const rowData: TableRow = {};
          $(row).find('td').each((j, cell) => {
              // Create an object for each row with title and value properties
              if (j === 1) {
                rowData.title = $(cell).find('span').first().text().trim();
                rowData.currency = $(cell).find('span').last().text().trim();
              } else if (j === 2) {
                rowData.value = Number.parseFloat(
                  $(cell).text().trim().replace(/\./g, '').replace(',', '.')
                );
              }
          });
          datas.push(rowData);
      });

    return { title, datas };
  } catch (error) {
    console.error('Error scraping data:', error);
    return { error: 'Failed to scrape data' };
  }
}

export default app
