import axios from "axios";
import { load } from "cheerio";
import UserAgent from "user-agents";

const BASE = "https://damoang.net";
const URL_BASE = "https://damoang.net/new";
const randomUserAgent = new UserAgent().toString();

/**
 * Parses a date string in various formats and returns a JavaScript Date object.
 *
 * @param {string} str - The date string to parse (e.g., "HH:mm", "어제 HH:mm", "MM.DD HH:mm").
 * @returns {Date} - A JavaScript Date object representing the parsed date, or an invalid date if parsing fails.
 */
export function parseDateString(str) {
  const now = new Date();
  const [year, month, date] = [
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ];

  const timeMatch = str.match(/(\d{2}):(\d{2})/);
  if (!timeMatch) {
    console.error(`Invalid date string format: "${str}"`);
    return new Date("Invalid Date");
  }
  const [h, m] = timeMatch.slice(1).map(Number);

  if (/^어제/.test(str)) {
    const yesterday = new Date(year, month, date - 1);
    return new Date(
      yesterday.getFullYear(),
      yesterday.getMonth(),
      yesterday.getDate(),
      h,
      m
    );
  }

  if (/^\d{2}\.\d{2}/.test(str)) {
    const [md] = str.split(" ");
    const [mm, dd] = md.split(".").map(Number);
    return new Date(year, mm - 1, dd, h, m);
  }

  return new Date(year, month, date, h, m);
}

/**
 * Fetches items from the target website, extracting title, link, publication date, and summary.
 *
 * @returns {Promise<Array<{title: string, link: string, pubDate: Date, summary: string}>>}
 * - A promise that resolves to an array of item objects with title, link, pubDate, and summary.
 */
export async function getItems() {
  const { data } = await axios.get(`${URL_BASE}`, {
    headers: { "User-Agent": randomUserAgent },
  });
  const $ = load(data);

  const elements = Array.from($("li.list-group-item.da-link-block"));
  const items = elements.map((el) => {
      const a = $(el).find("a.subject-ellipsis");
      if (!a.length || $(el).hasClass("da-atricle-row--notice")) return null;

      const title = a.text().trim();
      if (title === "[삭제된 게시물 입니다]") return null;

      let link = a.attr("href");
      if (link.startsWith("/promotion")) return null;
      if (link.startsWith("/")) link = BASE + link;

      const tstr = $(el).find(".wr-date").text().replace("등록", "").trim();
      const pubDate = parseDateString(tstr);

      return { title, link, pubDate };
    });

  return items.filter(Boolean);
}

const items = await getItems();
console.log(items);
