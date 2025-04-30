import RSS from "rss";

const BASE = "https://damoang.net";

// RSS XML 생성 함수
export function buildFeedXml(items) {
  const feed = new RSS({
    title: "다모앙 새로운 소식 RSS",
    feed_url: `${process.env.FEED_URL || ""}/rss`,
    site_url: BASE,
    language: "ko",
    image_url: "https://cdn.damoang.net/favicon.ico",
    pubDate: new Date(),
    ttl: Number(process.env.RSS_TTL_MINUTES || 60),
  });
  items.forEach((i) => {
    feed.item({
      title: i.title,
      description: i.summary || "",
      url: i.link,
      date: i.pubDate,
    });
  });
  return feed.xml({ indent: true });
}
