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
function parseDateString(tstr) {
  const now = new Date();
  if (/^\d{2}:\d{2}$/.test(tstr)) {
    // 오늘
    return new Date(
      `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()} ${tstr}`
    );
  } else if (tstr.startsWith("어제 ")) {
    // 어제
    const time = tstr.replace("어제 ", "");
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return new Date(
      `${yesterday.getFullYear()}-${
        yesterday.getMonth() + 1
      }-${yesterday.getDate()} ${time}`
    );
  } else if (/^\d{2}\.\d{2}\s\d{2}:\d{2}$/.test(tstr)) {
    // 2일 이전: MM.DD HH:mm
    const [md, hm] = tstr.split(" ");
    const [mo, da] = md.split(".").map(Number);
    const [hr, mi] = hm.split(":").map(Number);
    return new Date(now.getFullYear(), mo - 1, da, hr, mi);
  } else {
    // YYYY-MM-DD
    return new Date(tstr);
  }
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
