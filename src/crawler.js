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
export function parseDateString(tstr) {
  const now = new Date();

  if (/^\d{2}:\d{2}$/.test(tstr)) {
    // 오늘 HH:mm
    const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(now.getDate()).padStart(2, "0")}T${tstr}:00`;
    return new Date(iso);
  } else if (tstr.startsWith("어제 ")) {
    const time = tstr.replace("어제 ", "");
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const iso = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(y.getDate()).padStart(2, "0")}T${time}:00`;
    return new Date(iso);
  } else if (/^\d{2}\.\d{2}\s\d{2}:\d{2}$/.test(tstr)) {
    const [md, hm] = tstr.split(" ");
    const [mo, da] = md.split(".");
    const iso = `${now.getFullYear()}-${mo}-${da}T${hm}:00`;
    return new Date(iso);
  } else {
    return new Date(tstr); // ISO 문자열 또는 full date
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
