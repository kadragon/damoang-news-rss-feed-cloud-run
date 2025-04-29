import express from "express";
import axios from "axios";
import { load } from "cheerio";
import RSS from "rss";
import { Storage } from "@google-cloud/storage";

const app = express();
const PORT = process.env.PORT || 8080;
const URL = "https://damoang.net/new?page=1";
const BASE = "https://damoang.net";
// GCS 캐시 설정
const storage = new Storage();
const bucket = storage.bucket(process.env.CACHE_BUCKET);

async function getItems() {
  const { data } = await axios.get(URL, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  const $ = load(data);
  const items = [];

  $("li.list-group-item.da-link-block").each((_, el) => {
    const a = $(el).find("a.subject-ellipsis");
    if (!a.length) return;
    if ($(el).hasClass("da-atricle-row--notice")) return;

    const title = a.text().trim();
    let link = a.attr("href");
    if (link.startsWith("/")) link = BASE + link;

    let tstr = $(el).find(".wr-date span").first().text().trim();
    const now = new Date();
    let pubDate;
    if (/^\d{2}:\d{2}$/.test(tstr)) {
      // 오늘
      pubDate = new Date(
        `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()} ${tstr}`
      );
    } else if (tstr.startsWith("어제 ")) {
      // 어제
      const time = tstr.replace("어제 ", "");
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      pubDate = new Date(
        `${yesterday.getFullYear()}-${
          yesterday.getMonth() + 1
        }-${yesterday.getDate()} ${time}`
      );
    } else if (/^\d{2}\.\d{2}\s\d{2}:\d{2}$/.test(tstr)) {
      // 2일 이전: MM.DD HH:mm
      const [md, hm] = tstr.split(" ");
      const [mo, da] = md.split(".").map(Number);
      const [hr, mi] = hm.split(":").map(Number);
      pubDate = new Date(now.getFullYear(), mo - 1, da, hr, mi);
    } else {
      // 그 외 (YYYY-MM-DD)
      pubDate = new Date(tstr);
    }

    items.push({ title, link, pubDate });
  });

  return items;
}
// RSS XML 생성 함수
function buildFeedXml(items) {
  const feed = new RSS({
    title: "다모앙 새로운 소식 RSS",
    feed_url: `${process.env.FEED_URL || ""}/rss`,
    site_url: URL,
    language: "ko",
    image_url: "https://cdn.damoang.net/favicon.ico",
    pubDate: new Date(),
    ttl: 60,
  });
  items.forEach((i) => {
    feed.item({
      title: i.title,
      description: i.summary || "",
      url: i.link,
      date: i.pubDate,
    });
  });
  const xmlBody = feed.xml({ indent: true });
  return `<?xml version="1.0" encoding="UTF-8"?>\n${xmlBody}`;
}

// RSS 생성 후 GCS 캐시 저장
async function generateAndCache() {
  const items = await getItems();
  const xml = buildFeedXml(items);
  const file = bucket.file("feed.xml");
  await file.save(xml, {
    contentType: "application/rss+xml",
    resumable: false,
  });
  return xml;
}

app.get("/rss", async (_, res) => {
  try {
    const file = bucket.file("feed.xml");
    let shouldRefresh = false;
    try {
      const [metadata] = await file.getMetadata();
      const updated = new Date(metadata.updated);
      if (Date.now() - updated.getTime() > 3600 * 1000) {
        // 마지막 생성 시각이 1시간 이상 경과했으면 갱신
        shouldRefresh = true;
      }
    } catch (err) {
      // 파일이 없거나 메타데이터 오류 시 갱신
      shouldRefresh = true;
    }

    if (shouldRefresh) {
      console.log("캐시 만료: RSS 재생성");
      await generateAndCache();
    }

    // 캐시된 XML을 GCS에서 읽어 서빙
    const [xml] = await file.download();
    res.set("Content-Type", "application/rss+xml; charset=UTF-8").send(xml);
  } catch (e) {
    console.error("RSS 제공 중 오류:", e);
    // fallback: 실시간 생성 후 서빙
    const xml = await generateAndCache();
    res.set("Content-Type", "application/rss+xml; charset=UTF-8").send(xml);
  }
});

// Cloud Scheduler용: GCS에 RSS 캐시 생성
app.post("/cache", async (_, res) => {
  try {
    await generateAndCache();
    res
      .set("Content-Type", "application/rss+xml; charset=UTF-8")
      .send("Cached to GCS");
  } catch (e) {
    console.error("캐시 생성 실패:", e);
    res.status(500).send("Cache failed");
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
