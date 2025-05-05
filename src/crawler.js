import axios from "axios";
import { load } from "cheerio";
import UserAgent from "user-agents";

const BASE = "https://damoang.net";
const URL_BASE = "https://damoang.net/new?page=";
const PAGES = [1, 2];
const randomUserAgent = new UserAgent().toString();

/**
 * tstr: 날짜 문자열 (HH:mm, "어제 HH:mm", "MM.DD HH:mm", "YYYY-MM-DD")
 * 반환: JavaScript Date 객체
 */
export function parseDateString(str) {
  const now = new Date();
  const [year, month, date] = [
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ];

  if (/^\d{2}:\d{2}$/.test(str)) {
    // 오늘 시간만 있는 경우
    const [h, m] = str.split(":");
    return new Date(year, month, date, h, m);
  }

  if (/^어제\s+\d{2}:\d{2}$/.test(str)) {
    // 어제 시간만 있는 경우
    const [_, time] = str.split(" ");
    const [h, m] = time.split(":");
    const yesterday = new Date(year, month, date - 1);
    return new Date(
      yesterday.getFullYear(),
      yesterday.getMonth(),
      yesterday.getDate(),
      h,
      m
    );
  }

  if (/^\d{2}\.\d{2}\s+\d{2}:\d{2}$/.test(str)) {
    // MM.DD HH:mm 포맷
    const [md, time] = str.split(" ");
    const [mm, dd] = md.split(".").map((n) => parseInt(n, 10));
    const [h, m] = time.split(":").map((n) => parseInt(n, 10));
    return new Date(year, mm - 1, dd, h, m);
  }

  return new Date("Invalid Date");
}

export async function getItems() {
  const items = [];
  for (const page of PAGES) {
    const { data } = await axios.get(`${URL_BASE}${page}`, {
      "User-Agent": randomUserAgent,
    });
    const $ = load(data);

    $("li.list-group-item.da-link-block").each((_, el) => {
      const a = $(el).find("a.subject-ellipsis");
      if (!a.length) return;
      if ($(el).hasClass("da-atricle-row--notice")) return;

      const title = a.text().trim();
      let link = a.attr("href");
      if (link.startsWith("/")) link = BASE + link;

      const tstr = $(el).find(".wr-date span").first().text().trim();
      const pubDate = parseDateString(tstr);

      items.push({ title, link, pubDate });
    });
  }
  return items;
}
